'use client'

import Link from 'next/link'
import { FormEvent, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Eye, EyeOff, Leaf, LockKeyhole, Mail, MapPin, ShieldCheck, Sparkles, Truck, UserRound } from 'lucide-react'
import { registerCustomer } from '@/lib/api/auth'

type SignupFields = {
  name: string
  email: string
  mobile: string
  password: string
  confirmPassword: string
  terms: boolean
}

type SignupErrors = Partial<Record<keyof SignupFields, string>>

const initialFields: SignupFields = {
  name: '',
  email: '',
  mobile: '',
  password: '',
  confirmPassword: '',
  terms: false,
}

function validateSignup(fields: SignupFields) {
  const errors: SignupErrors = {}
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!fields.name.trim()) errors.name = 'Full name is required.'
  if (!fields.email.trim()) errors.email = 'Email address is required.'
  if (fields.email.trim() && !emailPattern.test(fields.email.trim())) errors.email = 'Enter a valid email address.'
  if (!fields.password) {
    errors.password = 'Password is required.'
  } else if (fields.password.length < 6) {
    errors.password = 'Password must be at least 6 characters.'
  }
  if (!fields.confirmPassword) errors.confirmPassword = 'Confirm your password.'
  if (fields.password && fields.confirmPassword && fields.password !== fields.confirmPassword) errors.confirmPassword = 'Passwords do not match.'
  if (!fields.terms) errors.terms = 'Please accept the account terms.'

  const digits = fields.mobile.trim().replace(/\D/g, '')
  if (!fields.mobile.trim()) errors.mobile = 'Mobile number is required.'
  else if (!/^\d{10}$/.test(digits)) errors.mobile = 'Enter a valid 10-digit mobile number.'

  return errors
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs font-medium text-[#8B1A1A]">{message}</p> : null
}

