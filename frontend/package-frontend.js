import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = __dirname
const standaloneDir = path.join(rootDir, '.next', 'standalone')
const deployDir = path.resolve(rootDir, 'frontend-deploy')

console.log('1. Preparing standalone frontend-deploy directory...')
if (fs.existsSync(deployDir)) {
  fs.rmSync(deployDir, { recursive: true, force: true })
}
fs.mkdirSync(deployDir, { recursive: true })

// 1. Copy everything from .next/standalone
console.log('2. Copying standalone runtime & node_modules...')
fs.cpSync(standaloneDir, deployDir, { recursive: true })

// 2. Copy public directory into deploy root
console.log('3. Copying public assets...')
const publicDir = path.join(rootDir, 'public')
if (fs.existsSync(publicDir)) {
  fs.cpSync(publicDir, path.join(deployDir, 'public'), { recursive: true })
}

// 3. Copy .next/static into deploy/.next/static (required by Next.js standalone)
console.log('4. Copying .next/static into standalone structure...')
const staticSrc = path.join(rootDir, '.next', 'static')
const staticDest = path.join(deployDir, '.next', 'static')
if (fs.existsSync(staticSrc)) {
  fs.cpSync(staticSrc, staticDest, { recursive: true })
}

// 4. Ensure .env has production values
console.log('5. Writing production .env...')
const prodEnv = fs.readFileSync(path.join(rootDir, '.env.production'), 'utf-8')
fs.writeFileSync(path.join(deployDir, '.env'), prodEnv, 'utf-8')
fs.writeFileSync(path.join(deployDir, '.env.production'), prodEnv, 'utf-8')

// 5. Copy .htaccess
console.log('6. Copying clean .htaccess...')
if (fs.existsSync(path.join(rootDir, '.htaccess'))) {
  fs.copyFileSync(path.join(rootDir, '.htaccess'), path.join(deployDir, '.htaccess'))
}

// 6. Verify critical files
const criticalFiles = [
  'server.js',
  '.next/static',
  'public',
  'node_modules',
  '.env'
]

console.log('7. Verifying standalone package...')
let allOk = true
for (const file of criticalFiles) {
  const p = path.join(deployDir, file)
  if (fs.existsSync(p)) {
    console.log(`  ✓ ${file} present`)
  } else {
    console.error(`  ✗ MISSING: ${file}`)
    allOk = false
  }
}

if (!allOk) {
  console.error('Packaging failed.')
  process.exit(1)
}

console.log('8. Creating frontend-deploy.zip...')
const zipPath = path.join(rootDir, 'frontend-deploy.zip')
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath)
}

execSync(`powershell -Command "Compress-Archive -Path '${deployDir}/*' -DestinationPath '${zipPath}' -Force"`, {
  cwd: rootDir,
  stdio: 'inherit'
})

console.log(`\n🎉 SUCCESS! Complete Self-Contained Frontend Package created at:\n  Folder: ${deployDir}\n  Zip: ${zipPath}\n`)
