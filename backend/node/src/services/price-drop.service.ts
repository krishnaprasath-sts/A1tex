import { fn as seqFn, col } from 'sequelize'
import { Customer } from '../models/index.js'
import { PriceDropEvent, PriceDropEmailLog } from '../models/price-drop.models.js'
import { sendPriceDropEmail } from './email.service.js'

// ─── Trigger Price Drop Notification ─────────────────────────

export async function triggerPriceDropNotification(
  productId: number,
  productName: string,
  oldPrice: number,
  newPrice: number,
  adminId: number | null,
  imageUrl?: string | null,
  slug?: string | null,
): Promise<void> {
  const discountPercent = Math.round(((oldPrice - newPrice) / oldPrice) * 100 * 100) / 100

  // Create event
  const event = await PriceDropEvent.create({
    productId,
    productName,
    oldPrice,
    newPrice,
    discountPercent,
    triggeredBy: adminId,
    status: 'pending',
  })

  const eventId = event.getDataValue('id') as number
  console.log(`[PriceDrop] Event #${eventId} created for "${productName}" (${oldPrice} → ${newPrice}, ${discountPercent}% off)`)

  // Find eligible customers
  const customers = await Customer.findAll({
    where: { status: 'active', emailVerified: true },
    attributes: ['id', 'email', 'name'],
    paranoid: true,
  })

  if (customers.length === 0) {
    await event.update({ status: 'done', emailsSent: 0, emailsFailed: 0 })
    console.log(`[PriceDrop] Event #${eventId}: No eligible customers. Done.`)
    return
  }

  // Create email log rows
  const emailLogRows = customers.map(c => ({
    eventId,
    customerId: c.getDataValue('id') as number,
    email: c.getDataValue('email') as string,
    status: 'pending' as const,
  }))

  await PriceDropEmailLog.bulkCreate(emailLogRows)
  await event.update({ status: 'processing' })

  console.log(`[PriceDrop] Event #${eventId}: ${customers.length} emails queued. Processing in background.`)

  // Fire background processing
  setImmediate(() => {
    processPriceDropQueue(eventId, {
      productName, oldPrice, newPrice, discountPercent, imageUrl, slug,
    }).catch(err => console.error('[PriceDrop] Background processing error:', err))
  })
}

// ─── Background Queue Processor ──────────────────────────────

async function processPriceDropQueue(
  eventId: number,
  productInfo: {
    productName: string
    oldPrice: number
    newPrice: number
    discountPercent: number
    imageUrl?: string | null
    slug?: string | null
  },
): Promise<void> {
  const pendingLogs = await PriceDropEmailLog.findAll({
    where: { eventId, status: 'pending' },
  })

  const BATCH_SIZE = 10
  for (let i = 0; i < pendingLogs.length; i += BATCH_SIZE) {
    const batch = pendingLogs.slice(i, i + BATCH_SIZE)

    for (const log of batch) {
      const email = log.getDataValue('email') as string
      // Look up customer name
      const customer = await Customer.findByPk(log.getDataValue('customerId') as number, {
        attributes: ['name'],
      })
      const customerName = customer ? String(customer.getDataValue('name') || '') : ''

      try {
        await sendPriceDropEmail(email, customerName, productInfo)
        await log.update({ status: 'sent', sentAt: new Date() })
      } catch (err: any) {
        await log.update({
          status: 'failed',
          errorMessage: err?.message || 'Unknown error',
        })
      }
    }

    // Rate limiting between batches
    if (i + BATCH_SIZE < pendingLogs.length) {
      await new Promise(r => setTimeout(r, 500))
    }
  }

  // Update event stats
  const sentCount = await PriceDropEmailLog.count({ where: { eventId, status: 'sent' } })
  const failedCount = await PriceDropEmailLog.count({ where: { eventId, status: 'failed' } })

  await PriceDropEvent.update(
    { emailsSent: sentCount, emailsFailed: failedCount, status: 'done' },
    { where: { id: eventId } },
  )

  console.log(`[PriceDrop] Event #${eventId} done. Sent: ${sentCount}, Failed: ${failedCount}`)
}

// ─── Admin Dashboard Queries ─────────────────────────────────

export async function getPriceDropEvents(
  page = 1,
  limit = 20,
): Promise<{ events: any[]; total: number; page: number; pages: number }> {
  const offset = (page - 1) * limit
  const { count, rows } = await PriceDropEvent.findAndCountAll({
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  })

  return {
    events: rows.map(r => r.get({ plain: true })),
    total: count,
    page,
    pages: Math.ceil(count / limit) || 1,
  }
}

export async function getPriceDropEventDetail(eventId: number): Promise<any> {
  const event = await PriceDropEvent.findByPk(eventId, {
    include: [{ model: PriceDropEmailLog, as: 'emailLogs' }],
  })
  if (!event) return null
  return event.get({ plain: true })
}

export async function getPriceDropStats(): Promise<{
  totalEvents: number
  totalEmailsSent: number
  totalEmailsFailed: number
  successRate: number
}> {
  const result = await PriceDropEvent.findOne({
    attributes: [
      [seqFn('COUNT', col('id')), 'totalEvents'],
      [seqFn('COALESCE', seqFn('SUM', col('emails_sent')), 0), 'totalEmailsSent'],
      [seqFn('COALESCE', seqFn('SUM', col('emails_failed')), 0), 'totalEmailsFailed'],
    ],
    raw: true,
  }) as any

  const totalSent = Number(result?.totalEmailsSent || 0)
  const totalFailed = Number(result?.totalEmailsFailed || 0)
  const total = totalSent + totalFailed
  const successRate = total > 0 ? Math.round((totalSent / total) * 100) : 0

  return {
    totalEvents: Number(result?.totalEvents || 0),
    totalEmailsSent: totalSent,
    totalEmailsFailed: totalFailed,
    successRate,
  }
}
