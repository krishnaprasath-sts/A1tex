import type { Metadata } from 'next'
import TabVisibilityHandler from '@/components/ui/TabVisibilityHandler'
import { CartProvider } from '@/components/cart/CartContext'
import { AuthProvider } from '@/components/auth/AuthContext'
import { WishlistProvider } from '@/components/wishlist/WishlistContext'
import CartDrawer from '@/components/cart/CartDrawer'
import AnnouncementBar from '@/components/layout/AnnouncementBar'
import GuestDiscountPopup from '@/components/layout/GuestDiscountPopup'
import './globals.css'

export const metadata: Metadata = {
  title: 'A1 TEX',
  description: 'Authentic handloom sarees, silk weaves and organic fabrics. Kanchipuram silk, Mysore silk, handloom cotton and more. Free shipping in India.',
  keywords: 'silk sarees, kanchipuram silk, handloom sarees, organic sarees, mysore silk, bridal sarees',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-logo.png', type: 'image/png' },
      { url: '/favicon.png', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <WishlistProvider>
          <CartProvider>
            <TabVisibilityHandler />
            <AnnouncementBar />
            {children}
            <CartDrawer />
            <GuestDiscountPopup />
          </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
