'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

function useCountUp(target: number, duration = 2500, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    const begin = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - begin) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 4);
      setCount(Math.floor(ease * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration, start]);
  return count;
}

function SigfoxCounter({ total }: { total: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const startOfHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
      const elapsed = (now.getTime() - startOfHour.getTime()) / 1000;
      setCount(Math.floor(elapsed * (total / 3600)));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [total]);

  return (
    <div className="glass p-6 rounded-2xl text-center relative overflow-hidden">
      <div className="absolute inset-0 animate-pulse-slow" style={{ background: 'radial-gradient(circle, rgba(0,245,212,0.05) 0%, transparent 70%)' }} />
      <div className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'rgba(0,245,212,0.6)' }}>
        Simulation · transmissions SIGFOX sur une heure
      </div>
      <div className="font-mono text-5xl font-bold" style={{ color: '#00f5d4', textShadow: '0 0 20px rgba(0,245,212,0.5)' }}>
        {new Intl.NumberFormat('fr-FR').format(count)}
      </div>
      <div className="text-xs mt-2 opacity-40 font-mono">/ {new Intl.NumberFormat('fr-FR').format(total)} total</div>
      <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#00ff88' }} />
        <span className="text-xs font-mono" style={{ color: '#00ff88' }}>SIMULATION</span>
      </div>
    </div>
  );
}

const navCards = [
  { href: '/carte', icon: '◉', title: 'Carte AQM', desc: '127 383 capteurs simulés sur la carte Europe', color: '#00f5d4' },
  { href: '/alertes', icon: '⚠', title: 'Alertes', desc: 'Dépassements de seuils OMS en cours', color: '#ff3366' },
  { href: '/graphiques', icon: '◈', title: 'Graphiques', desc: 'Évolution 90 jours, comparaisons, heatmap', color: '#00ff88' },
  { href: '/dashboard', icon: '◆', title: 'Dashboard CEO', desc: 'KPIs, planning production, ROI 5 ans', color: '#ffaa00' },
  { href: '/capabilite', icon: '◇', title: 'Capabilité', desc: 'Cp/Cpk presses MCH1 & MCH2, normalité', color: '#a78bfa' },
  { href: '/ia', icon: '✦', title: 'IA & Prédictions', desc: 'Chatbot IA (Groq) + prévisions 24h par ville', color: '#00f5d4' },
  { href: '/recherche', icon: '⊕', title: 'Recherche', desc: 'Trouver une commune dans la zone euro', color: '#00ff88' },
  { href: '/about', icon: '◎', title: 'À propos', desc: 'Architecture, équipe, contexte NOSE × SMART_IO', color: '#94a3b8' },
];

