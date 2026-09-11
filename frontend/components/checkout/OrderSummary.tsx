'use client'

import { useState, useMemo, useEffect } from 'react'
import { useCart, type CartItem } from '@/components/cart/CartContext'
import { useAuth } from '@/components/auth/AuthContext'
import { useCheckout } from './CheckoutContext'
import { apiFetch } from '@/lib/api/client'
import { fetchShippingConfig, fetchAvailableCoupons, fetchAutoDiscount, type ShippingConfig, type AvailableCoupon } from '@/lib/api/storefront'
import { Loader2 } from 'lucide-react'

function formatPrice(value: number) {
  return `\u20B9 ${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function OrderSummary({ isBuyNow }: { isBuyNow?: boolean }) {
  const { items: cartItems, subtotal: cartSubtotal } = useCart()

  const [mounted, setMounted] = useState(false)
  const [buyNowItem, setBuyNowItem] = useState<CartItem | null>(null)

  useEffect(() => {
    if (isBuyNow) {
      try {
        const raw = sessionStorage.getItem('buyNowItem')
        if (raw) {
          const parsed = JSON.parse(raw) as CartItem
          if (parsed?.id && parsed?.name && parsed?.price != null) {
            setBuyNowItem(parsed)
          }
        }
      } catch {}
    }
    setMounted(true)
  }, [isBuyNow])

  const items = isBuyNow ? (buyNowItem ? [buyNowItem] : []) : cartItems
  const subtotal = isBuyNow && buyNowItem
    ? Number(buyNowItem.price ?? 0) * Number(buyNowItem.qty ?? 1)
    : cartSubtotal

  const { session } = useAuth()
  const { shippingTotal, shippingCalculated, isProcessing, couponCode, setCouponCode, couponDiscount, setCouponDiscount, setCouponLabel, couponLabel, couponDescription, setCouponDescription, selectedCourierName } = useCheckout()

  const [shippingConfig, setShippingConfig] = useState<ShippingConfig>({ freeShippingEnabled: false, freeShippingThreshold: 0 })
  const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>([])
  const [couponsLoaded, setCouponsLoaded] = useState(false)

  // Welcome discount for a customer's first-ever order — kept separate from the
  // manual couponCode/couponDiscount state, since it's never sent to the backend
  // as a coupon code (the backend re-derives it itself when no code is passed).
  // A manually-applied coupon always takes visual + calculation priority; removing
  // it naturally reveals this again since it's never cleared.
  const [autoDiscountAmount, setAutoDiscountAmount] = useState(0)
  const [autoDiscountLabel, setAutoDiscountLabel] = useState('')
  const [autoDiscountChecked, setAutoDiscountChecked] = useState(false)

  useEffect(() => {
    fetchShippingConfig().then(setShippingConfig)
    if (session) {
      fetchAvailableCoupons().then(coupons => { setAvailableCoupons(coupons); setCouponsLoaded(true) })
    } else {
      setAvailableCoupons([])
      setCouponsLoaded(true)
    }
  }, [session])

  useEffect(() => {
    if (!session || autoDiscountChecked || subtotal <= 0) return
    setAutoDiscountChecked(true)
    fetchAutoDiscount(subtotal).then(data => {
      if (data.valid && data.discount) {
        setAutoDiscountAmount(data.discount.amount)
        setAutoDiscountLabel(data.discount.label)
      }
    }).catch(() => {})
  }, [session, autoDiscountChecked, subtotal])

  const effectiveDiscount = couponCode ? couponDiscount : autoDiscountAmount
  const effectiveDiscountLabel = couponCode ? couponLabel : autoDiscountLabel

  const freeShippingEnabled = shippingConfig.freeShippingEnabled && shippingConfig.freeShippingThreshold > 0
  const threshold = shippingConfig.freeShippingThreshold
  const hasFreeShipping = freeShippingEnabled && subtotal >= threshold

  const effectiveShipping = hasFreeShipping ? 0 : shippingTotal

  const discountedSubtotal = Math.max(0, subtotal - effectiveDiscount)
  const total = discountedSubtotal + effectiveShipping

  const [couponInput, setCouponInput] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState('')

  async function handleApplyCoupon() {
    const code = couponInput.trim().toUpperCase()
    if (!code) return

    setCouponLoading(true)
    setCouponError('')

    try {
      const data = await apiFetch<{ valid: boolean; message?: string; discount?: { amount: number; label: string }; coupon?: { code: string; type: string; value: number; description: string | null } }>(
        '/storefront/orders/validate-coupon',
        { method: 'POST', body: JSON.stringify({ code, subtotal }) },
      )

      if (!data.valid) {
        setCouponError(data.message || 'Invalid coupon code.')
        return
      }

      setCouponCode(data.coupon?.code ?? '')
      setCouponDiscount(data.discount?.amount ?? 0)
      setCouponLabel(data.discount?.label ?? '')
      setCouponDescription(data.coupon?.description ?? null)
      setCouponInput('')
    } catch (err) {
      setCouponError(err instanceof Error ? err.message : 'Failed to validate coupon.')
    } finally {
      setCouponLoading(false)
    }
  }

  function handleRemoveCoupon() {
    setCouponCode(null)
    setCouponDiscount(0)
    setCouponLabel('')
    setCouponDescription(null)
    setCouponError('')
  }

  function handleSelectCoupon(coupon: AvailableCoupon) {
    setCouponInput(coupon.code)
  }

  if (!mounted) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-800">
            Order Summary
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-[#8B1A1A]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Loading summary...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {isBuyNow && (
        <div className="mb-4 flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B1A1A]/10 via-[#FDF6F0] to-[#8B1A1A]/10 border border-[#8B1A1A]/20">
          <span className="flex items-center gap-1.5 text-xs font-bold text-[#8B1A1A] tracking-wider uppercase">
            <span>⚡</span> Express Buy Now
          </span>
          <span className="text-[11px] font-semibold text-slate-600">Priority Checkout</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-800">
          Order Summary
        </h2>
        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
          {items.reduce((sum, item) => sum + (item.qty ?? 1), 0)} {items.reduce((sum, item) => sum + (item.qty ?? 1), 0) === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Items List */}
      <div className="mb-5 space-y-3.5">
        {items.map(item => {
          const key = `${item.id}__${item.color ?? ''}__${item.size ?? ''}`
          return (
          <div key={key} className="flex gap-3.5 items-center p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
            <div className="relative h-20 w-16 shrink-0">
              <div className="h-full w-full overflow-hidden rounded-lg border border-slate-200 bg-white">
                <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
              </div>
              <span className="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[#8B1A1A] text-[10px] font-bold text-white shadow-xs ring-2 ring-white">
                {item.qty}
              </span>
            </div>
            <div className="flex flex-1 flex-col justify-center min-w-0">
              <h3 className="line-clamp-1 text-xs font-bold text-slate-900 leading-tight">{item.name}</h3>
              {(item.color || item.size) && (
                <p className="mt-0.5 text-[11px] text-slate-500 truncate">
                  {item.color && <span>{item.color}</span>}
                  {item.color && item.size && <span className="mx-1">•</span>}
                  {item.size && <span>{item.size}</span>}
                </p>
              )}
              <div className="mt-1 text-xs font-bold text-[#8B1A1A]">{formatPrice(item.price)}</div>
            </div>
          </div>
        )})}
      </div>

      <hr className="mb-5 border-slate-100" />

      {/* Welcome discount */}
      {!couponCode && autoDiscountAmount > 0 && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
            ✨ Welcome Offer Auto-Applied
          </p>
          <span className="text-xs font-bold text-emerald-800">{autoDiscountLabel}</span>
        </div>
      )}

      {/* Coupon input */}
      {!couponCode && !session ? (
        <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-slate-600 font-medium">Coupons are available for registered customers. <a href="/login" className="text-[#8B1A1A] font-bold hover:underline">Log in</a> to view offers.</p>
        </div>
      ) : !couponCode ? (
        <div className="mb-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600">Have a coupon code?</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={couponInput}
              onChange={e => setCouponInput(e.target.value.toUpperCase())}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleApplyCoupon() } }}
              placeholder="Enter code (e.g. FESTIVE10)"
              className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs uppercase tracking-wider outline-none transition focus:border-[#8B1A1A] focus:ring-2 focus:ring-[#8B1A1A]/20 bg-white"
            />
            <button
              type="button"
              onClick={handleApplyCoupon}
              disabled={couponLoading || !couponInput.trim()}
              className="rounded-xl bg-[#8B1A1A] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#721226] disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {couponLoading ? '...' : 'Apply'}
            </button>
          </div>
          {couponError && <p className="mt-1.5 text-xs text-red-500 font-medium">{couponError}</p>}

          {couponsLoaded && availableCoupons.length > 0 && (
            <div className="mt-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Available Offers</p>
              <div className="space-y-1.5">
                {availableCoupons.map(coupon => (
                  <button
                    key={coupon.id}
                    type="button"
                    onClick={() => handleSelectCoupon(coupon)}
                    className="flex w-full items-center justify-between rounded-xl border border-dashed border-[#8B1A1A]/30 bg-[#FDF6F0]/40 p-2.5 text-left transition hover:border-[#8B1A1A] hover:bg-[#FDF6F0] cursor-pointer"
                  >
                    <div>
                      <span className="text-xs font-bold tracking-wider text-[#8B1A1A]">{coupon.code}</span>
                      <span className="ml-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        {coupon.type === 'percentage' ? `${coupon.value}% OFF` : `${formatPrice(Number(coupon.value))} OFF`}
                      </span>
                      {coupon.description && (
                        <p className="mt-0.5 text-[10px] text-slate-500">{coupon.description}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-[10px] font-bold text-[#8B1A1A]">APPLY →</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-900">{couponCode}</span>
              <span className="text-xs font-medium text-emerald-700">({couponLabel})</span>
            </div>
            <button
              type="button"
              onClick={handleRemoveCoupon}
              className="text-xs font-bold text-red-500 hover:text-red-700 cursor-pointer uppercase tracking-wider"
            >
              Remove
            </button>
          </div>
          {couponDescription && (
            <p className="mt-1 text-[11px] text-emerald-800/80 leading-tight">{couponDescription}</p>
          )}
        </div>
      )}

      {/* Totals */}
      <div className="mb-5 space-y-2.5 text-xs">
        <div className="flex justify-between text-slate-600">
          <span>Subtotal</span>
          <span className="font-semibold text-slate-900">{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between text-slate-600 items-center">
          <div>
            <span>Shipping</span>
            {selectedCourierName && (
              <span className="ml-1 text-[11px] font-medium text-slate-500">
                ({selectedCourierName})
              </span>
            )}
          </div>
          <span className="font-semibold text-emerald-700">
            {shippingTotal > 0 ? (
              formatPrice(shippingTotal)
            ) : (
              <span className="bg-emerald-50 text-emerald-700 font-bold text-[10px] px-2 py-0.5 rounded-full border border-emerald-200 uppercase">FREE</span>
            )}
          </span>
        </div>
        {effectiveDiscount > 0 && (
          <div className="flex justify-between text-emerald-700 font-medium">
            <span>Discount ({effectiveDiscountLabel})</span>
            <span className="font-bold">-{formatPrice(effectiveDiscount)}</span>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-slate-200/80 flex items-baseline justify-between">
        <div>
          <span className="text-sm font-bold text-slate-900 uppercase tracking-wider">Total Amount</span>
          <p className="text-[10px] text-slate-400 font-medium">Inclusive of all applicable taxes & GST</p>
        </div>
        <div className="text-right">
          <span className="text-xl font-bold text-[#8B1A1A]">{formatPrice(total)}</span>
        </div>
      </div>

      {isProcessing && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-center text-xs text-amber-800 font-medium animate-pulse">
          Completing your secure order... Please do not refresh or close.
        </div>
      )}
    </div>
  )
}
