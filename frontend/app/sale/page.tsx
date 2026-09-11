import type { Metadata } from 'next'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import FloatingActions from '@/components/ui/FloatingActions'
import ShopPage from '@/components/shop/ShopPage'

export const metadata: Metadata = {
  title: 'Sale | A1 TEX',
  description: 'Shop A1 TEX sale products with curated sarees, festive wear, daily wear, and accessories.',
}

export default function SaleRoute() {
  return (
    <>
      <Header />
      <ShopPage
        title="Sale"
        eyebrow="Limited Offers"
        description="Discover selected A1 TEX pieces with special pricing while keeping the same premium weave, comfort, and finish."
        saleOnly
      />
      <Footer />
      <FloatingActions />
    </>
  )
}
