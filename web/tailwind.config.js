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
          ink: '#170b26',
          plum: '#38003c',
          royal: '#241b3b',
          green: '#047857',
          mint: '#10b981',
          indigo: '#4f46e5',
          rose: '#be123c',
          gold: '#b45309',
          silver: '#475569',
          bronze: '#9a3412',
        },
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Unbounded', '"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
        editorial: ['Unbounded', '"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        stats: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
      },
      transitionTimingFunction: {
        'out-strong': 'cubic-bezier(0.23, 1, 0.32, 1)',
        'fluid': 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      animation: {
        'pulse-soft': 'pulseSoft 3.2s cubic-bezier(0.32, 0.72, 0, 1) infinite',
        'spin-smooth': 'spinSmooth 1s cubic-bezier(0.32, 0.72, 0, 1) infinite',
      },
      keyframes: {
        pulseSoft: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.42', transform: 'scale(0.92)' },
        },
        spinSmooth: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
};
