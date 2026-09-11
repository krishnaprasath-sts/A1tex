'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import { Eye, EyeOff, User, X } from 'lucide-react'
import { loginCustomer } from '@/lib/api/auth'
import { useAuth } from '@/components/auth/AuthContext'

export default function LoginDropdown() {
  const router = useRouter()
  const pathname = usePathname()
  const { session, refresh } = useAuth()
  const [open, setOpen] = useState(false)
  const [contact, setContact] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isActive = pathname.startsWith('/account') || pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password')

  async function handleLogin() {
    setError('')
    setLoading(true)
    try {
      await loginCustomer({ contact, password })
      await refresh()
      setOpen(false)
      router.push('/account')
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to sign in right now.')
    } finally {
      setLoading(false)
    }
  }

  function goToAccount() {
    setOpen(false)
    router.push('/account')
  }

  return (
    <div className="relative">
      <button
        type="button"
        className={`action-item group flex flex-col items-center justify-center h-9 w-9 xl:h-11 xl:w-11 rounded-lg border-none bg-transparent transition-all duration-300 hover:scale-105 active:scale-95 ${open ? 'bg-transparent' : 'bg-transparent'}`}
        onClick={() => { if (session) { goToAccount() } else { setOpen(current => !current) } }}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <User
          size={22}
          color="var(--burgundy)"
          strokeWidth={1.8}
          className={`transition-colors duration-300 ${open ? 'fill-[#0F172A] text-[#0F172A]' : 'fill-transparent text-[var(--burgundy)] group-hover:fill-[var(--burgundy-dark)] group-hover:text-[var(--burgundy-dark)] group-active:fill-[#0F172A]'}`}
        />
        {isActive && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-[2px] rounded bg-[var(--gold)] shadow-sm" />
        )}
      </button>

      {!session && open ? (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-72 rounded-lg p-5"
          style={{
            background: 'white',
            border: '1px solid var(--ivory-dark)',
            boxShadow: '0 12px 40px rgba(107,26,42,0.14)',
          }}
        >
          <form
            onSubmit={event => {
              event.preventDefault()
              handleLogin()
            }}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h3 className="text-lg" style={{ color: 'var(--burgundy)', fontWeight: 700 }}>
                Welcome Back
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition hover:bg-[var(--gold-pale)]"
                style={{ color: 'var(--burgundy)', border: '1px solid var(--ivory-dark)' }}
                aria-label="Close login"
              >
                <X size={16} />
              </button>
            </div>

            <label className="mb-1 block text-xs tracking-wide" style={{ color: 'var(--muted)', fontWeight: 500 }}>
              Mobile / Email
            </label>
            <input
              type="text"
              value={contact}
              onChange={event => setContact(event.target.value)}
              placeholder="+91 or email address"
              autoComplete="email"
              className="mb-3 w-full rounded text-sm outline-none"
              style={{
                padding: '9px 12px',
                border: '1.5px solid var(--ivory-dark)',
              }}
            />

            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs tracking-wide" style={{ color: 'var(--muted)', fontWeight: 500 }}>
                Password
              </label>
              <Link
                href="/forgot-password"
                onClick={() => setOpen(false)}
                className="text-xs font-medium"
                style={{ color: 'var(--burgundy)' }}
              >
                Forgot?
              </Link>
            </div>
            <div className="relative mb-3">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={event => setPassword(event.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                className="w-full rounded text-sm outline-none"
                style={{
                  padding: '9px 36px 9px 12px',
                  border: '1.5px solid var(--ivory-dark)',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[var(--burgundy)] transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mb-3 w-full rounded py-2.5 text-sm font-semibold text-white"
              style={{ background: 'var(--burgundy)', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.3px', opacity: loading ? 0.72 : 1 }}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>

            {error ? (
              <p className="mb-3 text-center text-xs font-semibold text-[#A34336]">{error}</p>
            ) : null}

            <p className="text-center text-xs" style={{ color: 'var(--muted)' }}>
              New here?{' '}
              <Link href="/register" onClick={() => setOpen(false)} style={{ color: 'var(--burgundy)', textDecoration: 'underline' }}>
                Create Account
              </Link>{' '}
              ·{' '}
              <Link href="/checkout" onClick={() => setOpen(false)} style={{ color: 'var(--burgundy)', textDecoration: 'underline' }}>
                Guest Checkout
              </Link>
            </p>
          </form>
        </div>
      ) : null}
    </div>
  )
}
