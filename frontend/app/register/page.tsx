import type { Metadata } from 'next'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import FloatingActions from '@/components/ui/FloatingActions'
import SignupPage from '@/components/account/SignupPage'

export const metadata: Metadata = {
  title: 'Create Account | A1 TEX',
  description: 'Create your A1 TEX account to save addresses, track orders, and manage your wishlist.',
}

export default function RegisterRoute() {
  return (
    <>
      <Header />
      <SignupPage />
      <Footer />
      <FloatingActions />
    </>
  )
}


