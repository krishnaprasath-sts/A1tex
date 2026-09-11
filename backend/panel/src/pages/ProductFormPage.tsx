import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Image as ImageIcon,
  Layers, Loader2, Package, Sparkles, Tag, Text as TextIcon, ArrowLeft, Save, Info, Palette,
  Plus, X, Check
} from 'lucide-react'
import { createResource, getResource, listResource, resolveImageUrl, updateResource, uploadImage } from '../services/api'
import { isSvgUrl, validateImageFile } from './ResourceShared'
import type { ResourceConfig } from '../app/resources'
import { resources } from '../app/resources'
import FieldWithTooltip from '../components/FieldWithTooltip'
import PreviewCard from '../components/PreviewCard'

const config: ResourceConfig = resources.find(r => r.api === 'products')!
const catConfig: ResourceConfig = resources.find(r => r.api === 'categories')!

const GST_OPTIONS = [
  { value: '0', label: '0% (Nil-rated / exempt)' },
  { value: '5', label: '5% (SGST 2.5% + CGST 2.5%)' },
  { value: '12', label: '12% (SGST 6% + CGST 6%)' },
  { value: '18', label: '18% (SGST 9% + CGST 9%)' },
  { value: '28', label: '28% (SGST 14% + CGST 14%)' },
]

type ProductAudience = 'women' | 'kids' | 'men' | 'unisex'

const SAREE_COLOR_PRESETS = [
  { name: 'Maroon', hex: '#800000' },
  { name: 'Crimson Red', hex: '#C41E3A' },
  { name: 'Rani Pink', hex: '#C71585' },
  { name: 'Royal Blue', hex: '#1D3557' },
  { name: 'Peacock Green', hex: '#005F73' },
  { name: 'Emerald Green', hex: '#0A5C36' },
  { name: 'Mustard Gold', hex: '#D4AF37' },
  { name: 'Deep Purple', hex: '#4B0082' },
  { name: 'Copper Orange', hex: '#D97706' },
  { name: 'Midnight Black', hex: '#1F2937' },
]

const SAREE_SIZE_PRESETS = [
  'Free Size',
  '5.5M + 0.8M Blouse',
  '6.2M (With Blouse)',
  '5.5M (Without Blouse)',
]

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
  <div className="rounded-xl border border-[var(--line)] bg-white shadow-sm overflow-hidden mb-6 transition-all hover:shadow-md">
    <div className="border-b border-[var(--line)] bg-[#FCFBF9] px-6 py-4 flex items-center gap-2">
      {icon && <span className="text-[var(--burgundy)]">{icon}</span>}
      <h3 className="text-[13px] font-bold uppercase tracking-[0.15em] text-[var(--gold)]">{title}</h3>
    </div>
    <div className="p-6">
      {children}
    </div>
  </div>
)

