import { Request, Response } from 'express'
import { Op } from 'sequelize'
import { z } from 'zod'
import {
  AnnouncementMessage,
  MarqueeMessage,
  Banner,
  Category,
  Coupon,
  CouponUsage,
  CouponCustomer,
  Customer,
  Order,
  OrderItem,
  Product,
  ProductImage,
  ProductVariant,
  Setting,
  VariantImage,
  ContactEnquiry,
  WishlistItem,
} from '../../../models/index.js'
import { writeAuditLog } from '../../../services/audit.service.js'
import { expireOldCoupons } from '../../../services/coupon-expiry.service.js'
import { AppError } from '../../../utils/http.js'
import { slugify } from '../../../utils/slug.js'
import { syncInvoiceStatus } from '../../../services/invoice.service.js'
import { invalidateCompanyCache, invalidateShippingCache, invalidateGuestDiscountPopupCache, invalidateCourierCache } from '../../../services/settings.service.js'
import {
  cleanupFile,
  filePathFromUrl,
} from '../../../services/image.service.js'
import { sequelize } from '../../../database/sequelize.js'
import { UPLOADS_DIR } from './upload.controller.js'
import { adminId, paginationSchema, idParam } from './utils.js'
import { productCreateSchema } from './product.controller.js'

import { clearNavCache } from '../../storefront/controllers/navigation.controller.js'

export type ResourceConfig = {
  model: any
  entity: string
  writable: string[]
  imageFields?: string[]
  defaultOrder?: [string, string][]
  beforeSave?: (body: Record<string, unknown>, req?: Request) => Record<string, unknown> | Promise<Record<string, unknown>>
  validationSchema?: z.ZodType<any>
  deleteGuard?: (id: string) => Promise<string | null>
  onBeforeDelete?: (id: string) => Promise<void>
  useForceDelete?: boolean
  handleOwnImageCleanup?: boolean
}

export const categoryCreateSchema = z.object({
  parentId: z.union([
    z.coerce.number().int().positive(),
    z.literal(''),
    z.null(),
  ]).optional().transform(v => (v === '' || !v ? null : Number(v))),
  section: z.string().max(80, 'Section is too long.').optional().nullable(),
  name: z.string().min(2, 'Category name must be at least 2 characters.').max(140, 'Category name cannot exceed 140 characters.'),
  slug: z.string().max(180).optional().nullable(),
  href: z.string().max(255).optional().nullable(),
  imageUrl: z.string().min(1, 'Category image is required.').max(255),
  tag: z.union([z.string().max(80), z.null()]).optional(),
  navVisible: z.boolean().optional().default(true),
  homeVisible: z.boolean().optional().default(true),
  headerHighlight: z.boolean().optional().default(false),
  sortOrder: z.coerce.number().int().min(0, 'Sort order must be 0 or greater.').optional().default(0),
  active: z.boolean().optional().default(true),
  metadata: z.any().optional(),
})

export const contactEnquirySchema = z.object({
  name: z.string().min(1, 'Name is required.').max(140, 'Name is too long.'),
  email: z.string().email('Invalid email address.').max(190, 'Email is too long.'),
  phonenumber: z.string().min(10, 'Phone number must be at least 10 digits.').max(32, 'Phone number is too long.'),
  message: z.string().min(5, 'Message must be at least 5 characters.').max(2000, 'Message is too long.'),
})

export const bannerCreateSchema = z.object({
  placement: z.string().min(1, 'Placement is required.').max(80),
  title: z.string().max(180).optional().nullable(),
  subtitle: z.string().max(500).optional().nullable(),
  imageUrl: z.string({ required_error: 'Banner image is required.' }).min(1, 'Banner image is required.').max(255),
  ctaLabel: z.string().max(80).optional().nullable(),
  ctaUrl: z.string().max(255).optional().nullable(),
  sortOrder: z.coerce.number().int().default(0),
  active: z.boolean().default(true),
})

