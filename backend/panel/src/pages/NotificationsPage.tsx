import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Send,
} from 'lucide-react'
import { listStockNotifications, markStockNotified, sendStockNotifyMessage } from '../services/api'

const ITEMS_PER_PAGE = 20

export default function NotificationsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [messageModal, setMessageModal] = useState<{
    id: number
    email: string
    customerName: string | null
    productName: string
    variantLabel: string | null
  } | null>(null)
  const [messageText, setMessageText] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['stock-notifications', page],
    queryFn: () => listStockNotifications(page, ITEMS_PER_PAGE),
  })

  const [sendResult, setSendResult] = useState<{ message: string; emailSent: boolean; emailError: string | null } | null>(null)

  const sendMutation = useMutation({
    mutationFn: ({ id, message }: { id: number; message: string }) =>
      sendStockNotifyMessage(id, message),
    onSuccess: (data: any) => {
      setSendResult({
        message: data.message || 'Message sent.',
        emailSent: data.emailSent ?? true,
        emailError: data.emailError ?? null,
      })
      setMessageText('')
      queryClient.invalidateQueries({ queryKey: ['stock-notifications'] })
    },
  })

  const markMutation = useMutation({
    mutationFn: (id: number | string) => markStockNotified(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-notifications'] })
    },
  })

  const items = (data?.items ?? []) as any[]
  const totalPages = data?.totalPages ?? 1
  const total = data?.total ?? 0

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--gold)]">Products</p>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-[var(--heading)]">
          <Bell className="h-5 w-5 text-[var(--gold)]" />
          Back-in-Stock Notifications
        </h1>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--gold)]" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Bell className="mb-3 h-12 w-12 text-[var(--muted)]" />
          <p className="text-sm font-medium text-[var(--muted)]">No notification requests yet</p>
          <p className="text-xs text-[var(--muted)]">Customers who want stock updates will appear here.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-white dark:bg-[var(--card-bg)]">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3">S.No</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Variant</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {items.map((n: any, idx: number) => (
                  <tr key={n.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-[var(--muted)]">{(page - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">
                      {new Date(n.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-[var(--heading)]">{n.customerName || 'Guest'}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{n.email}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{n.phone || '-'}</td>
                    <td className="px-4 py-3 text-[var(--heading)]">{n.productName}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{n.variantLabel || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        n.status === 'notified'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {n.status === 'notified' ? 'Notified' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setMessageText('')
                            setSendResult(null)
                            setMessageModal({
                              id: n.id,
                              email: n.email,
                              customerName: n.customerName || null,
                              productName: n.productName,
                              variantLabel: n.variantLabel || null,
                            })
                          }}
                          className="flex items-center gap-1.5 rounded bg-violet-600 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white transition hover:bg-violet-700"
                        >
                          <Send className="h-3 w-3" />
                          Message
                        </button>
                        {n.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => markMutation.mutate(n.id)}
                            disabled={markMutation.isPending}
                            className="rounded bg-green-600 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white transition hover:bg-green-700 disabled:opacity-50"
                          >
                            Mark Notified
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-[var(--muted)]">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="flex items-center gap-1 rounded border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] transition hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="flex items-center gap-1 rounded border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] transition hover:bg-gray-50 disabled:opacity-40"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {sendMutation.isError && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {(sendMutation.error as any)?.message || 'Failed to send message.'}
        </div>
      )}

      {messageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-[var(--card-bg)]">
            <h3 className="mb-1 text-lg font-semibold text-[var(--heading)]">Send Message to Customer</h3>
            <p className="mb-4 text-sm text-[var(--muted)]">
              {messageModal.productName}
              {messageModal.variantLabel ? ` (${messageModal.variantLabel})` : ''}
              &mdash; {messageModal.customerName || messageModal.email}
            </p>

            <label className="mb-1 block text-sm font-medium text-[var(--heading)]">Message</label>
            <textarea
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              placeholder="Type your message to the customer..."
              rows={5}
              className="mb-4 w-full resize-none rounded border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-gray-800"
            />
            <p className="mb-5 text-xs text-[var(--muted)]">
              This message will be emailed to the customer.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setMessageModal(null); setSendResult(null); setMessageText('') }}
                className="flex-1 rounded border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sendMutation.isPending || !messageText.trim()}
                onClick={() => sendMutation.mutate({ id: messageModal.id, message: messageText.trim() })}
                className="flex items-center justify-center gap-1.5 flex-1 rounded bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:opacity-50"
              >
                {sendMutation.isPending ? <>Sending...</> : <><Send className="h-4 w-4" /> Send Message</>}
              </button>
            </div>

            {sendResult && (
              <div className={`mt-3 rounded p-2 text-center text-sm font-medium ${sendResult.emailSent ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'}`}>
                {sendResult.emailSent
                  ? 'Message sent to customer!'
                  : sendResult.emailError
                    ? `Message failed to send: ${sendResult.emailError}`
                    : sendResult.message}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
