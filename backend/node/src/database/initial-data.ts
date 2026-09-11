export const defaultAnnouncementMessages = [
  'Shipping Worldwide',
  'Easy Return & Exchange*',
  'EMI Option Available*',
  'Saving Scheme available*',
  'Delivery Time: 1 - 3 Weeks',
]

export const defaultMarqueeMessages = [
  'The Kanchipuram Legacy',
  'Pure Zari Weaves',
  'Master Craftsmanship',
  'Heritage Silks',
  'Authentic Handloom',
  'Timeless Elegance',
]

export const defaultCategories = [
  {
    "name": "Silk Sarees",
    "slug": "silk-sarees",
    "section": "Silk",
    "href": "/shop?section=silk-sarees",
    "imageUrl": null,
    "navVisible": true,
    "homeVisible": true
  },
  {
    "name": "Cotton Sarees",
    "slug": "cotton-sarees",
    "section": "Cotton",
    "href": "/shop?section=cotton-sarees",
    "imageUrl": null,
    "navVisible": true,
    "homeVisible": true
  },
  {
    "name": "Silk Cotton & Linen",
    "slug": "silk-cotton-linen",
    "section": "Silk Cotton",
    "href": "/shop?section=silk-cotton-linen",
    "imageUrl": null,
    "navVisible": true,
    "homeVisible": true
  },
  {
    "name": "Celebrity & Festive",
    "slug": "celebrity-festive",
    "section": "Celebrity",
    "href": "/shop?section=celebrity-festive",
    "imageUrl": null,
    "navVisible": false,
    "homeVisible": true
  },
  {
    "name": "Browse All",
    "slug": "browse-all",
    "section": "browse-all",
    "href": "/shop",
    "imageUrl": null,
    "navVisible": true,
    "homeVisible": false
  }
]

export interface SeedChildCategory {
  parentSlug: string
  name: string
  slug: string
  href: string
  imageUrl: string | null
  tag: string
  navVisible: boolean
  homeVisible: boolean
  headerHighlight?: boolean
}

