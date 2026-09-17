import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, ChevronRight, ClipboardCheck, Clock, CreditCard, Download, FileText, Loader2, Mail, Navigation, Package, PackageX, RefreshCcw, RotateCcw, ShoppingBag, Truck, XCircle } from 'lucide-react'
import { apiBaseUrl, generateInvoice, getInvoice, getOrderDetail, transitionOrderStatus, updateOrderPayment, resolveImageUrl, apiFetch, downloadBlob, sendRecoveryEmail, listResource, resendOrderStatusEmail } from '../services/api'
import { displayValue } from './ResourceShared'
import { useAdminAuth } from '../contexts/AdminAuthContext'

const pipelineStages = [
  { key: 'pending', label: 'Pending', Icon: Clock },
  { key: 'confirmed', label: 'Confirmed', Icon: ClipboardCheck },
  { key: 'packing', label: 'Packing', Icon: Package },
  { key: 'dispatched', label: 'Dispatched', Icon: Truck },
  { key: 'out_for_delivery', label: 'Out for Delivery', Icon: Navigation },
  { key: 'delivered', label: 'Delivered', Icon: CheckCircle2 },
  { key: 'rto', label: 'RTO', Icon: RotateCcw },
  { key: 'returned', label: 'Returned', Icon: PackageX },
]

const validTransitionsMap: Record<string, string[]> = {
  pending_payment: ['pending', 'confirmed', 'cancelled'],
  pending: ['confirmed', 'cancelled'],
  confirmed: ['packing', 'pending', 'cancelled'],
  packing: ['dispatched', 'confirmed', 'cancelled'],
  dispatched: ['out_for_delivery', 'delivered', 'rto', 'packing', 'cancelled'],
  shipped: ['out_for_delivery', 'delivered', 'rto', 'packing', 'cancelled'],
  out_for_delivery: ['delivered', 'rto', 'dispatched', 'cancelled'],
  delivered: ['returned', 'rto'],
  rto: ['returned', 'dispatched', 'cancelled'],
  returned: ['cancelled'],
  cancelled: ['pending'],
}

const nextStageMap: Record<string, { status: string; label: string }> = {
  pending_payment: { status: 'pending', label: 'Confirm COD' },
  pending: { status: 'confirmed', label: 'Confirm Order' },
  confirmed: { status: 'packing', label: 'Move to Packing' },
  packing: { status: 'dispatched', label: 'Dispatch Order' },
  dispatched: { status: 'out_for_delivery', label: 'Out for Delivery' },
  out_for_delivery: { status: 'delivered', label: 'Mark as Delivered' },
}

