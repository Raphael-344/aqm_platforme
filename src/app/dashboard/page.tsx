'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend, Cell,
  PieChart, Pie,
} from 'recharts';

// ── Données (inchangées) ───────────────────────────────────────────────────────

const PROD = {
  dispositifs: 127_383, pays: 21, taktTime: 164, cadenceReelle: 130,
  postes: 3, dureeProd: 57, heuresPlanifiees: 373,
  qteFabriquee: 10_050, stockSecurite: 50, livraisonClient: 10_000,
};

const FIN = {
  coutComposants: 24.97, coutMO: 1.89, coutRevient: 39.92,
  prixVente: 49.90, margeBruteUnit: 9.98, tauxMarge: 25,
  caTotal: 499_000, margeBruteTotale: 99_800, coutStructure: 141_833,
};

const QUAL = [
  { id: 'MCH2 LOT1', cp: 1.56, cpk: 1.46, capable: true  },
  { id: 'MCH2 LOT2', cp: 1.76, cpk: 1.46, capable: true  },
  { id: 'MCH1 LOT1', cp: 0.56, cpk: 0.50, capable: false },
  { id: 'MCH1 LOT2', cp: 0.10, cpk: 0.03, capable: false },
];

const CPK_SEUIL = 1.33;

const COUT_PIE = [
  { name: 'Composants',    value: 62, color: '#f59e0b', montant: FIN.coutComposants },
  { name: "Main d'œuvre",  value: 5,  color: '#8b5cf6', montant: FIN.coutMO        },
  { name: 'Structure',     value: 33, color: '#06b6d4', montant: 13.06              },
];

const PLANNING = [
  { semaine: 'S37', target: 400,  livree: 400  },
  { semaine: 'S38', target: 600,  livree: 600  },
  { semaine: 'S39', target: 700,  livree: 700  },
  { semaine: 'S40', target: 780,  livree: 780  },
  { semaine: 'S41', target: 780,  livree: 780  },
  { semaine: 'S42', target: 780,  livree: 780  },
  { semaine: 'S43', target: 780,  livree: 780  },
  { semaine: 'S44', target: 780,  livree: 780  },
  { semaine: 'S45', target: 780,  livree: 780  },
  { semaine: 'S46', target: 780,  livree: 780  },
  { semaine: 'S47', target: 780,  livree: 780  },
  { semaine: 'S48', target: 780,  livree: 780  },
  { semaine: 'S49', target: 450,  livree: 450  },
  { semaine: 'S50', target: 450,  livree: 450  },
  { semaine: 'S51', target: 430,  livree: 430  },
];

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  // surfaces
  bg:     '#0f172a',
  card:   '#1e293b',
  border: '#334155',
  muted:  '#475569',
  // text
  text:   '#f1f5f9',
  label:  '#94a3b8',
  faint:  '#64748b',
  // accents par section
  cyan:   '#06b6d4',   // production + planning
  green:  '#10b981',   // finance
  amber:  '#f59e0b',   // qualité
  // états
  ok:     '#10b981',
  ko:     '#ef4444',
};

const TOOLTIP_STYLE = {
  background: C.card, border: `1px solid ${C.border}`,
  borderRadius: 8, fontSize: 12, color: C.text,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n);

function fadeUp(delay = 0) {
  return { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.35 } };
}

/** Conteneur card avec bordure gauche colorée */
function cardStyle(accent: string): React.CSSProperties {
  return {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderLeft: `4px solid ${accent}`,
    borderRadius: 12,
  };
}

function panelStyle(): React.CSSProperties {
  return { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12 };
}

// ── Composants ────────────────────────────────────────────────────────────────

function SectionTitle({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-1 h-5 rounded-full flex-shrink-0" style={{ background: accent }} />
      <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.label }}>
        {children}
      </span>
    </div>
  );
}

