'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { aqiColor } from '@/lib/utils';

const ALL_PAYS = ['FR', 'DE', 'IT', 'ES', 'PT', 'NL', 'BE', 'AT', 'FI', 'IE', 'GR', 'LU', 'SI', 'CY', 'MT', 'SK', 'EE', 'LV', 'LT', 'HR', 'BG'] as const;
type PaysCode = typeof ALL_PAYS[number];

const PAYS_COLORS: Record<string, string> = {
  FR: '#00f5d4', DE: '#00ff88', IT: '#ffaa00', ES: '#a78bfa',
  PT: '#fb923c', NL: '#38bdf8', BE: '#f87171', AT: '#818cf8',
  FI: '#34d399', IE: '#4ade80', GR: '#fbbf24', LU: '#c084fc',
  SI: '#e879f9', CY: '#fb7185', MT: '#94a3b8', SK: '#f59e0b',
  EE: '#10b981', LV: '#6366f1', LT: '#14b8a6', HR: '#f43f5e',
  BG: '#ff3366',
};

const PAYS_NAMES: Record<string, string> = {
  FR: '🇫🇷 France',     DE: '🇩🇪 Allemagne',  IT: '🇮🇹 Italie',    ES: '🇪🇸 Espagne',
  PT: '🇵🇹 Portugal',   NL: '🇳🇱 Pays-Bas',   BE: '🇧🇪 Belgique',  AT: '🇦🇹 Autriche',
  FI: '🇫🇮 Finlande',   IE: '🇮🇪 Irlande',    GR: '🇬🇷 Grèce',     LU: '🇱🇺 Luxembourg',
  SI: '🇸🇮 Slovénie',   CY: '🇨🇾 Chypre',     MT: '🇲🇹 Malte',     SK: '🇸🇰 Slovaquie',
  EE: '🇪🇪 Estonie',    LV: '🇱🇻 Lettonie',   LT: '🇱🇹 Lituanie',  HR: '🇭🇷 Croatie',
  BG: '🇧🇬 Bulgarie',
};

