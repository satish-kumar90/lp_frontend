/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        lime: {
          400: 'rgba(105, 244, 66, 1)',
        },
      },
    },
  },
  plugins: [],
};
