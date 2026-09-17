import { Request, Response } from 'express'
import crypto from 'node:crypto'
import { z } from 'zod'
import { Op } from 'sequelize'

function computeGuestToken(orderId: number): string {
  return crypto.createHmac('sha256', env.COOKIE_SECRET)
    .update(orderId.toString())
    .digest('hex')
    .slice(0, 16)
}
import {
  Product,
  ProductVariant,
  Order,
  OrderItem,
  Coupon,
  CouponUsage,
  CouponCustomer,
  Customer,
} from '../../../models/index.js'
import { sequelize } from '../../../database/sequelize.js'
import { AppError } from '../../../utils/http.js'
import { env } from '../../../config/env.js'
import { createRazorpayOrder as razorpayCreateOrder, verifyPayment as verifyRazorpayPayment, fetchPayment, refundPayment } from '../../../services/razorpay.service.js'
import { createInvoiceForOrder } from '../../../services/invoice.service.js'
import { getCompanyInfo, getShippingConfig, resolveShippingOptions } from '../../../services/settings.service.js'
import { resolveAutoWelcomeDiscountPercentage } from '../../../services/guest-coupon.service.js'
import * as emailService from '../../../services/email.service.js'
import { plain } from './helpers.js'

function generateOrderNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase()
  return `A1-${date}-${suffix}`
}

const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.number().int().positive().optional(),
    variantId: z.number().int().positive().optional(),
    name: z.string().min(1).max(180),
    sku: z.string().max(80).optional(),
    variantLabel: z.string().max(120).optional(),
    color: z.string().max(80).optional(),
    size: z.string().max(40).optional(),
    imageUrl: z.string().max(255).optional(),
    quantity: z.coerce.number().int().min(1),
    unitPrice: z.coerce.number().min(0),
    total: z.coerce.number().min(0),
  })).min(1),
  customerEmail: z.string().email().optional(),
  paymentMethod: z.enum(['upi', 'card', 'netbanking']),
  shippingAddress: z.object({
    firstName: z.string().min(1),
    lastName: z.string().optional(),
    address: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    pincode: z.string().min(1),
    phone: z.string().min(1),
  }).optional(),
  shippingTotal: z.coerce.number().min(0).default(0),
  courierName: z.string().max(120).optional(),
  courierCode: z.string().max(80).optional(),
})

async function getValidatedShippingTotal(
  _items: Array<{ productId?: number; quantity: number }>,
  stateName: string,
  courierCodeOrName: string | undefined,
  subtotal: number,
  pincode?: string,
): Promise<number> {
  const options = await resolveShippingOptions(stateName, pincode, subtotal)
  if (options.length === 0) return 0
  if (!courierCodeOrName) {
    return Math.min(...options.map(o => o.rate))
  }
  const matched = options.find(
    o => o.code.toLowerCase() === courierCodeOrName.toLowerCase() ||
         o.name.toLowerCase() === courierCodeOrName.toLowerCase() ||
         courierCodeOrName.toLowerCase().includes(o.code.toLowerCase()) ||
         o.name.toLowerCase().includes(courierCodeOrName.toLowerCase()),
  )
  return matched ? matched.rate : Math.min(...options.map(o => o.rate))
}

