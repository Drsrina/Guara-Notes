import json

tailwind_config = """/** @type {import('tailwindcss').Config} */
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
"""

with open('frontend/tailwind.config.js', 'w') as f:
    f.write(tailwind_config)

index_css = """@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-bg-primary text-text-primary;
    background-color: #0F0F1E;
    color: #F5F5F5;
    font-family: 'Geist', 'Inter', sans-serif;
  }
}

.glass {
  background: rgba(26, 26, 46, 0.5);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 107, 26, 0.15);
}

.glass-panel {
  background: rgba(26, 26, 46, 0.5);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 107, 26, 0.15);
  border-radius: 12px;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
}

.btn-primary {
  background: linear-gradient(135deg, #FF6B1A 0%, #FF8C42 100%);
  color: #0F0F1E;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  box-shadow: 0 0 20px 0 rgba(255, 107, 26, 0.6), inset 0 0 10px rgba(255, 140, 66, 0.3);
  transform: translateY(-2px);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-secondary {
  background: rgba(26, 26, 46, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 107, 26, 0.3);
  color: #FF6B1A;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background: rgba(26, 26, 46, 0.8);
  border-color: rgba(255, 107, 26, 0.6);
  box-shadow: 0 0 15px 0 rgba(255, 107, 26, 0.3);
}

.input-glass {
  background: rgba(15, 15, 30, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 107, 26, 0.2);
  border-radius: 8px;
  color: #F5F5F5;
  padding: 0.75rem 1rem;
  transition: all 0.3s ease;
}

.input-glass:focus {
  border-color: rgba(255, 107, 26, 0.6);
  box-shadow: 0 0 15px 0 rgba(255, 107, 26, 0.2), inset 0 0 10px rgba(255, 107, 26, 0.1);
  outline: none;
}

.input-glass::placeholder {
  color: #6B6B7E;
}

.text-glow-neon {
  text-shadow: 0 0 10px rgba(255, 107, 26, 0.8), 0 0 20px rgba(255, 107, 26, 0.4);
}

.box-glow-neon {
  box-shadow: 0 0 15px rgba(255, 107, 26, 0.3), inset 0 0 10px rgba(255, 107, 26, 0.1);
}
"""

with open('frontend/src/index.css', 'w') as f:
    f.write(index_css)
