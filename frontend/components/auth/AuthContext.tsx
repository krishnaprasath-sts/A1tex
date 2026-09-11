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
import { useRouter } from 'next/navigation'
import { getCurrentCustomer, logoutCustomer } from '@/lib/api/auth'
import type { CustomerSession } from '@/lib/api/types'

type AuthContextValue = {
  session: CustomerSession | null
  loading: boolean
  error: string | null
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<CustomerSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSession = useCallback(async () => {
    try {
      const data = await getCurrentCustomer()
      setSession(data.customer)
      setError(null)
    } catch {
      setSession(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  const logout = useCallback(async () => {
    try {
      await logoutCustomer()
    } catch {
      // ignore
    }
    setSession(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ session, loading, error, logout, refresh: fetchSession }),
    [session, loading, error, logout, fetchSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>.')
  }
  return ctx
}

export function RequireAuth({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const { session, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !session) {
      if (typeof window !== 'undefined') {
        const returnTo = encodeURIComponent(window.location.pathname + window.location.search)
        router.replace(`/login?returnTo=${returnTo}`)
      } else {
        router.replace('/login')
      }
    }
  }, [loading, session, router])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#FAFAFC]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0F172A] border-t-transparent" />
      </div>
    )
  }

  if (!session) {
    return fallback ? <>{fallback}</> : null
  }

  return <>{children}</>
}
