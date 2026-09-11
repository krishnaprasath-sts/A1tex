import { FormEvent, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, Loader2, Plus } from 'lucide-react'
import { createResource, listResource, updateResource, getResource, getTopCustomers } from '../services/api'
import { formatDateTime } from './ResourceShared'
import type { ResourceConfig } from '../app/resources'
import { resources } from '../app/resources'

const config: ResourceConfig = resources.find(r => r.api === 'coupons')!

export default function CouponFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const queryClient = useQueryClient()

  const isEdit = Boolean(id)
  const stateItem = (location.state as { item?: Record<string, unknown> } | null)?.item || null

  const { data: queryData, isLoading: isFetching } = useQuery({
    queryKey: ['resource', config.api, id],
    queryFn: () => id ? getResource(config.api, id) : Promise.resolve(null),
    enabled: isEdit && !stateItem,
  })

  const editItem = isEdit ? (stateItem || queryData?.item || null) : null
  const isLoadingItem = isEdit && !stateItem && isFetching

  const [code, setCode] = useState(editItem ? String(editItem.code || '') : '')
  const [type, setType] = useState(editItem ? String(editItem.type || '') : 'percentage')
  const [value, setValue] = useState(() => {
    if (!editItem) return ''
    return String(editItem.value || '')
  })
  const [minCartValue, setMinCartValue] = useState(editItem ? String(editItem.minCartValue || '') : '')
  const [maxDiscount, setMaxDiscount] = useState(editItem ? String(editItem.maxDiscount || '') : '')
  const [usageLimit, setUsageLimit] = useState(editItem ? String(editItem.usageLimit || '') : '')
  const [perUserLimit, setPerUserLimit] = useState(editItem ? String(editItem.perUserLimit || '1') : '1')
  const [startsAt, setStartsAt] = useState(editItem ? formatDateTime(editItem.startsAt) : '')
  const [expiresAt, setExpiresAt] = useState(editItem ? formatDateTime(editItem.expiresAt) : '')
  const [active, setActive] = useState(editItem ? Boolean(editItem.active) : true)
  const [description, setDescription] = useState(editItem ? String(editItem.description || '') : '')
  const [customerIds, setCustomerIds] = useState<number[]>(
    editItem && Array.isArray(editItem.customerIds) ? (editItem.customerIds as number[]) : [],
  )
  const [customerSearch, setCustomerSearch] = useState('')

  const { data: topCustomersData, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['admin', 'top-customers'],
    queryFn: getTopCustomers,
  })
  const topCustomers = topCustomersData?.items || []
  const filteredCustomers = customerSearch.trim()
    ? topCustomers.filter(c =>
        (c.name || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(customerSearch.toLowerCase()),
      )
    : topCustomers

  function toggleCustomer(customerId: number) {
    setCustomerIds(prev => prev.includes(customerId) ? prev.filter(id => id !== customerId) : [...prev, customerId])
  }

  const [touched, setTouched] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (editItem && !touched.initialized) {
      setCode(String(editItem.code || ''))
      setType(String(editItem.type || 'percentage'))
      setValue(String(editItem.value || ''))
      setMinCartValue(String(editItem.minCartValue || ''))
      setMaxDiscount(String(editItem.maxDiscount || ''))
      setUsageLimit(String(editItem.usageLimit || ''))
      setPerUserLimit(String(editItem.perUserLimit || '1'))
      setStartsAt(formatDateTime(editItem.startsAt))
      setExpiresAt(formatDateTime(editItem.expiresAt))
      setActive(Boolean(editItem.active ?? true))
      setDescription(String(editItem.description || ''))
      setCustomerIds(Array.isArray(editItem.customerIds) ? (editItem.customerIds as number[]) : [])
      setTouched({ initialized: true })
    }
  }, [editItem, touched.initialized])

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => {
      if (isEdit && id) return updateResource(config.api, id, payload)
      return createResource(config.api, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource', config.api] })
      navigate(config.path, { state: { successMsg: `Coupon ${isEdit ? 'updated' : 'created'} successfully.` } })
    },
  })

  const validate = () => {
    const errors: Record<string, string> = {}

    const trimmedCode = code.trim().toUpperCase()
    if (!trimmedCode) errors.code = 'Coupon code is required.'
    else if (trimmedCode.length < 2) errors.code = 'Code must be at least 2 characters.'
    else if (trimmedCode.length > 50) errors.code = 'Code cannot exceed 50 characters.'

    if (!type) errors.type = 'Please select a discount type.'

    const valueNum = parseFloat(value)
    if (value === '' || isNaN(valueNum)) errors.value = 'Value is required.'
    else if (valueNum < 0) errors.value = 'Value cannot be negative.'
    else if (type === 'percentage' && (valueNum < 1 || valueNum > 100)) errors.value = 'Percentage must be between 1 and 100.'

    if (type === 'percentage' && maxDiscount !== '') {
      const maxDiscNum = parseFloat(maxDiscount)
      if (isNaN(maxDiscNum) || maxDiscNum < 0) errors.maxDiscount = 'Max discount must be a positive number.'
    }

    if (usageLimit !== '') {
      const limitNum = parseInt(usageLimit, 10)
      if (isNaN(limitNum) || limitNum < 0) errors.usageLimit = 'Usage limit must be a positive number.'
    }

    if (perUserLimit !== '') {
      const perUserNum = parseInt(perUserLimit, 10)
      if (isNaN(perUserNum) || perUserNum < 1) errors.perUserLimit = 'Per user limit must be at least 1.'
    }

    if (minCartValue !== '') {
      const mcv = parseFloat(minCartValue)
      if (isNaN(mcv) || mcv < 0) errors.minCartValue = 'Min cart value must be a positive number.'
    }

    if (startsAt && expiresAt && new Date(expiresAt) <= new Date(startsAt)) {
      errors.expiresAt = 'Expiry date must be later than the start date.'
    }

    return errors
  }

  const errors = validate()
  const isValid = Object.keys(errors).length === 0

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTouched(prev => ({ ...prev, code: true, type: true, value: true, minCartValue: true, maxDiscount: true, usageLimit: true, perUserLimit: true, startsAt: true, expiresAt: true, description: true }))

    if (!isValid) {
      setTimeout(() => {
        const firstError = document.querySelector('.error-border')
        if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
      return
    }

    const payload: Record<string, unknown> = {
      code: code.trim().toUpperCase(),
      type,
      value: parseFloat(value),
      minCartValue: minCartValue !== '' && !isNaN(parseFloat(minCartValue)) ? parseFloat(minCartValue) : 0,
      maxDiscount: maxDiscount !== '' && !isNaN(parseFloat(maxDiscount)) ? parseFloat(maxDiscount) : null,
      usageLimit: usageLimit !== '' && !isNaN(parseInt(usageLimit, 10)) ? parseInt(usageLimit, 10) : null,
      perUserLimit: perUserLimit !== '' && !isNaN(parseInt(perUserLimit, 10)) ? parseInt(perUserLimit, 10) : 1,
      active,
      description: description.trim() || null,
      startsAt: startsAt ? new Date(startsAt).toISOString() : null,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      customerIds,
    }

    saveMutation.mutate(payload)
  }

  const getInputClass = (field: string, baseClass = "admin-input rounded w-full transition-colors duration-200") => {
    if (touched[field] && errors[field]) {
      return `${baseClass} border-red-500 focus:border-red-500 focus:ring-red-500 error-border`
    }
    return baseClass
  }

  if (isLoadingItem) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--gold)]" />
        <p className="text-sm font-semibold text-[var(--muted)]">Loading…</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(config.path)}
          className="inline-flex items-center gap-2 rounded border border-[var(--line)] px-3 py-2 text-sm font-semibold text-[var(--gold)] transition-colors hover:bg-[var(--burgundy-soft)]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to {config.title}</span>
        </button>
      </div>

      <section className="admin-card overflow-hidden rounded-lg">
        <div className="border-b border-[var(--line)] bg-gradient-to-r from-[var(--burgundy-soft)]/40 to-transparent px-6 py-5 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--gold)] text-white">
              {isEdit ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--burgundy)]">
                {config.eyebrow}
              </p>
              <h1 className="font-display text-2xl font-semibold text-[var(--gold)] md:text-3xl">
                {isEdit ? 'Update' : 'Create'} Coupon
              </h1>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="p-6 md:p-8">
          <div className="grid gap-6 md:grid-cols-2">

            {/* Code */}
            <div className="md:col-span-2 space-y-2">
              <label className="block text-[14px] font-bold uppercase tracking-widest text-[var(--muted)]">
                Coupon Code <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                onBlur={() => handleBlur('code')}
                placeholder="e.g. WELCOME20"
                className={getInputClass('code', "admin-input rounded w-full font-mono tracking-wider uppercase transition-colors duration-200")}
              />
              {touched.code && errors.code && (
                <p className="text-xs font-semibold text-red-600">{errors.code}</p>
              )}
            </div>

            {/* Type */}
            <div className="space-y-2">
              <label className="block text-[14px] font-bold uppercase tracking-widest text-[var(--muted)]">
                Discount Type <span className="text-red-400">*</span>
              </label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value)}
                  onBlur={() => handleBlur('type')}
                  className={getInputClass('type')}
                >
                <option value="" disabled>Select type...</option>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </select>
              {touched.type && errors.type && (
                <p className="text-xs font-semibold text-red-600">{errors.type}</p>
              )}
            </div>

            {/* Value */}
            <div className="space-y-2">
              <label className="block text-[14px] font-bold uppercase tracking-widest text-[var(--muted)]">
                {type === 'percentage' ? 'Discount %' : 'Discount Amount (₹)'}
                <span className="text-red-400"> *</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step={type === 'percentage' ? '1' : '0.01'}
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  onBlur={() => handleBlur('value')}
                  placeholder={type === 'percentage' ? 'e.g. 20' : type === 'fixed' ? 'e.g. 500' : '0'}
                  disabled={false}
                  className={getInputClass('value')}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--muted)]">
                    {type === 'percentage' ? '%' : '₹'}
                </span>
              </div>
              {touched.value && errors.value && (
                <p className="text-xs font-semibold text-red-600">{errors.value}</p>
              )}
            </div>

            {/* Max Discount (only for percentage) */}
            {type === 'percentage' && (
              <div className="space-y-2">
                <label className="block text-[14px] font-bold uppercase tracking-widest text-[var(--muted)]">
                  Max Discount Cap (₹) <span className="text-xs font-normal lowercase tracking-normal text-[var(--muted)]">(optional)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={maxDiscount}
                  onChange={e => setMaxDiscount(e.target.value)}
                  onBlur={() => handleBlur('maxDiscount')}
                  placeholder="Leave empty for no cap"
                  className={getInputClass('maxDiscount')}
                />
                {touched.maxDiscount && errors.maxDiscount && (
                  <p className="text-xs font-semibold text-red-600">{errors.maxDiscount}</p>
                )}
              </div>
            )}

            {/* Min Cart Value */}
            <div className="space-y-2">
              <label className="block text-[14px] font-bold uppercase tracking-widest text-[var(--muted)]">
                Min Cart Value (₹) <span className="text-xs font-normal lowercase tracking-normal text-[var(--muted)]">(optional)</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={minCartValue}
                onChange={e => setMinCartValue(e.target.value)}
                onBlur={() => handleBlur('minCartValue')}
                placeholder="0 = No minimum"
                className={getInputClass('minCartValue')}
              />
              {touched.minCartValue && errors.minCartValue && (
                <p className="text-xs font-semibold text-red-600">{errors.minCartValue}</p>
              )}
            </div>

            {/* Usage Limit */}
            <div className="space-y-2">
              <label className="block text-[14px] font-bold uppercase tracking-widest text-[var(--muted)]">
                Total Usage Limit <span className="text-xs font-normal lowercase tracking-normal text-[var(--muted)]">(optional)</span>
              </label>
              <input
                type="number"
                min="0"
                value={usageLimit}
                onChange={e => setUsageLimit(e.target.value)}
                onBlur={() => handleBlur('usageLimit')}
                placeholder="Empty = Unlimited"
                className={getInputClass('usageLimit')}
              />
              {touched.usageLimit && errors.usageLimit && (
                <p className="text-xs font-semibold text-red-600">{errors.usageLimit}</p>
              )}
            </div>

            {/* Per User Limit */}
            <div className="space-y-2">
              <label className="block text-[14px] font-bold uppercase tracking-widest text-[var(--muted)]">
                Per User Limit <span className="text-xs font-normal lowercase tracking-normal text-[var(--muted)]">(default: 1)</span>
              </label>
              <input
                type="number"
                min="1"
                value={perUserLimit}
                onChange={e => setPerUserLimit(e.target.value)}
                onBlur={() => handleBlur('perUserLimit')}
                placeholder="Default: 1"
                className={getInputClass('perUserLimit')}
              />
              {touched.perUserLimit && errors.perUserLimit && (
                <p className="text-xs font-semibold text-red-600">{errors.perUserLimit}</p>
              )}
            </div>

            {/* Starts At */}
            <div className="space-y-2">
              <label className="block text-[14px] font-bold uppercase tracking-widest text-[var(--muted)]">
                Starts At <span className="text-xs font-normal lowercase tracking-normal text-[var(--muted)]">(optional)</span>
              </label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={e => setStartsAt(e.target.value)}
                onBlur={() => handleBlur('startsAt')}
                className={getInputClass('startsAt')}
              />
              {touched.startsAt && errors.startsAt && (
                <p className="text-xs font-semibold text-red-600">{errors.startsAt}</p>
              )}
            </div>

            {/* Expires At */}
            <div className="space-y-2">
              <label className="block text-[14px] font-bold uppercase tracking-widest text-[var(--muted)]">
                Expires At <span className="text-xs font-normal lowercase tracking-normal text-[var(--muted)]">(optional)</span>
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
                onBlur={() => handleBlur('expiresAt')}
                className={getInputClass('expiresAt')}
              />
              {touched.expiresAt && errors.expiresAt && (
                <p className="text-xs font-semibold text-red-600">{errors.expiresAt}</p>
              )}
            </div>

            {/* Active */}
            <div className="space-y-2 flex flex-col justify-end">
              <label className="flex h-[42px] items-center gap-3 rounded border border-[var(--line)] bg-[var(--panel-strong)] px-4 cursor-pointer hover:bg-[var(--burgundy-soft)] transition-colors">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={e => setActive(e.target.checked)}
                  className="h-4 w-4 accent-[#520001] cursor-pointer"
                />
                <span className="text-sm font-semibold text-[var(--text)]">Active</span>
              </label>
            </div>

            {/* Description */}
            <div className="md:col-span-2 space-y-2">
              <label className="block text-[14px] font-bold uppercase tracking-widest text-[var(--muted)]">
                Description <span className="text-xs font-normal lowercase tracking-normal text-[var(--muted)]">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                onBlur={() => handleBlur('description')}
                placeholder="Internal note about this coupon"
                className={getInputClass('description', "admin-input rounded w-full min-h-[80px] transition-colors duration-200")}
              />
              {touched.description && errors.description && (
                <p className="text-xs font-semibold text-red-600">{errors.description}</p>
              )}
            </div>

            {/* Eligible Customers */}
            <div className="md:col-span-2 space-y-2">
              <label className="block text-[14px] font-bold uppercase tracking-widest text-[var(--muted)]">
                Eligible Customers
              </label>
              <div className="rounded border border-[var(--line)] bg-[var(--panel-strong)] p-3">
                <p className="mb-2 text-[11px] text-[var(--muted)]">
                  Leave everything unchecked to make this coupon available to all customers. Check specific
                  repeat customers below to restrict it to only them.
                </p>
                <input
                  type="text"
                  placeholder="Search by name or email…"
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  className="admin-input mb-2 rounded text-sm"
                />
                {isLoadingCustomers ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-[var(--muted)]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading customers…
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <p className="py-3 text-sm text-[var(--muted)]">No repeat customers (2+ orders) found.</p>
                ) : (
                  <div className="max-h-64 space-y-1 overflow-y-auto">
                    {filteredCustomers.map(c => (
                      <label
                        key={c.customerId}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded px-2 py-1.5 hover:bg-[var(--panel)]"
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={customerIds.includes(c.customerId)}
                            onChange={() => toggleCustomer(c.customerId)}
                            className="h-4 w-4 accent-[#520001]"
                          />
                          <span className="text-sm text-[var(--text)]">
                            {c.name || c.email || `#${c.customerId}`}
                            {c.name && c.email ? <span className="text-[var(--muted)]"> — {c.email}</span> : null}
                          </span>
                        </span>
                        <span className="shrink-0 text-[11px] font-semibold text-[var(--muted)]">
                          {c.orderCount} orders · ₹{c.totalAmount.toLocaleString('en-IN')}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

          {saveMutation.isError && (
            <div className="mt-6 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {saveMutation.error instanceof Error ? saveMutation.error.message : 'Unable to save coupon.'}
            </div>
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[var(--line)] pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate(config.path)}
              className="rounded border border-[var(--line)] px-5 py-2.5 text-sm font-bold text-[var(--gold)] transition-colors hover:bg-[var(--burgundy-soft)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded bg-[var(--gold)] px-6 py-2.5 text-sm font-bold uppercase tracking-[0.14em] text-white transition-colors hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saveMutation.isPending ? 'Saving…' : isEdit ? 'Update Coupon' : 'Create Coupon'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
