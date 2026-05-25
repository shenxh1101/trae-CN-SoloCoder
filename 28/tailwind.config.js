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
        bg: {
          primary: "#0a0a0f",
          secondary: "#12121a",
          tertiary: "#1a1a25",
          elevated: "#212130",
        },
        accent: {
          purple: "#9333ea",
          cyan: "#06b6d4",
          pink: "#ec4899",
        },
        text: {
          primary: "#f1f5f9",
          secondary: "#94a3b8",
          muted: "#64748b",
        },
        border: {
          subtle: "rgba(255, 255, 255, 0.08)",
          highlighted: "rgba(147, 51, 234, 0.3)",
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', "sans-serif"],
        body: ['"Inter"', "sans-serif"],
      },
      animation: {
        "gradient-x": "gradient-x 3s ease infinite",
        "spin-slow": "spin 8s linear infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.6s ease-out forwards",
      },
      keyframes: {
        "gradient-x": {
          "0%, 100%": { "background-position": "0% 50%" },
          "50%": { "background-position": "100% 50%" },
        },
        "pulse-glow": {
          "0%, 100%": { "box-shadow": "0 0 20px rgba(147, 51, 234, 0.3)" },
          "50%": { "box-shadow": "0 0 40px rgba(147, 51, 234, 0.6)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      backgroundImage: {
        "gradient-accent": "linear-gradient(135deg, #9333ea, #06b6d4)",
        "gradient-glow": "linear-gradient(135deg, rgba(147, 51, 234, 0.1), rgba(6, 182, 212, 0.1))",
      },
    },
  },
  plugins: [],
};
