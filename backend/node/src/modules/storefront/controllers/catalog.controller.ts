import { Request, Response } from 'express'
import { Op, Sequelize } from 'sequelize'
import { sequelize } from '../../../database/sequelize.js'
import {
  Category,
  Product,
  ProductImage,
  ProductVariant,
  VariantImage,
  Banner,
  AnnouncementMessage,
  MarqueeMessage,
} from '../../../models/index.js'
import { plain, mapCategory, mapProduct } from './helpers.js'
import { getShippingConfig, getGuestDiscountPopupConfig, getCourierConfig } from '../../../services/settings.service.js'

export const getCategories = async (req: Request, res: Response) => {
  const section = typeof req.query.section === 'string' ? req.query.section : undefined
  const categories = await Category.findAll({
    where: {
      active: true,
      ...(section ? { section } : {}),
    },
    order: [['sortOrder', 'ASC'], ['id', 'ASC']],
  })

  res.json({ categories: categories.map(mapCategory) })
}

export const getCategoryBySlug = async (req: Request, res: Response) => {
  const category = await Category.findOne({
    where: { slug: req.params.slug, active: true },
  })
  if (!category) return res.status(404).json({ message: 'Category not found' })
  res.json({ category: mapCategory(category) })
}

export const getBanners = async (req: Request, res: Response) => {
  const placement = typeof req.query.placement === 'string' ? req.query.placement : undefined
  const banners = await Banner.findAll({
    where: {
      active: true,
      ...(placement ? { placement } : {}),
    },
    order: [['sortOrder', 'ASC'], ['id', 'ASC']],
  })

  res.json({ banners: banners.map(row => plain(row)) })
}

