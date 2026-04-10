import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fff1f3',
          100: '#ffe4e8',
          200: '#fecdd5',
          300: '#fda4b1',
          400: '#fb718a',
          500: '#ff2a54',  // logo rose-red
          600: '#e11d48',  // slightly darker – white text passes WCAG AA
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
        },
        verdict: {
          likely: '#0f9d58',
          borderline: '#f4b400',
          unlikely: '#db4437'
        }
      },
      boxShadow: {
        card: '0 10px 30px -15px rgba(255,42,84,0.20)'
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-in-up': 'fade-in-up 0.3s ease-out',
      },
    }
  },
  plugins: [
    require('@tailwindcss/typography'),
  ]
} satisfies Config;
