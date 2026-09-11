'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Minus, Plus, ShoppingCart, Trash2, X } from 'lucide-react'

import { useCart, itemKey } from './CartContext'
import { fetchShippingConfig, type ShippingConfig } from '@/lib/api/storefront'

/* ------------------------------------------------------------------ */
/*  CartDrawer                                                        */
/* ------------------------------------------------------------------ */

export default function CartDrawer() {
  const {
    items,
    totalItems,
    subtotal,
    drawerOpen,
    setDrawerOpen,
    updateQty,
    removeItem,
    hydrated,
  } = useCart()

  const [shippingConfig, setShippingConfig] = useState<ShippingConfig>({ freeShippingEnabled: false, freeShippingThreshold: 0 })

  useEffect(() => {
    fetchShippingConfig().then(setShippingConfig)
  }, [])

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        fetchShippingConfig().then(setShippingConfig)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  /* ---------- Lock body scroll when open ---------- */
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [drawerOpen])

  /* ---------- Close on Escape key ---------- */
  useEffect(() => {
    if (!drawerOpen) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setDrawerOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [drawerOpen, setDrawerOpen])

  /* ---------- Format price ---------- */
  const formatPrice = (amount: number) =>
    `\u20B9 ${amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

  const freeShippingEnabled = shippingConfig.freeShippingEnabled && shippingConfig.freeShippingThreshold > 0
  const threshold = shippingConfig.freeShippingThreshold
  const hasFreeShipping = freeShippingEnabled && subtotal >= threshold
  const freeShippingRemaining = freeShippingEnabled ? Math.max(0, threshold - subtotal) : 0
  const freeShippingProgress = freeShippingEnabled ? Math.min(100, (subtotal / threshold) * 100) : 0

  /* ---------- Render ---------- */
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm transition-all duration-300 ${
          drawerOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        className={`fixed right-0 top-0 z-[120] flex h-full w-full max-w-[420px] flex-col border-l-[4px] border-[#A34336] bg-[#FDFBF9] shadow-[0_0_40px_rgba(0,0,0,0.3)] transition-transform duration-300 max-[420px]:border-l-0 ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Shopping cart"
        aria-hidden={!drawerOpen}
      >
        {/* -------- Header -------- */}
        <div className="relative flex items-center justify-between border-b border-[#A34336]/20 bg-white px-4 py-4 sm:px-6 sm:py-5">
          <div className="pointer-events-none absolute inset-1.5 border border-[#A34336]/10" />

          <h2 className="relative z-10 flex items-center gap-2 text-lg font-medium text-[#333333]">
            <ShoppingCart className="h-5 w-5 text-[#A34336]" />
            Your Cart ({totalItems})
          </h2>

          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-[#A34336]/5 hover:text-[#A34336]"
            aria-label="Close cart"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* -------- Body -------- */}
        {!hydrated ? null : items.length === 0 ? (
          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <ShoppingCart className="h-16 w-16 text-gray-300" />
            <p className="text-lg font-medium text-gray-500">
              Your cart is empty
            </p>
            <Link
              href="/shop"
              onClick={() => setDrawerOpen(false)}
              className="mt-2 inline-block bg-[#A34336] px-8 py-3 text-sm font-medium uppercase tracking-wider text-white shadow-md transition duration-300 hover:bg-[#8e382b]"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          /* Cart items */
          <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
            {items.map(item => {
              const key = itemKey(item.id, item.variantId, item.color, item.size)
              return (
              <div
                key={key}
                className="group relative flex min-w-0 gap-3 border border-[#A34336]/20 bg-white p-3 shadow-sm sm:gap-4 sm:p-4"
              >
                {/* Decorative inner border */}
                <div className="pointer-events-none absolute inset-1 border border-[#A34336]/10" />

                {/* Image */}
                <img
                  src={item.image}
                  className="relative z-10 h-24 w-16 shrink-0 border border-gray-200 object-cover shadow-sm sm:h-28 sm:w-20"
                  alt={item.name}
                />

                {/* Details */}
                <div className="relative z-10 flex min-w-0 flex-1 flex-col">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <h3 className="min-w-0 pr-2 text-[13px] font-medium leading-tight text-[#333333] sm:text-[14px]">
                      {item.name}
                    </h3>
                    <button
                      type="button"
                      onClick={() => removeItem(key)}
                      className="shrink-0 text-gray-400 transition hover:text-red-500"
                      aria-label={`Remove ${item.name} from cart`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {item.color || item.size ? (
                    <p className="mt-1 text-[12px] text-gray-500">
                      {item.color && <span>Color: <span className="font-medium text-[#333333]">{item.color}</span></span>}
                      {item.color && item.size && <span className="mx-1">|</span>}
                      {item.size && <span>Size: <span className="font-medium text-[#333333]">{item.size}</span></span>}
                    </p>
                  ) : item.variantLabel ? (
                    <p className="mt-1 text-[12px] text-gray-500">
                      Variant: <span className="font-medium text-[#333333]">{item.variantLabel}</span>
                    </p>
                  ) : null}

                  {item.stock != null && item.stock <= 5 ? (
                    <p className={`mt-1 text-[11px] font-medium ${
                      item.stock === 0 ? 'text-red-500' : 'text-amber-600'
                    }`}>
                      {item.stock === 0 ? 'Out of stock' : `Only ${item.stock} left`}
                    </p>
                  ) : null}

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
                    {/* Qty controls */}
                    <div className="flex h-8 w-20 items-center overflow-hidden border border-[#A34336]/30 bg-white">
                      <button
                        type="button"
                        onClick={() => updateQty(key, item.qty - 1)}
                        className="flex h-full w-1/3 items-center justify-center text-xs text-gray-600 transition hover:bg-[#A34336]/10 disabled:opacity-30"
                        aria-label={`Decrease quantity of ${item.name}`}
                        disabled={item.qty <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <input
                        value={item.qty}
                        readOnly
                        className="h-full w-1/3 border-none bg-transparent text-center text-xs font-medium text-[#A34336] outline-none"
                        aria-label={`Quantity of ${item.name}`}
                      />
                      <button
                        type="button"
                        onClick={() => updateQty(key, item.qty + 1)}
                        className="flex h-full w-1/3 items-center justify-center text-xs text-gray-600 transition hover:bg-[#A34336]/10 disabled:opacity-30"
                        aria-label={`Increase quantity of ${item.name}`}
                        disabled={item.stock != null && item.qty >= item.stock}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Price */}
                    <span className="text-[15px] font-semibold text-[#A34336]">
                      {formatPrice(item.price * item.qty)}
                    </span>
                  </div>
                </div>
              </div>
              )
            })}
          </div>
        )}

        {/* -------- Footer (only when cart has items) -------- */}
        {items.length > 0 && (
          <div className="relative mt-auto border-t border-[#A34336]/20 bg-white p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] sm:p-6">
            <div className="pointer-events-none absolute inset-1.5 border border-[#A34336]/10" />

            <div className="relative z-10">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium uppercase tracking-wider text-[#333333]">
                  Subtotal
                </span>
                <span className="text-xl font-bold text-[#A34336]">
                  {formatPrice(subtotal)}
                </span>
              </div>

              <p className="mb-2 text-[12px] text-gray-500">
                Tax included.{' '}
                {freeShippingEnabled ? (
                  hasFreeShipping ? (
                    <span className="font-medium text-green-600">Free shipping applied!</span>
                  ) : (
                    <span>Add {formatPrice(freeShippingRemaining)} more for free shipping</span>
                  )
                ) : (
                  'Shipping calculated at checkout.'
                )}
              </p>
              {freeShippingEnabled && !hasFreeShipping && (
                <div className="mb-3 h-1 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-[#A34336] transition-all duration-500"
                    style={{ width: `${freeShippingProgress}%` }}
                  />
                </div>
              )}

              <Link
                href="/checkout"
                onClick={() => setDrawerOpen(false)}
                className="block w-full bg-[#A34336] py-3.5 text-center text-[14px] font-medium uppercase tracking-wider text-white shadow-md transition duration-300 hover:bg-[#8e382b]"
              >
                Proceed to Checkout
              </Link>

              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="mt-4 w-full text-center text-[13px] font-medium uppercase tracking-wider text-gray-500 transition hover:text-[#A34336]"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
