// A1 Tex - Cloud Database Connection & Schema Initializer
// Usage: node scripts/init-cloud-db.cjs [host] [port] [user] [password] [database]

const mysql = require('mysql2/promise')
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') })

async function main() {
  const host = process.argv[2] || process.env.DB_HOST || 'localhost'
  const port = Number(process.argv[3] || process.env.DB_PORT || 4000)
  const user = process.argv[4] || process.env.DB_USER || 'root'
  const password = process.argv[5] || process.env.DB_PASSWORD || ''
  const database = process.argv[6] || process.env.DB_NAME || 'a1tex_db'

  const isCloud = port === 4000 || host.includes('tidbcloud.com') || process.env.DB_SSL === 'true'

  console.log(`\n🔍 Connecting to MySQL database at ${host}:${port} as ${user}...`)
  console.log(`🔒 SSL Encryption: ${isCloud ? 'Enabled (TLS v1.2)' : 'Disabled'}`)

  try {
    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      ssl: isCloud ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
    })

    console.log('✅ Successfully connected to MySQL server!')

    console.log(`📦 Ensuring database \`${database}\` exists...`)
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
    console.log(`🎉 Database \`${database}\` is ready to use!`)

    await connection.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Connection failed:', error.message)
    process.exit(1)
  }
}

main()