function KPICard({
  label, value, unit, sub, icon, accent,
}: {
  label: string; value: string | number; unit?: string;
  sub?: string; icon?: string; accent: string;
}) {
  return (
    <div style={cardStyle(accent)} className="p-4">
      {icon && (
        <div className="text-base mb-2" style={{ color: accent }}>{icon}</div>
      )}
      <div className="text-xs uppercase tracking-wide font-medium mb-1.5"
        style={{ color: C.label }}>{label}</div>
      <div className="text-2xl font-bold leading-none" style={{ color: C.text }}>
        {typeof value === 'number' ? fmt(value) : value}
        {unit && <span className="text-sm font-normal ml-1" style={{ color: C.label }}>{unit}</span>}
      </div>
      {sub && <div className="text-xs mt-1.5" style={{ color: C.faint }}>{sub}</div>}
    </div>
  );
}

function QualBadge({ label, cp, cpk, capable }: { label: string; cp: number; cpk: number; capable: boolean }) {
  const accent = capable ? C.ok : C.ko;
  return (
    <div style={cardStyle(accent)} className="p-4 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-xs font-mono font-semibold mb-1" style={{ color: C.text }}>{label}</div>
        <div className="flex gap-4 text-xs font-mono" style={{ color: C.label }}>
          <span>Cp <span className="font-bold" style={{ color: accent }}>{cp.toFixed(2)}</span></span>
          <span>Cpk <span className="font-bold" style={{ color: accent }}>{cpk.toFixed(2)}</span></span>
        </div>
      </div>
      <div className="text-base flex-shrink-0">{capable ? '✅' : '❌'}</div>
    </div>
  );
}

function LiveChip({ loading, value, label, icon }: {
  loading: boolean; value: string; label: string; icon: string;
}) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
      style={{ background: C.card, border: `1px solid ${C.border}` }}>
      <span className="text-base">{icon}</span>
      <div>
        <div className="text-xs uppercase tracking-wide font-medium" style={{ color: C.faint }}>
          {label}
        </div>
        {loading ? (
          <div className="mt-0.5 h-4 w-20 rounded animate-pulse" style={{ background: C.border }} />
        ) : (
          <div className="font-mono font-semibold text-sm" style={{ color: C.text }}>{value}</div>
        )}
      </div>
    </div>
  );
}

// ── Pie label ─────────────────────────────────────────────────────────────────
interface PieLabelProps {
  cx?: number; cy?: number; midAngle?: number;
  innerRadius?: number; outerRadius?: number; value?: number;
}
function PieLabel({ cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, value = 0 }: PieLabelProps) {
  if (value < 8) return null;
  const R = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  return (
    <text x={cx + r * Math.cos(-midAngle * R)} y={cy + r * Math.sin(-midAngle * R)}
      fill={C.text} textAnchor="middle" dominantBaseline="central"
      fontSize={11} fontFamily="ui-monospace, monospace" fontWeight={600}>
      {`${value}%`}
    </text>
  );
}

// ── Cpk tooltip ───────────────────────────────────────────────────────────────
function CpkTooltip({ active, payload, label }: {
  active?: boolean; payload?: Array<{ name: string; value: number }>; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TOOLTIP_STYLE} className="p-3">
      <div className="font-semibold mb-2 text-xs uppercase tracking-wide"
        style={{ color: C.amber }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} className="flex justify-between gap-6 text-xs">
          <span style={{ color: C.label }}>{p.name}</span>
          <span className="font-mono font-bold"
            style={{ color: p.value >= CPK_SEUIL ? C.ok : C.ko }}>{p.value.toFixed(2)}</span>
        </div>
      ))}
      <div className="mt-1.5 text-xs" style={{ color: C.faint }}>Seuil requis Cpk ≥ {CPK_SEUIL}</div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
interface LiveStats { alertesCount: number; actifsCount: number; totalDispositifs: number }

