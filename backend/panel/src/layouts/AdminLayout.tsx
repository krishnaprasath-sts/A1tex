import { useCallback, useMemo, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, LogOut, Menu, X } from 'lucide-react'
import { getOrderPipelineCounts } from '../services/api'
import { isSidebarSection, sidebarItems } from '../app/resources'
import { useAdminAuth } from '../contexts/AdminAuthContext'

const stageBadgeClass: Record<string, string> = {
  'pending-payment': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  packing: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  dispatched: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'out-for-delivery': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
}

export default function AdminLayout() {
  const navigate = useNavigate()
  const { admin, hasPermission, logout: logoutAdmin } = useAdminAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sectionsOpen, setSectionsOpen] = useState<Record<string, boolean>>({ Products: true, Orders: true })

  const canViewOrders = hasPermission('view_orders')
  const { data: countsData } = useQuery({
    queryKey: ['order-pipeline-counts'],
    queryFn: getOrderPipelineCounts,
    enabled: canViewOrders,
    staleTime: 60000,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
  })
  const counts = countsData?.counts || {}

  const closeMobile = useCallback(() => setMobileOpen(false), [])

  const initials = 'A1'

  async function logout() {
    await logoutAdmin()
    navigate('/login', { replace: true })
  }

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="mb-6 px-6 pt-7 pb-2">
        <img src="/logo.png" alt="A1 TEX" className="h-16 w-auto object-contain drop-shadow-sm" />
      </div>

      {/* Nav items */}
      <nav className="flex flex-1 flex-col gap-0.5 px-3 overflow-y-auto">
        {sidebarItems
          .map(entry => {
          if (isSidebarSection(entry)) {
            const visibleChildren = entry.children.filter(child => !child.permission || hasPermission(child.permission))
            if (entry.permission && !hasPermission(entry.permission) && visibleChildren.length === 0) return null
            if (visibleChildren.length === 0) return null
            const isOpen = sectionsOpen[entry.label] ?? false
            return (
              <div key={entry.label} className="mb-1">
                <button
                  type="button"
                  onClick={() => setSectionsOpen(prev => ({ ...prev, [entry.label]: !isOpen }))}
                  className="flex w-full items-center gap-3.5 rounded-md px-3.5 py-3 text-[15.5px] font-bold text-[#4A423E] transition-all duration-150 hover:bg-[#F3EFEA]"
                >
                  <entry.Icon className="h-[20px] w-[20px] shrink-0 text-[#7D7470]" />
                  <span className="flex-1 text-left">{entry.label}</span>
                  {isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 text-[#7D7470]" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-[#7D7470]" />
                  )}
                </button>
                {isOpen ? (
                  <div className="ml-2 mt-0.5 space-y-0.5 border-l-2 border-[#EFEBE4] pl-2">
                    {visibleChildren.map(child => {
                      const count = child.badgeKey ? (counts[child.badgeKey] ?? 0) : 0
                      return (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          onClick={closeMobile}
                          className={({ isActive }) =>
                            `group flex items-center gap-3 rounded-md px-3 py-2 text-[14px] font-semibold transition-all duration-150 ${
                              isActive
                                ? 'bg-[#FCF4F5] text-[var(--burgundy)] font-bold'
                                : 'text-[#6C635F] hover:bg-[#F3EFEA] hover:text-[#2D2A29]'
                            }`
                          }
                        >
                          <child.Icon className="h-[16px] w-[16px] shrink-0" />
                          <span className="flex-1">{child.label}</span>
                          {count > 0 && child.badgeKey ? (
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold leading-none ${stageBadgeClass[child.badgeKey] || ''}`}>
                              {count}
                            </span>
                          ) : null}
                        </NavLink>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )
          }

          if (entry.permission && !hasPermission(entry.permission)) return null

          return (
            <NavLink
              key={entry.path}
              to={entry.path}
              end={entry.path === '/'}
              onClick={closeMobile}
              className={({ isActive }) =>
                `group flex items-center gap-3.5 rounded-md px-3.5 py-3 text-[15.5px] font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-[#FCF4F5] text-[var(--burgundy)] shadow-sm font-bold border-l-4 border-[var(--burgundy)]'
                    : 'text-[#6C635F] hover:bg-[#F3EFEA] hover:text-[#2D2A29] border-l-4 border-transparent'
                }`
              }
            >
              <entry.Icon className="h-[20px] w-[20px] shrink-0" />
              <span className="flex-1">{entry.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </>
  )

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-[#EFEBE4] bg-[#FCFBF9] lg:flex">
        {sidebarContent}
      </aside>

      {/* Mobile Backdrop */}
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={closeMobile}
        />
      ) : null}

      {/* Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-[#EFEBE4] bg-[#FCFBF9] transition-transform duration-300 lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          type="button"
          onClick={closeMobile}
          className="absolute right-3 top-3 rounded-lg p-2 text-[#7D7470] transition-colors hover:bg-[#F3EFEA] hover:text-[#2D2A29]"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
        {sidebarContent}
      </aside>

      {/* Main Content */}
      <div className="lg:pl-[260px]">
        {/* Desktop Top Header */}
        <header className="sticky top-0 z-20 hidden lg:flex items-center justify-end border-b border-[var(--line)] bg-[var(--panel)] px-8 py-3">
          <div className="flex items-center gap-6">
            {/* User Profile Pill */}
            <div 
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold tracking-wide text-white shadow-md ring-2 ring-[var(--panel)]"
              style={{ background: 'linear-gradient(135deg, var(--burgundy) 0%, var(--burgundy-dark) 100%)' }}
            >
              {initials}
            </div>

            <div className="h-8 w-px bg-[var(--line)]" />

            {/* Logout Button */}
            <button
              type="button"
              onClick={logout}
              className="group flex items-center gap-2 rounded-full px-4 py-2 text-[14.5px] font-bold text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200"
            >
              <LogOut className="h-4 w-4 transition-transform group-hover:scale-110" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Mobile Top Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--line)] bg-[var(--panel)] px-4 py-3 lg:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-[var(--muted)] transition-colors hover:bg-[var(--panel-strong)] hover:text-[var(--text)]"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <img src="/logo.png" alt="A1 TEX" className="h-7 w-auto object-contain" />
          </div>
        </header>

        {/* Page Content */}
        <main className="px-4 py-5 md:px-6 md:py-6 lg:px-8 lg:py-7">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
