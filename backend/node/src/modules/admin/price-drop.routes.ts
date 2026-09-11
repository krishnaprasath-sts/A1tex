import { Router } from 'express'
import { asyncHandler } from '../../utils/http.js'
import { requireAdminAuth } from '../../middleware/auth.js'
import { requirePermission } from '../../middleware/permissions.js'
import {
  getPriceDropEvents,
  getPriceDropEventDetail,
  getPriceDropStats,
} from '../../services/price-drop.service.js'

const router = Router()
router.use(requireAdminAuth)

// GET /api/admin/price-drops/stats
router.get('/stats', requirePermission('view_reports'), asyncHandler(async (_req, res) => {
  const stats = await getPriceDropStats()
  res.json(stats)
}))

// GET /api/admin/price-drops
router.get('/', requirePermission('view_reports'), asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
  const result = await getPriceDropEvents(page, limit)
  res.json(result)
}))

// GET /api/admin/price-drops/:id
router.get('/:id', requirePermission('view_reports'), asyncHandler(async (req, res) => {
  const event = await getPriceDropEventDetail(Number(req.params.id))
  if (!event) {
    res.status(404).json({ error: 'Price drop event not found.' })
    return
  }
  res.json({ event })
}))

export default router
