/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        epl: {
          dark: '#070a12',
          night: '#0e0618',
          plum: '#240029',
          purple: '#37003c',
          card: 'rgba(28, 12, 42, 0.72)',
          'card-hover': 'rgba(40, 18, 60, 0.85)',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-active': 'rgba(0, 255, 135, 0.35)',
          green: '#00ff87',
          cyan: '#04f5ff',
          pink: '#e90052',
          gold: '#ffd700',
          silver: '#e2e8f0',
          bronze: '#f97316'
        }
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', '"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', '"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Fira Code', 'monospace'],
        stats: ['Outfit', '"JetBrains Mono"', 'sans-serif']
      },
      boxShadow: {
        'neon-green': '0 0 25px -5px rgba(0, 255, 135, 0.4)',
        'neon-cyan': '0 0 25px -5px rgba(4, 245, 255, 0.4)',
        'neon-pink': '0 0 25px -5px rgba(233, 0, 82, 0.4)',
        'neon-gold': '0 0 30px -5px rgba(255, 215, 0, 0.45)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 12s linear infinite',
        'float': 'float 4s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      }
    },
  },
  plugins: [],
}