export const resourceConfig: Record<string, ResourceConfig> = {
  enquiries: {
    model: ContactEnquiry,
    entity: 'contact_enquiry',
    writable: ['name', 'email', 'phonenumber', 'message'],
    defaultOrder: [['id', 'DESC']],
    validationSchema: contactEnquirySchema,
  },
  'announcement-messages': {
    model: AnnouncementMessage,
    entity: 'announcement_message',
    writable: ['text', 'linkUrl', 'sortOrder', 'active'],
    defaultOrder: [['sortOrder', 'ASC'], ['id', 'ASC']],
  },
  'marquee-messages': {
    model: MarqueeMessage,
    entity: 'marquee_message',
    writable: ['text', 'sortOrder', 'active'],
    defaultOrder: [['sortOrder', 'ASC'], ['id', 'ASC']],
  },
  banners: {
    model: Banner,
    entity: 'banner',
    writable: ['placement', 'title', 'subtitle', 'imageUrl', 'ctaLabel', 'ctaUrl', 'sortOrder', 'active'],
    imageFields: ['imageUrl'],
    defaultOrder: [['sortOrder', 'ASC'], ['id', 'ASC']],
    validationSchema: bannerCreateSchema,
  },
  categories: {
    model: Category,
    entity: 'category',
    writable: ['section', 'name', 'slug', 'href', 'imageUrl', 'tag', 'navVisible', 'homeVisible', 'headerHighlight', 'sortOrder', 'active', 'metadata', 'parentId'],
    imageFields: ['imageUrl'],
    defaultOrder: [['sortOrder', 'ASC'], ['id', 'ASC']],
    validationSchema: categoryCreateSchema,
    beforeSave: async (body, req) => {
      const parentId = body.parentId ? Number(body.parentId) : null
      let baseSlug = body.slug ? slugify(String(body.slug)) : slugify(String(body.name || ''))
      if (!baseSlug) baseSlug = 'category'

      let slug = baseSlug
      let counter = 1
      const updateId = req?.params?.id ? Number(req.params.id) : (body.id ? Number(body.id) : null)
      while (true) {
        const existing = await Category.findOne({
          where: {
            slug,
            ...(updateId ? { id: { [Op.ne]: updateId } } : {}),
          },
          paranoid: false,
        })
        if (!existing) break
        counter++
        slug = `${baseSlug}-${counter}`
      }

      let section = body.section ? String(body.section).trim() : ''
      if (!section) {
        if (parentId) {
          const parent = await Category.findByPk(parentId)
          section = parent ? String(parent.get('section') || parent.get('name')) : String(body.name || '')
        } else {
          section = String(body.name || '')
        }
      }

      const isBrowseAll = slug === 'browse-all' || String(body.name || '').toLowerCase().trim() === 'browse all'
      const href = body.href && String(body.href).trim()
        ? String(body.href).trim()
        : (isBrowseAll ? '/shop' : (parentId ? `/shop?category=${slug}` : `/shop?section=${slug}`))

      return {
        ...body,
        parentId,
        section,
        slug,
        href,
        navVisible: body.navVisible !== undefined ? Boolean(body.navVisible) : true,
      }
    },
    useForceDelete: true,
    onBeforeDelete: async (id: string) => {
      const numId = Number(id)

      const cat = await Category.findByPk(numId, { paranoid: false })
      if (cat) {
        const url = (cat as any).imageUrl
        if (url) {
          const fp = filePathFromUrl(url, UPLOADS_DIR)
          if (fp) cleanupFile(fp)
        }
      }

      const children = await Category.findAll({ where: { parentId: numId }, paranoid: false }) as any[]
      for (const child of children) {
        if (child.imageUrl) {
          const fp = filePathFromUrl(child.imageUrl, UPLOADS_DIR)
          if (fp) cleanupFile(fp)
        }
        const childProducts = await Product.findAll({
          where: { [Op.or]: [{ categoryId: child.id }, { subCategoryId: child.id }] },
        }) as any[]
        for (const product of childProducts) {
          await cascadeDeleteProduct(product.id)
        }
        await Category.destroy({ where: { id: child.id }, force: true })
      }

      const parentProducts = await Product.findAll({
        where: { [Op.or]: [{ categoryId: numId }, { subCategoryId: numId }] },
      }) as any[]
      for (const product of parentProducts) {
        await cascadeDeleteProduct(product.id)
      }
    },
  },
  products: {
    model: Product,
    entity: 'product',
    writable: ['code', 'name', 'slug', 'type', 'description', 'categoryId', 'subCategoryId', 'price', 'originalPrice', 'stockQty', 'enableBackInStockNotify', 'imageUrl', 'color', 'gender', 'ageGroup', 'hasVariants', 'status', 'featured', 'isNew', 'isBestSeller', 'sortOrder', 'gstRate', 'weightKg', 'lengthCm', 'breadthCm', 'heightCm', 'metaTitle', 'metaDescription', 'metadata'],
    imageFields: ['imageUrl'],
    defaultOrder: [['sortOrder', 'ASC'], ['id', 'DESC']],
    validationSchema: productCreateSchema,
    beforeSave: async body => {
      const res: Record<string, unknown> = { ...body }
      if ('slug' in body || 'name' in body) {
        if (body.slug) {
          res.slug = body.slug
        } else if (body.name) {
          res.slug = slugify(String(body.name))
        }
      }
      if ('status' in body && body.status != null) {
        res.status = body.status === 'inactive' ? 'archived' : body.status
      }
      return res
    },
    useForceDelete: true,
    handleOwnImageCleanup: true,
    onBeforeDelete: async (id: string) => {
      await cascadeDeleteProduct(Number(id))
    },
  },
  customers: {
    model: Customer,
    entity: 'customer',
    writable: ['name', 'email', 'mobile', 'status', 'emailVerified'],
    defaultOrder: [['id', 'DESC']],
    deleteGuard: async () => 'Customer accounts cannot be deleted.',
    onBeforeDelete: async (id: string) => {
      const numId = Number(id)
      await CouponCustomer.destroy({ where: { customerId: numId } }).catch(() => {})
      await WishlistItem.destroy({ where: { userId: numId } }).catch(() => {})
    },
  },
  coupons: {
    model: Coupon,
    entity: 'coupon',
    writable: ['code', 'type', 'value', 'minCartValue', 'maxDiscount', 'usageLimit', 'perUserLimit', 'startsAt', 'expiresAt', 'active', 'description'],
    defaultOrder: [['id', 'DESC']],
    validationSchema: z.object({
      code: z.string().min(2).max(50).transform(s => s.toUpperCase()),
      type: z.enum(['percentage', 'fixed']),
      value: z.coerce.number().min(0, 'Value cannot be negative.'),
      minCartValue: z.coerce.number().min(0).optional().default(0),
      maxDiscount: z.union([z.coerce.number().min(0), z.null()]).optional(),
      usageLimit: z.union([z.coerce.number().int().min(0), z.null()]).optional(),
      perUserLimit: z.coerce.number().int().min(1).optional().default(1),
      startsAt: z.union([z.string(), z.null()]).optional(),
      expiresAt: z.union([z.string(), z.null()]).optional(),
      active: z.boolean().optional().default(true),
      description: z.union([z.string().max(255), z.null()]).optional(),
      customerIds: z.array(z.number().int().positive()).optional(),
    }),
    beforeSave: body => {
      const res: Record<string, unknown> = { ...body }
      if ('code' in body) res.code = String(body.code ?? '').toUpperCase()
      if ('startsAt' in body && (body.startsAt === '' || body.startsAt === undefined)) res.startsAt = null
      if ('expiresAt' in body && (body.expiresAt === '' || body.expiresAt === undefined)) res.expiresAt = null
      if ('maxDiscount' in body && (body.maxDiscount === '' || body.maxDiscount === undefined)) res.maxDiscount = null
      if ('usageLimit' in body && (body.usageLimit === '' || body.usageLimit === undefined)) res.usageLimit = null
      if ('description' in body && body.description === '') res.description = null
      return res
    },
  },
  orders: {
    model: Order,
    entity: 'order',
    writable: ['status', 'paymentStatus', 'paymentMethod', 'deliveryAgentName', 'deliveryAgentPhone', 'trackingNumber', 'dispatchedAt', 'deliveredAt', 'metadata'],
    defaultOrder: [['id', 'DESC']],
    deleteGuard: async () => 'Orders cannot be deleted. Cancel instead.',
  },
  settings: {
    model: Setting,
    entity: 'setting',
    writable: ['key', 'value'],
    defaultOrder: [['key', 'ASC']],
  },
}

