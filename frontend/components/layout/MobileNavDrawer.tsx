'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Search, ChevronDown, ChevronUp, X, MoveRight, Feather, User, LogIn, UserPlus, ShoppingBag } from 'lucide-react'
import type { MainCategory } from '@/lib/megaMenuData'
import { resolveImageUrl } from '@/lib/api/client'
import { useAuth } from '@/components/auth/AuthContext'

interface MobileNavDrawerProps {
  isOpen: boolean
  onClose: () => void
  menuData: MainCategory[]
  position?: 'left' | 'right'
}

export default function MobileNavDrawer({ isOpen, onClose, menuData, position = 'left' }: MobileNavDrawerProps) {
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [expandedSub, setExpandedSub] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const drawerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { session, logout } = useAuth()

  // Focus the close button when drawer opens
  useEffect(() => {
    if (isOpen && drawerRef.current) {
      const closeBtn = drawerRef.current.querySelector('button[aria-label="Close menu"]');
      if (closeBtn instanceof HTMLElement) {
        setTimeout(() => closeBtn.focus(), 100);
      }
    }
  }, [isOpen]);

  // Close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setExpandedCat(null)
      setExpandedSub(null)
      setSearch('')
    }
  }, [isOpen])

  const toggleCat = (label: string) => {
    setExpandedCat(prev => prev === label ? null : label)
    setExpandedSub(null)
  }

  const toggleSub = (name: string) => {
    setExpandedSub(prev => prev === name ? null : name)
  }

  const filtered = search.trim()
    ? menuData.filter(c =>
        c.label.toLowerCase().includes(search.toLowerCase()) ||
        c.subCategories?.some(s => s.name.toLowerCase().includes(search.toLowerCase()))
      )
    : menuData

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed top-0 z-[201] flex h-full w-[85vw] max-w-[380px] flex-col bg-[#F8FAFC] shadow-2xl transition-transform duration-300 ease-out ${
          position === 'right'
            ? `right-0 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`
            : `left-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#5B0E1E]/40 bg-gradient-to-r from-[#721226] via-[#8B1A1A] to-[#721226] px-4 py-3">
          <Image
            src="/a1-tex-logo-transparent.png"
            alt="A1 TEX"
            width={140}
            height={42}
            className="h-9 w-auto object-contain brightness-0 invert"
          />
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-[#E2E8F0] px-4 py-3">
          <div className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2">
            <Search size={16} className="text-[#64748B]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search categories..."
              className="w-full bg-transparent text-sm text-[#0F172A] outline-none placeholder:text-[#64748B]/60"
            />
          </div>
        </div>

        {/* Category List */}
        <nav className="flex-1 overflow-y-auto overscroll-contain" aria-label="Categories">
          <ul className="py-2">
            {filtered.map(cat => {
              const isBrowseAll = (cat.label || '').toLowerCase().trim() === 'browse all'
              const isExpanded = !isBrowseAll && expandedCat === cat.label
              const hasSubs = !isBrowseAll && cat.subCategories && cat.subCategories.length > 0
              const linkHref = isBrowseAll ? '/shop' : cat.href

              return (
                <li key={cat.label} className="border-b border-[#FEF3C7]/60">
                  <div className="flex items-center">
                    <Link
                      href={linkHref}
                      onClick={onClose}
                      className={`flex-1 px-5 py-3.5 no-underline transition-colors relative ${
                        cat.isHighlighted
                          ? 'font-extrabold tracking-wider !text-[15px] text-[#8B1A1A]'
                          : cat.isSale
                            ? 'text-[#B91C1C] font-bold text-[15px]'
                            : 'text-[#0F172A] font-bold text-[15px]'
                      } hover:bg-[#FDF6F0] hover:text-[#8B1A1A]`}
                    >
                      {cat.label}
                      {cat.isSale && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
                          Sale
                        </span>
                      )}
                    </Link>
                    {hasSubs && (
                      <button
                        onClick={() => toggleCat(cat.label)}
                        className="flex h-full items-center px-4 py-3.5 text-[#334155] transition-colors hover:text-[#8B1A1A]"
                        aria-expanded={isExpanded}
                        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${cat.label}`}
                      >
                        <ChevronDown
                          size={18}
                          className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>
                    )}
                  </div>

                  {/* Subcategories */}
                  {hasSubs && isExpanded && (
                    <ul className="bg-[#F8FAFC] pb-2 border-t border-slate-100">
                      {cat.subCategories!.map(sub => {
                        const hasChildCategories = sub.childCategories && sub.childCategories.length > 0
                        const hasItems = hasChildCategories
                        const isSubExpanded = expandedSub === `${cat.label}-${sub.name}`

                        return (
                          <li key={sub.name}>
                            <div className="flex items-center">
                              <Link
                                href={sub.href || `${cat.href}?filter=${encodeURIComponent(sub.name)}`}
                                onClick={onClose}
                                className="flex-1 px-8 py-2.5 text-[14px] font-semibold text-[#0F172A] no-underline transition-colors hover:bg-[#FDF6F0] hover:text-[#8B1A1A]"
                              >
                                <span className="mr-2.5 inline-block h-1.5 w-1.5 rounded-full bg-[#8B1A1A]" />
                                {sub.name}
                              </Link>
                              {hasItems && (
                                <button
                                  onClick={() => toggleSub(`${cat.label}-${sub.name}`)}
                                  className="px-4 py-2.5 text-[#475569] transition-colors hover:text-[#8B1A1A]"
                                  aria-expanded={isSubExpanded}
                                  aria-label={`${isSubExpanded ? 'Collapse' : 'Expand'} ${sub.name}`}
                                >
                                  <ChevronDown
                                    size={14}
                                    className={`transition-transform duration-200 ${isSubExpanded ? 'rotate-180' : ''}`}
                                  />
                                </button>
                              )}
                            </div>

                            {/* Child categories (Level 3) */}
                            {hasItems && isSubExpanded && (
                              <ul className="bg-white/80 pb-1 border-l-2 border-[#8B1A1A]/30 ml-8 my-1">
                                {hasChildCategories && sub.childCategories!.map(child => (
                                  <li key={child.name}>
                                    <Link
                                      href={child.href || `${cat.href}?filter=${encodeURIComponent(child.name)}`}
                                      onClick={onClose}
                                      className="flex items-center gap-3 px-6 py-2 text-[13px] font-medium text-[#1E293B] no-underline transition-colors hover:bg-[#FDF6F0] hover:text-[#8B1A1A]"
                                    >
                                      <span className="inline-block h-1 w-1 rounded-full bg-[#8B1A1A]/60" />
                                      <span className="flex-1">{child.name}</span>
                                      {child.isHot && (
                                        <span className="rounded-full bg-[#8B1A1A] px-1.5 py-0.5 text-[9px] font-bold text-white">
                                          HOT
                                        </span>
                                      )}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-[#E2E8F0] bg-[#FAFAFC] px-5 py-3">
          {session ? (
            <div className="space-y-2">
              <Link
                href="/account"
                onClick={onClose}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-[14px] font-semibold text-[#080E1A] transition-colors hover:bg-[#FEF3C7]/50"
              >
                <User size={16} />
                {session.name}
              </Link>
              <Link
                href="/account"
                onClick={onClose}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium text-[#64748B] transition-colors hover:bg-[#FEF3C7]/50"
              >
                <ShoppingBag size={15} />
                My Orders
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await logout()
                  onClose()
                  router.replace('/')
                }}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium text-[#A34336] transition-colors hover:bg-red-50"
              >
                <LogIn size={15} className="rotate-180" />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Link
                href="/login"
                onClick={onClose}
                className="flex items-center gap-3 rounded-md bg-[#0F172A] px-3 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-[#080E1A]"
              >
                <LogIn size={16} />
                Sign In
              </Link>
              <Link
                href="/register"
                onClick={onClose}
                className="flex items-center gap-3 rounded-md border border-[#E2E8F0] px-3 py-2.5 text-[14px] font-semibold text-[#080E1A] transition-colors hover:bg-[#FEF3C7]/50"
              >
                <UserPlus size={16} />
                Create Account
              </Link>
            </div>
          )}
        </div>

        <div className="border-t border-[#E2E8F0] bg-[#FAFAFC] px-5 py-4">
          <p className="text-center text-[10px] font-semibold uppercase tracking-[2px] text-[#64748B]">
            Style In Every Thread
          </p>
        </div>
      </div>
    </>
  )
}
