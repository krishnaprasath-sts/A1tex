import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export const metadata = {
  title: 'Terms & Conditions | A1 TEX',
}

export default function TermsConditionsPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-28 pb-16 px-4 sm:px-6 lg:px-8" style={{ background: 'var(--ivory)' }}>
        <div className="mx-auto max-w-3xl bg-white p-6 sm:p-8 md:p-12 shadow-sm rounded-md border border-[var(--ivory-dark)]">
          <h1 className="font-playfair text-3xl sm:text-4xl md:text-5xl font-medium tracking-wide text-[var(--burgundy)] text-center mb-6 sm:mb-8">
            Terms & Conditions
          </h1>
          
          <div className="space-y-4 sm:space-y-6 font-sans text-[var(--muted)] text-sm sm:text-base leading-relaxed font-medium">
            <p>
              Welcome to <strong>A1 TEX</strong>.
            </p>
            
            <p>
              By accessing and using our website, you agree to comply with the following terms designed to ensure a smooth and fair experience for all users.
            </p>
            
            <p>
              All products listed on our website are subject to availability. While we strive to display accurate information, A1 TEX reserves the right to update product details, pricing, and availability at any time without prior notice.
            </p>
            
            <p>
              Orders are confirmed only after successful payment. In rare cases, we may cancel or refuse an order due to unforeseen circumstances.
            </p>

            <p>
              All content on this website, including images, logos, and text, is the property of A1 TEX and may not be used without permission.
            </p>

            <p>
              We aim to deliver a seamless experience, but we are not responsible for delays caused by external factors such as courier services or unforeseen events.
            </p>
            
            <p className="font-medium pt-4 sm:pt-6 border-t border-[var(--ivory-dark)] mt-6">
              By continuing to use our website, you accept these terms.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
