import bcrypt from 'bcryptjs'
import cron from 'node-cron'
import { env } from './config/env.js'
import { app } from './app.js'
import { assertDatabaseConnection, sequelize } from './database/sequelize.js'
import { runMigrations } from './database/migrate.js'
import { Admin } from './models/index.js'
import { expireOldCoupons } from './services/coupon-expiry.service.js'
import { syncAllPendingOrders } from './services/razorpay-sync.service.js'

async function start() {
  await assertDatabaseConnection()
  await runMigrations()

  // Super admin initialization
  const superAdminList = [
    { email: env.ADMIN_EMAIL, name: 'A1 TEX Admin', pass: env.ADMIN_PASSWORD },
    { email: 'admin@a1tex.com', name: 'A1 TEX Super Admin', pass: env.ADMIN_PASSWORD || 'A1tex@2026' },
  ]

  for (const adminItem of superAdminList) {
    if (!adminItem.email) continue
    const existing = await Admin.findOne({ where: { email: adminItem.email } })
    if (!existing) {
      const passwordHash = await bcrypt.hash(adminItem.pass || 'Admin@123', 12)
      await Admin.create({
        name: adminItem.name,
        email: adminItem.email,
        passwordHash,
        role: 'super_admin',
        status: 'active',
      })
      console.log(`[AdminInit] Created super admin: ${adminItem.email}`)
    }
  }

  app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`A1 TEX API running on http://0.0.0.0:${env.PORT}/api`)
  })

  // ── Coupon auto-expiry ──────────────────────────────────────────────
  // Run once immediately at startup to fix any stale coupons, then
  // repeat every hour at minute 0 (e.g. 01:00, 02:00, 03:00 …).
  await expireOldCoupons()
  cron.schedule('0 * * * *', expireOldCoupons, { timezone: 'Asia/Kolkata' })
  console.log('[CouponExpiry] 🕐 Hourly expiry job scheduled (Asia/Kolkata).')

  // ── Razorpay order reconciliation ───────────────────────────────────
  // Automatically sync orders stuck in pending_payment/processing with
  // Razorpay every 5 minutes. This catches cases where payment was
  // captured but verifyPayment failed (network timeout, race condition).
  // Initial sync runs 30 seconds after startup to avoid slowing boot.
  setTimeout(async () => {
    try {
      const result = await syncAllPendingOrders(50)
      if (result.promoted > 0) {
        console.log(`[RazorpaySync] Startup sync: promoted ${result.promoted} of ${result.checked} pending orders`)
      }
    } catch (err: any) {
      console.error('[RazorpaySync] Startup sync failed:', err.message)
    }
  }, 30_000)

  cron.schedule('*/5 * * * *', async () => {
    try {
      const result = await syncAllPendingOrders(50)
      if (result.promoted > 0) {
        console.log(`[RazorpaySync] Cron sync: promoted ${result.promoted} of ${result.checked} pending orders`)
      }
    } catch (err: any) {
      console.error('[RazorpaySync] Cron sync failed:', err.message)
    }
  }, { timezone: 'Asia/Kolkata' })
  console.log('[RazorpaySync] ⏱️ Every-5-minute Razorpay reconciliation scheduled.')
}

start().catch(error => {
  console.error('Failed to start API:', error)
  process.exit(1)
})