export const createOrder = async (req: Request, res: Response) => {
  const parsed = createOrderSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, parsed.error.errors.map(e => e.message).join('; '))
  }

  const auth = (req as any).auth
  const { items, customerEmail, paymentMethod, shippingAddress, shippingTotal, courierName, courierCode } = parsed.data
  const subtotal = items.reduce((sum, item) => sum + item.total, 0)

  // Validate shippingTotal on backend
  let validatedShippingTotal = shippingTotal
  if (shippingAddress) {
    validatedShippingTotal = await getValidatedShippingTotal(
      items.map(i => ({ productId: i.productId, quantity: i.quantity })),
      shippingAddress.state || '',
      courierCode || courierName,
      subtotal,
      shippingAddress.pincode,
    )
  }
  const grandTotal = subtotal + validatedShippingTotal

  // Verify prices against database and check stock
  const productIds = [...new Set(items.filter(i => i.productId).map(i => i.productId!))]
  const variantIds = [...new Set(items.filter(i => i.variantId).map(i => i.variantId!))]

  const [products, variants]: [any[], any[]] = await Promise.all([
    productIds.length > 0
      ? Product.findAll({ where: { id: productIds } })
      : Promise.resolve([]),
    variantIds.length > 0
      ? ProductVariant.findAll({ where: { id: variantIds } })
      : Promise.resolve([]),
  ])

  const productMap = new Map(products.map(p => [p.id, p]))
  const variantMap = new Map(variants.map(v => [v.id, v]))
  const variantProductMap = new Map(variants.map(v => [v.id, v.productId]))

  for (const item of items) {
    if (item.variantId) {
      const variant = variantMap.get(item.variantId)
      if (!variant) throw new AppError(400, `Variant ${item.variantId} not found.`)
      const dbPrice = Number(variant.price)
      if (Math.abs(dbPrice - item.unitPrice) > 1) {
        throw new AppError(400, `Price mismatch for "${item.name}". Expected ₹${dbPrice}, got ₹${item.unitPrice}.`)
      }
      let availableStock = Number(variant.stockQty)
      if (availableStock < item.quantity) {
        throw new AppError(400, `Insufficient stock for "${item.name}" (Size: ${item.size || '—'}). Only ${availableStock} left.`)
      }
    } else if (item.productId) {
      const product = productMap.get(item.productId)
      if (!product) throw new AppError(400, `Product ${item.productId} not found.`)
      const dbPrice = Number(product.price)
      if (Math.abs(dbPrice - item.unitPrice) > 1) {
        throw new AppError(400, `Price mismatch for "${item.name}". Expected ₹${dbPrice}, got ₹${item.unitPrice}.`)
      }
      if (product.stockQty < item.quantity) {
        throw new AppError(400, `Insufficient stock for "${item.name}". Only ${product.stockQty} left.`)
      }
    }
  }

  // Calculate GST totals
  let gstTotal = 0
  let taxableAmount = 0
  for (const item of items) {
    let gstRate = 0
    if (item.variantId) {
      const pid = variantProductMap.get(item.variantId)
      const p = pid ? productMap.get(pid) : null
      gstRate = p ? Number(p.gstRate || 0) : 0
    } else if (item.productId) {
      const p = productMap.get(item.productId)
      gstRate = p ? Number(p.gstRate || 0) : 0
    }
    if (gstRate > 0) {
      taxableAmount += Math.round(item.total * 100 / (100 + gstRate) * 100) / 100
      gstTotal += Math.round(item.total * gstRate / (100 + gstRate) * 100) / 100
    } else {
      taxableAmount += item.total
    }
  }

  let resolvedCustomerId = auth?.sub ?? null
  let resolvedCustomerEmail = customerEmail || auth?.email || null
  const effectiveEmail = (customerEmail || auth?.email || (shippingAddress as any)?.email || '').trim().toLowerCase()

  if (resolvedCustomerId && !resolvedCustomerEmail) {
    const cust = await Customer.findByPk(resolvedCustomerId)
    if (cust) {
      resolvedCustomerEmail = (cust as any).email || null
    }
  }

  if (!resolvedCustomerId && effectiveEmail && effectiveEmail.includes('@')) {
    const existingCustomer = await Customer.findOne({
      where: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), effectiveEmail),
    })
    if (existingCustomer) {
      resolvedCustomerId = (existingCustomer as any).id
      if (!resolvedCustomerEmail) {
        resolvedCustomerEmail = (existingCustomer as any).email || null
      }
    }
  }

  if (!resolvedCustomerEmail && effectiveEmail && effectiveEmail.includes('@')) {
    resolvedCustomerEmail = effectiveEmail
  }

  const resolvedCustomerName = (
    [shippingAddress?.firstName, shippingAddress?.lastName].filter(Boolean).join(' ')
    || auth?.name
    || (resolvedCustomerEmail ? resolvedCustomerEmail.split('@')[0] : null)
    || 'Customer'
  ).trim()
  const resolvedCustomerMobile = (shippingAddress as any)?.phone || auth?.phone || null

  const result = await sequelize.transaction(async (t) => {
    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      customerId: resolvedCustomerId,
      customerName: resolvedCustomerName,
      customerEmail: resolvedCustomerEmail,
      customerMobile: resolvedCustomerMobile,
      paymentMethod,
      status: 'pending',
      paymentStatus: 'pending',
      subtotal,
      shippingTotal: validatedShippingTotal,
      grandTotal,
      gstTotal: Math.round(gstTotal * 100) / 100,
      taxableAmount: Math.round(taxableAmount * 100) / 100,
      shippingAddress: shippingAddress ?? null,
      metadata: {
        paymentMethod,
        ...(courierName ? { courierName } : {}),
        ...(courierCode ? { courierCode } : {}),
        ...(resolvedCustomerEmail ? { customerEmail: resolvedCustomerEmail } : {}),
      },
      deliveryAgentName: courierName || null,
    }, { transaction: t })

    const orderItems = await OrderItem.bulkCreate(
      items.map(item => ({
        orderId: order.get('id') as number,
        productId: item.productId ?? null,
        variantId: item.variantId ?? null,
        name: item.name,
        sku: item.sku ?? null,
        variantLabel: item.variantLabel ?? null,
        color: item.color ?? null,
        size: item.size ?? null,
        imageUrl: item.imageUrl ?? null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
      })),
      { transaction: t },
    )

    // Deduct stock with row lock
    for (const item of items) {
      if (item.variantId) {
        const v = await ProductVariant.findOne({
          where: { id: item.variantId },
          transaction: t,
          lock: t.LOCK.UPDATE,
        })
        if (v) {
          const currentStock = (v as any).stockQty ?? 0
          if (currentStock < item.quantity) {
            throw new AppError(400, `Insufficient stock for "${item.name}". Only ${currentStock} left.`)
          }
          await v.update({ stockQty: currentStock - item.quantity }, { transaction: t })
        }
      } else if (item.productId) {
        const p = await Product.findOne({
          where: { id: item.productId },
          transaction: t,
          lock: t.LOCK.UPDATE,
        })
        if (p) {
          const currentStock = (p as any).stockQty ?? 0
          if (currentStock < item.quantity) {
            throw new AppError(400, `Insufficient stock for "${item.name}". Only ${currentStock} left.`)
          }
          await p.update({ stockQty: currentStock - item.quantity }, { transaction: t })
        }
      }
    }

    return { order, orderItems }
  })

  const orderIdNum = result.order.get('id') as number
  const guestToken = !auth ? computeGuestToken(orderIdNum) : undefined

  res.status(201).json({
    order: plain(result.order),
    items: result.orderItems.map(row => plain(row)),
    guestToken,
  })

  // Async: create invoice + send confirmation emails (fire-and-forget)
  const orderId = result.order.get('id') as number
  const orderNumber = result.order.get('orderNumber') as string
  const adminEmail = env.ADMIN_EMAIL

  Promise.all([
    createInvoiceForOrder(orderId, { sendEmail: false }),
    getCompanyInfo(),
    // Re-fetch with items so the email shows the full item breakdown
    Order.findByPk(orderId, { include: [{ model: OrderItem, as: 'items' }] }),
  ]).then(([, company, fullOrder]) => {
    const orderWithItems = fullOrder ? plain(fullOrder) : plain(result.order)
    const customerEmailTo = (
      (auth?.email as string)
      || (customerEmail as string)
      || (orderWithItems.customerEmail as string)
      || ((orderWithItems.shippingAddress as any)?.email as string)
      || ((orderWithItems.metadata as any)?.customerEmail as string)
      || ''
    ).trim()
    if (customerEmailTo) {
      emailService.sendOrderConfirmationEmail(customerEmailTo, orderWithItems, company).catch((err: any) => {
        console.error(`[Order ${orderNumber}] Customer email failed:`, err.message)
      })
    }
    return emailService.sendAdminOrderNotification(adminEmail, orderWithItems, company)
  }).catch((err: any) => {
    console.error(`[Order ${orderNumber}] Post-order notification failed:`, err.message)
  })
}

// An order the customer never actually completed: either it's still stuck at the
// pending-payment checkpoint (checkout was abandoned), or the payment gateway reported
// it as failed before the customer ever confirmed (payment.failed webhook cancels these
// straight from pending_payment and stamps razorpayFailureReason). Neither should ever
// be visible to the customer as a placed order.
function isAbandonedCheckout(order: any): boolean {
  if (order.status === 'pending_payment') return true
  if (order.status === 'cancelled' && order.metadata && order.metadata.razorpayFailureReason) return true
  return false
}

