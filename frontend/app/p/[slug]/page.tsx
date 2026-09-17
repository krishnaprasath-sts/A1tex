import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import FloatingActions from '@/components/ui/FloatingActions'
import SingleProductPage from '@/components/product/SingleProductPage'
import { fetchProductBySlug, fetchCategoryBySlug } from '@/lib/api/storefront'

type ProductPageProps = {
  params: { slug: string }
}

export function generateMetadata({ params }: ProductPageProps): Metadata {
  const title = params.slug.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
  return {
    title: `${title} | A1 TEX`,
    description: '',
  }
}

export const revalidate = 60

export default async function ProductRoute({ params }: ProductPageProps) {
  const product = await fetchProductBySlug(params.slug)
  if (!product) {
    const category = await fetchCategoryBySlug(params.slug)
    if (category) {
      redirect(`/shop?category=${encodeURIComponent(category.name)}`)
    }
    notFound()
  }

  return (
    <>
      <Header />
      <SingleProductPage product={product} />
      <Footer />
      <FloatingActions />
    </>
  )
}
