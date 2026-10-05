import { DataTypes } from 'sequelize'
import { sequelize } from '../database/sequelize.js'

export const StockNotification = sequelize.define('StockNotification', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  variantId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  email: { type: DataTypes.STRING(190), allowNull: false },
  phone: { type: DataTypes.STRING(32), allowNull: true },
  customerName: { type: DataTypes.STRING(140), allowNull: true },
  notifiedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'stock_notifications',
  indexes: [
    { fields: ['product_id', 'variant_id'] },
    { fields: ['email'] },
  ],
})
