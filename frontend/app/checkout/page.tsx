import Script from 'next/script'
import CheckoutForm from '@/components/checkout/CheckoutForm'
import OrderSummary from '@/components/checkout/OrderSummary'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import FloatingActions from '@/components/ui/FloatingActions'
import { CheckoutProvider } from '@/components/checkout/CheckoutContext'
import { ShieldCheck, Lock, Truck, Sparkles } from 'lucide-react'

export default function CheckoutPage({ searchParams }: { searchParams?: { buyNow?: string } }) {
  const isBuyNow = !!searchParams?.buyNow

  return (
    <CheckoutProvider>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <Header />

      {/* Security Assurance Banner */}
      <div className="bg-[#FAF7F2] border-b border-[#E8DCC4] py-2 px-4 select-none">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center sm:justify-between text-xs font-semibold text-slate-700 gap-3">
          <div className="flex items-center gap-2 text-[#8B1A1A]">
            <Lock size={14} className="text-[#8B1A1A]" />
            <span className="tracking-wide">256-Bit Bank-Grade SSL Secured Checkout</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-slate-600 text-[11px] uppercase tracking-wider">
            <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-[#8B1A1A]" /> 100% Genuine Handloom Silk</span>
            <span className="flex items-center gap-1.5"><Truck size={14} className="text-[#8B1A1A]" /> Fast Insured Shipping</span>
            <span className="flex items-center gap-1.5"><Sparkles size={14} className="text-[#8B1A1A]" /> 100% Quality Inspected</span>
          </div>
        </div>
      </div>

      {/* Main Checkout Content */}
      <main className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 relative pb-24 sm:pb-12">
        <div className="relative mx-auto max-w-7xl flex flex-col-reverse lg:flex-row gap-8 lg:gap-12 px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          
          {/* Left Column: Form Flow */}
          <div className="w-full lg:w-[58%] bg-white rounded-2xl border border-slate-200/80 shadow-[0_10px_35px_rgba(15,23,42,0.04)] p-6 sm:p-8 lg:p-10">
            <CheckoutForm isBuyNow={isBuyNow} />
          </div>

          {/* Right Column: Order Summary (Sticky on Desktop) */}
          <div className="w-full lg:w-[42%]">
            <div className="lg:sticky lg:top-24 bg-white rounded-2xl border border-slate-200/80 shadow-[0_10px_35px_rgba(15,23,42,0.04)] p-6 sm:p-8">
              <OrderSummary isBuyNow={isBuyNow} />
            </div>
          </div>

        </div>
      </main>

      <Footer hideMobileNav={true} />
      <FloatingActions />
    </CheckoutProvider>
  )
}