export default function ProductFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const queryClient = useQueryClient()

  const isEdit = Boolean(id)
  const stateItem = (location.state as { item?: Record<string, unknown> } | null)?.item || null

  // Fetch only the single item being edited — NO full products table fetch on form open!
  const { data: editQueryData, isLoading: isFetchingEditItem } = useQuery({
    queryKey: ['resource', config.api, id],
    queryFn: () => getResource(config.api, id as string),
    enabled: isEdit && !!id,
    staleTime: 30000,
  })

  // Categories list for dropdown selection
  const { data: catData } = useQuery({
    queryKey: ['resource', catConfig.api],
    queryFn: () => listResource(catConfig.api, 1, 1000),
    staleTime: 60000,
  })

  const fetchedItem = editQueryData?.item as Record<string, unknown> | undefined
  const editItem = isEdit ? stateItem || fetchedItem || null : null
  const isLoadingItem = isEdit && !stateItem && isFetchingEditItem

  // ─── Saree Product Fields ──────────────────────────────────────
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [featured, setFeatured] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const [isBestSeller, setIsBestSeller] = useState(false)
  const [enableBackInStockNotify, setEnableBackInStockNotify] = useState(false)
  const [washCare, setWashCare] = useState('Dry clean recommended. Store in a soft cotton cloth or saree bag.')
  const [audience] = useState<ProductAudience>('women')
  const [selectedParentId, setSelectedParentId] = useState('')
  const [selectedChildId, setSelectedChildId] = useState('')

  // ─── First Variant / Price & Inventory Fields ─────────────────
  const [variantColorName, setVariantColorName] = useState('Maroon')
  const [variantColorHex, setVariantColorHex] = useState('#800000')
  const [variantPrice, setVariantPrice] = useState('')
  const [variantOriginalPrice, setVariantOriginalPrice] = useState('')
  const [variantStockQty, setVariantStockQty] = useState('10')
  const [variantLowStock, setVariantLowStock] = useState('2')
  const [variantGstRate, setVariantGstRate] = useState('5')
  const [variantSize, setVariantSize] = useState('Free Size')
  const [variantSizeInput, setVariantSizeInput] = useState('')

  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [variantImageUrl, setVariantImageUrl] = useState('')
  const variantFileRef = useRef<HTMLInputElement>(null)
  const [variantUploading, setVariantUploading] = useState(false)
  const [variantUploadError, setVariantUploadError] = useState('')
  const [variantGallery, setVariantGallery] = useState<string[]>([])
  const galleryFileRef = useRef<HTMLInputElement>(null)
  const [galleryUploading, setGalleryUploading] = useState(false)
  const [serverError, setServerError] = useState('')

  useEffect(() => {
    if (editItem) {
      setName(String(editItem.name || ''))
      setSlug(String(editItem.slug || ''))
      setDescription(String(editItem.description || ''))
      setCategory(String(editItem.category || ''))
      setImageUrl(String(editItem.imageUrl || ''))
      setFeatured(Boolean(editItem.featured))
      setIsNew(Boolean(editItem.isNew))
      setIsBestSeller(Boolean(editItem.isBestSeller))
      setEnableBackInStockNotify(Boolean(editItem.enableBackInStockNotify))
      setWashCare(String((editItem.metadata as any)?.washCare || 'Dry clean recommended. Store in a soft cotton cloth or saree bag.'))
      setSlugManuallyEdited(true)
    }
  }, [editItem])

  // Initialize category and subcategory from saved product
  useEffect(() => {
    if (editItem && catData?.items) {
      const savedChildId = String(editItem.subCategoryId || '')
      const savedCatId = String(editItem.categoryId || '')
      const effectiveId = savedChildId || savedCatId
      if (!effectiveId) return

      const targetCat = catData.items.find((c: any) => String(c.id) === effectiveId)
      if (targetCat) {
        if (targetCat.parentId) {
          setSelectedParentId(String(targetCat.parentId))
          setSelectedChildId(String(targetCat.id))
        } else {
          setSelectedParentId(String(targetCat.id))
          if (savedChildId && savedChildId !== String(targetCat.id)) {
            setSelectedChildId(savedChildId)
          }
        }
      } else if (savedCatId) {
        setSelectedParentId(savedCatId)
      }
    }
  }, [editItem, catData])

  useEffect(() => {
    if (!slugManuallyEdited && name) {
      setSlug(slugify(name))
    }
  }, [name, slugManuallyEdited])

  // Sync category name from selection
  useEffect(() => {
    const effectiveId = selectedChildId || selectedParentId
    if (effectiveId && catData?.items) {
      const cat = catData.items.find((c: any) => String(c.id) === effectiveId)
      setCategory(cat ? String(cat.name || '') : '')
    } else {
      setCategory('')
    }
  }, [selectedParentId, selectedChildId, catData])

  const effectiveCategoryId = selectedChildId || selectedParentId

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (isEdit && id) {
        return updateResource(config.api, id, payload)
      }
      return createResource(config.api, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource', config.api] })
      if (isEdit) {
        navigate(config.path, { state: { successMsg: 'Saree updated successfully.' } })
      } else {
        navigate('/products', { state: { successMsg: 'Saree created successfully.' } })
      }
    },
    onError: (err: Error) => {
      setServerError(err.message || 'Unable to save saree.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
  })

  const subCategories = useMemo(() => {
    if (!selectedParentId) return []
    return (catData?.items || [])
      .filter((c: any) => String(c.parentId) === selectedParentId && c.active !== false)
      .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0))
  }, [selectedParentId, catData])

  const parentCategories = useMemo(() => {
    return (catData?.items || [])
      .filter((c: any) => !c.parentId && c.active !== false)
      .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0))
  }, [catData])

  // Fast, user-friendly validation
  const validateForm = () => {
    const errors: Record<string, string> = {}
    const trimmedName = name.trim()
    if (!trimmedName) errors.name = 'Please enter a saree title'
    else if (trimmedName.length < 3) errors.name = 'Title must be at least 3 characters'
    else if (trimmedName.length > 150) errors.name = 'Title cannot exceed 150 characters'

    if (!effectiveCategoryId) errors.categoryId = 'Please select a category'

    if (!isEdit && !imageUrl) {
      errors.imageUrl = 'Please upload a main saree image'
    }
    if (isEdit && !imageUrl && editItem?.imageUrl) {
      errors.imageUrl = 'Product image cannot be removed. Upload a new one or cancel.'
    }

    if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      errors.slug = 'Slug must be lowercase alphanumeric with hyphens only'
    }

    if (!isEdit) {
      if (!variantPrice || isNaN(Number(variantPrice)) || Number(variantPrice) <= 0) {
        errors.variantPrice = 'Please enter a valid selling price'
      }
      if (variantOriginalPrice && (isNaN(Number(variantOriginalPrice)) || Number(variantOriginalPrice) < Number(variantPrice))) {
        errors.variantOriginalPrice = 'MRP must be greater than or equal to selling price'
      }
      if (!variantStockQty || isNaN(parseInt(variantStockQty, 10)) || parseInt(variantStockQty, 10) < 0) {
        errors.variantStockQty = 'Please enter a valid stock quantity'
      }
    }

    return errors
  }

  const allErrors = useMemo(() => validateForm(), [
    name, effectiveCategoryId, imageUrl, isEdit, editItem, slug,
    variantPrice, variantOriginalPrice, variantStockQty
  ])

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  async function handleFile(file: File) {
    setUploadError('')
    const clientCheck = await validateImageFile(file, 'product-card')
    if (!clientCheck.valid) {
      setUploadError(clientCheck.reason)
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    setUploading(true)
    try {
      const data = await uploadImage(file, 'product-card')
      setImageUrl(data.file.path)
      // Automatically use main image for variant image if not set yet!
      if (!variantImageUrl) {
        setVariantImageUrl(data.file.path)
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleVariantFile(file: File) {
    setVariantUploadError('')
    const clientCheck = await validateImageFile(file, 'product-card')
    if (!clientCheck.valid) {
      setVariantUploadError(clientCheck.reason)
      if (variantFileRef.current) variantFileRef.current.value = ''
      return
    }
    setVariantUploading(true)
    try {
      const data = await uploadImage(file, 'product-card')
      setVariantImageUrl(data.file.path)
    } catch (err) {
      setVariantUploadError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setVariantUploading(false)
      if (variantFileRef.current) variantFileRef.current.value = ''
    }
  }

  async function handleVariantGalleryFile(file: File) {
    const clientCheck = await validateImageFile(file, 'product-card')
    if (!clientCheck.valid) return
    setGalleryUploading(true)
    try {
      const data = await uploadImage(file, 'product-card')
      setVariantGallery(prev => [...prev, data.file.path])
    } catch {
      // ignore
    } finally {
      setGalleryUploading(false)
      if (galleryFileRef.current) galleryFileRef.current.value = ''
    }
  }

  const submit = (e?: FormEvent) => {
    if (e) e.preventDefault()
    setServerError('')

    const errs = validateForm()
    if (Object.keys(errs).length > 0) {
      setTouched({
        name: true,
        categoryId: true,
        imageUrl: true,
        variantPrice: true,
        variantOriginalPrice: true,
        variantStockQty: true,
      })
      const firstMsg = Object.values(errs)[0]
      setServerError(firstMsg || 'Please review the highlighted fields.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const payload: Record<string, unknown> = {
      name: name.trim(),
      slug: slug || slugify(name),
      description: description.trim() || null,
      category: category.trim() || null,
      categoryId: effectiveCategoryId ? Number(effectiveCategoryId) : null,
      subCategoryId: selectedChildId ? Number(selectedChildId) : null,
      imageUrl: imageUrl || null,
      gender: audience,
      ageGroup: 'adult',
      featured,
      isNew,
      isBestSeller,
      enableBackInStockNotify,
      // Parcel Dimensions automatically handled in the background
      weightKg: editItem?.weightKg != null ? Number(editItem.weightKg) : 0.5,
      lengthCm: editItem?.lengthCm != null ? Number(editItem.lengthCm) : 10,
      breadthCm: editItem?.breadthCm != null ? Number(editItem.breadthCm) : 10,
      heightCm: editItem?.heightCm != null ? Number(editItem.heightCm) : 5,
      metadata: {
        ...(editItem?.metadata ? (editItem.metadata as Record<string, unknown>) : {}),
        washCare: washCare.trim() || 'Dry clean recommended. Store in a soft cotton cloth or saree bag.',
      },
    }

    if (!isEdit) {
      payload.price = variantPrice ? Number(variantPrice) : 0
      payload.originalPrice = variantOriginalPrice ? Number(variantOriginalPrice) : null
      payload.stockQty = parseInt(variantStockQty, 10) || 10
      payload.sortOrder = 0
      payload.hasVariants = true
      payload.variantType = 'color'
      payload.colorName = variantColorName.trim() || 'Standard'
      payload.colorHex = variantColorHex || '#800000'
      payload.size = variantSize.trim() || 'Free Size'
      payload.sizes = null
      payload.sizeStock = null
      // Auto-generated SKU via backend generateSku()
      payload.sku = null
      payload.lowStockThreshold = parseInt(variantLowStock, 10) || 2
      payload.gstRate = variantGstRate !== '' ? Number(variantGstRate) : 5.00
      payload.variantImageUrl = variantImageUrl || imageUrl || null
      payload.variantImages = variantGallery
    }
    saveMutation.mutate(payload)
  }

  if (isLoadingItem) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--gold)]" />
        <p className="text-sm font-semibold text-[var(--muted)]">Loading saree details…</p>
      </div>
    )
  }

  if (isEdit && !editItem && !isFetchingEditItem) {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--burgundy-soft)]">
          <Package className="h-7 w-7 text-[var(--burgundy)]" />
        </div>
        <p className="text-sm font-semibold text-[var(--muted)]">Saree not found.</p>
        <button
          type="button"
          onClick={() => navigate(config.path)}
          className="inline-flex items-center gap-2 rounded border border-[var(--line)] px-4 py-2 text-sm font-bold text-[var(--gold)] transition-colors hover:bg-[var(--burgundy-soft)]"
        >
          ← Back to Products
        </button>
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

  const discountPercent = variantPrice && variantOriginalPrice && Number(variantOriginalPrice) > Number(variantPrice)
    ? Math.round((1 - Number(variantPrice) / Number(variantOriginalPrice)) * 100)
    : 0

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
            <h1 className="text-xl font-bold text-[var(--text)]">{isEdit ? 'Edit Saree' : 'Add New Saree'}</h1>
            {isEdit && <p className="text-xs text-[var(--muted)] tracking-wider uppercase mt-0.5">{slug}</p>}
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
            type="button"
            onClick={() => submit()}
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-2 rounded bg-[var(--burgundy)] px-6 py-2.5 text-sm font-bold tracking-wide text-white transition-all hover:bg-[#430000] hover:shadow-md disabled:opacity-50"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saveMutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Saree'}
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
          {saveMutation.error instanceof Error ? saveMutation.error.message : 'Unable to save saree.'}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* LEFT COLUMN - 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <SectionCard title="Saree Information" icon={<TextIcon className="h-4 w-4" />}>
            <div className="space-y-5">
              <FieldWithTooltip label="Saree Title" required tooltip="Descriptive name shown to customers on the storefront">
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onBlur={() => handleBlur('name')}
                  placeholder="e.g. Pure Kanchipuram Soft Silk Saree with Rich Zari Pallu"
                  className={getInputClass('name')}
                  maxLength={150}
                />
                <div className="flex justify-between items-center mt-1">
                  {touched.name && allErrors.name ? (
                    <p className="text-xs font-semibold text-red-600">{allErrors.name}</p>
                  ) : <span />}
                  <span className="text-[11px] text-[var(--muted)]">{name.length}/150 characters</span>
                </div>
              </FieldWithTooltip>

              <div className="space-y-1.5">
                <label className="block text-[13px] font-bold uppercase tracking-widest text-[var(--muted)]">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe the fabric, weave, zari work, border, pallu design, and occasion..."
                  rows={4}
                  maxLength={2000}
                  className={`${getInputClass('description')} min-h-[100px] resize-y`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[13px] font-bold uppercase tracking-widest text-[var(--muted)]">
                  Wash & Care Instructions
                </label>
                <input
                  type="text"
                  value={washCare}
                  onChange={e => setWashCare(e.target.value)}
                  placeholder="Dry clean recommended. Store in a soft cotton cloth or saree bag."
                  className={getInputClass('washCare')}
                  maxLength={500}
                />
              </div>
            </div>
          </SectionCard>

          {/* Saree Photos */}
          <SectionCard title="Saree Photos" icon={<ImageIcon className="h-4 w-4" />}>
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-bold uppercase tracking-widest text-[var(--muted)] mb-2">
                  Main Saree Image <span className="text-red-400">*</span>
                </label>
                {imageUrl ? (
                  <div className="group relative overflow-hidden rounded-lg border border-[var(--line)] bg-[#F9FAFB]">
                    <div className="flex items-center justify-center p-4 min-h-[16rem]">
                      <img
                        src={resolveImageUrl(imageUrl)}
                        alt="Product Preview"
                        className="w-full max-h-72 object-contain"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center gap-4 backdrop-blur-sm">
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() => fileRef.current?.click()}
                        className="rounded bg-white px-4 py-2 text-xs font-bold uppercase tracking-widest text-[var(--text)] transition-colors hover:bg-gray-100 shadow-sm disabled:opacity-50"
                      >
                        {uploading ? 'Uploading…' : 'Change Image'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="rounded bg-red-600 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-red-700 shadow-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                    className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[var(--line)] bg-[#F9FAFB] px-4 py-10 text-center transition-all hover:border-[var(--burgundy)] hover:bg-[var(--burgundy-soft)] disabled:opacity-50 group"
                  >
                    {uploading ? (
                      <Loader2 className="h-8 w-8 animate-spin text-[var(--burgundy)]" />
                    ) : (
                      <>
                        <div className="rounded-full bg-white p-3 shadow-sm group-hover:text-[var(--burgundy)]">
                          <ImageIcon className="h-6 w-6 text-[var(--muted)] group-hover:text-[var(--burgundy)] transition-colors" />
                        </div>
                        <div>
                          <span className="block text-sm font-bold text-[var(--text)]">Click to Upload Saree Photo</span>
                          <span className="mt-1 block text-xs text-[var(--muted)]">Any photo size & ratio supported (JPG, PNG, WEBP)</span>
                        </div>
                      </>
                    )}
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleFile(file)
                  }}
                />
                {touched.imageUrl && allErrors.imageUrl && (
                  <p className="mt-1 text-xs font-semibold text-red-600">{allErrors.imageUrl}</p>
                )}
                {uploadError && (
                  <p className="mt-1 text-xs font-semibold text-red-600">{uploadError}</p>
                )}
              </div>

              {/* Optional Additional Photos */}
              <div className="border-t border-[var(--line)] pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-[12px] font-bold uppercase tracking-widest text-[var(--muted)]">
                    Additional Photos <span className="text-[11px] font-normal text-[var(--muted)]">(Optional — Pallu, Border, Blouse closeups)</span>
                  </label>
                  <span className="text-xs text-[var(--muted)]">{variantGallery.length}/6 photos</span>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {variantGallery.map((url, idx) => (
                    <div key={idx} className="group relative overflow-hidden rounded-lg border border-[var(--line)] bg-[#F9FAFB] aspect-square">
                      <img
                        src={resolveImageUrl(url)}
                        alt={`Gallery ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setVariantGallery(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute right-1 top-1 rounded bg-red-600 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {variantGallery.length < 6 && (
                    <button
                      type="button"
                      disabled={galleryUploading}
                      onClick={() => galleryFileRef.current?.click()}
                      className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-[var(--line)] bg-[#F9FAFB] text-center transition-all hover:border-[var(--burgundy)] hover:bg-[var(--burgundy-soft)] disabled:opacity-50 group"
                    >
                      {galleryUploading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-[var(--burgundy)]" />
                      ) : (
                        <>
                          <Plus className="h-5 w-5 text-[var(--muted)] group-hover:text-[var(--burgundy)]" />
                          <span className="text-[11px] font-semibold text-[var(--muted)] group-hover:text-[var(--burgundy)]">+ Add</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <input
                  ref={galleryFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleVariantGalleryFile(file)
                  }}
                />
              </div>
            </div>
          </SectionCard>

          {/* Pricing, Color & Stock */}
          <SectionCard title={isEdit ? 'Variants & Stock' : 'Pricing, Color & Stock'} icon={isEdit ? <Layers className="h-4 w-4" /> : <Tag className="h-4 w-4" />}>
            {isEdit ? (
              <div className="flex flex-col items-center gap-4 py-6 text-center bg-[#F9FAFB] rounded-lg border border-dashed border-[var(--line)]">
                <div className="rounded-full bg-white p-3 shadow-sm">
                  <Layers className="h-6 w-6 text-[var(--gold)]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--text)]">Manage Colors, Stock & Variants</p>
                  <p className="mt-1 text-xs text-[var(--muted)] max-w-md mx-auto">
                    Pricing, color options, and stock quantities are managed directly from the Variants Manager.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/variants?productId=${id}`)}
                  className="inline-flex items-center gap-2 rounded bg-[var(--gold)] px-5 py-2 text-sm font-bold text-white transition-all hover:bg-[var(--gold-soft)] hover:shadow-md"
                >
                  <Layers className="h-4 w-4" />
                  Open Variants Manager
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Pricing */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="block text-[13px] font-bold uppercase tracking-widest text-[var(--muted)]">
                      Selling Price (₹) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--muted)]">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={variantPrice}
                        onChange={e => setVariantPrice(e.target.value)}
                        onBlur={() => handleBlur('variantPrice')}
                        placeholder="2499"
                        className={`${getInputClass('variantPrice')} !pl-9 font-semibold text-lg`}
                      />
                    </div>
                    {touched.variantPrice && allErrors.variantPrice && (
                      <p className="mt-1 text-xs font-semibold text-red-600">{allErrors.variantPrice}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[13px] font-bold uppercase tracking-widest text-[var(--muted)]">
                        Original MRP (₹) <span className="text-[11px] font-normal text-[var(--muted)]">(Optional)</span>
                      </label>
                      {discountPercent > 0 && (
                        <span className="rounded bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-700">
                          {discountPercent}% OFF
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--muted)]">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={variantOriginalPrice}
                        onChange={e => setVariantOriginalPrice(e.target.value)}
                        onBlur={() => handleBlur('variantOriginalPrice')}
                        placeholder="4999"
                        className={`${getInputClass('variantOriginalPrice')} !pl-9`}
                      />
                    </div>
                    {touched.variantOriginalPrice && allErrors.variantOriginalPrice && (
                      <p className="mt-1 text-xs font-semibold text-red-600">{allErrors.variantOriginalPrice}</p>
                    )}
                  </div>
                </div>

                {/* Stock & GST */}
                <div className="grid gap-4 sm:grid-cols-3 border-t border-[var(--line)] pt-4">
                  <div className="space-y-1.5">
                    <label className="block text-[12px] font-bold uppercase tracking-widest text-[var(--muted)]">
                      Stock Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={variantStockQty}
                      onChange={e => setVariantStockQty(e.target.value)}
                      onBlur={() => handleBlur('variantStockQty')}
                      placeholder="10"
                      className={getInputClass('variantStockQty')}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[12px] font-bold uppercase tracking-widest text-[var(--muted)]">
                      Low Stock Alert
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={variantLowStock}
                      onChange={e => setVariantLowStock(e.target.value)}
                      placeholder="2"
                      className={getInputClass('variantLowStock')}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[12px] font-bold uppercase tracking-widest text-[var(--muted)]">
                      GST Rate
                    </label>
                    <select
                      value={variantGstRate}
                      onChange={e => setVariantGstRate(e.target.value)}
                      className={getInputClass('variantGstRate')}
                    >
                      {GST_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Saree Color Palette */}
                <div className="border-t border-[var(--line)] pt-4">
                  <label className="block text-[13px] font-bold uppercase tracking-widest text-[var(--muted)] mb-2">
                    Saree Color
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {SAREE_COLOR_PRESETS.map(preset => {
                      const isSelected = variantColorHex.toLowerCase() === preset.hex.toLowerCase()
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => {
                            setVariantColorName(preset.name)
                            setVariantColorHex(preset.hex)
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition-all ${
                            isSelected
                              ? 'border-[var(--burgundy)] bg-[var(--burgundy-soft)] text-[var(--burgundy)] ring-2 ring-[var(--burgundy)]/20'
                              : 'border-[var(--line)] bg-white text-[var(--text)] hover:border-gray-400'
                          }`}
                        >
                          <span
                            className="inline-block h-3.5 w-3.5 rounded-full border border-black/10 shrink-0"
                            style={{ backgroundColor: preset.hex }}
                          />
                          <span>{preset.name}</span>
                          {isSelected && <Check className="h-3 w-3" />}
                        </button>
                      )
                    })}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 mt-2">
                    <div className="space-y-1">
                      <span className="text-[11px] text-[var(--muted)]">Custom Color Name</span>
                      <input
                        type="text"
                        value={variantColorName}
                        onChange={e => setVariantColorName(e.target.value)}
                        placeholder="e.g. Maroon"
                        className={getInputClass('variantColorName')}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] text-[var(--muted)]">Color Hex</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={variantColorHex}
                          onChange={e => setVariantColorHex(e.target.value)}
                          className="h-[42px] w-14 cursor-pointer rounded-lg border border-[var(--line)] bg-transparent p-1"
                        />
                        <input
                          type="text"
                          value={variantColorHex}
                          onChange={e => setVariantColorHex(e.target.value)}
                          className={`${getInputClass('variantColorHex')} uppercase`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Saree Size / Length */}
                <div className="border-t border-[var(--line)] pt-4">
                  <label className="block text-[13px] font-bold uppercase tracking-widest text-[var(--muted)] mb-2">
                    Saree Length / Size
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {SAREE_SIZE_PRESETS.map(size => {
                      const active = variantSize === size
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setVariantSize(size)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                            active
                              ? 'border-[var(--burgundy)] bg-[var(--burgundy)] text-white'
                              : 'border-[var(--line)] bg-[#F9FAFB] text-[var(--text)] hover:border-gray-400'
                          }`}
                        >
                          {size}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </SectionCard>
        </div>

        {/* RIGHT COLUMN - 1/3 */}
        <div className="space-y-6">
          {/* Category */}
          <SectionCard title="Category" icon={<Tag className="h-4 w-4" />}>
            <div className="space-y-4">
              <FieldWithTooltip
                label="Parent Category"
                required
                tooltip="Select the main saree category (e.g. Kanchipuram Silk, Cotton Sarees)"
              >
                <select
                  value={selectedParentId}
                  onChange={e => {
                    setSelectedParentId(e.target.value)
                    setSelectedChildId('')
                  }}
                  onBlur={() => handleBlur('categoryId')}
                  className={getInputClass('categoryId')}
                >
                  <option value="">— Select Category —</option>
                  {parentCategories.map((c: any) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {touched.categoryId && allErrors.categoryId && (
                  <p className="mt-1 text-xs font-semibold text-red-600">{allErrors.categoryId}</p>
                )}
              </FieldWithTooltip>

              {subCategories.length > 0 && (
                <FieldWithTooltip
                  label="Subcategory"
                  tooltip="Optional: choose a specific subcategory or leave as parent"
                >
                  <select
                    value={selectedChildId}
                    onChange={e => setSelectedChildId(e.target.value)}
                    className={getInputClass('categoryId')}
                  >
                    <option value="">— None (Directly under parent) —</option>
                    {subCategories.map((c: any) => (
                      <option key={c.id} value={String(c.id)}>{c.name}</option>
                    ))}
                  </select>
                </FieldWithTooltip>
              )}
            </div>
          </SectionCard>

          {/* Saree Badges & Highlights */}
          <SectionCard title="Storefront Badges" icon={<Sparkles className="h-4 w-4" />}>
            <div className="space-y-3">
              <label className="flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-[#F9FAFB] p-3 cursor-pointer transition-colors hover:border-[var(--burgundy-soft)]">
                <div>
                  <span className="block text-[13px] font-bold text-[var(--text)]">Featured Saree</span>
                  <span className="block text-[11px] text-[var(--muted)]">Show in featured collections</span>
                </div>
                <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors" style={{ backgroundColor: featured ? 'var(--burgundy)' : 'var(--line)' }}>
                  <input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} className="peer sr-only" />
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${featured ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
              </label>

              <label className="flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-[#F9FAFB] p-3 cursor-pointer transition-colors hover:border-[var(--burgundy-soft)]">
                <div>
                  <span className="block text-[13px] font-bold text-[var(--text)]">New Arrival</span>
                  <span className="block text-[11px] text-[var(--muted)]">Displays "New" badge</span>
                </div>
                <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors" style={{ backgroundColor: isNew ? 'var(--burgundy)' : 'var(--line)' }}>
                  <input
                    type="checkbox"
                    checked={isNew}
                    onChange={e => {
                      setIsNew(e.target.checked)
                      if (e.target.checked) setIsBestSeller(false)
                    }}
                    className="peer sr-only"
                  />
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isNew ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
              </label>

              <label className="flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-[#F9FAFB] p-3 cursor-pointer transition-colors hover:border-[var(--burgundy-soft)]">
                <div>
                  <span className="block text-[13px] font-bold text-[var(--text)]">Best Seller</span>
                  <span className="block text-[11px] text-[var(--muted)]">Displays "Best Seller" badge</span>
                </div>
                <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors" style={{ backgroundColor: isBestSeller ? 'var(--burgundy)' : 'var(--line)' }}>
                  <input
                    type="checkbox"
                    checked={isBestSeller}
                    onChange={e => {
                      setIsBestSeller(e.target.checked)
                      if (e.target.checked) setIsNew(false)
                    }}
                    className="peer sr-only"
                  />
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isBestSeller ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
              </label>
            </div>
          </SectionCard>

          {/* Storefront Preview */}
          <div className="space-y-2 sticky top-[100px]">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-[var(--muted)] px-2">Storefront Preview</h4>
            <PreviewCard
              name={name || 'Saree Title'}
              imageUrl={imageUrl}
              tag={isNew ? 'New' : isBestSeller ? 'Best Seller' : undefined}
              price={variantPrice}
            />
          </div>
        </div>
      </div>
    </form>
  )
}
