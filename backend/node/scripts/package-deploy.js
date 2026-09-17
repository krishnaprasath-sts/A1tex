import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const deployDir = path.resolve(rootDir, 'backend-deploy')

console.log('1. Bundling backend with esbuild into single dist/server.js...')
execSync('npm run build', { cwd: rootDir, stdio: 'inherit' })

console.log('2. Preparing backend-deploy directory...')
if (fs.existsSync(deployDir)) {
  fs.rmSync(deployDir, { recursive: true, force: true })
}
fs.mkdirSync(deployDir, { recursive: true })

// Copy dist
console.log('3. Copying dist...')
fs.cpSync(path.join(rootDir, 'dist'), path.join(deployDir, 'dist'), { recursive: true })

// Copy uploads (create directory if not exists)
console.log('4. Copying uploads...')
const uploadsDir = path.join(rootDir, 'uploads')
if (fs.existsSync(uploadsDir)) {
  fs.cpSync(uploadsDir, path.join(deployDir, 'uploads'), { recursive: true })
} else {
  fs.mkdirSync(path.join(deployDir, 'uploads'), { recursive: true })
}

// Copy package files
console.log('5. Copying package configs...')
fs.copyFileSync(path.join(rootDir, 'package.json'), path.join(deployDir, 'package.json'))
if (fs.existsSync(path.join(rootDir, 'package-lock.json'))) {
  fs.copyFileSync(path.join(rootDir, 'package-lock.json'), path.join(deployDir, 'package-lock.json'))
}

// Copy .env with live configuration
console.log('6. Writing production .env...')
const envContent = fs.readFileSync(path.join(rootDir, '.env'), 'utf-8')
fs.writeFileSync(path.join(deployDir, '.env'), envContent, 'utf-8')
fs.writeFileSync(path.join(deployDir, '.env.production'), envContent, 'utf-8')

// Copy .htaccess
if (fs.existsSync(path.join(rootDir, '.htaccess'))) {
  fs.copyFileSync(path.join(rootDir, '.htaccess'), path.join(deployDir, '.htaccess'))
}

// Verify critical files
const criticalFiles = [
  'dist/server.js',
  'package.json',
  '.env'
]

console.log('7. Verifying critical files...')
let allOk = true
for (const file of criticalFiles) {
  const p = path.join(deployDir, file)
  if (fs.existsSync(p)) {
    console.log(`  ✓ ${file} present (${fs.statSync(p).size} bytes)`)
  } else {
    console.error(`  ✗ MISSING: ${file}`)
    allOk = false
  }
}

if (!allOk) {
  console.error('Packaging failed due to missing files.')
  process.exit(1)
}

console.log('8. Creating backend-deploy.zip...')
const zipPath = path.join(rootDir, 'backend-deploy.zip')
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath)
}

// Use powershell to compress backend-deploy folder contents
execSync(`powershell -Command "Compress-Archive -Path '${deployDir}/*' -DestinationPath '${zipPath}' -Force"`, {
  cwd: rootDir,
  stdio: 'inherit'
})

console.log(`\n🎉 SUCCESS! Standalone deployment package created at:\n  Folder: ${deployDir}\n  Zip: ${zipPath}\n`)
