import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  Layers, 
  Power, 
  HelpCircle, 
  Check, 
  ExternalLink,
  Minimize2,
  HardDrive
} from 'lucide-react';

export default function SettingsModal({ isOpen, onClose }) {
  const [closeAction, setCloseAction] = useState('ask'); // 'ask' | 'minimize' | 'quit'
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen && window.electronAPI?.getSettings) {
      window.electronAPI.getSettings().then((s) => {
        if (s?.closeAction) setCloseAction(s.closeAction);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveAction = async (val) => {
    setCloseAction(val);
    if (window.electronAPI?.saveSettings) {
      await window.electronAPI.saveSettings({ closeAction: val });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const handleMinimizeToTray = () => {
    if (window.electronAPI?.minimizeToTray) {
      window.electronAPI.minimizeToTray();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-mc-card border border-mc-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-mc-border bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Configuración de la Aplicación</h3>
              <p className="text-[11px] text-zinc-400">Bandeja del sistema y comportamiento de cierre</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Section: Comportamiento al Cerrar */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-zinc-200 flex items-center justify-between">
              <span>Al pulsar el botón cerrar (X):</span>
              {isSaved && (
                <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 animate-fade-in">
                  <Check className="w-3 h-3" /> Guardado
                </span>
              )}
            </label>

            <div className="space-y-2">
              <label 
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  closeAction === 'ask' 
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200' 
                    : 'bg-zinc-900/60 border-mc-border text-zinc-300 hover:border-zinc-700'
                }`}
              >
                <input
                  type="radio"
                  name="closeAction"
                  value="ask"
                  checked={closeAction === 'ask'}
                  onChange={() => handleSaveAction('ask')}
                  className="w-4 h-4 mt-0.5 accent-emerald-500 cursor-pointer"
                />
                <div>
                  <div className="text-xs font-semibold">Preguntar siempre (Recomendado)</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Muestra un diálogo de confirmación para elegir si deseas minimizar a la bandeja o cerrar por completo.
                  </div>
                </div>
              </label>

              <label 
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  closeAction === 'minimize' 
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200' 
                    : 'bg-zinc-900/60 border-mc-border text-zinc-300 hover:border-zinc-700'
                }`}
              >
                <input
                  type="radio"
                  name="closeAction"
                  value="minimize"
                  checked={closeAction === 'minimize'}
                  onChange={() => handleSaveAction('minimize')}
                  className="w-4 h-4 mt-0.5 accent-emerald-500 cursor-pointer"
                />
                <div>
                  <div className="text-xs font-semibold">Minimizar a la bandeja del sistema</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Oculta la ventana y la envía al área de notificaciones (junto al reloj). Los servidores siguen funcionando.
                  </div>
                </div>
              </label>

              <label 
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  closeAction === 'quit' 
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200' 
                    : 'bg-zinc-900/60 border-mc-border text-zinc-300 hover:border-zinc-700'
                }`}
              >
                <input
                  type="radio"
                  name="closeAction"
                  value="quit"
                  checked={closeAction === 'quit'}
                  onChange={() => handleSaveAction('quit')}
                  className="w-4 h-4 mt-0.5 accent-emerald-500 cursor-pointer"
                />
                <div>
                  <div className="text-xs font-semibold">Cerrar aplicación completamente</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Apaga de forma segura cualquier servidor activo y sale de la aplicación.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Tray Quick Action */}
          <div className="pt-2 border-t border-mc-border flex items-center justify-between">
            <button
              type="button"
              onClick={handleMinimizeToTray}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all border border-zinc-700 shadow-sm"
              title="Minimizar ahora mismo a la bandeja del sistema"
            >
              <Minimize2 className="w-3.5 h-3.5 text-emerald-400" />
              Minimizar a la Bandeja ahora
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