export const getProducts = async (req: Request, res: Response) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
  const category = typeof req.query.category === 'string' ? req.query.category.trim() : ''
  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined
  const section = typeof req.query.section === 'string' ? req.query.section.trim() : undefined
  const gender = typeof req.query.gender === 'string' ? req.query.gender.trim() : undefined
  // ids filter for guest wishlist preview (comma-separated product IDs)
  const idsParam = typeof req.query.ids === 'string' ? req.query.ids.trim() : ''
  const filterIds = idsParam
    ? idsParam.split(',').map(Number).filter(n => Number.isFinite(n) && n > 0)
    : undefined

  // Resolve section filter to category IDs (supports slugs like 'silk-sarees' and section names)
  let sectionCategoryIds: number[] | undefined
  if (section) {
    const matchedParents = await Category.findAll({
      where: {
        active: true,
        [Op.or]: [
          { section },
          { slug: section },
        ],
      },
      attributes: ['id'],
      raw: true,
    }) as any[]
    const parentIds = matchedParents.map(c => c.id)
    const childCats = await Category.findAll({
      where: {
        active: true,
        [Op.or]: [
          { section },
          ...(parentIds.length > 0 ? [{ parentId: { [Op.in]: parentIds } }] : []),
        ],
      },
      attributes: ['id'],
      raw: true,
    }) as any[]
    sectionCategoryIds = Array.from(new Set([...parentIds, ...childCats.map(c => c.id)]))
  }

  // Resolve category filter (by slug or name) to categoryId if needed
  let resolvedCategoryId = categoryId
  if (!resolvedCategoryId && category && category.toLowerCase() !== 'all') {
    const matched = await Category.findOne({
      where: {
        active: true,
        [Op.or]: [
          { slug: category },
          { name: category },
        ],
      },
      attributes: ['id'],
      raw: true,
    }) as any
    if (matched) {
      resolvedCategoryId = matched.id
    }
  }

  // When filtering by category, include child categories if it is a parent category
  let categoryIds: number[] | undefined
  if (resolvedCategoryId) {
    const childIds = (await Category.findAll({
      where: { parentId: resolvedCategoryId, active: true },
      attributes: ['id'],
      raw: true,
    }) as any[]).map(c => c.id)
    categoryIds = [resolvedCategoryId, ...childIds]
  }

  let searchVariantProductIds: number[] = []
  if (!filterIds && search) {
    const variantMatches = await ProductVariant.findAll({
      where: {
        sku: { [Op.like]: `%${search}%` },
        status: 'active',
      },
      attributes: ['productId'],
      limit: 60,
      raw: true,
    }) as any[]
    searchVariantProductIds = Array.from(new Set(variantMatches.map(v => v.productId).filter(Boolean)))
  }

  const products = await Product.findAll({
    where: {
      status: 'active',
      ...(filterIds ? { id: { [Op.in]: filterIds } } : {}),
      ...(!filterIds && gender ? { gender } : {}),
      ...(!filterIds && categoryIds ? {
        [Op.or]: [
          { categoryId: { [Op.in]: categoryIds } },
          { subCategoryId: { [Op.in]: categoryIds } },
        ],
      } : {}),
      ...(!filterIds && !categoryIds && category ? { category } : {}),
      ...(!filterIds && sectionCategoryIds ? {
        [Op.or]: [
          { categoryId: { [Op.in]: sectionCategoryIds } },
          { subCategoryId: { [Op.in]: sectionCategoryIds } },
        ],
      } : {}),
      ...(!filterIds && search
        ? {
            [Op.or]: [
              { code: { [Op.like]: `%${search}%` } },
              { name: { [Op.like]: `%${search}%` } },
              { type: { [Op.like]: `%${search}%` } },
              { color: { [Op.like]: `%${search}%` } },
              ...(searchVariantProductIds.length > 0 ? [{ id: { [Op.in]: searchVariantProductIds } }] : []),
            ],
          }
        : {}),
    },
    attributes: {
      include: [[
        Sequelize.literal(`(
          SELECT ROUND(AVG(rating), 1)
          FROM reviews
          WHERE reviews.product_id = Product.id
        )`),
        'averageRating'
      ]]
    },
    include: [{
      model: ProductVariant,
      as: 'variants',
      attributes: ['id', 'sku', 'price', 'originalPrice', 'isDefault', 'stockQty', 'size', 'colorName', 'colorHex', 'imageUrl'],
      required: false,
    }],
    order: search
      ? [
          Sequelize.literal(`CASE 
            WHEN code = ${sequelize.escape(search)} THEN 0 
            WHEN code LIKE ${sequelize.escape(search + '%')} THEN 1 
            WHEN name LIKE ${sequelize.escape(search + '%')} THEN 2 
            ELSE 3 
          END`),
          ['sortOrder', 'ASC'],
          ['id', 'DESC'],
        ]
      : [['sortOrder', 'ASC'], ['id', 'DESC']],
    limit: 80,
  })

  res.json({ products: products.map(mapProduct) })
}

const productSlugCache = new Map<string, { data: any; expiry: number }>()
const relatedCache = new Map<number, { data: any; expiry: number }>()

export const clearCatalogCache = () => {
  productSlugCache.clear()
  relatedCache.clear()
}

