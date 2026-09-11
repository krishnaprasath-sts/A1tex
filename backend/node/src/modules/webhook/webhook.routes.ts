import { Router } from 'express'
import { z } from 'zod'
import { createHmac } from 'crypto'
import { Order, OrderItem, Customer, Product, ProductVariant } from '../../models/index.js'
import { mapShiprocketStatus } from '../../services/shiprocket.service.js'
import { sendShippingEmail, sendDeliveryEmail, sendOutForDeliveryEmail, sendRtoEmail, sendReturnedEmail, sendCancellationEmail } from '../../services/email.service.js'
import { env } from '../../config/env.js'
import { processPaidOrder } from '../storefront/controllers/order.controller.js'

const router = Router()

const shiprocketWebhookSchema = z.object({
  order_id: z.string(),
  shipment_id: z.union([z.number(), z.string()]),
  awb_code: z.string().optional(),
  status: z.string(),
  current_status: z.string().optional(),
  courier_name: z.string().optional(),
  delivery_date: z.string().optional(),
  rto_date: z.string().optional(),
  rto_reason: z.string().optional(),
})

router.post('/shiprocket', async (req, res) => {
  try {
    const rawBody = req.body?.data
      ? (typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body.data)
      : req.body

    const parsed = shiprocketWebhookSchema.parse(rawBody)
    const internalStatus = mapShiprocketStatus(parsed.status)

    if (!internalStatus) {
      return res.status(200).json({ ok: true, skipped: `Unknown Shiprocket status: ${parsed.status}` })
    }

    const order = await Order.findOne({ where: { orderNumber: parsed.order_id } })
    if (!order) {
      return res.status(200).json({ ok: false, reason: `Order ${parsed.order_id} not found` })
    }

    const currentStatus = order.getDataValue('status') as string

    const existingMeta = (order.get({ plain: true }) as any).metadata || {}
    const updates: Record<string, unknown> = {
      status: internalStatus,
      metadata: {
        ...existingMeta,
        shiprocketShipmentId: parsed.shipment_id,
        shiprocketStatus: parsed.status,
        shiprocketCourierName: parsed.courier_name,
        shiprocketDeliveryDate: parsed.delivery_date,
        shiprocketRtoDate: parsed.rto_date,
        shiprocketRtoReason: parsed.rto_reason,
      },
    }

    if (parsed.awb_code) {
      (updates.metadata as Record<string, unknown>).shiprocketAwbCode = parsed.awb_code
    }

    if (internalStatus === 'delivered') {
      updates.deliveredAt = new Date()
    }

    if (!order.getDataValue('trackingNumber') && parsed.awb_code) {
      updates.trackingNumber = parsed.awb_code
    }

    // 'cancelled' (courier-side auto-cancel) and 'returned' (parcel physically handed back)
    // both mean stock should come back into inventory, same as the admin-initiated cancel/
    // return flows — restore it here too, guarded the same way (only if we're past
    // pending_payment, i.e. stock was actually deducted, and only once per transition).
    const isNewTransition = currentStatus !== internalStatus
    if (isNewTransition && currentStatus !== 'pending_payment' && currentStatus !== 'cancelled' && currentStatus !== 'returned' && (internalStatus === 'cancelled' || internalStatus === 'returned')) {
      const orderItems = await OrderItem.findAll({ where: { orderId: order.getDataValue('id') } })
      for (const item of orderItems) {
        const itemPlain = item.get({ plain: true }) as any
        if (itemPlain.variantId) {
          await ProductVariant.increment('stockQty', { by: itemPlain.quantity, where: { id: itemPlain.variantId } })
        } else if (itemPlain.productId) {
          await Product.increment('stockQty', { by: itemPlain.quantity, where: { id: itemPlain.productId } })
        }
      }
    }

    await order.update(updates)

    const details: Record<string, unknown> = {
      from: currentStatus,
      to: internalStatus,
      shiprocketStatus: parsed.status,
      shipmentId: parsed.shipment_id,
    }

    try {
      const { writeAuditLog } = await import('../../services/audit.service.js')
      await writeAuditLog({
        action: 'WEBHOOK',
        entity: 'order',
        entityId: order.getDataValue('id') as number,
        details,
      })
    } catch {
    }

    // Send customer email notifications for key status changes via webhook.
    // Shiprocket's SHIPPED and PICKUP raw statuses both map to our internal 'dispatched',
    // and couriers can redeliver the same webhook — only email when this is genuinely a
    // NEW status the order is entering (currentStatus !== internalStatus), otherwise a
    // second callback for the same status (or one that arrives after an admin already
    // manually moved the order to that status) would re-send the same email.
    if (isNewTransition) {
      const freshOrder = await Order.findByPk(order.getDataValue('id'), {
        include: [{ model: OrderItem, as: 'items' }, { model: Customer }],
      })
      if (freshOrder) {
        const plainOrder = freshOrder.get({ plain: true }) as Record<string, unknown>
        const custEmail = ((plainOrder.Customer as Record<string, unknown> | undefined)?.email as string)
          || (plainOrder.customerEmail as string)
        if (custEmail) {
          if (internalStatus === 'dispatched') {
            sendShippingEmail(custEmail, plainOrder).catch((err: any) => {
              console.error(`[Webhook] Shipping email failed for ${parsed.order_id}:`, err.message)
            })
          } else if (internalStatus === 'out_for_delivery') {
            sendOutForDeliveryEmail(custEmail, plainOrder).catch((err: any) => {
              console.error(`[Webhook] Out-for-delivery email failed for ${parsed.order_id}:`, err.message)
            })
          } else if (internalStatus === 'delivered') {
            sendDeliveryEmail(custEmail, plainOrder).catch((err: any) => {
              console.error(`[Webhook] Delivery email failed for ${parsed.order_id}:`, err.message)
            })
          } else if (internalStatus === 'rto') {
            sendRtoEmail(custEmail, plainOrder).catch((err: any) => {
              console.error(`[Webhook] RTO email failed for ${parsed.order_id}:`, err.message)
            })
          } else if (internalStatus === 'returned') {
            sendReturnedEmail(custEmail, plainOrder).catch((err: any) => {
              console.error(`[Webhook] Returned email failed for ${parsed.order_id}:`, err.message)
            })
          } else if (internalStatus === 'cancelled') {
            sendCancellationEmail(custEmail, plainOrder).catch((err: any) => {
              console.error(`[Webhook] Cancellation email failed for ${parsed.order_id}:`, err.message)
            })
          }
        }
      }
    }

    res.status(200).json({ ok: true, orderId: parsed.order_id, newStatus: internalStatus })
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(200).json({ ok: false, reason: 'Validation failed', issues: err.issues })
    }
    console.error('Webhook error:', err)
    res.status(200).json({ ok: false, reason: err.message })
  }
})

