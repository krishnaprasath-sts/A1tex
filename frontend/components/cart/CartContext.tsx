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
  fetchCart,
  addToCart as apiAddToCart,
  updateCartItemQuantity,
  removeCartItem,
  clearServerCart,
  type ServerCartItem,
} from '@/lib/api/cart'

export type CartItem = {
  cartItemId?: number
  id: number | string
  name: string
  slug: string
  price: number
  originalPrice?: number | null
  image: string
  color?: string
  size?: string
  variantId?: number
  variantLabel?: string
  qty: number
  stock?: number
  stockStatus?: string
  weightKg?: number
}

export type CartContextValue = {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'qty'> & { qty?: number }) => void
  removeItem: (key: string) => void
  updateQty: (key: string, qty: number) => void
  clearCart: () => void
  isInCart: (id: number | string, variantId?: number, color?: string, size?: string) => boolean
  totalItems: number
  totalUnits: number
  subtotal: number
  drawerOpen: boolean
  setDrawerOpen: (open: boolean) => void
  hydrated: boolean
  syncing: boolean
}

function mapServerItem(s: ServerCartItem): CartItem {
  return {
    cartItemId: s.id,
    id: s.productId,
    name: s.name,
    slug: s.slug,
    price: s.price,
    originalPrice: s.originalPrice,
    image: s.image,
    color: s.color || undefined,
    size: s.size || undefined,
    variantId: s.variantId || undefined,
    variantLabel: s.variantLabel || undefined,
    qty: s.quantity,
    stock: s.productStock,
    stockStatus: s.productStatus,
    weightKg: s.weightKg ?? undefined,
  }
}

export function itemKey(id: number | string, variantId?: number | string, color?: string, size?: string): string {
  return `${id}__v${variantId ?? ''}__${color ?? ''}__${size ?? ''}`
}

function getItemKey(item: CartItem): string {
  return itemKey(item.id, item.variantId, item.color, item.size)
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const { loading: authLoading } = useAuth()
  const [items, setItems] = useState<CartItem[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [syncing, setSyncing] = useState(false)

  /* ─── Hydrate on mount ─── */
  useEffect(() => {
    if (authLoading) return

    setSyncing(true)
    fetchCart()
      .then(serverItems => {
        setItems(Array.isArray(serverItems) ? serverItems.map(mapServerItem) : [])
      })
      .catch(() => {
        setItems([])
      })
      .finally(() => {
        setHydrated(true)
        setSyncing(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading])

  /* ─── Actions ─── */

  const addItem = useCallback(
    (incoming: Omit<CartItem, 'qty'> & { qty?: number }) => {
      const pid = typeof incoming.id === 'number' ? incoming.id : Number(incoming.id)
      if (incoming.stock != null && incoming.stock <= 0) return
      if (!Number.isFinite(pid)) return

      const incomingQty = incoming.qty ?? 1
      const clampedQty = incoming.stock != null ? Math.min(incomingQty, incoming.stock) : incomingQty

      setSyncing(true)
      apiAddToCart({
        productId: pid,
        variantId: incoming.variantId,
        quantity: clampedQty,
      })
        .then(serverItem => {
          const mapped = mapServerItem(serverItem)
          setItems(prev => {
            const existingIdx = prev.findIndex(
              e => getItemKey(e) === getItemKey(mapped),
            )
            if (existingIdx !== -1) {
              const updated = [...prev]
              updated[existingIdx] = mapped
              return updated
            }
            return [...prev, mapped]
          })
        })
        .catch(() => {})
        .finally(() => setSyncing(false))
    },
    [],
  )

  const removeItem = useCallback(
    (key: string) => {
      setItems(prev => {
        const target = prev.find(e => getItemKey(e) === key)
        if (!target) return prev

        const newItems = prev.filter(e => getItemKey(e) !== key)

        if (target.cartItemId) {
          removeCartItem(target.cartItemId).catch(() => {
            setItems(current => {
              if (current.some(e => getItemKey(e) === key)) return current
              return [...current, target]
            })
          })
        }

        return newItems
      })
    },
    [],
  )

  const updateQty = useCallback(
    (key: string, qty: number) => {
      if (qty < 1) {
        removeItem(key)
        return
      }

      setItems(prev => {
        const target = prev.find(e => getItemKey(e) === key)
        if (!target) return prev

        if (target.stock != null && qty > target.stock) {
          qty = target.stock
        }

        const prevQty = target.qty

        if (target.cartItemId) {
          updateCartItemQuantity(target.cartItemId, qty).catch(() => {
            setItems(current =>
              current.map(e =>
                getItemKey(e) === key ? { ...e, qty: prevQty } : e,
              ),
            )
          })
        }

        return prev.map(e =>
          getItemKey(e) === key ? { ...e, qty } : e,
        )
      })
    },
    [removeItem],
  )

  const clearCart = useCallback(() => {
    setItems([])
    clearServerCart().catch(() => {})
  }, [])

  /* ─── Derived values ─── */

  const isInCart = useCallback(
    (id: number | string, variantId?: number, color?: string, size?: string) =>
      items.some(e => getItemKey(e) === itemKey(id, variantId, color, size)),
    [items],
  )

  const totalItems = useMemo(
    () => items.length,
    [items],
  )

  const totalUnits = useMemo(
    () => items.reduce((sum, item) => sum + item.qty, 0),
    [items],
  )

  const subtotal = useMemo(
    () => items.reduce((sum, entry) => sum + entry.price * entry.qty, 0),
    [items],
  )

  /* ─── Context value ─── */

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      addItem,
      removeItem,
      updateQty,
      clearCart,
      isInCart,
      totalItems,
      totalUnits,
      subtotal,
      drawerOpen,
      setDrawerOpen,
      hydrated,
      syncing,
    }),
    [
      items, addItem, removeItem, updateQty, clearCart,
      isInCart, totalItems, totalUnits, subtotal, drawerOpen, hydrated, syncing,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error(
      'useCart must be used within a <CartProvider>. ' +
        'Wrap your component tree with <CartProvider> to fix this error.',
    )
  }
  return ctx
}
