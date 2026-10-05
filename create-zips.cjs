const fs = require('fs');
const path = require('path');
const archiver = require('d:/Sai Tech/A1tex/backend/node/node_modules/archiver');

const rootDir = 'd:/Sai Tech/A1tex';

function zipDirectory(sourceDir, outPath, filter) {
  return new Promise((resolve, reject) => {
    console.log(`Creating ${path.basename(outPath)}...`);
    const output = fs.createWriteStream(outPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
      console.log(`✓ ${path.basename(outPath)} created successfully (${sizeMB} MB, ${archive.pointer()} bytes)`);
      resolve();
    });

    archive.on('error', (err) => reject(err));
    archive.pipe(output);

    archive.glob('**/*', {
      cwd: sourceDir,
      dot: true,
      ignore: filter || []
    });

    archive.finalize();
  });
}

function zipFiles(filesMap, outPath) {
  return new Promise((resolve, reject) => {
    console.log(`Creating ${path.basename(outPath)}...`);
    const output = fs.createWriteStream(outPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
      console.log(`✓ ${path.basename(outPath)} created successfully (${sizeMB} MB, ${archive.pointer()} bytes)`);
      resolve();
    });

    archive.on('error', (err) => reject(err));
    archive.pipe(output);

    for (const item of filesMap) {
      if (item.type === 'file') {
        archive.file(item.src, { name: item.dest });
      } else if (item.type === 'dir') {
        archive.directory(item.src, item.dest);
      }
    }

    archive.finalize();
  });
}

async function main() {
  console.log('========================================================');
  console.log('Generating Clean Production Zips for Webuzo Deployment');
  console.log('========================================================\n');

  // Ensure .htaccess is in backend/panel/dist
  if (fs.existsSync(path.join(rootDir, 'backend/panel/.htaccess'))) {
    fs.copyFileSync(
      path.join(rootDir, 'backend/panel/.htaccess'),
      path.join(rootDir, 'backend/panel/dist/.htaccess')
    );
  }

  // 1. Backend Build Zip
  // Contains dist/server.js, app.js, package.json, package-lock.json, .htaccess, .env, uploads directory
  const backendItems = [
    { type: 'file', src: path.join(rootDir, 'backend/node/dist/server.js'), dest: 'dist/server.js' },
    { type: 'file', src: path.join(rootDir, 'backend/node/app.js'), dest: 'app.js' },
    { type: 'file', src: path.join(rootDir, 'backend/node/package.json'), dest: 'package.json' },
  ];
  if (fs.existsSync(path.join(rootDir, 'backend/node/package-lock.json'))) {
    backendItems.push({ type: 'file', src: path.join(rootDir, 'backend/node/package-lock.json'), dest: 'package-lock.json' });
  }
  if (fs.existsSync(path.join(rootDir, 'backend/node/.htaccess'))) {
    backendItems.push({ type: 'file', src: path.join(rootDir, 'backend/node/.htaccess'), dest: '.htaccess' });
  }
  if (fs.existsSync(path.join(rootDir, 'backend/node/.env.production'))) {
    backendItems.push({ type: 'file', src: path.join(rootDir, 'backend/node/.env.production'), dest: '.env' });
    backendItems.push({ type: 'file', src: path.join(rootDir, 'backend/node/.env.production'), dest: '.env.production' });
  } else if (fs.existsSync(path.join(rootDir, 'backend/node/.env'))) {
    backendItems.push({ type: 'file', src: path.join(rootDir, 'backend/node/.env'), dest: '.env' });
  }
  if (fs.existsSync(path.join(rootDir, 'backend/node/uploads'))) {
    backendItems.push({ type: 'dir', src: path.join(rootDir, 'backend/node/uploads'), dest: 'uploads' });
  }
  if (fs.existsSync(path.join(rootDir, 'backend/node/assets'))) {
    backendItems.push({ type: 'dir', src: path.join(rootDir, 'backend/node/assets'), dest: 'assets' });
  }
  await zipFiles(backendItems, path.join(rootDir, '1-backend-build.zip'));

  // 2. Admin Panel Build Zip (Vite React static distribution + .htaccess for SPA routing)
  const panelDist = path.join(rootDir, 'backend/panel/dist');
  await zipDirectory(panelDist, path.join(rootDir, '2-admin-panel-build.zip'));

  // 3. Frontend Standalone Build Zip (Next.js 14 Standalone + .htaccess)
  const frontendDeployDir = path.join(rootDir, 'frontend/frontend-deploy');
  await zipDirectory(frontendDeployDir, path.join(rootDir, '3-frontend-build.zip'));

  console.log('\n========================================================');
  console.log('ALL 3 WEBUZO BUILDS PACKAGED AND READY IN:');
  console.log('1. ' + path.join(rootDir, '1-backend-build.zip'));
  console.log('2. ' + path.join(rootDir, '2-admin-panel-build.zip'));
  console.log('3. ' + path.join(rootDir, '3-frontend-build.zip'));
  console.log('========================================================');
}

main().catch(console.error);
