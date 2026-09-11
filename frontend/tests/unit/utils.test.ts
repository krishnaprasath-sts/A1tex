import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveImageUrl } from '../../lib/api/utils'

describe('Frontend API Utilities', () => {
  describe('resolveImageUrl', () => {
    it('returns empty string for null, undefined, or empty values', () => {
      assert.equal(resolveImageUrl(null), '')
      assert.equal(resolveImageUrl(undefined), '')
      assert.equal(resolveImageUrl(''), '')
      assert.equal(resolveImageUrl('   '), '')
    })

    it('preserves absolute HTTP/HTTPS URLs', () => {
      assert.equal(
        resolveImageUrl('https://images.example.com/saree.jpg'),
        'https://images.example.com/saree.jpg'
      )
      assert.equal(
        resolveImageUrl('http://cdn.example.com/item.png'),
        'http://cdn.example.com/item.png'
      )
    })

    it('preserves data and blob URIs', () => {
      const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA'
      const blobUri = 'blob:http://localhost:3000/1234-5678'
      assert.equal(resolveImageUrl(dataUri), dataUri)
      assert.equal(resolveImageUrl(blobUri), blobUri)
    })

    it('prepends base API URL for /uploads/ paths', () => {
      const resolved = resolveImageUrl('/uploads/saree_123.jpg')
      assert.ok(resolved.endsWith('/uploads/saree_123.jpg'))
      assert.ok(resolved.startsWith('http://') || resolved.startsWith('https://'))
    })

    it('trims leading and trailing whitespace from input URL', () => {
      assert.equal(
        resolveImageUrl('  https://example.com/image.jpg  '),
        'https://example.com/image.jpg'
      )
    })
  })
})
