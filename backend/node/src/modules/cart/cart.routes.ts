import { Router } from 'express'
import { z } from 'zod'
import { Op } from 'sequelize'
import {
  CartItem,
  Product,
  ProductVariant,
} from '../../models/index.js'
import { optionalGuestSession, type GuestRequest } from '../../middleware/auth.js'
import { asyncHandler, AppError } from '../../utils/http.js'

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

function mapCartItem(row: any) {
  const item = row.get({ plain: true })
  const product = item.Product || {}
  const variant = item.ProductVariant || {}
  const productStock = variant.stockQty != null ? Number(variant.stockQty) : Number(product.stockQty) || 0

  return {
    id: item.id,
    userId: item.userId,
    sessionId: item.sessionId,
    productId: item.productId,
    variantId: item.variantId,
    quantity: item.quantity,
    name: product.name || '',
    slug: product.slug || '',
    price: variant.price ? Number(variant.price) : Number(product.price) || 0,
    originalPrice: variant.originalPrice != null ? Number(variant.originalPrice) : (product.originalPrice != null ? Number(product.originalPrice) : null),
    image: variant.imageUrl || product.imageUrl || '',
    color: item.color || variant.colorName || null,
    size: item.size || variant.size || null,
    variantLabel: variant.label || null,
    productStock,
    productStatus: variant.status || product.status || 'active',
    enableBackInStockNotify: product.enableBackInStockNotify ?? false,
    weightKg: product.weightKg ? Number(product.weightKg) : null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

const includes = [
  { model: Product, attributes: ['name', 'slug', 'price', 'originalPrice', 'stockQty', 'status', 'imageUrl', 'enableBackInStockNotify', 'weightKg'] },
  { model: ProductVariant, attributes: ['id', 'label', 'colorName', 'size', 'price', 'originalPrice', 'stockQty', 'status', 'imageUrl'] },
]

/* ---------- GET /cart — Fetch cart ---------- */
router.get('/', optionalGuestSession, asyncHandler(async (req, res) => {
  const identity = getIdentity(req)
  if (!identity.userId && !identity.sessionId) {
    return res.json({ items: [] })
  }
  const items = await CartItem.findAll({
    where: buildWhereClause(identity),
    include: includes,
    order: [['createdAt', 'ASC']],
  })
  res.json({ items: items.map(mapCartItem) })
}))

/* ---------- POST /cart — Add item ---------- */
const addSchema = z.object({
  productId: z.number().int().positive(),
  variantId: z.number().int().positive().optional(),
  quantity: z.number().int().min(1).default(1),
  color: z.string().optional().nullable(),
  size: z.string().optional().nullable(),
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

  const { productId, variantId, quantity, color, size } = parsed.data

  if (variantId) {
    const variant = await ProductVariant.findByPk(variantId, {
      include: [{ model: Product, attributes: ['status', 'enableBackInStockNotify'] }],
    })
    if (!variant) throw new AppError(404, 'Variant not found')
    const v = variant.get({ plain: true }) as any
    if (v.status !== 'active' || (v.Product && v.Product.status !== 'active')) {
      throw new AppError(400, 'This variant is no longer available')
    }
    const enableBackInStockNotify = v.Product?.enableBackInStockNotify ?? false
    let availableStock = v.stockQty
    if (!enableBackInStockNotify && availableStock < quantity) {
      throw new AppError(400, `Insufficient stock. Only ${availableStock} left.`)
    }
  } else {
    const product = await Product.findByPk(productId, { attributes: ['status', 'enableBackInStockNotify', 'stockQty'] })
    if (!product) throw new AppError(404, 'Product not found')
    const p = product.get({ plain: true }) as any
    if (p.status !== 'active') throw new AppError(400, 'This product is no longer available')
    if (!p.enableBackInStockNotify && p.stockQty < quantity) throw new AppError(400, `Insufficient stock. Only ${p.stockQty} left.`)
  }

  const whereClause: any = {
    ...buildWhereClause(identity),
    productId,
    color: color || null,
    size: size || null,
  }
  if (variantId) {
    whereClause.variantId = variantId
  } else {
    whereClause.variantId = { [Op.is]: null }
  }

  const existing = await CartItem.findOne({ where: whereClause })

  if (existing) {
    const newQty = existing.get('quantity') as number + quantity
    if (variantId) {
      const v = await ProductVariant.findByPk(variantId, {
        include: [{ model: Product, attributes: ['enableBackInStockNotify'] }],
      })
      if (v) {
        const enableBackInStockNotify = (v as any).Product?.enableBackInStockNotify ?? false
        let availableStock = Number((v as any).stockQty)
        if (!enableBackInStockNotify && availableStock < newQty) {
          throw new AppError(400, `Insufficient stock. Only ${availableStock} left.`)
        }
      }
    } else {
      const p = await Product.findByPk(productId, { attributes: ['enableBackInStockNotify', 'stockQty'] })
      if (p) {
        const enableBackInStockNotify = p.getDataValue('enableBackInStockNotify')
        if (!enableBackInStockNotify && (p.get('stockQty') as number) < newQty) {
          throw new AppError(400, `Insufficient stock. Only ${p.get('stockQty')} left.`)
        }
      }
    }
    await existing.update({ quantity: newQty })
    const reloaded = await CartItem.findByPk(existing.get('id') as number, { include: includes })
    return res.json({ item: mapCartItem(reloaded) })
  }

  const item = await CartItem.create({
    ...buildWhereClause(identity),
    productId,
    variantId: variantId || null,
    quantity,
    color: color || null,
    size: size || null,
  })

  const created = await CartItem.findByPk(item.get('id') as number, { include: includes })
  res.status(201).json({ item: mapCartItem(created) })
}))

/* ---------- PUT /cart/:id — Update quantity ---------- */
const updateQtySchema = z.object({
  quantity: z.number().int().min(1),
})

router.put('/:id', optionalGuestSession, asyncHandler(async (req, res) => {
  const identity = getIdentity(req)
  const parsed = updateQtySchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, parsed.error.errors.map(e => e.message).join('; '))
  }

  const { quantity } = parsed.data
  const item = await CartItem.findOne({
    where: { id: req.params.id, ...buildWhereClause(identity) },
  })
  if (!item) throw new AppError(404, 'Cart item not found')

  const plain = item.get({ plain: true }) as any

  if (plain.variantId) {
    const variant = await ProductVariant.findByPk(plain.variantId, {
      include: [{ model: Product, attributes: ['enableBackInStockNotify'] }],
    })
    if (!variant) throw new AppError(404, 'Variant not found')
    const enableBackInStockNotify = (variant as any).Product?.enableBackInStockNotify ?? false
    let availableStock = Number((variant as any).stockQty)
    if (!enableBackInStockNotify && availableStock < quantity) {
      throw new AppError(400, `Insufficient stock. Only ${availableStock} left.`)
    }
  } else {
    const product = await Product.findByPk(plain.productId, { attributes: ['enableBackInStockNotify', 'stockQty'] })
    if (!product) throw new AppError(404, 'Product not found')
    const enableBackInStockNotify = product.getDataValue('enableBackInStockNotify')
    if (!enableBackInStockNotify && (product.get('stockQty') as number) < quantity) {
      throw new AppError(400, `Insufficient stock. Only ${product.get('stockQty')} left.`)
    }
  }

  await item.update({ quantity })
  const reloaded = await CartItem.findByPk(item.get('id') as number, { include: includes })
  res.json({ item: mapCartItem(reloaded) })
}))

/* ---------- DELETE /cart/:id — Remove single item ---------- */
router.delete('/:id', optionalGuestSession, asyncHandler(async (req, res) => {
  const identity = getIdentity(req)
  const item = await CartItem.findOne({
    where: { id: req.params.id, ...buildWhereClause(identity) },
  })
  if (!item) {
    res.json({ message: 'Item removed from cart' })
    return
  }
  await item.destroy()
  res.json({ message: 'Item removed from cart' })
}))

/* ---------- DELETE /cart — Clear entire cart ---------- */
router.delete('/', optionalGuestSession, asyncHandler(async (req, res) => {
  const identity = getIdentity(req)
  await CartItem.destroy({ where: buildWhereClause(identity) })
  res.json({ message: 'Cart cleared' })
}))

export default router
