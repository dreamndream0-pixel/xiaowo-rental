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
        oat:       '#F0EDE6',
        sage:      '#7A9E7E',
        'sage-dark': '#4E7153',
      },
      keyframes: {
        'slide-in': {
          from: { opacity: 0, transform: 'translateX(40px)' },
          to:   { opacity: 1, transform: 'translateX(0)' },
        },
      },
      animation: {
        'slide-in': 'slide-in 0.3s ease',
      },
    },
  },
  plugins: [],
}
