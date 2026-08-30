/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.html',
    './public/js/**/*.js'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif']
      }
    }
  },
  plugins: []
};
