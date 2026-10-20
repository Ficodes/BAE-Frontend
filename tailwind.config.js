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
        offerings: {
          page: 'rgb(var(--theme-offerings-page-bg) / <alpha-value>)',
          surface: 'rgb(var(--theme-offerings-surface-bg) / <alpha-value>)',
          'subtle-surface': 'rgb(var(--theme-offerings-subtle-surface-bg) / <alpha-value>)',
          muted: 'rgb(var(--theme-offerings-muted-bg) / <alpha-value>)',
          neutral: 'rgb(var(--theme-offerings-neutral-bg) / <alpha-value>)',
          selected: 'rgb(var(--theme-offerings-selected-bg) / <alpha-value>)',
          'icon-bg': 'rgb(var(--theme-offerings-icon-bg) / <alpha-value>)',
          'table-header': 'rgb(var(--theme-offerings-table-header-bg) / <alpha-value>)',
          border: 'rgb(var(--theme-offerings-border) / <alpha-value>)',
          'border-strong': 'rgb(var(--theme-offerings-border-strong) / <alpha-value>)',
          'border-muted': 'rgb(var(--theme-offerings-border-muted) / <alpha-value>)',
          'separator': 'rgb(var(--theme-offerings-separator) / <alpha-value>)',
          'dashed-border': 'rgb(var(--theme-offerings-dashed-border) / <alpha-value>)',
          'price-border': 'rgb(var(--theme-offerings-price-border) / <alpha-value>)',
          text: 'rgb(var(--theme-offerings-text) / <alpha-value>)',
          'strong-text': 'rgb(var(--theme-offerings-strong-text) / <alpha-value>)',
          heading: 'rgb(var(--theme-offerings-heading-text) / <alpha-value>)',
          body: 'rgb(var(--theme-offerings-body-text) / <alpha-value>)',
          'description-text': 'rgb(var(--theme-offerings-description-text) / <alpha-value>)',
          'feature-text': 'rgb(var(--theme-offerings-feature-text) / <alpha-value>)',
          'label-text': 'rgb(var(--theme-offerings-label-text) / <alpha-value>)',
          'muted-text': 'rgb(var(--theme-offerings-muted-text) / <alpha-value>)',
          title: 'rgb(var(--theme-offerings-title-text) / <alpha-value>)',
          link: 'rgb(var(--theme-offerings-link) / <alpha-value>)',
          'link-hover': 'rgb(var(--theme-offerings-link-hover) / <alpha-value>)',
          'confirm-hover': 'rgb(var(--theme-offerings-confirm-hover) / <alpha-value>)',
          'active-chip': 'rgb(var(--theme-offerings-active-chip-bg) / <alpha-value>)',
          disabled: 'rgb(var(--theme-offerings-disabled-text) / <alpha-value>)',
          'disabled-strong': 'rgb(var(--theme-offerings-disabled-strong-text) / <alpha-value>)',
          'on-dark': 'rgb(var(--theme-offerings-on-dark-text) / <alpha-value>)',
          'on-dark-body': 'rgb(var(--theme-offerings-on-dark-body-text) / <alpha-value>)',
          'dark-surface': 'rgb(var(--theme-offerings-dark-surface-bg) / <alpha-value>)',
          'dark-hover': 'rgb(var(--theme-offerings-dark-hover-bg) / <alpha-value>)',
          overlay: 'rgb(var(--theme-offerings-neutral-shadow-rgb) / <alpha-value>)',
          'metric-success': 'rgb(var(--theme-offerings-metric-success-bg) / <alpha-value>)',
          'metric-accent': 'rgb(var(--theme-offerings-metric-accent-bg) / <alpha-value>)'
        },
        status: {
          success: {
            bg: 'rgb(var(--theme-status-success-bg) / <alpha-value>)',
            text: 'rgb(var(--theme-status-success-text) / <alpha-value>)',
            border: 'rgb(var(--theme-status-success-border) / <alpha-value>)',
            bright: 'rgb(var(--theme-status-success-bright) / <alpha-value>)'
          },
          ready: {
            bg: 'rgb(var(--theme-status-ready-bg) / <alpha-value>)',
            text: 'rgb(var(--theme-status-ready-text) / <alpha-value>)',
            border: 'rgb(var(--theme-status-ready-border) / <alpha-value>)'
          },
          danger: {
            bg: 'rgb(var(--theme-status-danger-bg) / <alpha-value>)',
            text: 'rgb(var(--theme-status-danger-text) / <alpha-value>)',
            border: 'rgb(var(--theme-status-danger-border) / <alpha-value>)'
          },
          warning: {
            bg: 'rgb(var(--theme-status-warning-bg) / <alpha-value>)',
            text: 'rgb(var(--theme-status-warning-text) / <alpha-value>)',
            border: 'rgb(var(--theme-status-warning-border) / <alpha-value>)'
          },
          neutral: {
            bg: 'rgb(var(--theme-status-neutral-bg) / <alpha-value>)',
            text: 'rgb(var(--theme-status-neutral-text) / <alpha-value>)',
            border: 'rgb(var(--theme-status-neutral-border) / <alpha-value>)'
          }
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
