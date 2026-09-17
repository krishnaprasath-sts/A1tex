'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Check, ChevronDown, Heart, Loader2, Search, ShoppingBag, SlidersHorizontal, X } from 'lucide-react'
import { fetchProducts } from '@/lib/api/storefront'
import { resolveImageUrl } from '@/lib/api/client'
import { getDiscount } from '@/lib/api/mappers'
import type { StorefrontProduct } from '@/lib/api/types'
import { useCart } from '@/components/cart/CartContext'
import { useWishlist } from '@/components/wishlist/WishlistContext'

/* ── Filter options ─────────────────────── */
type SortMode = 'Featured' | 'Price low to high' | 'Price high to low' | 'Newest'
type PriceRange = 'All' | 'Under ₹2,000' | '₹2,000 – ₹5,000' | '₹5,000+'

const sortModes: SortMode[] = ['Featured', 'Price low to high', 'Price high to low', 'Newest']
const priceRanges: PriceRange[] = ['All', 'Under ₹2,000', '₹2,000 – ₹5,000', '₹5,000+']

const defaultDescription =
  'Explore handloom sarees, festive edits, daily drapes, and thoughtful accents selected for texture, comfort, and quiet elegance.'

/* ── Custom Sort Dropdown ───────────────── */
function CustomSortDropdown({
  value,
  onChange,
}: {
  value: SortMode
  onChange: (mode: SortMode) => void
}) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside, { passive: true })
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [open])

  return (
    <div ref={dropdownRef} className="relative inline-block w-full sm:w-auto text-left">
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="flex h-11 w-full sm:w-52 items-center justify-between gap-2 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-stone-800 shadow-2xs transition hover:border-[#8B1A1A] focus:border-[#8B1A1A] focus:ring-1 focus:ring-[#8B1A1A] cursor-pointer"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <div className="flex items-center gap-1.5 truncate">
          <span className="text-[11px] uppercase tracking-wider text-stone-600">Sort:</span>
          <span className="font-bold text-stone-900 truncate">{value}</span>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-stone-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-full sm:w-56 rounded-xl border border-stone-200 bg-white p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          <div className="space-y-0.5" role="listbox">
            {sortModes.map(mode => {
              const isSelected = mode === value
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    onChange(mode)
                    setOpen(false)
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#FDF6F0] text-[#8B1A1A] font-bold'
                      : 'text-stone-700 hover:bg-stone-50 hover:text-stone-900 active:bg-stone-100'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span>{mode}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-[#8B1A1A]" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Price helpers ──────────────────────── */
function inPriceRange(price: number, range: PriceRange) {
  if (range === 'Under ₹2,000') return price < 2000
  if (range.includes('2,000') && range.includes('5,000')) return price >= 2000 && price <= 5000
  if (range === '₹5,000+') return price > 5000
  return true
}

function formatShopPrice(value: number) {
  return `₹${value.toLocaleString('en-IN')}`
}

/* ── Product Card ──────────────────────── */
function ShopCatalogCard({
  product,
  wished,
  onToggleWishlist,
  onAddToCart,
}: {
  product: StorefrontProduct
  wished: boolean
  onToggleWishlist: () => void
  onAddToCart: () => void
}) {
  const slug = product.slug || product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const href = `/products/${slug}`
  const disc = getDiscount(product.price, product.originalPrice)
  const badge = product.isNew ? 'New' : disc ? `${disc}% OFF` : null
  const isOutOfStock = !!(product.stockQty != null && product.stockQty <= 0)
  const displayImage = resolveImageUrl(product.imageUrl || product.image)

  return (
    <article className="group relative flex min-w-0 flex-col border border-[var(--burgundy)] bg-[#fffaf0] shadow-[0_12px_30px_rgba(82,0,1,0.07)] transition-shadow duration-300 hover:shadow-[0_20px_42px_rgba(82,0,1,0.13)]">
      <div className="pointer-events-none absolute inset-[5px] z-10 border border-[rgba(201,168,76,0.48)]" />

      <div className="relative aspect-[3/4] overflow-hidden bg-[var(--ivory-dark)]">
        <Link href={href} prefetch={true} className="block h-full w-full no-underline">
          <img
            src={displayImage}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        </Link>

        {badge && (
          <span className="absolute left-3 top-3 z-20 border border-[rgba(255,250,240,0.65)] bg-[var(--burgundy)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--ivory)]">
            {badge}
          </span>
        )}

        {isOutOfStock && (
          <div className="absolute left-3 z-30 flex items-center rounded bg-gray-500 px-1.5 py-0.5"
            style={{ top: badge ? '2.75rem' : '0.75rem' }}
          >
            <span className="text-[10px] font-semibold text-white">Notify</span>
          </div>
        )}

        <button
          type="button"
          onClick={onToggleWishlist}
          className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center border border-[var(--burgundy)] bg-[var(--ivory)] text-[var(--burgundy)] transition-colors hover:bg-[var(--burgundy)] hover:text-[var(--ivory)]"
          aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart className={`h-4 w-4 ${wished ? 'fill-current' : ''}`} />
        </button>
      </div>

      <div className="relative flex flex-1 flex-col border-t border-[rgba(201,168,76,0.75)] px-2.5 py-3 md:px-4 md:py-4">
        <div className="mb-1.5 md:mb-2 flex items-center justify-between gap-1 md:gap-3">
          <p className="min-w-0 truncate text-[8px] md:text-[10px] font-bold uppercase tracking-[0.15em] md:tracking-[0.22em] text-[var(--gold)]">
            {product.type || product.category}
          </p>
          <p className="shrink-0 text-[8px] md:text-[10px] font-semibold uppercase tracking-[0.1em] md:tracking-[0.16em] text-[var(--burgundy)]">
            {product.category}
          </p>
        </div>

        <h3 className="truncate text-[13px] md:text-[17px] font-semibold leading-tight text-[var(--burgundy-dark)]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          {product.name}
        </h3>

        <div className="mt-3 md:mt-4 flex flex-col md:flex-row md:items-end justify-between gap-2 md:gap-3">
          <div className="min-w-0">
            <p className="text-[13px] md:text-[16px] font-bold text-[var(--burgundy)] leading-none">{formatShopPrice(product.price)}</p>
            {product.originalPrice ? (
              <p className="text-[9px] md:text-[11px] text-[var(--charcoal)]/60 line-through mt-0.5">{formatShopPrice(product.originalPrice)}</p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => !isOutOfStock && onAddToCart()}
            disabled={isOutOfStock}
            className={`hidden md:inline-flex h-9 w-9 shrink-0 items-center justify-center border transition-colors ${
              isOutOfStock
                ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                : 'border-[var(--burgundy)] text-[var(--burgundy)] hover:bg-[var(--burgundy)] hover:text-[var(--ivory)]'
            }`}
            aria-label={`Add ${product.name} to cart`}
          >
            <ShoppingBag className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 md:mt-4 grid grid-cols-[1fr_32px] md:grid-cols-1 gap-1.5 md:gap-0">
          <Link
            href={href}
            prefetch={true}
            className="inline-flex items-center justify-center border border-[var(--burgundy)] bg-[var(--burgundy)] px-2 py-2 md:px-3 md:py-2.5 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.12em] md:tracking-[0.18em] text-[var(--ivory)] no-underline transition-colors hover:bg-transparent hover:text-[var(--burgundy)] text-center leading-tight"
          >
            View Details
          </Link>
          <button
            type="button"
            onClick={() => !isOutOfStock && onAddToCart()}
            disabled={isOutOfStock}
            className={`md:hidden inline-flex h-full w-full items-center justify-center border transition-colors ${
              isOutOfStock
                ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                : 'border-[var(--burgundy)] text-[var(--burgundy)] hover:bg-[var(--burgundy)] hover:text-[var(--ivory)]'
            }`}
            aria-label={`Add ${product.name} to cart`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  )
}

/* ── Main ShopPage ────────────────────── */
export type ShopPageProps = {
  title?: string
  eyebrow?: string
  description?: string
  initialCategory?: string
  initialCategoryId?: number
  initialSection?: string
  initialGender?: string
  initialQuery?: string
  saleOnly?: boolean
  backgroundImage?: string
}

export default function ShopPage({
  title = 'A1 TEX Shop',
  eyebrow = 'Curated Collection',
  description = defaultDescription,
  initialCategory = 'All',
  initialCategoryId,
  initialSection,
  initialGender,
  initialQuery = '',
  saleOnly = false,
  backgroundImage,
}: ShopPageProps) {
  const [query, setQuery] = useState(initialQuery)
  const [priceRange, setPriceRange] = useState<PriceRange>('All')
  const [sizeFilter, setSizeFilter] = useState('All')
  const [sortMode, setSortMode] = useState<SortMode>('Featured')
  const { wishlistIds, toggleWishlist } = useWishlist()
  const [toast, setToast] = useState('')
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  // Filter states
  const [filterCategory, setFilterCategory] = useState(initialCategory)
  const [filterCategoryId, setFilterCategoryId] = useState<number | undefined>(initialCategoryId)
  const [filterCategoryEnabled, setFilterCategoryEnabled] = useState(!!initialCategoryId || (initialCategory !== 'All' && initialCategory !== ''))
  const [filterSection, setFilterSection] = useState<string | undefined>(initialSection)
  const [filterGender, setFilterGender] = useState<string | undefined>(initialGender)
  const [isSaleOnly, setIsSaleOnly] = useState(saleOnly)
  const [displayTitle, setDisplayTitle] = useState(title)

  // API state
  const [products, setProducts] = useState<StorefrontProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState(false)

  const sizeOptions = useMemo(() => {
    const sizes = new Set<string>()
    products.forEach(p => {
      ;(p.variants || []).forEach(v => {
        if (v.size && !['free size', 'freesize', 'one size', 'onesize'].includes(v.size.trim().toLowerCase())) {
          sizes.add(v.size)
        }
      })
    })
    const sorted = Array.from(sizes).sort((a, b) => {
      const order = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
      const aIdx = order.indexOf(a)
      const bIdx = order.indexOf(b)
      return (aIdx !== -1 ? aIdx : 99) - (bIdx !== -1 ? bIdx : 99)
    })
    return ['All', ...sorted]
  }, [products])

  // Fetch products from backend using the CURRENT filter state
  const loadProducts = useCallback(async (overrideOpts?: {
    section?: string
    gender?: string
    categoryId?: number
    category?: string
    search?: string
  }) => {
    setLoading(true)
    setApiError(false)
    try {
      const activeSection = overrideOpts ? overrideOpts.section : filterSection
      const activeGender = overrideOpts ? overrideOpts.gender : filterGender
      const activeCategoryId = overrideOpts
        ? overrideOpts.categoryId
        : (filterCategoryEnabled && !filterSection && !filterGender ? filterCategoryId : undefined)
      const activeCategory = overrideOpts
        ? overrideOpts.category
        : (filterCategoryEnabled && !filterSection && !filterGender && !filterCategoryId && filterCategory !== 'All' ? filterCategory : undefined)
      const activeSearch = overrideOpts ? overrideOpts.search : (query.trim() || undefined)

      const data = await fetchProducts({
        section: activeSection,
        gender: activeGender,
        categoryId: activeCategoryId,
        category: activeCategory,
        search: activeSearch,
      })
      setProducts(data)
    } catch {
      setApiError(true)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [filterCategory, filterCategoryId, filterCategoryEnabled, filterSection, filterGender, query])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  // Reset filters when props change (page navigation)
  useEffect(() => {
    setQuery(initialQuery)
    setPriceRange('All')
    setSortMode('Featured')
    setSizeFilter('All')
    setFilterCategory(initialCategory)
    setFilterCategoryId(initialCategoryId)
    setFilterCategoryEnabled(!!initialCategoryId || (initialCategory !== 'All' && initialCategory !== ''))
    setFilterSection(initialSection)
    setFilterGender(initialGender)
    setIsSaleOnly(saleOnly)
    setDisplayTitle(title)
  }, [initialCategory, initialCategoryId, initialSection, initialGender, initialQuery, saleOnly, title])

  // Client-side filtering (search + price range + sale + size)
  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    const filtered = products.filter(product => {
      // Search filter (client-side for instant results)
      const matchesQuery = !normalizedQuery ||
        product.name.toLowerCase().includes(normalizedQuery) ||
        (product.category || '').toLowerCase().includes(normalizedQuery) ||
        (product.type || '').toLowerCase().includes(normalizedQuery) ||
        (product.code || '').toLowerCase().includes(normalizedQuery) ||
        (product.variants || []).some(v => (v.sku || '').toLowerCase().includes(normalizedQuery))

      // Price range filter
      const matchesPrice = inPriceRange(product.price, priceRange)

      // Sale filter
      const matchesSale = !isSaleOnly || Boolean(product.originalPrice)

      // Size filter
      const matchesSize = sizeFilter === 'All' || (product.variants || []).some(v => v.size === sizeFilter)

      return matchesQuery && matchesPrice && matchesSale && matchesSize
    })

    return [...filtered].sort((a, b) => {
      if (sortMode === 'Price low to high') return a.price - b.price
      if (sortMode === 'Price high to low') return b.price - a.price
      if (sortMode === 'Newest') return Number(b.isNew) - Number(a.isNew)
      return 0 // Featured = original order
    })
  }, [products, query, priceRange, sortMode, isSaleOnly, sizeFilter])

  const hasActiveFilters = Boolean(
    (filterCategoryEnabled && filterCategory !== 'All') ||
    filterSection ||
    filterGender ||
    isSaleOnly ||
    query ||
    priceRange !== 'All' ||
    sizeFilter !== 'All'
  )

  const activeFilterChips = [
    filterSection
      ? {
          label: `Collection: ${filterSection.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`,
          onRemove: () => {
            setFilterSection(undefined)
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href)
              url.searchParams.delete('section')
              window.history.replaceState({}, '', url.toString())
            }
          },
        }
      : null,
    filterGender
      ? {
          label: `Gender: ${filterGender.charAt(0).toUpperCase() + filterGender.slice(1)}`,
          onRemove: () => {
            setFilterGender(undefined)
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href)
              url.searchParams.delete('gender')
              window.history.replaceState({}, '', url.toString())
            }
          },
        }
      : null,
    filterCategoryEnabled && filterCategory !== 'All'
      ? {
          label: `Category: ${filterCategory}`,
          onRemove: () => {
            setFilterCategoryEnabled(false)
            setFilterCategory('All')
            setFilterCategoryId(undefined)
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href)
              url.searchParams.delete('category')
              url.searchParams.delete('categoryId')
              window.history.replaceState({}, '', url.toString())
            }
          },
        }
      : null,
    isSaleOnly
      ? {
          label: 'On Sale',
          onRemove: () => setIsSaleOnly(false),
        }
      : null,
    query
      ? {
          label: `Search: "${query}"`,
          onRemove: () => {
            setQuery('')
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href)
              url.searchParams.delete('search')
              window.history.replaceState({}, '', url.toString())
            }
          },
        }
      : null,
    priceRange !== 'All' ? { label: `Price: ${priceRange}`, onRemove: () => setPriceRange('All') } : null,
    sizeFilter !== 'All' ? { label: `Size: ${sizeFilter}`, onRemove: () => setSizeFilter('All') } : null,
  ].filter((chip): chip is { label: string; onRemove: () => void } => Boolean(chip))

  function clearFilters() {
    setQuery('')
    setPriceRange('All')
    setSortMode('Featured')
    setSizeFilter('All')
    setFilterCategoryEnabled(false)
    setFilterCategory('All')
    setFilterCategoryId(undefined)
    setFilterSection(undefined)
    setFilterGender(undefined)
    setIsSaleOnly(false)
    setDisplayTitle('All Sarees & Handlooms')

    // Clean browser URL query string without reloading
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', window.location.pathname)
    }

    // Immediately fetch all products without filters
    loadProducts({
      section: undefined,
      gender: undefined,
      categoryId: undefined,
      category: undefined,
      search: undefined,
    })
  }

  const cart = useCart()

  function addToCart(product: StorefrontProduct, colorName?: string) {
    const slug = product.slug || product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const selectedVariant = colorName
      ? product.variants?.find(v => v.colorName === colorName)
      : null
    const fallbackVariant = product.hasVariants && product.variants?.length
      ? product.variants.find(v => v.isDefault) || product.variants[0]
      : null
    const variant = selectedVariant || (product.hasVariants && product.variants?.length
      ? product.variants.find(v => (v.stockQty ?? 0) > 0) || fallbackVariant
      : null)
    cart.addItem({
      id: product.id,
      name: product.name,
      slug,
      price: variant ? variant.price : product.price,
      originalPrice: variant ? (variant.originalPrice ?? product.originalPrice) : product.originalPrice,
      image: resolveImageUrl(
        variant?.imageUrl || variant?.images?.[0]?.imageUrl || product.imageUrl || product.image
      ) || '',
      color: variant?.colorName || product.color,
      size: variant?.size,
      variantId: variant?.id,
      variantLabel: variant?.label,
      stock: variant?.stockQty ?? product.stockQty,
    })
    cart.setDrawerOpen(true)
    setToast(`${product.name} added to cart`)
    window.setTimeout(() => setToast(''), 2200)
  }

  const filterPanel = (
    <div className="space-y-7">
      <div className="flex items-center justify-between gap-4 border-b border-[rgba(201,168,76,0.55)] pb-4">
        <h2 className="font-playfair text-xl sm:text-2xl font-medium italic tracking-wide text-[var(--burgundy-dark)]">
          Refine
        </h2>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            className="border border-[var(--burgundy)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--burgundy)] transition-colors hover:bg-[var(--burgundy)] hover:text-[var(--ivory)]"
          >
            Clear
          </button>
        ) : null}
      </div>

      <FilterGroup title="Price" options={priceRanges} value={priceRange} onChange={value => setPriceRange(value as PriceRange)} />
      {sizeOptions.length > 1 && (
        <FilterGroup 
          title="Size" 
          options={sizeOptions} 
          value={sizeFilter} 
          onChange={value => setSizeFilter(value)} 
        />
      )}
    </div>
  )

  return (
    <main className="relative bg-[var(--ivory)] text-[var(--charcoal)] min-h-screen">
      {/* Full Page Premium Abstract Background */}
      <div
        className="pointer-events-none absolute inset-0 z-0 mix-blend-multiply opacity-[0.15]"
        style={{
          backgroundImage: "url('/shop_bg.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'top center',
          backgroundAttachment: 'fixed',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%)'
        }}
      />
      {backgroundImage && (
        <div
          className="pointer-events-none absolute inset-0 z-0 bg-repeat opacity-[0.02]"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: '350px',
          }}
        />
      )}

      <section className="relative overflow-hidden border-b border-[rgba(201,168,76,0.45)] bg-white py-6 md:py-12 lg:py-14">
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-100"
          style={{
            backgroundImage: "url('/shop_heading_bg.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            maskImage: 'linear-gradient(to right, transparent 0%, transparent 35%, black 65%, black 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, transparent 35%, black 65%, black 100%)'
          }}
        />
        <div className="pointer-events-none absolute inset-0 z-0 bg-[url('/generated-home/sg-motif-repeat.svg')] bg-[length:44px] opacity-[0.03]" />

        <div className="relative z-10 mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="font-montserrat mb-3 text-[11px] md:text-xs font-bold uppercase tracking-[0.25em] text-[var(--gold)]">{eyebrow}</p>
            <h1 className="font-playfair text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-medium tracking-wide leading-tight text-[var(--burgundy-dark)]">
              {displayTitle || title}
            </h1>
            <p className="font-sans mt-5 text-sm sm:text-base font-medium leading-relaxed text-[var(--burgundy)]/90">{description}</p>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-[1500px] px-4 py-6 md:py-8 sm:px-6 lg:px-8">
        {/* Catalog Control Bar */}
        <div className="mb-6 rounded-2xl border border-stone-200/90 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            
            {/* Left: Product Count Pill + Mobile Filter Trigger */}
            <div className="flex items-center justify-between sm:justify-start gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FDF6F0] px-3 py-1 text-xs font-bold text-[#8B1A1A] border border-[#8B1A1A]/15">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8B1A1A]" />
                {loading ? 'Searching catalog...' : `${filteredProducts.length} Handcrafted Sarees`}
              </span>
              
              {/* Mobile Filter Button */}
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(true)}
                className="inline-flex lg:hidden items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-bold text-stone-800 shadow-2xs hover:border-[#8B1A1A] cursor-pointer"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-[#8B1A1A]" />
                <span>Filters {activeFilterChips.length > 0 ? `(${activeFilterChips.length})` : ''}</span>
              </button>
            </div>

            {/* Right: Search Input + Custom Sort Dropdown */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <label className="relative flex-1 sm:w-64 md:w-72">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Search sarees, SKU, fabric, code..."
                  className="h-11 w-full rounded-xl border border-stone-300 bg-stone-50/50 pl-10 pr-8 text-xs sm:text-sm text-stone-900 outline-none transition focus:border-[#8B1A1A] focus:bg-white focus:ring-1 focus:ring-[#8B1A1A]"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </label>

              <CustomSortDropdown value={sortMode} onChange={setSortMode} />
            </div>
          </div>

          {/* Active Filter Chips */}
          {activeFilterChips.length > 0 && (
            <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600 mr-1">Active:</span>
              {activeFilterChips.map(chip => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={chip.onRemove}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#8B1A1A]/20 bg-[#FDF6F0] px-2.5 py-1 text-xs font-semibold text-[#8B1A1A] transition hover:bg-[#8B1A1A] hover:text-white cursor-pointer"
                >
                  <span>{chip.label}</span>
                  <X className="h-3 w-3" />
                </button>
              ))}
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-bold text-stone-600 hover:text-[#8B1A1A] underline ml-2 cursor-pointer"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="hidden self-start border border-[var(--burgundy)] bg-[#fffaf0] p-4 shadow-[0_14px_34px_rgba(82,0,1,0.06)] lg:sticky lg:top-36 lg:block">
            {filterPanel}
          </aside>

          <div className="min-w-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-4 py-24">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--burgundy)]" />
                <p className="text-sm font-semibold text-[var(--muted)]">Loading products…</p>
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map(product => {
                  const wished = wishlistIds.includes(product.id)

                  return (
                    <ShopCatalogCard
                      key={product.id}
                      product={product}
                      wished={wished}
                      onToggleWishlist={() => toggleWishlist(product.id, product.name)}
                      onAddToCart={() => addToCart(product)}
                    />
                  )
                })}
              </div>
            ) : (
              <div className="border border-dashed border-[var(--gold)] bg-[#fffaf0] p-10 text-center">
                <h2 className="font-playfair text-2xl sm:text-3xl font-medium italic tracking-wide text-[var(--burgundy)]">
                  No products found
                </h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">
                  {apiError
                    ? 'Unable to load products. Please try again later.'
                    : 'Try clearing filters or searching for another weave, fabric, or occasion.'}
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-6 border border-[var(--burgundy)] bg-[var(--burgundy)] px-6 py-3 text-sm font-semibold text-[var(--ivory)] transition hover:bg-transparent hover:text-[var(--burgundy)]"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {mobileFiltersOpen ? (
        <div className="fixed inset-0 z-[130] bg-black/45 lg:hidden" role="dialog" aria-modal="true">
          <div className="ml-auto flex h-full w-full max-w-sm flex-col border-l border-[var(--burgundy)] bg-[#fffaf0]">
            <div className="flex items-center justify-between border-b border-[rgba(201,168,76,0.55)] p-4">
              <h2 className="font-playfair text-lg sm:text-xl font-medium italic tracking-wide text-[var(--burgundy-dark)]">
                Refine catalog
              </h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="flex h-9 w-9 items-center justify-center border border-[var(--burgundy)] text-[var(--burgundy)]"
                aria-label="Close filters"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{filterPanel}</div>
            <div className="border-t border-[rgba(201,168,76,0.55)] p-4">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="w-full border border-[var(--burgundy)] bg-[var(--burgundy)] py-3 text-sm font-semibold text-[var(--ivory)]"
              >
                Show {filteredProducts.length} products
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-5 left-1/2 z-[140] -translate-x-1/2 rounded-md bg-[var(--charcoal)] px-5 py-3 text-sm font-medium text-white shadow-xl">
          {toast}
        </div>
      ) : null}
    </main>
  )
}

function FilterGroup({
  title,
  options,
  value,
  onChange,
}: {
  title: string
  options: string[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <fieldset className="border-b border-[rgba(201,168,76,0.4)] pb-5 last:border-b-0 last:pb-0">
      <legend className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">{title}</legend>
      <div className="space-y-1.5">
        {options.map(option => (
          <label
            key={option}
            className={`flex cursor-pointer items-center justify-between border px-3 py-2 text-sm transition-colors ${
              value === option
                ? 'border-[var(--burgundy)] bg-[var(--burgundy)] text-[var(--ivory)]'
                : 'border-transparent text-[var(--charcoal)] hover:border-[rgba(82,0,1,0.28)] hover:bg-[var(--ivory)]'
            }`}
          >
            <span>{option}</span>
            <input
              type="radio"
              name={title}
              checked={value === option}
              onChange={() => onChange(option)}
              className="h-4 w-4 accent-[var(--gold)]"
            />
          </label>
        ))}
      </div>
    </fieldset>
  )
}