async function cascadeDeleteProduct(productId: number) {
  const product = await Product.findByPk(productId, { attributes: ['id', 'imageUrl'] }) as any
  const mainImageUrl = product?.imageUrl as string | null

  // Check if any order references the main product image
  let mainImageReferencedByOrder = false
  if (mainImageUrl) {
    const refCount = await OrderItem.count({ where: { imageUrl: mainImageUrl } })
    mainImageReferencedByOrder = refCount > 0
  }

  // Delete main product image only if no orders reference it
  if (mainImageUrl && !mainImageReferencedByOrder) {
    const fp = filePathFromUrl(mainImageUrl, UPLOADS_DIR)
    if (fp) cleanupFile(fp)
  }

  // Delete gallery images (only if not stored in orders)
  const prodImages = await ProductImage.findAll({ where: { productId } }) as any[]
  for (const img of prodImages) {
    if (img.imageUrl) {
      const refCount = await OrderItem.count({ where: { imageUrl: img.imageUrl } })
      if (refCount === 0) {
        const fp = filePathFromUrl(img.imageUrl, UPLOADS_DIR)
        if (fp) cleanupFile(fp)
      }
    }
  }

  // Delete variant images — check each against order references
  const variants = await ProductVariant.findAll({ where: { productId } }) as any[]
  for (const variant of variants) {
    if (variant.imageUrl) {
      const vRefCount = await OrderItem.count({ where: { imageUrl: variant.imageUrl } })
      if (vRefCount === 0) {
        const fp = filePathFromUrl(variant.imageUrl, UPLOADS_DIR)
        if (fp) cleanupFile(fp)
      }
    }
    const varImages = await VariantImage.findAll({ where: { variantId: variant.id } }) as any[]
    for (const vimg of varImages) {
      if (vimg.imageUrl) {
        const vimgRefCount = await OrderItem.count({ where: { imageUrl: vimg.imageUrl } })
        if (vimgRefCount === 0) {
          const fp = filePathFromUrl(vimg.imageUrl, UPLOADS_DIR)
          if (fp) cleanupFile(fp)
        }
      }
    }
  }

  const variantIds = variants.map(v => v.id)
  if (variantIds.length > 0) {
    await VariantImage.destroy({ where: { variantId: variantIds } })
    await ProductVariant.destroy({ where: { productId } })
  }
  await ProductImage.destroy({ where: { productId } })
  await WishlistItem.destroy({ where: { productId } })
  await Product.destroy({ where: { id: productId }, force: true })
}

