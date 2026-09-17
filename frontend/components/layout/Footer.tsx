'use client'

import { useState, useEffect, type ComponentType } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Heart, Home, Menu, ShoppingBag, Store, Instagram } from 'lucide-react'
import { useCart } from '@/components/cart/CartContext'
import { useWishlist } from '@/components/wishlist/WishlistContext'
import MobileNavDrawer from '@/components/layout/MobileNavDrawer'

const WhatsappIcon = (props: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
)
import { fetchNavigation } from '@/lib/api/storefront'
import type { MainCategory } from '@/lib/megaMenuData'

const policyLinks = [
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms & Conditions', href: '/terms-conditions' },
  { label: 'Shipping & Policy', href: '/shipping-and-refund' },
]

const infoLinks = [
  { label: 'Our Story', href: '/about' },
  { label: 'Contact Us', href: '/contact' },
]

const FOOTER_LOGO_SRC = '/a1-tex-logo-transparent.png'
const FOOTER_LOGO_ALT = "A1 TEX - India's No.1 online saree shopping"

const mobileNavItems = [
  { label: 'Home', href: '/', Icon: Home },
  { label: 'Shop', href: '/shop', Icon: Store },
  { label: 'Cart', action: 'cart', Icon: ShoppingBag },
  { label: 'Wishlist', href: '/wishlist', Icon: Heart },
  { label: 'Menu', action: 'menu', Icon: Menu },
]

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group relative inline-block pb-1 text-[13px] no-underline transition-all duration-300"
      style={{ color: 'var(--footer-text)' }}
    >
      <span className="relative z-10 transition-colors duration-300 group-hover:text-[var(--footer-accent)]">
        {label}
      </span>
      <span className="absolute bottom-0 left-0 h-[1px] w-0 bg-[var(--footer-accent)] transition-all duration-300 group-hover:w-full" />
    </Link>
  )
}

