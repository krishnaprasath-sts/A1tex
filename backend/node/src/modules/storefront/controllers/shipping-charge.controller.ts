import { Request, Response } from 'express'
import { Op } from 'sequelize'
import { ShippingRate } from '../../../models/shipping-rate.model.js'
import { getShippingConfig } from '../../../services/settings.service.js'
import { AppError } from '../../../utils/http.js'

function normalizeCourierName(input: string): string {
  const clean = input.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (clean.includes('post') || clean.includes('india') || clean.includes('speed')) return 'India Post'
  if (clean.includes('professional') || clean.includes('tpc')) return 'The Professional Courier'
  if (clean.includes('dtdc')) return 'DTDC'
  if (clean.startsWith('st') || clean.includes('stcourier') || clean === 'st') return 'ST Courier'
  return input
}

function getCourierCode(name: string): string {
  const clean = name.toLowerCase()
  if (clean.includes('post') || clean.includes('india')) return 'indiapost'
  if (clean.includes('professional') || clean.includes('tpc')) return 'professional'
  if (clean.includes('dtdc')) return 'dtdc'
  if (clean.startsWith('st') || clean.includes('stcourier') || clean === 'st') return 'st_courier'
  return clean.replace(/[^a-z0-9]/g, '_')
}

export const getShippingCharge = async (req: Request, res: Response) => {
  const stateQuery = typeof req.query.state === 'string' ? req.query.state.trim() : ''
  const courierQuery = typeof req.query.courier === 'string' ? req.query.courier.trim() : ''
  const subtotal = typeof req.query.subtotal === 'string' ? parseFloat(req.query.subtotal) : 0

  if (!stateQuery) {
    throw new AppError(400, 'State query parameter is required.')
  }

  const shippingConfig = await getShippingConfig()
  const freeShipping = shippingConfig.freeShippingEnabled && shippingConfig.freeShippingThreshold > 0 && subtotal >= shippingConfig.freeShippingThreshold

  // If specific courier is requested
  if (courierQuery) {
    const courierCanonical = normalizeCourierName(courierQuery)

    // Try finding exact state match, or fallback to 'All India'
    const rate = await ShippingRate.findOne({
      where: {
        courierService: courierCanonical,
        active: true,
        [Op.or]: [
          { state: stateQuery },
          { state: { [Op.like]: `%${stateQuery}%` } },
          { state: 'All India' },
        ],
      },
      order: [
        // Exact state match takes priority over 'All India'
        [ShippingRate.sequelize!.literal(`CASE WHEN state = '${stateQuery}' THEN 0 WHEN state LIKE '%${stateQuery}%' THEN 1 ELSE 2 END`), 'ASC'],
      ],
    })

    if (!rate) {
      return res.json({
        available: false,
        courier: courierCanonical,
        courierCode: getCourierCode(courierCanonical),
        state: stateQuery,
        amount: 0,
        message: `${courierCanonical} is not available for ${stateQuery}.`,
      })
    }

    const baseAmount = Number(rate.get('amount'))
    const finalAmount = freeShipping ? 0 : baseAmount

    return res.json({
      available: true,
      courier: rate.get('courierService'),
      courierCode: getCourierCode(rate.get('courierService') as string),
      state: stateQuery,
      amount: finalAmount,
      originalAmount: baseAmount,
      isFreeShipping: freeShipping,
      estimatedDays: rate.get('estimatedDays') || '3-5 business days',
    })
  }

  // If no specific courier requested, return all available couriers for this state
  const rates = await ShippingRate.findAll({
    where: {
      active: true,
      [Op.or]: [
        { state: stateQuery },
        { state: { [Op.like]: `%${stateQuery}%` } },
        { state: 'All India' },
      ],
    },
  })

  // Deduplicate by courierService preferring exact state match over All India
  const courierMap = new Map<string, any>()
  for (const r of rates) {
    const courier = r.get('courierService') as string
    const state = r.get('state') as string
    const existing = courierMap.get(courier)
    if (!existing || state.toLowerCase() === stateQuery.toLowerCase()) {
      courierMap.set(courier, r)
    }
  }

  const options = Array.from(courierMap.values()).map(r => {
    const baseAmount = Number(r.get('amount'))
    const finalAmount = freeShipping ? 0 : baseAmount
    const name = r.get('courierService') as string
    return {
      id: getCourierCode(name),
      code: getCourierCode(name),
      name,
      courierService: name,
      rate: finalAmount,
      amount: finalAmount,
      originalAmount: baseAmount,
      isFreeShipping: freeShipping,
      estimatedDays: r.get('estimatedDays') || '3-5 business days',
      available: true,
    }
  })

  // Ensure consistent order: ST Courier, DTDC, The Professional Courier, India Post
  const orderRank: Record<string, number> = {
    'st_courier': 1,
    'dtdc': 2,
    'professional': 3,
    'indiapost': 4,
  }
  options.sort((a, b) => (orderRank[a.code] || 99) - (orderRank[b.code] || 99))

  res.json({
    state: stateQuery,
    subtotal,
    freeShipping,
    couriers: options,
  })
}
