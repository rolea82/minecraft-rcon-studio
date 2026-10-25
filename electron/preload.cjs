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
  getBaseDir: () => ipcRenderer.invoke('installer:getBaseDir'),
  selectFolder: () => ipcRenderer.invoke('installer:selectFolder'),
  downloadAndSetupServer: (options) => ipcRenderer.invoke('installer:downloadAndSetup', options),
  openServerFolder: (folderPath) => ipcRenderer.invoke('installer:openFolder', folderPath),
  launchServer: (folderPath) => ipcRenderer.invoke('installer:launchServer', folderPath),
  listLocalServers: () => ipcRenderer.invoke('installer:listLocalServers'),
  
  onDownloadProgress: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('installer:progress', subscription);
    return () => ipcRenderer.removeListener('installer:progress', subscription);
  },
  
  // Window controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  
  // App info
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
});
