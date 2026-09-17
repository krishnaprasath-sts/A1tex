import { Request, Response } from 'express'
import { z } from 'zod'
import { Op } from 'sequelize'
import { sequelize } from '../../../database/sequelize.js'
import {
  Order,
  OrderItem,
  Customer,
  Product,
  ProductVariant,
  OrderStatusHistory,
  Coupon,
  CouponUsage,
} from '../../../models/index.js'
import { sendBackInStockEmail, sendAbandonedCartEmail, sendShippingEmail, sendDeliveryEmail, sendCancellationEmail, sendOrderConfirmationEmail, sendPackingEmail, sendOutForDeliveryEmail, sendRtoEmail, sendReturnedEmail, sendAdminOrderNotification } from '../../../services/email.service.js'
import { generateOrderPdf } from '../../../services/order-pdf.service.js'
import { generateStageInvoicesPdf } from '../../../services/order-invoice-pdf.service.js'
import { generateAddressesPdf } from '../../../services/order-addresses-pdf.service.js'
import { syncInvoiceStatus } from '../../../services/invoice.service.js'
import { writeAuditLog } from '../../../services/audit.service.js'
import { AppError } from '../../../utils/http.js'
import { getAdminPermissions } from '../../../middleware/permissions.js'
import { adminId, paginationSchema, idParam } from './utils.js'
import { env } from '../../../config/env.js'

export const statusMap: Record<string, { status: string }> = {
  'pending-payment': { status: 'pending_payment' },
  'pending': { status: 'pending' },
  'confirmed': { status: 'confirmed' },
  'packing': { status: 'packing' },
  'dispatched': { status: 'dispatched' },
  'out-for-delivery': { status: 'out_for_delivery' },
  'delivered': { status: 'delivered' },
  'cancelled': { status: 'cancelled' },
  'rto': { status: 'rto' },
  'returned': { status: 'returned' },
}

export const validTransitions: Record<string, string[]> = {
  pending_payment: ['pending', 'confirmed', 'cancelled'],
  pending: ['confirmed', 'cancelled'],
  confirmed: ['pending', 'packing', 'cancelled'],
  packing: ['confirmed', 'dispatched', 'cancelled'],
  dispatched: ['packing', 'out_for_delivery', 'delivered', 'rto', 'cancelled'],
  shipped: ['packing', 'out_for_delivery', 'delivered', 'rto', 'cancelled'],
  out_for_delivery: ['dispatched', 'delivered', 'rto', 'cancelled'],
  delivered: ['returned', 'rto'],
  rto: ['returned', 'dispatched', 'cancelled'],
  returned: ['cancelled'],
  cancelled: ['pending'],
}

// Hands a coupon back when an order stops being a sale.
async function releaseCouponForOrder(orderId: number): Promise<void> {
  const usage = await CouponUsage.findOne({ where: { orderId } })
  if (!usage) return

  const { couponId } = usage.get({ plain: true }) as any
  await usage.destroy()
  await Coupon.decrement('usedCount', {
    by: 1,
    where: { id: couponId, usedCount: { [Op.gt]: 0 } },
  })
}

export const transitionSchema = z.object({
  nextStatus: z.enum(['pending_payment', 'pending', 'confirmed', 'packing', 'dispatched', 'out_for_delivery', 'delivered', 'cancelled', 'rto', 'returned']),
  courierName: z.string().max(120).optional(),
  deliveryAgentName: z.string().max(120).optional(),
  deliveryAgentPhone: z.string().max(30).optional(),
  trackingNumber: z.string().max(100).optional(),
  trackingUrl: z.string().max(500).optional(),
  cancellationReason: z.string().max(500).optional(),
  isManualShipping: z.boolean().optional(),
  paymentMethod: z.string().max(40).optional(),
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
})

