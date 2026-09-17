import { apiFetch } from './client'
import type { CanReviewResponse, MarqueeMessageData, NavigationResponse, Review, ReviewSubmission, ReviewSummary, StorefrontHomeData, StorefrontProduct } from './types'

// In-memory cache for ultra-fast storefront navigation (60s TTL)
const cacheMap = new Map<string, { data: any; expiry: number }>()

function getCached<T>(key: string): T | null {
  const item = cacheMap.get(key)
  if (!item) return null
  if (Date.now() > item.expiry) {
    cacheMap.delete(key)
    return null
  }
  return item.data as T
}

function setCache<T>(key: string, data: T, ttlMs = 60000): T {
  cacheMap.set(key, { data, expiry: Date.now() + ttlMs })
  return data
}

export function clearStorefrontCache() {
  cacheMap.clear()
}

export async function fetchAnnouncementMessages() {
  const cached = getCached<Array<{ id?: number; text: string; linkUrl?: string | null }>>('announcement_messages')
  if (cached) return cached

  try {
    const data = await apiFetch<{ messages: Array<{ id?: number; text: string; linkUrl?: string | null }> }>('/storefront/announcement-bar')
    return setCache('announcement_messages', data.messages || [], 60000)
  } catch {
    return []
  }
}

export async function fetchNavigation() {
  const cached = getCached<any[]>('nav_menu')
  if (cached) return cached

  try {
    const data = await apiFetch<NavigationResponse>('/storefront/nav-menu')
    return setCache('nav_menu', data.navigation || [], 60000)
  } catch {
    return []
  }
}

export async function fetchMarqueeMessages() {
  const cached = getCached<MarqueeMessageData[]>('marquee_messages')
  if (cached) return cached

  try {
    const data = await apiFetch<{ messages: MarqueeMessageData[] }>('/storefront/marquee-messages')
    return setCache('marquee_messages', data.messages || [], 60000)
  } catch {
    return []
  }
}

export async function fetchStorefrontHome() {
  const cached = getCached<StorefrontHomeData>('storefront_home')
  if (cached) return cached

  try {
    const data = await apiFetch<StorefrontHomeData>('/storefront/home')
    const result = {
      announcementMessages: data.announcementMessages || [],
      banners: data.banners || [],
      sectionCategories: data.sectionCategories || [],
      featuredCategories: data.featuredCategories || [],
      womensCategories: data.womensCategories || [],
      kidsCategories: data.kidsCategories || [],
      fabricCategories: data.fabricCategories || [],
      newArrivals: data.newArrivals || [],
      marqueeMessages: data.marqueeMessages || [],
    }
    return setCache('storefront_home', result, 2000)
  } catch {
    return {
      announcementMessages: [],
      banners: [],
      sectionCategories: [],
      featuredCategories: [],
      womensCategories: [],
      kidsCategories: [],
      fabricCategories: [],
      newArrivals: [],
      marqueeMessages: [],
    }
  }
}

export async function searchStorefront(query: string) {
  try {
    return await apiFetch<{ products: Array<StorefrontProduct> }>(
      `/storefront/search?q=${encodeURIComponent(query)}`,
    )
  } catch {
    return { products: [] }
  }
}

export async function fetchCategoryBySlug(slug: string) {
  const cached = getCached<{ id: number; name: string; slug: string; href: string }>(`cat_${slug}`)
  if (cached) return cached

  try {
    const data = await apiFetch<{ category: { id: number; name: string; slug: string; href: string } }>(
      `/storefront/categories/by-slug/${encodeURIComponent(slug)}`,
    )
    if (data.category) {
      return setCache(`cat_${slug}`, data.category, 60000)
    }
    return null
  } catch {
    return null
  }
}

export async function fetchProducts(opts: {
  category?: string
  categoryId?: number
  section?: string
  gender?: string
  search?: string
} = {}): Promise<StorefrontProduct[]> {
  const cacheKey = `prods_${JSON.stringify(opts)}`
  const cached = getCached<StorefrontProduct[]>(cacheKey)
  if (cached) return cached

  try {
    const params = new URLSearchParams()
    if (opts.section) params.set('section', opts.section)
    else if (opts.gender) params.set('gender', opts.gender)
    else if (opts.categoryId) params.set('categoryId', String(opts.categoryId))
    else if (opts.category && opts.category !== 'All') params.set('category', opts.category)
    if (opts.search) params.set('search', opts.search)
    const qs = params.toString()
    const data = await apiFetch<{ products: StorefrontProduct[] }>(
      `/storefront/products${qs ? `?${qs}` : ''}`,
    )
    const prods = data.products || []
    return setCache(cacheKey, prods, 30000)
  } catch {
    return []
  }
}

