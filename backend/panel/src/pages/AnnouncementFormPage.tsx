import { FormEvent, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, Loader2, Megaphone, Plus } from 'lucide-react'
import { createResource, listResource, updateResource } from '../services/api'
import type { ResourceConfig } from '../app/resources'
import { resources } from '../app/resources'

const config: ResourceConfig = resources.find(r => r.api === 'announcement-messages')!

export default function AnnouncementFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const queryClient = useQueryClient()

  const isEdit = Boolean(id)
  const stateItem = (location.state as { item?: Record<string, unknown> } | null)?.item || null

  const { data: listData, isLoading: isFetchingList } = useQuery({
    queryKey: ['resource', config.api],
    queryFn: () => listResource(config.api),
  })

  const editItem = isEdit
    ? stateItem || listData?.items?.find((i: any) => String(i.id) === id) || null
    : null

  const isLoadingItem = (isEdit && !stateItem && isFetchingList)

  const [text, setText] = useState(editItem ? String(editItem.text || '') : '')
  const [active, setActive] = useState(editItem ? Boolean(editItem.active) : true)

  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // If editItem loads late, update state
  useEffect(() => {
    if (editItem && !touched.initialized) {
      setText(String(editItem.text || ''))
      setActive(Boolean(editItem.active ?? true))
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
      navigate(config.path, { state: { successMsg: `Announcement bar ${isEdit ? 'updated' : 'created'} successfully.` } })
    },
  })

  const validate = () => {
    const errors: Record<string, string> = {}
    
    // Message Field
    const trimmedText = text.trim()
    if (!trimmedText) {
      errors.text = 'Announcement message is required.'
    } else if (trimmedText.length < 5) {
      errors.text = 'Message must be at least 5 characters long.'
    } else if (trimmedText.length > 200) {
      errors.text = 'Message cannot exceed 200 characters.'
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
    setTouched({ text: true })
    if (!isValid) return

    const payload = {
      text: text.trim(),
      active,
    }
    saveMutation.mutate(payload)
  }

  if (isLoadingItem) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--gold)]" />
        <p className="text-sm font-semibold text-[var(--muted)]">Loading…</p>
      </div>
    )
  }

  const getInputClass = (field: string) => {
    const baseClass = "admin-input rounded w-full transition-colors duration-200"
    if (touched[field] && errors[field]) {
      return `${baseClass} border-red-500 focus:border-red-500 focus:ring-red-500`
    }
    return baseClass
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Breadcrumb */}
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

      {/* Form Card */}
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
                {isEdit ? 'Update' : 'Create'} Announcement Bar
              </h1>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="p-6 md:p-8">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Message Field */}
            <div className="md:col-span-2 space-y-2">
              <label className="block text-[14px] font-bold uppercase tracking-widest text-[var(--muted)]">
                Message <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={text}
                onChange={e => setText(e.target.value)}
                onBlur={() => handleBlur('text')}
                placeholder="Enter announcement message"
                className={getInputClass('text')}
              />
              {touched.text && errors.text && (
                <p className="text-xs font-semibold text-red-600">{errors.text}</p>
              )}
            </div>

            {/* Active */}
            <div className="space-y-2 flex flex-col justify-end">
              <label className="flex h-[42px] items-center gap-3 rounded border border-[var(--line)] bg-[var(--panel-strong)] px-4">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={e => setActive(e.target.checked)}
                  className="h-4 w-4 accent-[#520001]"
                />
                <span className="text-sm font-semibold text-[var(--text)]">Active</span>
              </label>
            </div>

          </div>

          {saveMutation.isError && (
            <div className="mt-6 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {saveMutation.error instanceof Error ? saveMutation.error.message : 'Unable to save item.'}
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
              disabled={!isValid || saveMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded bg-[var(--gold)] px-6 py-2.5 text-sm font-bold uppercase tracking-[0.14em] text-white transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saveMutation.isPending ? 'Saving…' : isEdit ? 'Update Announcement Bar' : 'Create Announcement Bar'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
