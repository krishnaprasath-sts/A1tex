import { FormEvent, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, Flag, Loader2, Plus, Upload, Link2, AlertCircle, ExternalLink } from 'lucide-react'
import { createResource, getResource, listResource, resolveImageUrl, storefrontBaseUrl, updateResource, uploadImage } from '../services/api'
import { validateImageFile, isSvgUrl } from './ResourceShared'
import type { ResourceConfig } from '../app/resources'
import { resources } from '../app/resources'

const config: ResourceConfig = resources.find(r => r.api === 'banners')!

const DEFAULT_PLACEMENTS = [
  { value: 'home_hero', label: 'Home Hero (Main Slider)' },
  { value: 'hero_slider', label: 'Hero Carousel / Slider' },
  { value: 'header_below', label: 'Below Header Promo' },
  { value: 'promotional', label: 'Promotional Banner' },
]

export default function BannerFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const queryClient = useQueryClient()

  const isEdit = Boolean(id)
  const stateItem = (location.state as { item?: Record<string, unknown> } | null)?.item || null

  // Fetch single item directly for guaranteed accurate data on edit/refresh
  const { data: singleItemData, isLoading: isFetchingSingle } = useQuery({
    queryKey: ['resource-single', config.api, id],
    queryFn: () => getResource(config.api, id!),
    enabled: isEdit,
  })

  const { data: listData, isLoading: isFetchingList } = useQuery({
    queryKey: ['resource', config.api],
    queryFn: () => listResource(config.api),
  })

  // Load store collections for the user-friendly CTA link selector
  const { data: categoryData } = useQuery({
    queryKey: ['resource', 'categories-all'],
    queryFn: () => listResource('categories', 1, 100),
  })
  const categories = ((categoryData?.items || []) as Array<{ id: number; name: string; slug: string; href?: string; section?: string }>)
    .filter(c => c.name && c.slug)

  const editItem = isEdit
    ? (singleItemData?.item || stateItem || listData?.items?.find((i: any) => String(i.id) === id) || null)
    : null

  const isLoadingItem = isEdit && !editItem && (isFetchingSingle || isFetchingList)

  // Form State
  const [placement, setPlacement] = useState('home_hero')
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [ctaLabel, setCtaLabel] = useState('')
  const [ctaUrl, setCtaUrl] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [active, setActive] = useState(true)

  const [touched, setTouched] = useState<Record<string, boolean>>({})
  
  // Image Upload State
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  useEffect(() => {
    if (editItem && !touched.initialized) {
      setPlacement(String(editItem.placement || 'home_hero'))
      setTitle(String(editItem.title || ''))
      setSubtitle(String(editItem.subtitle || ''))
      setImageUrl(String(editItem.imageUrl || ''))
      setCtaLabel(String(editItem.ctaLabel || ''))
      setCtaUrl(String(editItem.ctaUrl || ''))
      setSortOrder(String(editItem.sortOrder ?? '0'))
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
      queryClient.invalidateQueries({ queryKey: ['resource-single', config.api, id] })
      navigate(config.path, { state: { successMsg: `Banner ${isEdit ? 'updated' : 'created'} successfully.` } })
    },
  })

  // Dynamic list of placements including any custom existing placement
  const placementOptions = [...DEFAULT_PLACEMENTS]
  if (placement && !placementOptions.some(p => p.value === placement)) {
    placementOptions.push({ value: placement, label: placement.replace(/_/g, ' ').toUpperCase() })
  }

  const validate = () => {
    const errors: Record<string, string> = {}
    
    if (!placement) errors.placement = 'Please select a banner placement.'

    const trimmedTitle = title.trim()
    if (trimmedTitle && trimmedTitle.length > 180) {
      errors.title = 'Title cannot exceed 180 characters.'
    }

    const trimmedSubtitle = subtitle.trim()
    if (trimmedSubtitle && trimmedSubtitle.length > 500) {
      errors.subtitle = 'Subtitle cannot exceed 500 characters.'
    }

    if (!imageUrl.trim()) {
      errors.imageUrl = 'Banner image is required.'
    }

    const trimmedCtaLabel = ctaLabel.trim()
    if (trimmedCtaLabel && trimmedCtaLabel.length > 80) {
      errors.ctaLabel = 'CTA Label cannot exceed 80 characters.'
    }

    const trimmedCtaUrl = ctaUrl.trim()
    if (trimmedCtaUrl) {
      try {
        new URL(trimmedCtaUrl)
      } catch {
        // Allow valid relative paths (/shop, /collections, etc.)
        if (!trimmedCtaUrl.startsWith('/') && !trimmedCtaUrl.startsWith('#')) {
          errors.ctaUrl = 'Please enter a valid URL or path (e.g. /shop or https://...).'
        }
      }
    }

    if (sortOrder === '' || sortOrder === null || sortOrder === undefined) {
      errors.sortOrder = 'Sort order is required.'
    } else if (!/^\d+$/.test(sortOrder.trim())) {
      errors.sortOrder = 'Only non-negative numeric values (0, 1, 2, ...) are allowed.'
    }

    return errors
  }

  const errors = validate()
  const isValid = Object.keys(errors).length === 0

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  async function handleFile(file: File) {
    setUploadError('')
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size must be under 5 MB.')
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    const dimensionHint = placement === 'home_hero' || placement === 'hero_slider' ? 'banner-hero' : 'banner-other'
    // Soft validation
    const clientCheck = await validateImageFile(file, dimensionHint)
    if (!clientCheck.valid && !clientCheck.reason.includes('too small')) {
      setUploadError(clientCheck.reason)
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    setUploading(true)
    try {
      const data = await uploadImage(file, dimensionHint)
      setImageUrl(data.file.path)
      setTouched(prev => ({ ...prev, imageUrl: true }))
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTouched({ placement: true, title: true, subtitle: true, imageUrl: true, ctaLabel: true, ctaUrl: true, sortOrder: true })
    
    if (!isValid) {
      setTimeout(() => {
        const firstError = document.querySelector('.error-border')
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
      return
    }

    const payload = {
      placement,
      title: title.trim() || null,
      subtitle: subtitle.trim() || null,
      imageUrl: imageUrl.trim(),
      ctaLabel: ctaLabel.trim() || null,
      ctaUrl: ctaUrl.trim() || null,
      sortOrder: parseInt(sortOrder.trim(), 10) || 0,
      active,
    }
    saveMutation.mutate(payload)
  }

  if (isLoadingItem) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--gold)]" />
        <p className="text-sm font-semibold text-[var(--muted)]">Loading banner details…</p>
      </div>
    )
  }

  const getInputClass = (field: string, baseClass = "admin-input rounded w-full transition-colors duration-200") => {
    if (touched[field] && errors[field]) {
      return `${baseClass} border-red-500 focus:border-red-500 focus:ring-red-500 error-border`
    }
    return baseClass
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
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
                {isEdit ? 'Update Banner' : 'Create New Banner'}
              </h1>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="p-6 md:p-8">
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Placement */}
            <div className="md:col-span-2 space-y-2">
              <label className="block text-[14px] font-bold uppercase tracking-widest text-[var(--muted)]">
                Placement <span className="text-red-400">*</span>
              </label>
              <select
                value={placement}
                onChange={e => setPlacement(e.target.value)}
                onBlur={() => handleBlur('placement')}
                className={getInputClass('placement')}
              >
                {placementOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {touched.placement && errors.placement && (
                <p className="text-xs font-semibold text-red-600">{errors.placement}</p>
              )}
            </div>

            {/* Title */}
            <div className="md:col-span-2 space-y-2">
              <div className="flex justify-between items-end">
                <label className="block text-[14px] font-bold uppercase tracking-widest text-[var(--muted)]">
                  Title <span className="text-[11px] font-normal text-[var(--muted)]">(Optional)</span>
                </label>
                <span className={`text-[10px] font-semibold ${title.length > 180 ? 'text-red-500' : 'text-[var(--muted)]'}`}>
                  {title.length}/180
                </span>
              </div>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={() => handleBlur('title')}
                placeholder="Enter banner title"
                className={getInputClass('title')}
              />
              {touched.title && errors.title && (
                <p className="text-xs font-semibold text-red-600">{errors.title}</p>
              )}
            </div>

            {/* Subtitle */}
            <div className="md:col-span-2 space-y-2">
              <div className="flex justify-between items-end">
                <label className="block text-[14px] font-bold uppercase tracking-widest text-[var(--muted)]">
                  Subtitle <span className="text-[11px] font-normal text-[var(--muted)]">(Optional)</span>
                </label>
                <span className={`text-[10px] font-semibold ${subtitle.length > 500 ? 'text-red-500' : 'text-[var(--muted)]'}`}>
                  {subtitle.length}/500
                </span>
              </div>
              <textarea
                value={subtitle}
                onChange={e => setSubtitle(e.target.value)}
                onBlur={() => handleBlur('subtitle')}
                placeholder="Enter banner subtitle or promotional caption"
                className={getInputClass('subtitle', "admin-input rounded w-full min-h-[90px] transition-colors duration-200")}
              />
              {touched.subtitle && errors.subtitle && (
                <p className="text-xs font-semibold text-red-600">{errors.subtitle}</p>
              )}
            </div>

            {/* Banner Image & URL Input */}
            <div className="md:col-span-2 space-y-3">
              <label className="block text-[14px] font-bold uppercase tracking-widest text-[var(--muted)]">
                Banner Image <span className="text-red-400">*</span>
              </label>

              {/* Image Preview Box */}
              {imageUrl ? (
                <div className="relative overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--panel-strong)]">
                  <div className="flex items-center justify-center p-2" style={{ minHeight: '13rem', maxHeight: '20rem' }}>
                    <img
                      src={resolveImageUrl(imageUrl)!}
                      alt="Preview"
                      className={`max-h-72 w-full ${isSvgUrl(imageUrl) ? 'object-contain p-4' : 'object-contain rounded'}`}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none'
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] bg-[var(--panel)] px-4 py-2.5">
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded border border-[var(--line)] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--gold)] transition-colors hover:bg-[var(--burgundy-soft)] disabled:opacity-50"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {uploading ? 'Uploading…' : 'Upload New Image'}
                    </button>
                    <span className="truncate text-xs font-mono text-[var(--muted)] max-w-md">{imageUrl}</span>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className={`flex w-full cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed bg-[var(--panel-strong)] px-4 py-8 text-center transition-colors disabled:opacity-50 ${
                    uploadError || (touched.imageUrl && errors.imageUrl) ? 'border-red-400' : 'border-[var(--line)] hover:border-[var(--burgundy)]'
                  }`}
                >
                  {uploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-[var(--burgundy)]" />
                  ) : (
                    <>
                      <Upload className="h-7 w-7 text-[var(--gold)]" />
                      <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
                        Click to Upload Banner Image
                      </span>
                      <span className="text-[10px] text-[var(--muted)]/70">JPG, JPEG, PNG, WEBP, SVG — Max 5 MB</span>
                      <span className="text-[10px] font-semibold text-[var(--burgundy)]">Recommended: 1920×700px panoramic ratio</span>
                    </>
                  )}
                </button>
              )}

              {/* Direct Image Path / URL Input */}
              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-semibold text-[var(--muted)] flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5" />
                  Or enter Image URL / Path directly:
                </label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  onBlur={() => handleBlur('imageUrl')}
                  placeholder="/hero_cinematic.png or https://example.com/banner.jpg"
                  className={getInputClass('imageUrl')}
                />
              </div>

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

              {uploadError && (
                <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {uploadError}
                </p>
              )}
              {touched.imageUrl && errors.imageUrl && !uploadError && (
                <p className="text-xs font-semibold text-red-600">{errors.imageUrl}</p>
              )}
            </div>

            {/* ─── Call To Action (CTA) Button & Link Builder ─── */}
            <div className="md:col-span-2 rounded-lg border border-[var(--line)] bg-[var(--panel-strong)]/60 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded bg-[var(--gold)]/20 text-[var(--gold)]">
                    <Link2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--burgundy)]">
                      Call-To-Action (CTA) Button & Link
                    </h3>
                    <p className="text-[11px] text-[var(--muted)]">
                      Choose where clicking the banner will take your customers.
                    </p>
                  </div>
                </div>
                {ctaUrl && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    <Check className="h-3 w-3" /> Link Configured
                  </span>
                )}
              </div>

              {/* Quick Preset Selector */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  1. Pick a Destination or Collection
                </label>
                
                <div className="grid gap-2 sm:grid-cols-2">
                  {/* Category / Collection Dropdown */}
                  <div>
                    <span className="mb-1 block text-[11px] font-semibold text-[var(--muted)]">
                      Link to a Saree Collection / Category:
                    </span>
                    <select
                      value={categories.some(c => (c.href === ctaUrl || `/collections/${c.slug}` === ctaUrl || `/category/${c.slug}` === ctaUrl)) ? ctaUrl : ''}
                      onChange={e => {
                        const targetUrl = e.target.value
                        if (!targetUrl) return
                        setCtaUrl(targetUrl)
                        const matchedCat = categories.find(c => (c.href === targetUrl || `/collections/${c.slug}` === targetUrl || `/category/${c.slug}` === targetUrl))
                        if (matchedCat && !ctaLabel) {
                          setCtaLabel(`Explore ${matchedCat.name}`)
                        }
                        setTouched(prev => ({ ...prev, ctaUrl: true }))
                      }}
                      className="admin-input rounded w-full text-xs py-2"
                    >
                      <option value="">-- Choose from Collection List --</option>
                      {categories.map(c => {
                        const targetPath = (c.href && c.href !== '#') ? c.href : `/collections/${c.slug}`
                        return (
                          <option key={c.id} value={targetPath}>
                            {c.name} {c.section ? `(${c.section})` : ''}
                          </option>
                        )
                      })}
                    </select>
                  </div>

                  {/* Standard Page Presets */}
                  <div>
                    <span className="mb-1 block text-[11px] font-semibold text-[var(--muted)]">
                      Or Quick Store Pages:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setCtaUrl('/shop')
                          if (!ctaLabel) setCtaLabel('Explore All Sarees')
                          setTouched(prev => ({ ...prev, ctaUrl: true }))
                        }}
                        className={`rounded px-2.5 py-1.5 text-xs font-semibold border transition ${
                          ctaUrl === '/shop' ? 'border-[var(--gold)] bg-[var(--gold)] text-white' : 'border-[var(--line)] bg-[var(--panel)] hover:border-[var(--gold)] text-[var(--text)]'
                        }`}
                      >
                        All Sarees (/shop)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCtaUrl('/sale')
                          if (!ctaLabel) setCtaLabel('Shop Sale')
                          setTouched(prev => ({ ...prev, ctaUrl: true }))
                        }}
                        className={`rounded px-2.5 py-1.5 text-xs font-semibold border transition ${
                          ctaUrl === '/sale' ? 'border-[var(--gold)] bg-[var(--gold)] text-white' : 'border-[var(--line)] bg-[var(--panel)] hover:border-[var(--gold)] text-[var(--text)]'
                        }`}
                      >
                        Sale & Clearance (/sale)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCtaUrl('/shop?sort=Newest')
                          if (!ctaLabel) setCtaLabel('New Arrivals')
                          setTouched(prev => ({ ...prev, ctaUrl: true }))
                        }}
                        className={`rounded px-2.5 py-1.5 text-xs font-semibold border transition ${
                          ctaUrl === '/shop?sort=Newest' ? 'border-[var(--gold)] bg-[var(--gold)] text-white' : 'border-[var(--line)] bg-[var(--panel)] hover:border-[var(--gold)] text-[var(--text)]'
                        }`}
                      >
                        New Arrivals
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Exact CTA URL Input */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    Destination URL / Path
                  </label>
                  {ctaUrl && (
                    <a
                      href={ctaUrl.startsWith('http') ? ctaUrl : `${storefrontBaseUrl}${ctaUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--gold)] hover:underline"
                    >
                      Test Link on Storefront <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <input
                  type="text"
                  value={ctaUrl}
                  onChange={e => setCtaUrl(e.target.value)}
                  onBlur={() => handleBlur('ctaUrl')}
                  placeholder="/shop or /collections/pure-kanchipuram or https://..."
                  className={getInputClass('ctaUrl')}
                />
                <p className="text-[10px] text-[var(--muted)]">
                  Pick from the dropdown above or enter any custom page path or full URL.
                </p>
                {touched.ctaUrl && errors.ctaUrl && (
                  <p className="text-xs font-semibold text-red-600">{errors.ctaUrl}</p>
                )}
              </div>

              {/* CTA Button Text with Quick Chips */}
              <div className="space-y-2 pt-2 border-t border-[var(--line)]">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    2. Button Text <span className="text-[11px] font-normal text-[var(--muted)]">(Optional)</span>
                  </label>
                  {ctaLabel && (
                    <button
                      type="button"
                      onClick={() => setCtaLabel('')}
                      className="text-[10px] text-[var(--muted)] hover:text-red-500 underline"
                    >
                      Clear button text
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  value={ctaLabel}
                  onChange={e => setCtaLabel(e.target.value)}
                  onBlur={() => handleBlur('ctaLabel')}
                  placeholder="e.g. Explore Collection / Shop Now"
                  className={getInputClass('ctaLabel')}
                />

                {/* Quick Button Text Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mr-1">
                    Quick Text:
                  </span>
                  {['Explore Collection', 'Shop Now', 'View Sarees', 'Discover More', 'Shop The Edit', 'Explore All'].map(chip => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => {
                        setCtaLabel(chip)
                        setTouched(prev => ({ ...prev, ctaLabel: true }))
                      }}
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] transition ${
                        ctaLabel === chip
                          ? 'border-[var(--burgundy)] bg-[var(--burgundy)] font-bold text-white'
                          : 'border-[var(--line)] bg-[var(--panel)] text-[var(--muted)] hover:border-[var(--gold)] hover:text-[var(--text)]'
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                {touched.ctaLabel && errors.ctaLabel && (
                  <p className="text-xs font-semibold text-red-600">{errors.ctaLabel}</p>
                )}
              </div>

              {/* Live Button Preview Box */}
              <div className="rounded-lg border border-dashed border-[var(--line)] bg-[var(--panel)] p-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
                  Live Banner Button Preview
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {ctaLabel ? (
                    <div className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] px-7 py-2.5 text-xs font-extrabold uppercase tracking-[0.16em] text-[#3b0b14] shadow-md">
                      {ctaLabel} &rarr;
                    </div>
                  ) : (
                    <span className="text-xs italic text-[var(--muted)]">
                      {ctaUrl ? 'No button text set — whole banner image acts as clickable link.' : 'No button or link configured (static display banner).'}
                    </span>
                  )}

                  {ctaUrl && (
                    <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--muted)] bg-[var(--panel-strong)] px-3 py-1.5 rounded border border-[var(--line)] truncate max-w-sm">
                      <span className="font-sans text-[10px] uppercase font-bold text-[var(--gold)]">Target:</span>
                      <span className="truncate text-[var(--text)]">{ctaUrl}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sort Order */}
            <div className="space-y-2">
              <label className="block text-[14px] font-bold uppercase tracking-widest text-[var(--muted)]">
                Sort Order <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value)}
                onBlur={() => handleBlur('sortOrder')}
                placeholder="0"
                className={getInputClass('sortOrder')}
              />
              <p className="text-[10px] text-[var(--muted)]">Banners with lower numbers appear first (0, 1, 2...).</p>
              {touched.sortOrder && errors.sortOrder && (
                <p className="text-xs font-semibold text-red-600">{errors.sortOrder}</p>
              )}
            </div>

            {/* Active Switch */}
            <div className="space-y-2 flex flex-col justify-end">
              <label className="flex h-[42px] items-center gap-3 rounded border border-[var(--line)] bg-[var(--panel-strong)] px-4 cursor-pointer hover:bg-[var(--burgundy-soft)] transition-colors">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={e => setActive(e.target.checked)}
                  className="h-4 w-4 accent-[#520001] cursor-pointer"
                />
                <span className="text-sm font-semibold text-[var(--text)]">Active (Visible on Website)</span>
              </label>
            </div>

          </div>

          {saveMutation.isError && (
            <div className="mt-6 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
              <span>{saveMutation.error instanceof Error ? saveMutation.error.message : 'Unable to save banner. Please check all fields.'}</span>
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
              disabled={!isValid || saveMutation.isPending || uploading}
              className="inline-flex items-center justify-center gap-2 rounded bg-[var(--gold)] px-6 py-2.5 text-sm font-bold uppercase tracking-[0.14em] text-white transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saveMutation.isPending ? 'Saving…' : isEdit ? 'Update Banner' : 'Create Banner'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
