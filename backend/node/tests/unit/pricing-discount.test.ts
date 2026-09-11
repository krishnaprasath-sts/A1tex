import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

function calculateCouponDiscount(
  subtotal: number,
  coupon: {
    type: 'percentage' | 'fixed'
    value: number
    minCartValue?: number | null
    maxDiscount?: number | null
  }
): { discount: number; eligible: boolean; reason?: string } {
  if (coupon.minCartValue && subtotal < coupon.minCartValue) {
    return {
      discount: 0,
      eligible: false,
      reason: `Minimum cart value of ₹${coupon.minCartValue} required`,
    }
  }

  let discount = 0
  if (coupon.type === 'percentage') {
    discount = (subtotal * coupon.value) / 100
    if (coupon.maxDiscount != null && coupon.maxDiscount > 0) {
      discount = Math.min(discount, coupon.maxDiscount)
    }
  } else {
    discount = Math.min(coupon.value, subtotal)
  }

  return { discount: Math.round(discount * 100) / 100, eligible: true }
}

function calculateGstComponent(inclusivePrice: number, gstRatePercent = 5): {
  taxableAmount: number
  gstAmount: number
} {
  const taxableAmount = inclusivePrice / (1 + gstRatePercent / 100)
  const gstAmount = inclusivePrice - taxableAmount
  return {
    taxableAmount: Math.round(taxableAmount * 100) / 100,
    gstAmount: Math.round(gstAmount * 100) / 100,
  }
}

function calculateShippingFee(subtotal: number, freeShippingThreshold = 1499, baseShippingFee = 100): number {
  if (subtotal >= freeShippingThreshold) {
    return 0
  }
  return baseShippingFee
}

describe('Pricing, Discount & Tax Calculations', () => {
  describe('Coupon Discount Calculations', () => {
    it('applies percentage discount without cap', () => {
      const res = calculateCouponDiscount(2000, {
        type: 'percentage',
        value: 10,
      })
      assert.equal(res.eligible, true)
      assert.equal(res.discount, 200)
    })

    it('enforces maxDiscount cap on percentage discounts', () => {
      const res = calculateCouponDiscount(5000, {
        type: 'percentage',
        value: 20,
        maxDiscount: 400, // 20% of 5000 is 1000, but capped at 400
      })
      assert.equal(res.eligible, true)
      assert.equal(res.discount, 400)
    })

    it('applies fixed discount up to subtotal', () => {
      const res = calculateCouponDiscount(1500, {
        type: 'fixed',
        value: 300,
      })
      assert.equal(res.eligible, true)
      assert.equal(res.discount, 300)
    })

    it('caps fixed discount so it does not exceed subtotal', () => {
      const res = calculateCouponDiscount(250, {
        type: 'fixed',
        value: 500,
      })
      assert.equal(res.eligible, true)
      assert.equal(res.discount, 250)
    })

    it('rejects coupon if minCartValue threshold is not met', () => {
      const res = calculateCouponDiscount(800, {
        type: 'percentage',
        value: 15,
        minCartValue: 1000,
      })
      assert.equal(res.eligible, false)
      assert.equal(res.discount, 0)
      assert.match(res.reason || '', /Minimum cart value/)
    })
  })

  describe('GST Tax Component Calculations', () => {
    it('extracts correct 5% GST tax from inclusive price', () => {
      // 1050 with 5% GST: base = 1000, gst = 50
      const { taxableAmount, gstAmount } = calculateGstComponent(1050, 5)
      assert.equal(taxableAmount, 1000)
      assert.equal(gstAmount, 50)
    })

    it('extracts correct 12% GST tax from inclusive price', () => {
      // 1120 with 12% GST: base = 1000, gst = 120
      const { taxableAmount, gstAmount } = calculateGstComponent(1120, 12)
      assert.equal(taxableAmount, 1000)
      assert.equal(gstAmount, 120)
    })
  })

  describe('Shipping Fee Calculations', () => {
    it('returns free shipping when subtotal reaches threshold', () => {
      assert.equal(calculateShippingFee(1500, 1499, 100), 0)
      assert.equal(calculateShippingFee(2500, 1499, 100), 0)
    })

    it('returns shipping fee when subtotal is below threshold', () => {
      assert.equal(calculateShippingFee(1200, 1499, 100), 100)
      assert.equal(calculateShippingFee(499, 1499, 100), 100)
    })
  })
})
