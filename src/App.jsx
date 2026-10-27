import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import ConnectionModal from './components/ConnectionModal';
import SettingsModal from './components/SettingsModal';
import WelcomeModal from './components/WelcomeModal';
import ConsoleTab from './components/ConsoleTab';
import GamerulesTab from './components/GamerulesTab';
import PlayersTab from './components/PlayersTab';
import WorldTab from './components/WorldTab';
import QuickActionsTab from './components/QuickActionsTab';
import OptimizerTab from './components/OptimizerTab';
import InstallerTab from './components/InstallerTab';
import WebTab from './components/WebTab';

export default function App() {
  const [activeTab, setActiveTab] = useState('installer');
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isWebAuthenticated, setIsWebAuthenticated] = useState(() => {
    if (!window.electronAPI?.isWebBridge) return true;
    return window.electronAPI.isAuthenticated ? window.electronAPI.isAuthenticated() : false;
  });
  const [webPinInput, setWebPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    isSimulated: false,
    host: '127.0.0.1',
    port: 25575,
    latencyMs: 0,
    error: null,
  });
  const [logs, setLogs] = useState([]);

  // Subscribe to WebBridge Auth state if outside Electron
  useEffect(() => {
    if (window.electronAPI?.onAuthChange) {
      const unsub = window.electronAPI.onAuthChange((authed, err) => {
        setIsWebAuthenticated(authed);
        if (!authed && err) {
          setPinError(err);
        } else if (authed) {
          setPinError('');
        }
      });
      return unsub;
    }
  }, []);

  // Check welcome modal on mount from config/settings.json
  useEffect(() => {
    async function checkWelcome() {
      try {
        if (window.electronAPI?.getSettings) {
          const s = await window.electronAPI.getSettings();
          if (!s?.hideWelcome) {
            localStorage.removeItem('mcrcon_hide_welcome');
            setIsWelcomeOpen(true);
          } else {
            setIsWelcomeOpen(false);
          }
        } else {
          const hideWelcome = localStorage.getItem('mcrcon_hide_welcome') === 'true';
          if (!hideWelcome) {
            setIsWelcomeOpen(true);
          }
        }
      } catch (_) {
        setIsWelcomeOpen(true);
      }
    }
    checkWelcome();
  }, []);

  // Add log entry
  const addLog = useCallback((text, type = 'output') => {
    const time = new Date().toLocaleTimeString('es-ES', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setLogs((prev) => [...prev, { text, type, timestamp: time }]);
  }, []);

  // Listen to Electron IPC connection updates if running inside Electron
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getStatus().then((status) => {
        if (status) setConnectionStatus(status);
      });

      const cleanup = window.electronAPI.onConnectionStatusChange((status) => {
        setConnectionStatus(status);
        if (status.connected) {
          addLog(
            `Conectado a ${status.host}:${status.port} ${status.isSimulated ? '(Modo Simulado)' : ''}`,
            'output'
          );
        } else if (status.error) {
          addLog(`Desconectado: ${status.error}`, 'error');
        }
      });

      return cleanup;
    } else {
      // In web browser fallback mode, start with simulated mode available
      console.log('Running in browser mode without Electron window API');
    }
  }, [addLog]);

  // Connect Handler
  const handleConnect = async (config) => {
    setIsConnecting(true);
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.connectRcon(config);
        if (result.success) {
          setIsConnectModalOpen(false);
          const typeLabel = result.serverType === 'bedrock' ? 'Bedrock Edition' : 'Java Edition';
          const methodLabel = result.isLocalDirect ? 'Consola Directa' : 'RCON';
          addLog(`✓ Conexión establecida con ${config.host || 'servidor'}:${config.port || ''} [${typeLabel} - ${methodLabel}]`, 'output');
        } else {
          addLog(`✗ Error al conectar: ${result.error}`, 'error');
        }
      } else {
        // Fallback for browser preview
        setConnectionStatus({
          connected: true,
          isSimulated: true,
          host: config.host || '127.0.0.1',
          port: config.port || 25575,
          latencyMs: 2,
          serverType: config.serverType && config.serverType !== 'auto' ? config.serverType : 'java',
          error: null,
        });
        setIsConnectModalOpen(false);
        addLog(`Conectado en modo simulado local`, 'output');
      }
    } catch (err) {
      addLog(`Error de conexión: ${err.message}`, 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect Handler
  const handleDisconnect = async () => {
    if (window.electronAPI) {
      await window.electronAPI.disconnectRcon();
    } else {
      setConnectionStatus({
        connected: false,
        isSimulated: false,
        host: '127.0.0.1',
        port: 25575,
        latencyMs: 0,
        serverType: 'java',
        error: null,
      });
    }
    addLog('Conexión RCON finalizada.', 'output');
  };

  // Toggle Simulated mode
  const handleStartSimulated = async (serverType = 'java') => {
    const cleanType = serverType && serverType !== 'auto' ? serverType : 'java';
    if (window.electronAPI) {
      await window.electronAPI.connectRcon({ isSimulated: true, serverType: cleanType });
    } else {
      setConnectionStatus({
        connected: true,
        isSimulated: true,
        host: 'Servidor Simulado',
        port: 25575,
        latencyMs: 3,
        serverType: cleanType,
        error: null,
      });
    }
    addLog('✓ Modo Simulado de prueba activado. Puedes probar todos los comandos.', 'output');
  };

  // Send Command to Server
  const handleSendCommand = async (command) => {
    addLog(command, 'input');

    if (window.electronAPI) {
      try {
        const res = await window.electronAPI.sendCommand(command);
        if (res.success) {
          addLog(res.response, 'output');
          return res.response;
        } else {
          addLog(`Error: ${res.error}`, 'error');
          throw new Error(res.error);
        }
      } catch (err) {
        addLog(`Error de envío: ${err.message}`, 'error');
        throw err;
      }
    } else {
      // Mock browser response
      const mockRes = `[Simulado] Comando "${command}" ejecutado exitosamente.`;
      addLog(mockRes, 'output');
      return mockRes;
    }
  };

  // If accessed remotely via Web Browser and not authenticated yet with the PIN
  if (window.electronAPI?.isWebBridge && !isWebAuthenticated) {
    return (
      <div className="min-h-screen bg-mc-dark text-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-mc-card border border-mc-border rounded-3xl p-8 shadow-2xl space-y-6 animate-fadeIn">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-3xl mx-auto mb-2 text-emerald-400 shadow-lg shadow-emerald-950/40">
              🔒
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">Minecraft RCON Studio</h2>
            <div className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20 inline-block">
              Acceso Remoto Web
            </div>
            <p className="text-xs text-zinc-400 pt-1 leading-relaxed">
              Introduce el PIN de seguridad configurado en el ordenador anfitrión para acceder a todas las funciones.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const pin = webPinInput.trim();
              if (!pin) {
                setPinError('Introduce el PIN de seguridad.');
                return;
              }
              setPinError('');
              if (window.electronAPI?.setPin) {
                window.electronAPI.setPin(pin);
              }
            }}
            className="space-y-4"
          >
            <div>
              <input
                type="password"
                value={webPinInput}
                onChange={(e) => setWebPinInput(e.target.value)}
                placeholder="Introduce el PIN (ej: 1234)"
                className="w-full text-center tracking-widest text-lg py-3 px-4 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors"
                autoFocus
              />
              {pinError && <p className="text-xs text-red-400 mt-2 text-center font-medium">{pinError}</p>}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-950 active:scale-95"
            >
              Desbloquear Panel
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mc-dark text-white flex flex-col font-sans select-none antialiased">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        connectionStatus={connectionStatus}
        onOpenConnectModal={() => setIsConnectModalOpen(true)}
        onDisconnect={handleDisconnect}
        onToggleSimulated={handleStartSimulated}
        onOpenQuickGuide={() => setIsConnectModalOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 overflow-y-auto">
        {activeTab === 'web' && <WebTab />}

        {activeTab === 'installer' && (
          <InstallerTab
            onConnectToServer={(serverConfig) => {
              handleConnect(serverConfig);
              setActiveTab('console');
            }}
            onNavigateToConsole={() => setActiveTab('console')}
          />
        )}

        {activeTab === 'console' && (
          <ConsoleTab
            onSendCommand={handleSendCommand}
            logs={logs}
            onClearLogs={() => setLogs([])}
            isConnected={connectionStatus.connected}
            onNavigateToInstaller={() => setActiveTab('installer')}
          />
        )}

        {activeTab === 'gamerules' && (
          <GamerulesTab
            onSendCommand={handleSendCommand}
            isConnected={connectionStatus.connected}
          />
        )}

        {activeTab === 'players' && (
          <PlayersTab
            onSendCommand={handleSendCommand}
            isConnected={connectionStatus.connected}
          />
        )}

        {activeTab === 'world' && (
          <WorldTab
            onSendCommand={handleSendCommand}
            isConnected={connectionStatus.connected}
          />
        )}

        {activeTab === 'actions' && (
          <QuickActionsTab
            onSendCommand={handleSendCommand}
            isConnected={connectionStatus.connected}
          />
        )}

        {activeTab === 'optimizer' && <OptimizerTab />}
      </main>

      {/* Connection & Configuration Modal */}
      <ConnectionModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onConnect={handleConnect}
        onSimulate={handleStartSimulated}
        currentStatus={connectionStatus}
        isConnecting={isConnecting}
      />

      {/* App Settings Modal (rendered at root level with z-[100] above all layers) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Welcome / Highlights Startup Modal */}
      <WelcomeModal
        isOpen={isWelcomeOpen}
        onClose={() => setIsWelcomeOpen(false)}
      />
    </div>
  );
}
