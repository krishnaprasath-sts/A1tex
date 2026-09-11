'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Package, ArrowRight, ShoppingBag } from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import FloatingActions from '@/components/ui/FloatingActions'
import { apiFetch, resolveImageUrl } from '@/lib/api/client'

type OrderItem = {
  id: number
  name: string
  imageUrl?: string
  color?: string
  size?: string
  variantLabel?: string
  quantity: number
  unitPrice: string
  total: string
}

type OrderData = {
  id: number
  orderNumber: string
  customerEmail?: string
  status: string
  paymentStatus: string
  subtotal: string
  shippingTotal: string
  grandTotal: string
  shippingAddress?: {
    firstName: string
    lastName?: string
    address: string
    city: string
    state: string
    pincode: string
    phone: string
  }
  createdAt: string
  items: OrderItem[]
}

function formatPrice(value: string | number) {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return `₹ ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function OrderConfirmationContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')

  const token = searchParams.get('token') || ''

  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) {
      setError('No order found.')
      setLoading(false)
      return
    }

    async function loadOrder() {
      try {
        const qs = token ? `?token=${encodeURIComponent(token)}` : ''
        const data = await apiFetch<{ order: OrderData }>(`/storefront/orders/${orderId}${qs}`)
        setOrder(data.order)
      } catch {
        setError('Could not load order details.')
      } finally {
        setLoading(false)
      }
    }

    loadOrder()
  }, [orderId, token])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--burgundy)] border-t-transparent" />
        <p className="mt-4 text-gray-500">Loading your order...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-20 text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
          <ShoppingBag className="h-10 w-10 text-red-300" />
        </div>
        <h2 className="font-playfair mb-4 text-2xl sm:text-3xl font-medium italic tracking-wide text-[var(--charcoal)]">Order Not Found</h2>
        <p className="mb-8 text-gray-500">{error}</p>
        <Link
          href="/shop"
          className="inline-block bg-[var(--burgundy)] px-8 py-3.5 text-sm font-medium uppercase tracking-wider text-white shadow-md transition hover:bg-[var(--burgundy-dark)]"
        >
          Continue Shopping
        </Link>
      </div>
    )
  }

  if (!order) return null

  return (
    <div className="space-y-8">
      {/* Success Header */}
      <div className="text-center">
        <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
        </div>
        <h1 className="font-playfair mb-2 text-2xl sm:text-3xl md:text-4xl font-medium tracking-wide text-[var(--charcoal)]">
          Order Placed Successfully!
        </h1>
        <p className="text-gray-500">
          Your order <span className="font-semibold text-[var(--charcoal)]">#{order.orderNumber}</span> has been confirmed.
        </p>
      </div>

      {/* Order Details Card */}
      <div className="rounded-lg border border-[var(--ivory-dark)] bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-4">
          <Package className="h-5 w-5 text-[var(--burgundy)]" />
          <h2 className="font-montserrat text-sm font-bold uppercase tracking-[0.2em] text-[var(--charcoal)]">Order Details</h2>
        </div>

        {/* Items */}
        <div className="space-y-4">
          {order.items.map(item => (
            <div key={item.id} className="flex items-center gap-4 border-b border-gray-50 pb-4">
              {item.imageUrl && (
                <img
                  src={resolveImageUrl(item.imageUrl)}
                  alt={item.name}
                  className="h-16 w-14 shrink-0 rounded border border-gray-200 object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[var(--charcoal)] truncate">{item.name}</p>
                <p className="text-sm text-gray-500">
                  {item.color || item.size ? (
                    [item.color ? `Color: ${item.color}` : '', item.size ? `Size: ${item.size}` : ''].filter(Boolean).join(' | ')
                  ) : item.variantLabel || '—'}
                </p>
                <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
              </div>
              <p className="shrink-0 text-right font-semibold text-[var(--burgundy)]">
                {formatPrice(item.total)}
              </p>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="mt-6 space-y-2 border-t border-gray-100 pt-4 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span className="font-medium text-[var(--charcoal)]">{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Shipping</span>
            <span className="font-medium text-green-600">
              {parseFloat(order.shippingTotal) === 0 ? 'Free' : formatPrice(order.shippingTotal)}
            </span>
          </div>
          <div className="flex justify-between border-t border-gray-100 pt-2 text-base">
            <span className="font-semibold text-[var(--charcoal)]">Total</span>
            <span className="text-xl font-bold text-[var(--burgundy)]">{formatPrice(order.grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Shipping Address */}
      {order.shippingAddress && (
        <div className="rounded-lg border border-[var(--ivory-dark)] bg-white p-6 shadow-sm sm:p-8">
          <h2 className="font-montserrat mb-4 text-sm font-bold uppercase tracking-[0.2em] text-[var(--charcoal)]">Shipping Address</h2>
          <div className="text-sm text-gray-600 space-y-1">
            <p className="font-medium text-[var(--charcoal)]">
              {order.shippingAddress.firstName} {order.shippingAddress.lastName || ''}
            </p>
            <p>{order.shippingAddress.address}</p>
            <p>{order.shippingAddress.city}, {order.shippingAddress.state} — {order.shippingAddress.pincode}</p>
            <p>{order.shippingAddress.phone}</p>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="flex flex-col items-center gap-4 pt-4 sm:flex-row sm:justify-center">
        <Link
          href="/shop"
          className="flex w-full items-center justify-center gap-2 rounded bg-[var(--burgundy)] px-8 py-3.5 text-sm font-medium uppercase tracking-wider text-white shadow-md transition hover:bg-[var(--burgundy-dark)] sm:w-auto"
        >
          Continue Shopping
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}

export default function OrderConfirmationPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#FDFBF9] font-sans text-gray-900">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--burgundy)] border-t-transparent" />
              <p className="mt-4 text-gray-500">Loading your order...</p>
            </div>
          }>
            <OrderConfirmationContent />
          </Suspense>
        </div>
      </main>

      <Footer />
      <FloatingActions />
    </>
  )
}
