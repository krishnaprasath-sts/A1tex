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
import StaffPage from '../pages/StaffPage'
import ReviewsPage from '../pages/ReviewsPage'
import { resources, type ResourceConfig } from './resources'
import { AdminAuthProvider, useAdminAuth } from '../contexts/AdminAuthContext'

const orderPaths = ['orders', 'orders/pending', 'orders/confirmed', 'orders/packing', 'orders/dispatched', 'orders/out-for-delivery', 'orders/delivered', 'orders/cancelled', 'orders/rto', 'orders/returned']

const resourcePermissionMap: Record<string, string[]> = {
  announcements: ['manage_settings'],
  'marquee-messages': ['manage_settings'],
  banners: ['manage_settings'],
  categories: ['manage_products'],
  products: ['manage_products'],
  customers: ['manage_customers'],
  coupons: ['manage_coupons'],
  enquiries: ['manage_customers'],
  reviews: ['manage_products'],
  'email-campaigns': ['manage_email_campaigns'],
  staff: ['manage_staff'],
  roles: ['manage_roles'],
  settings: ['manage_settings'],
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
          <Route path="/" element={protect(<DashboardPage />, ['view_dashboard'])} />
          {resources.map(resource => {
            if (resource.path === '/orders') return null
            const basePath = resource.path.replace('/', '')
            if (basePath === 'categories' || basePath === 'products') return null
            return (
              <Fragment key={resource.path}>
                <Route path={basePath} element={protect(basePath === 'coupons' ? <CouponsListPage /> : <ResourceListPage config={resource} />, resourcePermissions(resource))} />
                <Route
                  path={`${basePath}/new`}
                  element={protect(
                    basePath === 'announcements'
                      ? <AnnouncementFormPage />
                      : basePath === 'banners'
                        ? <BannerFormPage />
                        : basePath === 'coupons'
                          ? <CouponFormPage />
                          : <ResourceFormPage config={resource} />,
                    resourcePermissions(resource)
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
                          : <ResourceFormPage config={resource} />,
                    resourcePermissions(resource)
                  )}
                />
              </Fragment>
            )
          })}
          <Route path="categories" element={protect(<CategoriesPage />, ['manage_products'])} />
          <Route path="categories/new" element={protect(<CategoryFormPage />, ['manage_products'])} />
          <Route path="categories/edit/:id" element={protect(<CategoryFormPage />, ['manage_products'])} />
          <Route path="collections" element={<Navigate to="/categories" replace />} />
          <Route path="collections/*" element={<Navigate to="/categories" replace />} />
          <Route path="products" element={protect(<ProductsListPage />, ['manage_products'])} />
          <Route path="products/new" element={protect(<ProductFormPage />, ['manage_products'])} />
          <Route path="products/edit/:id" element={protect(<ProductFormPage />, ['manage_products'])} />
          <Route path="guest-coupon" element={protect(<GuestCouponPage />, ['manage_settings'])} />
          <Route path="invoices" element={protect(<InvoiceManagementPage />, ['manage_invoices'])} />
          <Route path="subcategories" element={protect(<SubcategoriesPage />, ['manage_products'])} />
          <Route path="subcategories/new" element={protect(<SubcategoriesPage />, ['manage_products'])} />
          <Route path="subcategories/edit/:id" element={protect(<SubcategoriesPage />, ['manage_products'])} />
          <Route path="variants" element={protect(<VariantsPage />, ['manage_products'])} />
          <Route path="stock" element={protect(<StockPage />, ['manage_stock'])} />
          <Route path="reviews" element={protect(<ReviewsPage />, ['manage_products'])} />
          <Route path="email-campaigns" element={protect(<EmailCampaignsPage />, ['manage_email_campaigns'])} />
          <Route path="staff" element={protect(<StaffPage />, ['manage_staff'])} />
          <Route path="roles" element={protect(<RolesPage />, ['manage_roles'])} />
          <Route path="settings" element={protect(<SettingsPage />, ['manage_settings'])} />
          <Route path="shipping-zones" element={protect(<ShippingZonesPage />, ['manage_settings'])} />
          <Route path="my-orders" element={protect(<MyOrdersPage />, ['view_my_orders'])} />
          {orderPaths.map(path => (
            <Route key={path} path={path} element={protect(<OrdersLayout />, ['view_orders'])} />
          ))}
          <Route path="orders/:id" element={protect(<OrderDetailPage />, ['view_orders', 'view_my_orders'])} />
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