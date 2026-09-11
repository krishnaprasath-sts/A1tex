'use client'

import { useState } from 'react'
import { apiFetch } from '@/lib/api/client'

export default function UnsubscribePage() {
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const email = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('email') || ''
    : ''

  const handleUnsubscribe = async () => {
    if (!email) return
    setLoading(true)
    setError('')
    try {
      await apiFetch('/storefront/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setDone(true)
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--ivory)] px-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-[var(--ivory-dark)] p-8 text-center">
        <h1 className="font-playfair text-2xl sm:text-3xl font-medium tracking-wide text-[var(--charcoal)] mb-4">
          {done ? 'Unsubscribed' : 'Unsubscribe from Marketing Emails'}
        </h1>
        {done ? (
          <>
            <p className="font-sans text-sm sm:text-base text-[var(--muted)] leading-relaxed mb-6 font-medium">
              You have been unsubscribed. You will no longer receive marketing emails.
            </p>
            <a href="/" className="inline-block bg-[var(--burgundy)] text-white px-6 py-2.5 rounded font-montserrat text-xs font-bold uppercase tracking-[0.2em] hover:bg-[var(--burgundy-dark)] transition shadow-sm">
              Go to Store
            </a>
          </>
        ) : (
          <>
            <p className="font-sans text-sm sm:text-base text-[var(--muted)] leading-relaxed mb-6 font-medium">
              {email
                ? `Confirm unsubscribe for ${email}`
                : 'No email address provided. Use the link from the email.'}
            </p>
            {email && (
              <button
                onClick={handleUnsubscribe}
                disabled={loading}
                className="bg-[var(--burgundy)] text-white px-6 py-2.5 rounded font-montserrat text-xs font-bold uppercase tracking-[0.2em] hover:bg-[var(--burgundy-dark)] disabled:opacity-50 transition shadow-sm"
              >
                {loading ? 'Unsubscribing…' : 'Confirm Unsubscribe'}
              </button>
            )}
            {error && <p className="text-red-500 mt-4 text-sm">{error}</p>}
          </>
        )}
      </div>
    </div>
  )
}
