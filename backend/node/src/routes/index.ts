import { Router } from 'express'
import storefrontRoutes from '../modules/storefront/storefront.routes.js'
import authRoutes from '../modules/auth/auth.routes.js'
import addressRoutes from '../modules/address/address.routes.js'
import adminAuthRoutes from '../modules/admin-auth/admin-auth.routes.js'
import adminRoutes from '../modules/admin/admin.routes.js'
import emailCampaignRoutes from '../modules/admin/email-campaign.routes.js'
import webhookRoutes from '../modules/webhook/webhook.routes.js'
import cartRoutes from '../modules/cart/cart.routes.js'
import wishlistRoutes from '../modules/wishlist/wishlist.routes.js'

import { asyncHandler } from '../utils/http.js'
import { getShippingCharge } from '../modules/storefront/controllers/shipping-charge.controller.js'

const router = Router()

router.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'a1-tex-api' })
})

router.get('/checkout/shipping-charge', asyncHandler(getShippingCharge))

router.use('/storefront', storefrontRoutes)
router.use('/storefront/cart', cartRoutes)
router.use('/storefront/wishlist', wishlistRoutes)
router.use('/auth', authRoutes)
router.use('/auth/addresses', addressRoutes)
router.use('/admin/auth', adminAuthRoutes)
router.use('/admin/email-campaigns', emailCampaignRoutes)
router.use('/admin', adminRoutes)
router.use('/webhook', webhookRoutes)

export default router
