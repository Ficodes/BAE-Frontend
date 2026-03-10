/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
    "./node_modules/flowbite/**/*.js",
    "./node_modules/flowbite-datepicker/**/*.js"
  ],
  theme: {
    fontFamily: {
      // Si también quieres que las fuentes sean temáticas, puedes aplicar el mismo patrón:
      display: ['var(--theme-font-display)', 'Blinker', 'IBM\\ Plex\\ Mono', 'Menlo', 'monospace'],
      body: ['var(--theme-font-body)', 'Blinker', 'IBM\\ Plex\\ Mono', 'Menlo', 'monospace']
    },
    extend: {
      colors: {
        primary: {
          50: 'rgb(var(--theme-primary-50) / <alpha-value>)',   // Antes '#00add3'
          100: 'rgb(var(--theme-primary-100) / <alpha-value>)', // Antes '#2d58a7'
        },
        secondary: {
          50: 'rgb(var(--theme-secondary-50) / <alpha-value>)',  // Antes '#dde6f6'
          100: 'rgb(var(--theme-secondary-100) / <alpha-value>)',// Antes '#14274a'
          200: 'rgb(var(--theme-secondary-200) / <alpha-value>)',// Antes '#0c1c38'
          300: 'rgb(var(--theme-secondary-300) / <alpha-value>)',// Antes '#182740'
          400: 'rgb(var(--theme-secondary-400) / <alpha-value>)',
          500: 'rgb(var(--theme-secondary-500) / <alpha-value>)'
        },
        tertiary: {
          50: 'rgb(var(--theme-tertiary-50) / <alpha-value>)', //BG color for dark theme
          100: 'rgb(var(--theme-tertiary-100) / <alpha-value>)' //BG color for dark theme
        },
        // Puedes añadir más colores temáticos aquí si es necesario
        // Ejemplo:
        // 'accent': 'var(--theme-accent-color)',
        // 'background': 'var(--theme-background-color)',
        // 'text-default': 'var(--theme-text-color)',
        // 'text-muted': 'var(--theme-text-muted-color)',
      },
      transitionProperty: {
        width: "width"
      },
      transitionDuration: {
        '0': '0ms',
        '2000': '2000ms',
        '2500': '2500ms',
        '3000': '3000ms',
      },
      keyframes: {
        fadeInOut: {
          '0%, 100%': { opacity: 0 },
          '50%': { opacity: 1 },
        },
      },
      animation: {
        fadeInOut: 'fadeInOut 5s ease-in-out infinite',
      },
      gridTemplateColumns:
        {
          '16': 'repeat(16, minmax(0, 1fr))',
          '60/40': '60% 40%',
          '80/20': '80% 20%',
          '40/60': '40% 60%',
          '25/75': '25% 75%',
          '20/80': '20% 80%',
          '10/90': '10% 90%'
        },
      gridTemplateRows:
        {
          '60/40': '60% 40%',
          '80/20': '80% 20%',
          '20/80': '20% 80%',
          '10/90': '10% 90%'
        },
      maxHeight: {
        '3/4': '75%',
      },
    }
  },
  plugins: [
    require('flowbite/plugin')
  ],
  darkMode: 'class' // Esto es compatible con nuestro enfoque de clase por tema
}
