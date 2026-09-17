import { Setting, ShippingRate } from '../models/index.js'

export interface CompanyInfo {
  name: string
  address: string
  city: string
  gstin: string
  pan: string
  phone: string
  whatsapp?: string
  instagram?: string
  email: string
  invoicePrefix: string
  logoUrl: string
}

export interface ShippingConfig {
  freeShippingEnabled: boolean
  freeShippingThreshold: number
}

export interface GuestDiscountPopupConfig {
  enabled: boolean
  discountPercentage: number
  message: string
}

const defaultCompany: CompanyInfo = {
  name: 'A1 tex',
  address: 'A1 Tex & elampillai_silks, Elampillai',
  city: 'Salem, Tamil Nadu — 637502',
  gstin: '33ABCDE1234F1Z5',
  pan: 'ABCDE1234F',
  phone: '+91 95144 61405',
  whatsapp: '9514461405',
  instagram: 'https://www.instagram.com/elampillai_silks?stkn=OGJ3eGRzYmw0OWN1',
  email: 'a1texelmpillai@gmail.com',
  invoicePrefix: 'INV',
  logoUrl: '/uploads/a1-tex-logo.png',
}

const defaultShipping: ShippingConfig = {
  freeShippingEnabled: false,
  freeShippingThreshold: 0,
}

const defaultGuestDiscountPopup: GuestDiscountPopupConfig = {
  enabled: false,
  discountPercentage: 10,
  message: 'Register now and get {percentage}% OFF on your purchase!',
}

let cachedCompany: CompanyInfo | null = null
let cachedShipping: ShippingConfig | null = null
let cachedGuestDiscountPopup: GuestDiscountPopupConfig | null = null

export async function getCompanyInfo(): Promise<CompanyInfo> {
  if (cachedCompany) return cachedCompany
  const setting = await Setting.findOne({ where: { key: 'company_info' } })
  if (!setting) return defaultCompany
  const value = setting.get('value') as Record<string, unknown>
  cachedCompany = { ...defaultCompany, ...value } as CompanyInfo
  return cachedCompany
}

export function invalidateCompanyCache() {
  cachedCompany = null
}

export async function getShippingConfig(): Promise<ShippingConfig> {
  if (cachedShipping) return cachedShipping
  try {
    const setting = await Setting.findOne({ where: { key: 'shipping_config' } })
    if (!setting) return defaultShipping
    const value = setting.get('value') as Record<string, unknown>
    cachedShipping = {
      freeShippingEnabled: Boolean(value.freeShippingEnabled),
      freeShippingThreshold: Number(value.freeShippingThreshold) || 0,
    }
    return cachedShipping
  } catch {
    return defaultShipping
  }
}

export function invalidateShippingCache() {
  cachedShipping = null
}

export async function getGuestDiscountPopupConfig(): Promise<GuestDiscountPopupConfig> {
  if (cachedGuestDiscountPopup) return cachedGuestDiscountPopup
  try {
    const setting = await Setting.findOne({ where: { key: 'guest_discount_popup' } })
    if (!setting) return defaultGuestDiscountPopup
    const value = setting.get('value') as Record<string, unknown>
    cachedGuestDiscountPopup = {
      enabled: Boolean(value.enabled),
      discountPercentage: Number(value.discountPercentage) || 0,
      message: typeof value.message === 'string' && value.message.trim() ? value.message : defaultGuestDiscountPopup.message,
    }
    return cachedGuestDiscountPopup
  } catch {
    return defaultGuestDiscountPopup
  }
}

export interface CourierRateConfig {
  id: string
  name: string
  code: string
  active: boolean
  trackingUrlTemplate?: string
  rateTamilNadu: number | null
  rateSouthIndia: number | null // Karnataka, Andhra Pradesh, Kerala, Telangana
  rateRestOfIndia: number | null // Other states
  rateAllIndiaFlat: number | null // Flat rate across all India (e.g. 70 for India Post)
  estimatedDaysTamilNadu?: string
  estimatedDaysSouthIndia?: string
  estimatedDaysRestOfIndia?: string
  estimatedDaysAllIndia?: string
}

export const defaultCouriers: CourierRateConfig[] = [
  {
    id: 'st_courier',
    name: 'ST Courier',
    code: 'st_courier',
    active: true,
    rateTamilNadu: 40,
    rateSouthIndia: null,
    rateRestOfIndia: null,
    rateAllIndiaFlat: null,
    estimatedDaysTamilNadu: '1-2 business days',
    trackingUrlTemplate: 'https://stcourier.com/track',
  },
  {
    id: 'dtdc',
    name: 'DTDC Courier',
    code: 'dtdc',
    active: true,
    rateTamilNadu: 40,
    rateSouthIndia: 60,
    rateRestOfIndia: 150,
    rateAllIndiaFlat: null,
    estimatedDaysTamilNadu: '1-2 business days',
    estimatedDaysSouthIndia: '2-4 business days',
    estimatedDaysRestOfIndia: '4-6 business days',
    trackingUrlTemplate: 'https://track.dtdc.com',
  },
  {
    id: 'professional',
    name: 'The Professional Couriers',
    code: 'professional',
    active: true,
    rateTamilNadu: 40,
    rateSouthIndia: 60,
    rateRestOfIndia: 150,
    rateAllIndiaFlat: null,
    estimatedDaysTamilNadu: '1-2 business days',
    estimatedDaysSouthIndia: '2-4 business days',
    estimatedDaysRestOfIndia: '4-6 business days',
    trackingUrlTemplate: 'https://www.tpcindia.com',
  },
  {
    id: 'indiapost',
    name: 'India Post (Speed Post)',
    code: 'indiapost',
    active: true,
    rateTamilNadu: null,
    rateSouthIndia: null,
    rateRestOfIndia: null,
    rateAllIndiaFlat: 70,
    estimatedDaysAllIndia: '3-7 business days',
    trackingUrlTemplate: 'https://www.indiapost.gov.in',
  },
]

