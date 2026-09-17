import { Request, Response } from 'express'
import path from 'node:path'
import fs from 'node:fs'
import { Op } from 'sequelize'
import { z } from 'zod'
import ExcelJS from 'exceljs'
import {
  Category,
  Product,
  ProductVariant,
  VariantImage,
  ProductImage,
  Order,
  OrderItem,
} from '../../../models/index.js'
import { sequelize } from '../../../database/sequelize.js'
import { writeAuditLog } from '../../../services/audit.service.js'
import { AppError } from '../../../utils/http.js'
import { slugify } from '../../../utils/slug.js'
import {
  DIMENSION_RULES,
  validateImageDimensions,
  optimizeImage,
  cleanupFile,
  filePathFromUrl,
} from '../../../services/image.service.js'
import { UPLOADS_DIR } from './upload.controller.js'
import { adminId, paginationSchema } from './utils.js'

function generateSku(): string {
  const ts = Date.now().toString(36).toUpperCase().slice(-5)
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase()
  return `A1-${ts}${rand}`
}

// ─── Validation Schemas ─────────────────────────────────────────
export const productCreateSchema = z.object({
  code: z.union([z.string().max(80), z.null()]).optional(),
  name: z.string().min(3, 'Product name must be at least 3 characters.').max(180, 'Product name cannot exceed 180 characters.'),
  slug: z.string().max(220).optional().default(''),
  type: z.union([z.string().max(180), z.null()]).optional(),
  description: z.union([z.string(), z.null()]).optional(),
  categoryId: z.union([z.number().int().positive(), z.null()]).optional(),
  subCategoryId: z.union([z.number().int().positive(), z.null()]).optional(),
  price: z.number().min(0, 'Price cannot be negative.').optional(),
  originalPrice: z.union([z.number().min(0, 'Original price cannot be negative.'), z.null()]).optional(),
  stockQty: z.number().int().min(0, 'Stock quantity cannot be negative.').optional().default(0),
  enableBackInStockNotify: z.boolean().optional().default(false),
  imageUrl: z.union([z.string().max(255), z.null()]).optional(),
  tag: z.union([z.string().max(80), z.null()]).optional(),
  color: z.union([z.string().max(140), z.null()]).optional(),
  gender: z.union([z.enum(['kids', 'women', 'men', 'unisex']), z.null()]).optional(),
  ageGroup: z.union([z.string().max(20), z.null()]).optional(),
  hasVariants: z.boolean().optional().default(false),
  status: z.enum(['draft', 'active', 'archived', 'inactive'], { message: 'Status must be draft, active, archived, or inactive.' }).optional().default('active'),
  featured: z.boolean().optional().default(false),
  isNew: z.boolean().optional().default(false),
  isBestSeller: z.boolean().optional().default(false),
  sortOrder: z.number().int().min(0, 'Sort order must be 0 or greater.').optional().default(0),
  gstRate: z.union([z.number().min(0).max(100), z.null()]).optional().default(5.00),
  weightKg: z.union([z.number().min(0), z.null()]).optional(),
  lengthCm: z.union([z.number().min(0), z.null()]).optional(),
  breadthCm: z.union([z.number().min(0), z.null()]).optional(),
  heightCm: z.union([z.number().min(0), z.null()]).optional(),
  metaTitle: z.union([z.string().max(255), z.null()]).optional(),
  metaDescription: z.union([z.string(), z.null()]).optional(),
  metadata: z.any().optional(),
  // First variant fields (used by createProduct to create the default variant)
  variantType: z.enum(['color', 'size']).optional().default('color'),
  variantLabel: z.string().max(120).optional().default('Default'),
  colorName: z.union([z.string().min(1, 'Color name must be at least 1 character.').max(80, 'Color name cannot exceed 80 characters.'), z.null()]).optional(),
  colorHex: z.union([z.string().regex(/^#[0-9A-Fa-f]{3,8}$/), z.null()]).optional(),
  size: z.union([z.string().max(40), z.null()]).optional(),
  sku: z.union([z.string().max(120), z.null()]).optional(),
  lowStockThreshold: z.number().int().min(0).optional().default(10),
  variantImageUrl: z.union([z.string().max(255), z.null()]).optional(),
  variantImages: z.array(z.string().max(255)).optional().default([]),
})

export const variantCreateSchema = z.object({
  variantType: z.enum(['color', 'size']).optional().default('color'),
  label: z.union([z.string().max(120), z.null()]).optional(),
  colorName: z.union([z.string().min(1, 'Color name must be at least 1 character.').max(80, 'Color name cannot exceed 80 characters.'), z.null()]).optional(),
  colorHex: z.union([z.string().regex(/^#[0-9A-Fa-f]{3,8}$/), z.null()]).optional(),
  size: z.union([z.string().max(40), z.null()]).optional(),
  sku: z.union([z.string().max(120), z.null()]).optional(),
  price: z.union([z.number().min(0, 'Price cannot be negative.'), z.null()]).optional(),
  originalPrice: z.union([z.number().min(0, 'Original price cannot be negative.'), z.null()]).optional(),
  stockQty: z.number().int().min(0, 'Stock cannot be negative.').optional().default(0),
  imageUrl: z.union([z.string().max(255), z.null()]).optional(),
  isDefault: z.boolean().optional().default(false),
  status: z.enum(['active', 'inactive']).optional().default('active'),
  sortOrder: z.number().int().min(0).optional().default(0),
  lowStockThreshold: z.number().int().min(0).optional().default(10),
  gstRate: z.union([z.number().min(0).max(100), z.null()]).optional().default(5.00),
}).superRefine((data, ctx) => {
  if (data.colorName && !data.colorHex) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['colorHex'], message: 'Color hex is required when a color is set.' })
  }
  if (data.price != null && data.originalPrice != null && data.originalPrice < data.price) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['originalPrice'], message: 'Original price must be greater than or equal to selling price.' })
  }
})

export const stockBatchSchema = z.object({
  updates: z.array(z.object({
    variantId: z.number().int().positive(),
    stockQty: z.number().int().min(0),
    lowStockThreshold: z.union([z.number().int().min(0), z.null()]).optional(),

  })).min(1).max(50),
})

export const stockAdjustSchema = z.object({
  variantId: z.number().int().positive(),
  delta: z.number().int('Delta must be a whole number.'),
  reason: z.string().min(3, 'Reason is required (min 3 characters).'),
  reference: z.union([z.string().max(120), z.null()]).optional(),
})

