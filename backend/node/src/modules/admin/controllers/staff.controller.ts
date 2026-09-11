import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { Admin, CustomRole } from '../../../models/index.js'
import { AppError } from '../../../utils/http.js'

const createStaffSchema = z.object({
  name: z.string().min(1).max(140),
  email: z.string().email().toLowerCase(),
  password: z.string().min(6),
  role: z.enum(['super_admin', 'manager', 'employee']).default('employee'),
  customRoleId: z.number().int().positive().optional().nullable(),
})

const updateStaffSchema = z.object({
  name: z.string().min(1).max(140).optional(),
  role: z.enum(['super_admin', 'manager', 'employee']).optional(),
  customRoleId: z.number().int().positive().optional().nullable(),
  status: z.enum(['active', 'inactive']).optional(),
  password: z.string().min(6).optional(),
})

export const listStaff = async (req: Request, res: Response) => {
  const staff = await Admin.findAll({
    attributes: ['id', 'name', 'email', 'role', 'customRoleId', 'status', 'lastLoginAt', 'createdAt'],
    order: [['createdAt', 'DESC']],
  })
  res.json({ staff: staff.map(s => s.get({ plain: true })) })
}

export const createStaff = async (req: Request, res: Response) => {
  const parsed = createStaffSchema.safeParse(req.body)
  if (!parsed.success) throw new AppError(400, parsed.error.errors.map(e => e.message).join('; '))

  const { name, email, password, role, customRoleId } = parsed.data
  const auth = (req as any).auth

  if (auth?.role !== 'super_admin' && role === 'super_admin') {
    throw new AppError(403, 'Only a super admin can create another super admin.')
  }
  if (customRoleId) {
    const customRole = await CustomRole.findByPk(customRoleId)
    if (!customRole) throw new AppError(400, 'Selected custom role does not exist.')
  }

  const existing = await Admin.findOne({ where: { email } })
  if (existing) throw new AppError(400, 'An account with this email already exists.')

  const passwordHash = await bcrypt.hash(password, 10)
  const staff = await Admin.create({ name, email, passwordHash, role, customRoleId: customRoleId ?? null, status: 'active' })
  const plain = staff.get({ plain: true }) as any
  res.status(201).json({
    staff: {
      id: plain.id, name: plain.name, email: plain.email,
      role: plain.role, customRoleId: plain.customRoleId, status: plain.status,
    },
  })
}

export const updateStaff = async (req: Request, res: Response) => {
  const auth = (req as any).auth
  const id = Number(req.params.id)
  if (!id) throw new AppError(400, 'Invalid staff ID')

  // Prevent self-lockout.
  if (id === auth.sub && req.body.status === 'inactive') {
    throw new AppError(400, 'You cannot deactivate your own account.')
  }
  if (id === auth.sub && (req.body.role !== undefined || req.body.customRoleId !== undefined)) {
    throw new AppError(400, 'You cannot change your own role.')
  }

  const parsed = updateStaffSchema.safeParse(req.body)
  if (!parsed.success) throw new AppError(400, parsed.error.errors.map(e => e.message).join('; '))

  const staff = await Admin.findByPk(id)
  if (!staff) throw new AppError(404, 'Staff member not found.')

  const existingStaff = staff.get({ plain: true }) as any
  if (auth?.role !== 'super_admin' && (existingStaff.role === 'super_admin' || parsed.data.role === 'super_admin')) {
    throw new AppError(403, 'Only a super admin can manage super admin accounts.')
  }
  if (parsed.data.customRoleId) {
    const customRole = await CustomRole.findByPk(parsed.data.customRoleId)
    if (!customRole) throw new AppError(400, 'Selected custom role does not exist.')
  }

  const updates: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) updates.name = parsed.data.name
  if (parsed.data.role !== undefined) updates.role = parsed.data.role
  if (parsed.data.customRoleId !== undefined) updates.customRoleId = parsed.data.customRoleId
  if (parsed.data.status !== undefined) updates.status = parsed.data.status
  if (parsed.data.password) updates.passwordHash = await bcrypt.hash(parsed.data.password, 10)

  await staff.update(updates)
  const plain = staff.get({ plain: true }) as any
  res.json({
    staff: {
      id: plain.id, name: plain.name, email: plain.email,
      role: plain.role, customRoleId: plain.customRoleId, status: plain.status,
    },
  })
}

export const deleteStaff = async (req: Request, res: Response) => {
  const auth = (req as any).auth
  const id = Number(req.params.id)
  if (id === auth.sub) throw new AppError(400, 'You cannot delete your own account.')

  const staff = await Admin.findByPk(id)
  if (!staff) throw new AppError(404, 'Staff member not found.')
  const plain = staff.get({ plain: true }) as any
  if (auth?.role !== 'super_admin' && plain.role === 'super_admin') {
    throw new AppError(403, 'Only a super admin can deactivate another super admin.')
  }

  await staff.update({ status: 'inactive' })
  res.json({ ok: true, message: 'Staff member deactivated.' })
}
