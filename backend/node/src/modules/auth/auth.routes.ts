import { Router } from 'express'
import bcrypt from 'bcryptjs'
import nodemailer from 'nodemailer'
import { Op } from 'sequelize'
import { z } from 'zod'
import { Customer, PasswordReset, CartItem, WishlistItem, GuestSession, Product, ProductVariant, Order } from '../../models/index.js'
import { sequelize } from '../../database/sequelize.js'
import { requireCustomerAuth } from '../../middleware/auth.js'
import { AppError, asyncHandler } from '../../utils/http.js'
import {
  clearAuthCookie,
  setAuthCookie,
  signAccessToken,
  readGuestSessionId,
  clearGuestSessionCookie,
} from '../../utils/tokens.js'
import { env } from '../../config/env.js'
import { sendOtpEmail } from '../../services/email.service.js'

const router = Router()

const registerSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email().transform(value => value.toLowerCase()),
  mobile: z.string().trim().optional().nullable(),
  password: z.string().regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]{6,}$/,
    'Password must be at least 6 characters with uppercase, lowercase, number, and special character.'
  ),
})

const loginSchema = z.object({
  contact: z.string().trim().min(3),
  password: z.string().min(1),
})

function sanitizeCustomer(row: unknown) {
  const customer = (row as { get: (options: { plain: boolean }) => any }).get({ plain: true })
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    mobile: customer.mobile,
    status: customer.status,
    emailVerified: customer.emailVerified,
  }
}

async function mergeGuestData(guestSessionId: string, userId: number) {
  // Merge guest cart items to user
  const guestCartItems = await CartItem.findAll({ where: { sessionId: guestSessionId } })
  for (const guestItem of guestCartItems) {
    const plain = guestItem.get({ plain: true }) as any
    const whereClause: any = {
      userId,
      productId: plain.productId,
      color: plain.color || null,
      size: plain.size || null,
    }
    if (plain.variantId) {
      whereClause.variantId = plain.variantId
    } else {
      whereClause.variantId = { [Op.is]: null }
    }

    // Validate product/variant and get max stock
    let maxStock = 0
    if (plain.variantId) {
      const variant = await ProductVariant.findByPk(plain.variantId, {
        include: [{ model: Product, attributes: ['status'] }],
      })
      if (!variant) continue
      const v = variant.get({ plain: true }) as any
      if (v.status !== 'active' || (v.Product && v.Product.status !== 'active')) continue
      maxStock = v.stockQty
    } else {
      const product = await Product.findByPk(plain.productId, { attributes: ['status', 'stockQty'] })
      if (!product) continue
      const p = product.get({ plain: true }) as any
      if (p.status !== 'active') continue
      maxStock = p.stockQty
    }
    if (maxStock <= 0) continue

    const existing = await CartItem.findOne({ where: whereClause })
    if (existing) {
      const newQty = Math.min((existing.get('quantity') as number) + plain.quantity, maxStock)
      await existing.update({ quantity: newQty })
    } else {
      const safeQty = Math.min(plain.quantity, maxStock)
      if (safeQty > 0) {
        await CartItem.update(
          { userId, sessionId: null },
          { where: { id: guestItem.get('id') as number } },
        )
        continue
      }
    }
    await guestItem.destroy()
  }

  // Merge guest wishlist items to user
  const guestWishlistItems = await WishlistItem.findAll({ where: { sessionId: guestSessionId } })
  for (const guestItem of guestWishlistItems) {
    const productId = guestItem.get('productId') as number
    const variantId = (guestItem.get('variantId') as number | null) ?? null
    const product = await Product.findByPk(productId, { attributes: ['id', 'status'] })
    if (!product) {
      await guestItem.destroy()
      continue
    }
    const existing = await WishlistItem.findOne({ where: { userId, productId, variantId } })
    if (!existing) {
      await WishlistItem.update(
        { userId, sessionId: null },
        { where: { id: guestItem.get('id') as number } },
      )
    } else {
      await guestItem.destroy()
    }
  }

  // Delete guest session
  await GuestSession.destroy({ where: { sessionId: guestSessionId } })
}

