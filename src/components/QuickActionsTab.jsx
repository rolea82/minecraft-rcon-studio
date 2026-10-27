import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Save, 
  Trash2, 
  RefreshCw, 
  AlertOctagon, 
  Megaphone, 
  Plus, 
  Check, 
  Skull, 
  Power, 
  ShieldAlert,
  Send,
  Sparkles
} from 'lucide-react';

export default function QuickActionsTab({ onSendCommand, isConnected }) {
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementSub, setAnnouncementSub] = useState('');
  const [customMacros, setCustomMacros] = useState([]);
  const [newMacroName, setNewMacroName] = useState('');
  const [newMacroCmd, setNewMacroCmd] = useState('');
  const [isAddingMacro, setIsAddingMacro] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [showStopConfirm, setShowStopConfirm] = useState(false);

  useEffect(() => {
    async function loadMacros() {
      const defaults = [
        { id: '1', name: 'Dar Manzanas Doradas a Todos', cmd: 'give @a golden_apple 5' },
        { id: '2', name: 'Curar a Todos los Jugadores', cmd: 'effect give @a instant_health 1 255' },
        { id: '3', name: 'Subir Nivel de XP a Todos', cmd: 'xp add @a 5 levels' },
      ];
      if (window.electronAPI?.getSettings) {
        try {
          const s = await window.electronAPI.getSettings();
          if (Array.isArray(s?.customMacros) && s.customMacros.length > 0) {
            setCustomMacros(s.customMacros);
            return;
          }
        } catch (_) {}
      }
      const saved = localStorage.getItem('mcrcon_custom_macros');
      if (saved) {
        try {
          setCustomMacros(JSON.parse(saved));
          return;
        } catch (_) {}
      }
      setCustomMacros(defaults);
    }
    loadMacros();
  }, []);

  const triggerCommand = async (cmd, label = null) => {
    if (!isConnected) return;
    try {
      const res = await onSendCommand(cmd);
      setFeedbackMsg(`✓ ${label || cmd}: Ejecutado`);
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err) {
      setFeedbackMsg(`Error: ${err.message}`);
    }
  };

  const handleBroadcastTitle = async (e) => {
    e.preventDefault();
    if (!announcementText.trim() || !isConnected) return;

    // Send title and subtitle
    await onSendCommand(`title @a times 10 70 20`);
    if (announcementSub.trim()) {
      await onSendCommand(`title @a subtitle {"text":"${announcementSub.trim()}","color":"yellow"}`);
    }
    await onSendCommand(`title @a title {"text":"${announcementText.trim()}","color":"gold","bold":true}`);
    // Also send in chat
    await onSendCommand(`say [AVISO] ${announcementText} ${announcementSub ? '- ' + announcementSub : ''}`);

    setFeedbackMsg('✓ Anuncio enviado a todas las pantallas');
    setTimeout(() => setFeedbackMsg(null), 3000);
    setAnnouncementText('');
    setAnnouncementSub('');
  };

  const handleAddMacro = (e) => {
    e.preventDefault();
    if (!newMacroName.trim() || !newMacroCmd.trim()) return;

    const newMacro = {
      id: Date.now().toString(),
      name: newMacroName.trim(),
      cmd: newMacroCmd.trim().replace(/^\//, ''),
    };

    const updated = [...customMacros, newMacro];
    setCustomMacros(updated);
    if (window.electronAPI?.saveSettings) {
      window.electronAPI.saveSettings({ customMacros: updated });
    }
    localStorage.setItem('mcrcon_custom_macros', JSON.stringify(updated));
    setNewMacroName('');
    setNewMacroCmd('');
    setIsAddingMacro(false);
  };

  const handleDeleteMacro = (id) => {
    const updated = customMacros.filter((m) => m.id !== id);
    setCustomMacros(updated);
    if (window.electronAPI?.saveSettings) {
      window.electronAPI.saveSettings({ customMacros: updated });
    }
    localStorage.setItem('mcrcon_custom_macros', JSON.stringify(updated));
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-mc-card border border-mc-border p-4 rounded-xl flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white text-base flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-400" />
            Acciones Rápidas y Macros del Servidor
          </h3>
          <p className="text-xs text-zinc-400">
            Comandos de mantenimiento indispensables con un solo clic.
          </p>
        </div>

        {feedbackMsg && (
          <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-fade-in flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" /> {feedbackMsg}
          </span>
        )}
      </div>

      {/* Main Essential Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Save-all Flush */}
        <div className="bg-mc-card border border-mc-border hover:border-emerald-500/40 rounded-xl p-5 flex flex-col justify-between transition-all group">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-105 transition-transform">
              <Save className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-white text-sm mb-1">Guardado Forzado en Disco</h4>
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              Guarda inmediatamente todos los chunks y datos de jugadores en el disco duro para evitar pérdidas ante un corte de luz.
            </p>
          </div>
          <button
            disabled={!isConnected}
            onClick={() => triggerCommand('save-all flush', 'Mundo guardado en disco')}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-emerald-950/40 disabled:opacity-40"
          >
            Guardar Todo (save-all)
          </button>
        </div>

        {/* Clear Ground Items */}
        <div className="bg-mc-card border border-mc-border hover:border-amber-500/40 rounded-xl p-5 flex flex-col justify-between transition-all group">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-105 transition-transform">
              <Trash2 className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-white text-sm mb-1">Limpiar Basura del Suelo</h4>
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              Elimina todos los ítems tirados en el suelo (<code className="text-amber-400 font-mono">@e[type=item]</code>). Esencial si una granja de granos o piedra colapsó.
            </p>
          </div>
          <button
            disabled={!isConnected}
            onClick={() => triggerCommand('kill @e[type=item]', 'Ítems del suelo eliminados')}
            className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-amber-950/40 disabled:opacity-40"
          >
            Limpiar Suelo (/kill items)
          </button>
        </div>

        {/* Reload Datapacks */}
        <div className="bg-mc-card border border-mc-border hover:border-blue-500/40 rounded-xl p-5 flex flex-col justify-between transition-all group">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3 group-hover:scale-105 transition-transform">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-white text-sm mb-1">Recargar Datapacks y Recetas</h4>
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              Recarga archivos de funciones, tablas de botín (loot tables) y recetas de datapacks sin tener que reiniciar el servidor.
            </p>
          </div>
          <button
            disabled={!isConnected}
            onClick={() => triggerCommand('reload', 'Datapacks recargados')}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-blue-950/40 disabled:opacity-40"
          >
            Recargar Servidor (/reload)
          </button>
        </div>
      </div>

      {/* Screen Announcement Broadcast (Big Title) */}
      <div className="bg-mc-card border border-mc-border rounded-xl p-5 space-y-4">
        <div className="border-b border-mc-border pb-3">
          <h4 className="font-semibold text-white text-sm flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-emerald-400" />
            Enviar Anuncio Gigante en Pantalla (Título & Chat)
          </h4>
          <p className="text-xs text-zinc-400">
            Muestra un letrero animado en el centro de la pantalla de todos los jugadores conectados.
          </p>
        </div>

        <form onSubmit={handleBroadcastTitle} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-zinc-300 font-medium">Título Principal:</label>
              <input
                type="text"
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder="¡Reiniciando en 5 minutos!"
                required
                className="w-full bg-zinc-900 border border-mc-border rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-300 font-medium">Subtítulo (Opcional):</label>
              <input
                type="text"
                value={announcementSub}
                onChange={(e) => setAnnouncementSub(e.target.value)}
                placeholder="Por favor guarden sus objetos en cofres."
                className="w-full bg-zinc-900 border border-mc-border rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!isConnected || !announcementText.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              Proyectar Anuncio
            </button>
          </div>
        </form>
      </div>

      {/* Custom Macros Section */}
      <div className="bg-mc-card border border-mc-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-mc-border pb-3">
          <div>
            <h4 className="font-semibold text-white text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Tus Botones y Comandos Personalizados
            </h4>
            <p className="text-xs text-zinc-400">
              Guarda tus comandos frecuentes para ejecutarlos con un solo clic.
            </p>
          </div>

          <button
            onClick={() => setIsAddingMacro(!isAddingMacro)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-mc-border text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            {isAddingMacro ? 'Cancelar' : 'Nuevo Botón'}
          </button>
        </div>

        {isAddingMacro && (
          <form onSubmit={handleAddMacro} className="bg-zinc-900/80 p-4 rounded-xl border border-zinc-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-300">Nombre del Botón:</label>
                <input
                  type="text"
                  value={newMacroName}
                  onChange={(e) => setNewMacroName(e.target.value)}
                  placeholder="ej: Dar Diamantes a Todos"
                  required
                  className="w-full bg-zinc-950 border border-mc-border rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-zinc-300">Comando de Consola:</label>
                <input
                  type="text"
                  value={newMacroCmd}
                  onChange={(e) => setNewMacroCmd(e.target.value)}
                  placeholder="ej: give @a diamond 1"
                  required
                  className="w-full bg-zinc-950 border border-mc-border rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                Guardar Botón
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {customMacros.map((macro) => (
            <div
              key={macro.id}
              className="bg-zinc-900/80 border border-mc-border hover:border-zinc-700 rounded-xl p-3 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-white truncate">{macro.name}</span>
                  <button
                    onClick={() => handleDeleteMacro(macro.id)}
                    className="text-zinc-500 hover:text-red-400 transition-colors p-1"
                    title="Eliminar macro"
                  >
                    ×
                  </button>
                </div>
                <code className="text-[11px] text-emerald-400/80 font-mono truncate block mb-3">
                  /{macro.cmd}
                </code>
              </div>

              <button
                disabled={!isConnected}
                onClick={() => triggerCommand(macro.cmd, macro.name)}
                className="w-full py-1.5 rounded-lg bg-zinc-800 hover:bg-emerald-600 text-zinc-200 hover:text-white text-xs font-medium transition-colors disabled:opacity-40"
              >
                Ejecutar
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Safe Server Shutdown Section */}
      <div className="bg-red-950/20 border border-red-500/30 rounded-xl p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
              <Power className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-red-200 text-sm">Apagado Seguro del Servidor (/stop)</h4>
              <p className="text-xs text-zinc-400">
                Guarda los mundos, desaloja a los jugadores de forma ordenada y cierra el proceso sin corromper el mapa.
              </p>
            </div>
          </div>

          {!showStopConfirm ? (
            <button
              disabled={!isConnected}
              onClick={() => setShowStopConfirm(true)}
              className="px-4 py-2 rounded-xl bg-red-700/80 hover:bg-red-600 text-white font-semibold text-xs transition-colors disabled:opacity-40"
            >
              Apagar Servidor
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  setShowStopConfirm(false);
                  await onSendCommand('say [SERVIDOR] El servidor se apagará en 5 segundos...');
                  await onSendCommand('save-all flush');
                  await onSendCommand('stop');
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors animate-pulse"
              >
                ¿Confirmar Apagado?
              </button>
              <button
                onClick={() => setShowStopConfirm(false)}
                className="px-3 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white text-xs"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
