import { Router } from 'express'
import { Op } from 'sequelize'
import { z } from 'zod'
import { CustomerAddress } from '../../models/index.js'
import { requireCustomerAuth } from '../../middleware/auth.js'
import { AppError, asyncHandler } from '../../utils/http.js'

const router = Router()

const addressSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().optional().nullable(),
  address: z.string().trim().min(1),
  city: z.string().trim().min(1),
  state: z.string().trim().min(1),
  pincode: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  isDefault: z.boolean().optional(),
})

function plain<T = Record<string, unknown>>(row: unknown): T {
  return (row as { get: (options: { plain: boolean }) => T }).get({ plain: true })
}

router.use(requireCustomerAuth)

router.get('/', asyncHandler(async (req, res) => {
  const auth = (req as any).auth
  const addresses = await CustomerAddress.findAll({
    where: { customerId: auth.sub },
    order: [['isDefault', 'DESC'], ['createdAt', 'DESC']],
  })
  res.json({ addresses: addresses.map(row => plain(row)) })
}))

router.post('/', asyncHandler(async (req, res) => {
  const auth = (req as any).auth
  const input = addressSchema.parse(req.body)

  if (input.isDefault) {
    await CustomerAddress.update(
      { isDefault: false },
      { where: { customerId: auth.sub } },
    )
  }

  const address = await CustomerAddress.create({
    customerId: auth.sub,
    firstName: input.firstName,
    lastName: input.lastName || null,
    address: input.address,
    city: input.city,
    state: input.state,
    pincode: input.pincode,
    phone: input.phone,
    isDefault: input.isDefault || false,
  })

  res.status(201).json({ address: plain(address) })
}))

router.put('/:id', asyncHandler(async (req, res) => {
  const auth = (req as any).auth
  const input = addressSchema.parse(req.body)

  const address = await CustomerAddress.findOne({
    where: { id: req.params.id, customerId: auth.sub },
  })
  if (!address) throw new AppError(404, 'Address not found.')

  if (input.isDefault) {
    await CustomerAddress.update(
      { isDefault: false },
      { where: { customerId: auth.sub, id: { [Op.ne]: address.get('id') } } },
    )
  }

  await address.update({
    firstName: input.firstName,
    lastName: input.lastName || null,
    address: input.address,
    city: input.city,
    state: input.state,
    pincode: input.pincode,
    phone: input.phone,
    isDefault: input.isDefault || false,
  })

  res.json({ address: plain(address) })
}))

router.delete('/:id', asyncHandler(async (req, res) => {
  const auth = (req as any).auth
  const address = await CustomerAddress.findOne({
    where: { id: req.params.id, customerId: auth.sub },
  })
  if (!address) throw new AppError(404, 'Address not found.')
  await address.destroy()
  res.json({ ok: true })
}))

export default router