export const getPipelineCounts = async (_req: Request, res: Response) => {
  const rows = await Order.findAll({
    attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
    group: ['status'],
    paranoid: false,
    raw: true,
  }) as unknown as Array<{ status: string; count: string }>

  const countsByStatus = new Map(rows.map(r => [r.status, Number(r.count)]))

  const counts: Record<string, number> = {}
  for (const [key, cfg] of Object.entries(statusMap)) {
    counts[key] = countsByStatus.get(cfg.status) ?? 0
  }
  res.json({ counts })
}

export const getPipelineStage = async (req: Request, res: Response) => {
  const { stage } = req.params
  const cfg = statusMap[stage]
  if (!cfg) throw new AppError(404, 'Invalid pipeline stage.')

  const { page, perPage } = paginationSchema.parse(req.query)
  const where = { status: cfg.status }

  const [rows, total] = await Promise.all([
    Order.findAll({
      where,
      order: [['id', 'DESC']],
      offset: (page - 1) * perPage,
      limit: perPage,
      paranoid: false,
      include: [{ model: Customer }],
    }),
    Order.count({ where, paranoid: false }),
  ])

  res.json({
    items: rows.map((row: any) => row.get({ plain: true })),
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  })
}

export const getOrderDetail = async (req: Request, res: Response) => {
  const { id } = idParam.parse(req.params)
  const order = await Order.findByPk(id, {
    paranoid: false,
    include: [
      { model: OrderItem, as: 'items' },
      { model: Customer },
    ],
  })
  if (!order) throw new AppError(404, 'Order not found.')

  const plain = order.get({ plain: true }) as any
  const auth = (req as any).auth
  const permissions = auth?.permissions ?? await getAdminPermissions(auth)
  if (!permissions.includes('view_orders') && plain.assignedAdminId !== auth?.sub) {
    throw new AppError(403, 'You can only view orders assigned to you.')
  }

  res.json({ item: plain })
}

