import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { AppError, asyncHandler } from '../../src/utils/http.js'

describe('HTTP utilities', () => {
  describe('AppError', () => {
    it('creates an AppError instance with correct statusCode and message', () => {
      const err = new AppError(404, 'Product not found')
      assert.ok(err instanceof Error)
      assert.ok(err instanceof AppError)
      assert.equal(err.statusCode, 404)
      assert.equal(err.message, 'Product not found')
      assert.equal(err.name, 'AppError')
    })

    it('supports different HTTP status codes', () => {
      const badReq = new AppError(400, 'Bad request payload')
      const unauthorized = new AppError(401, 'Unauthorized access')
      const forbidden = new AppError(403, 'Permission denied')
      const conflict = new AppError(409, 'Duplicate item')
      const unprocessable = new AppError(422, 'Validation error')

      assert.equal(badReq.statusCode, 400)
      assert.equal(unauthorized.statusCode, 401)
      assert.equal(forbidden.statusCode, 403)
      assert.equal(conflict.statusCode, 409)
      assert.equal(unprocessable.statusCode, 422)
    })
  })

  describe('asyncHandler', () => {
    it('executes the async function successfully without calling next with error', async () => {
      let called = false
      let nextError: any = null

      const fn = async (_req: any, _res: any) => {
        called = true
      }
      const middleware = asyncHandler(fn)
      await middleware({} as any, {} as any, (err: any) => {
        nextError = err
      })

      assert.equal(called, true)
      assert.equal(nextError, null)
    })

    it('catches thrown errors and forwards them to next()', async () => {
      let nextError: any = null
      const expectedError = new AppError(400, 'Something went wrong')

      const fn = async (_req: any, _res: any) => {
        throw expectedError
      }
      const middleware = asyncHandler(fn)
      await middleware({} as any, {} as any, (err: any) => {
        nextError = err
      })

      assert.equal(nextError, expectedError)
      assert.equal(nextError.statusCode, 400)
      assert.equal(nextError.message, 'Something went wrong')
    })
  })
})
