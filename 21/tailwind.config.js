/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,vue}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        'neon-indigo': '#1e3a5f',
        'neon-cyan': '#00d4ff',
        'neon-pink': '#ff00ff',
        'neon-dark': '#0a0f1a',
        'neon-darker': '#050810',
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'neon-cyan': '0 0 5px #00d4ff, 0 0 20px #00d4ff, 0 0 40px #00d4ff',
        'neon-pink': '0 0 5px #ff00ff, 0 0 20px #ff00ff, 0 0 40px #ff00ff',
        'neon-both': '0 0 5px #00d4ff, 0 0 20px #00d4ff, 0 0 5px #ff00ff, 0 0 20px #ff00ff',
      },
      animation: {
        'pulse-neon': 'pulse-neon 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'gradient': 'gradient-shift 3s ease infinite',
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'neon-pulse': 'neon-pulse 1.5s ease-in-out infinite',
        'danmu-fly': 'danmu-fly 12s linear forwards',
      },
      keyframes: {
        'pulse-neon': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'shimmer': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(300%)' },
        },
        'neon-pulse': {
          '0%, 100%': {
            opacity: '0.5',
            boxShadow: '0 0 15px rgba(0, 212, 255, 0.4), inset 0 0 15px rgba(0, 212, 255, 0.1)',
          },
          '50%': {
            opacity: '1',
            boxShadow: '0 0 30px rgba(0, 212, 255, 0.6), 0 0 60px rgba(0, 212, 255, 0.3), inset 0 0 20px rgba(0, 212, 255, 0.15)',
          },
        },
        'danmu-fly': {
          '0%': { right: '-100%', opacity: '0' },
          '5%': { opacity: '1' },
          '95%': { opacity: '1' },
          '100%': { right: '110%', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};
