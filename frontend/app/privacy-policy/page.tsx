import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export const metadata = {
  title: 'Privacy Policy | A1 TEX',
}

export default function PrivacyPolicyPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-28 pb-16 px-4 sm:px-6 lg:px-8" style={{ background: 'var(--ivory)' }}>
        <div className="mx-auto max-w-3xl bg-white p-6 sm:p-8 md:p-12 shadow-sm rounded-md border border-[var(--ivory-dark)]">
          <h1 className="font-playfair text-3xl sm:text-4xl md:text-5xl font-medium tracking-wide text-[var(--burgundy)] text-center mb-6 sm:mb-8">
            Privacy Policy
          </h1>
          
          <div className="space-y-4 sm:space-y-6 font-sans text-[var(--muted)] text-sm sm:text-base leading-relaxed font-medium">
            <p>
              At <strong>A1 TEX</strong>, your privacy matters to us. We are committed to safeguarding your personal information and ensuring a secure shopping experience every time you visit our website.
            </p>
            
            <p>
              When you interact with A1 TEX, we may collect basic information such as your name, contact details, shipping address, and payment information. This data helps us process your orders smoothly and keep you updated throughout your purchase journey.
            </p>
            
            <p>
              We use secure and trusted payment gateways, and your sensitive financial details are never stored on our servers.
            </p>

            <div>
              <p className="mb-2 font-medium">Your information is used only to:</p>
              <ul className="list-disc pl-5 sm:pl-6 space-y-1 sm:space-y-2">
                <li>Fulfill your orders efficiently</li>
                <li>Improve our services and user experience</li>
                <li>Communicate important updates and offers</li>
              </ul>
            </div>
            
            <p>
              We do not sell, trade, or misuse your personal data.
            </p>
            
            <p>
              By using our website, you agree to our privacy practices designed to keep your information safe and protected.
            </p>
            
            <p className="font-medium pt-4 sm:pt-6 border-t border-[var(--ivory-dark)] mt-6">
              For any concerns, feel free to contact us anytime.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
