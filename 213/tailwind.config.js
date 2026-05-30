/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        noto: ['Noto Sans SC', 'sans-serif'],
      },
      colors: {
        space: {
          900: '#0a0e17',
          800: '#141926',
          700: '#1e2435',
        },
        nebula: {
          500: '#8b5cf6',
          400: '#a78bfa',
          600: '#7c3aed',
        },
      },
    },
  },
  plugins: [],
};
