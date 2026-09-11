import { Request, Response } from 'express'
import { z } from 'zod'
import { Op } from 'sequelize'
import {
  Product,
  Review,
  Customer,
  ReviewImage,
  Order,
  OrderItem,
} from '../../../models/index.js'
import { sequelize } from '../../../database/sequelize.js'
import { AppError } from '../../../utils/http.js'
import { plain } from './helpers.js'

const createReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  subject: z.string().max(255).optional().default(''),
  body: z.string().max(5000).optional().default(''),
})

export const getProductReviews = async (req: Request, res: Response) => {
  const product = await Product.findOne({ where: { slug: req.params.slug } })
  if (!product) throw new AppError(404, 'Product not found')

  const page = Math.max(1, parseInt(String(req.query.page)) || 1)
  const perPage = Math.min(20, Math.max(1, parseInt(String(req.query.perPage)) || 10))

  const productId = product.get('id') as number
  const { rows, count } = await Review.findAndCountAll({
    where: { productId, status: 'approved' },
    include: [
      { model: Customer, attributes: ['id', 'name'] },
      { model: ReviewImage, as: 'images', attributes: ['id', 'imageUrl'] },
    ],
    order: [['createdAt', 'DESC']],
    offset: (page - 1) * perPage,
    limit: perPage,
  })

  const reviews = rows.map(r => {
    const plainReview = r.get({ plain: true }) as any
    const customerName = plainReview.Customer?.name || 'Anonymous'
    const nameParts = customerName.split(' ')
    const displayName = nameParts[0] + (nameParts.length > 1 ? ' ' + nameParts[1][0] + '.' : '')
    return {
      id: plainReview.id,
      rating: plainReview.rating,
      subject: plainReview.subject || plainReview.title || '',
      body: plainReview.body || plainReview.comment || '',
      customerName: displayName,
      createdAt: plainReview.createdAt,
      images: plainReview.images || [],
      isVerifiedBuyer: Boolean(plainReview.isVerifiedBuyer ?? plainReview.is_verified_buyer ?? false),
    }
  })

  const summary = await Review.findAll({
    where: { productId, status: 'approved' },
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
      [sequelize.fn('ROUND', sequelize.fn('AVG', sequelize.col('rating')), 1), 'average'],
    ],
    raw: true,
  }) as any[]

  let totalReviews = 0
  let averageRating = 0
  if (summary[0]) {
    totalReviews = Number(summary[0].total) || 0
    averageRating = Number(summary[0].average) || 0
  }

  const distribution = await Review.findAll({
    where: { productId, status: 'approved' },
    attributes: ['rating', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
    group: ['rating'],
    raw: true,
  }) as any[]

  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const d of distribution) {
    dist[Number(d.rating)] = Number(d.count)
  }

  res.json({
    reviews,
    summary: { total: totalReviews, average: averageRating, distribution: dist },
    page,
    perPage,
    totalPages: Math.ceil(totalReviews / perPage),
  })
}

export const canReviewProduct = async (req: Request, res: Response) => {
  const productId = Number(req.params.productId)
  const auth = (req as any).auth

  const product = await Product.findByPk(productId)
  if (!product) throw new AppError(404, 'Product not found')

  const existingReview = await Review.findOne({ where: { productId, customerId: auth.sub } })

  const purchasedOrder = await Order.findOne({
    where: { customerId: auth.sub, status: { [Op.in]: ['delivered', 'completed', 'dispatched', 'confirmed', 'processing'] } },
    include: [{ model: OrderItem, as: 'items', where: { productId }, required: true }],
  })

  res.json({
    canReview: !existingReview,
    hasReviewed: !!existingReview,
    hasDeliveredOrder: !!purchasedOrder,
    isVerifiedBuyer: !!purchasedOrder,
    existingReviewId: existingReview?.get('id') || null,
  })
}

export const createProductReview = async (req: Request, res: Response) => {
  const productId = Number(req.params.productId)
  const auth = (req as any).auth
  const parsed = createReviewSchema.parse(req.body)

  const product = await Product.findByPk(productId)
  if (!product) throw new AppError(404, 'Product not found')

  const existing = await Review.findOne({ where: { productId, customerId: auth.sub } })
  if (existing) throw new AppError(409, 'You have already reviewed this product')

  const purchasedOrder = await Order.findOne({
    where: { customerId: auth.sub, status: { [Op.in]: ['delivered', 'completed', 'dispatched', 'confirmed', 'processing'] } },
    include: [{ model: OrderItem, as: 'items', where: { productId }, required: true }],
  })

  const isVerifiedBuyer = !!purchasedOrder

  const review = await Review.create({
    productId,
    customerId: auth.sub,
    rating: parsed.rating,
    subject: parsed.subject || null,
    body: parsed.body || null,
    title: parsed.subject || null,
    comment: parsed.body || null,
    isVerifiedBuyer,
    isApproved: true,
    status: 'approved',
  })

  const files = (req as any).files as Express.Multer.File[] | undefined
  if (files && files.length > 0) {
    await ReviewImage.bulkCreate(
      files.map(f => ({
        reviewId: review.get('id') as number,
        imageUrl: `/uploads/${f.filename}`,
      }))
    )
  }

  const created = await Review.findByPk(review.get('id') as number, {
    include: [
      { model: Customer, attributes: ['id', 'name'] },
      { model: ReviewImage, as: 'images', attributes: ['id', 'imageUrl'] },
    ],
  })

  res.status(201).json({ review: created!.get({ plain: true }) })
}