export const updateProductStock = async (productId: number, options?: { transaction?: any }) => {
  const stock = await ProductVariant.sum('stockQty', {
    where: { productId, status: 'active' },
    ...options,
  })
  const hasVariants = (await ProductVariant.count({ where: { productId, status: 'active' }, ...options })) > 0

  const defaultVar =
    (await ProductVariant.findOne({
      where: { productId, status: 'active', isDefault: true },
      ...options,
    })) ||
    (await ProductVariant.findOne({
      where: { productId, status: 'active' },
      order: [['sortOrder', 'ASC'], ['id', 'ASC']],
      ...options,
    }))

  const updateData: any = { stockQty: stock || 0, hasVariants }
  if (defaultVar && defaultVar.getDataValue('price') != null) {
    updateData.price = Number(defaultVar.getDataValue('price'))
    updateData.originalPrice = defaultVar.getDataValue('originalPrice') != null ? Number(defaultVar.getDataValue('originalPrice')) : null
  }

  await Product.update(
    updateData,
    { where: { id: productId }, ...options }
  )
}

function normalizeVariantPart(value: unknown) {
  return String(value ?? '').trim().toLowerCase()
}

async function assertUniqueVariantCombination(productId: number, body: { colorName?: string | null; size?: string | null }, excludeVariantId?: number) {
  const siblings = await ProductVariant.findAll({ where: { productId } })
  const nextColor = normalizeVariantPart(body.colorName)
  const nextSize = normalizeVariantPart(body.size)
  const duplicate = siblings.some((variant: any) => {
    if (excludeVariantId && Number(variant.getDataValue('id')) === excludeVariantId) return false
    if (normalizeVariantPart(variant.getDataValue('colorName')) !== nextColor) return false
    const existingSize = normalizeVariantPart(variant.getDataValue('size'))
    return nextSize && nextSize === existingSize
  })

  if (duplicate) {
    throw new AppError(422, 'A variant with the same color and size already exists for this product.')
  }
}

export const getProductVariants = async (req: Request, res: Response) => {
  const variants = await ProductVariant.findAll({
    where: { productId: Number(req.params.productId) },
    include: [{ model: VariantImage, as: 'images', order: [['sortOrder', 'ASC']] }],
    order: [['sortOrder', 'ASC'], ['id', 'ASC']],
  })
  res.json({ items: variants })
}

export const createProductVariant = async (req: Request, res: Response) => {
  const productId = Number(req.params.productId)
  const product = await Product.findByPk(productId)
  if (!product) throw new AppError(404, 'Product not found')

  const count = await ProductVariant.count({ where: { productId } })
  if (count >= 12) throw new AppError(422, 'Maximum 12 variants allowed per product')

  const body = variantCreateSchema.parse(req.body)
  await assertUniqueVariantCombination(productId, body)

  const result = await sequelize.transaction(async (t) => {
    if (body.sku) {
      const existing = await ProductVariant.findOne({ where: { sku: body.sku }, transaction: t })
      if (existing) throw new AppError(422, 'SKU already exists')
    }

    const shouldBeDefault = count === 0 || body.isDefault
    if (shouldBeDefault) {
      await ProductVariant.update({ isDefault: false }, { where: { productId }, transaction: t })
    }

    const variantLabel = body.label || String(body.colorName || body.size || '').trim() || 'Default'
    const variant = await ProductVariant.create({
      productId,
      variantType: body.variantType,
      label: variantLabel,
      colorName: body.colorName,
      colorHex: body.colorHex,
      size: body.size || null,
      sizes: null,
      sku: body.sku || generateSku(),
      price: body.price,
      originalPrice: body.originalPrice,
      stockQty: body.stockQty,
      sizeStock: null,
      lowStockThreshold: body.lowStockThreshold,
      imageUrl: body.imageUrl,
      isDefault: shouldBeDefault,
      status: body.status,
      sortOrder: body.sortOrder,
    }, { transaction: t })

    await updateProductStock(productId, { transaction: t })

    return variant
  })

  await writeAuditLog({
    adminId: adminId(req),
    action: 'CREATE',
    entity: 'product_variant',
    entityId: String(result.getDataValue('id')),
    details: body
  })

  res.status(201).json({ item: result })
}

export const getProductVariantById = async (req: Request, res: Response) => {
  const variant = await ProductVariant.findOne({
    where: { id: Number(req.params.variantId), productId: Number(req.params.productId) },
    include: [{ model: VariantImage, as: 'images', order: [['sortOrder', 'ASC']] }],
  })
  if (!variant) throw new AppError(404, 'Variant not found')
  res.json({ item: variant })
}

export const updateProductVariant = async (req: Request, res: Response) => {
  const productId = Number(req.params.productId)
  const variantId = Number(req.params.variantId)

  const variant = await ProductVariant.findOne({ where: { id: variantId, productId } })
  if (!variant) throw new AppError(404, 'Variant not found')

  const body = variantCreateSchema.parse(req.body)
  await assertUniqueVariantCombination(productId, body, variantId)

  await sequelize.transaction(async (t) => {
    if (body.sku && body.sku !== variant.getDataValue('sku')) {
      const existing = await ProductVariant.findOne({ where: { sku: body.sku }, transaction: t })
      if (existing) throw new AppError(422, 'SKU already exists')
    }

    if (body.isDefault && !variant.getDataValue('isDefault')) {
      await ProductVariant.update({ isDefault: false }, { where: { productId }, transaction: t })
    }

    await variant.update({
      variantType: body.variantType,
      label: body.label,
      colorName: body.colorName,
      colorHex: body.colorHex,
      size: body.size || null,
      sizes: null,
      sku: body.sku,
      price: body.price,
      originalPrice: body.originalPrice,
      stockQty: body.stockQty,
      sizeStock: null,
      lowStockThreshold: body.lowStockThreshold,
      gstRate: body.gstRate,
      imageUrl: body.imageUrl,
      isDefault: body.isDefault,
      status: body.status,
      sortOrder: body.sortOrder,
    }, { transaction: t })

    await updateProductStock(productId, { transaction: t })
  })

  await writeAuditLog({
    adminId: adminId(req),
    action: 'UPDATE',
    entity: 'product_variant',
    entityId: String(variantId),
    details: body
  })

  res.json({ item: variant })
}

