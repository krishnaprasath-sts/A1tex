const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const path = require('path')
const fs = require('fs')

try {
  const dotenv = require('dotenv')
  const prodEnv = path.resolve(__dirname, '.env.production')
  const defaultEnv = path.resolve(__dirname, '.env')
  if (fs.existsSync(prodEnv)) {
    dotenv.config({ path: prodEnv })
  } else if (fs.existsSync(defaultEnv)) {
    dotenv.config({ path: defaultEnv })
  }
} catch (e) {
  // Next.js also reads .env files natively
}

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()
const port = process.env.PORT || 3000

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  }).listen(port, (err) => {
    if (err) throw err
    console.log(`> A1 TEX Storefront ready on port ${port}`)
  })
}).catch((err) => {
  console.error('Error starting Next.js server:', err)
  process.exit(1)
})
