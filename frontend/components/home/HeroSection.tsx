'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { requestHomeData } from '@/components/home/HomeComponents'
import { resolveImageUrl } from '@/lib/api/client'
import type { StorefrontBanner } from '@/lib/api/types'

const BG_SAREE_IMG = '/new_hero_bg_saree.png'

function DynamicBannerSlide({ banner }: { banner: StorefrontBanner }) {
  const ctaUrl = banner.ctaUrl || '/shop'
  const ctaText = banner.ctaLabel?.trim() || 'Explore Collection'
  const bgImg = banner.imageUrl ? resolveImageUrl(banner.imageUrl) : BG_SAREE_IMG

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[var(--charcoal)]">
      <div
        className="absolute inset-0 scale-105 bg-cover bg-center"
        style={{
          backgroundImage: `url('${bgImg}')`,
          animation: 'kenburns 25s infinite alternate ease-in-out',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />
      <div className="relative z-10 mx-auto flex h-full w-full max-w-[1200px] flex-col items-center justify-end px-4 pb-10 text-center sm:px-6 sm:pb-12 md:pb-16 lg:px-8">
        {banner.title?.trim() && (
          <h2 className="font-playfair text-lg sm:text-2xl md:text-3xl lg:text-4xl tracking-wide text-white drop-shadow-xl max-w-2xl leading-snug break-words">
            {banner.title}
          </h2>
        )}
        {banner.subtitle?.trim() && (
          <p className="mt-1.5 sm:mt-2.5 max-w-lg text-[11px] sm:text-sm md:text-base leading-relaxed tracking-normal text-white/90">
            {banner.subtitle}
          </p>
        )}
        <Link
          href={ctaUrl}
          className="mt-3 sm:mt-5 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] px-5 py-2 sm:px-7 sm:py-2.5 text-[10px] sm:text-xs font-bold uppercase tracking-[0.16em] text-[var(--burgundy-dark)] no-underline shadow-[0_4px_16px_rgba(245,158,11,0.3)] transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_20px_rgba(245,158,11,0.45)] cursor-pointer z-20"
        >
          {ctaText}
        </Link>
      </div>
    </div>
  )
}

/* ── Cinematic Hero Section (Slide 1) ──────────────────────────── */
function CinematicHero() {
  return (
    <div className="relative w-full h-full overflow-hidden flex items-center justify-center bg-[var(--charcoal)]">
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
        className="absolute inset-0 z-10 opacity-75"
        style={{
          background: 'linear-gradient(to top, rgba(15,10,25,0.95) 0%, rgba(15,10,25,0.45) 45%, rgba(15,10,25,0.2) 100%)'
        }}
      />
      
      {/* Luxury floral subtle overlay */}
      <div 
        className="absolute inset-0 z-10 opacity-15 pointer-events-none" 
        style={{ 
          backgroundImage: "url('/generated-home/sg-motif-repeat.svg')", 
          backgroundSize: "300px", 
          backgroundRepeat: "repeat" 
        }}
      />

      <div className="relative z-20 max-w-[1200px] w-full mx-auto px-4 lg:px-8 text-center flex flex-col items-center justify-end h-full pb-10 sm:pb-12 md:pb-16">
        {/* Animated Luxury Badge */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
          <span
            className="inline-flex items-center gap-1.5 px-4 py-1.5 sm:px-5 sm:py-2 rounded-full text-[9px] sm:text-[11px] font-montserrat tracking-[0.22em] font-semibold uppercase mb-3 sm:mb-4 backdrop-blur-xl border border-[var(--gold)]/40 text-[var(--gold-light)] shadow-[0_4px_25px_rgba(245,158,11,0.2)] bg-black/40"
          >
            <Sparkles size={12} className="text-[var(--gold)]" />
            The New Era of Royal Handloom
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
            textShadow: '0 8px 30px rgba(0,0,0,0.85)'
          }}
        >
          <span>A1</span> <span className="text-[var(--gold)] italic font-light">TEX</span>
        </h2>
        
        {/* Cinematic Subtitle */}
        <p
          className="mt-2 sm:mt-3 text-xs sm:text-sm md:text-base max-w-xl font-light text-white/90 leading-relaxed tracking-normal animate-fade-in-up font-montserrat"
          style={{ animationDelay: '0.6s', animationFillMode: 'both' }}
        >
          Experience timeless elegance woven into every thread. Handcrafted luxury sarees tailored for perfection and grace.
        </p>

        {/* Action Button */}
        <div className="mt-4 sm:mt-6 animate-fade-in-up flex flex-wrap justify-center gap-4" style={{ animationDelay: '0.8s', animationFillMode: 'both' }}>
          <Link
            href="/shop"
            className="px-6 py-2.5 sm:px-8 sm:py-3 rounded-full text-[11px] sm:text-xs font-bold tracking-[0.18em] uppercase transition-all duration-300 no-underline shadow-[0_6px_20px_rgba(245,158,11,0.3)] hover:scale-105 hover:shadow-[0_10px_25px_rgba(245,158,11,0.45)] bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-[var(--burgundy-dark)]"
          >
            Explore All Collections
          </Link>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
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
    </div>
  )
}

