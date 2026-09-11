import { useCallback, useEffect, useState } from 'react'
import {
  ArrowDownCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  MailWarning,
  TrendingDown,
  X,
  XCircle,
} from 'lucide-react'
import { apiFetch } from '../services/api'

/* ─── Types ──────────────────────────────────────────────── */

interface PriceDropEvent {
  id: number
  productId: number
  productName: string
  oldPrice: number
  newPrice: number
  discountPercent: number
  emailsSent: number
  emailsFailed: number
  status: 'pending' | 'processing' | 'done' | 'failed'
  createdAt: string
}

interface EmailLog {
  id: number
  customerId: number
  email: string
  status: 'pending' | 'sent' | 'failed'
  errorMessage: string | null
  sentAt: string | null
  createdAt: string
}

interface Stats {
  totalEvents: number
  totalEmailsSent: number
  totalEmailsFailed: number
  successRate: number
}

/* ─── Status Badge ───────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    done: { bg: 'bg-green-50', text: 'text-green-700', label: 'Done' },
    pending: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pending' },
    processing: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Processing' },
    failed: { bg: 'bg-red-50', text: 'text-red-700', label: 'Failed' },
    sent: { bg: 'bg-green-50', text: 'text-green-700', label: 'Sent' },
  }
  const s = map[status] || { bg: 'bg-gray-50', text: 'text-gray-600', label: status }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  )
}

/* ─── Stat Card ──────────────────────────────────────────── */

