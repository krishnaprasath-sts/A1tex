import { apiFetch } from './client'

export type ServerWishlistItem = {
  id: number
  userId: number
  productId: number
  variantId: number | null
  color: string | null
  size: string | null
  variantLabel: string | null
  name: string
  slug: string
  price: number
  originalPrice: number | null
  image: string
  type: string
  category: string
  stockQty: number
  status: string
  isNew: boolean
  averageRating: number | null
  createdAt: string
}

export type WishlistVariantInput = {
  variantId?: number | null
  color?: string | null
  size?: string | null
}

export async function fetchWishlist(): Promise<ServerWishlistItem[]> {
  try {
    const data = await apiFetch<{ items?: ServerWishlistItem[] }>('/storefront/wishlist')
    return Array.isArray(data?.items) ? data.items : []
  } catch {
    return []
  }
}

export async function addToWishlistApi(productId: number, variant?: WishlistVariantInput): Promise<ServerWishlistItem> {
  const data = await apiFetch<{ item: ServerWishlistItem }>('/storefront/wishlist', {
    method: 'POST',
    body: JSON.stringify({
      productId,
      variantId: variant?.variantId ?? undefined,
      color: variant?.color ?? undefined,
      size: variant?.size ?? undefined,
    }),
  })
  return data.item
}

export async function removeFromWishlistApi(productId: number, variantId?: number | null): Promise<void> {
  const query = variantId ? `?variantId=${variantId}` : ''
  await apiFetch(`/storefront/wishlist/${productId}${query}`, { method: 'DELETE' })
}

export async function clearServerWishlist(): Promise<void> {
  await apiFetch('/storefront/wishlist', { method: 'DELETE' })
}

export async function mergeGuestWishlist(_productIds: number[]): Promise<ServerWishlistItem[]> {
  // Deprecated: merge now happens server-side on login via guest session cookie
  return fetchWishlist()
}
