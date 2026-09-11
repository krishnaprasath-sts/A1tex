export function plain<T = Record<string, unknown>>(row: unknown): T {
  return (row as { get: (options: { plain: boolean }) => T }).get({ plain: true })
}

export function decodeJsonValue<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') return (value ?? fallback) as T
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function mapCategory(row: unknown) {
  const item = plain<any>(row)
  const rawHref = item.href && item.href !== '#' && item.href.trim() !== '' ? item.href : ''
  const slug = item.slug || (item.name ? item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '')
  const href = rawHref || (slug ? `/collections/${slug}` : '/shop')

  return {
    id: item.id,
    parentId: item.parentId,
    name: item.name,
    label: item.name,
    slug,
    href,
    image: item.imageUrl,
    imageUrl: item.imageUrl,
    tag: item.tag,
    section: item.section,
    sortOrder: item.sortOrder,
    navVisible: item.navVisible,
    homeVisible: item.homeVisible,
    active: item.active,
    metadata: item.metadata,
  }
}

export function mapProduct(row: unknown) {
  const item = plain<any>(row)
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    slug: item.slug,
    type: item.type,
    description: item.description,
    category: item.category,
    categoryId: item.categoryId ?? null,
    price: (() => {
      if (item.hasVariants && item.variants?.length) {
        const v = item.variants.find((v: any) => v.isDefault) ?? item.variants[0]
        const p = v?.price ?? item.price
        return p == null ? 0 : Number(p)
      }
      return item.price == null ? 0 : Number(item.price)
    })(),
    originalPrice: (() => {
      if (item.hasVariants && item.variants?.length) {
        const v = item.variants.find((v: any) => v.isDefault) ?? item.variants[0]
        const op = v?.originalPrice ?? item.originalPrice
        return op == null ? null : Number(op)
      }
      return item.originalPrice == null ? null : Number(item.originalPrice)
    })(),
    stockQty: item.stockQty,
    enableBackInStockNotify: item.enableBackInStockNotify,
    image: item.imageUrl,
    imageUrl: item.imageUrl,
    color: item.color,
    gender: item.gender,
    ageGroup: item.ageGroup,
    hasVariants: item.hasVariants,
    status: item.status,
    featured: item.featured,
    isNew: item.isNew,
    isBestSeller: item.isBestSeller,
    sortOrder: item.sortOrder,
    gstRate: item.gstRate == null ? null : Number(item.gstRate),
    weightKg: item.weightKg == null ? null : Number(item.weightKg),
    metadata: item.metadata || null,
    averageRating: item.averageRating ?? undefined,
    images: item.images || [],
    variants: item.variants ? item.variants.map((v: any) => ({
      ...v,
      images: v.images || []
    })) : [],
  }
}
