const { app, BrowserWindow, ipcMain, shell, dialog, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const net = require('net');
const { spawn, execSync } = require('child_process');
const { Rcon } = require('rcon-client');
const archiver = require('archiver');
const extractZip = require('extract-zip');
const WebService = require('./webServer.cjs');

let mainWindow = null;
let currentRcon = null;
let pingInterval = null;
let tray = null;
let isQuitting = false;
let userSettings = { 
  closeAction: 'ask', 
  openAtLogin: false, 
  startMinimized: true, 
  hideWelcome: false,
  webService: { enabled: false, port: 8080, pin: '1234' },
  lastConnection: null,
  customMacros: null,
};

// Apply or update Windows startup (Option A: Iniciar con Windows)
function applyLoginItemSettings(enable, startMinimized = true) {
  try {
    if (process.platform === 'win32' || process.platform === 'darwin') {
      app.setLoginItemSettings({
        openAtLogin: Boolean(enable),
        openAsHidden: Boolean(startMinimized),
        path: process.execPath,
        args: startMinimized ? ['--minimized', '--hidden'] : [],
      });
    }
  } catch (err) {
    console.error('Error al aplicar arranque automático con Windows:', err);
  }
}

// Helper to create pure Node.js zip archives with clean paths (no ./ prefix) and session.lock ignore
function createZipArchive(sourceDir, destZipPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(destZipPath);
    const ZipArchiveClass = archiver.ZipArchive || archiver;
    const archive = typeof ZipArchiveClass === 'function' 
      ? new ZipArchiveClass({ zlib: { level: 6 } }) 
      : archiver('zip', { zlib: { level: 6 } });

    output.on('close', () => {
      resolve({ sizeBytes: archive.pointer ? archive.pointer() : 0 });
    });

    archive.on('warning', (err) => {
      console.warn('[Backup Archive Warning]', err.message);
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // Filter out session.lock (held exclusively by Java when server is running)
    // and temporary files; ensure paths are root-relative (NO ./ prefix)
    archive.directory(sourceDir, false, (entry) => {
      if (entry.name && (entry.name.includes('session.lock') || entry.name.endsWith('.tmp'))) {
        return false;
      }
      return entry;
    });

    archive.finalize();
  });
}

// Web Service v3 instance
const webService = new WebService({ port: 8080, pin: '1234' });

// Track active running server processes: normalized folderPath -> { process, folderPath, name, logs, ... }
const activeServers = new Map();
// Track Bedrock TCP RCON bridge servers: normalized folderPath -> net.Server
const bedrockBridges = new Map();

function getRunningServersInternal() {
  const list = [];
  for (const [folderPath, srv] of activeServers.entries()) {
    list.push({ folderPath, name: srv.name });
  }
  return list;
}

function emitEvent(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
  if (webService && webService.enabled) {
    webService.broadcastEvent(channel, data);
  }
}

function handleRpc(channel, handler) {
  ipcMain.handle(channel, async (event, ...args) => handler(...args));
  webService.registerRpc(channel, async (...args) => handler(...args));
}

function getRootWorkspaceDir() {
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    return process.env.PORTABLE_EXECUTABLE_DIR;
  }
  if (app.isPackaged) {
    return path.dirname(process.execPath);
  }
  return path.join(__dirname, '..');
}

function getConfigDir() {
  const baseDir = getRootWorkspaceDir();
  const configDir = path.join(baseDir, 'config');
  if (!fs.existsSync(configDir)) {
    try {
      fs.mkdirSync(configDir, { recursive: true });
    } catch (_) {}
  }
  return configDir;
}

function getSettingsPath() {
  const configDir = getConfigDir();
  return path.join(configDir, 'settings.json');
}

function loadSettings() {
  try {
    const p = getSettingsPath();
    if (fs.existsSync(p)) {
      userSettings = { ...userSettings, ...JSON.parse(fs.readFileSync(p, 'utf8')) };
    }
  } catch (_) {}

  // Sincronizar ajuste de inicio automático con Windows
  if (userSettings.openAtLogin !== undefined) {
    applyLoginItemSettings(userSettings.openAtLogin, userSettings.startMinimized !== false);
  }
}

