import { Router } from 'express'
import { z } from 'zod'
import { Op } from 'sequelize'
import { EmailCampaign, Customer, Product } from '../../models/index.js'
import { requireAdminAuth } from '../../middleware/auth.js'
import { requirePermission } from '../../middleware/permissions.js'
import { AppError, asyncHandler } from '../../utils/http.js'
import { sendCampaignEmail, sendGeneralEmail } from '../../services/email.service.js'
import { writeAuditLog } from '../../services/audit.service.js'

const router = Router()

// In-memory send lock — prevents concurrent sends of the same campaign
const sendingLocks = new Set<number>()

router.use(requireAdminAuth)

// ── List customers for campaign picker ────────────────────────────
router.get('/customers', requirePermission('manage_email_campaigns'), asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const perPage = Math.min(100, Math.max(1, Number(req.query.perPage) || 50))
  const offset = (page - 1) * perPage
  const search = (req.query.search as string || '').trim()

  const where: any = { status: 'active', emailVerified: true }
  if (search) {
    const { Op } = await import('sequelize')
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
    ]
  }

  const [rows, total] = await Promise.all([
    Customer.findAll({
      where,
      attributes: ['id', 'name', 'email'],
      order: [['name', 'ASC']],
      limit: perPage,
      offset,
      paranoid: true,
    }),
    Customer.count({ where, paranoid: true }),
  ])

  res.json({
    customers: rows.map((c: any) => c.get({ plain: true })),
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  })
}))

const sendCampaignSchema = z.object({
  type: z.enum(['price_drop', 'new_arrival']),
  subject: z.string().min(3, 'Subject must be at least 3 characters.').max(255),
  content: z.union([z.string(), z.null()]).optional(),
  productIds: z.array(z.number().int().positive()).min(1, 'Select at least one product.'),
})

const sendGeneralSchema = z.object({
  subject: z.string().min(3, 'Subject must be at least 3 characters.').max(255),
  content: z.union([z.string(), z.null()]).optional(),
  imageUrl: z.union([z.string(), z.null()]).optional(),
  recipientType: z.enum(['all', 'selected']).default('all'),
  customerIds: z.array(z.number().int().positive()).optional(),
})

router.post('/send-general', requirePermission('manage_email_campaigns'), asyncHandler(async (req, res) => {
  const body = sendGeneralSchema.parse(req.body)
  const adminId = (req as any).auth?.sub as number | undefined

  // Find eligible customers
  const where: any = { status: 'active', emailVerified: true }
  if (body.recipientType === 'selected' && body.customerIds && body.customerIds.length > 0) {
    where.id = { [Op.in]: body.customerIds }
  }

  const customers = await Customer.findAll({
    where,
    attributes: ['id', 'email', 'name'],
    paranoid: true,
  })

  if (customers.length === 0) {
    throw new AppError(400, 'No eligible customers found (active + email verified).')
  }

  // Create campaign record
  const campaign = await EmailCampaign.create({
    type: 'general',
    subject: body.subject,
    content: body.content || null,
    imageUrl: body.imageUrl || null,
    productIds: null,
    status: 'sent',
    recipientCount: customers.length,
    sentAt: new Date(),
    createdBy: adminId,
  })

  const campaignId = campaign.getDataValue('id') as number

  if (sendingLocks.has(campaignId)) {
    throw new AppError(409, 'This campaign is already being sent.')
  }
  sendingLocks.add(campaignId)

  console.log(`[EmailCampaign] #${campaignId} created: "${body.subject}" (${customers.length} recipients)`)

  // Fire background sending (with top-level catch so no silent crashes)
  setImmediate(async () => {
    try {
      const BATCH_SIZE = 10
      let sent = 0
      let failed = 0

      for (let i = 0; i < customers.length; i += BATCH_SIZE) {
        const batch = customers.slice(i, i + BATCH_SIZE)

        for (const customer of batch) {
          const email = customer.getDataValue('email') as string
          const customerName = String(customer.getDataValue('name') || '')

          try {
            await sendGeneralEmail(email, customerName, {
              subject: body.subject,
              content: body.content || null,
              imageUrl: body.imageUrl || null,
            })
            sent++
          } catch (err: any) {
            failed++
            console.error(`[EmailCampaign] Failed to send to ${email}:`, err?.message || 'Unknown error')
          }
        }

        // Update progress every batch
        await EmailCampaign.update(
          { recipientCount: sent + failed },
          { where: { id: campaignId } },
        )

        if (i + BATCH_SIZE < customers.length) {
          await new Promise(r => setTimeout(r, 500))
        }
      }

      await EmailCampaign.update(
        { recipientCount: sent },
        { where: { id: campaignId } },
      )

      console.log(`[EmailCampaign] #${campaignId} done. Sent: ${sent}, Failed: ${failed}${body.imageUrl ? `, Image: ${body.imageUrl}` : ''}`)
    } catch (err: any) {
      console.error(`[EmailCampaign] #${campaignId} background job crashed:`, err?.message || 'Unknown error')
    } finally {
      sendingLocks.delete(campaignId)
    }
  })

  await writeAuditLog({
    adminId,
    action: 'SEND_EMAIL_CAMPAIGN',
    entity: 'email_campaign',
    entityId: String(campaignId),
    details: { type: 'general', subject: body.subject, recipientCount: customers.length, hasImage: !!body.imageUrl, recipientType: body.recipientType },
  })

  res.status(201).json({
    campaign: campaign.get({ plain: true }),
    recipientCount: customers.length,
    message: `Campaign "${body.subject}" sent to ${customers.length} customers.`,
  })
}))

