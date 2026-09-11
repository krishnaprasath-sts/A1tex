import { DataTypes } from 'sequelize'
import { sequelize } from '../database/sequelize.js'

export const StockNotification = sequelize.define('StockNotification', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'product_id' },
  productName: { type: DataTypes.STRING(180), allowNull: false, field: 'product_name' },
  variantId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'variant_id' },
  variantLabel: { type: DataTypes.STRING(180), allowNull: true, field: 'variant_label' },
  email: { type: DataTypes.STRING(190), allowNull: false },
  customerName: { type: DataTypes.STRING(140), allowNull: true, field: 'customer_name' },
  customerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'customer_id' },
  phone: { type: DataTypes.STRING(32), allowNull: true },
  adminMessage: { type: DataTypes.TEXT, allowNull: true, field: 'admin_message' },
  status: { type: DataTypes.ENUM('pending', 'notified'), allowNull: false, defaultValue: 'pending' },
  notifiedAt: { type: DataTypes.DATE, allowNull: true, field: 'notified_at' },
}, {
  tableName: 'stock_notifications',
  indexes: [
    { fields: ['product_id'] },
    { fields: ['variant_id'] },
    { fields: ['email'] },
    { fields: ['status'] },
  ],
})


