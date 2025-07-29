/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./{components,contexts,pages,App,types}/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary, #1e40af)', // blue-800
          hover: 'var(--color-primary-hover, #1d4ed8)', // blue-700
          light: 'var(--color-primary-light, #dbeafe)', // blue-100
        },
        secondary: {
          DEFAULT: 'var(--color-secondary, #64748b)', // slate-500
          hover: 'var(--color-secondary-hover, #475569)', // slate-600
          light: 'var(--color-secondary-light, #f1f5f9)', // slate-100
        },
      }
    },
  },
  plugins: [],
}