export const getProductBySlug = async (req: Request, res: Response) => {
  const slug = String(req.params.slug || '').trim()
  const cached = productSlugCache.get(slug)
  if (cached && Date.now() < cached.expiry) {
    return res.json({ product: cached.data })
  }

  const includes = [
    {
      model: ProductImage,
      as: 'images',
      attributes: ['id', 'imageUrl', 'altText', 'sortOrder'],
    },
    {
      model: ProductVariant,
      as: 'variants',
      where: { status: 'active' },
      required: false,
      attributes: ['id', 'variantType', 'label', 'colorName', 'colorHex', 'size',
                   'sku', 'price', 'originalPrice', 'stockQty',
                   'imageUrl', 'isDefault', 'sortOrder'],
      include: [{
        model: VariantImage,
        as: 'images',
        attributes: ['id', 'imageUrl', 'altText', 'sortOrder'],
      }],
    },
  ]
  const orderArray: any[] = [
    [{ model: ProductImage, as: 'images' }, 'sortOrder', 'ASC'],
    [{ model: ProductVariant, as: 'variants' }, 'sortOrder', 'ASC'],
    [{ model: ProductVariant, as: 'variants' }, { model: VariantImage, as: 'images' }, 'sortOrder', 'ASC'],
  ]

  let product = await Product.findOne({ 
    where: { slug, status: 'active' },
    include: includes,
    order: orderArray,
  })

  // Fallback 1: Partial slug prefix match, product code, variant SKU, or numeric ID
  if (!product && slug) {
    const isNum = /^\d+$/.test(slug)
    const matchingVariant = await ProductVariant.findOne({
      where: { sku: slug, status: 'active' },
      attributes: ['productId'],
      raw: true,
    }) as any

    const orConditions: any[] = [
      { slug: { [Op.like]: `${slug}%` } },
      { slug: { [Op.like]: `%${slug}%` } },
      { name: { [Op.like]: `%${slug.replace(/-/g, ' ')}%` } },
      { code: slug },
    ]
    if (isNum) {
      orConditions.push({ id: Number(slug) })
    }
    if (matchingVariant?.productId) {
      orConditions.push({ id: Number(matchingVariant.productId) })
    }

    product = await Product.findOne({
      where: {
        status: 'active',
        [Op.or]: orConditions,
      },
      include: includes,
      order: orderArray,
    })
  }

  if (!product) return res.status(404).json({ message: 'Product not found' })
  const mapped = mapProduct(product)
  productSlugCache.set(slug, { data: mapped, expiry: Date.now() + 60000 })
  res.json({ product: mapped })
}

export const getRelatedProducts = async (req: Request, res: Response) => {
  const productId = Number(req.params.id)
  if (!productId) return res.status(400).json({ message: 'Invalid product ID' })

  const cachedRel = relatedCache.get(productId)
  if (cachedRel && Date.now() < cachedRel.expiry) {
    return res.json({ products: cachedRel.data })
  }

  const product = await Product.findByPk(productId, { attributes: ['categoryId', 'subCategoryId'], raw: true }) as { categoryId: number | null; subCategoryId: number | null } | null
  if (!product) return res.status(404).json({ message: 'Product not found' })
  const targetCatId = product.subCategoryId || product.categoryId
  if (targetCatId == null) return res.json({ products: [] })

  const products = await Product.findAll({
    where: {
      status: 'active',
      [Op.or]: [
        { categoryId: targetCatId },
        { subCategoryId: targetCatId },
      ],
      id: { [Op.ne]: productId },
    },
    attributes: {
      include: [[
        Sequelize.literal(`(
          SELECT ROUND(AVG(rating), 1)
          FROM reviews
          WHERE reviews.product_id = Product.id
        )`),
        'averageRating'
      ]]
    },
    include: [{
      model: ProductVariant,
      as: 'variants',
      attributes: ['id', 'sku', 'price', 'originalPrice', 'isDefault', 'stockQty', 'size', 'colorName', 'colorHex', 'imageUrl'],
      required: false,
    }],
    order: [['sortOrder', 'ASC'], ['id', 'DESC']],
    limit: 8,
  })

  const mapped = products.map(mapProduct)
  relatedCache.set(productId, { data: mapped, expiry: Date.now() + 60000 })
  res.json({ products: mapped })
}

