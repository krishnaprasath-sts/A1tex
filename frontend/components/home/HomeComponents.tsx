'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronLeft, ChevronRight, Shield, Clock, Globe, Truck } from 'lucide-react'
import { fetchStorefrontHome } from '@/lib/api/storefront'
import { resolveImageUrl } from '@/lib/api/client'
import { getDiscount, mapToProductCardProduct } from '@/lib/api/mappers'
import type { StorefrontHomeData } from '@/lib/api/types'
import ProductCard from '@/components/product/ProductCard'
import { useCart } from '@/components/cart/CartContext'
import { useWishlist } from '@/components/wishlist/WishlistContext'

type NewArrivalProduct = {
  id: number
  code: string
  name: string
  type: string
  price: number
  originalPrice?: number | null
  isNew?: boolean
  color?: string
  category: string
  image?: string
  imageUrl?: string
}

export function getCategoryHref(cat: any): string {
  if (cat?.href && cat.href !== '#' && cat.href.trim() !== '') return cat.href
  if (cat?.slug && cat.slug.trim() !== '') return `/collections/${cat.slug}`
  if (cat?.name) {
    const slug = cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    return `/collections/${slug}`
  }
  return '/shop'
}

let pendingHomeData: Promise<StorefrontHomeData> | null = null

export function requestHomeData() {
  if (!pendingHomeData) {
    pendingHomeData = fetchStorefrontHome().finally(() => {
      pendingHomeData = null
    })
  }
  return pendingHomeData
}

function useDynamicHomeData() {
  const [homeData, setHomeData] = useState<StorefrontHomeData | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    let active = true
    requestHomeData().then(data => {
      if (active) setHomeData(data)
    })
    return () => {
      active = false
    }
  }, [])

  return mounted ? homeData : null
}

