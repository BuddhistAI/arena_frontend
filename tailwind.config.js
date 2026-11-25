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
        // Soft monochrome palette, hex approximations of the oklch values in
        // src/index.css (Tailwind v4 reads the CSS, not this file). Secondary
        // and all chromatic palettes alias the neutral ramp there.
        primary: {
          50: '#f8f7f4',
          100: '#efede9',
          200: '#dcdad6',
          300: '#c3c0bc',
          400: '#9e9b96',
          500: '#4d4a46',
          600: '#3a3834',
          700: '#2c2a27',
          800: '#201f1d',
          900: '#181715',
          950: '#100f0d',
        },
        secondary: {
          50: '#faf9f7',
          100: '#f4f2ef',
          200: '#e8e6e3',
          300: '#d7d5d0',
          400: '#a5a39e',
          500: '#797773',
          600: '#5b5955',
          700: '#454340',
          800: '#302f2c',
          900: '#21201e',
          950: '#171614',
        },
        neutral: {
          50: '#faf9f7',
          100: '#f4f2ef',
          200: '#e8e6e3',
          300: '#d7d5d0',
          400: '#a5a39e',
          500: '#797773',
          600: '#5b5955',
          700: '#454340',
          800: '#302f2c',
          900: '#21201e',
          950: '#171614',
        },
      },
    },
  },
  plugins: [],
}