/* ── Slide 2: Festive Heritage Edit ────────────────────────────── */
function Slide2() {
  return (
    <div className="relative w-full h-full overflow-hidden flex items-center justify-center bg-[var(--burgundy)]">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 scale-105"
        style={{
          backgroundImage: `url('${BG_SAREE_IMG}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          animation: 'kenburns 25s infinite alternate ease-in-out',
        }}
      />
      
      {/* Dark overlay */}
      <div 
        className="absolute inset-0 z-10 opacity-75"
        style={{
          background: 'linear-gradient(to top, rgba(15,10,25,0.95) 0%, rgba(15,10,25,0.45) 45%, rgba(15,10,25,0.2) 100%)'
        }}
      />
      
      <div className="relative z-20 max-w-[1200px] w-full mx-auto px-4 lg:px-8 text-center flex flex-col items-center justify-end h-full pb-10 sm:pb-12 md:pb-16">
        {/* Animated Badge */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
          <span
            className="inline-flex items-center gap-1.5 px-4 py-1.5 sm:px-5 sm:py-2 rounded-full text-[9px] sm:text-[11px] font-montserrat tracking-[0.22em] font-semibold uppercase mb-3 sm:mb-4 backdrop-blur-xl border border-[var(--gold)]/40 text-[var(--gold-light)] shadow-[0_4px_25px_rgba(245,158,11,0.2)] bg-black/40"
          >
            <Sparkles size={12} className="text-[var(--gold)]" />
            Limited Festive Edition
          </span>
        </div>

        {/* Title */}
        <h2
          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-playfair tracking-wide animate-fade-in-up drop-shadow-xl"
          style={{ 
            color: '#FAFAF7', 
            lineHeight: 1.15, 
            animationDelay: '0.4s', 
            animationFillMode: 'both',
            textShadow: '0 8px 30px rgba(0,0,0,0.85)'
          }}
        >
          <span>Royal</span> <span className="text-[var(--gold)] italic font-light">Heritage</span>
        </h2>

        {/* Subtitle */}
        <p
          className="mt-2 sm:mt-3 text-xs sm:text-sm md:text-base max-w-xl font-light text-white/90 leading-relaxed tracking-normal animate-fade-in-up font-montserrat"
          style={{ animationDelay: '0.6s', animationFillMode: 'both' }}
        >
          Pure Kanchipuram Silks and celebratory weaves crafted by master artisans for your special occasions.
        </p>

        {/* Action Button */}
        <div className="mt-4 sm:mt-6 animate-fade-in-up flex flex-wrap justify-center gap-4" style={{ animationDelay: '0.8s', animationFillMode: 'both' }}>
          <Link
            href="/shop"
            className="px-6 py-2.5 sm:px-8 sm:py-3 rounded-full text-[11px] sm:text-xs font-bold tracking-[0.18em] uppercase transition-all duration-300 no-underline shadow-[0_6px_20px_rgba(245,158,11,0.3)] hover:scale-105 hover:shadow-[0_10px_25px_rgba(245,158,11,0.45)] bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-[var(--burgundy-dark)]"
          >
            Explore All Collections
          </Link>
        </div>
      </div>
    </div>
  )
}

/* ── Main Hero Carousel ──────────────────────────── */
export default function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [dynamicBanners, setDynamicBanners] = useState<StorefrontBanner[]>([])

  useEffect(() => {
    let active = true
    requestHomeData().then(data => {
      if (!active) return
      const heroBanners = (data.banners || []).filter(banner => 
        banner.placement === 'home_hero' || 
        banner.placement === 'hero_slider' || 
        banner.placement === 'hero' || 
        banner.placement === 'header_below' ||
        banner.placement === 'main' || 
        !banner.placement
      )
      if (heroBanners.length > 0) {
        setDynamicBanners(heroBanners)
      }
    }).catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const slides = dynamicBanners.length > 0
    ? dynamicBanners.map((banner, index) => ({
        id: `banner-${banner.id || index}`,
        bg: 'var(--charcoal)',
        content: <DynamicBannerSlide banner={banner} />,
      }))
    : [
        { id: 'cinematic', bg: 'var(--charcoal)', content: <CinematicHero /> },
        { id: 'slide2', bg: 'var(--burgundy)', content: <Slide2 /> }
      ]

  const next = () => setCurrentSlide(p => (p + 1) % slides.length)
  const prev = () => setCurrentSlide(p => (p === 0 ? slides.length - 1 : p - 1))

  useEffect(() => {
    const t = setInterval(next, 6000)
    return () => clearInterval(t)
  }, [slides.length])

  return (
    <div
      className="relative w-full overflow-hidden group aspect-[4/5] max-h-[calc(100svh-155px)] md:max-h-none md:aspect-auto md:h-[68vh] lg:h-[82vh] min-h-[350px] md:min-h-[440px]"
    >
      {/* Slide track */}
      <div className="relative w-full h-full bg-[var(--charcoal)]">
        {slides.map((slide, idx) => (
          <div
            key={String(slide.id)}
            className="absolute inset-0 w-full h-full transition-opacity duration-[1000ms] ease-in-out"
            style={{ 
              background: slide.bg,
              opacity: currentSlide === idx ? 1 : 0,
              pointerEvents: currentSlide === idx ? 'auto' : 'none',
              zIndex: currentSlide === idx ? 10 : 1
            }}
          >
            {slide.content}
          </div>
        ))}
      </div>

      {/* Prev button */}
      <button
        onClick={prev}
        className="absolute left-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center text-white opacity-0 md:group-hover:opacity-100 transition-all duration-300 z-20 hover:scale-110 bg-black/40 backdrop-blur-md border border-white/20 hover:border-[var(--gold)] shadow-xl"
        aria-label="Previous slide"
      >
        <ChevronLeft size={24} />
      </button>

      {/* Next button */}
      <button
        onClick={next}
        className="absolute right-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center text-white opacity-0 md:group-hover:opacity-100 transition-all duration-300 z-20 hover:scale-110 bg-black/40 backdrop-blur-md border border-white/20 hover:border-[var(--gold)] shadow-xl"
        aria-label="Next slide"
      >
        <ChevronRight size={24} />
      </button>

      {/* Modern Slide Indicators */}
      <div className="absolute bottom-3.5 sm:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20 bg-black/30 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentSlide(idx)}
            className="p-1 group/dot"
            aria-label={`Go to slide ${idx + 1}`}
          >
            <span
              className={`block rounded-full transition-all duration-300 ${
                currentSlide === idx 
                  ? 'w-6 h-2 bg-[var(--gold)] shadow-[0_0_8px_rgba(245,158,11,0.8)]' 
                  : 'w-2 h-2 bg-white/40 hover:bg-white/80'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
