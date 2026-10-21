'use client';

import { motion } from 'framer-motion';

// ── Données ───────────────────────────────────────────────────────────────────

const TEAM = [
  { nom: 'MOSBAH',            prenom: 'Ilian'         },
  { nom: 'RIVES',             prenom: 'Pierre-Elyan'  },
  { nom: 'TROSZCZYNSKI',      prenom: 'Loris'         },
  { nom: 'KNIEFELD-LOINTIER', prenom: 'Grégoire'      },
  { nom: 'GASPARIN',          prenom: 'Raphael'       },
];

const TIMELINE = [
  { phase: '01', title: 'Démarrage production',       date: 'Sem. 37 — Septembre',
    desc: 'Lancement sur presse MCH2 (Cpk = 1.46 ✅). MCH1 exclue après étude capabilité (Cpk < 0.50 ❌).', color: '#00f5d4' },
  { phase: '02', title: 'Production boîtiers AQM',    date: 'S37 → S51 — 57 jours',
    desc: '10 050 boîtiers ABS fabriqués. 3 postes d\'assemblage, Takt Time 164 s/produit, cadence réelle 130 s (goulot).', color: '#a78bfa' },
  { phase: '03', title: 'Développement plateforme',   date: 'Octobre — Novembre',
    desc: 'Dashboard Next.js 14, 9 bases PostgreSQL Neon distribuées, routes API, app Flutter iOS/Android.', color: '#ffaa00' },
  { phase: '04', title: 'Déploiement zone euro',       date: 'Novembre — Décembre',
    desc: '127 383 capteurs simulés — 1 par commune, 21 pays. 20.8 M de relevés. Relevés horaires + journaliers (90 j).', color: '#00ff88' },
  { phase: '05', title: 'Livraison & go-live',         date: 'Décembre',
    desc: '10 000 unités livrées au client (NOSE). CA = 607 500 €. Plateforme de monitoring opérationnelle 24/7.', color: '#00f5d4' },
];

const STACK = [
  { cat: 'Frontend',        items: ['Next.js 14', 'TypeScript', 'Tailwind CSS', 'Framer Motion'], col: '#00f5d4' },
  { cat: 'Visualisation',   items: ['Deck.gl / Globe 3D', 'Recharts', 'Leaflet.js'],              col: '#a78bfa' },
  { cat: 'Backend / API',   items: ['Next.js API Routes', 'Prisma ORM', 'PostgreSQL Neon.tech'],   col: '#ffaa00' },
  { cat: 'IoT / Réseau',    items: ['Arduino MKRFox 1200', 'MAKESENSE©', 'SIGFOX 0G'],             col: '#00f5d4' },
  { cat: 'Intelligence IA', items: ['Groq API', 'openai/gpt-oss-120b'],                col: '#ff7e00' },
  { cat: 'Mobile',          items: ['Flutter 3.x', 'fl_chart', 'flutter_map'],                    col: '#00ff88' },
  { cat: 'Déploiement',     items: ['Vercel', 'Neon.tech (×9 BDD)', 'GitHub'],                    col: '#38bdf8' },
];

