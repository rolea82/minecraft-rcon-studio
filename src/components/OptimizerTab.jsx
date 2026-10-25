import React, { useState } from 'react';
import { 
  Sparkles, 
  Cpu, 
  HardDrive, 
  Wifi, 
  ShieldCheck, 
  Copy, 
  Check, 
  Download, 
  FileText, 
  Lightbulb, 
  Terminal, 
  ArrowRight,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { 
  SERVER_PROPERTIES_OPTIMIZER, 
  AIKAR_FLAGS_INFO, 
  generateAikarStartupScript 
} from '../data/optimizerData';

export default function OptimizerTab() {
  const [activeSubTab, setActiveSubTab] = useState('properties'); // 'properties' | 'aikar'
  const [ramGb, setRamGb] = useState(4);
  const [jarName, setJarName] = useState('paper.jar');
  const [targetOs, setTargetOs] = useState('windows');
  const [useGui, setUseGui] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedProperties, setCopiedProperties] = useState(false);

  const startupScript = generateAikarStartupScript({
    ramGb,
    jarName,
    os: targetOs,
    gui: useGui,
  });

  const handleCopyScript = () => {
    navigator.clipboard.writeText(startupScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleDownloadScript = () => {
    const filename = targetOs === 'windows' ? 'run.bat' : 'run.sh';
    const blob = new Blob([startupScript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Generate optimized server.properties snippet
  const generatePropertiesSnippet = () => {
    return `# Archivo server.properties optimizado por Minecraft RCON Studio
# Recomendado para máximo rendimiento y estabilidad en servidores locales
enable-rcon=true
rcon.port=25575
rcon.password=pon_aqui_tu_clave
broadcast-rcon-to-ops=false

${SERVER_PROPERTIES_OPTIMIZER.map((item) => `${item.key}=${item.optimizedValue}`).join('\n')}
`;
  };

  const handleCopyProperties = () => {
    navigator.clipboard.writeText(generatePropertiesSnippet());
    setCopiedProperties(true);
    setTimeout(() => setCopiedProperties(false), 2000);
  };

  const handleDownloadProperties = () => {
    const blob = new Blob([generatePropertiesSnippet()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'server.properties';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-mc-card border border-mc-border p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-white text-base flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            Optimizador de Servidor & Flags de Arranque
          </h3>
          <p className="text-xs text-zinc-400">
            Ajustes contrastados para evitar el lag de CPU, pausas de recolección de basura (GC) y micro-tirones.
          </p>
        </div>

        {/* Sub-tab pills */}
        <div className="flex bg-zinc-900 p-1 rounded-xl border border-mc-border">
          <button
            onClick={() => setActiveSubTab('properties')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'properties'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            server.properties Óptimo
          </button>
          <button
            onClick={() => setActiveSubTab('aikar')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'aikar'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Flags de Java (Aikar's Flags)
          </button>
        </div>
      </div>

      {activeSubTab === 'properties' ? (
        <div className="space-y-6">
          {/* Quick Action Bar to copy/download full config */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-mc-card to-zinc-900 border border-emerald-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                Configuración Recomendada Lista para Usar
              </h4>
              <p className="text-xs text-zinc-400">
                Incluye RCON activado y todos los parámetros optimizados para eliminar tirones.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyProperties}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-medium transition-colors"
              >
                {copiedProperties ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedProperties ? 'Copiado' : 'Copiar Parámetros'}
              </button>
              <button
                onClick={handleDownloadProperties}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar server.properties
              </button>
            </div>
          </div>

          {/* Detailed Parameter Cards with Hints */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SERVER_PROPERTIES_OPTIMIZER.map((item) => (
              <div
                key={item.key}
                className="bg-mc-card border border-mc-border rounded-xl p-4 flex flex-col justify-between hover:border-zinc-700 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="font-semibold text-white text-sm">{item.title}</h4>
                      <code className="text-xs text-emerald-400 font-mono">{item.key}</code>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium whitespace-nowrap">
                      {item.impact}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed mb-3">
                    {item.description}
                  </p>

                  <div className="bg-zinc-900/80 rounded-lg p-2.5 border border-zinc-800 mb-3 space-y-1">
                    <div className="text-[11px] font-semibold text-amber-300 flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      Por qué optimizarlo:
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-normal">
                      {item.hint}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-mc-border/50 flex items-center justify-between text-xs">
                  <span className="text-zinc-500">
                    Defecto: <span className="text-zinc-400 font-mono">{item.defaultValue}</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-400">Recomendado:</span>
                    <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {item.optimizedValue}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Aikar's JVM Flags Subtab */
        <div className="space-y-6">
          <div className="bg-mc-card border border-mc-border rounded-xl p-5 space-y-4">
            <div>
              <h4 className="font-semibold text-white text-base mb-1">{AIKAR_FLAGS_INFO.title}</h4>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {AIKAR_FLAGS_INFO.description}
              </p>
            </div>

            {/* Customizer Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-3 border-t border-mc-border">
              {/* RAM Allocation */}
              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-300 font-medium">Memoria RAM Asignada:</span>
                  <span className="font-bold text-emerald-400 font-mono">{ramGb} GB</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="16"
                  step="1"
                  value={ramGb}
                  onChange={(e) => setRamGb(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-500 bg-zinc-800 rounded-lg cursor-pointer h-2"
                />
                <div className="flex justify-between text-[10px] text-zinc-500">
                  <span>2 GB (Básico)</span>
                  <span>4-6 GB (Recomendado)</span>
                  <span>16 GB (Extremo)</span>
                </div>
              </div>

              {/* Server Jar name */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-300 font-medium">Archivo .jar del Servidor:</label>
                <input
                  type="text"
                  value={jarName}
                  onChange={(e) => setJarName(e.target.value)}
                  placeholder="paper.jar"
                  className="w-full bg-zinc-900 border border-mc-border rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <span className="text-[10px] text-zinc-500">Nombre exacto de tu archivo JAR</span>
              </div>

              {/* OS Choice */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-300 font-medium">Sistema Operativo:</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTargetOs('windows')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      targetOs === 'windows'
                        ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                        : 'bg-zinc-900 border-mc-border text-zinc-400 hover:text-white'
                    }`}
                  >
                    Windows (.bat)
                  </button>
                  <button
                    onClick={() => setTargetOs('linux')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      targetOs === 'linux'
                        ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                        : 'bg-zinc-900 border-mc-border text-zinc-400 hover:text-white'
                    }`}
                  >
                    Linux (.sh)
                  </button>
                </div>
              </div>
            </div>

            {/* Generated Script Code Block */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  Script Generado ({targetOs === 'windows' ? 'run.bat' : 'run.sh'}):
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyScript}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-medium transition-colors"
                  >
                    {copiedScript ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedScript ? 'Copiado' : 'Copiar'}
                  </button>
                  <button
                    onClick={handleDownloadScript}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    Descargar {targetOs === 'windows' ? 'run.bat' : 'run.sh'}
                  </button>
                </div>
              </div>

              <div className="bg-black/90 border border-mc-border rounded-xl p-4 font-mono text-xs text-emerald-300/90 whitespace-pre overflow-x-auto shadow-inner leading-relaxed select-all">
                {startupScript}
              </div>
            </div>
          </div>

          {/* Golden Rules for Minecraft Performance */}
          <div className="bg-mc-card border border-mc-border rounded-xl p-5 space-y-3">
            <h4 className="font-semibold text-white text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Reglas de Oro para un Servidor Local Sin Lag
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {AIKAR_FLAGS_INFO.tips.map((tip, idx) => (
                <div
                  key={idx}
                  className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 flex items-start gap-2.5 text-xs text-zinc-300 leading-relaxed"
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
