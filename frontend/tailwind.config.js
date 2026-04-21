/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: '#1c1917',
        paper: '#faf9f7',
        cream: '#f5f2ed',
        accent: '#c2410c',
        gold: '#d97706',
        teal: '#0f766e',
        rose: '#be123c',
        slate: '#475569',
        stone: '#78716c',
        border: '#e7e5e4',
        subway: '#3b82f6',
        taxi: '#f59e0b',
        walk: '#10b981',
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'serif'],
        sans: ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
