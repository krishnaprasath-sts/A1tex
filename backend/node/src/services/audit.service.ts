import { AuditLog } from '../models/index.js'

export async function writeAuditLog(input: {
  adminId?: number
  action: string
  entity: string
  entityId?: string | number
  details?: unknown
}) {
  await AuditLog.create({
    adminId: input.adminId ?? null,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId ? String(input.entityId) : null,
    details: input.details ?? null,
  })
}
