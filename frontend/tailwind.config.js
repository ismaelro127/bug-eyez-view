/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './frontend/**/*.{js,ts,jsx,tsx}',   // ✅ include your actual folder
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',        // safe catch-all
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
