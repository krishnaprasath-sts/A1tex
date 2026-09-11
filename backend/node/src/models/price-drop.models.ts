import { DataTypes } from 'sequelize'
import { sequelize } from '../database/sequelize.js'

export const PriceDropEvent = sequelize.define('PriceDropEvent', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'product_id' },
  productName: { type: DataTypes.STRING(180), allowNull: false, field: 'product_name' },
  oldPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false, field: 'old_price' },
  newPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false, field: 'new_price' },
  discountPercent: { type: DataTypes.DECIMAL(5, 2), allowNull: false, field: 'discount_percent' },
  triggeredBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'triggered_by' },
  emailsSent: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'emails_sent' },
  emailsFailed: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'emails_failed' },
  status: { type: DataTypes.ENUM('pending', 'processing', 'done', 'failed'), allowNull: false, defaultValue: 'pending' },
}, { tableName: 'price_drop_events' })

export const PriceDropEmailLog = sequelize.define('PriceDropEmailLog', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  eventId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'event_id' },
  customerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'customer_id' },
  email: { type: DataTypes.STRING(190), allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'sent', 'failed'), allowNull: false, defaultValue: 'pending' },
  errorMessage: { type: DataTypes.TEXT, allowNull: true, field: 'error_message' },
  sentAt: { type: DataTypes.DATE, allowNull: true, field: 'sent_at' },
}, {
  tableName: 'price_drop_email_logs',
  indexes: [
    { fields: ['event_id'] },
    { fields: ['customer_id'] },
  ],
})

export function initPriceDropAssociations() {
  PriceDropEvent.hasMany(PriceDropEmailLog, { foreignKey: 'event_id', as: 'emailLogs' })
  PriceDropEmailLog.belongsTo(PriceDropEvent, { foreignKey: 'event_id' })
}
