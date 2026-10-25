const { app, BrowserWindow, ipcMain, shell, dialog, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const net = require('net');
const { spawn } = require('child_process');
const { Rcon } = require('rcon-client');

let mainWindow = null;
let currentRcon = null;
let pingInterval = null;
let tray = null;
let isQuitting = false;
let userSettings = { closeAction: 'ask' }; // 'ask' | 'minimize' | 'quit'

// Track active running server processes: normalized folderPath -> { process, folderPath, name, logs }
const activeServers = new Map();

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'app-settings.json');
}

function loadSettings() {
  try {
    const p = getSettingsPath();
    if (fs.existsSync(p)) {
      userSettings = { ...userSettings, ...JSON.parse(fs.readFileSync(p, 'utf8')) };
    }
  } catch (_) {}
}

function saveSettings(newSettings) {
  userSettings = { ...userSettings, ...newSettings };
  try {
    fs.writeFileSync(getSettingsPath(), JSON.stringify(userSettings, null, 2), 'utf8');
  } catch (_) {}
}

function getTrayIcon() {
  const iconPath = path.join(__dirname, 'tray-icon.png');
  if (fs.existsSync(iconPath)) {
    return nativeImage.createFromPath(iconPath);
  }
  return nativeImage.createEmpty();
}

function showMainWindow() {
  if (!mainWindow) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function updateTrayMenu() {
  if (!tray) return;

  const runningCount = activeServers.size;
  const template = [
    {
      label: 'Abrir Minecraft RCON Studio',
      click: () => showMainWindow(),
    },
    { type: 'separator' },
    {
      label: runningCount > 0 
        ? `🟢 Servidores activos: ${runningCount}`
        : '⚪ Ningún servidor en ejecución',
      enabled: false,
    },
  ];

  if (runningCount > 0) {
    template.push({
      label: '🛑 Detener todos los servidores',
      click: () => {
        for (const [normPath, srv] of activeServers.entries()) {
          try { srv.process.stdin.write('stop\n'); } catch (_) { srv.process.kill(); }
        }
      },
    });
  }

  template.push(
    { type: 'separator' },
    {
      label: 'Salir completamente',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    }
  );

  tray.setContextMenu(Menu.buildFromTemplate(template));
}

function createTray() {
  if (tray) return;
  tray = new Tray(getTrayIcon());
  tray.setToolTip('Minecraft RCON Studio & Server Manager');
  updateTrayMenu();

  tray.on('double-click', () => {
    showMainWindow();
  });
}

function isPortInUse(port, host = '127.0.0.1', timeoutMs = 400) {
  return new Promise((resolve) => {
    if (!port || port <= 0 || port > 65535) return resolve(false);
    const client = new net.Socket();
    client.setTimeout(timeoutMs);
    client.once('connect', () => {
      client.destroy();
      resolve(true);
    });
    client.once('timeout', () => {
      client.destroy();
      resolve(false);
    });
    client.once('error', () => {
      client.destroy();
      resolve(false);
    });
    client.connect(port, host);
  });
}

let connectionState = {
  connected: false,
  isSimulated: false,
  host: '127.0.0.1',
  port: 25575,
  latencyMs: 0,
  error: null,
};

// Simulated server state for testing without an active MC server
let simulatedServer = {
  players: ['Alex', 'Steve', 'LittleBob', 'Herobrine'],
  maxPlayers: 20,
  difficulty: 'normal',
  time: 6000,
  weather: 'clear',
  gamerules: {
    keepInventory: 'false',
    mobGriefing: 'true',
    doDaylightCycle: 'true',
    doWeatherCycle: 'true',
    doFireTick: 'true',
    doMobSpawning: 'true',
    randomTickSpeed: '3',
    maxEntityCramming: '24',
    spawnRadius: '10',
    naturalRegeneration: 'true',
    showDeathMessages: 'true',
    doImmediateRespawn: 'false',
    playersSleepingPercentage: '100',
    doInsomnia: 'true',
  },
  whitelist: ['Alex', 'Steve', 'LittleBob'],
  whitelistEnabled: false,
  ops: ['LittleBob'],
};

function broadcastStatus() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('rcon:status-changed', { ...connectionState });
  }
}

function stopPing() {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
}

