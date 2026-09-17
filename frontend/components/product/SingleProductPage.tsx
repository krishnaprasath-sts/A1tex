'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Heart,
  Minus,
  Plus,
  ShoppingCart,
  CheckCircle2,
  Zap,
  ShieldCheck,
  Truck,
  Sparkles,
  Lock,
} from 'lucide-react'
import ProductCard, { type ProductCardProduct } from '@/components/product/ProductCard'
import SizeGuideModal from '@/components/product/SizeGuideModal'
import { useCart, itemKey } from '@/components/cart/CartContext'
import { useAuth } from '@/components/auth/AuthContext'
import { useWishlist } from '@/components/wishlist/WishlistContext'
import type { StorefrontProduct } from '@/lib/api/types'
import { resolveImageUrl } from '@/lib/api/utils'
import { getDiscount, mapToProductCardProduct } from '@/lib/api/mappers'
import { apiFetch } from '@/lib/api/client'
import { fetchRelatedProducts } from '@/lib/api/storefront'
const FREE_SIZE_LABELS = new Set(['free size', 'freesize', 'one size', 'onesize'])

function isFreeSizeLabel(size: string) {
  return FREE_SIZE_LABELS.has(size.trim().toLowerCase())
}

type SingleProductPageProps = {
  product: StorefrontProduct
}

