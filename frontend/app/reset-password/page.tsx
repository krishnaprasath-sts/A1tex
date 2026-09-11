import type { Metadata } from 'next'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import FloatingActions from '@/components/ui/FloatingActions'
import ResetPasswordPage from '@/components/account/ResetPasswordPage'

export const metadata: Metadata = {
  title: 'Reset Password | A1 TEX',
  description: 'Set a new password for your A1 TEX account.',
}

export default function ResetPasswordRoute() {
  return (
    <>
      <Header />
      <ResetPasswordPage />
      <Footer />
      <FloatingActions />
    </>
  )
}
