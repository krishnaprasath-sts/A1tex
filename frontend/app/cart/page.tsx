'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CreditCard, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import FloatingActions from '@/components/ui/FloatingActions'
import { useCart, itemKey } from '@/components/cart/CartContext'
import { fetchShippingConfig, type ShippingConfig } from '@/lib/api/storefront'

function formatPrice(value: number) {
  return `₹ ${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function CartPageContent() {
  const router = useRouter()
  const { items, removeItem, updateQty, clearCart, subtotal, hydrated, totalItems, totalUnits, syncing } = useCart()

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

  const totalUniqueItems = items.length

  const grandTotal = subtotal

  const freeShippingEnabled = shippingConfig.freeShippingEnabled
  const threshold = shippingConfig.freeShippingThreshold
  const hasFreeShipping = freeShippingEnabled && subtotal >= threshold
  const freeShippingRemaining = freeShippingEnabled ? Math.max(0, threshold - subtotal) : 0
  const freeShippingProgress = freeShippingEnabled ? (threshold === 0 ? 100 : Math.min(100, (subtotal / threshold) * 100)) : 0

  if (!hydrated) {
    return (
      <>
        <Header />
        <main className="relative z-10 flex-grow overflow-hidden bg-[var(--ivory)]">
          <div className="flex justify-center py-40">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--burgundy)] border-t-transparent" />
          </div>
        </main>
        <Footer />
        <FloatingActions />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="relative z-10 flex-grow overflow-hidden bg-[var(--ivory)]">
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.12] mix-blend-multiply"
          style={{ backgroundImage: "url('/bgabstractimage/cartabstract.png')" }}
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute inset-0 bg-[var(--ivory)]/78" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-[var(--ivory)]/25 via-[var(--ivory)]/64 to-transparent" aria-hidden="true" />

        <div className="relative z-10 mx-auto w-full max-w-[1200px] px-4 py-12 sm:px-6 md:py-16 lg:px-8">
          <Link href="/shop" className="mb-8 inline-flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-[var(--charcoal)] transition hover:text-[var(--burgundy)]">
            <ArrowLeft className="h-4 w-4" />
            Back to Shop
          </Link>

        <div className="mb-10 text-center">
          <h1 className="font-playfair mb-3 text-3xl sm:text-4xl md:text-5xl font-medium tracking-wide text-[var(--charcoal)]">Your Shopping Cart</h1>
          <p className="font-montserrat text-[11px] md:text-xs font-bold uppercase tracking-[0.25em] text-[var(--muted)]">Review your selected items</p>
        </div>

          {syncing && items.length === 0 ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--burgundy)] border-t-transparent" />
            </div>
          ) : items.length > 0 ? (
            <div className="flex flex-col lg:flex-row gap-8 items-start">
            <section className="flex w-full lg:w-2/3 flex-col gap-4" aria-label="Cart items">
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <p className="text-sm text-gray-500">
                  <span className="font-semibold text-[var(--charcoal)]">{totalUniqueItems}</span> item{totalUniqueItems !== 1 ? 's' : ''} · <span className="font-semibold text-[var(--charcoal)]">{totalUnits}</span> total unit{totalUnits !== 1 ? 's' : ''}
                </p>
                <button
                  type="button"
                  onClick={() => { if (window.confirm('Clear your entire cart?')) clearCart() }}
                  className="text-xs font-semibold uppercase tracking-wider text-gray-400 transition hover:text-red-500"
                >
                  Clear Cart
                </button>
              </div>
              {items.map(item => {
                const key = itemKey(item.id, item.variantId, item.color, item.size)
                const isLowStock = item.stock != null && item.stock <= 5 && item.stock > 0
                const isOutOfStock = item.stock != null && item.stock === 0
                return (
                <article
                  key={key}
                  className={`group relative flex flex-row gap-4 border bg-white p-4 shadow-sm transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] ${
                    isOutOfStock ? 'border-red-300 opacity-60' : 'border-[var(--burgundy)]/20'
                  }`}
                >
                  <div className="pointer-events-none absolute inset-1 border border-[var(--burgundy)]/10 opacity-50 transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative z-10 h-32 w-24 sm:h-28 sm:w-24 shrink-0 overflow-hidden">
                    <img src={item.image} className="h-full w-full border border-gray-200 object-cover shadow-sm transition-transform duration-700 ease-out group-hover:scale-110" alt={item.name} />
                  </div>

                  <div className="relative z-10 flex flex-1 flex-col justify-between py-1">
                    <div>
                      <div className="mb-2 flex items-start justify-between">
                        <h3 className="pr-4 text-[16px] font-medium leading-tight text-[var(--charcoal)] transition-colors duration-300 group-hover:text-[var(--burgundy)]">{item.name}</h3>
                        <button
                          type="button"
                          onClick={() => removeItem(key)}
                          className="text-gray-400 transition-all duration-300 hover:rotate-3 hover:scale-110 hover:text-[var(--burgundy)]"
                          aria-label={`Remove ${item.name}`}
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                      {item.color || item.size ? (
                        <p className="mb-1 text-[13px] text-gray-500">
                          {item.color && <span>Color: <span className="font-medium text-[var(--charcoal)]">{item.color}</span></span>}
                          {item.color && item.size && <span className="mx-2">|</span>}
                          {item.size && <span>Size: <span className="font-medium text-[var(--charcoal)]">{item.size}</span></span>}
                        </p>
                      ) : item.variantLabel ? (
                        <p className="mb-1 text-[13px] text-gray-500">
                          Variant: <span className="font-medium text-[var(--charcoal)]">{item.variantLabel}</span>
                        </p>
                      ) : null}

                      {/* Stock status */}
                      {item.stock != null && (
                        <p className={`mt-1 text-[12px] font-medium ${
                          isOutOfStock ? 'text-red-500' : isLowStock ? 'text-amber-600' : 'text-green-600'
                        }`}>
                          {isOutOfStock ? 'Out of stock' : isLowStock ? `Only ${item.stock} left` : 'In stock'}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex flex-col sm:flex-row items-end sm:items-center justify-between gap-3 sm:gap-0">
                      <div className="flex h-8 w-24 shrink-0 items-center overflow-hidden border border-[var(--burgundy)]/30 bg-white">
                        <button
                          type="button"
                          className="flex h-full w-1/3 items-center justify-center text-sm text-gray-600 transition hover:bg-[var(--burgundy)]/10 disabled:opacity-30"
                          onClick={() => updateQty(key, item.qty - 1)}
                          disabled={item.qty <= 1}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <input value={item.qty} readOnly className="h-full w-1/3 border-none bg-transparent text-center text-sm font-medium text-[var(--burgundy)] outline-none" aria-label={`${item.name} quantity`} />
                        <button
                          type="button"
                          className="flex h-full w-1/3 items-center justify-center text-sm text-gray-600 transition hover:bg-[var(--burgundy)]/10 disabled:opacity-30"
                          onClick={() => updateQty(key, item.qty + 1)}
                          disabled={item.stock != null && item.qty >= item.stock}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="text-right">
                        {item.originalPrice ? <span className="mb-1 block text-[13px] text-gray-400 line-through">{formatPrice(item.originalPrice)}</span> : null}
                        <span className="block text-lg font-semibold text-[var(--burgundy)]">{formatPrice(item.price * item.qty)}</span>
                        <span className="block text-[11px] text-gray-400">{formatPrice(item.price)} each</span>
                      </div>
                    </div>
                  </div>
                </article>
                )
              })}
            </section>

            <aside className="w-full lg:w-1/3 lg:sticky lg:top-24" aria-label="Order summary">
              <div className="relative border border-[var(--burgundy)]/20 bg-white p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                <div className="pointer-events-none absolute inset-2 border border-[var(--burgundy)]/10" />

                <div className="relative z-10 mx-auto max-w-[1020px]">
                  <h2 className="font-montserrat mb-5 border-b border-gray-100 pb-4 text-center text-sm font-bold uppercase tracking-[0.2em] text-[var(--charcoal)]">
                    Order Summary
                  </h2>

                  <div className="mb-5 space-y-3 text-[14px] sm:text-[15px]">
                    <div className="flex items-center justify-between text-gray-500">
                      <span>Items ({totalUniqueItems})</span>
                      <span className="font-medium text-[var(--charcoal)]">{totalUnits} units</span>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] items-center gap-4 text-gray-600">
                      <span>Subtotal</span>
                      <span className="text-right font-semibold text-[var(--charcoal)]">{formatPrice(subtotal)}</span>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] items-center gap-4 text-gray-600">
                      <span>Estimated Shipping</span>
                      {freeShippingEnabled ? (
                        hasFreeShipping ? (
                          <span className="text-right font-semibold text-green-600">Free Shipping</span>
                        ) : (
                          <span className="text-right text-[12px] font-medium text-[var(--charcoal)]">
                            Add {formatPrice(freeShippingRemaining)} more for free shipping
                          </span>
                        )
                      ) : (
                        <span className="text-right font-semibold text-[var(--charcoal)]">Calculated at checkout</span>
                      )}
                    </div>
                    {freeShippingEnabled && !hasFreeShipping && (
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-[var(--burgundy)] transition-all duration-500"
                          style={{ width: `${freeShippingProgress}%` }}
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-[1fr_auto] items-center gap-4 text-gray-600">
                      <span>Estimated Taxes</span>
                      <span className="text-right font-semibold text-[var(--charcoal)]">Calculated at checkout</span>
                    </div>
                  </div>

                  <div className="mb-6 border-t border-[var(--burgundy)]/20 pt-5">
                    <div className="grid grid-cols-[1fr_auto] items-start gap-4">
                      <div>
                        <span className="block text-lg font-semibold text-[var(--charcoal)]">Grand Total</span>
                        <p className="mt-3 text-[12px] text-gray-500 sm:text-[13px]">Inclusive of all taxes</p>
                      </div>
                      <span className="text-right text-xl font-bold text-[var(--burgundy)] sm:text-2xl">{formatPrice(grandTotal)}</span>
                    </div>
                  </div>

                  <button type="button" onClick={() => router.push('/checkout')} className="group relative z-10 flex w-full items-center justify-center gap-2 overflow-hidden bg-[var(--burgundy)] py-4 text-[14px] font-semibold uppercase tracking-widest text-white shadow-md transition-all duration-300 sm:text-[15px]">
                    <span className="absolute inset-0 z-[-1] origin-left scale-x-0 bg-[var(--burgundy-dark)] transition-transform duration-500 ease-out group-hover:scale-x-100" />
                    <span className="relative z-10 flex items-center gap-2">
                      Proceed to Checkout
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-2" />
                    </span>
                  </button>

                  <div className="mt-6 flex justify-center gap-4 border-t border-gray-100 pt-6 text-gray-400">
                    {['Visa', 'Mastercard', 'GPay', 'ApplePay'].map(label => (
                      <div key={label} className="flex h-9 w-12 items-center justify-center rounded border border-gray-200 text-[10px] font-bold uppercase transition-all duration-300 hover:-translate-y-1 hover:scale-110 hover:border-[var(--burgundy)]/30 hover:text-[var(--burgundy)]">
                        <CreditCard className="h-4 w-4" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
            </div>
          ) : (
            <div className="py-20 text-center">
            <div className="mb-6 inline-flex h-24 w-24 items-center justify-center rounded-full bg-[var(--burgundy)]/10 text-[var(--burgundy)]">
              <ShoppingCart className="h-10 w-10" />
            </div>
            <h2 className="font-playfair mb-4 text-2xl sm:text-3xl font-medium italic tracking-wide text-[var(--charcoal)]">Your Cart is Empty</h2>
            <p className="font-sans mx-auto mb-8 max-w-md text-gray-500 font-medium text-sm sm:text-base leading-relaxed">Looks like you haven&apos;t added any gorgeous sarees to your cart yet.</p>
            <Link href="/shop" className="inline-block bg-[var(--burgundy)] px-8 py-3.5 font-montserrat text-xs font-bold uppercase tracking-[0.2em] text-white shadow-md transition duration-300 hover:bg-[var(--burgundy-dark)]">
              Continue Shopping
            </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
      <FloatingActions />
    </>
  )
}

const CartPage = dynamic(() => Promise.resolve(CartPageContent), {
  ssr: false,
  loading: () => (
    <>
      <Header />
      <main className="relative z-10 flex-grow overflow-hidden bg-[var(--ivory)]">
        <div className="flex justify-center py-40">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--burgundy)] border-t-transparent" />
        </div>
      </main>
      <Footer />
      <FloatingActions />
    </>
  ),
})

export default CartPage
