import { sequelize } from '../sequelize.js'
import { PriceDropEvent, PriceDropEmailLog } from '../../models/price-drop.models.js'

async function migrate() {
  try {
    await PriceDropEvent.sync({ alter: true })
    await PriceDropEmailLog.sync({ alter: true })
    console.log('[Migration] Price drop tables created successfully.')
    process.exit(0)
  } catch (err) {
    console.error('[Migration] Failed:', err)
    process.exit(1)
  }
}

migrate()
