import { Request, Response } from 'express'
import { z } from 'zod'
import { Op } from 'sequelize'
import { ShippingRate } from '../../../models/shipping-rate.model.js'
import { writeAuditLog } from '../../../services/audit.service.js'
import { AppError } from '../../../utils/http.js'
import { adminId, paginationSchema, idParam } from './utils.js'
import { syncAndSeedShippingRates, INDIAN_STATES } from '../../../database/seed-shipping-rates.js'

export const shippingRateSchema = z.object({
  courierService: z.string().min(2).max(80),
  state: z.string().min(2).max(100),
  amount: z.coerce.number().min(0),
  estimatedDays: z.string().max(80).optional().default(''),
  active: z.boolean().optional().default(true),
})

export const getShippingRates = async (req: Request, res: Response) => {
  const { page, perPage } = paginationSchema.parse(req.query)
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
  const courier = typeof req.query.courier === 'string' ? req.query.courier.trim() : ''
  const state = typeof req.query.state === 'string' ? req.query.state.trim() : ''

  const where: any = {}
  if (courier) where.courierService = courier
  if (state) where.state = state

  if (search) {
    where[Op.or] = [
      { courierService: { [Op.like]: `%${search}%` } },
      { state: { [Op.like]: `%${search}%` } },
    ]
  }

  const { rows, count } = await ShippingRate.findAndCountAll({
    where,
    order: [
      ['courierService', 'ASC'],
      ['state', 'ASC'],
    ],
    offset: (page - 1) * perPage,
    limit: perPage,
  })

  res.json({
    items: rows.map(r => r.get({ plain: true })),
    total: count,
    page,
    perPage,
    totalPages: Math.ceil(count / perPage),
    availableStates: INDIAN_STATES,
    availableCouriers: ['ST Courier', 'DTDC', 'The Professional Courier', 'India Post'],
  })
}

export const createShippingRate = async (req: Request, res: Response) => {
  const parsed = shippingRateSchema.parse(req.body)

  // Upsert or create
  const [rate, created] = await ShippingRate.findOrCreate({
    where: {
      courierService: parsed.courierService,
      state: parsed.state,
    },
    defaults: {
      courierService: parsed.courierService,
      state: parsed.state,
      amount: parsed.amount,
      estimatedDays: parsed.estimatedDays || null,
      active: parsed.active,
    },
  })

  if (!created) {
    await rate.update({
      amount: parsed.amount,
      estimatedDays: parsed.estimatedDays || rate.get('estimatedDays'),
      active: parsed.active,
    })
  }

  await writeAuditLog({
    adminId: adminId(req),
    action: created ? 'create_shipping_rate' : 'update_shipping_rate',
    entity: 'shipping_rate',
    entityId: String(rate.get('id')),
    details: parsed,
  })

  res.status(created ? 201 : 200).json({ item: rate.get({ plain: true }) })
}

export const updateShippingRate = async (req: Request, res: Response) => {
  const { id } = idParam.parse(req.params)
  const rate = await ShippingRate.findByPk(id)
  if (!rate) throw new AppError(404, 'Shipping rate not found')

  const updateSchema = shippingRateSchema.partial()
  const parsed = updateSchema.parse(req.body)

  await rate.update(parsed)

  await writeAuditLog({
    adminId: adminId(req),
    action: 'update_shipping_rate',
    entity: 'shipping_rate',
    entityId: id,
    details: parsed,
  })

  res.json({ item: rate.get({ plain: true }) })
}

export const deleteShippingRate = async (req: Request, res: Response) => {
  const { id } = idParam.parse(req.params)
  const rate = await ShippingRate.findByPk(id)
  if (!rate) throw new AppError(404, 'Shipping rate not found')

  await rate.destroy()

  await writeAuditLog({
    adminId: adminId(req),
    action: 'delete_shipping_rate',
    entity: 'shipping_rate',
    entityId: id,
  })

  res.json({ ok: true })
}

export const resetShippingRates = async (req: Request, res: Response) => {
  await ShippingRate.destroy({ where: {} })
  await syncAndSeedShippingRates()

  await writeAuditLog({
    adminId: adminId(req),
    action: 'reset_shipping_rates',
    entity: 'shipping_rate',
  })

  res.json({ ok: true, message: 'Shipping rates have been reset to default values.' })
}
