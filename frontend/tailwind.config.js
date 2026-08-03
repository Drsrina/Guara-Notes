/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'guara-neon': '#FF6B1A',
        'guara-neon-light': '#FF8C42',
      }
    },
  },
  plugins: [],
  darkMode: 'class',
}
