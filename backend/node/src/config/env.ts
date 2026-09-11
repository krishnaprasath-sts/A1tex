import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') })

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5005),
  DB_HOST: z.string().default('localhost'),
  DB_USER: z.string().default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().default('a1tex_db'),
  DB_DIALECT: z.literal('mysql').default('mysql'),
  DB_PORT: z.coerce.number().default(3306),
  DB_SSL: z.coerce.boolean().default(false),
  CORS_ORIGIN: z.string().optional().default(''),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:5005'),
  ADMIN_PANEL_URL: z.string().url().default('http://localhost:5173'),
  JWT_ACCESS_SECRET: z.string().min(24),
  JWT_REFRESH_SECRET: z.string().min(24),
  COOKIE_SECRET: z.string().min(24),
  ADMIN_EMAIL: z.string().email().default('admin@a1tex.com'),
  ADMIN_PASSWORD: z.string().min(8),
  EMAIL_HOST: z.string().optional().default(''),
  EMAIL_PORT: z.coerce.number().default(587),
  EMAIL_USER: z.string().optional().default(''),
  EMAIL_PASS: z.string().optional().default(''),
  SHIPROCKET_EMAIL: z.string().optional().default(''),
  SHIPROCKET_PASSWORD: z.string().optional().default(''),
  SHIPROCKET_PICKUP_LOCATION: z.string().optional().default('work'),
  SHIPROCKET_API_BASE_URL: z.string().url().default('https://apiv2.shiprocket.in/v1/external'),
  SHIPROCKET_CHANNEL_ID: z.string().optional().default(''),
  WAREHOUSE_ADDRESS: z.string().optional().default(''),
  WAREHOUSE_PINCODE: z.string().optional().default(''),
  WAREHOUSE_CITY: z.string().optional().default('Chennai'),
  WAREHOUSE_STATE: z.string().optional().default('Tamil Nadu'),
  SERVICE_API_SECRET: z.string().min(16),
  ORDER_SERVICE_SECRET: z.string().min(16),
  RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(''),
  SHIPPING_ENV: z.enum(['test', 'production']).default('test'),
})

export const env = envSchema.parse(process.env)

if (env.NODE_ENV === 'production') {
  const unsafe = [
    env.JWT_ACCESS_SECRET,
    env.JWT_REFRESH_SECRET,
    env.COOKIE_SECRET,
    env.SERVICE_API_SECRET,
    env.ORDER_SERVICE_SECRET,
  ].some(value => value.includes('change-this-local'))

  if (unsafe) {
    throw new Error('Production secrets must be replaced before starting the API.')
  }
}
