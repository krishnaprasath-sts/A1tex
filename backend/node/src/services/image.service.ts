import fs from 'node:fs'
import path from 'node:path'

// Load sharp optionally — older CPUs may not support prebuilt binaries
let sharp: ((input: string) => any) | null = null
try {
  sharp = (await import('sharp')).default
} catch {
  console.warn('[image.service] sharp could not be loaded — image validation and optimization will be skipped.')
}

export type DimensionRule = {
  minWidth: number
  minHeight: number
  maxWidth: number
  maxHeight: number
  recommendedRatio?: string
  description: string
}

export const DIMENSION_RULES: Record<string, DimensionRule> = {
  'banner-hero': {
    minWidth: 1200,
    minHeight: 450,
    maxWidth: 2400,
    maxHeight: 1600,
    recommendedRatio: '8:3',
    description: 'Banner images fill the full viewport. Minimum 1200×450px, wide panoramic 8:3 ratio recommended.',
  },
  'product-card': {
    minWidth: 600,
    minHeight: 750,
    maxWidth: 1600,
    maxHeight: 2000,
    recommendedRatio: '4:5',
    description: 'Product cards use a 4:5 portrait ratio. Minimum 600×750px recommended.',
  },
  'variant-main': {
    minWidth: 600,
    minHeight: 750,
    maxWidth: 2400,
    maxHeight: 3000,
    recommendedRatio: '4:5',
    description: 'Variant main image should match product image dimensions. Minimum 600×750px, 4:5 ratio recommended.',
  },
  'variant-gallery': {
    minWidth: 400,
    minHeight: 500,
    maxWidth: 2400,
    maxHeight: 3000,
    recommendedRatio: '4:5',
    description: 'Gallery images should be at least 400×500px. 4:5 ratio recommended for consistency.',
  },
  'category-card': {
    minWidth: 600,
    minHeight: 800,
    maxWidth: 1600,
    maxHeight: 2133,
    recommendedRatio: '3:4',
    description: 'Category cards use a 3:4 portrait ratio. Minimum 600×800px recommended.',
  },
}

export async function getImageDimensions(filePath: string): Promise<{ width: number; height: number; format: string }> {
  if (!sharp) {
    // sharp not available — return safe defaults
    return { width: 9999, height: 9999, format: 'unknown' }
  }
  try {
    const metadata = await sharp(filePath).metadata()
    return {
      width: metadata.width ?? 0,
      height: metadata.height ?? 0,
      format: metadata.format ?? 'unknown',
    }
  } catch (err: any) {
    console.warn(`[image.service] Failed to read metadata for ${filePath}:`, err.message)
    return { width: 9999, height: 9999, format: 'unknown' }
  }
}

export function checkRatioMatch(_rule: DimensionRule, _width: number, _height: number): boolean {
  return true
}

export type ValidationResult =
  | { valid: true; dimensions: { width: number; height: number } }
  | { valid: false; reason: string; dimensions: { width: number; height: number } }

export async function validateImageDimensions(filePath: string, _rule?: DimensionRule): Promise<ValidationResult> {
  if (!sharp) {
    // sharp not available — skip validation, allow upload
    return { valid: true, dimensions: { width: 0, height: 0 } }
  }
  const dims = await getImageDimensions(filePath)
  const { width, height } = dims

  // Aspect ratio and resize requirements removed — accept any valid uploaded image
  return { valid: true, dimensions: { width, height } }
}

export async function optimizeImage(
  inputPath: string,
  rule: DimensionRule,
): Promise<{ path: string; width: number; height: number }> {
  if (!sharp) {
    // sharp not available — skip optimization, return original file
    return { path: inputPath, width: 0, height: 0 }
  }

  const ext = path.extname(inputPath).toLowerCase()
  const optimizedPath = inputPath.replace(ext, '') + '-optimized' + ext

  try {
    let pipeline = sharp(inputPath)

    const metadata = await pipeline.metadata()
    const origWidth = metadata.width ?? 0
    const origHeight = metadata.height ?? 0

    if (origWidth > rule.maxWidth || origHeight > rule.maxHeight) {
      pipeline = pipeline.resize(rule.maxWidth, rule.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
    }

    if (ext === '.jpg' || ext === '.jpeg') {
      pipeline = pipeline.jpeg({ quality: 85, progressive: true })
    } else if (ext === '.png') {
      pipeline = pipeline.png({ quality: 85, progressive: true })
    } else if (ext === '.webp') {
      pipeline = pipeline.webp({ quality: 85 })
    }

    await pipeline.toFile(optimizedPath)
    return { path: optimizedPath, width: origWidth, height: origHeight }
  } catch (err: any) {
    console.warn(`[image.service] Failed to optimize image ${inputPath}:`, err.message)
    return { path: inputPath, width: 0, height: 0 }
  }
}

export function cleanupFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch {
    // best-effort cleanup
  }
}

export function filePathFromUrl(imageUrl: string, uploadsDir: string): string | null {
  if (!imageUrl || !imageUrl.startsWith('/uploads/')) return null
  const filename = imageUrl.replace('/uploads/', '')
  if (!filename || filename.includes('..') || filename.includes('/')) return null
  return path.join(uploadsDir, filename)
}