const ARCH = [
  { icon: '📡', label: 'Capteur AQM', sub: 'Arduino MKRFox 1200 + MAKESENSE©\nIP66 · autonomie 12 mois · boîtier 220×100×45 mm', col: '#00f5d4' },
  { arrow: 'SIGFOX · toutes les heures' },
  { icon: '🌐', label: 'SIGFOX Cloud', sub: 'Webhook HTTP POST — JSON payload\nAQI + PM2.5 + PM10 + NO2 + O3 + CO', col: '#a78bfa' },
  { arrow: 'INSERT via Prisma ORM' },
  { icon: '⚡', label: 'API Next.js', sub: 'Vercel Edge · Routes /api/*\n→ 9 bases PostgreSQL Neon distribuées', col: '#ffaa00' },
  { arrow: 'SELECT / agrégations' },
  { icon: '🗄️', label: 'PostgreSQL × 9', sub: 'Neon.tech · 20.8 M relevés\nReleveHeure (3 j) + ReleveJour (90 j)', col: '#00ff88' },
  { arrow: 'REST API / WebSocket' },
  { icon: '🖥️', label: 'Dashboard Web', sub: 'Next.js 14 · Deck.gl · Recharts · Framer Motion\nCarte 3D · Graphiques · Dashboard CEO · IA', col: '#00f5d4' },
  { plus: true },
  { icon: '📱', label: 'App Flutter', sub: 'iOS & Android\nHTTP → /api/* · fl_chart · flutter_map', col: '#00ff88' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function hexRgb(hex: string): string {
  if (!hex.startsWith('#')) return '255,255,255';
  return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(',');
}

function fade(delay = 0) {
  return { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.4 } };
}

function Badge({ text, col = '#00f5d4' }: { text: string; col?: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono"
      style={{ background: `rgba(${hexRgb(col)},0.08)`, border: `1px solid rgba(${hexRgb(col)},0.22)`, color: col }}>
      {text}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  const TEAM_COLORS = ['#00f5d4', '#00ff88', '#a78bfa', '#ffaa00', '#fb923c'];

  return (
    <div className="min-h-screen bg-grid px-6 py-8 max-w-6xl mx-auto">

      {/* Header */}
      <motion.div {...fade(0)} className="mb-10">
        <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full text-xs font-mono"
          style={{ background: 'rgba(0,245,212,0.07)', border: '1px solid rgba(0,245,212,0.18)', color: '#00f5d4' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          Groupe 7 · Cycle Préparatoire Ingénieur (CPI) · SMART_IO × NOSE
        </div>
        <h1 className="font-orbitron text-3xl font-black gradient-text mb-2">◎ À PROPOS</h1>
        <p className="text-sm opacity-50 max-w-2xl leading-relaxed">
          Déploiement de 127 383 capteurs de qualité de l'air sur l'ensemble des communes
          de la zone euro (21 pays). Capteur MAKESENSE© + Arduino MKRFox 1200 + réseau SIGFOX.
        </p>
      </motion.div>

      {/* Description projet */}
      <motion.div {...fade(0.05)} className="glass p-6 rounded-2xl mb-8">
        <div className="flex items-start gap-4 mb-4">
          <div className="text-4xl select-none">🌍</div>
          <div>
            <h2 className="font-orbitron font-bold text-lg mb-2" style={{ color: '#00f5d4' }}>
              Dispositif AQM — Air Quality Monitor
            </h2>
            <p className="text-sm opacity-60 leading-relaxed">
              Le capteur MAKESENSE© couplé à un Arduino MKRFox 1200 transmet toutes les heures
              via le réseau SIGFOX (0G). Autonomie 12 mois sur batterie. Étanchéité IP66.
              Boîtier ABS 220×100×45 mm (couvercle CSUP + fond CINF).
              Mesures : PM2.5, PM10, NO2, O3, CO, AQI calculé selon norme OMS.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {['SIGFOX 0G', 'IP66', 'Autonomie 12 mois', '127 383 communes', '21 pays euro', 'Toutes les heures'].map(t => (
            <Badge key={t} text={t} />
          ))}
        </div>
      </motion.div>

      {/* KPIs */}
      <motion.div {...fade(0.1)} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {[
          { value: '127 383', unit: 'capteurs',    label: 'Dispositifs déployés', col: '#00f5d4' },
          { value: '21',      unit: 'pays',         label: 'Zone euro complète',   col: '#a78bfa' },
          { value: '20,8 M',  unit: 'lignes BDD',  label: 'Relevés en base',      col: '#00ff88' },
          { value: '9',       unit: 'Neon.tech',   label: 'Bases PostgreSQL',     col: '#ffaa00' },
        ].map(k => (
          <div key={k.label} className="glass p-5 rounded-2xl text-center">
            <div className="font-orbitron font-black text-2xl mb-0.5" style={{ color: k.col }}>{k.value}</div>
            <div className="text-xs font-mono opacity-35">{k.unit}</div>
            <div className="text-xs opacity-55 mt-1">{k.label}</div>
          </div>
        ))}
      </motion.div>

      {/* NOSE × SMART_IO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <motion.div {...fade(0.15)} className="glass p-6 rounded-2xl">
          <div className="text-3xl mb-3">🏭</div>
          <h2 className="font-orbitron font-bold text-lg mb-2" style={{ color: '#00f5d4' }}>NOSE</h2>
          <p className="text-sm opacity-60 mb-4 leading-relaxed">
            Fabricant des boîtiers AQM. Responsable de la production physique sur presse MCH2
            (seule machine capable — Cpk = 1.46, MCH1 exclue).
          </p>
          <ul className="space-y-1.5 text-sm">
            {[
              '10 050 boîtiers fabriqués (50 stock sécu)',
              'Production S37 → S51 · 57 jours',
              'Matière : ABS LOT1 & LOT2',
              'Boîtier 220×100×45 mm · CSUP + CINF',
              'Coût de revient : 39,92 €/unité',
              'Prix de vente : 49,90 € HT',
            ].map(item => (
              <li key={item} className="flex items-start gap-2 opacity-65">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: '#00f5d4' }} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div {...fade(0.2)} className="glass p-6 rounded-2xl">
          <div className="text-3xl mb-3">💻</div>
          <h2 className="font-orbitron font-bold text-lg mb-2" style={{ color: '#00ff88' }}>SMART_IO</h2>
          <p className="text-sm opacity-60 mb-4 leading-relaxed">
            Plateforme logicielle et infrastructure IoT. Responsable de l'intégration SIGFOX,
            des bases de données distribuées et du dashboard de monitoring.
          </p>
          <ul className="space-y-1.5 text-sm">
            {[
              '127 383 dispositifs AQM simulés',
              '21 pays — zone euro intégrale',
              '9 bases PostgreSQL Neon distribuées',
              'Relevés horaires + journaliers 90 jours',
              'Dashboard Next.js 14 + app Flutter',
              'IA intégrée — LLM via Groq (GPT-OSS 120B)',
            ].map(item => (
              <li key={item} className="flex items-start gap-2 opacity-65">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: '#00ff88' }} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>

      {/* Équipe */}
      <motion.div {...fade(0.25)} className="mb-10">
        <div className="text-center mb-5">
          <div className="text-xs font-mono uppercase tracking-widest opacity-35">L'équipe — Groupe 7 · Cycle Préparatoire Ingénieur (CPI)</div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {TEAM.map(({ nom, prenom }, i) => {
            const col = TEAM_COLORS[i];
            const initials = (nom[0] + prenom[0]).toUpperCase();
            return (
              <motion.div
                key={nom}
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.25 + i * 0.06 }}
                className="glass p-5 rounded-2xl text-center"
              >
                <div className="w-11 h-11 rounded-full flex items-center justify-center mx-auto mb-3
                  font-orbitron font-bold text-sm select-none"
                  style={{
                    background: `rgba(${hexRgb(col)},0.12)`,
                    border: `2px solid rgba(${hexRgb(col)},0.4)`,
                    color: col,
                  }}>
                  {initials}
                </div>
                <div className="text-xs font-mono font-bold opacity-90 leading-tight tracking-wide"
                  style={{ wordBreak: 'break-word' }}>
                  {nom}
                </div>
                <div className="text-xs opacity-55 mt-0.5">{prenom}</div>
                <div className="text-xs opacity-25 font-mono mt-1">SMART_IO</div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Timeline */}
      <motion.div {...fade(0.3)} className="glass p-6 rounded-2xl mb-10">
        <h2 className="font-semibold mb-7 text-sm uppercase tracking-wider opacity-45">Déroulé du projet</h2>
        <div>
          {TIMELINE.map((step, i) => (
            <motion.div
              key={step.phase}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.07 }}
              className="flex gap-4"
            >
              {/* Spine */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-orbitron font-bold"
                  style={{
                    background: `rgba(${hexRgb(step.color)},0.12)`,
                    border: `2px solid rgba(${hexRgb(step.color)},0.4)`,
                    color: step.color,
                  }}>
                  {step.phase}
                </div>
                {i < TIMELINE.length - 1 && (
                  <div className="w-px flex-1 mt-1 mb-0" style={{ background: 'rgba(255,255,255,0.07)', minHeight: 28 }} />
                )}
              </div>

              {/* Content */}
              <div className={`flex-1 ${i < TIMELINE.length - 1 ? 'pb-6' : 'pb-0'}`}>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-sm">{step.title}</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full"
                    style={{ background: `rgba(${hexRgb(step.color)},0.1)`, color: step.color }}>
                    {step.date}
                  </span>
                </div>
                <p className="text-xs opacity-45 leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Données industrielles */}
      <motion.div {...fade(0.35)} className="glass p-6 rounded-2xl mb-10">
        <h2 className="font-semibold mb-5 text-sm uppercase tracking-wider opacity-45">Données industrielles</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Boîtier ABS',        value: '220×100×45 mm', col: '#00f5d4', sub: 'CSUP + CINF' },
            { label: 'Postes assemblage',   value: '3 postes',      col: '#a78bfa', sub: 'Ligne A3' },
            { label: 'Takt Time',           value: '164 s/produit', col: '#ffaa00', sub: 'Cadence 130s (goulot)' },
            { label: 'Qté fabriquée',       value: '10 050 u.',     col: '#00ff88', sub: 'dont 50 stock sécu' },
            { label: 'Coût de revient',     value: '39,92 €/u.',    col: '#ff7e00', sub: 'composants + MO + structure' },
            { label: 'Prix de vente HT',    value: '49,90 €/u.',    col: '#00f5d4', sub: 'marge 25 %' },
            { label: 'Coût structure A3',   value: '141 833 €',     col: '#fb923c', sub: 'ligne complète' },
            { label: 'Livraison client',    value: '10 000 u.',     col: '#a78bfa', sub: 'CA : 607 500 €' },
          ].map(k => (
            <div key={k.label} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="text-xs opacity-30 mb-1">{k.label}</div>
              <div className="font-mono font-bold text-sm" style={{ color: k.col }}>{k.value}</div>
              {k.sub && <div className="text-xs opacity-25 font-mono mt-0.5">{k.sub}</div>}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Architecture */}
      <motion.div {...fade(0.4)} className="glass p-6 rounded-2xl mb-10">
        <h2 className="font-semibold mb-6 text-sm uppercase tracking-wider opacity-45">Architecture technique</h2>
        <div className="flex flex-col items-center gap-1">
          {ARCH.map((step, i) => {
            if ('arrow' in step) {
              return (
                <div key={i} className="flex flex-col items-center py-0.5">
                  <div className="text-xl opacity-20">↓</div>
                  <div className="text-xs font-mono opacity-30 text-center">{step.arrow}</div>
                </div>
              );
            }
            if ('plus' in step) {
              return <div key={i} className="text-xl opacity-15 py-1">+</div>;
            }
            return (
              <div key={i} className="flex items-center gap-4 w-full max-w-lg px-5 py-3.5 rounded-xl"
                style={{
                  background: `rgba(${hexRgb(step.col!)},0.06)`,
                  border: `1px solid rgba(${hexRgb(step.col!)},0.16)`,
                }}>
                <div className="text-2xl flex-shrink-0 select-none">{step.icon}</div>
                <div>
                  <div className="font-bold text-sm" style={{ color: step.col }}>{step.label}</div>
                  <div className="text-xs opacity-40 whitespace-pre-line leading-relaxed mt-0.5">{step.sub}</div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Stack */}
      <motion.div {...fade(0.45)} className="glass p-6 rounded-2xl">
        <h2 className="font-semibold mb-6 text-sm uppercase tracking-wider opacity-45">Stack technologique</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {STACK.map(s => (
            <div key={s.cat}>
              <div className="text-xs uppercase tracking-wider mb-2.5 font-mono" style={{ color: s.col }}>{s.cat}</div>
              <div className="flex flex-wrap gap-1.5">
                {s.items.map(item => <Badge key={item} text={item} col={s.col} />)}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