export const deleteProductVariant = async (req: Request, res: Response) => {
  const productId = Number(req.params.productId)
  const variantId = Number(req.params.variantId)

  const variant = await ProductVariant.findOne({ where: { id: variantId, productId } })
  if (!variant) throw new AppError(404, 'Variant not found')

  // Clean up images - only if not referenced in any orders
  const mainImage = variant.getDataValue('imageUrl') as string | null
  if (mainImage) {
    const refCount = await OrderItem.count({ where: { imageUrl: mainImage } })
    if (refCount === 0) {
      const p = filePathFromUrl(mainImage, UPLOADS_DIR)
      if (p) cleanupFile(p)
    }
  }
  
  const images = await VariantImage.findAll({ where: { variantId } }) as any[]
  for (const img of images) {
    if (img.imageUrl) {
      const refCount = await OrderItem.count({ where: { imageUrl: img.imageUrl } })
      if (refCount === 0) {
        const p = filePathFromUrl(img.imageUrl, UPLOADS_DIR)
        if (p) cleanupFile(p)
      }
    }
  }

  await sequelize.transaction(async (t) => {
    await VariantImage.destroy({ where: { variantId }, transaction: t })
    await variant.destroy({ transaction: t })
    await updateProductStock(productId, { transaction: t })

    // Enforce at least one default variant if there are remaining active variants
    const remaining = await ProductVariant.count({ where: { productId, status: 'active' }, transaction: t })
    if (remaining > 0 && variant.getDataValue('isDefault')) {
      const firstRemaining = await ProductVariant.findOne({ where: { productId, status: 'active' }, order: [['sortOrder', 'ASC']], transaction: t })
      if (firstRemaining) await firstRemaining.update({ isDefault: true }, { transaction: t })
    }
  })

  await writeAuditLog({
    adminId: adminId(req),
    action: 'DELETE',
    entity: 'product_variant',
    entityId: String(variantId)
  })

  res.json({ ok: true })
}

export const setVariantDefault = async (req: Request, res: Response) => {
  const productId = Number(req.params.productId)
  const variantId = Number(req.params.variantId)

  const variant = await ProductVariant.findOne({ where: { id: variantId, productId } })
  if (!variant) throw new AppError(404, 'Variant not found')

  await ProductVariant.update({ isDefault: false }, { where: { productId } })
  await variant.update({ isDefault: true })
  await updateProductStock(productId)

  res.json({ ok: true })
}

export const uploadVariantImage = async (req: Request, res: Response) => {
  const variantId = Number(req.params.variantId)
  if (!req.file) throw new AppError(422, 'File is required')

  const count = await VariantImage.count({ where: { variantId } })
  if (count >= 7) { // 1 main + 7 gallery = 8 total
    cleanupFile(req.file.path)
    throw new AppError(422, 'Maximum 7 gallery images allowed per variant')
  }

  const dimensionRuleKey = String(req.body.dimensionRule || req.query.dimensionRule || '').trim()
  const rule = dimensionRuleKey ? DIMENSION_RULES[dimensionRuleKey] : undefined
  let filePath = req.file.path
  let finalFilename = req.file.filename

  if (rule) {
    const validation = await validateImageDimensions(filePath, rule)
    if (!validation.valid) {
      cleanupFile(filePath)
      throw new AppError(422, validation.reason)
    }
    if (validation.dimensions.width > rule.maxWidth || validation.dimensions.height > rule.maxHeight) {
      try {
        const optimized = await optimizeImage(filePath, rule)
        cleanupFile(filePath)
        filePath = optimized.path
        finalFilename = path.basename(filePath)
      } catch {}
    }
  }

  const maxOrder = await VariantImage.max('sortOrder', { where: { variantId } }) as number | null
  const image = await VariantImage.create({
    variantId,
    imageUrl: `/uploads/${finalFilename}`,
    sortOrder: (maxOrder ?? -1) + 1,
  })

  // Auto-copy gallery image to same-color sibling variants
  try {
    const currentVariant = await ProductVariant.findByPk(variantId, { attributes: ['productId', 'colorName'] })
    if (currentVariant?.getDataValue('colorName')) {
      const siblings = await ProductVariant.findAll({
        where: {
          productId: currentVariant.getDataValue('productId'),
          colorName: currentVariant.getDataValue('colorName'),
          id: { [Op.ne]: variantId },
        },
        attributes: ['id'],
      })
      for (const sibling of siblings) {
        const siblingId = sibling.getDataValue('id') as number
        const siblingCount = await VariantImage.count({ where: { variantId: siblingId } })
        if (siblingCount >= 7) continue
        const siblingMaxOrder = await VariantImage.max('sortOrder', { where: { variantId: siblingId } }) as number | null
        await VariantImage.create({
          variantId: siblingId,
          imageUrl: `/uploads/${finalFilename}`,
          sortOrder: (siblingMaxOrder ?? -1) + 1,
        })
      }
    }
  } catch {
    // Sibling copy failure should not block the upload response
  }

  res.status(201).json({ file: image })
}

export const deleteVariantImage = async (req: Request, res: Response) => {
  const imageId = Number(req.params.imageId)
  const image = await VariantImage.findOne({ where: { id: imageId, variantId: Number(req.params.variantId) } }) as any
  if (!image) throw new AppError(404, 'Image not found')

  if (image.imageUrl) {
    const refCount = await OrderItem.count({ where: { imageUrl: image.imageUrl } })
    if (refCount === 0) {
      const p = filePathFromUrl(image.imageUrl, UPLOADS_DIR)
      if (p) cleanupFile(p)
    }
  }
  await image.destroy()
  res.json({ ok: true })
}

export const uploadVariantMainImage = async (req: Request, res: Response) => {
  const productId = Number(req.params.productId)
  const variantId = Number(req.params.variantId)

  const variant = await ProductVariant.findOne({ where: { id: variantId, productId } })
  if (!variant) throw new AppError(404, 'Variant not found')
  if (!req.file) throw new AppError(422, 'File is required')

  // Clean up old main image file - only if not referenced in any orders
  const oldImageUrl = variant.getDataValue('imageUrl') as string | null
  if (oldImageUrl) {
    const refCount = await OrderItem.count({ where: { imageUrl: oldImageUrl } })
    if (refCount === 0) {
      const oldPath = filePathFromUrl(oldImageUrl, UPLOADS_DIR)
      if (oldPath) cleanupFile(oldPath)
    }
  }

  // Validate and optimize using 'variant-main' rule
  const dimensionRuleKey = String(req.body.dimensionRule || req.query.dimensionRule || 'variant-main').trim()
  const rule = dimensionRuleKey ? DIMENSION_RULES[dimensionRuleKey] : undefined
  let filePath = req.file.path
  let finalFilename = req.file.filename

  if (rule) {
    const validation = await validateImageDimensions(filePath, rule)
    if (!validation.valid) {
      cleanupFile(filePath)
      throw new AppError(422, validation.reason)
    }
    if (validation.dimensions.width > rule.maxWidth || validation.dimensions.height > rule.maxHeight) {
      try {
        const optimized = await optimizeImage(filePath, rule)
        cleanupFile(filePath)
        filePath = optimized.path
        finalFilename = path.basename(filePath)
      } catch {}
    }
  }

  const imageUrl = `/uploads/${finalFilename}`
  await variant.update({ imageUrl })

  res.json({ imageUrl })
}