export default function DashboardPage() {
  const [live, setLive] = useState<LiveStats | null>(null);
  const [liveLoading, setLiveLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10_000);
    fetch('/api/stats', { signal: ctrl.signal })
      .then(r => (r.ok ? r.json() : Promise.reject(r)))
      .then(setLive)
      .catch(() => setLive({ alertesCount: 0, actifsCount: 0, totalDispositifs: 0 }))
      .finally(() => { clearTimeout(t); setLiveLoading(false); });
    return () => { ctrl.abort(); clearTimeout(t); };
  }, []);

  return (
    <div className="min-h-screen bg-grid px-6 py-8 max-w-7xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <motion.div {...fadeUp(0)} className="mb-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <span className="text-xs font-mono font-medium px-2.5 py-1 rounded"
                style={{ background: 'rgba(6,182,212,0.1)', border: `1px solid rgba(6,182,212,0.25)`, color: C.cyan }}>
                SMART_IO × NOSE
              </span>
              <span className="text-xs font-mono" style={{ color: C.faint }}>Confidentiel</span>
            </div>
            <h1 className="font-orbitron text-3xl font-black gradient-text mb-1">
              DASHBOARD EXÉCUTIF — PROJET AQM
            </h1>
            <p className="text-sm" style={{ color: C.label }}>
              À l'attention de Kévin Ashton, CEO SMART_IO
              {' · '}{new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.ok }} />
            <span className="text-xs font-mono font-medium" style={{ color: C.ok }}>Projet terminé</span>
          </div>
        </div>
      </motion.div>

      {/* ── Plateforme live ─────────────────────────────────────────────────── */}
      <motion.div {...fadeUp(0.05)} className="flex flex-wrap items-center gap-3 mb-8 p-4 rounded-xl"
        style={panelStyle()}>
        <span className="text-xs uppercase tracking-widest font-medium mr-1" style={{ color: C.faint }}>
          Plateforme · données simulées ·
        </span>
        <LiveChip loading={liveLoading} icon="🌍"
          value={live ? fmt(live.totalDispositifs) : '0'}
          label="Capteurs connectés" />
        <LiveChip loading={liveLoading} icon="⚠️"
          value={live ? fmt(live.alertesCount) : '0'}
          label="Alertes actives AQI > 150" />
        <LiveChip loading={liveLoading} icon="📡"
          value={live ? fmt(live.actifsCount) : '0'}
          label="Dispositifs actifs" />
      </motion.div>

      {/* ── Production ──────────────────────────────────────────────────────── */}
      <motion.div {...fadeUp(0.1)} className="mb-8">
        <SectionTitle accent={C.cyan}>Production</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <KPICard icon="🌍" accent={C.cyan} label="Dispositifs déployés"
            value={PROD.dispositifs} sub="1 par commune zone euro" />
          <KPICard icon="🗺️" accent={C.cyan} label="Pays couverts"
            value={PROD.pays} unit="pays" />
          <KPICard icon="⏱️" accent={C.cyan} label="Takt Time"
            value={`${PROD.taktTime} s`} sub="secondes / produit" />
          <KPICard icon="⚡" accent={C.cyan} label="Cadence réelle"
            value={`${PROD.cadenceReelle} s`} sub="poste goulot" />
          <KPICard icon="🔧" accent={C.cyan} label="Postes d'assemblage"
            value={PROD.postes} sub="ligne A3" />
          <KPICard icon="📅" accent={C.cyan} label="Durée production"
            value={PROD.dureeProd} unit="jours" sub="sept → déc" />
          <KPICard icon="⏰" accent={C.cyan} label="Heures planifiées"
            value={PROD.heuresPlanifiees} unit="h" />
          <KPICard icon="🏭" accent={C.cyan} label="Quantité fabriquée"
            value={PROD.qteFabriquee} unit="u." sub={`dont ${PROD.stockSecurite} stock sécu`} />
          <KPICard icon="🚚" accent={C.cyan} label="Livraison client"
            value={PROD.livraisonClient} unit="u." />
        </div>
      </motion.div>

      {/* ── Finance ─────────────────────────────────────────────────────────── */}
      <motion.div {...fadeUp(0.15)} className="mb-8">
        <SectionTitle accent={C.green}>Finance</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* KPI 3×3 */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <KPICard accent={C.green} label="Coût composants / u."
              value={`${FIN.coutComposants.toFixed(2)} €`}
              sub="Arduino + MAKESENSE + boîtier" />
            <KPICard accent={C.green} label="Coût MO / u."
              value={`${FIN.coutMO.toFixed(2)} €`}
              sub="main d'œuvre directe" />
            <KPICard accent={C.green} label="Coût de revient / u."
              value={`${FIN.coutRevient.toFixed(2)} €`}
              sub="composants + MO + structure" />
            <KPICard accent={C.green} label="Prix de vente HT / u."
              value={`${FIN.prixVente.toFixed(2)} €`}
              sub="39,92 × 1,25 — réf. PDF p.21" />
            <KPICard accent={C.green} label="Marge brute / u."
              value={`${FIN.margeBruteUnit.toFixed(2)} €`}
              sub={`Taux : ${FIN.tauxMarge} %`} />
            <KPICard accent={C.green} label="Coût structure A3"
              value={fmt(FIN.coutStructure)} unit="€" sub="ligne complète" />
            <KPICard accent={C.green} label="Chiffre d'affaires"
              value={fmt(FIN.caTotal)} unit="€"
              sub={`${PROD.livraisonClient.toLocaleString('fr-FR')} × ${FIN.prixVente} €`} />
            <KPICard accent={C.green} label="Marge brute totale"
              value={fmt(FIN.margeBruteTotale)} unit="€"
              sub={`${FIN.tauxMarge} % du CA`} />
            <KPICard accent={C.green} label="Taux de marge"
              value={`${FIN.tauxMarge} %`}
              sub="marge / coût de revient" />
          </div>

          {/* Donut */}
          <div style={{ ...panelStyle(), borderLeft: `4px solid ${C.green}` }} className="p-5 flex flex-col">
            <div className="text-xs uppercase tracking-wider font-medium mb-4" style={{ color: C.label }}>
              Répartition coût de revient/u. ({FIN.coutRevient} €)
            </div>
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie data={COUT_PIE} cx="50%" cy="50%" innerRadius={52} outerRadius={85}
                  dataKey="value" labelLine={false} label={<PieLabel />}>
                  {COUT_PIE.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip
                  formatter={(v: number, name: string) => {
                    const item = COUT_PIE.find(d => d.name === name);
                    return [`${v}% — ${item?.montant.toFixed(2)} €/u.`, name];
                  }}
                  contentStyle={TOOLTIP_STYLE}
                  itemStyle={{ color: C.label }} labelStyle={{ color: C.text }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 space-y-2">
              {COUT_PIE.map(d => (
                <div key={d.name} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                  <span className="flex-1" style={{ color: C.label }}>{d.name}</span>
                  <span className="font-mono font-bold" style={{ color: C.text }}>{d.value} %</span>
                  <span className="font-mono" style={{ color: C.faint }}>{d.montant.toFixed(2)} €</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Qualité ──────────────────────────────────────────────────────────── */}
      <motion.div {...fadeUp(0.2)} className="mb-8">
        <SectionTitle accent={C.amber}>Qualité — Capabilité processus</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* BarChart */}
          <div style={{ ...panelStyle(), borderLeft: `4px solid ${C.amber}` }} className="p-5">
            <div className="text-xs uppercase tracking-wider font-medium mb-1" style={{ color: C.label }}>
              Indices Cp / Cpk — machine × lot
            </div>
            <div className="text-xs mb-4 font-mono" style={{ color: C.faint }}>
              Seuil requis : Cpk ≥{' '}
              <span style={{ color: C.amber }}>{CPK_SEUIL}</span>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={QUAL} barGap={4} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="id"
                  tick={{ fill: C.label, fontSize: 10 }} tickLine={false} axisLine={{ stroke: C.border }} />
                <YAxis domain={[0, 2.2]}
                  tick={{ fill: C.label, fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CpkTooltip />} />
                <Legend formatter={v => (
                  <span style={{ color: C.label, fontSize: 11 }}>{v}</span>
                )} />
                <ReferenceLine y={CPK_SEUIL} stroke={C.amber} strokeDasharray="6 3" strokeWidth={1.5}
                  label={{ value: `Cpk min ${CPK_SEUIL}`, position: 'insideTopRight', fill: C.amber, fontSize: 9 }} />
                <Bar dataKey="cp" name="Cp" radius={[3, 3, 0, 0]}>
                  {QUAL.map((e, i) => (
                    <Cell key={i} fill={e.capable ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'} />
                  ))}
                </Bar>
                <Bar dataKey="cpk" name="Cpk" radius={[3, 3, 0, 0]}>
                  {QUAL.map((e, i) => (
                    <Cell key={i} fill={e.capable ? C.ok : C.ko} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Cards synthèse */}
          <div className="flex flex-col gap-3">
            {QUAL.map(q => (
              <QualBadge key={q.id} label={q.id} cp={q.cp} cpk={q.cpk} capable={q.capable} />
            ))}
            <div style={panelStyle()} className="p-4">
              <div className="text-xs uppercase tracking-wider font-medium mb-2" style={{ color: C.label }}>Synthèse</div>
              <div className="flex gap-6 text-sm mb-2">
                <div>
                  <span className="font-bold font-mono" style={{ color: C.ok }}>2/4</span>
                  <span className="text-xs ml-1" style={{ color: C.label }}>capables (MCH2)</span>
                </div>
                <div>
                  <span className="font-bold font-mono" style={{ color: C.ko }}>2/4</span>
                  <span className="text-xs ml-1" style={{ color: C.label }}>non capables (MCH1)</span>
                </div>
              </div>
              <div className="text-xs font-mono" style={{ color: C.faint }}>
                Action corrective requise sur MCH1 — axe d'amélioration prioritaire
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Planning S37 → S51 ──────────────────────────────────────────────── */}
      <motion.div {...fadeUp(0.25)} className="mb-8">
        <SectionTitle accent={C.cyan}>Planning production — Semaines 37 à 51</SectionTitle>
        <div style={{ ...panelStyle(), borderLeft: `4px solid ${C.cyan}` }} className="p-6">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div>
              <div className="text-xs uppercase tracking-wider font-medium mb-1" style={{ color: C.label }}>
                Cadence hebdomadaire — objectif vs réalisé
              </div>
              <div className="text-xs font-mono" style={{ color: C.faint }}>
                Total produit :{' '}
                <span style={{ color: C.ok }}>{fmt(PROD.qteFabriquee)} u.</span>
                {' · '}Livraison :{' '}
                <span style={{ color: C.cyan }}>{fmt(PROD.livraisonClient)} u.</span>
                {' · '}Stock sécu :{' '}
                <span style={{ color: C.amber }}>{PROD.stockSecurite} u.</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs" style={{ color: C.label }}>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded" style={{ background: C.ok }} />Réalisé
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded" style={{ background: C.border }} />Objectif
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={PLANNING} barGap={2} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="semaine"
                tick={{ fill: C.label, fontSize: 9 }} tickLine={false} axisLine={{ stroke: C.border }} />
              <YAxis
                tick={{ fill: C.label, fontSize: 9 }} tickLine={false} axisLine={false} width={36} />
              <Tooltip
                formatter={(v: number, name: string) => [
                  `${fmt(v)} u.`,
                  name === 'target' ? 'Objectif' : 'Réalisé',
                ]}
                contentStyle={TOOLTIP_STYLE}
                labelStyle={{ color: C.cyan }} itemStyle={{ color: C.label }} />
              <Bar dataKey="target" name="target" fill={C.border} radius={[3, 3, 0, 0]} />
              <Bar dataKey="livree" name="livree" radius={[3, 3, 0, 0]}>
                {PLANNING.map((p, i) => (
                  <Cell key={i} fill={p.livree >= p.target ? C.ok : p.livree > 0 ? C.amber : C.muted} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <motion.div {...fadeUp(0.3)} className="text-center text-xs pb-4 font-mono"
        style={{ color: C.faint }}>
        AQM Platform · NOSE × SMART_IO · Document confidentiel · {new Date().getFullYear()}
      </motion.div>
    </div>
  );
}
