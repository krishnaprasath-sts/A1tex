'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Star, StarHalf, ThumbsUp } from 'lucide-react'
import { checkCanReview, fetchProductReviews, submitReview } from '@/lib/api/storefront'
import { useAuth } from '@/components/auth/AuthContext'
import { resolveImageUrl } from '@/lib/api/client'
import type { Review, ReviewSummary } from '@/lib/api/types'

function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const fullStars = Math.floor(rating)
  const hasHalf = rating - fullStars >= 0.5
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0)
  const cls = size === 'md' ? 'h-5 w-5' : 'h-3.5 w-3.5'
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star key={`full-${i}`} className={`${cls} fill-amber-400 text-amber-400`} />
      ))}
      {hasHalf ? <StarHalf className={`${cls} fill-amber-400 text-amber-400`} /> : null}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Star key={`empty-${i}`} className={`${cls} text-gray-300`} />
      ))}
    </div>
  )
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} type="button" onClick={() => onChange(i)} className="transition hover:scale-110">
          <Star className={`h-7 w-7 ${i <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
        </button>
      ))}
    </div>
  )
}

function ReviewCard({ review }: { review: Review }) {
  const dateStr = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
    : ''
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
      <div className="mb-2 flex items-center justify-between">
        <StarDisplay rating={review.rating} />
        <span className="text-xs text-gray-400">{dateStr}</span>
      </div>
      {review.subject ? (
        <p className="text-sm font-semibold text-gray-800">{review.subject}</p>
      ) : null}
      {review.body ? (
        <p className="mt-1 text-sm leading-relaxed text-gray-600">{review.body}</p>
      ) : null}
      {review.images && review.images.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {review.images.map(img => (
            <img
              key={img.id}
              src={resolveImageUrl(img.imageUrl)}
              alt="Review image"
              className="h-20 w-20 rounded-lg border border-gray-200 object-cover"
            />
          ))}
        </div>
      ) : null}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500">{review.customerName}</span>
        {review.isVerifiedBuyer ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
            <ThumbsUp className="h-2.5 w-2.5" />
            Verified Purchase
          </span>
        ) : null}
      </div>
    </div>
  )
}

type ReviewSectionProps = {
  productId: number
  slug: string
}

export default function ReviewSection({ productId, slug }: ReviewSectionProps) {
  const { session } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [summary, setSummary] = useState<ReviewSummary>({ total: 0, average: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)

  const [canReview, setCanReview] = useState(false)
  const [hasReviewed, setHasReviewed] = useState(false)
  const [checkingCanReview, setCheckingCanReview] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [formRating, setFormRating] = useState(0)
  const [formSubject, setFormSubject] = useState('')
  const [formBody, setFormBody] = useState('')
  const [formImages, setFormImages] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)

  async function loadReviews(page: number) {
    setLoading(true)
    const data = await fetchProductReviews(slug, page)
    setReviews(data.reviews)
    setSummary(data.summary)
    setTotalPages(data.totalPages)
    setCurrentPage(data.page)
    setLoading(false)
  }

  useEffect(() => {
    loadReviews(1)
  }, [slug])

  useEffect(() => {
    if (session) {
      setCheckingCanReview(true)
      checkCanReview(productId).then(res => {
        setCanReview(res.canReview)
        setHasReviewed(res.hasReviewed)
        setCheckingCanReview(false)
      }).catch(() => {
        setCanReview(true)
        setHasReviewed(false)
        setCheckingCanReview(false)
      })
    } else {
      setCanReview(false)
      setHasReviewed(false)
      setCheckingCanReview(false)
    }
  }, [session, productId])

  async function handleSubmitReview() {
    if (formRating === 0) {
      setSubmitError('Please select a rating')
      return
    }
    setSubmitting(true)
    setSubmitError('')
    try {
      await submitReview(productId, { rating: formRating, subject: formSubject, body: formBody }, formImages)
      setSubmitSuccess(true)
      setShowForm(false)
      setFormRating(0)
      setFormSubject('')
      setFormBody('')
      setFormImages([])
      setCanReview(false)
      setHasReviewed(true)
      await loadReviews(1)
      setTimeout(() => setSubmitSuccess(false), 6000)
    } catch (err) {
      setSubmitError((err as Error).message || 'Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  const maxCount = Math.max(...Object.values(summary.distribution), 1)

  return (
    <section className="mb-10 w-full">
      <div className="w-full">
        {/* Summary Header */}
        <div className="mb-6 flex flex-col items-center justify-between rounded-lg border border-[#EFEBE4] bg-[#FDFBF9] p-5 shadow-sm sm:flex-row sm:p-8">
          <div className="mb-4 text-center sm:mb-0 sm:text-left">
            <h3 className="mb-2 text-xl font-medium text-gray-800">Customer Experiences</h3>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <div className="flex gap-0.5 text-[#F5B50A]">
                <StarDisplay rating={summary.average} size="md" />
              </div>
              <span className="text-sm text-gray-500">
                {summary.average > 0 ? summary.average.toFixed(1) : '0.0'} / 5
              </span>
              <span className="text-sm text-gray-400">·</span>
              <span className="text-sm text-gray-500">
                Based on {summary.total} {summary.total === 1 ? 'review' : 'reviews'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!session ? (
              <a
                href={`/login?redirect=${encodeURIComponent(`/products/${slug}`)}`}
                className="rounded-full bg-black px-7 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 shadow-sm"
              >
                Write a review
              </a>
            ) : canReview && !showForm ? (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="rounded-full bg-black px-7 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 shadow-sm cursor-pointer"
              >
                Write a review
              </button>
            ) : null}
            {hasReviewed ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-4 py-2 text-sm font-medium text-green-700 border border-green-200">
                <ThumbsUp className="h-4 w-4" />
                Reviewed
              </span>
            ) : null}
          </div>
        </div>

        {submitSuccess && !showForm && (
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm font-medium text-green-800">
            <ThumbsUp className="h-4 w-4 shrink-0 text-green-600" />
            Your review has been submitted successfully. Thank you for your feedback!
          </div>
        )}

        {/* Rating Distribution */}
        {summary.total > 0 ? (
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
            <h4 className="mb-3 text-sm font-semibold text-gray-700">Rating Breakdown</h4>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map(rating => {
                const count = summary.distribution[rating] || 0
                const pct = maxCount > 0 ? (count / maxCount) * 100 : 0
                return (
                  <div key={rating} className="flex items-center gap-3">
                    <span className="w-4 text-right text-xs font-medium text-gray-500">{rating}</span>
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-6 text-right text-xs text-gray-400">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        {/* Review Form */}
        {showForm ? (
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
            <h4 className="mb-4 text-base font-semibold text-gray-800">Write Your Review</h4>
            {submitSuccess ? (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                <ThumbsUp className="h-4 w-4" />
                Your review has been submitted and is pending moderation. Thank you!
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <p className="mb-1.5 text-sm font-medium text-gray-700">Rating *</p>
                  <StarPicker value={formRating} onChange={setFormRating} />
                </div>
                <div className="mb-4">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Subject (optional)</label>
                  <input
                    type="text"
                    value={formSubject}
                    onChange={e => setFormSubject(e.target.value)}
                    placeholder="Summarize your experience..."
                    maxLength={255}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-[#A34336] focus:ring-1 focus:ring-[#A34336]"
                  />
                </div>
                <div className="mb-4">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Review (optional)</label>
                  <textarea
                    value={formBody}
                    onChange={e => setFormBody(e.target.value)}
                    placeholder="Share your experience with this product..."
                    rows={4}
                    maxLength={5000}
                    className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-[#A34336] focus:ring-1 focus:ring-[#A34336]"
                  />
                </div>
                <div className="mb-4">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Images (optional, max 5)</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/svg+xml"
                    multiple
                    onChange={e => {
                      const files = Array.from(e.target.files || [])
                      setFormImages(files.slice(0, 5))
                    }}
                    className="w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-[#A34336] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:opacity-90"
                  />
                  {formImages.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {formImages.map((f, i) => (
                        <div key={i} className="relative">
                          <img
                            src={URL.createObjectURL(f)}
                            alt=""
                            className="h-16 w-16 rounded-lg border border-gray-200 object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setFormImages(prev => prev.filter((_, j) => j !== i))}
                            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
                {submitError ? (
                  <p className="mb-3 text-sm font-medium text-red-600">{submitError}</p>
                ) : null}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleSubmitReview}
                    disabled={submitting || formRating === 0}
                    className="flex items-center gap-2 rounded-lg bg-black px-6 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {submitting ? 'Submitting…' : 'Submit Review'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setSubmitError(''); setFormRating(0); setFormSubject(''); setFormBody('') }}
                    disabled={submitting}
                    className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}

        {/* Reviews List */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader2 className="h-5 w-5 animate-spin text-[#A34336]" />
            <span className="text-sm text-gray-500">Loading reviews…</span>
          </div>
        ) : reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map(review => (
              <ReviewCard key={review.id} review={review} />
            ))}
            {totalPages > 1 ? (
              <div className="flex items-center justify-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => loadReviews(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <span className="text-sm text-gray-500">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => loadReviews(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>
        ) : summary.total === 0 && !showForm ? (
          <div className="rounded-lg border border-dashed border-gray-300 py-10 text-center">
            <Star className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm font-semibold text-gray-700">No reviews yet</p>
            {session ? (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-3">Be the first to share your experience with this product!</p>
                {canReview ? (
                  <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="inline-flex items-center rounded-full bg-black px-6 py-2.5 text-xs font-medium text-white transition hover:bg-gray-800 cursor-pointer shadow-xs"
                  >
                    Write a review
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-3">Be the first to share your experience!</p>
                <a
                  href={`/login?redirect=${typeof window !== 'undefined' ? encodeURIComponent(window.location.pathname) : ''}`}
                  className="inline-flex items-center rounded-full bg-black px-6 py-2.5 text-xs font-medium text-white transition hover:bg-gray-800 shadow-xs"
                >
                  Sign in to write a review
                </a>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  )
}
