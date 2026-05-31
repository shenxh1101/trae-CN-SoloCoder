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
        gold: '#d4a853',
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"LXGW WenKai"', 'serif'],
      },
    },
  },
  plugins: [],
};
