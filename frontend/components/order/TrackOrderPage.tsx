'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  PackageSearch,
  CheckCircle2,
  Clock,
  Package,
  Truck,
  CheckCheck,
  ExternalLink,
  MapPin,
  AlertCircle,
  Loader2,
  ShoppingBag,
} from 'lucide-react'
import { apiFetch, resolveImageUrl } from '@/lib/api/client'

interface TrackedOrderItem {
  id: number
  name: string
  quantity: number
  unitPrice: number
  total: number
  imageUrl?: string
  color?: string
  size?: string
}

interface TrackedOrder {
  orderNumber: string
  status: string
  paymentStatus: string
  paymentMethod: string
  createdAt: string
  updatedAt: string
  courierName?: string
  trackingNumber?: string | null
  trackingUrl?: string | null
  grandTotal: number
  subtotal: number
  shippingTotal: number
  shippingAddress?: {
    firstName?: string
    city?: string
    state?: string
    pincode?: string
  }
  items: TrackedOrderItem[]
}

const STATUS_STEPS = [
  { key: 'placed', label: 'Order Placed', icon: Clock, desc: 'Order received and logged' },
  { key: 'confirmed', label: 'Order Confirmed', icon: CheckCircle2, desc: 'Payment verified & confirmed' },
  { key: 'processing', label: 'Packed & Ready', icon: Package, desc: 'Curated and securely packaged' },
  { key: 'shipped', label: 'Shipped', icon: Truck, desc: 'Dispatched with courier partner' },
  { key: 'delivered', label: 'Delivered', icon: CheckCheck, desc: 'Handed over to customer' },
]

function getActiveStepIndex(status: string): number {
  const s = status.toLowerCase()
  if (s === 'delivered') return 4
  if (s === 'shipped' || s === 'out_for_delivery') return 3
  if (s === 'processing' || s === 'packing') return 2
  if (s === 'confirmed') return 1
  if (s === 'cancelled' || s === 'returned' || s === 'rto') return -1
  return 0
}

