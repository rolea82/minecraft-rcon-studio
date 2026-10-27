const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // RCON controls
  connectRcon: (config) => ipcRenderer.invoke('rcon:connect', config),
  disconnectRcon: () => ipcRenderer.invoke('rcon:disconnect'),
  sendCommand: (command) => ipcRenderer.invoke('rcon:send', command),
  getStatus: () => ipcRenderer.invoke('rcon:getStatus'),
  
  // Listeners
  onConnectionStatusChange: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('rcon:status-changed', subscription);
    return () => ipcRenderer.removeListener('rcon:status-changed', subscription);
  },

  // Version 2: Official Server Installer & Manager
  getMinecraftVersions: () => ipcRenderer.invoke('installer:getVersions'),
  getBedrockVersions: () => ipcRenderer.invoke('installer:getBedrockVersions'),
  getBaseDir: () => ipcRenderer.invoke('installer:getBaseDir'),
  selectFolder: () => ipcRenderer.invoke('installer:selectFolder'),
  downloadAndSetupServer: (options) => ipcRenderer.invoke('installer:downloadAndSetup', options),
  openServerFolder: (folderPath) => ipcRenderer.invoke('installer:openFolder', folderPath),
  launchServer: (folderPath) => ipcRenderer.invoke('installer:launchServer', folderPath),
  stopServer: (folderPath) => ipcRenderer.invoke('installer:stopServer', folderPath),
  sendServerInput: (data) => ipcRenderer.invoke('installer:sendServerInput', data),
  getServerLogs: (folderPath) => ipcRenderer.invoke('installer:getServerLogs', folderPath),
  getRunningServers: () => ipcRenderer.invoke('installer:getRunningServers'),
  listLocalServers: () => ipcRenderer.invoke('installer:listLocalServers'),
  toggleOnlineMode: (folderPath) => ipcRenderer.invoke('installer:toggleOnlineMode', folderPath),
  updateServerPorts: (data) => ipcRenderer.invoke('installer:updateServerPorts', data),
  deleteServer: (folderPath) => ipcRenderer.invoke('installer:deleteServer', folderPath),
  createBackup: (folderPath) => ipcRenderer.invoke('installer:createBackup', folderPath),
  listBackups: () => ipcRenderer.invoke('installer:listBackups'),
  selectBackupFile: () => ipcRenderer.invoke('installer:selectBackupFile'),
  restoreBackup: (options) => ipcRenderer.invoke('installer:restoreBackup', options),
  
  onDownloadProgress: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('installer:progress', subscription);
    return () => ipcRenderer.removeListener('installer:progress', subscription);
  },

  onServerStatusChanged: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('installer:serverStatusChanged', subscription);
    return () => ipcRenderer.removeListener('installer:serverStatusChanged', subscription);
  },

  onServerLog: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('server:log', subscription);
    return () => ipcRenderer.removeListener('server:log', subscription);
  },
  
  // Version 3: Local Web Service & Mobile Control
  getWebInfo: () => ipcRenderer.invoke('web:getInfo'),
  getWebQrCode: () => ipcRenderer.invoke('web:getQrCode'),
  startWebService: (config) => ipcRenderer.invoke('web:start', config),
  stopWebService: () => ipcRenderer.invoke('web:stop'),
  saveWebConfig: (config) => ipcRenderer.invoke('web:saveConfig', config),

  // Window & Tray controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  minimizeToTray: () => ipcRenderer.send('window:minimizeToTray'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  
  // App info & settings
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  getSettings: () => ipcRenderer.invoke('app:getSettings'),
  saveSettings: (settings) => ipcRenderer.invoke('app:saveSettings', settings),
});