export const transitionOrder = async (req: Request, res: Response) => {
  const { id } = idParam.parse(req.params)
  const body = transitionSchema.parse(req.body)

  const order = await Order.findByPk(id)
  if (!order) throw new AppError(404, 'Order not found.')

  const rawStatus = String(order.getDataValue('status') || '').toLowerCase().replace(/-/g, '_')
  const currentStatus = rawStatus === 'shipped' ? 'dispatched' : rawStatus
  const allowed = validTransitions[currentStatus] || []
  if (body.nextStatus !== currentStatus && !allowed.includes(body.nextStatus)) {
    throw new AppError(422, `Cannot transition from '${currentStatus}' to '${body.nextStatus}'. Allowed: ${(allowed || []).join(', ') || 'none'}`)
  }

  const updates: Record<string, unknown> = { status: body.nextStatus }

  if (body.deliveryAgentName || body.courierName) {
    updates.deliveryAgentName = body.courierName || body.deliveryAgentName
  }
  if (body.deliveryAgentPhone) {
    updates.deliveryAgentPhone = body.deliveryAgentPhone
  }
  if (body.trackingNumber) {
    updates.trackingNumber = body.trackingNumber
  }

  const existingMeta = (order.get({ plain: true }) as any).metadata || {}
  const nextMeta: Record<string, unknown> = { ...existingMeta }

  if (body.courierName || body.trackingUrl || body.isManualShipping || body.trackingNumber) {
    nextMeta.courierName = body.courierName || existingMeta.courierName
    nextMeta.trackingUrl = body.trackingUrl || existingMeta.trackingUrl
    nextMeta.manualShipping = true
  }

  if (body.paymentMethod) {
    const pm = body.paymentMethod.trim().toLowerCase()
    updates.paymentMethod = pm
    nextMeta.paymentMethod = pm
  }

  if (body.paymentStatus) {
    updates.paymentStatus = body.paymentStatus
  }

  updates.metadata = nextMeta

  if (body.nextStatus === 'dispatched' && !updates.dispatchedAt) {
    updates.dispatchedAt = new Date()
  }
  if (body.nextStatus === 'delivered') {
    updates.deliveredAt = new Date()
  }

  // COD confirmation: deduct stock + apply coupon when moving out of pending_payment,
  // whether the admin sends it straight to 'pending' or directly to 'confirmed' — both
  // are valid per validTransitions, but only 'pending' used to be handled here, so a
  // pending_payment → confirmed transition silently skipped stock deduction/coupon
  // application while still emailing the customer an "Order Confirmed" notice.
  if (currentStatus === 'pending_payment' && (body.nextStatus === 'pending' || body.nextStatus === 'confirmed')) {
    const o = (order.get({ plain: true }) as any)
    const paymentMethod = o.metadata?.paymentMethod as string | undefined

    if (paymentMethod === 'cod') {
      const orderItems = await OrderItem.findAll({ where: { orderId: id } })
      for (const item of orderItems) {
        const itemPlain = item.get({ plain: true }) as any
        if (itemPlain.variantId) {
          const v = await ProductVariant.findOne({ where: { id: itemPlain.variantId } })
          if (v) {
            const currentStock = (v as any).stockQty ?? 0
            if (currentStock < itemPlain.quantity) {
              throw new AppError(400, `Insufficient stock for "${itemPlain.name}". Only ${currentStock} left.`)
            }
            await v.update({ stockQty: currentStock - itemPlain.quantity })
          }
        } else if (itemPlain.productId) {
          const p = await Product.findOne({ where: { id: itemPlain.productId } })
          if (p) {
            const currentStock = (p as any).stockQty ?? 0
            if (currentStock < itemPlain.quantity) {
              throw new AppError(400, `Insufficient stock for "${itemPlain.name}". Only ${currentStock} left.`)
            }
            await p.update({ stockQty: currentStock - itemPlain.quantity })
          }
        }
      }

      // Apply coupon usage if present. The existing-row guard matches the two
      // storefront confirmation paths: without it, this admin transition racing
      // the customer's own self-confirm would write a second usage row for the
      // same order and count the coupon twice.
      if (o.couponId) {
        const existing = await CouponUsage.findOne({ where: { orderId: id } })
        if (!existing) {
          await CouponUsage.create({
            couponId: o.couponId,
            orderId: id,
            customerId: o.customerId || null,
            customerEmail: o.customerEmail || null,
            discountAmount: o.discount || 0,
          })
          await Coupon.increment('usedCount', { by: 1, where: { id: o.couponId } })
        }
      }

      // Mark COD as confirmed in metadata
      const existingMeta = o.metadata || {}
      updates.metadata = {
        ...existingMeta,
        codConfirmedAt: new Date().toISOString(),
      }

      // The storefront's self-service confirmCodOrder notifies admin on COD confirmation —
      // this admin-initiated transition was a separate code path that skipped it entirely.
      sendAdminOrderNotification(env.ADMIN_EMAIL, o).catch((err: any) => {
        console.error(`[Order ${o.orderNumber}] Admin notification failed:`, err.message)
      })
    }
  }

  if (body.nextStatus === 'cancelled') {
    const o = (order.get({ plain: true }) as any)
    updates.cancelledAt = new Date()
    if (body.cancellationReason) updates.cancellationReason = body.cancellationReason

    // Restore stock only if it was previously deducted and not already returned
    // Stock is deducted when admin confirms (pending_payment → pending) for COD,
    // or when payment is verified for online orders.
    // If the order was already marked 'returned', stock and coupon were already released.
    const shouldRestore = currentStatus !== 'pending_payment' && currentStatus !== 'returned'
    if (shouldRestore) {
      const orderItems = await OrderItem.findAll({ where: { orderId: id } })
      for (const item of orderItems) {
        const itemPlain = item.get({ plain: true }) as any
        if (itemPlain.variantId) {
          await ProductVariant.increment('stockQty', {
            by: itemPlain.quantity,
            where: { id: itemPlain.variantId },
          })
        } else if (itemPlain.productId) {
          await Product.increment('stockQty', {
            by: itemPlain.quantity,
            where: { id: itemPlain.productId },
          })
        }
      }

      // A cancelled order is not a sale, so give the coupon back alongside the stock.
      await releaseCouponForOrder(Number(id))
    }
  }

  // 'returned' means the courier has physically handed the parcel back to us — restore
  // stock at this point. (An RTO that's cancelled instead of marked returned is already
  // covered by the 'cancelled' branch above, since currentStatus !== 'pending_payment'.)
  if (body.nextStatus === 'returned') {
    const orderItems = await OrderItem.findAll({ where: { orderId: id } })
    for (const item of orderItems) {
      const itemPlain = item.get({ plain: true }) as any
      if (itemPlain.variantId) {
        await ProductVariant.increment('stockQty', {
          by: itemPlain.quantity,
          where: { id: itemPlain.variantId },
        })
      } else if (itemPlain.productId) {
        await Product.increment('stockQty', {
          by: itemPlain.quantity,
          where: { id: itemPlain.productId },
        })
      }
    }

    // Goods came back, so the sale didn't stand — release the coupon too. RTO
    // deliberately isn't handled here: it always moves on to 'returned' or
    // 'cancelled', both of which release, so doing it at RTO would be premature.
    await releaseCouponForOrder(Number(id))
  }

  await order.update(updates)

  await OrderStatusHistory.create({
    orderId: id,
    fromStatus: currentStatus,
    toStatus: updates.status as string || body.nextStatus,
    changedBy: adminId(req),
    changedByType: 'admin',
    notes: body.cancellationReason || undefined,
  })

  syncInvoiceStatus(Number(id)).catch(() => {})

  const finalStatus = updates.status as string || body.nextStatus
  await writeAuditLog({
    adminId: adminId(req),
    action: 'TRANSITION',
    entity: 'order',
    entityId: id,
    details: { from: currentStatus, to: finalStatus, ...updates },
  })

  // Send customer email notifications for key status transitions
  const freshOrder = await Order.findByPk(id, {
    include: [{ model: OrderItem, as: 'items' }, { model: Customer }],
  })
  const plainOrder = freshOrder?.get({ plain: true }) as Record<string, unknown> | undefined
  if (plainOrder) {
    let custEmail = (
      ((plainOrder.Customer as Record<string, unknown> | undefined)?.email as string)
      || (plainOrder.customerEmail as string)
      || ((plainOrder as any).customer_email as string)
      || ((plainOrder.shippingAddress as Record<string, unknown> | undefined)?.email as string)
      || ((plainOrder.metadata as Record<string, unknown> | undefined)?.customerEmail as string)
      || ((plainOrder.metadata as Record<string, unknown> | undefined)?.email as string)
      || ''
    ).trim()

    if (!custEmail && plainOrder.customerId) {
      const c = await Customer.findByPk(plainOrder.customerId as number)
      if (c) {
        custEmail = String((c as any).email || '').trim()
      }
    }

    const normalizedStatus = String(finalStatus || '').toLowerCase().replace(/-/g, '_')
    console.log(`[Order ${plainOrder.orderNumber}] Status transition: ${currentStatus} → ${finalStatus} (normalized: ${normalizedStatus}) | Customer email: "${custEmail || 'NOT FOUND'}"`)

    if (custEmail) {
      if (normalizedStatus === 'confirmed') {
        console.log(`[Order ${plainOrder.orderNumber}] Sending order confirmation email to ${custEmail}...`)
        sendOrderConfirmationEmail(custEmail, plainOrder).catch((err: any) => {
          console.error(`[Order ${plainOrder.orderNumber}] Confirmation email failed:`, err.message)
        })
      } else if (normalizedStatus === 'pending' && currentStatus === 'pending_payment') {
        // COD confirmation: send order confirmation email
        console.log(`[Order ${plainOrder.orderNumber}] Sending COD confirmation email to ${custEmail}...`)
        sendOrderConfirmationEmail(custEmail, plainOrder).catch((err: any) => {
          console.error(`[Order ${plainOrder.orderNumber}] COD confirmation email failed:`, err.message)
        })
      } else if (normalizedStatus === 'packing' || normalizedStatus === 'processing') {
        // "Your order is being packed / processed" notification
        console.log(`[Order ${plainOrder.orderNumber}] Sending packing notification email to ${custEmail}...`)
        sendPackingEmail(custEmail, plainOrder).catch((err: any) => {
          console.error(`[Order ${plainOrder.orderNumber}] Packing email failed:`, err.message)
        })
      } else if (normalizedStatus === 'dispatched' || normalizedStatus === 'shipped') {
        console.log(`[Order ${plainOrder.orderNumber}] Sending shipping email to ${custEmail}...`)
        sendShippingEmail(custEmail, plainOrder).catch((err: any) => {
          console.error(`[Order ${plainOrder.orderNumber}] Shipping email failed:`, err.message)
        })
      } else if (normalizedStatus === 'delivered') {
        console.log(`[Order ${plainOrder.orderNumber}] Sending delivery email to ${custEmail}...`)
        sendDeliveryEmail(custEmail, plainOrder).catch((err: any) => {
          console.error(`[Order ${plainOrder.orderNumber}] Delivery email failed:`, err.message)
        })
      } else if (normalizedStatus === 'cancelled') {
        console.log(`[Order ${plainOrder.orderNumber}] Sending cancellation email to ${custEmail}...`)
        sendCancellationEmail(custEmail, plainOrder).catch((err: any) => {
          console.error(`[Order ${plainOrder.orderNumber}] Cancellation email failed:`, err.message)
        })
      } else if (normalizedStatus === 'out_for_delivery') {
        console.log(`[Order ${plainOrder.orderNumber}] Sending out-for-delivery email to ${custEmail}...`)
        sendOutForDeliveryEmail(custEmail, plainOrder).catch((err: any) => {
          console.error(`[Order ${plainOrder.orderNumber}] Out-for-delivery email failed:`, err.message)
        })
      } else if (normalizedStatus === 'rto') {
        console.log(`[Order ${plainOrder.orderNumber}] Sending RTO email to ${custEmail}...`)
        sendRtoEmail(custEmail, plainOrder).catch((err: any) => {
          console.error(`[Order ${plainOrder.orderNumber}] RTO email failed:`, err.message)
        })
      } else if (normalizedStatus === 'returned') {
        console.log(`[Order ${plainOrder.orderNumber}] Sending returned email to ${custEmail}...`)
        sendReturnedEmail(custEmail, plainOrder).catch((err: any) => {
          console.error(`[Order ${plainOrder.orderNumber}] Returned email failed:`, err.message)
        })
      } else {
        console.log(`[Order ${plainOrder.orderNumber}] No email trigger for status: ${finalStatus} (${normalizedStatus})`)
      }
    } else {
      console.warn(`[Order ${plainOrder.orderNumber}] No customer email found — skipping notification`)
    }
  } else {
    console.error(`[Order ${id}] Could not re-fetch order after transition — email not sent`)
  }

  res.json({ item: order.get({ plain: true }) })
}