export async function pickWritable(body: Record<string, unknown>, config: ResourceConfig, req?: Request) {
  const picked: Record<string, unknown> = {}
  for (const field of config.writable) {
    if (field in body) {
      let val = body[field]
      if (val === '') val = null
      picked[field] = val
    }
  }
  return config.beforeSave ? await config.beforeSave(picked, req) : picked
}

// Replaces a coupon's eligible-customer list wholesale. An empty array means
// "all customers" (no restriction rows), matching the pre-existing behavior.
export async function syncCouponEligibility(couponId: number, customerIds: unknown[]) {
  const ids = [...new Set(customerIds.map(Number).filter(n => Number.isInteger(n) && n > 0))]
  await CouponCustomer.destroy({ where: { couponId } })
  if (ids.length > 0) {
    await CouponCustomer.bulkCreate(ids.map(customerId => ({ couponId, customerId })))
  }
}

export function collectImageUrls(item: any, config: ResourceConfig): string[] {
  if (!config.imageFields) return []
  const urls: string[] = []
  const plain = item.get ? item.get({ plain: true }) : item
  for (const field of config.imageFields) {
    const val = plain[field]
    if (typeof val === 'string' && val.trim()) urls.push(val)
  }
  return urls
}

export async function cleanOrphanFiles(oldImageUrls: string[], newBody: Record<string, unknown>, config: ResourceConfig): Promise<void> {
  if (!config.imageFields) return
  const newUrls = new Set<string>()
  for (const field of config.imageFields) {
    const val = newBody[field]
    if (typeof val === 'string') newUrls.add(val)
  }
  for (const oldUrl of oldImageUrls) {
    if (!newUrls.has(oldUrl)) {
      const refCount = await OrderItem.count({ where: { imageUrl: oldUrl } })
      if (refCount === 0) {
        const fp = filePathFromUrl(oldUrl, UPLOADS_DIR)
        if (fp) cleanupFile(fp)
      }
    }
  }
}

const resourceParam = z.object({ resource: z.string().min(1) })

export const getCouponUsages = async (req: Request, res: Response) => {
  const { id } = idParam.parse(req.params)
  const coupon = await Coupon.findByPk(id)
  if (!coupon) throw new AppError(404, 'Coupon not found.')

  const usages = await CouponUsage.findAll({
    where: { couponId: Number(id) },
    include: [{ model: Order, attributes: ['orderNumber', 'grandTotal', 'createdAt'] }],
    order: [['usedAt', 'DESC']],
  })

  res.json({ items: usages.map((u: any) => u.get({ plain: true })) })
}

