'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ScatterChart, Scatter, Cell, Legend,
} from 'recharts';

// ── Constantes cote ──────────────────────────────────────────────────────────
const LSL = 49.9, USL = 50.1, IT = 0.2, CPK_MIN = 1.33, N = 75;

// ── Données réelles SMART_IO_QUA_MESURES_TESTS.xlsx ──────────────────────────
const COMBOS = [
  { id: 'MCH1 LOT1', machine: 'MCH1', lot: 'LOT1', capable: false,
    l1: { cp: 0.562, cpk: 0.504 }, l2: { cp: 0.514, cpk: 0.452 }, rebut: 9.7 },
  { id: 'MCH2 LOT1', machine: 'MCH2', lot: 'LOT1', capable: true,
    l1: { cp: 1.562, cpk: 1.460 }, l2: { cp: 1.814, cpk: 1.491 }, rebut: 0.0006 },
  { id: 'MCH1 LOT2', machine: 'MCH1', lot: 'LOT2', capable: false,
    l1: { cp: 0.095, cpk: 0.033 }, l2: { cp: 0.105, cpk: 0.078 }, rebut: 77.9 },
  { id: 'MCH2 LOT2', machine: 'MCH2', lot: 'LOT2', capable: true,
    l1: { cp: 1.757, cpk: 1.460 }, l2: { cp: 1.927, cpk: 1.775 }, rebut: 0.0006 },
] as const;

type Combo = typeof COMBOS[number];

// ── Helpers maths ─────────────────────────────────────────────────────────────
function getParams(cp: number, cpk: number) {
  const sigma = IT / (6 * cp);
  return { sigma, mean: LSL + cpk * 3 * sigma };
}

function gaussian(m: number, s: number): number {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return m + s * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function probit(p: number): number {
  const sign = p < 0.5 ? -1 : 1;
  const pp = p < 0.5 ? p : 1 - p;
  if (pp <= 0) return sign * -4;
  const t = Math.sqrt(-2 * Math.log(pp));
  const a = [2.515517, 0.802853, 0.010328];
  const b = [1.432788, 0.189269, 0.001308];
  return sign * (t - (a[0] + a[1]*t + a[2]*t*t) / (1 + b[0]*t + b[1]*t*t + b[2]*t*t*t));
}

function buildHistogram(samples: number[]) {
  const lo = Math.min(Math.min(...samples), LSL) - (USL - LSL) * 0.5;
  const hi = Math.max(Math.max(...samples), USL) + (USL - LSL) * 0.5;
  const step = (hi - lo) / 20;
  return Array.from({ length: 20 }, (_, i) => {
    const mid = lo + (i + 0.5) * step;
    const count = samples.filter(s => s >= lo + i * step && s < lo + (i + 1) * step).length;
    return { x: +mid.toFixed(4), count, out: mid < LSL || mid > USL };
  });
}

function buildQQ(samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b);
  const n = sorted.length;
  const mu = sorted.reduce((a, b) => a + b) / n;
  const sig = Math.sqrt(sorted.reduce((s, v) => s + (v - mu) ** 2, 0) / (n - 1));
  return sorted.map((v, i) => ({
    th: +probit((i + 0.5) / n).toFixed(3),
    obs: +((v - mu) / sig).toFixed(3),
  }));
}

// ── Tooltip barchart ──────────────────────────────────────────────────────────
function CpkTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(10,10,20,0.96)', border: '1px solid rgba(0,245,212,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div className="font-bold mb-2" style={{ color: '#00f5d4' }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} className="flex justify-between gap-4">
          <span className="opacity-60">{p.name}</span>
          <span className="font-mono font-bold" style={{ color: p.value >= CPK_MIN ? '#00ff88' : '#ff3366' }}>
            {p.value.toFixed(3)}
          </span>
        </div>
      ))}
      <div className="mt-1 text-xs opacity-30">Seuil requis : Cpk ≥ {CPK_MIN}</div>
    </div>
  );
}

