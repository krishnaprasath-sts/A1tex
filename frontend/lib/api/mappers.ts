import type { StorefrontProduct } from './types'
import type { ProductCardProduct, ProductColor } from '@/components/product/ProductCard'

export function getDiscount(price: number, originalPrice?: number | null): number | null {
  if (originalPrice == null || originalPrice <= price) return null
  return Math.round(((originalPrice - price) / originalPrice) * 100)
}

export function formatCleanColor(raw?: string | null): string | undefined {
  if (!raw) return undefined
  const trimmed = raw.trim()
  if (trimmed.includes('from-[') || trimmed.includes('to-[') || trimmed.startsWith('#')) {
    if (trimmed.includes('#E8DEC8') || trimmed.includes('#B09070')) return 'Natural Beige'
    if (trimmed.includes('#C8A050') || trimmed.includes('#8B1A2B')) return 'Gold & Maroon'
    if (trimmed.includes('#E8C0D0') || trimmed.includes('#C04060')) return 'Rose Pink'
    if (trimmed.includes('#D4E8C0') || trimmed.includes('#5C9C3A')) return 'Sage Green'
    if (trimmed.includes('#202020') || trimmed.includes('#404040')) return 'Charcoal'
    if (trimmed.includes('#E8E0D0') || trimmed.includes('#A09070')) return 'Ivory Cream'
    return undefined
  }
  return trimmed
}

export function mapToProductCardProduct(p: StorefrontProduct): ProductCardProduct {
  const colors: ProductColor[] = []
  const seen = new Set<string>()
  ;(p.variants || []).forEach(v => {
    if (v.colorName && v.colorHex) {
      const nameKey = v.colorName.trim().toLowerCase()
      const hexKey = v.colorHex.trim().toLowerCase()
      if (!seen.has(nameKey) && !seen.has(hexKey)) {
        seen.add(nameKey)
        seen.add(hexKey)
        colors.push({
          name: v.colorName,
          hex: v.colorHex,
          image: v.imageUrl || v.images?.[0]?.imageUrl || p.imageUrl || p.image,
        })
      }
    }
  })

  const defaultVariant = p.hasVariants && p.variants?.length
    ? p.variants.find(v => v.isDefault) || p.variants[0]
    : null

  const inStockVariant = p.hasVariants && p.variants?.length
    ? p.variants.find(v => (v.stockQty ?? 0) > 0) || defaultVariant
    : null

  const bestVariant = inStockVariant || defaultVariant
  const disc = getDiscount(p.price, p.originalPrice)

  const rawColor = bestVariant?.colorName || p.color
  const cleanColor = formatCleanColor(rawColor)

  const catName = (p.category || '').trim()
  const typeName = (p.type || '').trim()
  const displayCategory = catName || typeName
  const displayFabric = typeName && typeName.toLowerCase() !== catName.toLowerCase() ? typeName : ''

  return {
    id: p.id,
    name: p.name,
    category: displayCategory,
    fabric: displayFabric,
    occasion: '',
    image: p.imageUrl || p.image,
    price: p.price,
    oldPrice: p.originalPrice ?? null,
    badge: p.isNew ? 'New' : p.isBestSeller ? 'Best Seller' : disc ? `${disc}% OFF` : undefined,
    slug: p.slug || undefined,
    href: p.slug ? `/products/${p.slug}` : undefined,
    colors: colors.length > 0 ? colors : undefined,
    rating: p.averageRating ?? 0,
    reviews: undefined,
    variantId: bestVariant?.id,
    variantLabel: bestVariant?.label,
    color: cleanColor,
    size: bestVariant?.size,
    stock: bestVariant?.stockQty ?? p.stockQty,
    enableBackInStockNotify: p.enableBackInStockNotify,
  }
}
