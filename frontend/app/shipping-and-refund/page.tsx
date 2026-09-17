import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export const metadata = {
  title: 'Shipping & Policy | A1 TEX',
}

export default function ShippingAndRefundPolicyPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-28 pb-16 px-4 sm:px-6 lg:px-8" style={{ background: 'var(--ivory)' }}>
        <div className="mx-auto max-w-3xl bg-white p-6 sm:p-8 md:p-12 shadow-sm rounded-md border border-[var(--ivory-dark)]">
          <h1 className="font-playfair text-3xl sm:text-4xl md:text-5xl font-medium tracking-wide text-[var(--burgundy)] text-center mb-6 sm:mb-8">
            Shipping & Policy
          </h1>
          
          <div className="space-y-4 sm:space-y-6 font-sans text-[var(--muted)] text-sm sm:text-base leading-relaxed font-medium">
            <p>
              At <strong>A1 TEX</strong>, we aim to provide an authentic, premium handloom shopping experience from our master weavers to your doorstep.
            </p>
            
            <div>
              <h2 className="font-playfair text-xl sm:text-2xl font-medium italic tracking-wide text-[var(--burgundy)] mb-2">Shipping</h2>
              <p>
                All orders are processed within 1–3 business days. Once shipped, your order will be delivered within 3–7 business days, depending on your location.
              </p>
              <p className="mt-2">
                You will receive real-time courier tracking details once your parcel is dispatched.
              </p>
            </div>

            <div>
              <h2 className="font-playfair text-xl sm:text-2xl font-medium italic tracking-wide text-[var(--burgundy)] mb-2">Return & Exchange Policy</h2>
              <p>
                Due to the delicate, handcrafted nature of our pure handloom sarees and traditional textiles, <strong>we do not accept returns or exchanges</strong> once an order is delivered.
              </p>
              <p className="mt-2">
                Every single saree goes through multi-stage quality inspection by our weavers prior to packaging and dispatch to guarantee immaculate condition.
              </p>
            </div>

            <div>
              <h2 className="font-playfair text-xl sm:text-2xl font-medium italic tracking-wide text-[var(--burgundy)] mb-2">Transit Damage / Defect Assistance</h2>
              <ul className="list-disc pl-5 sm:pl-6 space-y-1 sm:space-y-2">
                <li>In the rare event of damage during transit, please contact our support team within 24 hours of delivery.</li>
                <li>Please share an unedited unboxing video showing the outer package and damage for quick resolution.</li>
                <li>Orders can be cancelled before the order has been confirmed and packed.</li>
              </ul>
            </div>

            <p className="font-medium pt-4 sm:pt-6 border-t border-[var(--ivory-dark)] mt-6">
              Thank you for supporting authentic handloom artisans and traditional weaving heritage.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
