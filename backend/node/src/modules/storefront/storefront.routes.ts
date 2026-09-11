import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import crypto from 'node:crypto'
import { Op } from 'sequelize'
import { optionalCustomerAuth, requireCustomerAuth } from '../../middleware/auth.js'
import { asyncHandler, AppError } from '../../utils/http.js'

import * as navigationController from './controllers/navigation.controller.js'
import * as catalogController from './controllers/catalog.controller.js'
import * as orderController from './controllers/order.controller.js'
import * as reviewController from './controllers/review.controller.js'
import * as stockNotificationController from './controllers/stock-notification.controller.js'
import { getShippingCharge } from './controllers/shipping-charge.controller.js'

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads')

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg'
    const hash = crypto.randomBytes(12).toString('hex')
    cb(null, `${hash}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new AppError(422, 'Only JPEG, PNG, and WebP images are allowed.'))
    }
  },
})

const router = Router()

/* ── Navigation Routes ─── */
router.get('/nav-menu', asyncHandler(navigationController.getNavMenu))
router.get('/announcement-bar', asyncHandler(navigationController.getAnnouncementBar))
router.get('/marquee-messages', asyncHandler(navigationController.getMarqueeMessages))
router.get('/navigation', asyncHandler(navigationController.getNavigation))

/* ── Catalog / Content Routes ─── */
router.get('/categories', asyncHandler(catalogController.getCategories))
router.get('/categories/by-slug/:slug', asyncHandler(catalogController.getCategoryBySlug))
router.get('/banners', asyncHandler(catalogController.getBanners))
router.get('/products', asyncHandler(catalogController.getProducts))
router.get('/products/:id/related', asyncHandler(catalogController.getRelatedProducts))
router.get('/products/:slug', asyncHandler(catalogController.getProductBySlug))
router.get('/search', asyncHandler(catalogController.search))
router.get('/home', asyncHandler(catalogController.getHome))
router.get('/shipping-config', asyncHandler(catalogController.getShippingConfiguration))
router.get('/guest-discount-popup', asyncHandler(catalogController.getGuestDiscountPopupConfiguration))

/* ── Order / Payment / Shipping Routes ─── */
router.post('/orders', optionalCustomerAuth, asyncHandler(orderController.createOrder))
router.get('/orders', requireCustomerAuth, asyncHandler(orderController.getOrders))
router.get('/orders/auto-discount', optionalCustomerAuth, asyncHandler(orderController.getAutoDiscount))
router.get('/orders/track', asyncHandler(orderController.trackOrder))
router.get('/orders/:id', optionalCustomerAuth, asyncHandler(orderController.getOrderById))
/* ── Pincode Lookup Route (India Post API Proxy) ─── */
const pincodeCache = new Map<string, { data: any; ts: number }>()
const PINCODE_CACHE_TTL = 1000 * 60 * 60 // 1 hour

router.get('/pincode/:pincode', asyncHandler(async (req, res) => {
  const pin = req.params.pincode?.trim()
  if (!pin || !/^\d{6}$/.test(pin)) {
    throw new AppError(400, 'Invalid pincode. Must be 6 digits.')
  }

  // Check cache first
  const cached = pincodeCache.get(pin)
  if (cached && Date.now() - cached.ts < PINCODE_CACHE_TTL) {
    return res.json(cached.data)
  }

  try {
    const resp = await fetch(`https://api.postalpincode.in/pincode/${pin}`)
    const json = await resp.json() as any[]
    if (json?.[0]?.Status === 'Success' && json[0].PostOffice?.length > 0) {
      const po = json[0].PostOffice[0]
      const result = {
        isValid: true,
        city: po.Block !== 'NA' ? po.Block : po.Name,
        district: po.District,
        state: po.State,
        country: po.Country,
      }
      pincodeCache.set(pin, { data: result, ts: Date.now() })
      return res.json(result)
    }
    const notFound = { isValid: false, city: '', district: '', state: '', country: '' }
    pincodeCache.set(pin, { data: notFound, ts: Date.now() })
    res.json(notFound)
  } catch (err: any) {
    console.error('[Pincode] India Post API failed:', err?.message)
    res.json({ isValid: false, city: '', district: '', state: '', country: '' })
  }
}))

