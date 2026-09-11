import { FormEvent, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Eye, FolderTree, Image as ImageIcon, Loader2, Save, Sparkles } from 'lucide-react'
import { createResource, listResource, resolveImageUrl, updateResource, uploadImage } from '../services/api'
import type { ResourceConfig } from '../app/resources'
import { resources } from '../app/resources'
import { validateImageFile } from './ResourceShared'
import FieldWithTooltip from '../components/FieldWithTooltip'

const config: ResourceConfig = resources.find(r => r.api === 'categories')!

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[&]/g, 'and')
    .replace(/[₹]/g, 'rs')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

const SectionCard = ({ title, icon, children }: { title: string, icon?: React.ReactNode, children: React.ReactNode }) => (
  <div className="rounded-xl border border-[var(--line)] bg-white shadow-sm overflow-hidden transition-all hover:shadow-md mb-6">
    <div className="border-b border-[var(--line)] bg-[#FCFBF9] px-6 py-4 flex items-center gap-2">
      {icon && <span className="text-[var(--burgundy)]">{icon}</span>}
      <h3 className="text-[13px] font-bold uppercase tracking-[0.15em] text-[var(--gold)]">{title}</h3>
    </div>
    <div className="p-6">
      {children}
    </div>
  </div>
)

export default function CategoryFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const queryClient = useQueryClient()

  const isEdit = Boolean(id)
  const stateItem = (location.state as { item?: Record<string, unknown> } | null)?.item || null

  const editItem = isEdit ? stateItem || null : null

  const isLoadingItem = isEdit && !stateItem

  // Fetch all categories for parent dropdown
  const { data: catData } = useQuery({
    queryKey: ['resource', 'categories'],
    queryFn: () => listResource('categories', 1, 200),
  })

  const allCategories = (catData?.items || []) as any[]
  const parentCategoryOptions = allCategories.filter((c: any) => !c.parentId && c.active !== false)

  const [name, setName] = useState(editItem ? String(editItem.name || '') : '')
  const [section, setSection] = useState(editItem ? String(editItem.section || '') : '')
  const [parentId, setParentId] = useState(editItem ? String(editItem.parentId || '') : '')
  const [navVisible, setNavVisible] = useState(editItem ? Boolean(editItem.navVisible) : true)
  const [headerHighlight, setHeaderHighlight] = useState(editItem ? Boolean(editItem.headerHighlight) : false)
  const [imageUrl, setImageUrl] = useState(editItem ? String(editItem.imageUrl || '') : '')

  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [serverError, setServerError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  useEffect(() => {
    if (editItem && !touched.initialized) {
      setName(String(editItem.name || ''))
      setSection(String(editItem.section || ''))
      setParentId(String(editItem.parentId || ''))
      setNavVisible(Boolean(editItem.navVisible))
      setHeaderHighlight(Boolean(editItem.headerHighlight))
      setImageUrl(String(editItem.imageUrl || ''))
      setTouched({ initialized: true })
    }
  }, [editItem, touched.initialized])

  // Auto-fill section from parent when parent changes
  useEffect(() => {
    if (parentId && !touched.section) {
      const parent = parentCategoryOptions.find((c: any) => String(c.id) === parentId)
      if (parent) {
        setSection(String(parent.section || parent.name || ''))
      }
    }
  }, [parentId, parentCategoryOptions, touched.section])

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => {
      if (isEdit && id) return updateResource(config.api, id, payload)
      return createResource(config.api, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource', config.api] })
      navigate(config.path, { state: { successMsg: `Category ${isEdit ? 'updated' : 'created'} successfully.` } })
    },
    onError: (err: Error) => {
      setServerError(err.message || 'Unable to save category.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
  })

  const getSlug = () => {
    return slugify(name.trim())
  }

  const validateAll = () => {
    const errors: Record<string, string> = {}
    const trimmedName = name.trim()
    if (!trimmedName) errors.name = 'Please enter a category name'
    else if (trimmedName.length < 2) errors.name = 'Name must be at least 2 characters'
    else if (trimmedName.length > 140) errors.name = 'Name cannot exceed 140 characters'
    return errors
  }

  const allErrors = validateAll()
  const isValid = Object.keys(allErrors).length === 0

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  async function handleFile(file: File) {
    setUploadError('')
    const clientCheck = await validateImageFile(file, 'category-card')
    if (!clientCheck.valid) { setUploadError(clientCheck.reason); if (fileRef.current) fileRef.current.value = ''; return }
    setUploading(true)
    try {
      const data = await uploadImage(file, 'category-card')
      setImageUrl(data.file.path)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const submit = (e?: FormEvent) => {
    if (e) e.preventDefault()
    setServerError('')
    setTouched({ name: true })
    if (!isValid) {
      const firstError = document.querySelector('.text-red-600')
      if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    const slug = getSlug()
    const isBrowseAll = slug === 'browse-all' || name.trim().toLowerCase() === 'browse all'
    const isChild = Boolean(parentId)
    const effectiveHref = isBrowseAll
      ? '/shop'
      : (isChild ? `/shop?category=${slug}` : `/shop?section=${slug}`)

    const effectiveSection = section.trim() || (editItem?.section && editItem.section !== 'collections' ? String(editItem.section) : name.trim())

    const payload: Record<string, unknown> = {
      ...(editItem || {}),
      name: name.trim(),
      slug,
      section: effectiveSection,
      href: effectiveHref,
      parentId: parentId ? parseInt(parentId, 10) : null,
      navVisible,
      headerHighlight,
      imageUrl: imageUrl || null,
    }
    saveMutation.mutate(payload)
  }

  if (isLoadingItem) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--gold)]" />
        <p className="text-sm font-semibold text-[var(--muted)]">Loading category…</p>
      </div>
    )
  }

  const getInputClass = (field: string) => {
    const baseClass = 'w-full rounded-lg border border-[var(--line)] bg-[#F9FAFB] px-4 py-2.5 text-[15px] text-[var(--text)] outline-none transition-colors placeholder:text-[var(--muted)]/60 focus:border-[var(--burgundy)] focus:ring-4 focus:ring-[var(--burgundy-soft)]'
    if (touched[field] && allErrors[field]) {
      return `${baseClass} border-red-500 focus:border-red-500 focus:ring-red-100`
    }
    return baseClass
  }

  const isChild = Boolean(parentId)

  return (
    <form onSubmit={submit} className="relative pb-24 max-w-7xl mx-auto">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 -mx-4 mb-8 flex items-center justify-between border-b border-[var(--line)] bg-[#FCFBF9]/90 px-4 py-4 backdrop-blur-md sm:-mx-8 sm:px-8">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(config.path)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white border border-[var(--line)] text-[var(--muted)] transition-colors hover:bg-[var(--burgundy-soft)] hover:text-[var(--burgundy)] hover:border-[var(--burgundy-soft)]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[var(--text)]">{isEdit ? 'Edit Category' : 'Add New Category'}</h1>
            <p className="text-xs text-[var(--muted)]">
              {isChild ? 'Creating a sub-category under a parent collection' : 'Creating a top-level collection (appears in navbar)'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(config.path)}
            className="rounded px-4 py-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--text)] transition-colors"
          >
            Discard
          </button>
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-2 rounded bg-[var(--burgundy)] px-6 py-2.5 text-sm font-bold tracking-wide text-white transition-all hover:bg-[#430000] hover:shadow-md disabled:opacity-50"
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? 'Save Changes' : 'Save Category'}
          </button>
        </div>
      </div>

      {serverError && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-sm">
          {serverError}
        </div>
      )}

      {saveMutation.isError && !serverError && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-sm">
          {saveMutation.error instanceof Error ? saveMutation.error.message : 'Unable to save category.'}
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        {/* Basic Information */}
        <SectionCard title="Basic Information" icon={<FolderTree className="h-4 w-4" />}>
          <div className="space-y-5">
            <FieldWithTooltip label="Category Name" required characterCount={`${name.length}/140`}>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onBlur={() => handleBlur('name')}
                placeholder="e.g., Silk Sarees"
                className={getInputClass('name')}
                maxLength={140}
              />
              {touched.name && allErrors.name && (
                <p className="mt-1 text-xs font-semibold text-red-600">{allErrors.name}</p>
              )}
            </FieldWithTooltip>

            <FieldWithTooltip label="Parent Category" tooltip="Leave empty to create a top-level collection. Select a parent to create a sub-category that appears in the dropdown.">
              <select
                value={parentId}
                onChange={e => setParentId(e.target.value)}
                className={getInputClass('parentId')}
              >
                <option value="">— No Parent (Top-Level Collection) —</option>
                {parentCategoryOptions
                  .filter((c: any) => !isEdit || String(c.id) !== id)
                  .map((c: any) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                {isChild
                  ? '↳ This will be a sub-category. It appears in the navbar dropdown under its parent.'
                  : '✦ This will be a top-level collection. It appears directly in the storefront navbar.'}
              </p>
            </FieldWithTooltip>

            <FieldWithTooltip label="Section / Fabric Group" tooltip="Used to group categories in the storefront URL (e.g. silk-sarees, cotton-sarees). Auto-filled from parent if available.">
              <input
                type="text"
                value={section}
                onChange={e => { setSection(e.target.value); setTouched(prev => ({ ...prev, section: true })) }}
                placeholder="e.g., Silk, Cotton, Silk Cotton"
                className={getInputClass('section')}
                maxLength={80}
              />
            </FieldWithTooltip>
          </div>
        </SectionCard>

        {/* Image Upload */}
        <SectionCard title="Category Image" icon={<ImageIcon className="h-4 w-4" />}>
          <div className="space-y-2">
            {imageUrl ? (
              <div className="group relative overflow-hidden rounded-lg border border-[var(--line)]">
                <div className="flex items-center justify-center p-4 min-h-[10rem]">
                  <img src={resolveImageUrl(imageUrl)} alt="" className="max-h-40 object-contain" />
                </div>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 backdrop-blur-sm transition-opacity">
                  <button type="button" onClick={() => fileRef.current?.click()} className="rounded bg-white px-3 py-1.5 text-xs font-bold">Change</button>
                  <button type="button" onClick={() => setImageUrl('')} className="rounded bg-red-600 px-3 py-1.5 text-xs font-bold text-white">Remove</button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--line)] bg-[#F9FAFB] px-4 py-8 text-center hover:border-[var(--burgundy)] group transition-colors"
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--burgundy)]" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-[var(--muted)] group-hover:text-[var(--burgundy)]" />
                )}
                <span className="text-sm font-bold text-[var(--text)]">
                  {uploading ? 'Uploading...' : 'Upload Image'}
                </span>
                <span className="text-[11px] text-[var(--muted)]">JPG, PNG, WebP, or SVG</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
            {uploadError && <p className="text-xs font-semibold text-red-600">{uploadError}</p>}
          </div>
        </SectionCard>

        {/* Navbar Visibility */}
        <SectionCard title="Navbar & Visibility" icon={<Eye className="h-4 w-4" />}>
          <div className="space-y-4">
            {/* Nav Visible Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer group rounded-lg border border-[var(--line)] p-4 transition-colors hover:border-[var(--burgundy)] hover:bg-[var(--burgundy-soft)]/30">
              <input
                type="checkbox"
                checked={navVisible}
                onChange={e => setNavVisible(e.target.checked)}
                className="mt-0.5 h-5 w-5 accent-[#520001] cursor-pointer"
              />
              <div>
                <p className="text-sm font-bold text-[var(--text)] group-hover:text-[var(--burgundy)]">
                  Show in Navbar
                </p>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  {isChild
                    ? 'When enabled, this sub-category appears in the dropdown menu under its parent in the storefront navbar.'
                    : 'When enabled, this collection appears as a top-level item in the storefront navbar.'}
                </p>
              </div>
            </label>

            {/* Header Highlight Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer group rounded-lg border border-[var(--line)] p-4 transition-colors hover:border-[var(--burgundy)] hover:bg-[var(--burgundy-soft)]/30">
              <input
                type="checkbox"
                checked={headerHighlight}
                onChange={e => setHeaderHighlight(e.target.checked)}
                className="mt-0.5 h-5 w-5 accent-[#520001] cursor-pointer"
              />
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-sm font-bold text-[var(--text)] group-hover:text-[var(--burgundy)] flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    Highlight in Navbar
                  </p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    Adds a special highlight/badge to make this category stand out in the navbar (e.g., for sales or new collections).
                  </p>
                </div>
              </div>
            </label>
          </div>
        </SectionCard>
      </div>
    </form>
  )
}