export default function HomePage() {
  const [started, setStarted] = useState(false);
  const [stats, setStats] = useState({ totalDispositifs: 0, actifsCount: 0, totalPays: 0 });
  const [alertesCount, setAlertesCount] = useState<number | null>(null);
  const capteurs = useCountUp(stats.totalDispositifs, 2500, started);
  const pays = useCountUp(21, 1500, started);
  const alertes = useCountUp(alertesCount ?? 0, 1200, started && alertesCount !== null);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), 400);
    fetch('/api/stats').then(r => (r.ok ? r.json() : Promise.reject(r))).then(d => setStats(d)).catch(() => {});

    const ac = new AbortController();
    const tid = setTimeout(() => ac.abort(), 30000);
    fetch('/api/alertes', { signal: ac.signal })
      .then(r => r.json())
      .then(d => setAlertesCount(d.alertes?.length ?? 0))
      .catch(() => setAlertesCount(0))
      .finally(() => clearTimeout(tid));

    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-grid relative">
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-6 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #00f5d4 0%, transparent 60%)' }} />
        </div>

        <div className="relative z-10 text-center max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono mb-8"
              style={{ background: 'rgba(0,245,212,0.08)', border: '1px solid rgba(0,245,212,0.2)', color: '#00f5d4' }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00ff88' }} />
              NOSE × SMART_IO — Zone Euro — SIGFOX IoT Network
            </div>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.1 }}
            className="font-orbitron text-5xl md:text-7xl font-black mb-6 leading-tight">
            <span className="gradient-text">AQM</span>
            <br />
            <span className="text-white">PLATFORM</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }}
            className="text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.6)' }}>
            Monitoring de la qualité de l'air (données simulées) à travers{' '}
            <span style={{ color: '#00f5d4' }}>21 pays</span> de la zone euro.<br />
            Réseau de{' '}
            <span style={{ color: '#00ff88', fontFamily: 'Space Mono' }}>{new Intl.NumberFormat('fr-FR').format(stats.totalDispositifs)}</span>{' '}
            capteurs SIGFOX · Arduino MKRFox 1200 · MAKESENSE
          </motion.p>

          {/* Hero stats */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[
              { label: 'Capteurs actifs', value: capteurs, color: '#00f5d4', icon: '◉', loading: false },
              { label: 'Pays couverts', value: pays, color: '#00ff88', icon: '◎', loading: false },
              { label: 'Relevés / heure', value: capteurs, color: '#a78bfa', icon: '⚡', loading: false },
              { label: 'Alertes actives', value: alertes, color: '#ff3366', icon: '⚠', loading: alertesCount === null },
            ].map((s) => (
              <div key={s.label} className="glass p-4 rounded-xl">
                <div className="text-2xl font-bold font-mono flex items-center h-9" style={{ color: s.color }}>
                  {s.loading ? (
                    <div className="w-6 h-6 rounded-full border-2 border-transparent animate-spin"
                      style={{ borderTopColor: s.color }} />
                  ) : (
                    new Intl.NumberFormat('fr-FR').format(s.value)
                  )}
                </div>
                <div className="text-xs opacity-50 mt-1 uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.7 }}
            className="max-w-md mx-auto">
            <SigfoxCounter total={stats.totalDispositifs} />
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
            className="mt-8 flex justify-center">
            <Link href="/carte"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-base transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, rgba(0,245,212,0.15), rgba(0,255,136,0.1))',
                border: '1px solid rgba(0,245,212,0.4)',
                color: '#00f5d4',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,245,212,0.25), rgba(0,255,136,0.2))';
                e.currentTarget.style.boxShadow = '0 0 30px rgba(0,245,212,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,245,212,0.15), rgba(0,255,136,0.1))';
                e.currentTarget.style.boxShadow = 'none';
              }}>
              <span>Ouvrir la Carte →</span>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Nav cards */}
      <section className="px-6 pb-20 max-w-7xl mx-auto">
        <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="font-orbitron text-2xl font-bold mb-8 text-center"
          style={{ color: 'rgba(255,255,255,0.7)' }}>
          MODULES DE LA PLATEFORME
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {navCards.map((card, i) => (
            <motion.div key={card.href}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
              <Link href={card.href}
                className="glass glass-hover p-6 rounded-2xl flex flex-col gap-3 h-full block group">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ background: `rgba(${hexRgb(card.color)},0.12)`, border: `1px solid rgba(${hexRgb(card.color)},0.25)` }}>
                  {card.icon}
                </div>
                <div>
                  <div className="font-semibold mb-1 group-hover:text-white transition-colors" style={{ color: card.color }}>
                    {card.title}
                  </div>
                  <div className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {card.desc}
                  </div>
                </div>
                <div className="mt-auto text-xs font-mono transition-all duration-200"
                  style={{ color: `rgba(${hexRgb(card.color)},0.5)` }}>
                  Ouvrir →
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Tech stack */}
      <section className="border-t px-6 py-16 max-w-7xl mx-auto" style={{ borderColor: 'rgba(0,245,212,0.08)' }}>
        <div className="text-center mb-8">
          <div className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'rgba(0,245,212,0.5)' }}>
            Stack Technique
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {['Next.js 14', 'TypeScript', 'Tailwind CSS', 'Leaflet.js', 'Recharts', 'D3.js', 'Framer Motion', 'Prisma', 'PostgreSQL Neon', 'Groq (GPT-OSS)', 'SIGFOX', 'Arduino MKRFox'].map(tech => (
            <span key={tech} className="px-3 py-1.5 rounded-full text-xs font-mono"
              style={{ background: 'rgba(0,245,212,0.06)', border: '1px solid rgba(0,245,212,0.15)', color: 'rgba(255,255,255,0.6)' }}>
              {tech}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function hexRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