export default function Footer({ hideMobileNav = false }: { hideMobileNav?: boolean } = {}) {
  const pathname = usePathname()
  const isProductPage = Boolean(pathname?.startsWith('/products') || pathname?.startsWith('/p/'))
  const isCheckout = hideMobileNav || Boolean(pathname?.startsWith('/checkout')) || isProductPage
  const { setDrawerOpen, totalItems, hydrated } = useCart()
  const { totalItems: wishlistTotal } = useWishlist()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [menuData, setMenuData] = useState<MainCategory[]>([])
  
  const socials: { Icon: React.ComponentType<{ className?: string }>; href: string; label: string }[] = [
    { Icon: Instagram, href: 'https://www.instagram.com/elampillai_silks?stkn=OGJ3eGRzYmw0OWN1', label: 'Instagram' },
    { Icon: WhatsappIcon, href: 'https://wa.me/919514461405', label: 'WhatsApp' }
  ]

  useEffect(() => {
    let active = true
    fetchNavigation().then(items => {
      if (active) setMenuData(items)
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <>
      <footer
        className="relative pb-24 md:pb-0"
        style={{
          background: 'var(--footer-bg)',
          color: 'var(--footer-text)',
          paddingTop: '28px',
          fontFamily: '"DM Sans", sans-serif',
          fontSize: '13px',
          lineHeight: '21px',
          fontWeight: 400,
        }}
      >
        <div className="mx-auto grid max-w-[1480px] grid-cols-2 gap-x-4 gap-y-7 px-6 pb-5 lg:grid-cols-[1.5fr_1fr_1fr_1.25fr] lg:gap-9 lg:px-8 xl:px-10">
          <div className="col-span-2 lg:col-span-1">
            <Link
              href="/"
              className="mb-4 flex w-full max-w-[190px] items-center justify-center overflow-hidden rounded-md border p-2.5 shadow-[0_16px_34px_rgba(0,0,0,0.2)] transition-transform duration-300 hover:-translate-y-0.5 sm:max-w-[220px]"
              style={{ background: 'var(--ivory)', borderColor: 'var(--footer-accent)' }}
            >
              <Image
                src={FOOTER_LOGO_SRC}
                alt={FOOTER_LOGO_ALT}
                width={1400}
                height={520}
                sizes="(max-width: 640px) 200px, 240px"
                className="h-auto w-full object-contain"
              />
            </Link>

            <h4 className="footer-section-heading mb-3 text-[12px] font-bold uppercase tracking-[2px]">
              Brand Story
            </h4>
            <p className="max-w-sm text-[12px] leading-relaxed" style={{ color: 'var(--footer-muted)' }}>
              <strong className="font-semibold uppercase tracking-widest" style={{ color: 'var(--footer-text)', fontSize: '13px' }}>
                A1 TEX
              </strong>{' '}
              offers beautifully crafted handloom sarees that blend traditional artistry with modern simplicity.
            </p>
          </div>

          <div>
            <h4 className="footer-section-heading mb-2 md:mb-3 text-[12px] font-bold uppercase tracking-[2px]">
              Policies
            </h4>
            <div className="flex flex-col items-start space-y-2">
              {policyLinks.map(link => (
                <FooterLink key={link.label} {...link} />
              ))}
            </div>
          </div>

          <div>
            <h4 className="footer-section-heading mb-2 md:mb-3 text-[12px] font-bold uppercase tracking-[2px]">
              Info
            </h4>
            <div className="flex flex-col items-start space-y-2">
              {infoLinks.map(link => (
                <FooterLink key={link.label} {...link} />
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--footer-border)]">
              <p className="text-[11px] leading-relaxed text-[var(--footer-muted)]">
                <span className="font-semibold text-[var(--footer-text)]">A1 Tex &amp; elampillai_silks</span><br />
                Elampillai, Salem, Tamil Nadu - 637502
              </p>
              <a
                href="https://maps.google.com/?q=A1+Tex+%26+elampillai_silks+Elampillai"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-[11px] font-medium text-[var(--footer-accent)] hover:underline"
              >
                View on Google Maps &rarr;
              </a>
              <div className="mt-2 text-[11px] text-[var(--footer-muted)]">
                <span>Phone / WhatsApp: </span>
                <a href="tel:+919514461405" className="font-semibold text-[var(--footer-text)] hover:text-[var(--footer-accent)] transition-colors">
                  +91 95144 61405
                </a>
              </div>
            </div>
          </div>

          <div className="col-span-2 lg:col-span-1">
            <h4 className="footer-section-heading mb-3 lg:mb-5 text-[12px] font-bold uppercase tracking-[2px]">
              Follow Us
            </h4>
            <div
              className="flex w-fit items-center justify-center gap-5 rounded-full px-5 py-2 lg:px-6 lg:py-2.5 shadow-sm"
              style={{ background: 'var(--footer-accent)' }}
            >
              {socials.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-transform duration-300 hover:scale-125 hover:-translate-y-0.5"
                  style={{ color: '#222' }}
                >
                  <Icon className="h-[16px] w-[16px]" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[1480px] px-6 pb-3 lg:px-8 xl:px-10">
          <div className="footer-bottom-divider" />
          <div className="flex flex-col items-center justify-center text-center">
            <span className="text-[12px] tracking-wider" style={{ color: 'var(--footer-muted)' }}>
              &copy; 2026 A1 Tex. All rights reserved.
            </span>
          </div>
        </div>
      </footer>
      {!isCheckout && (
        <div className="fixed bottom-0 left-0 right-0 w-full z-[100] flex items-center justify-between bg-white/95 px-1 py-1.5 shadow-[0_-4px_24px_rgba(0,0,0,0.04)] backdrop-blur-xl border-t border-[var(--ivory-dark)] md:hidden pb-safe">
          {mobileNavItems.map(({ label, href, action, Icon }) => {
            const isActive = action === 'cart'
              ? pathname === '/cart'
              : href ? (pathname === href || (href !== '/' && (pathname.startsWith(href) || (href === '/shop' && pathname.startsWith('/products'))))) : false;

            if (action === 'cart') {
              return (
                <button
                  type="button"
                  key={label}
                  onClick={() => setDrawerOpen(true)}
                  className="group relative flex min-w-0 flex-1 flex-col items-center justify-center pt-2 pb-2 no-underline transition-colors"
                >
                  <div className={`flex flex-col items-center justify-center transition-all duration-300 ${isActive ? 'text-[var(--burgundy)]' : 'text-[#666] group-hover:text-[var(--burgundy-dark)]'}`}>
                    <div className="relative">
                      <Icon aria-hidden="true" size={22} strokeWidth={isActive ? 2.2 : 1.5} />
                      {hydrated && totalItems > 0 && (
                        <span className="absolute -top-1.5 -right-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--burgundy)] px-1 text-[9px] font-bold text-white shadow-sm">
                          {totalItems}
                        </span>
                      )}
                    </div>
                    <span className={`max-w-full truncate text-[9px] font-medium tracking-[0.05em] uppercase mt-1 ${isActive ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
                    {isActive && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded bg-[var(--gold)] shadow-sm" />}
                  </div>
                </button>
              )
            }

            if (action === 'menu') {
              return (
                <button
                  type="button"
                  key={label}
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="group relative flex min-w-0 flex-1 flex-col items-center justify-center pt-2 pb-2 no-underline transition-colors"
                >
                  <div className="flex flex-col items-center justify-center transition-all duration-300 text-[#666] group-hover:text-[var(--burgundy-dark)]">
                    <div className="relative">
                      <Icon aria-hidden="true" size={22} strokeWidth={1.5} />
                    </div>
                    <span className="max-w-full truncate text-[9px] font-medium tracking-[0.05em] uppercase mt-1 opacity-70">{label}</span>
                  </div>
                </button>
              )
            }

            const isWishlist = label === 'Wishlist'
            return (
              <Link
                key={label}
                href={href || '/'}
                className="group relative flex min-w-0 flex-1 flex-col items-center justify-center pt-2 pb-2 no-underline transition-colors"
              >
                <div className={`flex flex-col items-center justify-center transition-all duration-300 ${isActive ? 'text-[var(--burgundy)]' : 'text-[#666] group-hover:text-[var(--burgundy-dark)]'}`}>
                  <div className="relative">
                    <Icon aria-hidden="true" size={22} strokeWidth={isActive ? 2.2 : 1.5} />
                    {isWishlist && wishlistTotal > 0 && (
                      <span className="absolute -top-1.5 -right-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--burgundy)] px-1 text-[9px] font-bold text-white shadow-sm">
                        {wishlistTotal}
                      </span>
                    )}
                  </div>
                  <span className={`max-w-full truncate text-[9px] font-medium tracking-[0.05em] uppercase mt-1 ${isActive ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
                  {isActive && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded bg-[var(--gold)] shadow-sm" />}
                </div>
              </Link>
            )
          })}
        </div>
      )}
      <MobileNavDrawer 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
        menuData={menuData}
        position="right" 
      />
    </>
  )
}
