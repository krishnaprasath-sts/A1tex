import bcrypt from 'bcryptjs'
import { env } from '../config/env.js'
import { ensureDatabaseExists, sequelize } from './sequelize.js'
import { Admin, AnnouncementMessage, MarqueeMessage, Banner, Category, Product, ProductVariant, Setting } from '../models/index.js'
import { slugify } from '../utils/slug.js'
import {
  defaultAnnouncementMessages,
  defaultMarqueeMessages,
  defaultBanners,
  defaultCategories,
  defaultChildCategories,
  defaultProducts,
} from './initial-data.js'

async function seed() {
  await ensureDatabaseExists()
  await sequelize.authenticate()

  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12)
  await Admin.findOrCreate({
    where: { email: env.ADMIN_EMAIL },
    defaults: {
      name: 'A1 TEX Admin',
      email: env.ADMIN_EMAIL,
      passwordHash,
      role: 'super_admin',
      status: 'active',
    },
  })

  for (const [index, text] of defaultAnnouncementMessages.entries()) {
    await AnnouncementMessage.findOrCreate({
      where: { text },
      defaults: { text, sortOrder: index, active: true },
    })
  }

  for (const [index, text] of defaultMarqueeMessages.entries()) {
    await MarqueeMessage.findOrCreate({
      where: { text },
      defaults: { text, sortOrder: index, active: true },
    })
  }

  const categoryIdBySection = new Map<string, number>()
  for (const [index, cat] of defaultCategories.entries()) {
    const [row] = await Category.findOrCreate({
      where: { slug: cat.slug },
      defaults: { ...cat, sortOrder: index, active: true },
    })
    categoryIdBySection.set(cat.section, (row as any).get('id') as number)
  }

  const categoryIdBySlug = new Map<string, number>()
  for (const [index, cat] of defaultCategories.entries()) {
    const [row] = await Category.findOrCreate({
      where: { slug: cat.slug },
      defaults: { ...cat, sortOrder: index, active: true },
    })
    categoryIdBySlug.set(cat.slug, (row as any).get('id') as number)
  }

  for (const [index, child] of defaultChildCategories.entries()) {
    const parentId = categoryIdBySlug.get(child.parentSlug)
    if (!parentId) {
      console.warn(`No category found for parentSlug "${child.parentSlug}", skipping child "${child.name}"`)
      continue
    }
    const [row] = await Category.findOrCreate({
      where: { slug: child.slug },
      defaults: {
        section: child.parentSlug,
        name: child.name,
        slug: child.slug,
        href: child.href,
        imageUrl: child.imageUrl,
        tag: child.tag,
        navVisible: child.navVisible,
        homeVisible: child.homeVisible,
        parentId,
        sortOrder: index,
        active: true,
      },
    })
    categoryIdBySlug.set(child.slug, (row as any).get('id') as number)
  }

  for (const [index, banner] of defaultBanners.entries()) {
    await Banner.findOrCreate({
      where: { placement: banner.placement, title: banner.title },
      defaults: { ...banner, sortOrder: index, active: true },
    })
  }

  for (const [index, product] of defaultProducts.entries()) {
    const slug = slugify(product.name)
    const childCategoryId = categoryIdBySlug.get(product.categorySlug) || null
    const [created] = await Product.findOrCreate({
      where: { code: product.code },
      defaults: {
        ...product,
        slug,
        sortOrder: index,
        category: null,
        categoryId: childCategoryId,
        stockQty: product.stockQty ?? 12,
        status: 'active',
      },
    })
    const productId = (created as any).get('id') as number
    const stockQty = (created as any).get('stockQty') as number

    const existingVariant = await ProductVariant.findOne({ where: { productId } })
    if (!existingVariant) {
      await ProductVariant.create({
        productId,
        variantType: 'color',
        label: 'Default',
        price: (created as any).get('price') as number || 0,
        stockQty: stockQty || 0,
        isDefault: true,
        status: 'active',
        sortOrder: 0,
      })
      await Product.update({ hasVariants: true }, { where: { id: productId } })
    }
  }

  await Setting.findOrCreate({
    where: { key: 'storefront_stats' },
    defaults: {
      key: 'storefront_stats',
      value: {
        instagramFamily: '300K+',
        artisansNetwork: '2Lakh',
        sustainableArt: '120%',
      },
    },
  })

  await Setting.findOrCreate({
    where: { key: 'company_info' },
    defaults: {
      key: 'company_info',
      value: {
        name: 'A1 TEX',
        address: '123, Rangapuri Street, Kanchipuram',
        city: 'Tamil Nadu — 631501',
        gstin: '33ABCDE1234F1Z5',
        pan: 'ABCDE1234F',
        phone: '+91 8822664432',
        email: 'hello@a1tex.com',
        invoicePrefix: 'INV',
        logoUrl: '/uploads/a1-tex-logo.png',
      },
    },
  })

  console.log('Seed complete. Local admin:', env.ADMIN_EMAIL)
  await sequelize.close()
}

seed().catch(error => {
  console.error(error)
  process.exit(1)
})
