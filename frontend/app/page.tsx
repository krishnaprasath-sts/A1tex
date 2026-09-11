import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import HeroSection from '@/components/home/HeroSection'
{/* import CouponPopup from '@/components/ui/CouponPopup' */}
import FloatingActions from '@/components/ui/FloatingActions'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import {
  FeaturesStrip,
  SubcatBar,
  ShopBySection,
  ProductGrid,
  HeritageSection,
  FounderNoteSection,
} from '@/components/home/HomeComponents'
import CenterMarquee from '@/components/home/CenterMarquee'

export default function HomePage() {
  return (
    <>
      <Header />

      <main className="pb-20 md:pb-0">
        <ErrorBoundary><HeroSection /></ErrorBoundary>
        <ErrorBoundary><FeaturesStrip /></ErrorBoundary>
        <ErrorBoundary><SubcatBar /></ErrorBoundary>
        <ErrorBoundary><ShopBySection /></ErrorBoundary>
        <ErrorBoundary><CenterMarquee /></ErrorBoundary>
        <ErrorBoundary><ProductGrid /></ErrorBoundary>
        <ErrorBoundary><HeritageSection /></ErrorBoundary>
        <ErrorBoundary><FounderNoteSection /></ErrorBoundary>
      </main>

      <Footer />
      <FloatingActions />
      {/* <CouponPopup /> */}
    </>
  )
}
