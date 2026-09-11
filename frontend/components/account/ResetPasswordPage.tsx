'use client'

import Link from 'next/link'
import { ArrowLeft, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react'

export default function ResetPasswordPage() {
  return (
    <main className="relative overflow-hidden bg-[#FBF9F6]">
      <div className="pointer-events-none absolute right-0 top-0 h-[420px] w-[420px] translate-x-28 -translate-y-20 bg-[url('/borderdesign/flower-motif.png')] bg-contain bg-no-repeat opacity-[0.05]" />
      <div className="mx-auto grid min-h-[640px] max-w-[1280px] gap-8 px-4 py-12 sm:px-6 md:py-16 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
        <section className="relative overflow-hidden border border-[#A34336]/15 bg-[#300D14] p-8 text-[#FAFAFC] shadow-[0_18px_42px_rgba(48,13,20,0.14)] md:p-10">
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
                Reset via OTP
              </h1>
              <p className="font-sans max-w-xl text-sm sm:text-base font-medium leading-relaxed text-[#E8DFD0]">
                Password reset now uses OTP verification. Enter your email to receive a one-time code.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {[
                { Icon: ShieldCheck, label: 'Encrypted storage' },
                { Icon: LockKeyhole, label: 'OTP verification' },
                { Icon: Sparkles, label: 'Stay protected' },
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
          <div className="relative z-10 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#A34336]/10 text-[#A34336]">
              <LockKeyhole className="h-6 w-6" />
            </div>
            <h2 className="font-playfair mb-2 text-2xl sm:text-3xl font-medium italic tracking-wide text-[#333333]">Use OTP to Reset</h2>
            <p className="font-sans mb-6 text-sm text-[#666666] font-medium">
              We&apos;ve switched to OTP-based password reset. Enter your email on the forgot password page to get started.
            </p>
            <Link
              href="/forgot-password"
              className="inline-flex items-center justify-center rounded-md bg-[#A34336] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#8e382b]"
            >
              Go to Forgot Password
            </Link>
          </div>

          <div className="mt-7 flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-5 text-sm text-[#666666] sm:flex-row">
            <Link href="/login" className="font-medium text-[#A34336] underline-offset-4 hover:underline">
              Back to sign in
            </Link>
            <Link href="/register" className="font-medium text-[#A34336] underline-offset-4 hover:underline">
              Create new account
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