export const reorderVariantImages = async (req: Request, res: Response) => {
  const imageIds = z.array(z.number().int()).parse(req.body.imageIds)
  const variantId = Number(req.params.variantId)

  await Promise.all(
    imageIds.map((id, index) =>
      VariantImage.update({ sortOrder: index }, { where: { id, variantId } })
    )
  )

  res.json({ ok: true })
}

export const getAllVariants = async (req: Request, res: Response) => {
  const { page, perPage } = paginationSchema.parse(req.query)
  const productId = req.query.productId ? Number(req.query.productId) : undefined
  const search = req.query.search ? String(req.query.search).trim() : ''

  const where: any = productId ? { productId } : {}

  if (search) {
    const matchingProducts = await Product.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { code: { [Op.like]: `%${search}%` } },
        ],
      },
      attributes: ['id'],
      raw: true,
    }) as any[]
    const productIdsFromSearch = matchingProducts.map(p => p.id)

    where[Op.or] = [
      { label: { [Op.like]: `%${search}%` } },
      { sku: { [Op.like]: `%${search}%` } },
      { colorName: { [Op.like]: `%${search}%` } },
      ...(productIdsFromSearch.length > 0 ? [{ productId: { [Op.in]: productIdsFromSearch } }] : []),
    ]
  }

  const [rows, total] = await Promise.all([
    ProductVariant.findAll({
      where,
      include: [
        { model: Product, required: true, attributes: ['id', 'name', 'code', 'imageUrl', 'categoryId', 'gender'] },
        { model: VariantImage, as: 'images', attributes: ['id', 'imageUrl', 'sortOrder'], order: [['sortOrder', 'ASC']] },
      ],
      order: [['id', 'DESC']],
      offset: (page - 1) * perPage,
      limit: perPage,
    }),
    ProductVariant.count({ where }),
  ])

  const allCategories = await Category.findAll({ attributes: ['id', 'name', 'parentId'], paranoid: true })
  const catMap: Record<number, { name: string; parentId: number | null }> = {}
  for (const c of allCategories) {
    catMap[Number(c.get('id'))] = { name: String(c.get('name')), parentId: c.get('parentId') as number | null }
  }

  res.json({
    items: rows.map(r => {
      const plain: any = r.get({ plain: true })
      const catId = plain.Product?.categoryId
      if (catId && catMap[catId]) {
        const cat = catMap[catId]
        if (cat.parentId && catMap[cat.parentId]) {
          plain.Product.categoryName = catMap[cat.parentId].name
          plain.Product.subcategoryName = cat.name
        } else {
          plain.Product.categoryName = cat.name
          plain.Product.subcategoryName = null
        }
      } else {
        if (plain.Product) {
          plain.Product.categoryName = null
          plain.Product.subcategoryName = null
        }
      }
      return plain
    }),
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  })
}

export const getStockList = async (req: Request, res: Response) => {
  const { page, perPage } = paginationSchema.parse(req.query)

  const [rows, total] = await Promise.all([
    Product.findAll({
      where: { status: ['active', 'draft'] },
      include: [{
        model: ProductVariant,
        as: 'variants',
        include: [{ model: VariantImage, as: 'images', attributes: ['id', 'imageUrl', 'sortOrder'], order: [['sortOrder', 'ASC']] }],
        order: [['sortOrder', 'ASC'], ['id', 'ASC']],
      }],
      order: [['id', 'DESC']],
      offset: (page - 1) * perPage,
      limit: perPage,
    }),
    Product.count({ where: { status: ['active', 'draft'] } }),
  ])

  const allVariantIds: number[] = []
  for (const p of rows) {
    const variants = (p.get({ plain: true }) as any).variants || []
    for (const v of variants) {
      allVariantIds.push(v.id)
    }
  }

  const salesStockMap: Record<number, number> = {}
  if (allVariantIds.length > 0) {
    const [salesRows] = await sequelize.query(`
      SELECT oi.variant_id AS variantId, COALESCE(SUM(oi.quantity), 0) AS salesStock
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.variant_id IN (${allVariantIds.join(',')})
        AND o.payment_status = 'paid'
        AND o.status NOT IN ('cancelled', 'returned')
      GROUP BY oi.variant_id
    `)
    for (const row of salesRows as any[]) {
      salesStockMap[row.variantId] = Number(row.salesStock)
    }
  }

  const items = rows.map(p => {
    const plain = p.get({ plain: true }) as any
    if (plain.variants) {
      for (const v of plain.variants) {
        v.salesStock = salesStockMap[v.id] || 0
      }
    }
    return plain
  })

  res.json({
    items,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  })
}

export const updateStockBatch = async (req: Request, res: Response) => {
  const { updates } = stockBatchSchema.parse(req.body)

  const auditDetails: any[] = []

  const results = await sequelize.transaction(async (t) => {
    const updated: any[] = []
    for (const u of updates) {
      const variant = await ProductVariant.findByPk(u.variantId, { transaction: t })
      if (!variant) throw new AppError(404, `Variant ${u.variantId} not found`)

      const beforeStock = Number(variant.getDataValue('stockQty'))
      const beforeThreshold = Number(variant.getDataValue('lowStockThreshold') ?? 10)

      const oldStockQty = Number(variant.getDataValue('stockQty'))

      await variant.update({
        stockQty: u.stockQty,
        ...(u.lowStockThreshold !== undefined ? { lowStockThreshold: u.lowStockThreshold } : {}),
      }, { transaction: t })

      const productId = Number(variant.getDataValue('productId'))
      await updateProductStock(productId, { transaction: t })

      auditDetails.push({
        variantId: u.variantId,
        before: { stockQty: beforeStock, lowStockThreshold: beforeThreshold },
        after: { stockQty: u.stockQty, lowStockThreshold: u.lowStockThreshold ?? beforeThreshold },
        delta: u.stockQty - beforeStock,
      })

      updated.push(variant.get({ plain: true }))
    }
    return updated
  })

  await writeAuditLog({
    adminId: adminId(req),
    action: 'BATCH_UPDATE',
    entity: 'product_variant_stock',
    entityId: updates.map(u => u.variantId).join(','),
    details: auditDetails,
  })

  res.json({ items: results })
}

export const adjustStock = async (req: Request, res: Response) => {
  const { variantId, delta, reason, reference } = stockAdjustSchema.parse(req.body)

  const result = await sequelize.transaction(async (t) => {
    const variant = await ProductVariant.findByPk(variantId, { transaction: t })
    if (!variant) throw new AppError(404, `Variant ${variantId} not found`)

    const beforeStock = Number(variant.getDataValue('stockQty'))
    const newStock = Math.max(0, beforeStock + delta)
    const lowStockThreshold = Number(variant.getDataValue('lowStockThreshold') ?? 10)

    await variant.update({ stockQty: newStock }, { transaction: t })

    const productId = Number(variant.getDataValue('productId'))
    await updateProductStock(productId, { transaction: t })

    return { variant: variant.get({ plain: true }), before: beforeStock, after: newStock, productId }
  })

  await writeAuditLog({
    adminId: adminId(req),
    action: 'ADJUST_STOCK',
    entity: 'product_variant',
    entityId: String(variantId),
    details: {
      variantId,
      delta,
      reason,
      reference: reference || null,
      before: result.before,
      after: result.after,
    },
  })

  res.json({
    item: result.variant,
    adjustment: { before: result.before, after: result.after, delta },
    message: `Stock adjusted by ${delta >= 0 ? '+' : ''}${delta}. New stock: ${result.after}.`,
  })
}

