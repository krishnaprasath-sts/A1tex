import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../utils/http.js'
import { env } from '../config/env.js'

const multerMessages: Record<string, string> = {
  LIMIT_FILE_SIZE: 'File size exceeds the 5 MB limit.',
  LIMIT_FILE_COUNT: 'Too many files.',
  LIMIT_UNEXPECTED_FILE: 'Unexpected file field.',
}

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof ZodError) {
    return res.status(422).json({
      message: 'Validation failed',
      issues: error.issues,
    })
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ message: error.message })
  }

  // Sequelize unique constraint violation
  if (error && typeof error === 'object' && 'name' in error) {
    const errName = (error as any).name as string
    if (errName === 'SequelizeUniqueConstraintError') {
      const fields = (error as any).fields || {}
      const fieldNames = Object.keys(fields)
      const friendly = fieldNames.length
        ? `A record with this ${fieldNames.join(', ')} already exists.`
        : 'A record with these values already exists.'
      return res.status(409).json({ message: friendly, detail: `Duplicate value for: ${fieldNames.join(', ')}` })
    }
    if (errName === 'SequelizeForeignKeyConstraintError') {
      const table = (error as any).table || 'record'
      const isDelete = req.method === 'DELETE'
      return res.status(409).json({
        message: isDelete
          ? `Cannot delete: this item is still referenced by other records (${table}). Remove the linked items first.`
          : `Invalid reference: the associated ${table} does not exist or cannot be linked.`,
      })
    }
  }

  if (error && typeof error === 'object' && 'code' in error && typeof (error as any).code === 'string') {
    const code = (error as any).code as string
    if (multerMessages[code]) {
      return res.status(422).json({ message: multerMessages[code] })
    }
  }

  console.error(error)
  return res.status(500).json({
    message: 'Internal server error',
    ...(env.NODE_ENV === 'development' ? { detail: String(error?.message ?? error) } : {}),
  })
}
