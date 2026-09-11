import { Op } from 'sequelize'
import { Coupon } from '../models/index.js'

/**
 * Finds all coupons whose expiresAt date has already passed
 * and sets active = false on them automatically.
 *
 * Called once at server startup and then every hour via cron.
 */
export async function expireOldCoupons(): Promise<void> {
  try {
    const now = new Date()

    const [updatedCount] = await Coupon.update(
      { active: false },
      {
        where: {
          active: true,
          expiresAt: { [Op.lt]: now },
        },
      },
    )

    if (updatedCount > 0) {
      console.log(
        `[CouponExpiry] ✅ Auto-deactivated ${updatedCount} expired coupon${updatedCount > 1 ? 's' : ''} at ${now.toISOString()}`,
      )
    } else {
      console.log(`[CouponExpiry] ✔  No expired coupons to deactivate at ${now.toISOString()}`)
    }
  } catch (error) {
    console.error('[CouponExpiry] ❌ Failed to auto-deactivate expired coupons:', error)
  }
}
