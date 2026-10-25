import React, { useState } from 'react';
import { 
  Terminal, 
  Sliders, 
  Users, 
  Globe2, 
  Zap, 
  Sparkles, 
  Wifi, 
  WifiOff, 
  Play, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Download,
  Settings,
  Minimize2
} from 'lucide-react';
import SettingsModal from './SettingsModal';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  connectionStatus, 
  onOpenConnectModal,
  onDisconnect,
  onToggleSimulated,
  onOpenQuickGuide
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleMinimizeToTray = () => {
    if (window.electronAPI?.minimizeToTray) {
      window.electronAPI.minimizeToTray();
    }
  };

  const tabs = [
    { id: 'installer', label: 'Descargar Servidor', icon: Download, isNew: true },
    { id: 'console', label: 'Consola', icon: Terminal },
    { id: 'gamerules', label: 'Reglas de Juego', icon: Sliders },
    { id: 'players', label: 'Jugadores & Whitelist', icon: Users },
    { id: 'world', label: 'Mundo & Clima', icon: Globe2 },
    { id: 'actions', label: 'Acciones Rápidas', icon: Zap },
    { id: 'optimizer', label: 'Optimizador & Flags', icon: Sparkles },
  ];

  return (
    <header className="bg-mc-card/90 backdrop-blur border-b border-mc-border sticky top-0 z-40 select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-mc-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center shadow-lg shadow-emerald-950/40 border border-emerald-400/30">
            <span className="text-xl">⛏️</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-white tracking-wide">Minecraft RCON Studio</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                v2.0
              </span>
            </div>
            <p className="text-xs text-zinc-400">Panel de control, instalador oficial y optimizador</p>
          </div>
        </div>

        {/* Connection status & action buttons */}
        <div className="flex items-center gap-3">
          {connectionStatus.connected ? (
            <div className="flex items-center gap-3 bg-zinc-900/80 px-3.5 py-1.5 rounded-lg border border-emerald-500/30">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <div className="text-xs">
                <span className="text-zinc-400">Estado: </span>
                <span className="text-emerald-400 font-semibold">
                  {connectionStatus.isSimulated ? 'Modo Simulado' : 'Conectado'}
                </span>
                {!connectionStatus.isSimulated && (
                  <span className="text-zinc-500 ml-1.5 font-mono">
                    ({connectionStatus.latencyMs}ms)
                  </span>
                )}
              </div>
              <button
                onClick={onDisconnect}
                className="ml-2 text-xs text-red-400 hover:text-red-300 hover:underline transition-colors"
                title="Desconectar RCON"
              >
                Desconectar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-zinc-900/80 px-3.5 py-1.5 rounded-lg border border-red-500/30">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500"></span>
              <span className="text-xs text-red-400 font-medium">Desconectado</span>
            </div>
          )}

          <button
            onClick={onOpenConnectModal}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
              connectionStatus.connected
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/50'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            {connectionStatus.connected ? 'Cambiar Conexión' : 'Conectar RCON'}
          </button>

          {!connectionStatus.connected && (
            <button
              onClick={onToggleSimulated}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 transition-colors"
              title="Probar interfaz sin necesidad de encender Minecraft"
            >
              <Play className="w-3.5 h-3.5 text-purple-400" />
              Modo Prueba
            </button>
          )}

          <button
            onClick={handleMinimizeToTray}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            title="Minimizar a la bandeja del sistema (System Tray)"
          >
            <Minimize2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            title="Configuración de la aplicación (Bandeja y comportamiento al cerrar)"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenQuickGuide}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            title="Ayuda y Configuración de RCON"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />

      {/* Navigation Tabs */}
      <div className="flex items-center px-6 gap-2 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`} />
              {tab.label}
              {tab.isNew && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold uppercase tracking-wider border border-emerald-500/30">
                  Nuevo
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
}