export const defaultChildCategories: SeedChildCategory[] = [
  {
    "parentSlug": "silk-sarees",
    "name": "Luxury Soft Silk Sarees",
    "slug": "luxury-soft-silk-sarees",
    "href": "/shop?category=luxury-soft-silk-sarees",
    "imageUrl": "/uploads/categories/luxury-soft-silk-sarees.jpeg",
    "tag": "Silk Sarees",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": true
  },
  {
    "parentSlug": "silk-sarees",
    "name": "Kanchi Soft Silk",
    "slug": "kanchi-soft-silk",
    "href": "/shop?category=kanchi-soft-silk",
    "imageUrl": "/uploads/categories/kanchi-soft-silk.jpg",
    "tag": "Silk Sarees",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "silk-sarees",
    "name": "Bridal Silk Saree",
    "slug": "bridal-silk-saree",
    "href": "/shop?category=bridal-silk-saree",
    "imageUrl": "/uploads/categories/bridal-silk-saree.jpg",
    "tag": "Silk Sarees",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "silk-sarees",
    "name": "Kubera Pattu",
    "slug": "kubera-pattu",
    "href": "/shop?category=kubera-pattu",
    "imageUrl": "/uploads/categories/kubera-pattu.jpg",
    "tag": "Silk Sarees",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "silk-sarees",
    "name": "Banarasi Tissue Silk Sarees",
    "slug": "banarasi-tissue-silk-sarees",
    "href": "/shop?category=banarasi-tissue-silk-sarees",
    "imageUrl": "/uploads/categories/banarasi-tissue-silk-sarees.png",
    "tag": "Silk Sarees",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": true
  },
  {
    "parentSlug": "silk-sarees",
    "name": "Semi Tissue Silk Saree",
    "slug": "semi-tissue-silk-saree",
    "href": "/shop?category=semi-tissue-silk-saree",
    "imageUrl": "/uploads/categories/semi-tissue-silk-saree.jpg",
    "tag": "Silk Sarees",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "silk-sarees",
    "name": "Kanchi Semisilk Saree",
    "slug": "kanchi-semisilk-saree",
    "href": "/shop?category=kanchi-semisilk-saree",
    "imageUrl": "/uploads/categories/kanchi-semisilk-saree.jpeg",
    "tag": "Silk Sarees",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "silk-sarees",
    "name": "Soft Silk",
    "slug": "soft-silk",
    "href": "/shop?category=soft-silk",
    "imageUrl": "/uploads/categories/soft-silk.jpeg",
    "tag": "Silk Sarees",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "silk-sarees",
    "name": "3D Emboss Saree",
    "slug": "3d-emboss-saree",
    "href": "/shop?category=3d-emboss-saree",
    "imageUrl": "/placeholder.png",
    "tag": "Silk Sarees",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "silk-sarees",
    "name": "Tappeta Soft Silk",
    "slug": "tappeta-soft-silk",
    "href": "/shop?category=tappeta-soft-silk",
    "imageUrl": "/uploads/categories/tappeta-soft-silk.jpg",
    "tag": "Silk Sarees",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "silk-sarees",
    "name": "Nylon Soft Silk Saree",
    "slug": "nylon-soft-silk-saree",
    "href": "/shop?category=nylon-soft-silk-saree",
    "imageUrl": "/uploads/categories/nylon-soft-silk-saree.jpg",
    "tag": "Silk Sarees",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "silk-sarees",
    "name": "Dola Silk",
    "slug": "dola-silk",
    "href": "/shop?category=dola-silk",
    "imageUrl": "/uploads/categories/dola-silk.jpg",
    "tag": "Silk Sarees",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "silk-sarees",
    "name": "Mysore Silk Saree",
    "slug": "mysore-silk-saree",
    "href": "/shop?category=mysore-silk-saree",
    "imageUrl": "/placeholder.png",
    "tag": "Silk Sarees",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "silk-sarees",
    "name": "Tussar Silk Saree",
    "slug": "tussar-silk-saree",
    "href": "/shop?category=tussar-silk-saree",
    "imageUrl": "/uploads/categories/tussar-silk-saree.png",
    "tag": "Silk Sarees",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "silk-sarees",
    "name": "Katan Soft Silk Saree",
    "slug": "katan-soft-silk-saree",
    "href": "/shop?category=katan-soft-silk-saree",
    "imageUrl": "/uploads/categories/katan-soft-silk-saree.jpg",
    "tag": "Silk Sarees",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "silk-sarees",
    "name": "Kolam Soft Silk",
    "slug": "kolam-soft-silk",
    "href": "/shop?category=kolam-soft-silk",
    "imageUrl": "/uploads/categories/kolam-soft-silk.jpg",
    "tag": "Silk Sarees",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "cotton-sarees",
    "name": "Kalyani Cotton",
    "slug": "kalyani-cotton",
    "href": "/shop?category=kalyani-cotton",
    "imageUrl": "/uploads/categories/kalyani-cotton.jpg",
    "tag": "Cotton Sarees",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "cotton-sarees",
    "name": "Khadi Cotton",
    "slug": "khadi-cotton",
    "href": "/shop?category=khadi-cotton",
    "imageUrl": "/uploads/categories/khadi-cotton.jpg",
    "tag": "Cotton Sarees",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "cotton-sarees",
    "name": "Kerala Cotton",
    "slug": "kerala-cotton",
    "href": "/shop?category=kerala-cotton",
    "imageUrl": "/uploads/categories/kerala-cotton.jpg",
    "tag": "Cotton Sarees",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "cotton-sarees",
    "name": "Aarani Checked Cotton",
    "slug": "aarani-checked-cotton",
    "href": "/shop?category=aarani-checked-cotton",
    "imageUrl": "/uploads/categories/aarani-checked-cotton.jpg",
    "tag": "Cotton Sarees",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "cotton-sarees",
    "name": "Kalyani Checked Cotton",
    "slug": "kalyani-checked-cotton",
    "href": "/shop?category=kalyani-checked-cotton",
    "imageUrl": "/uploads/categories/kalyani-checked-cotton.jpg",
    "tag": "Cotton Sarees",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "cotton-sarees",
    "name": "Poly Cotton Saree",
    "slug": "poly-cotton-saree",
    "href": "/shop?category=poly-cotton-saree",
    "imageUrl": "/uploads/categories/poly-cotton-saree.jpg",
    "tag": "Cotton Sarees",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "cotton-sarees",
    "name": "Mulmul Cotton",
    "slug": "mulmul-cotton",
    "href": "/shop?category=mulmul-cotton",
    "imageUrl": "/uploads/categories/mulmul-cotton.jpg",
    "tag": "Cotton Sarees",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "cotton-sarees",
    "name": "Narayanpet Cotton Saree",
    "slug": "narayanpet-cotton-saree",
    "href": "/shop?category=narayanpet-cotton-saree",
    "imageUrl": "/uploads/categories/narayanpet-cotton-saree.jpg",
    "tag": "Cotton Sarees",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "cotton-sarees",
    "name": "Sungudi Sarees",
    "slug": "sungudi-sarees",
    "href": "/shop?category=sungudi-sarees",
    "imageUrl": "/uploads/categories/sungudi-sarees.jpg",
    "tag": "Cotton Sarees",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "cotton-sarees",
    "name": "Sungudi Cotton Saree",
    "slug": "sungudi-cotton-saree",
    "href": "/shop?category=sungudi-cotton-saree",
    "imageUrl": "/uploads/categories/sungudi-cotton-saree.jpg",
    "tag": "Cotton Sarees",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "cotton-sarees",
    "name": "Kanchi Cotton Saree",
    "slug": "kanchi-cotton-saree",
    "href": "/shop?category=kanchi-cotton-saree",
    "imageUrl": "/uploads/categories/kanchi-cotton-saree.jpg",
    "tag": "Cotton Sarees",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "cotton-sarees",
    "name": "South Cotton Saree",
    "slug": "south-cotton-saree",
    "href": "/shop?category=south-cotton-saree",
    "imageUrl": "/uploads/categories/south-cotton-saree.jpg",
    "tag": "Cotton Sarees",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "cotton-sarees",
    "name": "Handloom Cotton Korvai Cotton",
    "slug": "handloom-cotton-korvai-cotton",
    "href": "/shop?category=handloom-cotton-korvai-cotton",
    "imageUrl": "/uploads/categories/handloom-cotton-korvai-cotton.jpg",
    "tag": "Cotton Sarees",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "cotton-sarees",
    "name": "Kerala Saree",
    "slug": "kerala-saree",
    "href": "/shop?category=kerala-saree",
    "imageUrl": "/uploads/categories/kerala-saree.jpg",
    "tag": "Cotton Sarees",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "cotton-sarees",
    "name": "Kerala Tissue",
    "slug": "kerala-tissue",
    "href": "/shop?category=kerala-tissue",
    "imageUrl": "/placeholder.png",
    "tag": "Cotton Sarees",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "silk-cotton-linen",
    "name": "Linen Kalamkari",
    "slug": "linen-kalamkari",
    "href": "/shop?category=linen-kalamkari",
    "imageUrl": "/uploads/categories/linen-kalamkari.jpg",
    "tag": "Silk Cotton & Linen",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "silk-cotton-linen",
    "name": "Maheshwari Silkcotton",
    "slug": "maheshwari-silkcotton",
    "href": "/shop?category=maheshwari-silkcotton",
    "imageUrl": "/uploads/categories/maheshwari-silkcotton.jpg",
    "tag": "Silk Cotton & Linen",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "silk-cotton-linen",
    "name": "Silk Cotton Saree",
    "slug": "silk-cotton-saree",
    "href": "/shop?category=silk-cotton-saree",
    "imageUrl": "/uploads/categories/silk-cotton-saree.jpg",
    "tag": "Silk Cotton & Linen",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "silk-cotton-linen",
    "name": "Plain Silk Cotton",
    "slug": "plain-silk-cotton",
    "href": "/shop?category=plain-silk-cotton",
    "imageUrl": "/uploads/categories/plain-silk-cotton.png",
    "tag": "Silk Cotton & Linen",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "silk-cotton-linen",
    "name": "Linen Cotton",
    "slug": "linen-cotton",
    "href": "/shop?category=linen-cotton",
    "imageUrl": "/uploads/categories/linen-cotton.jpg",
    "tag": "Silk Cotton & Linen",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "silk-cotton-linen",
    "name": "Exclusive Silk Cotton",
    "slug": "exclusive-silk-cotton",
    "href": "/shop?category=exclusive-silk-cotton",
    "imageUrl": "/uploads/categories/exclusive-silk-cotton.jpg",
    "tag": "Silk Cotton & Linen",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "silk-cotton-linen",
    "name": "Digital Linen Cotton",
    "slug": "digital-linen-cotton",
    "href": "/shop?category=digital-linen-cotton",
    "imageUrl": "/uploads/categories/digital-linen-cotton.jpg",
    "tag": "Silk Cotton & Linen",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "silk-cotton-linen",
    "name": "Khadi Embroidery",
    "slug": "khadi-embroidery",
    "href": "/shop?category=khadi-embroidery",
    "imageUrl": "/uploads/categories/khadi-embroidery.jpg",
    "tag": "Silk Cotton & Linen",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "celebrity-festive",
    "name": "Celebrity Inspired",
    "slug": "celebrity-inspired",
    "href": "/shop?category=celebrity-inspired",
    "imageUrl": "/uploads/categories/celebrity-inspired.jpg",
    "tag": "Celebrity & Festive",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "celebrity-festive",
    "name": "Nita Ambani Celebrity Inspired",
    "slug": "nita-ambani-celebrity-inspired",
    "href": "/shop?category=nita-ambani-celebrity-inspired",
    "imageUrl": "/uploads/categories/nita-ambani-celebrity-inspired.jpg",
    "tag": "Celebrity & Festive",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "celebrity-festive",
    "name": "Nits Ambani Saree",
    "slug": "nits-ambani-saree",
    "href": "/shop?category=nits-ambani-saree",
    "imageUrl": "/uploads/categories/nits-ambani-saree.jpg",
    "tag": "Celebrity & Festive",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "celebrity-festive",
    "name": "Pallaku Saree",
    "slug": "pallaku-saree",
    "href": "/shop?category=pallaku-saree",
    "imageUrl": "/uploads/categories/pallaku-saree.jpg",
    "tag": "Celebrity & Festive",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "celebrity-festive",
    "name": "Vaira Oosi Saree",
    "slug": "vaira-oosi-saree",
    "href": "/shop?category=vaira-oosi-saree",
    "imageUrl": "/uploads/categories/vaira-oosi-saree.jpg",
    "tag": "Celebrity & Festive",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "celebrity-festive",
    "name": "Raga Bordered Tissue",
    "slug": "raga-bordered-tissue",
    "href": "/shop?category=raga-bordered-tissue",
    "imageUrl": "/uploads/categories/raga-bordered-tissue.jpg",
    "tag": "Celebrity & Festive",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "celebrity-festive",
    "name": "1000 Butta Sarees",
    "slug": "1000-butta-sarees",
    "href": "/shop?category=1000-butta-sarees",
    "imageUrl": "/uploads/categories/1000-butta-sarees.jpg",
    "tag": "Celebrity & Festive",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "celebrity-festive",
    "name": "Onam Saree",
    "slug": "onam-saree",
    "href": "/shop?category=onam-saree",
    "imageUrl": "/uploads/categories/onam-saree.jpg",
    "tag": "Celebrity & Festive",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "celebrity-festive",
    "name": "Kalyani Kids Set",
    "slug": "kalyani-kids-set",
    "href": "/shop?category=kalyani-kids-set",
    "imageUrl": "/uploads/categories/kalyani-kids-set.jpg",
    "tag": "Celebrity & Festive",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "celebrity-festive",
    "name": "Vesti Shirt",
    "slug": "vesti-shirt",
    "href": "/shop?category=vesti-shirt",
    "imageUrl": "/uploads/categories/vesti-shirt.jpg",
    "tag": "Celebrity & Festive",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  },
  {
    "parentSlug": "celebrity-festive",
    "name": "Aari Work Kurthis",
    "slug": "aari-work-kurthis",
    "href": "/shop?category=aari-work-kurthis",
    "imageUrl": "/uploads/categories/aari-work-kurthis.jpg",
    "tag": "Celebrity & Festive",
    "navVisible": true,
    "homeVisible": true,
    "headerHighlight": false
  }
]

