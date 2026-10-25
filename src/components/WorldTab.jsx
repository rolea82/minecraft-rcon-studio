import React, { useState } from 'react';
import { 
  Sun, 
  Moon, 
  Sunrise, 
  Sunset, 
  CloudRain, 
  CloudLightning, 
  ShieldCheck, 
  Eye, 
  Cpu, 
  Compass, 
  Globe2, 
  Play, 
  Pause,
  AlertCircle,
  Lightbulb
} from 'lucide-react';

export default function WorldTab({ onSendCommand, isConnected }) {
  const [timeValue, setTimeValue] = useState(6000);
  const [viewDistance, setViewDistance] = useState(8);
  const [simDistance, setSimDistance] = useState(5);
  const [worldBorderSize, setWorldBorderSize] = useState(10000);
  const [isDaylightFrozen, setIsDaylightFrozen] = useState(false);
  const [isWeatherFrozen, setIsWeatherFrozen] = useState(false);

  const timePresets = [
    { label: 'Amanecer', ticks: 1000, icon: Sunrise, cmd: 'time set day', timeStr: '07:00 AM' },
    { label: 'Mediodía', ticks: 6000, icon: Sun, cmd: 'time set noon', timeStr: '12:00 PM' },
    { label: 'Atardecer', ticks: 12000, icon: Sunset, cmd: 'time set 12000', timeStr: '06:00 PM' },
    { label: 'Medianoche', ticks: 18000, icon: Moon, cmd: 'time set midnight', timeStr: '12:00 AM' },
  ];

  const weatherPresets = [
    { label: 'Despejado', icon: Sun, cmd: 'weather clear', desc: 'Cielo soleado sin lluvia' },
    { label: 'Lluvia', icon: CloudRain, cmd: 'weather rain', desc: 'Precipitación y cielos nublados' },
    { label: 'Tormenta', icon: CloudLightning, cmd: 'weather thunder', desc: 'Relámpagos y truenos' },
  ];

  const difficulties = [
    { id: 'peaceful', label: 'Pacífico', desc: 'Sin monstruos hostiles, regeneración instantánea' },
    { id: 'easy', label: 'Fácil', desc: 'Monstruos causan poco daño' },
    { id: 'normal', label: 'Normal', desc: 'Equilibrio estándar de supervivencia' },
    { id: 'hard', label: 'Difícil', desc: 'Monstruos infligen alto daño y el hambre puede matar' },
  ];

  const handleCommand = async (cmd) => {
    if (!isConnected) return;
    await onSendCommand(cmd);
  };

  const handleTimeSliderChange = async (e) => {
    const val = parseInt(e.target.value, 10);
    setTimeValue(val);
    await handleCommand(`time set ${val}`);
  };

  const toggleDaylightCycle = async () => {
    const next = !isDaylightFrozen;
    setIsDaylightFrozen(next);
    await handleCommand(`gamerule doDaylightCycle ${next ? 'false' : 'true'}`);
  };

  const toggleWeatherCycle = async () => {
    const next = !isWeatherFrozen;
    setIsWeatherFrozen(next);
    await handleCommand(`gamerule doWeatherCycle ${next ? 'false' : 'true'}`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-mc-card border border-mc-border p-4 rounded-xl flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white text-base flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-emerald-400" />
            Control de Mundo, Clima y Dificultad
          </h3>
          <p className="text-xs text-zinc-400">
            Ajusta el paso del tiempo, condiciones climáticas y distancias de renderizado en vivo.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Time Card */}
        <div className="bg-mc-card border border-mc-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-mc-border pb-3">
            <div>
              <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-400" />
                Hora del Mundo
              </h4>
              <span className="text-[11px] text-zinc-400">Ciclo solar de 24.000 ticks</span>
            </div>
            <button
              onClick={toggleDaylightCycle}
              disabled={!isConnected}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                isDaylightFrozen
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-zinc-900 text-zinc-400 border-mc-border hover:text-white'
              }`}
            >
              {isDaylightFrozen ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3" />}
              {isDaylightFrozen ? 'Hora Pausada' : 'Pausar Ciclo'}
            </button>
          </div>

          {/* Time Presets */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {timePresets.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.label}
                  disabled={!isConnected}
                  onClick={() => {
                    setTimeValue(t.ticks);
                    handleCommand(t.cmd);
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-mc-border hover:border-emerald-500/40 transition-all text-center group disabled:opacity-40"
                >
                  <Icon className="w-5 h-5 text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold text-zinc-200">{t.label}</span>
                  <span className="text-[10px] text-zinc-500">{t.timeStr}</span>
                </button>
              );
            })}
          </div>

          {/* Time Slider */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Deslizador Manual:</span>
              <span className="font-mono text-emerald-400">{timeValue} ticks</span>
            </div>
            <input
              type="range"
              min="0"
              max="24000"
              step="500"
              value={timeValue}
              onChange={handleTimeSliderChange}
              disabled={!isConnected}
              className="w-full accent-emerald-500 bg-zinc-800 rounded-lg cursor-pointer h-2"
            />
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>0 (Amanecer)</span>
              <span>6000 (Mediodía)</span>
              <span>12000 (Ocaso)</span>
              <span>18000 (Noche)</span>
            </div>
          </div>
        </div>

        {/* Weather Card */}
        <div className="bg-mc-card border border-mc-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-mc-border pb-3">
            <div>
              <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                <CloudRain className="w-4 h-4 text-cyan-400" />
                Clima y Atmósfera
              </h4>
              <span className="text-[11px] text-zinc-400">Control de precipitaciones y tormentas</span>
            </div>
            <button
              onClick={toggleWeatherCycle}
              disabled={!isConnected}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                isWeatherFrozen
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-zinc-900 text-zinc-400 border-mc-border hover:text-white'
              }`}
            >
              {isWeatherFrozen ? <Pause className="w-3 h-3 text-cyan-400" /> : <Play className="w-3 h-3" />}
              {isWeatherFrozen ? 'Clima Fijo' : 'Fijar Clima'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {weatherPresets.map((w) => {
              const Icon = w.icon;
              return (
                <button
                  key={w.label}
                  disabled={!isConnected}
                  onClick={() => handleCommand(w.cmd)}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-mc-border hover:border-cyan-500/40 transition-all text-center group disabled:opacity-40"
                >
                  <Icon className="w-6 h-6 text-cyan-400 mb-1.5 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold text-zinc-200">{w.label}</span>
                  <span className="text-[10px] text-zinc-500 leading-tight mt-1">{w.desc}</span>
                </button>
              );
            })}
          </div>

          <div className="bg-zinc-900/60 rounded-xl p-3 border border-zinc-800 text-[11px] text-zinc-400 flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p>
              En equipos locales de gama media o baja, las partículas de lluvia pueden reducir significativamente los FPS del cliente. Fijar el clima en <strong>Despejado</strong> mantiene la máxima fluidez gráfica.
            </p>
          </div>
        </div>
      </div>

      {/* Difficulty & Distances */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Difficulty */}
        <div className="bg-mc-card border border-mc-border rounded-xl p-5 space-y-4">
          <div className="border-b border-mc-border pb-3">
            <h4 className="font-semibold text-white text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Dificultad de la Partida
            </h4>
            <span className="text-[11px] text-zinc-400">Modifica la agresividad y daño de los monstruos</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {difficulties.map((d) => (
              <button
                key={d.id}
                disabled={!isConnected}
                onClick={() => handleCommand(`difficulty ${d.id}`)}
                className="p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-mc-border hover:border-emerald-500/40 transition-all text-left group disabled:opacity-40"
              >
                <div className="text-xs font-semibold text-zinc-200 group-hover:text-emerald-400 transition-colors">
                  {d.label}
                </div>
                <div className="text-[10px] text-zinc-500 leading-tight mt-1">
                  {d.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Distances (Lag Optimizer in live game) */}
        <div className="bg-mc-card border border-mc-border rounded-xl p-5 space-y-4">
          <div className="border-b border-mc-border pb-3">
            <h4 className="font-semibold text-white text-sm flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              Distancias Dinámicas (Rendimiento en Vivo)
            </h4>
            <span className="text-[11px] text-zinc-400">Ajusta la carga de chunks sin reiniciar el servidor</span>
          </div>

          {/* View distance */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-blue-400" /> Distancia de Visión (Render):
              </span>
              <span className="font-mono text-emerald-400 font-semibold">{viewDistance} chunks</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="4"
                max="16"
                value={viewDistance}
                onChange={(e) => setViewDistance(parseInt(e.target.value, 10))}
                className="flex-1 accent-emerald-500 bg-zinc-800 rounded-lg cursor-pointer h-2"
              />
              <button
                disabled={!isConnected}
                onClick={() => handleCommand(`setviewdistance ${viewDistance}`)}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
              >
                Aplicar
              </button>
            </div>
            <p className="text-[10px] text-zinc-500">Recomendado: 8 chunks para servidores locales ligeros.</p>
          </div>

          {/* Simulation distance */}
          <div className="space-y-1.5 pt-2 border-t border-mc-border/50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-amber-400" /> Distancia de Simulación (Ticks de IA):
              </span>
              <span className="font-mono text-amber-400 font-semibold">{simDistance} chunks</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="3"
                max="12"
                value={simDistance}
                onChange={(e) => setSimDistance(parseInt(e.target.value, 10))}
                className="flex-1 accent-amber-500 bg-zinc-800 rounded-lg cursor-pointer h-2"
              />
              <button
                disabled={!isConnected}
                onClick={() => handleCommand(`simulation-distance ${simDistance}`)}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
              >
                Aplicar
              </button>
            </div>
            <p className="text-[10px] text-zinc-500">Recomendado: 4-6 chunks. El mayor alivio de CPU en Minecraft.</p>
          </div>
        </div>
      </div>

      {/* World Border Controls */}
      <div className="bg-mc-card border border-mc-border rounded-xl p-5 space-y-4">
        <div className="border-b border-mc-border pb-3">
          <h4 className="font-semibold text-white text-sm flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-400" />
            Borde del Mundo (World Border)
          </h4>
          <p className="text-xs text-zinc-400">
            Limita el área explorable para evitar que los jugadores generen millones de chunks innecesarios que saturan el disco duro.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400">Diámetro en bloques:</label>
            <input
              type="number"
              value={worldBorderSize}
              onChange={(e) => setWorldBorderSize(parseInt(e.target.value) || 5000)}
              className="w-full bg-zinc-900 border border-mc-border rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-end">
            <button
              disabled={!isConnected}
              onClick={() => handleCommand(`worldborder set ${worldBorderSize}`)}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"
            >
              Establecer Borde ({worldBorderSize}m)
            </button>
          </div>

          <div className="flex items-end">
            <button
              disabled={!isConnected}
              onClick={() => handleCommand('worldborder center ~ ~')}
              className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 border border-mc-border text-zinc-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
            >
              Centrar Borde en mi posición
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
