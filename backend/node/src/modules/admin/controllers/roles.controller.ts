import { Request, Response } from 'express'
import { z } from 'zod'
import { CustomRole, RolePermission } from '../../../models/index.js'
import { AppError } from '../../../utils/http.js'
import { BUILT_IN_PERMISSIONS, type PermissionKey } from '../../../middleware/permissions.js'

const ALL_PERMISSION_KEYS: PermissionKey[] = [
  'view_dashboard', 'view_orders', 'assign_orders', 'pack_orders',
  'transition_orders', 'view_my_orders', 'manage_products', 'manage_stock',
  'manage_coupons', 'manage_settings', 'manage_staff', 'manage_roles',
  'view_reports', 'manage_customers', 'manage_invoices', 'manage_email_campaigns',
]

const SYSTEM_ROLE_NAMES = ['super_admin', 'manager', 'employee']

async function seedSystemRoles() {
  for (const [roleName, perms] of Object.entries(BUILT_IN_PERMISSIONS)) {
    let role = await CustomRole.findOne({ where: { name: roleName } })
    if (!role) {
      role = await CustomRole.create({ name: roleName, description: `Built-in ${roleName} role`, isSystem: true })
      const roleId = (role as any).get('id')
      for (const perm of perms) {
        await RolePermission.findOrCreate({ where: { roleId, permissionKey: perm }, defaults: { roleId, permissionKey: perm } })
      }
    }
  }
}

const createRoleSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(255).optional(),
  permissions: z.array(z.string()).default([]),
})

export const listRoles = async (req: Request, res: Response) => {
  // Seed system roles if not exist
  await seedSystemRoles()

  const roles = await CustomRole.findAll({
    include: [{ model: RolePermission, as: 'permissions', attributes: ['permissionKey'] }],
  })

  const systemOrder = ['super_admin', 'manager', 'employee']

  const formattedRoles = roles.map(r => {
    const plain = r.get({ plain: true }) as any
    const perms = plain.name === 'super_admin'
      ? ALL_PERMISSION_KEYS
      : (plain.permissions || []).map((p: any) => p.permissionKey)
    return {
      ...plain,
      permissions: perms,
    }
  }).sort((a, b) => {
    const aIndex = systemOrder.indexOf(a.name)
    const bIndex = systemOrder.indexOf(b.name)
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
    if (aIndex !== -1) return -1
    if (bIndex !== -1) return 1
    return a.id - b.id
  })

  res.json({
    roles: formattedRoles,
    allPermissions: ALL_PERMISSION_KEYS,
  })
}

export const createRole = async (req: Request, res: Response) => {
  const parsed = createRoleSchema.safeParse(req.body)
  if (!parsed.success) throw new AppError(400, parsed.error.errors.map(e => e.message).join('; '))

  const { name, description, permissions } = parsed.data

  if (SYSTEM_ROLE_NAMES.includes(name.toLowerCase())) {
    throw new AppError(400, 'Cannot create a role with a system role name.')
  }

  const existing = await CustomRole.findOne({ where: { name } })
  if (existing) throw new AppError(400, 'A role with this name already exists.')

  const role = await CustomRole.create({ name, description: description ?? null, isSystem: false })
  const roleId = (role as any).get('id')

  if (permissions.length > 0) {
    const validPerms = permissions.filter(p => ALL_PERMISSION_KEYS.includes(p as PermissionKey))
    await RolePermission.bulkCreate(validPerms.map(p => ({ roleId, permissionKey: p })))
  }

  const plain = role.get({ plain: true }) as any
  res.status(201).json({ role: { ...plain, permissions } })
}

export const updateRole = async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const role = await CustomRole.findByPk(id)
  if (!role) throw new AppError(404, 'Role not found.')

  const plain = role.get({ plain: true }) as any

  if (plain.name === 'super_admin') {
    throw new AppError(400, 'Super Admin role permissions are fixed and cannot be modified.')
  }

  const parsed = createRoleSchema.safeParse(req.body)
  if (!parsed.success) throw new AppError(400, parsed.error.errors.map(e => e.message).join('; '))

  const { name, description, permissions } = parsed.data

  if (plain.isSystem) {
    // Keep system role name unchanged
    await role.update({ description: description ?? plain.description })
  } else {
    if (SYSTEM_ROLE_NAMES.includes(name.toLowerCase()) && name.toLowerCase() !== plain.name.toLowerCase()) {
      throw new AppError(400, 'Cannot rename custom role to a system role name.')
    }
    await role.update({ name, description: description ?? null })
  }

  // Replace permissions in DB
  await RolePermission.destroy({ where: { roleId: id } })
  if (permissions.length > 0) {
    const validPerms = permissions.filter(p => ALL_PERMISSION_KEYS.includes(p as PermissionKey))
    await RolePermission.bulkCreate(validPerms.map(p => ({ roleId: id, permissionKey: p })))
  }

  res.json({ role: { ...plain, name: plain.isSystem ? plain.name : name, description, permissions } })
}

export const deleteRole = async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const role = await CustomRole.findByPk(id)
  if (!role) throw new AppError(404, 'Role not found.')

  const plain = role.get({ plain: true }) as any
  if (plain.isSystem) throw new AppError(400, 'System roles cannot be deleted.')

  await RolePermission.destroy({ where: { roleId: id } })
  await role.destroy()
  res.json({ ok: true })
}
