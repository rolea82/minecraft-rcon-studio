const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const releaseDir = path.join(rootDir, 'release');
const pkg = require('../package.json');

const exeName = `Minecraft RCON Studio ${pkg.version}.exe`;
const exePath = path.join(releaseDir, exeName);
const zipName = `Minecraft-RCON-Studio-v${pkg.version}-Windows.zip`;
const zipPath = path.join(releaseDir, zipName);

if (!fs.existsSync(exePath)) {
  // Check alternative name
  const altPath = path.join(rootDir, 'Minecraft RCON Studio.exe');
  if (fs.existsSync(altPath)) {
    console.log(`Comprimiendo ${altPath} en ${zipPath}...`);
    execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${altPath}' -DestinationPath '${zipPath}' -Force"`, { stdio: 'inherit' });
    console.log(`✓ Archivo ZIP creado con éxito en: release/${zipName}`);
    process.exit(0);
  }
  console.error(`Error: No se encontró el ejecutable en ${exePath}`);
  process.exit(1);
}

console.log(`Comprimiendo ${exeName} en ${zipName}...`);
try {
  execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${exePath}' -DestinationPath '${zipPath}' -Force"`, { stdio: 'inherit' });
  console.log(`✓ Archivo ZIP creado exitosamente en: release/${zipName}`);
} catch (err) {
  console.error('Error al crear el archivo ZIP:', err.message);
  process.exit(1);
}
