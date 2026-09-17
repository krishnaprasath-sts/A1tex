import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Boxes, ChevronLeft, ChevronRight, Edit3, ExternalLink, HelpCircle, Info, Loader2, Plus, Search, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'
import { deleteResource, listResource, resolveImageUrl, storefrontBaseUrl, updateResource } from '../services/api'
import { DeleteConfirmDialog } from './ResourceShared'

const ITEMS_PER_PAGE = 100

export default function CategoriesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<Record<string, unknown> | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set())
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [filterParent, setFilterParent] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [showGuide, setShowGuide] = useState(true)
  const [togglingId, setTogglingId] = useState<number | null>(null)

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
    queryKey: ['resource', 'categories', currentPage],
    queryFn: () => listResource('categories', currentPage, ITEMS_PER_PAGE),
  })

  const allItems = (data?.items || []) as any[]

  // Parent categories lookup map
  const parentCategories = useMemo(() => allItems.filter(c => !c.parentId), [allItems])
  const parentMap = useMemo(() => {
    const map = new Map<number, any>()
    for (const p of parentCategories) {
      map.set(p.id, p)
    }
    return map
  }, [parentCategories])

  // Filter items by parent collection and search query
  const items = useMemo(() => {
    let list = allItems
    if (filterParent === 'parents') {
      list = list.filter(c => !c.parentId)
    } else if (filterParent !== 'all') {
      list = list.filter(c => String(c.parentId) === filterParent)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.slug || '').toLowerCase().includes(q) ||
        (c.section || '').toLowerCase().includes(q)
      )
    }
    list.sort((a, b) => {
      const parentA = a.parentId || a.id
      const parentB = b.parentId || b.id
      
      if (parentA !== parentB) {
        return parentA - parentB
      }
      
      if (!a.parentId && b.parentId) return -1
      if (a.parentId && !b.parentId) return 1
      
      return a.id - b.id
    })

    return list
  }, [allItems, filterParent, searchQuery])

  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE))

  const [deleteError, setDeleteError] = useState('')
  const [dialogError, setDialogError] = useState('')

  // Quick toggle mutation for navVisible / active
  const toggleMutation = useMutation({
    mutationFn: ({ id, field, value }: { id: number; field: string; value: boolean; item?: any }) => {
      return updateResource('categories', id, { [field]: value })
    },
    onSuccess: () => {
      setTogglingId(null)
      queryClient.invalidateQueries({ queryKey: ['resource', 'categories'] })
      refetch()
    },
    onError: (err: Error) => {
      setTogglingId(null)
      setDeleteError(`Toggle failed: ${err.message}`)
      setTimeout(() => setDeleteError(''), 4000)
    },
  })

  const handleToggle = (item: any, field: string) => {
    setTogglingId(item.id)
    toggleMutation.mutate({
      id: item.id,
      field,
      value: !item[field],
      item,
    })
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteResource('categories', id),
    onSuccess: () => {
      setDeleteTarget(null)
      setDeleteError('')
      setDialogError('')
      setSelectedIds(new Set())
      setSuccessMsg('Category deleted successfully.')
      queryClient.invalidateQueries({ queryKey: ['resource', 'categories'] })
      refetch()
    },
    onError: (err: Error) => {
      setDialogError(err.message || 'Failed to delete this category.')
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: (string | number)[]) => {
      return Promise.allSettled(ids.map(id => deleteResource('categories', id)))
    },
    onSuccess: () => {
      setBulkDeleteConfirm(false)
      setSelectedIds(new Set())
      setSuccessMsg('Selected categories deleted.')
      queryClient.invalidateQueries({ queryKey: ['resource', 'categories'] })
      refetch()
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

  // Count children per parent for stats
  const childCountMap = useMemo(() => {
    const map = new Map<number, number>()
    for (const item of allItems) {
      if (item.parentId) {
        map.set(item.parentId, (map.get(item.parentId) || 0) + 1)
      }
    }
    return map
  }, [allItems])

  return (
    <div className="space-y-6">
      <section className="admin-card rounded-lg p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[var(--burgundy)]">
              Product Categories & Collections
            </p>
            <h1 className="mt-2 flex items-center gap-3 font-display text-3xl font-semibold text-[var(--gold)] md:text-4xl">
              <Boxes className="h-7 w-7 md:h-8 md:w-8" />
              Categories & Collections
            </h1>
          </div>
          <div className="flex gap-2">
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
              onClick={() => navigate('/categories/new')}
              className="inline-flex items-center gap-2 rounded bg-[var(--gold)] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Add New
            </button>
          </div>
        </div>

        {/* How Navbar Works — Info Guide */}
        {showGuide && (
          <div className="mt-5 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50/80 px-4 py-3">
            <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-bold text-blue-900">How the Storefront Navbar Works</p>
              <ul className="mt-1 space-y-0.5 text-xs text-blue-800/80">
                <li>• <strong>Top-level categories</strong> (no parent) with <strong>Nav Visible = ON</strong> appear as navbar items on the storefront.</li>
                <li>• <strong>Child categories</strong> (under a parent) with <strong>Nav Visible = ON</strong> appear in the dropdown menu under their parent.</li>
                <li>• Click the <strong>toggle switch</strong> in the "Nav Visible" column below to quickly show/hide any category from the navbar.</li>
              </ul>
            </div>
            <button type="button" onClick={() => setShowGuide(false)} className="text-blue-400 hover:text-blue-600">
              <span className="text-lg leading-none">&times;</span>
            </button>
          </div>
        )}

        {/* Filter Pills & Search Bar */}
        <div className="mt-5 flex flex-col gap-4 border-t border-[var(--line)] pt-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setFilterParent('all')}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                filterParent === 'all'
                  ? 'bg-[var(--burgundy)] text-white shadow-sm'
                  : 'border border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--gold)] hover:text-[var(--text)]'
              }`}
            >
              All ({allItems.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterParent('parents')}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                filterParent === 'parents'
                  ? 'bg-[var(--burgundy)] text-white shadow-sm'
                  : 'border border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--gold)] hover:text-[var(--text)]'
              }`}
            >
              Parent Collections ({parentCategories.length})
            </button>
            {parentCategories.map(p => {
              const childCount = allItems.filter(c => c.parentId === p.id).length
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setFilterParent(String(p.id))}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                    filterParent === String(p.id)
                      ? 'bg-[var(--burgundy)] text-white shadow-sm'
                      : 'border border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--gold)] hover:text-[var(--text)]'
                  }`}
                >
                  {p.name} ({childCount})
                </button>
              )
            })}
          </div>

          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-[var(--line)] bg-white py-1.5 pl-9 pr-3 text-sm text-[var(--text)] placeholder-[var(--muted)] outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
            />
          </div>
        </div>

        {deleteError && (
          <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {deleteError}
          </div>
        )}

        {successMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 p-4 text-sm font-semibold text-green-700">
            {successMsg}
          </div>
        )}
      </section>

      <section className="admin-card overflow-hidden rounded-lg">
        {!isLoading && items.length > 0 && (
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3">
            <p className="text-[14.5px] font-semibold text-[var(--muted)]">
              Showing{' '}
              <span className="text-[var(--text)]">
                {items.length}
              </span>
              {' '}of{' '}
              <span className="text-[var(--text)]">{allItems.length}</span> total categories
            </p>
            {selectedCount > 0 && (
              <p className="text-sm font-semibold text-[var(--burgundy)]">{selectedCount} selected</p>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-12">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--gold)]" />
            <p className="text-sm font-semibold text-[var(--muted)]">Loading categories...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--burgundy-soft)]">
              <Boxes className="h-7 w-7 text-[var(--burgundy)]" />
            </div>
            <p className="text-sm font-semibold text-[var(--muted)]">No matching categories found</p>
            {(searchQuery || filterParent !== 'all') && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setFilterParent('all') }}
                className="mt-1 text-xs font-bold text-[var(--burgundy)] hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] border-collapse text-left text-[15px]">
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
                    <th className="w-12 border border-[var(--line)] px-2 py-3.5 text-center text-xs font-bold text-[var(--muted)]">S.No</th>
                    <th className="w-16 border border-[var(--line)] px-3 py-3.5 text-center font-bold">Image</th>
                    <th className="border border-[var(--line)] px-5 py-3.5 font-bold">Category Name</th>
                    <th className="border border-[var(--line)] px-5 py-3.5 font-bold">Type</th>
                    <th className="border border-[var(--line)] px-5 py-3.5 font-bold">Slug</th>
                    <th className="border border-[var(--line)] px-4 py-3.5 text-center font-bold">
                      <span className="flex items-center justify-center gap-1">
                        Nav Visible
                        <span className="group relative cursor-help">
                          <HelpCircle className="h-3 w-3 text-[var(--muted)]" />
                          <span className="absolute bottom-full left-1/2 z-20 mb-1.5 hidden w-52 -translate-x-1/2 rounded border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-[10px] font-medium normal-case tracking-normal text-[var(--text)] shadow-lg group-hover:block">
                            Click the toggle to show/hide this category from the storefront navbar
                          </span>
                        </span>
                      </span>
                    </th>
                    <th className="border border-[var(--line)] px-4 py-3.5 text-center font-bold">Active</th>
                    <th className="border border-[var(--line)] px-5 py-3.5 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any, idx: number) => {
                    const parent = item.parentId ? parentMap.get(item.parentId) : null
                    const resolvedImg = resolveImageUrl(item.imageUrl)
                    const isChild = Boolean(item.parentId)
                    const childCount = childCountMap.get(item.id) || 0
                    const isToggling = togglingId === item.id
                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors hover:bg-slate-50/60 ${
                        selectedIds.has(item.id) ? "bg-[var(--burgundy-soft)]/20" : ""
                      }`}
                      >
                        <td className="w-12 border border-[var(--line)] px-4 py-3.5">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={() => toggleSelect(item.id)}
                            className="h-4 w-4 accent-[#520001] cursor-pointer"
                          />
                        </td>
                        <td className="w-12 border border-[var(--line)] px-2 py-3.5 text-center text-xs font-bold text-[var(--muted)]">
                          {idx + 1}
                        </td>
                        <td className="w-16 border border-[var(--line)] px-3 py-3.5 text-center">
                          {item.imageUrl ? (
                            <img
                              src={resolvedImg}
                              alt=""
                              className="mx-auto h-10 w-8 rounded object-cover shadow-xs"
                            />
                          ) : (
                            <span className="text-xs text-[var(--muted)]">—</span>
                          )}
                        </td>
                        <td className="border border-[var(--line)] px-5 py-3.5">
                          <div className={isChild ? 'pl-4 border-l-2 border-[var(--gold)]/30' : ''}>
                            <p className="font-semibold text-[var(--text)]">{item.name}</p>
                            {!isChild ? (
                              <span className="mt-0.5 inline-block rounded bg-[#F0FDF4] px-2 py-0.5 text-[10px] font-bold text-[#15803D] border border-[#86EFAC]/60">
                                Top-Level{childCount > 0 ? ` · ${childCount} children` : ''}
                              </span>
                            ) : (
                              <span className="mt-0.5 inline-block rounded bg-[#FFF7ED] px-2 py-0.5 text-[10px] font-bold text-[#C2410C] border border-[#FDBA74]/60">
                                ↳ {parent?.name || `Parent #${item.parentId}`}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="border border-[var(--line)] px-5 py-3.5">
                          {!isChild ? (
                            <span className="inline-block rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                              Collection
                            </span>
                          ) : (
                            <span className="inline-block rounded-md bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-200">
                              Sub Category
                            </span>
                          )}
                        </td>
                        <td className="border border-[var(--line)] px-5 py-3.5 text-xs text-[var(--muted)] font-mono">
                          {item.slug}
                        </td>
                        <td className="border border-[var(--line)] px-4 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggle(item, 'navVisible')}
                            disabled={isToggling}
                            className="group inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition-all hover:shadow-sm disabled:opacity-50"
                            title={item.navVisible ? 'Click to hide from navbar' : 'Click to show in navbar'}
                          >
                            {isToggling ? (
                              <Loader2 className="h-4 w-4 animate-spin text-[var(--muted)]" />
                            ) : item.navVisible ? (
                              <>
                                <ToggleRight className="h-5 w-5 text-emerald-600" />
                                <span className="text-emerald-700">ON</span>
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="h-5 w-5 text-slate-400" />
                                <span className="text-slate-400">OFF</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="border border-[var(--line)] px-4 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggle(item, 'active')}
                            disabled={isToggling}
                            className="group inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition-all hover:shadow-sm disabled:opacity-50"
                            title={item.active ? 'Click to deactivate' : 'Click to activate'}
                          >
                            {isToggling ? (
                              <Loader2 className="h-4 w-4 animate-spin text-[var(--muted)]" />
                            ) : item.active !== false ? (
                              <>
                                <ToggleRight className="h-5 w-5 text-emerald-600" />
                                <span className="text-emerald-700">ON</span>
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="h-5 w-5 text-slate-400" />
                                <span className="text-slate-400">OFF</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="border border-[var(--line)] px-5 py-3.5 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => navigate(`/categories/edit/${item.id}`, { state: { item } })}
                              title="Edit Category / Collection"
                              className="rounded border border-[var(--line)] p-2 text-[var(--gold)] transition-colors hover:bg-[var(--burgundy-soft)]"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <a
                              href={`${storefrontBaseUrl}${item.href && item.href !== '#' ? item.href : `/collections/${item.slug}`}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="View Collection on Storefront"
                              className="rounded border border-[var(--line)] p-2 text-[var(--gold)] transition-colors hover:bg-[var(--burgundy-soft)]"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              className="rounded border border-red-200 p-2 text-red-700 transition-colors hover:bg-red-50"
                              title="Delete Category"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[var(--line)] px-5 py-3">
                <p className="text-xs text-[var(--muted)]">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex items-center gap-1 rounded border border-[var(--line)] px-3 py-1.5 text-[13px] font-bold text-[var(--gold)] transition-colors hover:bg-[var(--burgundy-soft)] disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center gap-1 rounded border border-[var(--line)] px-3 py-1.5 text-[13px] font-bold text-[var(--gold)] transition-colors hover:bg-[var(--burgundy-soft)] disabled:opacity-50"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <DeleteConfirmDialog
          resourceLabel="Category"
          itemLabel={String(deleteTarget.name || `#${deleteTarget.id}`)}
          pending={deleteMutation.isPending}
          errorMessage={dialogError}
          onCancel={() => {
            setDeleteTarget(null)
            setDialogError("")
          }}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id as string | number)}
        />
      )}

      {/* Bulk Delete Confirmation */}
      {bulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-[var(--burgundy)]">
                  Delete Categories
                </h3>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Are you sure you want to delete{" "}
                  <strong className="text-[var(--text)]">{selectedCount} categories</strong>?
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
                {bulkDeleteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {bulkDeleteMutation.isPending ? "Deleting…" : `Delete ${selectedCount} items`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
