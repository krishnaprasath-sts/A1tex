import { Sequelize } from 'sequelize'
import { env } from '../config/env.js'

function quoteIdentifier(value: string) {
  return `\`${value.replace(/`/g, '``')}\``
}

const isCloudDb = env.DB_SSL || env.DB_PORT === 4000 || env.DB_HOST.includes('tidbcloud.com')

export const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: env.DB_DIALECT,
  logging: false,
  dialectOptions: isCloudDb
    ? {
        ssl: {
          minVersion: 'TLSv1.2',
          rejectUnauthorized: true,
        },
      }
    : {},
  define: {
    underscored: true,
    timestamps: true,
  },
  pool: {
    max: 20,
    min: 2,
    acquire: 30000,
    idle: 10000,
  },
})

export async function assertDatabaseConnection() {
  await sequelize.authenticate()
}

export async function ensureDatabaseExists() {
  if (isCloudDb) {
    // In cloud databases like TiDB Cloud, schema is managed in the cloud console
    return
  }

  try {
    const bootstrap = new Sequelize('', env.DB_USER, env.DB_PASSWORD, {
      host: env.DB_HOST,
      port: env.DB_PORT,
      dialect: env.DB_DIALECT,
      logging: false,
    })

    await bootstrap.query(
      `CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(env.DB_NAME)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    )
    await bootstrap.close()
  } catch (err) {
    console.warn('[DB] Notice: ensureDatabaseExists skipped or failed:', (err as Error).message)
  }
}
