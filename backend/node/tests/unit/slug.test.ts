import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { slugify } from '../../src/utils/slug.js'

describe('slugify utility', () => {
  it('converts plain strings to lowercase hyphenated format', () => {
    assert.equal(slugify('Silk Saree'), 'silk-saree')
    assert.equal(slugify('Royal Kanchipuram Bridal Silk'), 'royal-kanchipuram-bridal-silk')
  })

  it('replaces & with "and"', () => {
    assert.equal(slugify('Gold & Maroon'), 'gold-and-maroon')
    assert.equal(slugify('Cotton & Linen Sarees'), 'cotton-and-linen-sarees')
  })

  it('removes special characters and handles punctuation', () => {
    assert.equal(slugify('Pure Silk @ ₹2,999!'), 'pure-silk-2-999')
    assert.equal(slugify('Festive Edit (2026)'), 'festive-edit-2026')
  })

  it('strips leading, trailing, and duplicate hyphens', () => {
    assert.equal(slugify('---hello---world---'), 'hello-world')
    assert.equal(slugify('   spaced   words   '), 'spaced-words')
  })

  it('handles empty or whitespace-only strings', () => {
    assert.equal(slugify(''), '')
    assert.equal(slugify('   '), '')
  })
})
