import Razorpay from 'razorpay'
import { createHmac } from 'crypto'
import { env } from '../config/env.js'

function getRazorpayInstance(): Razorpay {
  const key_id = process.env.RAZORPAY_KEY_ID || env.RAZORPAY_KEY_ID
  const key_secret = process.env.RAZORPAY_KEY_SECRET || env.RAZORPAY_KEY_SECRET
  return new Razorpay({ key_id, key_secret })
}

export type RazorpayOrder = {
  id: string
  entity: string
  amount: number
  amount_paid: number
  amount_due: number
  currency: string
  receipt: string
  status: string
  attempts: number
  notes: Record<string, string>
  created_at: number
}

export async function createRazorpayOrder(params: {
  amount: number
  receipt: string
  notes?: Record<string, string>
}): Promise<RazorpayOrder> {
  const rzp = getRazorpayInstance()
  const order = await rzp.orders.create({
    amount: Math.round(params.amount * 100),
    currency: 'INR',
    receipt: params.receipt,
    notes: params.notes ?? {},
  })
  return order as unknown as RazorpayOrder
}

export function verifyPayment(params: {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}): boolean {
  const body = `${params.razorpayOrderId}|${params.razorpayPaymentId}`
  const secret = process.env.RAZORPAY_KEY_SECRET || env.RAZORPAY_KEY_SECRET
  const expectedSignature = createHmac('sha256', secret)
    .update(body)
    .digest('hex')
  return expectedSignature === params.razorpaySignature
}

export async function fetchPayment(paymentId: string) {
  return getRazorpayInstance().payments.fetch(paymentId)
}

export async function capturePayment(paymentId: string, amount: number) {
  return getRazorpayInstance().payments.capture(paymentId, Math.round(amount * 100), 'INR')
}

export async function refundPayment(paymentId: string, amount?: number): Promise<any> {
  const opts: Record<string, unknown> = {}
  if (amount != null) {
    opts.amount = Math.round(amount * 100) // Razorpay expects paise
  }
  return getRazorpayInstance().payments.refund(paymentId, opts)
}