export const resendOrderStatusEmail = async (req: Request, res: Response) => {
  const { id } = idParam.parse(req.params)
  const order = await Order.findByPk(id, {
    include: [{ model: OrderItem, as: 'items' }, { model: Customer }],
  })
  if (!order) throw new AppError(404, 'Order not found.')

  const plainOrder = order.get({ plain: true }) as Record<string, unknown>
  let custEmail = (
    ((plainOrder.Customer as Record<string, unknown> | undefined)?.email as string)
    || (plainOrder.customerEmail as string)
    || ((plainOrder as any).customer_email as string)
    || ((plainOrder.shippingAddress as Record<string, unknown> | undefined)?.email as string)
    || ((plainOrder.metadata as Record<string, unknown> | undefined)?.customerEmail as string)
    || ((plainOrder.metadata as Record<string, unknown> | undefined)?.email as string)
    || ''
  ).trim()

  if (!custEmail && plainOrder.customerId) {
    const c = await Customer.findByPk(plainOrder.customerId as number)
    if (c) {
      custEmail = String((c as any).email || '').trim()
    }
  }

  if (!custEmail) throw new AppError(400, 'No customer email address found on this order.')

  const currentStatus = String(plainOrder.status || 'pending').toLowerCase().replace(/-/g, '_')

  if (currentStatus === 'confirmed' || currentStatus === 'pending') {
    await sendOrderConfirmationEmail(custEmail, plainOrder)
  } else if (currentStatus === 'packing' || currentStatus === 'processing') {
    await sendPackingEmail(custEmail, plainOrder)
  } else if (currentStatus === 'dispatched' || currentStatus === 'shipped') {
    await sendShippingEmail(custEmail, plainOrder)
  } else if (currentStatus === 'out_for_delivery') {
    await sendOutForDeliveryEmail(custEmail, plainOrder)
  } else if (currentStatus === 'delivered') {
    await sendDeliveryEmail(custEmail, plainOrder)
  } else if (currentStatus === 'rto') {
    await sendRtoEmail(custEmail, plainOrder)
  } else if (currentStatus === 'returned') {
    await sendReturnedEmail(custEmail, plainOrder)
  } else if (currentStatus === 'cancelled') {
    await sendCancellationEmail(custEmail, plainOrder)
  } else {
    throw new AppError(400, `No status email available for status '${currentStatus}'.`)
  }

  res.json({ ok: true, message: `Status update notification (${currentStatus}) sent to ${custEmail}` })
}


