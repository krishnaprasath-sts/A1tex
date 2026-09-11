import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { Admin } from '../../models/index.js'
import { requireAdminAuth } from '../../middleware/auth.js'
import { AppError, asyncHandler } from '../../utils/http.js'
import { clearAuthCookie, setAuthCookie, signAccessToken } from '../../utils/tokens.js'
import { getAdminPermissions } from '../../middleware/permissions.js'

const router = Router()

const loginSchema = z.object({
  email: z.string().trim().email().transform(value => value.toLowerCase()),
  password: z.string().min(1),
})

function sanitizeAdmin(row: unknown) {
  const admin = (row as { get: (options: { plain: boolean }) => any }).get({ plain: true })
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    customRoleId: admin.customRoleId ?? null,
    status: admin.status,
    lastLoginAt: admin.lastLoginAt,
  }
}

router.post('/login', asyncHandler(async (req, res) => {
  const input = loginSchema.parse(req.body)
  const admin = await Admin.findOne({ where: { email: input.email } })
  if (!admin) throw new AppError(401, 'Invalid email or password.')

  const rawAdmin = (admin as any).get({ plain: true })
  const matches = await bcrypt.compare(input.password, rawAdmin.passwordHash)
  if (!matches || rawAdmin.status !== 'active') {
    throw new AppError(401, 'Invalid email or password.')
  }

  await admin.update({ lastLoginAt: new Date() })
  const safeAdmin = sanitizeAdmin(admin)
  const token = signAccessToken({
    sub: safeAdmin.id,
    email: safeAdmin.email,
    role: safeAdmin.role,
    customRoleId: safeAdmin.customRoleId ?? undefined,
    type: 'admin',
  })
  setAuthCookie(res, 'admin', token)
  const permissions = await getAdminPermissions({ role: safeAdmin.role, customRoleId: safeAdmin.customRoleId ?? undefined })
  res.json({ admin: safeAdmin, permissions })
}))

router.post('/logout', (_req, res) => {
  clearAuthCookie(res, 'admin')
  res.json({ ok: true })
})

router.get('/me', requireAdminAuth, asyncHandler(async (req, res) => {
  const auth = (req as any).auth
  const admin = await Admin.findByPk(auth.sub)
  if (!admin) throw new AppError(404, 'Admin not found.')
  const safeAdmin = sanitizeAdmin(admin)
  const permissions = await getAdminPermissions({ role: safeAdmin.role, customRoleId: safeAdmin.customRoleId ?? undefined })
  res.json({ admin: safeAdmin, permissions })
}))

export default router
