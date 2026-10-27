import React, { useState, useEffect } from 'react';
import { X, Server, Key, Hash, HelpCircle, Check, Copy, AlertTriangle, ShieldCheck, Play, Wifi } from 'lucide-react';

export default function ConnectionModal({
  isOpen,
  onClose,
  onConnect,
  onSimulate,
  currentStatus,
  isConnecting
}) {
  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState('25575');
  const [password, setPassword] = useState('1234');
  const [serverType, setServerType] = useState('auto'); // 'auto' | 'java' | 'bedrock'
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('connect'); // 'connect' | 'guide'
  const [runningServers, setRunningServers] = useState([]);

  useEffect(() => {
    if (isOpen && window.electronAPI?.getRunningServers) {
      window.electronAPI.getRunningServers().then((list) => {
        setRunningServers(list || []);
      }).catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    async function loadSavedConfig() {
      if (window.electronAPI?.getSettings) {
        try {
          const s = await window.electronAPI.getSettings();
          if (s?.lastConnection) {
            if (s.lastConnection.host) setHost(s.lastConnection.host);
            if (s.lastConnection.port) setPort(s.lastConnection.port);
            if (s.lastConnection.password) setPassword(s.lastConnection.password);
            if (s.lastConnection.serverType) setServerType(s.lastConnection.serverType);
            return;
          }
        } catch (_) {}
      }
      const savedConfig = localStorage.getItem('mcrcon_config');
      if (savedConfig) {
        try {
          const parsed = JSON.parse(savedConfig);
          if (parsed.host) setHost(parsed.host);
          if (parsed.port) setPort(parsed.port);
          if (parsed.password) setPassword(parsed.password);
          if (parsed.serverType) setServerType(parsed.serverType);
        } catch (_) {}
      }
    }
    loadSavedConfig();
  }, []);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const connData = { host, port, password, serverType };
    if (window.electronAPI?.saveSettings) {
      window.electronAPI.saveSettings({ lastConnection: connData });
    }
    localStorage.setItem('mcrcon_config', JSON.stringify(connData));
    onConnect(connData);
  };

  const handleSimulateClick = () => {
    onSimulate(serverType);
    onClose();
  };

  const rconPropertiesSnippet = `enable-rcon=true
rcon.port=25575
rcon.password=tu_contraseña_secreta
broadcast-rcon-to-ops=false`;

  const copySnippet = () => {
    navigator.clipboard.writeText(rconPropertiesSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-mc-card border border-mc-border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-mc-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Conexión RCON de Minecraft</h3>
              <p className="text-xs text-zinc-400">Conecta directamente con la consola remota local</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-mc-border px-6 pt-2">
          <button
            onClick={() => setActiveTab('connect')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'connect'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Parámetros de Conexión
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'guide'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            ¿Cómo activar RCON en Minecraft?
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {activeTab === 'connect' ? (
            <div className="space-y-4">
              {runningServers.length > 0 && (
                <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Servidor local en ejecución detectado:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {runningServers.map((srv) => (
                      <button
                        key={srv.folderPath}
                        type="button"
                        onClick={() => {
                          onConnect({
                            host: '127.0.0.1',
                            port: 25575,
                            password: '',
                            isLocal: true,
                            folderPath: srv.folderPath,
                          });
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition-all"
                      >
                        <Wifi className="w-3.5 h-3.5" />
                        Conectar a {srv.name} (Consola Directa)
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
              {currentStatus.error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-300">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Error de conexión:</span> {currentStatus.error}
                    <div className="mt-1 text-zinc-400">
                      Asegúrate de que el servidor esté encendido y que tengas <code className="text-emerald-400 font-mono">enable-rcon=true</code> en tu <code className="text-emerald-400 font-mono">server.properties</code>.
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-emerald-400" />
                    Host / IP del Servidor
                  </label>
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="127.0.0.1"
                    required
                    className="w-full bg-zinc-900 border border-mc-border rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                  />
                  <span className="text-[11px] text-zinc-500">Usa 127.0.0.1 o localhost para tu servidor local.</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-emerald-400" />
                    Puerto RCON
                  </label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder="25575"
                    required
                    className="w-full bg-zinc-900 border border-mc-border rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                  />
                  <span className="text-[11px] text-zinc-500">Por defecto: 25575</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-emerald-400" />
                    Contraseña RCON (rcon.password)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-zinc-400 hover:text-zinc-200 underline"
                  >
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="La contraseña configurada en server.properties"
                  className="w-full bg-zinc-900 border border-mc-border rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                />
                <span className="text-[11px] text-zinc-500">Se guarda localmente de forma privada en tu equipo.</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-emerald-400" />
                  Edición del Servidor (Detección de comandos)
                </label>
                <select
                  value={serverType}
                  onChange={(e) => setServerType(e.target.value)}
                  className="w-full bg-zinc-900 border border-mc-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                >
                  <option value="auto">Auto-detectar (Recomendado - Java o Bedrock)</option>
                  <option value="java">Java Edition (Comandos estándar)</option>
                  <option value="bedrock">Bedrock Edition (Traducción BDS activa)</option>
                </select>
                <span className="text-[11px] text-zinc-500">
                  En Auto-detectar, la app reconocerá si es Java o Bedrock y adaptará los comandos transparentemente.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleSimulateClick}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 transition-colors"
                >
                  <Play className="w-4 h-4 text-purple-400" />
                  Abrir en Modo Prueba (Simulado)
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isConnecting}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 shadow-lg shadow-emerald-950/40 transition-all"
                  >
                    {isConnecting ? (
                      <>
                        <span className="animate-spin w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full"></span>
                        Conectando...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        Conectar al Servidor
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
            <div className="space-y-4 text-xs text-zinc-300 leading-relaxed">
              <p>
                Para permitir que cualquier aplicación interactúe con la consola de tu servidor de Minecraft, debes habilitar RCON en el archivo <code className="bg-zinc-800 text-emerald-400 px-1 py-0.5 rounded font-mono">server.properties</code> de la carpeta de tu servidor.
              </p>

              <div className="bg-zinc-950 border border-mc-border rounded-xl p-4 font-mono text-xs relative group">
                <div className="flex items-center justify-between mb-2 text-zinc-500 text-[11px]">
                  <span>server.properties</span>
                  <button
                    onClick={copySnippet}
                    className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 bg-zinc-900 px-2 py-1 rounded border border-zinc-800 transition-colors"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <pre className="text-emerald-300/90 whitespace-pre overflow-x-auto">
                  {rconPropertiesSnippet}
                </pre>
              </div>

              <div className="space-y-2 bg-zinc-900/50 p-3.5 rounded-xl border border-zinc-800 text-[11px]">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Pasos a seguir:
                </div>
                <ol className="list-decimal list-inside space-y-1 text-zinc-400">
                  <li>Abre la carpeta donde tienes tu <code className="text-zinc-200">server.jar</code>.</li>
                  <li>Abre con Bloc de Notas o tu editor el archivo <code className="text-zinc-200">server.properties</code>.</li>
                  <li>Busca o añade las 4 líneas indicadas arriba y define tu contraseña.</li>
                  <li>Guarda el archivo y reinicia el servidor de Minecraft.</li>
                  <li>¡Vuelve aquí y pulsa Conectar!</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
