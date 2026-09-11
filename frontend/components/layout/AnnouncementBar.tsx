'use client'

import { useEffect, useState } from 'react'
import { fetchAnnouncementMessages } from '@/lib/api/storefront'

const TOP_BANNER_BG = 'linear-gradient(90deg, #721226 0%, #8B1A1A 50%, #721226 100%)'
const TOP_BANNER_TEXT = '#FFFFFF'
const TOP_BANNER_ACCENT = '#FCD34D'

export default function AnnouncementBar() {
  const [messages, setMessages] = useState<string[]>([])

  useEffect(() => {
    let active = true
    fetchAnnouncementMessages().then(items => {
      if (active && items) {
        setMessages(items.map(item => item.text).filter(Boolean))
      }
    })
    return () => {
      active = false
    }
  }, [])

  if (messages.length === 0) return null

  // Duplicate an EVEN number of times (e.g., 10) so that translating -50% lands exactly on a seamless copy
  const repeated = Array(10).fill(messages).flat()

  return (
    <aside
      aria-label="Announcements"
      style={{ background: TOP_BANNER_BG }}
      className="py-2.5 overflow-hidden border-b border-[#5B0E1E]/50 shadow-xs select-none"
    >
      <div className="flex gap-14 marquee-track whitespace-nowrap items-center">
        {repeated.map((msg, i) => (
          <span
            key={i}
            className="inline-flex items-center text-[11px] sm:text-xs tracking-[0.15em] uppercase font-semibold text-white drop-shadow-xs"
          >
            <span
              style={{ color: TOP_BANNER_ACCENT }}
              className="mr-3 text-[10px] transform inline-block"
              aria-hidden="true"
            >
              ✦
            </span>
            {msg}
          </span>
        ))}
      </div>
    </aside>
  )
}
