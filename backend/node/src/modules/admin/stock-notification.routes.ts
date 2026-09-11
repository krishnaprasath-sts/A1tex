import { Router } from 'express'
import { z } from 'zod'
import { StockNotification } from '../../models/index.js'
import { requireAdminAuth } from '../../middleware/auth.js'
import { requirePermission } from '../../middleware/permissions.js'
import { AppError, asyncHandler } from '../../utils/http.js'
import { writeAuditLog } from '../../services/audit.service.js'
import { sendBackInStockEmail, sendNotifyMessageEmail } from '../../services/email.service.js'

const router = Router()

router.use(requireAdminAuth)

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(100).default(20),
})

const messageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(5000),
})

router.get('/', requirePermission('manage_stock'), asyncHandler(async (req, res) => {
  const { page, perPage } = paginationSchema.parse(req.query)

  const where: any = {}
  const status = typeof req.query.status === 'string' ? req.query.status : undefined
  if (status === 'pending' || status === 'notified') {
    where.status = status
  }

  const [rows, total] = await Promise.all([
    StockNotification.findAll({
      where,
      order: [['id', 'DESC']],
      offset: (page - 1) * perPage,
      limit: perPage,
    }),
    StockNotification.count({ where }),
  ])

  res.json({
    items: rows.map((row: any) => row.get({ plain: true })),
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  })
}))

router.post('/:id/mark-notified', requirePermission('manage_stock'), asyncHandler(async (req, res) => {
  const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(req.params)

  const notification = await StockNotification.findByPk(id)
  if (!notification) {
    return res.status(404).json({ message: 'Notification not found.' })
  }

  const email = notification.getDataValue('email') as string
  const customerName = notification.getDataValue('customerName') as string | undefined
  const productName = notification.getDataValue('productName') as string
  const variantLabel = notification.getDataValue('variantLabel') as string | null

  let emailSent = false
  let emailError: string | null = null
  if (email) {
    try {
      await sendBackInStockEmail(email, customerName, { productName, variantLabel })
      emailSent = true
    } catch (err: any) {
      emailError = err?.message || 'Email send failed'
      console.error('[StockNotify] Mark-notified email failed:', err)
    }
  }

  await notification.update({ status: 'notified', notifiedAt: new Date() })

  res.json({
    message: emailSent
      ? 'Marked as notified. Email sent to customer.'
      : emailError
        ? `Marked as notified, but email failed: ${emailError}`
        : 'Marked as notified.',
    emailSent,
    emailError,
  })
}))

router.post('/:id/send-message', requirePermission('manage_stock'), asyncHandler(async (req, res) => {
  const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(req.params)
  const { message } = messageSchema.parse(req.body)

  const notification = await StockNotification.findByPk(id)
  if (!notification) throw new AppError(404, 'Notification not found.')

  const email = notification.getDataValue('email') as string
  if (!email) {
    throw new AppError(422, 'Customer has no email address to send to.')
  }

  const adminId = (req as any).auth?.sub as number | undefined

  let emailSent = false
  let emailError: string | null = null
  try {
    await sendNotifyMessageEmail(
      email,
      notification.get({ plain: true }) as any,
      message,
    )
    emailSent = true
    await notification.update({ adminMessage: message })
  } catch (err: any) {
    emailError = err?.message || 'Email send failed'
    console.error('[Email] Failed to send notification message:', err)
  }

  await writeAuditLog({
    adminId,
    action: 'SEND_NOTIFY_MESSAGE',
    entity: 'stock_notification',
    entityId: id,
    details: { messageLength: message.length },
  })

  res.json({
    message: emailSent
      ? 'Message sent to customer.'
      : emailError
        ? `Message failed to send: ${emailError}`
        : 'Message could not be sent.',
    emailSent,
    emailError,
  })
}))

export default router