export const getProductImages = async (req: Request, res: Response) => {
  const { productId } = req.params
  const product = await Product.findByPk(Number(productId))
  if (!product) throw new AppError(404, 'Product not found.')

  const images = await ProductImage.findAll({
    where: { productId: Number(productId) },
    order: [['sortOrder', 'ASC'], ['id', 'ASC']],
  })

  res.json({
    items: images.map((img: any) => img.get({ plain: true })),
  })
}

export const uploadProductImage = async (req: Request, res: Response) => {
  if (!req.file) throw new AppError(422, 'File is required.')

  const { productId } = req.params
  const product = await Product.findByPk(Number(productId))
  if (!product) throw new AppError(404, 'Product not found.')

  const filePath = req.file.path
  const dimensionRuleKey = String(req.body.dimensionRule || req.query.dimensionRule || '').trim()
  const rule = dimensionRuleKey ? DIMENSION_RULES[dimensionRuleKey] : undefined

  let imageUrl = `/uploads/${req.file.filename}`

  if (rule) {
    const validation = await validateImageDimensions(filePath, rule)

    if (!validation.valid) {
      cleanupFile(filePath)
      throw new AppError(422, validation.reason)
    }

    if (validation.dimensions.width > rule.maxWidth || validation.dimensions.height > rule.maxHeight) {
      try {
        const optimized = await optimizeImage(filePath, rule)
        const finalFilename = path.basename(optimized.path)
        imageUrl = `/uploads/${finalFilename}`
        cleanupFile(filePath)
      } catch {
        // optimization failed, use original
      }
    }
  }

  const maxSort = await ProductImage.max('sortOrder', {
    where: { productId: Number(productId) },
  }) as number | null

  const image = await ProductImage.create({
    productId: Number(productId),
    imageUrl,
    altText: req.body.altText || null,
    sortOrder: (maxSort || 0) + 1,
  })

  res.status(201).json({ file: image.get({ plain: true }) })
}

export const deleteProductImage = async (req: Request, res: Response) => {
  const { productId, imageId } = req.params
  const image = await ProductImage.findOne({
    where: { id: Number(imageId), productId: Number(productId) },
  })
  if (!image) throw new AppError(404, 'Image not found.')

  const imageUrl = image.get('imageUrl') as string
  if (imageUrl) {
    const fp = filePathFromUrl(imageUrl, UPLOADS_DIR)
    if (fp) cleanupFile(fp)
  }

  await image.destroy()
  res.json({ ok: true })
}

export const reorderProductImages = async (req: Request, res: Response) => {
  const { productId } = req.params
  const imageIds = z.array(z.number().int()).parse(req.body.imageIds)

  await Promise.all(
    imageIds.map((id, index) =>
      ProductImage.update({ sortOrder: index }, { where: { id, productId: Number(productId) } })
    )
  )

  res.json({ ok: true })
}

export const createProduct = async (req: Request, res: Response) => {
  const body = productCreateSchema.parse(req.body)
  const slug = body.slug && body.slug.trim() ? slugify(body.slug) : slugify(body.name)
  const productPayload = { ...body, slug }

  const result = await sequelize.transaction(async (t) => {
    if (body.code) {
      const existingCode = await Product.findOne({ where: { code: body.code.trim() }, transaction: t })
      if (existingCode) throw new AppError(422, `Product code "${body.code}" already exists.`)
    }
    if (body.sku) {
      const existingSku = await ProductVariant.findOne({ where: { sku: body.sku.trim() }, transaction: t })
      if (existingSku) throw new AppError(422, `SKU "${body.sku}" already exists.`)
    }

    const product = await Product.create(productPayload, { transaction: t })

    const variant = await ProductVariant.create({
      productId: product.getDataValue('id'),
      variantType: body.variantType || 'color',
      label: body.variantLabel || 'Default',
      colorName: body.colorName || null,
      colorHex: body.colorHex || null,
      size: body.size || null,
      sizes: null,
      sku: body.sku || generateSku(),
      price: body.price,
      originalPrice: body.originalPrice || null,
      stockQty: body.stockQty || 0,
      lowStockThreshold: body.lowStockThreshold ?? 10,
      gstRate: typeof body.gstRate === 'number' ? body.gstRate : 5.00,
      imageUrl: body.variantImageUrl || null,
      isDefault: true,
      status: 'active',
      sortOrder: 0,
    }, { transaction: t })

    const galleryImages = body.variantImages || []
    for (let i = 0; i < galleryImages.length; i++) {
      await VariantImage.create({
        variantId: variant.getDataValue('id'),
        imageUrl: galleryImages[i],
        sortOrder: i,
      }, { transaction: t })
    }

    await Product.update({ hasVariants: true }, { where: { id: product.getDataValue('id') }, transaction: t })

    return product
  })

  await writeAuditLog({
    adminId: adminId(req),
    action: 'create',
    entity: 'product',
    entityId: String(result.getDataValue('id')),
    details: body,
  })

  res.status(201).json({ item: result.get({ plain: true }) })
}

function slugifyImport(str: string): string {
  return str
    .toLowerCase()
    .replace(/[&]/g, 'and')
    .replace(/[₹]/g, 'rs')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

// Excel/CSV cells arrive as strings like "yes"/"no"/"true"/"1" (or a real boolean
// for actual checkbox-typed cells) — a plain `!!value` treats any non-empty
// string (including the literal "no") as true, so this parses the intent instead.
function parseImportBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  const normalized = String(value ?? '').trim().toLowerCase()
  return normalized === 'yes' || normalized === 'true' || normalized === '1'
}

interface ImportRow {
  name: string
  categoryId?: number
  subCategoryId?: number
  gender?: string
  description?: string
  price?: number
  originalPrice?: number
  stockQty?: number
  lowStockThreshold?: number
  enableBackInStockNotify?: boolean
  tag?: string
  washCare?: string
  gstRate?: number
  weightKg?: number
  lengthCm?: number
  breadthCm?: number
  heightCm?: number
  featured?: boolean
  isNew?: boolean
  isBestSeller?: boolean
  code?: string
  color?: string
}

