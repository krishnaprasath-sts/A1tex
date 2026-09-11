import { Suspense } from 'react'
import type { Metadata } from 'next'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import FloatingActions from '@/components/ui/FloatingActions'
import TrackOrderPage from '@/components/order/TrackOrderPage'

export const metadata: Metadata = {
  title: 'Track Order | A1 TEX',
  description: 'Track your A1 TEX order in real time with your order number.',
}

export default function TrackOrderRoute() {
  return (
    <>
      <Header />
      <Suspense fallback={<div className="min-h-screen bg-[#FAFAFC] py-20 text-center text-slate-500">Loading tracking information...</div>}>
        <TrackOrderPage />
      </Suspense>
      <Footer />
      <FloatingActions />
    </>
  )
}
