import type { Metadata } from 'next'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import FloatingActions from '@/components/ui/FloatingActions'
import ShopPage from '@/components/shop/ShopPage'

export const metadata: Metadata = {
  title: 'Shop | A1 TEX',
  description: 'Shop curated A1 TEX sarees, festive wear, daily wear, and handcrafted accessories.',
}

type ShopRouteProps = {
  searchParams?: {
    search?: string | string[]
    section?: string | string[]
    gender?: string | string[]
    category?: string | string[]
    categoryId?: string | string[]
  }
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default function ShopRoute({ searchParams }: ShopRouteProps) {
  const initialQuery = firstParam(searchParams?.search) ?? ''
  const initialSection = firstParam(searchParams?.section) ?? ''
  const initialGender = firstParam(searchParams?.gender) ?? ''
  const initialCategory = firstParam(searchParams?.category) ?? ''
  const initialCategoryId = firstParam(searchParams?.categoryId) ? Number(firstParam(searchParams?.categoryId)) : undefined

  const sectionTitles: Record<string, string> = {
    'silk-sarees': 'Silk Sarees Collection',
    'cotton-sarees': 'Cotton Sarees Collection',
    'silk-cotton-linen': 'Silk Cotton & Linen Collection',
    'celebrity-festive': 'Celebrity & Festive Sarees',
    'browse-all': 'All Sarees Collection',
    women: "Women's Collection",
    kids: "Kids' Collection",
    main: 'Featured Collection',
    fabric: 'Fabric Collection',
  }

  let title = initialCategory
    ? initialCategory.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : initialSection
      ? sectionTitles[initialSection] || `Shop ${initialSection.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`
      : undefined

  if (!title && initialGender) {
    title = `Shop ${initialGender.charAt(0).toUpperCase() + initialGender.slice(1)}`
  }

  return (
    <>
      <Header />
      <ShopPage
        title={title}
        initialQuery={initialQuery}
        initialCategory={initialCategory || undefined}
        initialCategoryId={initialCategoryId}
        initialSection={initialSection || undefined}
        initialGender={initialGender || undefined}
      />
      <Footer />
      <FloatingActions />
    </>
  )
}