let cachedCouriers: CourierRateConfig[] | null = null

export async function getCourierConfig(): Promise<CourierRateConfig[]> {
  if (cachedCouriers) return cachedCouriers
  try {
    const setting = await Setting.findOne({ where: { key: 'courier_config' } })
    if (!setting) return defaultCouriers
    const value = setting.get('value')
    if (Array.isArray(value) && value.length > 0) {
      cachedCouriers = value as CourierRateConfig[]
      return cachedCouriers
    }
    return defaultCouriers
  } catch {
    return defaultCouriers
  }
}

export function invalidateCourierCache() {
  cachedCouriers = null
}

export type ShippingRegion = 'tamilnadu' | 'southindia' | 'restofindia'

export function detectRegion(stateName: string): ShippingRegion {
  if (!stateName) return 'restofindia'
  const s = stateName.toLowerCase().replace(/[^a-z]/g, '')
  if (s.includes('tamilnadu') || s === 'tn' || s.includes('tamil')) {
    return 'tamilnadu'
  }
  if (
    s.includes('karnataka') || s === 'ka' ||
    s.includes('andhra') || s.includes('andhrapradesh') || s === 'ap' ||
    s.includes('kerala') || s === 'kl' ||
    s.includes('telangana') || s === 'ts' || s === 'tg'
  ) {
    return 'southindia'
  }
  return 'restofindia'
}

export interface ResolvedShippingOption {
  id: string
  name: string
  code: string
  rate: number
  estimatedDays: string
  trackingUrlTemplate?: string
  isFreeShipping?: boolean
}

export async function resolveShippingOptions(
  stateName: string,
  _pincode?: string,
  subtotal: number = 0,
): Promise<ResolvedShippingOption[]> {
  const shippingConfig = await getShippingConfig()
  const isFree = Boolean(
    shippingConfig.freeShippingEnabled &&
    shippingConfig.freeShippingThreshold > 0 &&
    subtotal >= shippingConfig.freeShippingThreshold,
  )

  // 1. Check if we have records in shipping_rates table for this state
  if (stateName && stateName.trim()) {
    try {
      const dynamicRates = await ShippingRate.findAll({
        where: { state: stateName.trim(), active: true },
        order: [['amount', 'ASC']],
      })

      if (dynamicRates.length > 0) {
        const courierLabels: Record<string, string> = {
          st_courier: 'ST Courier',
          dtdc: 'DTDC Courier',
          professional: 'The Professional Courier',
          indiapost: 'India Post',
        }

        return dynamicRates.map((r: any) => ({
          id: String(r.id),
          name: courierLabels[r.courierService] || r.courierService,
          code: r.courierService,
          rate: isFree ? 0 : Number(r.amount),
          estimatedDays: r.estimatedDays || '2-5 business days',
          isFreeShipping: isFree,
        }))
      }
    } catch (err) {
      console.warn('[resolveShippingOptions] ShippingRate lookup failed, using courier fallback:', err)
    }
  }

  const couriers = await getCourierConfig()
  const region = detectRegion(stateName)

  const options: ResolvedShippingOption[] = []

  for (const c of couriers) {
    if (!c.active) continue

    let baseRate: number | null = null
    let estimatedDays = '2-5 business days'

    if (c.rateAllIndiaFlat !== null && c.rateAllIndiaFlat !== undefined) {
      baseRate = Number(c.rateAllIndiaFlat)
      estimatedDays = c.estimatedDaysAllIndia || '3-7 business days'
    } else if (region === 'tamilnadu') {
      if (c.rateTamilNadu !== null && c.rateTamilNadu !== undefined) {
        baseRate = Number(c.rateTamilNadu)
        estimatedDays = c.estimatedDaysTamilNadu || '1-2 business days'
      }
    } else if (region === 'southindia') {
      if (c.rateSouthIndia !== null && c.rateSouthIndia !== undefined) {
        baseRate = Number(c.rateSouthIndia)
        estimatedDays = c.estimatedDaysSouthIndia || '2-4 business days'
      }
    } else {
      if (c.rateRestOfIndia !== null && c.rateRestOfIndia !== undefined) {
        baseRate = Number(c.rateRestOfIndia)
        estimatedDays = c.estimatedDaysRestOfIndia || '4-7 business days'
      }
    }

    // If courier does not service this region/state, skip it
    if (baseRate === null) continue

    options.push({
      id: c.id,
      name: c.name,
      code: c.code,
      rate: isFree ? 0 : baseRate,
      estimatedDays,
      trackingUrlTemplate: c.trackingUrlTemplate,
      isFreeShipping: isFree,
    })
  }

  if (options.length === 0) {
    for (const c of defaultCouriers) {
      options.push({
        id: c.id,
        name: c.name,
        code: c.code,
        rate: isFree ? 0 : (c.rateAllIndiaFlat ?? c.rateRestOfIndia ?? c.rateTamilNadu ?? 50),
        estimatedDays: c.estimatedDaysAllIndia ?? c.estimatedDaysRestOfIndia ?? '2-5 business days',
        trackingUrlTemplate: c.trackingUrlTemplate,
        isFreeShipping: isFree,
      })
    }
  }

  return options
}

export function invalidateGuestDiscountPopupCache() {
  cachedGuestDiscountPopup = null
}

