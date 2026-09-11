import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, ChevronRight as ChevronRightIcon, Edit3, FileUp, Layers, Loader2, Package, Plus, Search, Trash2, X } from 'lucide-react'
import { deleteResource, downloadSampleImportUrl, importProducts, listResource, listVariants, resolveImageUrl } from '../services/api'
import { DeleteConfirmDialog, itemLabel } from './ResourceShared'

const ITEMS_PER_PAGE = 20

export default function ProductsListPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<Record<string, unknown> | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set())
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<{ total: number; created: number; errors: { row: number; message: string }[] } | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [variantData, setVariantData] = useState<Record<number, any[]>>({})
  const [loadingVariants, setLoadingVariants] = useState<Set<number>>(new Set())

  const [successMsg, setSuccessMsg] = useState<string>(
    (location.state as { successMsg?: string } | null)?.successMsg || '',
  )

  useEffect(() => {
    if (successMsg) {
      window.history.replaceState({}, '')
      const timer = setTimeout(() => setSuccessMsg(''), 4000)
      return () => clearTimeout(timer)
    }
  }, [successMsg])

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['resource', 'products', currentPage, searchTerm],
    queryFn: () => listResource('products', currentPage, ITEMS_PER_PAGE, searchTerm || undefined),
  })

  const items = data?.items || []
  const totalItems = data?.total ?? items.length
  const totalPages = data?.totalPages ?? Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE))

  const [deleteError, setDeleteError] = useState('')

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteResource('products', id),
    onSuccess: () => {
      setDeleteTarget(null)
      setDeleteError('')
      setSelectedIds(new Set())
      setSuccessMsg('Product deleted successfully.')
      queryClient.invalidateQueries({ queryKey: ['resource', 'products'] })
    },
    onError: (err: Error) => {
      setDeleteTarget(null)
      setDeleteError(err.message || 'Failed to delete.')
      setTimeout(() => setDeleteError(''), 6000)
    },
  })

  const importMutation = useMutation({
    mutationFn: (file: File) => importProducts(file),
    onSuccess: (data) => {
      setImportResult(data)
      setImportFile(null)
      if (data.created > 0) queryClient.invalidateQueries({ queryKey: ['resource', 'products'] })
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: (string | number)[]) => {
      return Promise.allSettled(ids.map(id => deleteResource('products', id)))
    },
    onSuccess: () => {
      setBulkDeleteConfirm(false)
      setSelectedIds(new Set())
      setSuccessMsg('Selected products deleted.')
      queryClient.invalidateQueries({ queryKey: ['resource', 'products'] })
    },
    onError: (err: Error) => {
      setBulkDeleteConfirm(false)
      setDeleteError(err.message)
      setTimeout(() => setDeleteError(''), 6000)
    },
  })

  const allSelected = items.length > 0 && items.every((item: any) => selectedIds.has(item.id))
  const selectedCount = selectedIds.size

  const toggleSelect = (id: string | number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(items.map((item: any) => item.id)))
  }

  const toggleProduct = async (productId: number) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(productId)) { next.delete(productId); return next }
      next.add(productId)
      if (!variantData[productId]) {
        setLoadingVariants(prev => { const n = new Set(prev); n.add(productId); return n })
        listVariants(productId)
          .then((res: any) => { setVariantData(prev => ({ ...prev, [productId]: res.items || [] })) })
          .catch(() => { setVariantData(prev => ({ ...prev, [productId]: [] })) })
          .finally(() => { setLoadingVariants(prev => { const n = new Set(prev); n.delete(productId); return n }) })
      }
      return next
    })
  }

  return (
    <div className="space-y-6">
      <section className="admin-card rounded-lg p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[var(--burgundy)]">
              Catalog
            </p>
            <h1 className="mt-2 flex items-center gap-3 font-display text-3xl font-semibold text-[var(--gold)] md:text-4xl">
              <Package className="h-7 w-7 md:h-8 md:w-8" />
              Products
            </h1>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { setSearchTerm(searchInput.trim()); setCurrentPage(1) } }}
                placeholder="Search products..."
                className="h-10 w-56 rounded-lg border border-[var(--line)] bg-[#F9FAFB] pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-[var(--muted)]/60 focus:border-[var(--burgundy)] focus:ring-4 focus:ring-[var(--burgundy-soft)]"
              />
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            </div>
            <button
              type="button"
              onClick={() => { setSearchTerm(searchInput.trim()); setCurrentPage(1) }}
              className="inline-flex items-center gap-2 rounded border border-[var(--line)] px-3 py-2.5 text-sm font-bold text-[var(--gold)] transition-colors hover:bg-[var(--burgundy-soft)]"
            >
              Search
            </button>
            {searchTerm && (
              <button
                type="button"
                onClick={() => { setSearchTerm(''); setSearchInput(''); setCurrentPage(1) }}
                className="inline-flex items-center gap-2 rounded border border-[var(--line)] px-3 py-2.5 text-sm font-bold text-[var(--muted)] transition-colors hover:bg-[var(--burgundy-soft)]"
              >
                Clear
              </button>
            )}
            {selectedCount > 0 && (
              <button
                type="button"
                onClick={() => setBulkDeleteConfirm(true)}
                disabled={bulkDeleteMutation.isPending}
                className="inline-flex items-center gap-2 rounded border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
              >
                {bulkDeleteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete Selected ({selectedCount})
              </button>
            )}
            <button
              type="button"
              onClick={() => { setShowImportModal(true); setImportFile(null); setImportResult(null) }}
              className="inline-flex items-center gap-2 rounded border border-[var(--line)] px-3 py-2.5 text-sm font-bold text-[var(--burgundy)] transition-colors hover:bg-[var(--burgundy-soft)]"
            >
              <FileUp className="h-4 w-4" />
              Import
            </button>
            <button
              type="button"
              onClick={() => navigate('/products/new')}
              className="inline-flex items-center gap-2 rounded bg-[var(--gold)] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Add New
            </button>
          </div>
        </div>

        {successMsg && (
          <div className="mt-4 flex items-center gap-2 rounded border border-green-300 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-800">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {successMsg}
          </div>
        )}

        {deleteError && (
          <div className="mt-4 flex items-center gap-2 rounded border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            {deleteError}
          </div>
        )}
      </section>

      <section className="admin-card overflow-hidden rounded-lg">
        {!isLoading && items.length > 0 && (
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3">
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
              <span className="text-[var(--text)]">{totalItems}</span> records
            </p>
            {selectedCount > 0 && (
              <p className="text-sm font-semibold text-[var(--burgundy)]">{selectedCount} selected</p>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-12">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--gold)]" />
            <p className="text-sm font-semibold text-[var(--muted)]">Loading products...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--burgundy-soft)]">
              <Package className="h-7 w-7 text-[var(--burgundy)]" />
            </div>
            <p className="text-sm font-semibold text-[var(--muted)]">No products found</p>
            <button
              type="button"
              onClick={() => navigate('/products/new')}
              className="mt-1 inline-flex items-center gap-2 rounded bg-[var(--gold)] px-4 py-2 text-xs font-bold text-white transition-colors hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" />
              Create First Product
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left text-[15px]">
                <thead className="bg-[var(--panel-strong)] text-[13.5px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  <tr>
                    <th className="w-12 border border-[var(--line)] px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 accent-[#520001] cursor-pointer"
                      />
                    </th>
                    <th className="w-10 border border-[var(--line)] px-2 py-3.5 text-center text-xs font-bold text-[var(--muted)]">S.No</th>
                    <th className="w-16 border border-[var(--line)] px-2 py-3.5 text-center text-xs font-bold text-[var(--muted)]">ID</th>
                    <th className="border border-[var(--line)] px-5 py-3.5 font-bold">Image</th>
                    <th className="border border-[var(--line)] px-5 py-3.5 font-bold">Category</th>
                    <th className="border border-[var(--line)] px-5 py-3.5 font-bold">Subcategory</th>
                    <th className="border border-[var(--line)] px-5 py-3.5 font-bold">Name</th>
                    <th className="border border-[var(--line)] px-5 py-3.5 font-bold">Label</th>
                    <th className="border border-[var(--line)] px-5 py-3.5 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any, idx: number) => {
                    const isExpanded = expanded.has(item.id)
                    const variants = variantData[item.id] || []
                    const isLoadingV = loadingVariants.has(item.id)

                    return [
                      <tr
                        key={`row-${item.id}`}
                        className={`transition-colors ${
                          selectedIds.has(item.id) ? 'bg-[var(--burgundy-soft)]/40' : ''
                        }`}
                      >
                        <td className="w-12 border border-[var(--line)] px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={() => toggleSelect(item.id)}
                            className="h-4 w-4 accent-[#520001] cursor-pointer"
                          />
                        </td>
                        <td className="w-10 border border-[var(--line)] px-2 py-4 text-center text-xs font-bold text-[var(--muted)]">
                          {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                        </td>
                        <td className="w-16 border border-[var(--line)] px-2 py-4 text-center text-xs font-mono text-[var(--muted)]">
                          {item.id}
                        </td>
                        <td className="border border-[var(--line)] px-5 py-4">
                          {item.imageUrl ? (
                            <img
                              src={resolveImageUrl(item.imageUrl)}
                              alt={item.name}
                              className="h-14 w-11 rounded border border-[var(--line)] object-cover"
                            />
                          ) : (
                            <div className="flex h-14 w-11 items-center justify-center rounded border border-[var(--line)] bg-[var(--panel-strong)]">
                              <Package className="h-5 w-5 text-[var(--muted)]" />
                            </div>
                          )}
                        </td>
                        <td className="border border-[var(--line)] px-5 py-4 text-sm text-[var(--muted)]">
                          {item.categoryName || '—'}
                        </td>
                        <td className="border border-[var(--line)] px-5 py-4 text-sm text-[var(--muted)]">
                          {item.subcategoryName || '—'}
                        </td>
                        <td className="max-w-[240px] truncate border border-[var(--line)] px-5 py-4 font-semibold text-[var(--text)]">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleProduct(item.id)}
                              className="shrink-0 rounded p-1 text-[var(--muted)] transition-colors hover:bg-[var(--panel-strong)]"
                              title="Toggle variants"
                            >
                              <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/products/edit/${item.id}`, { state: { item } })}
                              className="truncate hover:text-[var(--gold)] transition-colors"
                            >
                              {item.name}
                            </button>
                          </div>
                        </td>
                        <td className="border border-[var(--line)] px-5 py-4">
                          {item.tag ? (
                            <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                              {item.tag}
                            </span>
                          ) : (
                            <span className="text-[var(--muted)]">—</span>
                          )}
                        </td>
                        <td className="border border-[var(--line)] px-5 py-4">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => toggleProduct(item.id)}
                              title="Toggle variants"
                              className={`rounded border border-[var(--line)] p-2 transition-colors ${isExpanded ? 'bg-blue-50 text-blue-700' : 'text-blue-600 hover:bg-blue-50'}`}
                            >
                              <Layers className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/products/edit/${item.id}`, { state: { item } })}
                              className="rounded border border-[var(--line)] p-2 text-[var(--gold)] transition-colors hover:bg-[var(--burgundy-soft)]"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              disabled={deleteMutation.isPending}
                              className="rounded border border-red-200 p-2 text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
                            >
                              {deleteMutation.isPending && deleteTarget?.id === item.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>,
                      isExpanded && (
                        <tr key={`expand-${item.id}`}>
                          <td colSpan={9} className="border border-[var(--line)] border-t-0 bg-[var(--panel-strong)]/30 p-0">
                            {isLoadingV ? (
                              <div className="flex items-center justify-center gap-2 py-6">
                                <Loader2 className="h-4 w-4 animate-spin text-[var(--gold)]" />
                                <span className="text-sm text-[var(--muted)]">Loading variants...</span>
                              </div>
                            ) : variants.length === 0 ? (
                              <div className="py-6 text-center text-sm text-[var(--muted)]">No variants found.</div>
                            ) : (
                              <table className="w-full border-collapse text-left text-sm">
                                <thead>
                                  <tr className="bg-[var(--panel-strong)] text-[13.5px] font-bold uppercase tracking-wider text-[var(--muted)]">
                                    <th className="w-8 border border-[var(--line)] px-2 py-2 text-center font-bold">#</th>
                                    <th className="border border-[var(--line)] px-4 py-2 font-bold">Variant</th>
                                    <th className="border border-[var(--line)] px-4 py-2 font-bold">Color / Size</th>
                                    <th className="border border-[var(--line)] px-4 py-2 font-bold">SKU</th>
                                    <th className="border border-[var(--line)] px-4 py-2 font-bold">Price</th>
                                    <th className="border border-[var(--line)] px-4 py-2 font-bold">Stock</th>
                                    <th className="border border-[var(--line)] px-4 py-2 font-bold">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {variants.map((v: any, vIdx: number) => {
                                    const hasImage = v.images?.[0]?.imageUrl || v.imageUrl
                                    const isDefault = v.isDefault
                                    return (
                                      <tr key={v.id} className="transition-colors hover:bg-[var(--burgundy-soft)]/20">
                                        <td className="w-8 border border-[var(--line)] px-2 py-2.5 text-center text-xs font-bold text-[var(--muted)]">{vIdx + 1}</td>
                                        <td className="border border-[var(--line)] px-4 py-2.5">
                                          <div className="flex items-center gap-2">
                                            {hasImage && (
                                              <img
                                                src={resolveImageUrl(v.images?.[0]?.imageUrl || v.imageUrl)}
                                                alt=""
                                                className="h-8 w-6 rounded object-cover"
                                              />
                                            )}
                                            <span className="font-medium text-[var(--text)]">{v.label || `#${v.id}`}</span>
                                            {isDefault && (
                                              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">DEFAULT</span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="border border-[var(--line)] px-4 py-2.5">
                                          <div className="flex items-center gap-2">
                                            {v.colorHex && (
                                              <span className="inline-block h-3 w-3 shrink-0 rounded-full border border-[var(--line)]" style={{ backgroundColor: v.colorHex }} />
                                            )}
                                            <span>{[v.colorName, v.size].filter(Boolean).join(' / ') || '—'}</span>
                                          </div>
                                        </td>
                                        <td className="border border-[var(--line)] px-4 py-2.5 text-xs font-mono text-[var(--muted)]">{v.sku || '—'}</td>
                                        <td className="border border-[var(--line)] px-4 py-2.5 font-semibold text-[var(--text)]">
                                          ₹{Number(v.price || 0).toLocaleString('en-IN')}
                                          {v.originalPrice ? <span className="ml-1 text-xs text-[var(--muted)] line-through">₹{Number(v.originalPrice).toLocaleString('en-IN')}</span> : null}
                                        </td>
                                        <td className="border border-[var(--line)] px-4 py-2.5">
                                          <span className={`font-semibold ${Number(v.stockQty) <= 0 ? 'text-red-600' : Number(v.stockQty) <= Number(v.lowStockThreshold ?? 10) ? 'text-amber-600' : 'text-green-600'}`}>
                                            {v.stockQty ?? 0}
                                          </span>
                                        </td>
                                        <td className="border border-[var(--line)] px-4 py-2.5">
                                          {Number(v.stockQty) <= 0 ? (
                                            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">OUT OF STOCK</span>
                                          ) : Number(v.stockQty) <= Number(v.lowStockThreshold ?? 10) ? (
                                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">LOW STOCK</span>
                                          ) : (
                                            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">IN STOCK</span>
                                          )}
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      ),
                    ]
                  }).flat()}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
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
            )}
          </>
        )}
      </section>

      {deleteTarget && (
        <DeleteConfirmDialog
          resourceLabel="Product"
          itemLabel={itemLabel(deleteTarget)}
          pending={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id as string | number)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm py-10">
          <div className="mx-4 w-full max-w-lg rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--burgundy)]">Import Products</h2>
              <button
                type="button"
                onClick={() => { setShowImportModal(false); setImportResult(null); setImportFile(null) }}
                className="rounded p-1 text-[var(--muted)] transition-colors hover:bg-[var(--burgundy-soft)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {importResult ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm">
                  <p className="font-bold text-green-800">Import complete</p>
                  <p className="mt-1 text-green-700">{importResult.created} of {importResult.total} products created.</p>
                </div>
                {importResult.errors.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-bold text-red-700">{importResult.errors.length} error(s):</p>
                    <div className="max-h-48 overflow-y-auto rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {importResult.errors.map((e, i) => (
                        <p key={i} className="py-0.5">Row {e.row}: {e.message}</p>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => { setShowImportModal(false); setImportResult(null); setImportFile(null) }}
                  className="rounded border border-[var(--line)] px-4 py-2 text-sm font-bold text-[var(--burgundy)] transition-colors hover:bg-[var(--gold-soft)]"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-700 space-y-2">
                  <p>Upload an Excel (.xlsx, .xls) or CSV file. Required column: <strong>name</strong>.
                                     Optional columns: code, categoryId, subCategoryId, gender, color, price, originalPrice, stockQty, lowStockThreshold, enableBackInStockNotify, description, tag, washCare, gstRate, featured, isNew, isBestSeller, weightKg, lengthCm, breadthCm, heightCm.</p>
                  <p>Imported products are added as <strong>Draft</strong> (hidden from the storefront) since they have no images yet — add images and set them Active from the product edit page when ready.</p>
                  <a
                    href={downloadSampleImportUrl()}
                    download
                    className="inline-flex items-center gap-1.5 rounded border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                  >
                    Download Sample Excel
                  </a>
                </div>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[var(--line)] bg-[#F9FAFB] px-4 py-10 text-center transition-all hover:border-[var(--burgundy)] hover:bg-[var(--burgundy-soft)]">
                  <FileUp className="h-8 w-8 text-[var(--muted)]" />
                  {importFile ? (
                    <div>
                      <p className="text-sm font-bold text-[var(--text)]">{importFile.name}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">{(importFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-bold text-[var(--text)]">Click to select file</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">.xlsx, .xls, or .csv</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={e => { setImportFile(e.target.files?.[0] || null); setImportResult(null) }}
                  />
                </label>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowImportModal(false); setImportResult(null); setImportFile(null) }}
                    className="rounded border border-[var(--line)] px-4 py-2 text-sm font-bold text-[var(--burgundy)] transition-colors hover:bg-[var(--gold-soft)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (importFile) importMutation.mutate(importFile) }}
                    disabled={!importFile || importMutation.isPending}
                    className="inline-flex items-center gap-2 rounded bg-[var(--burgundy)] px-4 py-2 text-sm font-bold text-white transition-colors hover:opacity-90 disabled:opacity-50"
                  >
                    {importMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileUp className="h-4 w-4" />
                    )}
                    Upload & Import
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {bulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-[var(--burgundy)]">Delete Products</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Are you sure you want to delete{' '}
                  <strong className="text-[var(--text)]">{selectedCount} products</strong>?
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setBulkDeleteConfirm(false)}
                disabled={bulkDeleteMutation.isPending}
                className="rounded border border-[var(--line)] px-4 py-2 text-sm font-bold text-[var(--burgundy)] transition-colors hover:bg-[var(--gold-soft)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
                disabled={bulkDeleteMutation.isPending}
                className="flex items-center gap-2 rounded bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {bulkDeleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {bulkDeleteMutation.isPending ? 'Deleting...' : `Delete ${selectedCount} items`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
