import { DataTypes } from 'sequelize'
import { sequelize } from '../database/sequelize.js'

export const ContactEnquiry = sequelize.define('ContactEnquiry', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(140), allowNull: false },
  email: { type: DataTypes.STRING(190), allowNull: false },
  phonenumber: { type: DataTypes.STRING(32), allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
}, {
  tableName: 'contact_enquiries',
  indexes: [
    { fields: ['email'] },
  ],
})
