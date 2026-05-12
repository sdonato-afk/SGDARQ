/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Fuentes — apuntan a las variables de darq-ui/tokens.css
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      // Colores semánticos — apuntan a CSS variables del design system
      // Esto permite usar: bg-darq-bg, text-darq-accent, border-darq-border, etc.
      colors: {
        darq: {
          bg:      'var(--bg)',
          bg2:     'var(--bg2)',
          card:    'var(--bg-card)',
          border:  'var(--border)',
          text:    'var(--text)',
          muted:   'var(--text-muted)',
          accent:  'var(--accent)',
          accent2: 'var(--accent2)',
          green:   'var(--green)',
          red:     'var(--red)',
          amber:   'var(--amber)',
        },
      },
    },
  },
  plugins: [],
}
