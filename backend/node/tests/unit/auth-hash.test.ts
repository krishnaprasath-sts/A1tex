import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

describe('Auth & Cryptography Utilities', () => {
  describe('Password Hashing (bcrypt)', () => {
    it('hashes a plaintext password and verifies correctly', async () => {
      const password = 'SecurePassword@2026'
      const hash = await bcrypt.hash(password, 10)

      assert.notEqual(hash, password)
      assert.ok(hash.startsWith('$2'))

      const isValid = await bcrypt.compare(password, hash)
      assert.equal(isValid, true)
    })

    it('rejects an incorrect password comparison', async () => {
      const password = 'A1tex@2026'
      const hash = await bcrypt.hash(password, 10)

      const isInvalid = await bcrypt.compare('WrongPassword@123', hash)
      assert.equal(isInvalid, false)
    })
  })

  describe('JWT Token Handling', () => {
    const secret = 'test_jwt_secret_key_with_sufficient_entropy_12345'

    it('signs and verifies a token payload accurately', () => {
      const payload = { sub: 42, email: 'user@example.com', role: 'customer' }
      const token = jwt.sign(payload, secret, { expiresIn: '1h' })

      assert.ok(typeof token === 'string')
      assert.ok(token.split('.').length === 3)

      const decoded: any = jwt.verify(token, secret)
      assert.equal(decoded.sub, 42)
      assert.equal(decoded.email, 'user@example.com')
      assert.equal(decoded.role, 'customer')
    })

    it('fails verification with an invalid secret or tampered token', () => {
      const token = jwt.sign({ sub: 1 }, secret)
      assert.throws(() => {
        jwt.verify(token, 'different_secret_key_12345')
      })
    })
  })
})
