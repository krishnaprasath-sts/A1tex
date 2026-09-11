'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { SkipForward } from 'lucide-react'

const INTRO_VIDEO_SRC = '/introvideo/introvideo.mp4'
const SEEN_KEY = 'sas_intro_seen'

export default function IntroVideo() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const closeStartedRef = useRef(false)
  const closeTimerRef = useRef<number | null>(null)
  const [visible, setVisible] = useState(true)
  const [loading, setLoading] = useState(true)
  const [leaving, setLeaving] = useState(false)

  const enterSite = useCallback(() => {
    if (closeStartedRef.current) return
    closeStartedRef.current = true
    setLeaving(true)
    sessionStorage.setItem(SEEN_KEY, '1')
    closeTimerRef.current = window.setTimeout(() => setVisible(false), 650)
  }, [])

  useEffect(() => {
    if (sessionStorage.getItem(SEEN_KEY)) {
      setVisible(false)
    }

    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!visible) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [visible])

  useEffect(() => {
    if (!visible) return

    const video = videoRef.current
    video?.play().catch(() => {
      setLoading(false)
    })
  }, [visible])

  if (!visible) return null

  return (
    <div
      className={`fixed inset-0 z-[1200] flex items-center justify-center bg-black transition-opacity duration-700 ${
        leaving ? 'opacity-0' : 'opacity-100'
      }`}
      aria-label="Intro video"
    >
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        src={INTRO_VIDEO_SRC}
        autoPlay
        muted
        playsInline
        preload="auto"
        onLoadedData={() => setLoading(false)}
        onCanPlay={() => setLoading(false)}
        onEnded={enterSite}
        onError={enterSite}
      />

      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
          <div className="h-12 w-12 rounded-full border-2 border-white/25 border-t-white animate-spin" />
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
            Loading
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={enterSite}
        className="absolute right-4 top-4 inline-flex h-11 items-center gap-2 rounded-full border border-white/25 bg-black/45 px-4 text-sm font-semibold text-white shadow-lg backdrop-blur-md transition hover:bg-white hover:text-black focus:outline-none focus:ring-2 focus:ring-white md:right-6 md:top-6"
        aria-label="Skip intro video"
      >
        <SkipForward size={17} aria-hidden="true" />
        Skip
      </button>
    </div>
  )
}
