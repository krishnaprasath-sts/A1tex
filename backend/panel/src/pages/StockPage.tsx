import { useCallback, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronRight as ChevronRightIcon, ClipboardList, Loader2, Minus, Plus, Save, X } from 'lucide-react'
import { adjustStock, batchUpdateStock, getStockList, resolveImageUrl } from '../services/api'

const ITEMS_PER_PAGE = 10

export default function StockPage() {
  const queryClient = useQueryClient()
  const [currentPage, setCurrentPage] = useState(1)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [edits, setEdits] = useState<Record<number, { stockQty: number; lowStockThreshold: number }>>({})

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-stock', currentPage],
    queryFn: () => getStockList(currentPage, ITEMS_PER_PAGE),
  })

  const products = data?.items || []
  const totalPages = data?.totalPages ?? 1

  // Seed edits from data
  useEffect(() => {
    if (data?.items) {
      const next: Record<number, { stockQty: number; lowStockThreshold: number }> = {}
      for (const p of data.items) {
        const variants = (p as any).variants || []
        for (const v of variants) {
          next[v.id] = {
            stockQty: Number(v.stockQty),
            lowStockThreshold: Number(v.lowStockThreshold ?? 10),
          }
        }
      }
      setEdits(prev => {
        const merged = { ...next }
        for (const [id, val] of Object.entries(prev)) {
          const nextVal = next[Number(id)]
          if (nextVal && (nextVal.stockQty !== val.stockQty || nextVal.lowStockThreshold !== val.lowStockThreshold)) {
            merged[Number(id)] = val
          }
        }
        return merged
      })
    }
  }, [data])

  const hasChanges = useCallback(() => {
    if (!data?.items) return false
    for (const p of data.items) {
      const variants = (p as any).variants || []
      for (const v of variants) {
        const e = edits[v.id]
        if (!e) continue
        if (e.stockQty !== Number(v.stockQty) || e.lowStockThreshold !== Number(v.lowStockThreshold ?? 10)) {
          return true
        }
      }
    }
    return false
  }, [data, edits])

  const [adjustTarget, setAdjustTarget] = useState<{
    variant: any
    productName: string
  } | null>(null)
  const [adjustDelta, setAdjustDelta] = useState(1)
  const [adjustReason, setAdjustReason] = useState('')
  const [adjustReference, setAdjustReference] = useState('')

  const adjustMutation = useMutation({
    mutationFn: () => {
      if (!adjustTarget) return Promise.reject(new Error('No variant selected'))
      return adjustStock({
        variantId: adjustTarget.variant.id,
        delta: adjustDelta,
        reason: adjustReason,
        reference: adjustReference || null,
      })
    },
    onSuccess: () => {
      setAdjustTarget(null)
      setAdjustDelta(1)
      setAdjustReason('')
      setAdjustReference('')
      queryClient.invalidateQueries({ queryKey: ['admin-stock'] })
    },
  })

  const [successMsg, setSuccessMsg] = useState('')

  const saveMutation = useMutation({
    mutationFn: () => {
      const updates: { variantId: number; stockQty: number; lowStockThreshold: number }[] = []
      if (!data?.items) return Promise.reject(new Error('No data'))
      for (const p of data.items) {
        const variants = (p as any).variants || []
        for (const v of variants) {
          const e = edits[v.id]
          if (!e) continue
          if (e.stockQty !== Number(v.stockQty) || e.lowStockThreshold !== Number(v.lowStockThreshold ?? 10)) {
            updates.push({
              variantId: v.id,
              stockQty: e.stockQty,
              lowStockThreshold: e.lowStockThreshold,
            })
          }
        }
      }
      return batchUpdateStock(updates)
    },
    onSuccess: () => {
      setSuccessMsg('Stock updated successfully.')
      setTimeout(() => setSuccessMsg(''), 4000)
      queryClient.invalidateQueries({ queryKey: ['admin-stock'] })
    },
  })

  const toggleProduct = (productId: number) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      return next
    })
  }

  return (
    <div className="space-y-6">
      <section className="admin-card rounded-lg p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[var(--burgundy)]">
              Inventory Management
            </p>
            <h1 className="mt-2 flex items-center gap-3 font-display text-3xl font-semibold text-[var(--gold)] md:text-4xl">
              <ClipboardList className="h-7 w-7 md:h-8 md:w-8" />
              Stock
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={!hasChanges() || saveMutation.isPending}
              className="admin-btn inline-flex items-center gap-2 px-4 py-2.5 text-sm"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </button>
          </div>
        </div>
      </section>

      {successMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {successMsg}
        </div>
      )}

      {saveMutation.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {(saveMutation.error as Error).message}
        </div>
      )}

      {adjustMutation.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {(adjustMutation.error as Error).message}
        </div>
      )}

      {adjustMutation.isSuccess && adjustMutation.data && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {(adjustMutation.data as any).message}
        </div>
      )}

      {/* ── Adjust Stock Modal ── */}
      {adjustTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Adjust Stock</h2>
              <button
                type="button"
                onClick={() => { setAdjustTarget(null); setAdjustDelta(1); setAdjustReason(''); setAdjustReference('') }}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm">
              <p className="font-medium text-gray-900">{adjustTarget.variant.label}</p>
              <p className="text-gray-500">
                {adjustTarget.productName}
                {adjustTarget.variant.sku && <span> · SKU: {adjustTarget.variant.sku}</span>}
              </p>
              <p className="mt-1 text-gray-500">
                Current Stock: <span className="font-semibold text-gray-900">{adjustTarget.variant.stockQty}</span>
              </p>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">Quantity Adjustment</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAdjustDelta(v => Math.max(-9999, v - 1))}
                  className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-100"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  value={adjustDelta}
                  onChange={e => setAdjustDelta(parseInt(e.target.value) || 0)}
                  className="w-32 rounded-lg border border-gray-200 px-3 py-2 text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--burgundy)]/30"
                />
                <button
                  type="button"
                  onClick={() => setAdjustDelta(v => Math.min(9999, v + 1))}
                  className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-100"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <span className="text-sm text-gray-500">
                  New: <strong>{Math.max(0, (Number(adjustTarget.variant.stockQty) || 0) + adjustDelta)}</strong>
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-400">Use positive to increase, negative to decrease.</p>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Reason <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={adjustReason}
                onChange={e => setAdjustReason(e.target.value)}
                placeholder="e.g. Supplier restock, Return from customer, Inventory correction"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--burgundy)]/30"
              />
            </div>

            <div className="mb-6">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Reference <span className="text-xs text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={adjustReference}
                onChange={e => setAdjustReference(e.target.value)}
                placeholder="e.g. PO-12345, Return #R789"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--burgundy)]/30"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setAdjustTarget(null); setAdjustDelta(1); setAdjustReason(''); setAdjustReference('') }}
                className="admin-btn-outline rounded-lg px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => adjustMutation.mutate()}
                disabled={!adjustReason || adjustReason.length < 3 || adjustDelta === 0 || adjustMutation.isPending}
                className="admin-btn inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm"
              >
                {adjustMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="admin-card overflow-hidden rounded-lg">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--burgundy)]" />
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-gray-500">No products found.</p>
          </div>
        ) : (
          <div>
            {products.map((product: any) => {
              const variants = product.variants || []
              const isExpanded = expanded.has(product.id)
              const hasLowStock = variants.some((v: any) =>
                Number(edits[v.id]?.stockQty ?? v.stockQty) <= Number(edits[v.id]?.lowStockThreshold ?? v.lowStockThreshold ?? 10)
              )

              return (
                <div key={product.id} className="border-b border-gray-100 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => toggleProduct(product.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50/50"
                  >
                    {variants.length > 0 ? (
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                    ) : (
                      <span className="w-4" />
                    )}
                    {(product.imageUrl || product.Product?.imageUrl) && (
                      <img
                        src={resolveImageUrl(product.imageUrl || product.Product?.imageUrl)}
                        alt=""
                        className="h-10 w-8 rounded object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-gray-900">{product.name}</p>
                      {product.code && <p className="text-xs text-gray-400">{product.code}</p>}
                    </div>
                    {hasLowStock && (
                      <span className="inline-flex shrink-0 items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                        Low Stock
                      </span>
                    )}
                    <span className="text-sm text-gray-500">
                      {variants.length} variant{variants.length !== 1 ? 's' : ''}
                    </span>
                    <ChevronRightIcon className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </button>

                  {isExpanded && variants.length > 0 && (
                    <div className="border-t border-[var(--line)] bg-[var(--panel-strong)]/30">
                      <table className="w-full border-collapse text-left text-sm">
                        <thead>
                          <tr className="bg-[var(--panel-strong)] text-[13.5px] font-bold uppercase tracking-wider text-[var(--muted)]">
                            <th className="w-8 border border-[var(--line)] px-2 py-2 text-center font-bold">S.No</th>
                            <th className="border border-[var(--line)] px-4 py-2 pl-12 font-bold">Variant</th>
                            <th className="border border-[var(--line)] px-4 py-2 font-bold">Color / Size</th>
                            <th className="border border-[var(--line)] px-4 py-2 font-bold">SKU</th>
                            <th className="border border-[var(--line)] px-4 py-2 font-bold">Stock Qty</th>
                            <th className="border border-[var(--line)] px-4 py-2 font-bold">Sales Stock</th>
                            <th className="border border-[var(--line)] px-4 py-2 font-bold">Low Stock Threshold</th>
                            <th className="border border-[var(--line)] px-4 py-2 font-bold">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {variants.map((variant: any, vIdx: number) => {
                            const edit = edits[variant.id] || {
                              stockQty: Number(variant.stockQty),
                              lowStockThreshold: Number(variant.lowStockThreshold ?? 10),
                            }
                            const isLowStock = edit.stockQty <= edit.lowStockThreshold
                            const hasImage = variant.images?.[0]?.imageUrl || variant.imageUrl
                            const isDirty = edit.stockQty !== Number(variant.stockQty) ||
                              edit.lowStockThreshold !== Number(variant.lowStockThreshold ?? 10)

                            return (
                              <tr key={variant.id} className={`transition-colors hover:bg-[var(--burgundy-soft)]/20 ${isDirty ? 'bg-amber-50/50' : ''}`}>
                                <td className="w-8 border border-[var(--line)] px-2 py-2.5 text-center text-xs font-bold text-[var(--muted)]">{vIdx + 1}</td>
                                <td className="border border-[var(--line)] px-4 py-2.5 pl-12">
                                  <div className="flex items-center gap-2">
                                    {hasImage && (
                                      <img
                                        src={resolveImageUrl(variant.images?.[0]?.imageUrl || variant.imageUrl)}
                                        alt=""
                                        className="h-8 w-6 rounded object-cover"
                                      />
                                    )}
                                    <span className="font-medium text-[var(--text)]">{variant.label}</span>
                                    {variant.isDefault && (
                                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                        DEFAULT
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="border border-[var(--line)] px-4 py-2.5">
                                  <div className="flex items-center gap-2">
                                    {variant.colorHex && (
                                      <span
                                        className="inline-block h-3 w-3 shrink-0 rounded-full border border-[var(--line)]"
                                        style={{ backgroundColor: variant.colorHex }}
                                      />
                                    )}
                                    <span>
                                      {[variant.colorName, variant.size].filter(Boolean).join(' / ') || '—'}
                                    </span>
                                  </div>
                                </td>
                                <td className="border border-[var(--line)] px-4 py-2.5 font-mono text-xs text-[var(--muted)]">{variant.sku || '—'}</td>
                                <td className="border border-[var(--line)] px-4 py-2.5">
                                  <input
                                    type="number"
                                    min={0}
                                    value={edit.stockQty}
                                    onChange={e => setEdits(prev => ({
                                      ...prev,
                                      [variant.id]: { ...prev[variant.id] || { lowStockThreshold: Number(variant.lowStockThreshold ?? 10) }, stockQty: Math.max(0, parseInt(e.target.value) || 0) },
                                    }))}
                                    className={`w-24 rounded border px-2 py-1 text-right text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--burgundy)]/30 ${
                                      isLowStock ? 'border-red-300 bg-red-50 text-red-700' : 'border-[var(--line)]'
                                    }`}
                                  />
                                </td>
                                <td className="border border-[var(--line)] px-4 py-2.5">
                                  <span className="block w-24 text-right text-sm font-semibold text-[var(--text)]">
                                    {Number(variant.salesStock ?? 0)}
                                  </span>
                                </td>
                                <td className="border border-[var(--line)] px-4 py-2.5">
                                  <input
                                    type="number"
                                    min={0}
                                    value={edit.lowStockThreshold}
                                    onChange={e => setEdits(prev => ({
                                      ...prev,
                                      [variant.id]: { ...prev[variant.id] || { stockQty: Number(variant.stockQty) }, lowStockThreshold: Math.max(0, parseInt(e.target.value) || 0) },
                                    }))}
                                    className="w-24 rounded border border-[var(--line)] px-2 py-1 text-right text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--burgundy)]/30"
                                  />
                                </td>
                                <td className="border border-[var(--line)] px-4 py-2.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAdjustTarget({ variant, productName: product.name })
                                      setAdjustDelta(1)
                                      setAdjustReason('')
                                      setAdjustReference('')
                                    }}
                                    className="inline-flex items-center gap-1 rounded border border-[var(--line)] px-2.5 py-1 text-xs font-medium text-[var(--muted)] transition-colors hover:border-[var(--burgundy)] hover:text-[var(--burgundy)]"
                                  >
                                    <Plus className="h-3 w-3" />
                                    Adjust
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <span className="text-sm text-gray-500">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
