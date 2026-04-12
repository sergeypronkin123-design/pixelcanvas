/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: { bg: '#08080c', surface: '#111118', elevated: '#1a1a24', border: '#2a2a3d', muted: '#6b6b8a', text: '#e2e2f0', bright: '#ffffff' },
        flame: { 50: '#fff8ed', 100: '#ffefd4', 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c' },
        neon: { cyan: '#00f0ff', green: '#00ff88', amber: '#ffaa00', violet: '#8b5cf6', red: '#ff4444' },
      },
      fontFamily: {
        display: ['"Outfit"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: { 'glow-pulse': 'glow-pulse 3s ease-in-out infinite', 'slide-up': 'slide-up 0.5s ease-out' },
      keyframes: {
        'glow-pulse': { '0%, 100%': { opacity: '0.4' }, '50%': { opacity: '1' } },
        'slide-up': { '0%': { transform: 'translateY(20px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
}