function StatCard({ icon: Icon, label, value, color }: {
  icon: typeof TrendingDown
  label: string
  value: string | number
  color: string
}) {
  return (
    <article className="admin-card rounded-lg p-5">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-[13px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 font-display text-3xl font-bold text-[var(--text)]">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </article>
  )
}

/* ─── Email Detail Modal ─────────────────────────────────── */

function EmailDetailModal({ eventId, onClose }: { eventId: number; onClose: () => void }) {
  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState<(PriceDropEvent & { emailLogs: EmailLog[] }) | null>(null)

  useEffect(() => {
    setLoading(true)
    apiFetch<{ event: PriceDropEvent & { emailLogs: EmailLog[] } }>(`/admin/price-drops/${eventId}`)
      .then(data => setEvent(data.event))
      .catch(() => setEvent(null))
      .finally(() => setLoading(false))
  }, [eventId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="admin-card relative w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--burgundy)]">Email Logs</p>
            <h3 className="mt-1 text-lg font-bold text-[var(--text)]">
              {event?.productName || 'Loading...'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--muted)] transition-colors hover:bg-[var(--line)] hover:text-[var(--text)]"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--gold)]" />
            </div>
          ) : !event ? (
            <p className="py-12 text-center text-[var(--muted)]">Event not found.</p>
          ) : event.emailLogs.length === 0 ? (
            <p className="py-12 text-center text-[var(--muted)]">No email logs found.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--line)]">
                  <th className="pb-3 pr-4 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Email</th>
                  <th className="pb-3 pr-4 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Status</th>
                  <th className="pb-3 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Sent At</th>
                </tr>
              </thead>
              <tbody>
                {event.emailLogs.map(log => (
                  <tr key={log.id} className="border-b border-[var(--line)]/50 last:border-0">
                    <td className="py-3 pr-4">
                      <span className="text-[13px] font-medium text-[var(--text)]">{log.email}</span>
                      {log.errorMessage && (
                        <p className="mt-0.5 text-[11px] text-red-500">{log.errorMessage}</p>
                      )}
                    </td>
                    <td className="py-3 pr-4"><StatusBadge status={log.status} /></td>
                    <td className="py-3 text-[13px] text-[var(--muted)]">
                      {log.sentAt ? new Date(log.sentAt).toLocaleString('en-IN') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────────────── */

export default function PriceDropReportsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [events, setEvents] = useState<PriceDropEvent[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [detailEventId, setDetailEventId] = useState<number | null>(null)

  const fetchData = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const [statsRes, eventsRes] = await Promise.all([
        apiFetch<Stats>('/admin/price-drops/stats'),
        apiFetch<{ events: PriceDropEvent[]; total: number; page: number; pages: number }>(`/admin/price-drops?page=${p}&limit=15`),
      ])
      setStats(statsRes)
      setEvents(eventsRes.events)
      setTotal(eventsRes.total)
      setPage(eventsRes.page)
      setPages(eventsRes.pages)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(page)
  }, [fetchData, page])

  return (
    <div className="space-y-8">
      {/* ── Page Header ───────────────────────────────────── */}
      <section className="admin-card overflow-hidden rounded-lg p-6 md:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[var(--burgundy)]">
          Marketing
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-[var(--gold)] sm:text-4xl">
          Price Drop Reports
        </h1>
        <p className="mt-2.5 max-w-xl text-[16px] leading-relaxed text-[var(--muted)]">
          Track email notifications sent to customers when product prices are reduced.
        </p>
      </section>

      {/* ── Stats Grid ────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-[14px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
          Overview
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <article key={i} className="admin-card animate-pulse rounded-lg p-5">
                <div className="mb-3 h-10 w-10 rounded-lg bg-[var(--line)]" />
                <div className="mb-2 h-4 w-20 rounded bg-[var(--line)]" />
                <div className="h-9 w-14 rounded bg-[var(--line)]" />
              </article>
            ))
          ) : stats ? (
            <>
              <StatCard
                icon={TrendingDown}
                label="Price Drops"
                value={stats.totalEvents}
                color="bg-[var(--burgundy-soft)] text-[var(--burgundy)]"
              />
              <StatCard
                icon={Mail}
                label="Emails Sent"
                value={stats.totalEmailsSent}
                color="bg-green-50 text-green-700"
              />
              <StatCard
                icon={MailWarning}
                label="Failed"
                value={stats.totalEmailsFailed}
                color="bg-red-50 text-red-700"
              />
              <StatCard
                icon={CheckCircle}
                label="Success Rate"
                value={`${stats.successRate}%`}
                color="bg-blue-50 text-blue-700"
              />
            </>
          ) : null}
        </div>
      </section>

      {/* ── Events Table ──────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[14px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
            Recent Events ({total})
          </h2>
        </div>

        <div className="admin-card overflow-hidden rounded-lg">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--gold)]" />
              <span className="ml-2 text-sm text-[var(--muted)]">Loading events…</span>
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ArrowDownCircle className="mb-3 h-12 w-12 text-[var(--line)]" />
              <p className="text-lg font-semibold text-[var(--text)]">No price drops yet</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                When you reduce a product&apos;s price, email notifications will appear here.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--line)] bg-[var(--panel-strong)]">
                      <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Product</th>
                      <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Old Price</th>
                      <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">New Price</th>
                      <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Discount</th>
                      <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Sent</th>
                      <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Failed</th>
                      <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Status</th>
                      <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map(evt => (
                      <tr
                        key={evt.id}
                        onClick={() => setDetailEventId(evt.id)}
                        className="cursor-pointer border-b border-[var(--line)]/50 transition-colors hover:bg-[var(--panel-strong)] last:border-0"
                      >
                        <td className="whitespace-nowrap px-5 py-3.5">
                          <span className="text-[13px] font-semibold text-[var(--text)]">{evt.productName}</span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-[13px] text-[var(--muted)] line-through">
                          ₹{Number(evt.oldPrice).toLocaleString('en-IN')}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-[13px] font-bold text-green-700">
                          ₹{Number(evt.newPrice).toLocaleString('en-IN')}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5">
                          <span className="inline-flex items-center rounded-full bg-[var(--burgundy-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--burgundy)]">
                            {Number(evt.discountPercent)}% OFF
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5">
                          <span className="inline-flex items-center gap-1 text-[13px] font-medium text-green-700">
                            <CheckCircle className="h-3.5 w-3.5" />
                            {evt.emailsSent}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5">
                          <span className="inline-flex items-center gap-1 text-[13px] font-medium text-red-600">
                            <XCircle className="h-3.5 w-3.5" />
                            {evt.emailsFailed}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5">
                          <StatusBadge status={evt.status} />
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-[12px] text-[var(--muted)]">
                          {new Date(evt.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pages > 1 && (
                <div className="flex items-center justify-between border-t border-[var(--line)] px-5 py-3">
                  <span className="text-[12px] text-[var(--muted)]">
                    Page {page} of {pages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-[12px] font-semibold text-[var(--muted)] transition-colors hover:bg-[var(--panel-strong)] disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={page >= pages}
                      onClick={() => setPage(p => Math.min(pages, p + 1))}
                      className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-[12px] font-semibold text-[var(--muted)] transition-colors hover:bg-[var(--panel-strong)] disabled:opacity-40"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── Detail Modal ──────────────────────────────────── */}
      {detailEventId !== null && (
        <EmailDetailModal eventId={detailEventId} onClose={() => setDetailEventId(null)} />
      )}
    </div>
  )
}