export default function SignupPage() {
  const router = useRouter()
  const [fields, setFields] = useState(initialFields)
  const [errors, setErrors] = useState<SignupErrors>({})
  const [toast, setToast] = useState('')
  const [apiError, setApiError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const trustItems = useMemo(
    () => [
      { Icon: ShieldCheck, label: 'Secure profile' },
      { Icon: Truck, label: 'Faster checkout' },
      { Icon: Leaf, label: 'Saved wishlist' },
    ],
    [],
  )

  function updateField<Key extends keyof SignupFields>(key: Key, value: SignupFields[Key]) {
    setFields(current => ({ ...current, [key]: value }))
    setErrors(current => ({ ...current, [key]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setApiError('')
    const nextErrors = validateSignup(fields)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length === 0) {
      setSubmitting(true)
      try {
        await registerCustomer({
          name: fields.name.trim(),
          email: fields.email.trim(),
          mobile: fields.mobile.trim(),
          password: fields.password,
        })
        setToast('Account created successfully')
        setFields(initialFields)
        window.setTimeout(() => {
          setToast('');
          router.push('/login');
        }, 1500)
      } catch (error) {
        setApiError(error instanceof Error ? error.message : 'Unable to create account right now.')
      } finally {
        setSubmitting(false)
      }
    }
  }

  return (
    <main className="relative overflow-hidden bg-[#FBF9F6]">
      <div className="pointer-events-none absolute right-0 top-0 h-[420px] w-[420px] translate-x-28 -translate-y-20 bg-[url('/borderdesign/flower-motif.png')] bg-contain bg-no-repeat opacity-[0.05]" />
      <div className="mx-auto grid min-h-[720px] max-w-[1280px] gap-8 px-4 py-12 sm:px-6 md:py-16 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
        <section className="relative overflow-hidden border border-[#A34336]/15 bg-[#300D14] p-8 text-[#FAFAFC] shadow-[0_18px_42px_rgba(48,13,20,0.14)] md:p-10">
          <div className="pointer-events-none absolute inset-3 border border-[#FCB900]/25" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full border border-[#FCB900]/20" />
          <div className="pointer-events-none absolute -right-8 top-10 h-48 w-48 bg-[url('/sectionicon/white-gold-flowers.png')] bg-contain bg-no-repeat opacity-10" />

          <div className="relative z-10 flex min-h-full flex-col justify-between gap-12">
            <div>
              <p className="font-montserrat mb-4 text-[11px] md:text-xs font-bold uppercase tracking-[0.25em] text-[#FCB900]">A1 TEX Account</p>
              <h1 className="font-playfair mb-5 text-3xl sm:text-4xl md:text-5xl font-medium tracking-wide leading-tight">
                Keep your saree journey beautifully organized.
              </h1>
              <p className="font-sans max-w-xl text-sm sm:text-base font-medium leading-relaxed text-[#E8DFD0]">
                Create your account to save addresses, revisit favorite drapes, and move through checkout with a calm, crafted experience.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {trustItems.map(({ Icon, label }) => (
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
                <UserRound className="h-6 w-6" />
              </div>
              <h2 className="font-playfair mb-2 text-2xl sm:text-3xl font-medium italic tracking-wide text-[#333333]">Create Account</h2>
              <p className="font-sans text-sm text-[#666666] font-medium">Use your email and password to start.</p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[#666666]" htmlFor="signup-name">
                  Full name <span className="text-red-500">*</span>
                </label>
                <input
                  id="signup-name"
                  value={fields.name}
                  onChange={event => updateField('name', event.target.value)}
                  className="w-full border border-[#E2E8F0] bg-[#FBF9F6] px-4 py-3 text-sm outline-none transition focus:border-[#A34336] focus:bg-white"
                  placeholder="Your name"
                />
                <FieldError message={errors.name} />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[#666666]" htmlFor="signup-email">
                  Email address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A34336]" />
                  <input
                    id="signup-email"
                    type="email"
                    value={fields.email}
                    onChange={event => updateField('email', event.target.value)}
                    className="w-full border border-[#E2E8F0] bg-[#FBF9F6] py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#A34336] focus:bg-white"
                    placeholder="you@example.com"
                  />
                </div>
                <FieldError message={errors.email} />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[#666666]" htmlFor="signup-mobile">
                  Mobile number <span className="text-red-500">*</span>
                </label>
                <input
                  id="signup-mobile"
                  type="tel"
                  inputMode="numeric"
                  value={fields.mobile}
                  onChange={event => updateField('mobile', event.target.value.replace(/\D/g, '').slice(0, 10))}
                  maxLength={10}
                  className="w-full border border-[#E2E8F0] bg-[#FBF9F6] px-4 py-3 text-sm outline-none transition focus:border-[#A34336] focus:bg-white"
                  placeholder="9876543210"
                />
                <FieldError message={errors.mobile} />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[#666666]" htmlFor="signup-password">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B1A1A]" />
                    <input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      value={fields.password}
                      onChange={event => updateField('password', event.target.value)}
                      className="w-full border border-[#E2E8F0] bg-[#FBF9F6] py-3 pl-11 pr-11 text-sm outline-none transition focus:border-[#8B1A1A] focus:bg-white"
                      placeholder="Minimum 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#666666] hover:text-[#8B1A1A] transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <FieldError message={errors.password} />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[#666666]" htmlFor="signup-confirm">
                    Confirm password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A34336]" />
                    <input
                      id="signup-confirm"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={fields.confirmPassword}
                      onChange={event => updateField('confirmPassword', event.target.value)}
                      className="w-full border border-[#E2E8F0] bg-[#FBF9F6] py-3 pl-11 pr-11 text-sm outline-none transition focus:border-[#A34336] focus:bg-white"
                      placeholder="Repeat password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#666666] hover:text-[#A34336] transition-colors"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <FieldError message={errors.confirmPassword} />
                </div>
              </div>

              <div>
                <label className="flex items-start gap-3 text-sm leading-6 text-[#666666]">
                  <input
                    type="checkbox"
                    checked={fields.terms}
                    onChange={event => updateField('terms', event.target.checked)}
                    className="mt-1 h-4 w-4 accent-[#8B1A1A]"
                  />
                  <span>I agree to receive order updates and accept the A1 TEX account terms. <span className="text-red-500">*</span></span>
                </label>
                <FieldError message={errors.terms} />
              </div>

              <button type="submit" disabled={submitting} className="group relative flex w-full items-center justify-center gap-2 overflow-hidden bg-[#8B1A1A] py-4 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-md transition hover:bg-[#721226] disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer">
                <span className="relative z-10 flex items-center gap-2">
                  {submitting ? 'Creating Account...' : 'Create Account'}
                  <Sparkles className="h-4 w-4" />
                </span>
              </button>
              {apiError ? <p className="text-center text-sm font-medium text-red-600 bg-red-50 p-2.5 rounded border border-red-200">{apiError}</p> : null}
            </form>

            <div className="mt-7 flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-5 text-sm text-[#666666] sm:flex-row">
              <Link href="/login" className="font-medium text-[#8B1A1A] underline-offset-4 hover:underline">
                Already have an account? Sign in
              </Link>
              <Link href="/cart" className="font-medium text-[#8B1A1A] underline-offset-4 hover:underline">
                Continue as guest
              </Link>
            </div>
          </div>
        </section>
      </div>

      <div className={`fixed bottom-5 left-1/2 z-[120] flex -translate-x-1/2 items-center gap-2 rounded bg-black px-6 py-3 text-white shadow-xl transition-opacity duration-300 ${toast ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
        <CheckCircle2 className="h-4 w-4 text-green-400" />
        <span className="text-sm">{toast || 'Account created successfully'}</span>
      </div>
    </main>
  )
}