const TOP10 = [
  { ville: 'Sofia',     pays: 'BG', drapeau: '🇧🇬', aqi: 142 },
  { ville: 'Płowdiw',   pays: 'BG', drapeau: '🇧🇬', aqi: 138 },
  { ville: 'Cracovie',  pays: 'PL', drapeau: '🇵🇱', aqi: 127 },
  { ville: 'Milan',     pays: 'IT', drapeau: '🇮🇹', aqi: 118 },
  { ville: 'Zagreb',    pays: 'HR', drapeau: '🇭🇷', aqi: 115 },
  { ville: 'Łódź',      pays: 'PL', drapeau: '🇵🇱', aqi: 112 },
  { ville: 'Turin',     pays: 'IT', drapeau: '🇮🇹', aqi: 108 },
  { ville: 'Katowice',  pays: 'PL', drapeau: '🇵🇱', aqi: 105 },
  { ville: 'Wrocław',   pays: 'PL', drapeau: '🇵🇱', aqi: 103 },
  { ville: 'Varna',     pays: 'BG', drapeau: '🇧🇬', aqi: 101 },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface DataPoint { date: string; aqi_moy: number; pays_code: string }

interface CityResult {
  id: number;
  nom: string;
  pays_nom: string;
  pays_code: string;
  drapeau: string;
  dispositif_id: number | null;
  aqi: number | null;
}

interface SelectedCity {
  nom: string;
  pays_code: string;
  drapeau: string;
  dispositif_id: number;
}

// ── CitySearch component ──────────────────────────────────────────────────────

function CitySearch({ label, selected, onSelect, color }: {
  label: string;
  selected: SelectedCity | null;
  onSelect: (city: SelectedCity | null) => void;
  color: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CityResult[]>([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = (v: string) => {
    setQuery(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (v.length < 2) { setResults([]); setOpen(false); return; }
    timerRef.current = setTimeout(() => {
      fetch(`/api/recherche?q=${encodeURIComponent(v)}`)
        .then(r => r.json())
        .then(d => {
          const filtered = (d.results as CityResult[]).filter(r => r.dispositif_id !== null);
          setResults(filtered.slice(0, 8));
          setOpen(filtered.length > 0);
        })
        .catch(() => {});
    }, 300);
  };

  const select = (r: CityResult) => {
    if (!r.dispositif_id) return;
    onSelect({ nom: r.nom, pays_code: r.pays_code, drapeau: r.drapeau, dispositif_id: r.dispositif_id });
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  if (selected) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
        style={{ background: `${color}18`, border: `1px solid ${color}50` }}>
        <span className="text-base">{selected.drapeau}</span>
        <span style={{ color }} className="font-semibold">{selected.nom}</span>
        <button onClick={() => onSelect(null)}
          className="ml-2 text-xs leading-none transition-opacity"
          style={{ opacity: 0.4 }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')}>
          ✕
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="text-xs font-mono mb-1.5" style={{ color: `${color}aa` }}>{label}</div>
      <input
        value={query}
        onChange={e => handleChange(e.target.value)}
        placeholder="Rechercher une ville…"
        className="px-3 py-2 rounded-xl text-sm w-56 outline-none"
        style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${color}40`, color: 'white' }}
      />
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 mt-1 w-64 rounded-xl overflow-hidden"
          style={{ background: 'rgba(10,10,20,0.98)', border: '1px solid rgba(0,245,212,0.25)', zIndex: 9999 }}>
          {results.map(r => (
            <button
              key={r.id}
              onClick={() => select(r)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}>
              <span className="text-base shrink-0">{r.drapeau}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{r.nom}</div>
                <div className="text-xs opacity-40 truncate">{r.pays_nom}</div>
              </div>
              {r.aqi !== null && (
                <div className="text-xs font-mono font-bold shrink-0" style={{ color: aqiColor(r.aqi) }}>{r.aqi}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function PaysSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="px-3 py-2 rounded-xl text-sm"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,245,212,0.2)', color: 'white' }}>
      {ALL_PAYS.map(p => <option key={p} value={p}>{PAYS_NAMES[p]}</option>)}
    </select>
  );
}

function EvoTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(10,10,20,0.96)', border: '1px solid rgba(0,245,212,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div className="font-bold mb-2 opacity-60">{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: p.color }}>{PAYS_NAMES[p.dataKey] ?? p.dataKey}</span>
          <strong className="ml-1">{p.value}</strong>
        </div>
      ))}
    </div>
  );
}

function CompTooltip({ active, payload, label, ville1, ville2 }: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string }>;
  label?: string;
  ville1: SelectedCity | null;
  ville2: SelectedCity | null;
}) {
  if (!active || !payload?.length) return null;
  const name = (key: string) => {
    if (key === 'v1') return ville1 ? `${ville1.drapeau} ${ville1.nom}` : 'Ville 1';
    return ville2 ? `${ville2.drapeau} ${ville2.nom}` : 'Ville 2';
  };
  return (
    <div style={{ background: 'rgba(10,10,20,0.96)', border: '1px solid rgba(0,245,212,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div className="font-bold mb-2 opacity-60">{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: p.color }}>{name(p.dataKey)}</span>
          <strong className="ml-1">{p.value}</strong>
        </div>
      ))}
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'evolution',   label: 'Évolution 90j' },
  { id: 'comparaison', label: 'Comparaison'   },
  { id: 'heatmap',     label: 'Heatmap'       },
  { id: 'top10',       label: 'Top 10 pollués'},
] as const;
type TabId = typeof TABS[number]['id'];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GraphiquesPage() {
  const [data, setData]       = useState<DataPoint[]>([]);
  const [tab, setTab]         = useState<TabId>('evolution');

  // Évolution
  const [visiblePays, setVisiblePays] = useState<Set<string>>(() => new Set(ALL_PAYS));

  // Comparaison
  const [ville1, setVille1]     = useState<SelectedCity | null>(null);
  const [ville2, setVille2]     = useState<SelectedCity | null>(null);
  const [compData1, setCompData1] = useState<{ date: string; aqi_moy: number }[]>([]);
  const [compData2, setCompData2] = useState<{ date: string; aqi_moy: number }[]>([]);

  // Heatmap
  const [heatmapPays, setHeatmapPays] = useState<PaysCode>('FR');
  const [heatmapRaw, setHeatmapRaw]   = useState<{ date: string; hour: number; aqi_moy: number }[]>([]);
  const [sliderHour, setSliderHour]   = useState(12);

  // ── Data fetching ───────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/graphiques?type=pays').then(r => r.json()).then(d => setData(d.data ?? []));
  }, []);

  useEffect(() => {
    if (!ville1) { setCompData1([]); return; }
    fetch(`/api/graphiques?type=ville&dispositif_id=${ville1.dispositif_id}`)
      .then(r => r.json()).then(d => setCompData1(d.data ?? [])).catch(() => {});
  }, [ville1]);

  useEffect(() => {
    if (!ville2) { setCompData2([]); return; }
    fetch(`/api/graphiques?type=ville&dispositif_id=${ville2.dispositif_id}`)
      .then(r => r.json()).then(d => setCompData2(d.data ?? [])).catch(() => {});
  }, [ville2]);

  useEffect(() => {
    fetch(`/api/graphiques?type=heatmap&pays=${heatmapPays}`)
      .then(r => r.json()).then(d => setHeatmapRaw(d.data ?? [])).catch(() => {});
  }, [heatmapPays]);

  // ── Derived data ────────────────────────────────────────────────────────────

  // Évolution: pivot date → {FR: aqi, DE: aqi, …}
  const byDate = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const d of data) {
      if (!map[d.date]) map[d.date] = {};
      map[d.date][d.pays_code] = d.aqi_moy;
    }
    return map;
  }, [data]);

  const chartData = useMemo(() =>
    Object.entries(byDate)
      .map(([date, vals]) => ({ date: date.slice(5), ...vals } as Record<string, number | string>))
      .sort((a, b) => (a.date as string).localeCompare(b.date as string)),
  [byDate]);

  // Y-axis domain computed from actual data so country differences are visible
  const evoYDomain = useMemo<[number, number]>(() => {
    if (chartData.length === 0) return [0, 150];
    const nums: number[] = [];
    for (const pt of chartData) {
      for (const p of ALL_PAYS) {
        const v = pt[p];
        if (typeof v === 'number' && !isNaN(v)) nums.push(v);
      }
    }
    if (nums.length === 0) return [0, 150];
    const lo = Math.max(0, Math.floor(Math.min(...nums)) - 5);
    const hi = Math.ceil(Math.max(...nums)) + 8;
    return [lo, hi];
  }, [chartData]);

  // Comparaison: merge two city timeseries by date
  const compChartData = useMemo(() => {
    const map = new Map<string, { date: string; v1?: number; v2?: number }>();
    for (const { date, aqi_moy } of compData1) {
      const d = date.slice(5);
      map.set(d, { ...(map.get(d) ?? { date: d }), v1: aqi_moy });
    }
    for (const { date, aqi_moy } of compData2) {
      const d = date.slice(5);
      map.set(d, { ...(map.get(d) ?? { date: d }), v2: aqi_moy });
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [compData1, compData2]);

  const avg1 = compData1.length ? compData1.reduce((s, d) => s + d.aqi_moy, 0) / compData1.length : 0;
  const avg2 = compData2.length ? compData2.reduce((s, d) => s + d.aqi_moy, 0) / compData2.length : 0;
  const pctDiff = avg1 && avg2 ? Math.abs(((avg1 - avg2) / Math.min(avg1, avg2)) * 100).toFixed(0) : '–';
  const morePolluted = avg1 >= avg2 ? ville1 : ville2;

  // Heatmap: build 7 × 24 matrix from real ReleveHeure data
  const heatmapMatrix = useMemo(() => {
    const dateMap = new Map<string, Map<number, number>>();
    for (const { date, hour, aqi_moy } of heatmapRaw) {
      if (!dateMap.has(date)) dateMap.set(date, new Map());
      dateMap.get(date)!.set(hour, aqi_moy);
    }
    const dates = Array.from(dateMap.keys()).sort().slice(-7);
    return dates.map(date => ({
      label: new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      hours: Array.from({ length: 24 }, (_, h) => dateMap.get(date)?.get(h) ?? 0),
    }));
  }, [heatmapRaw]);

  const togglePays = (code: string) =>
    setVisiblePays(prev => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });

  const color1 = '#00f5d4';
  const color2 = '#ff3366';

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-grid px-6 py-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-orbitron text-3xl font-black mb-2 gradient-text">GRAPHIQUES AQM</h1>
        <p className="text-sm opacity-50">Analyses temporelles — Zone Euro — 90 jours · ReleveJour</p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: tab === t.id ? 'rgba(0,245,212,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${tab === t.id ? 'rgba(0,245,212,0.35)' : 'rgba(0,245,212,0.1)'}`,
              color: tab === t.id ? '#00f5d4' : 'rgba(255,255,255,0.5)',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Évolution ────────────────────────────────────────────────────────── */}
      {tab === 'evolution' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="glass p-4 rounded-2xl">
            <div className="text-xs font-mono opacity-40 mb-3 uppercase tracking-wider">Filtrer les pays</div>
            <div className="flex flex-wrap gap-2">
              {ALL_PAYS.map(p => (
                <button key={p} onClick={() => togglePays(p)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all"
                  style={{
                    background: visiblePays.has(p) ? `${PAYS_COLORS[p]}18` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${visiblePays.has(p) ? `${PAYS_COLORS[p]}70` : 'rgba(255,255,255,0.1)'}`,
                    color: visiblePays.has(p) ? PAYS_COLORS[p] : 'rgba(255,255,255,0.3)',
                  }}>
                  <span style={{
                    display: 'inline-block', width: 8, height: 8, borderRadius: 2, flexShrink: 0,
                    background: visiblePays.has(p) ? PAYS_COLORS[p] : 'rgba(255,255,255,0.15)',
                  }} />
                  {p}
                </button>
              ))}
              <button onClick={() => setVisiblePays(new Set(ALL_PAYS))}
                className="px-2.5 py-1.5 rounded-lg text-xs font-mono"
                style={{ border: '1px solid rgba(0,245,212,0.2)', color: '#00f5d4', opacity: 0.5 }}>
                Tout
              </button>
              <button onClick={() => setVisiblePays(new Set())}
                className="px-2.5 py-1.5 rounded-lg text-xs font-mono"
                style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', opacity: 0.5 }}>
                Aucun
              </button>
            </div>
          </div>

          <div className="glass p-6 rounded-2xl">
            <h2 className="font-semibold mb-1">AQI moyen par pays — {chartData.length} jours disponibles</h2>
            <p className="text-xs opacity-40 mb-6 font-mono">Données ReleveJour · échelle Y ajustée aux données · zone euro 20/21 pays</p>
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-96 text-sm opacity-40 font-mono">Chargement…</div>
            ) : (
              <ResponsiveContainer width="100%" height={420}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,245,212,0.07)" />
                  <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} tickLine={false} interval={7} />
                  <YAxis
                    domain={evoYDomain}
                    tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }}
                    tickLine={false}
                    width={34}
                    label={{ value: 'AQI', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.2)', fontSize: 10, dx: -4 }}
                  />
                  <Tooltip content={<EvoTooltip />} />
                  <Legend formatter={v => <span style={{ color: PAYS_COLORS[v] ?? '#888', fontSize: 11 }}>{PAYS_NAMES[v] ?? v}</span>} />
                  {ALL_PAYS.filter(p => visiblePays.has(p)).map(p => (
                    <Line key={p} type="monotone" dataKey={p} stroke={PAYS_COLORS[p]}
                      strokeWidth={1.5} dot={false} strokeOpacity={0.85} connectNulls={false} />
                  ))}
                  {evoYDomain[1] >= 100 && (
                    <Line type="monotone" dataKey={() => 100} stroke="#ff3366"
                      strokeDasharray="6 3" strokeWidth={1} dot={false} strokeOpacity={0.4} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            )}
            {evoYDomain[1] >= 100 && (
              <div className="flex items-center gap-2 mt-2 text-xs opacity-30">
                <div className="w-5 border-t-2 border-dashed" style={{ borderColor: '#ff3366' }} />
                Seuil OMS AQI 100
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Comparaison ──────────────────────────────────────────────────────── */}
      {tab === 'comparaison' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="flex gap-6 items-end flex-wrap">
            <CitySearch label="Ville 1" selected={ville1} onSelect={setVille1} color={color1} />
            <span className="opacity-40 font-bold text-xl pb-2">VS</span>
            <CitySearch label="Ville 2" selected={ville2} onSelect={setVille2} color={color2} />
          </div>

          {!ville1 && !ville2 && (
            <div className="glass p-8 rounded-2xl text-center">
              <div className="text-3xl mb-3">🔍</div>
              <div className="text-sm opacity-50">Recherchez deux villes pour comparer leur évolution AQI sur 30 jours</div>
            </div>
          )}

          {(ville1 || ville2) && avg1 > 0 && avg2 > 0 && (
            <div className="glass p-4 rounded-xl flex items-center gap-3 text-sm">
              <span className="text-2xl">📊</span>
              <span>
                <span style={{ color: morePolluted === ville1 ? color1 : color2, fontWeight: 'bold' }}>
                  {morePolluted?.drapeau} {morePolluted?.nom}
                </span>
                {' '}est{' '}
                <span style={{ color: '#ff3366', fontWeight: 'bold', fontFamily: 'Space Mono' }}>{pctDiff}%</span>
                {' '}plus polluée sur les 30 derniers jours
                {' '}<span className="opacity-40 text-xs font-mono">· {avg1.toFixed(1)} vs {avg2.toFixed(1)} AQI moy</span>
              </span>
            </div>
          )}

          {(ville1 || ville2) && (
            <div className="glass p-6 rounded-2xl">
              <p className="text-xs opacity-40 mb-4 font-mono">Données ReleveJour — 30 derniers jours</p>
              {compChartData.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-sm opacity-40 font-mono">Chargement…</div>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={compChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,245,212,0.07)" />
                    <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} tickLine={false} interval={4} />
                    <YAxis domain={[0, 200]} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} tickLine={false} width={28} />
                    <Tooltip content={<CompTooltip ville1={ville1} ville2={ville2} />} />
                    <Legend formatter={v => {
                      const city = v === 'v1' ? ville1 : ville2;
                      const col = v === 'v1' ? color1 : color2;
                      return <span style={{ color: col, fontSize: 12 }}>{city ? `${city.drapeau} ${city.nom}` : v}</span>;
                    }} />
                    {ville1 && <Line type="monotone" dataKey="v1" stroke={color1} strokeWidth={2.5} dot={false} connectNulls={false} />}
                    {ville2 && <Line type="monotone" dataKey="v2" stroke={color2} strokeWidth={2.5} dot={false} connectNulls={false} />}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* ── Heatmap ──────────────────────────────────────────────────────────── */}
      {tab === 'heatmap' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h2 className="font-semibold mb-1">Heatmap pollution — 7 derniers jours</h2>
              <p className="text-xs opacity-40 font-mono">Données ReleveHeure · Moyenne AQI par jour × heure</p>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <PaysSelect value={heatmapPays} onChange={v => setHeatmapPays(v as PaysCode)} />
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono opacity-40">Heure :</span>
                <span className="text-sm font-mono min-w-[2.5rem]" style={{ color: '#00f5d4' }}>
                  {String(sliderHour).padStart(2, '0')}h
                </span>
                <input type="range" min={0} max={23} value={sliderHour}
                  onChange={e => setSliderHour(+e.target.value)}
                  className="w-32 accent-cyan-neon" />
              </div>
            </div>
          </div>

          {heatmapMatrix.length === 0 ? (
            <div className="text-center py-12 opacity-40 font-mono text-sm">Chargement…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr>
                    <th className="text-left opacity-40 py-1 pr-3 w-14 font-normal">Date</th>
                    {Array.from({ length: 24 }, (_, h) => (
                      <th key={h} className="px-0.5 py-1 text-center font-normal"
                        style={{ color: h === sliderHour ? '#00f5d4' : 'rgba(255,255,255,0.25)', fontWeight: h === sliderHour ? 700 : 400 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmapMatrix.map((row, i) => (
                    <tr key={i}>
                      <td className="pr-3 py-0.5 opacity-50 whitespace-nowrap">{row.label}</td>
                      {row.hours.map((v, h) => (
                        <td key={h} className="px-0.5 py-0.5">
                          <div className="w-full h-6 rounded-sm"
                            title={`${row.label} ${String(h).padStart(2,'0')}h — AQI ${v}`}
                            style={{
                              background: v > 0 ? aqiColor(v) + (h === sliderHour ? 'ff' : '72') : 'rgba(255,255,255,0.05)',
                              outline: h === sliderHour ? `1px solid ${v > 0 ? aqiColor(v) : '#00f5d4'}` : 'none',
                            }} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center gap-4 mt-4 text-xs opacity-35">
            {[0, 50, 100, 150, 200, 300].map(v => (
              <div key={v} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm" style={{ background: aqiColor(v) }} />
                {v}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Top 10 ───────────────────────────────────────────────────────────── */}
      {tab === 'top10' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-6 rounded-2xl">
          <h2 className="font-semibold mb-6">Top 10 villes les plus polluées — Zone Euro</h2>
          <div className="space-y-3">
            {TOP10.map((v, i) => (
              <div key={v.ville} className="flex items-center gap-4">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono shrink-0"
                  style={{
                    background: i < 3 ? 'rgba(255,51,102,0.2)' : 'rgba(255,255,255,0.06)',
                    color: i < 3 ? '#ff3366' : 'rgba(255,255,255,0.5)',
                    border: `1px solid ${i < 3 ? 'rgba(255,51,102,0.3)' : 'rgba(255,255,255,0.1)'}`,
                  }}>
                  {i + 1}
                </div>
                <div className="text-xl">{v.drapeau}</div>
                <div className="flex-1">
                  <div className="font-medium">{v.ville}</div>
                  <div className="text-xs opacity-40">{v.pays}</div>
                </div>
                <div className="flex-1 max-w-xs">
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${(v.aqi / 200) * 100}%`, background: aqiColor(v.aqi) }} />
                  </div>
                </div>
                <div className="font-mono font-bold w-12 text-right" style={{ color: aqiColor(v.aqi) }}>
                  {v.aqi}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
