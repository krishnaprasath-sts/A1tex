import type { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'
import { env } from '../config/env.js'

export type TokenType = 'customer' | 'admin'

export type AuthPayload = {
  sub: number
  email: string
  role?: string
  customRoleId?: number
  type: TokenType
}

const customerCookie = 'a1tex_customer_token'
const adminCookie = 'a1tex_admin_token'
const guestCookie = 'a1tex_guest_session'

function cookieOptions() {
  return {
    path: '/',
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  }
}

function guestCookieOptions() {
  return {
    path: '/',
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  }
}

export function signAccessToken(payload: AuthPayload) {
  const secret = payload.type === 'admin' ? env.JWT_REFRESH_SECRET : env.JWT_ACCESS_SECRET
  return jwt.sign(payload, secret, { expiresIn: '7d' })
}

export function setAuthCookie(res: Response, type: TokenType, token: string) {
  res.cookie(type === 'admin' ? adminCookie : customerCookie, token, cookieOptions())
}

export function clearAuthCookie(res: Response, type: TokenType) {
  res.clearCookie(type === 'admin' ? adminCookie : customerCookie, cookieOptions())
}

export function readToken(req: Request, type: TokenType) {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) return header.slice(7)
  return req.cookies?.[type === 'admin' ? adminCookie : customerCookie]
}

export function verifyToken(token: string, type: TokenType) {
  const secret = type === 'admin' ? env.JWT_REFRESH_SECRET : env.JWT_ACCESS_SECRET
  return jwt.verify(token, secret) as unknown as AuthPayload
}

export function generateGuestSessionId(): string {
  return crypto.randomUUID()
}

export function readGuestSessionId(req: Request): string | undefined {
  return req.cookies?.[guestCookie]
}

export function setGuestSessionCookie(res: Response, sessionId: string) {
  res.cookie(guestCookie, sessionId, guestCookieOptions())
}

export function clearGuestSessionCookie(res: Response) {
  res.clearCookie(guestCookie, guestCookieOptions())
}