export const getOrders = async (req: Request, res: Response) => {
  const auth = (req as any).auth
  const customerEmail = auth?.email ? String(auth.email).trim().toLowerCase() : null
  const orders = await Order.findAll({
    where: {
      [Op.or]: [
        { customerId: auth.sub },
        ...(customerEmail ? [{ customerEmail }] : []),
      ],
    },
    include: [{ model: OrderItem, as: 'items' }],
    order: [['createdAt', 'DESC']],
  })
  const visible = orders.map(row => plain<any>(row)).filter(order => !isAbandonedCheckout(order))
  res.json({ orders: visible })
}

export const getOrderById = async (req: Request, res: Response) => {
  const order = await Order.findByPk(req.params.id, {
    include: [{ model: OrderItem, as: 'items' }],
  })
  if (!order) throw new AppError(404, 'Order not found')

  const auth = (req as any).auth
  const plainOrder = plain<any>(order)

  if (auth) {
    const emailMatch = !plainOrder.customerEmail || !auth.email || plainOrder.customerEmail.toLowerCase() === auth.email.toLowerCase()
    const idMatch = plainOrder.customerId && plainOrder.customerId === auth.sub
    if (!idMatch && !emailMatch) {
      const token = (req.query.token as string) || ''
      const expectedToken = computeGuestToken(Number(req.params.id))
      if (!token || token !== expectedToken) {
        throw new AppError(403, 'You can only view your own orders.')
      }
    }
  } else {
    const token = (req.query.token as string) || ''
    const expectedToken = computeGuestToken(Number(req.params.id))
    if (!token || token !== expectedToken) {
      throw new AppError(403, 'Authentication required to view this order.')
    }
  }

  if (isAbandonedCheckout(plainOrder)) throw new AppError(404, 'Order not found')

  res.json({ order: plainOrder })
}

export const trackOrder = async (req: Request, res: Response) => {
  const orderNumber = String(req.query.orderNumber || req.query.orderId || req.query.q || '').trim()
  if (!orderNumber) {
    throw new AppError(400, 'Order number is required.')
  }

  const order = await Order.findOne({
    where: { orderNumber },
    include: [{ model: OrderItem, as: 'items' }],
  })

  if (!order) {
    throw new AppError(404, 'Order not found. Please verify your order number.')
  }

  const plainOrder = plain<any>(order)
  if (isAbandonedCheckout(plainOrder)) {
    throw new AppError(404, 'Order not found.')
  }

  const meta = plainOrder.metadata || {}
  const trackingNumber = plainOrder.trackingNumber || meta.trackingNumber || null
  const courierName = meta.courierName || plainOrder.deliveryAgentName || 'Standard Delivery'
  const trackingUrl = meta.trackingUrl || null

  res.json({
    order: {
      orderNumber: plainOrder.orderNumber,
      status: plainOrder.status,
      paymentStatus: plainOrder.paymentStatus,
      paymentMethod: plainOrder.paymentMethod,
      createdAt: plainOrder.createdAt,
      updatedAt: plainOrder.updatedAt,
      courierName,
      trackingNumber,
      trackingUrl,
      grandTotal: plainOrder.grandTotal,
      subtotal: plainOrder.subtotal,
      shippingTotal: plainOrder.shippingTotal,
      shippingAddress: {
        firstName: plainOrder.shippingAddress?.firstName,
        city: plainOrder.shippingAddress?.city,
        state: plainOrder.shippingAddress?.state,
        pincode: plainOrder.shippingAddress?.pincode,
      },
      items: (plainOrder.items || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
        imageUrl: item.imageUrl,
        color: item.color,
        size: item.size,
      })),
    }
  })
}

const calculateShippingSchema = z.object({
  pincode: z.string().optional().nullable().transform(v => (v && v.trim().length >= 6 ? v.trim() : undefined)),
  state: z.string().max(100).optional().nullable().transform(v => (v && v.trim() ? v.trim() : undefined)),
  items: z.array(z.object({
    weight: z.coerce.number().min(0).default(0.5),
    quantity: z.coerce.number().int().min(1),
  })).optional(),
  cod: z.boolean().default(false),
  subtotal: z.coerce.number().min(0).optional(),
})

export const calculateShipping = async (req: Request, res: Response) => {
  const parsed = calculateShippingSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, parsed.error.errors.map(e => e.message).join('; '))
  }

  const { pincode, state, subtotal } = parsed.data
  let stateName = (state || '').trim()

  if (!stateName && pincode && /^\d{6}$/.test(pincode.trim())) {
    try {
      const resp = await fetch(`https://api.postalpincode.in/pincode/${pincode.trim()}`)
      const json = await resp.json() as any[]
      if (json?.[0]?.Status === 'Success' && json[0].PostOffice?.length > 0) {
        stateName = json[0].PostOffice[0].State || ''
      }
    } catch {}
  }

  const shippingOptions = await resolveShippingOptions(stateName, pincode, subtotal || 0)
  res.json({
    state: stateName,
    shippingOptions,
  })
}

// A coupon's usedCount only moves once payment is confirmed, so checkouts still
// sitting in pending_payment hold a claim the counter cannot see yet. On a
// limited coupon that lets many more people than the limit allows pass
// validation at the same time, since every one of them reads the same stale
// count. Counting those in-flight holds closes the window. Rows older than the
// window are ignored so abandoned checkouts can't block the coupon forever.
const COUPON_HOLD_WINDOW_MS = 15 * 60 * 1000

async function countInFlightCouponHolds(couponId: number): Promise<number> {
  return Order.count({
    where: {
      couponId,
      status: 'pending_payment',
      createdAt: { [Op.gte]: new Date(Date.now() - COUPON_HOLD_WINDOW_MS) },
    },
  })
}

// True when the coupon has no headroom left once in-flight checkouts are counted.
async function isCouponUsageLimitReached(plainCoupon: any): Promise<boolean> {
  if (plainCoupon.usageLimit === null || plainCoupon.usageLimit <= 0) return false
  const held = await countInFlightCouponHolds(plainCoupon.id)
  return Number(plainCoupon.usedCount) + held >= Number(plainCoupon.usageLimit)
}

