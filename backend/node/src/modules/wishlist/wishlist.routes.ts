import { Router } from 'express'
import { z } from 'zod'
import { Op, Sequelize } from 'sequelize'
import {
  WishlistItem,
  Product,
  ProductVariant,
} from '../../models/index.js'
import { optionalGuestSession } from '../../middleware/auth.js'
import { asyncHandler, AppError } from '../../utils/http.js'

// averageRating is a computed column from the reviews table - not a real DB column
const avgRatingLiteral = [
  Sequelize.literal(`(
    SELECT ROUND(AVG(rating), 1)
    FROM reviews
    WHERE reviews.product_id = \`Product\`.\`id\`
  )`),
  'averageRating',
] as const

const PRODUCT_INCLUDE = {
  model: Product,
  required: true,
  attributes: {
    include: [avgRatingLiteral],
    exclude: [] as string[],
  },
}

const VARIANT_INCLUDE = {
  model: ProductVariant,
  required: false,
}

const router = Router()

function getIdentity(req: any): { userId?: number; sessionId?: string } {
  if (req.auth?.sub) return { userId: req.auth.sub }
  if (req.guestSessionId) return { sessionId: req.guestSessionId }
  return {}
}

function buildWhereClause(identity: { userId?: number; sessionId?: string }) {
  if (identity.userId) return { userId: identity.userId }
  return { sessionId: identity.sessionId }
}

function mapWishlistItem(row: any) {
  const item = row.get({ plain: true })
  const product = item.Product || {}
  const variant = item.ProductVariant || null
  return {
    id: item.id,
    userId: item.userId,
    sessionId: item.sessionId,
    productId: item.productId,
    variantId: item.variantId ?? null,
    color: item.color ?? variant?.colorName ?? null,
    size: item.size ?? variant?.size ?? null,
    variantLabel: variant?.label ?? null,
    name: product.name || '',
    slug: product.slug || '',
    price: Number(variant?.price ?? product.price) || 0,
    originalPrice: (variant?.originalPrice ?? product.originalPrice) != null
      ? Number(variant?.originalPrice ?? product.originalPrice)
      : null,
    image: variant?.imageUrl || product.imageUrl || '',
    type: product.type || '',
    category: product.category || '',
    stockQty: (variant?.stockQty ?? product.stockQty) ?? 0,
    status: product.status || 'active',
    isNew: product.isNew ?? false,
    averageRating: product.averageRating ?? null,
    createdAt: item.createdAt,
  }
}

/* ---------- GET /wishlist — Fetch wishlist ---------- */
router.get('/', optionalGuestSession, asyncHandler(async (req, res) => {
  const identity = getIdentity(req)
  if (!identity.userId && !identity.sessionId) {
    return res.json({ items: [] })
  }

  const where = buildWhereClause(identity)

  // Clean up orphaned wishlist items
  const allItems = await WishlistItem.findAll({
    where,
    attributes: ['id', 'productId'],
  })
  const productIds = allItems.map(i => i.get('productId') as number)
  if (productIds.length > 0) {
    const existing = await Product.findAll({
      where: { id: { [Op.in]: productIds } },
      attributes: ['id'],
      paranoid: false,
    })
    const existingIds = new Set(existing.map(p => p.get('id') as number))
    const orphanIds = allItems
      .filter(i => !existingIds.has(i.get('productId') as number))
      .map(i => i.get('id') as number)
    if (orphanIds.length > 0) {
      await WishlistItem.destroy({ where: { id: { [Op.in]: orphanIds } } })
    }
  }

  const items = await WishlistItem.findAll({
    where,
    include: [PRODUCT_INCLUDE, VARIANT_INCLUDE],
    order: [['createdAt', 'ASC']],
  })
  res.json({ items: items.map(mapWishlistItem) })
}))

/* ---------- POST /wishlist — Add product (optionally a specific variant) ---------- */
const addSchema = z.object({
  productId: z.number().int().positive(),
  variantId: z.number().int().positive().nullish(),
  color: z.string().trim().max(80).nullish(),
  size: z.string().trim().max(40).nullish(),
})

router.post('/', optionalGuestSession, asyncHandler(async (req, res) => {
  const identity = getIdentity(req)
  if (!identity.userId && !identity.sessionId) {
    throw new AppError(400, 'Session required')
  }

  const parsed = addSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, parsed.error.errors.map(e => e.message).join('; '))
  }

  const { productId } = parsed.data
  let variantId = parsed.data.variantId ?? null
  let color = parsed.data.color ?? null
  let size = parsed.data.size ?? null

  const product = await Product.findByPk(productId, { attributes: ['id', 'status'] })
  if (!product) throw new AppError(404, 'Product not found')

  if (variantId) {
    const variant = await ProductVariant.findOne({ where: { id: variantId, productId } })
    if (!variant) throw new AppError(404, 'Variant not found for this product')
    const v = variant.get({ plain: true }) as any
    if (!color) color = v.colorName ?? null
    if (!size) size = v.size ?? null
  }

  const existing = await WishlistItem.findOne({
    where: { ...buildWhereClause(identity), productId, variantId },
    include: [PRODUCT_INCLUDE, VARIANT_INCLUDE],
  })

  if (existing) {
    return res.json({ item: mapWishlistItem(existing) })
  }

  const item = await WishlistItem.create({
    ...buildWhereClause(identity),
    productId,
    variantId,
    color,
    size,
  })

  const created = await WishlistItem.findByPk(item.get('id') as number, {
    include: [PRODUCT_INCLUDE, VARIANT_INCLUDE],
  })

  res.status(201).json({ item: mapWishlistItem(created) })
}))

/* ---------- DELETE /wishlist/:productId — Remove product (optionally a specific variant via ?variantId=) ---------- */
router.delete('/:productId', optionalGuestSession, asyncHandler(async (req, res) => {
  const identity = getIdentity(req)
  const productId = Number(req.params.productId)
  if (!Number.isFinite(productId)) throw new AppError(400, 'Invalid product ID')

  const variantIdRaw = req.query.variantId
  const variantId = typeof variantIdRaw === 'string' && variantIdRaw.trim() !== '' ? Number(variantIdRaw) : null
  if (variantIdRaw != null && !Number.isFinite(variantId)) {
    throw new AppError(400, 'Invalid variant ID')
  }

  const item = await WishlistItem.findOne({
    where: { ...buildWhereClause(identity), productId, variantId },
  })
  if (!item) {
    return res.json({ message: 'Item removed from wishlist' })
  }
  await item.destroy()
  res.json({ message: 'Item removed from wishlist' })
}))

/* ---------- DELETE /wishlist — Clear entire wishlist ---------- */
router.delete('/', optionalGuestSession, asyncHandler(async (req, res) => {
  const identity = getIdentity(req)
  await WishlistItem.destroy({ where: buildWhereClause(identity) })
  res.json({ message: 'Wishlist cleared' })
}))

export default router
