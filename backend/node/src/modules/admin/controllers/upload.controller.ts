import { Request, Response } from 'express'
import path from 'node:path'
import { z } from 'zod'
import { AppError } from '../../../utils/http.js'
import {
  DIMENSION_RULES,
  validateImageDimensions,
  optimizeImage,
  cleanupFile,
} from '../../../services/image.service.js'

import fs from 'node:fs'

export const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads')
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
}

const uploadsParam = z.object({ filename: z.string().min(1) })

export const uploadFile = async (req: Request, res: Response) => {
  if (!req.file) throw new AppError(422, 'File is required.')

  const filePath = req.file.path
  const dimensionRuleKey = String(req.body.dimensionRule || req.query.dimensionRule || '').trim()
  const rule = dimensionRuleKey ? DIMENSION_RULES[dimensionRuleKey] : undefined

  let width = 0
  let height = 0

  if (rule) {
    const validation = await validateImageDimensions(filePath, rule)
    width = validation.dimensions.width
    height = validation.dimensions.height

    if (!validation.valid) {
      cleanupFile(filePath)
      throw new AppError(422, validation.reason)
    }

    if (width > rule.maxWidth || height > rule.maxHeight) {
      try {
        const optimized = await optimizeImage(filePath, rule)
        const finalFilename = path.basename(optimized.path)
        res.status(201).json({
          file: {
            filename: finalFilename,
            originalName: req.file.originalname,
            path: `/uploads/${finalFilename}`,
            dimensions: { width: optimized.width, height: optimized.height },
          },
        })
        res.on('finish', () => cleanupFile(filePath))
        res.on('close', () => cleanupFile(filePath))
        return
      } catch {
        // optimization failed, continue with original
      }
    }
  }

  res.status(201).json({
    file: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: `/uploads/${req.file.filename}`,
      dimensions: { width, height },
    },
  })
}

export const deleteUploadedFile = async (req: Request, res: Response) => {
  const { filename } = uploadsParam.parse(req.params)
  if (filename.includes('..') || filename.includes('/')) {
    throw new AppError(422, 'Invalid filename.')
  }
  const fp = path.join(UPLOADS_DIR, filename)
  if (fp !== path.resolve(UPLOADS_DIR, filename)) {
    throw new AppError(422, 'Invalid filename.')
  }
  cleanupFile(fp)
  res.json({ ok: true })
}
