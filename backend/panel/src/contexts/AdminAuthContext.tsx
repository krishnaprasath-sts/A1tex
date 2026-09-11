import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { adminLogout, getAdminMe } from '../services/api'

type AdminUser = {
  id?: number
  name: string
  email: string
  role: string
  customRoleId?: number | null
}

type AdminAuthState = {
  admin: AdminUser | null
  permissions: string[]
  isLoading: boolean
  isAuthenticated: boolean
  hasPermission: (...keys: string[]) => boolean
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const AdminAuthContext = createContext<AdminAuthState | null>(null)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [permissions, setPermissions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getAdminMe()
      setAdmin(data.admin)
      setPermissions(data.permissions || [])
    } catch (error) {
      setAdmin(null)
      setPermissions([])
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh().catch(() => null)
  }, [refresh])

  const logout = useCallback(async () => {
    await adminLogout().catch(() => null)
    setAdmin(null)
    setPermissions([])
  }, [])

  const hasPermission = useCallback((..._keys: string[]) => {
    return true
  }, [])

  const value = useMemo<AdminAuthState>(() => ({
    admin,
    permissions,
    isLoading,
    isAuthenticated: Boolean(admin),
    hasPermission,
    refresh,
    logout,
  }), [admin, permissions, isLoading, hasPermission, refresh, logout])

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  if (!context) throw new Error('useAdminAuth must be used inside AdminAuthProvider')
  return context
}