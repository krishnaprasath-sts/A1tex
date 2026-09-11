import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, Check, ChevronDown, ChevronLeft, ChevronRight, Copy, Edit3, FileUp, Image as ImageIcon,
  Layers, Loader2, Plus, Search, Trash2, X,
} from 'lucide-react'
import { createVariant, deleteVariant, deleteVariantImage, downloadVariantImportSampleUrl, importVariants, listAllVariants, listResource, resolveImageUrl, updateVariant, uploadVariantImage, uploadVariantMainImage } from '../services/api'
import { DeleteConfirmDialog, itemLabel } from './ResourceShared'

const ITEMS_PER_PAGE = 20

const variantTypeLabels: Record<string, string> = {
  color: 'Color',
  size: 'Size',
}

type ProductAudience = 'women' | 'kids' | 'men' | 'unisex'

const SIZE_PRESETS: Record<ProductAudience, string[]> = {
  women: ['Free Size', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
  men: ['S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'],
  kids: ['0-6M', '6-12M', '1-2Y', '2-3Y', '3-4Y', '4-5Y', '5-6Y', '6-7Y', '7-8Y', '8-10Y', '10-12Y', '12-14Y'],
  unisex: ['Free Size', 'S', 'M', 'L', 'XL', 'XXL'],
}

function coerceAudience(value: unknown): ProductAudience {
  const audience = String(value || '').toLowerCase()
  if (audience === 'kids' || audience === 'boys' || audience === 'girls') return 'kids'
  if (audience === 'men') return 'men'
  if (audience === 'unisex') return 'unisex'
  return 'women'
}


const emptyForm = () => ({
  variantType: 'color' as 'color' | 'size',
  colorName: '',
  colorHex: '#000000',
  size: '',
  sku: '',
  price: '',
  originalPrice: '',
  stockQty: '0',
  lowStockThreshold: '10',
  gstRate: '5',
  productId: '',
  imageUrl: '',
})

export default function VariantsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const productId = searchParams.get('productId') ? Number(searchParams.get('productId')) : undefined
  const [currentPage, setCurrentPage] = useState(1)
  const queryClient = useQueryClient()

  const [showModal, setShowModal] = useState(false)
  const [editingVariant, setEditingVariant] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [form, setForm] = useState(emptyForm())
  const [formErrors, setFormErrors] = useState<string>('')
  const [formFieldErrors, setFormFieldErrors] = useState<Record<string, string>>({})
  const [successMsg, setSuccessMsg] = useState('')


  const [sizeInput, setSizeInput] = useState('')
  const [variantImageUrl, setVariantImageUrl] = useState('')
  const [variantImages, setVariantImages] = useState<any[]>([])
  const [uploadingMain, setUploadingMain] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const [imageError, setImageError] = useState('')
  const [deleteImageConfirm, setDeleteImageConfirm] = useState<number | null>(null)
  const [uploadWarnings, setUploadWarnings] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<{ total: number; created: number; errors: { row: number; message: string }[] } | null>(null)
  const mainFileRef = useRef<HTMLInputElement>(null)
  const galleryFileRef = useRef<HTMLInputElement>(null)
  // Create-mode pending files (stored locally, uploaded after variant is created)
  const [pendingMainFile, setPendingMainFile] = useState<File | null>(null)
  const [pendingMainPreview, setPendingMainPreview] = useState('')
  const [pendingGalleryFiles, setPendingGalleryFiles] = useState<File[]>([])
  const [pendingGalleryPreviews, setPendingGalleryPreviews] = useState<string[]>([])
  const createMainFileRef = useRef<HTMLInputElement>(null)
  const createGalleryFileRef = useRef<HTMLInputElement>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-variants', currentPage, productId, search],
    queryFn: () => listAllVariants(currentPage, ITEMS_PER_PAGE, productId, search || undefined),
  })

  const { data: productData } = useQuery({
    queryKey: ['resource', 'products', 'all'],
    queryFn: () => listResource('products', 1, 1000),
  })

  const items = data?.items || []
  const totalPages = data?.totalPages ?? 1
  const products = productData?.items || []
  const selectedProduct = productId
    ? products.find((p: any) => Number(p.id) === productId) || (items[0] as any)?.Product
    : products.find((p: any) => String(p.id) === String(form.productId)) || null
  const productName: string = selectedProduct?.name || (items[0] as any)?.Product?.name
  const productAudience = coerceAudience(selectedProduct?.gender || (items[0] as any)?.Product?.gender)
  const sizePresets = SIZE_PRESETS[productAudience] || SIZE_PRESETS.women
  const computedVariantType: 'color' | 'size' = form.colorName.trim() ? 'color' : 'size'
  const [showClonePicker, setShowClonePicker] = useState(false)
  const cloneRef = useRef<HTMLDivElement>(null)

  const cloneProductId = productId ?? (form.productId ? Number(form.productId) : undefined)
  const { data: cloneVariantsData } = useQuery({
    queryKey: ['clone-variants', cloneProductId],
    queryFn: () => listAllVariants(1, 50, cloneProductId, ''),
    enabled: !!cloneProductId && showModal && !editingVariant,
  })
  const cloneVariants = (cloneVariantsData?.items || [])
    .filter((v: any) => v.colorName)
    .filter((v: any, idx: number, arr: any[]) => arr.findIndex((x: any) => x.colorName === v.colorName) === idx)

  const toggleProduct = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const groupedByProduct = !productId ? (() => {
    const map = new Map<number, { product: any; variants: any[] }>()
    for (const v of items) {
      const pid = Number(v.productId)
      if (!map.has(pid)) map.set(pid, { product: (v as any).Product || { id: pid, name: `Product #${pid}` }, variants: [] })
      map.get(pid)!.variants.push(v)
    }
    return Array.from(map.values())
  })() : null

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-variants'] })
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const pid = productId ?? Number(form.productId)
      const cleanPrice = (v: string) => v.replace(/,/g, '')

      if (editingVariant) {
        const fieldErrors = validateForm()
        if (fieldErrors) {
          const firstError = Object.values(fieldErrors)[0]
          throw new Error(firstError || 'Please fix validation errors.')
        }
        const payload: Record<string, unknown> = {
          variantType: computedVariantType,
          colorName: form.colorName.trim() || null,
          colorHex: form.colorName.trim() ? (form.colorHex || '#000000') : null,
          size: form.size.trim() || null,
          sizes: null,
          sizeStock: null,
          sku: form.sku || null,
          price: form.price ? Number(cleanPrice(form.price)) : null,
          originalPrice: form.originalPrice ? Number(cleanPrice(form.originalPrice)) : null,
          stockQty: parseInt(form.stockQty, 10) || 0,
          lowStockThreshold: parseInt(form.lowStockThreshold, 10) || 10,
          gstRate: form.gstRate !== '' ? Number(form.gstRate) : 5,
          status: editingVariant.status,
          isDefault: editingVariant.isDefault,
          sortOrder: editingVariant.sortOrder,
        }
        return updateVariant(pid, editingVariant.id, payload)
      }

      const fieldErrors = validateForm()
      if (fieldErrors) {
        const firstError = Object.values(fieldErrors)[0]
        throw new Error(firstError || 'Please fix validation errors.')
      }
      const payload: Record<string, unknown> = {
        variantType: computedVariantType,
        colorName: form.colorName.trim() || null,
        colorHex: form.colorName.trim() ? (form.colorHex || '#000000') : null,
        size: form.size.trim() || null,
        sizes: null,
        sizeStock: null,
        sku: form.sku || null,
        price: form.price ? Number(cleanPrice(form.price)) : null,
        originalPrice: form.originalPrice ? Number(cleanPrice(form.originalPrice)) : null,
        stockQty: parseInt(form.stockQty, 10) || 0,
        lowStockThreshold: parseInt(form.lowStockThreshold, 10) || 10,
        gstRate: form.gstRate !== '' ? Number(form.gstRate) : 5,
        imageUrl: form.imageUrl || null,
      }
      // Create variant first to get variantId
      const result = await createVariant(pid, payload)
      const newVariantId = (result as any)?.item?.id
      const warnings: string[] = []
      // Auto-upload pending images using the newly created variantId
      if (newVariantId) {
        if (pendingMainFile) {
          try {
            await uploadVariantMainImage(pid, newVariantId, pendingMainFile)
          } catch (err: any) {
            warnings.push('Failed to upload main image: ' + (err?.message || 'Unknown error'))
          }
        }
        for (const file of pendingGalleryFiles) {
          try {
            await uploadVariantImage(pid, newVariantId, file, 'variant-gallery')
          } catch (err: any) {
            warnings.push('Failed to upload gallery image "' + file.name + '": ' + (err?.message || 'Unknown error'))
          }
        }
      }
      return { result, warnings }
    },
    onSuccess: (data: any) => {
      setShowModal(false)
      setEditingVariant(null)
      setForm(emptyForm())
      setSizeInput('')
      setVariantImageUrl('')
      setVariantImages([])
      // Clear pending create-mode files
      setPendingMainFile(null)
      setPendingMainPreview('')
      setPendingGalleryFiles([])
      setPendingGalleryPreviews([])
      invalidate()
      const warnings = data?.warnings || []
      setUploadWarnings(warnings)
      setSuccessMsg(editingVariant ? 'Variant updated successfully.' : 'Variant created successfully.')
      setFormErrors('')
      setImageError('')
      setTimeout(() => { setSuccessMsg(''); setUploadWarnings([]) }, 6000)
    },
    onError: (err: Error) => {
      setFormErrors(err.message || 'Failed to save variant.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => {
      const pid = deleteTarget?.productId || productId
      return deleteVariant(pid, deleteTarget.id)
    },
    onSuccess: () => {
      setDeleteTarget(null)
      invalidate()
      setSuccessMsg('Variant deleted successfully.')
      setTimeout(() => setSuccessMsg(''), 4000)
    },
  })

  const importMutation = useMutation({
    mutationFn: (f: File) => importVariants(f),
    onSuccess: (data) => {
      setImportResult(data)
      invalidate()
      setSuccessMsg(`${data.created} variant(s) imported.`)
      setTimeout(() => setSuccessMsg(''), 6000)
    },
    onError: (err: Error) => {
      setImportResult({ total: 0, created: 0, errors: [{ row: 0, message: err.message }] })
    },
  })

  const handleUploadMain = async (file: File) => {
    if (!editingVariant) {
      setImageError('Save the variant first before uploading images.')
      return
    }
    setUploadingMain(true)
    setImageError('')
    try {
      const pid = productId ?? Number(form.productId)
      const data = await uploadVariantMainImage(pid, editingVariant.id, file)
      setVariantImageUrl(data.imageUrl)
      setForm(f => ({ ...f, imageUrl: data.imageUrl }))
    } catch (err: any) {
      setImageError(err.message || 'Failed to upload image.')
    } finally {
      setUploadingMain(false)
      if (mainFileRef.current) mainFileRef.current.value = ''
    }
  }

  const handleUploadGallery = async (file: File) => {
    if (!editingVariant) {
      setImageError('Save the variant first before uploading images.')
      return
    }
    setUploadingGallery(true)
    setImageError('')
    try {
      const pid = productId ?? Number(form.productId)
      const data = await uploadVariantImage(pid, editingVariant.id, file, 'variant-gallery')
      setVariantImages(prev => [...prev, data.file])
    } catch (err: any) {
      setImageError(err.message || 'Failed to upload gallery image.')
    } finally {
      setUploadingGallery(false)
      if (galleryFileRef.current) galleryFileRef.current.value = ''
    }
  }

  const handleDeleteGalleryImage = async (imageId: number) => {
    try {
      const pid = productId ?? Number(form.productId)
      await deleteVariantImage(pid, editingVariant.id, imageId)
      setVariantImages(prev => prev.filter(img => img.id !== imageId))
      setDeleteImageConfirm(null)
    } catch (err: any) {
      setImageError(err.message || 'Failed to delete image.')
      setDeleteImageConfirm(null)
    }
  }

  const openAdd = () => {
    setEditingVariant(null)
    setForm(emptyForm())
    setSizeInput('')
    setFormErrors('')
    setFormFieldErrors({})
    // Clear any leftover pending files from a previous open
    setPendingMainFile(null)
    setPendingMainPreview('')
    setPendingGalleryFiles([])
    setPendingGalleryPreviews([])
    setVariantImageUrl('')
    setVariantImages([])
    setImageError('')
    setShowClonePicker(false)
    setShowModal(true)
  }

  const openEdit = (v: any) => {
    setEditingVariant(v)
    const existingSize = v.size || (Array.isArray(v.sizes) && v.sizes.length === 1 ? v.sizes[0] : '') || ''
    setSizeInput('')
    setForm({
      variantType: v.variantType || 'color',
      colorName: v.colorName || '',
      colorHex: v.colorHex || '#000000',
      size: existingSize,
      sku: v.sku || '',
      price: v.price != null ? String(v.price) : '',
      originalPrice: v.originalPrice != null ? String(v.originalPrice) : '',
      stockQty: String(v.stockQty ?? 0),
      lowStockThreshold: String(v.lowStockThreshold ?? 10),
      gstRate: v.gstRate != null ? String(Number(v.gstRate)) : '5',
      productId: String(v.productId || ''),
      imageUrl: v.imageUrl || '',
    })
    setVariantImageUrl(v.imageUrl || '')
    setVariantImages(v.images || [])
    setFormErrors('')
    setFormFieldErrors({})
    setImageError('')
    setShowClonePicker(false)
    setShowModal(true)
  }

  const validateForm = (): Record<string, string> | null => {
    const errors: Record<string, string> = {}
    if (!form.size.trim()) {
      errors.size = 'Size is required.'
    }
    if (!form.colorName.trim()) {
      errors.colorName = 'Color name is required.'
    } else if (form.colorName.trim().length < 3) {
      errors.colorName = 'Color name must be at least 3 characters.'
    } else if (form.colorName.trim().length > 30) {
      errors.colorName = 'Color name cannot exceed 30 characters.'
    }
    if (!form.colorHex) {
      errors.colorHex = 'Color hex is required.'
    }
    const parsedPrice = form.price ? Number(form.price.replace(/,/g, '')) : null
    if (!parsedPrice || isNaN(parsedPrice) || parsedPrice <= 0) {
      errors.price = 'Selling price must be greater than 0.'
    }
    const parsedOrig = form.originalPrice ? Number(form.originalPrice.replace(/,/g, '')) : null
    if (!parsedOrig || isNaN(parsedOrig) || parsedOrig <= 0) {
      errors.originalPrice = 'Original price is required and must be greater than 0.'
    } else if (parsedPrice && !isNaN(parsedPrice) && parsedOrig < parsedPrice) {
      errors.originalPrice = 'Original price must be >= selling price.'
    }
    const stockVal = parseInt(form.stockQty, 10)
    if (form.stockQty.trim() === '' || isNaN(stockVal)) {
      errors.stockQty = 'Stock quantity is required.'
    } else if (stockVal < 0) {
      errors.stockQty = 'Stock quantity cannot be negative.'
    }
    if (form.sku.trim() && form.sku.trim().length < 3) {
      errors.sku = 'SKU must be at least 3 characters.'
    }
    if (!form.lowStockThreshold.trim() || isNaN(Number(form.lowStockThreshold)) || Number(form.lowStockThreshold) < 0) {
      errors.lowStockThreshold = 'Low stock threshold is required.'
    }
    if (!form.gstRate || form.gstRate.trim() === '') {
      errors.gstRate = 'GST rate is required.'
    }
    if (!productId && !form.productId) {
      errors.productId = 'Select a product.'
    }
    // Main image is required when creating a new variant (file upload or cloned URL)
    if (!editingVariant && !pendingMainFile && !form.imageUrl) {
      errors.mainImage = 'Main image is required. Please select an image or clone from a variant.'
    }
    setFormFieldErrors(errors)
    return Object.keys(errors).length === 0 ? null : errors
  }

  return (
    <div className="space-y-6">
      <section className="admin-card rounded-lg p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            {productId ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/products')}
                  className="inline-flex items-center gap-1.5 rounded border border-[var(--line)] px-3 py-1.5 text-xs font-bold text-[var(--muted)] transition-colors hover:bg-[var(--burgundy-soft)]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Products
                </button>
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[var(--burgundy)]">
                  Product Variants
                </p>
              </div>
            ) : (
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[var(--burgundy)]">
                Product Variants
              </p>
            )}
            <h1 className="mt-2 flex items-center gap-3 font-display text-3xl font-semibold text-[var(--gold)] md:text-4xl">
              <Layers className="h-7 w-7 md:h-8 md:w-8" />
              {productId && productName ? productName : 'Variants'}
            </h1>
            {productId && (
              <p className="mt-1 text-sm text-[var(--muted)]">
                {data?.total || 0} variant(s) for this product
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput.trim()); setCurrentPage(1) } }}
                placeholder="Search variants..."
                className="h-10 w-56 rounded-lg border border-[var(--line)] bg-[#F9FAFB] pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-[var(--muted)]/60 focus:border-[var(--burgundy)] focus:ring-4 focus:ring-[var(--burgundy-soft)]"
              />
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            </div>
            <button
              type="button"
              onClick={() => { setSearch(searchInput.trim()); setCurrentPage(1) }}
              className="inline-flex items-center gap-2 rounded border border-[var(--line)] px-3 py-2.5 text-sm font-bold text-[var(--gold)] transition-colors hover:bg-[var(--burgundy-soft)]"
            >
              Search
            </button>
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(''); setSearchInput(''); setCurrentPage(1) }}
                className="inline-flex items-center gap-2 rounded border border-[var(--line)] px-3 py-2.5 text-sm font-bold text-[var(--muted)] transition-colors hover:bg-[var(--burgundy-soft)]"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => { setShowImportModal(true); setImportFile(null); setImportResult(null) }}
              className="admin-btn-outline inline-flex items-center gap-2 px-4 py-2.5 text-sm"
            >
              <FileUp className="h-4 w-4" />
              Import
            </button>
            <button
              type="button"
              onClick={openAdd}
              className="admin-btn inline-flex items-center gap-2 px-4 py-2.5 text-sm"
            >
              <Plus className="h-4 w-4" />
              Add Variant
            </button>
          </div>
        </div>
      </section>

      {successMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {successMsg}
        </div>
      )}
      {uploadWarnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          <p className="mb-1 font-bold">Variant saved, but some image uploads failed:</p>
          <ul className="list-disc pl-4 text-xs space-y-0.5">
            {uploadWarnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      <section className="admin-card overflow-hidden rounded-lg">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--burgundy)]" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <Layers className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-gray-500">No variants found.</p>
            <button
              type="button"
              onClick={openAdd}
              className="mt-3 admin-btn inline-flex items-center gap-2 px-4 py-2 text-sm"
            >
              <Plus className="h-4 w-4" />
              Add First Variant
            </button>
          </div>
        ) : productId ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[var(--panel-strong)] text-[13.5px] font-bold uppercase tracking-wider text-[var(--muted)]">
                <tr>
                  <th className="w-10 border border-[var(--line)] px-2 py-3 text-center text-xs font-bold text-[var(--muted)]">S.No</th>
                  <th className="border border-[var(--line)] px-4 py-3 font-bold">Category Name</th>
                  <th className="border border-[var(--line)] px-4 py-3 font-bold">Subcategory Name</th>
                  <th className="border border-[var(--line)] px-4 py-3 font-bold">Variant</th>
                  <th className="border border-[var(--line)] px-4 py-3 font-bold">Product Name</th>
                  <th className="border border-[var(--line)] px-4 py-3 font-bold">Product MRP</th>
                  <th className="border border-[var(--line)] px-4 py-3 font-bold">Selling Price</th>
                  <th className="border border-[var(--line)] px-4 py-3 font-bold">Product Qty</th>
                  <th className="border border-[var(--line)] px-4 py-3 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, idx: number) => (
                  <tr key={item.id} className="transition-colors hover:bg-[var(--burgundy-soft)]/20">
                    <td className="w-10 border border-[var(--line)] px-2 py-3 text-center text-xs font-bold text-[var(--muted)]">
                      {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                    </td>
                    <td className="border border-[var(--line)] px-4 py-3 text-xs font-medium text-[var(--muted)]">
                      {item.Product?.categoryName || '—'}
                    </td>
                    <td className="border border-[var(--line)] px-4 py-3 text-xs font-medium text-[var(--muted)]">
                      {item.Product?.subcategoryName || '—'}
                    </td>
                    <td className="border border-[var(--line)] px-4 py-3">
                      {(() => {
                        const colorPart = item.colorName ? [item.colorName].filter(Boolean) : []
                        const sizePart = item.size ? [item.size] : (item.sizes && item.sizes.length > 0 ? item.sizes : [])
                        const displayParts = [...colorPart, ...sizePart]
                        return (
                          <div className="flex items-center gap-2">
                            {item.colorHex && <span className="inline-block h-4 w-4 shrink-0 rounded-full border border-[var(--line)]" style={{ backgroundColor: item.colorHex }} />}
                            <span>{displayParts.join(' / ') || '—'}</span>
                          </div>
                        )
                      })()}
                    </td>
                    <td className="border border-[var(--line)] px-4 py-3 font-medium text-[var(--text)]">{item.Product?.name || `Product #${item.productId}`}</td>
                    <td className="border border-[var(--line)] px-4 py-3 font-medium text-[var(--text)]">
                      {item.originalPrice != null ? `₹${Number(item.originalPrice).toLocaleString()}` : '—'}
                    </td>
                    <td className="border border-[var(--line)] px-4 py-3 font-medium text-[var(--text)]">
                      {item.price != null ? `₹${Number(item.price).toLocaleString()}` : '—'}
                      {item.price != null && item.originalPrice != null && Number(item.originalPrice) > Number(item.price) && (
                        <span className="ml-1.5 text-[10px] text-green-600">-{Math.round((1 - Number(item.price) / Number(item.originalPrice)) * 100)}%</span>
                      )}
                    </td>
                    <td className="border border-[var(--line)] px-4 py-3">
                      <span className={`font-medium ${Number(item.stockQty) <= Number(item.lowStockThreshold) ? 'text-red-600' : 'text-[var(--text)]'}`}>
                        {item.size ? `${item.size}: ${item.stockQty}` : item.stockQty}
                      </span>
                    </td>
                    <td className="border border-[var(--line)] px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="rounded border border-[var(--line)] p-1.5 text-[var(--gold)] transition-colors hover:bg-[var(--burgundy-soft)]"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          className="rounded border border-red-200 p-1.5 text-red-600 transition-colors hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div>
            {groupedByProduct?.map(({ product, variants }) => {
              const isExpanded = expanded.has(product.id)
              const hasLowStock = variants.some((v: any) => Number(v.stockQty) <= Number(v.lowStockThreshold ?? 10))
              return (
                <div key={product.id} className="border-b border-gray-100 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => toggleProduct(product.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50/50"
                  >
                    {variants.length > 0 ? (
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                    ) : (
                      <span className="w-4" />
                    )}
                    {product.imageUrl && (
                      <img src={resolveImageUrl(product.imageUrl)} alt="" className="h-10 w-8 rounded object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-gray-900">{product.name}</p>
                      {product.categoryName && <p className="text-xs text-gray-400">{product.categoryName}{product.subcategoryName ? ` › ${product.subcategoryName}` : ''}</p>}
                    </div>
                    {hasLowStock && (
                      <span className="inline-flex shrink-0 items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">Low Stock</span>
                    )}
                    <span className="text-sm text-gray-500">{variants.length} variant{variants.length !== 1 ? 's' : ''}</span>
                    <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </button>
                  {isExpanded && variants.length > 0 && (
                    <div className="border-t border-[var(--line)] bg-[var(--panel-strong)]/30">
                      <table className="w-full border-collapse text-left text-sm">
                        <thead>
                          <tr className="bg-[var(--panel-strong)] text-[13.5px] font-bold uppercase tracking-wider text-[var(--muted)]">
                            <th className="w-8 border border-[var(--line)] px-2 py-2 text-center font-bold">#</th>
                            <th className="border border-[var(--line)] px-4 py-2 font-bold">Variant</th>
                            <th className="border border-[var(--line)] px-4 py-2 font-bold">MRP</th>
                            <th className="border border-[var(--line)] px-4 py-2 font-bold">Selling Price</th>
                            <th className="border border-[var(--line)] px-4 py-2 font-bold">Stock</th>
                            <th className="border border-[var(--line)] px-4 py-2 font-bold">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {variants.map((v: any, vIdx: number) => {
                            const colorPart = v.colorName ? [v.colorName] : []
                            const sizePart = v.size ? [v.size] : []
                            const displayParts = [...colorPart, ...sizePart]
                            return (
                              <tr key={v.id} className="transition-colors hover:bg-[var(--burgundy-soft)]/20">
                                <td className="w-8 border border-[var(--line)] px-2 py-2.5 text-center text-xs font-bold text-[var(--muted)]">{vIdx + 1}</td>
                                <td className="border border-[var(--line)] px-4 py-2.5">
                                  <div className="flex items-center gap-2">
                                    {v.colorHex && <span className="inline-block h-4 w-4 shrink-0 rounded-full border border-[var(--line)]" style={{ backgroundColor: v.colorHex }} />}
                                    <span className="font-medium text-[var(--text)]">{displayParts.join(' / ') || v.label || '—'}</span>
                                    {v.isDefault && <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">DEFAULT</span>}
                                  </div>
                                </td>
                                <td className="border border-[var(--line)] px-4 py-2.5 font-medium text-[var(--text)]">{v.originalPrice != null ? `₹${Number(v.originalPrice).toLocaleString()}` : '—'}</td>
                                <td className="border border-[var(--line)] px-4 py-2.5 font-medium text-[var(--text)]">
                                  {v.price != null ? `₹${Number(v.price).toLocaleString()}` : '—'}
                                  {v.price != null && v.originalPrice != null && Number(v.originalPrice) > Number(v.price) && (
                                    <span className="ml-1.5 text-[10px] text-green-600">-{Math.round((1 - Number(v.price) / Number(v.originalPrice)) * 100)}%</span>
                                  )}
                                </td>
                                <td className="border border-[var(--line)] px-4 py-2.5">
                                  <span className={`font-medium ${Number(v.stockQty) <= Number(v.lowStockThreshold ?? 10) ? 'text-red-600' : 'text-[var(--text)]'}`}>{v.stockQty}</span>
                                </td>
                                <td className="border border-[var(--line)] px-4 py-2.5">
                                  <div className="flex gap-2">
                                    <button type="button" onClick={() => openEdit(v)} className="rounded border border-[var(--line)] p-1.5 text-[var(--gold)] transition-colors hover:bg-[var(--burgundy-soft)]"><Edit3 className="h-3.5 w-3.5" /></button>
                                    <button type="button" onClick={() => setDeleteTarget(v)} className="rounded border border-red-200 p-1.5 text-red-600 transition-colors hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <span className="text-sm text-gray-500">
              Page {currentPage} of {totalPages} ({data?.total || 0} variants)
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Add/Edit Variant Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm py-10">
          <div className="mx-4 w-full max-w-2xl rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--burgundy)]">
                {editingVariant ? 'Edit Variant' : 'Add New Variant'}
              </h2>
              <button
                type="button"
                onClick={() => { setShowModal(false); setEditingVariant(null); setSizeInput(''); setFormFieldErrors({}); setShowClonePicker(false) }}
                className="rounded p-1 text-[var(--muted)] transition-colors hover:bg-[var(--burgundy-soft)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formErrors && (
              <div className="mb-4 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {formErrors}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {!productId && (
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Product *</label>
                  <select
                    value={form.productId || ''}
                    onChange={e => {
                      setForm(f => ({ ...f, productId: e.target.value }))
                    }}
                    className={`admin-input w-full rounded ${formFieldErrors.productId ? 'border-red-500' : ''}`}
                  >
                    <option value="">Select a product</option>
                    {products.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.code || `#${p.id}`})</option>
                    ))}
                  </select>
                  {formFieldErrors.productId && <p className="text-xs font-semibold text-red-600">{formFieldErrors.productId}</p>}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Product Audience</label>
                <div className="rounded border border-[var(--line)] bg-[var(--panel-strong)] px-3 py-2 text-sm font-bold capitalize text-[var(--burgundy)]">
                  {productAudience}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Computed Variant Type</label>
                <div className="rounded border border-[var(--line)] bg-[var(--panel-strong)] px-3 py-2 text-sm font-bold text-[var(--text)]">
                  {variantTypeLabels[computedVariantType]}
                </div>
              </div>

    <div className="space-y-1">
      <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Color Name <span className="text-red-500">*</span></label>
      <div className="flex gap-2">
        <input
          type="text"
          value={form.colorName}
          onChange={e => setForm(f => ({ ...f, colorName: e.target.value }))}
          className={`admin-input flex-1 rounded ${formFieldErrors.colorName ? 'border-red-500' : ''}`}
          placeholder="e.g. Cherry Red"
          maxLength={30}
        />
        {!editingVariant && (
          <button
            type="button"
            onClick={() => setShowClonePicker(o => !o)}
            className="shrink-0 rounded border border-[var(--line)] px-2 py-1.5 text-[var(--gold)] hover:bg-[var(--burgundy-soft)] transition-colors"
            title="Clone from existing variant"
          >
            <Copy className="h-4 w-4" />
          </button>
        )}
      </div>
      {showClonePicker && cloneVariants.length > 0 && (
        <div ref={cloneRef} className="rounded border border-[var(--line)] bg-white shadow-lg max-h-48 overflow-y-auto mt-1">
          {cloneVariants.map((v: any) => (
            <button
              type="button"
              key={v.id}
              onClick={() => {
                setForm(f => ({
                  ...f,
                  colorName: v.colorName || '',
                  colorHex: v.colorHex || '#000000',
                  size: v.size || f.size,
                  sku: v.sku || f.sku,
                  price: v.price != null ? String(v.price) : f.price,
                  originalPrice: v.originalPrice != null ? String(v.originalPrice) : f.originalPrice,
                  stockQty: String(v.stockQty ?? f.stockQty),
                  lowStockThreshold: String(v.lowStockThreshold ?? f.lowStockThreshold),
                  gstRate: v.gstRate != null ? String(v.gstRate) : f.gstRate,
                  imageUrl: v.imageUrl || '',
                }))
                setShowClonePicker(false)
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-[var(--burgundy-soft)] transition-colors"
            >
              {v.colorHex && <span className="inline-block h-3 w-3 shrink-0 rounded-full border border-[var(--line)]" style={{ backgroundColor: v.colorHex }} />}
              <span className="font-medium">{v.colorName}</span>
              {v.imageUrl && <img src={resolveImageUrl(v.imageUrl)} alt="" className="h-8 w-8 shrink-0 rounded object-cover ml-auto" />}
              <ChevronDown className="h-3 w-3 text-[var(--muted)]" />
            </button>
          ))}
        </div>
      )}
      {formFieldErrors.colorName && <p className="text-xs font-semibold text-red-600">{formFieldErrors.colorName}</p>}
    </div>

    <div className="space-y-1">
      <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Color Hex <span className="text-red-500">*</span></label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={form.colorHex || '#000000'}
          onChange={e => setForm(f => ({ ...f, colorHex: e.target.value }))}
          className="h-9 w-12 cursor-pointer rounded border border-[var(--line)] bg-transparent p-0"
        />
        <input
          type="text"
          value={form.colorHex}
          onChange={e => setForm(f => ({ ...f, colorHex: e.target.value }))}
          className={`admin-input w-full rounded uppercase ${formFieldErrors.colorHex ? 'border-red-500' : ''}`}
          placeholder="#FF0000"
        />
      </div>
      {formFieldErrors.colorHex && <p className="text-xs font-semibold text-red-600">{formFieldErrors.colorHex}</p>}
    </div>

    <div className="space-y-2 md:col-span-2">
      <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Size <span className="text-red-500">*</span></label>
      <div className="flex flex-wrap gap-2">
        {sizePresets.map(size => {
          const active = form.size === size
          return (
            <button
              key={size}
              type="button"
              onClick={() => { setForm(f => ({ ...f, size: active ? '' : size })); setSizeInput('') }}
              className={`rounded border px-3 py-1.5 text-xs font-bold transition-colors ${
                active
                  ? 'border-[var(--burgundy)] bg-[var(--burgundy)] text-white'
                  : 'border-[var(--line)] bg-white text-[var(--text)] hover:border-[var(--burgundy)]'
              }`}
            >
              {size}
            </button>
          )
        })}
      </div>
      {form.size && (
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded bg-[var(--burgundy-soft)] px-2 py-1 text-xs font-semibold text-[var(--burgundy)]">
            {form.size}
            <button
              type="button"
              onClick={() => { setForm(f => ({ ...f, size: '' })); setSizeInput('') }}
              className="text-[var(--burgundy)]/60 hover:text-[var(--burgundy)] leading-none"
            >
              ×
            </button>
          </span>
        </div>
      )}
      <input
        type="text"
        value={sizeInput}
        onChange={e => setSizeInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault()
            const trimmed = sizeInput.trim()
            if (trimmed) { setForm(f => ({ ...f, size: trimmed })); setSizeInput('') }
          }
        }}
        className={`admin-input w-full rounded ${formFieldErrors.size ? 'border-red-500' : ''}`}
        placeholder="Type and press Enter or click a preset above"
      />
      {formFieldErrors.size && <p className="text-xs font-semibold text-red-600">{formFieldErrors.size}</p>}
    </div>

    <div className="space-y-1">
      <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">SKU <span className="text-xs font-normal text-[var(--muted)]">(Optional)</span></label>
      <input
        type="text"
        value={form.sku}
        onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
        className={`admin-input w-full rounded ${formFieldErrors.sku ? 'border-red-500' : ''}`}
        placeholder="Auto-generated if left empty"
      />
      {formFieldErrors.sku && <p className="text-xs font-semibold text-red-600">{formFieldErrors.sku}</p>}
    </div>

    <div className="space-y-1">
      <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Price (₹) <span className="text-red-500">*</span></label>
      <input
        type="text"
        inputMode="decimal"
        value={form.price}
        onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
        className={`admin-input w-full rounded ${formFieldErrors.price ? 'border-red-500' : ''}`}
        placeholder="0.00"
      />
      {formFieldErrors.price && <p className="text-xs font-semibold text-red-600">{formFieldErrors.price}</p>}
    </div>

    <div className="space-y-1">
      <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Original Price (₹) <span className="text-red-500">*</span></label>
      <input
        type="text"
        inputMode="decimal"
        value={form.originalPrice}
        onChange={e => setForm(f => ({ ...f, originalPrice: e.target.value }))}
        className={`admin-input w-full rounded ${formFieldErrors.originalPrice ? 'border-red-500' : ''}`}
        placeholder="0.00"
      />
      {formFieldErrors.originalPrice && <p className="text-xs font-semibold text-red-600">{formFieldErrors.originalPrice}</p>}
      {form.price && form.originalPrice && Number(form.originalPrice.replace(/,/g, '')) > Number(form.price.replace(/,/g, '')) && (
        <p className="text-xs font-semibold text-green-600">
          Save ₹{(Number(form.originalPrice.replace(/,/g, '')) - Number(form.price.replace(/,/g, ''))).toLocaleString('en-IN')} ({Math.round((1 - Number(form.price.replace(/,/g, '')) / Number(form.originalPrice.replace(/,/g, ''))) * 100)}% OFF)
        </p>
      )}
    </div>

    <div className="space-y-1">
      <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Stock Qty <span className="text-red-500">*</span></label>
      <input
        type="number"
        min={0}
        value={form.stockQty}
         onChange={e => setForm(f => ({ ...f, stockQty: e.target.value }))}
         className={`admin-input w-full rounded ${formFieldErrors.stockQty ? 'border-red-500' : ''}`}
       />
      {formFieldErrors.stockQty && <p className="text-xs font-semibold text-red-600">{formFieldErrors.stockQty}</p>}
    </div>

    <div className="space-y-1">
      <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Low Stock Threshold <span className="text-red-500">*</span></label>
      <input
        type="number"
        min={0}
        value={form.lowStockThreshold}
        onChange={e => setForm(f => ({ ...f, lowStockThreshold: e.target.value }))}
        className={`admin-input w-full rounded ${formFieldErrors.lowStockThreshold ? 'border-red-500' : ''}`}
      />
      {formFieldErrors.lowStockThreshold && <p className="text-xs font-semibold text-red-600">{formFieldErrors.lowStockThreshold}</p>}
    </div>

    <div className="space-y-1">
      <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">GST Rate (%) <span className="text-red-500">*</span></label>
      <select
        value={form.gstRate}
        onChange={e => setForm(f => ({ ...f, gstRate: e.target.value }))}
        className={`admin-input w-full rounded ${formFieldErrors.gstRate ? 'border-red-500' : ''}`}
      >
        <option value="0">0% (Nil-rated / exempt)</option>
        <option value="5">5% (SGST 2.5% + CGST 2.5%)</option>
        <option value="12">12% (SGST 6% + CGST 6%)</option>
        <option value="18">18% (SGST 9% + CGST 9%)</option>
        <option value="28">28% (SGST 14% + CGST 14%)</option>
      </select>
      {formFieldErrors.gstRate && <p className="text-xs font-semibold text-red-600">{formFieldErrors.gstRate}</p>}
    </div>
            </div>

            {/* Image Upload Section — shown always */}
            <div className="mt-6 border-t border-[var(--line)] pt-6">
              <h4 className="mb-1 text-sm font-bold uppercase tracking-widest text-[var(--gold)]">
                Variant Images
              </h4>
              {!editingVariant && (
                <p className="mb-1 text-[11px] font-semibold text-red-600">★ Main image is required to save the variant.</p>
              )}
              {imageError && (
                <div className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  {imageError}
                </div>
              )}
              {/* Show main image validation error prominently */}
              {formFieldErrors.mainImage && (
                <div className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  {formFieldErrors.mainImage}
                </div>
              )}
              {editingVariant && formFieldErrors.variantImageUrl && (
                <p className="mb-3 text-xs font-semibold text-red-600">{formFieldErrors.variantImageUrl}</p>
              )}

              {!editingVariant ? (
                /* ── CREATE MODE: local file selection, uploaded after variant creation ── */
                <div className="grid gap-6 md:grid-cols-3">
                  {/* Main Image — local preview */}
                  <div className={`space-y-3 rounded border p-4 ${formFieldErrors.mainImage ? 'border-red-400 bg-red-50/30' : 'border-[var(--line)]'}`}>
                    <label className="block text-xs font-bold uppercase tracking-wider text-red-600">
                      Main Variant Image <span className="font-semibold">* Required</span>
                    </label>
                    {pendingMainPreview ? (
                      <div className="relative overflow-hidden rounded bg-[var(--line)]">
                        <img src={pendingMainPreview} alt="Main Variant Preview" className="aspect-[4/5] w-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 px-3 py-2">
                          <button
                            type="button"
                            onClick={() => createMainFileRef.current?.click()}
                            className="text-xs font-semibold text-white hover:underline"
                          >
                            Change
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPendingMainFile(null)
                              setPendingMainPreview('')
                              if (createMainFileRef.current) createMainFileRef.current.value = ''
                            }}
                            className="text-xs font-semibold text-red-400 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : form.imageUrl ? (
                      <div className="relative overflow-hidden rounded bg-[var(--line)]">
                        <img src={resolveImageUrl(form.imageUrl)} alt="Cloned Variant Image" className="aspect-[4/5] w-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 px-3 py-2">
                          <button
                            type="button"
                            onClick={() => createMainFileRef.current?.click()}
                            className="text-xs font-semibold text-white hover:underline"
                          >
                            Change
                          </button>
                          <button
                            type="button"
                            onClick={() => setForm(f => ({ ...f, imageUrl: '' }))}
                            className="text-xs font-semibold text-red-400 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => createMainFileRef.current?.click()}
                        className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 rounded border-2 border-dashed border-[var(--line)] text-[var(--muted)] hover:border-[var(--burgundy)] hover:text-[var(--burgundy)]"
                      >
                        <ImageIcon className="h-6 w-6" />
                        <span className="text-xs font-semibold">Select Main Image</span>
                      </button>
                    )}
                    <input
                      ref={createMainFileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setPendingMainFile(file)
                          setPendingMainPreview(URL.createObjectURL(file))
                        }
                      }}
                    />
                  </div>

                  {/* Gallery Images — local previews */}
                  <div className="md:col-span-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                        Gallery Images <span className="font-normal text-gray-400">(optional)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => createGalleryFileRef.current?.click()}
                        className="inline-flex items-center gap-1 rounded border border-[var(--line)] px-2 py-1 text-xs font-semibold text-[var(--gold)] hover:bg-[var(--burgundy-soft)]"
                      >
                        <Plus className="h-3 w-3" />
                        Add Image
                      </button>
                      <input
                        ref={createGalleryFileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (file) {
                            setPendingGalleryFiles(prev => [...prev, file])
                            setPendingGalleryPreviews(prev => [...prev, URL.createObjectURL(file)])
                            if (createGalleryFileRef.current) createGalleryFileRef.current.value = ''
                          }
                        }}
                      />
                    </div>
                    {pendingGalleryPreviews.length > 0 ? (
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                        {pendingGalleryPreviews.map((preview, idx) => (
                          <div key={idx} className="group relative overflow-hidden rounded border border-[var(--line)] bg-[var(--line)]">
                            <img src={preview} alt={`Gallery Preview ${idx + 1}`} className="aspect-auto max-h-48 w-full object-contain" />
                            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 px-2 py-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                              <span className="text-[10px] text-white">#{idx + 1}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setPendingGalleryFiles(prev => prev.filter((_, i) => i !== idx))
                                  setPendingGalleryPreviews(prev => prev.filter((_, i) => i !== idx))
                                }}
                                className="text-[10px] font-semibold text-red-400 hover:underline"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-32 items-center justify-center rounded border border-dashed border-[var(--line)]">
                        <p className="text-sm text-[var(--muted)]">No gallery images selected yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* ── EDIT MODE: immediate upload via API (unchanged behaviour) ── */
                <div className="grid gap-6 md:grid-cols-3">
                  {/* Main Image */}
                  <div className="space-y-3 rounded border border-[var(--line)] p-4">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                      Main Variant Image
                    </label>
                    {variantImageUrl ? (
                      <div className="relative overflow-hidden rounded bg-[var(--line)]">
                        <img src={resolveImageUrl(variantImageUrl)} alt="Main Variant" className="aspect-[4/5] w-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 px-3 py-2">
                          <button
                            type="button"
                            disabled={uploadingMain}
                            onClick={() => mainFileRef.current?.click()}
                            className="text-xs font-semibold text-white hover:underline disabled:opacity-50"
                          >
                            {uploadingMain ? 'Uploading…' : 'Change'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setVariantImageUrl('')
                              setForm(f => ({ ...f, imageUrl: '' }))
                              const pid = productId ?? Number(form.productId)
                              updateVariant(pid, editingVariant.id, { imageUrl: null }).catch(() => {})
                            }}
                            className="text-xs font-semibold text-red-400 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => mainFileRef.current?.click()}
                        disabled={uploadingMain}
                        className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 rounded border-2 border-dashed border-[var(--line)] text-[var(--muted)] hover:border-[var(--burgundy)] hover:text-[var(--burgundy)] disabled:opacity-50"
                      >
                        {uploadingMain ? (
                          <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                          <ImageIcon className="h-6 w-6" />
                        )}
                        <span className="text-xs font-semibold">Upload Main Image</span>
                      </button>
                    )}
                    <input
                      ref={mainFileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        if (e.target.files?.[0]) handleUploadMain(e.target.files[0])
                      }}
                    />
                  </div>

                  {/* Gallery Images */}
                  <div className="md:col-span-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                        Gallery Images
                      </label>
                      <button
                        type="button"
                        onClick={() => galleryFileRef.current?.click()}
                        disabled={uploadingGallery}
                        className="inline-flex items-center gap-1 rounded border border-[var(--line)] px-2 py-1 text-xs font-semibold text-[var(--gold)] hover:bg-[var(--burgundy-soft)] disabled:opacity-50"
                      >
                        {uploadingGallery ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Plus className="h-3 w-3" />
                        )}
                        Add Image
                      </button>
                      <input
                        ref={galleryFileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          if (e.target.files?.[0]) handleUploadGallery(e.target.files[0])
                        }}
                      />
                    </div>
                    {deleteImageConfirm !== null && (
                      <div className="flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3">
                        <p className="text-sm font-semibold text-red-700">Remove this gallery image?</p>
                        <button
                          type="button"
                          onClick={() => handleDeleteGalleryImage(deleteImageConfirm)}
                          className="rounded bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700"
                        >
                          Yes, Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteImageConfirm(null)}
                          className="rounded border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    {variantImages.length > 0 ? (
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                        {variantImages.map((img: any, idx) => (
                          <div key={img.id} className={`group relative overflow-hidden rounded border bg-[var(--line)] ${deleteImageConfirm === img.id ? 'border-red-400' : 'border-[var(--line)]'}`}>
                            <img src={resolveImageUrl(img.imageUrl)} alt="Gallery" className="aspect-auto max-h-48 w-full object-contain" />
                            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/70 px-3 py-2 opacity-0 transition-opacity group-hover:opacity-100">
                              <span className="text-xs font-semibold text-gray-300">#{idx + 1}</span>
                              <button
                                type="button"
                                onClick={() => setDeleteImageConfirm(img.id)}
                                className="rounded border border-red-500/60 px-2.5 py-1 text-xs font-bold text-red-300 hover:border-red-400 hover:text-red-200"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-32 items-center justify-center rounded border border-dashed border-[var(--line)]">
                        <p className="text-sm text-[var(--muted)]">No gallery images uploaded yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowModal(false); setEditingVariant(null); setSizeInput(''); setVariantImageUrl(''); setVariantImages([]); setImageError(''); setFormFieldErrors({}) }}
                className="rounded border border-[var(--line)] px-4 py-2 text-sm font-bold text-[var(--burgundy)] transition-colors hover:bg-[var(--gold-soft)]"
              >
                {editingVariant ? 'Close' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="admin-btn inline-flex items-center gap-2 px-4 py-2 text-sm"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {editingVariant ? 'Update Variant' : 'Create Variant'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm py-10">
          <div className="mx-4 w-full max-w-lg rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--burgundy)]">Import Variants</h2>
              <button
                type="button"
                onClick={() => { setShowImportModal(false); setImportResult(null); setImportFile(null) }}
                className="rounded p-1 text-[var(--muted)] transition-colors hover:bg-[var(--burgundy-soft)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {importResult ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm">
                  <p className="font-bold text-green-800">Import complete</p>
                  <p className="mt-1 text-green-700">{importResult.created} of {importResult.total} variants created.</p>
                </div>
                {importResult.errors.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-bold text-red-700">{importResult.errors.length} error(s):</p>
                    <div className="max-h-48 overflow-y-auto rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {importResult.errors.map((e, i) => (
                        <p key={i} className="py-0.5">Row {e.row}: {e.message}</p>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => { setShowImportModal(false); setImportResult(null); setImportFile(null) }}
                  className="rounded border border-[var(--line)] px-4 py-2 text-sm font-bold text-[var(--burgundy)] transition-colors hover:bg-[var(--gold-soft)]"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-700 space-y-2">
                  <p>Upload an Excel (.xlsx, .xls) or CSV file.
                  Required (one of): <strong>productId</strong> or <strong>productCode</strong>.
                  Optional columns: variantType, colorName, colorHex, size, sku, price, originalPrice, stockQty, lowStockThreshold, gstRate, isDefault.</p>
                  <p>Imported variants are added as <strong>Inactive</strong> (hidden from the storefront) since they have no image yet — add an image and set them Active from the variant edit form when ready.</p>
                  <a
                    href={downloadVariantImportSampleUrl()}
                    download
                    className="inline-flex items-center gap-1.5 rounded border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                  >
                    Download Sample Excel
                  </a>
                </div>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[var(--line)] bg-[#F9FAFB] px-4 py-10 text-center transition-all hover:border-[var(--burgundy)] hover:bg-[var(--burgundy-soft)]">
                  <FileUp className="h-8 w-8 text-[var(--muted)]" />
                  {importFile ? (
                    <div>
                      <p className="text-sm font-bold text-[var(--text)]">{importFile.name}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">{(importFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-bold text-[var(--text)]">Click to select file</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">.xlsx, .xls, or .csv</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={e => { setImportFile(e.target.files?.[0] || null); setImportResult(null) }}
                  />
                </label>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowImportModal(false); setImportResult(null); setImportFile(null) }}
                    className="rounded border border-[var(--line)] px-4 py-2 text-sm font-bold text-[var(--burgundy)] transition-colors hover:bg-[var(--gold-soft)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (importFile) importMutation.mutate(importFile) }}
                    disabled={!importFile || importMutation.isPending}
                    className="inline-flex items-center gap-2 rounded bg-[var(--burgundy)] px-4 py-2 text-sm font-bold text-white transition-colors hover:opacity-90 disabled:opacity-50"
                  >
                    {importMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileUp className="h-4 w-4" />
                    )}
                    Upload & Import
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <DeleteConfirmDialog
          resourceLabel="Variant"
          itemLabel={itemLabel(deleteTarget)}
          pending={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate()}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
