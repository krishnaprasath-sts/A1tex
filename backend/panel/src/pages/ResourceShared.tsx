import { useRef, useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import type { ResourceField } from '../app/resources'
import { resolveImageUrl, uploadImage } from '../services/api'

// ─── Value Helpers ───────────────────────────────────────────────

export function coerceValue(field: ResourceField, value: FormDataEntryValue | null) {
  if (field.kind === 'boolean') return value === 'on'
  if (field.kind === 'number') return value === null || value === '' ? null : Number(value)
  if (field.kind === 'json') {
    if (!value) return null
    try {
      return JSON.parse(String(value))
    } catch {
      return String(value)
    }
  }
  if (field.kind === 'datetime') {
    if (!value) return ''
    return String(value) + ':00Z'
  }
  return value == null ? '' : String(value)
}

export function displayValue(value: unknown) {
  if (value == null) return '–'
  if (typeof value === 'object') return JSON.stringify(value)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

export function formatDateTime(dbValue: unknown): string {
  if (!dbValue) return ''
  const s = String(dbValue)
  try {
    const d = new Date(s)
    if (isNaN(d.getTime())) return s.substring(0, 16)
    return d.toISOString().slice(0, 16)
  } catch {
    return s.substring(0, 16)
  }
}

export function singularTitle(title: string): string {
  if (title.endsWith('ies')) return title.slice(0, -3) + 'y'
  if (title.endsWith('s') && !title.endsWith('ss')) return title.slice(0, -1)
  return title
}

export function itemLabel(item: Record<string, unknown>): string {
  const name = item.name || item.title || item.text || item.key || item.orderNumber || item.email
  return String(name ?? `#${item.id}`)
}

// ─── Image Helpers ───────────────────────────────────────────────

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
const MAX_SIZE = 5 * 1024 * 1024

export function isSvgUrl(url: string): boolean {
  return url.endsWith('.svg') || url.includes('.svg?')
}

function imageDimensionsFromSrc(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
  })
}

export function validateImageFile(
  file: File,
  _dimensionHint?: string,
): Promise<{ valid: true } | { valid: false; reason: string }> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return Promise.resolve({ valid: false as const, reason: 'Only JPEG, PNG, WebP, and SVG files are allowed.' })
  }
  if (file.size > MAX_SIZE) {
    return Promise.resolve({ valid: false as const, reason: 'File size must be under 5 MB.' })
  }
  return Promise.resolve({ valid: true as const })
}


// ─── Image Preview Component ─────────────────────────────────────

export function ImagePreview({
  value,
  alt,
  className = 'w-full max-h-72',
  mode = 'contain',
}: {
  value: unknown
  alt: string
  className?: string
  mode?: 'contain' | 'cover'
}) {
  const src = resolveImageUrl(value)
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div
        className={`${className} flex items-center justify-center border border-dashed border-[var(--line)] bg-[var(--panel-strong)] px-3 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]`}
        style={{ minHeight: '10rem' }}
      >
        No Preview
      </div>
    )
  }

  const objectFit = isSvgUrl(src)
    ? 'object-contain p-4'
    : mode === 'contain'
      ? 'object-contain'
      : 'object-cover'

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className={`${className} ${objectFit}`}
    />
  )
}

// ─── Image Upload Field ──────────────────────────────────────────

