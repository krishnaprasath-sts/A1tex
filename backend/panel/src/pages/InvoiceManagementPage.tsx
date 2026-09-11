import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Download, FileText, Loader2, Mail, RefreshCcw, Search } from 'lucide-react'
import { apiBaseUrl, apiFetch, downloadBlob } from '../services/api'

const ITEMS_PER_PAGE = 20

const statusTabs = [
  { key: '', label: 'All' },
  { key: 'paid', label: 'Paid' },
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'cancelled', label: 'Cancelled' },
] as const

const statusColors: Record<string, string> = {
  paid: 'text-green-600',
  unpaid: 'text-amber-600',
  cancelled: 'text-red-500',
}

export default function InvoiceManagementPage() {
  const queryClient = useQueryClient()
  const [currentPage, setCurrentPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [exportingExcel, setExportingExcel] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState<number | null>(null)

  async function handleExportExcel() {
    setExportingExcel(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      await downloadBlob(`/admin/invoices/export/excel?${params.toString()}`, `invoices-${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch (err: any) {
      setSuccessMsg(err.message || 'Export failed')
      setTimeout(() => setSuccessMsg(''), 4000)
    } finally {
      setExportingExcel(false)
    }
  }

  async function handleDownloadPdf(invId: number, invoiceNumber: string) {
    setDownloadingPdf(invId)
    try {
      await downloadBlob(`/admin/invoices/${invId}/pdf`, `${invoiceNumber || `invoice-${invId}`}.pdf`)
    } catch (err: any) {
      setSuccessMsg(err.message || 'Download failed')
      setTimeout(() => setSuccessMsg(''), 4000)
    } finally {
      setDownloadingPdf(null)
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', currentPage, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(currentPage), perPage: String(ITEMS_PER_PAGE) })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      return apiFetch<{ items: Array<Record<string, unknown>>; total: number; page: number; perPage: number; totalPages: number }>(`/admin/invoices?${params.toString()}`)
    },
  })

  const items = data?.items || []
  const totalItems = data?.total ?? items.length
  const totalPages = data?.totalPages ?? Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE))

  const statusUpdateMut = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiFetch<{ item: Record<string, unknown> }>(`/admin/invoices/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  })

  const emailMut = useMutation({
    mutationFn: async (id: number) => {
      return apiFetch<{ message: string }>(`/admin/invoices/${id}/send-email`, { method: 'POST' })
    },
    onSuccess: (data) => {
      setSuccessMsg((data as any)?.message || 'Email sent!')
      setTimeout(() => setSuccessMsg(''), 4000)
    },
  })

  function handleSearch() {
    setSearch(searchInput.trim())
    setCurrentPage(1)
  }

  function handleStatusFilter(key: string) {
    setStatusFilter(key)
    setCurrentPage(1)
  }

  return (
    <div className="space-y-6">
      <section className="admin-card rounded-lg p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[var(--burgundy)]">Finance</p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-[var(--gold)] md:text-4xl">Invoices</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exportingExcel}
              className="inline-flex items-center gap-1.5 rounded border border-[var(--line)] px-3 py-1.5 text-xs font-bold text-[var(--gold)] transition-colors hover:bg-[var(--burgundy-soft)]"
            >
              {exportingExcel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Export Excel
            </button>
          </div>
        </div>
      </section>

      <section className="admin-card rounded-lg p-5">
        {successMsg && (
          <div className="mb-3 rounded border border-green-700 bg-green-900/30 px-4 py-2 text-sm text-green-300">
            {successMsg}
          </div>
        )}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search invoice no..."
                className="admin-input w-56 rounded border border-[var(--line)] bg-[var(--panel-strong)] px-3 py-1.5 pr-8 text-sm"
              />
              <button type="button" onClick={handleSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)]">
                <Search className="h-3.5 w-3.5" />
              </button>
            </div>
            <button type="button" onClick={() => queryClient.invalidateQueries({ queryKey: ['invoices'] })}
              className="rounded border border-[var(--line)] p-1.5 text-[var(--muted)] hover:bg-[var(--panel-strong)]"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex gap-1">
            {statusTabs.map(tab => (
              <button key={tab.key} type="button" onClick={() => handleStatusFilter(tab.key)}
                className={`rounded px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] transition-colors ${statusFilter === tab.key ? 'bg-[var(--burgundy)] text-white' : 'text-[var(--muted)] hover:bg-[var(--panel-strong)]'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--gold)]" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <FileText className="h-10 w-10 text-[var(--muted)]" />
            <p className="text-sm font-semibold text-[var(--muted)]">No invoices found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left text-[14px]">
              <thead>
                <tr className="border-b border-[var(--line)] text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">Invoice No</th>
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Order</th>
                  <th className="pb-2 pr-4">Customer</th>
                  <th className="pb-2 pr-4 text-right">Amount</th>
                  <th className="pb-2 pr-4 text-right">Discount</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((inv: any, idx: number) => {
                  const order = inv.Order || {}
                  return (
                    <tr key={inv.id} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--panel-strong)]">
                      <td className="py-3 pr-4 text-sm text-[var(--muted)]">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                      <td className="py-3 pr-4 font-semibold text-[var(--text)]">{String(inv.invoiceNumber || '')}</td>
                      <td className="py-3 pr-4 text-sm text-[var(--muted)]">{inv.invoiceDate ? String(inv.invoiceDate).slice(0, 10) : '–'}</td>
                      <td className="py-3 pr-4 text-sm font-semibold">{String(order.orderNumber || '')}</td>
                      <td className="py-3 pr-4 text-sm text-[var(--muted)]">{String(order.customerEmail || '')}</td>
                      <td className="py-3 pr-4 text-right font-bold">₹{Number(order.grandTotal || 0).toLocaleString('en-IN')}</td>
                      <td className="py-3 pr-4 text-right text-sm">
                        {order.couponCode ? (
                          <span className="text-[var(--muted)]">
                            <span className="font-semibold text-[var(--burgundy)]">{order.couponCode}</span>
                            <br />
                            <span className="text-xs">-₹{Number(order.discount || 0).toLocaleString('en-IN')}</span>
                          </span>
                        ) : <span className="text-[var(--muted)]">–</span>}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`font-bold text-xs uppercase ${statusColors[inv.status as string] || ''}`}>{String(inv.status || '')}</span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => emailMut.mutate(inv.id as number)}
                            disabled={emailMut.isPending}
                            className="rounded border border-[var(--line)] p-1.5 text-[var(--muted)] hover:bg-[var(--panel-strong)] disabled:opacity-40"
                            title="Email Invoice"
                          >
                            {emailMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadPdf(inv.id as number, String(inv.invoiceNumber || ''))}
                            disabled={downloadingPdf === inv.id}
                            className="rounded border border-[var(--line)] p-1.5 text-[var(--muted)] hover:bg-[var(--panel-strong)] disabled:opacity-40"
                            title="Download PDF"
                          >
                            {downloadingPdf === inv.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-[var(--muted)]">{totalItems} invoice{totalItems !== 1 ? 's' : ''}</p>
          <div className="flex items-center gap-2">
            <button type="button" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="rounded border border-[var(--line)] p-1.5 text-[var(--muted)] hover:bg-[var(--panel-strong)] disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-semibold text-[var(--muted)]">{currentPage} / {totalPages}</span>
            <button type="button" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}
              className="rounded border border-[var(--line)] p-1.5 text-[var(--muted)] hover:bg-[var(--panel-strong)] disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
