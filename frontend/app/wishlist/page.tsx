import type { Metadata } from 'next'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import FloatingActions from '@/components/ui/FloatingActions'
import WishlistContent from '@/components/wishlist/WishlistContent'

export const metadata: Metadata = {
  title: 'Wishlist | A1 TEX',
  description: 'View your saved A1 TEX products.',
}

export default function WishlistRoute() {
  return (
    <>
      <Header />
      <main className="bg-[#FAFAFC] text-[#0F172A]">
        <section className="border-b border-[#E2E8F0] bg-[#080E1A]">
          <div className="mx-auto max-w-[1500px] px-4 py-12 sm:px-6 md:py-16 lg:px-8">
            <p className="font-montserrat mb-3 text-[11px] md:text-xs font-bold uppercase tracking-[0.25em] text-[#FCD34D]">Saved Pieces</p>
            <h1 className="font-playfair text-3xl sm:text-4xl md:text-5xl font-medium tracking-wide text-[#FAFAFC]">
              Wishlist
            </h1>
            <p className="font-sans mt-4 max-w-2xl text-sm sm:text-base font-medium leading-relaxed text-[#F5EDD6]">
              Your saved A1 TEX products stay ready here for the next time you want to compare, style, or purchase.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
          <WishlistContent />
        </section>
      </main>
      <Footer />
      <FloatingActions />
    </>
  )
}
