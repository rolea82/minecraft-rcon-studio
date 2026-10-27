import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Server, 
  Archive, 
  Smartphone, 
  Terminal, 
  Power, 
  ShieldCheck, 
  Check 
} from 'lucide-react';

export default function WelcomeModal({ isOpen, onClose }) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const handleClose = async () => {
    if (dontShowAgain) {
      try {
        if (window.electronAPI?.saveSettings) {
          await window.electronAPI.saveSettings({ hideWelcome: true });
        }
        localStorage.setItem('mcrcon_hide_welcome', 'true');
      } catch (_) {}
    }
    onClose();
  };

  const highlights = [
    {
      icon: Server,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      title: 'Gestor y Descarga de Servidores Oficiales',
      desc: 'Descarga cualquier versión de Minecraft de Mojang, con RCON preconfigurado, EULA aceptado y puertos autoincrementados en un solo clic.'
    },
    {
      icon: Archive,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      title: 'Backups en Caliente y Restauración Inteligente',
      desc: 'Crea copias de seguridad en archivos .zip estándar compatibles con Windows sin bloqueos de archivos. Restaura siempre como un servidor nuevo con puertos libres.'
    },
    {
      icon: Smartphone,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      title: 'Control Remoto Web y Móvil Seguro',
      desc: 'Conéctate desde tu teléfono, tablet u otro PC mediante código QR y WebSocket seguro con PIN encriptado (sin claves en la URL).'
    },
    {
      icon: Terminal,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      title: 'Consola en Vivo y Control de Jugadores',
      desc: 'Consola interactiva en tiempo real, gestión de inventario, vida, teletransporte, lista blanca y expulsiones con un clic.'
    },
    {
      icon: Power,
      color: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
      title: 'Arranque con Windows y Bandeja del Sistema',
      desc: 'Inicia silenciosamente junto al reloj al arrancar tu ordenador para mantener tus servidores bajo control en segundo plano.'
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-fadeIn select-none flex items-center justify-center">
      <div className="bg-mc-card border border-emerald-500/40 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-mc-border bg-gradient-to-r from-emerald-950/50 via-zinc-900 to-zinc-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md shadow-emerald-950/40">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Bienvenido a Minecraft RCON Studio</h3>
              <p className="text-xs text-zinc-400">Guía rápida de las mejores funciones disponibles</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="space-y-3">
            {highlights.map((h, i) => {
              const Icon = h.icon;
              return (
                <div 
                  key={i} 
                  className="p-3.5 rounded-2xl bg-zinc-900/60 border border-mc-border hover:border-zinc-700 transition-colors flex items-start gap-3.5"
                >
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${h.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <h4 className="text-xs font-bold text-zinc-200">{h.title}</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">{h.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-mc-border bg-zinc-900/40 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300 hover:text-white transition-colors self-start sm:self-auto">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
            />
            <span>No volver a mostrar esta ventana al iniciar</span>
          </label>

          <button
            type="button"
            onClick={handleClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            ¡Empezar a Usar!
          </button>
        </div>
      </div>
    </div>
  );
}