function startPing() {
  stopPing();
  pingInterval = setInterval(async () => {
    if (connectionState.connected && currentRcon && !connectionState.isSimulated) {
      const start = Date.now();
      try {
        await currentRcon.send('seed');
        connectionState.latencyMs = Date.now() - start;
        broadcastStatus();
      } catch (err) {
        console.warn('Ping failed, connection likely lost:', err.message);
        disconnectRconInternal('Conexión perdida con el servidor.');
      }
    } else if (connectionState.isSimulated) {
      connectionState.latencyMs = Math.floor(Math.random() * 4) + 1; // 1-5ms
      broadcastStatus();
    }
  }, 10000);
}

async function disconnectRconInternal(reason = null) {
  stopPing();
  if (currentRcon) {
    try {
      await currentRcon.end();
    } catch (_) {}
    currentRcon = null;
  }
  connectionState.connected = false;
  connectionState.isSimulated = false;
  connectionState.latencyMs = 0;
  if (reason) {
    connectionState.error = reason;
  }
  broadcastStatus();
}

// Handle simulated commands
function handleSimulatedCommand(rawCmd) {
  const cmd = rawCmd.trim().replace(/^\//, '');
  const parts = cmd.split(/\s+/);
  const action = parts[0]?.toLowerCase();

  if (action === 'list') {
    const listStr = simulatedServer.players.join(', ');
    return `Hay ${simulatedServer.players.length} de ${simulatedServer.maxPlayers} jugadores conectados:\n${listStr}`;
  }

  if (action === 'gamerule') {
    if (parts.length === 1) {
      return Object.entries(simulatedServer.gamerules)
        .map(([k, v]) => `${k} = ${v}`)
        .join('\n');
    }
    const rule = parts[1];
    if (parts.length === 2) {
      const val = simulatedServer.gamerules[rule] ?? 'false';
      return `La regla de juego ${rule} actualmente está establecida en: ${val}`;
    }
    const val = parts.slice(2).join(' ');
    simulatedServer.gamerules[rule] = val;
    return `Regla de juego ${rule} establecida en: ${val}`;
  }

  if (action === 'time') {
    const sub = parts[1]?.toLowerCase();
    if (sub === 'set') {
      const t = parts[2];
      simulatedServer.time = t === 'day' ? 1000 : t === 'noon' ? 6000 : t === 'night' ? 13000 : t === 'midnight' ? 18000 : parseInt(t) || 6000;
      return `Hora establecida en ${simulatedServer.time}`;
    }
    if (sub === 'query') {
      return `La hora actual es ${simulatedServer.time}`;
    }
  }

  if (action === 'weather') {
    const w = parts[1]?.toLowerCase() || 'clear';
    simulatedServer.weather = w;
    return `El clima ha cambiado a ${w === 'clear' ? 'despejado' : w === 'rain' ? 'lluvioso' : 'tormenta'}`;
  }

  if (action === 'difficulty') {
    if (parts.length > 1) {
      simulatedServer.difficulty = parts[1].toLowerCase();
      return `La dificultad del juego se ha establecido en ${simulatedServer.difficulty}`;
    }
    return `La dificultad actual es ${simulatedServer.difficulty}`;
  }

  if (action === 'say') {
    const msg = parts.slice(1).join(' ');
    return `[Server] ${msg}`;
  }

  if (action === 'save-all') {
    return 'Guardando el juego (esto puede tardar un momento)...\nJuego guardado correctamente.';
  }

  if (action === 'reload') {
    return 'Recargando paquetes de datos y recetas del servidor... ¡Listo!';
  }

  if (action === 'whitelist') {
    const sub = parts[1]?.toLowerCase();
    if (sub === 'on') {
      simulatedServer.whitelistEnabled = true;
      return 'La lista blanca ahora está activada.';
    }
    if (sub === 'off') {
      simulatedServer.whitelistEnabled = false;
      return 'La lista blanca ahora está desactivada.';
    }
    if (sub === 'list') {
      return `Hay ${simulatedServer.whitelist.length} jugadores en la lista blanca: ${simulatedServer.whitelist.join(', ')}`;
    }
    if (sub === 'add') {
      const p = parts[2];
      if (p && !simulatedServer.whitelist.includes(p)) simulatedServer.whitelist.push(p);
      return `Se ha añadido a ${p} a la lista blanca.`;
    }
    if (sub === 'remove') {
      const p = parts[2];
      simulatedServer.whitelist = simulatedServer.whitelist.filter(x => x !== p);
      return `Se ha eliminado a ${p} de la lista blanca.`;
    }
  }

  if (action === 'op') {
    const p = parts[1];
    if (p && !simulatedServer.ops.includes(p)) simulatedServer.ops.push(p);
    return `Se otorgaron permisos de operador a ${p}.`;
  }

  if (action === 'deop') {
    const p = parts[1];
    simulatedServer.ops = simulatedServer.ops.filter(x => x !== p);
    return `Se retiraron los permisos de operador a ${p}.`;
  }

  if (action === 'kick') {
    const p = parts[1];
    const r = parts.slice(2).join(' ') || 'Expulsado por un administrador';
    simulatedServer.players = simulatedServer.players.filter(x => x.toLowerCase() !== p?.toLowerCase());
    return `Expulsado ${p}: ${r}`;
  }

  if (action === 'ban') {
    const p = parts[1];
    simulatedServer.players = simulatedServer.players.filter(x => x.toLowerCase() !== p?.toLowerCase());
    return `Se ha baneado a ${p} del servidor.`;
  }

  if (action === 'kill') {
    const target = parts[1] || '@s';
    if (target.includes('item')) {
      return 'Eliminados 48 objetos caídos en el suelo.';
    }
    return `Se ha eliminado la entidad ${target}.`;
  }

  if (action === 'seed') {
    return 'Semilla del mundo: [7381927491028472910]';
  }

  if (action === 'help') {
    return `Comandos disponibles en modo simulado:
/help, /list, /gamerule, /time, /weather, /difficulty, /whitelist, /op, /deop, /kick, /ban, /save-all, /reload, /say, /kill`;
  }

  return `Comando ejecutado con éxito: "${rawCmd}"`;
}

// -------------------------------------------------------------
// Version 2: Helpers for Mojang Manifest, Downloads & Server Setup
// -------------------------------------------------------------
function getRootWorkspaceDir() {
  // If running as a portable executable built with electron-builder on Windows:
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    return process.env.PORTABLE_EXECUTABLE_DIR;
  }
  if (app.isPackaged) {
    return path.dirname(process.execPath);
  }
  return path.join(__dirname, '..');
}

