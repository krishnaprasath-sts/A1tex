import type { Metadata } from 'next'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import FloatingActions from '@/components/ui/FloatingActions'
import ShopPage from '@/components/shop/ShopPage'
import { fetchCategoryBySlug } from '@/lib/api/storefront'

type CollectionRouteProps = {
  params: {
    slug: string
  }
  searchParams?: {
    filter?: string | string[]
    search?: string | string[]
  }
}

/* ── Slug → Title helper ──────────────────────── */
function titleFromSlug(slug: string) {
  return slug
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function getDescription(slug: string) {
  return ''
}

export function generateMetadata({ params }: CollectionRouteProps): Metadata {
  const title = titleFromSlug(params.slug)
  return {
    title: `${title} | A1 TEX`,
    description: getDescription(params.slug),
  }
}

export default async function CollectionRoute({ params, searchParams }: CollectionRouteProps) {
  const slug = params.slug
  const filter = firstParam(searchParams?.filter) ?? ''
  const search = firstParam(searchParams?.search) ?? ''

  const category = await fetchCategoryBySlug(slug).catch(() => null)
  const categoryId = category?.id || undefined
  const categoryTitle = titleFromSlug(slug)
  const initialQuery = filter || search

  const headerBg = undefined

  const displayTitle = filter ? `${categoryTitle} — ${filter}` : categoryTitle

  return (
    <>
      <Header />
      <ShopPage
        title={displayTitle}
        eyebrow="A1 TEX Collection"
        description={getDescription(slug)}
        initialCategory={categoryTitle}
        initialCategoryId={categoryId}
        initialQuery={initialQuery}
        saleOnly={slug === 'sale'}
        backgroundImage={headerBg}
      />
      <Footer />
      <FloatingActions />
    </>
  )
}
