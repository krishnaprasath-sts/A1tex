import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Package, CheckCircle2, Clock, User, Calendar, ExternalLink, Loader2, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getMyAssignments, markOrderPacked } from '../services/api'

export default function MyOrdersPage() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['my-assignments'],
    queryFn: getMyAssignments,
  })

  const packMut = useMutation({
    mutationFn: (orderId: number | string) => markOrderPacked(orderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-assignments'] })
      qc.invalidateQueries({ queryKey: ['order-pipeline-counts'] })
    },
  })

  const orders = data?.orders ?? []
  const pendingPackOrders = orders.filter(o => ['confirmed', 'packing', 'pending'].includes(String(o.status)))
  const packedOrders = orders.filter(o => !['confirmed', 'packing', 'pending'].includes(String(o.status)))

  return (
    <div className="min-h-screen bg-[var(--bg)] p-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--charcoal)]">My Assigned Orders</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Orders assigned to you for packing and preparation. Mark orders as packed when ready for dispatch.
          </p>
        </div>

        {/* Stats row */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Total Assigned</div>
            <div className="mt-1 text-2xl font-bold text-[var(--charcoal)]">{orders.length}</div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-amber-700">Needs Packing</div>
            <div className="mt-1 text-2xl font-bold text-amber-900">{pendingPackOrders.length}</div>
          </div>
          <div className="col-span-2 sm:col-span-1 rounded-xl border border-green-200 bg-green-50/50 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-green-700">Packed / Processed</div>
            <div className="mt-1 text-2xl font-bold text-green-900">{packedOrders.length}</div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--muted)]" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--panel)] py-16 text-center shadow-sm">
            <Package className="h-12 w-12 text-[var(--muted)]" />
            <h3 className="text-base font-semibold text-[var(--charcoal)]">No Orders Assigned Yet</h3>
            <p className="max-w-xs text-xs text-[var(--muted)]">
              When a manager or admin assigns orders to you, they will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Orders Needing Action */}
            {pendingPackOrders.length > 0 && (
              <div>
                <h2 className="mb-3 text-base font-bold text-[var(--charcoal)] flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" /> Ready to Pack ({pendingPackOrders.length})
                </h2>
                <div className="space-y-3">
                  {pendingPackOrders.map(order => (
                    <OrderPackCard key={String(order.id)} order={order} onPack={id => packMut.mutate(id)} isPacking={packMut.isPending} />
                  ))}
                </div>
              </div>
            )}

            {/* Completed/Packed Orders */}
            {packedOrders.length > 0 && (
              <div>
                <h2 className="mb-3 text-base font-bold text-[var(--charcoal)] flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" /> Completed Orders ({packedOrders.length})
                </h2>
                <div className="space-y-3">
                  {packedOrders.map(order => (
                    <OrderPackCard key={String(order.id)} order={order} onPack={id => packMut.mutate(id)} isPacking={packMut.isPending} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function OrderPackCard({ order, onPack, isPacking }: { order: Record<string, unknown>; onPack: (id: number | string) => void; isPacking: boolean }) {
  const items = (order.items as Array<Record<string, unknown>>) || []
  const canPack = ['confirmed', 'packing'].includes(String(order.status))
  const isPacked = ['packed', 'dispatched', 'out_for_delivery', 'delivered'].includes(String(order.status))

  const shippingAddr = (order.shippingAddress as Record<string, unknown>) || {}
  const customerName = String(shippingAddr.fullName || order.customerEmail || 'Customer')

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-sm transition hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-base font-bold text-[var(--charcoal)]">
              #{String(order.orderNumber || order.id)}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
              isPacked ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {String(order.status).replace(/_/g, ' ')}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" /> {customerName}
            </span>
            {Boolean(order.assignedAt) && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Assigned {new Date(String(order.assignedAt)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            )}
            <span className="font-semibold text-[var(--charcoal)]">
              ₹{Number(order.grandTotal || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/orders/${String(order.id)}`}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-[var(--charcoal)] hover:bg-gray-50"
          >
            Details <ExternalLink className="h-3.5 w-3.5" />
          </Link>

          {canPack && (
            <button
              onClick={() => onPack(String(order.id))}
              disabled={isPacking}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--burgundy)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--burgundy-dark)] disabled:opacity-70"
            >
              {isPacking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Mark as Packed
            </button>
          )}
        </div>
      </div>

      {/* Items list */}
      {items.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-3">
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Items to pack:</div>
          <div className="flex flex-wrap gap-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 rounded-lg bg-[var(--bg)] px-3 py-1.5 text-xs text-[var(--charcoal)] border border-gray-100">
                <span className="font-semibold">{String(item.name || 'Item')}</span>
                <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold text-gray-700">×{String(item.quantity || 1)}</span>
                {Boolean(item.size) && <span className="text-[10px] text-gray-500">Size: {String(item.size)}</span>}
                {Boolean(item.color) && <span className="text-[10px] text-gray-500">Color: {String(item.color)}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
