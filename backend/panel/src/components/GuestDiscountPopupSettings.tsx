import { FormEvent, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Info, Loader2, Tag } from 'lucide-react'
import { apiFetch, listResource } from '../services/api'

export default function GuestDiscountPopupSettings() {
  const queryClient = useQueryClient()

  const { data: listData, isLoading: isFetching } = useQuery({
    queryKey: ['resource', 'settings'],
    queryFn: () => listResource('settings'),
  })

  const existingGuestPopup = listData?.items?.find((i: any) => i.key === 'guest_discount_popup')
  const guestPopupValue = (existingGuestPopup?.value || {}) as Record<string, any>

  const [guestPopupEnabled, setGuestPopupEnabled] = useState(false)
  const [guestPopupDiscount, setGuestPopupDiscount] = useState('')
  const [guestPopupMessage, setGuestPopupMessage] = useState('')

  useEffect(() => {
    if (!isFetching) {
      setGuestPopupEnabled(Boolean(guestPopupValue.enabled))
      setGuestPopupDiscount(guestPopupValue.discountPercentage ? String(guestPopupValue.discountPercentage) : '10')
      setGuestPopupMessage(guestPopupValue.message || 'Register now and get {percentage}% OFF on your purchase!')
    }
  }, [isFetching, existingGuestPopup])

  const saveGuestPopup = useMutation({
    mutationFn: async () => {
      const discountPercentage = Math.min(100, Math.max(0, Number(guestPopupDiscount) || 0))
      const body = {
        key: 'guest_discount_popup',
        value: {
          enabled: guestPopupEnabled,
          discountPercentage,
          message: guestPopupMessage.trim() || 'Register now and get {percentage}% OFF on your purchase!',
        },
      }
      if (existingGuestPopup?.id) {
        return apiFetch(`/admin/settings/${existingGuestPopup.id}`, { method: 'PUT', body: JSON.stringify(body) })
      }
      return apiFetch('/admin/settings', { method: 'POST', body: JSON.stringify(body) })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource', 'settings'] })
    },
  })

  useEffect(() => {
    if (saveGuestPopup.isSuccess) {
      const timer = setTimeout(() => {
        saveGuestPopup.reset()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [saveGuestPopup.isSuccess, saveGuestPopup])

  function handleGuestPopupSubmit(e: FormEvent) {
    e.preventDefault()
    saveGuestPopup.mutate()
  }

  const guestPopupPreview = guestPopupMessage.replace(
    '{percentage}',
    String(guestPopupDiscount || 0),
  )

  if (isFetching) {
    return (
      <section className="admin-card rounded-lg p-6">
        <div className="flex min-h-[120px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--burgundy)]" />
        </div>
      </section>
    )
  }

  return (
    <section className="admin-card rounded-lg p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--burgundy)]/10 text-[var(--burgundy)]">
          <Tag className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Guest Discount Popup</h2>
          <p className="text-sm text-gray-500">Manage the registration discount popup shown to guest visitors</p>
        </div>
      </div>

      <div className={`mb-6 rounded-lg border p-4 ${guestPopupEnabled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex items-start gap-3">
          <Info className={`mt-0.5 h-4 w-4 shrink-0 ${guestPopupEnabled ? 'text-green-600' : 'text-gray-400'}`} />
          <div>
            <p className={`text-sm font-semibold ${guestPopupEnabled ? 'text-green-800' : 'text-gray-700'}`}>
              {guestPopupEnabled ? 'Guest Discount Popup is Enabled' : 'Guest Discount Popup is Disabled'}
            </p>
            <p className={`mt-1 text-sm ${guestPopupEnabled ? 'text-green-700' : 'text-gray-500'}`}>
              {guestPopupEnabled
                ? 'Guests (not logged in) will see this popup with the message below.'
                : 'Guests will not see any discount popup.'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleGuestPopupSubmit} className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="space-y-5">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={guestPopupEnabled}
              onChange={e => setGuestPopupEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[var(--burgundy)] focus:ring-[var(--burgundy)]"
            />
            <span className="text-sm font-medium text-gray-700">Enable Guest Discount Popup</span>
          </label>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Discount Percentage (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={guestPopupDiscount}
              onChange={e => setGuestPopupDiscount(e.target.value)}
              className="w-full max-w-xs rounded border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[var(--burgundy)] focus:ring-1 focus:ring-[var(--burgundy)]/30"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Popup Message</label>
            <input
              type="text"
              value={guestPopupMessage}
              onChange={e => setGuestPopupMessage(e.target.value)}
              placeholder="Register now and get {percentage}% OFF on your purchase!"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[var(--burgundy)] focus:ring-1 focus:ring-[var(--burgundy)]/30"
            />
            <p className="mt-2 text-xs text-gray-500">
              Use <code className="rounded bg-gray-100 px-1">{'{percentage}'}</code> as a placeholder — it will be replaced with the discount percentage above.
            </p>
            <p className="mt-2 text-xs text-amber-700">Preview: {guestPopupPreview}</p>
            <p className="mt-3 text-xs text-gray-500">
              When enabled, this discount is applied automatically — no code entry needed — at checkout for a
              customer's first-ever order, as long as they're registered and logged in. Customers can still
              manually switch to a real coupon code instead if one is available. No separate coupon needs to be
              created for this — the percentage above is all that's needed.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            disabled={saveGuestPopup.isPending}
            className="inline-flex items-center gap-2 rounded bg-[var(--burgundy)] px-5 py-2 text-sm font-medium text-white transition hover:bg-[var(--burgundy-dark)] disabled:opacity-50"
          >
            {saveGuestPopup.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save
          </button>
          {saveGuestPopup.isSuccess && <span className="text-sm text-green-600 font-medium">Saved!</span>}
          {saveGuestPopup.isError && <span className="text-sm text-red-500">{saveGuestPopup.error.message}</span>}
        </div>
      </form>
    </section>
  )
}