export default function SingleProductPage({ product }: SingleProductPageProps) {
  const cart = useCart()
  const router = useRouter()
  const { session } = useAuth()
  const { toggleWishlist, isWished } = useWishlist()

  const variants = product.variants || []
  const hasVariants = variants.length > 0
  
  const isSaree = useMemo(() => {
    const cat = (product.category || '').toLowerCase()
    const type = (product.type || '').toLowerCase()
    const name = (product.name || '').toLowerCase()
    return cat.includes('saree') || type.includes('saree') || name.includes('saree') || Boolean((product as any).sareeLength)
  }, [product])

  const defaultVariant = useMemo(() => {
    return variants.find(v => v.isDefault) || variants[0] || null
  }, [variants])

  const [selectedColor, setSelectedColor] = useState(defaultVariant?.colorName || product.color || '')
  const [selectedSize, setSelectedSize] = useState(() => (isSaree ? '' : (defaultVariant?.size || '')))
  const [showSizeGuide, setShowSizeGuide] = useState(false)
  const audience = product.gender || 'women'
  const [qty, setQty] = useState(1)
  const [openAccordion, setOpenAccordion] = useState<string | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<ProductCardProduct[]>([])
  const [showNotifyForm, setShowNotifyForm] = useState(false)
  const [notifyEmail, setNotifyEmail] = useState('')
  const [notifyPhone, setNotifyPhone] = useState('')
  const [notifySubmitted, setNotifySubmitted] = useState(false)
  const [notifyMessage, setNotifyMessage] = useState('')

  useEffect(() => {
    setSelectedColor(defaultVariant?.colorName || product.color || '')
    setSelectedSize(isSaree ? '' : (defaultVariant?.size || ''))
    setQty(1)
    setShowNotifyForm(false)
    setNotifySubmitted(false)
    setNotifyMessage('')
  }, [product.id, defaultVariant, product.color, isSaree])

  useEffect(() => {
    if (!product.id) return
    fetchRelatedProducts(product.id)
      .then(prods => {
        if (Array.isArray(prods) && prods.length > 0) {
          setRelatedProducts(prods.map(mapToProductCardProduct))
        } else {
          setRelatedProducts([])
        }
      })
      .catch(() => {
        setRelatedProducts([])
      })
  }, [product.id])

  // Determine current active variant based on selection
  const currentVariant = useMemo(() => {
    if (!hasVariants) return null
    let match = variants.find(v =>
      (v.colorName || '') === (selectedColor || '') &&
      (v.size || '') === (selectedSize || '')
    )
    if (!match) {
      match = variants.find(v => (v.colorName || '') === (selectedColor || ''))
    }
    return match || variants[0]
  }, [variants, hasVariants, selectedColor, selectedSize])

  // Check if the currently selected variant is already in cart
  const inCart = useMemo(() => {
    return cart.isInCart(
      product.id,
      currentVariant?.id,
      selectedColor || undefined,
      selectedSize || undefined,
    )
  }, [cart.isInCart, product.id, currentVariant?.id, selectedColor, selectedSize])

  // Variant specifics
  const price = currentVariant ? (currentVariant.price ?? 0) : (product.price ?? 0)
  const originalPrice = currentVariant ? (currentVariant.originalPrice ?? null) : (product.originalPrice ?? null)
  const sku = currentVariant ? currentVariant.sku : product.code

  const totalStock = (currentVariant ? currentVariant.stockQty : (product.stockQty ?? 0)) ?? 0

  // Cart item for this exact variant/color/size combination
  const cartItem = useMemo(() => {
    return cart.items.find(item => 
      item.id === product.id && 
      item.variantId === currentVariant?.id &&
      item.color === (selectedColor || undefined) &&
      item.size === (selectedSize || undefined)
    )
  }, [cart.items, product.id, currentVariant?.id, selectedColor, selectedSize])

  const cartQty = cartItem ? cartItem.qty : 0
  // Remaining purchasable stock = DB stock minus what's already in cart
  const stockQty = Math.max(0, totalStock - cartQty)
  // Out of stock when remaining available stock (after cart) is 0
  const isOutOfStock = stockQty <= 0

  // Sync quantity state with cart quantity if item is already in cart, otherwise default to 1
  useEffect(() => {
    if (inCart && cartQty > 0) {
      setQty(cartQty)
    } else {
      setQty(1)
    }
  }, [inCart, cartQty, selectedColor, selectedSize])

  // Constrain quantity state by total available stock
  useEffect(() => {
    if (qty > totalStock && totalStock > 0) {
      setQty(totalStock)
    }
  }, [totalStock, qty])

  // Images to display in gallery
  const displayImages = useMemo(() => {
    let list: string[] = []
    if (currentVariant?.imageUrl) {
      list.push(currentVariant.imageUrl)
    }
    if (currentVariant?.images && currentVariant.images.length > 0) {
      list = [...list, ...currentVariant.images.map(img => img.imageUrl)]
    }
    
    if (product.images && product.images.length > 0) {
      list = [...list, ...product.images.map(img => img.imageUrl)]
    }
    
    if (product.imageUrl) {
      list.push(product.imageUrl)
    }
    
    if (product.image) {
      list.push(product.image)
    }
    
    return Array.from(new Set(list.filter(url => typeof url === 'string' && url.trim().length > 0)))
  }, [currentVariant, product])

  const [mainImage, setMainImage] = useState(displayImages[0] || '')

  useEffect(() => {
    setMainImage(displayImages[0] || '')
  }, [displayImages])

  const activeThumb = useMemo(() => {
    return displayImages.find(image => image === mainImage) ?? displayImages[0]
  }, [mainImage, displayImages])

  // Colors
  const colorOptions = useMemo(() => {
    const map = new Map<string, { colorName: string, colorHex?: string, imageUrl?: string }>()
    variants.forEach(v => {
      if (v.colorName && !map.has(v.colorName)) {
        map.set(v.colorName, {
          colorName: v.colorName,
          colorHex: v.colorHex,
          imageUrl: v.imageUrl || v.images?.[0]?.imageUrl || product.image
        })
      }
    })
    return Array.from(map.values())
  }, [variants, product.image])

  const hasColorOptions = colorOptions.length > 0

  // Reset size when switching to a color that doesn't have the current size
  useEffect(() => {
    if (!hasColorOptions || !selectedColor) return
    const availableSizes = new Set(
      variants
        .filter(v => v.colorName === selectedColor && v.size)
        .map(v => v.size as string)
    )
    if (selectedSize && !availableSizes.has(selectedSize)) {
      setSelectedSize('')
    }
  }, [selectedColor, variants, hasColorOptions, selectedSize])

  // Sizes for the current color (or all sizes if no color variants exist)
  const sizeOptions = useMemo(() => {
    if (hasColorOptions && !selectedColor) return []
    const sizes = variants
      .filter(v => {
        if (hasColorOptions) return v.colorName === selectedColor && v.size
        return v.size
      })
      .map(v => v.size as string)
    return Array.from(new Set(sizes))
  }, [variants, selectedColor, hasColorOptions])

  const visibleSizeOptions = useMemo(() => {
    if (isSaree) return []
    return sizeOptions.filter(size => !isFreeSizeLabel(size))
  }, [sizeOptions, isSaree])
  const showSizeSelector = !isSaree && visibleSizeOptions.length > 0 && variants.some(v => v.size)

  useEffect(() => {
    if (isSaree || sizeOptions.length === 0) {
      if (selectedSize) setSelectedSize('')
      return
    }
    if (!selectedSize || !sizeOptions.includes(selectedSize)) {
      setSelectedSize(sizeOptions[0])
    }
  }, [isSaree, sizeOptions, selectedSize])

  const accordions = useMemo(() => [
    product.description ? { id: 'desc' as const, title: 'Description', content: product.description } : null,
    { id: 'shipping' as const, title: 'Shipping & Delivery', content: 'All orders are processed within 1–3 business days. Delivery takes 3–7 business days across India. Tracking details will be provided once dispatched. Every saree is meticulously inspected for premium weave quality prior to dispatch.' },
    product.metadata?.washCare ? { id: 'wash' as const, title: 'Wash Care & Maintenance', content: product.metadata.washCare } : null,
  ].filter(Boolean) as Array<{ id: string; title: string; content: string }>, [product])

  function updateQtyAmount(change: number) {
    setQty(current => Math.max(1, Math.min(totalStock > 0 ? totalStock : 1, current + change)))
  }

  async function handleBuyNow() {
    if (isOutOfStock) return

    const resolvedImg = resolveImageUrl(mainImage) || mainImage || ''
    sessionStorage.setItem('buyNowItem', JSON.stringify({
      id: product.id,
      name: product.name,
      slug: product.slug || product.code,
      price,
      originalPrice,
      image: resolvedImg,
      color: selectedColor || undefined,
      size: selectedSize || undefined,
      variantId: currentVariant?.id,
      variantLabel: currentVariant?.label,
      qty,
      stock: totalStock,
    }))
    router.push('/checkout?buyNow=1')
  }

  function handleAddToCart() {
    if (inCart) {
      const key = itemKey(product.id, currentVariant?.id, selectedColor || undefined, selectedSize || undefined)
      cart.updateQty(key, qty)
      cart.setDrawerOpen(true)
      return
    }
    const resolvedImg = resolveImageUrl(mainImage) || mainImage || ''
    cart.addItem({
      id: product.id,
      name: product.name,
      slug: product.slug || product.code,
      price,
      originalPrice,
      image: resolvedImg,
      color: selectedColor || undefined,
      size: selectedSize || undefined,
      variantId: currentVariant?.id,
      variantLabel: currentVariant?.label,
      qty,
      stock: totalStock,
    })
    cart.setDrawerOpen(true)
  }

  async function handleNotify() {
    if (!notifyEmail.trim()) return
    try {
      await apiFetch('/storefront/stock-notify', {
        method: 'POST',
        body: JSON.stringify({
          productId: product.id,
          variantId: currentVariant?.id,
          email: notifyEmail.trim(),
          phone: notifyPhone.trim() || undefined,
          customerName: session?.name || undefined,
        }),
      })
      setNotifySubmitted(true)
      setNotifyMessage('')
    } catch (err: any) {
      setNotifyMessage(err?.message || 'Something went wrong. Try again.')
    }
  }

  function handleRelatedAddToCart(relatedProduct: ProductCardProduct) {
    const relatedSlug = relatedProduct.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    cart.addItem({
      id: relatedProduct.id || relatedSlug,
      name: relatedProduct.name,
      slug: relatedSlug,
      price: relatedProduct.price,
      originalPrice: relatedProduct.oldPrice,
      image: relatedProduct.image,
      variantId: relatedProduct.variantId,
      variantLabel: relatedProduct.variantLabel,
      color: relatedProduct.color,
      size: relatedProduct.size,
      stock: relatedProduct.stock,
    })
    cart.setDrawerOpen(true)
  }

  return (
    <main className="product-page min-h-screen bg-white font-product text-[#333333] antialiased pb-28 md:pb-16">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 md:py-10 lg:px-8 xl:py-12">
        <div className="flex min-w-0 flex-col items-start gap-8 lg:flex-row lg:gap-10 xl:gap-12">
          
          {/* Left Column: Product Image Gallery */}
          <section className="flex w-full min-w-0 flex-col items-start gap-4 lg:w-[48%] xl:w-[45%] lg:flex-row-reverse xl:sticky xl:top-[84px]">
            <div className="group relative aspect-[3/4] w-full min-w-0 flex-1 cursor-crosshair overflow-hidden rounded-2xl border border-stone-200/80 bg-stone-100 shadow-xs">
              {mainImage && (
                <img
                  src={resolveImageUrl(mainImage)}
                  alt={product.name}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="h-full w-full origin-top object-cover object-top transition-transform duration-500 group-hover:scale-105"
                />
              )}
              {(originalPrice && originalPrice > price) || isOutOfStock ? (
                <div className={`absolute left-0 top-4 rounded-r-lg px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-md ${isOutOfStock ? 'bg-stone-600' : 'bg-[#8B1A1A]'}`}>
                  {isOutOfStock ? 'Out of Stock' : `${getDiscount(price, originalPrice)}% OFF`}
                </div>
              ) : product.isNew ? (
                <div className="absolute left-0 top-4 rounded-r-lg bg-[#8B1A1A] px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-md">
                  New Arrival
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => toggleWishlist(product.id, product.name, currentVariant?.id ?? null, selectedColor || undefined, selectedSize || undefined)}
                className={`absolute right-3.5 top-3.5 z-20 flex h-10 w-10 items-center justify-center rounded-full shadow-md backdrop-blur-sm transition hover:scale-110 cursor-pointer ${
                  isWished(product.id, currentVariant?.id ?? null)
                    ? 'bg-[#8B1A1A] text-white'
                    : 'bg-white/90 text-[#0F172A] hover:bg-white'
                }`}
                aria-label={isWished(product.id, currentVariant?.id ?? null) ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart className={`h-5 w-5 transition ${isWished(product.id, currentVariant?.id ?? null) ? 'fill-white' : ''}`} />
              </button>
            </div>

            {displayImages.length > 1 && (
              <div className="product-thumb-scroll flex w-full shrink-0 gap-2.5 overflow-x-auto pb-2 lg:max-h-[600px] lg:w-[84px] lg:flex-col lg:overflow-y-auto lg:pb-0">
                {displayImages.map(image => {
                  const isActive = activeThumb === image
                  return (
                    <button
                      key={image}
                      type="button"
                      onClick={() => setMainImage(image)}
                      className={`aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-xl transition-all duration-200 sm:w-20 lg:w-full cursor-pointer ${
                        isActive
                          ? 'border-2 border-[#8B1A1A] ring-2 ring-[#8B1A1A]/20 shadow-xs'
                          : 'border border-stone-200 opacity-75 hover:opacity-100 hover:border-stone-400'
                      }`}
                      aria-label="Change product image"
                    >
                      <img src={resolveImageUrl(image)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          {/* Right Column: Details & Actions */}
          <section className="flex w-full min-w-0 flex-col lg:w-[52%] xl:w-[55%] space-y-6">
            <div>
              <h1 className="font-playfair break-words text-2xl sm:text-3xl md:text-4xl font-medium tracking-wide leading-snug text-[var(--charcoal)]">
                {product.name}
              </h1>

              {/* SKU & Category Strip */}
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {sku ? (
                  <div className="inline-flex items-center gap-1.5 rounded-md border border-stone-200/90 bg-stone-50 px-2.5 py-1 text-[11px] font-medium text-stone-600 shadow-2xs">
                    <span className="font-bold text-[10px] uppercase tracking-wider text-stone-400">SKU:</span>
                    <span className="font-mono font-semibold text-stone-800">{sku}</span>
                  </div>
                ) : null}
                {product.category && (
                  <span className="inline-flex items-center rounded-md border border-amber-200/60 bg-amber-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-800">
                    {product.category}
                  </span>
                )}
              </div>

              {/* Price Row */}
              <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-2xl font-extrabold text-[#8B1A1A] sm:text-3xl md:text-[32px]">
                  ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                {originalPrice && (
                  <span className="text-lg text-stone-400 line-through font-medium">
                    ₹{originalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                )}
                {originalPrice && originalPrice > price && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md uppercase">
                    Save ₹{(originalPrice - price).toLocaleString('en-IN')}
                  </span>
                )}
              </div>
              {product.gstRate != null && product.gstRate > 0 ? (
                <p className="mt-1 text-xs text-stone-500 font-medium">
                  incl. {product.gstRate}% GST (CGST {product.gstRate / 2}% + SGST {product.gstRate / 2}%) — No hidden charges
                </p>
              ) : (
                <p className="mt-1 text-xs text-stone-500 font-medium">Taxes included.</p>
              )}
            </div>

            {/* Colors Section */}
            {colorOptions.length > 0 ? (
              <div className="pt-2 border-t border-stone-200/80">
                <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-stone-700">
                  Color: <span className="font-normal text-stone-600 capitalize">{selectedColor}</span>
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {colorOptions.map(variant => {
                    const isSelected = selectedColor === variant.colorName
                    return (
                      <button
                        key={variant.colorName}
                        type="button"
                        onClick={() => setSelectedColor(variant.colorName)}
                        className={`flex flex-col items-center w-16 cursor-pointer overflow-hidden rounded-xl transition-all ${
                          isSelected
                            ? 'border-2 border-[#8B1A1A] p-0.5 ring-2 ring-[#8B1A1A]/20 shadow-xs'
                            : 'border border-stone-200 hover:border-stone-400 bg-white'
                        }`}
                        aria-label={`Select ${variant.colorName}`}
                      >
                        <div className="h-14 w-full overflow-hidden rounded-lg">
                          {variant.imageUrl ? (
                            <img src={resolveImageUrl(variant.imageUrl)} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full" style={{ backgroundColor: variant.colorHex || '#ccc' }} />
                          )}
                        </div>
                        <span className="my-1 block text-[10px] font-semibold text-stone-600 truncate w-full text-center px-1">
                          {variant.colorName}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : selectedColor ? (
              <div className="pt-2 border-t border-stone-200/80">
                <p className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Color: <span className="font-normal text-stone-600 capitalize">{selectedColor}</span>
                </p>
              </div>
            ) : null}

            {/* Size Section */}
            {showSizeSelector && (
              <div className="pt-2 border-t border-stone-200/80">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-stone-700">Select Size</p>
                  <button type="button" onClick={() => setShowSizeGuide(true)} className="text-xs font-semibold text-[#8B1A1A] underline hover:text-[#721226] cursor-pointer">
                    Size Guide
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {visibleSizeOptions.map(size => {
                    const isSelected = selectedSize === size
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`flex h-12 min-w-[3.5rem] items-center justify-center rounded-xl border px-4 text-xs sm:text-sm font-bold uppercase tracking-wider transition cursor-pointer ${
                          isSelected
                            ? 'border-[#8B1A1A] bg-[#8B1A1A] text-white shadow-xs'
                            : 'border-stone-300 bg-white text-stone-800 hover:border-[#8B1A1A]'
                        }`}
                      >
                        {size}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Quantity Selector & In Stock Status */}
            <div className="pt-3 border-t border-stone-200/80 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-700">Quantity</span>
                  <div className="flex h-13 w-36 items-center rounded-xl border border-stone-300 bg-stone-50/80 p-1.5 shadow-2xs">
                    <button
                      type="button"
                      className="flex h-full w-10 items-center justify-center rounded-lg bg-white text-stone-700 shadow-2xs transition hover:bg-stone-100 disabled:opacity-30 cursor-pointer"
                      onClick={() => updateQtyAmount(-1)}
                      disabled={qty <= 1}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      value={qty}
                      readOnly
                      className="h-full w-full border-none bg-transparent text-center text-base font-extrabold text-stone-900 outline-none"
                      aria-label="Quantity"
                    />
                    <button
                      type="button"
                      className="flex h-full w-10 items-center justify-center rounded-lg bg-white text-stone-700 shadow-2xs transition hover:bg-stone-100 disabled:opacity-30 cursor-pointer"
                      onClick={() => updateQtyAmount(1)}
                      disabled={qty >= totalStock}
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {!isOutOfStock ? (
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    {stockQty < 10 ? (
                      <span className="font-bold text-[#8B1A1A]">Only {stockQty} left in stock</span>
                    ) : (
                      <span className="text-emerald-700 font-semibold">In Stock & Ready to Ship</span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs font-bold text-rose-600">Currently Sold Out</span>
                )}
              </div>

              {/* Action Buttons: 2-column on mobile & desktop with generous height & touch targets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                <button
                  type="button"
                  className={`flex h-14 sm:h-[58px] w-full items-center justify-center gap-3 rounded-2xl px-6 text-sm sm:text-base font-extrabold uppercase tracking-wider text-white shadow-lg shadow-[#8B1A1A]/20 transition-all duration-200 cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
                    isOutOfStock
                      ? 'bg-stone-400 hover:bg-stone-500 shadow-none'
                      : 'bg-gradient-to-r from-[#6B1110] via-[#8B1A1A] to-[#A32323] hover:from-[#5A0E0D] hover:to-[#8B1A1A]'
                  }`}
                  onClick={() => {
                    if (isOutOfStock) {
                      setShowNotifyForm(true)
                      if (session?.email) setNotifyEmail(session.email)
                    } else {
                      handleBuyNow()
                    }
                  }}
                >
                  <Zap className="h-5 w-5 fill-[#F5E6C8] text-[#F5E6C8]" />
                  <span>{isOutOfStock ? 'Notify When Available' : 'BUY NOW'}</span>
                </button>

                {!isOutOfStock && (
                  <button
                    type="button"
                    id={inCart ? 'add-more-btn' : 'add-to-cart-btn'}
                    className="flex h-14 sm:h-[58px] w-full items-center justify-center gap-3 rounded-2xl border-2 border-[#8B1A1A] bg-[#FDF6F0] px-5 text-sm sm:text-base font-extrabold uppercase tracking-wider text-[#8B1A1A] transition-all duration-200 hover:bg-[#8B1A1A] hover:text-white cursor-pointer shadow-sm hover:scale-[1.01] active:scale-[0.99]"
                    onClick={handleAddToCart}
                  >
                    <ShoppingCart className="h-5 w-5 shrink-0" />
                    <span>{inCart ? 'ADD MORE TO BAG' : 'ADD TO CART'}</span>
                  </button>
                )}
              </div>

              {/* Out of Stock Notify Modal/Box */}
              {showNotifyForm && (
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:p-5 animate-in fade-in duration-200">
                  {notifySubmitted ? (
                    <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-emerald-700">
                      <CheckCircle2 className="h-5 w-5 shrink-0" />
                      <span>We will notify you immediately once this saree is back in stock.</span>
                    </div>
                  ) : (
                    <>
                      <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-stone-700">Get notified when back in stock</p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="email"
                          value={notifyEmail}
                          onChange={e => { if (!session) setNotifyEmail(e.target.value) }}
                          placeholder="Your email address"
                          readOnly={!!session}
                          className={`flex-1 h-12 rounded-xl border px-3.5 text-xs sm:text-sm outline-none focus:border-[#8B1A1A] ${session ? 'cursor-not-allowed bg-stone-100 text-stone-500' : 'border-stone-300 bg-white'}`}
                        />
                        <button
                          type="button"
                          onClick={handleNotify}
                          disabled={!notifyEmail.trim()}
                          className="h-12 rounded-xl bg-[#8B1A1A] px-5 text-xs sm:text-sm font-bold uppercase text-white transition hover:bg-[#721226] disabled:opacity-50 cursor-pointer shrink-0"
                        >
                          Notify Me
                        </button>
                      </div>
                      <input
                        type="tel"
                        value={notifyPhone}
                        onChange={e => setNotifyPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="WhatsApp / Phone number (optional)"
                        className="mt-2.5 h-12 w-full rounded-xl border border-stone-300 bg-white px-3.5 text-xs sm:text-sm outline-none focus:border-[#8B1A1A]"
                      />
                      {notifyMessage && <p className="mt-2 text-xs text-rose-600 font-medium">{notifyMessage}</p>}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* 4-Column Trust Guarantee Strip */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 pt-4 border-t border-stone-200/80">
              <div className="flex flex-col items-center text-center p-3 rounded-xl bg-stone-50/70 border border-stone-200/60">
                <ShieldCheck className="h-5 w-5 text-[#8B1A1A] mb-1.5" />
                <span className="text-[11px] font-bold text-stone-900">100% Authentic</span>
                <span className="text-[10px] text-stone-500">Pure Handloom</span>
              </div>
              <div className="flex flex-col items-center text-center p-3 rounded-xl bg-stone-50/70 border border-stone-200/60">
                <Truck className="h-5 w-5 text-[#8B1A1A] mb-1.5" />
                <span className="text-[11px] font-bold text-stone-900">Fast Shipping</span>
                <span className="text-[10px] text-stone-500">All-India Delivery</span>
              </div>
              <div className="flex flex-col items-center text-center p-3 rounded-xl bg-stone-50/70 border border-stone-200/60">
                <Sparkles className="h-5 w-5 text-[#8B1A1A] mb-1.5" />
                <span className="text-[11px] font-bold text-stone-900">Quality Checked</span>
                <span className="text-[10px] text-stone-500">100% Inspected</span>
              </div>
              <div className="flex flex-col items-center text-center p-3 rounded-xl bg-stone-50/70 border border-stone-200/60">
                <Lock className="h-5 w-5 text-[#8B1A1A] mb-1.5" />
                <span className="text-[11px] font-bold text-stone-900">Secure Pay</span>
                <span className="text-[10px] text-stone-500">UPI / Cards / Net Banking</span>
              </div>
            </div>

            {/* Product Accordions */}
            <div className="border-t border-stone-200/90 pt-2 divide-y divide-stone-200/80">
              {accordions.map(item => {
                const isOpen = openAccordion === item.id
                return (
                  <div key={item.id} className="py-1">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between py-3.5 text-left cursor-pointer group"
                      onClick={() => setOpenAccordion(isOpen ? null : item.id)}
                    >
                      <span className="text-sm font-bold text-stone-900 group-hover:text-[#8B1A1A] transition-colors">{item.title}</span>
                      <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 group-hover:bg-[#8B1A1A]/10 group-hover:text-[#8B1A1A] transition-colors">
                        {isOpen ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      </div>
                    </button>
                    <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[500px] opacity-100 pb-3.5' : 'max-h-0 opacity-0'}`}>
                      {item.content && (
                        <p className="text-xs sm:text-sm leading-relaxed text-stone-600 whitespace-pre-line bg-stone-50/60 p-3.5 rounded-xl border border-stone-200/60">
                          {item.content}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

          </section>
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <section className="mt-16 md:mt-24 pt-10 border-t border-stone-200/80 mb-12 sm:mb-16">
            <div className="text-center mb-8 sm:mb-10 md:mb-12">
              <h2 className="font-playfair text-2xl sm:text-3xl md:text-4xl font-medium italic tracking-wide text-[var(--charcoal)]">
                Related Products
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-stone-500 font-normal">
                Explore more handpicked creations curated to complement your style
              </p>
              <div className="mx-auto mt-3 h-[2px] w-12 bg-[#8B1A1A]/40 rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4 md:gap-6">
              {relatedProducts.map(rp => (
                <ProductCard key={rp.id ?? rp.name} product={rp} onAddToCart={() => handleRelatedAddToCart(rp)} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Size Guide Modal */}
      {showSizeGuide && (
        <SizeGuideModal audience={audience} onClose={() => setShowSizeGuide(false)} />
      )}

      {/* Mobile Floating Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-stone-200/90 bg-white/95 backdrop-blur-md p-3 px-4 shadow-[0_-8px_25px_rgba(0,0,0,0.08)] md:hidden animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center gap-3">
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs text-stone-600 font-semibold truncate">{product.name}</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-extrabold text-[#8B1A1A]">₹{price.toLocaleString('en-IN')}</span>
              {originalPrice && (
                <span className="text-xs text-stone-400 line-through">₹{originalPrice.toLocaleString('en-IN')}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {!isOutOfStock && (
              <button
                type="button"
                onClick={handleAddToCart}
                className="flex h-13 w-13 items-center justify-center rounded-xl border-2 border-[#8B1A1A] bg-[#FDF6F0] text-[#8B1A1A] active:scale-95 transition cursor-pointer shadow-xs hover:bg-[#8B1A1A] hover:text-white"
                aria-label="Add to cart"
              >
                <ShoppingCart className="h-5 w-5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (isOutOfStock) {
                  setShowNotifyForm(true)
                } else {
                  handleBuyNow()
                }
              }}
              className="flex h-13 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6B1110] to-[#8B1A1A] px-5 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white shadow-md active:scale-95 transition cursor-pointer"
            >
              <Zap className="h-4 w-4 fill-[#F5E6C8] text-[#F5E6C8]" />
              <span>{isOutOfStock ? 'Notify Me' : 'BUY NOW'}</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
