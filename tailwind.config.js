/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        // BuddhistAI design system (https://buddhistai.github.io/design/).
        // Reference copy only: Tailwind v4 reads src/index.css, not this file.
        primary: {
          50: '#F3F6FD',
          100: '#E6EBFA',
          200: '#D2DCFA',
          300: '#B3C3F8',
          400: '#8EA6F5',
          500: '#4E6BCF',
          600: '#2443A6',
          700: '#1D378A',
          800: '#1B2D72',
          900: '#1E2850',
          950: '#141B3A',
        },
        secondary: {
          50: '#F6F7F9',
          100: '#EDEFF3',
          200: '#DCE0E8',
          300: '#C3C9D5',
          400: '#9AA3B8',
          500: '#737B90',
          600: '#5A6276',
          700: '#2A3150',
          800: '#1D2338',
          900: '#161B2C',
          950: '#0E1220',
        },
        neutral: {
          50: '#F6F7F9',
          100: '#EDEFF3',
          200: '#DCE0E8',
          300: '#C3C9D5',
          400: '#9AA3B8',
          500: '#737B90',
          600: '#5A6276',
          700: '#2A3150',
          800: '#1D2338',
          900: '#161B2C',
          950: '#0E1220',
        },
      },
    },
  },
  plugins: [],
}