export const search = async (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''

  const productWhere: any = { status: 'active' }
  if (q) {
    // Fast lookup for variant SKU matches
    const variantMatches = await ProductVariant.findAll({
      where: {
        sku: { [Op.like]: `%${q}%` },
        status: 'active',
      },
      attributes: ['productId'],
      limit: 30,
      raw: true,
    }) as any[]
    const variantProductIds = Array.from(new Set(variantMatches.map(v => v.productId).filter(Boolean)))

    productWhere[Op.or] = [
      { code: { [Op.like]: `%${q}%` } },
      { name: { [Op.like]: `%${q}%` } },
      { type: { [Op.like]: `%${q}%` } },
      { color: { [Op.like]: `%${q}%` } },
      { description: { [Op.like]: `%${q}%` } },
      ...(variantProductIds.length > 0 ? [{ id: { [Op.in]: variantProductIds } }] : []),
    ]
  }

  const categoryWhere: any = { active: true }
  if (q) categoryWhere.name = { [Op.like]: `%${q}%` }

  const [products, categories] = await Promise.all([
    Product.findAll({
      where: productWhere,
      order: q
        ? [
            Sequelize.literal(`CASE 
              WHEN code = ${sequelize.escape(q)} THEN 0 
              WHEN code LIKE ${sequelize.escape(q + '%')} THEN 1 
              WHEN name LIKE ${sequelize.escape(q + '%')} THEN 2 
              ELSE 3 
            END`),
            ['sortOrder', 'ASC'],
            ['id', 'DESC'],
          ]
        : [['sortOrder', 'ASC'], ['id', 'DESC']],
      limit: 12,
      include: [{ model: ProductVariant, as: 'variants', attributes: ['id', 'sku', 'price', 'originalPrice', 'isDefault', 'stockQty', 'imageUrl', 'size', 'colorName', 'colorHex'], required: false }],
    }),
    Category.findAll({ where: categoryWhere, order: [['sortOrder', 'ASC']], limit: 8 }),
  ])

  res.json({ products: products.map(mapProduct), categories: categories.map(mapCategory) })
}

export const getHome = async (_req: Request, res: Response) => {
  const [
    announcements,
    banners,
    sectionCategories,
    allChildren,
    products,
    marqueeMessages,
  ] = await Promise.all([
    AnnouncementMessage.findAll({ where: { active: true }, order: [['sortOrder', 'ASC']] }),
    Banner.findAll({ where: { active: true }, order: [['sortOrder', 'ASC']] }),
    Category.findAll({ where: { active: true, parentId: null }, order: [['sortOrder', 'ASC']] }),
    Category.findAll({ where: { active: true, parentId: { [Op.ne]: null } }, order: [['sortOrder', 'ASC']] }),
    Product.findAll({
      where: { status: 'active' },
      attributes: {
        include: [[
          Sequelize.literal(`(
            SELECT ROUND(AVG(rating), 1)
            FROM reviews
            WHERE reviews.product_id = Product.id
          )`),
          'averageRating'
        ]]
      },
      order: [['id', 'DESC']],
      limit: 20,
      include: [{ model: ProductVariant, as: 'variants', attributes: ['id', 'sku', 'price', 'originalPrice', 'isDefault', 'stockQty', 'size', 'colorName', 'colorHex', 'imageUrl'], required: false }],
    }),
    MarqueeMessage.findAll({ where: { active: true }, order: [['sortOrder', 'ASC']] }),
  ])

  const parentSectionMap: Record<number, string> = {}
  for (const p of sectionCategories) {
    const row = plain<any>(p)
    if (row.id) parentSectionMap[row.id] = row.section || ''
  }

  const mappedChildren = allChildren.map(mapCategory)

  res.json({
    announcementMessages: announcements.map(row => plain(row)),
    banners: banners.map(row => plain(row)),
    sectionCategories: sectionCategories.map(mapCategory),
    featuredCategories: mappedChildren,
    womensCategories: [],
    kidsCategories: [],
    fabricCategories: [],
    newArrivals: products.map(mapProduct),
    marqueeMessages: marqueeMessages.map(row => plain(row)),
  })
}

export const getShippingConfiguration = async (_req: Request, res: Response) => {
  const config = await getShippingConfig()
  const couriers = await getCourierConfig()
  res.json({
    ...config,
    couriers: couriers.filter(c => c.active),
  })
}

export const getGuestDiscountPopupConfiguration = async (_req: Request, res: Response) => {
  const config = await getGuestDiscountPopupConfig()
  // couponCode is intentionally omitted — it must not be visible before the guest registers.
  res.json({
    enabled: config.enabled,
    discountPercentage: config.discountPercentage,
    message: config.message,
  })
}
