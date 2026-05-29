/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'space-dark': '#0a1628',
        'space-blue': '#00d4ff',
        'electron-red': '#ff6b6b',
        'electron-yellow': '#ffd93d',
        'electron-green': '#6bcb77',
        'nucleus-gold': '#ffd700',
      },
      fontFamily: {
        'orbitron': ['Orbitron', 'sans-serif'],
        'roboto': ['Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
