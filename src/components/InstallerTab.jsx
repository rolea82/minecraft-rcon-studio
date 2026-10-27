import React, { useState, useEffect } from 'react';
import { 
  Download, 
  FolderPlus, 
  Server, 
  Check, 
  Play, 
  FolderOpen, 
  Wifi, 
  ShieldCheck, 
  Sparkles, 
  RefreshCw, 
  AlertCircle, 
  Layers, 
  Cpu, 
  Lock, 
  Key, 
  ExternalLink,
  ChevronDown,
  Search,
  CheckCircle2,
  Sliders,
  X,
  Trash2,
  Archive,
  RotateCcw,
  FileArchive
} from 'lucide-react';

function getNextAvailablePorts(serversList, edition = 'java') {
  if (edition === 'bedrock') {
    let nextServerPort = 19132;
    let nextServerPortV6 = 19133;
    let nextRconPort = 25575;

    if (serversList && serversList.length > 0) {
      const bedrockServers = serversList.filter((s) => s.serverType === 'bedrock');
      const sPorts = bedrockServers
        .map((s) => s.serverPort)
        .filter((p) => typeof p === 'number' && !isNaN(p) && p >= 1024);
      const rPorts = serversList
        .map((s) => s.rconPort)
        .filter((p) => typeof p === 'number' && !isNaN(p) && p >= 1024);

      if (sPorts.length > 0) {
        nextServerPort = Math.max(...sPorts) + 2;
        nextServerPortV6 = nextServerPort + 1;
      }
      if (rPorts.length > 0) {
        nextRconPort = Math.max(...rPorts) + 1;
      }
    }
    return { nextServerPort, nextServerPortV6, nextRconPort };
  }

  let nextServerPort = 25565;
  let nextRconPort = 25575;

  if (serversList && serversList.length > 0) {
    const javaServers = serversList.filter((s) => s.serverType !== 'bedrock');
    const sPorts = javaServers
      .map((s) => s.serverPort)
      .filter((p) => typeof p === 'number' && !isNaN(p) && p > 0);
    const rPorts = serversList
      .map((s) => s.rconPort)
      .filter((p) => typeof p === 'number' && !isNaN(p) && p > 0);

    if (sPorts.length > 0) {
      nextServerPort = Math.max(...sPorts) + 1;
    }
    if (rPorts.length > 0) {
      nextRconPort = Math.max(...rPorts) + 1;
    }
  }

  return { nextServerPort, nextRconPort };
}

function generateUniqueFolderName(baseName, serversList) {
  if (!serversList || serversList.length === 0) return baseName;
  const existingNames = new Set(serversList.map((s) => (s.name || '').toLowerCase()));
  if (!existingNames.has(baseName.toLowerCase())) return baseName;

  let counter = 2;
  while (existingNames.has(`${baseName}_${counter}`.toLowerCase())) {
    counter++;
  }
  return `${baseName}_${counter}`;
}