// Repeat customers (2+ real orders), ranked by lifetime spend — used by the
// admin Coupons UI to pick who a customer-restricted coupon should target.
// Excludes pending_payment (abandoned checkout) and cancelled orders since
// neither represents a completed purchase.
export const getTopCustomers = async (_req: Request, res: Response) => {
  const rows = await Order.findAll({
    attributes: [
      'customerId',
      [sequelize.fn('COUNT', sequelize.col('Order.id')), 'orderCount'],
      [sequelize.fn('SUM', sequelize.col('Order.grand_total')), 'totalAmount'],
    ],
    where: {
      customerId: { [Op.ne]: null },
      status: { [Op.notIn]: ['pending_payment', 'cancelled'] },
    },
    include: [{ model: Customer, attributes: ['id', 'name', 'email'] }],
    group: ['customerId', 'Customer.id'],
    having: sequelize.where(sequelize.fn('COUNT', sequelize.col('Order.id')), { [Op.gte]: 2 }),
    order: [[sequelize.literal('totalAmount'), 'DESC']],
  }) as unknown as Array<any>

  res.json({
    items: rows.map(row => {
      const plain = row.get({ plain: true })
      return {
        customerId: plain.customerId,
        name: plain.Customer?.name ?? null,
        email: plain.Customer?.email ?? null,
        orderCount: Number(plain.orderCount),
        totalAmount: Number(plain.totalAmount),
      }
    }),
  })
}

export const listResource = async (req: Request, res: Response) => {
  const { resource } = resourceParam.parse(req.params)
  const config = resourceConfig[resource]
  if (!config) throw new AppError(404, 'Admin resource not found.')

  const { page, perPage } = paginationSchema.parse(req.query)
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''

  const includeOptions = resource === 'products'
    ? [{
        model: Category, as: 'Category',
        attributes: ['id', 'name', 'active', 'parentId'],
        include: [{
          model: Category, as: 'parent',
          attributes: ['id', 'name'],
        }],
      }]
    : resource === 'coupons'
      ? [{ model: CouponCustomer, as: 'eligibleCustomers', attributes: ['customerId'] }]
      : undefined

  // Auto-deactivate expired coupons every time the coupon list is requested
  if (resource === 'coupons') {
    await expireOldCoupons()
  }

  const where: any = {}
  if (resource === 'products' && search) {
    const variantMatches = await ProductVariant.findAll({
      where: { sku: { [Op.like]: `%${search}%` } },
      attributes: ['productId'],
      limit: 60,
      raw: true,
    }) as any[]
    const variantProductIds = Array.from(new Set(variantMatches.map(v => v.productId).filter(Boolean)))

    where[Op.or] = [
      { code: { [Op.like]: `%${search}%` } },
      { name: { [Op.like]: `%${search}%` } },
      { type: { [Op.like]: `%${search}%` } },
      ...(variantProductIds.length > 0 ? [{ id: { [Op.in]: variantProductIds } }] : []),
    ]
  }

  const [rows, total] = await Promise.all([
    config.model.findAll({
      where: Object.keys(where).length ? where : undefined,
      order: config.defaultOrder ?? [['id', 'DESC']],
      offset: (page - 1) * perPage,
      limit: perPage,
      paranoid: true,
      include: includeOptions,
    }),
    config.model.count({ where: Object.keys(where).length ? where : undefined, paranoid: true }),
  ])

  res.json({
    items: rows.map((row: any) => {
      const plain = row.get({ plain: true })
      if (resource === 'products') {
        const cat = plain.Category
        if (cat) {
          if (cat.parentId && cat.parent) {
            plain.categoryName = cat.parent.name
            plain.subcategoryName = cat.name
          } else {
            plain.categoryName = cat.name
            plain.subcategoryName = null
          }
        } else {
          plain.categoryName = null
          plain.subcategoryName = null
        }
        if (plain.status === 'archived') {
          plain.status = 'inactive'
        }
        delete plain.Category
      }
      if (resource === 'coupons') {
        const customerIds = (plain.eligibleCustomers || []).map((c: any) => c.customerId)
        plain.customerIds = customerIds
        plain.eligibility = customerIds.length === 0 ? 'All Customers' : `${customerIds.length} customer${customerIds.length > 1 ? 's' : ''}`
        delete plain.eligibleCustomers
      }
      return plain
    }),
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  })
}

