import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import ConnectionModal from './components/ConnectionModal';
import ConsoleTab from './components/ConsoleTab';
import GamerulesTab from './components/GamerulesTab';
import PlayersTab from './components/PlayersTab';
import WorldTab from './components/WorldTab';
import QuickActionsTab from './components/QuickActionsTab';
import OptimizerTab from './components/OptimizerTab';
import InstallerTab from './components/InstallerTab';

export default function App() {
  const [activeTab, setActiveTab] = useState('installer');
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    isSimulated: false,
    host: '127.0.0.1',
    port: 25575,
    latencyMs: 0,
    error: null,
  });
  const [logs, setLogs] = useState([]);

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
          addLog(`✓ Conexión establecida con ${config.host}:${config.port}`, 'output');
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
        error: null,
      });
    }
    addLog('Conexión RCON finalizada.', 'output');
  };

  // Toggle Simulated mode
  const handleStartSimulated = async () => {
    if (window.electronAPI) {
      await window.electronAPI.connectRcon({ isSimulated: true });
    } else {
      setConnectionStatus({
        connected: true,
        isSimulated: true,
        host: 'Servidor Simulado',
        port: 25575,
        latencyMs: 3,
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
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 overflow-y-auto">
        {activeTab === 'installer' && (
          <InstallerTab
            onConnectToServer={(serverConfig) => {
              handleConnect(serverConfig);
              setActiveTab('console');
            }}
          />
        )}

        {activeTab === 'console' && (
          <ConsoleTab
            onSendCommand={handleSendCommand}
            logs={logs}
            onClearLogs={() => setLogs([])}
            isConnected={connectionStatus.connected}
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
    </div>
  );
}