export const importProducts = async (req: Request, res: Response) => {
  const file = req.file
  if (!file) throw new AppError(400, 'Excel file is required.')

  let rows: ImportRow[] = []
  const ext = path.extname(file.originalname).toLowerCase()

  try {
    if (ext === '.csv') {
      const ws = await new ExcelJS.Workbook().csv.readFile(file.path)
      if (!ws) throw new AppError(422, 'CSV file is empty.')

      const headersRow = ws.getRow(1)
      const headers: string[] = []
      headersRow.eachCell((cell) => {
        headers.push(String(cell.value || '').trim())
      })

      ws.eachRow((row: any, rowIdx: number) => {
        if (rowIdx === 1) return
        const obj: Record<string, any> = {}
        row.eachCell((cell: any, colIdx: number) => {
          obj[headers[colIdx - 1]] = cell.value
        })
        rows.push(obj as unknown as ImportRow)
      })
    } else {
      // Parse xlsx / xls
      const wb = await new ExcelJS.Workbook().xlsx.readFile(file.path)
      const ws = wb.worksheets[0]
      if (!ws) throw new AppError(422, 'Excel file is empty.')

      const headers: string[] = []
      ws.getRow(1).eachCell((cell) => {
        headers.push(String(cell.value || '').trim())
      })

      ws.eachRow((row, rowIdx) => {
        if (rowIdx === 1) return
        const obj: Record<string, any> = {}
        row.eachCell((cell, colIdx) => {
          obj[headers[colIdx - 1]] = cell.value
        })
        rows.push(obj as unknown as ImportRow)
      })
    }
  } catch (err: any) {
    fs.unlink(file.path, () => {})
    throw new AppError(422, 'Failed to parse file: ' + (err.message || 'Invalid format'))
  }

  // Cleanup uploaded file
  fs.unlink(file.path, () => {})

  if (rows.length === 0) {
    return res.json({ total: 0, created: 0, errors: [{ row: 1, message: 'No data rows found.' }] })
  }

  // Pre-fetch all categories for lookup
  const allCategories = await Category.findAll({ where: { active: true }, raw: true }) as any[]
  const allSubCategories = await Category.findAll({ where: { active: true }, raw: true }) as any[]

  const errors: { row: number; message: string }[] = []
  let createdCount = 0

  const existingCodes = await Product.findAll({ attributes: ['code'], where: { code: { [Op.ne]: null } }, raw: true }) as any[]
  const codeSet = new Set(existingCodes.map((p: any) => String(p.code).toLowerCase()))

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const rowNum = i + 2

    try {
      if (!r.name || !String(r.name).trim()) {
        errors.push({ row: rowNum, message: 'Product name is required.' })
        continue
      }

      const name = String(r.name).trim()
      const slug = slugifyImport(name)

      let categoryId: number | null = null
      if (r.categoryId) {
        const catId = Number(r.categoryId)
        const match = allCategories.find((c: any) => Number(c.id) === catId)
        if (match) {
          categoryId = catId
        } else {
          errors.push({ row: rowNum, message: `categoryId "${r.categoryId}" not found. Check Categories page for valid IDs.` })
          continue
        }
      }

      let subCategoryId: number | null = null
      if (r.subCategoryId) {
        const subId = Number(r.subCategoryId)
        const match = allSubCategories.find((c: any) => Number(c.id) === subId)
        if (match) {
          subCategoryId = subId
        } else {
          errors.push({ row: rowNum, message: `subCategoryId "${r.subCategoryId}" not found. Check Categories page for valid IDs.` })
          continue
        }
      }

      const gender = ['women', 'kids', 'men', 'unisex'].includes(String(r.gender || '').toLowerCase())
        ? String(r.gender).toLowerCase()
        : null

      // Imported products never come with an image (the sheet has no image column), so they
      // always land as 'draft' — invisible on the storefront until an admin adds images and
      // manually activates them via the edit form.
      const status = 'draft'

      let code: string | null = null
      if (r.code) {
        code = String(r.code).trim()
        if (codeSet.has(code.toLowerCase())) {
          errors.push({ row: rowNum, message: `Product code "${code}" already exists.` })
          continue
        }
        codeSet.add(code.toLowerCase())
      }

      const price = r.price != null ? Number(r.price) : 0
      if (isNaN(price) || price < 0) {
        errors.push({ row: rowNum, message: `Invalid price "${r.price}".` })
        continue
      }

      const originalPrice = r.originalPrice != null ? Number(r.originalPrice) : null
      if (originalPrice !== null && (isNaN(originalPrice) || originalPrice < 0)) {
        errors.push({ row: rowNum, message: `Invalid originalPrice "${r.originalPrice}".` })
        continue
      }

      const stockQty = r.stockQty != null ? Math.floor(Number(r.stockQty)) : 0
      if (isNaN(stockQty) || stockQty < 0) {
        errors.push({ row: rowNum, message: `Invalid stockQty "${r.stockQty}".` })
        continue
      }

      const lowStockThreshold = r.lowStockThreshold != null ? Math.floor(Number(r.lowStockThreshold)) : 10
      if (isNaN(lowStockThreshold) || lowStockThreshold < 0) {
        errors.push({ row: rowNum, message: `Invalid lowStockThreshold "${r.lowStockThreshold}".` })
        continue
      }

      const gstRate = r.gstRate != null ? Number(r.gstRate) : 5
      if (isNaN(gstRate) || gstRate < 0 || gstRate > 100) {
        errors.push({ row: rowNum, message: `Invalid gstRate "${r.gstRate}". Must be 0-100.` })
        continue
      }

      const weightKg = r.weightKg != null ? Number(r.weightKg) : null
      if (weightKg !== null && (isNaN(weightKg) || weightKg < 0)) {
        errors.push({ row: rowNum, message: `Invalid weightKg "${r.weightKg}".` })
        continue
      }

      const lengthCm = r.lengthCm != null ? Number(r.lengthCm) : null
      if (lengthCm !== null && (isNaN(lengthCm) || lengthCm < 0)) {
        errors.push({ row: rowNum, message: `Invalid lengthCm "${r.lengthCm}".` })
        continue
      }

      const breadthCm = r.breadthCm != null ? Number(r.breadthCm) : null
      if (breadthCm !== null && (isNaN(breadthCm) || breadthCm < 0)) {
        errors.push({ row: rowNum, message: `Invalid breadthCm "${r.breadthCm}".` })
        continue
      }

      const heightCm = r.heightCm != null ? Number(r.heightCm) : null
      if (heightCm !== null && (isNaN(heightCm) || heightCm < 0)) {
        errors.push({ row: rowNum, message: `Invalid heightCm "${r.heightCm}".` })
        continue
      }

      const isNewFlag = parseImportBool(r.isNew)
      const isBestSellerFlag = !isNewFlag && parseImportBool(r.isBestSeller)

      await Product.create({
        name,
        slug,
        code,
        categoryId,
        subCategoryId,
        description: r.description ? String(r.description).trim() : null,
        price,
        originalPrice,
        stockQty,
        lowStockThreshold,
        enableBackInStockNotify: parseImportBool(r.enableBackInStockNotify),
        tag: r.tag ? String(r.tag).trim() : null,
        gender,
        metadata: { washCare: r.washCare ? String(r.washCare).trim() : null },
        color: r.color ? String(r.color).trim() : null,
        status,
        gstRate,
        weightKg,
        lengthCm,
        breadthCm,
        heightCm,
        featured: parseImportBool(r.featured),
        isNew: isNewFlag,
        isBestSeller: isBestSellerFlag,
        hasVariants: false,
        sortOrder: 0,
      })

      createdCount++
    } catch (err: any) {
      errors.push({ row: rowNum, message: err.message || 'Unknown error' })
    }
  }

  await writeAuditLog({
    adminId: adminId(req),
    action: 'import',
    entity: 'product',
    entityId: `bulk-${createdCount}-of-${rows.length}`,
    details: { total: rows.length, created: createdCount, errors: errors.length },
  })

  res.json({ total: rows.length, created: createdCount, errors })
}