export const createResource = async (req: Request, res: Response) => {
  const { resource } = resourceParam.parse(req.params)
  const config = resourceConfig[resource]
  if (!config) throw new AppError(404, 'Admin resource not found.')

  // Validate with schema if available
  if (config.validationSchema) {
    config.validationSchema.parse(req.body)
  }

  const body = await pickWritable(req.body, config, req)
  const row = await config.model.create(body)

  if (resource === 'categories' || resource === 'announcement-messages' || resource === 'marquee-messages') {
    clearNavCache()
  }

  if (resource === 'coupons' && Array.isArray(req.body.customerIds)) {
    await syncCouponEligibility(Number(row.get('id')), req.body.customerIds)
  }

  if (config.entity === 'setting') {
    const settingKey = row.getDataValue('key')
    if (settingKey === 'company_info') {
      invalidateCompanyCache()
    }
    if (settingKey === 'shipping_config') {
      invalidateShippingCache()
    }
    if (settingKey === 'guest_discount_popup') {
      invalidateGuestDiscountPopupCache()
    }
    if (settingKey === 'courier_config') {
      invalidateCourierCache()
    }
  }

  await writeAuditLog({
    adminId: adminId(req),
    action: 'create',
    entity: config.entity,
    entityId: row.get('id'),
    details: body,
  })

  const plain = row.get({ plain: true })
  if (resource === 'products' && plain.status === 'archived') {
    plain.status = 'inactive'
  }
  if (resource === 'coupons') {
    plain.customerIds = Array.isArray(req.body.customerIds) ? req.body.customerIds.map(Number) : []
  }
  res.status(201).json({ item: plain })
}

export const getResourceById = async (req: Request, res: Response) => {
  const { resource } = resourceParam.parse(req.params)
  const { id } = idParam.parse(req.params)
  const config = resourceConfig[resource]
  if (!config) throw new AppError(404, 'Admin resource not found.')

  const includeOptions = resource === 'products'
    ? [{ model: Category, as: 'Category', attributes: ['id', 'name', 'active'] }]
    : resource === 'coupons'
      ? [{ model: CouponCustomer, as: 'eligibleCustomers', attributes: ['customerId'] }]
      : undefined
  const row = await config.model.findByPk(id, { paranoid: true, include: includeOptions })
  if (!row) throw new AppError(404, 'Item not found.')

  const plain = row.get({ plain: true })
  if (resource === 'products') {
    delete plain.Category
    if (plain.status === 'archived') {
      plain.status = 'inactive'
    }
  }
  if (resource === 'coupons') {
    plain.customerIds = (plain.eligibleCustomers || []).map((c: any) => c.customerId)
    delete plain.eligibleCustomers
  }

  res.json({ item: plain })
}

