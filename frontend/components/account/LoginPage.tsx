'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'
import { CheckCircle2, Eye, EyeOff, LogIn, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import { loginCustomer } from '@/lib/api/auth'
import { useAuth } from '@/components/auth/AuthContext'

export default function LoginPage() {
  const router = useRouter()
  const { refresh } = useAuth()
  const [returnTo, setReturnTo] = useState('/account')
  const [contact, setContact] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const r = params.get('returnTo')
    if (r) setReturnTo(r)
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!contact.trim()) {
      setError('Enter your email or mobile number.')
      return
    }
    if (!password) {
      setError('Enter your password.')
      return
    }

    setSubmitting(true)
    try {
      await loginCustomer({ contact: contact.trim(), password })
      setToast('Signed in successfully')
      await refresh()
      window.setTimeout(() => router.push(returnTo), 800)
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to sign in right now.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="relative overflow-hidden bg-[#FBF9F6]">
      <div className="pointer-events-none absolute right-0 top-0 h-[420px] w-[420px] translate-x-28 -translate-y-20 bg-[url('/borderdesign/flower-motif.png')] bg-contain bg-no-repeat opacity-[0.05]" />
      <div className="mx-auto grid min-h-[640px] max-w-[1280px] gap-8 px-4 py-12 sm:px-6 md:py-16 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
        <section className="relative overflow-hidden border border-[#A34336]/15 bg-[#300D14] p-8 text-[#FAFAFC] shadow-[0_18px_42px_rgba(48,13,20,0.14)] md:p-10">
          <div className="pointer-events-none absolute inset-3 border border-[#FCB900]/25" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full border border-[#FCB900]/20" />
          <div className="pointer-events-none absolute -right-8 top-10 h-48 w-48 bg-[url('/sectionicon/white-gold-flowers.png')] bg-contain bg-no-repeat opacity-10" />

          <div className="relative z-10 flex min-h-full flex-col justify-between gap-12">
            <div>
              <p className="font-montserrat mb-4 text-[11px] md:text-xs font-bold uppercase tracking-[0.25em] text-[#FCB900]">Welcome Back</p>
              <h1 className="font-playfair mb-5 text-3xl sm:text-4xl md:text-5xl font-medium tracking-wide leading-tight">
                Pick up where you left off.
              </h1>
              <p className="font-sans max-w-xl text-sm sm:text-base font-medium leading-relaxed text-[#E8DFD0]">
                Sign in to access your orders, saved addresses, and wishlist. Your saree collection awaits.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {[
                { Icon: ShieldCheck, label: 'Secure session' },
                { Icon: Mail, label: 'Saved preferences' },
                { Icon: Sparkles, label: 'Personalised picks' },
              ].map(({ Icon, label }) => (
                <div key={label} className="border border-[#FCB900]/25 bg-white/[0.04] p-4">
                  <Icon className="mb-3 h-5 w-5 text-[#FCB900]" />
                  <p className="text-sm font-semibold">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative border-x border-b border-t-[4px] border-[#EAD3CE] bg-white p-5 shadow-[0_10px_32px_rgba(0,0,0,0.05)] sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute inset-2 border border-[#A34336]/10" />
          <div className="relative z-10">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#A34336]/10 text-[#A34336]">
                <LogIn className="h-6 w-6" />
              </div>
              <h2 className="font-playfair mb-2 text-2xl sm:text-3xl font-medium italic tracking-wide text-[#333333]">Sign In</h2>
              <p className="font-sans text-sm text-[#666666] font-medium">Access your A1 TEX account.</p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[#666666]" htmlFor="login-contact">
                  Email or mobile <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A34336]" />
                  <input
                    id="login-contact"
                    type="text"
                    value={contact}
                    onChange={event => setContact(event.target.value)}
                    className="w-full border border-[#E2E8F0] bg-[#FBF9F6] py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#A34336] focus:bg-white"
                    placeholder="Email or +91 mobile number"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[#666666]" htmlFor="login-password">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <Link href="/forgot-password" className="text-xs font-medium text-[#A34336] underline-offset-4 hover:underline">
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A34336]" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    className="w-full border border-[#E2E8F0] bg-[#FBF9F6] py-3 pl-11 pr-11 text-sm outline-none transition focus:border-[#A34336] focus:bg-white"
                    placeholder="Your password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A34336] transition-colors hover:text-[#8e382b]"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={submitting} className="group relative flex w-full items-center justify-center gap-2 overflow-hidden bg-[#A34336] py-4 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-md transition disabled:cursor-not-allowed disabled:opacity-70">
                <span className="absolute inset-0 z-0 origin-left scale-x-0 bg-[#8e382b] transition-transform duration-500 group-hover:scale-x-100" />
                <span className="relative z-10 flex items-center gap-2">
                  {submitting ? 'Signing In...' : 'Sign In'}
                  <Sparkles className="h-4 w-4" />
                </span>
              </button>
              {error ? <p className="text-center text-sm font-medium text-[#A34336]">{error}</p> : null}
            </form>

            <div className="mt-7 flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-5 text-sm text-[#666666] sm:flex-row">
              <Link href="/register" className="font-medium text-[#A34336] underline-offset-4 hover:underline">
                New here? Create an account
              </Link>
              <Link href="/cart" className="font-medium text-[#A34336] underline-offset-4 hover:underline">
                Continue as guest
              </Link>
            </div>
          </div>
        </section>
      </div>

      <div className={`fixed bottom-5 left-1/2 z-[120] flex -translate-x-1/2 items-center gap-2 rounded bg-black px-6 py-3 text-white shadow-xl transition-opacity duration-300 ${toast ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
        <CheckCircle2 className="h-4 w-4 text-green-400" />
        <span className="text-sm">{toast}</span>
      </div>
    </main>
  )
}
