import compression from 'compression'
import path from 'node:path'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import morgan from 'morgan'
import { env } from './config/env.js'
import routes from './routes/index.js'
import { errorHandler } from './middleware/error-handler.js'
import { initAssociations } from './models/index.js'

initAssociations()

const allowedOrigins = new Set([
  env.FRONTEND_URL,
  env.ADMIN_PANEL_URL,
  'https://a1tex.in',
  'https://www.a1tex.in',
  'https://a1texdashboard.a1tex.in',
  'https://aitexapi.a1tex.in',
  'https://a1texapi.a1tex.in',
  'https://a1dashboard.a1tex.in',
  'https://a1tex.saitechnosolutions.co.in',
  'https://a1texdashboard.saitechnosolutions.co.in',
  'https://a1texapi.saitechnosolutions.co.in',
  'http://localhost:3000',
  'http://localhost:5173',
])

export const app = express()

app.set('trust proxy', 1)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}))
app.use(compression())
app.use(express.json({
  limit: '2mb',
  verify: (req: any, _res, buf) => {
    req.rawBody = buf
  },
}))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser(env.COOKIE_SECRET))
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'))
app.use(cors({
  origin(origin, callback) {
    if (env.NODE_ENV === 'development') return callback(null, true)
    if (env.CORS_ORIGIN === '*' || process.env.CORS_ORIGIN === '*') return callback(null, true)
    if (!origin || allowedOrigins.has(origin)) return callback(null, true)
    if (origin.endsWith('.a1tex.in') || origin === 'https://a1tex.in') return callback(null, true)
    if (origin.endsWith('.saitechnosolutions.co.in') || origin === 'https://saitechnosolutions.co.in') return callback(null, true)
    if (origin.endsWith('.vercel.app') || origin.endsWith('.onrender.com')) return callback(null, true)
    if (/^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(origin)) return callback(null, true)
    return callback(new Error(`CORS blocked for origin: ${origin}`))
  },
  credentials: true,
}))

function createAuthLimiter(message: string, limit: number, windowMinutes = 15) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
  })
}

const customerLoginLimiter = createAuthLimiter('Too many login attempts. Please try again after 15 minutes.', 10)
const adminLoginLimiter = createAuthLimiter('Too many admin login attempts. Please try again after 15 minutes.', 10)
const registerLimiter = createAuthLimiter('Too many registration attempts. Please try again later.', 5, 60)
const forgotPasswordLimiter = createAuthLimiter('Too many password reset requests. Please try again after 15 minutes.', 5)

app.use('/api/auth/login', customerLoginLimiter)
app.use('/api/auth/register', registerLimiter)
app.use('/api/auth/forgot-password', forgotPasswordLimiter)
app.use('/api/admin/auth/login', adminLoginLimiter)

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {

    const origin = req.headers.origin
    const referer = req.headers.referer
    if (origin && (origin === env.FRONTEND_URL || origin === env.ADMIN_PANEL_URL || /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(origin))) {
      return true
    }
    if (referer) {
      if (referer.startsWith(env.FRONTEND_URL) || referer.startsWith(env.ADMIN_PANEL_URL) || /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(referer)) {
        return true
      }
    }
    
    const ip = req.ip || req.socket.remoteAddress
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || (typeof ip === 'string' && (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')))
  },
}))

app.use('/api', routes)
app.use('/uploads', (req, res, next) => {
  if (req.path.toLowerCase().endsWith('.svg')) {
    return res.status(403).json({ error: 'SVG files are blocked for security reasons.' })
  }
  res.setHeader('Cache-Control', 'public, max-age=604800, immutable')
  next()
}, express.static(path.resolve(process.cwd(), 'uploads'), { maxAge: '7d', etag: true }))
app.use(errorHandler)