// The per-user limit is checked when the order is created, but the usage row
// that backs that check is only written once payment succeeds. Two checkouts
// opened at the same time therefore both read a clean slate and both receive
// the discount.
//
// It cannot be prevented at creation time: an unpaid order that is about to be
// paid and one the customer abandoned look identical, so refusing on the
// strength of an unpaid order would block the far more common case of somebody
// dismissing the payment window and immediately trying again.
//
// By the time we get here that ambiguity is gone — this one really was paid. If
// the customer is already at their limit on other orders, the discount was not
// theirs to take, and the only honest remedy after capture is a full refund and
// cancellation. That mirrors how an order is handled when its stock turns out
// to be gone after payment.
async function enforceCouponPerUserLimitOrRefund(
  couponId: number,
  orderId: number,
  plainOrder: any,
  order: any,
  razorpayPaymentId: string,
): Promise<void> {
  const customerId = plainOrder.customerId ?? null
  if (!customerId) return

  const coupon = await Coupon.findByPk(couponId)
  if (!coupon) return
  const perUserLimit = Number((coupon.get({ plain: true }) as any).perUserLimit || 0)
  if (perUserLimit <= 0) return

  // Only usages booked by OTHER orders count — this one has not recorded its
  // own yet, and a retried confirmation of this same order must not trip it.
  const alreadyUsed = await CouponUsage.count({
    where: { couponId, customerId, orderId: { [Op.ne]: orderId } },
  })
  if (alreadyUsed < perUserLimit) return

  console.error(
    `[Order ${plainOrder.orderNumber}] Coupon ${couponId} is past its per-customer limit ` +
    `(customer ${customerId} has ${alreadyUsed} use(s), limit ${perUserLimit}). Refunding payment ${razorpayPaymentId}.`,
  )
  try {
    await refundPayment(razorpayPaymentId)
  } catch (refundErr: any) {
    console.error(
      `[Order ${plainOrder.orderNumber}] CRITICAL: refund FAILED for payment ${razorpayPaymentId}:`,
      refundErr.message,
    )
  }

  // Read metadata off the live instance rather than the pre-claim snapshot, so
  // keys written since then are not clobbered.
  const currentMetadata = (order.get({ plain: true }) as any).metadata || {}
  await order.update({
    status: 'cancelled',
    paymentStatus: 'refunded',
    metadata: {
      ...currentMetadata,
      razorpayPaymentId,
      refundReason: `Coupon per-customer limit of ${perUserLimit} already reached`,
      refundedAt: new Date().toISOString(),
    },
  })

  throw new AppError(
    400,
    'Order cancelled: this coupon has already been used the maximum number of times on your account. ' +
    'A full refund has been initiated and will reflect in 5-7 business days.',
  )
}

const validateCouponSchema = z.object({
  code: z.string().min(1),
  subtotal: z.number().min(0),
})

export const validateCoupon = async (req: Request, res: Response) => {
  const parsed = validateCouponSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, parsed.error.errors.map(e => e.message).join('; '))
  }

  const auth = (req as any).auth
  const { code, subtotal } = parsed.data

  if (!auth?.sub) {
    return res.json({ valid: false, message: 'Coupons are available for registered customers. Please login to apply a coupon.' })
  }

  const coupon = await Coupon.findOne({ where: { code: code.toUpperCase() } })
  if (!coupon) {
    return res.json({ valid: false, message: 'Invalid coupon code.' })
  }

  const plainCoupon = coupon.get({ plain: true }) as any

  // Validation checks
  if (!plainCoupon.active) return res.json({ valid: false, message: 'This coupon is no longer active.' })

  const now = new Date()
  if (plainCoupon.startsAt && new Date(plainCoupon.startsAt) > now) {
    return res.json({ valid: false, message: 'This coupon is not yet valid.' })
  }
  if (plainCoupon.expiresAt && new Date(plainCoupon.expiresAt) < now) {
    return res.json({ valid: false, message: 'This coupon has expired.' })
  }

  if (await isCouponUsageLimitReached(plainCoupon)) {
    return res.json({ valid: false, message: 'This coupon has reached its usage limit.' })
  }

  const restrictedCount = await CouponCustomer.count({ where: { couponId: plainCoupon.id } })
  if (restrictedCount > 0) {
    const isEligible = await CouponCustomer.findOne({ where: { couponId: plainCoupon.id, customerId: auth.sub } })
    if (!isEligible) {
      return res.json({ valid: false, message: 'This coupon isn\'t available for your account.' })
    }
  }

  if (Number(plainCoupon.minCartValue) > 0 && subtotal < Number(plainCoupon.minCartValue)) {
    return res.json({ valid: false, message: `Minimum cart value of ₹${Number(plainCoupon.minCartValue).toFixed(2)} required.` })
  }

  const customerId = auth?.sub ?? null
  const customerEmail = auth?.email ?? null
  if (plainCoupon.perUserLimit > 0 && (customerId || customerEmail)) {
    const whereClause: any = { couponId: plainCoupon.id }
    if (customerId) whereClause.customerId = customerId
    else if (customerEmail) whereClause.customerEmail = customerEmail

    const usageCount = await CouponUsage.count({ where: whereClause })
    if (usageCount >= plainCoupon.perUserLimit) {
      return res.json({ valid: false, message: `You have used this coupon ${usageCount} time${usageCount > 1 ? 's' : ''}.` })
    }
  }

  // Calculate discount
  let discountAmount = 0
  if (plainCoupon.type === 'percentage') {
    discountAmount = Math.round((subtotal * Number(plainCoupon.value)) / 100 * 100) / 100
    if (plainCoupon.maxDiscount !== null && Number(plainCoupon.maxDiscount) > 0) {
      discountAmount = Math.min(discountAmount, Number(plainCoupon.maxDiscount))
    }
  } else if (plainCoupon.type === 'fixed') {
    discountAmount = Math.min(Number(plainCoupon.value), subtotal)
  }

  res.json({
    valid: true,
    coupon: {
      code: plainCoupon.code,
      type: plainCoupon.type,
      value: plainCoupon.value,
      description: plainCoupon.description,
    },
    discount: {
      amount: discountAmount,
      label: plainCoupon.type === 'percentage'
        ? `${plainCoupon.value}% off`
        : `₹${Number(plainCoupon.value).toFixed(2)} off`,
    },
  })
}

