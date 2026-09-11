import { DataTypes } from 'sequelize'
import { sequelize } from '../database/sequelize.js'

export const EmailCampaign = sequelize.define('EmailCampaign', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  type: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'general' },
  subject: { type: DataTypes.STRING(255), allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: true },
  imageUrl: { type: DataTypes.STRING(255), allowNull: true, field: 'image_url' },
  productIds: { type: DataTypes.JSON, allowNull: true, field: 'product_ids' },
  status: { type: DataTypes.ENUM('draft', 'sent'), allowNull: false, defaultValue: 'draft' },
  recipientCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'recipient_count' },
  sentAt: { type: DataTypes.DATE, allowNull: true, field: 'sent_at' },
  createdBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'created_by' },
}, { tableName: 'email_campaigns' })