router.post('/send', requirePermission('manage_email_campaigns'), asyncHandler(async (req, res) => {
  const body = sendCampaignSchema.parse(req.body)
  const adminId = (req as any).auth?.sub as number | undefined

  // Validate products exist
  const products = await Product.findAll({
    where: { id: { [Op.in]: body.productIds }, status: 'active' },
    attributes: ['id', 'name', 'price', 'originalPrice', 'imageUrl', 'slug'],
  })

  if (products.length === 0) {
    throw new AppError(400, 'No active products found with the given IDs.')
  }

  const productList = products.map(p => {
    const plain = p.get({ plain: true }) as any
    const originalPrice = plain.originalPrice ? Number(plain.originalPrice) : null
    const price = Number(plain.price)
    let discountPercent = 0
    if (originalPrice && originalPrice > 0 && price < originalPrice) {
      discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100)
    }
    return {
      name: plain.name,
      price,
      originalPrice,
      discountPercent,
      imageUrl: plain.imageUrl,
      slug: plain.slug,
    }
  })

  // Find eligible customers
  const customers = await Customer.findAll({
    where: { status: 'active', emailVerified: true },
    attributes: ['id', 'email', 'name'],
    paranoid: true,
  })

  if (customers.length === 0) {
    throw new AppError(400, 'No eligible customers found (active + email verified).')
  }

  // Create campaign record
  const campaign = await EmailCampaign.create({
    type: body.type,
    subject: body.subject,
    content: body.content || null,
    productIds: body.productIds,
    status: 'sent',
    recipientCount: customers.length,
    sentAt: new Date(),
    createdBy: adminId,
  })

  const campaignId = campaign.getDataValue('id') as number

  if (sendingLocks.has(campaignId)) {
    throw new AppError(409, 'This campaign is already being sent.')
  }
  sendingLocks.add(campaignId)

  console.log(`[EmailCampaign] #${campaignId} created: "${body.subject}" (${customers.length} recipients)`)

  // Fire background sending
  setImmediate(async () => {
    try {
      const BATCH_SIZE = 10
      let sent = 0
      let failed = 0

      for (let i = 0; i < customers.length; i += BATCH_SIZE) {
        const batch = customers.slice(i, i + BATCH_SIZE)

        for (const customer of batch) {
          const email = customer.getDataValue('email') as string
          const customerName = String(customer.getDataValue('name') || '')

          try {
            await sendCampaignEmail(email, customerName, {
              type: body.type,
              subject: body.subject,
              content: body.content || null,
              products: productList,
            })
            sent++
          } catch (err: any) {
            failed++
            console.error(`[EmailCampaign] Failed to send to ${email}:`, err?.message || 'Unknown error')
          }
        }

        // Update progress every batch
        await EmailCampaign.update(
          { recipientCount: sent + failed },
          { where: { id: campaignId } },
        )

        if (i + BATCH_SIZE < customers.length) {
          await new Promise(r => setTimeout(r, 500))
        }
      }

      // Update campaign stats
      await EmailCampaign.update(
        { recipientCount: sent },
        { where: { id: campaignId } },
      )

      console.log(`[EmailCampaign] #${campaignId} done. Sent: ${sent}, Failed: ${failed}`)
    } catch (err: any) {
      console.error(`[EmailCampaign] #${campaignId} background job crashed:`, err?.message || 'Unknown error')
    } finally {
      sendingLocks.delete(campaignId)
    }
  })

  await writeAuditLog({
    adminId,
    action: 'SEND_EMAIL_CAMPAIGN',
    entity: 'email_campaign',
    entityId: String(campaignId),
    details: { type: body.type, subject: body.subject, recipientCount: customers.length, productCount: products.length },
  })

  res.status(201).json({
    campaign: campaign.get({ plain: true }),
    recipientCount: customers.length,
    message: `Campaign "${body.subject}" sent to ${customers.length} customers.`,
  })
}))

router.get('/', requirePermission('manage_email_campaigns'), asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const perPage = Math.min(100, Math.max(1, Number(req.query.perPage) || 10))
  const offset = (page - 1) * perPage

  const [rows, total] = await Promise.all([
    EmailCampaign.findAll({
      order: [['createdAt', 'DESC']],
      limit: perPage,
      offset,
    }),
    EmailCampaign.count(),
  ])

  res.json({
    campaigns: rows.map((c: any) => c.get({ plain: true })),
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  })
}))


export default router