const autoDiscountSchema = z.object({
  subtotal: z.coerce.number().min(0),
})

// Checks whether the current customer qualifies for the admin-configured
// "guest → registered → first purchase" welcome discount. No coupon record
// is involved — the percentage set in the popup settings is applied
// directly. Returns { valid: false } for guests, returning customers, or
// when the feature is disabled.
export const getAutoDiscount = async (req: Request, res: Response) => {
  const parsed = autoDiscountSchema.safeParse(req.query)
  if (!parsed.success) {
    throw new AppError(400, parsed.error.errors.map(e => e.message).join('; '))
  }
  const { subtotal } = parsed.data

  const auth = (req as any).auth
  const customerId = auth?.sub ?? null

  const percentage = await resolveAutoWelcomeDiscountPercentage(customerId)
  if (!percentage) {
    return res.json({ valid: false })
  }

  const discountAmount = Math.round((subtotal * percentage) / 100 * 100) / 100

  res.json({
    valid: true,
    discount: {
      amount: discountAmount,
      percentage,
      label: `${percentage}% off — Welcome discount`,
    },
  })
}

const createRazorpayOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.number().int().positive().optional(),
    variantId: z.number().int().positive().optional(),
    name: z.string().min(1).max(180),
    sku: z.string().max(80).optional(),
    variantLabel: z.string().max(120).optional(),
    color: z.string().max(80).optional(),
    size: z.string().max(40).optional(),
    imageUrl: z.string().max(255).optional(),
    quantity: z.coerce.number().int().min(1),
    unitPrice: z.coerce.number().min(0),
    total: z.coerce.number().min(0),
  })).min(1),
  customerEmail: z.string().email().optional(),
  paymentMethod: z.enum(['upi', 'card', 'netbanking', 'online']),
  shippingAddress: z.object({
    firstName: z.string().min(1),
    lastName: z.string().optional(),
    address: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    pincode: z.string().min(1),
    phone: z.string().min(1),
  }).optional(),
  shippingTotal: z.coerce.number().min(0).default(0),
  courierName: z.string().max(120).optional(),
  courierCode: z.string().max(80).optional(),
  couponCode: z.string().max(50).optional(),
})

