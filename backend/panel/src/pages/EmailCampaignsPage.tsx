import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CheckCircle,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Loader2,
  Mail,
  Megaphone,
  Search,
  Send,
  Square,
  Users,
  X,
} from 'lucide-react'
import { apiFetch, listCampaignCustomers, resolveImageUrl, uploadImage } from '../services/api'

/* ─── Types ──────────────────────────────────────────────── */

interface Campaign {
  id: number
  type: string
  subject: string
  content: string | null
  imageUrl: string | null
  productIds: number[] | null
  status: 'draft' | 'sent'
  recipientCount: number
  sentAt: string | null
  createdAt: string
  createdBy: number | null
}

interface CampaignListResponse {
  campaigns: Campaign[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

/* ─── Simple Type Badge ─────────────────────────────────── */

function TypeBadge({ type }: { type: string }) {
  const isGeneral = type === 'general'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
      isGeneral ? 'bg-purple-50 text-purple-700' : 'bg-gray-50 text-gray-600'
    }`}>
      <Mail className="h-3 w-3" />
      {isGeneral ? 'General' : type}
    </span>
  )
}

/* ─── Main Page ──────────────────────────────────────────── */

export default function EmailCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  // Compose form
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sent campaigns pagination
  const [campaignPage, setCampaignPage] = useState(1)
  const [campaignsTotal, setCampaignsTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const CAMPAIGNS_PER_PAGE = 10

  // Preview modal / Confirmation dialog
  const [showPreview, setShowPreview] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Customer picker
  const [recipientType, setRecipientType] = useState<'all' | 'selected'>('all')
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<number>>(new Set())
  const [customers, setCustomers] = useState<Array<{ id: number; name: string; email: string }>>([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [customersLoading, setCustomersLoading] = useState(false)
  const [customerPage, setCustomerPage] = useState(1)
  const [customersTotal, setCustomersTotal] = useState(0)
  const [customersTotalPages, setCustomersTotalPages] = useState(0)
  const customerSearchTimer = useRef<ReturnType<typeof setTimeout>>()

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 5000)
  }

  const fetchCampaigns = useCallback(async (page: number) => {
    setLoading(true)
    try {
      const data = await apiFetch<CampaignListResponse>(`/admin/email-campaigns?page=${page}&perPage=${CAMPAIGNS_PER_PAGE}`)
      setCampaigns(data.campaigns || [])
      setCampaignsTotal(data.total || 0)
      setTotalPages(data.totalPages || 0)
    } catch {
      showToast('error', 'Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCampaigns(campaignPage)
  }, [fetchCampaigns, campaignPage])

  const fetchCustomers = useCallback(async (page: number, search: string) => {
    setCustomersLoading(true)
    try {
      const data = await listCampaignCustomers(page, 50, search || undefined)
      setCustomers(data.customers || [])
      setCustomersTotal(data.total || 0)
      setCustomersTotalPages(data.totalPages || 0)
    } catch {
      showToast('error', 'Failed to load customers')
    } finally {
      setCustomersLoading(false)
    }
  }, [])

  useEffect(() => {
    if (recipientType === 'selected') {
      fetchCustomers(customerPage, customerSearch)
    }
  }, [recipientType, customerPage, customerSearch, fetchCustomers])

  const handleCustomerSearch = (value: string) => {
    setCustomerSearch(value)
    setCustomerPage(1)
    clearTimeout(customerSearchTimer.current)
    customerSearchTimer.current = setTimeout(() => {
      fetchCustomers(1, value)
    }, 300)
  }

  const toggleCustomer = (id: number) => {
    setSelectedCustomerIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllVisible = () => {
    const allVisibleIds = customers.map(c => c.id)
    setSelectedCustomerIds(prev => {
      const allSelected = allVisibleIds.every(id => prev.has(id))
      if (allSelected) {
        const next = new Set(prev)
        allVisibleIds.forEach(id => next.delete(id))
        return next
      }
      const next = new Set(prev)
      allVisibleIds.forEach(id => next.add(id))
      return next
    })
  }

  const resetForm = () => {
    setSubject('')
    setContent('')
    setImageUrl(null)
    setImageFile(null)
    setRecipientType('all')
    setSelectedCustomerIds(new Set())
    setCustomerSearch('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setUploading(true)
    try {
      const result = await uploadImage(file)
      setImageUrl(result.file.path)
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to upload image')
      setImageFile(null)
    } finally {
      setUploading(false)
    }
  }

  const removeImage = () => {
    setImageUrl(null)
    setImageFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSend = async () => {
    if (!subject.trim()) return
    if (!content.trim()) return

    setSending(true)
    setShowConfirm(false)
    try {
      await apiFetch('/admin/email-campaigns/send-general', {
        method: 'POST',
        body: JSON.stringify({
          subject: subject.trim(),
          content: content.trim() || null,
          imageUrl: imageUrl || null,
          recipientType,
          customerIds: recipientType === 'selected' ? Array.from(selectedCustomerIds) : undefined,
        }),
      })
      resetForm()
      setCampaignPage(1)
      fetchCampaigns(1)
      showToast('success', 'Campaign sent successfully!')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to send campaign')
    } finally {
      setSending(false)
    }
  }

  const canSend = subject.trim().length >= 3 && content.trim().length > 0 && (recipientType === 'all' || selectedCustomerIds.size > 0)

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg px-5 py-3 text-sm font-semibold shadow-2xl transition-all ${
          toast.type === 'success' ? 'bg-green-700 text-white' : 'bg-red-700 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* ── Page Header ───────────────────────────────────── */}
      <section className="admin-card overflow-hidden rounded-lg p-6 md:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[var(--burgundy)]">
          Marketing
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-[var(--gold)] sm:text-4xl">
          Email Campaigns
        </h1>
        <p className="mt-2.5 max-w-xl text-[16px] leading-relaxed text-[var(--muted)]">
          Compose and send email notifications to all customers or a selected group.
        </p>
      </section>

      {/* ── Compose Section ───────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-[14px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
          New Campaign
        </h2>
        <div className="admin-card rounded-lg p-6 space-y-5">
          {/* Subject */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              Subject Line
            </label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Enter email subject..."
              className="admin-input w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--muted)]"
            />
          </div>

          {/* Content */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              Email Content <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={6}
              placeholder="Write your message here..."
              className="admin-input w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--muted)] resize-y"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              Banner Image <span className="font-normal normal-case text-[var(--muted)]">(optional)</span>
            </label>
            {imageUrl && !uploading ? (
              <div className="relative inline-block rounded-lg overflow-hidden border border-[var(--line)]">
                <img
                  src={resolveImageUrl(imageUrl)}
                  alt="Campaign banner"
                  className="max-h-48 w-auto object-cover"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition-colors hover:bg-[var(--panel-strong)] disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
                  )}
                  {uploading ? 'Uploading...' : 'Upload Image'}
                </button>
              </div>
            )}
          </div>

          {/* Customer Selection */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              Recipients
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="recipientType"
                  checked={recipientType === 'all'}
                  onChange={() => setRecipientType('all')}
                  className="accent-[var(--burgundy)]"
                />
                <span className="text-sm font-semibold text-[var(--text)]">All customers</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="recipientType"
                  checked={recipientType === 'selected'}
                  onChange={() => setRecipientType('selected')}
                  className="accent-[var(--burgundy)]"
                />
                <span className="text-sm font-semibold text-[var(--text)]">Select customers</span>
              </label>
            </div>

            {recipientType === 'selected' && (
              <div className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--bg)]">
                {/* Search bar */}
                <div className="flex items-center gap-2 border-b border-[var(--line)] px-3 py-2">
                  <Search className="h-4 w-4 text-[var(--muted)]" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={e => handleCustomerSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--muted)] outline-none"
                  />
                  {selectedCustomerIds.size > 0 && (
                    <span className="rounded-full bg-[var(--burgundy)] px-2 py-0.5 text-[11px] font-bold text-white">
                      {selectedCustomerIds.size} selected
                    </span>
                  )}
                </div>

                {/* Customer list */}
                <div className="max-h-64 overflow-y-auto">
                  {customersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-[var(--gold)]" />
                    </div>
                  ) : customers.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-center">
                      <Users className="mb-2 h-8 w-8 text-[var(--line)]" />
                      <p className="text-sm text-[var(--muted)]">
                        {customerSearch ? 'No customers match your search.' : 'No eligible customers found.'}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Select all / deselect all */}
                      <label className="flex items-center gap-3 border-b border-[var(--line)]/50 px-3 py-2.5 hover:bg-[var(--panel-strong)] cursor-pointer">
                        <button
                          type="button"
                          onClick={toggleAllVisible}
                          className="flex-shrink-0"
                        >
                          {customers.every(c => selectedCustomerIds.has(c.id)) ? (
                            <CheckSquare className="h-4 w-4 text-[var(--burgundy)]" />
                          ) : (
                            <Square className="h-4 w-4 text-[var(--muted)]" />
                          )}
                        </button>
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                          {customers.every(c => selectedCustomerIds.has(c.id)) ? 'Deselect all' : 'Select all'} ({customersTotal})
                        </span>
                      </label>
                      {customers.map(c => (
                        <label
                          key={c.id}
                          className="flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--panel-strong)] cursor-pointer"
                        >
                          <button
                            type="button"
                            onClick={() => toggleCustomer(c.id)}
                            className="flex-shrink-0"
                          >
                            {selectedCustomerIds.has(c.id) ? (
                              <CheckSquare className="h-4 w-4 text-[var(--burgundy)]" />
                            ) : (
                              <Square className="h-4 w-4 text-[var(--muted)]" />
                            )}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-[var(--text)]">{c.name}</p>
                            <p className="truncate text-xs text-[var(--muted)]">{c.email}</p>
                          </div>
                        </label>
                      ))}
                    </>
                  )}
                </div>

                {/* Pagination */}
                {customersTotalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-[var(--line)] px-3 py-2">
                    <span className="text-[11px] text-[var(--muted)]">
                      Page {customerPage} of {customersTotalPages}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={customerPage <= 1}
                        onClick={() => setCustomerPage(p => Math.max(1, p - 1))}
                        className="rounded border border-[var(--line)] px-2 py-1 text-[11px] text-[var(--muted)] hover:bg-[var(--panel-strong)] disabled:opacity-40"
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        disabled={customerPage >= customersTotalPages}
                        onClick={() => setCustomerPage(p => Math.min(customersTotalPages, p + 1))}
                        className="rounded border border-[var(--line)] px-2 py-1 text-[11px] text-[var(--muted)] hover:bg-[var(--panel-strong)] disabled:opacity-40"
                      >
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-[var(--line)] pt-5">
            <p className="text-xs text-[var(--muted)]">
              {canSend
                ? recipientType === 'all'
                  ? 'Ready to send to all active, verified customers.'
                  : `Ready to send to ${selectedCustomerIds.size} selected customer${selectedCustomerIds.size === 1 ? '' : 's'}.`
                : `Enter a subject (min 3 chars), content, and select recipients to enable sending.`}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={!canSend}
                onClick={() => setShowPreview(true)}
                className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-4 py-2 text-sm font-bold text-[var(--text)] transition-colors hover:bg-[var(--panel-strong)] disabled:opacity-50"
              >
                Preview
              </button>
              <button
                type="button"
                disabled={!canSend || sending}
                onClick={() => setShowConfirm(true)}
                className="flex items-center gap-2 rounded-lg bg-[var(--burgundy)] px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-[var(--burgundy-dark)] disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {sending ? 'Sending...' : recipientType === 'all' ? 'Send to All Customers' : `Send to ${selectedCustomerIds.size} Customer${selectedCustomerIds.size === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Confirm Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[var(--burgundy)]">Send Campaign</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Send "<strong>{subject}</strong>" to{' '}
              {recipientType === 'all'
                ? 'all active, verified customers'
                : `${selectedCustomerIds.size} selected customer${selectedCustomerIds.size === 1 ? '' : 's'}`}?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={sending}
                className="rounded border border-[var(--line)] px-4 py-2 text-sm font-bold text-[var(--burgundy)] transition-colors hover:bg-[var(--gold-soft)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                className="flex items-center gap-2 rounded bg-[var(--burgundy)] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[var(--burgundy-dark)] disabled:opacity-50"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-2xl rounded-lg border border-[var(--line)] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-800">Email Preview</h3>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-6">
              {/* Email frame */}
              <div style={{ maxWidth: 600, margin: '0 auto', background: '#ffffff', borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                {/* Header — logo area */}
                <div style={{ background: '#f8fafc', textAlign: 'center', padding: '24px 40px 8px' }}>
                  <span style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', fontFamily: 'sans-serif' }}>A1 <span style={{ color: '#FCB900' }}>TEX</span></span>
                </div>
                {/* Banner image */}
                {imageUrl && (
                  <div style={{ width: '100%', maxHeight: 240, overflow: 'hidden' }}>
                    <img
                      src={resolveImageUrl(imageUrl)}
                      alt="Campaign banner"
                      style={{ width: '100%', height: 'auto', objectFit: 'cover', display: 'block' }}
                    />
                  </div>
                )}
                {/* Body */}
                <div style={{ padding: '36px 40px 20px' }}>
                  <p style={{ margin: '0 0 20px', color: '#0F172A', fontSize: 16 }}>
                    Hi <strong>Customer</strong>,
                  </p>
                  {content && (
                    <p style={{ margin: '0 0 24px', color: '#555', fontSize: 15, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                      {content}
                    </p>
                  )}
                  <p style={{ margin: 0, color: '#555', fontSize: 14, lineHeight: 1.6 }}>
                    Thank you for being a valued member of the A1 TEX family.
                  </p>
                  <p style={{ margin: '16px 0 0', color: '#555', fontSize: 14, lineHeight: 1.6 }}>
                    Visit our store to explore more!
                  </p>
                  <div style={{ marginTop: 24, textAlign: 'center' }}>
                    <a href="#" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#0284c7,#0369a1)', color: '#ffffff', padding: '14px 40px', borderRadius: 8, textDecoration: 'none', fontSize: 15, fontWeight: 700, letterSpacing: 1 }}>Visit Store →</a>
                  </div>
                </div>
                {/* Footer */}
                <div style={{ background: '#faf7f2', padding: '20px 40px', borderTop: '1px solid #e8dcc4', textAlign: 'center' }}>
                  <p style={{ margin: 0, color: '#999', fontSize: 11 }}>You received this email because you are a registered member of A1 TEX.</p>
                  <p style={{ margin: '6px 0 0', color: '#bbb', fontSize: 10 }}>Unsubscribe from marketing emails.</p>
                  <p style={{ margin: '2px 0 0', color: '#bbb', fontSize: 10 }}>&copy; {new Date().getFullYear()} A1 TEX. All rights reserved.</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={() => { setShowPreview(false); setShowConfirm(true) }}
                className="flex items-center gap-2 rounded-lg bg-[var(--burgundy)] px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-[var(--burgundy-dark)]"
              >
                <Send className="h-4 w-4" />
                Send
              </button>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="rounded border border-[var(--line)] px-4 py-2 text-sm font-bold text-[var(--burgundy)] transition-colors hover:bg-[var(--gold-soft)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sent Campaigns ────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[14px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
            Sent Campaigns ({campaignsTotal})
          </h2>
        </div>

        <div className="admin-card overflow-hidden rounded-lg">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--gold)]" />
              <span className="ml-2 text-sm text-[var(--muted)]">Loading campaigns...</span>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Megaphone className="mb-3 h-12 w-12 text-[var(--line)]" />
              <p className="text-lg font-semibold text-[var(--text)]">No campaigns sent yet</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Compose and send your first email campaign above.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--line)] bg-[var(--panel-strong)]">
                      <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Type</th>
                      <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Subject</th>
                      <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Recipients</th>
                      <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Status</th>
                      <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Sent At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map(c => (
                      <tr key={c.id} className="border-b border-[var(--line)]/50 last:border-0">
                        <td className="whitespace-nowrap px-5 py-3.5">
                          <TypeBadge type={c.type} />
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5">
                          <span className="text-[13px] font-semibold text-[var(--text)]">{c.subject}</span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-[13px] text-[var(--muted)]">
                          {c.recipientCount.toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5">
                          {c.status === 'draft' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-yellow-700">
                              Draft
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-green-700">
                              <CheckCircle className="h-3 w-3" />
                              Sent
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-[12px] text-[var(--muted)]">
                          {c.sentAt
                            ? new Date(c.sentAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-[var(--line)] px-5 py-3">
                  <span className="text-[12px] text-[var(--muted)]">
                    Page {campaignPage} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={campaignPage <= 1}
                      onClick={() => setCampaignPage(p => Math.max(1, p - 1))}
                      className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-[12px] font-semibold text-[var(--muted)] transition-colors hover:bg-[var(--panel-strong)] disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={campaignPage >= totalPages}
                      onClick={() => setCampaignPage(p => Math.min(totalPages, p + 1))}
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
    </div>
  )
}