export interface SeedProduct {
  code: string
  name: string
  type: string
  price: number
  originalPrice: number | null
  isNew: boolean
  featured: boolean
  color: string
  categorySlug: string
  imageUrl: string
  gstRate?: number
  hsnCode?: string
  gender?: string
  ageGroup?: string
  stockQty?: number
}

export const defaultProducts: SeedProduct[] = [
  {
    code: 'SAS-KS-0324',
    name: 'Royal Kanchipuram Bridal',
    type: 'Pure Kanchipuram Silk',
    price: 18500.00,
    originalPrice: 22000.00,
    isNew: true,
    featured: true,
    color: 'Ruby Maroon',
    categorySlug: 'kanchi-soft-silk',
    imageUrl: '/new_arrival_1.png',
    gstRate: 5.00,
    hsnCode: '5804',
  },
  {
    code: 'SAS-MS-0108',
    name: 'Mysore Crepe Silk',
    type: 'Mysore Crepe Silk',
    price: 6200.00,
    originalPrice: null,
    isNew: true,
    featured: true,
    color: 'Golden Mustard',
    categorySlug: 'mysore-silk-saree',
    imageUrl: '/new_arrival_2.png',
    gstRate: 5.00,
    hsnCode: '5804',
  },
  {
    code: 'SAS-TS-0056',
    name: 'Tussar Kalamkari Silk',
    type: 'Tussar Silk',
    price: 4500.00,
    originalPrice: 5200.00,
    isNew: false,
    featured: true,
    color: 'Indigo Blue',
    categorySlug: 'tussar-silk-saree',
    imageUrl: '/new_arrival_3.png',
    gstRate: 5.00,
    hsnCode: '5804',
  },
  {
    code: 'SAS-OC-0012',
    name: 'Organic Chettinad Cotton',
    type: 'Chettinad Cotton',
    price: 1350.00,
    originalPrice: null,
    isNew: true,
    featured: true,
    color: 'Forest Green',
    categorySlug: 'browse-all-cotton',
    imageUrl: '/new_arrival_4.png',
    gstRate: 5.00,
    hsnCode: '5804',
  },
  {
    code: 'SAS-BS-001',
    name: 'Banarasi Silk Saree',
    type: 'Banarasi Silk',
    price: 12500.00,
    originalPrice: 15000.00,
    isNew: false,
    featured: true,
    color: 'Antique Gold',
    categorySlug: 'shop-by-bridal-sarees',
    imageUrl: '/new_arrival_1.png',
    gstRate: 5.00,
    hsnCode: '5804',
    gender: 'women',
  },
  {
    code: 'SAS-PW-001',
    name: 'Designer Lehenga Set',
    type: 'Embroidered Silk Lehenga',
    price: 8500.00,
    originalPrice: 10000.00,
    isNew: true,
    featured: false,
    color: 'Rose Pink',
    categorySlug: 'shop-by-party-wear',
    imageUrl: '/new_arrival_2.png',
    gstRate: 5.00,
    hsnCode: '5804',
    gender: 'women',
  },
  {
    code: 'SAS-DW-001',
    name: 'Cotton Kurti Set',
    type: 'Pure Cotton Kurti',
    price: 1200.00,
    originalPrice: null,
    isNew: true,
    featured: false,
    color: 'Sage Green',
    categorySlug: 'shop-by-daily-wear',
    imageUrl: '/new_arrival_3.png',
    gstRate: 5.00,
    hsnCode: '5804',
    gender: 'women',
  },
  {
    code: 'SAS-KD-001',
    name: 'Kids Pattu Pavadai',
    type: 'Pure Silk Pavadai',
    price: 2800.00,
    originalPrice: 3500.00,
    isNew: false,
    featured: true,
    color: 'Blush Pink',
    categorySlug: 'collections-for-kids',
    imageUrl: '/new_arrival_4.png',
    gstRate: 5.00,
    hsnCode: '5804',
    gender: 'girls',
    ageGroup: 'kids',
  },
  {
    code: 'SAS-KL-001',
    name: 'Heritage Kalamkari Cotton Saree',
    type: 'Pure Kalamkari Handloom',
    price: 2450.00,
    originalPrice: 3200.00,
    isNew: false,
    featured: true,
    color: 'Ivory Indigo',
    categorySlug: 'linen-kalamkari',
    imageUrl: '/new_arrival_1.png',
    gstRate: 5.00,
    hsnCode: '5208',
    stockQty: 25,
    gender: 'women',
    ageGroup: 'adult',
  },
  {
    code: 'SAS-BS-002',
    name: 'Banarasi Tissue Silk Saree',
    type: 'Pure Banarasi Silk',
    price: 6850.00,
    originalPrice: 8500.00,
    isNew: true,
    featured: true,
    color: 'Antique Gold',
    categorySlug: 'banarasi-tissue-silk-sarees',
    imageUrl: '/new_arrival_2.png',
    gstRate: 5.00,
    hsnCode: '5007',
    stockQty: 30,
    gender: 'women',
    ageGroup: 'adult',
  },
  {
    code: 'SAS-LI-001',
    name: 'Linen Handloom Saree',
    type: 'Pure Linen',
    price: 3200.00,
    originalPrice: 4000.00,
    isNew: false,
    featured: false,
    color: 'Natural Beige',
    categorySlug: 'browse-all-linen',
    imageUrl: '/new_arrival_3.png',
    gstRate: 5.00,
    hsnCode: '5804',
    gender: 'women',
  },
  {
    code: 'SAS-HL-002',
    name: 'Kanchipuram Pure Silk',
    type: 'Pure Kanchipuram Silk',
    price: 22000.00,
    originalPrice: 26000.00,
    isNew: true,
    featured: true,
    color: 'Gold & Maroon',
    categorySlug: 'kanchi-soft-silk',
    imageUrl: '/new_arrival_4.png',
    gstRate: 5.00,
    hsnCode: '5804',
    gender: 'women',
  },
]

export const defaultBanners = [
  {
    placement: 'home_hero',
    title: 'A1 TEX',
    subtitle: 'Experience timeless elegance woven into every thread.',
    imageUrl: '/hero_cinematic.png',
    ctaLabel: 'Explore Collection',
    ctaUrl: '/collections/collections-for-organic-sarees',
  },
  {
    placement: 'header_below',
    title: 'Just Arrived',
    subtitle: 'Handloom sarees curated for the season.',
    imageUrl: '/new_hero_bg_saree.png',
    ctaLabel: 'Shop Now',
    ctaUrl: '/shop',
  },
]
