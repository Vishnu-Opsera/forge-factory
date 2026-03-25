/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        opsera: {
          obsidian:        '#1A1025',
          midnight:        '#1D1838',
          indigo:          '#3D0E8F',
          plum:            '#6B2FD4',
          'purple-haze':   '#9654F4',
          whisper:         '#C2B0F6',
          mist:            '#D8D2EE',
          ice:             '#EDE8FF',
          marigold:        '#F5A83E',
          honey:           '#F8CD88',
          'mellow-yellow': '#FEF4C6',
        },
        forge: {
          bg:           'var(--bg-page)',
          navy:         'var(--bg-surface)',
          card:         'var(--bg-card)',
          border:       'var(--border-default)',
          purple:       '#9654F4',   /* Purple Haze */
          'purple-dim': '#6B2FD4',   /* Plum */
          whisper:      '#C2B0F6',   /* Whisper — replaces cyan */
          honey:        '#F8CD88',   /* Honey — soft warm highlight */
          amber:        '#F5A83E',   /* Marigold — replaces emerald for success */
          red:          '#EF4444',   /* errors only */
        },
      },
      fontFamily: {
        sans: ['Source Sans 3', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'float':          'float 6s ease-in-out infinite',
        'pulse-glow':     'pulse-glow 2s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 8s ease infinite',
        'slide-up':       'slide-up 0.5s ease-out',
        'fade-in':        'fade-in 0.4s ease-out',
        'shimmer':        'shimmer 2s linear infinite',
        'spin-slow':      'spin 3s linear infinite',
      },
      keyframes: {
        float:            { '0%, 100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-20px)' } },
        'pulse-glow':     { '0%, 100%': { opacity: '1', boxShadow: '0 0 20px rgba(150,84,244,0.3)' }, '50%': { opacity: '0.8', boxShadow: '0 0 40px rgba(150,84,244,0.6)' } },
        'gradient-shift': { '0%, 100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
        'slide-up':       { '0%': { transform: 'translateY(20px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        'fade-in':        { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        shimmer:          { '0%': { backgroundPosition: '-1000px 0' }, '100%': { backgroundPosition: '1000px 0' } },
      },
      backgroundSize: { '300%': '300%' },
    },
  },
  plugins: [],
};