async function cleanupGuestSession(req: any, res: any) {
  const guestSessionId = readGuestSessionId(req)
  if (guestSessionId) {
    await CartItem.destroy({ where: { sessionId: guestSessionId } }).catch(() => {})
    await WishlistItem.destroy({ where: { sessionId: guestSessionId } }).catch(() => {})
    await GuestSession.destroy({ where: { sessionId: guestSessionId } }).catch(() => {})
    clearGuestSessionCookie(res)
  }
}

router.post('/register', asyncHandler(async (req, res) => {
  const input = registerSchema.parse(req.body)
  const existing = await Customer.findOne({
    where: {
      [Op.or]: [
        { email: input.email },
        ...(input.mobile ? [{ mobile: input.mobile }] : []),
      ],
    },
  })

  if (existing) {
    throw new AppError(409, 'An account already exists with this email or mobile number.')
  }

  const passwordHash = await bcrypt.hash(input.password, 12)
  const customer = await Customer.create({
    name: input.name,
    email: input.email,
    mobile: input.mobile || null,
    passwordHash,
    status: 'active',
    emailVerified: true,
  })

  const safeCustomer = sanitizeCustomer(customer)
  const token = signAccessToken({ sub: safeCustomer.id, email: safeCustomer.email, type: 'customer' })
  setAuthCookie(res, 'customer', token)

  // Merge guest data if present
  const guestSessionId = readGuestSessionId(req)
  if (guestSessionId) {
    await mergeGuestData(guestSessionId, safeCustomer.id).catch(() => {})
    clearGuestSessionCookie(res)
  }

  // Link past guest-checkout orders placed under this email before the account
  // existed, so order history/spend and the admin "Guest"/"Customer" label are
  // correct going forward. Case-insensitive since guest checkout doesn't
  // lowercase the email the way registration does.
  await Order.update(
    { customerId: safeCustomer.id },
    {
      where: {
        customerId: null,
        [Op.and]: [sequelize.where(sequelize.fn('LOWER', sequelize.col('customer_email')), safeCustomer.email)],
      },
    },
  ).catch(() => {})

  res.status(201).json({ customer: safeCustomer })
}))

router.post('/login', asyncHandler(async (req, res) => {
  const input = loginSchema.parse(req.body)
  const customer = await Customer.findOne({
    where: {
      [Op.or]: [
        { email: input.contact.toLowerCase() },
        { mobile: input.contact },
      ],
    },
  })

  if (!customer) throw new AppError(401, 'Invalid email/mobile or password.')

  const rawCustomer = (customer as any).get({ plain: true })
  const matches = await bcrypt.compare(input.password, rawCustomer.passwordHash)
  if (!matches || rawCustomer.status !== 'active') {
    throw new AppError(401, 'Invalid email/mobile or password.')
  }

  const safeCustomer = sanitizeCustomer(customer)
  const token = signAccessToken({ sub: safeCustomer.id, email: safeCustomer.email, type: 'customer' })
  setAuthCookie(res, 'customer', token)

  // Merge guest data if present
  const guestSessionId = readGuestSessionId(req)
  if (guestSessionId) {
    await mergeGuestData(guestSessionId, safeCustomer.id).catch(() => {})
    clearGuestSessionCookie(res)
  }

  res.json({ customer: safeCustomer })
}))

router.post('/logout', asyncHandler(async (req, res) => {
  clearAuthCookie(res, 'customer')
  await cleanupGuestSession(req, res)
  res.json({ ok: true })
}))

router.get('/me', requireCustomerAuth, asyncHandler(async (req, res) => {
  const auth = (req as any).auth
  const customer = await Customer.findByPk(auth.sub)
  if (!customer) throw new AppError(404, 'Account not found.')
  res.json({ customer: sanitizeCustomer(customer) })
}))

const forgotPasswordSchema = z.object({
  email: z.string().trim().email().transform(value => value.toLowerCase()),
})

const resetPasswordSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits.'),
  email: z.string().email(),
  password: z.string().min(6),
})

router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = forgotPasswordSchema.parse(req.body)

  const customer = await Customer.findOne({ where: { email } })
  if (!customer) {
    res.json({ message: 'If an account exists for this email, an OTP will be sent.' })
    return
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000))
  const otpHash = await bcrypt.hash(otp, 12)

  await PasswordReset.destroy({ where: { customerId: (customer as any).id } })

  await PasswordReset.create({
    customerId: (customer as any).id,
    tokenHash: otpHash,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  })

  await sendOtpEmail(email, otp)

  const devOtp = env.NODE_ENV !== 'production' ? otp : undefined
  res.json({ message: 'If an account exists for this email, an OTP will be sent.', devOtp })
}))

router.post('/reset-password', asyncHandler(async (req, res) => {
  const { otp, email, password } = resetPasswordSchema.parse(req.body)

  const customer = await Customer.findOne({ where: { email } })
  if (!customer) {
    throw new AppError(400, 'Invalid or expired OTP.')
  }

  const records = await PasswordReset.findAll({
    where: {
      customerId: (customer as any).id,
      usedAt: null,
    },
    order: [['createdAt', 'DESC']],
  })

  let validRecord: any = null
  for (const record of records) {
    const raw = (record as any).get({ plain: true })
    const match = await bcrypt.compare(otp, raw.tokenHash)
    if (match) {
      validRecord = record
      break
    }
  }

  if (!validRecord) {
    throw new AppError(400, 'Invalid or expired OTP.')
  }

  const rawRecord = (validRecord as any).get({ plain: true })
  if (new Date(rawRecord.expiresAt) < new Date()) {
    throw new AppError(400, 'This OTP has expired. Please request a new one.')
  }

  const passwordHash = await bcrypt.hash(password, 12)
  await customer.update({ passwordHash })
  await validRecord.update({ usedAt: new Date() })

  res.json({ message: 'Password has been reset successfully. You can now sign in with your new password.' })
}))

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters.'),
})

router.post('/change-password', requireCustomerAuth, asyncHandler(async (req, res) => {
  const auth = (req as any).auth
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body)

  const customer = await Customer.findByPk(auth.sub)
  if (!customer) throw new AppError(404, 'Account not found.')

  const raw = (customer as any).get({ plain: true })
  const matches = await bcrypt.compare(currentPassword, raw.passwordHash)
  if (!matches) throw new AppError(400, 'Current password is incorrect.')

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await customer.update({ passwordHash })

  res.json({ message: 'Password changed successfully.' })
}))

router.put(
  '/profile',
  requireCustomerAuth,
  asyncHandler(async (req, res) => {
    const auth = (req as any).auth
    const customer = await Customer.findByPk(auth.sub)
    if (!customer) throw new AppError(404, 'Account not found.')

    const schema = z.object({
      name: z.string().trim().min(2).optional(),
      email: z.string().trim().email().transform(v => v.toLowerCase()).optional(),
      mobile: z.string().trim().optional().nullable(),
    })

    const input = schema.parse(req.body)
    const updates: Record<string, unknown> = {}

    if (input.name !== undefined) updates.name = input.name
    if (input.email !== undefined) {
      const existing = await Customer.findOne({
        where: { email: input.email, id: { [Op.ne]: auth.sub } },
      })
      if (existing) throw new AppError(409, 'This email is already in use by another account.')
      updates.email = input.email
    }
    if (input.mobile !== undefined) {
      if (input.mobile) {
        const existing = await Customer.findOne({
          where: { mobile: input.mobile, id: { [Op.ne]: auth.sub } },
        })
        if (existing) throw new AppError(409, 'This mobile number is already in use by another account.')
      }
      updates.mobile = input.mobile
    }

    if (Object.keys(updates).length === 0) {
      throw new AppError(400, 'No fields to update.')
    }

    await customer.update(updates)
    res.json({ customer: sanitizeCustomer(customer) })
  }),
)

export default router
