const http = require('http');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { WebSocketServer, WebSocket } = require('ws');
const QRCode = require('qrcode');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

class WebService {
  constructor(options = {}) {
    this.port = options.port || 8080;
    this.pin = options.pin || '1234';
    this.enabled = false;
    this.server = null;
    this.wss = null;
    this.clients = new Set();
    this.rpcHandlers = {};
  }

  registerRpc(name, fn) {
    this.rpcHandlers[name] = fn;
  }

  setHandlers(handlers) {
    for (const [name, fn] of Object.entries(handlers)) {
      this.registerRpc(name, fn);
    }
  }

  getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return '127.0.0.1';
  }

  async getQrCodeDataUrl() {
    const localIp = this.getLocalIp();
    // URL limpia sin PIN expuesto para mayor seguridad
    const url = `http://${localIp}:${this.port}/`;
    try {
      return await QRCode.toDataURL(url, {
        width: 260,
        margin: 2,
        color: {
          dark: '#10b981',
          light: '#18181b',
        },
      });
    } catch (e) {
      console.error('Error generating QR code:', e);
      return null;
    }
  }

  getInfo() {
    const localIp = this.getLocalIp();
    return {
      enabled: this.enabled,
      port: this.port,
      pin: this.pin,
      localUrl: `http://localhost:${this.port}`,
      networkUrl: `http://${localIp}:${this.port}`,
      connectedClients: this.clients.size,
    };
  }

  broadcastEvent(event, data) {
    if (!this.wss) return;
    const msg = JSON.stringify({ type: 'event', event, data });
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN && client.isAuthenticated) {
        client.send(msg);
      }
    }
  }

  // Backward-compatible wrappers for log & status
  broadcastLog(logData) {
    this.broadcastEvent('server:log', logData);
  }

  broadcastStatus(statusData) {
    this.broadcastEvent('rcon:status-changed', statusData?.rconStatus || statusData);
    this.broadcastEvent('installer:serverStatusChanged', {
      isRunning: Boolean(statusData?.serverRunning),
      runningServers: statusData?.runningServers || [],
    });
  }

  getDistDir() {
    const possiblePaths = [
      path.join(__dirname, '../dist'),
      path.join(__dirname, 'dist'),
      path.join(process.resourcesPath || '', 'app.asar/dist'),
      path.join(process.resourcesPath || '', 'dist'),
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) return p;
    }
    return path.join(__dirname, '../dist');
  }

  start(port = null, pin = null) {
    if (this.enabled) {
      this.stop();
    }

    if (port) this.port = Number(port);
    if (pin) this.pin = String(pin);

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => this.handleHttpRequest(req, res));

      this.wss = new WebSocketServer({ server: this.server });
      this.wss.on('connection', (ws, req) => this.handleWsConnection(ws, req));

      this.server.on('error', (err) => {
        console.error('Web Service HTTP error:', err);
        this.enabled = false;
        reject(err);
      });

      this.server.listen(this.port, '0.0.0.0', () => {
        this.enabled = true;
        console.log(`[WebService v3] Servidor Web SPA activo en http://${this.getLocalIp()}:${this.port}`);
        resolve(this.getInfo());
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      this.enabled = false;
      for (const client of this.clients) {
        try { client.close(); } catch (_) {}
      }
      this.clients.clear();

      if (this.wss) {
        try { this.wss.close(); } catch (_) {}
        this.wss = null;
      }

      if (this.server) {
        try {
          this.server.close(() => {
            this.server = null;
            resolve();
          });
        } catch (_) {
          this.server = null;
          resolve();
        }
      } else {
        resolve();
      }
    });
  }

  handleHttpRequest(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // API: HTTP RPC endpoint (fallback if WebSocket is offline)
    if (pathname === '/api/rpc' && req.method === 'POST') {
      return this.readJsonBody(req, async (data) => {
        const { method, args = [], pin } = data || {};
        if (pin !== this.pin) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'PIN incorrecto o no autorizado' }));
        }

        const handler = this.rpcHandlers[method];
        if (!handler) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: `Método RPC desconocido: ${method}` }));
        }

        try {
          const result = await handler(...args);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, result }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    }

    // API: Validate PIN
    if (pathname === '/api/login' && req.method === 'POST') {
      return this.readJsonBody(req, (data) => {
        if (data && data.pin === this.pin) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'PIN incorrecto' }));
        }
      });
    }

    // Static SPA file serving from dist/
    const distDir = this.getDistDir();
    let relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    let filePath = path.resolve(distDir, relativePath);

    // Prevent directory traversal
    if (!filePath.startsWith(path.resolve(distDir))) {
      res.writeHead(403);
      return res.end('Acceso denegado');
    }

    // If file does not exist or is a directory, fallback to index.html (SPA routing)
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(distDir, 'index.html');
    }

    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000',
      });
      return fs.createReadStream(filePath).pipe(res);
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Archivo dist no encontrado. Asegúrate de compilar la aplicación.');
  }

  handleWsConnection(ws, req) {
    // Seguridad: Iniciar siempre como no autenticado. No se aceptan credenciales por URL.
    ws.isAuthenticated = false;
    this.clients.add(ws);

    // Initial auth acknowledgment solicitando PIN
    ws.send(JSON.stringify({
      type: 'auth_status',
      authenticated: false,
    }));

    ws.on('message', async (message) => {
      try {
        const payload = JSON.parse(message.toString());

        if (payload.type === 'auth') {
          if (payload.pin === this.pin) {
            ws.isAuthenticated = true;
            ws.send(JSON.stringify({ type: 'auth_status', authenticated: true }));
          } else {
            ws.isAuthenticated = false;
            ws.send(JSON.stringify({ type: 'auth_status', authenticated: false, error: 'PIN incorrecto' }));
          }
          return;
        }

        // Full RPC handler
        if (payload.type === 'rpc') {
          const { id, method, args = [] } = payload;
          if (!ws.isAuthenticated && payload.pin === this.pin) {
            ws.isAuthenticated = true;
          }

          if (!ws.isAuthenticated) {
            ws.send(JSON.stringify({ type: 'rpc_response', id, error: 'No autorizado: Se requiere introducir el PIN de seguridad.' }));
            return;
          }

          const handler = this.rpcHandlers[method];
          if (!handler) {
            ws.send(JSON.stringify({ type: 'rpc_response', id, error: `Método desconocido: "${method}"` }));
            return;
          }

          try {
            const result = await handler(...args);
            ws.send(JSON.stringify({ type: 'rpc_response', id, result }));
          } catch (err) {
            ws.send(JSON.stringify({ type: 'rpc_response', id, error: err.message }));
          }
          return;
        }
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', error: err.message }));
      }
    });

    ws.on('close', () => {
      this.clients.delete(ws);
    });

    ws.on('error', () => {
      this.clients.delete(ws);
    });
  }

  readJsonBody(req, callback) {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        callback(parsed);
      } catch (e) {
        callback(null);
      }
    });
  }
}

module.exports = WebService;