export const sendRecoveryEmail = async (req: Request, res: Response) => {
  const { id } = idParam.parse(req.params)

  const order = await Order.findByPk(id, {
    paranoid: false,
    include: [
      { model: OrderItem, as: 'items' },
      { model: Customer },
    ],
  })
  if (!order) throw new AppError(404, 'Order not found.')

  const currentStatus = order.getDataValue('status') as string
  if (currentStatus !== 'pending_payment') {
    throw new AppError(400, 'Recovery emails can only be sent for abandoned checkout orders (pending_payment).')
  }

  const existingMeta = (order.get({ plain: true }) as any).metadata || {}
  const recoveryCount = Number(existingMeta.recoveryEmailCount || 0)
  if (recoveryCount >= 3) {
    throw new AppError(400, 'Maximum recovery email limit (3) reached for this order.')
  }

  const customerEmail = ((order.get('Customer') as Record<string, unknown> | undefined)?.email as string)
    || (order.getDataValue('customerEmail') as string)
    || ''
  if (!customerEmail) throw new AppError(400, 'No customer email found for this order.')

  const plainOrder = order.get({ plain: true }) as Record<string, unknown>

  await sendAbandonedCartEmail(customerEmail, plainOrder)

  await order.update({
    metadata: {
      ...existingMeta,
      recoveryEmailCount: recoveryCount + 1,
      recoveryEmailLastSent: new Date().toISOString(),
    },
  })

  await writeAuditLog({
    adminId: adminId(req),
    action: 'SEND_RECOVERY_EMAIL',
    entity: 'order',
    entityId: id,
    details: { email: customerEmail, recoveryCount: recoveryCount + 1 },
  })

  res.json({ ok: true, message: `Recovery email sent to ${customerEmail}`, recoveryCount: recoveryCount + 1 })
}