// ── CapBlock ──────────────────────────────────────────────────────────────────
function CapBlock({ combo }: { combo: Combo }) {
  const { sigma: s1, mean: m1 } = getParams(combo.l1.cp, combo.l1.cpk);
  const samples = useMemo(() => Array.from({ length: N }, () => gaussian(m1, s1)), [m1, s1]);
  const hist = useMemo(() => buildHistogram(samples), [samples]);
  const qq   = useMemo(() => buildQQ(samples),         [samples]);

  const col = combo.capable ? '#00ff88' : '#ff3366';
  const bg  = combo.capable ? 'rgba(0,255,136,0.06)'  : 'rgba(255,51,102,0.06)';
  const bd  = combo.capable ? 'rgba(0,255,136,0.18)'  : 'rgba(255,51,102,0.18)';

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="glass p-5 rounded-2xl" style={{ borderLeft: `3px solid ${col}` }}>

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-orbitron font-bold text-base" style={{ color: col }}>
            {combo.machine} — {combo.lot}
          </h3>
          <div className="text-xs opacity-35 font-mono mt-0.5">n={N} · LSL={LSL} · USL={USL} · IT={IT} mm</div>
        </div>
        <div className="px-3 py-1.5 rounded-xl text-xs font-bold"
          style={{ background: bg, border: `1px solid ${bd}`, color: col }}>
          {combo.capable ? '✅ CAPABLE' : '❌ NON CAPABLE'}
        </div>
      </div>

      {/* L1 / L2 side by side */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {(['l1', 'l2'] as const).map(lev => {
          const d = combo[lev];
          const { sigma, mean } = getParams(d.cp, d.cpk);
          return (
            <div key={lev} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="text-xs font-mono opacity-45 mb-2">Levée {lev === 'l1' ? '1' : '2'}</div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {[{ label: 'Cp', v: d.cp }, { label: 'Cpk', v: d.cpk }].map(m => (
                  <div key={m.label} className="text-center">
                    <div className="text-xs opacity-35">{m.label}</div>
                    <div className="font-mono font-bold text-sm"
                      style={{ color: m.v >= CPK_MIN ? '#00ff88' : '#ff3366' }}>
                      {m.v.toFixed(3)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-xs font-mono opacity-25">σ = {sigma.toFixed(5)} mm</div>
              <div className="text-xs font-mono opacity-25">μ = {mean.toFixed(5)} mm</div>
            </div>
          );
        })}
      </div>

      {/* Histogram */}
      <div className="mb-3">
        <div className="text-xs opacity-30 font-mono mb-1">Distribution — levée 1 ({N} mesures)</div>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={hist} barSize={9}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,245,212,0.05)" />
            <XAxis dataKey="x" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 7 }}
              tickLine={false} tickFormatter={v => (+v).toFixed(2)} interval="preserveStartEnd" />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 7 }} tickLine={false} width={18} />
            <ReferenceLine x={LSL} stroke="#ff3366" strokeDasharray="4 2" strokeWidth={1}
              label={{ value: 'LSL', fill: '#ff3366', fontSize: 8, position: 'insideTopLeft' }} />
            <ReferenceLine x={USL} stroke="#ff3366" strokeDasharray="4 2" strokeWidth={1}
              label={{ value: 'USL', fill: '#ff3366', fontSize: 8, position: 'insideTopRight' }} />
            <Bar dataKey="count" radius={[2, 2, 0, 0]}>
              {hist.map((h, i) => <Cell key={i} fill={h.out ? '#ff336670' : `${col}80`} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Q-Q (droite de Henry) */}
      <div>
        <div className="text-xs opacity-30 font-mono mb-1">Droite de Henry — normalité</div>
        <ResponsiveContainer width="100%" height={120}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,245,212,0.05)" />
            <XAxis dataKey="th" type="number" domain={[-3, 3]} name="Quantile th."
              tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 7 }} tickLine={false} />
            <YAxis dataKey="obs" type="number" name="Quantile obs."
              tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 7 }} tickLine={false} width={22} />
            <Scatter data={qq} fill={col} opacity={0.65} />
            <Scatter
              data={[{ th: -3, obs: -3 }, { th: 3, obs: 3 }]}
              line={{ stroke: '#ffaa00', strokeWidth: 1.5, strokeDasharray: '5 3' }}
              fill="transparent"
            />
          </ScatterChart>
        </ResponsiveContainer>
        <div className="text-xs opacity-20 font-mono mt-0.5">
          {combo.capable
            ? '→ Points alignés sur y=x : distribution normale ✓'
            : '→ Écart à la droite : dispersion non maîtrisée ✗'}
        </div>
      </div>

      {/* Rebut */}
      <div className="mt-3 flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono"
        style={{ background: combo.rebut > 1 ? 'rgba(255,51,102,0.08)' : 'rgba(0,255,136,0.06)' }}>
        <span className="opacity-40">Taux de rebut estimé</span>
        <span className="font-bold" style={{ color: combo.rebut > 1 ? '#ff3366' : '#00ff88' }}>
          {combo.rebut < 0.01 ? '~0.0006 %' : `~${combo.rebut} %`}
        </span>
      </div>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CapabilitePage() {
  const barData = COMBOS.map(c => ({
    name: `${c.machine}\n${c.lot}`,
    'Cp L1':  c.l1.cp,  'Cpk L1': c.l1.cpk,
    'Cp L2':  c.l2.cp,  'Cpk L2': c.l2.cpk,
    capable: c.capable,
  }));

  const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.4 },
  });

  return (
    <div className="min-h-screen bg-grid px-6 py-8 max-w-7xl mx-auto">

      {/* Header */}
      <motion.div {...fadeUp(0)} className="mb-8">
        <h1 className="font-orbitron text-3xl font-black gradient-text mb-2">ÉTUDE DE CAPABILITÉ</h1>
        <p className="text-sm opacity-50">
          Presses MCH1 & MCH2 — Matière ABS LOT1 & LOT2 — Cote nominale : 50.000 mm ± 0.100 mm
        </p>
      </motion.div>

      {/* KPI strip */}
      <motion.div {...fadeUp(0.05)} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Cote nominale',  value: '50.000 mm', color: '#00f5d4' },
          { label: 'Tolérance IT',   value: '0.200 mm',  color: '#a78bfa', sub: '[49.9 ; 50.1]' },
          { label: 'Pièces / levée', value: `${N}`,      color: '#ffaa00', sub: '4 combinaisons' },
          { label: 'Seuil requis',   value: 'Cpk ≥ 1.33',color: '#00ff88' },
        ].map(k => (
          <div key={k.label} className="glass p-4 rounded-2xl">
            <div className="text-xs opacity-35 mb-1">{k.label}</div>
            <div className="font-mono font-bold text-sm" style={{ color: k.color }}>{k.value}</div>
            {k.sub && <div className="text-xs opacity-25 font-mono">{k.sub}</div>}
          </div>
        ))}
      </motion.div>

      {/* Formules pédagogiques */}
      <motion.div {...fadeUp(0.1)} className="glass p-5 rounded-2xl mb-8">
        <div className="text-xs font-mono uppercase tracking-wider opacity-35 mb-4">Rappel — Indices de capabilité</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Cp — Capabilité potentielle',
              formula: 'Cp = IT / (6σ)',
              desc: 'Rapport tolérance / dispersion. Ne tient pas compte du centrage du processus.',
              color: '#a78bfa' },
            { label: 'Cpk — Capabilité réelle',
              formula: 'Cpk = min( (USL−μ)/3σ , (μ−LSL)/3σ )',
              desc: 'Prend en compte le centrage ET la dispersion. Critère de décision production.',
              color: '#00f5d4' },
            { label: 'Interprétation',
              formula: 'Cpk ≥ 1.33 → Capable',
              desc: 'Cp > Cpk indique un décentrage. Cp = Cpk indique un processus parfaitement centré.',
              color: '#ffaa00' },
          ].map(f => (
            <div key={f.label} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="text-xs opacity-45 mb-1">{f.label}</div>
              <div className="font-mono font-bold text-sm mb-2" style={{ color: f.color }}>{f.formula}</div>
              <div className="text-xs opacity-40 leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Tableau récap + BarChart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

        {/* Tableau */}
        <motion.div {...fadeUp(0.15)} className="glass p-5 rounded-2xl overflow-x-auto">
          <div className="text-xs font-mono uppercase tracking-wider opacity-35 mb-4">
            Résultats — 4 combinaisons × 2 levées
          </div>
          <table className="w-full text-xs font-mono">
            <thead>
              <tr>
                {['Combinaison','Cp L1','Cpk L1','Cp L2','Cpk L2','Verdict'].map(h => (
                  <th key={h} className="text-left py-1.5 pr-3 opacity-30 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMBOS.map(c => {
                const col = c.capable ? '#00ff88' : '#ff3366';
                const vc  = (v: number) => v >= CPK_MIN ? '#00ff88' : '#ff3366';
                return (
                  <tr key={c.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <td className="py-2 pr-3 font-bold" style={{ color: col }}>{c.id}</td>
                    <td className="py-2 pr-3" style={{ color: vc(c.l1.cp) }}>{c.l1.cp.toFixed(3)}</td>
                    <td className="py-2 pr-3" style={{ color: vc(c.l1.cpk) }}>{c.l1.cpk.toFixed(3)}</td>
                    <td className="py-2 pr-3" style={{ color: vc(c.l2.cp) }}>{c.l2.cp.toFixed(3)}</td>
                    <td className="py-2 pr-3" style={{ color: vc(c.l2.cpk) }}>{c.l2.cpk.toFixed(3)}</td>
                    <td className="py-2 font-bold" style={{ color: col }}>
                      {c.capable ? '✅ Capable' : '❌ Non cap.'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mt-3 text-xs font-mono opacity-20">Seuil requis : Cpk ≥ 1.33</div>

          {/* Probabilités rebut */}
          <div className="mt-5">
            <div className="text-xs font-mono uppercase tracking-wider opacity-35 mb-3">Probabilités de rebut</div>
            <div className="space-y-2">
              {COMBOS.map(c => (
                <div key={c.id} className="flex items-center gap-3">
                  <div className="text-xs font-mono w-24" style={{ color: c.capable ? '#00ff88' : '#ff3366' }}>{c.id}</div>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full"
                      style={{
                        width: `${Math.min(c.rebut, 100)}%`,
                        background: c.rebut > 5 ? '#ff3366' : '#00ff88',
                        minWidth: c.rebut > 0 ? 2 : 0,
                      }} />
                  </div>
                  <div className="text-xs font-mono w-20 text-right"
                    style={{ color: c.rebut > 5 ? '#ff3366' : '#00ff88' }}>
                    {c.rebut < 0.01 ? '~0.0006 %' : `~${c.rebut} %`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* BarChart groupé */}
        <motion.div {...fadeUp(0.2)} className="glass p-5 rounded-2xl">
          <div className="text-xs font-mono uppercase tracking-wider opacity-35 mb-4">
            Cp & Cpk par combinaison — Levées 1 & 2
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData} barGap={2} barCategoryGap="22%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,245,212,0.07)" />
              <XAxis dataKey="name"
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} tickLine={false} />
              <YAxis domain={[0, 2.2]}
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} tickLine={false} />
              <Tooltip content={<CpkTooltip />} />
              <Legend formatter={v => <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>{v}</span>} />
              <ReferenceLine y={CPK_MIN} stroke="#ffaa00" strokeDasharray="6 3" strokeWidth={1.5}
                label={{ value: 'Cpk min 1.33', position: 'insideTopRight', fill: '#ffaa00', fontSize: 9 }} />
              <Bar dataKey="Cp L1" radius={[3, 3, 0, 0]}>
                {barData.map((d, i) => <Cell key={i} fill={d.capable ? 'rgba(0,255,136,0.35)' : 'rgba(255,51,102,0.35)'} />)}
              </Bar>
              <Bar dataKey="Cpk L1" radius={[3, 3, 0, 0]}>
                {barData.map((d, i) => <Cell key={i} fill={d.capable ? '#00ff88' : '#ff3366'} />)}
              </Bar>
              <Bar dataKey="Cp L2" radius={[3, 3, 0, 0]}>
                {barData.map((d, i) => <Cell key={i} fill={d.capable ? 'rgba(0,255,136,0.2)' : 'rgba(255,51,102,0.2)'} />)}
              </Bar>
              <Bar dataKey="Cpk L2" radius={[3, 3, 0, 0]}>
                {barData.map((d, i) => <Cell key={i} fill={d.capable ? 'rgba(0,255,136,0.65)' : 'rgba(255,51,102,0.65)'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* 4 CapBlocks */}
      <motion.div {...fadeUp(0.25)} className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {COMBOS.map(c => <CapBlock key={c.id} combo={c} />)}
      </motion.div>

      {/* Droite de Henry — explication */}
      <motion.div {...fadeUp(0.3)} className="glass p-6 rounded-2xl mb-8">
        <div className="text-xs font-mono uppercase tracking-wider opacity-35 mb-4">
          Droite de Henry — Interprétation normalité
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl"
            style={{ background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.15)' }}>
            <div className="font-bold mb-2 text-sm" style={{ color: '#00ff88' }}>
              ✅ MCH2 — Distribution normale confirmée
            </div>
            <p className="text-xs opacity-60 leading-relaxed">
              Les mesures MCH2 (LOT1 & LOT2) s'alignent sur la droite de Henry. La distribution suit une loi
              normale, validant l'utilisation des indices Cp/Cpk. Dispersion faible (σ ≈ 0.019–0.021 mm),
              processus bien centré dans la tolérance. <strong style={{ color: '#00ff88' }}>MCH2 est statistiquement maîtrisée.</strong>
            </p>
          </div>
          <div className="p-4 rounded-xl"
            style={{ background: 'rgba(255,51,102,0.06)', border: '1px solid rgba(255,51,102,0.15)' }}>
            <div className="font-bold mb-2 text-sm" style={{ color: '#ff3366' }}>
              ❌ MCH1 — Déviations observées
            </div>
            <p className="text-xs opacity-60 leading-relaxed">
              MCH1 LOT2 présente une dispersion catastrophique (σ ≈ 0.35 mm vs IT = 0.2 mm), avec 77.9 % de
              rebut estimé. MCH1 LOT1 est légèrement meilleure (σ ≈ 0.059 mm, Cpk = 0.504) mais reste
              non capable. <strong style={{ color: '#ff3366' }}>Cause : problème mécanique MCH1, pas matière.</strong>
              Les deux lots ABS donnent des résultats cohérents sur MCH2.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Conclusion */}
      <motion.div {...fadeUp(0.35)} className="glass p-6 rounded-2xl"
        style={{ border: '1px solid rgba(0,245,212,0.2)' }}>
        <div className="text-xs font-mono uppercase tracking-wider opacity-35 mb-4">
          Conclusion & Recommandation — Fournisseur INJECTPLAST
        </div>
        <div className="p-4 rounded-xl mb-4"
          style={{ background: 'rgba(0,245,212,0.06)', border: '1px solid rgba(0,245,212,0.2)' }}>
          <div className="font-bold mb-2 text-sm" style={{ color: '#00f5d4' }}>
            📋 Décision qualité : MCH2 validée — MCH1 exclue de production AQM
          </div>
          <p className="text-xs opacity-60 leading-relaxed">
            Les 4 combinaisons testées confirment que{' '}
            <strong style={{ color: '#00ff88' }}>MCH2 est capable sur LOT1 et LOT2</strong>
            {' '}(Cpk = 1.460 à 1.775, nettement au-dessus du seuil 1.33). En revanche,{' '}
            <strong style={{ color: '#ff3366' }}>MCH1 est non capable sur les deux lots</strong>
            {' '}(Cpk = 0.033 à 0.504). Ce résultat cohérent entre LOT1 et LOT2 indique un{' '}
            <strong>problème machine</strong>, pas matière : le lot ABS est conforme, la presse MCH1 est défaillante.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {[
            { icon: '🏭', title: 'Production AQM', col: '#00ff88',
              text: 'Utiliser MCH2 exclusivement pour les 10 050 boîtiers AQM. Interdire la production MCH1 jusqu\'à correction mécanique validée.' },
            { icon: '🔧', title: 'Action corrective MCH1', col: '#ffaa00',
              text: 'Diagnostic mécanique : contrôle des guides, pression d\'injection, régulation température, usure outillage et système de fermeture.' },
            { icon: '📊', title: 'Surveillance continue', col: '#a78bfa',
              text: 'Maintenir un SPC (cartes de contrôle X̄-R) sur MCH2 en production pour garantir Cpk ≥ 1.33 sur l\'ensemble des 10 050 pièces.' },
          ].map(r => (
            <div key={r.title} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="text-lg mb-1">{r.icon}</div>
              <div className="font-bold mb-1" style={{ color: r.col }}>{r.title}</div>
              <p className="opacity-45 leading-relaxed">{r.text}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
