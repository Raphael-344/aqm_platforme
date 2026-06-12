'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const links = [
  { href: '/', label: 'Accueil', icon: '⌂' },
  { href: '/carte', label: 'Carte', icon: '◉' },
  { href: '/alertes', label: 'Alertes', icon: '⚠' },
  { href: '/graphiques', label: 'Graphiques', icon: '◈' },
  { href: '/dashboard', label: 'Dashboard', icon: '◆' },
  { href: '/capabilite', label: 'Capabilité', icon: '◇' },
  { href: '/ia', label: 'IA', icon: '✦' },
  { href: '/recherche', label: 'Recherche', icon: '⊕' },
  { href: '/about', label: 'À propos', icon: '◎' },
];

export default function Navigation() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [totalCapteurs, setTotalCapteurs] = useState(0);

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(d => {
      if (d.totalDispositifs) setTotalCapteurs(d.totalDispositifs);
    }).catch(() => {});
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16"
      style={{ background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,245,212,0.15)' }}>
      <div className="max-w-screen-2xl mx-auto h-full flex items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{ background: 'linear-gradient(135deg, #00f5d4, #00ff88)', color: '#0a0a0f' }}>
            AQ
          </div>
          <span className="font-orbitron font-bold text-sm tracking-widest hidden sm:block"
            style={{ color: '#00f5d4', textShadow: '0 0 8px rgba(0,245,212,0.5)' }}>
            AQM PLATFORM
          </span>
          <span className="text-xs opacity-40 hidden lg:block">NOSE × SMART_IO</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden lg:flex items-center gap-1">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link key={l.href} href={l.href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
                style={{
                  color: active ? '#00f5d4' : 'rgba(255,255,255,0.6)',
                  background: active ? 'rgba(0,245,212,0.1)' : 'transparent',
                  border: active ? '1px solid rgba(0,245,212,0.3)' : '1px solid transparent',
                  textShadow: active ? '0 0 8px rgba(0,245,212,0.5)' : 'none',
                }}>
                <span>{l.icon}</span>
                <span>{l.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Status indicator */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#00ff88', boxShadow: '0 0 6px #00ff88' }} />
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>{new Intl.NumberFormat('fr-FR').format(totalCapteurs)} capteurs actifs</span>
        </div>

        {/* Mobile menu */}
        <button className="lg:hidden p-2 rounded-lg" style={{ color: '#00f5d4' }}
          onClick={() => setMenuOpen(!menuOpen)}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d={menuOpen ? 'M4 4l12 12M4 16L16 4' : 'M3 5h14M3 10h14M3 15h14'}
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="lg:hidden absolute top-16 left-0 right-0 p-4 grid grid-cols-3 gap-2"
          style={{ background: 'rgba(10,10,15,0.98)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,245,212,0.15)' }}>
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
                className="flex flex-col items-center gap-1 p-3 rounded-xl text-xs transition-all"
                style={{
                  color: active ? '#00f5d4' : 'rgba(255,255,255,0.6)',
                  background: active ? 'rgba(0,245,212,0.1)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${active ? 'rgba(0,245,212,0.3)' : 'rgba(255,255,255,0.08)'}`,
                }}>
                <span className="text-lg">{l.icon}</span>
                <span>{l.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