export async function fetchRelatedProducts(productId: number | string): Promise<StorefrontProduct[]> {
  const cacheKey = `related_${productId}`
  const cached = getCached<StorefrontProduct[]>(cacheKey)
  if (cached) return cached

  try {
    const data = await apiFetch<{ products?: StorefrontProduct[] }>(`/storefront/products/${productId}/related`)
    const prods = data.products || []
    return setCache(cacheKey, prods, 60000)
  } catch {
    return []
  }
}

export async function fetchProductReviews(slug: string, page = 1, perPage = 10) {
  try {
    const data = await apiFetch<{
      reviews: Review[]
      summary: ReviewSummary
      page: number
      perPage: number
      totalPages: number
    }>(`/storefront/products/${encodeURIComponent(slug)}/reviews?page=${page}&perPage=${perPage}`)
    return data
  } catch {
    return { reviews: [], summary: { total: 0, average: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }, page: 1, perPage: 10, totalPages: 0 }
  }
}

export async function checkCanReview(productId: number): Promise<CanReviewResponse> {
  try {
    return await apiFetch<CanReviewResponse>(`/storefront/products/${productId}/can-review`)
  } catch {
    return { canReview: false, hasReviewed: false, hasDeliveredOrder: false, existingReviewId: null }
  }
}

export async function submitReview(productId: number, data: ReviewSubmission, images?: File[]) {
  const fd = new FormData()
  fd.append('rating', String(data.rating))
  if (data.subject) fd.append('subject', data.subject)
  if (data.body) fd.append('body', data.body)
  if (images) {
    for (const f of images) fd.append('images', f)
  }
  return await apiFetch<{ review: Record<string, unknown> }>(`/storefront/products/${productId}/reviews`, {
    method: 'POST',
    body: fd,
  })
}

export async function fetchProductBySlug(slug: string): Promise<StorefrontProduct | null> {
  const cached = getCached<StorefrontProduct>(`prod_${slug}`)
  if (cached) return cached

  try {
    const data = await apiFetch<{ product: StorefrontProduct }>(`/storefront/products/${encodeURIComponent(slug)}`)
    if (data.product) {
      return setCache(`prod_${slug}`, data.product, 60000)
    }
    return null
  } catch {
    return null
  }
}

export async function submitContactEnquiry(data: { name: string; email: string; phonenumber: string; message: string }) {
  return await apiFetch<{ success: boolean; message: string }>('/storefront/contact-enquiries', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export type CourierOption = {
  id: string
  name: string
  code: string
  rate: number
  estimatedDays: string
  trackingUrlTemplate?: string
  isFreeShipping?: boolean
}

export type ShippingConfig = {
  freeShippingEnabled: boolean
  freeShippingThreshold: number
  couriers?: Array<{
    id: string
    name: string
    code: string
    active: boolean
  }>
}

export async function fetchShippingConfig(): Promise<ShippingConfig> {
  try {
    return await apiFetch<ShippingConfig>('/storefront/shipping-config')
  } catch {
    return { freeShippingEnabled: false, freeShippingThreshold: 0 }
  }
}

export type GuestDiscountPopupConfig = {
  enabled: boolean
  discountPercentage: number
  message: string
}

export async function fetchGuestDiscountPopupConfig(): Promise<GuestDiscountPopupConfig> {
  try {
    return await apiFetch<GuestDiscountPopupConfig>('/storefront/guest-discount-popup')
  } catch {
    return { enabled: false, discountPercentage: 0, message: '' }
  }
}

export type AutoDiscountResult = {
  valid: boolean
  discount?: { amount: number; percentage: number; label: string }
}

export async function fetchAutoDiscount(subtotal: number): Promise<AutoDiscountResult> {
  try {
    return await apiFetch<AutoDiscountResult>(`/storefront/orders/auto-discount?subtotal=${encodeURIComponent(subtotal)}`)
  } catch {
    return { valid: false }
  }
}

export type AvailableCoupon = {
  id: number
  code: string
  type: 'percentage' | 'fixed'
  value: number
  minCartValue: number
  maxDiscount: number | null
  description: string | null
  expiresAt: string | null
}

export async function fetchAvailableCoupons(): Promise<AvailableCoupon[]> {
  try {
    const data = await apiFetch<{ coupons: AvailableCoupon[] }>('/storefront/available-coupons')
    return data.coupons || []
  } catch {
    return []
  }
}

export async function confirmCodOrder(orderId: number, guestToken?: string) {
  return await apiFetch<{ ok: boolean; status: string; message: string }>(
    `/storefront/orders/${orderId}/confirm-cod`,
    {
      method: 'POST',
      body: JSON.stringify({ guestToken }),
    },
  )
}
