import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  bannerCreateSchema,
  categoryCreateSchema,
  contactEnquirySchema,
  resourceConfig,
} from '../../src/modules/admin/controllers/resource.controller.js'
import {
  productCreateSchema,
  variantCreateSchema,
} from '../../src/modules/admin/controllers/product.controller.js'

describe('Validation Schemas (Zod)', () => {
  describe('categoryCreateSchema', () => {
    it('validates a correct category payload with defaults', () => {
      const parsed = categoryCreateSchema.parse({
        section: 'collections',
        name: 'Bridal Sarees',
        href: '/collections/bridal-sarees',
        imageUrl: '/uploads/categories/bridal.jpg',
      })
      assert.equal(parsed.name, 'Bridal Sarees')
      assert.equal(parsed.section, 'collections')
      assert.equal(parsed.href, '/collections/bridal-sarees')
      assert.equal(parsed.imageUrl, '/uploads/categories/bridal.jpg')
      assert.equal(parsed.navVisible, true)
      assert.equal(parsed.homeVisible, true)
      assert.equal(parsed.sortOrder, 0)
    })

    it('rejects missing or empty category image', () => {
      assert.throws(() => {
        categoryCreateSchema.parse({
          name: 'Bridal Sarees',
          href: '/collections/bridal-sarees',
        })
      })

      assert.throws(() => {
        categoryCreateSchema.parse({
          name: 'Bridal Sarees',
          href: '/collections/bridal-sarees',
          imageUrl: '',
        })
      })
    })

    it('rejects excessively long sections', () => {
      assert.throws(() => {
        categoryCreateSchema.parse({
          section: 'x'.repeat(85),
          name: 'Bridal Sarees',
          href: '/collections/bridal-sarees',
        })
      })
    })

    it('rejects names shorter than 2 characters or longer than 140 characters', () => {
      assert.throws(() => {
        categoryCreateSchema.parse({
          section: 'collections',
          name: 'a',
          href: '/collections/a',
        })
      })

      assert.throws(() => {
        categoryCreateSchema.parse({
          section: 'collections',
          name: 'A'.repeat(145),
          href: '/collections/long',
        })
      })
    })
  })

  describe('bannerCreateSchema', () => {
    it('validates a correct banner payload with defaults', () => {
      const parsed = bannerCreateSchema.parse({
        placement: 'home_hero',
        title: 'Festive Silk Collection',
        subtitle: 'Handcrafted traditional sarees',
        imageUrl: '/uploads/banners/festive.jpg',
        ctaLabel: 'Shop Festive',
        ctaUrl: '/shop',
      })
      assert.equal(parsed.placement, 'home_hero')
      assert.equal(parsed.title, 'Festive Silk Collection')
      assert.equal(parsed.imageUrl, '/uploads/banners/festive.jpg')
      assert.equal(parsed.sortOrder, 0)
      assert.equal(parsed.active, true)
    })

    it('rejects missing or empty banner image', () => {
      assert.throws(() => {
        bannerCreateSchema.parse({
          placement: 'home_hero',
          title: 'Festive Silk Collection',
        })
      })
      assert.throws(() => {
        bannerCreateSchema.parse({
          placement: 'home_hero',
          imageUrl: '',
        })
      })
    })

    it('rejects missing placement', () => {
      assert.throws(() => {
        bannerCreateSchema.parse({
          imageUrl: '/uploads/banners/festive.jpg',
        })
      })
    })
  })

  describe('contactEnquirySchema', () => {
    it('validates a valid contact enquiry', () => {
      const valid = contactEnquirySchema.parse({
        name: 'Priya Sharma',
        email: 'priya@example.com',
        phonenumber: '9876543210',
        message: 'Looking for bridal sarees collection.',
      })
      assert.equal(valid.name, 'Priya Sharma')
      assert.equal(valid.email, 'priya@example.com')
      assert.equal(valid.phonenumber, '9876543210')
    })

    it('rejects invalid email formats', () => {
      assert.throws(() => {
        contactEnquirySchema.parse({
          name: 'Priya',
          email: 'not-an-email',
          phonenumber: '9876543210',
          message: 'Hello there',
        })
      })
    })

    it('rejects phone numbers with fewer than 10 digits', () => {
      assert.throws(() => {
        contactEnquirySchema.parse({
          name: 'Priya',
          email: 'priya@example.com',
          phonenumber: '12345',
          message: 'Hello there',
        })
      })
    })

    it('rejects messages that are too short (<5 chars)', () => {
      assert.throws(() => {
        contactEnquirySchema.parse({
          name: 'Priya',
          email: 'priya@example.com',
          phonenumber: '9876543210',
          message: 'Hi',
        })
      })
    })
  })

  describe('productCreateSchema', () => {
    it('validates a valid product payload with variant fields and defaults', () => {
      const parsed = productCreateSchema.parse({
        name: 'Kanchipuram Silk',
        price: 2499,
        originalPrice: 3499,
        stockQty: 20,
        status: 'active',
      })
      assert.equal(parsed.name, 'Kanchipuram Silk')
      assert.equal(parsed.price, 2499)
      assert.equal(parsed.originalPrice, 3499)
      assert.equal(parsed.stockQty, 20)
      assert.equal(parsed.variantType, 'color')
      assert.equal(parsed.variantLabel, 'Default')
      assert.equal(parsed.lowStockThreshold, 10)
      assert.equal(parsed.gstRate, 5)
    })

    it('rejects negative price values', () => {
      assert.throws(() => {
        productCreateSchema.parse({
          name: 'Kanchipuram Silk',
          price: -100,
        })
      })
    })

    it('rejects negative stock quantities', () => {
      assert.throws(() => {
        productCreateSchema.parse({
          name: 'Kanchipuram Silk',
          price: 1999,
          stockQty: -5,
        })
      })
    })

    it('accepts optional physical dimension fields', () => {
      const parsed = productCreateSchema.parse({
        name: 'Soft Silk Saree',
        price: 1500,
        weightKg: 0.75,
        lengthCm: 550,
        breadthCm: 110,
      })
      assert.equal(parsed.weightKg, 0.75)
      assert.equal(parsed.lengthCm, 550)
      assert.equal(parsed.breadthCm, 110)
    })
  })

  describe('variantCreateSchema', () => {
    it('validates variant payload with valid hex color', () => {
      const parsed = variantCreateSchema.parse({
        variantType: 'color',
        label: 'Ruby Red',
        colorName: 'Ruby Red',
        colorHex: '#990000',
      })
      assert.equal(parsed.label, 'Ruby Red')
      assert.equal(parsed.colorHex, '#990000')
    })

    it('rejects invalid colorHex formats', () => {
      assert.throws(() => {
        variantCreateSchema.parse({
          colorName: 'Invalid Color',
          colorHex: 'not-a-hex',
        })
      })
    })
  })

  describe('couponSchema', () => {
    const couponSchema = resourceConfig.coupons.validationSchema!

    it('validates a percentage coupon and transforms code to uppercase', () => {
      const parsed = couponSchema.parse({
        code: 'festive20',
        type: 'percentage',
        value: 20,
        minCartValue: 1000,
        maxDiscount: 500,
      })
      assert.equal(parsed.code, 'FESTIVE20')
      assert.equal(parsed.type, 'percentage')
      assert.equal(parsed.value, 20)
      assert.equal(parsed.minCartValue, 1000)
      assert.equal(parsed.maxDiscount, 500)
      assert.equal(parsed.perUserLimit, 1)
      assert.equal(parsed.active, true)
    })

    it('validates a fixed discount coupon', () => {
      const parsed = couponSchema.parse({
        code: 'FLAT300',
        type: 'fixed',
        value: 300,
      })
      assert.equal(parsed.code, 'FLAT300')
      assert.equal(parsed.type, 'fixed')
      assert.equal(parsed.value, 300)
    })

    it('rejects negative coupon values', () => {
      assert.throws(() => {
        couponSchema.parse({
          code: 'NEG',
          type: 'fixed',
          value: -50,
        })
      })
    })
  })
})
