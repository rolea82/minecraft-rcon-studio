import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  QrCode, 
  Globe, 
  Shield, 
  Copy, 
  Check, 
  ExternalLink, 
  Power, 
  RefreshCw, 
  Wifi, 
  Users, 
  Lock, 
  Eye, 
  EyeOff, 
  Info,
  Server,
  Terminal,
  Zap,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export default function WebTab() {
  const [webInfo, setWebInfo] = useState({
    enabled: false,
    port: 8080,
    pin: '1234',
    localUrl: 'http://localhost:8080',
    networkUrl: 'http://127.0.0.1:8080',
    connectedClients: 0,
  });

  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [portInput, setPortInput] = useState(8080);
  const [pinInput, setPinInput] = useState('1234');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Load initial info
  const loadInfo = async () => {
    if (window.electronAPI?.getWebInfo) {
      try {
        const info = await window.electronAPI.getWebInfo();
        if (info) {
          setWebInfo(info);
          setPortInput(info.port);
          setPinInput(info.pin);
        }
        const qr = await window.electronAPI.getWebQrCode();
        if (qr) setQrCodeUrl(qr);
      } catch (err) {
        console.error('Error loading web info:', err);
      }
    } else {
      // Browser preview mode
      setWebInfo({
        enabled: true,
        port: 8080,
        pin: '1234',
        localUrl: 'http://localhost:8080',
        networkUrl: 'http://192.168.1.150:8080',
        connectedClients: 1,
      });
    }
  };

  useEffect(() => {
    loadInfo();
    const interval = setInterval(loadInfo, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleService = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      if (webInfo.enabled) {
        if (window.electronAPI?.stopWebService) {
          const res = await window.electronAPI.stopWebService();
          if (res.success) {
            setWebInfo(prev => ({ ...prev, enabled: false, connectedClients: 0 }));
            setStatusMessage({ type: 'info', text: 'Servicio web detenido correctamente.' });
          }
        } else {
          setWebInfo(prev => ({ ...prev, enabled: false, connectedClients: 0 }));
        }
      } else {
        if (window.electronAPI?.startWebService) {
          const res = await window.electronAPI.startWebService({
            port: Number(portInput),
            pin: String(pinInput).trim() || '1234',
          });
          if (res.success) {
            setWebInfo(res.info);
            const qr = await window.electronAPI.getWebQrCode();
            if (qr) setQrCodeUrl(qr);
            setStatusMessage({ type: 'success', text: '¡Servicio web iniciado en la red local!' });
          } else {
            setStatusMessage({ type: 'error', text: `Error al iniciar: ${res.error}` });
          }
        } else {
          setWebInfo(prev => ({ ...prev, enabled: true }));
        }
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusMessage(null);
    try {
      if (window.electronAPI?.saveWebConfig) {
        const res = await window.electronAPI.saveWebConfig({
          port: Number(portInput),
          pin: String(pinInput).trim() || '1234',
          enabled: webInfo.enabled,
        });
        if (res.success) {
          setWebInfo(res.info);
          const qr = await window.electronAPI.getWebQrCode();
          if (qr) setQrCodeUrl(qr);
          setStatusMessage({ type: 'success', text: 'Configuración guardada correctamente.' });
        } else {
          setStatusMessage({ type: 'error', text: res.error });
        }
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  const cleanUrl = `${webInfo.networkUrl}/`;

  return (
    <div className="space-y-6 pb-12 animate-fadeIn max-w-6xl mx-auto">
      {/* Title & Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-900 border border-emerald-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="flex items-start gap-4 z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-950/50 border border-emerald-400/30 shrink-0">
            <Smartphone className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-wide">
                Servicio Web & Control Remoto Móvil
              </h2>
            </div>
            <p className="text-sm text-zinc-300 mt-1 max-w-2xl leading-relaxed">
              Controla tu servidor de Minecraft, envía comandos de consola en tiempo real y visualiza el estado directamente desde tu smartphone, tablet u otro PC conectado a tu red Wi-Fi local.
            </p>
          </div>
        </div>

        {/* Global Toggle Button */}
        <div className="flex items-center gap-3 z-10 shrink-0">
          <button
            onClick={handleToggleService}
            disabled={isLoading}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-sm transition-all shadow-lg active:scale-95 ${
              webInfo.enabled
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 shadow-red-950/40'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/50'
            }`}
          >
            <Power className="w-4 h-4" />
            {isLoading ? 'Cargando...' : webInfo.enabled ? 'Detener Servicio Web' : 'Iniciar Servicio Web'}
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 text-sm ${
          statusMessage.type === 'success'
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
            : statusMessage.type === 'error'
            ? 'bg-red-950/40 border-red-500/40 text-red-300'
            : 'bg-zinc-800/80 border-zinc-700 text-zinc-300'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Grid: QR Code & Connection vs Settings & Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: QR Code & Direct Connect (7 cols) */}
        <div className="lg:col-span-7 bg-mc-card border border-mc-border rounded-2xl p-6 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-mc-border/60">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Escaneo Rápido con Cámara Móvil</h3>
              </div>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border flex items-center gap-1.5 ${
                webInfo.enabled
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}>
                <span className={`w-2 h-2 rounded-full ${webInfo.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`}></span>
                {webInfo.enabled ? 'Servicio Activo' : 'Servicio Inactivo'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 mt-6">
              {/* QR Code Container */}
              <div className="relative group shrink-0">
                <div className="w-56 h-56 bg-zinc-900 border-2 border-emerald-500/40 rounded-2xl p-3 flex items-center justify-center shadow-xl overflow-hidden relative">
                  {webInfo.enabled && qrCodeUrl ? (
                    <img 
                      src={qrCodeUrl} 
                      alt="Código QR de Conexión" 
                      className="w-full h-full object-contain rounded-xl"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-4 text-zinc-500">
                      <QrCode className="w-16 h-16 mb-2 opacity-30" />
                      <p className="text-xs">Inicia el servicio web para generar el código QR</p>
                    </div>
                  )}
                  {webInfo.enabled && (
                    <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none"></div>
                  )}
                </div>
                {webInfo.enabled && (
                  <p className="text-[11px] text-center text-zinc-400 mt-2 font-medium">
                    Escanea para abrir en el móvil (requerirá PIN)
                  </p>
                )}
              </div>

              {/* Instructions & Links */}
              <div className="flex-1 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-200 mb-1 flex items-center gap-1.5">
                    <Wifi className="w-4 h-4 text-emerald-400" />
                    ¿Cómo conectar tu móvil o tablet?
                  </h4>
                  <ol className="text-xs text-zinc-400 space-y-2 list-decimal list-inside pl-1 leading-relaxed">
                    <li>Conecta tu dispositivo al <strong className="text-zinc-200">mismo Wi-Fi</strong> que este PC.</li>
                    <li>Abre la cámara de tu teléfono y escanea el código QR de la izquierda (o escribe la URL).</li>
                    <li>Introduce el <strong className="text-emerald-400 font-mono">PIN de Seguridad</strong> para desbloquear y controlar el servidor.</li>
                  </ol>
                </div>

                {/* Direct Network URL */}
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-semibold text-zinc-300">Enlace seguro para el navegador:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={webInfo.enabled ? cleanUrl : `http://[Tu-IP-Local]:${portInput}`}
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-emerald-400 select-all focus:outline-none"
                    />
                    <button
                      onClick={() => copyToClipboard(cleanUrl, 'url')}
                      disabled={!webInfo.enabled}
                      className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg border border-zinc-700 transition-colors flex items-center gap-1.5 text-xs font-medium disabled:opacity-40"
                      title="Copiar URL al portapapeles"
                    >
                      {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedUrl ? 'Copiado' : 'Copiar'}
                    </button>
                    {webInfo.enabled && (
                      <a
                        href={cleanUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg border border-zinc-700 transition-colors"
                        title="Abrir en tu navegador local"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Connected clients bar */}
          <div className="mt-6 pt-4 border-t border-mc-border/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-zinc-400">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Dispositivos móviles conectados actualmente:</span>
              <strong className="text-white font-mono bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                {webInfo.connectedClients}
              </strong>
            </div>
            <button
              onClick={loadInfo}
              className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1 text-[11px]"
            >
              <RefreshCw className="w-3 h-3" />
              Actualizar
            </button>
          </div>
        </div>

        {/* Right Column: Settings & Security Configuration (5 cols) */}
        <div className="lg:col-span-5 bg-mc-card border border-mc-border rounded-2xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-4 border-b border-mc-border/60">
              <Shield className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-white text-base">Seguridad y Parámetros de Red</h3>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 mt-5">
              {/* Port configuration */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Puerto del Servidor Web (HTTP & WebSocket)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1024"
                    max="65535"
                    value={portInput}
                    onChange={(e) => setPortInput(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none font-mono"
                    placeholder="8080"
                  />
                  <span className="text-xs text-zinc-500 whitespace-nowrap">Predeterminado: 8080</span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Asegúrate de que este puerto no esté en uso por otra aplicación.
                </p>
              </div>

              {/* PIN Code Security */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Código PIN de Acceso Móvil
                </label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    maxLength={16}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-9 pr-20 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none font-mono tracking-wider"
                    placeholder="1234"
                  />
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5 pointer-events-none" />
                  
                  <div className="absolute right-2 top-1.5 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="p-1 text-zinc-400 hover:text-white transition-colors"
                      title={showPin ? 'Ocultar PIN' : 'Mostrar PIN'}
                    >
                      {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(pinInput, 'pin')}
                      className="p-1 text-zinc-400 hover:text-white transition-colors"
                      title="Copiar PIN"
                    >
                      {copiedPin ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Protege tu panel contra accesos no autorizados en tu red local.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-600 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Guardar y Aplicar Cambios
                </button>
              </div>
            </form>
          </div>

          {/* Security alert footnote */}
          <div className="mt-5 p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 text-[11px] text-zinc-400 flex items-start gap-2.5 leading-relaxed">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Solo los dispositivos dentro de tu misma red de área local (LAN) o Wi-Fi tienen acceso. No expone puertos hacia Internet de forma pública salvo que configures Port Forwarding manual.
            </span>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-mc-card border border-mc-border rounded-xl p-5 shadow-sm space-y-2">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Terminal className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-white text-sm">Consola Piped en Vivo</h4>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Los logs y mensajes del servidor de Minecraft se transmiten en tiempo real directamente a tu pantalla móvil vía WebSockets ultrarrápidos.
          </p>
        </div>

        <div className="bg-mc-card border border-mc-border rounded-xl p-5 shadow-sm space-y-2">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Zap className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-white text-sm">Macros y Acciones Inmediatas</h4>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Botones rápidos en la versión web para cambiar la hora a día o noche, despejar la lluvia, guardar el mundo o parar el servidor con un solo toque.
          </p>
        </div>

        <div className="bg-mc-card border border-mc-border rounded-xl p-5 shadow-sm space-y-2">
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Smartphone className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-white text-sm">Diseño Web Responsive 100%</h4>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Optimizado especialmente para pantallas táctiles de iPhone, Android y tablets, con modo oscuro y feedback visual inmediato.
          </p>
        </div>
      </div>
    </div>
  );
}
