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

        // Novos
        'bg-primary': '#0F0F1E',
        'bg-secondary': '#1A1A2E',
        'bg-tertiary': '#25263B',

        'accent-primary': '#FF6B1A',
        'accent-secondary': '#FF8C42',
        'accent-glow': '#FF9D54',

        'text-primary': '#F5F5F5',
        'text-secondary': '#A0A0B8',
        'text-muted': '#6B6B7E',
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'sans-serif'],
        mono: ['Fira Code', 'JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
  darkMode: 'class',
}