export const createRazorpayOrder = async (req: Request, res: Response) => {
  const parsed = createRazorpayOrderSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, parsed.error.errors.map(e => e.message).join('; '))
  }

  const auth = (req as any).auth
  const { items, customerEmail, paymentMethod, shippingAddress, shippingTotal, couponCode, courierName, courierCode } = parsed.data
  for (const item of items) {
    if (!item.productId && !item.variantId) {
      throw new AppError(400, `Item "${item.name}" has no product or variant ID.`)
    }
  }
  const subtotal = items.reduce((sum, item) => sum + item.total, 0)

  // Validate shippingTotal on backend
  let validatedShippingTotal = shippingTotal
  if (shippingAddress) {
    validatedShippingTotal = await getValidatedShippingTotal(
      items.map(i => ({ productId: i.productId, quantity: i.quantity })),
      shippingAddress.state || '',
      courierCode || courierName,
      subtotal,
      shippingAddress.pincode,
    )
  }

  // Validate coupon if the customer typed one themselves.
  let couponId: number | null = null
  let couponCodeSaved: string | null = null
  let discountAmount = 0
  let effectiveShippingTotal = validatedShippingTotal
  let welcomeDiscountApplied = false

  if (couponCode) {
    if (!auth?.sub) throw new AppError(400, 'Coupons are available for registered customers. Please login to apply a coupon.')

    const coupon = await Coupon.findOne({ where: { code: couponCode.toUpperCase() } })
    if (!coupon) throw new AppError(400, 'Invalid coupon code.')

    const plainCoupon = coupon.get({ plain: true }) as any

    // Validate all conditions
    if (!plainCoupon.active) throw new AppError(400, 'This coupon is no longer active.')
    const now = new Date()
    if (plainCoupon.startsAt && new Date(plainCoupon.startsAt) > now) throw new AppError(400, 'This coupon is not yet valid.')
    if (plainCoupon.expiresAt && new Date(plainCoupon.expiresAt) < now) throw new AppError(400, 'This coupon has expired.')
    if (await isCouponUsageLimitReached(plainCoupon)) throw new AppError(400, 'Coupon usage limit reached.')

    const restrictedCount = await CouponCustomer.count({ where: { couponId: plainCoupon.id } })
    if (restrictedCount > 0) {
      const isEligible = await CouponCustomer.findOne({ where: { couponId: plainCoupon.id, customerId: auth.sub } })
      if (!isEligible) throw new AppError(400, 'This coupon isn\'t available for your account.')
    }

    if (Number(plainCoupon.minCartValue) > 0 && subtotal < Number(plainCoupon.minCartValue)) {
      throw new AppError(400, `Minimum cart value of ₹${Number(plainCoupon.minCartValue).toFixed(2)} required.`)
    }

    const customerId = auth?.sub ?? null
    const customerEmail2 = customerEmail ?? null
    if (plainCoupon.perUserLimit > 0 && (customerId || customerEmail2)) {
      const whereClause: any = { couponId: plainCoupon.id }
      if (customerId) whereClause.customerId = customerId
      else if (customerEmail2) whereClause.customerEmail = customerEmail2
      const usageCount = await CouponUsage.count({ where: whereClause })
      if (usageCount >= plainCoupon.perUserLimit) throw new AppError(400, `You have already used this coupon.`)
    }

    // Calculate discount
    if (plainCoupon.type === 'percentage') {
      discountAmount = Math.round((subtotal * Number(plainCoupon.value)) / 100 * 100) / 100
      if (plainCoupon.maxDiscount !== null && Number(plainCoupon.maxDiscount) > 0) {
        discountAmount = Math.min(discountAmount, Number(plainCoupon.maxDiscount))
      }
    } else if (plainCoupon.type === 'fixed') {
      discountAmount = Math.min(Number(plainCoupon.value), subtotal)
    }

    couponId = plainCoupon.id
    couponCodeSaved = plainCoupon.code
  } else {
    // No manual coupon — check if this customer qualifies for the admin-configured
    // first-order welcome discount. Percentage comes straight from settings, no
    // coupon record involved, so there's nothing here that can be "misconfigured".
    const welcomePercentage = await resolveAutoWelcomeDiscountPercentage(auth?.sub ?? null)
    if (welcomePercentage) {
      discountAmount = Math.round((subtotal * welcomePercentage) / 100 * 100) / 100
      welcomeDiscountApplied = true
    }
  }

  // Fetch products for GST rate lookup
  const productIds = [...new Set(items.filter(i => i.productId).map(i => i.productId!))]
  const variantIds = [...new Set(items.filter(i => i.variantId).map(i => i.variantId!))]
  const [gstProducts, gstVariants]: [any[], any[]] = await Promise.all([
    productIds.length > 0 ? Product.findAll({ where: { id: productIds } }) : Promise.resolve([]),
    variantIds.length > 0 ? ProductVariant.findAll({ where: { id: variantIds } }) : Promise.resolve([]),
  ])
  const gstProductMap = new Map(gstProducts.map(p => [p.id, p]))
  const gstVariantProductMap = new Map(gstVariants.map(v => [v.id, v.productId]))
  const gstVariantFullMap = new Map(gstVariants.map(v => [v.id, v]))

  // Verify prices against database
  for (const item of items) {
    if (item.variantId) {
      const variant = gstVariantFullMap.get(item.variantId)
      if (!variant) throw new AppError(400, `Variant ${item.variantId} not found.`)
      const dbPrice = Number(variant.price)
      if (Math.abs(dbPrice - item.unitPrice) > 1) {
        throw new AppError(400, `Price mismatch for "${item.name}". Expected ${'\u20B9'}${dbPrice}, got ${'\u20B9'}${item.unitPrice}.`)
      }
    } else if (item.productId) {
      const product = gstProductMap.get(item.productId)
      if (!product) throw new AppError(400, `Product ${item.productId} not found.`)
      const dbPrice = Number(product.price)
      if (Math.abs(dbPrice - item.unitPrice) > 1) {
        throw new AppError(400, `Price mismatch for "${item.name}". Expected ${'\u20B9'}${dbPrice}, got ${'\u20B9'}${item.unitPrice}.`)
      }
    }
  }

  // Verify stock availability BEFORE creating Razorpay order
  for (const item of items) {
    if (item.variantId) {
      const variant = gstVariantFullMap.get(item.variantId)
      if (variant) {
        const availableStock = Number((variant as any).stockQty ?? 0)
        if (availableStock < item.quantity) {
          throw new AppError(400, `Insufficient stock for "${item.name}". Only ${availableStock} left.`)
        }
      }
    } else if (item.productId) {
      const product = gstProductMap.get(item.productId)
      if (product) {
        const availableStock = Number((product as any).stockQty ?? 0)
        if (availableStock < item.quantity) {
          throw new AppError(400, `Insufficient stock for "${item.name}". Only ${availableStock} left.`)
        }
      }
    }
  }

  // GST is charged on what the customer actually pays, so the coupon / welcome
  // discount is apportioned across the lines before the tax is backed out of
  // them. Listed prices are GST-inclusive, hence the total*rate/(100+rate)
  // form. Computing this on the pre-discount total instead makes the invoice
  // report tax on money that was never charged, and it stops reconciling with
  // grandTotal.
  const discountBase = subtotal > 0 ? Math.min(discountAmount, subtotal) : 0
  let discountAllocated = 0

  let gstTotal = 0
  let taxableAmount = 0
  items.forEach((item, index) => {
    let gstRate = 0
    if (item.variantId) {
      const pid = gstVariantProductMap.get(item.variantId)
      const p = pid ? gstProductMap.get(pid) : null
      gstRate = p ? Number(p.gstRate || 0) : 0
    } else if (item.productId) {
      const p = gstProductMap.get(item.productId)
      gstRate = p ? Number(p.gstRate || 0) : 0
    }

    // Proportional share of the discount. The final line takes whatever is
    // left rather than its own rounded share, so the parts always add back up
    // to exactly discountBase instead of drifting a paisa either way.
    let lineDiscount = 0
    if (discountBase > 0) {
      lineDiscount = index === items.length - 1
        ? discountBase - discountAllocated
        : Math.round((item.total / subtotal) * discountBase * 100) / 100
      discountAllocated += lineDiscount
    }
    const lineTotal = Math.max(0, item.total - lineDiscount)

    if (gstRate > 0) {
      taxableAmount += Math.round(lineTotal * 100 / (100 + gstRate) * 100) / 100
      gstTotal += Math.round(lineTotal * gstRate / (100 + gstRate) * 100) / 100
    } else {
      taxableAmount += lineTotal
    }
  })

  const orderShippingConfig = await getShippingConfig()
  if (orderShippingConfig.freeShippingEnabled && orderShippingConfig.freeShippingThreshold > 0 && subtotal >= orderShippingConfig.freeShippingThreshold) {
    effectiveShippingTotal = 0
  }

  const discountedSubtotal = Math.max(0, subtotal - discountAmount)
  const grandTotal = discountedSubtotal + effectiveShippingTotal
  const orderNumber = generateOrderNumber()

  // Online payments in India require at least ₹1.00 (Razorpay minimum threshold)
  if (grandTotal < 1) {
    throw new AppError(400, 'Order amount must be at least ₹1.00 for online payments.')
  }

  // Online payment is mandatory for all orders — COD is not supported
  let razorpayOrder: any
  try {
    razorpayOrder = await razorpayCreateOrder({
      amount: grandTotal,
      receipt: orderNumber,
      notes: { orderNumber, paymentMethod, ...(couponCodeSaved ? { couponCode: couponCodeSaved } : {}) },
    })
  } catch (err: any) {
    const gatewayMsg = err?.error?.description || err?.message || 'Payment gateway failed to initialize order'
    throw new AppError(502, `Payment gateway error: ${gatewayMsg}`)
  }

  let resolvedCustomerId = auth?.sub ?? null
  let resolvedCustomerEmail = customerEmail || auth?.email || null
  const effectiveEmail = (customerEmail || auth?.email || (shippingAddress as any)?.email || '').trim().toLowerCase()

  if (resolvedCustomerId && !resolvedCustomerEmail) {
    const cust = await Customer.findByPk(resolvedCustomerId)
    if (cust) {
      resolvedCustomerEmail = (cust as any).email || null
    }
  }

  if (!resolvedCustomerId && effectiveEmail && effectiveEmail.includes('@')) {
    const existingCustomer = await Customer.findOne({
      where: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), effectiveEmail),
    })
    if (existingCustomer) {
      resolvedCustomerId = (existingCustomer as any).id
      if (!resolvedCustomerEmail) {
        resolvedCustomerEmail = (existingCustomer as any).email || null
      }
    }
  }

  if (!resolvedCustomerEmail && effectiveEmail && effectiveEmail.includes('@')) {
    resolvedCustomerEmail = effectiveEmail
  }

  const resolvedCustomerName = (
    [shippingAddress?.firstName, shippingAddress?.lastName].filter(Boolean).join(' ')
    || auth?.name
    || (resolvedCustomerEmail ? resolvedCustomerEmail.split('@')[0] : null)
    || 'Customer'
  ).trim()
  const resolvedCustomerMobile = (shippingAddress as any)?.phone || auth?.phone || null

  // Step 1: always create the order as 'pending_payment' first, on its own —
  // this is the abandoned-checkout checkpoint for BOTH payment methods. If
  // the customer never completes (closes the Razorpay popup, loses
  // connection mid-COD-confirm, etc.), this is the row that shows up under
  // Abandoned Checkouts instead of leaving no trace at all.
  const draftResult = await sequelize.transaction(async (t) => {
    const order = await Order.create({
      orderNumber,
      customerId: resolvedCustomerId,
      customerName: resolvedCustomerName,
      customerEmail: resolvedCustomerEmail,
      customerMobile: resolvedCustomerMobile,
      status: 'pending_payment',
      paymentStatus: 'pending',
      paymentMethod,
      subtotal,
      shippingTotal: effectiveShippingTotal,
      grandTotal,
      gstTotal: Math.round(gstTotal * 100) / 100,
      taxableAmount: Math.round(taxableAmount * 100) / 100,
      discount: discountAmount,
      couponId,
      couponCode: couponCodeSaved,
      shippingAddress: shippingAddress ?? null,
      deliveryAgentName: courierName || null,
      metadata: {
        paymentMethod,
        ...(courierName ? { courierName } : {}),
        ...(courierCode ? { courierCode } : {}),
        ...(razorpayOrder ? { razorpayOrderId: razorpayOrder.id } : {}),
        ...(welcomeDiscountApplied ? { welcomeDiscountApplied: true } : {}),
        ...(resolvedCustomerEmail ? { customerEmail: resolvedCustomerEmail } : {}),
      },
    }, { transaction: t })

    await OrderItem.bulkCreate(
      items.map(item => ({
        orderId: order.get('id') as number,
        productId: item.productId ?? null,
        variantId: item.variantId ?? null,
        name: item.name,
        sku: item.sku ?? null,
        variantLabel: item.variantLabel ?? null,
        color: item.color ?? null,
        size: item.size ?? null,
        imageUrl: item.imageUrl ?? null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
      })),
      { transaction: t },
    )

    return order
  })

  const orderIdNum = draftResult.get('id') as number

  // Step 2: COD stays at pending_payment — admin confirms manually from
  // Abandoned Checkouts tab. Stock is deducted on confirmation, not at creation.
  // Online orders also stay at pending_payment and get promoted from verify-payment.

  const guestToken = !auth ? computeGuestToken(orderIdNum) : undefined

  res.status(201).json({
    keyId: env.RAZORPAY_KEY_ID,
    razorpayOrderId: razorpayOrder?.id ?? null,
    amount: razorpayOrder?.amount ?? 0,
    currency: razorpayOrder?.currency ?? 'INR',
    orderId: orderIdNum,
    status: 'pending_payment',
    guestToken,
  })
}

