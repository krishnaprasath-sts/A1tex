import { Op } from 'sequelize'
import { Order, OrderItem, Customer } from '../models/index.js'
import {
  fetchRazorpayOrder,
  fetchOrderPayments,
  fetchPayment,
  fetchAllPayments,
  capturePayment,
} from './razorpay.service.js'
import { processPaidOrder } from '../modules/storefront/controllers/order.controller.js'
import { plain } from '../modules/storefront/controllers/helpers.js'

export type SyncResult = {
  orderId: number
  orderNumber: string
  alreadyPaid: boolean
  promoted: boolean
  paymentId?: string
  paymentStatus?: string
  error?: string
}

/**
 * Synchronize a single database order with Razorpay API.
 * If Razorpay shows captured or authorized payment, promotes the order to paid.
 */
export async function syncOrderWithRazorpay(orderId: number): Promise<SyncResult> {
  const order = await Order.findByPk(orderId, {
    include: [{ model: OrderItem, as: 'items' }],
  })

  if (!order) {
    return { orderId, orderNumber: '', alreadyPaid: false, promoted: false, error: 'Order not found in database' }
  }

  const plainOrder = plain<any>(order)
  const orderNumber = plainOrder.orderNumber

  if (plainOrder.paymentStatus === 'paid' && plainOrder.status !== 'pending_payment') {
    return {
      orderId,
      orderNumber,
      alreadyPaid: true,
      promoted: false,
      paymentId: plainOrder.razorpayPaymentId || plainOrder.metadata?.razorpayPaymentId,
      paymentStatus: 'paid',
    }
  }

  const meta = plainOrder.metadata || {}
  const razorpayOrderId = plainOrder.razorpayOrderId || meta.razorpayOrderId || null
  let successfulPayment: any = null

  // Method 1: Check by Razorpay Order ID if present
  if (razorpayOrderId) {
    try {
      const paymentsRes = await fetchOrderPayments(razorpayOrderId)
      const payments = Array.isArray(paymentsRes) ? paymentsRes : paymentsRes?.items || []
      successfulPayment = payments.find((p: any) => p.status === 'captured' || p.status === 'authorized')
    } catch (err: any) {
      console.warn(`[RazorpaySync] fetchOrderPayments failed for ${razorpayOrderId}:`, err.message)
    }
  }

  // Method 1.5: If we have a stored razorpayPaymentId (e.g. from a failed processPaidOrder), fetch it directly
  if (!successfulPayment && (plainOrder.razorpayPaymentId || meta.razorpayPaymentId)) {
    const storedPaymentId = plainOrder.razorpayPaymentId || meta.razorpayPaymentId
    try {
      const payment = await fetchPayment(storedPaymentId)
      const belongsToThisOrder = !payment?.order_id || !razorpayOrderId || payment.order_id === razorpayOrderId
      if (payment && belongsToThisOrder && (payment.status === 'captured' || payment.status === 'authorized')) {
        successfulPayment = payment
      }
    } catch (err: any) {
      console.warn(`[RazorpaySync] fetchPayment failed for stored ${storedPaymentId}:`, err.message)
    }
  }

  // Method 2: If no Razorpay Order ID or no payment found, search recent payments by receipt/notes.
  // Only identifiers that name THIS order are accepted. Matching on customer
  // email + amount is deliberately not done: a customer who abandons a checkout
  // and then pays on a second attempt has two orders with the same email and
  // total, and a single payment would confirm both of them.
  if (!successfulPayment) {
    try {
      const allPaymentsRes = await fetchAllPayments({ count: 100 })
      const payments = Array.isArray(allPaymentsRes) ? allPaymentsRes : allPaymentsRes?.items || []

      successfulPayment = payments.find((p: any) => {
        if (p.status !== 'captured' && p.status !== 'authorized') return false
        // A payment made against a different Razorpay order belongs to that order
        if (p.order_id && razorpayOrderId && p.order_id !== razorpayOrderId) return false
        // Match by razorpayOrderId
        if (razorpayOrderId && p.order_id === razorpayOrderId) return true
        // Match by notes orderNumber
        if (p.notes?.orderNumber && p.notes.orderNumber === orderNumber) return true
        return false
      })
    } catch (err: any) {
      console.warn(`[RazorpaySync] fetchAllPayments failed for order ${orderNumber}:`, err.message)
    }
  }

  if (!successfulPayment) {
    return {
      orderId,
      orderNumber,
      alreadyPaid: false,
      promoted: false,
      error: 'No captured or authorized payment found on Razorpay for this order.',
    }
  }

  // If payment is authorized but not captured, capture it
  if (successfulPayment.status === 'authorized') {
    try {
      await capturePayment(successfulPayment.id, Number(plainOrder.grandTotal))
      successfulPayment.status = 'captured'
    } catch (capErr: any) {
      console.warn(`[RazorpaySync] Auto-capture failed for ${successfulPayment.id}:`, capErr.message)
    }
  }

  // Promote order using standard processPaidOrder
  try {
    await processPaidOrder(orderId, {
      razorpayPaymentId: successfulPayment.id,
      webhookConfirmed: false,
    })

    return {
      orderId,
      orderNumber,
      alreadyPaid: false,
      promoted: true,
      paymentId: successfulPayment.id,
      paymentStatus: 'paid',
    }
  } catch (err: any) {
    return {
      orderId,
      orderNumber,
      alreadyPaid: false,
      promoted: false,
      paymentId: successfulPayment.id,
      error: err.message || 'Failed to promote order after finding payment',
    }
  }
}

/**
 * Scan all pending_payment orders and reconcile against Razorpay API.
 */
export async function syncAllPendingOrders(limit = 50): Promise<{
  checked: number
  promoted: number
  results: SyncResult[]
}> {
  const pendingOrders = await Order.findAll({
    where: {
      [Op.or]: [
        { status: 'pending_payment' },
        { paymentStatus: 'processing' },
        { paymentStatus: 'pending', paymentMethod: { [Op.in]: ['online', 'upi', 'card', 'netbanking', 'razorpay'] } },
      ],
    },
    order: [['id', 'DESC']],
    limit,
  })

  const results: SyncResult[] = []
  let promoted = 0

  for (const ord of pendingOrders) {
    const id = ord.getDataValue('id') as number
    try {
      const res = await syncOrderWithRazorpay(id)
      results.push(res)
      if (res.promoted) promoted++
    } catch (e: any) {
      results.push({
        orderId: id,
        orderNumber: (ord.getDataValue('orderNumber') as string) || '',
        alreadyPaid: false,
        promoted: false,
        error: e.message,
      })
    }
  }

  return {
    checked: pendingOrders.length,
    promoted,
    results,
  }
}
