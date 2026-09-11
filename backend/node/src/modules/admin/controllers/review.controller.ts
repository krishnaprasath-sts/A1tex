import { Request, Response } from 'express'
import { z } from 'zod'
import { Op } from 'sequelize'
import {
  Review,
  ReviewImage,
  Product,
  Customer,
} from '../../../models/index.js'
import { writeAuditLog } from '../../../services/audit.service.js'
import { AppError } from '../../../utils/http.js'
import {
  filePathFromUrl,
  cleanupFile,
} from '../../../services/image.service.js'
import { UPLOADS_DIR } from './upload.controller.js'
import { adminId, paginationSchema, idParam } from './utils.js'

export const reviewSearchSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
})

export const moderateSchema = z.object({
  action: z.enum(['approve', 'reject']),
})

export const getReviews = async (req: Request, res: Response) => {
  const { page, perPage } = paginationSchema.parse(req.query)
  const { search, status } = reviewSearchSchema.parse(req.query)

  const where: any = {}
  if (status) where.status = status

  let productWhere: any = {}
  if (search) {
    productWhere = {
      [Op.or]: [
        { name: { [Op.like]: `%${search}%` } },
        { code: { [Op.like]: `%${search}%` } },
      ],
    }
  }

  const [rows, total] = await Promise.all([
    Review.findAll({
      where,
      include: [
        { model: Product, attributes: ['id', 'name', 'code', 'imageUrl'], where: Object.keys(productWhere).length ? productWhere : undefined, required: !!search },
        { model: Customer, attributes: ['id', 'name', 'email'] },
        { model: ReviewImage, as: 'images', attributes: ['id', 'imageUrl'] },
      ],
      order: [['createdAt', 'DESC']],
      offset: (page - 1) * perPage,
      limit: perPage,
    }),
    Review.count({ where, include: search ? [{ model: Product, where: productWhere, required: true }] : [] }),
  ])

  res.json({
    items: rows.map(r => r.get({ plain: true })),
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  })
}

export const moderateReview = async (req: Request, res: Response) => {
  const { id } = idParam.parse(req.params)
  const { action } = moderateSchema.parse(req.body)

  const review = await Review.findByPk(id)
  if (!review) throw new AppError(404, 'Review not found')

  const newStatus = action === 'approve' ? 'approved' : 'rejected'
  await review.update({ status: newStatus, moderatedBy: adminId(req), moderatedAt: new Date() })

  await writeAuditLog({
    adminId: adminId(req),
    action: action === 'approve' ? 'approve_review' : 'reject_review',
    entity: 'review',
    entityId: id,
    details: { reviewId: Number(id), newStatus },
  })

  res.json({ item: review.get({ plain: true }) })
}

export const deleteReview = async (req: Request, res: Response) => {
  const { id } = idParam.parse(req.params)

  const review = await Review.findByPk(id, {
    include: [{ model: ReviewImage, as: 'images' }],
  })
  if (!review) throw new AppError(404, 'Review not found')

  const images = (review as any).images || []
  for (const img of images) {
    if (img.imageUrl) {
      const fp = filePathFromUrl(img.imageUrl, UPLOADS_DIR)
      if (fp) cleanupFile(fp)
    }
  }

  await ReviewImage.destroy({ where: { reviewId: Number(id) } })
  await review.destroy()

  await writeAuditLog({
    adminId: adminId(req),
    action: 'delete_review',
    entity: 'review',
    entityId: id,
  })

  res.json({ ok: true })
}

export const createReview = async (req: Request, res: Response) => {
  const schema = z.object({
    productId: z.coerce.number().int().positive(),
    customerId: z.coerce.number().int().positive().optional(),
    customerName: z.string().optional(),
    rating: z.coerce.number().int().min(1).max(5),
    subject: z.string().max(255).optional().default(''),
    body: z.string().max(5000).optional().default(''),
    status: z.enum(['pending', 'approved', 'rejected']).optional().default('approved'),
    isVerifiedBuyer: z.boolean().optional().default(true),
    imageUrls: z.array(z.string()).optional().default([]),
  })

  const parsed = schema.parse(req.body)

  const product = await Product.findByPk(parsed.productId)
  if (!product) throw new AppError(404, 'Product not found')

  let targetCustomerId = parsed.customerId
  if (!targetCustomerId) {
    if (parsed.customerName?.trim()) {
      const email = `reviewer_${Date.now()}@a1tex.local`
      const [cust] = await Customer.findOrCreate({
        where: { name: parsed.customerName.trim() },
        defaults: {
          name: parsed.customerName.trim(),
          email,
          passwordHash: 'manual_review',
          status: 'active',
        },
      })
      targetCustomerId = cust.get('id') as number
    } else {
      const firstCustomer = await Customer.findOne()
      if (!firstCustomer) throw new AppError(400, 'No customer found. Please provide customer name.')
      targetCustomerId = firstCustomer.get('id') as number
    }
  }

  const existing = await Review.findOne({ where: { productId: parsed.productId, customerId: targetCustomerId } })
  if (existing) {
    await existing.update({
      rating: parsed.rating,
      subject: parsed.subject || null,
      body: parsed.body || null,
      title: parsed.subject || null,
      comment: parsed.body || null,
      status: parsed.status,
      isVerifiedBuyer: parsed.isVerifiedBuyer,
      moderatedBy: adminId(req),
      moderatedAt: new Date(),
    })
    return res.json({ item: existing.get({ plain: true }) })
  }

  const review = await Review.create({
    productId: parsed.productId,
    customerId: targetCustomerId,
    rating: parsed.rating,
    subject: parsed.subject || null,
    body: parsed.body || null,
    title: parsed.subject || null,
    comment: parsed.body || null,
    isVerifiedBuyer: parsed.isVerifiedBuyer,
    isApproved: parsed.status === 'approved',
    status: parsed.status,
    moderatedBy: adminId(req),
    moderatedAt: new Date(),
  })

  if (parsed.imageUrls && parsed.imageUrls.length > 0) {
    await ReviewImage.bulkCreate(
      parsed.imageUrls.map(url => ({
        reviewId: review.get('id') as number,
        imageUrl: url,
      }))
    )
  }

  const created = await Review.findByPk(review.get('id') as number, {
    include: [
      { model: Product, attributes: ['id', 'name', 'code', 'imageUrl'] },
      { model: Customer, attributes: ['id', 'name', 'email'] },
      { model: ReviewImage, as: 'images', attributes: ['id', 'imageUrl'] },
    ],
  })

  await writeAuditLog({
    adminId: adminId(req),
    action: 'create_review',
    entity: 'review',
    entityId: String(review.get('id')),
    details: { productId: parsed.productId, rating: parsed.rating },
  })

  res.status(201).json({ item: created!.get({ plain: true }) })
}