export default function TrackOrderPage() {
  const searchParams = useSearchParams()
  const initialNumber = searchParams?.get('orderNumber') || searchParams?.get('orderId') || ''

  const [orderNumberInput, setOrderNumberInput] = useState(initialNumber)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orderData, setOrderData] = useState<TrackedOrder | null>(null)

  const fetchOrderTracking = useCallback(async (num: string) => {
    const cleanNum = num.trim()
    if (!cleanNum) return

    setLoading(true)
    setError(null)
    setOrderData(null)

    try {
      const data = await apiFetch<{ order: TrackedOrder }>(
        `/storefront/orders/track?orderNumber=${encodeURIComponent(cleanNum)}`
      )
      if (data?.order) {
        setOrderData(data.order)
      } else {
        setError('No order found with this order number. Please double check.')
      }
    } catch (err: any) {
      setError(err?.message || 'Order not found. Please verify your order number and try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialNumber) {
      fetchOrderTracking(initialNumber)
    }
  }, [initialNumber, fetchOrderTracking])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchOrderTracking(orderNumberInput)
  }

  const activeStepIdx = orderData ? getActiveStepIndex(orderData.status) : 0

  return (
    <main className="min-h-screen bg-[#FAFAFC] text-[#0F172A]">
      {/* Header Banner */}
      <section className="border-b border-[#E2E8F0] bg-gradient-to-r from-[#721226] via-[#8B1A1A] to-[#721226] text-white">
        <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 md:py-14 lg:px-8">
          <p className="text-[11px] md:text-xs font-bold uppercase tracking-[0.25em] text-[#FCD34D] mb-2">
            A1 TEX Real-Time Tracking
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white font-serif">
            Track Your Order
          </h1>
          <p className="mt-3 max-w-xl text-sm sm:text-base font-medium leading-relaxed text-amber-100/90">
            Check the live fulfillment, courier dispatch, and delivery timeline of your handcrafted silk sarees.
          </p>
        </div>
      </section>

      {/* Main Form & Results */}
      <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 md:py-12 lg:px-8">
        {/* Search Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-[0_10px_30px_rgba(15,23,42,0.04)] mb-8">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <PackageSearch size={20} />
              </div>
              <input
                type="text"
                required
                value={orderNumberInput}
                onChange={e => setOrderNumberInput(e.target.value)}
                placeholder="Enter Order Number (e.g. ORD-2026-0904-1234)"
                className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#8B1A1A] focus:bg-white focus:ring-2 focus:ring-[#8B1A1A]/20"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#8B1A1A] hover:bg-[#721226] text-white font-semibold text-sm uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Tracking...</span>
                </>
              ) : (
                <span>Track Order</span>
              )}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{error}</p>
                <p className="text-xs text-rose-700/80 mt-0.5">Please ensure your order number matches the receipt received via email or SMS.</p>
              </div>
            </div>
          )}
        </div>

        {/* Live Order Details Card */}
        {orderData && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Status Summary Banner */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-6 mb-8">
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">Order Details</div>
                  <h2 className="text-2xl font-bold text-[#0F172A] mt-1 font-serif tracking-wide">
                    {orderData.orderNumber}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Placed on {new Date(orderData.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    orderData.status === 'delivered'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : orderData.status === 'cancelled'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    Status: {orderData.status.replace(/_/g, ' ')}
                  </span>
                  <span className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                    Payment: {orderData.paymentStatus}
                  </span>
                </div>
              </div>

              {/* Stepper */}
              {activeStepIdx >= 0 ? (
                <div className="py-4">
                  <div className="relative flex flex-col md:flex-row justify-between gap-6 md:gap-2">
                    {/* Connecting line on desktop */}
                    <div className="hidden md:block absolute top-6 left-12 right-12 h-1 bg-slate-100 -z-0">
                      <div
                        className="h-full bg-[#8B1A1A] transition-all duration-500"
                        style={{ width: `${(activeStepIdx / (STATUS_STEPS.length - 1)) * 100}%` }}
                      />
                    </div>

                    {STATUS_STEPS.map((step, idx) => {
                      const isComplete = idx < activeStepIdx
                      const isCurrent = idx === activeStepIdx
                      const Icon = step.icon

                      return (
                        <div key={step.key} className="flex md:flex-col items-center gap-4 md:gap-3 z-10 md:w-44 text-left md:text-center">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                            isComplete
                              ? 'bg-[#8B1A1A] border-[#8B1A1A] text-white shadow-sm'
                              : isCurrent
                                ? 'bg-white border-[#8B1A1A] text-[#8B1A1A] ring-4 ring-[#8B1A1A]/20'
                                : 'bg-slate-50 border-slate-200 text-slate-400'
                          }`}>
                            <Icon size={20} strokeWidth={2.2} />
                          </div>
                          <div>
                            <div className={`text-sm font-bold ${isCurrent ? 'text-[#8B1A1A]' : 'text-slate-800'}`}>
                              {step.label}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                              {step.desc}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-red-50 text-red-700 text-sm font-medium">
                  This order has been updated to: <strong className="uppercase">{orderData.status}</strong>. Please contact customer support for further details.
                </div>
              )}

              {/* Courier & AWB Box */}
              {(orderData.trackingNumber || orderData.courierName) && (
                <div className="mt-8 p-5 rounded-xl bg-[#FDF6F0] border border-[#8B1A1A]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-[#8B1A1A] text-white flex items-center justify-center shrink-0">
                      <Truck size={20} />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Courier Dispatch</div>
                      <div className="text-sm font-bold text-[#0F172A]">
                        {orderData.courierName || 'Express Partner'}
                        {orderData.trackingNumber && (
                          <span className="ml-2 font-mono text-xs font-medium text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                            AWB: {orderData.trackingNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {orderData.trackingUrl && (
                    <a
                      href={orderData.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2.5 rounded-lg bg-[#8B1A1A] hover:bg-[#721226] text-white text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 shadow-xs"
                    >
                      <span>Live Courier Tracking</span>
                      <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Order Items & Destination Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Items List (2 cols) */}
              <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                <h3 className="text-base font-bold text-[#0F172A] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <ShoppingBag size={18} className="text-[#8B1A1A]" />
                  <span>Items In This Order ({orderData.items.length})</span>
                </h3>

                <div className="divide-y divide-slate-100">
                  {orderData.items.map((item, idx) => (
                    <div key={idx} className="py-4 flex items-center gap-4">
                      <div className="w-16 h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shrink-0">
                        {item.imageUrl ? (
                          <img
                            src={resolveImageUrl(item.imageUrl)}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <ShoppingBag size={20} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-[#0F172A] truncate">
                          {item.name}
                        </h4>
                        {(item.color || item.size) && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            {item.color && <span>Color: {item.color}</span>}
                            {item.color && item.size && <span className="mx-1.5">•</span>}
                            {item.size && <span>Size: {item.size}</span>}
                          </div>
                        )}
                        <div className="text-xs text-slate-600 mt-1">
                          Qty: <span className="font-semibold text-slate-900">{item.quantity}</span> × ₹{Number(item.unitPrice).toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div className="text-sm font-bold text-[#0F172A] shrink-0">
                        ₹{Number(item.total).toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery & Payment Summary (1 col) */}
              <div className="space-y-6">
                {/* Delivery Destination */}
                {orderData.shippingAddress && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <MapPin size={16} className="text-[#8B1A1A]" />
                      <span>Delivery Destination</span>
                    </h3>
                    <div className="text-sm text-slate-800 leading-relaxed font-medium">
                      {orderData.shippingAddress.firstName && <div>{orderData.shippingAddress.firstName}</div>}
                      <div>
                        {[orderData.shippingAddress.city, orderData.shippingAddress.state, orderData.shippingAddress.pincode]
                          .filter(Boolean)
                          .join(', ')}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">India</div>
                    </div>
                  </div>
                )}

                {/* Amount Summary */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
                    Payment Summary
                  </h3>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal</span>
                      <span>₹{Number(orderData.subtotal).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Shipping</span>
                      <span>{Number(orderData.shippingTotal) === 0 ? <span className="text-emerald-600 font-semibold">FREE</span> : `₹${Number(orderData.shippingTotal).toLocaleString('en-IN')}`}</span>
                    </div>
                    <div className="border-t border-slate-100 pt-2.5 flex justify-between font-bold text-base text-[#0F172A]">
                      <span>Total Paid</span>
                      <span className="text-[#8B1A1A]">₹{Number(orderData.grandTotal).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
