import { apiFetch } from './client'

export type ServerCartItem = {
  id: number
  userId: number
  productId: number
  variantId: number | null
  quantity: number
  name: string
  slug: string
  price: number
  originalPrice: number | null
  image: string
  color: string | null
  size: string | null
  variantLabel: string | null
  productStock: number
  productStatus: string
  enableBackInStockNotify?: boolean
  weightKg?: number | null
  createdAt: string
  updatedAt: string
}

export type AddToCartPayload = {
  productId: number
  variantId?: number
  quantity: number
}

export async function fetchCart(): Promise<ServerCartItem[]> {
  try {
    const data = await apiFetch<{ items?: ServerCartItem[] }>('/storefront/cart')
    return Array.isArray(data?.items) ? data.items : []
  } catch {
    return []
  }
}

export async function addToCart(payload: AddToCartPayload): Promise<ServerCartItem> {
  const data = await apiFetch<{ item: ServerCartItem }>('/storefront/cart', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.item
}

export async function updateCartItemQuantity(id: number, quantity: number): Promise<ServerCartItem> {
  const data = await apiFetch<{ item: ServerCartItem }>(`/storefront/cart/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ quantity }),
  })
  return data.item
}

export async function removeCartItem(id: number): Promise<void> {
  await apiFetch(`/storefront/cart/${id}`, { method: 'DELETE' })
}

export async function clearServerCart(): Promise<void> {
  await apiFetch('/storefront/cart', { method: 'DELETE' })
}

export async function mergeGuestCart(_items: Array<{ productId: number; variantId?: number; quantity: number; color?: string; size?: string }>): Promise<ServerCartItem[]> {
  // Deprecated: merge now happens server-side on login via guest session cookie
  return fetchCart()
}
