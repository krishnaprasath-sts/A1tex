import type { Metadata } from 'next'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import FloatingActions from '@/components/ui/FloatingActions'
import ForgotPasswordPage from '@/components/account/ForgotPasswordPage'

export const metadata: Metadata = {
  title: 'Forgot Password | A1 TEX',
  description: 'Reset your A1 TEX account password.',
}

export default function ForgotPasswordRoute() {
  return (
    <>
      <Header />
      <ForgotPasswordPage />
      <Footer />
      <FloatingActions />
    </>
  )
}
