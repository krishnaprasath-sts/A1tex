'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, Gift } from 'lucide-react'

import { useAuth } from '@/components/auth/AuthContext'
import { fetchGuestDiscountPopupConfig } from '@/lib/api/storefront'

const SHOW_DELAY_MS = 2000

export default function GuestDiscountPopup() {
  const { session, loading } = useAuth()
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (loading || session) return

    let active = true
    fetchGuestDiscountPopupConfig().then(config => {
      if (!active || !config.enabled || config.discountPercentage <= 0) return
      const text = config.message.replace('{percentage}', String(config.discountPercentage))
      setMessage(text)
      const timer = setTimeout(() => {
        if (active) setVisible(true)
      }, SHOW_DELAY_MS)
      return () => clearTimeout(timer)
    })

    return () => {
      active = false
    }
  }, [loading, session])

  function dismiss() {
    setVisible(false)
  }

  if (!visible || !message) return null

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome discount offer"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={dismiss}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="popup-anim relative w-full max-w-[480px] overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Decorative Top Border */}
        <div className="h-2 w-full bg-gradient-to-r from-[var(--gold)] via-[var(--gold-light)] to-[var(--gold)]"></div>
        
        {/* Close Button */}
        <button
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-4 top-5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-gray-500 transition-colors hover:bg-black/10 hover:text-gray-900"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-8 pb-10 pt-10 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border-[1.5px] border-[var(--gold-pale)] bg-[var(--burgundy)]/5 text-[var(--burgundy)] shadow-sm">
            <Gift className="h-10 w-10" strokeWidth={1.5} />
          </div>

          <h2 className="mb-2 text-[11px] font-bold tracking-[0.25em] text-[var(--gold)] uppercase">
            Exclusive Welcome Gift
          </h2>

          <div className="mx-auto my-6 h-[1px] w-24 bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent opacity-50"></div>

          <p 
            className="mb-8 px-2 text-[26px] font-bold leading-tight text-gray-900"
            style={{ fontFamily: 'var(--font-heading), "DM Sans", serif' }}
          >
            {message}
          </p>

          <Link
            href="/register"
            onClick={dismiss}
            className="group relative flex w-full items-center justify-center overflow-hidden rounded-md bg-[var(--burgundy)] px-8 py-4 text-sm font-bold uppercase tracking-[0.15em] text-white transition-all hover:bg-[var(--burgundy-dark)] hover:shadow-lg"
          >
            <span className="relative z-10">Register Now</span>
            {/* Hover shine effect */}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"></div>
          </Link>

          <button
            onClick={dismiss}
            className="mt-6 inline-block text-xs font-semibold uppercase tracking-wider text-gray-400 transition hover:text-gray-700 hover:underline underline-offset-4"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  )
}
