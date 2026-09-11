import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Star,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from 'lucide-react'
import { createReview, deleteReview, listResource, listReviews, moderateReview } from '../services/api'
import { displayValue } from './ResourceShared'
import { resolveImageUrl } from '../services/api'

const ITEMS_PER_PAGE = 20

const statusTabs = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
] as const

const statusBadgeClass: Record<string, string> = {
  pending: 'admin-badge admin-badge-warning',
  approved: 'admin-badge admin-badge-success',
  rejected: 'admin-badge admin-badge-muted',
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i <= rating ? 'fill-amber-400 text-amber-400' : 'fill-none text-gray-300'}`}
        />
      ))}
    </div>
  )
}

export default function ReviewsPage() {
  const queryClient = useQueryClient()
  const [currentPage, setCurrentPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<Record<string, unknown> | null>(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [imageList, setImageList] = useState<string[]>([])
  const [imageIndex, setImageIndex] = useState(0)

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newProductId, setNewProductId] = useState<number | string>('')
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newRating, setNewRating] = useState(5)
  const [newSubject, setNewSubject] = useState('')
  const [newBody, setNewBody] = useState('')
  const [newStatus, setNewStatus] = useState<'approved' | 'pending'>('approved')
  const [newIsVerifiedBuyer, setNewIsVerifiedBuyer] = useState(true)
  const [addError, setAddError] = useState('')

  const { data: productsData } = useQuery({
    queryKey: ['admin-products-for-reviews'],
    queryFn: () => listResource('products', 1, 100),
    enabled: isAddModalOpen,
  })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reviews', currentPage, search, statusFilter],
    queryFn: () => listReviews(currentPage, ITEMS_PER_PAGE, { search, status: statusFilter || undefined }),
  })

  const items = data?.items || []
  const totalItems = data?.total ?? items.length
  const totalPages = data?.totalPages ?? Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE))

  const moderateMut = useMutation({
    mutationFn: (args: { id: number | string; action: 'approve' | 'reject' }) =>
      moderateReview(args.id, args.action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
      setSuccessMsg('Review moderated successfully.')
      setTimeout(() => setSuccessMsg(''), 4000)
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number | string) => deleteReview(id),
    onSuccess: () => {
      setConfirmDelete(null)
      setSuccessMsg('Review deleted successfully.')
      setTimeout(() => setSuccessMsg(''), 4000)
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
    },
  })

  const createMut = useMutation({
    mutationFn: createReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
      setIsAddModalOpen(false)
      setNewProductId('')
      setNewCustomerName('')
      setNewRating(5)
      setNewSubject('')
      setNewBody('')
      setSuccessMsg('Review created successfully.')
      setTimeout(() => setSuccessMsg(''), 4000)
    },
    onError: (err: any) => {
      setAddError(err.message || 'Failed to create review')
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
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[var(--burgundy)]">
              Moderation
            </p>
            <h1 className="mt-2 flex items-center gap-3 font-display text-3xl font-semibold text-[var(--gold)] md:text-4xl">
              <MessageSquare className="h-7 w-7 md:h-8 md:w-8" />
              Reviews
            </h1>
          </div>
          <button
            type="button"
            onClick={() => { setIsAddModalOpen(true); setAddError('') }}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--burgundy)] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Review
          </button>
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

      {/* Search + Filter */}
      <section className="admin-card rounded-lg p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-2">
            {statusTabs.map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleStatusFilter(tab.key)}
                className={`rounded-md px-4 py-2 text-sm font-bold transition-colors ${
                  statusFilter === tab.key
                    ? 'bg-[var(--burgundy-soft)] text-[var(--burgundy)] shadow-sm'
                    : 'text-[var(--muted)] hover:bg-[var(--panel-strong)] hover:text-[var(--text)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search by product name or code..."
              className="admin-input w-full min-w-[200px] rounded border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm md:w-auto"
            />
            <button
              type="button"
              onClick={handleSearch}
              className="inline-flex items-center gap-2 rounded bg-[var(--gold)] px-4 py-2 text-sm font-bold text-white transition-colors hover:opacity-90"
            >
              <Search className="h-4 w-4" />
              Search
            </button>
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="admin-card overflow-hidden rounded-lg">
        {!isLoading && items.length > 0 ? (
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3">
            <p className="text-[14.5px] font-semibold text-[var(--muted)]">
              Showing{' '}
              <span className="text-[var(--text)]">{Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalItems)}</span>
              {' '}to{' '}
              <span className="text-[var(--text)]">{Math.min(currentPage * ITEMS_PER_PAGE, totalItems)}</span>
              {' '}of{' '}
              <span className="text-[var(--text)]">{totalItems}</span>{' '}
              {totalItems === 1 ? 'review' : 'reviews'}
            </p>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-[15px]">
            <thead className="border-b border-[var(--line)] bg-[var(--panel-strong)] text-[13.5px] font-bold uppercase tracking-wider text-[var(--muted)]">
              <tr>
                <th className="px-5 py-3.5 font-bold">S.No</th>
                <th className="px-5 py-3.5 font-bold">Product</th>
                <th className="px-5 py-3.5 font-bold">Customer</th>
                <th className="px-5 py-3.5 font-bold">Rating</th>
                <th className="px-5 py-3.5 font-bold">Review</th>
                <th className="px-5 py-3.5 font-bold">Images</th>
                <th className="px-5 py-3.5 font-bold">Status</th>
                <th className="px-5 py-3.5 font-bold">Date</th>
                <th className="px-5 py-3.5 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, idx: number) => {
                const serialNo = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1
                const product = item.Product || {}
                const customer = item.Customer || {}
                const isPending = item.status === 'pending'

                return (
                  <tr
                    key={item.id}
                    className="admin-table-row border-b border-[var(--line)] last:border-0"
                  >
                    <td className="px-5 py-4 font-semibold text-[var(--muted)]">{serialNo}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {product.imageUrl ? (
                          <img
                            src={resolveImageUrl(product.imageUrl)}
                            alt=""
                            className="h-10 w-8 shrink-0 rounded object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-8 shrink-0 items-center justify-center rounded bg-[var(--burgundy-soft)] text-[10px] font-bold text-[var(--burgundy)]">
                            {((product.name || '')[0] || '?').toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[var(--burgundy)]">{product.name || '–'}</p>
                          {product.code ? <p className="text-[11px] text-[var(--muted)]">{product.code}</p> : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold">{customer.name || '–'}</p>
                      {customer.email ? <p className="text-[11px] text-[var(--muted)]">{customer.email}</p> : null}
                    </td>
                    <td className="px-5 py-4">
                      <StarRating rating={item.rating} />
                    </td>
                    <td className="max-w-[260px] px-5 py-4">
                      {item.subject ? (
                        <p className="text-sm font-semibold">{item.subject}</p>
                      ) : null}
                      {item.body ? (
                        <p className="mt-0.5 truncate text-[13px] text-[var(--muted)]">{item.body}</p>
                      ) : null}
                    </td>
                    <td className="px-5 py-4">
                      {item.images && item.images.length > 0 ? (
                        <div className="flex gap-1">
                          {item.images.map((img: any, imgIdx: number) => {
                            const url = resolveImageUrl(img.imageUrl)
                            return (
                              <button
                                key={img.id}
                                type="button"
                                onClick={() => {
                                  setImageList(item.images.map((i: any) => resolveImageUrl(i.imageUrl)))
                                  setImageIndex(imgIdx)
                                  setSelectedImage(url)
                                }}
                              >
                                <img
                                  src={url}
                                  alt=""
                                  className="h-10 w-10 rounded border border-[var(--line)] object-cover cursor-pointer transition-opacity hover:opacity-80"
                                />
                              </button>
                            )
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--muted)]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={statusBadgeClass[item.status] || 'admin-badge'}>
                        {displayValue(item.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-[var(--muted)]">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '–'}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1.5 flex-nowrap">
                        {isPending ? (
                          <>
                            <button
                              type="button"
                              onClick={() => moderateMut.mutate({ id: item.id, action: 'approve' })}
                              disabled={moderateMut.isPending}
                              className="rounded border border-green-200 p-1.5 text-green-700 transition-colors hover:bg-green-50 disabled:opacity-50"
                              title="Approve"
                            >
                              {moderateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => moderateMut.mutate({ id: item.id, action: 'reject' })}
                              disabled={moderateMut.isPending}
                              className="rounded border border-red-200 p-1.5 text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
                              title="Reject"
                            >
                              <ThumbsDown className="h-4 w-4" />
                            </button>
                          </>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(item)}
                          disabled={deleteMut.isPending}
                          className="rounded border border-red-200 p-1.5 text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
                          title="Delete"
                        >
                          {deleteMut.isPending && confirmDelete?.id === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {!items.length && !isLoading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--burgundy-soft)]">
                        <MessageSquare className="h-7 w-7 text-[var(--burgundy)]" />
                      </div>
                      <p className="text-sm font-semibold text-[var(--muted)]">No reviews found</p>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

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
        ) : null}

        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-12">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--gold)]" />
            <p className="text-sm font-semibold text-[var(--muted)]">Loading reviews…</p>
          </div>
        ) : null}
      </section>

      {/* Image Lightbox */}
      {selectedImage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setSelectedImage(null) }}
            className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
          >
            <X className="h-6 w-6" />
          </button>

          {imageList.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  const next = (imageIndex - 1 + imageList.length) % imageList.length
                  setImageIndex(next)
                  setSelectedImage(imageList[next])
                }}
                className="absolute left-4 z-10 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  const next = (imageIndex + 1) % imageList.length
                  setImageIndex(next)
                  setSelectedImage(imageList[next])
                }}
                className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          ) : null}

          <img
            src={selectedImage}
            alt="Review image"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          {imageList.length > 1 ? (
            <p className="absolute bottom-6 rounded-full bg-black/50 px-4 py-1.5 text-sm font-semibold text-white">
              {imageIndex + 1} / {imageList.length}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Delete Confirmation */}
      {confirmDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-[var(--burgundy)]">Delete Review</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Are you sure you want to delete this review? This action cannot be undone.
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--text)]">
                  Customer: {(confirmDelete as any).Customer?.name || 'Unknown'}
                </p>
              </div>
            </div>
            {deleteMut.isError ? (
              <p className="mt-3 text-sm font-semibold text-red-600">{(deleteMut.error as Error).message}</p>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                disabled={deleteMut.isPending}
                className="rounded border border-[var(--line)] px-4 py-2 text-sm font-bold text-[var(--burgundy)] transition-colors hover:bg-[var(--gold-soft)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMut.mutate(confirmDelete.id as number)}
                disabled={deleteMut.isPending}
                className="flex items-center gap-2 rounded bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {deleteMut.isPending ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Add Review Modal */}
      {isAddModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-[var(--line)] bg-[var(--panel)] p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3 mb-4">
              <h3 className="text-lg font-bold text-[var(--burgundy)]">Add New Review</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--line)] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {addError && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-700">
                {addError}
              </div>
            )}

            <form
              onSubmit={e => {
                e.preventDefault()
                if (!newProductId) {
                  setAddError('Please select a product')
                  return
                }
                setAddError('')
                createMut.mutate({
                  productId: newProductId,
                  customerName: newCustomerName.trim() || undefined,
                  rating: newRating,
                  subject: newSubject.trim(),
                  body: newBody.trim(),
                  status: newStatus,
                  isVerifiedBuyer: newIsVerifiedBuyer,
                })
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1">
                  Product *
                </label>
                <select
                  value={newProductId}
                  onChange={e => setNewProductId(e.target.value)}
                  className="admin-input w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select a product...</option>
                  {productsData?.items?.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.code ? `(${p.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={newCustomerName}
                  onChange={e => setNewCustomerName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="admin-input w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1">
                  Rating *
                </label>
                <div className="flex gap-2 items-center">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewRating(star)}
                      className="cursor-pointer transition hover:scale-110"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          star <= newRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-xs font-bold text-[var(--text)]">{newRating} / 5</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1">
                  Subject / Headline
                </label>
                <input
                  type="text"
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  placeholder="e.g. Beautiful silk texture and fast delivery!"
                  className="admin-input w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1">
                  Review Text
                </label>
                <textarea
                  rows={3}
                  value={newBody}
                  onChange={e => setNewBody(e.target.value)}
                  placeholder="Write customer feedback here..."
                  className="admin-input w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1">
                    Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value as any)}
                    className="admin-input w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm"
                  >
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1">
                    Verified Buyer
                  </label>
                  <label className="flex items-center gap-2 mt-2 text-xs font-semibold text-[var(--text)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newIsVerifiedBuyer}
                      onChange={e => setNewIsVerifiedBuyer(e.target.checked)}
                      className="rounded"
                    />
                    Mark as Verified Purchase
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-[var(--line)]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-bold text-[var(--muted)] hover:bg-[var(--line)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMut.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--burgundy)] px-5 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {createMut.isPending ? 'Saving...' : 'Save Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
