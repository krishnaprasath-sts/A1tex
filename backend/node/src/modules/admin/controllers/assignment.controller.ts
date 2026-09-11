import { Request, Response } from 'express'
import { z } from 'zod'
import { Order, OrderItem, Admin } from '../../../models/index.js'
import { AppError } from '../../../utils/http.js'

export const assignOrder = async (req: Request, res: Response) => {
  const orderId = Number(req.params.id)
  const schema = z.object({ adminId: z.number().int().positive() })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) throw new AppError(400, 'adminId is required.')

  const order = await Order.findByPk(orderId)
  if (!order) throw new AppError(404, 'Order not found.')

  const staff = await Admin.findByPk(parsed.data.adminId)
  if (!staff || (staff.get({ plain: true }) as any).status !== 'active') {
    throw new AppError(400, 'Staff member not found or inactive.')
  }

  await order.update({ assignedAdminId: parsed.data.adminId, assignedAt: new Date() })
  res.json({ ok: true, assignedAdminId: parsed.data.adminId, assignedAt: new Date() })
}

export const unassignOrder = async (req: Request, res: Response) => {
  const orderId = Number(req.params.id)
  const order = await Order.findByPk(orderId)
  if (!order) throw new AppError(404, 'Order not found.')

  await order.update({ assignedAdminId: null, assignedAt: null })
  res.json({ ok: true })
}

export const getMyAssignments = async (req: Request, res: Response) => {
  const auth = (req as any).auth
  // Check if any orders are explicitly assigned to this admin
  let orders = await Order.findAll({
    where: { assignedAdminId: auth.sub },
    include: [{ model: OrderItem, as: 'items' }],
    order: [['createdAt', 'DESC']],
  })

  // If none explicitly assigned, show all active pipeline orders
  if (orders.length === 0) {
    orders = await Order.findAll({
      include: [{ model: OrderItem, as: 'items' }],
      order: [['createdAt', 'DESC']],
      limit: 50,
    })
  }

  res.json({ orders: orders.map(o => o.get({ plain: true })) })
}

export const packOrder = async (_req: Request, res: Response) => {
  const orderId = Number(_req.params.id)
  const order = await Order.findByPk(orderId)
  if (!order) throw new AppError(404, 'Order not found.')

  const plain = order.get({ plain: true }) as any
  await order.update({ status: 'packing' })
  res.json({ ok: true, status: 'packing' })
}
