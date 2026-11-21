/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#12151C',
        surface: '#1B1F29',
        elevated: '#222733',
        text: '#F2EFE7',
        muted: '#8B8D98',
        brass: '#C9A15A',
        'brass-soft': 'rgba(201,161,90,0.14)',
        teal: '#3F7A6B',
        'teal-soft': 'rgba(63,122,107,0.18)',
        border: 'rgba(242,239,231,0.12)',
        danger: '#E26D5A',
        'danger-soft': 'rgba(226,109,90,0.14)',
      },
      fontFamily: {
        serif: ['Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
