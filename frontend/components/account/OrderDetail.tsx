'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
} from 'lucide-react'
import { fetchOrder } from '@/lib/api/auth'
import type { CustomerOrder } from '@/lib/api/auth'
import { resolveImageUrl } from '@/lib/api/client'

const PIPELINE = ['confirmed', 'packing', 'dispatched', 'out_for_delivery', 'delivered'] as const

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmed',
  packing: 'Packing',
  dispatched: 'Dispatched',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

function formatPrice(value: string | number) {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return `₹ ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function OrderDetail() {
  const params = useParams()
  const orderId = Number(params.id)

  const [order, setOrder] = useState<CustomerOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId || isNaN(orderId)) {
      setError('Invalid order ID.')
      setLoading(false)
      return
    }

    fetchOrder(orderId)
      .then(data => setOrder(data.order))
      .catch(() => setError('Could not load order details.'))
      .finally(() => setLoading(false))
  }, [orderId])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0F172A] border-t-transparent" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="py-20 text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
          <Package className="h-10 w-10 text-red-300" />
        </div>
        <h2 className="font-playfair mb-4 text-2xl sm:text-3xl font-medium italic tracking-wide text-[#0F172A]">Order Not Found</h2>
        <p className="mb-8 text-gray-500">{error || 'This order does not exist.'}</p>
        <Link
          href="/account"
          className="inline-block bg-[#0F172A] px-8 py-3.5 text-sm font-medium uppercase tracking-wider text-white shadow-md transition hover:bg-[#080E1A]"
        >
          Back to Account
        </Link>
      </div>
    )
  }

  const currentStepIndex = PIPELINE.indexOf(order.status as typeof PIPELINE[number])
  const isCancelled = order.status === 'cancelled'
  const displayItems = order.items.filter(i => i.quantity > 0)

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/account"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#0F172A] transition hover:text-[#080E1A]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Account
      </Link>

      {/* Order header */}
      <div className="mb-6 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-playfair text-xl sm:text-2xl font-medium tracking-wide text-[#0F172A]">
              Order #{order.orderNumber}
            </h1>
            <p className="mt-1 text-sm text-[#64748B]">
              Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
              order.status === 'delivered' ? 'bg-green-100 text-green-700' :
              order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
              'bg-blue-100 text-blue-700'
            }`}>{STATUS_LABELS[order.status] || order.status}</span>
            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
              order.paymentStatus === 'paid' || order.paymentStatus === 'completed' ? 'bg-green-100 text-green-700' :
              order.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
              order.paymentStatus === 'failed' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-600'
            }`}>{order.paymentStatus}</span>
          </div>
        </div>
      </div>

      {/* Status pipeline */}
      {!isCancelled && (
        <div className="mb-6 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-5 sm:p-6">
          <h2 className="mb-5 text-sm font-semibold text-[#0F172A] uppercase tracking-wider">Order Progress</h2>
          <div className="flex items-start justify-between">
            {PIPELINE.map((step, index) => {
              const isCompleted = currentStepIndex >= index
              const isCurrent = currentStepIndex === index
              return (
                <div key={step} className="flex flex-col items-center gap-2 flex-1">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    isCompleted ? 'bg-green-500 text-white' :
                    isCurrent ? 'bg-[#0F172A] text-white ring-2 ring-[#FCB900] ring-offset-2' :
                    'bg-gray-200 text-gray-400'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <div className={`h-2 w-2 rounded-full ${isCurrent ? 'bg-white' : 'bg-gray-300'}`} />
                    )}
                  </div>
                  <span className={`text-center text-[10px] font-semibold uppercase leading-tight ${
                    isCompleted ? 'text-green-700' :
                    isCurrent ? 'text-[#0F172A]' :
                    'text-gray-400'
                  }`}>{STATUS_LABELS[step]}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Cancelled notice */}
      {isCancelled && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-5 sm:p-6">
          <h2 className="font-playfair mb-4 text-lg sm:text-xl font-medium italic tracking-wide text-[#0F172A]">
            Order Cancelled
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <Clock className="h-5 w-5 text-red-500" />
            </div>
            <p className="text-sm text-red-600">This order has been cancelled and will not be processed.</p>
          </div>
        </div>
      )}

      {/* Delivery info card */}
      {(order.status === 'dispatched' || order.status === 'out_for_delivery' || order.status === 'delivered') && (
        <div className="mb-6 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <Truck className="h-5 w-5 text-[#0F172A]" />
            <h2 className="font-playfair text-lg sm:text-xl font-medium italic tracking-wide text-[#0F172A]">
              Delivery Information
            </h2>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            {order.trackingNumber ? (
              <div>
                <span className="text-[#64748B]">Tracking Number</span>
                <p className="font-medium text-[#0F172A]">{order.trackingNumber}</p>
              </div>
            ) : null}
            {order.deliveryAgentName ? (
              <div>
                <span className="text-[#64748B]">Delivery Agent</span>
                <p className="font-medium text-[#0F172A]">{order.deliveryAgentName}{order.deliveryAgentPhone ? ` — ${order.deliveryAgentPhone}` : ''}</p>
              </div>
            ) : null}
            {order.dispatchedAt ? (
              <div>
                <span className="text-[#64748B]">Dispatched On</span>
                <p className="font-medium text-[#0F172A]">{new Date(order.dispatchedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            ) : null}
            {order.deliveredAt ? (
              <div>
                <span className="text-[#64748B]">Delivered On</span>
                <p className="font-medium text-green-700">{new Date(order.deliveredAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="mb-6 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <Package className="h-5 w-5 text-[#0F172A]" />
          <h2 className="font-playfair text-lg sm:text-xl font-medium italic tracking-wide text-[#0F172A]">
            Items ({displayItems.length})
          </h2>
        </div>
        <div className="divide-y divide-[#E2E8F0]">
          {displayItems.map(item => (
            <div key={item.id} className="flex items-center gap-3 py-3">
              {item.imageUrl && (
                <div className="h-16 w-12 shrink-0 overflow-hidden rounded border border-[#E2E8F0] bg-[#FAFAFC]">
                  <img src={resolveImageUrl(item.imageUrl)} alt={item.name} className="h-full w-full object-cover" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[#0F172A]">{item.name}</p>
                <p className="text-xs text-[#64748B]">
                  {item.color || item.size ? (
                    [item.color ? `Color: ${item.color}` : '', item.size ? `Size: ${item.size}` : ''].filter(Boolean).join(' | ')
                  ) : item.variantLabel || ''}
                  <span className="ml-2">x {item.quantity} @ {formatPrice(item.unitPrice)}</span>
                </p>
              </div>
              <p className="ml-4 shrink-0 font-semibold text-[#0F172A]">{formatPrice(item.total)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Order Summary */}
      <div className="mb-6 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-5 sm:p-6">
        <h2 className="font-playfair mb-4 text-lg sm:text-xl font-medium italic tracking-wide text-[#0F172A]">
          Order Summary
        </h2>
        {(() => {
          const slabTotals: Record<number, { cgst: number; sgst: number; taxable: number }> = {}
          let totalTaxable = 0
          let totalGstAmt = 0

          displayItems.forEach((item: any) => {
            const gstRate = Number(item.gstRate ?? item.taxRate ?? 5)
            const lineTotal = typeof item.total === 'string' ? parseFloat(item.total) : (item.total || 0)
            const taxableValue = parseFloat((lineTotal * 100 / (100 + gstRate)).toFixed(2))
            const gstAmount = parseFloat((lineTotal - taxableValue).toFixed(2))

            totalTaxable += taxableValue
            totalGstAmt += gstAmount

            if (!slabTotals[gstRate]) slabTotals[gstRate] = { cgst: 0, sgst: 0, taxable: 0 }
            slabTotals[gstRate].cgst += gstAmount / 2
            slabTotals[gstRate].sgst += gstAmount / 2
            slabTotals[gstRate].taxable += taxableValue
          })

          const sortedSlabs = Object.keys(slabTotals).map(Number).sort((a, b) => a - b)

          return (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-[#64748B]">
                <span>Subtotal (incl. GST)</span>
                <span className="font-medium text-[#0F172A]">{formatPrice(order.subtotal)}</span>
              </div>

              {totalGstAmt > 0 && (
                <div className="flex justify-between text-[#64748B]">
                  <span>Taxable Value</span>
                  <span className="font-medium text-[#0F172A]">{formatPrice(totalTaxable)}</span>
                </div>
              )}

              {sortedSlabs.map(slab => {
                const t = slabTotals[slab]
                const gstLineTotal = t.cgst + t.sgst
                return (
                  <div key={slab} className="flex justify-between text-[#64748B]">
                    <span>GST ({slab}%)</span>
                    <span className="font-medium text-[#0F172A]">{formatPrice(gstLineTotal)}</span>
                  </div>
                )
              })}

              {order.discount && parseFloat(order.discount) > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</span>
                  <span className="font-medium">-{formatPrice(order.discount)}</span>
                </div>
              )}

              <div className="flex justify-between text-[#64748B]">
                <span>Shipping</span>
                <span className="font-medium text-[#0F172A]">
                  {parseFloat(order.shippingTotal) === 0 ? 'Free' : formatPrice(order.shippingTotal)}
                </span>
              </div>

              <div className="flex justify-between border-t border-[#E2E8F0] pt-3 text-base">
                <span className="font-semibold text-[#0F172A]">Grand Total</span>
                <span className="text-xl font-bold text-[#0F172A]">{formatPrice(order.grandTotal)}</span>
              </div>
            </div>
          )
        })()}
      </div>

      {/* Shipping address */}
      {order.shippingAddress && (
        <div className="mb-6 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <MapPin className="h-5 w-5 text-[#0F172A]" />
            <h2 className="font-playfair text-lg sm:text-xl font-medium italic tracking-wide text-[#0F172A]">
              Shipping Address
            </h2>
          </div>
          <div className="text-sm text-[#64748B] space-y-1">
            <p className="font-medium text-[#0F172A]">
              {order.shippingAddress.firstName} {order.shippingAddress.lastName || ''}
            </p>
            <p>{order.shippingAddress.address}</p>
            <p>{order.shippingAddress.city}, {order.shippingAddress.state} — {order.shippingAddress.pincode}</p>
            <p>{order.shippingAddress.phone}</p>
          </div>
        </div>
      )}
    </div>
  )
}
