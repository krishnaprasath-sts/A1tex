import { FormEvent, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, Loader2, Plus } from 'lucide-react'
import type { ResourceConfig } from '../app/resources'
import { createResource, listResource, updateResource } from '../services/api'
import { coerceValue, FieldControl, itemLabel as getItemLabel, singularTitle } from './ResourceShared'

export default function ResourceFormPage({ config }: { config: ResourceConfig }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [error, setError] = useState('')

  const isEdit = Boolean(id)
  const singular = singularTitle(config.title)
  const stateItem = (location.state as { item?: Record<string, unknown> } | null)?.item || null

  // Fetch item when editing via direct URL (no state passed)
  const { data: listData, isLoading: isFetchingItem } = useQuery({
    queryKey: ['resource', config.api],
    queryFn: () => listResource(config.api),
    enabled: isEdit && !stateItem,
  })

  const editItem = isEdit
    ? stateItem || listData?.items?.find(i => String(i.id) === id) || null
    : null

  const isLoadingItem = isEdit && !stateItem && isFetchingItem

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => {
      if (isEdit && id) return updateResource(config.api, id, payload)
      return createResource(config.api, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource', config.api] })
      const msg = isEdit
        ? `${singular} updated successfully.`
        : `${singular} created successfully.`
      navigate(config.path, { state: { successMsg: msg } })
    },
    onError: mutationError =>
      setError(mutationError instanceof Error ? mutationError.message : 'Unable to save item.'),
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const formData = new FormData(event.currentTarget)

    // Validate required image fields
    const missingImageField = config.fields.find(
      f => f.kind === 'image' && f.required && !formData.get(f.name),
    )
    if (missingImageField) {
      setError(`"${missingImageField.label}" is required. Please upload an image.`)
      return
    }

    // Validate all required fields
    const missingFields: string[] = []
    for (const field of config.fields) {
      if (field.required && field.kind !== 'image' && field.kind !== 'boolean') {
        const val = formData.get(field.name)
        if (val === null || val === undefined || String(val).trim() === '') {
          missingFields.push(field.label)
        }
      }
    }
    if (missingFields.length > 0) {
      setError(`Required fields missing: ${missingFields.join(', ')}`)
      return
    }

    const payload: Record<string, unknown> = {}
    for (const field of config.fields) {
      payload[field.name] = coerceValue(field, formData.get(field.name))
    }
    saveMutation.mutate(payload)
  }

  const label = editItem ? getItemLabel(editItem) : ''

  // ─── Loading state ──────────────────────────────────────
  if (isLoadingItem) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--gold)]" />
        <p className="text-sm font-semibold text-[var(--muted)]">
          Loading {singular.toLowerCase()}…
        </p>
      </div>
    )
  }

  // ─── Not found state ────────────────────────────────────
  if (isEdit && !editItem && !isFetchingItem) {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--burgundy-soft)]">
          <config.Icon className="h-7 w-7 text-[var(--burgundy)]" />
        </div>
        <p className="text-sm font-semibold text-[var(--muted)]">
          {singular} not found.
        </p>
        <button
          type="button"
          onClick={() => navigate(config.path)}
          className="inline-flex items-center gap-2 rounded border border-[var(--line)] px-4 py-2 text-sm font-bold text-[var(--gold)] transition-colors hover:bg-[var(--burgundy-soft)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {config.title}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ─── Breadcrumb & Back ─────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(config.path)}
          className="inline-flex items-center gap-2 rounded border border-[var(--line)] px-3 py-2 text-sm font-semibold text-[var(--gold)] transition-colors hover:bg-[var(--burgundy-soft)]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to {config.title}</span>
          <span className="sm:hidden">Back</span>
        </button>
        <nav className="hidden items-center text-sm text-[var(--muted)] sm:flex">
          <button
            type="button"
            className="font-semibold text-[var(--gold)] transition-colors hover:text-[var(--burgundy)]"
            onClick={() => navigate(config.path)}
          >
            {config.title}
          </button>
          <span className="mx-2 text-[var(--line)]">›</span>
          <span className="text-[var(--text)]">
            {isEdit ? `Edit "${label}"` : `New ${singular}`}
          </span>
        </nav>
      </div>

      {/* ─── Form Card ─────────────────────────────────────── */}
      <section className="admin-card overflow-hidden rounded-lg">
        {/* Form header */}
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
                {isEdit ? 'Update' : 'Create'} {singular}
              </h1>
            </div>
          </div>
          {isEdit && editItem ? (
            <p className="mt-2 pl-[52px] text-sm text-[var(--muted)]">
              Editing{' '}
              <strong className="text-[var(--text)]">{label}</strong>
              <span className="ml-1 text-xs text-[var(--muted)]">— ID #{String(editItem.id)}</span>
            </p>
          ) : null}
        </div>

        {/* Form body */}
        <form onSubmit={submit} className="p-6 md:p-8">
          <div className="grid gap-5 md:grid-cols-2">
            {config.fields.map(field => {
              const isFullWidth = field.kind === 'textarea' || field.kind === 'json' || field.kind === 'image'
              const isBoolean = field.kind === 'boolean'
              return (
                <div
                  key={field.name}
                  className={`${isFullWidth ? 'md:col-span-2' : ''} ${isBoolean ? 'flex flex-col justify-end' : 'space-y-2'}`}
                >
                  {!isBoolean ? (
                    <label className="block text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
                      {field.label}
                      {field.required ? (
                        <span className="ml-1 text-red-400">*</span>
                      ) : null}
                    </label>
                  ) : null}
                  <FieldControl field={field} item={editItem} />
                </div>
              )
            })}
          </div>

          {/* Error message */}
          {error ? (
            <div className="mt-5 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          ) : null}

          {/* Action buttons */}
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
              disabled={saveMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded bg-[var(--gold)] px-6 py-2.5 text-sm font-bold uppercase tracking-[0.14em] text-white transition-colors hover:opacity-90 disabled:opacity-70"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {saveMutation.isPending
                ? isEdit
                  ? 'Updating…'
                  : 'Creating…'
                : isEdit
                  ? `Update ${singular}`
                  : `Create ${singular}`}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