const verifyPaymentSchema = z.object({
  razorpayPaymentId: z.string().min(1),
  razorpayOrderId: z.string().min(1),
  razorpaySignature: z.string().min(1),
  orderId: z.number().int().positive(),
})

export const verifyPayment = async (req: Request, res: Response) => {
  const parsed = verifyPaymentSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, parsed.error.errors.map(e => e.message).join('; '))
  }

  const { razorpayPaymentId, razorpayOrderId, razorpaySignature, orderId } = parsed.data

  const valid = verifyRazorpayPayment({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  })

  if (!valid) {
    throw new AppError(400, 'Payment verification failed — signature mismatch')
  }

  let payment: any
  try {
    payment = await fetchPayment(razorpayPaymentId)
  } catch (err: any) {
    console.warn(`[Payment] Razorpay fetchPayment failed, proceeding with HMAC-only verification: ${err.message}`)
  }
  if (payment) {
    if (payment.order_id !== razorpayOrderId) {
      throw new AppError(400, 'Razorpay order ID does not match')
    }
    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      throw new AppError(400, `Payment is not successful (status: ${payment.status})`)
    }
  }

  const order = await Order.findByPk(orderId)
  if (!order) {
    throw new AppError(404, 'Order not found')
  }

  const plainOrder = plain<any>(order)
  if (plainOrder.paymentStatus === 'paid') {
    const existingOrder = await Order.findByPk(orderId, {
      include: [{ model: OrderItem, as: 'items' }],
    })
    const auth = (req as any).auth
    const guestToken = !auth ? computeGuestToken(orderId) : undefined
    return res.json({ order: plain<any>(existingOrder), guestToken })
  }

  try {
    await processPaidOrder(orderId, { razorpayPaymentId, razorpaySignature })
  } catch (procErr: any) {
    console.error(`[verifyPayment] processPaidOrder failed for order ${orderId}:`, procErr?.message, procErr?.parent?.sqlMessage || '', procErr?.name || '')
    throw procErr
  }

  const auth = (req as any).auth
  const updatedOrder = plain<any>(await Order.findByPk(orderId, {
    include: [{ model: OrderItem, as: 'items' }],
  }))

  const guestToken = !auth ? computeGuestToken(orderId) : undefined

  res.json({ order: updatedOrder, guestToken })
}

// ─── Shared post-payment processing ──────────────────

type PaymentDetails = {
  razorpayPaymentId: string
  razorpaySignature?: string
  webhookConfirmed?: boolean
}

