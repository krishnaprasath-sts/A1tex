import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getDiscount, formatCleanColor, mapToProductCardProduct } from '../../lib/api/mappers'
import type { StorefrontProduct } from '../../lib/api/types'

describe('Frontend Data Mappers', () => {
  describe('getDiscount', () => {
    it('returns null when originalPrice is null or undefined', () => {
      assert.equal(getDiscount(1999, null), null)
      assert.equal(getDiscount(1999, undefined), null)
    })

    it('returns null when originalPrice is less than or equal to current price', () => {
      assert.equal(getDiscount(2000, 2000), null)
      assert.equal(getDiscount(2500, 2000), null)
    })

    it('calculates rounded percentage discount correctly', () => {
      // 2000 from 2500 is 20% off
      assert.equal(getDiscount(2000, 2500), 20)
      // 1499 from 2999 is ~50% off (50.01%)
      assert.equal(getDiscount(1499, 2999), 50)
      // 999 from 1999 is ~50% off
      assert.equal(getDiscount(999, 1999), 50)
    })
  })

  describe('formatCleanColor', () => {
    it('returns undefined for empty, null, or undefined input', () => {
      assert.equal(formatCleanColor(null), undefined)
      assert.equal(formatCleanColor(undefined), undefined)
      assert.equal(formatCleanColor(''), undefined)
    })

    it('cleans and returns normal color names', () => {
      assert.equal(formatCleanColor('Maroon'), 'Maroon')
      assert.equal(formatCleanColor('  Royal Blue  '), 'Royal Blue')
      assert.equal(formatCleanColor('Emerald Green'), 'Emerald Green')
    })

    it('maps known hex color patterns to human-readable names', () => {
      assert.equal(formatCleanColor('#E8DEC8'), 'Natural Beige')
      assert.equal(formatCleanColor('#C8A050'), 'Gold & Maroon')
      assert.equal(formatCleanColor('#E8C0D0'), 'Rose Pink')
      assert.equal(formatCleanColor('#D4E8C0'), 'Sage Green')
      assert.equal(formatCleanColor('#202020'), 'Charcoal')
      assert.equal(formatCleanColor('#E8E0D0'), 'Ivory Cream')
    })

    it('returns undefined for unmapped raw hex strings', () => {
      assert.equal(formatCleanColor('#123456'), undefined)
    })
  })

  describe('mapToProductCardProduct', () => {
    it('maps storefront product to ProductCardProduct format accurately', () => {
      const sampleProduct: StorefrontProduct = {
        id: 101,
        code: 'A1-101',
        name: 'Zari Kanchipuram Saree',
        slug: 'zari-kanchipuram-saree',
        type: 'Bridal Silk',
        price: 3499,
        originalPrice: 4999,
        stockQty: 15,
        image: '/uploads/saree1.jpg',
        imageUrl: '/uploads/saree1.jpg',
        category: 'Bridal Silk',
        isNew: true,
        isBestSeller: false,
        hasVariants: false,
        variants: [],
      }

      const card = mapToProductCardProduct(sampleProduct)
      assert.equal(card.id, 101)
      assert.equal(card.name, 'Zari Kanchipuram Saree')
      assert.equal(card.price, 3499)
      assert.equal(card.oldPrice, 4999)
      assert.equal(card.badge, 'New')
      assert.equal(card.category, 'Bridal Silk')
      assert.equal(card.href, '/products/zari-kanchipuram-saree')
      assert.equal(card.stock, 15)
    })

    it('sets badge to "% OFF" when neither new nor bestseller', () => {
      const sampleProduct: StorefrontProduct = {
        id: 102,
        code: 'A1-102',
        name: 'Soft Silk Saree',
        slug: 'soft-silk-saree',
        type: 'Soft Silk',
        price: 2000,
        originalPrice: 2500,
        stockQty: 8,
        category: 'Silk',
        image: '/uploads/saree2.jpg',
        isNew: false,
        isBestSeller: false,
        hasVariants: false,
      }

      const card = mapToProductCardProduct(sampleProduct)
      assert.equal(card.badge, '20% OFF')
    })

    it('extracts unique color swatches from variants', () => {
      const sampleProduct: StorefrontProduct = {
        id: 103,
        code: 'A1-103',
        name: 'Festive Silk',
        slug: 'festive-silk',
        type: 'Festive Silk',
        price: 2999,
        originalPrice: null,
        category: 'Silk',
        image: '/uploads/saree3.jpg',
        stockQty: 10,
        hasVariants: true,
        variants: [
          {
            id: 1,
            variantType: 'color',
            sku: 'A1-103-RED',
            label: 'Red',
            colorName: 'Crimson Red',
            colorHex: '#990000',
            price: 2999,
            stockQty: 5,
            isDefault: true,
          },
          {
            id: 2,
            variantType: 'color',
            sku: 'A1-103-BLUE',
            label: 'Blue',
            colorName: 'Royal Blue',
            colorHex: '#003399',
            price: 2999,
            stockQty: 5,
          },
        ],
      }

      const card = mapToProductCardProduct(sampleProduct)
      assert.ok(card.colors)
      assert.equal(card.colors.length, 2)
      assert.equal(card.colors[0].name, 'Crimson Red')
      assert.equal(card.colors[1].name, 'Royal Blue')
      assert.equal(card.variantId, 1)
    })
  })
})