router.get('/shipping-charge', asyncHandler(getShippingCharge))
router.post('/orders/calculate-shipping', asyncHandler(orderController.calculateShipping))
router.post('/orders/validate-coupon', optionalCustomerAuth, asyncHandler(orderController.validateCoupon))
router.post('/orders/create-razorpay-order', optionalCustomerAuth, asyncHandler(orderController.createRazorpayOrder))
router.post('/orders/verify-payment', optionalCustomerAuth, asyncHandler(orderController.verifyPayment))
router.post('/orders/:id/confirm-cod', optionalCustomerAuth, asyncHandler(orderController.confirmCodOrder))

/* ── Review Routes ─── */
router.get('/products/:slug/reviews', asyncHandler(reviewController.getProductReviews))
router.get('/products/:productId/can-review', requireCustomerAuth, asyncHandler(reviewController.canReviewProduct))
router.post('/products/:productId/reviews', requireCustomerAuth, upload.array('images', 5), asyncHandler(reviewController.createProductReview))

/* ── Stock Notification Routes ─── */
router.post('/stock-notify', asyncHandler(stockNotificationController.create))

/* ── Unsubscribe Routes ─── */
router.post('/unsubscribe', asyncHandler(async (req, res) => {
  const { email } = req.body
  if (!email || typeof email !== 'string') {
    throw new AppError(400, 'Email is required.')
  }
  const { Customer } = await import('../../models/index.js')
  const customer = await Customer.findOne({ where: { email } })
  if (customer) {
    await customer.update({ status: 'inactive' })
  }
  res.json({ message: 'You have been unsubscribed from marketing emails.' })
}))

/* ── Contact Enquiry Routes ─── */
router.post('/contact-enquiries', asyncHandler(async (req, res) => {
  const { name, email, phonenumber, message } = req.body
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new AppError(400, 'Name is required.')
  }
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError(400, 'A valid email is required.')
  }
  if (!phonenumber || typeof phonenumber !== 'string' || phonenumber.trim().length < 10) {
    throw new AppError(400, 'A valid phone number is required.')
  }
  if (!message || typeof message !== 'string' || message.trim().length < 5) {
    throw new AppError(400, 'Message must be at least 5 characters long.')
  }

  const { ContactEnquiry } = await import('../../models/index.js')
  await ContactEnquiry.create({
    name: name.trim(),
    email: email.trim(),
    phonenumber: phonenumber.trim(),
    message: message.trim(),
  })

  res.json({ success: true, message: 'Your enquiry has been submitted successfully.' })
}))

/* ── Available Coupons ─── */
router.get('/available-coupons', optionalCustomerAuth, asyncHandler(async (req, res) => {
  // Coupons are a registered-customer perk — guests get an empty list rather
  // than seeing codes/values they aren't eligible to use.
  if (!(req as any).auth) {
    return res.json({ coupons: [] })
  }

  const { Coupon, CouponCustomer } = await import('../../models/index.js')
  const now = new Date()
  const coupons = await Coupon.findAll({
    where: {
      active: true,
      [Op.and]: [
        {
          [Op.or]: [
            { startsAt: null },
            { startsAt: { [Op.lte]: now } },
          ],
        },
        {
          [Op.or]: [
            { expiresAt: null },
            { expiresAt: { [Op.gte]: now } },
          ],
        },
      ],
    },
    attributes: ['id', 'code', 'type', 'value', 'minCartValue', 'maxDiscount', 'description', 'expiresAt'],
    order: [['id', 'DESC']],
  })

  // Drop coupons restricted to specific customers unless the current customer is one of them.
  const restrictions = await CouponCustomer.findAll({ attributes: ['couponId', 'customerId'] })
  const restrictedCouponIds = new Set(restrictions.map((r: any) => r.get('couponId')))
  const customerId = (req as any).auth.sub
  const eligibleRestrictedCouponIds = new Set(
    restrictions.filter((r: any) => r.get('customerId') === customerId).map((r: any) => r.get('couponId')),
  )
  const visibleCoupons = coupons.filter((c: any) => {
    const id = c.get('id')
    return !restrictedCouponIds.has(id) || eligibleRestrictedCouponIds.has(id)
  })

  res.json({ coupons: visibleCoupons })
}))

export default router
