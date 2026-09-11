import { Request, Response } from 'express'
import { z } from 'zod'
import { StockNotification } from '../../../models/index.js'

const notifySchema = z.object({
  productId: z.number({ coerce: true }).int().positive(),
  variantId: z.number({ coerce: true }).int().positive().optional(),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10).max(20).optional(),
  customerName: z.string().max(140).optional(),
})

export const create = async (req: Request, res: Response) => {
  const { productId, variantId, email, phone, customerName } = notifySchema.parse(req.body)

  const existing = await StockNotification.findOne({
    where: { productId, email, status: 'pending' },
  })
  if (existing) {
    const updates: Record<string, any> = {}
    if (phone !== undefined) updates.phone = phone || null
    if (customerName !== undefined) updates.customerName = customerName || null
    if (Object.keys(updates).length > 0) {
      await existing.update(updates)
    }
    return res.json({ message: 'You are already on the notify list for this product.' })
  }

  const { Product, ProductVariant } = await import('../../../models/index.js')

  const product = await Product.findByPk(productId, { attributes: ['id', 'name'] })
  if (!product) {
    return res.status(404).json({ message: 'Product not found.' })
  }

  let variantLabel: string | undefined
  if (variantId) {
    const variant = await ProductVariant.findByPk(variantId, { attributes: ['id', 'label', 'colorName', 'size'] })
    if (variant) {
      const v = variant.get({ plain: true }) as any
      variantLabel = [v.colorName, v.size].filter(Boolean).join(' / ') || v.label || undefined
    }
  }

  await StockNotification.create({
    productId,
    productName: (product.get({ plain: true }) as any).name,
    variantId: variantId || null,
    variantLabel: variantLabel || null,
    email,
    phone: phone || null,
    customerName: customerName || null,
  })

  res.json({ message: 'We will notify you when this product is back in stock.' })
}
