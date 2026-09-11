import type { NextFunction, Request, Response } from 'express'
import { Admin, GuestSession } from '../models/index.js'
import { AppError } from '../utils/http.js'
import {
  readToken,
  verifyToken,
  readGuestSessionId,
  setGuestSessionCookie,
  generateGuestSessionId,
  type AuthPayload,
  type TokenType,
} from '../utils/tokens.js'

export interface GuestRequest extends Request {
  guestSessionId?: string
}

function requireAuth(type: TokenType) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const token = readToken(req, type)
    if (!token) return next(new AppError(401, 'Authentication required'))

    try {
      const payload = verifyToken(token, type)
      if (payload.type !== type) throw new Error('Wrong token type')

      if (type === 'admin') {
        const admin = await Admin.findByPk(payload.sub, {
          attributes: ['id', 'email', 'role', 'customRoleId', 'status'],
        })
        const plain = admin?.get({ plain: true }) as
          | { email: string; role: string; customRoleId?: number | null; status: string }
          | undefined

        if (!plain || plain.status !== 'active') {
          return next(new AppError(401, 'Invalid or expired session'))
        }

        payload.email = plain.email
        payload.role = plain.role
        payload.customRoleId = plain.customRoleId ?? undefined
      }

      ;(req as Request & { auth?: AuthPayload }).auth = payload
      return next()
    } catch {
      return next(new AppError(401, 'Invalid or expired session'))
    }
  }
}

export function optionalCustomerAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readToken(req, 'customer')
  if (!token) return next()

  try {
    const payload = verifyToken(token, 'customer')
    if (payload.type === 'customer') {
      ;(req as Request & { auth?: AuthPayload }).auth = payload
    }
  } catch {
    // ignore invalid token for guest checkout
  }
  next()
}

export async function optionalGuestSession(req: Request, res: Response, next: NextFunction) {
  const token = readToken(req, 'customer')
  if (token) {
    try {
      const payload = verifyToken(token, 'customer')
      if (payload.type === 'customer') {
        ;(req as Request & { auth?: AuthPayload }).auth = payload
      }
    } catch {
      // invalid token, treat as guest
    }
  }

  if (!(req as any).auth) {
    const existing = readGuestSessionId(req)
    if (existing) {
      const row = await GuestSession.findByPk(existing)
      if (row) {
        ;(req as GuestRequest).guestSessionId = existing
        return next()
      }
    }

    const newId = generateGuestSessionId()
    await GuestSession.create({ sessionId: newId })
    setGuestSessionCookie(res, newId)
    ;(req as GuestRequest).guestSessionId = newId
  }

  next()
}

export const requireCustomerAuth = requireAuth('customer')
export const requireAdminAuth = requireAuth('admin')
