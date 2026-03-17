/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Configuraciones Personalizadas de Tema
      colors: {
        brand: {
          50:  'var(--color-brand-50)',
          100: 'var(--color-brand-100)',
          500: 'var(--color-brand-500)',  // Color Base del Sistema (Botones, Acentos)
          600: 'var(--color-brand-600)',  // Hover
          900: 'var(--color-brand-900)',  // Texto oscuro o fondos fuertes
        },
      },
      fontFamily: {
        // En lugar de 'sans', usamos nuestra fuente brand-font configurada
        sans: ['var(--font-primary)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
