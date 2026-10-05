import { Op } from 'sequelize'
import { Product, ProductVariant, StockNotification } from '../models/index.js'
import { sendBackInStockEmail } from './email.service.js'

/**
 * Email everyone waiting on a variant (or on the product as a whole) once it
 * is purchasable again. Each request is stamped with notifiedAt after a
 * successful send, so it goes out exactly once; a failed send stays pending
 * and is retried on the next restock.
 */
export async function notifyBackInStock(productId: number, variantId?: number | null): Promise<number> {
  const pending = await StockNotification.findAll({
    where: {
      productId,
      notifiedAt: null,
      ...(variantId
        ? { [Op.or]: [{ variantId }, { variantId: null }] }
        : {}),
    },
  })
  if (pending.length === 0) return 0

  const product = await Product.findByPk(productId, { attributes: ['id', 'name'] })
  if (!product) return 0
  const productName = String(product.getDataValue('name') || 'Your saree')

  const variantLabels = new Map<number, string | null>()
  let sent = 0

  for (const row of pending) {
    const rowVariantId = (row.getDataValue('variantId') as number | null) ?? variantId ?? null
    let variantLabel: string | null = null
    if (rowVariantId) {
      if (!variantLabels.has(rowVariantId)) {
        const variant = await ProductVariant.findByPk(rowVariantId, { attributes: ['id', 'label'] })
        variantLabels.set(rowVariantId, variant ? (variant.getDataValue('label') as string | null) : null)
      }
      variantLabel = variantLabels.get(rowVariantId) ?? null
    }

    try {
      await sendBackInStockEmail(
        row.getDataValue('email') as string,
        (row.getDataValue('customerName') as string | null) || undefined,
        { productName, variantLabel },
      )
      await row.update({ notifiedAt: new Date() })
      sent++
    } catch (err: any) {
      console.error(`[StockNotify] Email failed for request ${row.getDataValue('id')}:`, err?.message)
    }
  }

  return sent
}

/** Fire-and-forget wrapper for use right after a stock update. */
export function notifyBackInStockAsync(productId: number, variantId?: number | null): void {
  notifyBackInStock(productId, variantId).catch((err: any) => {
    console.error(`[StockNotify] Failed for product ${productId}:`, err?.message)
  })
}
