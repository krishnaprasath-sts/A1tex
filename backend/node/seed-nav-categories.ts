import { ensureDatabaseExists, sequelize } from './src/database/sequelize.js'
import { Category } from './src/models/index.js'

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

type SubItem = { name: string; isHot?: boolean }
type SubCat = { name: string; directLink?: boolean; products?: SubItem[] }
type TopCat = {
  name: string; href: string; tag?: string; section?: string;
  isSale?: boolean; subCategories?: SubCat[]
}

const navCategories: TopCat[] = [
  {
    name: 'Organic Sarees', href: '/collections/organic-sarees',
    subCategories: [
      { name: 'Cotton', products: [
        { name: 'Ajrakh' }, { name: 'Arni' }, { name: 'Bagru' }, { name: 'Bandhani' },
        { name: 'Batik' }, { name: 'Begampuri' }, { name: 'Bengal' }, { name: 'Bomkai' },
        { name: 'Chanderi' }, { name: 'Chettinad', isHot: true }, { name: 'Coimbatore' },
        { name: 'Dhania Khali' }, { name: 'Dobby' }, { name: 'Erode' }, { name: 'Jamdhani' },
        { name: 'Kalamkari' }, { name: 'Kalyani' }, { name: 'Kanchi' }, { name: 'Kerala Kasavu' },
        { name: 'Khadi' }, { name: 'Koorainadu' }, { name: 'Kora' }, { name: 'Kota' },
        { name: 'Kotpad' }, { name: 'Kutch' }, { name: 'Maheswari' }, { name: 'Mangalagiri' },
        { name: 'Mayuri' }, { name: 'Mul Mul', isHot: true },
        { name: 'Narayanapet' }, { name: 'Phulkari' }, { name: 'Pochampally Ikkat' },
        { name: 'Salem' }, { name: 'Sambalpuri' }, { name: 'Sanganer' }, { name: 'Sungudi', isHot: true },
        { name: 'Tant' }, { name: 'Velthari' }, { name: 'Venkatagiri' }, { name: 'Voyal' },
      ]},
      { name: 'Silk Cotton', products: [
        { name: 'Kanchi x Cotton' }, { name: 'Maheswari x Cotton' }, { name: 'Korvai x Cotton' },
        { name: 'Mashru x Cotton' }, { name: 'Ilkal x Cotton' }, { name: 'Chanderi x Cotton' },
        { name: 'Pochampally x Cotton' }, { name: 'Uppada x Cotton' }, { name: 'Paithani x Cotton' },
        { name: 'Dharmavaram x Cotton' },
      ]},
      { name: 'Handloom', products: [
        { name: 'Cotton' }, { name: 'Silk' }, { name: 'Silk Cotton' },
        { name: 'Khadi' }, { name: 'Linen' }, { name: 'Jute' },
      ]},
      { name: 'Linen', products: [
        { name: 'Pure Linen' }, { name: 'Linen Cotton' }, { name: 'Linen Silk' }, { name: 'Linen Tissue' },
      ]},
      { name: 'Bridal', products: [
        { name: 'Kanchipuram Silk' }, { name: 'Mysore Silk' }, { name: 'Banarasi Silk' },
        { name: 'Modal Silk' }, { name: 'Tussar Silk' }, { name: 'Pen Kalamkari Silk' },
        { name: 'Paithani Silk' }, { name: 'Mulberry Silk' }, { name: 'Banana Silk' },
        { name: 'Lotus Silk' }, { name: 'Eri Silk' }, { name: 'Muga Silk' }, { name: 'Koora Pudavai' },
      ]},
      { name: 'Hand Block Print', directLink: true },
      { name: 'Kalamkari', directLink: true },
      { name: 'Kanchipuram Silk', directLink: true },
      { name: 'Mysore Silk', directLink: true },
      { name: 'Banarasi Silk', directLink: true },
      { name: 'Modal Silk', directLink: true },
      { name: 'Tussar Silk', directLink: true },
      { name: 'Pen Kalamkari Silk', directLink: true },
      { name: 'Paithani Silk', directLink: true },
      { name: 'Mulberry Silk', directLink: true },
      { name: 'Banana Silk', directLink: true },
      { name: 'Lotus Silk', directLink: true },
      { name: 'Eri Silk', directLink: true },
      { name: 'Muga Silk', directLink: true },
      { name: 'Palum Pazhamum', directLink: true },
      { name: 'Satin', directLink: true },
      { name: 'Hemp', directLink: true },
      { name: 'Wool', products: [{ name: 'Pashmina' }, { name: 'Merino' }, { name: 'Kashmiri' }] },
      { name: 'Jute', directLink: true },
      { name: 'Fancy', products: [
        { name: 'Chikankari' }, { name: 'Kantha Hand Stitch' }, { name: 'Mirror Work' }, { name: 'Embroidery' },
      ]},
    ],
  },
  {
    name: 'Party Wear', href: '/collections/party-wear',
    subCategories: [
      { name: 'Lehengas & Half Sarees', directLink: true },
      { name: 'Ethnic Gown', directLink: true },
      { name: 'Ethnic Suit', directLink: true },
      { name: 'Ethnic Readymades', directLink: true },
      { name: 'Western Readymades', directLink: true },
      { name: 'Co-Ords', directLink: true },
      { name: '3 Piece Salwar Set', directLink: true },
      { name: 'Dupatta', directLink: true },
    ],
  },
  {
    name: 'Daily Wear', href: '/collections/daily-wear',
    subCategories: [
      { name: 'Kurti & Tops', directLink: true },
      { name: 'Tunics & Tshirts', directLink: true },
      { name: 'Co-Ords', directLink: true },
      { name: '3 Piece Salwar Set', directLink: true },
      { name: 'Dress', directLink: true },
      { name: 'Leggin', directLink: true },
      { name: 'Cigrate / Straight Cut Pants', directLink: true },
      { name: 'Palazzo / Loose Pants', directLink: true },
      { name: 'Skirts', directLink: true },
      { name: 'Maxi', directLink: true },
      { name: 'Pyjama Set', directLink: true },
      { name: 'Pyjama Pant', directLink: true },
    ],
  },
  {
    name: 'Men', href: '/collections/men',
    subCategories: [
      { name: 'Shirts', directLink: true },
      { name: 'Tshirts', directLink: true },
      { name: 'Co-Ords', directLink: true },
      { name: 'Trousers', directLink: true },
      { name: 'Veshti / Dhothi', directLink: true },
      { name: 'Veshti Shirt Set', directLink: true },
    ],
  },
  {
    name: 'Kids', href: '/collections/kids',
    subCategories: [
      { name: 'Boys', products: [
        { name: 'Shirt' }, { name: 'Tshirt' }, { name: 'Co-Ords' }, { name: 'Trousers' },
        { name: 'Track Pant / Jogger' }, { name: 'Veshti / Dhothi' }, { name: 'Veshti Shirt Set' },
        { name: 'Kurta Pant Set' },
      ]},
      { name: 'Girls', products: [
        { name: 'Tops & Tshirts' }, { name: 'Co-Ords' }, { name: 'Dress' }, { name: 'Pants' },
        { name: 'Skirts' }, { name: 'Pyjama Set' }, { name: 'Pattu Pavadai Set' }, { name: 'Ethnic Gown' },
      ]},
    ],
  },
  {
    name: 'Privacy Wear', href: '/collections/privacy-wear',
    subCategories: [
      { name: 'Men', products: [{ name: 'Vest' }, { name: 'Brief' }, { name: 'Boxer' }] },
      { name: 'Women', products: [{ name: 'Brazier' }, { name: 'Underwear' }, { name: 'Camisoles' }] },
      { name: 'Boys', directLink: true },
      { name: 'Girls', directLink: true },
    ],
  },
  {
    name: 'Organic Cosmetics', href: '/collections/cosmetics',
    subCategories: [
      { name: 'Soap', directLink: true }, { name: 'Lip Balm', directLink: true },
      { name: 'Lip Scrub', directLink: true }, { name: 'Lip Oil', directLink: true },
      { name: 'Kajal', directLink: true }, { name: 'Shampoo', directLink: true },
      { name: 'Hair Mask', directLink: true },
    ],
  },
  {
    name: 'Accessories', href: '/collections/accessories',
    subCategories: [
      { name: 'Bags', directLink: true }, { name: 'Wallet', directLink: true },
      { name: 'Belt', directLink: true }, { name: 'Stoles', directLink: true },
      { name: 'Caps & Hats', directLink: true },
    ],
  },
  {
    name: 'Jewellery', href: '/collections/jewellery',
    subCategories: [
      { name: 'Kemp Stone', directLink: true }, { name: 'Nagas', directLink: true },
      { name: 'Bharthanatiyam Collections', directLink: true },
      { name: 'Bridal Collections', directLink: true },
      { name: 'Earings', directLink: true }, { name: 'Necklace & Haram', directLink: true },
      { name: 'Hip Belt', directLink: true }, { name: 'Bangles', directLink: true },
      { name: 'Maang Tikka', directLink: true }, { name: 'Others', directLink: true },
    ],
  },
  {
    name: 'Home & Living', href: '/collections/home-living',
    subCategories: [
      { name: 'Bedsheets', directLink: true }, { name: 'Bedspread', directLink: true },
      { name: 'Pillow Covers', directLink: true }, { name: 'Cushion Covers', directLink: true },
      { name: 'Bath Towels', directLink: true }, { name: 'Hand Towels', directLink: true },
      { name: 'Kitchen Towels', directLink: true }, { name: 'Kitchen Gloves', directLink: true },
      { name: 'Pot Holders', directLink: true },
    ],
  },
  {
    name: 'Return Gifts', href: '/collections/return-gifts',
    subCategories: [
      { name: 'Under ₹50', directLink: true }, { name: 'From ₹50 to ₹100', directLink: true },
      { name: 'From ₹100 to ₹200', directLink: true }, { name: 'From ₹200 to ₹300', directLink: true },
      { name: 'From ₹300 to ₹400', directLink: true }, { name: 'From ₹400 to ₹500', directLink: true },
      { name: 'Kids', directLink: true },
    ],
  },
  {
    name: 'Clearance Sale', href: '/sale', tag: 'Sale', isSale: true,
  },
]