export async function processPaidOrder(orderId: number, details: PaymentDetails): Promise<void> {
  // Both the frontend's verifyPayment call and the Razorpay webhook's payment.captured
  // handler can invoke this for the same order around the same time. A plain
  // "if already paid, return" check is a read-then-write race — two concurrent callers
  // can both pass it before either commits, double-deducting stock and double-sending
  // emails. Claim the order inside a row lock first so only one caller proceeds; the
  // other sees paid/processing and returns immediately.
  const claimedOrder = await sequelize.transaction(async (t) => {
    const order = await Order.findByPk(orderId, { transaction: t, lock: t.LOCK.UPDATE })
    if (!order) throw new AppError(404, 'Order not found')
    const current = plain<any>(order)
    if (current.paymentStatus === 'paid' || current.paymentStatus === 'processing') return null
    await order.update({ paymentStatus: 'processing' }, { transaction: t })
    return current
  })
  if (!claimedOrder) return

  const order = (await Order.findByPk(orderId))!
  const plainOrder = claimedOrder
  const couponId = plainOrder.couponId
  const discountAmount = Number(plainOrder.discount || 0)

  // Runs before stock is touched: if this order has to be refunded there is
  // then nothing to restore.
  if (couponId) {
    await enforceCouponPerUserLimitOrRefund(couponId, Number(orderId), plainOrder, order, details.razorpayPaymentId)
  }

  // Deduct stock inside locked transaction — auto-refund on failure
  const orderItems = await OrderItem.findAll({ where: { orderId } })
  try {
    await sequelize.transaction(async (t) => {
      for (const item of orderItems) {
        const itemPlain = plain<any>(item)
        if (itemPlain.variantId) {
          const v = await ProductVariant.findOne({
            where: { id: itemPlain.variantId },
            transaction: t,
            lock: t.LOCK.UPDATE,
          })
          if (v) {
            const currentStock = (v as any).stockQty ?? 0
            if (currentStock < itemPlain.quantity) {
              throw new AppError(400, `Insufficient stock for "${itemPlain.name}". Only ${currentStock} left.`)
            }
            await v.update({ stockQty: currentStock - itemPlain.quantity }, { transaction: t })
          }
        } else if (itemPlain.productId) {
          const p = await Product.findOne({
            where: { id: itemPlain.productId },
            transaction: t,
            lock: t.LOCK.UPDATE,
          })
          if (p) {
            const currentStock = (p as any).stockQty ?? 0
            if (currentStock < itemPlain.quantity) {
              throw new AppError(400, `Insufficient stock for "${itemPlain.name}". Only ${currentStock} left.`)
            }
            await p.update({ stockQty: currentStock - itemPlain.quantity }, { transaction: t })
          }
        }
      }
    })
  } catch (stockErr: any) {
    // Stock deduction failed after payment — issue automatic refund
    const razorpayPaymentId = details.razorpayPaymentId
    try {
      await refundPayment(razorpayPaymentId)
      console.error(`[Order ${orderId}] Stock insufficient after payment. Full refund issued for payment ${razorpayPaymentId}.`)
    } catch (refundErr: any) {
      console.error(`[Order ${orderId}] CRITICAL: Refund FAILED for payment ${razorpayPaymentId}:`, refundErr.message)
    }
    // Mark order as cancelled + refunded
    await order.update({
      status: 'cancelled',
      paymentStatus: 'refunded',
      metadata: {
        ...(plainOrder.metadata || {}),
        razorpayPaymentId,
        refundReason: stockErr.message || 'Insufficient stock after payment',
        refundedAt: new Date().toISOString(),
      },
    })
    throw new AppError(400, `Order cancelled: ${stockErr.message || 'Insufficient stock'}. A full refund has been initiated and will reflect in 5-7 business days.`)
  }

  await order.update({
    status: 'pending',
    paymentStatus: 'paid',
    metadata: {
      ...(plainOrder.metadata || {}),
      razorpayPaymentId: details.razorpayPaymentId,
      ...(details.razorpaySignature ? { razorpaySignature: details.razorpaySignature } : {}),
      ...(details.webhookConfirmed ? { webhookConfirmed: true } : {}),
      paidAt: new Date().toISOString(),
    },
  })

  // Record coupon usage for paid orders. Guarded by orderId so a retried or
  // webhook-duplicated confirmation of the SAME order can't count twice.
  if (couponId) {
    const existing = await CouponUsage.findOne({ where: { orderId: Number(orderId) } })
    if (!existing) {
      await CouponUsage.create({
        couponId,
        orderId: Number(orderId),
        customerId: plainOrder.customerId ?? null,
        customerEmail: plainOrder.customerEmail ?? null,
        discountAmount,
      })
      await Coupon.increment('usedCount', { by: 1, where: { id: couponId } })
    }
  }

  // Async: create invoice + confirmation emails (fire and forget)
  // Re-fetch with items and customer to ensure email shows full item breakdown
  const updatedOrder = plain<any>(await Order.findByPk(orderId, {
    include: [{ model: OrderItem, as: 'items' }, { model: Customer }],
  }))
  const adminEmail = env.ADMIN_EMAIL
  const orderNumber = updatedOrder.orderNumber
  Promise.all([
    createInvoiceForOrder(orderId, { sendEmail: false }),
    getCompanyInfo(),
  ]).then(([, company]) => {
    const customerEmailTo = (
      (updatedOrder.customerEmail as string)
      || ((updatedOrder.Customer as any)?.email as string)
      || ((updatedOrder.shippingAddress as any)?.email as string)
      || ((updatedOrder.metadata as any)?.customerEmail as string)
      || ''
    ).trim()
    if (customerEmailTo) {
      emailService.sendOrderConfirmationEmail(customerEmailTo, updatedOrder, company).catch((err: any) => {
        console.error(`[Order ${orderNumber}] Customer email failed:`, err.message)
      })
    }
    return emailService.sendAdminOrderNotification(adminEmail, updatedOrder, company)
  }).catch((err: any) => {
    console.error(`[Order ${orderNumber}] Post-order notification failed:`, err.message)
  })
}

const confirmCodSchema = z.object({
  guestToken: z.string().optional(),
})

export const confirmCodOrder = async (_req: Request, _res: Response) => {
  throw new AppError(400, 'Cash on Delivery (COD) is not supported. Orders can only be placed and confirmed with verified online payment.')
}
