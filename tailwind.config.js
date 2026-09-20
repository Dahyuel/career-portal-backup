/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // The whole app follows the event's colours: these read the CSS
        // variables published by src/lib/theme.ts (applyTheme). The defaults in
        // index.css keep the original ASU red before an event is loaded.
        asu: {
          red: 'rgb(var(--a-700-rgb) / <alpha-value>)',
          'red-light': 'rgb(var(--a-600-rgb) / <alpha-value>)',
          'red-dark': 'rgb(var(--a-800-rgb) / <alpha-value>)',
        },
        red: {
          50: 'rgb(var(--a-50-rgb) / <alpha-value>)',
          100: 'rgb(var(--a-100-rgb) / <alpha-value>)',
          200: 'rgb(var(--a-200-rgb) / <alpha-value>)',
          300: 'rgb(var(--a-300-rgb) / <alpha-value>)',
          400: 'rgb(var(--a-400-rgb) / <alpha-value>)',
          500: 'rgb(var(--a-500-rgb) / <alpha-value>)',
          600: 'rgb(var(--a-600-rgb) / <alpha-value>)',
          700: 'rgb(var(--a-700-rgb) / <alpha-value>)',
          800: 'rgb(var(--a-800-rgb) / <alpha-value>)',
          900: 'rgb(var(--a-900-rgb) / <alpha-value>)',
          950: 'rgb(var(--a-950-rgb) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
};