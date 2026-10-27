/**
 * Web Client Bridge for Minecraft RCON Studio v3.0
 * 
 * When running in a standard web browser (Chrome, Edge, Firefox, etc.)
 * outside of Electron, this bridge creates a 100% feature-compatible 
 * window.electronAPI implementation communicating over WebSocket & HTTP RPC.
 */

class WebClientBridge {
  constructor() {
    this.ws = null;
    this.requestId = 1;
    this.pendingRequests = new Map();
    this.listeners = {
      'rcon:status-changed': new Set(),
      'installer:progress': new Set(),
      'installer:serverStatusChanged': new Set(),
      'server:log': new Set(),
    };
    this.pin = this.getStoredPin();
    this.isAuthenticated = false;
    this.isConnected = false;
    this.authCallbacks = new Set();
  }

  getStoredPin() {
    // Si viene algún parámetro en la URL, limpiarlo inmediatamente por seguridad y privacidad
    if (typeof window !== 'undefined' && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      if (params.has('pin') || params.has('token')) {
        const urlPin = params.get('pin') || params.get('token');
        params.delete('pin');
        params.delete('token');
        const newQuery = params.toString();
        const newUrl = window.location.pathname + (newQuery ? '?' + newQuery : '') + window.location.hash;
        window.history.replaceState({}, document.title, newUrl);
        if (urlPin) {
          sessionStorage.setItem('mcrcon_pin', urlPin);
          return urlPin;
        }
      }
    }
    return sessionStorage.getItem('mcrcon_pin') || localStorage.getItem('mcrcon_pin') || '';
  }

  setPin(newPin) {
    this.pin = newPin;
    if (newPin) {
      sessionStorage.setItem('mcrcon_pin', newPin);
      localStorage.setItem('mcrcon_pin', newPin);
    } else {
      sessionStorage.removeItem('mcrcon_pin');
      localStorage.removeItem('mcrcon_pin');
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'auth', pin: newPin }));
    } else {
      this.connectWs();
    }
  }

  logout() {
    this.pin = '';
    this.isAuthenticated = false;
    sessionStorage.removeItem('mcrcon_pin');
    localStorage.removeItem('mcrcon_pin');
    if (this.ws) {
      try { this.ws.close(); } catch (_) {}
    }
    for (const cb of this.authCallbacks) {
      cb(false, null);
    }
  }

  init() {
    this.connectWs();
  }

  connectWs() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // URL limpia sin tokens en la query string
    const wsUrl = `${protocol}//${window.location.host}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        // Si hay un PIN almacenado, autenticar inmediatamente mediante mensaje WebSocket seguro
        if (this.pin) {
          this.ws.send(JSON.stringify({ type: 'auth', pin: this.pin }));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleWsMessage(msg);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.isAuthenticated = false;
        setTimeout(() => this.connectWs(), 3000);
      };

      this.ws.onerror = () => {
        this.isConnected = false;
      };
    } catch (e) {
      console.error('WebSocket connection error:', e);
    }
  }

  handleWsMessage(msg) {
    if (msg.type === 'auth_status') {
      this.isAuthenticated = Boolean(msg.authenticated);
      if (!this.isAuthenticated && msg.error) {
        sessionStorage.removeItem('mcrcon_pin');
        localStorage.removeItem('mcrcon_pin');
      }
      for (const cb of this.authCallbacks) {
        cb(this.isAuthenticated, msg.error || null);
      }
      return;
    }

    if (msg.type === 'rpc_response') {
      const pending = this.pendingRequests.get(msg.id);
      if (pending) {
        this.pendingRequests.delete(msg.id);
        if (msg.error) {
          pending.reject(new Error(msg.error));
        } else {
          pending.resolve(msg.result);
        }
      }
      return;
    }

    if (msg.type === 'event') {
      const callbacks = this.listeners[msg.event];
      if (callbacks) {
        for (const cb of callbacks) {
          try { cb(msg.data); } catch (e) { console.error('Listener error:', e); }
        }
      }
    }
  }

  callRpc(method, ...args) {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        // Fallback to HTTP POST if WebSocket is temporarily connecting
        return this.callHttpRpc(method, args).then(resolve).catch(reject);
      }

      const id = this.requestId++;
      this.pendingRequests.set(id, { resolve, reject });

      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Tiempo de espera agotado al invocar "${method}"`));
        }
      }, 30000);

      const payload = {
        type: 'rpc',
        id,
        method,
        args,
        pin: this.pin,
      };

      this.ws.send(JSON.stringify(payload));
    });
  }

  async callHttpRpc(method, args) {
    const res = await fetch('/api/rpc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.pin}`,
      },
      body: JSON.stringify({ method, args, pin: this.pin }),
    });
    const json = await res.json();
    if (!res.ok || json.error) {
      throw new Error(json.error || `HTTP error ${res.status}`);
    }
    return json.result;
  }

  subscribe(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = new Set();
    this.listeners[event].add(callback);
    return () => {
      this.listeners[event].delete(callback);
    };
  }
}

