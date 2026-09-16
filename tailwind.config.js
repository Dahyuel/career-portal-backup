/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        asu: {
          red: '#8d1511',       // The exact logo red
          'red-light': '#a31a15', // Lighter for gradients
          'red-dark': '#6b100d',  // Darker for hover effects
        },
      },
    },
  },
  plugins: [],
};