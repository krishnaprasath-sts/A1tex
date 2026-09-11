import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Truck,
  X,
} from 'lucide-react'
import {
  apiFetch,
  listResource,
  listShippingRates,
  createShippingRate,
  updateShippingRate,
  deleteShippingRate,
  resetShippingRatesDefaults,
  type ShippingRateItem,
} from '../services/api'

const ITEMS_PER_PAGE = 20

const COURIER_OPTIONS = [
  'ST Courier',
  'DTDC',
  'The Professional Courier',
  'India Post',
]

export default function ShippingZonesPage() {
  const queryClient = useQueryClient()
  const [currentPage, setCurrentPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [selectedCourier, setSelectedCourier] = useState('')
  const [selectedStateFilter, setSelectedStateFilter] = useState('')

  // Form State for creating new rate
  const [courierService, setCourierService] = useState('DTDC')
  const [state, setState] = useState('Tamil Nadu')
  const [amount, setAmount] = useState('')
  const [estimatedDays, setEstimatedDays] = useState('2-4 business days')
  const [formError, setFormError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Modal states
  const [editItem, setEditItem] = useState<ShippingRateItem | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editDays, setEditDays] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<ShippingRateItem | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  // Free Shipping Threshold setting
  const { data: settingsData } = useQuery({
    queryKey: ['resource', 'settings'],
    queryFn: () => listResource('settings'),
  })

  const existingShipping = settingsData?.items?.find((i: any) => i.key === 'shipping_config')
  const shippingValue = (existingShipping?.value || {}) as Record<string, any>

  const [freeShippingEnabled, setFreeShippingEnabled] = useState(false)
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('')

  useEffect(() => {
    if (existingShipping) {
      setFreeShippingEnabled(Boolean(shippingValue.freeShippingEnabled))
      setFreeShippingThreshold(shippingValue.freeShippingThreshold ? String(shippingValue.freeShippingThreshold) : '')
    }
  }, [existingShipping])

  const saveShipping = useMutation({
    mutationFn: async () => {
      const threshold = Number(freeShippingThreshold) || 0
      const body = {
        key: 'shipping_config',
        value: {
          freeShippingEnabled,
          freeShippingThreshold: freeShippingEnabled ? threshold : 0,
        },
      }
      if (existingShipping?.id) {
        return apiFetch(`/admin/settings/${existingShipping.id}`, { method: 'PUT', body: JSON.stringify(body) })
      }
      return apiFetch('/admin/settings', { method: 'POST', body: JSON.stringify(body) })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource', 'settings'] })
      setSuccessMsg('Free shipping threshold settings saved successfully.')
      setTimeout(() => setSuccessMsg(''), 4000)
    },
  })

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['shipping-rates', currentPage, search, selectedCourier, selectedStateFilter],
    queryFn: () =>
      listShippingRates(currentPage, ITEMS_PER_PAGE, {
        search,
        courier: selectedCourier || undefined,
        state: selectedStateFilter || undefined,
      }),
  })

  const items = data?.items || []
  const totalItems = data?.total ?? items.length
  const totalPages = data?.totalPages ?? Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE))
  const availableStates = data?.availableStates || []

  // Create mutation
  const createMut = useMutation({
    mutationFn: createShippingRate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-rates'] })
      setAmount('')
      setFormError('')
      setSuccessMsg('Shipping rate configured successfully.')
      setTimeout(() => setSuccessMsg(''), 4000)
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to save shipping rate')
    },
  })

  // Update mutation
  const updateMut = useMutation({
    mutationFn: (args: { id: number; data: Partial<ShippingRateItem> }) =>
      updateShippingRate(args.id, args.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-rates'] })
      setEditItem(null)
      setSuccessMsg('Shipping rate updated successfully.')
      setTimeout(() => setSuccessMsg(''), 4000)
    },
  })

  // Delete mutation
  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteShippingRate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-rates'] })
      setConfirmDelete(null)
      setSuccessMsg('Shipping rate deleted.')
      setTimeout(() => setSuccessMsg(''), 4000)
    },
  })

  // Reset defaults mutation
  const resetMut = useMutation({
    mutationFn: resetShippingRatesDefaults,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-rates'] })
      setConfirmReset(false)
      setSuccessMsg('Shipping rates successfully reset to default rates.')
      setTimeout(() => setSuccessMsg(''), 4000)
    },
  })

  function handleSearch() {
    setSearch(searchInput.trim())
    setCurrentPage(1)
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || isNaN(Number(amount)) || Number(amount) < 0) {
      setFormError('Please enter a valid shipping rate amount (₹)')
      return
    }
    setFormError('')
    createMut.mutate({
      courierService,
      state,
      amount: Number(amount),
      estimatedDays: estimatedDays.trim() || undefined,
      active: true,
    })
  }

  function openEditModal(item: ShippingRateItem) {
    setEditItem(item)
    setEditAmount(String(item.amount))
    setEditDays(item.estimatedDays || '')
    setEditActive(item.active)
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editItem) return
    updateMut.mutate({
      id: editItem.id,
      data: {
        amount: Number(editAmount),
        estimatedDays: editDays.trim() || undefined,
        active: editActive,
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="admin-card rounded-lg p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[var(--burgundy)]">
              Logistics & Delivery
            </p>
            <h1 className="mt-2 flex items-center gap-3 font-display text-3xl font-semibold text-[var(--gold)] md:text-4xl">
              <Truck className="h-7 w-7 md:h-8 md:w-8" />
              Shipping Zones & Rates
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Configure dynamic state-wise shipping charges for courier partners (ST Courier, DTDC, The Professional Courier, India Post).
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2 text-xs font-bold text-[var(--muted)] transition hover:text-[var(--text)] hover:bg-[var(--line)] cursor-pointer"
              title="Reset rates to standard defaults"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Defaults
            </button>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2 text-xs font-bold text-[var(--muted)] transition hover:text-[var(--text)] hover:bg-[var(--line)] cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {successMsg ? (
          <div className="admin-toast mt-4 flex items-center gap-2 rounded border border-green-300 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-800 dark:bg-green-950/30 dark:text-green-300">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {successMsg}
          </div>
        ) : null}
      </section>

      {/* Free Delivery Threshold Settings Card */}
      <section className="admin-card rounded-lg p-5 border border-[var(--line)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 mt-0.5">
              <Check className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--gold)]">Free Shipping Threshold</h3>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                {freeShippingEnabled
                  ? Number(freeShippingThreshold) === 0
                    ? 'Free shipping is active on ALL orders regardless of cart value.'
                    : `Customers get free shipping when cart total reaches ₹${Number(freeShippingThreshold).toLocaleString('en-IN')}.`
                  : 'Free shipping is disabled. Customers pay standard state-wise courier rates.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[var(--muted)]">
              <input
                type="checkbox"
                checked={freeShippingEnabled}
                onChange={e => setFreeShippingEnabled(e.target.checked)}
                className="h-4 w-4 rounded accent-[var(--burgundy)]"
              />
              <span>Enable Free Shipping</span>
            </label>

            {freeShippingEnabled && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[var(--muted)]">Min ₹</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={freeShippingThreshold}
                  onChange={e => setFreeShippingThreshold(e.target.value)}
                  placeholder="0 for all orders"
                  className="admin-input w-28 rounded border border-[var(--line)] bg-[var(--bg)] px-2.5 py-1.5 text-xs font-semibold"
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => saveShipping.mutate()}
              disabled={saveShipping.isPending}
              className="rounded bg-[var(--burgundy)] px-4 py-1.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {saveShipping.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </section>

      {/* Add Shipping Rate Form */}
      <section className="admin-card rounded-lg p-6">
        <h2 className="text-base font-bold text-[var(--gold)] flex items-center gap-2 mb-4">
          <Plus className="h-4 w-4 text-[var(--burgundy)]" />
          Add / Configure Shipping Rate
        </h2>

        {formError ? (
          <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-xs font-semibold text-red-700">
            {formError}
          </div>
        ) : null}

        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1">
              Courier Service *
            </label>
            <select
              value={courierService}
              onChange={e => setCourierService(e.target.value)}
              className="admin-input w-full rounded border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm"
              required
            >
              {COURIER_OPTIONS.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1">
              State / Union Territory *
            </label>
            <select
              value={state}
              onChange={e => setState(e.target.value)}
              className="admin-input w-full rounded border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm"
              required
            >
              <option value="All India">All India (National Flat)</option>
              {availableStates.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1">
              Shipping Amount (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm font-bold text-[var(--muted)]">₹</span>
              <input
                type="number"
                step="1"
                min="0"
                placeholder="40"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="admin-input w-full rounded border border-[var(--line)] bg-[var(--bg)] pl-7 pr-3 py-2 text-sm"
                required
              />
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1">
                Estimated Days
              </label>
              <input
                type="text"
                placeholder="e.g. 1-2 days"
                value={estimatedDays}
                onChange={e => setEstimatedDays(e.target.value)}
                className="admin-input w-full rounded border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={createMut.isPending}
              className="inline-flex items-center justify-center gap-1.5 rounded bg-[var(--burgundy)] px-5 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50 cursor-pointer h-[38px]"
            >
              {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Save Rate
            </button>
          </div>
        </form>
      </section>

      {/* Filter & Search Bar */}
      <section className="admin-card rounded-lg p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Courier Filter Tabs */}
          <div className="flex gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => { setSelectedCourier(''); setCurrentPage(1) }}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                selectedCourier === ''
                  ? 'bg-[var(--burgundy)] text-white shadow-xs'
                  : 'text-[var(--muted)] hover:bg-[var(--line)] hover:text-[var(--text)]'
              }`}
            >
              All Couriers
            </button>
            {COURIER_OPTIONS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => { setSelectedCourier(c); setCurrentPage(1) }}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                  selectedCourier === c
                    ? 'bg-[var(--burgundy)] text-white shadow-xs'
                    : 'text-[var(--muted)] hover:bg-[var(--line)] hover:text-[var(--text)]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search state or courier..."
              className="admin-input w-full min-w-[220px] rounded border border-[var(--line)] bg-[var(--bg)] px-3 py-1.5 text-xs md:w-auto"
            />
            <button
              type="button"
              onClick={handleSearch}
              className="inline-flex items-center gap-1.5 rounded bg-[var(--gold)] px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90 cursor-pointer"
            >
              <Search className="h-3.5 w-3.5" />
              Search
            </button>
          </div>
        </div>
      </section>

      {/* Rates Table */}
      <section className="admin-card overflow-hidden rounded-lg">
        {!isLoading && items.length > 0 ? (
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3 bg-[var(--panel-strong)]">
            <p className="text-xs font-semibold text-[var(--muted)]">
              Showing{' '}
              <span className="text-[var(--text)] font-bold">{Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalItems)}</span>
              {' '}to{' '}
              <span className="text-[var(--text)] font-bold">{Math.min(currentPage * ITEMS_PER_PAGE, totalItems)}</span>
              {' '}of{' '}
              <span className="text-[var(--text)] font-bold">{totalItems}</span> configured shipping rates
            </p>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-left text-sm">
            <thead className="border-b border-[var(--line)] bg-[var(--panel-strong)] text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              <tr>
                <th className="px-5 py-3">S.No</th>
                <th className="px-5 py-3">Courier Partner</th>
                <th className="px-5 py-3">State / Region</th>
                <th className="px-5 py-3">Shipping Charge</th>
                <th className="px-5 py-3">Delivery Time</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((rate, idx) => {
                const serialNo = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1
                return (
                  <tr
                    key={rate.id}
                    className="admin-table-row border-b border-[var(--line)] last:border-0 hover:bg-[var(--line)]/30 transition-colors"
                  >
                    <td className="px-5 py-3.5 text-xs font-semibold text-[var(--muted)]">{serialNo}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-[var(--burgundy)] shrink-0" />
                        <span className="font-bold text-[var(--text)]">{rate.courierService}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block rounded px-2.5 py-0.5 text-xs font-semibold ${
                        rate.state === 'Tamil Nadu'
                          ? 'bg-amber-50 text-amber-900 border border-amber-200'
                          : rate.state === 'All India'
                          ? 'bg-purple-50 text-purple-900 border border-purple-200'
                          : 'bg-slate-100 text-slate-800'
                      }`}>
                        {rate.state}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-bold text-sm text-[var(--burgundy)]">
                        ₹{Number(rate.amount).toFixed(0)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[var(--muted)]">
                      {rate.estimatedDays || '–'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        rate.active ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {rate.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(rate)}
                          className="rounded p-1 text-[var(--muted)] hover:text-[var(--burgundy)] hover:bg-[var(--line)] cursor-pointer"
                          title="Edit Rate"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(rate)}
                          className="rounded p-1 text-[var(--muted)] hover:text-red-600 hover:bg-red-50 cursor-pointer"
                          title="Delete Rate"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {!items.length && !isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-[var(--muted)]">
                    No shipping rates found matching your filter criteria.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-[var(--line)] px-5 py-3 bg-[var(--panel-strong)]">
            <p className="text-xs text-[var(--muted)]">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 rounded border border-[var(--line)] px-3 py-1 text-xs font-bold text-[var(--text)] transition hover:bg-[var(--line)] disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 rounded border border-[var(--line)] px-3 py-1 text-xs font-bold text-[var(--text)] transition hover:bg-[var(--line)] disabled:opacity-40"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-[var(--muted)]">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--gold)]" />
            Loading shipping rates...
          </div>
        ) : null}
      </section>

      {/* Edit Rate Modal */}
      {editItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-[var(--line)] bg-[var(--panel)] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3 mb-4">
              <h3 className="text-base font-bold text-[var(--burgundy)]">Edit Shipping Rate</h3>
              <button
                type="button"
                onClick={() => setEditItem(null)}
                className="rounded p-1 text-[var(--muted)] hover:bg-[var(--line)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <span className="block text-xs font-semibold text-[var(--muted)]">Courier Service</span>
                <p className="font-bold text-sm text-[var(--text)]">{editItem.courierService}</p>
              </div>

              <div>
                <span className="block text-xs font-semibold text-[var(--muted)]">State</span>
                <p className="font-bold text-sm text-[var(--text)]">{editItem.state}</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1">
                  Shipping Charge (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={editAmount}
                  onChange={e => setEditAmount(e.target.value)}
                  className="admin-input w-full rounded border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1">
                  Estimated Delivery Time
                </label>
                <input
                  type="text"
                  value={editDays}
                  onChange={e => setEditDays(e.target.value)}
                  className="admin-input w-full rounded border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm"
                  placeholder="e.g. 1-2 business days"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editActive}
                    onChange={e => setEditActive(e.target.checked)}
                    className="rounded"
                  />
                  Active (Available at Checkout)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--line)]">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="rounded px-4 py-2 text-xs font-bold text-[var(--muted)] hover:bg-[var(--line)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMut.isPending}
                  className="rounded bg-[var(--burgundy)] px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {updateMut.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Delete Confirmation Modal */}
      {confirmDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl border border-[var(--line)] bg-[var(--panel)] p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-[var(--burgundy)]">Delete Rate Rule</h3>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Are you sure you want to delete the rate rule for <strong>{confirmDelete.courierService}</strong> in <strong>{confirmDelete.state}</strong>?
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="rounded px-3.5 py-1.5 text-xs font-bold text-[var(--muted)] hover:bg-[var(--line)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMut.mutate(confirmDelete.id)}
                disabled={deleteMut.isPending}
                className="rounded bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMut.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Reset Confirmation Modal */}
      {confirmReset ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl border border-[var(--line)] bg-[var(--panel)] p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <RotateCcw className="h-5 w-5 text-[var(--gold)] shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-[var(--burgundy)]">Reset All Shipping Rates</h3>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  This will reset all courier rate rules to standard defaults (ST Courier ₹40 TN, DTDC ₹40/₹60/₹150, Professional ₹40/₹60/₹150, India Post ₹70).
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="rounded px-3.5 py-1.5 text-xs font-bold text-[var(--muted)] hover:bg-[var(--line)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => resetMut.mutate()}
                disabled={resetMut.isPending}
                className="rounded bg-[var(--burgundy)] px-4 py-1.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
              >
                {resetMut.isPending ? 'Resetting...' : 'Yes, Reset Defaults'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
