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
  CheckCircle2
} from 'lucide-react';

export default function InstallerTab({ onConnectToServer }) {
  const [versions, setVersions] = useState([]);
  const [latestRelease, setLatestRelease] = useState('1.21.4');
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [versionFilter, setVersionFilter] = useState('release'); // 'release' | 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingVersions, setIsLoadingVersions] = useState(true);

  // Configuration form fields
  const [folderName, setFolderName] = useState('');
  const [rconPassword, setRconPassword] = useState('1234');
  const [rconPort, setRconPort] = useState(25575);
  const [serverPort, setServerPort] = useState(25565);
  const [ramGb, setRamGb] = useState(4);
  const [acceptEula, setAcceptEula] = useState(true);
  const [optimizeProperties, setOptimizeProperties] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Download & creation state
  const [isInstalling, setIsInstalling] = useState(false);
  const [progressData, setProgressData] = useState({ percent: 0, statusText: '' });
  const [installResult, setInstallResult] = useState(null);

  // Local installed servers list
  const [localServers, setLocalServers] = useState([]);
  const [isLoadingServers, setIsLoadingServers] = useState(false);
  const [launchingServer, setLaunchingServer] = useState(null);

  // Load versions manifest on mount
  useEffect(() => {
    fetchVersions();
    refreshLocalServers();

    if (window.electronAPI?.onDownloadProgress) {
      const cleanup = window.electronAPI.onDownloadProgress((data) => {
        setProgressData(data);
      });
      return cleanup;
    }
  }, []);

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
            setFolderName(`servidor_${initial.id}`);
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
        setFolderName(`servidor_${dummyVersions[0].id}`);
      }
    } finally {
      setIsLoadingVersions(false);
    }
  };

  const refreshLocalServers = async () => {
    if (window.electronAPI?.listLocalServers) {
      setIsLoadingServers(true);
      try {
        const list = await window.electronAPI.listLocalServers();
        setLocalServers(list || []);
      } finally {
        setIsLoadingServers(false);
      }
    }
  };

  const handleSelectVersion = (version) => {
    setSelectedVersion(version);
    setFolderName(`servidor_${version.id}`);
    setInstallResult(null);
  };

  const handleStartInstallation = async (e) => {
    e.preventDefault();
    if (!selectedVersion) return;

    setIsInstalling(true);
    setInstallResult(null);
    setProgressData({ percent: 5, statusText: 'Iniciando proceso...' });

    try {
      if (window.electronAPI?.downloadAndSetupServer) {
        const result = await window.electronAPI.downloadAndSetupServer({
          versionId: selectedVersion.id,
          versionUrl: selectedVersion.url,
          folderName,
          rconPassword,
          rconPort: Number(rconPort),
          serverPort: Number(serverPort),
          ramGb: Number(ramGb),
          acceptEula,
          optimizeProperties,
        });

        if (result.success) {
          setInstallResult(result);
          refreshLocalServers();
        } else {
          setInstallResult({ success: false, error: result.error });
        }
      } else {
        // Mock for browser
        setTimeout(() => {
          setInstallResult({
            success: true,
            folderName,
            folderPath: `D:\\Proyectos\\mcrcon\\${folderName}`,
            versionId: selectedVersion.id,
            rconPassword,
            rconPort,
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
    if (window.electronAPI?.launchServer) {
      setLaunchingServer(folderPath);
      await window.electronAPI.launchServer(folderPath);
      setTimeout(() => setLaunchingServer(null), 2000);
    }
  };

  const handleConnectDirectly = (serverInfo) => {
    if (onConnectToServer) {
      onConnectToServer({
        host: '127.0.0.1',
        port: serverInfo.rconPort || 25575,
        password: serverInfo.rconPassword || '1234',
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
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold uppercase tracking-wider">
                V2.0
              </span>
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
            {/* Step 1: Version Selector */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[11px] font-bold">1</span>
                  Selecciona la Versión Oficial de Minecraft:
                </label>
                <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-mc-border text-[11px]">
                  <button
                    type="button"
                    onClick={() => setVersionFilter('release')}
                    className={`px-2 py-0.5 rounded font-medium transition-colors ${
                      versionFilter === 'release' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Solo Releases
                  </button>
                  <button
                    type="button"
                    onClick={() => setVersionFilter('all')}
                    className={`px-2 py-0.5 rounded font-medium transition-colors ${
                      versionFilter === 'all' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Todas (Snapshots)
                  </button>
                </div>
              </div>

              {/* Version Search & Select */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="relative sm:col-span-1">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar versión (1.21...)"
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

            {/* Step 2: Configuration & Optimization */}
            <div className="space-y-3 pt-3 border-t border-mc-border/60">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[11px] font-bold">2</span>
                Parámetros de la Carpeta y Conexión RCON:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Folder name */}
                <div className="space-y-1">
                  <span className="text-[11px] text-zinc-300 font-medium flex items-center gap-1">
                    <FolderPlus className="w-3.5 h-3.5 text-emerald-400" />
                    Nombre de la Carpeta de Destino:
                  </span>
                  <input
                    type="text"
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    required
                    placeholder="servidor_1.21.4"
                    className="w-full bg-zinc-900 border border-mc-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <span className="text-[10px] text-zinc-500">Se creará dentro de tu proyecto.</span>
                </div>

                {/* RCON Password */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-zinc-300 font-medium flex items-center gap-1">
                      <Key className="w-3.5 h-3.5 text-emerald-400" />
                      Contraseña RCON:
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[10px] text-zinc-400 hover:text-white underline"
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
                  <span className="text-[10px] text-zinc-500">Se guardará automáticamente en server.properties.</span>
                </div>
              </div>

              {/* Ports and RAM */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="space-y-1">
                  <span className="text-[11px] text-zinc-400">Puerto RCON:</span>
                  <input
                    type="number"
                    value={rconPort}
                    onChange={(e) => setRconPort(parseInt(e.target.value) || 25575)}
                    className="w-full bg-zinc-900 border border-mc-border rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-zinc-400">Puerto del Juego:</span>
                  <input
                    type="number"
                    value={serverPort}
                    onChange={(e) => setServerPort(parseInt(e.target.value) || 25565)}
                    className="w-full bg-zinc-900 border border-mc-border rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-400">RAM Asignada:</span>
                    <span className="text-emerald-400 font-bold font-mono">{ramGb} GB</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="16"
                    step="1"
                    value={ramGb}
                    onChange={(e) => setRamGb(parseInt(e.target.value, 10))}
                    className="w-full accent-emerald-500 bg-zinc-800 rounded-lg cursor-pointer h-2 mt-1"
                  />
                </div>
              </div>

              {/* Checkbox Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2.5 bg-zinc-900/80 p-3 rounded-xl border border-mc-border cursor-pointer hover:border-zinc-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={acceptEula}
                    onChange={(e) => setAcceptEula(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-semibold text-zinc-200">Aceptar EULA (eula=true)</div>
                    <div className="text-[10px] text-zinc-500">Crea eula.txt para que el servidor inicie directamente.</div>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 bg-zinc-900/80 p-3 rounded-xl border border-mc-border cursor-pointer hover:border-zinc-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={optimizeProperties}
                    onChange={(e) => setOptimizeProperties(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-semibold text-zinc-200">Optimizaciones Anti-Lag</div>
                    <div className="text-[10px] text-zinc-500">Configura sim-distance=5 y flags óptimos.</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Step 3: Action Button */}
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
                      {' '}| RCON activado en puerto <code className="text-emerald-300 font-mono">{installResult.rconPort}</code> con contraseña <code className="text-emerald-300 font-mono">{installResult.rconPassword}</code>.
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleLaunchServer(installResult.folderPath)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition-all"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Iniciar Servidor Ahora
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenFolder(installResult.folderPath)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold transition-all"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        Abrir Carpeta
                      </button>

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

              <button
                onClick={refreshLocalServers}
                disabled={isLoadingServers}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white bg-zinc-900 border border-mc-border hover:border-zinc-700 transition-colors"
                title="Actualizar lista de servidores"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingServers ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="space-y-3">
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
                        <div className="font-bold text-white text-xs flex items-center gap-1.5">
                          <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
                          {srv.name}
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-0.5 font-mono">
                          Puerto RCON: <strong className="text-zinc-200">{srv.rconPort}</strong> | Estado:{' '}
                          <span className={srv.rconEnabled ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                            {srv.rconEnabled ? 'RCON Activo' : 'RCON Inactivo'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenFolder(srv.path)}
                        className="text-zinc-500 hover:text-zinc-300 p-1 rounded hover:bg-zinc-800 transition-colors"
                        title="Abrir carpeta en el Explorador de Windows"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/80">
                      <button
                        onClick={() => handleLaunchServer(srv.path)}
                        disabled={launchingServer === srv.path}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition-colors shadow"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        {launchingServer === srv.path ? 'Iniciando...' : 'Iniciar Servidor'}
                      </button>

                      <button
                        onClick={() => handleConnectDirectly(srv)}
                        disabled={!srv.rconEnabled}
                        className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-[11px] font-medium transition-colors disabled:opacity-40"
                        title="Conectar a este servidor"
                      >
                        <Wifi className="w-3 h-3 text-emerald-400" />
                        Conectar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
