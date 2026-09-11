import bcrypt from 'bcryptjs'
import { Admin } from '../src/models/index.js'
import { signAccessToken } from '../src/utils/tokens.js'

async function check() {
  const admins = await Admin.findAll({ raw: true }) as any[]
  console.log('Admins count:', admins.length)
  for (const a of admins) {
    const isP1 = await bcrypt.compare('password', a.passwordHash)
    const isP2 = await bcrypt.compare('password123', a.passwordHash)
    const isP3 = await bcrypt.compare('A1tex@2026', a.passwordHash)
    const isP4 = await bcrypt.compare('admin123', a.passwordHash)
    console.log(a.id, a.email, { isP1, isP2, isP3, isP4 })
  }
  process.exit(0)
}

check().catch(console.error)
