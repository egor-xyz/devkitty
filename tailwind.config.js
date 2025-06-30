/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/rendered/**/*.{js,ts,jsx,tsx}",
    "./index.html",
  ],
  darkMode: 'class', // Enable class-based dark mode to work with existing dark mode system
  theme: {
    extend: {
      colors: {
        // Map Blueprint.js colors to Tailwind custom colors for easier migration
        'blueprint-light-gray2': '#F5F8FA',
        'blueprint-light-gray4': '#CED9E0', 
        'blueprint-light-gray5': '#A7B6C2',
        'blueprint-dark-gray1': '#182026',
        'blueprint-dark-gray2': '#202B33',
        'blueprint-gray3': '#5C7080',
        'blueprint-blue3': '#137CBD',
      },
      spacing: {
        '7.5': '30px',
      },
      animation: {
        'spin-custom': 'spin 0.5s linear infinite',
      }
    },
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.scrollbar-none': {
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            'width': '0',
            'height': '0',
          }
        }
      })
    }
  ],
}