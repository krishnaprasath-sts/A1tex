'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { ArrowLeft, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import { forgotPassword, resetPassword, verifyOtp } from '@/lib/api/auth'

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'email' | 'otp' | 'password'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Enter your email address.')
      return
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(email.trim())) {
      setError('Enter a valid email address.')
      return
    }

    setSubmitting(true)
    try {
      await forgotPassword(email.trim())
      setStep('otp')
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : 'No account found or error sending OTP.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!otp.trim() || otp.trim().length !== 6) {
      setError('Enter the 6-digit OTP sent to your email.')
      return
    }

    setSubmitting(true)
    try {
      await verifyOtp(email.trim(), otp.trim())
      setStep('password')
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : 'Invalid or expired OTP.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!password) {
      setError('Enter a new password.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      await resetPassword(otp.trim(), email.trim(), password)
      setDone(true)
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <main className="relative overflow-hidden bg-[#FBF9F6]">
        <div className="pointer-events-none absolute right-0 top-0 h-[420px] w-[420px] translate-x-28 -translate-y-20 bg-[url('/borderdesign/flower-motif.png')] bg-contain bg-no-repeat opacity-[0.05]" />
        <div className="mx-auto grid min-h-[640px] max-w-[1280px] gap-8 px-4 py-12 sm:px-6 md:py-16 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
          <section className="relative overflow-hidden border border-[#8B1A1A]/15 bg-[#300D14] p-8 text-[#FAFAFC] shadow-[0_18px_42px_rgba(48,13,20,0.14)] md:p-10">
            <div className="pointer-events-none absolute inset-3 border border-[#FCB900]/25" />
            <div className="relative z-10 flex min-h-full flex-col justify-between gap-12">
              <div>
                <p className="font-montserrat mb-4 text-[11px] md:text-xs font-bold uppercase tracking-[0.25em] text-[#FCB900]">Password Reset</p>
                <h1 className="font-playfair mb-5 text-3xl sm:text-4xl md:text-5xl font-medium tracking-wide leading-tight">
                  All done.
                </h1>
                <p className="font-sans max-w-xl text-sm sm:text-base font-medium leading-relaxed text-[#E8DFD0]">
                  Your password has been updated. Sign in with your new credentials.
                </p>
              </div>
            </div>
          </section>
          <section className="relative border-x border-b border-t-[4px] border-[#EAD3CE] bg-white p-5 shadow-[0_10px_32px_rgba(0,0,0,0.05)] sm:p-8 lg:p-10">
            <div className="pointer-events-none absolute inset-2 border border-[#8B1A1A]/10" />
            <div className="relative z-10 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h2 className="font-playfair mb-2 text-2xl sm:text-3xl font-medium italic tracking-wide text-[#333333]">Password updated</h2>
              <p className="font-sans mb-6 text-sm text-[#666666] font-medium">Your password has been reset successfully.</p>
              <Link href="/login" className="inline-flex items-center justify-center rounded-md bg-[#8B1A1A] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#721226]">
                Sign In
              </Link>
            </div>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="relative overflow-hidden bg-[#FBF9F6]">
      <div className="pointer-events-none absolute right-0 top-0 h-[420px] w-[420px] translate-x-28 -translate-y-20 bg-[url('/borderdesign/flower-motif.png')] bg-contain bg-no-repeat opacity-[0.05]" />
      <div className="mx-auto grid min-h-[720px] max-w-[1280px] gap-8 px-4 py-12 sm:px-6 md:py-16 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
        <section className="relative overflow-hidden border border-[#8B1A1A]/15 bg-[#300D14] p-8 text-[#FAFAFC] shadow-[0_18px_42px_rgba(48,13,20,0.14)] md:p-10">
          <div className="pointer-events-none absolute inset-3 border border-[#FCB900]/25" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full border border-[#FCB900]/20" />

          <div className="relative z-10 flex min-h-full flex-col justify-between gap-12">
            <div>
              <Link href="/login" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[#FCB900] hover:underline">
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
              <p className="font-montserrat mb-4 text-[11px] md:text-xs font-bold uppercase tracking-[0.25em] text-[#FCB900]">Password Reset</p>
              <h1 className="font-playfair mb-5 text-3xl sm:text-4xl md:text-5xl font-medium tracking-wide leading-tight">
                {step === 'email' ? 'Forgot your password?' : step === 'otp' ? 'Enter the OTP' : 'Set new password'}
              </h1>
              <p className="font-sans max-w-xl text-sm sm:text-base font-medium leading-relaxed text-[#E8DFD0]">
                {step === 'email'
                  ? "Enter the email linked to your A1 TEX account and we'll send you a 6-digit reset OTP."
                  : step === 'otp'
                  ? `We've sent a 6-digit OTP to ${email}. It expires in 15 minutes.`
                  : 'OTP verified successfully. Choose your new password.'}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {[
                { Icon: ShieldCheck, label: 'Secure reset' },
                { Icon: Mail, label: 'OTP delivery' },
                { Icon: Sparkles, label: 'Quick restore' },
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
          <div className="pointer-events-none absolute inset-2 border border-[#8B1A1A]/10" />
          <div className="relative z-10">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#8B1A1A]/10 text-[#8B1A1A]">
                {step === 'email' ? <Mail className="h-6 w-6" /> : <LockKeyhole className="h-6 w-6" />}
              </div>
              <h2 className="font-playfair mb-2 text-2xl sm:text-3xl font-medium italic tracking-wide text-[#333333]">
                {step === 'email' ? 'Reset Password' : step === 'otp' ? 'Verify OTP' : 'New Password'}
              </h2>
              <p className="font-sans text-sm text-[#666666] font-medium">
                {step === 'email' ? "We'll send a 6-digit code to your email." : step === 'otp' ? 'Enter the 6-digit code to continue.' : 'Choose your new password.'}
              </p>
            </div>

            {step === 'email' && (
              <form className="space-y-5" onSubmit={handleSendOtp} noValidate>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[#666666]" htmlFor="forgot-email">
                    Email address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B1A1A]" />
                    <input
                      id="forgot-email"
                      type="email"
                      value={email}
                      onChange={event => setEmail(event.target.value)}
                      className="w-full border border-[#E2E8F0] bg-[#FBF9F6] py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#8B1A1A] focus:bg-white"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <button type="submit" disabled={submitting} className="group relative flex w-full items-center justify-center gap-2 overflow-hidden bg-[#8B1A1A] py-4 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-md transition hover:bg-[#721226] disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer">
                  <span className="relative z-10 flex items-center gap-2">
                    {submitting ? 'Sending...' : 'Send OTP'}
                  </span>
                </button>
                {error ? <p className="text-center text-sm font-medium text-red-600 bg-red-50 p-2.5 rounded border border-red-200">{error}</p> : null}
              </form>
            )}

            {step === 'otp' && (
              <form className="space-y-5" onSubmit={handleVerifyOtp} noValidate>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[#666666]" htmlFor="reset-otp">
                    6-Digit OTP <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="reset-otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={event => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full border border-[#E2E8F0] bg-[#FBF9F6] px-4 py-3 text-center text-lg font-bold tracking-[0.3em] outline-none transition focus:border-[#8B1A1A] focus:bg-white"
                    placeholder="000000"
                    autoFocus
                  />
                </div>

                <button type="submit" disabled={submitting} className="group relative flex w-full items-center justify-center gap-2 overflow-hidden bg-[#8B1A1A] py-4 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-md transition hover:bg-[#721226] disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer">
                  <span className="relative z-10 flex items-center gap-2">
                    {submitting ? 'Verifying...' : 'Verify OTP'}
                  </span>
                </button>
                {error ? <p className="text-center text-sm font-medium text-red-600 bg-red-50 p-2.5 rounded border border-red-200">{error}</p> : null}
              </form>
            )}

            {step === 'password' && (
              <form className="space-y-5" onSubmit={handleResetPassword} noValidate>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[#666666]" htmlFor="reset-new-password">
                    New password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B1A1A]" />
                    <input
                      id="reset-new-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={event => setPassword(event.target.value)}
                      className="w-full border border-[#E2E8F0] bg-[#FBF9F6] py-3 pl-11 pr-11 text-sm outline-none transition focus:border-[#8B1A1A] focus:bg-white"
                      placeholder="Minimum 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#888888] hover:text-[#8B1A1A] transition cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[#666666]" htmlFor="reset-confirm-password">
                    Confirm password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B1A1A]" />
                    <input
                      id="reset-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={event => setConfirmPassword(event.target.value)}
                      className="w-full border border-[#E2E8F0] bg-[#FBF9F6] py-3 pl-11 pr-11 text-sm outline-none transition focus:border-[#8B1A1A] focus:bg-white"
                      placeholder="Repeat password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#888888] hover:text-[#8B1A1A] transition cursor-pointer"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button type="submit" disabled={submitting} className="group relative flex flex-1 items-center justify-center gap-2 overflow-hidden bg-[#8B1A1A] py-4 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-md transition hover:bg-[#721226] disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer">
                    <span className="relative z-10 flex items-center gap-2">
                      {submitting ? 'Resetting...' : 'Reset Password'}
                    </span>
                  </button>
                  <button type="button" onClick={() => { setStep('otp'); setPassword(''); setConfirmPassword(''); setError('') }} className="px-5 py-4 text-sm font-semibold text-[#8B1A1A] border border-[#E2E8F0] transition hover:bg-[#FBF9F6] cursor-pointer">
                    Back
                  </button>
                </div>
                {error ? <p className="text-center text-sm font-medium text-red-600 bg-red-50 p-2.5 rounded border border-red-200">{error}</p> : null}
              </form>
            )}

            <div className="mt-7 flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-5 text-sm text-[#666666] sm:flex-row">
              <Link href="/login" className="font-medium text-[#8B1A1A] underline-offset-4 hover:underline">
                Back to sign in
              </Link>
              <Link href="/register" className="font-medium text-[#8B1A1A] underline-offset-4 hover:underline">
                Create new account
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
