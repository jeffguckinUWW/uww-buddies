/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'scuba-blue': '#1e3d59',
        'ocean-light': '#17a2b8',
      }
    },
  },
  plugins: [],
}