function formatArrivalPrice(value: number) {
  return `\u20B9 ${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/* â”€â”€ Hero Section Banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export function CollectionBanner() {
  return (
    <section className="relative w-full h-[65vh] md:h-[90vh] overflow-hidden flex items-center justify-center bg-[var(--charcoal)]">
      {/* Cinematic Background Image with Ken Burns effect */}
      <div
        className="absolute inset-0 z-0 scale-105"
        style={{
          backgroundImage: "url('/hero_cinematic.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
          backgroundRepeat: 'no-repeat',
          animation: 'kenburns 25s infinite alternate ease-in-out',
        }}
      />

      {/* Dark overlay for perfect text readability */}
      <div
        className="absolute inset-0 z-10 opacity-70"
        style={{
          background: 'linear-gradient(to top, rgba(15,15,15,0.95) 0%, rgba(15,15,15,0.4) 40%, rgba(15,15,15,0.2) 100%)'
        }}
      />

      {/* Luxury floral subtle overlay */}
      <div
        className="absolute inset-0 z-10 opacity-10 pointer-events-none"
        style={{
          backgroundImage: "url('/generated-home/sg-motif-repeat.svg')",
          backgroundSize: "300px",
          backgroundRepeat: "repeat"
        }}
      />

      <div className="relative z-20 max-w-[1200px] w-full mx-auto px-5 lg:px-8 text-center flex flex-col items-center justify-end h-full pb-12 sm:pb-14 md:pb-16">
        {/* Animated Badge */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
          <span
            className="inline-block px-4 py-1.5 sm:px-5 sm:py-2 rounded-full text-[9px] sm:text-[11px] font-montserrat tracking-[0.22em] font-semibold uppercase mb-3 sm:mb-4"
            style={{
              background: 'rgba(232, 201, 126, 0.15)',
              backdropFilter: 'blur(10px)',
              color: '#FCD34D',
              border: '1px solid rgba(232, 201, 126, 0.4)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }}
          >
            The New Era of Handloom
          </span>
        </div>

        {/* Cinematic Main Title */}
        <h2
          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-playfair tracking-wide animate-fade-in-up drop-shadow-xl"
          style={{
            color: '#FAFAF7',
            lineHeight: 1.15,
            animationDelay: '0.4s',
            animationFillMode: 'both',
            textShadow: '0 8px 30px rgba(0,0,0,0.8)'
          }}
        >
          <span style={{ color: '#FAFAF7' }}>A1</span> <span style={{ color: '#FCB900', fontStyle: 'italic' }}>TEX</span>
        </h2>

        {/* Subtext */}
        <p
          className="text-xs sm:text-sm md:text-base font-montserrat mt-2 sm:mt-3 max-w-xl animate-fade-in-up"
          style={{
            color: 'rgba(250,250,247,0.85)',
            lineHeight: 1.6,
            animationDelay: '0.6s',
            animationFillMode: 'both',
            letterSpacing: '0.03em'
          }}
        >
          Immerse yourself in the pinnacle of South Indian luxury. <br className="hidden md:block" /> Experience timeless elegance woven into every thread.
        </p>

        {/* CTA Button */}
        <div className="mt-4 sm:mt-6 animate-fade-in-up" style={{ animationDelay: '0.8s', animationFillMode: 'both' }}>
          <Link
            href="/collections/women-kanchipuram-silk"
            className="group relative inline-flex items-center justify-center px-6 py-2.5 sm:px-8 sm:py-3 font-montserrat text-[11px] sm:text-xs tracking-[0.18em] font-bold uppercase overflow-hidden rounded-full shadow-lg"
            style={{
              backgroundColor: '#FCD34D',
              color: '#080E1A',
              transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            }}
          >
            <span className="relative z-10 transition-transform duration-500 group-hover:-translate-y-[150%]">Explore Collection</span>
            <span className="absolute inset-0 z-10 flex items-center justify-center translate-y-[150%] transition-transform duration-500 group-hover:translate-y-0 text-white bg-[#080E1A]">
              Discover More
            </span>
          </Link>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes kenburns {
          0% { transform: scale(1); }
          100% { transform: scale(1.15); }
        }
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
    </section>
  )
}



/* -- Features Strip --------------------------------- */
export function FeaturesStrip() {
  const features = [
    {
      id: 'shipping',
      title: "Free Shipping in India",
      description: "On all orders above ₹999",
      icon: (
        <div className="relative flex items-center justify-center">
          <Truck size={24} className="text-[var(--burgundy)] transition-transform duration-300 group-hover:scale-110" />
        </div>
      )
    },
    {
      id: 'delivery',
      title: "Fast & Safe Delivery",
      description: "Reliable dispatch across India",
      icon: <Clock size={24} className="text-[var(--burgundy)] transition-transform duration-300 group-hover:scale-110" />
    },
    {
      id: 'worldwide',
      title: "Worldwide Shipping",
      description: "Delivered to 50+ countries worldwide",
      icon: <Globe size={24} className="text-[var(--burgundy)] transition-transform duration-300 group-hover:scale-110" />
    },
    {
      id: 'authentic',
      title: "100% Authentic Weaves",
      description: "Certified pure handloom heritage",
      icon: (
        <div className="relative flex items-center justify-center">
          <Shield size={24} className="text-[var(--burgundy)] transition-transform duration-300 group-hover:scale-110" />
        </div>
      )
    }
  ];

  return (
    <>
      <div className="heritage-thread-divider" aria-hidden="true" />
      <div className="w-full border-b border-[var(--ivory-dark)] bg-white/70 backdrop-blur-sm py-6 md:py-8 px-4 md:px-8 overflow-hidden">
        <div className="max-w-[1400px] mx-auto flex overflow-x-auto hide-scrollbar snap-x snap-mandatory lg:grid lg:grid-cols-4 gap-4 md:gap-0 pb-2 md:pb-0 px-2 lg:px-0">
          {features.map((feature, index) => (
            <div
              key={feature.id}
              className={`group min-w-[85vw] sm:min-w-[45vw] lg:min-w-0 shrink-0 snap-center flex flex-col items-center gap-3.5 px-6 py-2 text-center relative sm:flex-row sm:text-left transition-all duration-300 ${index !== features.length - 1 ? 'lg:border-r border-[var(--ivory-dark)]' : ''
                }`}
            >
              <div className="flex-shrink-0 w-13 h-13 rounded-2xl bg-gradient-to-br from-amber-50 to-purple-50 border border-purple-100/60 flex items-center justify-center shadow-xs transition-transform duration-300 group-hover:scale-110 group-hover:shadow-md">
                {feature.icon}
              </div>

              <div className="flex flex-col">
                <h3 className="text-[var(--charcoal)] font-extrabold text-[13px] md:text-sm leading-tight uppercase tracking-wider group-hover:text-[var(--burgundy)] transition-colors">
                  {feature.title}
                </h3>
                <p className="text-[var(--muted)] text-[11px] md:text-xs mt-1 font-medium">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="heritage-thread-divider heritage-thread-divider-bottom" aria-hidden="true" />
    </>
  );
}

export function ShopBySection() {
  const [activeTab, setActiveTab] = useState('')
  const homeData = useDynamicHomeData()

  const sectionCats = homeData?.sectionCategories || []
  const womenCats = homeData?.womensCategories || []

  const { tabItems, childrenMap, defaultCats } = useMemo(() => {
    const map: Record<string, any[]> = {}
    const parents = sectionCats.filter((c: any) => c.section === 'shop-by')
    for (const p of parents) {
      map[p.name] = womenCats
        .filter((c: any) => c.parentId != null && c.parentId === p.id)
        .sort((a: any, b: any) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))
    }
    const valid = parents
    return { tabItems: valid, childrenMap: map, defaultCats: valid[0] ? map[valid[0].name] : [] }
  }, [sectionCats, womenCats])

  const effectiveTab = activeTab || tabItems[0]?.name || ''
  const visibleCats = childrenMap[effectiveTab] || defaultCats

  if (tabItems.length === 0) return null

  return (
    <section className="relative overflow-hidden bg-[var(--ivory)] px-4 py-10 md:py-16">
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: "url('/generated-home/sg-motif-repeat.svg')", backgroundSize: '120px' }}
      />
      <div className="relative z-10 mx-auto max-w-7xl text-center">
        <h2 className="font-playfair text-3xl md:text-4xl font-medium italic mb-4 tracking-wide"
          style={{ color: 'var(--burgundy-dark)' }}>Shop by</h2>

        {/* Parent category text tabs */}
        <div className="w-full max-w-4xl overflow-x-auto hide-scrollbar mb-8 mx-auto">
          <div className="flex min-w-max snap-x snap-mandatory items-center justify-start gap-3 px-4 md:justify-center md:flex-wrap md:min-w-0">
            {tabItems.map(tab => (
              <button key={tab.name} type="button" onClick={() => setActiveTab(tab.name)}
                className={`whitespace-nowrap rounded-full border px-5 py-2 text-xs font-bold tracking-wide transition-all duration-300 ${activeTab === tab.name
                    ? 'border-[var(--burgundy)] bg-[var(--burgundy)] text-white shadow-md'
                    : 'border-[var(--line)] bg-white text-[var(--text)] hover:border-[var(--gold)] hover:text-[var(--gold)]'
                  }`}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-stretch justify-center gap-4 md:gap-5 max-w-7xl mx-auto">
          {visibleCats.map((cat: any, i: number) => {
            const img = cat.image || cat.imageUrl
            return (
              <div key={cat.id || cat.name} className="w-[calc(50%-8px)] sm:w-[calc(33.333%-14px)] md:w-[calc(25%-16px)] lg:w-[185px] xl:w-[195px] flex">
                <Link href={getCategoryHref(cat)}
                  className="group relative flex flex-1 flex-col overflow-hidden rounded-xl border border-[var(--ivory-dark)] bg-[var(--surface-card)] text-left no-underline shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[var(--brand-blue)] hover:shadow-[0_16px_36px_rgba(15,23,42,0.12)]"
                >
                  <div className="relative w-full aspect-[4/5] overflow-hidden bg-[var(--ivory)]">
                    {img ? (
                      <img src={resolveImageUrl(img)} alt={cat.name} loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[var(--gold-pale)]">
                        <span className="text-center text-lg font-bold text-[var(--charcoal)] opacity-60 leading-tight px-4">{cat.name}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      style={{ background: 'linear-gradient(to top, rgba(15,23,42,0.6), transparent 72%)' }}
                    />
                    <div className="absolute inset-2 border border-white/35 opacity-0 transition-opacity duration-300 group-hover:opacity-100 rounded-lg" />
                  </div>
                  <div className="flex flex-1 flex-col justify-center gap-1.5 md:gap-2 border-t border-[var(--ivory-dark)] bg-white p-2.5 md:p-3">
                    <p className="text-[13px] font-bold leading-tight md:text-[14px] text-[var(--charcoal)] group-hover:text-[var(--brand-blue)] transition-colors" style={{ fontFamily: 'Playfair Display, serif' }}>
                      {cat.name}
                    </p>
                  </div>
                  <div className="absolute right-3 top-3 flex h-8 w-8 scale-75 items-center justify-center rounded-full border border-[var(--ivory-dark)] bg-white text-[var(--charcoal)] opacity-0 shadow-md transition-all duration-300 group-hover:scale-100 group-hover:opacity-100 group-hover:text-[var(--brand-blue)]">
                    <ArrowRight size={15} strokeWidth={2.1} />
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
/* — Subcategory Scroll Bar ————————————————*/
export function SubcatBar() {
  const [activeTab, setActiveTab] = useState('')
  const homeData = useDynamicHomeData()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }, [])

  const sectionCats = homeData?.sectionCategories || []
  const featuredCats = homeData?.featuredCategories || []

  const { tabItems, childrenMap, defaultCats } = useMemo(() => {
    const map: Record<string, any[]> = {}
    const parents = sectionCats.filter((c: any) => c.slug !== 'browse-all' && (c.name || '').toLowerCase().trim() !== 'browse all')
    for (const p of parents) {
      map[p.name] = featuredCats
        .filter((c: any) => c.parentId != null && c.parentId === p.id)
        .sort((a: any, b: any) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))
    }
    const valid = parents
    return { tabItems: valid, childrenMap: map, defaultCats: valid[0] ? map[valid[0].name] : [] }
  }, [sectionCats, featuredCats])

  const effectiveTab = activeTab || tabItems[0]?.name || ''
  const visibleCats = childrenMap[effectiveTab] || defaultCats

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    window.addEventListener('resize', checkScroll)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [checkScroll, visibleCats])

  const scrollBy = (dir: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const cardWidth = 180
    const gap = window.innerWidth < 640 ? 32 : 48
    el.scrollBy({ left: dir === 'left' ? -(cardWidth + gap) : cardWidth + gap, behavior: 'smooth' })
  }

  if (tabItems.length === 0) return null

  return (
    <div className="relative flex flex-col items-center overflow-hidden border-y border-[var(--ivory-dark)] bg-[var(--ivory)] px-4 py-6 md:py-12 font-sans">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-40">
        <div className="absolute top-0 left-0 w-[120%] md:w-[60%] h-full" style={{
          backgroundImage: "url('/generated-home/sg-motif-repeat.svg')",
          backgroundSize: "cover",
          backgroundPosition: "left center",
          backgroundRepeat: "no-repeat",
          maskImage: "linear-gradient(to right, black 10%, transparent 90%)",
          WebkitMaskImage: "linear-gradient(to right, black 10%, transparent 90%)"
        }} />
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: "url('/generated-home/sg-motif-repeat.svg')",
          backgroundSize: "80px 80px"
        }} />
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .font-playfair { font-family: 'Playfair Display', serif; }
        .font-montserrat { font-family: 'Montserrat', sans-serif; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .fabric-perspective { perspective: 1000px; }
        .fabric-arch-card {
          position: relative; width: 140px; height: 200px; overflow: hidden;
          border-radius: 999px 999px 0.75rem 0.75rem;
          border: 1px solid rgba(107, 26, 42, 0.16);
          background: var(--gold-pale);
          box-shadow: 0 12px 28px rgba(74, 15, 28, 0.09);
          transform: translateZ(0);
          transition: transform 0.45s ease, border-color 0.45s ease, box-shadow 0.45s ease;
        }
        @media (min-width: 640px) { .fabric-arch-card { width: 160px; height: 220px; } }
        .fabric-item:hover .fabric-arch-card {
          transform: translateY(-10px);
          border-color: rgba(194, 155, 87, 0.85);
          box-shadow: 0 22px 42px -18px rgba(107, 26, 42, 0.32);
        }
        .fabric-arch-window {
          position: relative; width: 100%; height: 100%; overflow: hidden;
          border-radius: inherit; z-index: 10; background: var(--surface-soft);
          border: 1px solid rgba(250, 246, 238, 0.82);
        }
        .fabric-card-image {
          width: 100%; height: 100%; object-fit: cover;
          transition: transform 0.7s ease-in-out;
        }
        .fabric-item:hover .fabric-card-image { transform: scale(1.1); }
        .fabric-card-light {
          position: absolute; inset: 0; pointer-events: none; opacity: 0;
          background: linear-gradient(to bottom, rgba(255,255,255,0.22), rgba(74,15,28,0.34));
          mix-blend-mode: overlay; transition: opacity 0.5s ease;
        }
        .fabric-item:hover .fabric-card-light { opacity: 1; }
        .fabric-card-warmth {
          position: absolute; inset: 0; pointer-events: none;
          background: rgba(74, 15, 28, 0.12); transition: opacity 0.5s ease;
        }
        .fabric-item:hover .fabric-card-warmth { opacity: 0; }
        @media (prefers-reduced-motion: reduce) {
          .fabric-arch-card, .fabric-card-image, .fabric-card-light, .fabric-card-warmth {
            animation: none !important; transition: none !important;
          }
        }
      `}} />

      <h1 className="font-playfair text-3xl md:text-4xl font-medium italic mb-4 tracking-wide text-center z-10 relative"
        style={{ color: 'var(--burgundy-dark)' }}>Collection</h1>

      {/* Parent category text tabs */}
      <div className="w-full max-w-4xl overflow-x-auto hide-scrollbar mb-8">
        <div className="flex min-w-max snap-x snap-mandatory items-center justify-start gap-3 px-4 md:justify-center md:flex-wrap md:min-w-0">
          {tabItems.map(tab => (
            <button key={tab.name} type="button" onClick={() => setActiveTab(tab.name)}
              className={`whitespace-nowrap rounded-full border px-5 py-2 text-xs font-bold tracking-wide transition-all duration-300 ${activeTab === tab.name
                  ? 'border-[var(--burgundy)] bg-[var(--burgundy)] text-white shadow-md'
                  : 'border-[var(--line)] bg-white text-[var(--text)] hover:border-[var(--gold)] hover:text-[var(--gold)]'
                }`}
            >
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* Child arch image cards */}
      <div className="relative w-full max-w-7xl">
        {canScrollLeft ? (
          <button type="button" onClick={() => scrollBy('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-9 h-9 rounded-full bg-white/90 border border-[var(--line)] shadow-md text-[var(--burgundy)] hover:bg-[var(--burgundy)] hover:text-white transition-all duration-200 -ml-4"
            aria-label="Scroll left"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>
        ) : null}
        {canScrollRight ? (
          <button type="button" onClick={() => scrollBy('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-9 h-9 rounded-full bg-white/90 border border-[var(--line)] shadow-md text-[var(--burgundy)] hover:bg-[var(--burgundy)] hover:text-white transition-all duration-200 -mr-4"
            aria-label="Scroll right"
          >
            <ChevronRight size={18} strokeWidth={2.5} />
          </button>
        ) : null}
        <div ref={scrollRef} className="overflow-x-auto hide-scrollbar">
          <div className="fabric-perspective flex min-w-max snap-x snap-mandatory items-start justify-start gap-8 px-4 pb-6 sm:gap-12 md:justify-center">
            {visibleCats.map((cat: any) => {
              const img = resolveImageUrl(cat.image || cat.imageUrl)
              return (
                <Link key={cat.name} href={getCategoryHref(cat)}
                  className="fabric-item group flex shrink-0 snap-center cursor-pointer flex-col items-center gap-4 outline-none no-underline"
                >
                  <div className="fabric-arch-card">
                    <div className="fabric-arch-window">
                      <img src={img || '/placeholder.svg'} alt={cat.name} loading="lazy" className="fabric-card-image" />
                      <div className="fabric-card-light" />
                      <div className="fabric-card-warmth" />
                    </div>
                  </div>
                  <span className="font-montserrat text-sm sm:text-base font-bold tracking-wide text-[var(--text)] transition-all duration-300 group-hover:text-[var(--gold)]">
                    {cat.name}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

/* â”€â”€ Category Grid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const categoryStyles = `
  /* â”€â”€ Outer wrapper â”€â”€ */
  .collection-wrapper {
    position: relative;
    background-color: var(--ivory);
    background-image: 
      radial-gradient(circle at 15% 50%, rgba(194, 155, 87, 0.08), transparent 40%),
      radial-gradient(circle at 85% 30%, rgba(107, 29, 21, 0.04), transparent 50%),
      radial-gradient(ellipse at 50% 100%, rgba(255, 255, 255, 0.8), transparent 70%);
    padding: 50px 0 30px;
    text-align: center;
    overflow: hidden;
  }

  .collection-wrapper::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 100%;
    height: 100%;
    background: url('/generated-home/sg-motif-repeat.svg') no-repeat top right;
    background-size: 60% auto;
    opacity: 0.2;
    pointer-events: none;
    z-index: 0;
    mask-image: linear-gradient(to bottom left, black 10%, transparent 60%);
    -webkit-mask-image: linear-gradient(to bottom left, black 10%, transparent 60%);
  }

  /* â”€â”€ Section heading area â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  .collection-heading {
    position: relative;
    z-index: 10;
  }

  .collection-heading .section-label {
    font-size: 13px;
    letter-spacing: 3px;
    color: var(--gold);
    font-weight: 700;
    margin-bottom: 12px;
    text-transform: uppercase;
    font-family: 'Montserrat', sans-serif;
    display: block;
  }

  .collection-heading h2 {
    font-size: 38px;
    font-family: 'Playfair Display', serif;
    color: var(--burgundy-dark);
    margin: 0 0 30px;
    font-weight: 500;
    font-style: italic;
    letter-spacing: 0.5px;
  }

  /* â”€â”€ Inner container â€“ caps width and centers â”€â”€â”€â”€â”€â”€â”€ */
  .collection-container {
    max-width: 100%;
    margin: auto;
    position: relative;
    z-index: 10;
  }

  /* â”€â”€ Desktop & Mobile: Single-line horizontal scroll â”€â”€ */
  .collection-row {
    display: flex;
    justify-content: flex-start;
    align-items: flex-start;
    gap: 48px;
    flex-wrap: nowrap;
    overflow-x: auto;
    padding: 10px 40px 40px;
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE and Edge */
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
  }

  .collection-row::-webkit-scrollbar {
    display: none; /* Hide scrollbar for Chrome, Safari, etc. */
  }

  /* â”€â”€ Each card column (image + label) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  .cat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-decoration: none;
    flex: 0 0 auto; /* Prevent shrinking in horizontal scroll */
  }

  /* â”€â”€ The flower-shaped image container â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  .collection-card {
    position: relative;
    width: 210px;
    aspect-ratio: 210 / 310;
    cursor: pointer;
    transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1);
  }

  .collection-card:hover {
    transform: translateY(-8px);
  }

  .card-svg {
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  .card-image {
    transition: transform 0.7s ease;
    transform-origin: center;
  }

  .collection-card:hover .card-image {
    transform: scale(1.1);
  }

  /* â”€â”€ Animated SVG border that hugs the clip-path edge â”€â”€â”€â”€â”€â”€â”€â”€ */

  @keyframes trace-border {
    0% { stroke-dashoffset: 100; }
    100% { stroke-dashoffset: 0; }
  }

  .animated-stroke {
    stroke-dasharray: 35 65;
    stroke-dashoffset: 100;
    animation: trace-border 8s linear infinite;
    stroke: var(--gold);
    stroke-width: 8;
    filter: drop-shadow(0 0 5px rgba(222, 184, 135, 0.5));
    transition: all 0.4s ease;
    stroke-linecap: round;
  }

  .cat-item:hover .animated-stroke {
    stroke: var(--gold);
    stroke-width: 9;
    stroke-dasharray: 50 50;
    filter: drop-shadow(0 0 12px rgba(222, 184, 135, 0.9));
    animation-duration: 6s;
  }

  /* â”€â”€ Category label below the card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  .category-name {
    margin-top: 6px;
    color: var(--burgundy);
    font-size: 19px;
    font-family: 'Playfair Display', Georgia, serif;
    font-style: italic;
    font-weight: 500;
    text-align: center;
    transition: color 0.3s ease;
  }

  .cat-item:hover .category-name {
    color: var(--burgundy-dark);
  }

  /* â”€â”€ Responsive adjustments â”€â”€ */
  @media (max-width: 768px) {
    .collection-row {
      gap: 24px;
      padding-left: 20px;
      padding-right: 80px; /* Adjust for floating buttons */
    }
    .collection-card {
      width: 160px;
      height: auto;
    }
    .category-name {
      font-size: 16px;
    }
    .collection-heading h2 {
      font-size: 32px;
    }
  }

  .collection-row {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 28px;
    overflow: visible;
    padding: 8px 40px 24px;
  }

  .cat-item {
    position: relative;
    display: block;
    min-width: 0;
    text-decoration: none;
    color: inherit;
  }

  .collection-card {
    position: relative;
    width: 100%;
    height: auto;
    aspect-ratio: 4 / 5.55;
    overflow: hidden;
    border: 1px solid rgba(194, 155, 87, 0.65);
    background: linear-gradient(180deg, var(--ivory) 0%, var(--gold-pale) 100%);
    box-shadow:
      0 14px 32px rgba(74, 15, 28, 0.08),
      inset 0 0 0 7px rgba(255, 255, 255, 0.58),
      inset 0 0 0 8px rgba(194, 155, 87, 0.28);
    transition: transform 0.45s ease, border-color 0.45s ease, box-shadow 0.45s ease;
  }

  .collection-card::before,
  .collection-card::after {
    content: '';
    position: absolute;
    z-index: 4;
    width: 28px;
    height: 28px;
    pointer-events: none;
  }

  .collection-card::before {
    top: 10px;
    left: 10px;
    border-top: 2px solid var(--gold);
    border-left: 2px solid var(--gold);
  }

  .collection-card::after {
    right: 10px;
    bottom: 10px;
    border-right: 2px solid var(--gold);
    border-bottom: 2px solid var(--gold);
  }

  .cat-item:hover .collection-card {
    transform: translateY(-8px);
    border-color: var(--gold);
    box-shadow:
      0 22px 46px rgba(74, 15, 28, 0.16),
      0 0 0 1px rgba(194, 155, 87, 0.38),
      inset 0 0 0 7px rgba(255, 255, 255, 0.7),
      inset 0 0 0 8px rgba(194, 155, 87, 0.46);
  }

  .catalogue-image-frame {
    position: absolute;
    inset: 14px 14px 74px;
    overflow: hidden;
    border: 1px solid rgba(194, 155, 87, 0.44);
    background: var(--ivory);
  }

  .catalogue-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform: scale(1.01);
    transition: transform 0.75s ease, filter 0.45s ease;
  }

  .cat-item:hover .catalogue-image {
    transform: scale(1.09);
    filter: saturate(1.08) contrast(1.03);
  }

  .catalogue-overlay {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.08), transparent 42%),
      linear-gradient(0deg, rgba(74, 15, 28, 0.34), transparent 42%);
    opacity: 0.18;
    transition: opacity 0.4s ease;
  }

  .cat-item:hover .catalogue-overlay {
    opacity: 0.62;
  }

  .category-plaque {
    position: absolute;
    left: 14px;
    right: 14px;
    bottom: 14px;
    min-height: 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    border: 1px solid rgba(232, 201, 126, 0.58);
    background: linear-gradient(135deg, var(--burgundy-dark), var(--burgundy));
    padding: 10px 12px;
    color: var(--ivory);
    box-shadow: 0 8px 18px rgba(74, 15, 28, 0.2);
  }

  .category-name {
    margin: 0;
    min-width: 0;
    color: inherit;
    font-size: 16px;
    font-family: 'Playfair Display', Georgia, serif;
    font-style: normal;
    font-weight: 700;
    line-height: 1.1;
    text-align: left;
  }

  .category-tag {
    display: block;
    margin-bottom: 4px;
    color: var(--gold-light);
    font-family: 'Montserrat', sans-serif;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.16em;
    line-height: 1;
    text-transform: uppercase;
  }

  .category-arrow {
    display: inline-flex;
    width: 27px;
    height: 27px;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(232, 201, 126, 0.68);
    color: var(--gold-light);
    transition: transform 0.3s ease, background 0.3s ease;
  }

  .cat-item:hover .category-arrow {
    background: rgba(232, 201, 126, 0.12);
    transform: translateX(2px);
  }

  @media (max-width: 1180px) {
    .collection-row {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 24px;
    }
  }

  @media (max-width: 900px) {
    .collection-row {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      padding-left: 24px;
      padding-right: 24px;
    }
  }

  @media (max-width: 640px) {
    .collection-heading h2 {
      margin-bottom: 30px;
      font-size: 32px;
    }
    .collection-row {
      display: flex;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      gap: 14px;
      padding: 4px 14px 12px;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }
    .collection-row::-webkit-scrollbar { display: none; }
    .cat-item {
      scroll-snap-align: start;
      flex: 0 0 65vw;
    }
    .collection-card {
      aspect-ratio: 4 / 6;
      box-shadow:
        0 10px 24px rgba(74, 15, 28, 0.09),
        inset 0 0 0 5px rgba(255, 255, 255, 0.58),
        inset 0 0 0 6px rgba(194, 155, 87, 0.28);
    }
    .catalogue-image-frame {
      inset: 10px 10px 64px;
    }
    .category-plaque {
      left: 10px;
      right: 10px;
      bottom: 10px;
      min-height: 44px;
      padding: 8px 9px;
    }
    .category-name {
      font-size: 13px;
    }
    .category-tag {
      font-size: 8px;
      letter-spacing: 0.12em;
    }
    .category-arrow {
      width: 24px;
      height: 24px;
    }
  }

  .collection-row {
    display: flex;
    grid-template-columns: none;
    flex-wrap: nowrap;
    justify-content: flex-start;
    align-items: stretch;
    gap: 26px;
    overflow-x: auto;
    overflow-y: visible;
    padding: 8px max(24px, calc((100vw - 1400px) / 2 + 40px)) 30px;
    scroll-snap-type: x proximity;
    scroll-padding-left: max(24px, calc((100vw - 1400px) / 2 + 40px));
    scrollbar-width: none;
    -ms-overflow-style: none;
    -webkit-overflow-scrolling: touch;
  }

  .collection-row::-webkit-scrollbar {
    display: none;
  }

  .cat-item {
    flex: 0 0 clamp(190px, 16vw, 238px);
    scroll-snap-align: start;
  }

  .collection-card {
    aspect-ratio: 4 / 5.55;
  }

  @media (max-width: 900px) {
    .collection-row {
      gap: 18px;
      padding: 4px 20px 24px;
      scroll-padding-left: 20px;
    }
    .cat-item {
      flex-basis: clamp(174px, 34vw, 220px);
    }
  }

  @media (max-width: 640px) {
    .collection-row {
      gap: 14px;
      padding: 4px 14px 22px;
      scroll-padding-left: 14px;
    }
    .cat-item {
      flex-basis: min(72vw, 176px);
    }
    .collection-card {
      aspect-ratio: 4 / 6;
    }
  }

  .collection-card {
    border-radius: 0.75rem;
    border-color: rgba(107, 26, 42, 0.16);
    background: var(--surface-card);
    box-shadow: 0 12px 30px rgba(74, 15, 28, 0.08);
    aspect-ratio: 3 / 4;
  }

  .collection-card::before,
  .collection-card::after {
    display: none;
  }

  .cat-item:hover .collection-card {
    transform: translateY(-8px);
    border-color: rgba(194, 155, 87, 0.9);
    box-shadow: 0 22px 46px rgba(74, 15, 28, 0.14);
  }

  .catalogue-image-frame {
    inset: 0;
    border: 0;
    border-radius: inherit;
  }

  .catalogue-image {
    transform: scale(1);
  }

  .cat-item:hover .catalogue-image {
    transform: scale(1.05);
  }

  .catalogue-overlay {
    opacity: 0.16;
    background: linear-gradient(0deg, rgba(74, 15, 28, 0.34), transparent 48%);
  }

  .category-plaque {
    left: 0;
    right: 0;
    bottom: 0;
    min-height: 54px;
    border: 0;
    border-top: 1px solid rgba(232, 201, 126, 0.48);
    background: rgba(82, 0, 1, 0.9);
    backdrop-filter: blur(6px);
    box-shadow: none;
  }

  .category-name {
    font-size: 15px;
  }

  .cat-item {
    flex-basis: clamp(178px, 15vw, 220px);
  }

  @media (max-width: 640px) {
    .collection-card {
      aspect-ratio: 3 / 4;
    }
    .category-plaque {
      left: 0;
      right: 0;
      bottom: 0;
    }
  }
`;

export function CategoryGrid() {
  return null
}








/* â”€â”€ New Arrivals Product Grid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function NewArrivalCard({ product }: { product: NewArrivalProduct }) {
  const disc = getDiscount(product.price, product.originalPrice)
  const badge = product.isNew ? 'Just In' : disc ? `${disc}% OFF` : null
  const slug = (product as any).slug || product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const href = `/products/${slug}`

  return (
    <article className="group relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-[rgba(107,26,42,0.16)] bg-white shadow-[0_14px_34px_rgba(82,0,1,0.08)] transition-shadow duration-300 hover:shadow-[0_20px_48px_rgba(82,0,1,0.14)]">
      <div className="pointer-events-none absolute inset-[5px] z-10 rounded-lg border border-[rgba(201,168,76,0.35)]" />

      <Link href={href} className="relative block aspect-[3/4] overflow-hidden bg-[var(--ivory-dark)] no-underline">
        <img
          src={resolveImageUrl(product.image || product.imageUrl)}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      </Link>

      <div className="relative border-t border-[rgba(201,168,76,0.75)] px-2.5 py-3 md:px-4 md:py-4">
        <div className="mb-1.5 md:mb-2 flex items-center justify-between gap-1 md:gap-3">
          <div className="flex items-center gap-1.5 overflow-hidden">
            {badge && (
              <span className="shrink-0 border border-[rgba(255,250,240,0.65)] bg-[var(--burgundy)] px-1.5 py-0.5 md:px-2 md:py-0.5 text-[7px] md:text-[8px] font-bold uppercase tracking-[0.18em] text-[var(--ivory)]">
                {badge}
              </span>
            )}
            <p className="min-w-0 truncate text-[8px] md:text-[10px] font-bold uppercase tracking-[0.15em] md:tracking-[0.22em] text-[var(--gold)]">
              {product.category}
            </p>
          </div>
          <p className="shrink-0 text-[8px] md:text-[10px] font-semibold uppercase tracking-[0.1em] md:tracking-[0.16em] text-[var(--burgundy)]">
            {product.code}
          </p>
        </div>

        <h3 className="truncate text-[13px] md:text-[17px] font-semibold leading-tight text-[var(--burgundy-dark)]" style={{ fontFamily: 'Playfair Display, serif' }}>
          {product.name}
        </h3>
        <p className="mt-0.5 md:mt-1 truncate text-[10px] md:text-[12px] text-[var(--charcoal)] opacity-75">
          {product.type}
        </p>

        <div className="mt-3 md:mt-4 flex flex-col md:flex-row md:items-end justify-between gap-2 md:gap-3">
          <div className="min-w-0">
            <p className="text-[13px] md:text-[16px] font-bold text-[var(--burgundy)] leading-none">
              {formatArrivalPrice(product.price)}
            </p>
            {product.originalPrice ? (
              <p className="text-[9px] md:text-[11px] text-[var(--charcoal)]/60 line-through mt-0.5">
                {formatArrivalPrice(product.originalPrice)}
              </p>
            ) : null}
          </div>
          <Link
            href={href}
            className="w-full md:w-auto text-center shrink-0 border border-[var(--burgundy)] px-2 py-1.5 md:px-3 md:py-2 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--burgundy)] no-underline transition-colors hover:bg-[var(--burgundy)] hover:text-[var(--ivory)]"
          >
            View
          </Link>
        </div>
      </div>
    </article>
  )
}

export function ProductGrid() {
  const homeData = useDynamicHomeData()
  const arrivals = homeData?.newArrivals
  const cart = useCart()
  const { isWished, toggleWishlist } = useWishlist()
  if (!arrivals?.length) return null
  const display = arrivals.slice(0, 4)

  return (
    <section className="py-8 md:py-10 relative overflow-hidden bg-[var(--ivory)] border-b border-[var(--ivory-dark)]">
      {/* Abstract Symmetrical Mughal Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-30">
        {/* Subtle Geometric Texture */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "url('/generated-home/sg-motif-repeat.svg')",
          backgroundSize: "40px 40px"
        }} />
        {/* Symmetrical Floral Frames (Mughal Arch vibe) */}
        <div className="absolute top-0 left-0 w-[120px] md:w-[250px] h-full" style={{ backgroundImage: "url('/generated-home/sg-floral-pillar.svg')", backgroundSize: "contain", backgroundPosition: "left center", backgroundRepeat: "no-repeat" }} />
        <div className="absolute top-0 right-0 w-[120px] md:w-[250px] h-full transform scale-x-[-1]" style={{ backgroundImage: "url('/generated-home/sg-floral-pillar.svg')", backgroundSize: "contain", backgroundPosition: "left center", backgroundRepeat: "no-repeat" }} />
      </div>

      <div className="w-full mx-auto px-4 lg:px-8 relative z-10">
        <div className="text-center mb-6 md:mb-8">
          <p className="text-[12px] md:text-[14px] uppercase tracking-[0.35em] font-montserrat font-bold text-[var(--gold)] mb-2">Current Trends</p>
          <h2 className="font-playfair text-4xl md:text-5xl font-medium italic tracking-wide text-[var(--burgundy-dark)]">
            Explore Collections
          </h2>
        </div>

        <div className="relative mx-auto w-full border-y border-[var(--ivory-dark)] bg-white/70 backdrop-blur-xs px-0 py-4 shadow-[0_14px_42px_rgba(15,23,42,0.04)] md:px-6 md:py-6">
          <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            {display.map(product => {
              const mapped = mapToProductCardProduct(product)
              mapped.image = resolveImageUrl(product.imageUrl || product.image) || ''
              if (mapped.colors) {
                mapped.colors = mapped.colors.map(c => ({
                  ...c,
                  image: resolveImageUrl(c.image) || ''
                }))
              }
              return (
                <ProductCard
                  key={product.id}
                  product={mapped}
                  wished={isWished(product.id)}
                  onToggleWishlist={() => toggleWishlist(product.id, product.name)}
                  onAddToCart={() => {
                    const slug = product.slug || product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                    const defaultVariant = product.hasVariants && product.variants?.length
                      ? product.variants.find(v => v.isDefault) || product.variants[0]
                      : null
                    const variant = product.hasVariants && product.variants?.length
                      ? product.variants.find(v => (v.stockQty ?? 0) > 0) || defaultVariant
                      : null
                    const target = variant || defaultVariant
                    cart.addItem({
                      id: product.id,
                      name: product.name,
                      slug,
                      price: target ? target.price : product.price,
                      originalPrice: target ? (target.originalPrice ?? product.originalPrice) : product.originalPrice,
                      image: resolveImageUrl(
                        target?.imageUrl || target?.images?.[0]?.imageUrl || product.imageUrl || product.image
                      ) || '',
                      color: target?.colorName || product.color,
                      size: target?.size,
                      variantId: target?.id,
                      variantLabel: target?.label,
                      stock: target?.stockQty ?? product.stockQty,
                    })
                    cart.setDrawerOpen(true)
                  }}
                />
              )
            })}
          </div>

          {arrivals.length >= 4 && (
            <div className="text-center mt-9">
              <Link
                href="/shop"
                className="inline-block rounded-xl border border-[var(--charcoal)] bg-[var(--charcoal)] px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-white no-underline transition-all hover:bg-[var(--brand-blue)] hover:border-[var(--brand-blue)] shadow-md"
              >
                Explore Full Collection
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/* â”€â”€ Spotlight Section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export function SpotlightSection() {
  return (
    <section className="relative w-full bg-[var(--ivory)] overflow-hidden py-6">

      {/* Golden Floral Pillars â€” hidden on mobile, show md+ */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[90%] w-24 md:w-44 lg:w-60 pointer-events-none z-10 hidden md:block">
        <img src="/generated-home/sg-floral-pillar.svg" alt="" loading="lazy" className="w-full h-full object-contain object-left drop-shadow-xl" />
      </div>
      <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[90%] w-24 md:w-44 lg:w-60 pointer-events-none z-10 hidden md:block">
        <img src="/generated-home/sg-floral-pillar.svg" alt="" loading="lazy" className="w-full h-full object-contain object-right scale-x-[-1] drop-shadow-xl" />
      </div>

      {/* Spotlight Banner image */}
      <div className="max-w-[1200px] mx-auto relative z-0 px-2 sm:px-4 md:px-16 lg:px-24">
        <img
          src="/spotlight-banner.png"
          alt="Spotlight Stealer"
          width={1200}
          height={600}
          className="w-full h-auto block object-cover rounded-xl shadow-[0_16px_40px_rgba(107,26,42,0.15)] border-2 md:border-4 border-white"
        />
      </div>
    </section>
  )
}






/* -- Animated Counter ---------------------------- */
function AnimatedCounter({ end, duration = 5000, suffix = "" }: { end: number, duration?: number, suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) {
      setCount(0);
      return;
    }

    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 5);
      setCount(Math.floor(easeOut * end));

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      } else {
        setCount(end);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [isVisible, end, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

/* -- Smooth Typography Component --------------- */
function SmoothTypography({ children, className, delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(25px)',
        filter: isVisible ? 'blur(0px)' : 'blur(5px)',
        transition: `opacity 1.2s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s, transform 1.2s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s, filter 1.2s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/* -- Heritage & Craftsmanship Section ------------- */
export function HeritageSection() {
  return (
    <section className="py-6 md:py-10 relative text-center px-4 overflow-hidden bg-[var(--ivory)]">
      <div className="absolute inset-0 opacity-50 mix-blend-multiply pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(194,155,87,0.1) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(107,29,21,0.05) 0%, transparent 40%)'
        }}>
      </div>
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: "url('/generated-home/sg-thread-field.svg')",
          backgroundSize: 'cover'
        }}>
      </div>

      <div className="max-w-5xl mx-auto mb-6 md:mb-14 relative z-10">
        <SmoothTypography delay={0}>
          <h2 className="text-2xl md:text-3xl font-montserrat tracking-[0.15em] text-[var(--charcoal)] font-semibold mb-6 uppercase">
            Artisans and Weavers
          </h2>
        </SmoothTypography>
        <SmoothTypography delay={0.2}>
          <p className="text-[14px] md:text-[15px] font-montserrat text-[var(--muted)] leading-[1.8] md:leading-relaxed max-w-4xl mx-auto px-2 md:px-0">
            Artisans and weavers are the guardians of heritage and sustainability in the fashion industry. They use their skills to create intricate handweaving pieces that tell stories and carry cultural traditions. These craftsmen prioritize sustainable materials and traditional techniques, advocating for eco-friendly fashion. Their creations, often made from pure natural fibers, offer unparalleled comfort and durability, defying the trends of fast fashion. Supporting artisans and weavers means embracing timeless artistry, preserving heritage, and making a conscious choice for a more sustainable and earth-friendly lifestyle.
          </p>
        </SmoothTypography>
      </div>

      <div className="w-full max-w-[1600px] mx-auto mb-8 md:mb-20 relative z-10">
        <div className="w-full h-[300px] md:h-[500px] lg:h-[600px] overflow-hidden rounded-xl shadow-2xl">
          <img
            src="/new_artisan_weaver.png"
            alt="Artisan Weaver working on handloom"
            className="w-full h-full object-cover object-center"
          />
        </div>
      </div>

      <div className="w-[100vw] relative left-1/2 -translate-x-1/2 bg-gradient-to-r from-[var(--burgundy-dark)] via-[var(--burgundy)] to-[var(--burgundy-dark)] py-14 px-4 shadow-[0_20px_50px_rgba(46,16,101,0.3)] mt-12 border-y border-[var(--gold)]/40 z-20">
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "url('/generated-home/sg-motif-repeat.svg')", backgroundSize: '150px' }} />

        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-6 text-center relative z-20">
          <div className="flex flex-col items-center justify-center relative">
            <h3 className="text-5xl md:text-6xl font-playfair text-[var(--gold-light)] mb-3 drop-shadow-lg">
              <AnimatedCounter end={300} suffix="K+" />
            </h3>
            <p className="text-[11px] md:text-xs tracking-[0.25em] font-montserrat uppercase text-white font-bold">Instagram Family</p>
            <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-20 bg-[var(--gold)] opacity-30" />
          </div>
          <div className="flex flex-col items-center justify-center relative">
            <h3 className="text-5xl md:text-6xl font-playfair text-[var(--gold-light)] mb-3 drop-shadow-lg">
              <AnimatedCounter end={2} suffix="Lakh" />
            </h3>
            <p className="text-[11px] md:text-xs tracking-[0.25em] font-montserrat uppercase text-white font-bold">Artisans Network</p>
            <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-20 bg-[var(--gold)] opacity-30" />
          </div>
          <div className="flex flex-col items-center justify-center relative">
            <h3 className="text-5xl md:text-6xl font-playfair text-[var(--gold-light)] mb-3 drop-shadow-lg">
              <AnimatedCounter end={120} suffix="%" />
            </h3>
            <p className="text-[11px] md:text-xs tracking-[0.25em] font-montserrat uppercase text-white font-bold">Sustainable Art</p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* -- Signature Lookbook Section -------------------- */
export function LookbookSection() {
  const [activeIndex, setActiveIndex] = useState(0)
  const blockRefs = useRef<(HTMLDivElement | null)[]>([])

  const stories = [
    {
      image: "/story_spinner.png",
      title: "The Spinner of Dreams",
      body: "At the heart of every handwoven saree is the painstaking process of spinning the perfect thread, a task mastered with years of dedication. The spinning wheel sings a rhythmic song, turning raw cotton into fine threads, which later becomes the elegant saree loved by our patrons. Their work is the foundation of the handloom tradition, ensuring that the magic of the weaving legacy continues to thrive.",
      watermark: "url('/generated-home/sg-loom-peacock.svg')",
    },
    {
      image: "/story_loom.png",
      title: "The Master of the Loom",
      body: "Weaving is more than a craft—it is a lifelong devotion to artistry. Sitting at the wooden loom in the heart of the village, they transform fine cotton threads into exquisite handwoven sarees, each a testament to unparalleled skill. Steady hands and sharp focus breathe life into every warp and weft, ensuring that each A1 TEX saree carries a story of dedication, resilience, and cultural pride.",
      watermark: "url('/generated-home/sg-thread-field.svg')",
    },
    {
      image: "/lookbook_detail.png",
      title: "The Essence of Tradition",
      body: "With skilled hands and unwavering dedication, our artisans bring to life the delicate threads of handloom sarees. Every weave crafted is a reflection of rich textile heritage, passed down through generations. Intricate work on the loom symbolizes patience, precision, and passion—creating fabrics that are not just sarees but timeless pieces of art, carrying the soul of A1 TEX.",
      watermark: "url('/generated-home/sg-motif-repeat.svg')",
    },
  ]

  useEffect(() => {
    const observers = blockRefs.current.map((ref, index) => {
      if (!ref) return null
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveIndex(index)
            }
          })
        },
        { threshold: 0.4 }
      )
      observer.observe(ref)
      return observer
    })
    return () => observers.forEach((obs) => obs?.disconnect())
  }, [])

  return (
    <section className="relative border-t border-[var(--ivory-dark)] bg-[var(--ivory)]">
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 80% 20%, rgba(194, 155, 87, 0.12) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(107, 29, 21, 0.06) 0%, transparent 60%), linear-gradient(to bottom right, var(--ivory) 0%, var(--gold-pale) 100%)'
        }} />

        <svg className="absolute w-full h-full opacity-60" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
          <g stroke="var(--gold)" fill="none" strokeWidth="1" opacity="0.5">
            <path d="M-200,300 C100,500 400,100 800,400 C1200,700 1400,200 1600,400" />
            <path d="M-200,350 C150,550 450,150 850,450 C1250,750 1450,250 1650,450" />
            <path d="M-200,400 C200,600 500,200 900,500 C1300,800 1500,300 1700,500" />
          </g>
          <g stroke="var(--burgundy)" fill="none" strokeWidth="1" opacity="0.2">
            <path d="M1200,-200 C900,100 1100,400 800,800 C500,1200 200,900 0,1100" />
            <path d="M1150,-200 C850,150 1050,450 750,850 C450,1250 150,950 -50,1150" />
          </g>
          <g opacity="0.15" stroke="var(--gold)" fill="none">
            <circle cx="800" cy="200" r="150" strokeWidth="2" strokeDasharray="10 15" />
            <circle cx="800" cy="200" r="250" strokeWidth="1" strokeDasharray="5 20" />
            <circle cx="800" cy="200" r="350" strokeWidth="0.5" />
          </g>
          <g opacity="0.08" stroke="var(--burgundy)" fill="none">
            <circle cx="100" cy="900" r="200" strokeWidth="1" strokeDasharray="10 30" />
            <circle cx="100" cy="900" r="300" strokeWidth="0.5" />
          </g>
        </svg>

        <div className="absolute top-0 right-0 w-full h-full opacity-[0.05]" style={{ backgroundImage: "url('/generated-home/sg-motif-repeat.svg')", backgroundSize: "300px", backgroundRepeat: "repeat" }} />
      </div>

      <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row relative z-10">

        <div className="hidden lg:flex lg:w-[48%] flex-shrink-0 lg:sticky lg:top-0 lg:h-screen items-center justify-center px-6 lg:px-12 py-12 lg:py-16">
          <div className="relative w-full max-w-[420px] lg:max-w-[460px]" style={{ aspectRatio: '4/5' }}>
            {stories.map((s, idx) => (
              <img
                key={idx}
                src={s.image}
                alt={s.title}
                className="absolute inset-0 w-full h-full object-cover shadow-xl"
                style={{
                  opacity: activeIndex === idx ? 1 : 0,
                  transform: activeIndex === idx ? 'scale(1)' : 'scale(1.03)',
                  transition: 'opacity 0.8s ease-in-out, transform 0.8s ease-in-out',
                  zIndex: activeIndex === idx ? 10 : 0,
                }}
              />
            ))}
            <p className="absolute -bottom-7 left-0 text-[11px] font-montserrat text-[var(--muted)] italic tracking-wide">
              The Hands Behind the Heritage
            </p>
          </div>
        </div>


        <div className="w-full lg:w-[52%] flex flex-col">
          {stories.map((s, idx) => (
            <div
              key={idx}
              ref={(el) => { blockRefs.current[idx] = el }}
              className="min-h-screen lg:min-h-screen flex flex-col justify-center px-6 lg:px-14 py-16 lg:py-0 relative"
            >
              <div
                className="absolute right-0 top-1/2 -translate-y-1/2 w-64 h-64 opacity-[0.04] pointer-events-none"
                style={{
                  backgroundImage: s.watermark,
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                }}
              />

              <p className="text-[11px] tracking-[0.25em] font-montserrat uppercase text-[var(--gold)] mb-4">
                {String(idx + 1).padStart(2, '0')}&nbsp;&nbsp;/&nbsp;&nbsp;{String(stories.length).padStart(2, '0')}
              </p>

              <h3 className="text-2xl md:text-3xl lg:text-4xl font-montserrat text-[var(--charcoal)] font-semibold mb-6 leading-snug">
                {s.title}
              </h3>

              <div className="block lg:hidden w-full max-w-[420px] mx-auto mb-12 relative" style={{ aspectRatio: '4/5' }}>
                <img src={s.image} className="absolute inset-0 w-full h-full object-cover shadow-xl rounded-md" alt={s.title} />
                <p className="absolute -bottom-7 left-0 text-[11px] font-montserrat text-[var(--muted)] italic tracking-wide w-full text-center">
                  The Hands Behind the Heritage
                </p>
              </div>

              <div className="w-12 h-[2px] bg-[var(--gold)] mb-6 rounded-full" />

              <p className="text-[14px] md:text-[15px] text-[var(--muted)] leading-[2] font-montserrat max-w-md">
                {s.body}
              </p>

              <div className="flex gap-2 mt-10">
                {stories.map((_, di) => (
                  <span
                    key={di}
                    className="block h-[3px] rounded-full"
                    style={{
                      width: di === activeIndex ? '36px' : '14px',
                      backgroundColor: di === activeIndex ? 'var(--burgundy)' : 'var(--ivory-dark)',
                      transition: 'width 0.4s ease, background-color 0.4s ease',
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
/* â”€â”€ Offers Strip (Hidden) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function OffersStrip() {
  return null
}

function LoyaltyBanner() {
  return null
}








/* -- Founder's Note Section --------------- */
export function FounderNoteSection() {
  return (
    <section className="relative w-full overflow-hidden bg-[#fffcf5] py-8 md:py-24 border-t border-[rgba(201,168,76,0.3)]">
      {/* Background Motifs */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: "url('/generated-home/sg-motif-repeat.svg')", backgroundSize: '150px' }}
      />

      <div className="relative z-10 max-w-[1300px] mx-auto px-6 md:px-10">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

          {/* Visual Side */}
          <div className="w-full lg:w-[45%] relative group">
            <div className="absolute inset-0 border-2 border-[var(--gold)] translate-x-4 translate-y-4 md:translate-x-6 md:translate-y-6 -z-10 transition-transform duration-700 group-hover:translate-x-2 group-hover:translate-y-2"></div>
            <div className="relative aspect-[3/4] overflow-hidden shadow-2xl">
              <img
                src="/founder_portrait.png"
                alt="Founder of A1 TEX"
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--burgundy-dark)]/80 via-transparent to-transparent"></div>
              <div className="absolute bottom-6 left-6 text-white">
                <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-[var(--gold)] mb-2">Admin / Founder</p>
                <p className="text-2xl tracking-wide" style={{ fontFamily: 'Playfair Display, serif' }}>
                  SandhiyaDhinesh
                </p>
              </div>
            </div>
          </div>

          {/* Text Side */}
          <div className="w-full lg:w-[55%] flex flex-col justify-center">
            <div className="inline-flex items-center gap-4 mb-6">
              <span className="h-[1px] w-12 bg-[var(--gold)]"></span>
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-[var(--gold)]">
                A1 TEX Story
              </span>
            </div>

            <h2
              className="text-3xl md:text-5xl leading-tight text-[var(--burgundy-dark)] mb-8"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              Preserving the Soul of Tamil Nadu&apos;s Weaves.
            </h2>

            <div className="space-y-6 text-[14px] md:text-[15px] text-[var(--charcoal)]/90 leading-relaxed max-w-lg">
              <p>
                &ldquo;When we started A1 TEX, it wasn&apos;t just about selling sarees. It was about honoring the hands that weave them. Every thread carries the weight of centuries-old tradition, woven meticulously by artisans who pour their heart into the loom.&rdquo;
              </p>
              <p>
                &ldquo;Our mission is to bring you the absolute purest, most authentic handlooms without compromise. We travel to the deepest corners of Kanchipuram and beyond to curate pieces that aren&apos;t just garments, but heirlooms.&rdquo;
              </p>
              <p className="italic text-lg text-[var(--burgundy)]" style={{ fontFamily: 'Playfair Display, serif' }}>
                &ldquo;Thank you for being part of this journey. Wear it with pride.&rdquo;
              </p>
            </div>

            <div className="mt-12">
              {/* Elegant Signature */}
              <p
                className="text-5xl text-[var(--burgundy-dark)] opacity-90"
                style={{ fontFamily: "'Brush Script MT', 'Great Vibes', cursive, serif", transform: "rotate(-3deg)" }}
              >
                SandhiyaDhinesh
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--charcoal)]/50 mt-3 ml-2">
                Founder, A1 TEX
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}