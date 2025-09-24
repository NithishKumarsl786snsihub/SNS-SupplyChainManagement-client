/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'sns-cream': '#f3e9dc',
        'sns-orange': '#d96f32',
        'sns-orange-dark': '#c75d2c',
        'sns-yellow': '#f8b259',
      },
    },
  },
  plugins: [],
}