export default function InstallerTab({ onConnectToServer, onNavigateToConsole }) {
  const isWeb = Boolean(window.electronAPI?.isWebBridge);

  // Server Edition switch: 'java' | 'bedrock'
  const [serverEdition, setServerEdition] = useState('java');

  // Java versions and config
  const [versions, setVersions] = useState([]);
  const [latestRelease, setLatestRelease] = useState('1.21.4');
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [versionFilter, setVersionFilter] = useState('release'); // 'release' | 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingVersions, setIsLoadingVersions] = useState(true);

  // Java Configuration form fields
  const [folderName, setFolderName] = useState('');
  const [baseDir, setBaseDir] = useState('');
  const [customPath, setCustomPath] = useState('');
  const [rconPassword, setRconPassword] = useState('1234');
  const [rconPort, setRconPort] = useState(25575);
  const [serverPort, setServerPort] = useState(25565);
  const [ramGb, setRamGb] = useState(4);
  const [acceptEula, setAcceptEula] = useState(true);
  const [optimizeProperties, setOptimizeProperties] = useState(true);
  const [allowOfflinePlayers, setAllowOfflinePlayers] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Bedrock Configuration form fields
  const [bedrockVersions, setBedrockVersions] = useState([]);
  const [selectedBedrockVersion, setSelectedBedrockVersion] = useState(null);
  const [bedrockFolderName, setBedrockFolderName] = useState('servidor_bedrock_1.21.51');
  const [bedrockServerName, setBedrockServerName] = useState('Mi Servidor Bedrock');
  const [bedrockServerPort, setBedrockServerPort] = useState(19132);
  const [bedrockServerPortV6, setBedrockServerPortV6] = useState(19133);
  const [bedrockRconPort, setBedrockRconPort] = useState(25575);
  const [bedrockRconPassword, setBedrockRconPassword] = useState('1234');
  const [bedrockGamemode, setBedrockGamemode] = useState('survival');
  const [bedrockDifficulty, setBedrockDifficulty] = useState('easy');
  const [bedrockAllowCheats, setBedrockAllowCheats] = useState(true);
  const [bedrockOnlineMode, setBedrockOnlineMode] = useState(false);
  const [bedrockAllowList, setBedrockAllowList] = useState(false);
  const [bedrockTickDistance, setBedrockTickDistance] = useState(4);
  const [bedrockAcceptEula, setBedrockAcceptEula] = useState(true);

  // Download & creation state
  const [isInstalling, setIsInstalling] = useState(false);
  const [progressData, setProgressData] = useState({ percent: 0, statusText: '' });
  const [installResult, setInstallResult] = useState(null);

  // Local installed servers list
  const [localServers, setLocalServers] = useState([]);
  const [isLoadingServers, setIsLoadingServers] = useState(false);
  const [launchingServer, setLaunchingServer] = useState(null);

  // Edit server ports modal state
  const [editingServer, setEditingServer] = useState(null);
  const [editServerPort, setEditServerPort] = useState(25565);
  const [editServerPortV6, setEditServerPortV6] = useState(19133);
  const [editRconPort, setEditRconPort] = useState(25575);
  const [editRconPassword, setEditRconPassword] = useState('');
  const [editError, setEditError] = useState('');
  const [isSavingPorts, setIsSavingPorts] = useState(false);
  const [portsSuccessMessage, setPortsSuccessMessage] = useState('');

  // Delete server modal state
  const [serverToDelete, setServerToDelete] = useState(null);
  const [isDeletingServer, setIsDeletingServer] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Backup state
  const [backingUpServer, setBackingUpServer] = useState(null);

  // Restore server modal state
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [backupsList, setBackupsList] = useState([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [selectedBackupPath, setSelectedBackupPath] = useState('');
  const [restoreServerName, setRestoreServerName] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState('');

  // Load versions manifest on mount
  useEffect(() => {
    fetchVersions();
    fetchBedrockVersions();
    refreshLocalServers();

    if (window.electronAPI?.getBaseDir) {
      window.electronAPI.getBaseDir().then((dir) => {
        if (dir) setBaseDir(dir);
      });
    }

    if (window.electronAPI?.onDownloadProgress) {
      const cleanup = window.electronAPI.onDownloadProgress((data) => {
        setProgressData(data);
      });
      return cleanup;
    }
  }, []);

  // Listen to server status changes and poll periodically
  useEffect(() => {
    let cleanupStatus = null;
    if (window.electronAPI?.onServerStatusChanged) {
      cleanupStatus = window.electronAPI.onServerStatusChanged(({ folderPath, isRunning }) => {
        setLocalServers((prev) =>
          prev.map((s) => (s.path === folderPath ? { ...s, isRunning } : s))
        );
      });
    }

    const interval = setInterval(() => {
      refreshLocalServers(false);
    }, 4000);

    return () => {
      if (cleanupStatus) cleanupStatus();
      clearInterval(interval);
    };
  }, []);

  // Sync available ports when changing edition or local servers
  useEffect(() => {
    if (serverEdition === 'bedrock') {
      const { nextServerPort, nextServerPortV6, nextRconPort } = getNextAvailablePorts(localServers, 'bedrock');
      setBedrockServerPort(nextServerPort);
      setBedrockServerPortV6(nextServerPortV6);
      setBedrockRconPort(nextRconPort);
    } else {
      const { nextServerPort, nextRconPort } = getNextAvailablePorts(localServers, 'java');
      setServerPort(nextServerPort);
      setRconPort(nextRconPort);
    }
  }, [serverEdition, localServers.length]);

  const handleBrowseFolder = async () => {
    if (window.electronAPI?.selectFolder) {
      const selected = await window.electronAPI.selectFolder();
      if (selected) {
        setCustomPath(selected);
      }
    }
  };

  const fetchBedrockVersions = async () => {
    try {
      if (window.electronAPI?.getBedrockVersions) {
        const res = await window.electronAPI.getBedrockVersions();
        if (res.success && res.versions?.length > 0) {
          setBedrockVersions(res.versions);
          setSelectedBedrockVersion(res.versions[0]);
          setBedrockFolderName(generateUniqueFolderName(`servidor_bedrock_${res.versions[0].id}`, localServers));
          return;
        }
      }
    } catch (_) {}
    const defaultBds = [
      { id: '1.21.51.02', type: 'release', releaseTime: '2024-12-10', url: 'https://www.minecraft.net/bedrockdedicatedserver/bin-win/bedrock-server-1.21.51.02.zip' },
      { id: '1.21.50.07', type: 'release', releaseTime: '2024-12-03', url: 'https://www.minecraft.net/bedrockdedicatedserver/bin-win/bedrock-server-1.21.50.07.zip' },
      { id: '1.21.44.01', type: 'release', releaseTime: '2024-11-12', url: 'https://www.minecraft.net/bedrockdedicatedserver/bin-win/bedrock-server-1.21.44.01.zip' },
      { id: '1.21.30.03', type: 'release', releaseTime: '2024-09-17', url: 'https://www.minecraft.net/bedrockdedicatedserver/bin-win/bedrock-server-1.21.30.03.zip' },
      { id: '1.20.81.01', type: 'release', releaseTime: '2024-04-29', url: 'https://www.minecraft.net/bedrockdedicatedserver/bin-win/bedrock-server-1.20.81.01.zip' },
    ];
    setBedrockVersions(defaultBds);
    setSelectedBedrockVersion(defaultBds[0]);
    setBedrockFolderName(generateUniqueFolderName(`servidor_bedrock_${defaultBds[0].id}`, localServers));
  };

  const fetchVersions = async () => {
    setIsLoadingVersions(true);
    try {
      if (window.electronAPI?.getMinecraftVersions) {
        const res = await window.electronAPI.getMinecraftVersions();
        if (res.success && res.versions?.length > 0) {
          setVersions(res.versions);
          if (res.latest?.release) {
            setLatestRelease(res.latest.release);
            const initial = res.versions.find((v) => v.id === res.latest.release) || res.versions[0];
            setSelectedVersion(initial);
            setFolderName(generateUniqueFolderName(`servidor_${initial.id}`, localServers));
          }
        }
      } else {
        // Fallback for browser preview
        const dummyVersions = [
          { id: '1.21.4', type: 'release', releaseTime: '2024-12-03' },
          { id: '1.21.3', type: 'release', releaseTime: '2024-10-23' },
          { id: '1.21.1', type: 'release', releaseTime: '2024-08-08' },
          { id: '1.20.4', type: 'release', releaseTime: '2023-12-07' },
          { id: '1.20.1', type: 'release', releaseTime: '2023-06-12' },
          { id: '1.19.4', type: 'release', releaseTime: '2023-03-14' },
          { id: '1.18.2', type: 'release', releaseTime: '2022-02-28' },
          { id: '1.16.5', type: 'release', releaseTime: '2021-01-15' },
        ];
        setVersions(dummyVersions);
        setSelectedVersion(dummyVersions[0]);
        setFolderName(generateUniqueFolderName(`servidor_${dummyVersions[0].id}`, localServers));
      }
    } finally {
      setIsLoadingVersions(false);
    }
  };

  const refreshLocalServers = async (showLoading = true) => {
    if (window.electronAPI?.listLocalServers) {
      if (showLoading) setIsLoadingServers(true);
      try {
        const list = await window.electronAPI.listLocalServers();
        setLocalServers(list || []);
        if (serverEdition === 'bedrock') {
          const { nextServerPort, nextServerPortV6, nextRconPort } = getNextAvailablePorts(list || [], 'bedrock');
          setBedrockServerPort(nextServerPort);
          setBedrockServerPortV6(nextServerPortV6);
          setBedrockRconPort(nextRconPort);
        } else {
          const { nextServerPort, nextRconPort } = getNextAvailablePorts(list || [], 'java');
          setServerPort(nextServerPort);
          setRconPort(nextRconPort);
          if (selectedVersion) {
            setFolderName(generateUniqueFolderName(`servidor_${selectedVersion.id}`, list || []));
          }
        }
      } catch (err) {
        console.error('Error refreshing local servers:', err);
      } finally {
        if (showLoading) setIsLoadingServers(false);
      }
    }
  };

  const handleToggleOnlineMode = async (folderPath) => {
    if (window.electronAPI?.toggleOnlineMode) {
      const res = await window.electronAPI.toggleOnlineMode(folderPath);
      if (res.success) {
        setLocalServers((prev) =>
          prev.map((s) => (s.path === folderPath ? { ...s, onlineMode: res.onlineMode } : s))
        );
      }
    }
  };

  const handleSelectVersion = (version) => {
    setSelectedVersion(version);
    setFolderName(generateUniqueFolderName(`servidor_${version.id}`, localServers));
    const { nextServerPort, nextRconPort } = getNextAvailablePorts(localServers, 'java');
    setServerPort(nextServerPort);
    setRconPort(nextRconPort);
    setInstallResult(null);
  };

  const handleSelectBedrockVersion = (v) => {
    setSelectedBedrockVersion(v);
    setBedrockFolderName(generateUniqueFolderName(`servidor_bedrock_${v.id}`, localServers));
    const { nextServerPort, nextServerPortV6, nextRconPort } = getNextAvailablePorts(localServers, 'bedrock');
    setBedrockServerPort(nextServerPort);
    setBedrockServerPortV6(nextServerPortV6);
    setBedrockRconPort(nextRconPort);
    setInstallResult(null);
  };

  const handleOpenEditPorts = (srv) => {
    setEditingServer(srv);
    setEditServerPort(srv.serverPort || (srv.serverType === 'bedrock' ? 19132 : 25565));
    setEditServerPortV6(srv.serverPortV6 || (srv.serverPort ? srv.serverPort + 1 : 19133));
    setEditRconPort(srv.rconPort || 25575);
    setEditRconPassword(srv.rconPassword || '');
    setEditError('');
  };

  const handleSavePorts = async (e) => {
    e.preventDefault();
    if (!editingServer) return;

    if (editingServer.isRunning) {
      setEditError('Debes detener el servidor antes de cambiar sus puertos de red.');
      return;
    }

    const sPort = parseInt(editServerPort, 10);
    const rPort = parseInt(editRconPort, 10);
    if (isNaN(sPort) || sPort < 1024 || sPort > 65535) {
      setEditError('El puerto de juego debe estar entre 1024 y 65535.');
      return;
    }
    if (isNaN(rPort) || rPort < 1024 || rPort > 65535) {
      setEditError('El puerto RCON debe estar entre 1024 y 65535.');
      return;
    }
    if (sPort === rPort) {
      setEditError('El puerto de juego y el puerto RCON deben ser diferentes.');
      return;
    }

    setIsSavingPorts(true);
    setEditError('');
    try {
      if (window.electronAPI?.updateServerPorts) {
        const res = await window.electronAPI.updateServerPorts({
          folderPath: editingServer.path,
          serverPort: sPort,
          serverPortV6: editingServer.serverType === 'bedrock' ? parseInt(editServerPortV6, 10) : undefined,
          rconPort: rPort,
          rconPassword: editRconPassword,
        });

        if (res.success) {
          setLocalServers((prev) =>
            prev.map((s) =>
              s.path === editingServer.path
                ? {
                    ...s,
                    serverPort: sPort,
                    serverPortV6: editingServer.serverType === 'bedrock' ? parseInt(editServerPortV6, 10) : s.serverPortV6,
                    rconPort: rPort,
                    rconPassword: editRconPassword || s.rconPassword,
                  }
                : s
            )
          );
          setEditingServer(null);
          setPortsSuccessMessage(`¡Puertos actualizados para ${editingServer.name}! (Juego: ${sPort}, RCON: ${rPort})`);
          setTimeout(() => setPortsSuccessMessage(''), 4000);
        } else {
          setEditError(res.error || 'Error al guardar los puertos');
        }
      }
    } catch (err) {
      setEditError(err.message);
    } finally {
      setIsSavingPorts(false);
    }
  };

  const handleStartBackup = async (srv) => {
    setBackingUpServer(srv.path);
    try {
      if (window.electronAPI?.createBackup) {
        const res = await window.electronAPI.createBackup(srv.path);
        if (res.success) {
          setPortsSuccessMessage(`✓ Copia de seguridad creada: ${res.fileName} (${res.sizeMb} MB) guardada en la carpeta "backups"`);
          setTimeout(() => setPortsSuccessMessage(''), 6000);
        } else {
          setPortsSuccessMessage(`✗ Error al crear backup: ${res.error}`);
          setTimeout(() => setPortsSuccessMessage(''), 5000);
        }
      }
    } catch (err) {
      setPortsSuccessMessage(`✗ Error: ${err.message}`);
      setTimeout(() => setPortsSuccessMessage(''), 5000);
    } finally {
      setBackingUpServer(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!serverToDelete) return;
    setIsDeletingServer(true);
    setDeleteError('');
    try {
      if (window.electronAPI?.deleteServer) {
        const res = await window.electronAPI.deleteServer(serverToDelete.path);
        if (res.success) {
          setLocalServers((prev) => prev.filter((s) => s.path !== serverToDelete.path));
          setPortsSuccessMessage(`✓ Servidor "${serverToDelete.name}" eliminado correctamente.`);
          setTimeout(() => setPortsSuccessMessage(''), 4000);
          setServerToDelete(null);
        } else {
          setDeleteError(res.error || 'No se pudo eliminar el servidor.');
        }
      }
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setIsDeletingServer(false);
    }
  };

  const handleOpenRestoreModal = async () => {
    setIsRestoreModalOpen(true);
    setRestoreError('');
    setSelectedBackupPath('');
    setRestoreServerName('');
    setIsLoadingBackups(true);
    try {
      if (window.electronAPI?.listBackups) {
        const list = await window.electronAPI.listBackups();
        setBackupsList(list || []);
        if (list && list.length > 0) {
          setSelectedBackupPath(list[0].filePath);
          const baseName = list[0].serverName ? `${list[0].serverName}_restaurado` : 'servidor_restaurado';
          setRestoreServerName(generateUniqueFolderName(baseName, localServers));
        }
      }
    } catch (err) {
      console.error('Error loading backups list:', err);
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleSelectBackupItem = (backup) => {
    setSelectedBackupPath(backup.filePath);
    const baseName = backup.serverName ? `${backup.serverName}_restaurado` : 'servidor_restaurado';
    setRestoreServerName(generateUniqueFolderName(baseName, localServers));
    setRestoreError('');
  };

  const handleBrowseCustomBackupFile = async () => {
    if (window.electronAPI?.selectBackupFile) {
      const selected = await window.electronAPI.selectBackupFile();
      if (selected) {
        setSelectedBackupPath(selected);
        const fileName = selected.split(/[\\/]/).pop().replace(/\.zip$/i, '');
        const baseName = `${fileName}_restaurado`;
        setRestoreServerName(generateUniqueFolderName(baseName, localServers));
        setRestoreError('');
      }
    }
  };

  const handleConfirmRestore = async (e) => {
    e.preventDefault();
    if (!selectedBackupPath) {
      setRestoreError('Por favor selecciona un archivo de copia de seguridad (.zip).');
      return;
    }

    setIsRestoring(true);
    setRestoreError('');
    try {
      if (window.electronAPI?.restoreBackup) {
        const res = await window.electronAPI.restoreBackup({
          backupPath: selectedBackupPath,
          targetFolderName: restoreServerName.trim() || undefined,
        });

        if (res.success) {
          setIsRestoreModalOpen(false);
          await refreshLocalServers(true);
          setPortsSuccessMessage(`✓ Servidor "${res.folderName}" restaurado exitosamente como un nuevo servidor con puertos libres (Juego: ${res.serverPort}, RCON: ${res.rconPort}).`);
          setTimeout(() => setPortsSuccessMessage(''), 6000);
        } else {
          setRestoreError(res.error || 'Error al restaurar la copia de seguridad.');
        }
      }
    } catch (err) {
      setRestoreError(err.message);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleStartInstallation = async (e) => {
    e.preventDefault();
    if (serverEdition === 'java' && !selectedVersion) return;
    if (serverEdition === 'bedrock' && !selectedBedrockVersion) return;

    setIsInstalling(true);
    setInstallResult(null);
    setProgressData({ percent: 5, statusText: 'Iniciando proceso...' });

    try {
      if (window.electronAPI?.downloadAndSetupServer) {
        let options = {};
        if (serverEdition === 'bedrock') {
          options = {
            serverEdition: 'bedrock',
            versionId: selectedBedrockVersion.id,
            versionUrl: selectedBedrockVersion.url,
            folderName: bedrockFolderName,
            customInstallPath: customPath || baseDir || null,
            rconPassword: bedrockRconPassword,
            rconPort: Number(bedrockRconPort),
            serverPort: Number(bedrockServerPort),
            serverPortV6: Number(bedrockServerPortV6),
            onlineMode: bedrockOnlineMode,
            acceptEula: bedrockAcceptEula,
            bedrockServerName,
            gamemode: bedrockGamemode,
            difficulty: bedrockDifficulty,
            allowCheats: bedrockAllowCheats,
            allowList: bedrockAllowList,
            tickDistance: Number(bedrockTickDistance),
          };
        } else {
          options = {
            serverEdition: 'java',
            versionId: selectedVersion.id,
            versionUrl: selectedVersion.url,
            folderName,
            customInstallPath: customPath || baseDir || null,
            rconPassword,
            rconPort: Number(rconPort),
            serverPort: Number(serverPort),
            ramGb: Number(ramGb),
            acceptEula,
            optimizeProperties,
            onlineMode: !allowOfflinePlayers,
          };
        }

        const result = await window.electronAPI.downloadAndSetupServer(options);

        if (result.success) {
          setInstallResult(result);
          refreshLocalServers(true);
        } else {
          setInstallResult({ success: false, error: result.error });
        }
      } else {
        // Mock for browser
        setTimeout(() => {
          setInstallResult({
            success: true,
            folderName: serverEdition === 'bedrock' ? bedrockFolderName : folderName,
            folderPath: `D:\\Proyectos\\mcrcon\\${serverEdition === 'bedrock' ? bedrockFolderName : folderName}`,
            versionId: serverEdition === 'bedrock' ? selectedBedrockVersion?.id : selectedVersion?.id,
            serverType: serverEdition,
            rconPassword: serverEdition === 'bedrock' ? bedrockRconPassword : rconPassword,
            rconPort: serverEdition === 'bedrock' ? bedrockRconPort : rconPort,
            onlineMode: serverEdition === 'bedrock' ? bedrockOnlineMode : !allowOfflinePlayers,
          });
          setIsInstalling(false);
        }, 1500);
        return;
      }
    } catch (err) {
      setInstallResult({ success: false, error: err.message });
    } finally {
      setIsInstalling(false);
    }
  };

  const handleOpenFolder = async (folderPath) => {
    if (window.electronAPI?.openServerFolder) {
      await window.electronAPI.openServerFolder(folderPath);
    }
  };

  const handleLaunchServer = async (folderPath) => {
    const existing = localServers.find((s) => s.path === folderPath);
    if (existing?.isRunning) return;

    if (window.electronAPI?.launchServer) {
      setLaunchingServer(folderPath);
      const res = await window.electronAPI.launchServer(folderPath);
      if (res?.success) {
        setLocalServers((prev) =>
          prev.map((s) => (s.path === folderPath ? { ...s, isRunning: true } : s))
        );
      }
      setTimeout(() => setLaunchingServer(null), 1500);
    }
  };

  const handleStopServer = async (folderPath) => {
    if (window.electronAPI?.stopServer) {
      await window.electronAPI.stopServer(folderPath);
      refreshLocalServers(true);
    }
  };

  const handleConnectDirectly = async (serverInfo) => {
    // Si el servidor está apagado, iniciarlo automáticamente
    if (!serverInfo.isRunning) {
      if (window.electronAPI?.launchServer) {
        setLaunchingServer(serverInfo.path);
        const res = await window.electronAPI.launchServer(serverInfo.path);
        if (res?.success) {
          setLocalServers((prev) =>
            prev.map((s) => (s.path === serverInfo.path ? { ...s, isRunning: true } : s))
          );
        }
        setTimeout(() => setLaunchingServer(null), 1500);
      }
    }

    if (onConnectToServer) {
      onConnectToServer({
        host: '127.0.0.1',
        port: serverInfo.rconPort || (serverInfo.serverType === 'bedrock' ? 19132 : 25575),
        password: serverInfo.rconPassword || '1234',
        serverType: serverInfo.serverType || 'auto',
        isLocal: true,
        folderPath: serverInfo.path || serverInfo.folderPath,
      });
    }
  };

  // Filter versions
  const filteredVersions = versions.filter((v) => {
    if (versionFilter === 'release' && v.type !== 'release') return false;
    if (searchQuery.trim()) {
      return v.id.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-mc-card to-zinc-900 border border-emerald-500/30 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base">Instalador Oficial de Servidores Minecraft</h3>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Descarga cualquier versión oficial desde Mojang, genera la carpeta, activa RCON y acepta el EULA automáticamente.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Creator / Downloader Wizard Form */}
        <div className="lg:col-span-2 space-y-5">
          <form onSubmit={handleStartInstallation} className="bg-mc-card border border-mc-border rounded-2xl p-5 space-y-5">
            {/* Edition Selector Switch */}
            <div className="flex items-center gap-2 p-1 bg-zinc-900 rounded-xl border border-mc-border">
              <button
                type="button"
                onClick={() => setServerEdition('java')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
                  serverEdition === 'java'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <span className="text-base">☕</span>
                <span>Minecraft Java Edition</span>
              </button>
              <button
                type="button"
                onClick={() => setServerEdition('bedrock')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
                  serverEdition === 'bedrock'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-950/50'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <span className="text-base">🧱</span>
                <span>Minecraft Bedrock Edition (BDS)</span>
              </button>
            </div>

            {serverEdition === 'bedrock' ? (
              /* BEDROCK WIZARD */
              <>
                {/* Step 1: Bedrock Version Selector */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[11px] font-bold">1</span>
                    Versión Oficial de Bedrock Dedicated Server (BDS):
                  </label>
                  <div className="relative">
                    <select
                      value={selectedBedrockVersion?.id || ''}
                      onChange={(e) => {
                        const v = bedrockVersions.find((x) => x.id === e.target.value);
                        if (v) handleSelectBedrockVersion(v);
                      }}
                      className="w-full bg-zinc-900 border border-mc-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono cursor-pointer"
                    >
                      {bedrockVersions.map((v, idx) => (
                        <option key={v.id} value={v.id} className="bg-zinc-900 text-white py-1">
                          Bedrock BDS {v.id} {idx === 0 ? '⭐ (Última Oficial para Windows)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Step 2: Bedrock Configuration */}
                <div className="space-y-4 pt-4 border-t border-mc-border/60">
                  <label className="text-xs font-semibold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[11px] font-bold">2</span>
                    Configuración del Servidor Bedrock:
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Folder Name */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-zinc-300 font-medium flex items-center gap-1.5">
                          <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
                          {isWeb ? 'Nombre del Servidor:' : 'Carpeta de Instalación:'}
                        </span>
                        {!isWeb && (
                          <button
                            type="button"
                            onClick={handleBrowseFolder}
                            className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 hover:underline"
                          >
                            <FolderOpen className="w-3 h-3" /> Cambiar...
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={bedrockFolderName}
                        onChange={(e) => setBedrockFolderName(e.target.value)}
                        required
                        placeholder="servidor_bedrock_1.21.51"
                        className="w-full bg-zinc-900 border border-mc-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                      />
                      {!isWeb ? (
                        <p className="text-[10px] text-zinc-500 truncate font-mono">
                          Destino: <span className="text-zinc-400">{(customPath || baseDir || '...')}\{bedrockFolderName}</span>
                        </p>
                      ) : (
                        <p className="text-[10px] text-zinc-500 font-mono">
                          Identificador: <span className="text-amber-400 font-semibold">{bedrockFolderName}</span>
                        </p>
                      )}
                    </div>

                    {/* Server Name in server.properties */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] text-zinc-300 font-medium flex items-center gap-1.5">
                        <Server className="w-3.5 h-3.5 text-amber-400" />
                        Nombre en Pantalla (server-name):
                      </span>
                      <input
                        type="text"
                        value={bedrockServerName}
                        onChange={(e) => setBedrockServerName(e.target.value)}
                        required
                        placeholder="Mi Servidor Bedrock"
                        className="w-full bg-zinc-900 border border-mc-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                      <p className="text-[10px] text-zinc-500">Visible para amigos en la pestaña Servidores / LAN.</p>
                    </div>
                  </div>

                  {/* Network Ports */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-medium text-zinc-300">
                        Puerto IPv4 (server-port):
                      </label>
                      <input
                        type="number"
                        min="1024"
                        max="65535"
                        value={bedrockServerPort}
                        onChange={(e) => setBedrockServerPort(parseInt(e.target.value) || 19132)}
                        className="w-full bg-zinc-900 border border-mc-border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                      />
                      <p className="text-[10px] text-zinc-500">Por defecto: 19132</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-medium text-zinc-300">
                        Puerto IPv6 (server-portv6):
                      </label>
                      <input
                        type="number"
                        min="1024"
                        max="65535"
                        value={bedrockServerPortV6}
                        onChange={(e) => setBedrockServerPortV6(parseInt(e.target.value) || 19133)}
                        className="w-full bg-zinc-900 border border-mc-border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                      />
                      <p className="text-[10px] text-zinc-500">Por defecto: 19133</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-medium text-zinc-300">
                        Puerto RCON (rcon.port):
                      </label>
                      <input
                        type="number"
                        min="1024"
                        max="65535"
                        value={bedrockRconPort}
                        onChange={(e) => setBedrockRconPort(parseInt(e.target.value) || 25575)}
                        className="w-full bg-zinc-900 border border-mc-border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                      />
                      <p className="text-[10px] text-zinc-500">Para control remoto RCON</p>
                    </div>
                  </div>

                  {/* Game Parameters */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-medium text-zinc-300">
                        Modo de Juego (gamemode):
                      </label>
                      <select
                        value={bedrockGamemode}
                        onChange={(e) => setBedrockGamemode(e.target.value)}
                        className="w-full bg-zinc-900 border border-mc-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="survival">⚔️ Supervivencia (survival)</option>
                        <option value="creative">🧱 Creativo (creative)</option>
                        <option value="adventure">🗺️ Aventura (adventure)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-medium text-zinc-300">
                        Dificultad (difficulty):
                      </label>
                      <select
                        value={bedrockDifficulty}
                        onChange={(e) => setBedrockDifficulty(e.target.value)}
                        className="w-full bg-zinc-900 border border-mc-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="peaceful">🕊️ Pacífico (peaceful)</option>
                        <option value="easy">🌱 Fácil (easy)</option>
                        <option value="normal">⚖️ Normal (normal)</option>
                        <option value="hard">💀 Difícil (hard)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 bg-zinc-900/40 p-2.5 rounded-xl border border-mc-border flex flex-col justify-between">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-zinc-300">Ticks Simulación:</span>
                        <span className="text-amber-400 font-bold font-mono px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">{bedrockTickDistance} chunks</span>
                      </div>
                      <input
                        type="range"
                        min="4"
                        max="10"
                        step="1"
                        value={bedrockTickDistance}
                        onChange={(e) => setBedrockTickDistance(parseInt(e.target.value, 10))}
                        className="w-full accent-amber-500 bg-zinc-800 rounded-lg cursor-pointer h-2"
                      />
                      <p className="text-[10px] text-zinc-500 text-center">tick-distance (4 recomendado)</p>
                    </div>
                  </div>

                  {/* Bedrock Toggles */}
                  <div className="pt-2">
                    <span className="block text-[11px] font-medium text-zinc-300 mb-2">
                      Opciones de acceso y permisos:
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      <label className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-900/60 border border-mc-border cursor-pointer hover:border-amber-500/40 transition-colors">
                        <input
                          type="checkbox"
                          checked={bedrockAcceptEula}
                          onChange={(e) => setBedrockAcceptEula(e.target.checked)}
                          className="w-4 h-4 mt-0.5 accent-amber-500 rounded cursor-pointer shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-zinc-200">Aceptar EULA Bedrock</div>
                          <div className="text-[10px] text-zinc-400 leading-tight mt-0.5">Licencia oficial BDS de Mojang.</div>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-900/60 border border-mc-border cursor-pointer hover:border-amber-500/40 transition-colors">
                        <input
                          type="checkbox"
                          checked={bedrockAllowCheats}
                          onChange={(e) => setBedrockAllowCheats(e.target.checked)}
                          className="w-4 h-4 mt-0.5 accent-amber-500 rounded cursor-pointer shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-zinc-200">Permitir Trucos</div>
                          <div className="text-[10px] text-zinc-400 leading-tight mt-0.5">allow-cheats para usar comandos.</div>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-900/60 border border-mc-border cursor-pointer hover:border-amber-500/40 transition-colors">
                        <input
                          type="checkbox"
                          checked={bedrockOnlineMode}
                          onChange={(e) => setBedrockOnlineMode(e.target.checked)}
                          className="w-4 h-4 mt-0.5 accent-amber-500 rounded cursor-pointer shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5 flex-wrap">
                            <span>{bedrockOnlineMode ? 'Xbox Live' : 'No-Premium'}</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${bedrockOnlineMode ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>
                              {bedrockOnlineMode ? 'Online' : 'LAN / Offline'}
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-400 leading-tight mt-0.5">
                            {bedrockOnlineMode ? 'Requiere cuenta Microsoft.' : 'Permite jugar sin cuenta Microsoft.'}
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Step 3: Bedrock Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isInstalling || !selectedBedrockVersion || !bedrockAcceptEula}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-sm shadow-xl shadow-amber-950/50 flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                  >
                    {isInstalling ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Instalando Servidor Bedrock {selectedBedrockVersion?.id}...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Descargar y Configurar Bedrock {selectedBedrockVersion?.id || ''} Oficial
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              /* JAVA WIZARD */
              <>
                {/* Step 1: Version Selector */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[11px] font-bold">1</span>
                      Versión Oficial de Minecraft:
                    </label>
                    <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-mc-border text-[11px] self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setVersionFilter('release')}
                        className={`px-2.5 py-1 rounded font-medium transition-colors ${
                          versionFilter === 'release' ? 'bg-emerald-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        Releases
                      </button>
                      <button
                        type="button"
                        onClick={() => setVersionFilter('all')}
                        className={`px-2.5 py-1 rounded font-medium transition-colors ${
                          versionFilter === 'all' ? 'bg-emerald-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        Snapshots
                      </button>
                    </div>
                  </div>

                  {/* Version Search & Select */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="relative sm:col-span-1">
                      <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Filtrar versión..."
                        className="w-full bg-zinc-900 border border-mc-border rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    <div className="relative sm:col-span-2">
                      <select
                        value={selectedVersion?.id || ''}
                        onChange={(e) => {
                          const v = versions.find((x) => x.id === e.target.value);
                          if (v) handleSelectVersion(v);
                        }}
                        disabled={isLoadingVersions || filteredVersions.length === 0}
                        className="w-full bg-zinc-900 border border-mc-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono cursor-pointer"
                      >
                        {filteredVersions.map((v) => (
                          <option key={v.id} value={v.id} className="bg-zinc-900 text-white py-1">
                            Minecraft {v.id} {v.id === latestRelease ? '⭐ (Última Oficial)' : ''} ({v.type})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Step 2: Configuration & Parameters */}
                <div className="space-y-4 pt-4 border-t border-mc-border/60">
                  <label className="text-xs font-semibold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[11px] font-bold">2</span>
                    Configuración del Servidor y Red:
                  </label>

                  {/* Folder Name & RCON Password */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Folder name */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-zinc-300 font-medium flex items-center gap-1.5">
                          <FolderPlus className="w-3.5 h-3.5 text-emerald-400" />
                          {isWeb ? 'Nombre del Servidor:' : 'Carpeta de Instalación:'}
                        </span>
                        {!isWeb && (
                          <button
                            type="button"
                            onClick={handleBrowseFolder}
                            className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 hover:underline"
                          >
                            <FolderOpen className="w-3 h-3" /> Cambiar...
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={folderName}
                        onChange={(e) => setFolderName(e.target.value)}
                        required
                        placeholder="servidor_1.21.4"
                        className="w-full bg-zinc-900 border border-mc-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                      {!isWeb ? (
                        <p className="text-[10px] text-zinc-500 truncate font-mono" title={(customPath || baseDir || '') + '\\' + folderName}>
                          Destino: <span className="text-zinc-400">{(customPath || baseDir || '...')}\{folderName}</span>
                        </p>
                      ) : (
                        <p className="text-[10px] text-zinc-500 font-mono">
                          Identificador: <span className="text-emerald-400 font-semibold">{folderName}</span>
                        </p>
                      )}
                    </div>

                    {/* RCON Password */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-zinc-300 font-medium flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-emerald-400" />
                          Contraseña RCON:
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-[10px] text-zinc-400 hover:text-white"
                        >
                          {showPassword ? 'Ocultar' : 'Mostrar'}
                        </button>
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={rconPassword}
                        onChange={(e) => setRconPassword(e.target.value)}
                        required
                        placeholder="ej: 1234"
                        className="w-full bg-zinc-900 border border-mc-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                      <p className="text-[10px] text-zinc-500">Clave para la consola remota RCON.</p>
                    </div>
                  </div>

                  {/* Ports and RAM in a balanced, aligned grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-medium text-zinc-300">
                        Puerto del Juego:
                      </label>
                      <input
                        type="number"
                        min="1024"
                        max="65535"
                        value={serverPort}
                        onChange={(e) => setServerPort(parseInt(e.target.value) || 25565)}
                        className="w-full bg-zinc-900 border border-mc-border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                      <p className="text-[10px] text-zinc-500">server-port (ej: 25565)</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-medium text-zinc-300">
                        Puerto RCON:
                      </label>
                      <input
                        type="number"
                        min="1024"
                        max="65535"
                        value={rconPort}
                        onChange={(e) => setRconPort(parseInt(e.target.value) || 25575)}
                        className="w-full bg-zinc-900 border border-mc-border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                      <p className="text-[10px] text-zinc-500">rcon.port (ej: 25575)</p>
                    </div>

                    <div className="space-y-1.5 bg-zinc-900/40 p-2.5 rounded-xl border border-mc-border flex flex-col justify-between">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-zinc-300">Memoria RAM:</span>
                        <span className="text-emerald-400 font-bold font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">{ramGb} GB</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="16"
                        step="1"
                        value={ramGb}
                        onChange={(e) => setRamGb(parseInt(e.target.value, 10))}
                        className="w-full accent-emerald-500 bg-zinc-800 rounded-lg cursor-pointer h-2"
                      />
                      <p className="text-[10px] text-zinc-500 text-center">Asignada al archivo start.bat</p>
                    </div>
                  </div>

                  {/* Step 3: Toggles in a balanced, non-crowded grid */}
                  <div className="pt-2">
                    <span className="block text-[11px] font-medium text-zinc-300 mb-2">
                      Ajustes iniciales del servidor:
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      <label className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-900/60 border border-mc-border cursor-pointer hover:border-emerald-500/40 transition-colors">
                        <input
                          type="checkbox"
                          checked={acceptEula}
                          onChange={(e) => setAcceptEula(e.target.checked)}
                          className="w-4 h-4 mt-0.5 accent-emerald-500 rounded cursor-pointer shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-zinc-200">Aceptar EULA</div>
                          <div className="text-[10px] text-zinc-400 leading-tight mt-0.5">eula=true obligatorio para arrancar.</div>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-900/60 border border-mc-border cursor-pointer hover:border-emerald-500/40 transition-colors">
                        <input
                          type="checkbox"
                          checked={optimizeProperties}
                          onChange={(e) => setOptimizeProperties(e.target.checked)}
                          className="w-4 h-4 mt-0.5 accent-emerald-500 rounded cursor-pointer shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-zinc-200">Anti-Lag Óptimo</div>
                          <div className="text-[10px] text-zinc-400 leading-tight mt-0.5">Optimiza distancias y flags Java.</div>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-900/60 border border-mc-border cursor-pointer hover:border-emerald-500/40 transition-colors">
                        <input
                          type="checkbox"
                          checked={allowOfflinePlayers}
                          onChange={(e) => setAllowOfflinePlayers(e.target.checked)}
                          className="w-4 h-4 mt-0.5 accent-emerald-500 rounded cursor-pointer shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5 flex-wrap">
                            <span>No-Premium</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                              Offline
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-400 leading-tight mt-0.5">Permite jugadores sin cuenta de pago.</div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Step 3: Java Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isInstalling || !selectedVersion}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-sm shadow-xl shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                  >
                    {isInstalling ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Instalando Minecraft {selectedVersion?.id}...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Descargar y Configurar Minecraft {selectedVersion?.id || ''} Oficial
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {/* Progress Bar when Downloading */}
            {isInstalling && (
              <div className="bg-zinc-900/90 border border-mc-border rounded-xl p-4 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-400 font-medium flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    {progressData.statusText || 'Procesando descarga...'}
                  </span>
                  <span className="text-white font-mono font-bold">{progressData.percent || 0}%</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${progressData.percent || 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* Success or Error Card */}
            {installResult && (
              <div
                className={`p-4 rounded-xl border animate-fade-in ${
                  installResult.success
                    ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                    : 'bg-red-950/30 border-red-500/50 text-red-200'
                }`}
              >
                {installResult.success ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ¡Servidor {installResult.versionId} instalado y configurado correctamente!
                    </div>
                    <p className="text-xs text-zinc-300">
                      Ubicación: <code className="text-emerald-300 font-mono font-semibold">{installResult.folderName}</code>
                      {' '}| {installResult.serverType === 'bedrock' ? (
                        <>Juego: <code className="text-emerald-300 font-mono">{installResult.serverPort} (IPv4) / {installResult.serverPortV6} (IPv6)</code></>
                      ) : (
                        <>Juego: <code className="text-emerald-300 font-mono">{installResult.serverPort}</code></>
                      )}
                      {' '}| RCON: <code className="text-emerald-300 font-mono">{installResult.rconPort}</code>
                      {' '}| Modo: <span className="font-semibold text-emerald-300">{installResult.onlineMode ? (installResult.serverType === 'bedrock' ? 'Xbox Live (Online)' : 'Premium (Online)') : 'No-Premium (Offline)'}</span>.
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {(() => {
                        const isThisRunning = localServers.find((s) => s.path === installResult.folderPath)?.isRunning;
                        return (
                          <>
                            <button
                              type="button"
                              disabled={isThisRunning || launchingServer === installResult.folderPath}
                              onClick={() => handleLaunchServer(installResult.folderPath)}
                              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow transition-all ${
                                isThisRunning
                                  ? 'bg-zinc-800 text-emerald-400 border border-emerald-500/30 cursor-not-allowed opacity-90'
                                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              }`}
                            >
                              {isThisRunning ? (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                  Servidor en Ejecución
                                </>
                              ) : launchingServer === installResult.folderPath ? (
                                'Iniciando...'
                              ) : (
                                <>
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                  Iniciar Servidor Ahora
                                </>
                              )}
                            </button>

                            {isThisRunning && onNavigateToConsole && (
                              <button
                                type="button"
                                onClick={onNavigateToConsole}
                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all shadow"
                                title="Ver la consola integrada en vivo de este servidor"
                              >
                                <span className="font-mono text-xs">&gt;_</span>
                                Ver Consola
                              </button>
                            )}

                            {isThisRunning && (
                              <button
                                type="button"
                                onClick={() => handleStopServer(installResult.folderPath)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-500/30 text-xs font-bold transition-all"
                                title="Detener servidor"
                              >
                                Detener
                              </button>
                            )}
                          </>
                        );
                      })()}

                      {!isWeb && (
                        <button
                          type="button"
                          onClick={() => handleOpenFolder(installResult.folderPath)}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold transition-all"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          Abrir Carpeta
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleConnectDirectly(installResult)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all"
                      >
                        <Wifi className="w-3.5 h-3.5" />
                        Conectar RCON
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5 text-xs text-red-300">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Error en la instalación: </span>
                      {installResult.error}
                    </div>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Right Column: Local Installed Servers Manager */}
        <div className="space-y-4">
          <div className="bg-mc-card border border-mc-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-mc-border pb-3">
              <div>
                <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-400" />
                  Servidores Detectados en Local
                </h4>
                <p className="text-[11px] text-zinc-400">Tus carpetas de Minecraft listas para arrancar</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenRestoreModal}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 transition-colors shadow-sm"
                  title="Restaurar una copia de seguridad creando siempre un nuevo servidor"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Restaurar Backup</span>
                </button>

                <button
                  onClick={() => refreshLocalServers(true)}
                  disabled={isLoadingServers}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white bg-zinc-900 border border-mc-border hover:border-zinc-700 transition-colors"
                  title="Actualizar lista de servidores"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingServers ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {portsSuccessMessage && (
                <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{portsSuccessMessage}</span>
                </div>
              )}

              {localServers.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-xs bg-zinc-900/40 rounded-xl border border-dashed border-zinc-800">
                  No se detectaron servidores aún. Crea uno con el asistente a la izquierda.
                </div>
              ) : (
                localServers.map((srv) => (
                  <div
                    key={srv.path}
                    className="bg-zinc-900/80 border border-mc-border hover:border-zinc-700 rounded-xl p-3.5 space-y-3 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-white text-xs flex items-center gap-1.5 flex-wrap">
                          {srv.isRunning ? (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="En ejecución" />
                          ) : (
                            <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                          <span>{srv.name}</span>
                          {srv.serverType === 'bedrock' ? (
                            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-950/50 text-amber-300 border border-amber-500/30 font-semibold" title="Minecraft Bedrock Dedicated Server">
                              🧱 Bedrock
                            </span>
                          ) : (
                            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/50 text-cyan-300 border border-cyan-500/30 font-semibold" title="Minecraft Java Edition Server">
                              ☕ Java
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-1 font-mono flex flex-wrap items-center gap-x-2.5 gap-y-1">
                          {srv.serverType === 'bedrock' ? (
                            <span>Juego: <strong className="text-amber-400 font-bold">{srv.serverPort || 19132} (IPv4)</strong> / <strong className="text-amber-400 font-bold">{srv.serverPortV6 || (srv.serverPort ? srv.serverPort + 1 : 19133)} (IPv6)</strong></span>
                          ) : (
                            <span>Juego: <strong className="text-emerald-400 font-bold">{srv.serverPort || 25565}</strong></span>
                          )}
                          <span className="text-zinc-600">•</span>
                          <span>RCON: <strong className="text-zinc-200">{srv.rconPort || 25575}</strong></span>
                          <span className="text-zinc-600">•</span>
                          <span className={srv.rconEnabled ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                            {srv.rconEnabled ? 'RCON Activo' : 'RCON Inactivo'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <button
                            type="button"
                            onClick={() => handleToggleOnlineMode(srv.path)}
                            title="Haz clic para cambiar entre modo Online y Offline"
                            className={`text-[10px] px-2 py-0.5 rounded border font-medium transition-all ${
                              srv.onlineMode === false
                                ? 'bg-amber-950/40 text-amber-300 border-amber-500/30 hover:bg-amber-900/50'
                                : 'bg-blue-950/40 text-blue-300 border-blue-500/30 hover:bg-blue-900/50'
                            }`}
                          >
                            {srv.onlineMode === false
                              ? (srv.serverType === 'bedrock' ? '🔓 No-Premium / LAN (Offline)' : '🔓 No-Premium (Offline)')
                              : (srv.serverType === 'bedrock' ? '🔒 Xbox Live (Online)' : '🔒 Premium (Online)')}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditPorts(srv)}
                            disabled={srv.isRunning}
                            className="text-[10px] px-2 py-0.5 rounded border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition-all flex items-center gap-1 disabled:opacity-40 disabled:hover:bg-zinc-800"
                            title={srv.isRunning ? 'Detén el servidor para modificar sus puertos' : 'Editar puertos de juego y RCON'}
                          >
                            <Sliders className="w-3 h-3 text-emerald-400" />
                            Editar Puertos
                          </button>

                          {srv.isRunning && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                              Activo
                            </span>
                          )}
                        </div>
                      </div>

                      {!isWeb && (
                        <button
                          onClick={() => handleOpenFolder(srv.path)}
                          className="text-zinc-500 hover:text-zinc-300 p-1 rounded hover:bg-zinc-800 transition-colors"
                          title="Abrir carpeta en el Explorador de Windows"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-2 pt-1 border-t border-zinc-800/80">
                      {/* Fila 1: Control de ejecución y conexión */}
                      <div className="flex items-center gap-2">
                        {srv.isRunning ? (
                          <>
                            {onNavigateToConsole && (
                              <button
                                onClick={onNavigateToConsole}
                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition-colors shadow"
                                title="Abrir consola integrada en vivo"
                              >
                                <span className="font-mono text-[11px]">&gt;_</span>
                                Ver Consola
                              </button>
                            )}

                            <button
                              onClick={() => handleStopServer(srv.path)}
                              className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-500/30 text-[11px] font-semibold transition-colors"
                              title="Detener servidor de Minecraft"
                            >
                              Detener
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleLaunchServer(srv.path)}
                            disabled={launchingServer === srv.path}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition-colors shadow"
                            title="Iniciar este servidor"
                          >
                            {launchingServer === srv.path ? (
                              'Iniciando...'
                            ) : (
                              <>
                                <Play className="w-3 h-3 fill-current" />
                                Iniciar
                              </>
                            )}
                          </button>
                        )}

                        <button
                          onClick={() => handleConnectDirectly(srv)}
                          disabled={launchingServer === srv.path}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-[11px] font-medium transition-colors disabled:opacity-40"
                          title={srv.isRunning ? "Conectar a la consola del servidor" : "Iniciar servidor y conectar a la consola"}
                        >
                          <Wifi className="w-3 h-3 text-emerald-400" />
                          {srv.isRunning ? 'Conectar' : 'Iniciar y Conectar'}
                        </button>
                      </div>

                      {/* Fila 2: Gestión (Backup al lado izquierdo de Eliminar) */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartBackup(srv)}
                          disabled={backingUpServer === srv.path}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-[11px] font-medium transition-colors disabled:opacity-50"
                          title="Crear copia de seguridad comprimida (.zip) en la carpeta backups"
                        >
                          {backingUpServer === srv.path ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
                              <span>Respaldando...</span>
                            </>
                          ) : (
                            <>
                              <Archive className="w-3.5 h-3.5 text-amber-400" />
                              <span>Backup</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError('');
                            setServerToDelete(srv);
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-950/30 hover:bg-red-900/50 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 text-[11px] font-medium transition-colors"
                          title={srv.isRunning ? "Eliminar servidor (en ejecución: se detendrá y borrará)" : "Eliminar servidor permanentemente"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Server Ports Modal */}
      {editingServer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-mc-card border border-mc-border rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-mc-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Editar Puertos de Red</h4>
                  <p className="text-[11px] text-zinc-400 font-mono">{editingServer.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingServer(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editingServer.isRunning ? (
              <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl text-xs text-amber-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>El servidor está en ejecución. Para modificar sus puertos en server.properties debes detenerlo primero.</span>
              </div>
            ) : (
              <form onSubmit={handleSavePorts} className="space-y-3.5">
                {editError && (
                  <div className="p-2.5 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{editError}</span>
                  </div>
                )}

                {editingServer.serverType === 'bedrock' ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1">
                          Puerto IPv4 (server-port):
                        </label>
                        <input
                          type="number"
                          min="1024"
                          max="65535"
                          value={editServerPort}
                          onChange={(e) => setEditServerPort(e.target.value)}
                          required
                          className="w-full bg-zinc-900 border border-mc-border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                        />
                        <p className="text-[10px] text-zinc-500 mt-0.5">Por defecto: 19132.</p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1">
                          Puerto IPv6 (server-portv6):
                        </label>
                        <input
                          type="number"
                          min="1024"
                          max="65535"
                          value={editServerPortV6}
                          onChange={(e) => setEditServerPortV6(e.target.value)}
                          required
                          className="w-full bg-zinc-900 border border-mc-border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                        />
                        <p className="text-[10px] text-zinc-500 mt-0.5">Por defecto: 19133.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Puerto del Juego (server-port):
                    </label>
                    <input
                      type="number"
                      min="1024"
                      max="65535"
                      value={editServerPort}
                      onChange={(e) => setEditServerPort(e.target.value)}
                      required
                      className="w-full bg-zinc-900 border border-mc-border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <p className="text-[10px] text-zinc-500 mt-0.5">Puerto al que se conectan los clientes en Minecraft (ej: 25565, 25566...).</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Puerto RCON (rcon.port):
                  </label>
                  <input
                    type="number"
                    min="1024"
                    max="65535"
                    value={editRconPort}
                    onChange={(e) => setEditRconPort(e.target.value)}
                    required
                    className="w-full bg-zinc-900 border border-mc-border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-zinc-500 mt-0.5">Puerto para enviar comandos de consola remota (ej: 25575, 25576...).</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Contraseña RCON (rcon.password):
                  </label>
                  <input
                    type="text"
                    value={editRconPassword}
                    onChange={(e) => setEditRconPassword(e.target.value)}
                    placeholder="1234"
                    className="w-full bg-zinc-900 border border-mc-border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-mc-border/60">
                  <button
                    type="button"
                    onClick={() => setEditingServer(null)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingPorts}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all shadow-md shadow-emerald-950/40 disabled:opacity-50"
                  >
                    {isSavingPorts ? 'Guardando...' : 'Guardar Puertos'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delete Server Confirmation Modal */}
      {serverToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-mc-card border border-red-500/40 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-mc-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Eliminar Servidor</h4>
                  <p className="text-[11px] text-zinc-400 font-mono truncate max-w-[240px]">{serverToDelete.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isDeletingServer && setServerToDelete(null)}
                disabled={isDeletingServer}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {deleteError && (
              <div className="p-3 bg-red-950/50 border border-red-500/50 rounded-xl text-xs text-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            {serverToDelete.isRunning && (
              <div className="p-3.5 bg-amber-950/40 border border-amber-500/40 rounded-xl text-xs text-amber-200 space-y-1">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>¡Atención! El servidor está EN EJECUCIÓN</span>
                </div>
                <p className="text-[11px] text-amber-300/90 pl-6">
                  Si confirmas la eliminación, el proceso de Minecraft se detendrá de inmediato y toda su carpeta será eliminada del disco.
                </p>
              </div>
            )}

            <div className="space-y-2 text-xs text-zinc-300">
              <p>
                ¿Estás seguro de que deseas eliminar este servidor? Esta acción es <span className="text-red-400 font-semibold">irreversible</span>.
              </p>
              <p className="text-zinc-400 text-[11px]">
                Se eliminarán permanentemente el mundo, inventarios, configuraciones y todos los datos en:
              </p>
              <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg font-mono text-[11px] text-zinc-400 break-all select-all">
                {serverToDelete.path}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-mc-border/60">
              <button
                type="button"
                onClick={() => setServerToDelete(null)}
                disabled={isDeletingServer}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeletingServer}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-all shadow-md shadow-red-950/50 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeletingServer ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{serverToDelete.isRunning ? 'Detener y Eliminar Servidor' : 'Eliminar Definitivamente'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Server Modal */}
      {isRestoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-mc-card border border-emerald-500/40 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-mc-border pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Restaurar Copia de Seguridad</h4>
                  <p className="text-[11px] text-zinc-400">Siempre se creará como un servidor nuevo e independiente</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isRestoring && setIsRestoreModalOpen(false)}
                disabled={isRestoring}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 flex-1">
              {/* Informative notice */}
              <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-xs text-emerald-200/90 leading-relaxed">
                ℹ️ Esta opción crea una <strong>carpeta totalmente nueva</strong> a partir del backup. Tus servidores existentes no sufrirán ninguna modificación y los puertos de conexión y RCON se asignarán automáticamente para que no colisionen.
              </div>

              {restoreError && (
                <div className="p-3 bg-red-950/50 border border-red-500/50 rounded-xl text-xs text-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{restoreError}</span>
                </div>
              )}

              {/* Backups List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300">
                    Copias de seguridad disponibles en la carpeta "backups":
                  </label>
                  {!isWeb && (
                    <button
                      type="button"
                      onClick={handleBrowseCustomBackupFile}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 hover:underline"
                    >
                      <FolderOpen className="w-3 h-3" />
                      Examinar otro archivo .zip...
                    </button>
                  )}
                </div>

                {isLoadingBackups ? (
                  <div className="py-6 flex items-center justify-center text-zinc-400 text-xs gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>Buscando copias de seguridad...</span>
                  </div>
                ) : backupsList.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-zinc-800 text-center text-xs text-zinc-500">
                    No se encontraron archivos .zip en la carpeta <span className="font-mono text-zinc-400">backups/</span>.
                    {!isWeb && ' Puedes usar el botón "Examinar otro archivo .zip" para seleccionar uno.'}
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {backupsList.map((bk) => {
                      const isSelected = selectedBackupPath === bk.filePath;
                      return (
                        <div
                          key={bk.filePath}
                          onClick={() => handleSelectBackupItem(bk)}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-emerald-950/40 border-emerald-500/60 text-white shadow-sm'
                              : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:bg-zinc-800/60 hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <FileArchive className={`w-4 h-4 shrink-0 ${isSelected ? 'text-emerald-400' : 'text-zinc-500'}`} />
                            <div className="truncate">
                              <p className="font-mono font-medium truncate text-[11px]">{bk.fileName}</p>
                              <p className="text-[10px] text-zinc-400">
                                {bk.date} • <span className="text-zinc-300">{bk.sizeMb} MB</span>
                              </p>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 shrink-0">
                              Seleccionado
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected file path display if external */}
              {selectedBackupPath && !backupsList.some((b) => b.filePath === selectedBackupPath) && (
                <div className="p-2.5 bg-zinc-900 border border-emerald-500/30 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
                    <FileArchive className="w-3.5 h-3.5" />
                    <span>Archivo externo seleccionado:</span>
                  </div>
                  <p className="font-mono text-[10px] text-zinc-400 break-all select-all">{selectedBackupPath}</p>
                </div>
              )}

              {/* New Folder Name Input */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Nombre de la carpeta para el nuevo servidor:
                </label>
                <input
                  type="text"
                  value={restoreServerName}
                  onChange={(e) => setRestoreServerName(e.target.value)}
                  placeholder="ej: servidor_1.21.4_restaurado"
                  required
                  className="w-full bg-zinc-900 border border-mc-border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-zinc-500 mt-1">
                  Se creará como un directorio nuevo e independiente. Si ya existe, se le añadirá un sufijo numérico automático.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-mc-border/60 shrink-0">
              <button
                type="button"
                onClick={() => setIsRestoreModalOpen(false)}
                disabled={isRestoring}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isRestoring || !selectedBackupPath}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all shadow-md shadow-emerald-950/50 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Descomprimiendo y Restaurando...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restaurar como Nuevo Servidor</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
