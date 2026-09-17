'use client'

import { useState, useEffect, forwardRef, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, ArrowRight, Tag } from 'lucide-react'
import { searchStorefront } from '@/lib/api/storefront'
import { resolveImageUrl } from '@/lib/api/client'
import type { StorefrontProduct } from '@/lib/api/types'

const placeholders = [
  'Search by SKU code (e.g. A1-...)...',
  'Search by color - E.g. red color sarees...',
  'Search by Occasions - Marriage, bridal...',
  'Search Saree Types - Kanchipuram, Mysore...',
  'Search relevant product names...',
]

export type SearchBarVariant = 'default' | 'hero'

interface SearchBarProps {
  variant?: SearchBarVariant
  onFocusChange?: (focused: boolean) => void
}

const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(function SearchBar(
  { variant = 'default', onFocusChange },
  ref,
) {
  const router = useRouter()
  const [focused, setFocused] = useState(false)
  const [query, setQuery] = useState('')
  const [placeholderText, setPlaceholderText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [loopNum, setLoopNum] = useState(0)
  const [typingSpeed, setTypingSpeed] = useState(100)
  const [results, setResults] = useState<StorefrontProduct[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const isHero = variant === 'hero'

  /* ─── Animated placeholder ─── */
  useEffect(() => {
    const i = loopNum % placeholders.length
    const fullText = placeholders[i]

    if (!isDeleting && placeholderText === fullText) {
      const pause = setTimeout(() => setIsDeleting(true), 2000)
      return () => clearTimeout(pause)
    }

    if (isDeleting && placeholderText === '') {
      setIsDeleting(false)
      setLoopNum(l => l + 1)
      setTypingSpeed(400)
      return
    }

    const handleType = () => {
      if (isDeleting) {
        setPlaceholderText(fullText.substring(0, placeholderText.length - 1))
        setTypingSpeed(30)
      } else {
        setPlaceholderText(fullText.substring(0, placeholderText.length + 1))
        setTypingSpeed(70)
      }
    }

    const timer = setTimeout(handleType, typingSpeed)
    return () => clearTimeout(timer)
  }, [placeholderText, isDeleting, loopNum, typingSpeed])

  /* ─── Search autocomplete ─── */
  useEffect(() => {
    if (!focused) return

    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      return
    }

    let active = true
    setIsSearching(true)
    const timer = setTimeout(() => {
      searchStorefront(trimmed).then(data => {
        if (active) {
          setResults(data.products || [])
          setIsSearching(false)
        }
      }).catch(() => {
        if (active) setIsSearching(false)
      })
    }, 250)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [focused, query])

  /* ─── Focus change callback ─── */
  const handleFocus = useCallback(() => {
    setFocused(true)
    onFocusChange?.(true)
  }, [onFocusChange])

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      setFocused(false)
      onFocusChange?.(false)
    }, 200)
  }, [onFocusChange])

  function goToShop(value = query) {
    const nextQuery = value.trim()
    setFocused(false)
    setQuery('')
    router.push(nextQuery ? `/shop?search=${encodeURIComponent(nextQuery)}` : '/shop')
  }

  function goToProduct(slug: string) {
    setFocused(false)
    setQuery('')
    router.push(`/products/${encodeURIComponent(slug)}`)
  }

  const showDropdown = focused && query.trim().length > 0

  /* ─── Hero variant styles ─── */
  const containerClasses = isHero
    ? 'relative w-full max-w-2xl mx-auto'
    : 'relative w-full max-w-3xl'

  const inputWrapperClasses = isHero
    ? `flex w-full items-center rounded-full border-2 transition-all duration-300 ${
        focused
          ? 'border-[var(--gold)] ring-2 ring-[var(--gold)]/30 shadow-2xl bg-white'
          : 'border-white/30 bg-white/95 shadow-xl hover:border-[var(--gold)]/50 hover:bg-white'
      }`
    : `flex w-full items-center rounded-full border bg-white transition-all duration-300 ${
        focused
          ? 'border-[var(--gold)] ring-1 ring-[var(--gold)] shadow-md'
          : 'border-[var(--ivory-dark)] shadow-sm hover:border-[var(--gold)]'
      }`

  const inputClasses = isHero
    ? 'w-full bg-transparent py-3.5 md:py-4 text-[15px] md:text-[16px] text-[var(--charcoal)] placeholder-transparent outline-none'
    : 'w-full bg-transparent py-2.5 text-[15px] text-[var(--charcoal)] placeholder-transparent outline-none'

  const buttonClasses = isHero
    ? 'mr-2 flex h-[44px] w-[48px] md:h-[48px] md:w-[52px] shrink-0 items-center justify-center rounded-full bg-[var(--burgundy)] text-white transition-all hover:bg-[var(--burgundy-dark)] hover:scale-105 shadow-lg'
    : 'mr-1.5 flex h-[38px] w-[42px] shrink-0 items-center justify-center rounded-full bg-[var(--burgundy)] text-white transition-colors hover:bg-[var(--burgundy-dark)]'

  return (
    <div className={containerClasses} ref={containerRef}>
      {/* Search Input Container */}
      <div className={inputWrapperClasses}>
        <div className="relative flex flex-1 items-center py-1 pl-5 pr-2">
          {/* Custom Animated Placeholder */}
          {!query && (
            <div
              className={`pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 whitespace-nowrap font-medium text-[var(--muted)] ${
                isHero ? 'text-[14px] md:text-[15px]' : 'text-[14.5px]'
              }`}
            >
              {placeholderText}
              <span className="inline-block w-[2px] h-[16px] bg-[var(--muted)] ml-[1px] align-middle animate-pulse" />
            </div>
          )}

          <input
            ref={ref}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                goToShop()
              }
              if (e.key === 'Escape') {
                setFocused(false)
                ;(e.target as HTMLInputElement).blur()
              }
            }}
            className={inputClasses}
            placeholder="Search"
            aria-label="Search products"
          />

          {/* Clear button */}
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setResults([]) }}
              className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--ivory-dark)] hover:text-[var(--charcoal)]"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Search Button */}
        <button
          type="button"
          onClick={() => goToShop()}
          className={buttonClasses}
          aria-label="Search"
        >
          <Search className={isHero ? 'h-5 w-5' : 'h-4 w-4'} strokeWidth={2.5} />
        </button>
      </div>

      {/* Dropdown Results */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className={`absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border bg-white shadow-2xl ${
            isHero ? 'border-[var(--gold)]/20' : 'border-[var(--ivory-dark)]'
          }`}
          style={{
            animation: 'searchDropdownIn 0.2s ease-out forwards',
            maxHeight: '70vh',
            overflowY: 'auto',
          }}
        >
          {/* Loading state */}
          {isSearching && (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--ivory-dark)] border-t-[var(--burgundy)]" />
              <span className="ml-3 text-sm text-[var(--muted)]">Searching...</span>
            </div>
          )}

          {/* No results */}
          {!isSearching && results.length === 0 && query.trim() && (
            <div className="py-10 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--ivory)]">
                <Search className="h-6 w-6 text-[var(--muted)]" />
              </div>
              <p className="text-sm font-medium text-[var(--charcoal)]">
                No products found for &quot;{query}&quot;
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Try a different search term
              </p>
            </div>
          )}

          {/* Product results */}
          {!isSearching && results.length > 0 && (
            <div className="p-2">
              {/* Results header */}
              <div className="flex items-center justify-between px-3 pb-2 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-[2px] text-[var(--muted)]">
                  Products ({results.length})
                </span>
                <button
                  type="button"
                  onMouseDown={e => {
                    e.preventDefault()
                    goToShop()
                  }}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[var(--burgundy)] transition-colors hover:text-[var(--burgundy-dark)]"
                >
                  View All <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              {/* Product grid */}
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {results.slice(0, 6).map((p) => {
                  const imgSrc = resolveImageUrl(p.imageUrl || p.image || p.images?.[0]?.imageUrl || p.variants?.[0]?.imageUrl) || '/categories/kids_cat.png'
                  const productKey = `search-${p.id}-${p.slug || p.code || p.name}`
                  return (
                    <div
                      key={productKey}
                      onMouseDown={e => {
                        e.preventDefault()
                        goToProduct(p.slug || p.name)
                      }}
                      className="group cursor-pointer overflow-hidden rounded-xl border border-transparent bg-[var(--ivory)] transition-all duration-200 hover:border-[var(--gold)]/40 hover:shadow-md"
                    >
                      {/* Product Image */}
                      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[var(--ivory-dark)]">
                        <img
                          src={imgSrc}
                          alt={p.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                          loading="lazy"
                        />
                        {/* Overlay on hover */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                        {/* Quick view badge */}
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 px-3 py-1 text-[9px] font-bold uppercase tracking-[1px] text-[var(--burgundy)] opacity-0 shadow-lg backdrop-blur-sm transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 translate-y-2">
                          Quick View
                        </div>
                        {/* Discount badge */}
                        {p.originalPrice && p.originalPrice > p.price && (
                          <div className="absolute left-1.5 top-1.5 flex items-center gap-0.5 rounded-full bg-[var(--burgundy)] px-2 py-0.5 text-[9px] font-bold text-white shadow-sm">
                            <Tag className="h-2.5 w-2.5" />
                            {Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)}% OFF
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="p-2.5">
                        <p className="truncate text-[11px] md:text-[12px] font-semibold text-[var(--charcoal)] leading-tight">
                          {p.name}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5 overflow-hidden flex-wrap">
                          {(p.code || p.variants?.[0]?.sku) && (
                            <span className="font-mono text-[9px] font-semibold text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">
                              SKU: {p.code || p.variants?.[0]?.sku}
                            </span>
                          )}
                          {p.type && (
                            <span className="truncate text-[9px] md:text-[10px] text-[var(--muted)]">
                              {p.type}
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="text-[12px] md:text-[13px] font-bold text-[var(--burgundy)]">
                            ₹{p.price.toLocaleString('en-IN')}
                          </span>
                          {p.originalPrice && p.originalPrice > p.price && (
                            <span className="text-[10px] text-[var(--muted)] line-through">
                              ₹{p.originalPrice.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* View all results link at bottom */}
              {results.length > 6 && (
                <div className="mt-2 border-t border-[var(--ivory-dark)] pt-3 pb-1 text-center">
                  <button
                    type="button"
                    onMouseDown={e => {
                      e.preventDefault()
                      goToShop()
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-[var(--ivory)] px-5 py-2 text-[11px] font-bold uppercase tracking-[1.5px] text-[var(--burgundy)] transition-all hover:bg-[var(--burgundy)] hover:text-white hover:shadow-md"
                  >
                    View All {results.length} Results
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Animation keyframes */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes searchDropdownIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  )
})

export default SearchBar
