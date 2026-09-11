'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Heart,
  Minus,
  Plus,
  ShoppingCart,
  CheckCircle2,
} from 'lucide-react'
import ProductCard, { type ProductCardProduct } from '@/components/product/ProductCard'
import ReviewSection from '@/components/product/ReviewSection'
import SizeGuideModal from '@/components/product/SizeGuideModal'
import { useCart, itemKey } from '@/components/cart/CartContext'
import { useAuth } from '@/components/auth/AuthContext'
import { useWishlist } from '@/components/wishlist/WishlistContext'
import type { StorefrontProduct } from '@/lib/api/types'
import { resolveImageUrl } from '@/lib/api/utils'
import { getDiscount, mapToProductCardProduct } from '@/lib/api/mappers'
import { apiFetch } from '@/lib/api/client'
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
  
  const defaultVariant = useMemo(() => {
    return variants.find(v => v.isDefault) || variants[0] || null
  }, [variants])

  const [selectedColor, setSelectedColor] = useState(defaultVariant?.colorName || product.color || '')
  const [selectedSize, setSelectedSize] = useState(defaultVariant?.size || '')
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
    setSelectedSize(defaultVariant?.size || '')
    setQty(1)
    setShowNotifyForm(false)
    setNotifySubmitted(false)
    setNotifyMessage('')
  }, [product.id, defaultVariant, product.color])

  useEffect(() => {
    if (!product.categoryId) return
    apiFetch<{ products?: any[] }>(`/storefront/products/${product.id}/related`)
      .then(data => {
        if (Array.isArray(data?.products)) {
          setRelatedProducts(data.products.map(mapToProductCardProduct))
        } else {
          setRelatedProducts([])
        }
      })
      .catch(() => {
        setRelatedProducts([])
      })
  }, [product.id, product.categoryId])

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

  const visibleSizeOptions = useMemo(() => sizeOptions.filter(size => !isFreeSizeLabel(size)), [sizeOptions])
  const showSizeSelector = visibleSizeOptions.length > 0 && variants.some(v => v.size)

  useEffect(() => {
    if (sizeOptions.length === 0) {
      if (selectedSize) setSelectedSize('')
      return
    }
    if (!selectedSize || !sizeOptions.includes(selectedSize)) {
      setSelectedSize(sizeOptions[0])
    }
  }, [sizeOptions, selectedSize])

  const accordions = useMemo(() => [
    product.description ? { id: 'desc' as const, title: 'Description', content: product.description } : null,
    { id: 'shipping' as const, title: 'Shipping & Delivery', content: 'All orders are processed within 1\u20133 business days. Delivery takes 3\u20137 business days across India. Tracking details will be provided once dispatched. We accept returns within 7 days of delivery, provided the product is unused and in its original condition. Refunds are processed within 5\u20137 business days. Orders can be cancelled within 24 hours of purchase.' },
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
      // Already in cart — update to user-selected qty and open cart drawer
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
    <main className="product-page min-h-screen bg-white font-product text-[#333333] antialiased">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 md:py-10 lg:px-8 xl:py-12">
        <div className="flex min-w-0 flex-col items-start gap-8 lg:flex-row lg:gap-10 xl:gap-0">
          <section className="flex w-full min-w-0 flex-col items-start gap-4 lg:w-[42%] lg:flex-row-reverse xl:sticky xl:top-[76px] xl:h-[calc(100vh-92px)] xl:w-[38%]">
            <div className="group relative aspect-[3/4] w-full min-w-0 flex-1 cursor-crosshair overflow-hidden rounded-md bg-gray-100 lg:aspect-[3/4] xl:h-full xl:min-h-0 xl:aspect-auto">
              {mainImage && (
                <img
                  src={resolveImageUrl(mainImage)}
                  alt={product.name}
                  className="h-full w-full origin-top object-cover object-top transition-transform duration-500 group-hover:scale-110"
                />
              )}
              {(originalPrice && originalPrice > price) || isOutOfStock ? (
                <div className={`absolute left-0 top-4 rounded-r-md px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm ${isOutOfStock ? 'bg-gray-500' : 'bg-[#A34336]'}`}>
                  {isOutOfStock ? 'Notify' : `${getDiscount(price, originalPrice)}% OFF`}
                </div>
              ) : product.isNew ? (
                <div className="absolute left-0 top-4 rounded-r-md bg-[#A34336] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                  New
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => toggleWishlist(product.id, product.name, currentVariant?.id ?? null, selectedColor || undefined, selectedSize || undefined)}
                className={`absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full shadow-sm transition hover:scale-110 ${
                  isWished(product.id, currentVariant?.id ?? null)
                    ? 'bg-[#A34336] text-white'
                    : 'bg-white/90 text-[#0F172A] hover:bg-white'
                }`}
                aria-label={isWished(product.id, currentVariant?.id ?? null) ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart className={`h-4.5 w-4.5 transition ${isWished(product.id, currentVariant?.id ?? null) ? 'fill-white' : ''}`} />
              </button>
            </div>

            {displayImages.length > 1 && (
              <div className="product-thumb-scroll flex w-full shrink-0 gap-3 overflow-x-auto pb-2 lg:max-h-[650px] lg:w-[78px] lg:flex-col lg:overflow-y-auto lg:pb-0 xl:h-full xl:max-h-full xl:w-[85px]">
                {displayImages.map(image => {
                  const isActive = activeThumb === image
                  return (
                    <button
                      key={image}
                      type="button"
                      onClick={() => setMainImage(image)}
                      className={`aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-sm transition-colors duration-200 sm:w-20 lg:w-full ${
                        isActive ? 'border-2 border-[#A34336]' : 'border border-gray-200 hover:border-[#A34336]'
                      }`}
                      aria-label="Change product image"
                    >
                      <img src={resolveImageUrl(image)} alt="" className="h-full w-full object-cover" />
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          <section className="flex w-full min-w-0 flex-col lg:w-[58%] xl:w-[62%] lg:pl-10 xl:pl-16">
            <h1 className="font-playfair mb-1 break-words text-2xl sm:text-3xl md:text-4xl font-medium tracking-wide leading-tight text-[var(--charcoal)]">{product.name}</h1>

            <div className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-2xl font-bold text-[#A34336] md:text-[28px]">{'\u20B9'}{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              {originalPrice && (
                <span className="text-lg text-gray-400 line-through">{'\u20B9'}{originalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              )}
            </div>
            {product.gstRate != null && product.gstRate > 0 ? (
              <p className="mb-6 text-[13px] text-gray-500">incl. {product.gstRate}% GST (CGST {product.gstRate / 2}% + SGST {product.gstRate / 2}%)</p>
            ) : (
              <p className="mb-6 text-[13px] text-gray-500">Tax included.</p>
            )}

            <div className="mb-6">
              {colorOptions.length > 0 ? (
                <div className="mt-4">
                  <p className="mb-2 text-sm font-medium">
                    Color: <span className="font-normal text-gray-600">{selectedColor}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map(variant => {
                      const isSelected = selectedColor === variant.colorName
                      return (
                        <button
                          key={variant.colorName}
                          type="button"
                          onClick={() => setSelectedColor(variant.colorName)}
                          className={`flex flex-col items-center w-14 cursor-pointer overflow-hidden rounded-[4px] transition ${
                            isSelected ? 'border-2 border-[#A34336] p-0.5' : 'border border-gray-300 hover:border-[#A34336]'
                          }`}
                          aria-label={`Select ${variant.colorName}`}
                        >
                          <div className="h-14 w-full overflow-hidden rounded-sm">
                            {variant.imageUrl ? (
                              <img src={resolveImageUrl(variant.imageUrl)} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full" style={{ backgroundColor: variant.colorHex || '#ccc' }} />
                            )}
                          </div>
                          <span className="mt-0.5 block text-[9px] font-medium text-gray-500 truncate w-full text-center leading-tight">{variant.colorName}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : selectedColor ? (
                <div className="mt-4">
                  <p className="text-sm font-medium">
                    Color: <span className="font-normal text-gray-600">{selectedColor}</span>
                  </p>
                </div>
              ) : null}

              {showSizeSelector && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Size</p>
                    <button type="button" onClick={() => setShowSizeGuide(true)} className="text-xs text-gray-500 underline hover:text-[#A34336]">Size Guide</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {visibleSizeOptions.map(size => {
                      const isSelected = selectedSize === size
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setSelectedSize(size)}
                          className={`flex h-10 min-w-[3rem] items-center justify-center rounded-[4px] border px-3 text-sm font-medium transition ${
                            isSelected ? 'border-[#A34336] bg-[#A34336] text-white' : 'border-gray-300 bg-white text-[#333333] hover:border-[#A34336]'
                          }`}
                        >
                          {size}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mb-6 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-32 shrink-0 items-center overflow-hidden rounded-[4px] border border-gray-300 bg-white">
                  <button type="button" className="flex h-full w-10 items-center justify-center text-gray-600 transition hover:bg-gray-100 disabled:opacity-50" onClick={() => updateQtyAmount(-1)} disabled={qty <= 1}>
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <input value={qty} readOnly className="h-full w-full border-none bg-transparent text-center text-sm font-medium outline-none" aria-label="Quantity" />
                  <button type="button" className="flex h-full w-10 items-center justify-center text-gray-600 transition hover:bg-gray-100 disabled:opacity-50" onClick={() => updateQtyAmount(1)} disabled={qty >= totalStock}>
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  className={`flex-1 rounded-[4px] py-3.5 text-[15px] font-medium tracking-wide text-white transition duration-300 ${
                    isOutOfStock ? 'bg-gray-500 hover:bg-gray-600' : 'bg-[#A34336] hover:bg-[#8e382b]'
                  }`}
                  onClick={() => { if (isOutOfStock) { setShowNotifyForm(true); if (session?.email) setNotifyEmail(session.email) } else { handleBuyNow() } }}
                >
                  {isOutOfStock ? 'Notify Me' : 'BUY NOW'}
                </button>

                {!isOutOfStock && (
                  <button
                    type="button"
                    id={inCart ? 'add-more-btn' : 'add-to-cart-btn'}
                    className="flex flex-1 items-center justify-center gap-2 rounded-[4px] border-2 border-[#A34336] py-3.5 text-[15px] font-medium tracking-wide text-[#A34336] transition duration-300 hover:bg-[#A34336] hover:text-white disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent"
                    onClick={handleAddToCart}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {inCart ? 'ADD MORE' : 'ADD TO CART'}
                  </button>
                )}
              </div>
              {!isOutOfStock && stockQty < 10 && (
                <p className="text-xs text-[#A34336]">Only {stockQty} left in stock - order soon.</p>
              )}

              {showNotifyForm && (
                <div className="rounded border border-gray-200 bg-gray-50 p-4">
                  {notifySubmitted ? (
                    <p className="text-sm font-medium text-green-700">We will notify you when this product is back in stock.</p>
                  ) : (
                    <>
                      <p className="mb-2 text-sm font-medium text-gray-700">Get notified when back in stock</p>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={notifyEmail}
                          onChange={e => { if (!session) setNotifyEmail(e.target.value) }}
                          placeholder="Your email address"
                          readOnly={!!session}
                          className={`flex-1 rounded border px-3 py-2 text-sm outline-none focus:border-[#A34336] ${session ? 'cursor-not-allowed bg-gray-100 text-gray-500' : 'border-gray-300 bg-white'}`}
                        />
                        <button
                          type="button"
                          onClick={handleNotify}
                          disabled={!notifyEmail.trim()}
                          className="rounded bg-[#A34336] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#8e382b] disabled:opacity-50"
                        >
                          Notify Me
                        </button>
                      </div>
                      <input
                        type="tel"
                        value={notifyPhone}
                        onChange={e => setNotifyPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="Phone (optional)"
                        className="mt-2 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#A34336]"
                      />
                      {notifyMessage && <p className="mt-2 text-xs text-red-600">{notifyMessage}</p>}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200">
              {accordions.map(item => {
                const isOpen = openAccordion === item.id
                return (
                  <div key={item.id} className="border-b border-gray-200">
                    <button type="button" className="flex w-full items-center justify-between py-4 text-left" onClick={() => setOpenAccordion(isOpen ? null : item.id)}>
                      <span className="text-[15px] font-medium text-gray-800">{item.title}</span>
                      {isOpen ? <Minus className="h-4 w-4 text-gray-400" /> : <Plus className="h-4 w-4 text-gray-400" />}
                    </button>
                    <div className={`overflow-hidden transition-[max-height] duration-300 ${isOpen ? 'max-h-[500px]' : 'max-h-0'}`}>
                      {item.content && (
                        <p className="pb-4 text-[14px] leading-relaxed text-gray-600 whitespace-pre-line">{item.content}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-12 w-full">
              <ReviewSection productId={product.id} slug={product.slug || String(product.id)} />
            </div>
          </section>
        </div>

        {relatedProducts.length > 0 && (
        <section className="mb-8 md:mb-12 sm:mb-16">
          <h2 className="font-playfair mb-4 md:mb-6 text-center text-2xl sm:text-3xl font-medium italic tracking-wide text-[var(--charcoal)] sm:mb-8">Related Products</h2>
          <div className="grid grid-cols-2 gap-3 md:gap-5 md:grid-cols-4 md:gap-6">
            {relatedProducts.map(rp => (
              <ProductCard key={rp.id ?? rp.name} product={rp} onAddToCart={() => handleRelatedAddToCart(rp)} />
            ))}
          </div>
        </section>
        )}
      </div>

      {showSizeGuide && (
        <SizeGuideModal audience={audience} onClose={() => setShowSizeGuide(false)} />
      )}
    </main>
  )
}