export const getOrderPdf = async (req: Request, res: Response) => {
  const { id } = idParam.parse(req.params)
  const order = await Order.findByPk(id, {
    include: [
      { model: OrderItem, as: 'items' },
      { model: Customer },
    ],
  })
  if (!order) throw new AppError(404, 'Order not found.')

  const plain = order.get({ plain: true }) as Record<string, unknown>

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="order-${plain.orderNumber || id}.pdf"`)

  const doc = generateOrderPdf(plain)
  doc.pipe(res)
}

export const getStageAddressesPdf = async (req: Request, res: Response) => {
  const { stage } = req.params
  const cfg = statusMap[stage]
  if (!cfg) throw new AppError(404, 'Invalid pipeline stage.')

  const orders = await Order.findAll({
    where: { status: cfg.status },
    order: [['id', 'DESC']],
    paranoid: false,
    include: [{ model: Customer }],
  })

  const plains = orders.map((o: any) => o.get({ plain: true }) as Record<string, unknown>)

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${stage}-addresses-${new Date().toISOString().split('T')[0]}.pdf"`)

  const label = stage.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const doc = generateAddressesPdf(plains, `${label} Orders - Customer Addresses`)
  doc.pipe(res)
}

// Dispatched orders still unpaid = COD pending collection. One PDF with just
// their invoices, one per page.
export const getDispatchedCodPendingInvoicesPdf = async (req: Request, res: Response) => {
  const orders = await Order.findAll({
    where: {
      status: 'dispatched',
      paymentStatus: { [Op.ne]: 'paid' },
    },
    order: [['id', 'DESC']],
    paranoid: false,
    include: [
      { model: OrderItem, as: 'items' },
      { model: Customer },
    ],
  })

  const plains = orders.map((o: any) => o.get({ plain: true }) as Record<string, unknown>)

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="dispatched-cod-pending-invoices-${new Date().toISOString().split('T')[0]}.pdf"`)

  const doc = generateStageInvoicesPdf(plains)
  doc.pipe(res)
}

export const getStageInvoicesPdf = async (req: Request, res: Response) => {
  const { stage } = req.params
  const cfg = statusMap[stage]
  if (!cfg) throw new AppError(404, 'Invalid pipeline stage.')

  const orders = await Order.findAll({
    where: { status: cfg.status },
    order: [['id', 'DESC']],
    paranoid: false,
    include: [
      { model: OrderItem, as: 'items' },
      { model: Customer },
    ],
  })

  const plains = orders.map((o: any) => o.get({ plain: true }) as Record<string, unknown>)

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${stage}-invoices-${new Date().toISOString().split('T')[0]}.pdf"`)

  const doc = generateStageInvoicesPdf(plains)
  doc.pipe(res)
}

