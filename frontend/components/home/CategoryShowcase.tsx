'use client'

import Link from 'next/link'
import { useState } from 'react'

export interface Category {
  id: string
  name: string
  description: string
  image: string
  href: string
  count: number
}

/* ── Scalloped Frame Card Component ──────────────────────────────────────── */
function ScallopedCard({ category, index }: { category: Category; index: number }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Link
      href={category.href}
      className="group block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative">
        {/* Scalloped Border Frame using SVG */}
        <div
          className="relative overflow-hidden transition-transform duration-500 ease-out"
          style={{
            transform: isHovered ? 'scale(1.03)' : 'scale(1)',
          }}
        >
          {/* Main scalloped frame SVG */}
          <svg
            viewBox="0 0 320 420"
            className="w-full h-auto"
            style={{ filter: 'drop-shadow(0 8px 24px rgba(15, 23, 42, 0.12))' }}
          >
            <defs>
              {/* Scalloped clip path */}
              <clipPath id={`scallop-clip-${index}`}>
                <path
                  d="M40,20 
                     Q55,10 70,20 Q85,10 100,20 Q115,10 130,20 Q145,10 160,20 Q175,10 190,20 Q205,10 220,20 Q235,10 250,20 Q265,10 280,20
                     Q300,35 300,55 Q310,70 300,85 Q310,100 300,115 Q310,130 300,145 Q310,160 300,175 Q310,190 300,205
                     Q310,220 300,235 Q310,250 300,265 Q310,280 300,295 Q310,310 300,325 Q310,340 300,355
                     Q300,385 280,400
                     Q265,410 250,400 Q235,410 220,400 Q205,410 190,400 Q175,410 160,400 Q145,410 130,400 Q115,410 100,400 Q85,410 70,400 Q55,410 40,400
                     Q20,385 20,355 Q10,340 20,325 Q10,310 20,295 Q10,280 20,265 Q10,250 20,235 Q10,220 20,205
                     Q10,190 20,175 Q10,160 20,145 Q10,130 20,115 Q10,100 20,85 Q10,70 20,55
                     Q20,35 40,20 Z"
                />
              </clipPath>
            </defs>

            {/* Frame border with scalloped edge */}
            <path
              d="M40,20 
                 Q55,10 70,20 Q85,10 100,20 Q115,10 130,20 Q145,10 160,20 Q175,10 190,20 Q205,10 220,20 Q235,10 250,20 Q265,10 280,20
                 Q300,35 300,55 Q310,70 300,85 Q310,100 300,115 Q310,130 300,145 Q310,160 300,175 Q310,190 300,205
                 Q310,220 300,235 Q310,250 300,265 Q310,280 300,295 Q310,310 300,325 Q310,340 300,355
                 Q300,385 280,400
                 Q265,410 250,400 Q235,410 220,400 Q205,410 190,400 Q175,410 160,400 Q145,410 130,400 Q115,410 100,400 Q85,410 70,400 Q55,410 40,400
                 Q20,385 20,355 Q10,340 20,325 Q10,310 20,295 Q10,280 20,265 Q10,250 20,235 Q10,220 20,205
                 Q10,190 20,175 Q10,160 20,145 Q10,130 20,115 Q10,100 20,85 Q10,70 20,55
                 Q20,35 40,20 Z"
              fill="#FAFAFC"
              stroke="#0F172A"
              strokeWidth="2.5"
            />

            {/* Inner white padding */}
            <path
              d="M48,28 
                 Q60,20 72,28 Q84,20 96,28 Q108,20 120,28 Q132,20 144,28 Q156,20 168,28 Q180,20 192,28 Q204,20 216,28 Q228,20 240,28 Q252,20 264,28 Q276,20 288,28
                 Q292,40 292,52 Q300,64 292,76 Q300,88 292,100 Q300,112 292,124 Q300,136 292,148 Q300,160 292,172 Q300,184 292,196
                 Q300,208 292,220 Q300,232 292,244 Q300,256 292,268 Q300,280 292,292 Q300,304 292,316 Q300,328 292,340
                 Q292,368 276,384 Q276,384 264,392 Q252,384 240,392 Q228,384 216,392 Q204,384 192,392 Q180,384 168,392 Q156,384 144,392 Q132,384 120,392 Q108,384 96,392 Q84,384 72,392 Q60,384 48,384
                 Q36,376 28,360 Q28,340 28,328 Q20,316 28,304 Q20,292 28,280 Q20,268 28,256 Q20,244 28,232 Q20,220 28,208
                 Q20,196 28,184 Q20,172 28,160 Q20,148 28,136 Q20,124 28,112 Q20,100 28,88 Q20,76 28,64 Q20,52 28,40
                 Q28,36 48,28 Z"
              fill="white"
            />

            {/* Image container */}
            <foreignObject
              x="35"
              y="35"
              width="250"
              height="340"
              clipPath={`url(#scallop-clip-${index})`}
            >
              <div
                className="w-full h-full bg-cover bg-top transition-transform duration-700 ease-out"
                style={{
                  backgroundImage: `url(${category.image})`,
                  transform: isHovered ? 'scale(1.08)' : 'scale(1)',
                }}
              />
            </foreignObject>
          </svg>

          {/* Bottom text overlay */}
          <div
            className="absolute bottom-8 left-0 right-0 text-center transition-all duration-500"
            style={{
              transform: isHovered ? 'translateY(-8px)' : 'translateY(0)',
            }}
          >
            <h3
              className="text-2xl md:text-3xl font-bold tracking-wide"
              style={{
                fontFamily: 'Playfair Display, serif',
                color: 'var(--charcoal)',
                textShadow: '0 2px 12px rgba(255,255,255,0.8)',
              }}
            >
              {category.name}
            </h3>
            <p
              className="text-xs tracking-[2px] uppercase mt-1 font-medium"
              style={{ color: 'var(--muted)' }}
            >
              {category.description}
            </p>

            {/* Product count badge */}
            <div
              className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-[10px] font-bold transition-opacity duration-300 shadow-xs"
              style={{
                background: 'var(--brand-blue)',
                color: 'white',
                opacity: isHovered ? 1 : 0.9,
              }}
            >
              <span>{category.count}</span>
              <span>Products</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

/* ── Main Categories Showcase Section ──────────────────────────────────── */
export default function CategoryShowcase({ categories }: { categories: Category[] }) {
  if (!categories || categories.length === 0) {
    return null
  }

  return (
    <section className="py-16 md:py-24 bg-[var(--ivory)] border-y border-[var(--ivory-dark)]">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <p
            className="text-xs tracking-[4px] uppercase font-bold mb-3 text-[var(--gold)]"
          >
            Explore Our Collections
          </p>
          <h2
            className="text-3xl md:text-5xl font-bold mb-4 text-[var(--charcoal)]"
            style={{
              fontFamily: 'Playfair Display, serif',
            }}
          >
            Shop by Category
          </h2>
          <div
            className="w-20 h-1 mx-auto rounded-full bg-[var(--gold)]"
          />
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-6">
          {categories.map((category, index) => (
            <ScallopedCard
              key={category.id}
              category={category}
              index={index}
            />
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-12">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-8 py-3.5 text-xs font-bold uppercase tracking-[3px] rounded-lg text-white no-underline transition-all duration-300 hover:gap-4 shadow-md bg-[var(--charcoal)] hover:bg-[var(--brand-blue)]"
          >
            View All Collections
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}
