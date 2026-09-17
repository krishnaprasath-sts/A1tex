import { Request, Response } from 'express'
import { Op } from 'sequelize'
import {
  AnnouncementMessage,
  MarqueeMessage,
  Category,
  Product,
  Setting,
} from '../../../models/index.js'
import { plain, decodeJsonValue } from './helpers.js'

let navCache: { data: any; expiry: number } | null = null
let announcementCache: { data: any; expiry: number } | null = null
let marqueeCache: { data: any; expiry: number } | null = null

export const clearNavCache = () => {
  navCache = null
  announcementCache = null
  marqueeCache = null
}

export const getNavMenu = async (_req: Request, res: Response) => {
  if (navCache && Date.now() < navCache.expiry) {
    return res.json({ navigation: navCache.data })
  }

  const categories = await Category.findAll({
    where: { active: true, navVisible: true, parentId: null },
    order: [['sortOrder', 'ASC'], ['id', 'ASC']],
    raw: true,
  }) as any[]

  if (categories.length === 0) {
    return res.json({ navigation: [] })
  }

  const childCategories = await Category.findAll({
    where: { active: true, navVisible: true, parentId: { [Op.ne]: null } },
    order: [['sortOrder', 'ASC'], ['id', 'ASC']],
    raw: true,
  }) as any[]

  const allProducts = await Product.findAll({
    where: { status: 'active' },
    attributes: ['id', 'name', 'categoryId', 'subCategoryId', 'imageUrl'],
    raw: true,
  }) as any[]

  const productsByCategory = new Map<number, any[]>()
  for (const p of allProducts) {
    if (p.categoryId) {
      const list = productsByCategory.get(p.categoryId) || []
      list.push(p)
      productsByCategory.set(p.categoryId, list)
    }
    if (p.subCategoryId && p.subCategoryId !== p.categoryId) {
      const list = productsByCategory.get(p.subCategoryId) || []
      list.push(p)
      productsByCategory.set(p.subCategoryId, list)
    }
  }

  const isBrowseAllCat = (cat: any) =>
    (cat.name || '').toLowerCase().trim() === 'browse all' || cat.slug === 'browse-all'

  const sortedCategories = [
    ...categories.filter((c: any) => !isBrowseAllCat(c)),
    ...categories.filter((c: any) => isBrowseAllCat(c)),
  ]

  const navigation = sortedCategories.map((cat: any) => {
    const isBrowseAll = isBrowseAllCat(cat)
    const parentSlug = (cat.slug || '').replace(/^collections-/, '')
    const parentHref = isBrowseAll
      ? '/shop'
      : (cat.href && !cat.href.startsWith('/collections/') ? cat.href : `/shop?section=${parentSlug}`)

    const children = isBrowseAll ? [] : childCategories
      .filter((c: any) => c.parentId === cat.id)
      .map((c: any) => {
        const linkedProducts = productsByCategory.get(c.id) || []
        const seen = new Set<string>()
        const items: { name: string; imageUrl?: string }[] = []
        for (const p of linkedProducts) {
          if (!seen.has(p.name)) {
            seen.add(p.name)
            items.push({ name: p.name, imageUrl: p.imageUrl })
          }
        }
        const subSlug = (c.slug || '').replace(/^collections-/, '')
        const cleanHref = c.href && !c.href.startsWith('/collections/')
          ? c.href
          : `/shop?category=${subSlug}`

        return {
          name: c.name,
          href: cleanHref,
          imageUrl: c.imageUrl || null,
          products: items,
        }
      })

    return {
      label: cat.name,
      href: parentHref,
      isSale: cat.tag === 'Sale',
      isHighlighted: !!cat.headerHighlight,
      ...(children.length > 0 ? { subCategories: children } : {}),
    }
  })

  navCache = { data: navigation, expiry: Date.now() + 60000 }
  res.json({ navigation })
}

export const getAnnouncementBar = async (_req: Request, res: Response) => {
  if (announcementCache && Date.now() < announcementCache.expiry) {
    return res.json({ messages: announcementCache.data })
  }

  const messages = await AnnouncementMessage.findAll({
    where: { active: true },
    order: [['sortOrder', 'ASC'], ['id', 'ASC']],
  })

  const mapped = messages.map(row => plain<any>(row))
  announcementCache = { data: mapped, expiry: Date.now() + 60000 }
  res.json({ messages: mapped })
}

export const getMarqueeMessages = async (_req: Request, res: Response) => {
  if (marqueeCache && Date.now() < marqueeCache.expiry) {
    return res.json({ messages: marqueeCache.data })
  }

  const messages = await MarqueeMessage.findAll({
    where: { active: true },
    order: [['sortOrder', 'ASC'], ['id', 'ASC']],
  })

  const mapped = messages.map(row => plain<any>(row))
  marqueeCache = { data: mapped, expiry: Date.now() + 60000 }
  res.json({ messages: mapped })
}

export const getNavigation = async (_req: Request, res: Response) => {
  const setting = await Setting.findOne({ where: { key: 'navigation_menu' } })
  const rawValue = setting ? plain<any>(setting).value : []
  const value = decodeJsonValue(rawValue, [])
  res.json({ navigation: value })
}
