/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Orbitron', 'monospace'],
        body: ['Source Sans 3', 'sans-serif'],
      },
      colors: {
        cyber: {
          pink: '#FF006E',
          cyan: '#00F5D4',
          amber: '#F5A623',
          dark: '#0A0A1A',
          panel: 'rgba(10, 10, 30, 0.75)',
        }
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
