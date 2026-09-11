'use client'

import { useEffect, useState } from 'react'
import { useWishlist } from '@/components/wishlist/WishlistContext'
import { useAuth } from '@/components/auth/AuthContext'
import { useCart } from '@/components/cart/CartContext'
import ProductCard, { type ProductCardProduct } from '@/components/product/ProductCard'
import { resolveImageUrl as resolveImg } from '@/lib/api/client'
import { getDiscount } from '@/lib/api/mappers'
import type { ServerWishlistItem } from '@/lib/api/wishlist'

function resolveImageUrl(url: string | null | undefined): string {
  return resolveImg(url) || ''
}

function mapServerItemToCard(item: ServerWishlistItem): ProductCardProduct {
  const disc = getDiscount(item.price, item.originalPrice)
  const image = resolveImageUrl(item.image)
  const colorName = item.color || undefined
  const colors = colorName ? [{ name: colorName, hex: '#8B1A2B', image }] : undefined

  return {
    id: item.productId,
    name: item.name,
    category: item.category,
    fabric: item.type || item.category,
    occasion: item.type || item.category,
    image,
    price: item.price,
    oldPrice: item.originalPrice,
    badge: item.isNew ? 'New' : disc ? `${disc}% OFF` : undefined,
    href: `/products/${item.slug || item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    rating: item.averageRating ?? 0,
    stock: item.stockQty,
    variantId: item.variantId ?? undefined,
    variantLabel: item.variantLabel ?? undefined,
    color: colorName,
    size: item.size ?? undefined,
    colors,
  }
}

export default function WishlistContent() {
  const { serverItems, wishlistIds, removeFromWishlist, isWished, hydrated, syncing } = useWishlist()
  const { session, loading: authLoading } = useAuth()
  const cart = useCart()
  const [products, setProducts] = useState<ProductCardProduct[]>([])
  const [toast, setToast] = useState('')

  const isLoggedIn = !!session

  useEffect(() => {
    if (authLoading || !hydrated) return

    if (isLoggedIn) {
      setProducts(serverItems.map(mapServerItemToCard))
      return
    }

    if (wishlistIds.length === 0) {
      setProducts([])
      return
    }

    setProducts(serverItems.map(mapServerItemToCard))
  }, [serverItems, wishlistIds, hydrated, isLoggedIn, authLoading])

  function addToCart(product: ProductCardProduct) {
    const original = serverItems.find(i =>
      String(i.productId) === String(product.id) &&
      (i.variantId ?? null) === (product.variantId ?? null),
    )
    const slug = original?.slug || product.href?.replace('/products/', '') || String(product.id)
    cart.addItem({
      id: product.id!,
      name: product.name,
      slug,
      price: product.price,
      originalPrice: product.oldPrice ?? undefined,
      image: product.image,
      color: product.color,
      size: product.size,
      variantId: product.variantId,
      variantLabel: product.variantLabel,
      stock: original?.stockQty,
    })
    cart.setDrawerOpen(true)
    setToast(`${product.name} added to cart`)
    setTimeout(() => setToast(''), 2200)
  }

  const isPending = authLoading || !hydrated

  if (isPending) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0F172A] border-t-transparent" />
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 flex flex-col justify-between gap-2 rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-[0_12px_34px_rgba(74,15,28,0.05)] sm:flex-row sm:items-center">
        <p className="text-sm font-semibold text-[#0F172A]">
          {syncing ? 'Syncing...' : `Showing ${products.length} saved products`}
        </p>
      </div>
      {toast && (
        <div className="mb-4 rounded-lg border border-[#D4AF37] bg-[#D4AF37]/10 px-4 py-3 text-center text-sm font-semibold text-[#0F172A] shadow-sm">
          {toast}
        </div>
      )}
      {products.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 min-[430px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {products.map(product => (
            <ProductCard
              key={`${product.id ?? product.name}-${product.variantId ?? 'base'}`}
              product={product}
              wished={product.id != null ? isWished(Number(product.id), product.variantId ?? null) : false}
              onToggleWishlist={() => {
                if (product.id != null) removeFromWishlist(Number(product.id), product.variantId ?? null, product.name)
              }}
              onAddToCart={addToCart}
            />
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-sm text-[#64748B]">Your wishlist is empty. Start adding products you love!</p>
      )}
    </>
  )
}
