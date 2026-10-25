import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Trash2, 
  Download, 
  Terminal as TerminalIcon, 
  Clock, 
  Sparkles,
  Server,
  Square,
  RefreshCw,
  Layers,
  ArrowRight,
  ShieldAlert,
  Play
} from 'lucide-react';
import { formatMinecraftText } from '../utils/minecraftColors';

export default function ConsoleTab({ 
  onSendCommand, 
  logs = [], 
  onClearLogs, 
  isConnected,
  onNavigateToInstaller
}) {
  // Mode: 'server' (Live Java Server Console) | 'rcon' (RCON Protocol Console)
  const [consoleMode, setConsoleMode] = useState('server');

  // Server console states
  const [runningServers, setRunningServers] = useState([]);
  const [selectedServerPath, setSelectedServerPath] = useState('');
  const [serverLogs, setServerLogs] = useState([]);
  const [serverInput, setServerInput] = useState('');
  const [serverHistory, setServerHistory] = useState([]);
  const [serverHistoryIndex, setServerHistoryIndex] = useState(-1);
  const [isStoppingServer, setIsStoppingServer] = useState(false);

  // RCON console states
  const [inputCommand, setInputCommand] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isSending, setIsSending] = useState(false);

  const logContainerRef = useRef(null);
  const serverLogContainerRef = useRef(null);
  const inputRef = useRef(null);
  const serverInputRef = useRef(null);

  const quickCommands = [
    { label: 'Lista de Jugadores', cmd: 'list' },
    { label: 'Semilla del Mundo', cmd: 'seed' },
    { label: 'Hora Actual', cmd: 'time query daytime' },
    { label: 'Guardar Mundo', cmd: 'save-all' },
    { label: 'Lista Blanca', cmd: 'whitelist list' },
    { label: 'Ayuda', cmd: 'help' },
  ];

  // Refresh running servers list
  const refreshRunningServers = async () => {
    if (window.electronAPI?.getRunningServers) {
      try {
        const list = await window.electronAPI.getRunningServers();
        setRunningServers(list || []);
        if (list && list.length > 0 && !selectedServerPath) {
          setSelectedServerPath(list[0].folderPath);
        }
      } catch (err) {
        console.error('Error fetching running servers:', err);
      }
    }
  };

  useEffect(() => {
    refreshRunningServers();

    // Listen to server status changes
    let cleanupStatus = null;
    if (window.electronAPI?.onServerStatusChanged) {
      cleanupStatus = window.electronAPI.onServerStatusChanged(() => {
        refreshRunningServers();
      });
    }

    // Listen to live server logs
    let cleanupLog = null;
    if (window.electronAPI?.onServerLog) {
      cleanupLog = window.electronAPI.onServerLog(({ folderPath, text, isError, isInput }) => {
        if (!selectedServerPath || selectedServerPath === folderPath) {
          const lines = text.split(/\r?\n/).filter(Boolean);
          const time = new Date().toLocaleTimeString('es-ES', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
          setServerLogs((prev) => [
            ...prev,
            ...lines.map((l) => ({ text: l, isError, isInput, timestamp: time }))
          ]);
        }
      });
    }

    return () => {
      if (cleanupStatus) cleanupStatus();
      if (cleanupLog) cleanupLog();
    };
  }, [selectedServerPath]);

  // Load buffered logs when changing selected server
  useEffect(() => {
    if (selectedServerPath && window.electronAPI?.getServerLogs) {
      window.electronAPI.getServerLogs(selectedServerPath).then((rawLogs) => {
        if (Array.isArray(rawLogs)) {
          setServerLogs(
            rawLogs.map((l) => ({
              text: l.text,
              isError: l.isError,
              isInput: l.isInput,
              timestamp: l.time
                ? new Date(l.time).toLocaleTimeString('es-ES', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : '',
            }))
          );
        }
      });
    }
  }, [selectedServerPath]);

  // Auto-scroll server logs
  useEffect(() => {
    if (consoleMode === 'server' && serverLogContainerRef.current) {
      serverLogContainerRef.current.scrollTop = serverLogContainerRef.current.scrollHeight;
    }
  }, [serverLogs, consoleMode]);

  // Auto-scroll RCON logs
  useEffect(() => {
    if (consoleMode === 'rcon' && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, consoleMode]);

  // Handle Server Console Command Send (stdin)
  const handleSendServerInput = async (cmdToSend = null) => {
    const raw = (cmdToSend !== null ? cmdToSend : serverInput).trim();
    if (!raw || !selectedServerPath) return;

    setServerHistory((prev) => [raw, ...prev.filter((h) => h !== raw)].slice(0, 50));
    setServerHistoryIndex(-1);
    if (cmdToSend === null) setServerInput('');

    if (window.electronAPI?.sendServerInput) {
      await window.electronAPI.sendServerInput({
        folderPath: selectedServerPath,
        command: raw,
      });
    }
    serverInputRef.current?.focus();
  };

  const handleServerKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendServerInput();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (serverHistory.length > 0 && serverHistoryIndex < serverHistory.length - 1) {
        const nextIndex = serverHistoryIndex + 1;
        setServerHistoryIndex(nextIndex);
        setServerInput(serverHistory[nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (serverHistoryIndex > 0) {
        const nextIndex = serverHistoryIndex - 1;
        setServerHistoryIndex(nextIndex);
        setServerInput(serverHistory[nextIndex]);
      } else if (serverHistoryIndex === 0) {
        setServerHistoryIndex(-1);
        setServerInput('');
      }
    }
  };

  // Stop Running Server
  const handleStopServer = async () => {
    if (!selectedServerPath || isStoppingServer) return;
    setIsStoppingServer(true);
    try {
      if (window.electronAPI?.stopServer) {
        await window.electronAPI.stopServer(selectedServerPath);
      }
    } finally {
      setTimeout(() => setIsStoppingServer(false), 2000);
    }
  };

  // RCON Handlers
  const handleSendRcon = async (cmdToSend = null) => {
    const raw = (cmdToSend !== null ? cmdToSend : inputCommand).trim();
    if (!raw || !isConnected) return;

    setIsSending(true);
    setHistory((prev) => [raw, ...prev.filter((h) => h !== raw)].slice(0, 50));
    setHistoryIndex(-1);

    if (cmdToSend === null) setInputCommand('');

    try {
      await onSendCommand(raw);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleRconKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendRcon();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0 && historyIndex < history.length - 1) {
        const nextIndex = historyIndex + 1;
        setHistoryIndex(nextIndex);
        setInputCommand(history[nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setInputCommand(history[nextIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputCommand('');
      }
    }
  };

  const exportServerLogs = () => {
    const textContent = serverLogs.map((l) => `[${l.timestamp}] ${l.text}`).join('\n');
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `minecraft-server-log-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportRconLogs = () => {
    const textContent = logs.map((l) => `[${l.timestamp}] ${l.type === 'input' ? '>' : '<'} ${l.text}`).join('\n');
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `minecraft-rcon-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Mode Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-mc-card border border-mc-border p-2.5 rounded-2xl">
        <div className="flex items-center gap-1.5 bg-zinc-900/90 p-1 rounded-xl border border-mc-border">
          <button
            type="button"
            onClick={() => setConsoleMode('server')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              consoleMode === 'server'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            Consola del Servidor (Salida en Vivo)
            {runningServers.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setConsoleMode('rcon')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              consoleMode === 'rcon'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <TerminalIcon className="w-3.5 h-3.5" />
            Consola RCON (Comandos)
            {isConnected && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            )}
          </button>
        </div>

        {/* Server Selector & Controls if in Server Mode */}
        {consoleMode === 'server' && (
          <div className="flex items-center gap-2">
            {runningServers.length > 1 && (
              <select
                value={selectedServerPath}
                onChange={(e) => setSelectedServerPath(e.target.value)}
                className="bg-zinc-900 border border-mc-border text-white text-xs rounded-xl px-2.5 py-1.5 font-medium focus:outline-none"
              >
                {runningServers.map((s) => (
                  <option key={s.folderPath} value={s.folderPath}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}

            {runningServers.length > 0 && (
              <button
                type="button"
                onClick={handleStopServer}
                disabled={isStoppingServer}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-500/30 transition-all disabled:opacity-50"
                title="Detener el servidor de Minecraft de forma segura (comando stop)"
              >
                <Square className="w-3 h-3 fill-current" />
                {isStoppingServer ? 'Deteniendo...' : 'Detener Servidor'}
              </button>
            )}

            <button
              onClick={exportServerLogs}
              disabled={serverLogs.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 border border-mc-border hover:border-zinc-700 transition-colors disabled:opacity-40"
              title="Descargar logs completos"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar
            </button>

            <button
              onClick={() => setServerLogs([])}
              disabled={serverLogs.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-red-400 bg-zinc-900 border border-mc-border hover:border-red-500/30 transition-colors disabled:opacity-40"
              title="Limpiar pantalla"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpiar
            </button>
          </div>
        )}

        {/* RCON Controls if in RCON Mode */}
        {consoleMode === 'rcon' && (
          <div className="flex items-center gap-2">
            <button
              onClick={exportRconLogs}
              disabled={logs.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 border border-mc-border hover:border-zinc-700 transition-colors disabled:opacity-40"
              title="Exportar registro RCON"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar
            </button>
            <button
              onClick={onClearLogs}
              disabled={logs.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-red-400 bg-zinc-900 border border-mc-border hover:border-red-500/30 transition-colors disabled:opacity-40"
              title="Limpiar pantalla"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpiar
            </button>
          </div>
        )}
      </div>

      {/* VIEW 1: Integrated Live Server Console */}
      {consoleMode === 'server' && (
        <div className="flex flex-col flex-1 space-y-3">
          <div
            ref={serverLogContainerRef}
            className="flex-1 bg-black/90 border border-mc-border rounded-2xl p-4 font-mono text-xs overflow-y-auto space-y-1 select-text shadow-inner min-h-[420px] max-h-[560px]"
          >
            {runningServers.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-3 py-20">
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
                  <Server className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <p className="text-zinc-300 font-bold text-sm">No hay servidores de Minecraft en ejecución</p>
                  <p className="text-xs text-zinc-500 mt-1 max-w-md">
                    Cuando inicies un servidor desde la pestaña de descarga o desde tus servidores locales, su consola en vivo aparecerá aquí automáticamente sin abrir ventanas externas de CMD.
                  </p>
                </div>
                {onNavigateToInstaller && (
                  <button
                    type="button"
                    onClick={onNavigateToInstaller}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Ir a Iniciar Servidor
                  </button>
                )}
              </div>
            ) : serverLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-2 py-20">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                <p className="text-zinc-300 font-medium text-xs">Iniciando proceso Java de Minecraft...</p>
                <p className="text-[11px] text-zinc-500">Esperando primeras líneas de salida del servidor.</p>
              </div>
            ) : (
              serverLogs.map((log, index) => {
                const isWarn = log.text.includes('/WARN]') || log.text.includes('[WARN]');
                const isErr = log.isError || log.text.includes('/ERROR]') || log.text.includes('Exception');
                const isInput = log.isInput || log.text.startsWith('>');

                let textColor = 'text-zinc-300';
                if (isInput) textColor = 'text-emerald-400 font-bold bg-emerald-950/20 px-1.5 py-0.5 rounded';
                else if (isErr) textColor = 'text-red-400 bg-red-950/20 px-1.5 py-0.5 rounded';
                else if (isWarn) textColor = 'text-amber-300';

                return (
                  <div key={index} className={`leading-relaxed break-words flex items-start gap-2 ${textColor}`}>
                    {log.timestamp && (
                      <span className="text-[10px] text-zinc-600 select-none shrink-0 mt-0.5 font-mono">
                        {log.timestamp}
                      </span>
                    )}
                    <span className="flex-1 whitespace-pre-wrap">{log.text}</span>
                  </div>
                );
              })
            )}
          </div>

          {/* Server Input Box (stdin) */}
          <div className="relative flex items-center bg-zinc-950 border border-mc-border focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 rounded-xl px-4 py-2 shadow-lg transition-all">
            <span className="text-emerald-400 font-mono font-bold mr-2 select-none">&gt;</span>
            <input
              ref={serverInputRef}
              type="text"
              value={serverInput}
              onChange={(e) => setServerInput(e.target.value)}
              onKeyDown={handleServerKeyDown}
              disabled={runningServers.length === 0}
              placeholder={
                runningServers.length > 0
                  ? 'Comando de consola directa (ej: help, op MiAmigo, gamemode creative, stop)...'
                  : 'Inicia un servidor para enviar comandos directamente a su consola...'
              }
              className="flex-1 bg-transparent text-white placeholder-zinc-500 text-sm font-mono focus:outline-none disabled:opacity-40"
            />

            <div className="flex items-center gap-2 ml-2">
              <span className="text-[10px] text-zinc-500 hidden sm:inline-block border border-zinc-800 px-1.5 py-0.5 rounded">
                Enter ↵
              </span>
              <button
                onClick={() => handleSendServerInput()}
                disabled={runningServers.length === 0 || !serverInput.trim()}
                className="flex items-center justify-center p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-30 transition-all shadow-sm"
                title="Enviar comando a la consola de Minecraft"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: RCON Protocol Console */}
      {consoleMode === 'rcon' && (
        <div className="flex flex-col flex-1 space-y-3">
          {/* Quick Command Atajos Bar */}
          <div className="flex items-center gap-2 overflow-x-auto py-1 bg-zinc-900/60 px-3 rounded-xl border border-mc-border">
            <span className="text-xs text-zinc-500 font-medium whitespace-nowrap flex items-center gap-1 mr-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Atajos RCON:
            </span>
            {quickCommands.map((q) => (
              <button
                key={q.cmd}
                onClick={() => handleSendRcon(q.cmd)}
                disabled={!isConnected || isSending}
                className="text-xs px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-emerald-500/10 text-zinc-300 hover:text-emerald-400 border border-mc-border hover:border-emerald-500/30 transition-all font-mono whitespace-nowrap disabled:opacity-40"
              >
                /{q.cmd}
              </button>
            ))}
          </div>

          {/* RCON Terminal Output */}
          <div 
            ref={logContainerRef}
            className="flex-1 bg-black/80 border border-mc-border rounded-2xl p-4 font-mono text-xs overflow-y-auto space-y-2 select-text shadow-inner min-h-[380px] max-h-[500px]"
          >
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-2 py-16">
                <TerminalIcon className="w-8 h-8 text-zinc-600" />
                <p className="text-zinc-400">Consola RCON lista.</p>
                <p className="text-[11px] text-zinc-600">
                  Escribe un comando abajo (por ejemplo <code className="text-emerald-400">list</code> o <code className="text-emerald-400">help</code>) o pulsa un atajo rápido.
                </p>
              </div>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  className={`leading-relaxed break-words flex items-start gap-2.5 ${
                    log.type === 'input'
                      ? 'text-emerald-400 bg-emerald-950/20 px-2 py-1 rounded border-l-2 border-emerald-500'
                      : log.type === 'error'
                      ? 'text-red-400 bg-red-950/20 px-2 py-1 rounded border-l-2 border-red-500'
                      : 'text-zinc-200'
                  }`}
                >
                  <span className="text-[10px] text-zinc-500 shrink-0 font-mono mt-0.5 select-none flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {log.timestamp}
                  </span>

                  {log.type === 'input' && (
                    <span className="text-emerald-500 select-none font-bold">&gt;</span>
                  )}

                  <div className="flex-1 whitespace-pre-wrap">
                    {formatMinecraftText(log.text)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* RCON Command Input Box */}
          <div className="relative flex items-center bg-zinc-950 border border-mc-border focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 rounded-xl px-4 py-2 shadow-lg transition-all">
            <span className="text-emerald-400 font-mono font-bold mr-2 select-none">&gt;</span>
            <input
              ref={inputRef}
              type="text"
              value={inputCommand}
              onChange={(e) => setInputCommand(e.target.value)}
              onKeyDown={handleRconKeyDown}
              disabled={!isConnected}
              placeholder={
                isConnected
                  ? 'Introduce un comando de Minecraft (ej: list, time set day, gamerule keepInventory true)...'
                  : 'Conéctate a RCON o inicia en Modo Prueba para ejecutar comandos...'
              }
              className="flex-1 bg-transparent text-white placeholder-zinc-500 text-sm font-mono focus:outline-none disabled:opacity-40"
            />

            <div className="flex items-center gap-2 ml-2">
              <span className="text-[10px] text-zinc-500 hidden sm:inline-block border border-zinc-800 px-1.5 py-0.5 rounded">
                Enter ↵
              </span>
              <button
                onClick={() => handleSendRcon()}
                disabled={!isConnected || !inputCommand.trim() || isSending}
                className="flex items-center justify-center p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-30 transition-all shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
