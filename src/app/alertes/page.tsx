'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts';
import { aqiColor } from '@/lib/utils';

interface Alerte {
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
  no2: number;
  timestamp: string;
}

function AlerteRow({ alerte, index }: { alerte: Alerte; index: number }) {
  const color = aqiColor(alerte.aqi);
  const [emailSent, setEmailSent] = useState(false);

  const sendEmail = () => {
    setEmailSent(true);
    setTimeout(() => setEmailSent(false), 3000);
  };

  return (
    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }}
      className="glass glass-hover p-4 rounded-xl relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ background: color }} />
      <div className="flex items-center gap-4 flex-wrap">
        <div className="text-3xl">{alerte.drapeau}</div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold">{alerte.commune_nom}</div>
          <div className="text-xs opacity-50">{alerte.pays_nom} · {alerte.code}</div>
        </div>
        <div className="text-center">
          <div className="font-mono font-bold text-xl" style={{ color }}>{alerte.aqi}</div>
          <div className="text-xs" style={{ color: `${color}aa` }}>AQI</div>
        </div>
        <div className="hidden md:grid grid-cols-2 gap-3 text-xs font-mono">
          <div>
            <div className="opacity-40">PM2.5</div>
            <div style={{ color: alerte.pm25 > 15 ? '#ff3366' : '#00ff88' }}>{alerte.pm25.toFixed(1)} µg/m³</div>
          </div>
          <div>
            <div className="opacity-40">NO₂</div>
            <div style={{ color: alerte.no2 > 40 ? '#ff3366' : '#00ff88' }}>{alerte.no2.toFixed(1)} µg/m³</div>
          </div>
        </div>
        <div className="text-xs opacity-40 font-mono hidden lg:block">
          {new Date(alerte.timestamp).toLocaleTimeString('fr-FR')}
        </div>
        <button onClick={sendEmail}
          className="px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
          style={{
            background: emailSent ? 'rgba(0,255,136,0.1)' : 'rgba(255,51,102,0.1)',
            border: `1px solid ${emailSent ? 'rgba(0,255,136,0.3)' : 'rgba(255,51,102,0.3)'}`,
            color: emailSent ? '#00ff88' : '#ff3366',
          }}>
          {emailSent ? '✓ Email envoyé' : '📧 Notifier'}
        </button>
      </div>

      <AnimatePresence>
        {emailSent && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-3 p-2 rounded-lg text-xs font-mono"
            style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)', color: '#00ff88' }}>
            📧 Email envoyé à <span className="underline">autorite@{alerte.pays_code.toLowerCase()}.eu</span> — Dépassement AQI {alerte.aqi} à {alerte.commune_nom}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

type HistoriqueEntry = { date: string; count: number; isToday: boolean };

export default function AlertesPage() {
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [historique, setHistorique] = useState<HistoriqueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'aqi' | 'time'>('aqi');

  useEffect(() => {
    fetch('/api/alertes').then(r => r.json()).then(d => {
      setAlertes(d.alertes ?? []);
      setHistorique(d.historique ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));

    const id = setInterval(() => {
      fetch('/api/alertes').then(r => r.json()).then(d => {
        setAlertes(d.alertes ?? []);
        // Ne met à jour que la barre d'aujourd'hui (isToday) pour éviter les re-renders inutiles
        setHistorique(prev => {
          const next = d.historique as HistoriqueEntry[] | undefined;
          if (!next) return prev;
          return next.map((entry, i) => entry.isToday ? entry : (prev[i] ?? entry));
        });
      });
    }, 30000);
    return () => clearInterval(id);
  }, []);

  const sorted = [...alertes].sort((a, b) =>
    sortBy === 'aqi' ? b.aqi - a.aqi : new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const critical = alertes.filter(a => a.aqi > 200).length;
  const high = alertes.filter(a => a.aqi > 150 && a.aqi <= 200).length;

  return (
    <div className="min-h-screen bg-grid px-6 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-orbitron text-3xl font-black mb-2" style={{ color: '#ff3366' }}>
          ⚠ ALERTES TEMPS RÉEL
        </h1>
        <p className="text-sm opacity-50">Capteurs dépassant les seuils OMS — mise à jour toutes les 30s</p>
      </motion.div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total alertes', value: alertes.length, color: '#ff3366' },
          { label: 'Critiques (>200)', value: critical, color: '#7e0023' },
          { label: 'Élevées (150–200)', value: high, color: '#ff7e00' },
          { label: 'Pays touchés', value: new Set(alertes.map(a => a.pays_code)).size, color: '#ffaa00' },
        ].map(k => (
          <div key={k.label} className="glass p-4 rounded-xl">
            <div className="text-2xl font-bold font-mono" style={{ color: k.color }}>{k.value}</div>
            <div className="text-xs opacity-50 mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Timeline 30 jours */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        className="glass p-6 rounded-2xl mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm uppercase tracking-wider opacity-70">Historique 30 jours</h2>
          <div className="flex items-center gap-4 text-xs font-mono opacity-50">
            <span><span className="inline-block w-2.5 h-2.5 rounded-sm mr-1" style={{ background: '#ff3366' }} />Critique (&gt;200)</span>
            <span><span className="inline-block w-2.5 h-2.5 rounded-sm mr-1" style={{ background: '#ff7e00' }} />Élevé (150–200)</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={historique} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="20%">
            <XAxis
              dataKey="date"
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={false}
              width={36}
              tickFormatter={(v: number) => v.toLocaleString('fr-FR')}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              contentStyle={{ background: 'rgba(10,10,20,0.96)', border: '1px solid rgba(0,245,212,0.25)', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}
              formatter={(value: number) => [value.toLocaleString('fr-FR'), 'Alertes']}
            />
            <Bar dataKey="count" radius={[3, 3, 0, 0]} minPointSize={4}>
              {historique.map((t, i) => (
                <Cell
                  key={i}
                  fill={
                    t.isToday
                      ? (t.count > 200 ? '#ff3366' : t.count > 150 ? '#ff7e00' : '#00f5d4')
                      : (t.count > 200 ? 'rgba(255,51,102,0.7)' : t.count > 150 ? 'rgba(255,126,0,0.7)' : 'rgba(0,245,212,0.35)')
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* List */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Capteurs en dépassement ({alertes.length})</h2>
        <div className="flex gap-2">
          {(['aqi', 'time'] as const).map(s => (
            <button key={s} onClick={() => setSortBy(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
              style={{
                background: sortBy === s ? 'rgba(0,245,212,0.1)' : 'transparent',
                border: `1px solid ${sortBy === s ? 'rgba(0,245,212,0.3)' : 'rgba(0,245,212,0.1)'}`,
                color: sortBy === s ? '#00f5d4' : 'rgba(255,255,255,0.4)',
              }}>
              {s === 'aqi' ? 'Par AQI' : 'Par heure'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 opacity-50">Chargement des alertes...</div>
      ) : (
        <div className="space-y-3">
          {sorted.map((a, i) => <AlerteRow key={a.dispositif_id} alerte={a} index={i} />)}
          {sorted.length === 0 && (
            <div className="text-center py-20 glass rounded-2xl">
              <div className="text-4xl mb-4">✅</div>
              <div className="text-sm opacity-50">Aucune alerte active pour le moment</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