// ─── Razorpay Webhook ─────────────────────────────────
router.post('/razorpay', async (req, res) => {
  try {
    const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET
    if (webhookSecret) {
      const signature = req.headers['x-razorpay-signature'] as string
      if (!signature) {
        return res.status(200).json({ ok: false, reason: 'Missing signature' })
      }
      const rawBody = (req as any).rawBody ? (req as any).rawBody.toString('utf-8') : JSON.stringify(req.body)
      const expected = createHmac('sha256', webhookSecret).update(rawBody).digest('hex')
      if (expected !== signature) {
        return res.status(200).json({ ok: false, reason: 'Invalid signature' })
      }
    }

    const event = req.body?.event
    if (!event) {
      return res.status(200).json({ ok: false, reason: 'Missing event' })
    }

    if (event === 'payment.captured') {
      const payment = req.body?.payload?.payment?.entity
      const razorpayOrderId = payment?.order_id
      if (!razorpayOrderId) {
        return res.status(200).json({ ok: false, reason: 'Missing order_id in payment' })
      }

      const orders = await Order.findAll({
        where: { status: 'pending_payment' },
      })

      let matched: any = null
      for (const order of orders) {
        const meta = order.get('metadata') as Record<string, unknown> | null
        if (meta?.razorpayOrderId === razorpayOrderId) {
          matched = order
          break
        }
      }

      if (!matched) {
        return res.status(200).json({ ok: false, reason: `Order with razorpayOrderId ${razorpayOrderId} not found in pending_payment` })
      }

      const matchedId = matched.get('id') as number

      // Skip if already paid
      const existingMeta = (matched.get({ plain: true }) as any).metadata || {}
      if ((matched.get('paymentStatus') as string) !== 'paid') {
        await processPaidOrder(matchedId, {
          razorpayPaymentId: payment.id,
          webhookConfirmed: true,
        })
      }

      console.log(`[Webhook] Payment confirmed for order ${matched.get('orderNumber')} via Razorpay webhook`)
      return res.status(200).json({ ok: true, orderId: matched.get('orderNumber') })
    }

    if (event === 'payment.failed') {
      const payment = req.body?.payload?.payment?.entity
      const razorpayOrderId = payment?.order_id
      if (razorpayOrderId) {
        const orders = await Order.findAll({ where: { status: 'pending_payment' } })
        for (const order of orders) {
          const meta = order.get('metadata') as Record<string, unknown> | null
          if (meta?.razorpayOrderId === razorpayOrderId) {
            const existingMeta = (order.get({ plain: true }) as any).metadata || {}
            await order.update({
              status: 'cancelled',
              metadata: {
                ...existingMeta,
                razorpayPaymentId: payment.id,
                razorpayFailureReason: payment.error_description || payment.error_reason || 'Unknown',
                failedAt: new Date().toISOString(),
              },
            })
            console.log(`[Webhook] Payment failed for order ${order.get('orderNumber')}`)
            break
          }
        }
      }
      return res.status(200).json({ ok: true })
    }

    res.status(200).json({ ok: true, skipped: `Unhandled event: ${event}` })
  } catch (err: any) {
    console.error('[Webhook] Razorpay error:', err)
    res.status(200).json({ ok: false, reason: err.message })
  }
})

export default router