// Security: Verify that a URL is strictly an official Mojang endpoint
function isOfficialMojangUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'piston-meta.mojang.com' ||
      host === 'piston-data.mojang.com' ||
      host === 'launchermeta.mojang.com' ||
      host === 'launcher.mojang.com' ||
      host.endsWith('.mojang.com')
    );
  } catch (_) {
    return false;
  }
}

// Security: Sanitize folder name against path traversal
function sanitizeFolderName(rawName, fallback = 'servidor') {
  if (!rawName || typeof rawName !== 'string') return fallback;
  // Strip path traversal and dangerous characters
  const clean = path.basename(rawName).replace(/[^a-zA-Z0-9_\-\.]/g, '_').replace(/^\.+/, '').trim();
  return clean || fallback;
}

// Security: Verify that a target path is strictly located within the allowed base workspace
function isPathInsideBaseDir(targetPath, baseDir) {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedBase = path.resolve(baseDir);
  return resolvedTarget.startsWith(resolvedBase + path.sep) || resolvedTarget === resolvedBase;
}

function fetchJson(url) {
  if (!isOfficialMojangUrl(url)) {
    return Promise.reject(new Error('URL no autorizada: Solo se permiten endpoints oficiales de Mojang.'));
  }

  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'MinecraftRconStudio/2.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJson(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP error ${res.statusCode}`));
      }
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(rawData));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function downloadFileWithProgress(url, destPath, onProgress) {
  if (!isOfficialMojangUrl(url)) {
    return Promise.reject(new Error('URL de descarga no autorizada: Solo se permiten servidores oficiales de Mojang.'));
  }

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    
    function makeRequest(currentUrl) {
      if (!isOfficialMojangUrl(currentUrl)) {
        file.close();
        fs.unlink(destPath, () => {});
        return reject(new Error('Redirección no autorizada fuera del dominio de Mojang.'));
      }

      https.get(currentUrl, { headers: { 'User-Agent': 'MinecraftRconStudio/2.0' } }, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          return makeRequest(response.headers.location);
        }
        if (response.statusCode !== 200) {
          file.close();
          fs.unlink(destPath, () => {});
          return reject(new Error(`Error de descarga HTTP ${response.statusCode}`));
        }

        const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
        let downloadedBytes = 0;

        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          if (totalBytes > 0 && onProgress) {
            const percent = Math.min(100, Math.round((downloadedBytes / totalBytes) * 100));
            onProgress({ downloadedBytes, totalBytes, percent });
          }
        });

        response.pipe(file);

        file.on('finish', () => {
          file.close(() => resolve());
        });
      }).on('error', (err) => {
        file.close();
        fs.unlink(destPath, () => {});
        reject(err);
      });
    }

    makeRequest(url);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 870,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#121417',
    show: false,
    frame: true,
    titleBarStyle: 'default',
    title: 'Minecraft RCON Studio & Server Manager v2.0',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const distHtml = path.join(__dirname, '../dist/index.html');
  const isDev = process.env.VITE_DEV === 'true';

  // Security: block unauthorized in-app navigation
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const isDevUrl = navigationUrl.startsWith('http://localhost:5173');
    const isFileUrl = navigationUrl.startsWith('file://');
    if (!isDevUrl && !isFileUrl) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });

  // Security: open external links in default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      if (fs.existsSync(distHtml)) {
        mainWindow.loadFile(distHtml);
      }
    });
  } else if (fs.existsSync(distHtml)) {
    mainWindow.loadFile(distHtml);
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', async (e) => {
    if (isQuitting) return;

    if (userSettings.closeAction === 'minimize') {
      e.preventDefault();
      mainWindow.hide();
      return;
    }

    if (userSettings.closeAction === 'quit' && activeServers.size === 0) {
      isQuitting = true;
      return;
    }

    e.preventDefault();

    const runningCount = activeServers.size;
    let message = '¿Qué deseas hacer al cerrar la aplicación?';
    let detail = 'Puedes minimizar la aplicación a la bandeja del sistema (junto al reloj) para que no moleste en la barra de tareas, o cerrarla por completo.';

    if (runningCount > 0) {
      message = `¡Hay ${runningCount} servidor(es) de Minecraft en ejecución!`;
      detail = 'Si cierras la aplicación por completo, los servidores se apagarán de forma segura. Si la minimizas a la bandeja del sistema, seguirán funcionando en segundo plano.';
    }

    const { response, checkboxChecked } = await dialog.showMessageBox(mainWindow, {
      type: runningCount > 0 ? 'warning' : 'question',
      buttons: ['Minimizar a la Bandeja', 'Cerrar Completamente', 'Cancelar'],
      defaultId: 0,
      cancelId: 2,
      title: 'Minecraft RCON Studio',
      message,
      detail,
      checkboxLabel: 'Recordar mi elección para siempre',
      checkboxChecked: false,
      noLink: true,
    });

    if (response === 0) {
      // Minimizar a la bandeja
      if (checkboxChecked) saveSettings({ closeAction: 'minimize' });
      mainWindow.hide();
    } else if (response === 1) {
      // Cerrar completamente
      if (checkboxChecked) saveSettings({ closeAction: 'quit' });
      isQuitting = true;
      for (const [normPath, srv] of activeServers.entries()) {
        try {
          srv.process.stdin.write('stop\n');
        } catch (_) {
          srv.process.kill();
        }
      }
      setTimeout(() => {
        app.quit();
      }, 700);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    disconnectRconInternal();
  });
}

