'use client'

import { useEffect } from 'react'

type ErrorPageProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error }: ErrorPageProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--ivory)] px-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-[var(--ivory-dark)] p-8 text-center">
        <h1 className="font-playfair text-2xl sm:text-3xl font-medium tracking-wide text-[var(--charcoal)] mb-4">
          This page could not be loaded
        </h1>
        <p className="font-sans text-sm sm:text-base text-[var(--muted)] leading-relaxed mb-6 font-medium">
          Something went wrong on our side while loading this page. Please try again in a moment.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {/* Full reload so the server fetches the data again */}
          <button
            onClick={() => window.location.reload()}
            className="bg-[var(--burgundy)] text-white px-6 py-2.5 rounded font-montserrat text-xs font-bold uppercase tracking-[0.2em] hover:bg-[var(--burgundy-dark)] transition shadow-sm"
          >
            Try Again
          </button>
          <a
            href="/shop"
            className="inline-block border border-[var(--burgundy)] text-[var(--burgundy)] px-6 py-2.5 rounded font-montserrat text-xs font-bold uppercase tracking-[0.2em] hover:bg-[var(--ivory)] transition"
          >
            Continue Shopping
          </a>
        </div>
      </div>
    </div>
  )
}
