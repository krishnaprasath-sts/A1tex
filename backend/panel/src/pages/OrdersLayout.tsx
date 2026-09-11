import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ChevronLeft, ChevronRight, Download, Eye, Loader2, ShoppingBag, XCircle } from 'lucide-react'
import { apiBaseUrl, downloadDispatchedCodPendingInvoicesPdf, downloadStageAddressesPdf, downloadStageInvoicesPdf, getOrderPipelineCounts, getOrdersByStage, transitionOrderStatus, listResource } from '../services/api'
import { displayValue } from './ResourceShared'
import { useAdminAuth } from '../contexts/AdminAuthContext'

const ITEMS_PER_PAGE = 20

const stages = [
  { key: 'pending-payment', label: 'Abandoned Checkouts', status: 'pending_payment' },
  { key: 'pending', label: 'New Orders', status: 'pending' },
  { key: 'confirmed', label: 'Confirmed', status: 'confirmed' },
  { key: 'packing', label: 'Packing', status: 'packing' },
  { key: 'dispatched', label: 'Dispatched', status: 'dispatched' },
  { key: 'out-for-delivery', label: 'Out for Delivery', status: 'out_for_delivery' },
  { key: 'delivered', label: 'Delivered', status: 'delivered' },
  { key: 'cancelled', label: 'Cancelled', status: 'cancelled' },
  { key: 'rto', label: 'RTO', status: 'rto' },
  { key: 'returned', label: 'Returned', status: 'returned' },
] as const

const stageLabels: Record<string, string> = {
  'pending-payment': 'Abandoned Checkouts',
  pending: 'New Orders',
  confirmed: 'Confirmed',
  packing: 'Packing',
  dispatched: 'Dispatched',
  'out-for-delivery': 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  rto: 'RTO',
  returned: 'Returned',
}

const stageBadgeClass: Record<string, string> = {
  'pending-payment': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  pending: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  packing: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  dispatched: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'out-for-delivery': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  rto: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  returned: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
}

const advanceSteps: Record<string, { nextStatus: string; label: string }> = {
  pending: { nextStatus: 'confirmed', label: 'Confirm' },
  confirmed: { nextStatus: 'packing', label: 'Pack' },
  packing: { nextStatus: 'dispatched', label: 'Dispatch / Ship' },
  dispatched: { nextStatus: 'out_for_delivery', label: 'Out for Delivery' },
  'out-for-delivery': { nextStatus: 'delivered', label: 'Deliver' },
}

