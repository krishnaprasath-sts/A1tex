import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import Image from 'next/image'

export const metadata = {
  title: 'Our Story | A1 TEX',
}

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-28 pb-16 px-4 sm:px-6 lg:px-8" style={{ background: 'var(--ivory)' }}>
        <div className="mx-auto max-w-4xl bg-white p-6 sm:p-8 md:p-12 shadow-sm rounded-md border border-[var(--ivory-dark)]">
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="font-playfair text-3xl sm:text-4xl md:text-5xl font-medium tracking-wide text-[var(--burgundy)] mb-3">
              Our Story
            </h1>
            <p className="font-montserrat text-[11px] md:text-xs tracking-[0.25em] uppercase font-bold text-[var(--gold)]">
              Weaving Tradition into Every Thread
            </p>
          </div>
          
          <div className="space-y-6 sm:space-y-8 font-sans text-[var(--muted)] text-sm sm:text-base leading-relaxed font-medium">
            <p>
              Welcome to <strong className="text-[var(--charcoal)]">A1 TEX</strong>, where tradition meets elegance. Rooted in the rich cultural heritage of Indian handlooms, our journey began with a simple vision: to bring the authentic charm of traditional sarees to the modern woman.
            </p>
            
            <p>
              Every saree we offer is a masterpiece, woven with passion, precision, and a deep respect for the art of handloom. From the vibrant Kanchipuram silks to the subtle elegance of pure cottons, our collections are a tribute to the skilled artisans who spend days, and sometimes weeks, crafting a single piece.
            </p>
            
            <p>
              At A1 TEX, we believe that a saree is more than just an attire—it is an emotion, a legacy, and a celebration of womanhood. We are committed to sustaining the livelihood of our weavers by ensuring fair trade practices while delivering uncompromised quality to you.
            </p>

            <div className="pt-6 sm:pt-8 border-t border-[var(--ivory-dark)] text-center">
              <p className="font-playfair italic font-medium text-lg sm:text-xl text-[var(--burgundy-dark)]">
                &ldquo;Join us in preserving this timeless craft and drape yourself in the pride of Tamil Nadu.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
