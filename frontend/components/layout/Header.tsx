'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Search,
  ShoppingBag,
  X,
  Heart,
  Menu,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Home,
  User,
  Store,
} from 'lucide-react'
import MobileNavDrawer from '@/components/layout/MobileNavDrawer'
import SearchBar from '@/components/ui/SearchBar'
import LoginDropdown from '@/components/ui/LoginDropdown'
import { fetchNavigation } from '@/lib/api/storefront'
import { resolveImageUrl } from '@/lib/api/client'
import type { MainCategory } from '@/lib/megaMenuData'
import { useCart } from '@/components/cart/CartContext'
import { useWishlist } from '@/components/wishlist/WishlistContext'

const LOGO_SRC = '/a1-tex-logo-transparent.png'
const LOGO_ALT = "A1 TEX - India's No.1 online saree shopping"

export default function Header() {
  const pathname = usePathname()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [menuData, setMenuData] = useState<MainCategory[]>([])
  const { totalItems } = useCart()
  const { totalItems: wishlistTotal } = useWishlist()
  const mobileSearchInputRef = useRef<HTMLInputElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout>>()
  const navScrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // Scroll visibility check
  const checkScroll = useCallback(() => {
    const el = navScrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }, [])

  const scrollNav = useCallback((dir: 'left' | 'right') => {
    navScrollRef.current?.scrollBy({ left: dir === 'left' ? -220 : 220, behavior: 'smooth' })
  }, [])

  // Fetch navigation with instant cache
  useEffect(() => {
    let active = true
    fetchNavigation().then(nav => {
      if (active && nav?.length) setMenuData(nav)
    })
    return () => {
      active = false
      clearTimeout(closeTimer.current)
    }
  }, [])

  // Display all active categories provided by the navigation API
  const filteredMenuData = useMemo(() => {
    return menuData
  }, [menuData])

  // Scroll listeners
  useEffect(() => {
    checkScroll()
    const el = navScrollRef.current
    if (!el) return
    el.addEventListener('scroll', checkScroll, { passive: true })
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      ro.disconnect()
    }
  }, [filteredMenuData, checkScroll])

  // Close search on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileSearchOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Auto-focus search input
  useEffect(() => {
    if (mobileSearchOpen) {
      setTimeout(() => mobileSearchInputRef.current?.focus(), 80)
    }
  }, [mobileSearchOpen])

  return (
    <header className="sticky top-0 z-[100] w-full bg-white transition-all duration-300 shadow-[0_2px_14px_rgba(15,23,42,0.05)] border-b border-[var(--ivory-dark)]">
      {/* ── Mobile Header ── */}
      <div className="flex lg:hidden w-full items-center justify-between px-3 py-2 bg-white">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileNavOpen(true)}
            className="flex items-center justify-center w-9 h-9 rounded-full text-[var(--charcoal)] hover:bg-slate-100 transition-colors"
          >
            <Menu size={22} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            aria-label="Toggle search"
            onClick={() => setMobileSearchOpen(prev => !prev)}
            className={`flex items-center justify-center w-9 h-9 rounded-full transition-colors ${
              mobileSearchOpen ? 'text-[#8B1A1A] bg-[#FDF6F0]' : 'text-[#0F172A] hover:bg-slate-100'
            }`}
          >
            <Search size={20} strokeWidth={1.8} />
          </button>
        </div>

        <Link href="/" className="flex min-w-0 flex-1 items-center justify-center px-1 no-underline">
          <Image
            src={LOGO_SRC}
            alt={LOGO_ALT}
            width={1400}
            height={520}
            priority
            sizes="150px"
            className="h-8 w-auto max-w-[130px] sm:max-w-[150px] object-contain"
          />
        </Link>

        <div className="flex items-center gap-1">
          <Link
            href="/wishlist"
            aria-label="Wishlist"
            className="relative flex items-center justify-center w-9 h-9 rounded-full text-[#0F172A] hover:text-[#8B1A1A] hover:bg-[#FDF6F0] transition-colors no-underline"
          >
            <Heart size={20} strokeWidth={1.8} />
            {wishlistTotal > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#F59E0B] text-[9px] font-bold text-[#0F172A] shadow-xs">
                {wishlistTotal}
              </span>
            )}
          </Link>
          <Link
            href="/cart"
            aria-label="Cart"
            className="relative flex items-center justify-center w-9 h-9 rounded-full text-[#0F172A] hover:text-[#8B1A1A] hover:bg-[#FDF6F0] transition-colors no-underline"
          >
            <ShoppingBag size={20} strokeWidth={1.8} />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#8B1A1A] text-[9px] font-bold text-white shadow-xs">
                {totalItems}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile Nav Drawer */}
      <MobileNavDrawer
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        menuData={filteredMenuData}
      />

      {/* ── Search Dropdown Panel ── */}
      <div
        className="transition-all duration-300 ease-out relative border-b border-[var(--ivory-dark)]"
        style={{
          maxHeight: mobileSearchOpen ? '90px' : '0',
          opacity: mobileSearchOpen ? 1 : 0,
          overflow: mobileSearchOpen ? 'visible' : 'hidden',
          background: 'rgba(255, 255, 255, 0.98)',
          boxShadow: mobileSearchOpen ? '0 12px 30px rgba(15,23,42,0.06)' : 'none',
          zIndex: 101,
        }}
      >
        <div className="px-4 py-3 max-w-[1440px] mx-auto">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-[2px] font-bold text-[var(--muted)]">
              Search Sarees, Collections & Fabrics
            </span>
            <button
              type="button"
              onClick={() => setMobileSearchOpen(false)}
              aria-label="Close search"
              className="w-6 h-6 flex items-center justify-center rounded-full text-[var(--charcoal)] hover:bg-stone-100 transition-colors"
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          </div>
          <div className="flex justify-center max-w-3xl mx-auto">
            <SearchBar ref={mobileSearchInputRef} />
          </div>
        </div>
      </div>

      {/* Search Backdrop */}
      {mobileSearchOpen && (
        <div
          className="fixed inset-0 z-[99] bg-black/30 backdrop-blur-xs transition-opacity"
          onClick={() => setMobileSearchOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Desktop Main Navigation Bar ── */}
      <div className="hidden lg:flex max-w-[1440px] mx-auto px-6 xl:px-10 py-2.5 items-center justify-between gap-6 relative">
        {/* Brand Logo (Left) */}
        <div className="flex-shrink-0 w-44 xl:w-52">
          <Link href="/" className="flex items-center justify-start no-underline group">
            <Image
              src={LOGO_SRC}
              alt={LOGO_ALT}
              width={1400}
              height={520}
              priority
              sizes="200px"
              className="h-10 xl:h-11 w-auto max-w-[165px] object-contain transition-transform duration-200 group-hover:scale-[1.02]"
            />
          </Link>
        </div>

        {/* Centered Navigation Items */}
        <nav className="flex-1 min-w-0 relative flex items-center justify-center">
          {/* Scroll Left Button */}
          <button
            type="button"
            onClick={() => scrollNav('left')}
            aria-label="Scroll left"
            className={`absolute left-0 z-20 flex items-center justify-center w-7 h-7 rounded-full bg-white/95 border border-[var(--ivory-dark)] shadow-sm text-[#0F172A] hover:bg-[#8B1A1A] hover:text-white hover:border-[#8B1A1A] transition-all duration-200 ${
              canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <ChevronLeft size={14} strokeWidth={2.5} />
          </button>

          {/* Left Gradient Fade */}
          <div
            className={`absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none transition-opacity duration-200 ${
              canScrollLeft ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ background: 'linear-gradient(to right, rgba(255,255,255,0.98) 20%, transparent)' }}
          />

          {/* Category List */}
          <div
            ref={navScrollRef}
            className="flex items-center gap-0.5 xl:gap-1.5 overflow-x-auto whitespace-nowrap px-6 py-1 scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {filteredMenuData.map(cat => {
              const isSale = cat.isSale || cat.label.toLowerCase().includes('sale') || cat.label.toLowerCase().includes('offer')
              const isHighlight = cat.isHighlighted
              const isBrowseAll = (cat.label || '').toLowerCase().trim() === 'browse all'
              const hasSub = !isBrowseAll && cat.subCategories && cat.subCategories.length > 0
              const linkHref = isBrowseAll ? '/shop' : cat.href

              return (
                <div
                  key={cat.label}
                  className="h-full flex-shrink-0 flex items-center group/item"
                  onMouseEnter={() => {
                    if (!isBrowseAll) {
                      clearTimeout(closeTimer.current)
                      setOpenMenu(cat.label)
                    }
                  }}
                  onMouseLeave={() => {
                    if (!isBrowseAll) {
                      closeTimer.current = setTimeout(() => setOpenMenu(null), 150)
                    }
                  }}
                >
                  <Link
                    href={linkHref}
                    onClick={() => setOpenMenu(null)}
                    className={`relative py-2 px-3.5 text-[13px] xl:text-[14px] font-bold uppercase tracking-[0.08em] no-underline transition-all duration-200 rounded-md inline-flex items-center gap-1 ${
                      openMenu === cat.label
                        ? 'text-[#8B1A1A] bg-[#FDF6F0]'
                        : isHighlight
                          ? 'text-[#8B1A1A] font-extrabold hover:bg-[#FDF6F0]'
                          : isSale
                            ? 'text-[#B91C1C] font-extrabold hover:bg-rose-50 hover:text-[#991B1B]'
                            : 'text-[#0F172A] hover:text-[#8B1A1A] hover:bg-[#FDF6F0]'
                    }`}
                  >
                    {cat.label}
                    {hasSub && (
                      <ChevronDown
                        size={12}
                        strokeWidth={2.4}
                        className={`transition-transform duration-200 ${
                          openMenu === cat.label ? 'rotate-180 text-[#8B1A1A]' : 'text-slate-400 group-hover/item:text-[#8B1A1A]'
                        }`}
                      />
                    )}
                    {isSale && (
                      <span className="ml-1 text-[9px] bg-[#B91C1C] text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-widest leading-none">
                        Hot
                      </span>
                    )}
                  </Link>

                  {/* Mega Menu Dropdown */}
                  {!isBrowseAll && cat.subCategories && cat.subCategories.length > 0 && (
                    <div
                      onMouseEnter={() => clearTimeout(closeTimer.current)}
                      onMouseLeave={() => {
                        closeTimer.current = setTimeout(() => setOpenMenu(null), 150)
                      }}
                      className={`absolute top-full left-0 w-screen bg-white shadow-[0_20px_45px_rgba(15,23,42,0.12)] border-t-2 border-[#8B1A1A] z-[200] transition-all duration-300 overflow-hidden ${
                        openMenu === cat.label
                          ? 'opacity-100 visible translate-y-0 pointer-events-auto'
                          : 'opacity-0 invisible translate-y-2 pointer-events-none'
                      }`}
                      style={{ left: '50%', transform: openMenu === cat.label ? 'translateX(-50%)' : 'translateX(-50%) translateY(8px)' }}
                    >
                      <div className="max-w-[1400px] mx-auto py-6 px-6 xl:px-10 max-h-[80vh] overflow-y-auto">
                        <div className={`mx-auto grid gap-x-6 gap-y-6 ${
                          cat.subCategories.length <= 4
                            ? 'grid-cols-2 sm:grid-cols-4 max-w-[820px]'
                            : 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 max-w-[1140px]'
                        }`}>
                          {cat.subCategories.map((sub: any) => {
                            const subHref = sub.href || `${cat.href}?filter=${encodeURIComponent(sub.name)}`

                            return (
                              <div key={sub.name} className="flex flex-col items-center text-center">
                                <Link
                                  href={subHref}
                                  onClick={() => setOpenMenu(null)}
                                  className="group/card flex flex-col items-center no-underline w-full"
                                >
                                  {sub.imageUrl ? (
                                    <div className="w-24 h-28 xl:w-28 xl:h-32 rounded-xl border border-slate-200 shadow-xs bg-slate-50 overflow-hidden mb-2 transition-all duration-300 group-hover/card:scale-105 group-hover/card:shadow-md group-hover/card:border-[#8B1A1A]/40">
                                      <img
                                        src={resolveImageUrl(sub.imageUrl)}
                                        alt={sub.name}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-24 h-28 xl:w-28 xl:h-32 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center mb-2 text-slate-400">
                                      <ShoppingBag size={24} />
                                    </div>
                                  )}
                                  <span className="block text-[12px] xl:text-[13px] tracking-wider uppercase font-bold text-[#0F172A] text-center transition-colors group-hover/card:text-[#8B1A1A] line-clamp-1">
                                    {sub.name}
                                  </span>
                                </Link>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Right Gradient Fade */}
          <div
            className={`absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none transition-opacity duration-200 ${
              canScrollRight ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ background: 'linear-gradient(to left, rgba(255,255,255,0.98) 20%, transparent)' }}
          />

          {/* Scroll Right Button */}
          <button
            type="button"
            onClick={() => scrollNav('right')}
            aria-label="Scroll right"
            className={`absolute right-0 z-20 flex items-center justify-center w-7 h-7 rounded-full bg-white/95 border border-[var(--ivory-dark)] shadow-sm text-[#0F172A] hover:bg-[#8B1A1A] hover:text-white hover:border-[#8B1A1A] transition-all duration-200 ${
              canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <ChevronRight size={14} strokeWidth={2.5} />
          </button>
        </nav>

        {/* Action Icons (Right) */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Link
            href="/"
            aria-label="Home"
            className={`group flex items-center justify-center h-9 w-9 rounded-full transition-all duration-200 hover:bg-[#FDF6F0] no-underline ${
              pathname === '/' ? 'text-[#8B1A1A] bg-[#FDF6F0]' : 'text-[#0F172A] hover:text-[#8B1A1A]'
            }`}
          >
            <Home size={18} strokeWidth={1.8} />
          </Link>

          <Link
            href="/shop"
            aria-label="Shop"
            className={`group flex items-center justify-center h-9 w-9 rounded-full transition-all duration-200 hover:bg-[#FDF6F0] no-underline ${
              pathname.startsWith('/shop') || pathname.startsWith('/products')
                ? 'text-[#8B1A1A] bg-[#FDF6F0]'
                : 'text-[#0F172A] hover:text-[#8B1A1A]'
            }`}
          >
            <Store size={18} strokeWidth={1.8} />
          </Link>

          <button
            type="button"
            onClick={() => setMobileSearchOpen(prev => !prev)}
            className={`group flex items-center justify-center h-9 w-9 rounded-full transition-all duration-200 hover:bg-[#FDF6F0] ${
              mobileSearchOpen ? 'text-[#8B1A1A] bg-[#FDF6F0]' : 'text-[#0F172A] hover:text-[#8B1A1A]'
            }`}
            aria-label="Toggle search"
          >
            <Search size={18} strokeWidth={1.8} />
          </button>

          <Link
            href="/wishlist"
            aria-label="Wishlist"
            className={`group relative flex items-center justify-center h-9 w-9 rounded-full transition-all duration-200 hover:bg-[#FDF6F0] no-underline ${
              pathname === '/wishlist' ? 'text-[#8B1A1A] bg-[#FDF6F0]' : 'text-[#0F172A] hover:text-[#8B1A1A]'
            }`}
          >
            <Heart size={18} strokeWidth={1.8} />
            {wishlistTotal > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#F59E0B] text-[9px] font-bold text-[#0F172A] shadow-xs">
                {wishlistTotal}
              </span>
            )}
          </Link>

          <LoginDropdown />

          <Link
            href="/cart"
            aria-label="Cart"
            className={`group relative flex items-center justify-center h-9 w-9 rounded-full transition-all duration-200 hover:bg-[#FDF6F0] no-underline ${
              pathname === '/cart' ? 'text-[#8B1A1A] bg-[#FDF6F0]' : 'text-[#0F172A] hover:text-[#8B1A1A]'
            }`}
          >
            <ShoppingBag size={18} strokeWidth={1.8} />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#8B1A1A] text-[9px] font-bold text-white shadow-xs">
                {totalItems}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}
