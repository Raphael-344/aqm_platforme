'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { aqiColor, aqiLabel } from '@/lib/utils';

interface Ville {
  id: number;
  nom: string;
  lat: number;
  lng: number;
  population: number | null;
  pays_nom: string;
  pays_code: string;
  drapeau: string;
  dispositif_id: number | null;
  aqi: number | null;
}

function SparkBar({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {values.map((v, i) => (
        <div key={i} className="flex-1 rounded-t"
          style={{ height: `${(v / max) * 100}%`, background: aqiColor(v), opacity: 0.7 + i * 0.04 }} />
      ))}
    </div>
  );
}

function VilleCard({
  ville,
  isSelected,
  sparkData,
  sparkLoading,
  onSelect,
}: {
  ville: Ville;
  isSelected: boolean;
  sparkData: number[] | null;
  sparkLoading: boolean;
  onSelect: () => void;
}) {
  const aqi = ville.aqi ?? 0;
  const color = aqiColor(aqi);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onSelect}
      className="glass glass-hover p-5 rounded-2xl cursor-pointer"
      style={isSelected ? {
        border: '1px solid rgba(0,245,212,0.35)',
        boxShadow: '0 0 20px rgba(0,245,212,0.08)',
      } : undefined}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{ville.drapeau}</span>
            <h3 className="font-bold text-base">{ville.nom}</h3>
          </div>
          <div className="text-xs opacity-50 mt-0.5">{ville.pays_nom}</div>
        </div>
        {aqi > 0 && (
          <div className="px-2.5 py-1 rounded-xl text-xs font-bold font-mono"
            style={{ background: `${color}18`, border: `1px solid ${color}40`, color }}>
            AQI {aqi}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="text-center p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="text-xs opacity-40 mb-0.5">Lat</div>
          <div className="text-xs font-mono">{ville.lat.toFixed(3)}</div>
        </div>
        <div className="text-center p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="text-xs opacity-40 mb-0.5">Lng</div>
          <div className="text-xs font-mono">{ville.lng.toFixed(3)}</div>
        </div>
        <div className="text-center p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="text-xs opacity-40 mb-0.5">Pop.</div>
          <div className="text-xs font-mono">
            {ville.population ? (ville.population > 1000000
              ? `${(ville.population / 1000000).toFixed(1)}M`
              : `${Math.round(ville.population / 1000)}k`) : '—'}
          </div>
        </div>
      </div>

      <div>
        <div className="text-xs opacity-30 mb-1.5 font-mono">AQI — 7 derniers jours</div>
        {isSelected && sparkLoading ? (
          <div className="h-8 rounded animate-pulse" style={{ background: 'rgba(0,245,212,0.08)' }} />
        ) : isSelected && sparkData !== null ? (
          <SparkBar values={sparkData} />
        ) : (
          <div className="h-8 flex items-center justify-center text-xs opacity-20 font-mono select-none">
            {ville.dispositif_id ? 'cliquer pour afficher' : 'pas de capteur'}
          </div>
        )}
      </div>

      {aqi > 0 && (
        <div className="mt-3 text-xs" style={{ color: `${color}aa` }}>
          {aqiLabel(aqi)}
        </div>
      )}
    </motion.div>
  );
}

export default function RecherchePage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Ville[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Sparkline state — only updated on explicit card click, never on keystroke
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sparkData, setSparkData] = useState<number[] | null>(null);
  const [sparkLoading, setSparkLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      setSelectedId(null);
      setSparkData(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/recherche?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
      setSearched(true);
      // Clear selection when results change
      setSelectedId(null);
      setSparkData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  const handleSelectVille = async (ville: Ville) => {
    if (!ville.dispositif_id) return;

    // Toggle deselect
    if (selectedId === ville.id) {
      setSelectedId(null);
      setSparkData(null);
      return;
    }

    setSelectedId(ville.id);
    setSparkData(null);
    setSparkLoading(true);
    try {
      const res = await fetch(`/api/graphiques?type=ville&dispositif_id=${ville.dispositif_id}`);
      const data = await res.json();
      const pts: { date: string; aqi_moy: number }[] = data.data ?? [];
      const vals = pts.slice(-7).map(p => p.aqi_moy);
      setSparkData(vals.length > 0 ? vals : null);
    } catch {
      setSparkData(null);
    } finally {
      setSparkLoading(false);
    }
  };

  const popular = [
    { nom: 'Paris', drapeau: '🇫🇷' }, { nom: 'Berlin', drapeau: '🇩🇪' },
    { nom: 'Madrid', drapeau: '🇪🇸' }, { nom: 'Rome', drapeau: '🇮🇹' },
    { nom: 'Sofia', drapeau: '🇧🇬' }, { nom: 'Varsovie', drapeau: '🇵🇱' },
    { nom: 'Amsterdam', drapeau: '🇳🇱' }, { nom: 'Bruxelles', drapeau: '🇧🇪' },
  ];

  return (
    <div className="min-h-screen bg-grid px-6 py-8 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-orbitron text-3xl font-black gradient-text mb-2">⊕ RECHERCHE</h1>
        <p className="text-sm opacity-50">Trouvez une commune dans la zone euro</p>
      </motion.div>

      {/* Search bar */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40 text-lg">⊕</div>
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher une ville, une commune..."
            className="w-full pl-12 pr-5 py-4 rounded-2xl text-base outline-none transition-all"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${query.length >= 2 ? 'rgba(0,245,212,0.35)' : 'rgba(0,245,212,0.15)'}`,
              color: 'white',
              boxShadow: query.length >= 2 ? '0 0 20px rgba(0,245,212,0.1)' : 'none',
            }} />
          {loading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 rounded-full border-2 animate-spin"
                style={{ borderColor: '#00f5d4', borderTopColor: 'transparent' }} />
            </div>
          )}
        </div>

        {/* Quick searches */}
        {!query && (
          <div className="mt-4">
            <div className="text-xs opacity-40 mb-2 text-center">Capitales populaires</div>
            <div className="flex flex-wrap gap-2 justify-center">
              {popular.map(p => (
                <button key={p.nom} onClick={() => setQuery(p.nom)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,245,212,0.1)', color: 'rgba(255,255,255,0.7)' }}>
                  <span>{p.drapeau}</span>
                  <span>{p.nom}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {results.length > 0 && (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="text-sm opacity-50 mb-4 text-center">
              {results.length} résultat{results.length > 1 ? 's' : ''} pour « {query} »
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map(v => (
                <VilleCard
                  key={v.id}
                  ville={v}
                  isSelected={selectedId === v.id}
                  sparkData={selectedId === v.id ? sparkData : null}
                  sparkLoading={sparkLoading && selectedId === v.id}
                  onSelect={() => handleSelectVille(v)}
                />
              ))}
            </div>
          </motion.div>
        )}

        {searched && results.length === 0 && !loading && (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-20 glass rounded-2xl max-w-md mx-auto">
            <div className="text-4xl mb-4">🔍</div>
            <div className="font-semibold mb-2">Aucun résultat</div>
            <div className="text-sm opacity-50">Aucune commune trouvée pour « {query} »</div>
          </motion.div>
        )}

        {!query && !searched && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-20 opacity-20">
            <div className="text-6xl mb-4">◉</div>
            <div className="text-sm">21 pays · Zone euro</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
