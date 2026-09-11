import { Op } from 'sequelize'
import { Order } from '../models/index.js'
import { getGuestDiscountPopupConfig } from './settings.service.js'

// Returns the welcome discount percentage for a customer's first-ever order,
// or null if they don't qualify (not logged in, already has an order, or the
// admin hasn't enabled the guest discount popup). No separate coupon record
// is involved — the percentage set in the popup settings is the single
// source of truth, so there's nothing else for an admin to keep in sync.
export async function resolveAutoWelcomeDiscountPercentage(customerId: number | null | undefined): Promise<number | null> {
  if (!customerId) return null

  const config = await getGuestDiscountPopupConfig()
  if (!config.enabled || config.discountPercentage <= 0) return null

  // 'pending_payment' is the abandoned-checkout checkpoint — an order row created
  // the moment checkout is submitted, before payment/COD is actually confirmed.
  // It must not count as a "first order"; only a genuinely confirmed one should.
  //
  // On its own though that rule lets the discount be claimed repeatedly: the
  // discount is stamped at creation time while confirmation happens later, so a
  // customer opening several checkouts back to back would have every one of
  // them see "no prior orders". So also reject when an earlier order already
  // carried the welcome discount, whatever its status — those are the ones with
  // a discount but no coupon attached, since a coupon order always stores its
  // couponId. Cancelled orders are excluded so a checkout that never went
  // through releases the claim instead of burning it forever.
  const [priorOrderCount, alreadyClaimed] = await Promise.all([
    Order.count({
      where: { customerId, status: { [Op.ne]: 'pending_payment' } },
    }),
    Order.count({
      where: {
        customerId,
        couponId: null,
        discount: { [Op.gt]: 0 },
        status: { [Op.ne]: 'cancelled' },
      },
    }),
  ])
  if (priorOrderCount > 0 || alreadyClaimed > 0) return null

  return config.discountPercentage
}