// Automatically create window.electronAPI polyfill if outside Electron
export function setupWebBridgeIfNeeded() {
  if (typeof window === 'undefined') return;

  // If running inside Electron, native electronAPI is already provided
  if (window.electronAPI) {
    return;
  }

  console.log('[WebClientBridge] Entorno Web detectado. Inicializando puente completo RPC/WebSocket...');
  const bridge = new WebClientBridge();
  bridge.init();

  window.__webBridge = bridge;

  window.electronAPI = {
    isWebBridge: true,
    getBridge: () => bridge,
    setPin: (pin) => bridge.setPin(pin),
    getPin: () => bridge.pin,
    logout: () => bridge.logout(),
    isAuthenticated: () => bridge.isAuthenticated,
    onAuthChange: (callback) => {
      bridge.authCallbacks.add(callback);
      callback(bridge.isAuthenticated);
      return () => bridge.authCallbacks.delete(callback);
    },
    
    // RCON controls
    connectRcon: (config) => bridge.callRpc('rcon:connect', config),
    disconnectRcon: () => bridge.callRpc('rcon:disconnect'),
    sendCommand: (command) => bridge.callRpc('rcon:send', command),
    getStatus: () => bridge.callRpc('rcon:getStatus'),

    // Listeners
    onConnectionStatusChange: (callback) => bridge.subscribe('rcon:status-changed', callback),

    // Version 2 & 3: Official Server Installer & Manager
    getMinecraftVersions: () => bridge.callRpc('installer:getVersions'),
    getBaseDir: () => bridge.callRpc('installer:getBaseDir'),
    selectFolder: () => bridge.callRpc('installer:selectFolder'),
    downloadAndSetupServer: (options) => bridge.callRpc('installer:downloadAndSetup', options),
    openServerFolder: (folderPath) => bridge.callRpc('installer:openFolder', folderPath),
    launchServer: (folderPath) => bridge.callRpc('installer:launchServer', folderPath),
    stopServer: (folderPath) => bridge.callRpc('installer:stopServer', folderPath),
    sendServerInput: (data) => bridge.callRpc('installer:sendServerInput', data),
    getServerLogs: (folderPath) => bridge.callRpc('installer:getServerLogs', folderPath),
    getRunningServers: () => bridge.callRpc('installer:getRunningServers'),
    listLocalServers: () => bridge.callRpc('installer:listLocalServers'),
    toggleOnlineMode: (folderPath) => bridge.callRpc('installer:toggleOnlineMode', folderPath),
    updateServerPorts: (data) => bridge.callRpc('installer:updateServerPorts', data),
    deleteServer: (folderPath) => bridge.callRpc('installer:deleteServer', folderPath),
    createBackup: (folderPath) => bridge.callRpc('installer:createBackup', folderPath),
    listBackups: () => bridge.callRpc('installer:listBackups'),
    selectBackupFile: () => bridge.callRpc('installer:selectBackupFile'),
    restoreBackup: (options) => bridge.callRpc('installer:restoreBackup', options),

    onDownloadProgress: (callback) => bridge.subscribe('installer:progress', callback),
    onServerStatusChanged: (callback) => bridge.subscribe('installer:serverStatusChanged', callback),
    onServerLog: (callback) => bridge.subscribe('server:log', callback),

    // Version 3: Local Web Service
    getWebInfo: () => bridge.callRpc('web:getInfo'),
    getWebQrCode: () => bridge.callRpc('web:getQrCode'),
    startWebService: (config) => bridge.callRpc('web:start', config),
    stopWebService: () => bridge.callRpc('web:stop'),
    saveWebConfig: (config) => bridge.callRpc('web:saveConfig', config),

    // Window & Tray controls (No-ops in browser)
    minimizeWindow: () => {},
    minimizeToTray: () => {},
    maximizeWindow: () => {},
    closeWindow: () => {},

    // App info & settings
    getAppVersion: () => bridge.callRpc('app:getVersion'),
    getSettings: () => bridge.callRpc('app:getSettings'),
    saveSettings: (settings) => bridge.callRpc('app:saveSettings', settings),
  };
}
