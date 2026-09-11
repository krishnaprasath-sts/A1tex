import type { Metadata } from 'next'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { notFound, redirect } from 'next/navigation'
import FloatingActions from '@/components/ui/FloatingActions'
import SingleProductPage from '@/components/product/SingleProductPage'
import { fetchProductBySlug, fetchCategoryBySlug } from '@/lib/api/storefront'

type ProductPageProps = {
  params: { slug: string }
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const title = params.slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return {
    title: `${title} | A1 TEX`,
    description: `Shop the ${title} from A1 TEX. Authentic handloom sarees, silk weaves and organic fabrics.`,
  }
}

export const dynamic = 'force-dynamic'

export default async function ProductRoute({ params }: ProductPageProps) {
  const product = await fetchProductBySlug(params.slug)
  if (!product) {
    const category = await fetchCategoryBySlug(params.slug)
    if (category) {
      redirect(`/shop?category=${encodeURIComponent(category.name)}`)
    }
    return notFound()
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
