import React, { useState, useEffect } from 'react';
import { 
  Search, 
  RotateCcw, 
  RefreshCw, 
  Check, 
  Zap, 
  AlertCircle, 
  Lightbulb, 
  Sparkles,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { GAMERULES_DATA, GAMERULES_CATEGORIES } from '../data/gamerulesData';

export default function GamerulesTab({ onSendCommand, isConnected }) {
  const [rulesValues, setRulesValues] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOnlyPerformance, setFilterOnlyPerformance] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastUpdatedRule, setLastUpdatedRule] = useState(null);

  // Initialize defaults
  useEffect(() => {
    const initial = {};
    GAMERULES_DATA.forEach((r) => {
      initial[r.id] = r.default;
    });
    setRulesValues(initial);
  }, []);

  // Sync rules from server via RCON
  const syncWithServer = async () => {
    if (!isConnected) return;
    setIsSyncing(true);

    try {
      // Query common rules
      for (const rule of GAMERULES_DATA) {
        try {
          const res = await onSendCommand(`gamerule ${rule.id}`);
          if (res) {
            // Server responds like: "Gamerule keepInventory is currently set to: false" or "La regla de juego..."
            const lower = res.toLowerCase();
            if (rule.type === 'boolean') {
              if (lower.includes('true') || lower.includes('verdadero')) {
                setRulesValues((prev) => ({ ...prev, [rule.id]: true }));
              } else if (lower.includes('false') || lower.includes('falso')) {
                setRulesValues((prev) => ({ ...prev, [rule.id]: false }));
              }
            } else if (rule.type === 'number') {
              const match = res.match(/:?\s*(\d+)/);
              if (match && match[1]) {
                setRulesValues((prev) => ({ ...prev, [rule.id]: parseInt(match[1], 10) }));
              }
            }
          }
        } catch (_) {}
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateRule = async (rule, newValue) => {
    setRulesValues((prev) => ({ ...prev, [rule.id]: newValue }));
    setLastUpdatedRule(rule.id);
    setTimeout(() => setLastUpdatedRule(null), 2500);

    if (isConnected) {
      const valStr = typeof newValue === 'boolean' ? (newValue ? 'true' : 'false') : String(newValue);
      await onSendCommand(`gamerule ${rule.id} ${valStr}`);
    }
  };

  // Filter rules
  const filteredRules = GAMERULES_DATA.filter((rule) => {
    if (selectedCategory !== 'all' && rule.category !== selectedCategory) return false;
    if (filterOnlyPerformance && rule.perfImpact === 'none') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = rule.name.toLowerCase().includes(q);
      const matchId = rule.id.toLowerCase().includes(q);
      const matchDesc = rule.description.toLowerCase().includes(q);
      return matchName || matchId || matchDesc;
    }
    return true;
  });

  return (
    <div className="space-y-4 pb-8">
      {/* Top Controls */}
      <div className="bg-mc-card border border-mc-border p-4 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar regla (ej: keepInventory, ticks)..."
              className="w-full bg-zinc-900 border border-mc-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setFilterOnlyPerformance(!filterOnlyPerformance)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                filterOnlyPerformance
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-zinc-900 text-zinc-400 border-mc-border hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Solo Impacto de Rendimiento
            </button>

            <button
              onClick={syncWithServer}
              disabled={!isConnected || isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-colors disabled:opacity-40"
              title="Consultar valores actuales en el servidor"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar del Servidor'}
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
          {GAMERULES_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-mc-border'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRules.map((rule) => {
          const currentValue = rulesValues[rule.id] ?? rule.default;
          const isRecentlyUpdated = lastUpdatedRule === rule.id;

          return (
            <div
              key={rule.id}
              className={`bg-mc-card border rounded-xl p-4 flex flex-col justify-between transition-all ${
                isRecentlyUpdated
                  ? 'border-emerald-500 ring-1 ring-emerald-500 bg-emerald-950/10'
                  : 'border-mc-border hover:border-zinc-700'
              }`}
            >
              <div>
                {/* Header of Rule Card */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-white text-sm">{rule.name}</h4>
                      {isRecentlyUpdated && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded animate-pulse">
                          <Check className="w-3 h-3" /> Aplicado
                        </span>
                      )}
                    </div>
                    <code className="text-[11px] text-emerald-400 font-mono">
                      /gamerule {rule.id}
                    </code>
                  </div>

                  {/* Impact badge */}
                  {rule.perfImpact === 'high' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-medium whitespace-nowrap flex items-center gap-1">
                      <Zap className="w-2.5 h-2.5" /> Alto Impacto CPU
                    </span>
                  )}
                  {rule.perfImpact === 'medium' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium whitespace-nowrap">
                      Impacto Medio
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-zinc-300 leading-relaxed mb-3">
                  {rule.description}
                </p>

                {/* Hint Box with Recommendation */}
                <div className="bg-zinc-900/80 rounded-lg p-2.5 border border-zinc-800 mb-3 space-y-1">
                  <div className="text-[11px] font-semibold text-amber-300 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    Consejo de Optimización:
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-normal">
                    {rule.hint}
                  </p>
                  <div className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-800/60 flex items-center justify-between">
                    <span>Recomendado: <strong className="text-zinc-300">{rule.recommendation}</strong></span>
                    <span>Defecto: <strong className="text-zinc-400">{String(rule.default)}</strong></span>
                  </div>
                </div>
              </div>

              {/* Controls Footer */}
              <div className="pt-2 border-t border-mc-border/50 flex items-center justify-between">
                <span className="text-xs text-zinc-400">
                  Valor: <strong className="text-white font-mono">{String(currentValue)}</strong>
                </span>

                {rule.type === 'boolean' ? (
                  <button
                    onClick={() => handleUpdateRule(rule, !currentValue)}
                    className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      currentValue ? 'bg-emerald-600' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        currentValue ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={rule.min ?? 0}
                      max={rule.max ?? 1000}
                      value={currentValue}
                      onChange={(e) => handleUpdateRule(rule, parseInt(e.target.value) || 0)}
                      className="w-20 bg-zinc-900 border border-mc-border rounded-lg px-2.5 py-1 text-xs text-white text-center font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={() => handleUpdateRule(rule, rule.default)}
                      className="p-1 text-zinc-500 hover:text-zinc-300 rounded hover:bg-zinc-800 transition-colors"
                      title="Restablecer valor por defecto"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredRules.length === 0 && (
        <div className="text-center py-12 bg-mc-card border border-mc-border rounded-xl">
          <p className="text-zinc-400 text-sm">No se encontraron reglas con ese filtro.</p>
        </div>
      )}
    </div>
  );
}
