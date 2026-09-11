import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Us | A1 TEX',
  description: 'Have a question about our collections, need help with an order, or just want to say hello? Our team is always here to assist you.',
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
