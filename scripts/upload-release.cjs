const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// 1. Get credentials via Git Credential Manager
function getGitHubCredentials() {
  const input = "protocol=https\nhost=github.com\n\n";
  const output = execSync('git credential fill', { input, encoding: 'utf8' });
  const lines = output.split('\n');
  let username = '';
  let token = '';

  for (const line of lines) {
    if (line.startsWith('username=')) username = line.slice('username='.length).trim();
    if (line.startsWith('password=')) token = line.slice('password='.length).trim();
  }

  if (!token) {
    throw new Error('No se pudo obtener el token de autenticación de GitHub.');
  }
  return { username, token };
}

// Helper: Make GitHub API Request
function githubApiRequest(method, endpoint, token, body = null, isUpload = false) {
  return new Promise((resolve, reject) => {
    const host = isUpload ? 'uploads.github.com' : 'api.github.com';
    const options = {
      hostname: host,
      path: endpoint,
      method,
      headers: {
        'User-Agent': 'MinecraftRconStudio-Uploader',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    };

    if (body && typeof body === 'object' && !Buffer.isBuffer(body)) {
      body = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`GitHub API error ${res.statusCode}: ${parsed.message || data}`));
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP error ${res.statusCode}: ${data}`));
          }
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// Upload file stream to GitHub release asset
function uploadAssetFile(uploadUrlTemplate, filePath, fileName, contentType, token) {
  return new Promise((resolve, reject) => {
    // uploadUrlTemplate format: "https://uploads.github.com/repos/owner/repo/releases/id/assets{?name,label}"
    const cleanUrl = uploadUrlTemplate.replace(/\{.*\}/, '');
    const url = new URL(`${cleanUrl}?name=${encodeURIComponent(fileName)}`);
    const fileStats = fs.statSync(filePath);
    const totalBytes = fileStats.size;

    console.log(`Subiendo ${fileName} (${Math.round(totalBytes / (1024 * 1024))} MB)...`);

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'User-Agent': 'MinecraftRconStudio-Uploader',
        'Authorization': `Bearer ${token}`,
        'Content-Type': contentType,
        'Content-Length': totalBytes,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`Asset upload failed (${res.statusCode}): ${parsed.message || data}`));
          }
        } catch (_) {
          reject(new Error(`Asset upload response error: ${data}`));
        }
      });
    });

    req.on('error', reject);

    const fileStream = fs.createReadStream(filePath);
    let uploaded = 0;
    fileStream.on('data', (chunk) => {
      uploaded += chunk.length;
      const pct = Math.round((uploaded / totalBytes) * 100);
      process.stdout.write(`\rProgreso de subida: ${pct}% (${Math.round(uploaded / (1024 * 1024))} MB / ${Math.round(totalBytes / (1024 * 1024))} MB)`);
    });

    fileStream.on('end', () => {
      console.log('\nFinalizando subida en GitHub...');
    });

    fileStream.pipe(req);
  });
}

async function main() {
  const repoOwner = 'rolea82';
  const repoName = 'minecraft-rcon-studio';
  const tag = 'v2.0.0';

  console.log('1. Obteniendo credenciales de GitHub...');
  const { token } = getGitHubCredentials();

  console.log(`2. Comprobando Release para el tag ${tag}...`);
  let release = null;
  try {
    release = await githubApiRequest('GET', `/repos/${repoOwner}/${repoName}/releases/tags/${tag}`, token);
    console.log(`Release existente encontrada: "${release.name}" (ID: ${release.id})`);
  } catch (err) {
    if (err.message.includes('404')) {
      console.log(`La release para ${tag} no existe aún. Creándola...`);
      release = await githubApiRequest('POST', `/repos/${repoOwner}/${repoName}/releases`, token, {
        tag_name: tag,
        name: `Minecraft RCON Studio v2.0.0`,
        body: `## ⛏️ Minecraft RCON Studio & Server Manager v2.0.0\n\n### ✨ Novedades Principales:\n* **📥 Descargador Oficial de Versiones (Mojang API):** Descarga cualquier versión de Minecraft (desde 1.21.4 hasta versiones clásicas).\n* **📁 Configuración Automática:** Creación de carpeta, aceptación automática del EULA (\`eula.txt -> eula=true\`) y generación de \`server.properties\` con RCON y contraseña personalizada.\n* **⚡ Optimizaciones Anti-Lag:** Distancia de simulación a 5 chunks y parámetros óptimos de red.\n* **🚀 Script start.bat:** Con asignación de RAM y flags de Java preconfigurados.\n* **📟 Consola RCON Interactiva:** Terminal en tiempo real con colores de Minecraft, historial y atajos rápidos.\n* **👥 Jugadores & Reglas de Juego:** Control total de permisos, modos de juego y gamerules con consejos explicativos.\n\n### 📦 Descarga:\n* Descarga el archivo **\`Minecraft-RCON-Studio-v2.0.0-Windows.zip\`** o **\`Minecraft RCON Studio.exe\`** adjuntos a continuación, descomprime o ejecuta con doble clic.`,
        draft: false,
        prerelease: false,
      });
      console.log(`✓ Release creada exitosamente (ID: ${release.id})`);
    } else {
      throw err;
    }
  }

  // 3. Upload assets
  const zipPath = path.join(__dirname, '../release/Minecraft-RCON-Studio-v2.0.0-Windows.zip');
  const exePath = path.join(__dirname, '../release/Minecraft RCON Studio 2.0.0.exe');

  if (fs.existsSync(zipPath)) {
    // Check if asset already exists
    const existingAsset = release.assets?.find(a => a.name === 'Minecraft-RCON-Studio-v2.0.0-Windows.zip');
    if (existingAsset) {
      console.log(`Borrando asset anterior "${existingAsset.name}" para reemplazarlo...`);
      await githubApiRequest('DELETE', `/repos/${repoOwner}/${repoName}/releases/assets/${existingAsset.id}`, token);
    }
    const uploadedZip = await uploadAssetFile(release.upload_url, zipPath, 'Minecraft-RCON-Studio-v2.0.0-Windows.zip', 'application/zip', token);
    console.log(`✓ ZIP subido exitosamente: ${uploadedZip.browser_download_url}`);
  }

  if (fs.existsSync(exePath)) {
    const existingExe = release.assets?.find(a => a.name === 'Minecraft-RCON-Studio.exe');
    if (existingExe) {
      console.log(`Borrando asset anterior "${existingExe.name}" para reemplazarlo...`);
      await githubApiRequest('DELETE', `/repos/${repoOwner}/${repoName}/releases/assets/${existingExe.id}`, token);
    }
    const uploadedExe = await uploadAssetFile(release.upload_url, exePath, 'Minecraft-RCON-Studio.exe', 'application/vnd.microsoft.portable-executable', token);
    console.log(`✓ EXE subido exitosamente: ${uploadedExe.browser_download_url}`);
  }

  console.log('\n======================================================');
  console.log(`🎉 ¡Publicación completada con éxito!`);
  console.log(`URL de la Release: ${release.html_url}`);
  console.log('======================================================');
}

main().catch(err => {
  console.error('\nError durante la publicación:', err.message);
  process.exit(1);
});
