'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@/components/auth/AuthContext'
import {
  fetchWishlist,
  addToWishlistApi,
  removeFromWishlistApi,
  type ServerWishlistItem,
} from '@/lib/api/wishlist'

type WishlistContextValue = {
  wishlistIds: number[]
  removeFromWishlist: (id: number, variantId?: number | null, productName?: string) => void
  toggleWishlist: (id: number, productName?: string, variantId?: number | null, color?: string, size?: string) => void
  isWished: (id: number, variantId?: number | null) => boolean
  pruneStaleIds: (validIds: number[]) => void
  totalItems: number
  hydrated: boolean
  syncing: boolean
  serverItems: ServerWishlistItem[]
}

const WishlistContext = createContext<WishlistContextValue | null>(null)

function matchesExact(item: ServerWishlistItem, productId: number, variantId?: number | null): boolean {
  return item.productId === productId && (item.variantId ?? null) === (variantId ?? null)
}

function matchesProduct(item: ServerWishlistItem, productId: number): boolean {
  return item.productId === productId
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { loading: authLoading } = useAuth()
  const [serverItems, setServerItems] = useState<ServerWishlistItem[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [syncing, setSyncing] = useState(false)

  /* ─── Hydrate on mount ─── */
  useEffect(() => {
    if (authLoading) return

    setSyncing(true)
    fetchWishlist()
      .then(serverWishlist => {
        setServerItems(Array.isArray(serverWishlist) ? serverWishlist : [])
      })
      .catch(() => {
        setServerItems([])
      })
      .finally(() => {
        setHydrated(true)
        setSyncing(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading])

  /* ─── Merge toast auto-dismiss ─── */
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  /* ─── Derived state ─── */

  const wishlistIds = useMemo(
    () => Array.from(new Set((serverItems || []).map(i => i.productId))),
    [serverItems],
  )

  const isWished = useCallback((id: number, variantId?: number | null) => {
    const list = serverItems || []
    if (variantId !== undefined) {
      return list.some(i => matchesExact(i, id, variantId))
    }
    return list.some(i => matchesProduct(i, id))
  }, [serverItems])

  /* ─── Actions ─── */

  const addVariant = useCallback((id: number, productName: string | undefined, variantId: number | null, color: string | null, size: string | null) => {
    const placeholder: ServerWishlistItem = {
      id: -Date.now(),
      userId: 0,
      productId: id,
      variantId: variantId ?? null,
      color: color ?? null,
      size: size ?? null,
      variantLabel: null,
      name: productName || '',
      slug: '',
      price: 0,
      originalPrice: null,
      image: '',
      type: '',
      category: '',
      stockQty: 0,
      status: 'active',
      isNew: false,
      averageRating: null,
      createdAt: new Date().toISOString(),
    }

    setServerItems(prev => [...prev, placeholder])
    if (productName) setToast(`${productName} added to wishlist`)

    setSyncing(true)
    addToWishlistApi(id, { variantId, color, size })
      .then(created => {
        setServerItems(prev => prev.map(i => (i.id === placeholder.id ? created : i)))
      })
      .catch(() => {
        setServerItems(prev => prev.filter(i => i.id !== placeholder.id))
      })
      .finally(() => setSyncing(false))
  }, [])

  const removeExact = useCallback((id: number, variantId: number | null | undefined, productName?: string) => {
    setServerItems(prev => prev.filter(i => !matchesExact(i, id, variantId)))
    if (productName) setToast(`${productName} removed from wishlist`)

    setSyncing(true)
    removeFromWishlistApi(id, variantId ?? undefined)
      .catch(() => {
        fetchWishlist().then(setServerItems).catch(() => {})
      })
      .finally(() => setSyncing(false))
  }, [])

  const removeAllForProduct = useCallback((id: number, productName?: string) => {
    const list = serverItems || []
    const matches = list.filter(i => matchesProduct(i, id))
    if (matches.length === 0) return

    setServerItems(prev => (prev || []).filter(i => !matchesProduct(i, id)))
    if (productName) setToast(`${productName} removed from wishlist`)

    setSyncing(true)
    Promise.all(matches.map(m => removeFromWishlistApi(id, m.variantId ?? undefined)))
      .catch(() => {
        fetchWishlist().then(setServerItems).catch(() => {})
      })
      .finally(() => setSyncing(false))
  }, [serverItems])

  const toggleWishlist = useCallback((id: number, productName?: string, variantId?: number | null, color?: string, size?: string) => {
    const list = serverItems || []
    if (variantId !== undefined) {
      // Exact variant toggle — used on the single product page where a color/size is selected.
      const wasLiked = list.some(i => matchesExact(i, id, variantId))
      if (wasLiked) {
        removeExact(id, variantId, productName)
      } else {
        addVariant(id, productName, variantId ?? null, color ?? null, size ?? null)
      }
      return
    }

    // Product-level toggle — used on listing/grid cards that don't track a selected variant.
    const wasLiked = list.some(i => matchesProduct(i, id))
    if (wasLiked) {
      removeAllForProduct(id, productName)
    } else {
      addVariant(id, productName, null, null, null)
    }
  }, [serverItems, addVariant, removeExact, removeAllForProduct])

  const removeFromWishlist = useCallback((id: number, variantId?: number | null, productName?: string) => {
    if (variantId !== undefined) {
      removeExact(id, variantId, productName)
    } else {
      removeAllForProduct(id, productName)
    }
  }, [removeExact, removeAllForProduct])

  const pruneStaleIds = useCallback((validIds: number[]) => {
    const validSet = new Set(validIds)
    setServerItems(prev => (prev || []).filter(i => validSet.has(i.productId)))
  }, [])

  const totalItems = useMemo(() => (serverItems || []).length, [serverItems])

  const value = useMemo<WishlistContextValue>(
    () => ({
      wishlistIds,
      removeFromWishlist,
      toggleWishlist,
      isWished,
      pruneStaleIds,
      totalItems,
      hydrated,
      syncing,
      serverItems,
    }),
    [wishlistIds, removeFromWishlist, toggleWishlist, isWished, pruneStaleIds, totalItems, hydrated, syncing, serverItems],
  )

  return (
    <WishlistContext.Provider value={value}>
      {children}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-[#D4AF37] bg-white px-6 py-3 text-sm font-semibold text-[#0F172A] shadow-2xl animate-fade-in-up">
          {toast}
        </div>
      )}
    </WishlistContext.Provider>
  )
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext)
  if (!ctx) {
    throw new Error('useWishlist must be used within a <WishlistProvider>.')
  }
  return ctx
}
