/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'space': {
          900: '#0a0a1a',
          800: '#0f0f2e',
          700: '#1a1a3e',
        },
        'star-blue': '#4a9eff',
        'earth-blue': '#1a6fc4',
        'moon-gray': '#b0b0b0',
        'orbit-gold': '#ffd700',
      },
      fontFamily: {
        'orbitron': ['Orbitron', 'monospace'],
        'noto': ['Noto Sans SC', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