export const downloadSampleImport = async (_req: Request, res: Response) => {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'A1 TEX'
  wb.created = new Date()

  const ws = wb.addWorksheet('Products', {
    properties: { tabColor: { argb: '8B1A2B' } },
    pageSetup: { paperSize: 9, orientation: 'landscape' },
  })

  ws.columns = [
    { header: 'name', key: 'name', width: 28 },
    { header: 'code', key: 'code', width: 16 },
    { header: 'categoryId', key: 'categoryId', width: 14 },
    { header: 'subCategoryId', key: 'subCategoryId', width: 16 },
    { header: 'gender', key: 'gender', width: 12 },
    { header: 'color', key: 'color', width: 16 },
    { header: 'price', key: 'price', width: 12 },
    { header: 'originalPrice', key: 'originalPrice', width: 14 },
    { header: 'stockQty', key: 'stockQty', width: 12 },
    { header: 'lowStockThreshold', key: 'lowStockThreshold', width: 18 },
    { header: 'enableBackInStockNotify', key: 'enableBackInStockNotify', width: 22 },
    { header: 'description', key: 'description', width: 40 },
    { header: 'tag', key: 'tag', width: 16 },
    { header: 'washCare', key: 'washCare', width: 30 },
    { header: 'gstRate', key: 'gstRate', width: 10 },
    { header: 'featured', key: 'featured', width: 10 },
    { header: 'isNew', key: 'isNew', width: 10 },
    { header: 'isBestSeller', key: 'isBestSeller', width: 12 },
    { header: 'weightKg', key: 'weightKg', width: 10 },
    { header: 'lengthCm', key: 'lengthCm', width: 10 },
    { header: 'breadthCm', key: 'breadthCm', width: 10 },
    { header: 'heightCm', key: 'heightCm', width: 10 },
  ]

  const headerRow = ws.getRow(1)
  headerRow.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFF' }, size: 11 }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '8B1A2B' } }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.height = 22

  // Add sample data row
  ws.addRow({
    name: 'Sample Silk Saree',
    code: 'A1-SILK-001',
    categoryId: '',
    subCategoryId: '',
    gender: 'women',
    color: 'Red',
    price: 2500,
    originalPrice: 3500,
    stockQty: 10,
    lowStockThreshold: 5,
    enableBackInStockNotify: 'no',
    description: 'A beautiful sample silk saree with golden border.',
    tag: 'New Arrival',
    washCare: 'Dry clean only',
    gstRate: 5,
    featured: 'yes',
    isNew: 'yes',
    isBestSeller: 'no',
    weightKg: 0.5,
    lengthCm: 10,
    breadthCm: 10,
    heightCm: 5,
  })

  const buf = await wb.xlsx.writeBuffer()

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename="product-import-sample.xlsx"')
  res.send(Buffer.from(buf))
}

interface VariantImportRow {
  productId?: number
  productCode?: string
  variantType?: string
  colorName?: string
  colorHex?: string
  size?: string
  sku?: string
  price?: number
  originalPrice?: number
  stockQty?: number
  lowStockThreshold?: number
  gstRate?: number
  isDefault?: boolean
}

