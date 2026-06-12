/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0f',
        surface: '#0f0f1a',
        'surface-2': '#141428',
        cyan: {
          neon: '#00f5d4',
          dim: '#00c4aa',
          glow: 'rgba(0,245,212,0.15)',
        },
        green: {
          neon: '#00ff88',
          dim: '#00cc6a',
        },
        alert: '#ff3366',
        warning: '#ffaa00',
        border: 'rgba(0,245,212,0.2)',
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        mono: ['"Space Mono"', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'grid-pattern':
          'linear-gradient(rgba(0,245,212,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,212,0.05) 1px, transparent 1px)',
      },
      backgroundSize: {
        grid: '40px 40px',
      },
      boxShadow: {
        'cyan-glow': '0 0 20px rgba(0,245,212,0.3)',
        'cyan-glow-lg': '0 0 40px rgba(0,245,212,0.4)',
        'green-glow': '0 0 20px rgba(0,255,136,0.3)',
        'red-glow': '0 0 20px rgba(255,51,102,0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 20s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'count-up': 'countUp 2s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(0,245,212,0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(0,245,212,0.7)' },
        },
      },
    },
  },
  plugins: [],
};