function saveSettings(newSettings) {
  userSettings = { ...userSettings, ...newSettings };
  try {
    const p = getSettingsPath();
    fs.writeFileSync(p, JSON.stringify(userSettings, null, 2), 'utf8');
  } catch (err) {
    console.error('Error al guardar la configuración en la carpeta config:', err);
  }

  // Si cambia la opción de iniciar con Windows o arrancar minimizado, aplicar en el sistema operativo
  if (newSettings.openAtLogin !== undefined || newSettings.startMinimized !== undefined) {
    applyLoginItemSettings(userSettings.openAtLogin, userSettings.startMinimized !== false);
  }
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
  isLocalDirect: false,
  serverPath: null,
  host: '127.0.0.1',
  port: 25575,
  latencyMs: 0,
  serverType: 'java', // 'java' | 'bedrock'
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
  emitEvent('rcon:status-changed', { ...connectionState });
  emitEvent('installer:serverStatusChanged', {
    isRunning: activeServers.size > 0,
    runningServers: getRunningServersInternal(),
  });
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
    if (connectionState.connected && currentRcon && !connectionState.isSimulated && !connectionState.isLocalDirect) {
      const start = Date.now();
      try {
        await currentRcon.send('seed');
        connectionState.latencyMs = Date.now() - start;
        broadcastStatus();
      } catch (err) {
        console.warn('Ping failed, connection likely lost:', err.message);
        disconnectRconInternal('Conexión perdida con el servidor.');
      }
    } else if (connectionState.isLocalDirect) {
      const srv = connectionState.serverPath ? activeServers.get(connectionState.serverPath) : null;
      if (!srv || !srv.process) {
        disconnectRconInternal('El servidor local se ha detenido.');
      } else {
        connectionState.latencyMs = 1;
        broadcastStatus();
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
  connectionState.isLocalDirect = false;
  connectionState.serverPath = null;
  connectionState.latencyMs = 0;
  connectionState.serverType = 'java';
  if (reason) {
    connectionState.error = reason;
  }
  broadcastStatus();
}

function connectLocalDirectInternal(folderPath, serverEntry) {
  const normPath = path.resolve(folderPath);
  stopPing();
  if (currentRcon) {
    try { currentRcon.end(); } catch (_) {}
    currentRcon = null;
  }
  const isBedrock = serverEntry.serverType === 'bedrock';
  connectionState = {
    connected: true,
    isSimulated: false,
    isLocalDirect: true,
    serverType: isBedrock ? 'bedrock' : 'java',
    host: `Consola Local (${serverEntry.name})`,
    port: serverEntry.serverPort || (isBedrock ? 19132 : 25565),
    latencyMs: 1,
    error: null,
    serverPath: normPath,
  };
  startPing();
  broadcastStatus();
}

// Source RCON Protocol Packet Encoder (Little Endian)
function encodeRconPacket(id, type, body = '') {
  const bodyBuf = Buffer.from(body, 'utf8');
  const length = 4 + 4 + bodyBuf.length + 2;
  const buf = Buffer.alloc(4 + length);
  buf.writeInt32LE(length, 0);
  buf.writeInt32LE(id, 4);
  buf.writeInt32LE(type, 8);
  bodyBuf.copy(buf, 12);
  buf.writeInt8(0, 12 + bodyBuf.length);
  buf.writeInt8(0, 12 + bodyBuf.length + 1);
  return buf;
}

// Execute command directly on child process stdin and capture stdout response
function executeProcessCommand(serverEntry, command, timeoutMs = 700) {
  return new Promise((resolve) => {
    let outputLines = [];
    let debounceTimer = null;
    let maxTimer = null;

    const cleanup = () => {
      if (serverEntry.responseListeners) {
        serverEntry.responseListeners = serverEntry.responseListeners.filter((l) => l !== onLine);
      }
      if (debounceTimer) clearTimeout(debounceTimer);
      if (maxTimer) clearTimeout(maxTimer);
    };

    const finish = () => {
      cleanup();
      const text = outputLines.join('\n').trim();
      resolve(text || 'Comando ejecutado en la consola del servidor.');
    };

    const onLine = (line) => {
      const cleanLine = line.replace(/§[0-9a-fk-or]/gi, '');
      outputLines.push(cleanLine);
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(finish, 80);
    };

    serverEntry.responseListeners = serverEntry.responseListeners || [];
    serverEntry.responseListeners.push(onLine);

    maxTimer = setTimeout(finish, timeoutMs);

    try {
      serverEntry.process.stdin.write(`${command}\n`);
    } catch (err) {
      cleanup();
      resolve(`Error al escribir en consola: ${err.message}`);
    }
  });
}

// Bedrock RCON TCP Bridge Server: Exposes an official Source RCON TCP socket for Bedrock Dedicated Server
function startBedrockRconBridge(folderPath, serverEntry, rconPort, rconPassword) {
  const normPath = path.resolve(folderPath);
  stopBedrockRconBridge(normPath);

  if (!rconPort || isNaN(rconPort)) return;

  const server = net.createServer((socket) => {
    let authed = false;
    let rxBuffer = Buffer.alloc(0);

    socket.on('data', async (chunk) => {
      rxBuffer = Buffer.concat([rxBuffer, chunk]);

      while (rxBuffer.length >= 14) {
        const length = rxBuffer.readInt32LE(0);
        if (rxBuffer.length < 4 + length) {
          break;
        }

        const id = rxBuffer.readInt32LE(4);
        const type = rxBuffer.readInt32LE(8);
        const bodyLen = Math.max(0, length - 10);
        const body = rxBuffer.toString('utf8', 12, 12 + bodyLen);
        rxBuffer = rxBuffer.subarray(4 + length);

        if (type === 3) {
          // SERVERDATA_AUTH
          if (rconPassword && body === rconPassword) {
            authed = true;
            socket.write(encodeRconPacket(id, 0, ''));
            socket.write(encodeRconPacket(id, 2, ''));
          } else {
            authed = false;
            socket.write(encodeRconPacket(-1, 2, ''));
          }
        } else if (type === 2) {
          // SERVERDATA_EXECCOMMAND
          if (!authed) {
            socket.write(encodeRconPacket(id, 0, 'No autorizado. Autentíquese primero con RCON.'));
            continue;
          }

          const translatedCmd = translateCommandForServer(body, 'bedrock');
          const cleanCmd = translatedCmd.startsWith('/') ? translatedCmd.slice(1) : translatedCmd;
          const output = await executeProcessCommand(serverEntry, cleanCmd);
          socket.write(encodeRconPacket(id, 0, output));
        }
      }
    });

    socket.on('error', () => {});
  });

  server.on('error', (err) => {
    console.warn(`[Bedrock RCON Bridge] Advertencia en puerto ${rconPort}:`, err.message);
  });

  try {
    server.listen(rconPort, '0.0.0.0', () => {
      console.log(`[Bedrock RCON Bridge] Servidor RCON TCP activo para Bedrock en 0.0.0.0:${rconPort}`);
    });
    bedrockBridges.set(normPath, server);
  } catch (err) {
    console.warn('[Bedrock RCON Bridge] Fallo al iniciar listener:', err.message);
  }
}

function stopBedrockRconBridge(folderPath) {
  const normPath = path.resolve(folderPath);
  if (bedrockBridges.has(normPath)) {
    try {
      bedrockBridges.get(normPath).close();
    } catch (_) {}
    bedrockBridges.delete(normPath);
  }
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
    const ruleInput = parts[1];
    const ruleKey = Object.keys(simulatedServer.gamerules).find(
      (k) => k.toLowerCase() === ruleInput.toLowerCase()
    ) || ruleInput;

    if (parts.length === 2) {
      const val = simulatedServer.gamerules[ruleKey] ?? 'false';
      return `La regla de juego ${ruleKey} actualmente está establecida en: ${val}`;
    }
    const val = parts.slice(2).join(' ');
    simulatedServer.gamerules[ruleKey] = val;
    return `Regla de juego ${ruleKey} establecida en: ${val}`;
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

  if (action === 'whitelist' || action === 'allowlist') {
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

  if (action === 'effect') {
    return 'Efecto aplicado correctamente (Modo Simulado).';
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
      host === 'www.minecraft.net' ||
      host === 'minecraft.net' ||
      host === 'minecraft.azureedge.net' ||
      host.endsWith('.mojang.com') ||
      host.endsWith('.azureedge.net') ||
      host.endsWith('.minecraft.net')
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
    title: 'Minecraft RCON Studio v3.0',
    icon: path.join(__dirname, 'icon.png'),
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

  const shouldStartHidden = process.argv.includes('--hidden') || process.argv.includes('--minimized');
  mainWindow.once('ready-to-show', () => {
    if (!shouldStartHidden) {
      mainWindow.show();
    } else {
      console.log('[Autostart] Iniciado en segundo plano minimizado en la bandeja del sistema.');
    }
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

/**
 * Traduce comandos de forma transparente entre Minecraft Java y Minecraft Bedrock (BDS).
 * Permite que los botones de la interfaz, atajos y consola funcionen con independencia de la versión conectada.
 */
function translateCommandForServer(rawCmd, serverType) {
  if (!rawCmd || typeof rawCmd !== 'string') return rawCmd;
  if (serverType !== 'bedrock') return rawCmd;

  let clean = rawCmd.trim();
  const hasSlash = clean.startsWith('/');
  if (hasSlash) clean = clean.slice(1);

  // 1. /effect give <target> <effect> [sec] [amp] -> /effect <target> <effect> [sec] [amp]
  // En Bedrock NO se incluye la palabra clave 'give'
  const effectGiveMatch = clean.match(/^effect\s+give\s+(\S+)\s+(.+)$/i);
  if (effectGiveMatch) {
    clean = `effect ${effectGiveMatch[1]} ${effectGiveMatch[2]}`;
  }

  // 2. /effect clear <target> -> /effect <target> clear
  // En Bedrock la sintaxis para limpiar efectos es "/effect <jugador> clear"
  const effectClearMatch = clean.match(/^effect\s+clear\s+(\S+)(.*)$/i);
  if (effectClearMatch) {
    const target = effectClearMatch[1];
    clean = `effect ${target} clear`;
  }

  // 3. /whitelist <accion> -> /allowlist <accion>
  // Bedrock Dedicated Server utiliza "allowlist" en lugar de "whitelist"
  const whitelistMatch = clean.match(/^whitelist(\s+.*)?$/i);
  if (whitelistMatch) {
    clean = `allowlist${whitelistMatch[1] || ''}`;
  }

  // 4. Las gamerules en Bedrock deben ser obligatoriamente en minúsculas (keepinventory, mobgriefing, etc.)
  const gameruleMatch = clean.match(/^gamerule\s+([a-zA-Z0-9]+)(\s+.*)?$/i);
  if (gameruleMatch) {
    const ruleName = gameruleMatch[1].toLowerCase();
    const rest = gameruleMatch[2] || '';
    clean = `gamerule ${ruleName}${rest}`;
  }

  return hasSlash ? `/${clean}` : clean;
}

/**
 * Detecta de forma proactiva si el servidor RCON conectado es Java Edition o Bedrock Edition.
 */
async function detectServerType(rconClient) {
  try {
    const helpRes = await rconClient.send('help');
    if (helpRes && typeof helpRes === 'string') {
      const lower = helpRes.toLowerCase();
      if (
        lower.includes('allowlist') ||
        lower.includes('ability') ||
        lower.includes('camerashake') ||
        lower.includes('tickingarea') ||
        lower.includes('titleraw') ||
        lower.includes('mobevent') ||
        lower.includes('bedrock')
      ) {
        return 'bedrock';
      }
      if (
        lower.includes('datapack') ||
        lower.includes('bossbar') ||
        lower.includes('advancement') ||
        lower.includes('forceload') ||
        lower.includes('teammsg')
      ) {
        return 'java';
      }
    }
  } catch (_) {}

  try {
    const listRes = await rconClient.send('list');
    if (listRes && typeof listRes === 'string') {
      if (/\d+\/\d+\s+players\s+online/i.test(listRes)) {
        return 'bedrock';
      }
      if (/of\s+a\s+max\s+of/i.test(listRes)) {
        return 'java';
      }
    }
  } catch (_) {}

  return 'java';
}

// -------------------------------------------------------------
// Unified RPC Handlers (Electron IPC & Remote Web/LAN)
// -------------------------------------------------------------
handleRpc('rcon:getStatus', () => ({ ...connectionState }));

handleRpc('rcon:connect', async (config) => {
  const { host = '127.0.0.1', port = 25575, password = '', isSimulated = false, serverType = 'auto', isLocal = false, folderPath = null } = config;

  if (isSimulated) {
    await disconnectRconInternal();
    const simulatedType = (serverType && serverType !== 'auto') ? serverType : 'java';
    connectionState = {
      connected: true,
      isSimulated: true,
      isLocalDirect: false,
      serverPath: null,
      host: 'Servidor Simulado',
      port: 25575,
      latencyMs: 2,
      serverType: simulatedType,
      error: null,
    };
    startPing();
    broadcastStatus();
    return {
      success: true,
      serverType: simulatedType,
      message: `Conectado al servidor de pruebas simulado (${simulatedType === 'bedrock' ? 'Bedrock Edition' : 'Java Edition'}).`,
    };
  }

  // Comprobar si se conecta a un servidor local activo en la aplicación
  const isLocalHost = host === '127.0.0.1' || host === 'localhost' || host === '::1';
  let matchedLocalServer = null;
  if (folderPath && activeServers.has(path.resolve(folderPath))) {
    matchedLocalServer = activeServers.get(path.resolve(folderPath));
  } else if (isLocalHost && activeServers.size > 0) {
    for (const srv of activeServers.values()) {
      if (srv.rconPort === Number(port) || srv.serverPort === Number(port) || activeServers.size === 1) {
        matchedLocalServer = srv;
        break;
      }
    }
  }

  // Si es un servidor Bedrock local activo o se solicitó conexión directa
  if (matchedLocalServer && (matchedLocalServer.serverType === 'bedrock' || isLocal)) {
    await disconnectRconInternal();
    connectLocalDirectInternal(matchedLocalServer.folderPath, matchedLocalServer);
    return {
      success: true,
      serverType: matchedLocalServer.serverType,
      isLocalDirect: true,
      message: `Conectado exitosamente a la Consola Directa de ${matchedLocalServer.name} (${matchedLocalServer.serverType === 'bedrock' ? 'Bedrock Edition' : 'Java Edition'}).`,
    };
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

    let detectedType = 'java';
    if (serverType && serverType !== 'auto') {
      detectedType = serverType;
    } else {
      detectedType = await detectServerType(rcon);
    }

    connectionState = {
      connected: true,
      isSimulated: false,
      isLocalDirect: false,
      serverPath: null,
      host,
      port: Number(port),
      latencyMs: latency,
      serverType: detectedType,
      error: null,
    };

    startPing();
    broadcastStatus();

    return {
      success: true,
      serverType: detectedType,
      message: `Conectado exitosamente a ${host}:${port} (${detectedType === 'bedrock' ? 'Bedrock Edition' : 'Java Edition'})`,
    };
  } catch (error) {
    // Si la conexión TCP falló y hay un servidor local Bedrock en ejecución, conectar por consola directa
    if (matchedLocalServer && matchedLocalServer.serverType === 'bedrock') {
      connectLocalDirectInternal(matchedLocalServer.folderPath, matchedLocalServer);
      return {
        success: true,
        serverType: 'bedrock',
        isLocalDirect: true,
        message: `Conectado a la Consola Directa de ${matchedLocalServer.name} (Bedrock no tiene RCON nativo de Mojang).`,
      };
    }

    let friendlyError = error.message || 'Error de conexión desconocido';
    if (error.code === 'ECONNREFUSED' || (error.message && error.message.includes('ECONNREFUSED'))) {
      if (isLocalHost) {
        friendlyError = `El servidor local no está iniciado o aún está cargando. Ve a la pestaña 'Servidor' y pulsa 'Iniciar' para arrancarlo.`;
      } else {
        friendlyError = `No se pudo conectar a ${host}:${port} (Conexión rechazada). Comprueba que el servidor esté encendido y con RCON habilitado.`;
      }
    }

    connectionState = {
      connected: false,
      isSimulated: false,
      isLocalDirect: false,
      serverPath: null,
      host,
      port: Number(port),
      latencyMs: 0,
      serverType: 'java',
      error: friendlyError,
    };
    broadcastStatus();
    return { success: false, error: friendlyError };
  }
});

handleRpc('rcon:disconnect', async () => {
  await disconnectRconInternal();
  return { success: true };
});

async function sendCommandInternal(command) {
  const cleanCmd = (command || '').trim();
  if (!cleanCmd) {
    return { success: false, error: 'Comando vacío' };
  }

  // Traducción transparente y automática de comandos si el servidor es Bedrock
  const translatedCmd = translateCommandForServer(cleanCmd, connectionState.serverType);

  if (connectionState.isLocalDirect) {
    const srv = (connectionState.serverPath && activeServers.get(connectionState.serverPath)) ||
                (activeServers.size > 0 ? activeServers.values().next().value : null);
    if (!srv || !srv.process) {
      disconnectRconInternal('El servidor local no está disponible.');
      return { success: false, error: 'El proceso del servidor local ya no se encuentra en ejecución.' };
    }

    const start = Date.now();
    const cmdToSend = translatedCmd.startsWith('/') ? translatedCmd.slice(1) : translatedCmd;
    const response = await executeProcessCommand(srv, cmdToSend);
    connectionState.latencyMs = Math.max(1, Date.now() - start);
    return {
      success: true,
      response: response || 'Comando ejecutado con éxito en la consola del servidor.',
    };
  }

  if (!connectionState.connected) {
    if (activeServers.size > 0) {
      const firstSrv = activeServers.values().next().value;
      if (firstSrv && firstSrv.process) {
        const cmdToSend = translatedCmd.startsWith('/') ? translatedCmd.slice(1) : translatedCmd;
        const res = await executeProcessCommand(firstSrv, cmdToSend);
        return { success: true, response: res };
      }
    }
    return { success: false, error: 'No hay conexión activa con el servidor RCON ni consola local.' };
  }

  if (connectionState.isSimulated) {
    const res = handleSimulatedCommand(translatedCmd);
    return { success: true, response: res };
  }

  if (!currentRcon) {
    return { success: false, error: 'Instancia RCON no disponible.' };
  }

  try {
    const start = Date.now();
    const cmdToSend = translatedCmd.startsWith('/') ? translatedCmd.slice(1) : translatedCmd;
    const rawResponse = await currentRcon.send(cmdToSend);
    connectionState.latencyMs = Date.now() - start;

    return {
      success: true,
      response: rawResponse || 'Comando ejecutado sin respuesta visual del servidor.',
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

handleRpc('rcon:send', async (command) => sendCommandInternal(command));

// -------------------------------------------------------------
// Version 2 & 3: Official Server Installer & Manager
// -------------------------------------------------------------

// Fetch official versions manifest from Mojang
handleRpc('installer:getVersions', async () => {
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

// Fetch official Bedrock versions from Mojang catalog
handleRpc('installer:getBedrockVersions', async () => {
  return {
    success: true,
    latest: '1.21.51.02',
    versions: [
      { id: '1.21.51.02', type: 'release', releaseTime: '2024-12-10', url: 'https://www.minecraft.net/bedrockdedicatedserver/bin-win/bedrock-server-1.21.51.02.zip' },
      { id: '1.21.50.07', type: 'release', releaseTime: '2024-12-03', url: 'https://www.minecraft.net/bedrockdedicatedserver/bin-win/bedrock-server-1.21.50.07.zip' },
      { id: '1.21.44.01', type: 'release', releaseTime: '2024-11-12', url: 'https://www.minecraft.net/bedrockdedicatedserver/bin-win/bedrock-server-1.21.44.01.zip' },
      { id: '1.21.30.03', type: 'release', releaseTime: '2024-09-17', url: 'https://www.minecraft.net/bedrockdedicatedserver/bin-win/bedrock-server-1.21.30.03.zip' },
      { id: '1.20.81.01', type: 'release', releaseTime: '2024-04-29', url: 'https://www.minecraft.net/bedrockdedicatedserver/bin-win/bedrock-server-1.20.81.01.zip' },
    ],
  };
});

// Download and setup official server (Java or Bedrock Edition)
handleRpc('installer:downloadAndSetup', async (options) => {
  const {
    serverEdition = 'java', // 'java' | 'bedrock'
    versionId,
    versionUrl,
    folderName = serverEdition === 'bedrock' ? `servidor_bedrock_${versionId}` : `servidor_${versionId}`,
    customInstallPath = null,
    rconPassword = '1234',
    rconPort = 25575,
    serverPort = serverEdition === 'bedrock' ? 19132 : 25565,
    serverPortV6 = 19133,
    ramGb = 4,
    acceptEula = true,
    optimizeProperties = true,
    onlineMode = true,
    // Opciones pertinentes para Bedrock
    bedrockServerName = 'Mi Servidor Bedrock',
    gamemode = 'survival',
    difficulty = 'easy',
    allowCheats = true,
    allowList = false,
    tickDistance = 4,
  } = options || {};

  const baseDir = (customInstallPath && fs.existsSync(customInstallPath))
    ? path.resolve(customInstallPath)
    : getRootWorkspaceDir();

  // Security: sanitize folder name to prevent path traversal
  const cleanFolder = sanitizeFolderName(folderName || (serverEdition === 'bedrock' ? `servidor_bedrock_${versionId}` : `servidor_${versionId}`));
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

    // Branch: Minecraft Bedrock Dedicated Server installation
    if (serverEdition === 'bedrock') {
      const bdsVersion = versionId || '1.21.51.02';
      const bdsUrl = versionUrl || `https://www.minecraft.net/bedrockdedicatedserver/bin-win/bedrock-server-${bdsVersion}.zip`;

      emitEvent('installer:progress', {
        percent: 8,
        statusText: `Iniciando descarga oficial de Minecraft Bedrock Dedicated Server (${bdsVersion})...`,
      });

      const zipDest = path.join(targetDir, 'bds_installer.zip');
      await downloadFileWithProgress(bdsUrl, zipDest, ({ percent, downloadedBytes, totalBytes }) => {
        const mappedPercent = Math.round(10 + (percent * 0.75));
        emitEvent('installer:progress', {
          percent: mappedPercent,
          downloadedBytes,
          totalBytes,
          statusText: `Descargando Bedrock Server: ${Math.round(downloadedBytes / (1024 * 1024))} MB de ${Math.round(totalBytes / (1024 * 1024))} MB (${percent}%)`,
        });
      });

      emitEvent('installer:progress', {
        percent: 88,
        statusText: 'Extrayendo binarios de Bedrock Dedicated Server...',
      });

      await extractZip(zipDest, { dir: targetDir });
      try { fs.unlinkSync(zipDest); } catch (_) {}

      emitEvent('installer:progress', {
        percent: 94,
        statusText: 'Configurando server.properties y parámetros de Bedrock...',
      });

      // Configure Bedrock server.properties
      const propsPath = path.join(targetDir, 'server.properties');
      let propsContent = fs.existsSync(propsPath) ? fs.readFileSync(propsPath, 'utf8') : '';

      const setProp = (content, key, val) => {
        const regex = new RegExp(`^${key}\\s*=.*$`, 'm');
        if (regex.test(content)) {
          return content.replace(regex, `${key}=${val}`);
        }
        return content + `\n${key}=${val}\n`;
      };

      propsContent = setProp(propsContent, 'server-name', bedrockServerName || 'Mi Servidor Bedrock');
      propsContent = setProp(propsContent, 'gamemode', gamemode || 'survival');
      propsContent = setProp(propsContent, 'difficulty', difficulty || 'easy');
      propsContent = setProp(propsContent, 'allow-cheats', allowCheats ? 'true' : 'false');
      propsContent = setProp(propsContent, 'server-port', serverPort || 19132);
      propsContent = setProp(propsContent, 'server-portv6', serverPortV6 || 19133);
      propsContent = setProp(propsContent, 'online-mode', onlineMode !== false ? 'true' : 'false');
      propsContent = setProp(propsContent, 'white-list', allowList ? 'true' : 'false');
      propsContent = setProp(propsContent, 'allow-list', allowList ? 'true' : 'false');
      propsContent = setProp(propsContent, 'tick-distance', tickDistance || 4);
      propsContent = setProp(propsContent, 'enable-rcon', 'true');
      propsContent = setProp(propsContent, 'rcon.port', rconPort || 25575);
      propsContent = setProp(propsContent, 'rcon.password', rconPassword || '1234');

      fs.writeFileSync(propsPath, propsContent, 'utf8');

      // Create start.bat for Bedrock with console integration
      const bdsBat = `@echo off
title Bedrock Dedicated Server - ${bedrockServerName || 'BDS'}
cls
echo ========================================================
echo   Minecraft Bedrock Dedicated Server (%CD%)
echo   Puerto IPv4: ${serverPort || 19132} ^| IPv6: ${serverPortV6 || 19133}
echo   Modo: ${onlineMode !== false ? 'Online (Xbox Live)' : 'Offline (No-Premium / LAN)'}
echo ========================================================
echo.
bedrock_server.exe
echo.
echo Servidor Bedrock detenido.
pause
`;
      fs.writeFileSync(path.join(targetDir, 'start.bat'), bdsBat, 'utf8');

      emitEvent('installer:progress', {
        percent: 100,
        statusText: '¡Servidor Bedrock instalado y configurado con éxito!',
      });

      return {
        success: true,
        folderPath: targetDir,
        folderName: cleanFolder,
        versionId: bdsVersion,
        serverType: 'bedrock',
        rconPassword,
        rconPort,
        serverPort: serverPort || 19132,
        serverPortV6: serverPortV6 || 19133,
        onlineMode: onlineMode !== false,
      };
    }

    // Branch: Minecraft Java Edition installation (existing logic)

    emitEvent('installer:progress', {
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

    emitEvent('installer:progress', {
      percent: 10,
      statusText: `Iniciando descarga oficial de server.jar (${Math.round(expectedSize / (1024 * 1024))} MB)...`,
    });

    // Step 3: Download server.jar with progress
    const jarDest = path.join(targetDir, 'server.jar');
    await downloadFileWithProgress(serverJarUrl, jarDest, ({ percent, downloadedBytes, totalBytes }) => {
      // Map 10% - 90%
      const mappedPercent = Math.round(10 + (percent * 0.8));
      emitEvent('installer:progress', {
        percent: mappedPercent,
        downloadedBytes,
        totalBytes,
        statusText: `Descargando server.jar: ${Math.round(downloadedBytes / (1024 * 1024))} MB de ${Math.round(totalBytes / (1024 * 1024))} MB (${percent}%)`,
      });
    });

    emitEvent('installer:progress', {
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
#Generated by Minecraft RCON Studio v3.0
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

    emitEvent('installer:progress', {
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
handleRpc('installer:openFolder', async (folderPath) => {
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
handleRpc('installer:launchServer', async (folderPath) => {
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
    const bedrockExePath = path.join(folderPath, 'bedrock_server.exe');
    if (!fs.existsSync(batPath) && !fs.existsSync(bedrockExePath)) {
      return { success: false, error: 'No se encontró start.bat ni bedrock_server.exe en la carpeta del servidor.' };
    }

    const isBedrock = fs.existsSync(bedrockExePath);
    let rconPort = 25575;
    let rconPassword = '';
    let serverPort = isBedrock ? 19132 : 25565;
    let serverPortV6 = 19133;

    const propsPath = path.join(folderPath, 'server.properties');
    if (fs.existsSync(propsPath)) {
      try {
        const lines = fs.readFileSync(propsPath, 'utf8').split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('rcon.port=')) rconPort = parseInt(trimmed.split('=')[1]?.trim(), 10) || 25575;
          if (trimmed.startsWith('rcon.password=')) rconPassword = trimmed.split('=')[1]?.trim() || '';
          if (trimmed.startsWith('server-port=')) serverPort = parseInt(trimmed.split('=')[1]?.trim(), 10) || (isBedrock ? 19132 : 25565);
          if (trimmed.startsWith('server-portv6=')) serverPortV6 = parseInt(trimmed.split('=')[1]?.trim(), 10) || (serverPort + 1);
        }
      } catch (_) {}
    }

    // Extract execution line from start.bat or fallback to Java / Bedrock executable
    let execCmd = isBedrock ? 'bedrock_server.exe' : 'java -Xms4G -Xmx4G -XX:+UseG1GC -jar server.jar nogui';
    if (fs.existsSync(batPath)) {
      try {
        const batContent = fs.readFileSync(batPath, 'utf8');
        const found = batContent.split('\n').find((l) => l.trim().startsWith('java ') || l.trim().startsWith('bedrock_server'));
        if (found) execCmd = found.trim();
      } catch (_) {}
    }

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
      serverType: isBedrock ? 'bedrock' : 'java',
      serverPort,
      serverPortV6: isBedrock ? serverPortV6 : undefined,
      rconPort,
      rconPassword,
      logs: [],
      responseListeners: [],
    };
    activeServers.set(normPath, serverEntry);

    const onData = (data, isError = false) => {
      const text = data.toString('utf8');
      const lines = text.split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        serverEntry.logs.push({ text: line, isError, time: Date.now() });
        if (serverEntry.logs.length > 600) serverEntry.logs.shift();
        if (!isError && serverEntry.responseListeners?.length) {
          for (const listener of [...serverEntry.responseListeners]) {
            try { listener(line); } catch (_) {}
          }
        }
      }
      emitEvent('server:log', { folderPath: normPath, text, isError });
    };

    child.stdout.on('data', (d) => onData(d, false));
    child.stderr.on('data', (d) => onData(d, true));

    const onExit = () => {
      stopBedrockRconBridge(normPath);
      activeServers.delete(normPath);
      if (connectionState.isLocalDirect && connectionState.serverPath === normPath) {
        disconnectRconInternal('El servidor local se ha detenido.');
      }
      emitEvent('installer:serverStatusChanged', { folderPath: normPath, isRunning: false });
      updateTrayMenu();
      broadcastStatus();
    };

    child.on('exit', onExit);
    child.on('error', onExit);

    // Iniciar Bedrock RCON TCP Bridge si es Bedrock para aceptar conexiones RCON de la red
    if (isBedrock && rconPort) {
      startBedrockRconBridge(normPath, serverEntry, rconPort, rconPassword);
    }

    emitEvent('installer:serverStatusChanged', { folderPath: normPath, isRunning: true });
    updateTrayMenu();
    broadcastStatus();

    // Auto-conectar automáticamente en Consola Directa si no hay otra conexión activa
    if (!connectionState.connected) {
      connectLocalDirectInternal(normPath, serverEntry);
    }

    return {
      success: true,
      serverType: serverEntry.serverType,
      name: serverEntry.name,
      serverPort,
      rconPort,
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Stop running server gracefully via 'stop' command
handleRpc('installer:stopServer', async (folderPath) => {
  try {
    const normPath = path.resolve(folderPath);
    const srv = activeServers.get(normPath);
    if (!srv || !srv.process) {
      return { success: false, error: 'El servidor no se encuentra en ejecución.' };
    }

    stopBedrockRconBridge(normPath);
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
handleRpc('installer:sendServerInput', async ({ folderPath, command }) => {
  try {
    const normPath = path.resolve(folderPath);
    const srv = activeServers.get(normPath);
    if (!srv || !srv.process) {
      return { success: false, error: 'El servidor no está iniciado.' };
    }

    const translated = translateCommandForServer(command, srv.serverType);
    const cmdToSend = translated.startsWith('/') ? translated.slice(1) : translated;

    srv.process.stdin.write(`${cmdToSend}\n`);
    const echoLine = `> ${cmdToSend}`;
    srv.logs.push({ text: echoLine, isInput: true, time: Date.now() });
    emitEvent('server:log', { folderPath: normPath, text: echoLine, isInput: true });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Get buffered logs of a server
handleRpc('installer:getServerLogs', async (folderPath) => {
  const normPath = path.resolve(folderPath);
  const srv = activeServers.get(normPath);
  return srv ? srv.logs : [];
});

// Get active running servers list
handleRpc('installer:getRunningServers', async () => {
  const list = [];
  for (const [folderPath, srv] of activeServers.entries()) {
    list.push({ folderPath, name: srv.name });
  }
  return list;
});

// Internal function to list local servers with ports and statuses
async function listLocalServersInternal() {
  const baseDir = getRootWorkspaceDir();
  const servers = [];

  try {
    if (!fs.existsSync(baseDir)) return servers;
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const dirPath = path.join(baseDir, entry.name);
        const jarPath = path.join(dirPath, 'server.jar');
        const bedrockExePath = path.join(dirPath, 'bedrock_server.exe');
        const propsPath = path.join(dirPath, 'server.properties');

        const isJava = fs.existsSync(jarPath);
        const isBedrock = fs.existsSync(bedrockExePath);

        if ((isJava || isBedrock) && fs.existsSync(propsPath)) {
          // Parse basic properties
          let rconEnabled = isBedrock; // Bedrock siempre cuenta con soporte RCON en la app mediante el puente y consola directa
          let rconPort = 25575;
          let rconPassword = '';
          let serverPort = isBedrock ? 19132 : 25565;
          let serverPortV6 = 19133;
          let onlineMode = true;

          try {
            const lines = fs.readFileSync(propsPath, 'utf8').split('\n');
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('enable-rcon=')) rconEnabled = trimmed.split('=')[1]?.trim() === 'true';
              if (trimmed.startsWith('rcon.port=')) rconPort = parseInt(trimmed.split('=')[1]?.trim(), 10) || 25575;
              if (trimmed.startsWith('rcon.password=')) rconPassword = trimmed.split('=')[1]?.trim() || '';
              if (trimmed.startsWith('server-port=')) serverPort = parseInt(trimmed.split('=')[1]?.trim(), 10) || (isBedrock ? 19132 : 25565);
              if (trimmed.startsWith('server-portv6=')) serverPortV6 = parseInt(trimmed.split('=')[1]?.trim(), 10) || (serverPort + 1);
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
            serverType: isBedrock ? 'bedrock' : 'java',
            rconEnabled,
            rconPort,
            rconPassword,
            serverPort,
            serverPortV6: isBedrock ? serverPortV6 : undefined,
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
}

// List local servers in the directory
handleRpc('installer:listLocalServers', async () => {
  return await listLocalServersInternal();
});

// Toggle online-mode in server.properties for an existing local server
handleRpc('installer:toggleOnlineMode', async (folderPath) => {
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

// Update server connection port and RCON port in server.properties
handleRpc('installer:updateServerPorts', async ({ folderPath, serverPort, rconPort, rconPassword, serverPortV6 }) => {
  try {
    const baseDir = getRootWorkspaceDir();
    if (!folderPath || !fs.existsSync(folderPath) || !isPathInsideBaseDir(folderPath, baseDir)) {
      return { success: false, error: 'Acceso no permitido: Ruta no autorizada.' };
    }

    const normPath = path.resolve(folderPath);
    if (activeServers.has(normPath)) {
      return { success: false, error: 'Debes detener el servidor antes de cambiar sus puertos.' };
    }

    const sPort = parseInt(serverPort, 10);
    const rPort = parseInt(rconPort, 10);
    if (isNaN(sPort) || sPort < 1024 || sPort > 65535) {
      return { success: false, error: 'El puerto de juego debe ser un número entre 1024 y 65535.' };
    }
    if (isNaN(rPort) || rPort < 1024 || rPort > 65535) {
      return { success: false, error: 'El puerto RCON debe ser un número entre 1024 y 65535.' };
    }
    if (sPort === rPort) {
      return { success: false, error: 'El puerto del juego y el puerto RCON no pueden ser el mismo número.' };
    }

    const propsPath = path.join(folderPath, 'server.properties');
    if (!fs.existsSync(propsPath)) {
      return { success: false, error: 'No se encontró server.properties en la carpeta del servidor.' };
    }

    let content = fs.readFileSync(propsPath, 'utf8');

    // Update server-port
    if (/server-port\s*=/i.test(content)) {
      content = content.replace(/server-port\s*=\s*\d+/gi, `server-port=${sPort}`);
    } else {
      content += `\nserver-port=${sPort}\n`;
    }

    // Update server-portv6 (Bedrock Dedicated Server)
    if (/server-portv6\s*=/i.test(content)) {
      const v6 = serverPortV6 ? parseInt(serverPortV6, 10) : (sPort + 1);
      content = content.replace(/server-portv6\s*=\s*\d+/gi, `server-portv6=${v6}`);
    }

    // Update rcon.port
    if (/rcon\.port\s*=/i.test(content)) {
      content = content.replace(/rcon\.port\s*=\s*\d+/gi, `rcon.port=${rPort}`);
    } else {
      content += `\nrcon.port=${rPort}\n`;
    }

    // Optionally update rcon.password
    if (rconPassword !== undefined && rconPassword !== null && String(rconPassword).trim()) {
      const cleanPass = String(rconPassword).trim();
      if (/rcon\.password\s*=/i.test(content)) {
        content = content.replace(/rcon\.password\s*=.*/gi, `rcon.password=${cleanPass}`);
      } else {
        content += `\nrcon.password=${cleanPass}\n`;
      }
    }

    fs.writeFileSync(propsPath, content, 'utf8');

    // Update start.bat banner if present
    const batPath = path.join(folderPath, 'start.bat');
    if (fs.existsSync(batPath)) {
      try {
        let batContent = fs.readFileSync(batPath, 'utf8');
        batContent = batContent.replace(/Puerto \d+ \^\| Clave: [^\n\r]+/g, `Puerto ${rPort} ^| Clave: ${rconPassword || '1234'}`);
        fs.writeFileSync(batPath, batContent, 'utf8');
      } catch (_) {}
    }

    return {
      success: true,
      serverPort: sPort,
      rconPort: rPort,
      rconPassword: rconPassword || undefined,
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Delete server folder completely, stopping process if running
handleRpc('installer:deleteServer', async (folderPath) => {
  try {
    const baseDir = getRootWorkspaceDir();
    if (!folderPath || !fs.existsSync(folderPath) || !isPathInsideBaseDir(folderPath, baseDir)) {
      return { success: false, error: 'Acceso no permitido: La ruta no existe o no está autorizada.' };
    }

    const normPath = path.resolve(folderPath);

    // If server is currently running, terminate it first
    if (activeServers.has(normPath)) {
      const srv = activeServers.get(normPath);
      if (srv && srv.process) {
        try {
          srv.process.stdin.write('stop\n');
        } catch (_) {}
        try {
          srv.process.kill();
        } catch (_) {}
      }
      activeServers.delete(normPath);
      emitEvent('installer:serverStatusChanged', { folderPath: normPath, isRunning: false });
      updateTrayMenu();
      broadcastStatus();

      // Give Windows a brief moment to release file descriptors
      await new Promise((r) => setTimeout(r, 600));
    }

    // Recursively delete folder
    fs.rmSync(normPath, { recursive: true, force: true });

    return { success: true, folderPath: normPath };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Create zip backup with Windows-compatible timestamp
handleRpc('installer:createBackup', async (folderPath) => {
  try {
    const baseDir = getRootWorkspaceDir();
    if (!folderPath || !fs.existsSync(folderPath) || !isPathInsideBaseDir(folderPath, baseDir)) {
      return { success: false, error: 'Acceso no permitido: La ruta no existe o no está autorizada.' };
    }

    const normPath = path.resolve(folderPath);

    // If server is running, issue save-all before zipping
    if (activeServers.has(normPath)) {
      const srv = activeServers.get(normPath);
      if (srv && srv.process) {
        try {
          srv.process.stdin.write('save-all\n');
          await new Promise((r) => setTimeout(r, 700));
        } catch (_) {}
      }
    }

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    // Windows-compatible timestamp: YYYY-MM-DD_HH-mm-ss
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const serverName = path.basename(folderPath);
    const zipFileName = `backup_${serverName}_${timestamp}.zip`;

    const backupsDir = path.join(baseDir, 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const destZip = path.join(backupsDir, zipFileName);

    // Compress using pure Node.js streaming archiver (clean standard Windows-compatible zip entries)
    await createZipArchive(normPath, destZip);

    let sizeMb = '0';
    if (fs.existsSync(destZip)) {
      const stats = fs.statSync(destZip);
      sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
    }

    return {
      success: true,
      fileName: zipFileName,
      filePath: destZip,
      sizeMb,
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// List all zip backups in the backups/ folder
handleRpc('installer:listBackups', async () => {
  try {
    const baseDir = getRootWorkspaceDir();
    const backupsDir = path.join(baseDir, 'backups');
    if (!fs.existsSync(backupsDir)) {
      return [];
    }

    const entries = fs.readdirSync(backupsDir);
    const backups = [];

    for (const file of entries) {
      if (file.toLowerCase().endsWith('.zip')) {
        const fullPath = path.join(backupsDir, file);
        try {
          const stat = fs.statSync(fullPath);
          const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);
          
          let serverName = '';
          const match = file.match(/^backup_(.+)_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.zip$/i);
          if (match) {
            serverName = match[1];
          } else {
            serverName = file.replace(/\.zip$/i, '');
          }

          backups.push({
            fileName: file,
            filePath: fullPath,
            sizeMb,
            mtime: stat.mtimeMs,
            date: stat.mtime.toLocaleString('es-ES'),
            serverName,
          });
        } catch (_) {}
      }
    }

    // Sort newest first
    backups.sort((a, b) => b.mtime - a.mtime);
    return backups;
  } catch (e) {
    console.error('Error listing backups:', e);
    return [];
  }
});

// Select custom backup zip file via dialog
handleRpc('installer:selectBackupFile', async () => {
  try {
    const baseDir = getRootWorkspaceDir();
    const backupsDir = path.join(baseDir, 'backups');
    const defaultDir = fs.existsSync(backupsDir) ? backupsDir : baseDir;

    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Seleccionar archivo de copia de seguridad (.zip)',
      defaultPath: defaultDir,
      filters: [{ name: 'Copias de seguridad (*.zip)', extensions: ['zip'] }],
      properties: ['openFile'],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
  } catch (err) {
    console.error('Error in selectBackupFile dialog:', err);
  }
  return null;
});

// Restore backup - ALWAYS creates a brand new server folder with free ports
handleRpc('installer:restoreBackup', async (data) => {
  const { backupPath, targetFolderName } = data || {};
  try {
    const baseDir = getRootWorkspaceDir();
    if (!backupPath || !fs.existsSync(backupPath)) {
      return { success: false, error: 'El archivo de copia de seguridad no existe.' };
    }

    const normBackupPath = path.resolve(backupPath);
    if (!normBackupPath.toLowerCase().endsWith('.zip')) {
      return { success: false, error: 'El archivo seleccionado debe ser un archivo .zip válido.' };
    }

    // Determine candidate folder name
    let baseFolderName = 'servidor_restaurado';
    if (targetFolderName && typeof targetFolderName === 'string' && targetFolderName.trim()) {
      baseFolderName = targetFolderName.trim().replace(/[\\/:*?"<>|]/g, '_');
    } else {
      const fileName = path.basename(normBackupPath, '.zip');
      const match = fileName.match(/^backup_(.+)_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/i);
      if (match) {
        baseFolderName = `${match[1]}_restaurado`;
      } else {
        baseFolderName = `${fileName}_restaurado`;
      }
    }

    // Ensure folder name is UNIQUE: NEVER overwrite any existing server
    let finalFolderName = baseFolderName;
    let counter = 1;
    while (fs.existsSync(path.join(baseDir, finalFolderName))) {
      finalFolderName = `${baseFolderName}_${counter}`;
      counter++;
    }

    const destDir = path.join(baseDir, finalFolderName);
    fs.mkdirSync(destDir, { recursive: true });

    // Extract zip archive into destDir
    await extractZip(normBackupPath, { dir: destDir });

    // If zip had a single root directory inside it, flatten it up to destDir
    try {
      const extractedItems = fs.readdirSync(destDir);
      if (extractedItems.length === 1) {
        const singleItemPath = path.join(destDir, extractedItems[0]);
        if (fs.statSync(singleItemPath).isDirectory()) {
          const subItems = fs.readdirSync(singleItemPath);
          if (subItems.includes('server.jar') || subItems.includes('server.properties') || subItems.includes('start.bat')) {
            for (const sub of subItems) {
              fs.renameSync(path.join(singleItemPath, sub), path.join(destDir, sub));
            }
            try { fs.rmdirSync(singleItemPath); } catch (_) {}
          }
        }
      }
    } catch (_) {}

    // Clean any session.lock inside world folder so Minecraft starts cleanly
    try {
      const sessionLock = path.join(destDir, 'world', 'session.lock');
      if (fs.existsSync(sessionLock)) {
        fs.unlinkSync(sessionLock);
      }
    } catch (_) {}

    // Scan used ports across all other local servers
    const otherServers = await listLocalServersInternal();
    const usedServerPorts = new Set();
    const usedRconPorts = new Set();
    for (const srv of otherServers) {
      if (path.resolve(srv.path) !== destDir) {
        if (srv.serverPort) usedServerPorts.add(Number(srv.serverPort));
        if (srv.rconPort) usedRconPorts.add(Number(srv.rconPort));
      }
    }

    // Read current ports in server.properties
    let currentServerPort = 25565;
    let currentRconPort = 25575;
    const propsPath = path.join(destDir, 'server.properties');
    let propsContent = '';

    if (fs.existsSync(propsPath)) {
      propsContent = fs.readFileSync(propsPath, 'utf8');
      const sMatch = propsContent.match(/^server-port=(\d+)/m);
      if (sMatch) currentServerPort = parseInt(sMatch[1], 10);
      const rMatch = propsContent.match(/^rcon\.port=(\d+)/m);
      if (rMatch) currentRconPort = parseInt(rMatch[1], 10);
    }

    // Allocate free ports if collision with any existing server
    let finalServerPort = currentServerPort;
    let finalRconPort = currentRconPort;

    if (usedServerPorts.has(finalServerPort)) {
      let candidate = 25565;
      while (usedServerPorts.has(candidate)) {
        candidate++;
      }
      finalServerPort = candidate;
    }

    if (usedRconPorts.has(finalRconPort) || finalRconPort === finalServerPort) {
      let candidate = 25575;
      while (usedRconPorts.has(candidate) || candidate === finalServerPort) {
        candidate++;
      }
      finalRconPort = candidate;
    }

    // Update server.properties with the new ports
    if (fs.existsSync(propsPath)) {
      if (/server-port\s*=/i.test(propsContent)) {
        propsContent = propsContent.replace(/^server-port=.*$/m, `server-port=${finalServerPort}`);
      } else {
        propsContent += `\nserver-port=${finalServerPort}\n`;
      }

      if (/rcon\.port\s*=/i.test(propsContent)) {
        propsContent = propsContent.replace(/^rcon\.port=.*$/m, `rcon.port=${finalRconPort}`);
      } else {
        propsContent += `\nrcon.port=${finalRconPort}\n`;
      }

      fs.writeFileSync(propsPath, propsContent, 'utf8');
    }

    // Update start.bat port reference if present
    const batPath = path.join(destDir, 'start.bat');
    if (fs.existsSync(batPath)) {
      try {
        let batContent = fs.readFileSync(batPath, 'utf8');
        batContent = batContent.replace(/Puerto \d+ \^\| Clave: [^\n\r]+/g, `Puerto ${finalRconPort} ^| Clave: 1234`);
        fs.writeFileSync(batPath, batContent, 'utf8');
      } catch (_) {}
    }

    return {
      success: true,
      folderName: finalFolderName,
      folderPath: destDir,
      serverPort: finalServerPort,
      rconPort: finalRconPort,
    };
  } catch (e) {
    console.error('Error restoring backup:', e);
    return { success: false, error: e.message };
  }
});

handleRpc('installer:getBaseDir', () => getRootWorkspaceDir());

handleRpc('installer:selectFolder', async () => {
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

// -------------------------------------------------------------
// Version 3: Local Web Service Configuration & RPC
// -------------------------------------------------------------
handleRpc('web:getInfo', () => webService.getInfo());

handleRpc('web:getQrCode', async () => {
  return await webService.getQrCodeDataUrl();
});

handleRpc('web:start', async (config) => {
  try {
    const port = config?.port || userSettings.webService?.port || 8080;
    const pin = config?.pin || userSettings.webService?.pin || '1234';
    const info = await webService.start(port, pin);
    saveSettings({
      webService: {
        enabled: true,
        port: Number(port),
        pin: String(pin),
      },
    });
    return { success: true, info };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

handleRpc('web:stop', async () => {
  try {
    await webService.stop();
    saveSettings({
      webService: {
        ...userSettings.webService,
        enabled: false,
      },
    });
    return { success: true, info: webService.getInfo() };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

handleRpc('web:saveConfig', async (config) => {
  try {
    const port = Number(config?.port || 8080);
    const pin = String(config?.pin || '1234');
    const enabled = Boolean(config?.enabled);
    saveSettings({
      webService: {
        enabled,
        port,
        pin,
      },
    });
    if (enabled && !webService.enabled) {
      await webService.start(port, pin);
    } else if (!enabled && webService.enabled) {
      await webService.stop();
    } else if (enabled && webService.enabled && (webService.port !== port || webService.pin !== pin)) {
      await webService.start(port, pin);
    }
    return { success: true, info: webService.getInfo() };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

handleRpc('app:getVersion', () => '3.0.0');
handleRpc('app:getSettings', () => ({ ...userSettings }));
handleRpc('app:saveSettings', (s) => {
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
  
  // Por seguridad y requerimiento, el servidor web debe iniciar desactivado por defecto
  if (userSettings.webService) {
    userSettings.webService.enabled = false;
  }

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
  if (webService) {
    webService.stop();
  }
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
