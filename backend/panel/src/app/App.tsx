import { Fragment } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Loader2, ShieldAlert } from 'lucide-react'
import AdminLayout from '../layouts/AdminLayout'
import DashboardPage from '../pages/DashboardPage'
import LoginPage from '../pages/LoginPage'
import ResourceListPage from '../pages/ResourceListPage'
import ResourceFormPage from '../pages/ResourceFormPage'
import AnnouncementFormPage from '../pages/AnnouncementFormPage'
import BannerFormPage from '../pages/BannerFormPage'
import CategoriesPage from '../pages/CategoriesPage'
import CategoryFormPage from '../pages/CategoryFormPage'
import ProductsListPage from '../pages/ProductsListPage'
import ProductFormPage from '../pages/ProductFormPage'
import CouponFormPage from '../pages/CouponFormPage'
import CouponsListPage from '../pages/CouponsListPage'
import GuestCouponPage from '../pages/GuestCouponPage'
import SubcategoriesPage from '../pages/SubcategoriesPage'
import VariantsPage from '../pages/VariantsPage'
import StockPage from '../pages/StockPage'
import OrdersLayout from '../pages/OrdersLayout'
import OrderDetailPage from '../pages/OrderDetailPage'
import InvoiceManagementPage from '../pages/InvoiceManagementPage'
import EmailCampaignsPage from '../pages/EmailCampaignsPage'
import SettingsPage from '../pages/SettingsPage'
import ShippingZonesPage from '../pages/ShippingZonesPage'
import RolesPage from '../pages/RolesPage'
import MyOrdersPage from '../pages/MyOrdersPage'
import { resources, type ResourceConfig } from './resources'
import { AdminAuthProvider, useAdminAuth } from '../contexts/AdminAuthContext'

const orderPaths = ['orders', 'orders/pending-payment', 'orders/pending', 'orders/confirmed', 'orders/packing', 'orders/dispatched', 'orders/out-for-delivery', 'orders/delivered', 'orders/cancelled', 'orders/rto', 'orders/returned']

const resourcePermissionMap: Record<string, string[]> = {
  announcements: ['manage_settings'],
  'marquee-messages': ['manage_settings'],
  banners: ['manage_settings'],
  categories: ['manage_products'],
  products: ['manage_products'],
  customers: ['manage_customers'],
  coupons: ['manage_coupons'],
  enquiries: ['manage_customers'],
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
      <Loader2 className="h-8 w-8 animate-spin text-[var(--burgundy)]" />
    </div>
  )
}

function AccessDenied() {
  return (
    <div className="min-h-screen bg-[var(--bg)] p-6">
      <div className="mx-auto flex max-w-xl flex-col items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--panel)] px-6 py-14 text-center shadow-sm">
        <ShieldAlert className="h-10 w-10 text-[var(--burgundy)]" />
        <h1 className="mt-4 text-xl font-bold text-[var(--charcoal)]">Access Denied</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Your admin account does not have permission to open this page.
        </p>
      </div>
    </div>
  )
}

function AuthGuard() {
  const location = useLocation()
  const { isLoading, isAuthenticated } = useAdminAuth()

  if (isLoading) return <LoadingScreen />
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

function PermissionRoute({ permissions, children }: { permissions?: string[]; children: React.ReactElement }) {
  const { hasPermission } = useAdminAuth()
  if (permissions?.length && !hasPermission(...permissions)) return <AccessDenied />
  return children
}

function protect(element: React.ReactElement, permissions?: string[]) {
  return <PermissionRoute permissions={permissions}>{element}</PermissionRoute>
}

function resourcePermissions(resource: ResourceConfig) {
  return resourcePermissionMap[resource.path.replace('/', '')]
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AuthGuard />}>
        <Route element={<AdminLayout />}>
          <Route path="/" element={protect(<DashboardPage />)} />
          {resources.map(resource => {
            if (resource.path === '/orders') return null
            const basePath = resource.path.replace('/', '')
            if (basePath === 'categories' || basePath === 'products') return null
            return (
              <Fragment key={resource.path}>
                <Route path={basePath} element={protect(basePath === 'coupons' ? <CouponsListPage /> : <ResourceListPage config={resource} />)} />
                <Route
                  path={`${basePath}/new`}
                  element={protect(
                    basePath === 'announcements'
                      ? <AnnouncementFormPage />
                      : basePath === 'banners'
                        ? <BannerFormPage />
                        : basePath === 'coupons'
                          ? <CouponFormPage />
                          : <ResourceFormPage config={resource} />
                  )}
                />
                <Route
                  path={`${basePath}/edit/:id`}
                  element={protect(
                    basePath === 'announcements'
                      ? <AnnouncementFormPage />
                      : basePath === 'banners'
                        ? <BannerFormPage />
                        : basePath === 'coupons'
                          ? <CouponFormPage />
                          : <ResourceFormPage config={resource} />
                  )}
                />
              </Fragment>
            )
          })}
          <Route path="categories" element={protect(<CategoriesPage />)} />
          <Route path="categories/new" element={protect(<CategoryFormPage />)} />
          <Route path="categories/edit/:id" element={protect(<CategoryFormPage />)} />
          <Route path="collections" element={<Navigate to="/categories" replace />} />
          <Route path="collections/*" element={<Navigate to="/categories" replace />} />
          <Route path="products" element={protect(<ProductsListPage />)} />
          <Route path="products/new" element={protect(<ProductFormPage />)} />
          <Route path="products/edit/:id" element={protect(<ProductFormPage />)} />
          <Route path="guest-coupon" element={protect(<GuestCouponPage />)} />
          <Route path="invoices" element={protect(<InvoiceManagementPage />)} />
          <Route path="subcategories" element={protect(<SubcategoriesPage />)} />
          <Route path="subcategories/new" element={protect(<SubcategoriesPage />)} />
          <Route path="subcategories/edit/:id" element={protect(<SubcategoriesPage />)} />
          <Route path="variants" element={protect(<VariantsPage />)} />
          <Route path="stock" element={protect(<StockPage />)} />
          <Route path="settings" element={<Navigate to="/shipping-zones" replace />} />
          <Route path="shipping-zones" element={protect(<ShippingZonesPage />)} />
          <Route path="my-orders" element={protect(<MyOrdersPage />)} />
          {orderPaths.map(path => (
            <Route key={path} path={path} element={protect(<OrdersLayout />)} />
          ))}
          <Route path="orders/:id" element={protect(<OrderDetailPage />)} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AdminAuthProvider>
      <AppRoutes />
    </AdminAuthProvider>
  )
}