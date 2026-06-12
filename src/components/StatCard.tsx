'use client';

import { useEffect, useRef, useState } from 'react';

interface StatCardProps {
  label: string;
  value: number | string;
  unit?: string;
  icon?: string;
  color?: string;
  animate?: boolean;
  subtext?: string;
}

function useCountUp(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return count;
}

export default function StatCard({ label, value, unit, icon, color = '#00f5d4', animate = false, subtext }: StatCardProps) {
  const numValue = typeof value === 'number' ? value : 0;
  const count = useCountUp(animate ? numValue : 0, 2000);
  const display = animate && typeof value === 'number'
    ? new Intl.NumberFormat('fr-FR').format(count)
    : typeof value === 'number' ? new Intl.NumberFormat('fr-FR').format(value) : value;

  return (
    <div className="glass glass-hover p-5 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5 pointer-events-none"
        style={{ background: `radial-gradient(circle at 30% 30%, ${color}, transparent 60%)` }} />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          {icon && (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: `rgba(${hexToRgb(color)}, 0.15)`, border: `1px solid rgba(${hexToRgb(color)}, 0.3)` }}>
              {icon}
            </div>
          )}
          <div className="flex-1 text-right">
            <div className="text-2xl font-bold font-mono" style={{ color }}>
              {display}
              {unit && <span className="text-sm ml-1 opacity-70">{unit}</span>}
            </div>
          </div>
        </div>
        <div className="text-xs opacity-60 uppercase tracking-wider">{label}</div>
        {subtext && <div className="text-xs mt-1" style={{ color: `rgba(${hexToRgb(color)}, 0.7)` }}>{subtext}</div>}
      </div>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}