function formatDate(val: unknown): string {
  if (!val) return '–'
  const d = new Date(String(val))
  if (isNaN(d.getTime())) return String(val)
  return d.toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const backStage = searchParams.get('from') || 'pending'
  const queryClient = useQueryClient()
  const { hasPermission } = useAdminAuth()
  const canManageInvoices = hasPermission('manage_invoices')
  const canTransitionOrders = hasPermission('transition_orders')
  const [showConfirm, setShowConfirm] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [courierName, setCourierName] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [trackingUrl, setTrackingUrl] = useState('')
  const [agentName, setAgentName] = useState('')
  const [agentPhone, setAgentPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [orderPaymentStatus, setOrderPaymentStatus] = useState('pending')
  const [transactionId, setTransactionId] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [invoice, setInvoice] = useState<Record<string, unknown> | null>(null)
  const [invoiceLoading, setInvoiceLoading] = useState(false)
  const [invoiceGenerating, setInvoiceGenerating] = useState(false)
  const [invoiceRegenerating, setInvoiceRegenerating] = useState(false)
  const [recoverySending, setRecoverySending] = useState(false)
  const [resendingEmail, setResendingEmail] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['order-detail', id],
    queryFn: () => getOrderDetail(id!),
    enabled: Boolean(id),
  })

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

  const order = data?.item as Record<string, unknown> | undefined

  useEffect(() => {
    if (order) {
      const meta = (order.metadata as Record<string, unknown>) || {}
      setCourierName(String(meta.courierName || order.deliveryAgentName || ''))
      setTrackingNumber(String(order.trackingNumber || meta.shiprocketAwbCode || ''))
      setTrackingUrl(String(meta.trackingUrl || ''))
      setAgentName(String(order.deliveryAgentName || ''))
      setAgentPhone(String(order.deliveryAgentPhone || ''))
      setPaymentMethod(String(order.paymentMethod || meta.paymentMethod || 'cod').toLowerCase())
      setOrderPaymentStatus(String(order.paymentStatus || 'pending').toLowerCase())
      setTransactionId(String(meta.transactionId || order.razorpayPaymentId || ''))
      setPaymentNotes(String(meta.paymentNotes || ''))
    }
  }, [order])

  useEffect(() => {
    if (!id || !canManageInvoices) {
      setInvoice(null)
      setInvoiceLoading(false)
      return
    }
    setInvoiceLoading(true)
    getInvoice(id)
      .then(res => setInvoice(res.item as Record<string, unknown> | null))
      .catch(() => setInvoice(null))
      .finally(() => setInvoiceLoading(false))
  }, [id, data, canManageInvoices]) // re-fetch when order data changes

  async function handleGenerateInvoice() {
    if (!id) return
    setInvoiceGenerating(true)
    try {
      const res = await generateInvoice(id)
      setInvoice(res.item as Record<string, unknown>)
      const inv = res.item as Record<string, unknown> | undefined
      downloadBlob(`/admin/orders/${id}/invoice/pdf`, `${String(inv?.invoiceNumber || `invoice-${id}`)}.pdf`).catch(() => {})
    } catch (e: any) {
      setError(e.message || 'Failed to generate invoice')
      setTimeout(() => setError(''), 6000)
    } finally {
      setInvoiceGenerating(false)
    }
  }

  const items = (order?.items as Array<Record<string, unknown>>) || []
  const customer = order?.Customer as Record<string, unknown> | undefined
  const shippingAddress = order?.shippingAddress as Record<string, unknown> | null | undefined
  const currentStatus = (order?.status as string) || ''
  const paymentStatus = (order?.paymentStatus as string) || ''
  const isTerminal = currentStatus === 'delivered' || currentStatus === 'cancelled' || currentStatus === 'rto' || currentStatus === 'returned'
  const nextAction = nextStageMap[currentStatus]
  const needsAgent = currentStatus === 'dispatched'

  const transitionMut = useMutation({
    mutationFn: (payload: {
      nextStatus: string
      courierName?: string
      deliveryAgentName?: string
      deliveryAgentPhone?: string
      trackingNumber?: string
      trackingUrl?: string
      cancellationReason?: string
      isManualShipping?: boolean
    }) =>
      transitionOrderStatus(id!, payload.nextStatus, {
        ...payload,
        isManualShipping: true,
      }),
    onSuccess: () => {
      setShowConfirm(false)
      setShowCancelConfirm(false)
      setSuccessMsg('Order updated successfully!')
      setTimeout(() => setSuccessMsg(''), 4000)
      queryClient.invalidateQueries({ queryKey: ['order-detail', id] })
      queryClient.invalidateQueries({ queryKey: ['order-pipeline-counts'] })
      queryClient.invalidateQueries({ queryKey: ['orders-pipeline'] })
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to update order.')
      setTimeout(() => setError(''), 6000)
    },
  })

  function handleAdvance() {
    if (!nextAction) return
    transitionMut.mutate({
      nextStatus: nextAction.status,
      courierName: courierName.trim() || undefined,
      deliveryAgentName: courierName.trim() || agentName.trim() || undefined,
      deliveryAgentPhone: agentPhone.trim() || undefined,
      trackingNumber: trackingNumber.trim() || undefined,
      trackingUrl: trackingUrl.trim() || undefined,
      isManualShipping: true,
    })
  }

  function handleDirectTransition(targetStatus: string) {
    transitionMut.mutate({
      nextStatus: targetStatus,
      courierName: courierName.trim() || undefined,
      deliveryAgentName: courierName.trim() || agentName.trim() || undefined,
      deliveryAgentPhone: agentPhone.trim() || undefined,
      trackingNumber: trackingNumber.trim() || undefined,
      trackingUrl: trackingUrl.trim() || undefined,
      isManualShipping: true,
    })
  }

  function handleSaveShippingOnly() {
    transitionMut.mutate({
      nextStatus: currentStatus,
      courierName: courierName.trim() || undefined,
      deliveryAgentName: courierName.trim() || agentName.trim() || undefined,
      deliveryAgentPhone: agentPhone.trim() || undefined,
      trackingNumber: trackingNumber.trim() || undefined,
      trackingUrl: trackingUrl.trim() || undefined,
      isManualShipping: true,
    })
  }

  async function handleResendStatusEmail() {
    if (!id) return
    setResendingEmail(true)
    try {
      const res = await resendOrderStatusEmail(id)
      setSuccessMsg(res.message || 'Status notification email sent to customer!')
      setTimeout(() => setSuccessMsg(''), 5000)
    } catch (err: any) {
      setError(err.message || 'Failed to send status email.')
      setTimeout(() => setError(''), 6000)
    } finally {
      setResendingEmail(false)
    }
  }

  const paymentMut = useMutation({
    mutationFn: (payload: { paymentMethod?: string; paymentStatus?: string; transactionId?: string; notes?: string }) =>
      updateOrderPayment(id!, payload),
    onSuccess: () => {
      setSuccessMsg('Payment details updated successfully!')
      setTimeout(() => setSuccessMsg(''), 4000)
      queryClient.invalidateQueries({ queryKey: ['order-detail', id] })
      queryClient.invalidateQueries({ queryKey: ['order-pipeline-counts'] })
      queryClient.invalidateQueries({ queryKey: ['orders-pipeline'] })
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to update payment.')
      setTimeout(() => setError(''), 6000)
    },
  })

  function handleSavePayment(statusOverride?: string) {
    paymentMut.mutate({
      paymentMethod: paymentMethod.trim() || undefined,
      paymentStatus: statusOverride || orderPaymentStatus,
      transactionId: transactionId.trim() || undefined,
      notes: paymentNotes.trim() || undefined,
    })
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--gold)]" />
        <p className="text-sm font-semibold text-[var(--muted)]">Loading order details…</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--burgundy-soft)]">
          <ShoppingBag className="h-7 w-7 text-[var(--burgundy)]" />
        </div>
        <p className="text-sm font-semibold text-[var(--muted)]">Order not found.</p>
        <button type="button" onClick={() => navigate(`/orders/${backStage}`)}
          className="inline-flex items-center gap-2 rounded border border-[var(--line)] px-4 py-2 text-sm font-bold text-[var(--gold)] transition-colors hover:bg-[var(--burgundy-soft)]">
          <ArrowLeft className="h-4 w-4" /> Back to Orders
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => navigate(`/orders/${backStage}`)}
          className="inline-flex items-center gap-2 rounded border border-[var(--line)] px-3 py-2 text-sm font-semibold text-[var(--gold)] transition-colors hover:bg-[var(--burgundy-soft)]">
          <ArrowLeft className="h-4 w-4" /> Orders
        </button>
        <span className="text-[var(--muted)]">›</span>
        <span className="text-sm font-semibold text-[var(--text)]">
          {order.status === 'pending_payment' ? 'Abandoned Checkout' : String(order.orderNumber || `#${order.id}`)}
        </span>
      </div>

      {error ? (
        <div className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</div>
      ) : null}
      {successMsg ? (
        <div className="rounded border border-green-300 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 dark:bg-green-950/30 dark:text-green-300">{successMsg}</div>
      ) : null}

      <section className="admin-card rounded-lg p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[var(--burgundy)]">Order Details</p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-[var(--gold)] md:text-4xl">
              {order.status === 'pending_payment' ? 'Not assigned yet' : String(order.orderNumber || '')}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">Placed on {formatDate(order.createdAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <a
              href={`${apiBaseUrl}/admin/orders/${id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded border border-[var(--line)] px-3 py-1.5 text-xs font-bold text-[var(--muted)] transition-colors hover:bg-[var(--panel-strong)]"
              title="Download PDF"
            >
              <Download className="h-3.5 w-3.5" /> PDF
            </a>
            <span className="admin-badge text-sm px-3 py-1.5 font-bold">₹{Number(order.grandTotal || 0).toLocaleString('en-IN')}</span>
            <span className="admin-badge text-sm px-3 py-1.5 font-bold uppercase tracking-wider bg-[var(--panel-strong)] text-[var(--gold)] border border-[var(--line)]">
              {order.paymentMethod || (order.metadata as any)?.paymentMethod || 'COD'}
            </span>
            <span className={`admin-badge px-3 py-1.5 text-sm font-bold ${paymentStatus === 'paid' ? 'admin-badge-success' : 'admin-badge-warning'}`}>
              {displayValue(paymentStatus)}
            </span>
            <span className={`admin-badge px-3 py-1.5 text-sm font-bold ${currentStatus === 'delivered' ? 'admin-badge-success' : currentStatus === 'cancelled' ? 'admin-badge-muted' : 'admin-badge-info'}`}>
              {displayValue(currentStatus)}
            </span>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="admin-card rounded-lg p-5 lg:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--burgundy)]">Customer & Shipping</h2>
            <span className={`admin-badge ${customer ? 'admin-badge-success' : 'admin-badge-muted'}`}>
              {customer ? 'Customer' : 'Guest'}
            </span>
          </div>
          <div className="space-y-3">
            {customer ? (
              <>
                <div><p className="text-[11px] font-semibold text-[var(--muted)]">Name</p><p className="font-semibold text-[var(--text)]">{String(customer.name || '')}</p></div>
                <div><p className="text-[11px] font-semibold text-[var(--muted)]">Email</p><p className="text-sm text-[var(--text)]">{String(customer.email || order.customerEmail || '')}</p></div>
                <div><p className="text-[11px] font-semibold text-[var(--muted)]">Phone</p><p className="text-sm text-[var(--text)]">{String(customer.mobile || order.customerMobile || '')}</p></div>
              </>
            ) : (
              <div><p className="text-[11px] font-semibold text-[var(--muted)]">Email</p><p className="text-sm text-[var(--text)]">{String(order.customerEmail || 'Guest')}</p></div>
            )}
            {shippingAddress ? (
              <div className="mt-4 border-t border-[var(--line)] pt-3">
                <p className="text-[11px] font-semibold text-[var(--muted)]">Shipping Address</p>
                <p className="mt-1 text-sm text-[var(--text)]">
                  {[shippingAddress.firstName, shippingAddress.lastName].filter(Boolean).join(' ')}<br />
                  {String(shippingAddress.address || '')}<br />
                  {[shippingAddress.city, shippingAddress.state].filter(Boolean).join(', ')}
                  {shippingAddress.pincode ? ` — ${shippingAddress.pincode}` : ''}<br />
                  Phone: {String(shippingAddress.phone || '')}
                </p>
              </div>
            ) : null}
          </div>
        </section>

        <section className="admin-card rounded-lg p-5 lg:col-span-2">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-[var(--burgundy)]">Order Items ({items.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--line)] text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  <th className="pb-2 pr-2">#</th>
                  <th className="pb-2 pr-3">Product</th>
                  <th className="pb-2 pr-3">HSN/SAC</th>
                  <th className="pb-2 pr-3">Variant</th>
                  <th className="pb-2 pr-3 text-right">Qty</th>
                  <th className="pb-2 pr-3 text-right">Rate</th>
                  <th className="pb-2 pr-3 text-right">Taxable</th>
                  <th className="pb-2 pr-3 text-right">GST%</th>
                  <th className="pb-2 pr-3 text-right">GST Amt</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, idx: number) => {
                  const gstRate = Number(item.gstRate ?? item.taxRate ?? 5)
                  const hsnCode = String(item.hsnCode || item.hsn || '5804')
                  const qty = Number(item.quantity || 0)
                  const unitPrice = Number(item.unitPrice || 0)
                  const lineTotal = Number(item.total || 0)
                  const taxableValue = parseFloat((lineTotal * 100 / (100 + gstRate)).toFixed(2))
                  const gstAmount = parseFloat((lineTotal - taxableValue).toFixed(2))

                  return (
                    <tr key={idx} className="border-b border-[var(--line)] last:border-0">
                      <td className="py-3 pr-2 text-xs text-[var(--muted)]">{idx + 1}</td>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-10 w-9 shrink-0 items-center justify-center overflow-hidden rounded border border-[var(--line)] bg-[var(--panel-strong)]">
                            <img src={resolveImageUrl(item.imageUrl) || '/placeholder.png'} alt={String(item.name || '')}
                              className="h-full w-full object-contain"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          </div>
                          <div>
                            <p className="font-semibold text-[var(--text)]">{String(item.name || '')}</p>
                            {item.sku ? <p className="text-[11px] text-[var(--muted)]">SKU: {String(item.sku)}</p> : null}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-xs text-[var(--muted)]">{hsnCode}</td>
                      <td className="py-3 pr-3 text-xs text-[var(--muted)]">
                        {[String(item.variantLabel || ''), String(item.color || ''), String(item.size || '')].filter(Boolean).join(' / ') || '–'}
                      </td>
                      <td className="py-3 pr-3 text-right font-semibold">{qty}</td>
                      <td className="py-3 pr-3 text-right">₹{unitPrice.toLocaleString('en-IN')}</td>
                      <td className="py-3 pr-3 text-right text-[var(--muted)]">₹{taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 pr-3 text-right text-[var(--muted)]">{gstRate}%</td>
                      <td className="py-3 pr-3 text-right text-[var(--muted)]">₹{gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 text-right font-bold">₹{lineTotal.toLocaleString('en-IN')}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                {(() => {
                  const slabTotals: Record<number, { cgst: number; sgst: number; taxable: number }> = {}
                  let totalTaxable = 0
                  let totalGstAmt = 0

                  items.forEach((item: any) => {
                    const gstRate = Number(item.gstRate ?? item.taxRate ?? 5)
                    const lineTotal = Number(item.total || 0)
                    const taxableValue = parseFloat((lineTotal * 100 / (100 + gstRate)).toFixed(2))
                    const gstAmount = parseFloat((lineTotal - taxableValue).toFixed(2))

                    totalTaxable += taxableValue
                    totalGstAmt += gstAmount

                    if (!slabTotals[gstRate]) slabTotals[gstRate] = { cgst: 0, sgst: 0, taxable: 0 }
                    slabTotals[gstRate].cgst += gstAmount / 2
                    slabTotals[gstRate].sgst += gstAmount / 2
                    slabTotals[gstRate].taxable += taxableValue
                  })

                  const sortedSlabs = Object.keys(slabTotals).map(Number).sort((a, b) => a - b)

                  return (
                    <>
                      <tr className="border-t border-[var(--line)]">
                        <td colSpan={7} />
                        <td colSpan={2} className="pt-3 pr-4 text-right text-xs font-semibold text-[var(--muted)]">Subtotal (incl. GST)</td>
                        <td className="pt-3 text-right font-semibold">₹{Number(order.subtotal || 0).toLocaleString('en-IN')}</td>
                      </tr>

                      {totalGstAmt > 0 && (
                        <tr>
                          <td colSpan={7} />
                          <td colSpan={2} className="pr-4 text-right text-xs font-semibold text-[var(--muted)]">Taxable Value</td>
                          <td className="text-right font-semibold text-[var(--muted)]">₹{totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      )}

                      {sortedSlabs.map(slab => {
                        const t = slabTotals[slab]
                        const gstLineTotal = t.cgst + t.sgst
                        return (
                          <tr key={slab}>
                            <td colSpan={7} />
                            <td colSpan={2} className="pr-4 text-right text-xs font-semibold text-[var(--muted)]">GST ({slab}%)</td>
                            <td className="text-right font-semibold text-[var(--muted)]">₹{gstLineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        )
                      })}

                      {order && Number(order.discount || 0) > 0 ? (
                        <tr>
                          <td colSpan={7} />
                          <td colSpan={2} className="pr-4 text-right text-xs font-semibold text-[var(--muted)]">
                            Discount {order.couponCode ? `(${order.couponCode})` : ''}
                          </td>
                          <td className="text-right font-semibold text-red-500">-₹{Number(order.discount).toLocaleString('en-IN')}</td>
                        </tr>
                      ) : null}

                      <tr>
                        <td colSpan={7} />
                        <td colSpan={2} className="pr-4 text-right text-xs font-semibold text-[var(--muted)]">Shipping</td>
                        <td className="text-right font-semibold">{Number(order.shippingTotal || 0) === 0 ? 'Free' : `₹${Number(order.shippingTotal).toLocaleString('en-IN')}`}</td>
                      </tr>

                      <tr className="border-t border-[var(--line)]">
                        <td colSpan={7} />
                        <td colSpan={2} className="py-2 pr-4 text-right text-sm font-bold text-[var(--burgundy)]">Grand Total</td>
                        <td className="py-2 text-right text-sm font-bold text-[var(--burgundy)]">₹{Number(order.grandTotal || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    </>
                  )
                })()}
              </tfoot>
            </table>
          </div>
        </section>
      </div>

      {/* Recovery Email — Abandoned Checkouts Only */}
      {currentStatus === 'pending_payment' && (
        <section className="admin-card rounded-lg p-5">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--burgundy)]">Cart Recovery Email</h2>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-[var(--muted)]">
                Send a recovery email to remind the customer to complete their checkout.
              </p>
              {(() => {
                const meta = (order.metadata as Record<string, unknown>) || {}
                const count = Number(meta.recoveryEmailCount || 0)
                return count > 0 ? (
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Sent {count}/3 times{meta.recoveryEmailLastSent ? ` — last: ${formatDate(meta.recoveryEmailLastSent)}` : ''}
                  </p>
                ) : null
              })()}
            </div>
            <button
              type="button"
              onClick={async () => {
                setRecoverySending(true)
                try {
                  const res = await sendRecoveryEmail(id!)
                  setSuccessMsg(res.message || 'Recovery email sent!')
                  setTimeout(() => setSuccessMsg(''), 4000)
                  queryClient.invalidateQueries({ queryKey: ['order-detail', id] })
                } catch (e: any) {
                  setError(e.message || 'Failed to send recovery email')
                  setTimeout(() => setError(''), 6000)
                } finally {
                  setRecoverySending(false)
                }
              }}
              disabled={recoverySending || Number(((order.metadata as Record<string, unknown>) || {}).recoveryEmailCount || 0) >= 3}
              className="inline-flex items-center gap-1.5 rounded bg-[var(--gold)] px-4 py-2 text-xs font-bold text-white transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {recoverySending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
              {recoverySending ? 'Sending...' : 'Send Recovery Email'}
            </button>
          </div>
        </section>
      )}

      {/* Invoice */}
      {canManageInvoices && currentStatus !== 'pending_payment' && (
        <section className="admin-card rounded-lg p-5">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-[var(--burgundy)]">Invoice</h2>
          {invoiceLoading ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--gold)]" />
              <p className="text-sm text-[var(--muted)]">Loading invoice...</p>
            </div>
          ) : invoice ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--text)]">
                  {String(invoice.invoiceNumber || '')}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  Date: {String(invoice.invoiceDate || '')} &middot; Status:{' '}
                  <span className={`font-semibold ${invoice.status === 'paid' ? 'text-green-600' : invoice.status === 'cancelled' ? 'text-red-500' : 'text-amber-600'}`}>
                    {invoice.status === 'unpaid' ? 'PENDING' : String(invoice.status || '').toUpperCase()}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={async () => {
                  setInvoiceRegenerating(true)
                  try {
                    const res = await apiFetch<{ item: Record<string, unknown> }>(`/admin/orders/${id}/invoice/regenerate`, { method: 'PUT' })
                    setInvoice(res.item)
                  } catch (e: any) {
                    setError(e.message || 'Failed to regenerate invoice')
                    setTimeout(() => setError(''), 6000)
                  } finally {
                    setInvoiceRegenerating(false)
                  }
                }} disabled={invoiceRegenerating}
                  className="inline-flex items-center gap-1.5 rounded border border-[var(--line)] px-3 py-1.5 text-xs font-bold text-[var(--muted)] transition-colors hover:bg-[var(--panel-strong)] disabled:opacity-50"
                >
                  {invoiceRegenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={() => downloadBlob(`/admin/orders/${id}/invoice/pdf`, `${invoice?.invoiceNumber || `invoice-${id}`}.pdf`).catch(() => {})}
                  className="inline-flex items-center gap-1.5 rounded border border-[var(--line)] px-3 py-1.5 text-xs font-bold text-[var(--gold)] transition-colors hover:bg-[var(--burgundy-soft)]"
                >
                  <Download className="h-3.5 w-3.5" /> Download Invoice
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-[var(--muted)]">No invoice generated yet.</p>
              <button
                type="button"
                onClick={handleGenerateInvoice}
                disabled={invoiceGenerating}
                className="inline-flex items-center gap-1.5 rounded bg-[var(--gold)] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:opacity-90 disabled:opacity-50"
              >
                {invoiceGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                {invoiceGenerating ? 'Generating...' : 'Generate Invoice'}
              </button>
            </div>
          )}
        </section>
      )}

      {/* Payment Information */}
      <section className="admin-card rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-[var(--gold)]" />
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--burgundy)]">
              Payment Information
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className={`admin-badge text-xs px-2.5 py-1 font-bold ${orderPaymentStatus === 'paid' ? 'admin-badge-success' : 'admin-badge-warning'}`}>
              Status: {orderPaymentStatus.toUpperCase()}
            </span>
            <span className="admin-badge text-xs px-2.5 py-1 font-bold uppercase tracking-wider bg-[var(--panel-strong)] text-[var(--gold)] border border-[var(--line)]">
              Method: {paymentMethod === 'cod' ? 'ONLINE (PAID)' : paymentMethod.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 bg-[#FCFBF9] p-4 rounded-lg border border-[var(--line)]">
          <div>
            <span className="block text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Payment Mode</span>
            <p className="mt-1 text-sm font-semibold text-[var(--text)]">Razorpay Online Payment</p>
          </div>
          <div>
            <span className="block text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Payment Status</span>
            <p className="mt-1 text-sm font-semibold text-[var(--text)] flex items-center gap-1.5">
              {orderPaymentStatus === 'paid' ? (
                <span className="text-emerald-700 flex items-center gap-1"><Check className="h-4 w-4" /> Paid & Verified</span>
              ) : (
                <span className="text-amber-700 flex items-center gap-1"><Clock className="h-4 w-4" /> Pending</span>
              )}
            </p>
          </div>
          <div>
            <span className="block text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Transaction / Payment ID</span>
            <p className="mt-1 text-sm font-mono font-medium text-[var(--text)] truncate">
              {transactionId || (order?.metadata as any)?.razorpayPaymentId || '—'}
            </p>
          </div>
          <div>
            <span className="block text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Grand Total</span>
            <p className="mt-1 text-sm font-bold text-[var(--burgundy)]">
              ₹{Number(order.grandTotal || 0).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </section>

      {/* Delivery & Manual Shipping Desk */}
      {currentStatus !== 'pending_payment' && (
        <section className="admin-card rounded-lg p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--burgundy)]">
              Manual Shipping & Tracking
            </h2>
            <span className="text-xs text-[var(--muted)]">
              Update courier and AWB details directly
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                placeholder="e.g. D12345678"
                className="admin-input w-full rounded px-3 py-2 text-sm font-mono"
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
                placeholder="https://track.dtdc.com/..."
                className="admin-input w-full rounded px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                Agent / Driver Contact (optional)
              </label>
              <input
                type="text"
                value={agentPhone}
                onChange={e => setAgentPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="admin-input w-full rounded px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-3">
            <div className="flex flex-wrap gap-4 text-xs text-[var(--muted)]">
              {order.dispatchedAt ? (
                <span>Dispatched: <strong>{formatDate(order.dispatchedAt)}</strong></span>
              ) : null}
              {order.deliveredAt ? (
                <span>Delivered: <strong>{formatDate(order.deliveredAt)}</strong></span>
              ) : null}
            </div>

            <button
              type="button"
              onClick={handleSaveShippingOnly}
              disabled={transitionMut.isPending}
              className="inline-flex items-center gap-2 rounded border border-[var(--line)] bg-[var(--panel)] px-4 py-2 text-xs font-bold text-[var(--gold)] transition-colors hover:bg-[var(--burgundy-soft)] disabled:opacity-50"
            >
              {transitionMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />}
              Save Tracking Info
            </button>
          </div>
        </section>
      )}

      {currentStatus !== 'pending_payment' && (
        <section className="admin-card rounded-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--burgundy)]">Status Timeline</h2>
            <span className="text-xs text-[var(--muted)]">
              Follows sequential fulfillment lifecycle (Click highlighted stage to advance)
            </span>
          </div>
          
          {/* Horizontal timeline for large screens */}
          <div className="hidden lg:flex items-start justify-between relative px-4 py-4">
            <div className="absolute top-[18px] left-[6%] right-[6%] h-[3px] bg-stone-200 -z-10" />
            
            {pipelineStages.map((stage, idx) => {
              const stageIdx = pipelineStages.findIndex(s => s.key === currentStatus)
              const isPast = stageIdx !== -1 && idx < stageIdx
              const isCurrent = stage.key === currentStatus
              const allowedNext = validTransitionsMap[currentStatus] || []
              const isAllowed = allowedNext.includes(stage.key)
              
              return (
                <div key={stage.key} className="flex flex-col items-center flex-1 relative group">
                  {idx > 0 && isPast && (
                    <div className="absolute top-[18px] right-[50%] left-[-50%] h-[3px] bg-green-500 -z-10" />
                  )}
                  {idx > 0 && isCurrent && (
                    <div className="absolute top-[18px] right-[50%] left-[-50%] h-[3px] bg-green-500 -z-10" />
                  )}
                  
                  <button
                    type="button"
                    disabled={!isAllowed && !isCurrent}
                    onClick={() => {
                      if (isAllowed) {
                        handleDirectTransition(stage.key)
                      }
                    }}
                    title={
                      isCurrent
                        ? `Current Status: ${stage.label}`
                        : isAllowed
                          ? `Click to advance order to ${stage.label}`
                          : `Stage locked: Complete prior steps first`
                    }
                    className={`w-9 h-9 rounded-full flex items-center justify-center z-10 transition-all duration-300 ${
                      isCurrent
                        ? 'bg-[var(--burgundy)] text-white ring-4 ring-[var(--burgundy-soft)] scale-110 shadow-md cursor-default'
                        : isPast
                          ? 'bg-green-600 text-white shadow-sm'
                          : isAllowed
                            ? 'bg-white text-[var(--burgundy)] border-2 border-[var(--burgundy)] hover:bg-[var(--burgundy-soft)] shadow-md cursor-pointer hover:scale-105 animate-pulse'
                            : 'bg-stone-100 text-stone-300 border border-stone-200 cursor-not-allowed opacity-60'
                    }`}
                  >
                    {isPast ? <Check className="h-4 w-4 stroke-[2.5]" /> : <stage.Icon className="h-4.5 w-4.5" />}
                  </button>
                  
                  <div className="mt-3 text-center">
                    <p className={`text-xs transition-colors ${
                      isCurrent
                        ? 'text-[var(--burgundy)] font-extrabold'
                        : isPast
                          ? 'text-green-700 font-bold'
                          : isAllowed
                            ? 'text-[var(--burgundy)] font-bold'
                            : 'text-stone-400 font-medium'
                    }`}>
                      {stage.label}
                    </p>
                    {isCurrent && (
                      <span className="inline-block mt-0.5 rounded bg-[var(--burgundy)] px-1.5 py-0.2 text-[9px] font-bold text-white uppercase tracking-wider">
                        Current
                      </span>
                    )}
                    {isAllowed && !isCurrent && (
                      <span className="inline-block mt-0.5 rounded bg-amber-100 px-1.5 py-0.2 text-[9px] font-bold text-amber-800 uppercase tracking-wider">
                        Next
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Vertical timeline for mobile screens */}
          <div className="lg:hidden flex flex-col gap-5 pl-4 py-2 relative">
            <div className="absolute left-[18px] top-4 bottom-4 w-[3px] bg-stone-200" />
            
            {pipelineStages.map((stage, idx) => {
              const stageIdx = pipelineStages.findIndex(s => s.key === currentStatus)
              const isPast = stageIdx !== -1 && idx < stageIdx
              const isCurrent = stage.key === currentStatus
              const allowedNext = validTransitionsMap[currentStatus] || []
              const isAllowed = allowedNext.includes(stage.key)
              
              return (
                <div key={stage.key} className="flex items-center gap-4 relative">
                  {idx > 0 && isPast && (
                    <div className="absolute left-[18px] top-[-20px] h-[20px] w-[3px] bg-green-500" />
                  )}
                  {idx > 0 && isCurrent && (
                    <div className="absolute left-[18px] top-[-20px] h-[20px] w-[3px] bg-green-500" />
                  )}
                  
                  <button
                    type="button"
                    disabled={!isAllowed && !isCurrent}
                    onClick={() => {
                      if (isAllowed) {
                        handleDirectTransition(stage.key)
                      }
                    }}
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 z-10 transition-all duration-300 ${
                      isCurrent
                        ? 'bg-[var(--burgundy)] text-white ring-4 ring-[var(--burgundy-soft)] scale-105 shadow'
                        : isPast
                          ? 'bg-green-600 text-white'
                          : isAllowed
                            ? 'bg-white text-[var(--burgundy)] border-2 border-[var(--burgundy)] shadow'
                            : 'bg-stone-100 text-stone-300 border border-stone-200 opacity-60'
                    }`}
                  >
                    {isPast ? <Check className="h-4 w-4 stroke-[2.5]" /> : <stage.Icon className="h-4.5 w-4.5" />}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${
                      isCurrent
                        ? 'text-[var(--burgundy)] font-bold'
                        : isPast
                          ? 'text-green-700 font-semibold'
                          : isAllowed
                            ? 'text-[var(--burgundy)] font-semibold'
                            : 'text-stone-400'
                    }`}>
                      {stage.label}
                      {isCurrent && <span className="ml-2 text-xs font-bold text-[var(--burgundy)]">(Current)</span>}
                      {isAllowed && !isCurrent && <span className="ml-2 text-xs font-bold text-amber-600">(Next Action)</span>}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Order Actions & Status Controls */}
      <section className="admin-card rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--burgundy)]">Order Status Controls</h2>
          <span className="text-xs text-[var(--muted)]">
            Sequential fulfillment: Pending → Confirmed → Packing → Dispatched → Delivered
          </span>
        </div>

        {/* Informational Guidance Banners */}
        {currentStatus === 'pending' && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
            <Clock className="h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <strong>Order Awaiting Confirmation:</strong> Verify items and customer address, then click <strong>Confirm Order</strong> below to approve for packing.
            </div>
          </div>
        )}

        {currentStatus === 'confirmed' && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3.5 text-xs text-blue-900">
            <ClipboardCheck className="h-4 w-4 shrink-0 text-blue-600" />
            <div>
              <strong>Order Confirmed:</strong> Order is approved. When warehouse begins inventory packing, click <strong>Move to Packing</strong>.
            </div>
          </div>
        )}

        {currentStatus === 'packing' && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-purple-200 bg-purple-50 p-3.5 text-xs text-purple-900">
            <Package className="h-4 w-4 shrink-0 text-purple-600" />
            <div>
              <strong>Order in Packing:</strong> Enter Courier Partner and AWB tracking details above, then click <strong>Dispatch Order</strong>.
            </div>
          </div>
        )}

        {currentStatus === 'dispatched' && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3.5 text-xs text-indigo-900">
            <Truck className="h-4 w-4 shrink-0 text-indigo-600" />
            <div>
              <strong>Order Dispatched:</strong> Parcel is in transit with courier. Advance to <strong>Out for Delivery</strong> or <strong>Mark as Delivered</strong> once received.
            </div>
          </div>
        )}

        {currentStatus === 'out_for_delivery' && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
            <Navigation className="h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <strong>Out for Delivery:</strong> Courier is attempting delivery. Mark <strong>Delivered</strong> upon handover, or <strong>RTO</strong> if delivery fails.
            </div>
          </div>
        )}

        {currentStatus === 'delivered' && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3.5 text-xs text-green-900">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
            <div>
              <strong>Delivered:</strong> Customer has successfully received this order.
            </div>
          </div>
        )}

        {currentStatus === 'rto' && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 p-3.5 text-xs text-orange-900">
            <RotateCcw className="h-4 w-4 shrink-0 text-orange-600" />
            <div>
              <strong>Return to Origin (RTO):</strong> Delivery could not be completed and the parcel is being returned.
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {/* Primary Forward Action */}
          {nextAction && currentStatus !== 'cancelled' && currentStatus !== 'delivered' && (
            <button
              type="button"
              onClick={handleAdvance}
              disabled={transitionMut.isPending}
              className="inline-flex items-center gap-2 rounded bg-[var(--burgundy)] px-6 py-2.5 text-sm font-bold uppercase tracking-[0.12em] text-white transition-all hover:bg-[var(--burgundy-dark)] shadow-sm hover:shadow disabled:opacity-50 cursor-pointer"
            >
              {transitionMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {nextAction.label}
            </button>
          )}

          {/* Contextual Alternative Actions */}
          {currentStatus === 'dispatched' && (
            <>
              <button
                type="button"
                onClick={() => handleDirectTransition('delivered')}
                disabled={transitionMut.isPending}
                className="inline-flex items-center gap-1.5 rounded border border-green-300 bg-green-50 px-4 py-2 text-xs font-bold text-green-800 transition hover:bg-green-100 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" /> Mark Delivered
              </button>
              <button
                type="button"
                onClick={() => handleDirectTransition('rto')}
                disabled={transitionMut.isPending}
                className="inline-flex items-center gap-1.5 rounded border border-orange-300 bg-orange-50 px-4 py-2 text-xs font-bold text-orange-800 transition hover:bg-orange-100 disabled:opacity-50 cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" /> Mark RTO
              </button>
              <button
                type="button"
                onClick={() => handleDirectTransition('packing')}
                disabled={transitionMut.isPending}
                className="inline-flex items-center gap-1.5 rounded border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs font-bold text-stone-700 transition hover:bg-stone-100 disabled:opacity-50 cursor-pointer"
              >
                Back to Packing
              </button>
            </>
          )}

          {currentStatus === 'out_for_delivery' && (
            <>
              <button
                type="button"
                onClick={() => handleDirectTransition('rto')}
                disabled={transitionMut.isPending}
                className="inline-flex items-center gap-1.5 rounded border border-orange-300 bg-orange-50 px-4 py-2 text-xs font-bold text-orange-800 transition hover:bg-orange-100 disabled:opacity-50 cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" /> Mark RTO
              </button>
              <button
                type="button"
                onClick={() => handleDirectTransition('dispatched')}
                disabled={transitionMut.isPending}
                className="inline-flex items-center gap-1.5 rounded border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs font-bold text-stone-700 transition hover:bg-stone-100 disabled:opacity-50 cursor-pointer"
              >
                Back to Dispatched
              </button>
            </>
          )}

          {currentStatus === 'confirmed' && (
            <button
              type="button"
              onClick={() => handleDirectTransition('pending')}
              disabled={transitionMut.isPending}
              className="inline-flex items-center gap-1.5 rounded border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs font-bold text-stone-700 transition hover:bg-stone-100 disabled:opacity-50 cursor-pointer"
            >
              Back to Pending
            </button>
          )}

          {currentStatus === 'packing' && (
            <button
              type="button"
              onClick={() => handleDirectTransition('confirmed')}
              disabled={transitionMut.isPending}
              className="inline-flex items-center gap-1.5 rounded border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs font-bold text-stone-700 transition hover:bg-stone-100 disabled:opacity-50 cursor-pointer"
            >
              Back to Confirmed
            </button>
          )}

          {currentStatus === 'rto' && (
            <>
              <button
                type="button"
                onClick={() => handleDirectTransition('returned')}
                disabled={transitionMut.isPending}
                className="inline-flex items-center gap-1.5 rounded border border-stone-400 bg-stone-100 px-4 py-2 text-xs font-bold text-stone-800 transition hover:bg-stone-200 disabled:opacity-50 cursor-pointer"
              >
                <PackageX className="h-4 w-4" /> Mark Received at Warehouse (Returned)
              </button>
              <button
                type="button"
                onClick={() => handleDirectTransition('dispatched')}
                disabled={transitionMut.isPending}
                className="inline-flex items-center gap-1.5 rounded border border-purple-300 bg-purple-50 px-4 py-2 text-xs font-bold text-purple-800 transition hover:bg-purple-100 disabled:opacity-50 cursor-pointer"
              >
                <Truck className="h-4 w-4" /> Re-attempt Dispatch
              </button>
            </>
          )}

          {currentStatus === 'delivered' && (
            <button
              type="button"
              onClick={() => handleDirectTransition('returned')}
              disabled={transitionMut.isPending}
              className="inline-flex items-center gap-1.5 rounded border border-stone-400 bg-stone-50 px-4 py-2 text-xs font-bold text-stone-700 transition hover:bg-stone-100 disabled:opacity-50 cursor-pointer"
            >
              <PackageX className="h-4 w-4" /> Process Return
            </button>
          )}

          {/* Cancel Button */}
          {currentStatus !== 'cancelled' && currentStatus !== 'delivered' && currentStatus !== 'returned' ? (
            <button
              type="button"
              onClick={() => setShowCancelConfirm(true)}
              disabled={transitionMut.isPending}
              className="inline-flex items-center gap-1.5 rounded border border-red-300 px-4 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50 cursor-pointer ml-auto"
            >
              <XCircle className="h-4 w-4" /> Cancel Order
            </button>
          ) : null}

          {currentStatus === 'cancelled' && (
            <button
              type="button"
              onClick={() => handleDirectTransition('pending')}
              disabled={transitionMut.isPending}
              className="inline-flex items-center gap-1.5 rounded border border-stone-400 bg-stone-100 px-4 py-2 text-xs font-bold text-stone-800 transition hover:bg-stone-200 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCcw className="h-4 w-4" /> Re-open Order (Set to Pending)
            </button>
          )}
        </div>

        {/* Customer Email Notification Status Strip */}
        <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-stone-200 pt-4 bg-[#fffdfa] -mx-5 -mb-5 px-5 py-3 rounded-b-lg border-b">
          <div className="flex items-center gap-2.5 text-xs text-stone-700">
            <Mail className="h-4 w-4 text-[var(--burgundy)] shrink-0" />
            <div>
              <span className="font-semibold text-stone-900">Email Updates: </span>
              {(() => {
                const targetEmail = (
                  ((customer as any)?.email as string)
                  || (order?.customerEmail as string)
                  || ((order?.shippingAddress as any)?.email as string)
                  || ((order?.metadata as any)?.customerEmail as string)
                  || ''
                ).trim()

                return targetEmail ? (
                  <span>Auto-notifications dispatched to <strong className="text-[var(--burgundy)] font-mono">{targetEmail}</strong> on status change.</span>
                ) : (
                  <span className="text-amber-700 font-semibold">No customer email registered on this order.</span>
                )
              })()}
            </div>
          </div>

          <button
            type="button"
            onClick={handleResendStatusEmail}
            disabled={resendingEmail}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-bold text-stone-800 shadow-2xs hover:border-[var(--burgundy)] hover:text-[var(--burgundy)] transition disabled:opacity-50 cursor-pointer shrink-0"
          >
            {resendingEmail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
            {resendingEmail ? 'Sending...' : 'Resend Status Email'}
          </button>
        </div>
      </section>

      {currentStatus === 'cancelled' ? (
        <section className="admin-card rounded-lg p-5">
          <div className="flex items-center gap-3 rounded border border-red-200 bg-red-50 px-4 py-3 dark:bg-red-950/20">
            <span className="text-lg text-red-600"><XCircle className="h-5 w-5" /></span>
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">This order has been cancelled.</p>
          </div>
        </section>
      ) : null}

      {showCancelConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-[var(--burgundy)]">Cancel Order</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Are you sure you want to cancel order <strong>{String(order.orderNumber || '')}</strong>?
                </p>
                <div className="mt-3">
                  <label className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Reason (optional)</label>
                  <textarea
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    placeholder="Why is this order being cancelled?"
                    rows={3}
                    className="admin-input w-full rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => { setShowCancelConfirm(false); setCancelReason('') }} disabled={transitionMut.isPending}
                className="rounded border border-[var(--line)] px-4 py-2 text-sm font-bold text-[var(--burgundy)] hover:bg-[var(--gold-soft)] disabled:opacity-50">No</button>
              <button type="button" onClick={() => transitionMut.mutate({ nextStatus: 'cancelled', cancellationReason: cancelReason.trim() || undefined })} disabled={transitionMut.isPending}
                className="flex items-center gap-2 rounded bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
                {transitionMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {transitionMut.isPending ? 'Cancelling…' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}