export const updateResource = async (req: Request, res: Response) => {
  const { resource } = resourceParam.parse(req.params)
  const { id } = idParam.parse(req.params)
  const config = resourceConfig[resource]
  if (!config) throw new AppError(404, 'Admin resource not found.')

  // Validate with schema if available (use partial schema on update for partial edits)
  if (config.validationSchema) {
    const updateSchema = typeof (config.validationSchema as any).partial === 'function'
      ? (config.validationSchema as any).partial()
      : config.validationSchema
    updateSchema.parse(req.body)
  }

  const row = await config.model.findByPk(id, { paranoid: true })
  if (!row) throw new AppError(404, 'Item not found.')

  const oldImageUrls = collectImageUrls(row, config)
  const body = await pickWritable(req.body, config, req)

  // Capture old values before update (for price drop & stock auto-notify)
  const oldPriceValue = config.entity === 'product' && body.price != null
    ? Number(row.getDataValue('price'))
    : 0
  const oldStockQty = config.entity === 'product'
    ? Number(row.getDataValue('stockQty') ?? 0)
    : 0

  await cleanOrphanFiles(oldImageUrls, body, config)

  await row.update(body)

  if (resource === 'categories' || resource === 'announcement-messages' || resource === 'marquee-messages') {
    clearNavCache()
  }

  // Sync updated product fields to its default variant so storefront maps the new price/stock immediately
  if (config.entity === 'product') {
    const defaultVariant = (await ProductVariant.findOne({
      where: { productId: Number(id), isDefault: true },
    })) || (await ProductVariant.findOne({
      where: { productId: Number(id) },
      order: [['sortOrder', 'ASC'], ['id', 'ASC']],
    }))

    if (defaultVariant) {
      const vUpdates: Record<string, any> = {}
      if (body.price != null) vUpdates.price = Number(body.price)
      if (body.originalPrice !== undefined) vUpdates.originalPrice = body.originalPrice != null ? Number(body.originalPrice) : null
      if (body.stockQty != null) vUpdates.stockQty = Number(body.stockQty)
      if (body.imageUrl) vUpdates.imageUrl = body.imageUrl
      if (Object.keys(vUpdates).length > 0) {
        await defaultVariant.update(vUpdates)
      }
    }
  }

  if (resource === 'coupons' && Array.isArray(req.body.customerIds)) {
    await syncCouponEligibility(Number(id), req.body.customerIds)
  }

  if (config.entity === 'order') {
    syncInvoiceStatus(Number(id)).catch(() => {})
  }
  if (config.entity === 'setting') {
    const settingKey = row.getDataValue('key')
    if (settingKey === 'company_info') {
      invalidateCompanyCache()
    }
    if (settingKey === 'shipping_config') {
      invalidateShippingCache()
    }
    if (settingKey === 'guest_discount_popup') {
      invalidateGuestDiscountPopupCache()
    }
    if (settingKey === 'courier_config') {
      invalidateCourierCache()
    }
  }

  await writeAuditLog({
    adminId: adminId(req),
    action: 'update',
    entity: config.entity,
    entityId: id,
    details: body,
  })

  const plain = row.get({ plain: true })
  if (resource === 'products' && plain.status === 'archived') {
    plain.status = 'inactive'
  }
  if (resource === 'coupons') {
    plain.customerIds = Array.isArray(req.body.customerIds)
      ? req.body.customerIds.map(Number)
      : (await CouponCustomer.findAll({ where: { couponId: Number(id) }, attributes: ['customerId'] }))
          .map((c: any) => c.get('customerId'))
  }
  res.json({ item: plain })
}

export const deleteResource = async (req: Request, res: Response) => {
  const { resource } = resourceParam.parse(req.params)
  const { id } = idParam.parse(req.params)
  const config = resourceConfig[resource]
  if (!config) throw new AppError(404, 'Admin resource not found.')

  const row = await config.model.findByPk(id, { paranoid: false })
  if (!row) throw new AppError(404, 'Item not found.')

  if (config.deleteGuard) {
    const guardMsg = await config.deleteGuard(id)
    if (guardMsg) throw new AppError(409, guardMsg)
  }

  if (config.onBeforeDelete) {
    await config.onBeforeDelete(id)
  }

  const isParanoid = !!(config.model.options as any)?.paranoid
  const skipGenericImageCleanup = !!config.handleOwnImageCleanup

  // Force-delete paranoid resources (e.g. categories) to truly remove them
  if (config.useForceDelete && isParanoid) {
    if (!skipGenericImageCleanup) {
      const imageUrls = collectImageUrls(row, config)
      for (const url of imageUrls) {
        const refCount = await OrderItem.count({ where: { imageUrl: url } })
        if (refCount === 0) {
          const fp = filePathFromUrl(url, UPLOADS_DIR)
          if (fp) cleanupFile(fp)
        }
      }
    }
    await config.model.destroy({ where: { id: Number(id) }, force: true })
  } else {
    if (!isParanoid && !skipGenericImageCleanup) {
      const imageUrls = collectImageUrls(row, config)
      for (const url of imageUrls) {
        const refCount = await OrderItem.count({ where: { imageUrl: url } })
        if (refCount === 0) {
          const fp = filePathFromUrl(url, UPLOADS_DIR)
          if (fp) cleanupFile(fp)
        }
      }
    }
    await row.destroy()
  }

  if (config.entity === 'setting') {
    const settingKey = row.getDataValue('key')
    if (settingKey === 'company_info') {
      invalidateCompanyCache()
    }
    if (settingKey === 'shipping_config') {
      invalidateShippingCache()
    }
    if (settingKey === 'guest_discount_popup') {
      invalidateGuestDiscountPopupCache()
    }
  }

  if (resource === 'categories' || resource === 'announcement-messages' || resource === 'marquee-messages') {
    clearNavCache()
  }

  await writeAuditLog({
    adminId: adminId(req),
    action: 'delete',
    entity: config.entity,
    entityId: id,
  })

  res.json({ ok: true })
}
