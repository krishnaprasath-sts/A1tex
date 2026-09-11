import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Boxes,
  Image as ImageIcon,
  IndianRupee,
  Loader2,
  Package,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  getDashboardStats,
  getSalesStats,
  getSalesBreakdown,
  getTopSellingProducts,
  resolveImageUrl,
  type StoreStat,
  type StoreStatKey,
} from '../services/api'
import React, { useState } from 'react'

const TOP_PRODUCTS_LIMIT = 5

// Store Overview numbers go stale while the admin leaves the tab open.
const STATS_REFETCH_MS = 60_000
const STATS_STALE_MS = 30_000

function formatCurrency(value: number): string {
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

function todayStr(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/* ─── Style & SVG Configuration for Premium Gradient Cards ─────── */
/* Keyed by the backend's stable `key` (not the display label) so renaming a
   card's text can never silently drop it to the fallback style. */
type CardStyle = {
  shadowClass: string
  style: React.CSSProperties
  SvgBackground: React.ReactNode
  /* Where the card's headline number drills down to. */
  to: string
  /* Per-meta drill-down routes; meta keys without an entry render as plain text. */
  metaLinks?: Record<string, string>
}

const cardConfig: Record<StoreStatKey, CardStyle> = {
  products: {
    to: '/products',
    metaLinks: {
      outOfStock: '/stock',
      lowStock: '/stock',
    },
    shadowClass: 'shadow-[0_8px_20px_-6px_rgba(122,92,250,0.5)]',
    style: { background: 'linear-gradient(to bottom right, #7a5cfa, #6042db)' },
    SvgBackground: (
      <svg className="absolute bottom-0 right-0 w-32 opacity-20 pointer-events-none" viewBox="0 0 100 50">
        <path d="M0,50 Q25,20 50,50 T100,50 L100,100 L0,100 Z" fill="currentColor"/>
      </svg>
    )
  },
  categories: {
    to: '/categories',
    metaLinks: {
      parents: '/categories',
      subcategories: '/subcategories',
    },
    shadowClass: 'shadow-[0_8px_20px_-6px_rgba(62,165,251,0.5)]',
    style: { background: 'linear-gradient(to bottom right, #3ea5fb, #258bf7)' },
    SvgBackground: (
      <svg className="absolute bottom-4 right-0 w-40 h-10 opacity-30 pointer-events-none" viewBox="0 0 100 30" preserveAspectRatio="none">
        <path d="M0,25 C15,25 20,5 35,15 C50,25 60,5 75,20 C85,30 95,10 100,15" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
      </svg>
    )
  },
  customers: {
    to: '/customers',
    shadowClass: 'shadow-[0_8px_20px_-6px_rgba(44,194,183,0.5)]',
    style: { background: 'linear-gradient(to bottom right, #2cc2b7, #12a69d)' },
    SvgBackground: (
      <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-40">
        <div className="w-1 h-6 bg-white rounded-full"/>
        <div className="w-1 h-12 bg-white rounded-full"/>
        <div className="w-1 h-4 bg-white rounded-full"/>
        <div className="w-1 h-10 bg-white rounded-full"/>
        <div className="w-1 h-14 bg-white rounded-full"/>
        <div className="w-1 h-7 bg-white rounded-full"/>
      </div>
    )
  },
  orders: {
    to: '/orders',
    metaLinks: {
      delivered: '/orders/delivered',
      abandoned: '/orders/pending-payment',
    },
    shadowClass: 'shadow-[0_8px_20px_-6px_rgba(255,154,61,0.5)]',
    style: { background: 'linear-gradient(to bottom right, #ff9a3d, #fa7a00)' },
    SvgBackground: (
      <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 opacity-40">
        <div className="h-1.5 w-10 bg-white rounded-full"/>
        <div className="h-1.5 w-14 bg-white rounded-full"/>
        <div className="h-1.5 w-8 bg-white rounded-full"/>
        <div className="h-1.5 w-16 bg-white rounded-full"/>
        <div className="h-1.5 w-12 bg-white rounded-full"/>
      </div>
    )
  },
  banners: {
    to: '/banners',
    metaLinks: { inactive: '/banners' },
    shadowClass: 'shadow-[0_8px_20px_-6px_rgba(255,91,131,0.5)]',
    style: { background: 'linear-gradient(to bottom right, #ff5b83, #e63e66)' },
    SvgBackground: (
      <svg className="absolute -right-4 -bottom-4 w-28 h-28 opacity-20 pointer-events-none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="4"/>
        <circle cx="12" cy="12" r="4" fill="currentColor"/>
      </svg>
    )
  },
}

/* ─── Exact Quick Actions Config ────────────────────────── */
const quickActions = [
  {
    to: '/products',
    Icon: Package,
    title: 'Products',
    description: 'Add, edit, or manage your saree catalog.',
    colorStyle: { color: '#ff5b83', backgroundColor: 'rgba(255, 91, 131, 0.1)' },
  },
  {
    to: '/orders',
    Icon: ShoppingBag,
    title: 'Orders',
    description: 'View and process customer orders.',
    colorStyle: { color: '#7a5cfa', backgroundColor: 'rgba(122, 92, 250, 0.1)' },
  },
  {
    to: '/banners',
    Icon: ImageIcon,
    title: 'Banners',
    description: 'Update hero banners and promotions.',
    colorStyle: { color: '#3ea5fb', backgroundColor: 'rgba(62, 165, 251, 0.1)' },
  },
  {
    to: '/categories',
    Icon: Boxes,
    title: 'Categories',
    description: 'Organize product categories and sections.',
    colorStyle: { color: '#ff9a3d', backgroundColor: 'rgba(255, 154, 61, 0.1)' },
  },
]

/* ─── Skeleton Loaders ──────────────────────────────────── */
function StatSkeleton() {
  return <div className="animate-pulse rounded-2xl bg-gray-200 h-[120px] w-full" />
}

function StoreStatSkeleton() {
  return <div className="animate-pulse rounded-2xl bg-gray-200 h-[176px] w-full" />
}

function QuickActionSkeleton() {
  return <div className="animate-pulse rounded-2xl bg-gray-200 h-[176px] w-full" />
}

/* ─── Store Overview Card ───────────────────────────────── */
function StoreStatCard({ stat }: { stat: StoreStat }) {
  const config = cardConfig[stat.key] ?? cardConfig.products
  const metaLinks = config.metaLinks ?? {}

  return (
    <article
      className={`relative flex flex-col overflow-hidden rounded-2xl text-white transition-transform hover:-translate-y-1 min-h-[176px] ${config.shadowClass}`}
      style={config.style}
    >
      {config.SvgBackground}

      <div className="relative z-10 flex flex-1 flex-col p-5">
        <Link
          to={config.to}
          className="block no-underline text-white"
          title={stat.hint}
        >
          <p className="text-[11px] font-bold tracking-widest text-white/90 uppercase mb-2">
            {stat.label}
          </p>
          <p className="font-display text-[32px] font-bold leading-none">
            {(stat.value ?? 0).toLocaleString('en-IN')}
          </p>
          <p className="mt-1 mb-3 text-[10.5px] leading-snug text-white/70">{stat.hint}</p>
        </Link>

        {/* mt-auto pins the breakdown to the card's bottom edge so all five
            cards line up despite having different numbers of meta rows. */}
        {stat.meta.length > 0 && (
          <dl className="mt-auto space-y-0.5 border-t border-white/20 pt-2">
            {stat.meta.map((item) => {
              const row = (
                <>
                  <dt className="truncate text-[10.5px] text-white/75">{item.label}</dt>
                  <dd className="shrink-0 text-[11px] font-semibold tabular-nums text-white">
                    {item.value.toLocaleString('en-IN')}
                  </dd>
                </>
              )
              const to = metaLinks[item.key]

              return to ? (
                <Link
                  key={item.key}
                  to={to}
                  className="flex items-center justify-between gap-2 rounded px-1 py-0.5 -mx-1 no-underline transition-colors hover:bg-white/15"
                >
                  {row}
                </Link>
              ) : (
                <div key={item.key} className="flex items-center justify-between gap-2 px-1 py-0.5">
                  {row}
                </div>
              )
            })}
          </dl>
        )}
      </div>
    </article>
  )
}

/* ─── Product Thumbnail (portrait, saree aspect) ────────── */
function ProductThumb({ url, alt }: { url: string | null; alt: string }) {
  const [failed, setFailed] = useState(false)
  const src = url ? resolveImageUrl(url) : ''

  if (!src || failed) {
    return (
      <div className="flex h-14 w-11 shrink-0 items-center justify-center rounded border border-gray-100 bg-gray-50">
        <Package className="h-5 w-5 text-gray-300" />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-14 w-11 shrink-0 rounded border border-gray-100 bg-gray-50 object-cover"
    />
  )
}

/* ─── Dashboard Page ────────────────────────────────────── */
export default function DashboardPage() {
  const { data, isLoading, isFetching: statsFetching, error: statsError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardStats,
    refetchInterval: STATS_REFETCH_MS,
    staleTime: STATS_STALE_MS,
  })

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [appliedRange, setAppliedRange] = useState<{ from: string; to: string } | null>(null)
  const today = todayStr()

  const {
    data: salesData,
    isLoading: salesLoading,
    isFetching: salesFetching,
    error: salesError,
  } = useQuery({
    queryKey: ['dashboard-sales', appliedRange?.from, appliedRange?.to],
    queryFn: () => getSalesStats(appliedRange?.from, appliedRange?.to),
  })

  // Validation runs on the raw picker values so the Apply button reflects
  // whatever the admin currently has selected, even before they click Apply.
  let rangeValidationError: string | null = null
  if (fromDate && toDate) {
    if (fromDate > toDate) {
      rangeValidationError = '"From" date must be on or before "To" date.'
    } else if (fromDate > today || toDate > today) {
      rangeValidationError = 'Date range cannot be in the future.'
    }
  }

  const canApplyRange = Boolean(fromDate && toDate) && !rangeValidationError

  function handleApplyRange() {
    if (!canApplyRange) return
    setAppliedRange({ from: fromDate, to: toDate })
  }

  function handleClearRange() {
    setFromDate('')
    setToDate('')
    setAppliedRange(null)
  }

  // Orders/products breakdown auto-fetches as soon as the picker holds a
  // valid state — no separate confirm step. Empty pickers default to "today".
  const breakdownReady = (!fromDate && !toDate) || (Boolean(fromDate && toDate) && !rangeValidationError)

  const {
    data: breakdownData,
    isLoading: breakdownLoading,
    isFetching: breakdownFetching,
    error: breakdownError,
  } = useQuery({
    queryKey: ['dashboard-sales-breakdown', fromDate, toDate, breakdownReady],
    queryFn: () => getSalesBreakdown(fromDate || undefined, toDate || undefined),
    enabled: breakdownReady,
  })

  // Top sellers share the same picker, but an empty picker means ALL TIME
  // here (a today-only best-seller list would be empty most mornings).
  const {
    data: topProductsData,
    isLoading: topProductsLoading,
    isFetching: topProductsFetching,
    error: topProductsError,
  } = useQuery({
    queryKey: ['dashboard-top-products', fromDate, toDate, breakdownReady],
    queryFn: () => getTopSellingProducts(TOP_PRODUCTS_LIMIT, fromDate || undefined, toDate || undefined),
    enabled: breakdownReady,
  })

  const statsList = data?.stats || []

  return (
    <div className="space-y-10 pb-10 max-w-[1400px]">

      {/* ── Exact Welcome Section ───────── */}
      <section className="rounded-xl bg-white p-8 shadow-sm border border-gray-100">
        <h1 className="font-display text-[28px] font-semibold text-gray-900 mb-2">
          Welcome back
        </h1>
        <p className="text-[14.5px] text-gray-500 max-w-2xl leading-relaxed">
          Here's an overview of your store. Manage products, orders, banners, and more from one place.
        </p>
      </section>

      {/* ── Sales Overview ─────────────────────────────── */}
      <section>
        <h2 className="text-[12px] font-bold text-gray-500 uppercase tracking-widest mb-4">
          SALES OVERVIEW
        </h2>

        {salesLoading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <StatSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <article
              className="relative overflow-hidden rounded-2xl p-5 text-white flex flex-col justify-between min-h-[120px] shadow-[0_8px_20px_-6px_rgba(34,197,94,0.5)]"
              style={{ background: 'linear-gradient(to bottom right, #22c55e, #16a34a)' }}
            >
              <IndianRupee className="absolute bottom-2 right-2 w-16 h-16 opacity-20 pointer-events-none" />
              <div className="relative z-10 flex flex-col h-full justify-between">
                <p className="text-[11px] font-bold tracking-widest text-white/90 uppercase mb-2">
                  Total Sales
                </p>
                <p className="font-display text-[28px] font-bold leading-none mt-auto">
                  {formatCurrency(salesData?.totalSales ?? 0)}
                </p>
              </div>
            </article>

            <article
              className="relative overflow-hidden rounded-2xl p-5 text-white flex flex-col justify-between min-h-[120px] shadow-[0_8px_20px_-6px_rgba(122,92,250,0.5)]"
              style={{ background: 'linear-gradient(to bottom right, #7a5cfa, #6042db)' }}
            >
              <IndianRupee className="absolute bottom-2 right-2 w-16 h-16 opacity-20 pointer-events-none" />
              <div className="relative z-10 flex flex-col h-full justify-between">
                <p className="text-[11px] font-bold tracking-widest text-white/90 uppercase mb-2">
                  Today's Sales
                </p>
                <p className="font-display text-[28px] font-bold leading-none mt-auto">
                  {formatCurrency(salesData?.todaySales ?? 0)}
                </p>
              </div>
            </article>

            <article
              className="relative overflow-hidden rounded-2xl p-5 text-white flex flex-col justify-between min-h-[120px] shadow-[0_8px_20px_-6px_rgba(62,165,251,0.5)]"
              style={{ background: 'linear-gradient(to bottom right, #3ea5fb, #258bf7)' }}
            >
              <IndianRupee className="absolute bottom-2 right-2 w-16 h-16 opacity-20 pointer-events-none" />
              <div className="relative z-10 flex flex-col h-full justify-between">
                <p className="text-[11px] font-bold tracking-widest text-white/90 uppercase mb-2">
                  Range Sales
                </p>
                <p className="font-display text-[28px] font-bold leading-none mt-auto">
                  {appliedRange
                    ? (salesFetching ? '…' : formatCurrency(salesData?.rangeSales ?? 0))
                    : '—'}
                </p>
                {appliedRange && (
                  <p className="text-[11px] text-white/80 mt-1">
                    {appliedRange.from} to {appliedRange.to}
                  </p>
                )}
              </div>
            </article>
          </div>
        )}

        {/* Date range filter */}
        <div className="mt-4 rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">From</label>
              <input
                type="date"
                value={fromDate}
                max={today}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-[13.5px] text-gray-800"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">To</label>
              <input
                type="date"
                value={toDate}
                max={today}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-[13.5px] text-gray-800"
              />
            </div>
            <button
              type="button"
              disabled={!canApplyRange}
              onClick={handleApplyRange}
              className="rounded-lg bg-gray-900 px-4 py-2 text-[13.5px] font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Apply
            </button>
            {appliedRange && (
              <button
                type="button"
                onClick={handleClearRange}
                className="rounded-lg border border-gray-200 px-4 py-2 text-[13.5px] font-semibold text-gray-600"
              >
                Clear
              </button>
            )}
          </div>
          {rangeValidationError && (
            <p className="mt-2 text-[12.5px] font-medium text-red-600">{rangeValidationError}</p>
          )}
          {!rangeValidationError && salesError && (
            <p className="mt-2 text-[12.5px] font-medium text-red-600">
              {salesError instanceof Error ? salesError.message : 'Failed to load sales for the selected range.'}
            </p>
          )}
        </div>

        {/* Orders & product breakdown for the selected date/range — auto-fetches, no Apply needed */}
        <div className="mt-4 rounded-xl bg-white p-5 shadow-sm border border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h3 className="text-[13.5px] font-semibold text-gray-800">
              Orders &amp; Products
              {breakdownData && (
                <span className="ml-2 font-normal text-gray-500">
                  ({breakdownData.date.from === breakdownData.date.to
                    ? breakdownData.date.from
                    : `${breakdownData.date.from} to ${breakdownData.date.to}`})
                </span>
              )}
            </h3>
            {breakdownFetching && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-5 md:max-w-sm">
            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Orders</p>
              <p className="text-[22px] font-bold text-gray-900">{breakdownData?.orderCount ?? '–'}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Total Orders (all-time)</p>
              <p className="text-[22px] font-bold text-gray-900">{breakdownData?.totalOrdersAllTime ?? '–'}</p>
            </div>
          </div>

          {rangeValidationError ? (
            <p className="text-[13px] text-gray-500">Fix the date range above to see orders and products.</p>
          ) : breakdownError ? (
            <p className="text-[12.5px] font-medium text-red-600">
              {breakdownError instanceof Error ? breakdownError.message : 'Failed to load orders/products for the selected range.'}
            </p>
          ) : breakdownLoading ? (
            <div className="animate-pulse rounded-lg bg-gray-100 h-32 w-full" />
          ) : (breakdownData?.products.length ?? 0) === 0 ? (
            <p className="text-[13px] text-gray-500 py-3">No products sold in this range.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-gray-500 text-[11px] uppercase tracking-wide border-b border-gray-100">
                    <th className="py-2 pr-4 font-semibold">Product</th>
                    <th className="py-2 pr-4 font-semibold text-right">Qty Sold</th>
                    <th className="py-2 font-semibold text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdownData!.products.map((p) => (
                    <tr key={p.productId ?? p.name} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 pr-4 text-gray-800">{p.name}</td>
                      <td className="py-2 pr-4 text-right text-gray-700">{p.quantity}</td>
                      <td className="py-2 text-right text-gray-700">{formatCurrency(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ── Top Selling Products ───────────────────────── */}
      <section>
        <h2 className="text-[12px] font-bold text-gray-500 uppercase tracking-widest mb-4">
          TOP SELLING PRODUCTS
        </h2>

        <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h3 className="flex items-center gap-2 text-[13.5px] font-semibold text-gray-800">
              <TrendingUp className="h-4 w-4 text-[#22c55e]" />
              Top {TOP_PRODUCTS_LIMIT} by units sold
              {topProductsData && (
                <span className="font-normal text-gray-500">
                  ({!topProductsData.range
                    ? 'all time'
                    : topProductsData.range.from === topProductsData.range.to
                      ? topProductsData.range.from
                      : `${topProductsData.range.from} to ${topProductsData.range.to}`})
                </span>
              )}
            </h3>
            {topProductsFetching && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          </div>

          {rangeValidationError ? (
            <p className="text-[13px] text-gray-500">Fix the date range above to see top selling products.</p>
          ) : topProductsError ? (
            <p className="text-[12.5px] font-medium text-red-600">
              {topProductsError instanceof Error ? topProductsError.message : 'Failed to load top selling products.'}
            </p>
          ) : topProductsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: TOP_PRODUCTS_LIMIT }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-lg bg-gray-100 h-[80px] w-full" />
              ))}
            </div>
          ) : (topProductsData?.products.length ?? 0) === 0 ? (
            <p className="text-[13px] text-gray-500 py-3">No products sold yet in this period.</p>
          ) : (
            <ol className="space-y-2">
              {topProductsData!.products.map((p, index) => (
                <li
                  key={p.productId}
                  className="flex items-center gap-4 rounded-lg border border-gray-100 p-3 transition-colors hover:border-gray-200 hover:bg-gray-50/60"
                >
                  <span className="w-5 shrink-0 text-center font-display text-[15px] font-bold text-gray-400">
                    {index + 1}
                  </span>

                  <ProductThumb url={p.imageUrl} alt={p.name} />

                  <Link
                    to={`/products/edit/${p.productId}`}
                    className="min-w-0 flex-1 text-[13.5px] font-medium text-gray-800 no-underline line-clamp-2 hover:text-[#7a5cfa]"
                  >
                    {p.name}
                  </Link>

                  <div className="w-16 shrink-0 text-right">
                    <p className="text-[16px] font-bold leading-tight text-gray-900">{p.quantity}</p>
                    <p className="text-[10.5px] uppercase tracking-wide text-gray-400">units</p>
                  </div>

                  <div className="w-28 shrink-0 text-right">
                    <p className="text-[13.5px] font-semibold leading-tight text-gray-700">
                      {formatCurrency(p.revenue)}
                    </p>
                    <p className="text-[10.5px] uppercase tracking-wide text-gray-400">revenue</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      {/* ── Premium Gradient Stats Grid ─────────────────── */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="text-[12px] font-bold text-gray-500 uppercase tracking-widest">
            STORE OVERVIEW
          </h2>
          {statsFetching && !isLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
        </div>

        {statsError ? (
          <p className="text-[12.5px] font-medium text-red-600">
            {statsError instanceof Error ? statsError.message : 'Failed to load store overview.'}
          </p>
        ) : isLoading ? (
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => <StoreStatSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-5">
            {statsList.map((stat) => (
              <StoreStatCard key={stat.key} stat={stat} />
            ))}
          </div>
        )}
      </section>

      {/* ── Premium Styled Quick Actions Cards ────────────── */}
      <section>
        <h2 className="text-[12px] font-bold text-gray-500 uppercase tracking-widest mb-4">
          QUICK ACTIONS
        </h2>
        
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <QuickActionSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="group flex flex-col rounded-2xl bg-white p-6 shadow-sm border border-gray-100 no-underline transition-all hover:shadow-lg hover:border-gray-200"
              >
                <div 
                  className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-105"
                  style={action.colorStyle}
                >
                  <action.Icon className="h-6 w-6" strokeWidth={2.5} />
                </div>
                
                {/* Exact Text Names for Actions */}
                <h3 className="font-display text-[16px] font-semibold text-gray-900 mb-2">
                  {action.title}
                </h3>
                <p className="text-[14px] text-gray-500 leading-relaxed mb-6 flex-1">
                  {action.description}
                </p>
                <div className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-900">
                  Go to {action.title}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Loading Overlay (full-page fallback) ────────── */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-[#7a5cfa]" />
          <span className="ml-2 text-sm text-[var(--muted)]">
            Loading dashboard data…
          </span>
        </div>
      )}
    </div>
  )
}