export default function OrdersLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { hasPermission } = useAdminAuth()
  const canTransitionOrders = hasPermission('transition_orders')
  const canManageInvoices = hasPermission('manage_invoices')
  const pathParts = location.pathname.split('/').filter(Boolean)

  let activeTab = 'pending'
  if (pathParts.length >= 2 && pathParts[0] === 'orders') {
    const tab = pathParts[1]
    if (stages.some(s => s.key === tab)) activeTab = tab
  }

  const [currentPage, setCurrentPage] = useState(1)
  const [shippingModal, setShippingModal] = useState<{ orderId: number; orderNumber: string; targetStatus: string } | null>(null)
  const [courierName, setCourierName] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [trackingUrl, setTrackingUrl] = useState('')
  const [agentName, setAgentName] = useState('')
  const [agentPhone, setAgentPhone] = useState('')
  const [confirmCancel, setConfirmCancel] = useState<{ orderId: number; orderNumber: string } | null>(null)
  useEffect(() => { setCurrentPage(1) }, [activeTab])

  // Fetch dynamic courier partners from settings
  const { data: settingsData } = useQuery({
    queryKey: ['resource', 'settings'],
    queryFn: () => listResource('settings'),
  })
  const couriersList: Array<{ id: string; name: string; code: string; trackingUrlTemplate?: string }> = useMemo(() => {
    const row = settingsData?.items?.find((i: any) => i.key === 'courier_config')
    if (Array.isArray(row?.value) && row.value.length > 0) {
      return row.value.filter((c: any) => c.active !== false)
    }
    return [
      { id: 'st_courier', name: 'ST Courier', code: 'st_courier', trackingUrlTemplate: 'https://stcourier.com/track' },
      { id: 'dtdc', name: 'DTDC Courier', code: 'dtdc', trackingUrlTemplate: 'https://track.dtdc.com' },
      { id: 'professional', name: 'The Professional Couriers', code: 'professional', trackingUrlTemplate: 'https://www.tpcindia.com' },
      { id: 'indiapost', name: 'India Post (Speed Post)', code: 'indiapost', trackingUrlTemplate: 'https://www.indiapost.gov.in' },
    ]
  }, [settingsData])

  const { data: countsData, isLoading: countsLoading } = useQuery({
    queryKey: ['order-pipeline-counts'],
    queryFn: getOrderPipelineCounts,
    refetchInterval: 30000,
  })
  const counts = countsData?.counts || {}

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['orders-pipeline', activeTab, currentPage],
    queryFn: () => getOrdersByStage(activeTab, currentPage, ITEMS_PER_PAGE),
    refetchInterval: 15000,
  })

  const items = data?.items || []
  const totalItems = data?.total ?? items.length
  const totalPages = data?.totalPages ?? Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE))

  const advanceMut = useMutation({
    mutationFn: (args: {
      orderId: number
      nextStatus: string
      courierName?: string
      deliveryAgentName?: string
      deliveryAgentPhone?: string
      trackingNumber?: string
      trackingUrl?: string
      isManualShipping?: boolean
    }) =>
      transitionOrderStatus(args.orderId, args.nextStatus, args),
    onSuccess: () => {
      setShippingModal(null)
      setCourierName('')
      setTrackingNumber('')
      setTrackingUrl('')
      setAgentName('')
      setAgentPhone('')
      queryClient.invalidateQueries({ queryKey: ['orders-pipeline'] })
      queryClient.invalidateQueries({ queryKey: ['order-pipeline-counts'] })
    },
  })

  const cancelMut = useMutation({
    mutationFn: (orderId: number) => transitionOrderStatus(orderId, 'cancelled'),
    onSuccess: () => {
      setConfirmCancel(null)
      queryClient.invalidateQueries({ queryKey: ['orders-pipeline'] })
      queryClient.invalidateQueries({ queryKey: ['order-pipeline-counts'] })
    },
  })

  function formatDate(val: unknown): string {
    if (!val) return '–'
    const d = new Date(String(val))
    if (isNaN(d.getTime())) return String(val).substring(0, 10)
    return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  function handleAdvanceClick(item: Record<string, unknown>) {
    const stage = advanceSteps[activeTab]
    if (!stage) return

    const meta = (item.metadata as Record<string, unknown>) || {}
    const existingCourier = String(meta.courierName || item.deliveryAgentName || '')
    const existingTracking = String(item.trackingNumber || meta.shiprocketAwbCode || '')
    const existingUrl = String(meta.trackingUrl || '')
    const existingAgentName = String(item.deliveryAgentName || '')
    const existingAgentPhone = String(item.deliveryAgentPhone || '')

    // If advancing from 'dispatched' to 'out_for_delivery':
    // If courier details / tracking already exists, DO NOT ask again! Advance directly!
    if (stage.nextStatus === 'out_for_delivery' && (existingCourier || existingTracking)) {
      advanceMut.mutate({
        orderId: item.id as number,
        nextStatus: 'out_for_delivery',
        courierName: existingCourier || undefined,
        deliveryAgentName: existingAgentName || existingCourier || undefined,
        deliveryAgentPhone: existingAgentPhone || undefined,
        trackingNumber: existingTracking || undefined,
        trackingUrl: existingUrl || undefined,
        isManualShipping: true,
      })
      return
    }

    if (stage.nextStatus === 'dispatched' || stage.nextStatus === 'out_for_delivery') {
      // Pre-fill existing details so admin does not have to retype them
      const defaultCourier = couriersList.find(c => c.name.toLowerCase() === existingCourier.toLowerCase())?.name
        || existingCourier
        || (couriersList[0]?.name || 'DTDC Courier')

      setCourierName(defaultCourier)
      setTrackingNumber(existingTracking)
      setTrackingUrl(existingUrl)
      setAgentName(existingAgentName)
      setAgentPhone(existingAgentPhone)

      setShippingModal({
        orderId: item.id as number,
        orderNumber: String(item.orderNumber || ''),
        targetStatus: stage.nextStatus,
      })
      return
    }
    advanceMut.mutate({ orderId: item.id as number, nextStatus: stage.nextStatus, isManualShipping: true })
  }

  function handleShippingConfirm() {
    if (!shippingModal) return
    advanceMut.mutate({
      orderId: shippingModal.orderId,
      nextStatus: shippingModal.targetStatus,
      courierName: courierName.trim() || undefined,
      deliveryAgentName: courierName.trim() || agentName.trim() || undefined,
      deliveryAgentPhone: agentPhone.trim() || undefined,
      trackingNumber: trackingNumber.trim() || undefined,
      trackingUrl: trackingUrl.trim() || undefined,
      isManualShipping: true,
    })
  }

  return (
    <div className="space-y-6">
      <section className="admin-card rounded-lg p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[var(--burgundy)]">
              Order Desk
            </p>
            <h1 className="mt-2 flex items-center gap-3 font-display text-3xl font-semibold text-[var(--gold)] md:text-4xl">
              <ShoppingBag className="h-7 w-7 md:h-8 md:w-8" />
              Orders
            </h1>
          </div>

        </div>
      </section>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-1">
        {stages.map(stage => {
          const count = counts[stage.key] ?? 0
          return (
            <button
              key={stage.key}
              type="button"
              onClick={() => navigate(`/orders/${stage.key}`)}
              className={`flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-bold transition-colors ${
                activeTab === stage.key
                  ? 'bg-[var(--burgundy-soft)] text-[var(--burgundy)] shadow-sm'
                  : 'text-[var(--muted)] hover:bg-[var(--panel-strong)] hover:text-[var(--text)]'
              }`}
            >
              {stage.label}
              {countsLoading ? (
                <span className="h-5 w-8 animate-pulse rounded-full bg-[var(--line)]" />
              ) : count > 0 ? (
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${stageBadgeClass[stage.key] || ''}`}>
                  {count}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {activeTab === 'pending-payment' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
          Customers who reached checkout but did not complete their order. No stock was deducted. These stay here until you cancel them manually — they do not auto-expire.
        </div>
      )}

      {/* Table */}
      <section className="admin-card overflow-hidden rounded-lg">
        {!isLoading && items.length > 0 ? (
          <div className="border-b border-[var(--line)] px-5 py-3 flex justify-between items-center">
            <p className="text-[14.5px] font-semibold text-[var(--muted)]">
              Showing{' '}
              <span className="text-[var(--text)]">
                {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalItems)}
              </span>
              {' '}to{' '}
              <span className="text-[var(--text)]">
                {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)}
              </span>
              {' '}of{' '}
              <span className="text-[var(--text)]">{totalItems}</span>{' '}
              {totalItems === 1 ? 'record' : 'records'}
            </p>
            {activeTab !== 'pending-payment' ? (
              <div className="flex items-center gap-2">
                {canManageInvoices && activeTab === 'dispatched' ? (
                  <button
                    type="button"
                    onClick={() => downloadDispatchedCodPendingInvoicesPdf().catch(() => {})}
                    className="inline-flex items-center gap-2 rounded bg-[var(--burgundy)] px-4 py-2 text-[13px] font-bold text-white transition-colors hover:opacity-90"
                  >
                    <Download className="h-4 w-4" />
                    Print COD Pending Invoices
                  </button>
                ) : null}
                {canManageInvoices ? (
                  <button
                    type="button"
                    onClick={() => downloadStageInvoicesPdf(activeTab).catch(() => {})}
                    className="inline-flex items-center gap-2 rounded bg-[var(--gold)] px-4 py-2 text-[13px] font-bold text-white transition-colors hover:opacity-90"
                  >
                    <Download className="h-4 w-4" />
                    Print All Invoices
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => downloadStageAddressesPdf(activeTab).catch(() => {})}
                  className="inline-flex items-center gap-2 rounded bg-[var(--burgundy)] px-4 py-2 text-[13px] font-bold text-white transition-colors hover:opacity-90"
                >
                  <Download className="h-4 w-4" />
                  Download All Addresses
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-[15px]">
            <thead className="border-b border-[var(--line)] bg-[var(--panel-strong)] text-[13.5px] font-bold uppercase tracking-wider text-[var(--muted)]">
              <tr>
                <th className="px-5 py-3.5 font-bold">S.No</th>
                {activeTab !== 'pending-payment' ? (
                  <th className="px-5 py-3.5 font-bold">Order ID</th>
                ) : null}
                <th className="px-5 py-3.5 font-bold">{activeTab === 'pending-payment' ? 'Checkout Cancelled' : 'Ordered Date'}</th>
                <th className="px-5 py-3.5 font-bold">Name</th>
                <th className="px-5 py-3.5 font-bold">Payment</th>
                <th className="px-5 py-3.5 font-bold">Method</th>
                <th className="px-5 py-3.5 font-bold">Coupon</th>
                <th className="px-5 py-3.5 font-bold">Status</th>
                <th className="px-5 py-3.5 font-bold">Total</th>
                <th className="px-5 py-3.5 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const serialNo = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1
                const shippingInfo = item.shippingAddress as Record<string, unknown> | null
                const customerObj = item.Customer as Record<string, unknown> | null | undefined
                const rawName = customerObj?.name
                  ? String(customerObj.name)
                  : shippingInfo
                    ? [shippingInfo.firstName, shippingInfo.lastName].filter(Boolean).join(' ')
                    : String(item.customerEmail || 'Guest')
                const customerName = `${rawName} (${item.customerId ? 'Customer' : 'Guest'})`
                const customerPhone = String(
                  customerObj?.mobile || (shippingInfo && shippingInfo.phone) || '',
                )
                const customerEmail = String(customerObj?.email || item.customerEmail || '')
                const payment = String(item.paymentStatus || '')
                let payClass = 'admin-badge '
                if (payment === 'paid') payClass += 'admin-badge-success'
                else if (payment === 'pending') payClass += 'admin-badge-warning'
                else payClass += 'admin-badge-muted'
                const canAdvance = canTransitionOrders && (activeTab in advanceSteps)
                const canCancel = canTransitionOrders && activeTab !== 'delivered' && activeTab !== 'cancelled' && activeTab !== 'rto' && activeTab !== 'returned'

                return (
                  <tr
                    key={item.id as number}
                    className="admin-table-row border-b border-[var(--line)] last:border-0"
                  >
                    <td className="px-5 py-4 text-[var(--muted)] font-semibold">{serialNo}</td>
                    {activeTab !== 'pending-payment' ? (
                      <td className="px-5 py-4 font-mono text-sm font-bold text-[var(--burgundy)]">
                        {String(item.orderNumber || '')}
                      </td>
                    ) : null}
                    <td className="px-5 py-4 text-[var(--text)]">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="max-w-[240px] whitespace-normal break-words px-5 py-4">
                      <div className="font-semibold text-[var(--text)]">{customerName}</div>
                      {customerPhone ? (
                        <div className="mt-0.5 text-xs text-[var(--muted)]">{customerPhone}</div>
                      ) : null}
                      {customerEmail ? (
                        <div className="text-xs text-[var(--muted)]">{customerEmail}</div>
                      ) : null}
                    </td>
                    <td className="px-5 py-4">
                      <span className={payClass}>{displayValue(item.paymentStatus)}</span>
                    </td>
                    <td className="px-5 py-4 text-sm text-[var(--muted)]">
                      {((item.metadata as Record<string, unknown>)?.paymentMethod as string)?.toUpperCase() || '–'}
                    </td>
                    <td className="px-5 py-4 text-sm text-[var(--muted)]">
                      {String(item.couponCode || '') || '–'}
                    </td>
                    <td className="px-5 py-4">
                      <span className={activeTab === 'cancelled' ? 'admin-badge admin-badge-muted' : 'admin-badge admin-badge-info'}>
                        {stageLabels[activeTab] || String(item.status || '')}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold">
                      ₹{Number(item.grandTotal || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1.5 flex-nowrap">
                        <button
                          type="button"
                          onClick={() => navigate(`/orders/${item.id}?from=${activeTab}`)}
                          className="rounded border border-[var(--line)] p-1.5 text-[var(--gold)] transition-colors hover:bg-[var(--burgundy-soft)]"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <a
                          href={`${apiBaseUrl}/admin/orders/${item.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded border border-[var(--line)] p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--panel-strong)]"
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        {canAdvance && advanceSteps[activeTab] ? (
                          <button
                            type="button"
                            onClick={() => handleAdvanceClick(item)}
                            disabled={advanceMut.isPending}
                            className="rounded bg-[var(--gold)] px-2.5 py-1.5 text-[11px] font-bold text-white transition-colors hover:opacity-90 disabled:opacity-50"
                          >
                            {advanceMut.isPending ? '…' : advanceSteps[activeTab].label}
                          </button>
                        ) : null}
                        {canCancel ? (
                          <button
                            type="button"
                            onClick={() => setConfirmCancel({ orderId: item.id as number, orderNumber: String(item.orderNumber || '') })}
                            disabled={cancelMut.isPending}
                            className="rounded border border-red-200 p-1.5 text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
                            title="Cancel Order"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}

              {!items.length && !isLoading ? (
                <tr>
                  <td colSpan={activeTab === 'pending-payment' ? 9 : 10} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--burgundy-soft)]">
                        <ShoppingBag className="h-7 w-7 text-[var(--burgundy)]" />
                      </div>
                      <p className="text-sm font-semibold text-[var(--muted)]">
                        No orders in this stage
                      </p>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {!isLoading && totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-[var(--line)] px-5 py-3.5">
            <p className="text-[13.5px] font-semibold text-[var(--muted)]">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 rounded border border-[var(--line)] px-3 py-1.5 text-[13px] font-bold text-[var(--gold)] transition-colors hover:bg-[var(--burgundy-soft)] disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 rounded border border-[var(--line)] px-3 py-1.5 text-[13px] font-bold text-[var(--gold)] transition-colors hover:bg-[var(--burgundy-soft)] disabled:opacity-50"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-12">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--gold)]" />
            <p className="text-sm font-semibold text-[var(--muted)]">Loading orders…</p>
          </div>
        ) : null}

      </section>

      {/* Manual Dispatch / Shipping Modal */}
      {shippingModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[var(--burgundy)]">
              {shippingModal.targetStatus === 'dispatched' ? 'Dispatch / Ship Order' : 'Out for Delivery / Courier Details'}
            </h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Order: <strong>{shippingModal.orderNumber}</strong>
            </p>
            <p className="mt-2 text-xs text-[var(--muted)]">
              Enter courier & tracking details below for manual shipping:
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                  Courier Partner
                </label>
                <div className="space-y-2">
                  <select
                    value={couriersList.some(c => c.name.toLowerCase() === courierName.toLowerCase()) ? courierName : (courierName ? '__custom__' : (couriersList[0]?.name || ''))}
                    onChange={e => {
                      const val = e.target.value
                      if (val === '__custom__') {
                        setCourierName('')
                      } else {
                        setCourierName(val)
                        const cObj = couriersList.find(c => c.name === val)
                        if (cObj?.trackingUrlTemplate && !trackingUrl) {
                          setTrackingUrl(cObj.trackingUrlTemplate)
                        }
                      }
                    }}
                    className="admin-input w-full rounded px-3 py-2 text-sm bg-white font-medium"
                  >
                    {couriersList.map(c => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                    <option value="__custom__">+ Other / Custom Courier</option>
                  </select>

                  {(!couriersList.some(c => c.name.toLowerCase() === courierName.toLowerCase()) || !courierName) && (
                    <input
                      type="text"
                      value={courierName}
                      onChange={e => setCourierName(e.target.value)}
                      placeholder="Enter custom courier name..."
                      className="admin-input w-full rounded px-3 py-2 text-sm"
                    />
                  )}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                  AWB / Tracking Number
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={e => setTrackingNumber(e.target.value)}
                  placeholder="e.g. DTDC12345678"
                  className="admin-input w-full rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                  Tracking URL (optional)
                </label>
                <input
                  type="text"
                  value={trackingUrl}
                  onChange={e => setTrackingUrl(e.target.value)}
                  placeholder="https://..."
                  className="admin-input w-full rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                  Agent / Driver Phone (optional)
                </label>
                <input
                  type="text"
                  value={agentPhone}
                  onChange={e => setAgentPhone(e.target.value)}
                  placeholder="+91..."
                  className="admin-input w-full rounded px-3 py-2 text-sm"
                />
              </div>
            </div>
            {advanceMut.isError ? (
              <p className="mt-3 text-sm font-semibold text-red-600">
                {(advanceMut.error as Error).message}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShippingModal(null); setCourierName(''); setTrackingNumber(''); setTrackingUrl(''); setAgentName(''); setAgentPhone('') }}
                disabled={advanceMut.isPending}
                className="rounded border border-[var(--line)] px-4 py-2 text-sm font-bold text-[var(--burgundy)] transition-colors hover:bg-[var(--gold-soft)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleShippingConfirm}
                disabled={advanceMut.isPending}
                className="flex items-center gap-2 rounded bg-[var(--gold)] px-4 py-2 text-sm font-bold text-white transition-colors hover:opacity-90 disabled:opacity-50"
              >
                {advanceMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {advanceMut.isPending ? 'Updating…' : 'Confirm & Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Cancel Confirmation */}
      {confirmCancel ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-[var(--burgundy)]">Cancel Order</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Are you sure you want to cancel order <strong>{confirmCancel.orderNumber}</strong>?
                </p>
              </div>
            </div>
            {cancelMut.isError ? (
              <p className="mt-3 text-sm font-semibold text-red-600">
                {(cancelMut.error as Error).message}
              </p>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmCancel(null)}
                disabled={cancelMut.isPending}
                className="rounded border border-[var(--line)] px-4 py-2 text-sm font-bold text-[var(--burgundy)] transition-colors hover:bg-[var(--gold-soft)] disabled:opacity-50"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => cancelMut.mutate(confirmCancel.orderId)}
                disabled={cancelMut.isPending}
                className="flex items-center gap-2 rounded bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {cancelMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {cancelMut.isPending ? 'Cancelling…' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