// -------------------------------------------------------------
// IPC Handlers: RCON Connection
// -------------------------------------------------------------
ipcMain.handle('rcon:getStatus', () => ({ ...connectionState }));

ipcMain.handle('rcon:connect', async (event, config) => {
  const { host = '127.0.0.1', port = 25575, password = '', isSimulated = false } = config;

  if (isSimulated) {
    await disconnectRconInternal();
    connectionState = {
      connected: true,
      isSimulated: true,
      host: 'Servidor Simulado',
      port: 25575,
      latencyMs: 2,
      error: null,
    };
    startPing();
    broadcastStatus();
    return { success: true, message: 'Conectado al servidor de pruebas simulado.' };
  }

  try {
    await disconnectRconInternal();

    const startTime = Date.now();
    const rcon = await Rcon.connect({
      host,
      port: Number(port),
      password,
      timeout: 6000,
    });

    currentRcon = rcon;
    const latency = Date.now() - startTime;

    rcon.on('error', (err) => {
      console.error('RCON Client error event:', err.message);
      disconnectRconInternal(`Error de socket RCON: ${err.message}`);
    });

    rcon.on('end', () => {
      disconnectRconInternal('El servidor cerró la conexión RCON.');
    });

    connectionState = {
      connected: true,
      isSimulated: false,
      host,
      port: Number(port),
      latencyMs: latency,
      error: null,
    };

    startPing();
    broadcastStatus();

    return { success: true, message: `Conectado exitosamente a ${host}:${port}` };
  } catch (error) {
    connectionState = {
      connected: false,
      isSimulated: false,
      host,
      port: Number(port),
      latencyMs: 0,
      error: error.message || 'Error de conexión desconocido',
    };
    broadcastStatus();
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rcon:disconnect', async () => {
  await disconnectRconInternal();
  return { success: true };
});

ipcMain.handle('rcon:send', async (event, command) => {
  if (!connectionState.connected) {
    return { success: false, error: 'No hay conexión activa con el servidor RCON.' };
  }

  const cleanCmd = (command || '').trim();
  if (!cleanCmd) {
    return { success: false, error: 'Comando vacío' };
  }

  if (connectionState.isSimulated) {
    const res = handleSimulatedCommand(cleanCmd);
    return { success: true, response: res };
  }

  if (!currentRcon) {
    return { success: false, error: 'Instancia RCON no disponible.' };
  }

  try {
    const start = Date.now();
    const cmdToSend = cleanCmd.startsWith('/') ? cleanCmd.slice(1) : cleanCmd;
    const rawResponse = await currentRcon.send(cmdToSend);
    connectionState.latencyMs = Date.now() - start;

    return {
      success: true,
      response: rawResponse || 'Comando ejecutado sin respuesta visual del servidor.',
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// -------------------------------------------------------------
// IPC Handlers: Version 2 Official Server Installer & Manager
// -------------------------------------------------------------

// Fetch official versions manifest from Mojang
ipcMain.handle('installer:getVersions', async () => {
  try {
    const manifestUrl = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';
    const data = await fetchJson(manifestUrl);
    return {
      success: true,
      latest: data.latest,
      versions: data.versions.map(v => ({
        id: v.id,
        type: v.type, // 'release' | 'snapshot'
        url: v.url,
        releaseTime: v.releaseTime,
      })),
    };
  } catch (err) {
    console.error('Failed to fetch Mojang manifest:', err);
    // Return curated fallback offline catalog
    return {
      success: true,
      isFallback: true,
      latest: { release: '1.21.4', snapshot: '1.21.4' },
      versions: [
        { id: '1.21.4', type: 'release', releaseTime: '2024-12-03' },
        { id: '1.21.3', type: 'release', releaseTime: '2024-10-23' },
        { id: '1.21.1', type: 'release', releaseTime: '2024-08-08' },
        { id: '1.21', type: 'release', releaseTime: '2024-06-13' },
        { id: '1.20.6', type: 'release', releaseTime: '2024-04-29' },
        { id: '1.20.4', type: 'release', releaseTime: '2023-12-07' },
        { id: '1.20.2', type: 'release', releaseTime: '2023-09-21' },
        { id: '1.20.1', type: 'release', releaseTime: '2023-06-12' },
        { id: '1.19.4', type: 'release', releaseTime: '2023-03-14' },
        { id: '1.18.2', type: 'release', releaseTime: '2022-02-28' },
        { id: '1.16.5', type: 'release', releaseTime: '2021-01-15' },
        { id: '1.12.2', type: 'release', releaseTime: '2017-09-18' },
      ],
    };
  }
});

// Download and setup official server
ipcMain.handle('installer:downloadAndSetup', async (event, options) => {
  const {
    versionId,
    versionUrl,
    folderName = `servidor_${versionId}`,
    customInstallPath = null,
    rconPassword = '1234',
    rconPort = 25575,
    serverPort = 25565,
    ramGb = 4,
    acceptEula = true,
    optimizeProperties = true,
    onlineMode = true,
  } = options;

  const baseDir = (customInstallPath && fs.existsSync(customInstallPath))
    ? path.resolve(customInstallPath)
    : getRootWorkspaceDir();

  // Security: sanitize folder name to prevent path traversal
  const cleanFolder = sanitizeFolderName(folderName || `servidor_${versionId}`);
  const targetDir = path.join(baseDir, cleanFolder);

  if (!isPathInsideBaseDir(targetDir, baseDir)) {
    return {
      success: false,
      error: 'Ruta no permitida por seguridad: La carpeta debe residir dentro del directorio del proyecto.',
    };
  }

  try {
    // Step 1: Create target directory
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    mainWindow?.webContents.send('installer:progress', {
      percent: 5,
      statusText: `Consultando datos oficiales de Minecraft ${versionId}...`,
    });

    // Step 2: Fetch package JSON to get download server url
    let serverJarUrl = null;
    let expectedSize = 0;

    if (versionUrl) {
      const pkg = await fetchJson(versionUrl);
      if (pkg.downloads && pkg.downloads.server) {
        serverJarUrl = pkg.downloads.server.url;
        expectedSize = pkg.downloads.server.size || 0;
      }
    }

    if (!serverJarUrl) {
      throw new Error(`La versión ${versionId} no tiene descarga oficial de servidor disponible.`);
    }

    mainWindow?.webContents.send('installer:progress', {
      percent: 10,
      statusText: `Iniciando descarga oficial de server.jar (${Math.round(expectedSize / (1024 * 1024))} MB)...`,
    });

    // Step 3: Download server.jar with progress
    const jarDest = path.join(targetDir, 'server.jar');
    await downloadFileWithProgress(serverJarUrl, jarDest, ({ percent, downloadedBytes, totalBytes }) => {
      // Map 10% - 90%
      const mappedPercent = Math.round(10 + (percent * 0.8));
      mainWindow?.webContents.send('installer:progress', {
        percent: mappedPercent,
        downloadedBytes,
        totalBytes,
        statusText: `Descargando server.jar: ${Math.round(downloadedBytes / (1024 * 1024))} MB de ${Math.round(totalBytes / (1024 * 1024))} MB (${percent}%)`,
      });
    });

    mainWindow?.webContents.send('installer:progress', {
      percent: 92,
      statusText: 'Configurando eula.txt y server.properties...',
    });

    // Step 4: Write eula.txt
    if (acceptEula) {
      const eulaContent = `#By changing the setting below to TRUE you are indicating your agreement to our EULA (https://aka.ms/MinecraftEULA).\n#Generated by Minecraft RCON Studio\neula=true\n`;
      fs.writeFileSync(path.join(targetDir, 'eula.txt'), eulaContent, 'utf8');
    }

    // Step 5: Write server.properties with RCON configured
    let propsContent = `#Minecraft server properties
#Generated by Minecraft RCON Studio v2.0
enable-rcon=true
rcon.port=${rconPort}
rcon.password=${rconPassword}
server-port=${serverPort}
online-mode=${onlineMode !== false}
broadcast-rcon-to-ops=false
motd=Servidor Minecraft ${versionId}
`;

    if (optimizeProperties) {
      propsContent += `
# Optimizaciones anti-lag recomendadas:
simulation-distance=5
view-distance=8
sync-chunk-writes=false
network-compression-threshold=256
entity-broadcast-range-percentage=80
max-tick-time=-1
spawn-protection=0
`;
    }

    fs.writeFileSync(path.join(targetDir, 'server.properties'), propsContent, 'utf8');

    // Step 6: Write start.bat with optimized RAM flags
    const batContent = `@echo off
title Servidor Minecraft ${versionId} (${ramGb}GB RAM)
echo ========================================================
echo   Iniciando Servidor Minecraft ${versionId}
echo   RCON: Puerto ${rconPort} ^| Clave: ${rconPassword}
echo ========================================================
echo.

java -Xms${ramGb}G -Xmx${ramGb}G -XX:+UseG1GC -jar server.jar nogui

echo.
echo Servidor cerrado. Presiona cualquier tecla para salir...
pause >nul
`;
    fs.writeFileSync(path.join(targetDir, 'start.bat'), batContent, 'utf8');

    mainWindow?.webContents.send('installer:progress', {
      percent: 100,
      statusText: '¡Servidor instalado y configurado con éxito!',
    });

    return {
      success: true,
      folderPath: targetDir,
      folderName: cleanFolder,
      versionId,
      rconPassword,
      rconPort,
      serverPort,
      onlineMode: onlineMode !== false,
    };
  } catch (error) {
    console.error('Error in installer:downloadAndSetup:', error);
    return {
      success: false,
      error: error.message,
    };
  }
});

// Open folder in Windows explorer
ipcMain.handle('installer:openFolder', async (event, folderPath) => {
  try {
    const baseDir = getRootWorkspaceDir();
    if (!folderPath || !fs.existsSync(folderPath) || !isPathInsideBaseDir(folderPath, baseDir)) {
      return { success: false, error: 'Acceso no permitido: La ruta no existe o está fuera del proyecto.' };
    }
    await shell.openPath(folderPath);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Launch server process with integrated piped console (no external CMD window)
ipcMain.handle('installer:launchServer', async (event, folderPath) => {
  try {
    const baseDir = getRootWorkspaceDir();
    if (!folderPath || !fs.existsSync(folderPath) || !isPathInsideBaseDir(folderPath, baseDir)) {
      return { success: false, error: 'Acceso no permitido: Ruta no autorizada.' };
    }

    const normPath = path.resolve(folderPath);
    if (activeServers.has(normPath)) {
      return { success: false, error: 'El servidor ya se encuentra iniciado y en ejecución.' };
    }

    const batPath = path.join(folderPath, 'start.bat');
    if (!fs.existsSync(batPath)) {
      return { success: false, error: 'No se encontró start.bat en la carpeta del servidor.' };
    }

    // Extract java execution line from start.bat or fallback
    let execCmd = 'java -Xms4G -Xmx4G -XX:+UseG1GC -jar server.jar nogui';
    try {
      const batContent = fs.readFileSync(batPath, 'utf8');
      const foundJava = batContent.split('\n').find((l) => l.trim().startsWith('java '));
      if (foundJava) execCmd = foundJava.trim();
    } catch (_) {}

    // Spawn via cmd.exe without 'start' so all I/O is piped directly into Electron
    const child = spawn('cmd.exe', ['/c', execCmd], {
      cwd: folderPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    const serverEntry = {
      process: child,
      folderPath: normPath,
      name: path.basename(folderPath),
      logs: [],
    };
    activeServers.set(normPath, serverEntry);

    const onData = (data, isError = false) => {
      const text = data.toString('utf8');
      const lines = text.split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        serverEntry.logs.push({ text: line, isError, time: Date.now() });
        if (serverEntry.logs.length > 600) serverEntry.logs.shift();
      }
      mainWindow?.webContents.send('server:log', { folderPath: normPath, text, isError });
    };

    child.stdout.on('data', (d) => onData(d, false));
    child.stderr.on('data', (d) => onData(d, true));

    child.on('exit', () => {
      activeServers.delete(normPath);
      mainWindow?.webContents.send('installer:serverStatusChanged', { folderPath: normPath, isRunning: false });
      updateTrayMenu();
    });

    child.on('error', () => {
      activeServers.delete(normPath);
      mainWindow?.webContents.send('installer:serverStatusChanged', { folderPath: normPath, isRunning: false });
      updateTrayMenu();
    });

    mainWindow?.webContents.send('installer:serverStatusChanged', { folderPath: normPath, isRunning: true });
    updateTrayMenu();

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Stop running server gracefully via 'stop' command
ipcMain.handle('installer:stopServer', async (event, folderPath) => {
  try {
    const normPath = path.resolve(folderPath);
    const srv = activeServers.get(normPath);
    if (!srv || !srv.process) {
      return { success: false, error: 'El servidor no se encuentra en ejecución.' };
    }

    try {
      srv.process.stdin.write('stop\n');
    } catch (_) {
      srv.process.kill();
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Send stdin command directly to Minecraft server process
ipcMain.handle('installer:sendServerInput', async (event, { folderPath, command }) => {
  try {
    const normPath = path.resolve(folderPath);
    const srv = activeServers.get(normPath);
    if (!srv || !srv.process) {
      return { success: false, error: 'El servidor no está iniciado.' };
    }

    srv.process.stdin.write(`${command}\n`);
    const echoLine = `> ${command}`;
    srv.logs.push({ text: echoLine, isInput: true, time: Date.now() });
    mainWindow?.webContents.send('server:log', { folderPath: normPath, text: echoLine, isInput: true });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Get buffered logs of a server
ipcMain.handle('installer:getServerLogs', async (event, folderPath) => {
  const normPath = path.resolve(folderPath);
  const srv = activeServers.get(normPath);
  return srv ? srv.logs : [];
});

// Get active running servers list
ipcMain.handle('installer:getRunningServers', async () => {
  const list = [];
  for (const [folderPath, srv] of activeServers.entries()) {
    list.push({ folderPath, name: srv.name });
  }
  return list;
});

// List local servers in the directory
ipcMain.handle('installer:listLocalServers', async () => {
  const baseDir = getRootWorkspaceDir();
  const servers = [];

  try {
    if (!fs.existsSync(baseDir)) return servers;
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const dirPath = path.join(baseDir, entry.name);
        const jarPath = path.join(dirPath, 'server.jar');
        const propsPath = path.join(dirPath, 'server.properties');

        if (fs.existsSync(jarPath) && fs.existsSync(propsPath)) {
          // Parse basic properties
          let rconEnabled = false;
          let rconPort = 25575;
          let rconPassword = '';
          let serverPort = 25565;
          let onlineMode = true;

          try {
            const lines = fs.readFileSync(propsPath, 'utf8').split('\n');
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('enable-rcon=')) rconEnabled = trimmed.split('=')[1]?.trim() === 'true';
              if (trimmed.startsWith('rcon.port=')) rconPort = parseInt(trimmed.split('=')[1]?.trim(), 10) || 25575;
              if (trimmed.startsWith('rcon.password=')) rconPassword = trimmed.split('=')[1]?.trim() || '';
              if (trimmed.startsWith('server-port=')) serverPort = parseInt(trimmed.split('=')[1]?.trim(), 10) || 25565;
              if (trimmed.startsWith('online-mode=')) onlineMode = trimmed.split('=')[1]?.trim() !== 'false';
            }
          } catch (_) {}

          const normPath = path.resolve(dirPath);
          let isRunning = activeServers.has(normPath);
          if (!isRunning && (serverPort || rconPort)) {
            const serverPortBusy = serverPort ? await isPortInUse(serverPort) : false;
            const rconPortBusy = rconPort ? await isPortInUse(rconPort) : false;
            isRunning = serverPortBusy || rconPortBusy;
          }

          servers.push({
            name: entry.name,
            path: dirPath,
            rconEnabled,
            rconPort,
            rconPassword,
            serverPort,
            onlineMode,
            isRunning,
          });
        }
      }
    }
  } catch (err) {
    console.error('Error listing local servers:', err);
  }

  return servers;
});

// Toggle online-mode in server.properties for an existing local server
ipcMain.handle('installer:toggleOnlineMode', async (event, folderPath) => {
  try {
    const baseDir = getRootWorkspaceDir();
    if (!folderPath || !fs.existsSync(folderPath) || !isPathInsideBaseDir(folderPath, baseDir)) {
      return { success: false, error: 'Acceso no permitido: Ruta no autorizada.' };
    }

    const propsPath = path.join(folderPath, 'server.properties');
    if (!fs.existsSync(propsPath)) {
      return { success: false, error: 'No se encontró server.properties en la carpeta del servidor.' };
    }

    let content = fs.readFileSync(propsPath, 'utf8');
    let currentOnline = true;
    if (/online-mode\s*=\s*false/i.test(content)) {
      currentOnline = false;
    }
    const newOnline = !currentOnline;

    if (/online-mode\s*=/i.test(content)) {
      content = content.replace(/online-mode\s*=\s*(true|false)/gi, `online-mode=${newOnline}`);
    } else {
      content += `\nonline-mode=${newOnline}\n`;
    }

    fs.writeFileSync(propsPath, content, 'utf8');
    return { success: true, onlineMode: newOnline };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('installer:getBaseDir', () => getRootWorkspaceDir());

ipcMain.handle('installer:selectFolder', async () => {
  try {
    const defaultDir = getRootWorkspaceDir();
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Seleccionar carpeta donde instalar el servidor',
      defaultPath: defaultDir,
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
  } catch (err) {
    console.error('Error in selectFolder dialog:', err);
  }
  return null;
});

ipcMain.handle('app:getVersion', () => '2.0.0');
ipcMain.handle('app:getSettings', () => ({ ...userSettings }));
ipcMain.handle('app:saveSettings', (event, s) => {
  saveSettings(s);
  return { ...userSettings };
});

ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:minimizeToTray', () => mainWindow?.hide());
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window:close', () => mainWindow?.close());

app.whenReady().then(() => {
  loadSettings();
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      showMainWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  for (const [normPath, srv] of activeServers.entries()) {
    try {
      srv.process.stdin.write('stop\n');
    } catch (_) {
      srv.process.kill();
    }
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && isQuitting) app.quit();
});
