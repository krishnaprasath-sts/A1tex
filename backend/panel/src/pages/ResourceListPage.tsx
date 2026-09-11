import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Edit3, Loader2, Plus, Trash2, AlertTriangle } from 'lucide-react'
import type { ResourceConfig } from '../app/resources'
import { bulkDeleteResource, deleteResource, listResource } from '../services/api'
import { DeleteConfirmDialog, itemLabel, TableCell } from './ResourceShared'


export default function ResourceListPage({ config }: { config: ResourceConfig }) {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const ITEMS_PER_PAGE = config.api === 'categories' ? 100 : 20
  const [deleteTarget, setDeleteTarget] = useState<Record<string, unknown> | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set())
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)

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
    queryKey: ['resource', config.api, currentPage],
    queryFn: () => listResource(config.api, currentPage, ITEMS_PER_PAGE),
  })

  const items = data?.items || []

  useEffect(() => {
    setCurrentPage(1)
    setSelectedIds(new Set())
  }, [config.api])

  useEffect(() => {
    setSelectedIds(new Set())
  }, [currentPage])

  const totalItems = data?.total ?? items.length
  const totalPages = data?.totalPages ?? Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE))

  const [deleteError, setDeleteError] = useState('')

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteResource(config.api, id),
    onSuccess: () => {
      setDeleteTarget(null)
      setDeleteError('')
      setSelectedIds(new Set())
      setSuccessMsg(`${config.title} deleted successfully.`)
      queryClient.invalidateQueries({ queryKey: ['resource', config.api] })
    },
    onError: (err: Error) => {
      setDeleteTarget(null)
      setDeleteError(err.message || 'Failed to delete. Please try again.')
      setTimeout(() => setDeleteError(''), 6000)
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: (string | number)[]) => bulkDeleteResource(config.api, ids),
    onSuccess: (result) => {
      setBulkDeleteConfirm(false)
      setSelectedIds(new Set())
      setDeleteError('')
      const deletedCount = result.succeeded.length
      if (result.failed > 0) {
        setSuccessMsg(`Deleted ${deletedCount} ${config.title}. ${result.failed} failed.`)
        if (result.failed === result.succeeded.length + result.failed) {
          setDeleteError('Selected items could not be found in the database. Try refreshing the list.')
        } else {
          setDeleteError(`${result.failed} item(s) failed to delete.`)
        }
        setTimeout(() => setDeleteError(''), 8000)
      } else {
        setSuccessMsg(`${deletedCount} ${config.title} deleted successfully.`)
      }
      queryClient.invalidateQueries({ queryKey: ['resource', config.api] })
    },
    onError: (err: Error) => {
      setBulkDeleteConfirm(false)
      setDeleteError(err.message || 'Failed to delete selected items.')
      setTimeout(() => setDeleteError(''), 6000)
    },
  })

  const visibleColumns = useMemo(() => config.columns, [config.columns])

  const basePath = config.path.replace('/', '')

  const allSelected = items.length > 0 && items.every((item: any) => selectedIds.has(item.id))

  const toggleSelect = (id: string | number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map((item: any) => item.id)))
    }
  }

  const selectedCount = selectedIds.size

  return (
    <div className="space-y-6">
      {/* ─── Page Header ──────────────────────────────────── */}
      <section className="admin-card rounded-lg p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[var(--burgundy)]">
              {config.eyebrow}
            </p>
            <h1 className="mt-2 flex items-center gap-3 font-display text-3xl font-semibold text-[var(--gold)] md:text-4xl">
              <config.Icon className="h-7 w-7 md:h-8 md:w-8" />
              {config.title}
            </h1>
          </div>
          <div className="flex gap-2">
            {!config.hideActions && selectedCount > 0 && (
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
            {!config.hideAddNew && (
              <button
                type="button"
                onClick={() => navigate(`/${basePath}/new`)}
                className="inline-flex items-center gap-2 rounded bg-[var(--gold)] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                Add New
              </button>
            )}
          </div>
        </div>

        {/* Success toast */}
        {successMsg ? (
          <div className="admin-toast mt-4 flex items-center gap-2 rounded border border-green-300 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-800 dark:bg-green-950/30 dark:text-green-300">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {successMsg}
          </div>
        ) : null}

        {deleteError ? (
          <div className="admin-toast mt-4 flex items-center gap-2 rounded border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            {deleteError}
          </div>
        ) : null}
      </section>

      {/* ─── Data Table ───────────────────────────────────── */}
      <section className="admin-card overflow-hidden rounded-lg">
        {/* Record count bar */}
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
            {!config.hideActions && selectedCount > 0 && (
              <p className="text-sm font-semibold text-[var(--burgundy)]">
                {selectedCount} selected
              </p>
            )}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-[15px]">
            <thead className="border-b border-[var(--line)] bg-[var(--panel-strong)] text-[13.5px] font-bold uppercase tracking-wider text-[var(--muted)]">
              <tr>
                {!config.hideActions && (
                  <th className="w-12 px-4 py-3.5">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 accent-[#520001] cursor-pointer"
                      aria-label="Select all"
                    />
                  </th>
                )}
                {!config.hideSerialNumber && (
                  <th className="px-5 py-3.5 font-bold">S.No</th>
                )}
                {visibleColumns.map(column => (
                  <th key={column} className="px-5 py-3.5 font-bold">
                    {column}
                  </th>
                ))}
                {!config.hideActions && (
                  <th className="px-5 py-3.5 font-bold">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, idx: number) => (
                <tr
                  key={item.id ?? item.code ?? Math.random()}
                  className={`admin-table-row border-b border-[var(--line)] last:border-0 transition-colors ${
                    selectedIds.has(item.id) ? 'bg-[var(--burgundy-soft)]/40' : ''
                  }`}
                >
                  {!config.hideActions && (
                    <td className="w-12 px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="h-4 w-4 accent-[#520001] cursor-pointer"
                        aria-label={`Select ${itemLabel(item)}`}
                      />
                    </td>
                  )}
                  {!config.hideSerialNumber && (
                    <td className="px-5 py-4 font-semibold text-[var(--muted)]">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                  )}
                  {visibleColumns.map(column => (
                    <TableCell key={column} column={column} item={item} items={data?.items} />
                  ))}
                  {!config.hideActions && (
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        {!config.hideEdit && (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/${basePath}/edit/${item.id}`, { state: { item } })
                            }
                            className="rounded border border-[var(--line)] p-2 text-[var(--gold)] transition-colors hover:bg-[var(--burgundy-soft)]"
                            aria-label={`Edit ${itemLabel(item)}`}
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          disabled={deleteMutation.isPending}
                          className="rounded border border-red-200 p-2 text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/20"
                          aria-label={`Delete ${itemLabel(item)}`}
                        >
                          {deleteMutation.isPending && deleteTarget?.id === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}

              {/* Empty state */}
              {!items.length && !isLoading ? (
                <tr>
                  <td
                    colSpan={(config.hideActions ? 0 : 1) + (config.hideSerialNumber ? 0 : 1) + visibleColumns.length + (config.hideActions ? 0 : 1)}
                    className="px-5 py-16 text-center"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--burgundy-soft)]">
                        <config.Icon className="h-7 w-7 text-[var(--burgundy)]" />
                      </div>
                      <p className="text-sm font-semibold text-[var(--muted)]">
                        No {config.title.toLowerCase()} found
                      </p>
                      {!config.hideAddNew && (
                        <button
                          type="button"
                          onClick={() => navigate(`/${basePath}/new`)}
                          className="mt-1 inline-flex items-center gap-2 rounded bg-[var(--gold)] px-4 py-2 text-xs font-bold text-white transition-colors hover:opacity-90"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Create First Entry
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
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
        ) : null}

        {/* Loading state */}
        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-12">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--gold)]" />
            <p className="text-sm font-semibold text-[var(--muted)]">
              Loading {config.title.toLowerCase()}…
            </p>
          </div>
        ) : null}
      </section>

      {/* ─── Single Delete Confirmation ───────────────────── */}
      {deleteTarget ? (
        <DeleteConfirmDialog
          resourceLabel={config.title}
          itemLabel={itemLabel(deleteTarget)}
          pending={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id as string | number)}
          onCancel={() => setDeleteTarget(null)}
        />
      ) : null}

      {/* ─── Bulk Delete Confirmation ─────────────────────── */}
      {bulkDeleteConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-[var(--burgundy)]">
                  Delete {config.title}
                </h3>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Are you sure you want to delete{' '}
                  <strong className="text-[var(--text)]">{selectedCount} {config.title.toLowerCase()}</strong>?
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
                {bulkDeleteMutation.isPending ? 'Deleting…' : `Delete ${selectedCount} items`}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