export const importVariants = async (req: Request, res: Response) => {
  const file = req.file
  if (!file) throw new AppError(400, 'Excel file is required.')

  let rows: VariantImportRow[] = []
  const ext = path.extname(file.originalname).toLowerCase()

  try {
    if (ext === '.csv') {
      const ws = await new ExcelJS.Workbook().csv.readFile(file.path)
      if (!ws) throw new AppError(422, 'CSV file is empty.')
      const headers: string[] = []
      ws.getRow(1).eachCell((cell) => { headers.push(String(cell.value || '').trim()) })
      ws.eachRow((row: any, rowIdx: number) => {
        if (rowIdx === 1) return
        const obj: Record<string, any> = {}
        row.eachCell((cell: any, colIdx: number) => { obj[headers[colIdx - 1]] = cell.value })
        rows.push(obj as unknown as VariantImportRow)
      })
    } else {
      const wb = await new ExcelJS.Workbook().xlsx.readFile(file.path)
      const ws = wb.worksheets[0]
      if (!ws) throw new AppError(422, 'Excel file is empty.')
      const headers: string[] = []
      ws.getRow(1).eachCell((cell) => { headers.push(String(cell.value || '').trim()) })
      ws.eachRow((row, rowIdx) => {
        if (rowIdx === 1) return
        const obj: Record<string, any> = {}
        row.eachCell((cell, colIdx) => { obj[headers[colIdx - 1]] = cell.value })
        rows.push(obj as unknown as VariantImportRow)
      })
    }
  } catch (err: any) {
    fs.unlink(file.path, () => {})
    throw new AppError(422, 'Failed to parse file: ' + (err.message || 'Invalid format'))
  }

  fs.unlink(file.path, () => {})

  if (rows.length === 0) {
    return res.json({ total: 0, created: 0, errors: [{ row: 1, message: 'No data rows found.' }] })
  }

  const allProducts = await Product.findAll({ attributes: ['id', 'code'], raw: true }) as any[]
  const productById = new Map(allProducts.map((p: any) => [Number(p.id), p]))
  const productByCode = new Map(allProducts.map((p: any) => [String(p.code).toLowerCase(), p]))

  const errors: { row: number; message: string }[] = []
  let createdCount = 0
  const productsToSync = new Set<number>()
  const createdVariants: Array<{ productId: number; variantId: number; stockQty: number }> = []

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const rowNum = i + 2

    try {
      let productId: number | null = null
      if (r.productId) {
        const pid = Number(r.productId)
        if (productById.has(pid)) {
          productId = pid
        } else {
          errors.push({ row: rowNum, message: `productId "${r.productId}" not found.` })
          continue
        }
      } else if (r.productCode) {
        const code = String(r.productCode).trim().toLowerCase()
        const match = productByCode.get(code)
        if (match) {
          productId = Number(match.id)
        } else {
          errors.push({ row: rowNum, message: `productCode "${r.productCode}" not found.` })
          continue
        }
      } else {
        errors.push({ row: rowNum, message: 'Either productId or productCode is required.' })
        continue
      }

      const count = await ProductVariant.count({ where: { productId } })
      if (count >= 12) {
        errors.push({ row: rowNum, message: `Product ID ${productId} already has 12 variants (maximum).` })
        continue
      }

      const variantType = ['color', 'size'].includes(String(r.variantType || '').toLowerCase())
        ? String(r.variantType).toLowerCase() : 'color'

      const colorName = r.colorName ? String(r.colorName).trim() : null
      const colorHex = r.colorHex ? String(r.colorHex).trim() : null

      if (colorName && !colorHex) {
        errors.push({ row: rowNum, message: 'colorHex is required when colorName is set.' })
        continue
      }

      await assertUniqueVariantCombination(productId, {
        variantType,
        colorName,
        colorHex,
        size: r.size ? String(r.size).trim() : null,
        sku: null,
      } as any)

      let sku = r.sku ? String(r.sku).trim() : null
      if (sku) {
        const existing = await ProductVariant.findOne({ where: { sku } })
        if (existing) {
          errors.push({ row: rowNum, message: `SKU "${sku}" already exists.` })
          continue
        }
      } else {
        sku = generateSku()
      }

      const price = r.price != null ? Number(r.price) : null
      if (price !== null && (isNaN(price) || price < 0)) {
        errors.push({ row: rowNum, message: `Invalid price "${r.price}".` })
        continue
      }

      const originalPrice = r.originalPrice != null ? Number(r.originalPrice) : null
      if (originalPrice !== null && (isNaN(originalPrice) || originalPrice < 0)) {
        errors.push({ row: rowNum, message: `Invalid originalPrice "${r.originalPrice}".` })
        continue
      }

      if (price != null && originalPrice != null && originalPrice < price) {
        errors.push({ row: rowNum, message: 'originalPrice must be >= price.' })
        continue
      }

      const stockQty = r.stockQty != null ? Math.floor(Number(r.stockQty)) : 0
      if (isNaN(stockQty) || stockQty < 0) {
        errors.push({ row: rowNum, message: `Invalid stockQty "${r.stockQty}".` })
        continue
      }

      const lowStockThreshold = r.lowStockThreshold != null ? Math.floor(Number(r.lowStockThreshold)) : 10
      const gstRate = r.gstRate != null ? Number(r.gstRate) : 5
      const isDefault = parseImportBool(r.isDefault)
      // Imported variants never come with an image, so they always land as 'inactive' —
      // hidden from the storefront until an admin adds an image and manually activates them.
      const status = 'inactive'

      const shouldBeDefault = count === 0 || isDefault
      if (shouldBeDefault) {
        await ProductVariant.update({ isDefault: false }, { where: { productId } })
      }

      const label = (colorName || (r.size ? String(r.size).trim() : null)) || 'Default'
      const created = await ProductVariant.create({
        productId,
        variantType,
        label,
        colorName,
        colorHex: colorName ? colorHex : null,
        size: r.size ? String(r.size).trim() : null,
        sizes: null,
        sku,
        price,
        originalPrice,
        stockQty,
        sizeStock: null,
        lowStockThreshold,
        gstRate,
        isDefault: shouldBeDefault,
        status,
        sortOrder: 0,
      })

      createdCount++
      productsToSync.add(productId)
      if ((stockQty ?? 0) > 0) {
        createdVariants.push({ productId, variantId: Number(created.getDataValue('id')), stockQty: stockQty ?? 0 })
      }
    } catch (err: any) {
      errors.push({ row: rowNum, message: err.message || 'Unknown error' })
    }
  }

  for (const pid of productsToSync) {
    await updateProductStock(pid)
  }

  await writeAuditLog({
    adminId: adminId(req),
    action: 'import',
    entity: 'product_variant',
    entityId: `bulk-${createdCount}-of-${rows.length}`,
    details: { total: rows.length, created: createdCount, errors: errors.length },
  })

  res.json({ total: rows.length, created: createdCount, errors })
}

export const downloadVariantImportSample = async (_req: Request, res: Response) => {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'A1 TEX'
  wb.created = new Date()

  const ws = wb.addWorksheet('Variants', {
    properties: { tabColor: { argb: '8B1A2B' } },
    pageSetup: { paperSize: 9, orientation: 'landscape' },
  })

  ws.columns = [
    { header: 'productId', key: 'productId', width: 14 },
    { header: 'productCode', key: 'productCode', width: 16 },
    { header: 'variantType', key: 'variantType', width: 14 },
    { header: 'colorName', key: 'colorName', width: 16 },
    { header: 'colorHex', key: 'colorHex', width: 12 },
    { header: 'size', key: 'size', width: 12 },
    { header: 'sku', key: 'sku', width: 18 },
    { header: 'price', key: 'price', width: 12 },
    { header: 'originalPrice', key: 'originalPrice', width: 14 },
    { header: 'stockQty', key: 'stockQty', width: 12 },
    { header: 'lowStockThreshold', key: 'lowStockThreshold', width: 18 },
    { header: 'gstRate', key: 'gstRate', width: 10 },
    { header: 'isDefault', key: 'isDefault', width: 12 },
  ]

  const headerRow = ws.getRow(1)
  headerRow.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFF' }, size: 11 }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '8B1A2B' } }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.height = 22

  ws.addRow({
    productId: '',
    productCode: 'A1-SILK-001',
    variantType: 'color',
    colorName: 'Red',
    colorHex: '#FF0000',
    size: '',
    sku: '',
    price: 2500,
    originalPrice: 3500,
    stockQty: 10,
    lowStockThreshold: 5,
    gstRate: 5,
    isDefault: 'yes',
  })

  ws.addRow({
    productId: '',
    productCode: 'A1-SILK-001',
    variantType: 'color',
    colorName: 'Blue',
    colorHex: '#0000FF',
    size: '',
    sku: '',
    price: 2500,
    originalPrice: 3500,
    stockQty: 8,
    lowStockThreshold: 5,
    gstRate: 5,
    isDefault: '',
  })

  const buf = await wb.xlsx.writeBuffer()

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename="variant-import-sample.xlsx"')
  res.send(Buffer.from(buf))
}