async function seed() {
  await ensureDatabaseExists()
  await sequelize.authenticate()

  let created = 0
  let sortCounter = 1

  for (const topCat of navCategories) {
    const topSlug = slugify(topCat.name)
    const [topRow] = await Category.findOrCreate({
      where: { slug: `nav-${topSlug}` },
      defaults: {
        parentId: null,
        section: topCat.section || 'main',
        name: topCat.name,
        slug: `nav-${topSlug}`,
        href: topCat.href,
        tag: topCat.tag || 'Heritage Edit',
        navVisible: true,
        homeVisible: false,
        sortOrder: sortCounter++,
        active: true,
        metadata: topCat.isSale ? { isSale: true } : null,
      },
    }) as any[]
    created++
    const topId = topRow.get('id')

    if (!topCat.subCategories) continue

    let subSort = 1
    for (const sub of topCat.subCategories) {
      const subSlug = slugify(`${topCat.name}-${sub.name}`)
      const [subRow] = await Category.findOrCreate({
        where: { slug: `nav-${subSlug}` },
        defaults: {
          parentId: topId,
          section: topCat.section || 'main',
          name: sub.name,
          slug: `nav-${subSlug}`,
          href: `${topCat.href}?filter=${encodeURIComponent(sub.name)}`,
          navVisible: true,
          homeVisible: false,
          sortOrder: subSort++,
          active: true,
        },
      }) as any[]
      created++
      const subId = subRow.get('id')

      if (!sub.products) continue

      let prodSort = 1
      for (const prod of sub.products) {
        const prodSlug = slugify(`${topCat.name}-${sub.name}-${prod.name}`)
        await Category.findOrCreate({
          where: { slug: `nav-${prodSlug}` },
          defaults: {
            parentId: subId,
            section: topCat.section || 'main',
            name: prod.name,
            slug: `nav-${prodSlug}`,
            href: `${topCat.href}?filter=${encodeURIComponent(prod.name)}`,
            navVisible: true,
            homeVisible: false,
            sortOrder: prodSort++,
            active: true,
            metadata: prod.isHot ? { isHot: true } : null,
          },
        })
        created++
      }
    }
  }

  console.log(`\n✅ Seeded ${created} nav categories into the database.`)
  await sequelize.close()
}

seed().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