export const updatePaymentSchema = z.object({
  paymentMethod: z.string().max(40).optional(),
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
  transactionId: z.string().max(120).optional(),
  notes: z.string().max(500).optional(),
})

export const updateOrderPayment = async (req: Request, res: Response) => {
  const { id } = idParam.parse(req.params)
  const body = updatePaymentSchema.parse(req.body)

  const order = await Order.findByPk(id)
  if (!order) throw new AppError(404, 'Order not found.')

  const updates: Record<string, unknown> = {}
  const existingMeta = (order.get({ plain: true }) as any).metadata || {}
  const metaUpdates: Record<string, unknown> = { ...existingMeta }

  if (body.paymentMethod !== undefined) {
    const pm = body.paymentMethod.trim().toLowerCase()
    updates.paymentMethod = pm
    metaUpdates.paymentMethod = pm
  }
  if (body.paymentStatus !== undefined) {
    updates.paymentStatus = body.paymentStatus
  }
  if (body.transactionId !== undefined) {
    metaUpdates.transactionId = body.transactionId.trim()
  }
  if (body.notes !== undefined) {
    metaUpdates.paymentNotes = body.notes.trim()
  }

  updates.metadata = metaUpdates
  await order.update(updates)

  const updated = await Order.findByPk(id, {
    include: [
      { model: OrderItem, as: 'items' },
      { model: Customer, attributes: ['id', 'name', 'email', 'mobile'] },
    ],
  })

  res.json({ success: true, item: updated })
}

