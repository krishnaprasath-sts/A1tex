import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { env } from '../../src/config/env.js'

describe('Email Configuration & Validation', () => {
  test('has email configuration keys defined', () => {
    assert.ok(env.EMAIL_HOST, 'EMAIL_HOST should be defined')
    assert.ok(env.EMAIL_USER, 'EMAIL_USER should be defined')
  })
})