export function ImageField({ field, item }: { field: ResourceField; item?: Record<string, unknown> | null }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const existingValue = typeof item?.[field.name] === 'string' ? String(item?.[field.name]) : ''
  const [previewValue, setPreviewValue] = useState(existingValue)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const currentValue = previewValue || existingValue || ''

  async function handleFile(file: File) {
    setUploadError('')
    const clientCheck = await validateImageFile(file, field.dimensionHint)
    if (!clientCheck.valid) {
      setUploadError(clientCheck.reason)
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    setUploading(true)
    try {
      const data = await uploadImage(file, field.dimensionHint)
      setPreviewValue(data.file.path)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.')
      if (fileRef.current) fileRef.current.value = ''
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      {currentValue ? (
        <div className="relative mb-3 overflow-hidden rounded border border-[var(--line)]">
          <div
            className="flex items-center justify-center bg-[var(--panel-strong)]"
            style={{ minHeight: '12rem' }}
          >
            <ImagePreview
              value={currentValue}
              alt={`${field.label} preview`}
              className="w-full max-h-80"
              mode="contain"
            />
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-[var(--line)] bg-[var(--panel-strong)] px-3 py-2">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="rounded border border-[var(--line)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--burgundy)] transition-colors hover:bg-[var(--gold-soft)] disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : 'Change'}
            </button>
            <span className="truncate text-[10px] text-[var(--muted)]">{currentValue}</span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className={`flex w-full cursor-pointer flex-col items-center gap-2 rounded border-2 border-dashed bg-[var(--panel-strong)] px-4 py-8 text-center transition-colors disabled:opacity-50 ${
            uploadError ? 'border-red-400' : 'border-[var(--line)] hover:border-[var(--gold)]'
          }`}
        >
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
            {uploading ? 'Uploading…' : 'Click to Upload Image'}
          </span>
          <span className="text-[10px] text-[var(--muted)]/60">JPEG, PNG, WebP, or SVG — Max 5 MB</span>
          {field.dimensionLabel ? (
            <span className="text-[10px] font-semibold text-[var(--gold)]">{field.dimensionLabel}</span>
          ) : null}
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml"
        className="hidden"
        onChange={event => {
          const file = event.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
      <input type="hidden" name={field.name} value={currentValue} />

      {uploadError ? (
        <p className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">
          {uploadError}
        </p>
      ) : null}
    </div>
  )
}

// ─── Field Control ───────────────────────────────────────────────

export function FieldControl({ field, item }: { field: ResourceField; item?: Record<string, unknown> | null }) {
  const value = item?.[field.name]

  if (field.kind === 'boolean') {
    return (
      <label className="flex items-center gap-3 rounded border border-[var(--line)] bg-[var(--panel-strong)] px-3 py-3">
        <input
          name={field.name}
          type="checkbox"
          defaultChecked={Boolean(value)}
          className="h-4 w-4 accent-[#520001]"
        />
        <span className="text-sm font-semibold text-[var(--text)]">{field.label}</span>
      </label>
    )
  }

  if (field.kind === 'textarea' || field.kind === 'json') {
    return (
      <textarea
        className="admin-input min-h-28 rounded"
        name={field.name}
        required={field.required}
        defaultValue={
          typeof value === 'object' && value !== null
            ? JSON.stringify(value, null, 2)
            : value == null
              ? ''
              : String(value)
        }
      />
    )
  }

  if (field.kind === 'select') {
    return (
      <select
        className="admin-input rounded"
        name={field.name}
        required={field.required}
        defaultValue={String(value ?? field.options?.[0] ?? '')}
      >
        {field.options?.map(option => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    )
  }

  if (field.kind === 'image') {
    return <ImageField field={field} item={item} />
  }

  if (field.kind === 'datetime') {
    return (
      <input
        className="admin-input rounded"
        type="datetime-local"
        name={field.name}
        defaultValue={formatDateTime(value)}
      />
    )
  }

  return (
    <input
      className="admin-input rounded"
      type={field.kind === 'number' ? 'number' : 'text'}
      name={field.name}
      required={field.required}
      defaultValue={
        typeof value === 'object' && value !== null
          ? JSON.stringify(value, null, 2)
          : value == null
            ? ''
            : String(value)
      }
    />
  )
}

// ─── Delete Confirmation Dialog ──────────────────────────────────

export function DeleteConfirmDialog({
  resourceLabel,
  itemLabel,
  pending,
  onConfirm,
  onCancel,
  errorMessage,
}: {
  resourceLabel: string
  itemLabel: string
  pending: boolean
  onConfirm: () => void
  onCancel: () => void
  errorMessage?: string
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-[var(--burgundy)]">Delete {resourceLabel}</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Are you sure you want to delete{' '}
              <strong className="text-[var(--text)]">{itemLabel}</strong>? This action cannot be
              undone.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded border border-[var(--line)] px-4 py-2 text-sm font-bold text-[var(--burgundy)] transition-colors hover:bg-[var(--gold-soft)] disabled:opacity-50"
          >
            {errorMessage ? 'Close' : 'Cancel'}
          </button>
          {!errorMessage && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={pending}
              className="flex items-center gap-2 rounded bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {pending ? 'Deleting…' : 'Delete'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Table Helpers ───────────────────────────────────────────────

export function isImageColumn(column: string) {
  return ['image', 'imageUrl', 'thumbnail', 'thumbnailUrl'].includes(column)
}

export function TableCell({ column, item, items }: { column: string; item: Record<string, unknown>; items?: Record<string, unknown>[] }) {
  const value = item[column]

  if (column === 'parentId' && value) {
    const parent = items?.find((i: any) => String(i.id) === String(value))
    const parentLabel = parent ? `[${parent.section}] ${parent.name}` : `#${value}`
    return (
      <td className="max-w-[200px] truncate border border-[var(--line)] px-5 py-4 text-[var(--text)]">
        <span className="text-xs font-semibold text-[var(--gold)]">{parentLabel}</span>
      </td>
    )
  }

  if (isImageColumn(column)) {
    return (
      <td className="border border-[var(--line)] px-5 py-4">
        <div className="flex h-14 w-12 shrink-0 items-center justify-center overflow-hidden rounded border border-[var(--line)] bg-[var(--panel-strong)]">
          <ImagePreview
            value={value}
            alt={`${String(item.name || item.title || 'Image')} preview`}
            className="h-14 w-12"
            mode="contain"
          />
        </div>
      </td>
    )
  }

  if (column === 'status' || column === 'active' || column === 'paymentStatus') {
    const displayVal = displayValue(value)
    const lower = String(value).toLowerCase()
    let badgeClass = 'admin-badge '
    if (['active', 'yes', 'true', 'delivered', 'paid'].includes(lower)) {
      badgeClass += 'admin-badge-success'
    } else if (['draft', 'pending', 'processing', 'packed'].includes(lower)) {
      badgeClass += 'admin-badge-warning'
    } else if (['shipped'].includes(lower)) {
      badgeClass += 'admin-badge-info'
    } else {
      badgeClass += 'admin-badge-muted'
    }

    return (
      <td className="border border-[var(--line)] px-5 py-4">
        <span className={badgeClass}>{displayVal}</span>
      </td>
    )
  }

  if (column === 'message') {
    return (
      <td className="min-w-[250px] max-w-[450px] border border-[var(--line)] px-5 py-4 text-[var(--text)]">
        <div className="max-h-36 overflow-y-auto whitespace-pre-wrap text-[13.5px] leading-relaxed pr-2 text-[var(--text)]">
          {displayValue(value)}
        </div>
      </td>
    )
  }

  return (
    <td className="max-w-[280px] truncate border border-[var(--line)] px-5 py-4 text-[var(--text)]">
      {displayValue(value)}
    </td>
  )
}
