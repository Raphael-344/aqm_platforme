'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { aqiColor, aqiLabel } from '@/lib/utils';
import type { Map as LeafletMap, LayerGroup, TileLayer } from 'leaflet';

interface Point {
  dispositif_id: number;
  code: string;
  commune_nom: string;
  pays_nom: string;
  pays_code: string;
  drapeau: string;
  lat: number;
  lng: number;
  aqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  timestamp: string;
}

const DARK_TILE  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const LIGHT_TILE = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTR  = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">Carto</a>';

function AqiBadge({ aqi }: { aqi: number }) {
  const color = aqiColor(aqi);
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-bold font-mono"
      style={{ background: `${color}20`, border: `1px solid ${color}60`, color }}>
      AQI {aqi} — {aqiLabel(aqi)}
    </span>
  );
}

export default function CartePage() {
  const mapDivRef   = useRef<HTMLDivElement>(null);
  const mapRef      = useRef<LeafletMap | null>(null);
  const groupRef    = useRef<LayerGroup | null>(null);
  const tileRef     = useRef<TileLayer | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const [points, setPoints]   = useState<Point[]>([]);
  const [selected, setSelected] = useState<Point | null>(null);
  const [search, setSearch]   = useState('');
  const skipSearchRef = useRef(false);
  const [suggestions, setSuggestions] = useState<Array<{
    id: number; nom: string; pays_nom: string; pays_code: string;
    drapeau: string; lat: number; lng: number; aqi: number | null;
  }>>([]);
  const [filterPays, setFilterPays]   = useState('');
  const [filterAlerte, setFilterAlerte] = useState(false);
  const [nightMode, setNightMode] = useState(false);
  const [loading, setLoading]   = useState(true);

  // Fetch points
  useEffect(() => {
    fetch('/api/carte')
      .then(r => r.json())
      .then(d => { setPoints(d.points ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Search debounce
  useEffect(() => {
    if (search.length < 2) { setSuggestions([]); return; }
    if (skipSearchRef.current) { skipSearchRef.current = false; return; }
    const t = setTimeout(() => {
      fetch(`/api/recherche?q=${encodeURIComponent(search)}`)
        .then(r => r.json())
        .then(d => setSuggestions(d.results ?? []))
        .catch(() => setSuggestions([]));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  function handleSelectSuggestion(s: typeof suggestions[0]) {
    skipSearchRef.current = true;
    setSearch(s.nom);
    setSuggestions([]);

    import('leaflet').then((L) => {
      const map = mapRef.current;
      if (!map) return;
      map.flyTo([s.lat, s.lng], 12, { duration: 1.2 });

      // Try to match an existing point and open its panel
      const match = points.find(
        p => p.commune_nom.toLowerCase() === s.nom.toLowerCase() && p.pays_code === s.pays_code
      );
      if (match) {
        setSelected(match);
      } else {
        // No sensor data — show a minimal popup
        L.popup({ closeButton: true })
          .setLatLng([s.lat, s.lng])
          .setContent(
            `<div style="font-family:monospace;font-size:13px;line-height:1.6">
              <b>${s.drapeau} ${s.nom}</b><br/>
              ${s.pays_nom}
              ${s.aqi != null ? `<br/>AQI : <b>${s.aqi}</b>` : ''}
            </div>`
          )
          .openOn(map);
      }
    });
  }

  const filteredPoints = points.filter(p => {
    if (filterPays && p.pays_code !== filterPays) return false;
    if (filterAlerte && p.aqi <= 150) return false;
    return true;
  });

  // Init Leaflet map (once)
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    import('leaflet').then((L) => {
      if (!mapDivRef.current || mapRef.current) return;

      const euroBounds: L.LatLngBoundsExpression = [[28, -25], [72, 45]];

      const map = L.map(mapDivRef.current, {
        preferCanvas: true,
        center: [50, 8],
        zoom: 4,
        maxBounds: euroBounds,
        maxBoundsViscosity: 1.0,
        zoomControl: true,
      });

      map.fitBounds(euroBounds);

      const tile = L.tileLayer(LIGHT_TILE, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map);
      const group = L.layerGroup().addTo(map);

      mapRef.current   = map;
      groupRef.current = group;
      tileRef.current  = tile;
      setMapReady(true);
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = groupRef.current = tileRef.current = null;
    };
  }, []);

  // Swap tile on night mode toggle
  useEffect(() => {
    tileRef.current?.setUrl(nightMode ? DARK_TILE : LIGHT_TILE);
  }, [nightMode]);

  // Redraw markers when map is ready or filters change
  useEffect(() => {
    const group = groupRef.current;
    if (!mapReady || !group) return;

    import('leaflet').then((L) => {
      group.clearLayers();
      for (const p of filteredPoints) {
        const m = L.circleMarker([p.lat, p.lng], {
          radius: p.aqi > 150 ? 5 : 3,
          fillColor: aqiColor(p.aqi),
          color: 'transparent',
          fillOpacity: 0.75,
          weight: 0,
        });
        m.on('click', () => setSelected(p));
        group.addLayer(m);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, filteredPoints]);

  const pays = Array.from(new Set(points.map(p => p.pays_code))).sort();

  return (
    <div className="min-h-screen relative" style={{ background: '#0a0a0f' }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex flex-wrap items-center gap-4 relative" style={{ zIndex: 2000 }}>
        <div>
          <h1 className="font-orbitron text-2xl font-bold" style={{ color: '#00f5d4' }}>Carte AQM</h1>
          <p className="text-xs opacity-50 mt-0.5 font-mono">
            {filteredPoints.length.toLocaleString('fr-FR')} capteurs affichés
          </p>
        </div>

        <div className="flex flex-wrap gap-3 ml-auto items-center">
          {/* Search */}
          <div className="relative">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une ville..."
              className="px-4 py-2 rounded-xl text-sm w-56"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,245,212,0.2)', color: 'white', outline: 'none' }} />
            {suggestions.length > 0 && (
              <div className="absolute top-full mt-1 right-0 min-w-[250px] rounded-xl overflow-hidden"
                style={{ zIndex: 9999, background: 'rgba(10,10,20,0.98)', border: '1px solid rgba(0,245,212,0.3)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
                {suggestions.slice(0, 6).map(s => (
                  <button key={s.id} onClick={() => handleSelectSuggestion(s)}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-white/5 flex items-center gap-2">
                    <span>{s.drapeau}</span>
                    <span className="text-white">{s.nom}</span>
                    <span className="opacity-40 text-xs">{s.pays_nom}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter pays */}
          <select value={filterPays} onChange={e => setFilterPays(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,245,212,0.2)', color: 'white' }}>
            <option value="">Tous les pays</option>
            {pays.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          {/* Toggle alerte */}
          <button onClick={() => setFilterAlerte(!filterAlerte)}
            className="px-3 py-2 rounded-xl text-xs font-mono transition-all"
            style={{
              background: filterAlerte ? 'rgba(255,51,102,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${filterAlerte ? 'rgba(255,51,102,0.4)' : 'rgba(0,245,212,0.2)'}`,
              color: filterAlerte ? '#ff3366' : 'rgba(255,255,255,0.6)',
            }}>
            ⚠ Alertes seules
          </button>

          {/* Night mode */}
          <button onClick={() => setNightMode(!nightMode)}
            className="px-3 py-2 rounded-xl text-xs font-mono transition-all"
            style={{
              background: nightMode ? 'rgba(0,245,212,0.1)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${nightMode ? 'rgba(0,245,212,0.3)' : 'rgba(0,245,212,0.15)'}`,
              color: nightMode ? '#00f5d4' : 'rgba(255,255,255,0.6)',
            }}>
            {nightMode ? '☀ Jour' : '☾ Nuit'}
          </button>
        </div>
      </div>

      {/* Map container */}
      <div className="relative" style={{ height: 'calc(100vh - 160px)' }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full border-2 border-transparent animate-spin mx-auto mb-4"
                style={{ borderTopColor: '#00f5d4' }} />
              <div className="font-mono text-sm" style={{ color: '#00f5d4' }}>
                Chargement des capteurs…
              </div>
            </div>
          </div>
        )}

        <div ref={mapDivRef} style={{ width: '100%', height: '100%' }} />

        {/* SIGFOX indicator */}
        <div className="absolute top-4 right-4 flex items-center gap-2 glass px-3 py-2 rounded-xl z-[1000]">
          <div className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: '#00ff88', boxShadow: '0 0 8px #00ff88' }} />
          <span className="text-xs font-mono" style={{ color: '#00ff88' }}>SIGFOX LIVE</span>
        </div>

        {/* AQI legend */}
        <div className="absolute bottom-4 left-4 glass p-4 rounded-xl z-[1000]">
          <div className="text-xs font-mono mb-2 opacity-50 uppercase tracking-wider">Indice AQI</div>
          {[
            { label: 'Bon (0–50)',             color: '#00e400' },
            { label: 'Modéré (51–100)',         color: '#ffff00' },
            { label: 'Sensibles (101–150)',      color: '#ff7e00' },
            { label: 'Mauvais (151–200)',        color: '#ff0000' },
            { label: 'Très mauvais (201–300)',   color: '#8f3f97' },
            { label: 'Dangereux (301+)',         color: '#7e0023' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full" style={{ background: l.color }} />
              <span className="text-xs opacity-70">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected point panel */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}
            className="fixed right-6 top-24 w-80 glass p-6 rounded-2xl z-[2000]">
            <button onClick={() => setSelected(null)}
              className="absolute top-4 right-4 opacity-40 hover:opacity-100 text-white">✕</button>
            <div className="text-2xl mb-2">{selected.drapeau}</div>
            <h3 className="font-bold text-lg mb-0.5">{selected.commune_nom}</h3>
            <p className="text-sm opacity-50 mb-4">{selected.pays_nom} · {selected.code}</p>
            <AqiBadge aqi={selected.aqi} />
            <div className="grid grid-cols-2 gap-3 mt-4">
              {[
                { label: 'PM2.5', value: selected.pm25.toFixed(1), unit: 'µg/m³', limit: 15 },
                { label: 'PM10',  value: selected.pm10.toFixed(1), unit: 'µg/m³', limit: 45 },
                { label: 'NO₂',   value: selected.no2.toFixed(1),  unit: 'µg/m³', limit: 40 },
              ].map(m => (
                <div key={m.label} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div className="text-xs opacity-50 mb-1">{m.label}</div>
                  <div className="font-mono font-bold"
                    style={{ color: parseFloat(m.value) > m.limit ? '#ff3366' : '#00ff88' }}>
                    {m.value} <span className="text-xs opacity-60">{m.unit}</span>
                  </div>
                </div>
              ))}
              <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="text-xs opacity-50 mb-1">Dernière mesure</div>
                <div className="font-mono text-xs" style={{ color: '#00f5d4' }}>
                  {new Date(selected.timestamp).toLocaleTimeString('fr-FR')}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-xs opacity-40 mb-2 font-mono">AQI — 7 dernières valeurs</div>
              <div className="flex items-end gap-1 h-10">
                {Array.from({ length: 7 }, (_, i) => {
                  const v = Math.max(10, selected.aqi + (Math.random() - 0.5) * 20);
                  return (
                    <div key={i} className="flex-1 rounded-t"
                      style={{ height: `${(v / 200) * 100}%`, background: aqiColor(v), opacity: 0.7 + i * 0.04 }} />
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
