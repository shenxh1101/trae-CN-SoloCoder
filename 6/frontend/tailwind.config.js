/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        priority: {
          high: '#ef4444',
          medium: '#f59e0b',
          low: '#10b981',
        },
        status: {
          todo: '#6b7280',
          inProgress: '#3b82f6',
          review: '#8b5cf6',
          done: '#10b981',
        },
      },
    },
  },
  plugins: [],
};
