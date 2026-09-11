import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export const metadata = {
  title: 'Shipping & Refund Policy | A1 TEX',
}

export default function ShippingAndRefundPolicyPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-28 pb-16 px-4 sm:px-6 lg:px-8" style={{ background: 'var(--ivory)' }}>
        <div className="mx-auto max-w-3xl bg-white p-6 sm:p-8 md:p-12 shadow-sm rounded-md border border-[var(--ivory-dark)]">
          <h1 className="font-playfair text-3xl sm:text-4xl md:text-5xl font-medium tracking-wide text-[var(--burgundy)] text-center mb-6 sm:mb-8">
            Shipping & Refund Policy
          </h1>
          
          <div className="space-y-4 sm:space-y-6 font-sans text-[var(--muted)] text-sm sm:text-base leading-relaxed font-medium">
            <p>
              At <strong>A1 TEX</strong>, we aim to provide a hassle-free shopping experience from order placement to delivery.
            </p>
            
            <div>
              <h2 className="font-playfair text-xl sm:text-2xl font-medium italic tracking-wide text-[var(--burgundy)] mb-2">Shipping</h2>
              <p>
                All orders are processed within 1–3 business days. Once shipped, your order will be delivered within 3–7 business days, depending on your location.
              </p>
              <p className="mt-2">
                You will receive tracking details once your order is dispatched.
              </p>
            </div>

            <div>
              <h2 className="font-playfair text-xl sm:text-2xl font-medium italic tracking-wide text-[var(--burgundy)] mb-2">Returns & Refunds</h2>
              <p>
                We accept returns within 7 days of delivery, provided the product is unused and in its original condition.
              </p>
              <p className="mt-2">
                Once your return is approved, refunds will be processed within 5–7 business days.
              </p>
            </div>

            <div>
              <h2 className="font-playfair text-xl sm:text-2xl font-medium italic tracking-wide text-[var(--burgundy)] mb-2">Important Notes</h2>
              <ul className="list-disc pl-5 sm:pl-6 space-y-1 sm:space-y-2">
                <li>Products that are used or damaged are not eligible for return.</li>
                <li>Customized items cannot be returned.</li>
                <li>Orders can be cancelled within 24 hours of purchase.</li>
              </ul>
            </div>

            <p className="font-medium pt-4 sm:pt-6 border-t border-[var(--ivory-dark)] mt-6">
              Our goal is to ensure your satisfaction with every purchase.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
