import type { Metadata } from 'next'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import FloatingActions from '@/components/ui/FloatingActions'
import LoginPage from '@/components/account/LoginPage'

export const metadata: Metadata = {
  title: 'Sign In | A1 TEX',
  description: 'Sign in to your A1 TEX account to manage orders, addresses, and wishlist.',
}

export default function LoginRoute() {
  return (
    <>
      <Header />
      <LoginPage />
      <Footer />
      <FloatingActions />
    </>
  )
}
