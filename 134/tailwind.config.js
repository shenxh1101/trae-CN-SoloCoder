/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        ocean: {
          deep: '#0a1628',
          medium: '#1a4a6e',
          light: '#2d7a9e',
          shallow: '#4ab8c9',
        },
        coral: '#ff7f50',
        seagreen: '#3cb371',
        goldfish: '#ffd700',
      },
      fontFamily: {
        display: ['Oswald', 'sans-serif'],
        body: ['Roboto', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(74, 184, 201, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(74, 184, 201, 0.8)' },
        },
      },
    },
  },
  plugins: [],
};
