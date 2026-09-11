import { sequelize } from './sequelize.js'
import { ShippingRate } from '../models/shipping-rate.model.js'

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
]

export const SOUTH_INDIA_STATES = new Set([
  'karnataka',
  'andhra pradesh',
  'kerala',
  'telangana',
])

export async function syncAndSeedShippingRates() {
  await ShippingRate.sync({ alter: true })

  const count = await ShippingRate.count()
  if (count > 0) {
    console.log(`[ShippingRates] Already populated with ${count} rates.`)
    return
  }

  console.log('[ShippingRates] Seeding default shipping rates...')
  const ratesToInsert: Array<{
    courierService: string
    state: string
    amount: number
    estimatedDays: string
    active: boolean
  }> = []

  // 1. ST Courier: Tamil Nadu = ₹40, Puducherry = ₹40
  ratesToInsert.push(
    { courierService: 'ST Courier', state: 'Tamil Nadu', amount: 40, estimatedDays: '1-2 business days', active: true },
    { courierService: 'ST Courier', state: 'Puducherry', amount: 40, estimatedDays: '1-2 business days', active: true },
  )

  // 2. DTDC:
  // - Tamil Nadu & Puducherry = ₹40
  // - Karnataka, Andhra Pradesh, Kerala, Telangana = ₹60
  // - Other states / UTs = ₹150
  for (const state of INDIAN_STATES) {
    const sLower = state.toLowerCase()
    let amount = 150
    let days = '4-6 business days'
    if (sLower === 'tamil nadu' || sLower === 'puducherry') {
      amount = 40
      days = '1-2 business days'
    } else if (SOUTH_INDIA_STATES.has(sLower)) {
      amount = 60
      days = '2-4 business days'
    }
    ratesToInsert.push({
      courierService: 'DTDC',
      state,
      amount,
      estimatedDays: days,
      active: true,
    })
  }

  // 3. The Professional Courier:
  // - Tamil Nadu & Puducherry = ₹40
  // - Karnataka, Andhra Pradesh, Kerala, Telangana = ₹60
  // - Other states / UTs = ₹150
  for (const state of INDIAN_STATES) {
    const sLower = state.toLowerCase()
    let amount = 150
    let days = '4-6 business days'
    if (sLower === 'tamil nadu' || sLower === 'puducherry') {
      amount = 40
      days = '1-2 business days'
    } else if (SOUTH_INDIA_STATES.has(sLower)) {
      amount = 60
      days = '2-4 business days'
    }
    ratesToInsert.push({
      courierService: 'The Professional Courier',
      state,
      amount,
      estimatedDays: days,
      active: true,
    })
  }

  // 4. India Post: All India flat = ₹70
  ratesToInsert.push({
    courierService: 'India Post',
    state: 'All India',
    amount: 70,
    estimatedDays: '3-7 business days',
    active: true,
  })
  for (const state of INDIAN_STATES) {
    ratesToInsert.push({
      courierService: 'India Post',
      state,
      amount: 70,
      estimatedDays: '3-7 business days',
      active: true,
    })
  }

  for (const item of ratesToInsert) {
    await ShippingRate.findOrCreate({
      where: { courierService: item.courierService, state: item.state },
      defaults: item,
    })
  }

  console.log(`[ShippingRates] Successfully seeded default rates (${ratesToInsert.length} rules).`)
}

// Allow direct CLI execution
if (process.argv[1]?.endsWith('seed-shipping-rates.ts') || process.argv[1]?.endsWith('seed-shipping-rates.js')) {
  syncAndSeedShippingRates()
    .then(() => {
      console.log('Done.')
      process.exit(0)
    })
    .catch(err => {
      console.error('Error seeding shipping rates:', err)
      process.exit(1)
    })
}
