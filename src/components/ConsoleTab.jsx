import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Trash2, 
  Download, 
  Terminal as TerminalIcon, 
  Clock, 
  CornerDownLeft, 
  Sparkles,
  Info
} from 'lucide-react';
import { formatMinecraftText } from '../utils/minecraftColors';

export default function ConsoleTab({ onSendCommand, logs = [], onClearLogs, isConnected }) {
  const [inputCommand, setInputCommand] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isSending, setIsSending] = useState(false);
  const logContainerRef = useRef(null);
  const inputRef = useRef(null);

  const quickCommands = [
    { label: 'Lista de Jugadores', cmd: 'list' },
    { label: 'Semilla del Mundo', cmd: 'seed' },
    { label: 'Hora Actual', cmd: 'time query daytime' },
    { label: 'Guardar Mundo', cmd: 'save-all' },
    { label: 'Lista Blanca', cmd: 'whitelist list' },
    { label: 'Ayuda', cmd: 'help' },
  ];

  // Auto-scroll to bottom on new log entry
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleSend = async (cmdToSend = null) => {
    const raw = (cmdToSend !== null ? cmdToSend : inputCommand).trim();
    if (!raw) return;

    if (!isConnected) {
      return;
    }

    setIsSending(true);
    setHistory((prev) => [raw, ...prev.filter((h) => h !== raw)].slice(0, 50));
    setHistoryIndex(-1);

    if (cmdToSend === null) {
      setInputCommand('');
    }

    try {
      await onSendCommand(raw);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
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

  const exportLogs = () => {
    const textContent = logs
      .map(
        (l) =>
          `[${l.timestamp}] ${l.type === 'input' ? '>' : '<'} ${l.text}`
      )
      .join('\n');
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
      {/* Action Bar */}
      <div className="flex items-center justify-between bg-mc-card border border-mc-border px-4 py-2.5 rounded-xl">
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          <span className="text-xs text-zinc-500 font-medium whitespace-nowrap flex items-center gap-1 mr-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Atajos:
          </span>
          {quickCommands.map((q) => (
            <button
              key={q.cmd}
              onClick={() => handleSend(q.cmd)}
              disabled={!isConnected || isSending}
              className="text-xs px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-emerald-500/10 text-zinc-300 hover:text-emerald-400 border border-mc-border hover:border-emerald-500/30 transition-all font-mono whitespace-nowrap disabled:opacity-40"
            >
              /{q.cmd}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={exportLogs}
            disabled={logs.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 border border-mc-border hover:border-zinc-700 transition-colors disabled:opacity-40"
            title="Exportar registro completo a archivo .txt"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar
          </button>
          <button
            onClick={onClearLogs}
            disabled={logs.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-red-400 bg-zinc-900 border border-mc-border hover:border-red-500/30 transition-colors disabled:opacity-40"
            title="Limpiar pantalla de consola"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpiar
          </button>
        </div>
      </div>

      {/* Terminal Output Area */}
      <div 
        ref={logContainerRef}
        className="flex-1 bg-black/80 border border-mc-border rounded-xl p-4 font-mono text-xs overflow-y-auto space-y-2 select-text shadow-inner min-h-[350px] relative"
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

      {/* Command Input Box */}
      <div className="relative flex items-center bg-zinc-950 border border-mc-border focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 rounded-xl px-4 py-2 shadow-lg transition-all">
        <span className="text-emerald-400 font-mono font-bold mr-2 select-none">&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={inputCommand}
          onChange={(e) => setInputCommand(e.target.value)}
          onKeyDown={handleKeyDown}
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
            onClick={() => handleSend()}
            disabled={!isConnected || !inputCommand.trim() || isSending}
            className="flex items-center justify-center p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-30 transition-all shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
