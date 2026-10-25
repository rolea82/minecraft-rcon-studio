import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Shield, 
  ShieldAlert, 
  UserMinus, 
  UserX, 
  Sparkles, 
  RefreshCw, 
  UserPlus, 
  Heart, 
  Eye, 
  Compass, 
  Swords, 
  Check, 
  Lock, 
  Unlock,
  Send,
  MessageSquare
} from 'lucide-react';

export default function PlayersTab({ onSendCommand, isConnected }) {
  const [players, setPlayers] = useState(['Alex', 'Steve']);
  const [targetPlayer, setTargetPlayer] = useState('');
  const [kickReason, setKickReason] = useState('Expulsado por el administrador');
  const [banReason, setBanReason] = useState('Baneado del servidor');
  const [whitelist, setWhitelist] = useState([]);
  const [newWhitelistName, setNewWhitelistName] = useState('');
  const [whitelistEnabled, setWhitelistEnabled] = useState(false);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
  const [whisperMsg, setWhisperMsg] = useState('');

  // Fetch online players
  const fetchPlayers = async () => {
    if (!isConnected) return;
    setIsLoadingPlayers(true);
    try {
      const res = await onSendCommand('list');
      if (res) {
        // e.g.: "There are 2 of 20 players online: Alex, Steve"
        // or "Hay 2 de 20 jugadores conectados:\nAlex, Steve"
        const parts = res.split(':');
        if (parts.length > 1) {
          const namesStr = parts.slice(1).join(':').trim();
          const parsed = namesStr
            .split(',')
            .map((n) => n.trim().replace(/^§[0-9a-fk-or]/gi, ''))
            .filter((n) => n.length > 0 && !n.includes('online') && !n.includes('conectados'));
          setPlayers(parsed);
        }
      }

      // Query whitelist status
      const wlRes = await onSendCommand('whitelist list');
      if (wlRes) {
        const wlParts = wlRes.split(':');
        if (wlParts.length > 1) {
          const wlNames = wlParts.slice(1).join(':').trim().split(',').map((x) => x.trim()).filter(Boolean);
          setWhitelist(wlNames);
        }
      }
    } catch (_) {}
    finally {
      setIsLoadingPlayers(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, [isConnected]);

  const handleAction = async (cmd) => {
    if (!isConnected) return;
    await onSendCommand(cmd);
    setTimeout(fetchPlayers, 600);
  };

  const handleWhitelistToggle = async (enable) => {
    await handleAction(enable ? 'whitelist on' : 'whitelist off');
    setWhitelistEnabled(enable);
  };

  const handleAddWhitelist = async (e) => {
    e.preventDefault();
    if (!newWhitelistName.trim()) return;
    await handleAction(`whitelist add ${newWhitelistName.trim()}`);
    setNewWhitelistName('');
  };

  const handleRemoveWhitelist = async (name) => {
    await handleAction(`whitelist remove ${name}`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Player Search / Direct selection */}
      <div className="bg-mc-card border border-mc-border p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-white text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            Gestión de Jugadores Conectados
          </h3>
          <p className="text-xs text-zinc-400">
            Controla permisos, modos de juego, salud, teletransporte y sanciones de forma visual.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={fetchPlayers}
            disabled={!isConnected || isLoadingPlayers}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPlayers ? 'animate-spin' : ''}`} />
            Actualizar Lista
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Online Players list */}
        <div className="bg-mc-card border border-mc-border rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-white text-xs uppercase tracking-wider text-zinc-400">
              Conectados ({players.length})
            </h4>
            <span className="text-[11px] text-zinc-500">Haz clic para seleccionar</span>
          </div>

          <div className="space-y-2">
            {players.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-xs bg-zinc-900/50 rounded-lg border border-dashed border-zinc-800">
                No hay jugadores conectados en este momento.
              </div>
            ) : (
              players.map((p) => {
                const isSelected = targetPlayer === p;
                return (
                  <button
                    key={p}
                    onClick={() => setTargetPlayer(p)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-950/40'
                        : 'bg-zinc-900/80 border-mc-border text-zinc-300 hover:border-zinc-700 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded bg-emerald-700/40 border border-emerald-600/50 flex items-center justify-center text-xs font-bold text-emerald-300">
                        {p.slice(0, 1).toUpperCase()}
                      </div>
                      <span className="font-mono">{p}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Manual input for player name */}
          <div className="pt-2 border-t border-mc-border/60 space-y-1.5">
            <label className="text-[11px] text-zinc-400">O escribe el nombre de cualquier jugador:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={targetPlayer}
                onChange={(e) => setTargetPlayer(e.target.value)}
                placeholder="Nombre del jugador..."
                className="flex-1 bg-zinc-900 border border-mc-border rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Middle column: Action panel for selected player */}
        <div className="bg-mc-card border border-mc-border rounded-xl p-4 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-mc-border pb-3">
            <div>
              <h4 className="font-semibold text-white text-sm">
                Acciones para:{' '}
                <span className="text-emerald-400 font-mono">
                  {targetPlayer ? targetPlayer : '(Selecciona o escribe un jugador)'}
                </span>
              </h4>
              <p className="text-[11px] text-zinc-400">Aplica comandos en tiempo real sobre el jugador</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Game Modes */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-zinc-300">Cambiar Modo de Juego:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  disabled={!targetPlayer || !isConnected}
                  onClick={() => handleAction(`gamemode survival ${targetPlayer}`)}
                  className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-mc-border text-xs text-zinc-200 transition-colors disabled:opacity-40"
                >
                  ⚔️ Supervivencia
                </button>
                <button
                  disabled={!targetPlayer || !isConnected}
                  onClick={() => handleAction(`gamemode creative ${targetPlayer}`)}
                  className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-mc-border text-xs text-zinc-200 transition-colors disabled:opacity-40"
                >
                  🧱 Creativo
                </button>
                <button
                  disabled={!targetPlayer || !isConnected}
                  onClick={() => handleAction(`gamemode adventure ${targetPlayer}`)}
                  className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-mc-border text-xs text-zinc-200 transition-colors disabled:opacity-40"
                >
                  🗺️ Aventura
                </button>
                <button
                  disabled={!targetPlayer || !isConnected}
                  onClick={() => handleAction(`gamemode spectator ${targetPlayer}`)}
                  className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-mc-border text-xs text-zinc-200 transition-colors disabled:opacity-40"
                >
                  👻 Espectador
                </button>
              </div>
            </div>

            {/* Health & Buffs */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-zinc-300">Salud y Efectos Rápidos:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  disabled={!targetPlayer || !isConnected}
                  onClick={() => {
                    handleAction(`effect give ${targetPlayer} instant_health 1 255`);
                    handleAction(`effect give ${targetPlayer} saturation 1 255`);
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs text-rose-300 transition-colors disabled:opacity-40"
                >
                  <Heart className="w-3.5 h-3.5 text-rose-400" />
                  Curar y Comer
                </button>
                <button
                  disabled={!targetPlayer || !isConnected}
                  onClick={() => handleAction(`effect give ${targetPlayer} night_vision 600 0 true`)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs text-cyan-300 transition-colors disabled:opacity-40"
                >
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  Visión Nocturna
                </button>
                <button
                  disabled={!targetPlayer || !isConnected}
                  onClick={() => handleAction(`effect give ${targetPlayer} speed 300 1 true`)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs text-amber-300 transition-colors disabled:opacity-40"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Velocidad II
                </button>
                <button
                  disabled={!targetPlayer || !isConnected}
                  onClick={() => handleAction(`effect clear ${targetPlayer}`)}
                  className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-mc-border text-xs text-zinc-300 transition-colors disabled:opacity-40"
                >
                  Limpiar Efectos
                </button>
              </div>
            </div>

            {/* Operator Permissions */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-zinc-300">Rango de Operador (Admin):</span>
              <div className="flex gap-2">
                <button
                  disabled={!targetPlayer || !isConnected}
                  onClick={() => handleAction(`op ${targetPlayer}`)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-xs text-emerald-300 transition-colors disabled:opacity-40"
                >
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  Dar Rango OP (Operador)
                </button>
                <button
                  disabled={!targetPlayer || !isConnected}
                  onClick={() => handleAction(`deop ${targetPlayer}`)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-mc-border text-xs text-zinc-300 transition-colors disabled:opacity-40"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-zinc-500" />
                  Quitar OP (Usuario normal)
                </button>
              </div>
            </div>

            {/* Whisper private message */}
            <div className="space-y-1.5 pt-2 border-t border-mc-border/50">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                Enviar Mensaje Privado (Whisper /tell):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={whisperMsg}
                  onChange={(e) => setWhisperMsg(e.target.value)}
                  placeholder="Mensaje privado al jugador..."
                  disabled={!targetPlayer || !isConnected}
                  className="flex-1 bg-zinc-900 border border-mc-border rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 disabled:opacity-40"
                />
                <button
                  disabled={!targetPlayer || !isConnected || !whisperMsg.trim()}
                  onClick={() => {
                    handleAction(`tell ${targetPlayer} [Consola]: ${whisperMsg}`);
                    setWhisperMsg('');
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-40 flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  Enviar
                </button>
              </div>
            </div>

            {/* Moderation Actions (Kick / Ban) */}
            <div className="pt-2 border-t border-mc-border/50 space-y-2">
              <span className="text-xs font-semibold text-red-400 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                Sanciones y Moderación:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 space-y-2">
                  <div className="text-xs text-red-300 font-medium">Expulsar del Servidor (Kick)</div>
                  <input
                    type="text"
                    value={kickReason}
                    onChange={(e) => setKickReason(e.target.value)}
                    placeholder="Motivo de expulsión..."
                    className="w-full bg-zinc-900 border border-mc-border rounded-lg px-2.5 py-1 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                  />
                  <button
                    disabled={!targetPlayer || !isConnected}
                    onClick={() => handleAction(`kick ${targetPlayer} ${kickReason}`)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-600/30 hover:bg-red-600/50 text-red-200 border border-red-500/40 text-xs font-medium transition-colors disabled:opacity-40"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                    Expulsar
                  </button>
                </div>

                <div className="bg-red-950/20 border border-red-500/30 rounded-xl p-3 space-y-2">
                  <div className="text-xs text-red-300 font-medium">Banear Permanente (Ban)</div>
                  <input
                    type="text"
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="Motivo del ban..."
                    className="w-full bg-zinc-900 border border-mc-border rounded-lg px-2.5 py-1 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                  />
                  <button
                    disabled={!targetPlayer || !isConnected}
                    onClick={() => handleAction(`ban ${targetPlayer} ${banReason}`)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-white text-xs font-medium transition-colors disabled:opacity-40 shadow"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    Banear Jugador
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Whitelist Manager Section */}
      <div className="bg-mc-card border border-mc-border rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-mc-border pb-3">
          <div>
            <h3 className="font-semibold text-white text-base flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              Gestor de Lista Blanca (Whitelist)
            </h3>
            <p className="text-xs text-zinc-400">
              Permite únicamente el acceso al servidor a los usuarios que estén en esta lista.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={!isConnected}
              onClick={() => handleWhitelistToggle(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-colors disabled:opacity-40"
            >
              Activar Whitelist
            </button>
            <button
              disabled={!isConnected}
              onClick={() => handleWhitelistToggle(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors disabled:opacity-40"
            >
              Desactivar Whitelist
            </button>
            <button
              disabled={!isConnected}
              onClick={() => handleAction('whitelist reload')}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white bg-zinc-800 transition-colors disabled:opacity-40"
              title="Recargar archivo whitelist.json"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Add to whitelist form */}
        <form onSubmit={handleAddWhitelist} className="flex gap-2 max-w-md">
          <input
            type="text"
            value={newWhitelistName}
            onChange={(e) => setNewWhitelistName(e.target.value)}
            placeholder="Añadir jugador a la lista blanca..."
            disabled={!isConnected}
            className="flex-1 bg-zinc-900 border border-mc-border rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={!isConnected || !newWhitelistName.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors disabled:opacity-40"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Añadir
          </button>
        </form>

        {/* Whitelisted badges */}
        <div className="space-y-1.5">
          <span className="text-xs text-zinc-400 font-medium">Jugadores autorizados en la lista:</span>
          <div className="flex flex-wrap gap-2 pt-1">
            {whitelist.length === 0 ? (
              <span className="text-xs text-zinc-500 italic">No hay jugadores o la lista no se ha sincronizado aún.</span>
            ) : (
              whitelist.map((name) => (
                <div
                  key={name}
                  className="flex items-center gap-2 px-3 py-1 rounded-lg bg-zinc-900 border border-mc-border text-xs text-zinc-200 font-mono group"
                >
                  <span>{name}</span>
                  <button
                    onClick={() => handleRemoveWhitelist(name)}
                    disabled={!isConnected}
                    className="text-zinc-500 hover:text-red-400 transition-colors"
                    title="Eliminar de la lista blanca"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
