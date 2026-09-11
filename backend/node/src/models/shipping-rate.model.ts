import { DataTypes } from 'sequelize'
import { sequelize } from '../database/sequelize.js'

export const ShippingRate = sequelize.define('ShippingRate', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  courierService: {
    type: DataTypes.STRING(80),
    allowNull: false,
    field: 'courier_service',
  },
  state: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  estimatedDays: {
    type: DataTypes.STRING(80),
    allowNull: true,
    field: 'estimated_days',
  },
  active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: 'shipping_rates',
  indexes: [
    { unique: true, fields: ['courier_service', 'state'] },
    { fields: ['courier_service'] },
    { fields: ['state'] },
    { fields: ['active'] },
  ],
})
