'use client'

import Link from 'next/link'
import { Heart, ShoppingBag } from 'lucide-react'
import { useWishlist } from '@/components/wishlist/WishlistContext'

export type ProductColor = {
  name: string
  hex: string
  image?: string
}

export type ProductCardProduct = {
  id?: number | string
  name: string
  category: string
  fabric: string
  occasion: string
  image: string
  price: number
  oldPrice?: number | null
  badge?: string
  rating?: number
  reviews?: number
  slug?: string
  href?: string
  colors?: ProductColor[]
  variantId?: number
  variantLabel?: string
  color?: string
  size?: string
  stock?: number
  enableBackInStockNotify?: boolean
}

type ProductCardProps = {
  product: ProductCardProduct
  wished?: boolean
  onToggleWishlist?: () => void
  onAddToCart?: (product: ProductCardProduct) => void
}

function formatPrice(value: number) {
  return `\u20B9 ${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function ProductCard({ product, wished, onToggleWishlist, onAddToCart }: ProductCardProps) {
  const { toggleWishlist: ctxToggleWishlist, isWished: ctxIsWished } = useWishlist()

  const isWished = wished ?? ctxIsWished(Number(product.id), product.variantId ?? null)
  const discount = product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : null
  const href = product.href ?? (product.slug ? `/products/${product.slug}` : `/products/${product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`)
  const isOutOfStock = product.stock != null && product.stock <= 0

  function toggleWishlist() {
    if (onToggleWishlist) { onToggleWishlist(); return }
    if (product.id != null) {
      ctxToggleWishlist(Number(product.id), product.name, product.variantId ?? null, product.color, product.size)
    }
  }

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.12)] hover:border-sky-200">

      {/* ── Image area ── */}
      <div className="relative aspect-[4/5] w-full shrink-0 overflow-hidden bg-[#FAF7F2]">
        <Link href={href} prefetch={true} className="absolute inset-0 z-10 block">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06] pointer-events-none"
          />
        </Link>

        {/* Wishlist button */}
        <button
          type="button"
          onClick={toggleWishlist}
          className={`absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-all duration-200 shadow-md ${
            isWished 
              ? 'bg-rose-50/95 text-rose-500 scale-105 border border-rose-200' 
              : 'bg-white/90 text-[var(--charcoal)] hover:bg-white hover:text-rose-500 hover:scale-110'
          }`}
          aria-label={isWished ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart className={`h-4 w-4 transition-all duration-200 ${isWished ? 'fill-rose-500 stroke-rose-500 scale-110' : 'stroke-current'}`} />
        </button>

        {/* Stock badge */}
        {isOutOfStock && (
          <Link
            href={href}
            className="absolute left-3 top-3 z-20 flex items-center rounded-full bg-stone-800/80 backdrop-blur-md px-2 py-0.5 text-stone-200 border border-stone-600/30 hover:bg-stone-900"
          >
            <span className="text-[9px] font-bold uppercase tracking-wider">Out of Stock</span>
          </Link>
        )}
      </div>

      {/* ── Info area ── */}
      <div className="flex flex-1 flex-col p-3.5 text-left">

        {/* Category pill + Badge */}
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-hidden flex-wrap">
            {product.badge ? (
              <span className="shrink-0 rounded-full bg-gradient-to-r from-[var(--burgundy)] to-[var(--burgundy-light)] px-2 py-0.5 text-[8px] md:text-[9px] font-bold uppercase tracking-[0.14em] text-white shadow-xs">
                {product.badge}
              </span>
            ) : null}
            <span className="min-w-0 truncate rounded-full bg-amber-50 border border-amber-200/60 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-amber-800">
              {product.category}
            </span>
          </div>
        </div>

        <h3 className="min-w-0 line-clamp-2 text-sm font-semibold leading-snug text-[var(--charcoal)] group-hover:text-[var(--burgundy)] transition-colors break-words" title={product.name}>
          {product.name}
        </h3>
        {(() => {
          const details = [product.fabric, product.occasion]
            .filter(Boolean)
            .filter(v => v !== product.category && v !== product.name)
            .filter((v, i, a) => a.indexOf(v) === i)
          return details.length > 0 ? (
            <p className="mt-1 truncate text-[11px] font-medium text-[var(--muted)]">
              {details.join(' • ')}
            </p>
          ) : null
        })()}

        {/* Selected Variant Badge (Size only if available for stitched garments) */}
        {(() => {
          const isFreeSize = product.size && ['free size', 'freesize', 'one size', 'onesize'].includes(product.size.trim().toLowerCase())
          const isSaree = (product.name || '').toLowerCase().includes('saree') || (product.category || '').toLowerCase().includes('saree')
          const showSize = product.size && !isFreeSize && !isSaree
          const parts = [
            showSize ? `Size: ${product.size}` : '',
            product.variantLabel && !product.size && !product.variantLabel.toLowerCase().includes('free size') ? product.variantLabel : ''
          ].filter(Boolean)
          
          if (parts.length === 0) return null
          return (
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              <span className="rounded-md border border-[#E2E8F0] bg-[var(--ivory)] px-2 py-0.5 text-[9px] font-semibold text-[var(--charcoal)]">
                {parts.join(' | ')}
              </span>
            </div>
          )
        })()}

        {/* Price row */}
        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-base font-extrabold text-[var(--charcoal)] tracking-tight">{formatPrice(product.price)}</span>
          {product.oldPrice ? (
            <span className="text-xs font-medium text-[var(--muted)] line-through">{formatPrice(product.oldPrice)}</span>
          ) : null}
          {discount ? (
            <span className="rounded-md bg-gradient-to-r from-rose-600 to-amber-600 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white shadow-xs">
              {discount}% OFF
            </span>
          ) : null}
        </div>

        {/* Actions - Pinned to bottom using mt-auto */}
        <div className="mt-auto pt-3.5 w-full">
          {isOutOfStock ? (
            <Link
              href={href}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 text-xs font-bold uppercase tracking-wider text-stone-500 transition hover:bg-stone-100"
              aria-label={`Notify me when ${product.name} is back in stock`}
            >
              Notify When Available
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => onAddToCart?.(product)}
              className="group/btn flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--burgundy)] px-3 text-xs font-bold uppercase tracking-widest text-white transition-all duration-200 hover:bg-[var(--burgundy-dark)] hover:shadow-md active:scale-[0.98] cursor-pointer"
              aria-label={`Add ${product.name} to cart`}
            >
              <ShoppingBag className="h-4 w-4 transition-transform duration-200 group-hover/btn:scale-110" />
              <span>Add to Bag</span>
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

