/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        burgundy: {
          DEFAULT: '#0F172A',
          dark: '#080E1A',
          light: '#0284C7',
        },
        gold: {
          DEFAULT: '#FCB900',
          light: '#FCD34D',
          pale: '#FEF3C7',
        },
        ivory: {
          DEFAULT: '#FAFAFC',
          dark: '#E2E8F0',
        },
        brand: {
          blue: '#0284C7',
          sky: '#0EA5E9',
          yellow: '#FCB900',
          amber: '#F59E0B',
          pink: '#FB7185',
          navy: '#0F172A',
          slate: '#1E293B',
        },
        charcoal: '#0F172A',
        muted: '#64748B',
        teal: '#0284C7',
        primary: {
          DEFAULT: '#0F172A',
          dark: '#080E1A',
          light: '#0284C7',
          blue: '#0284C7',
          sky: '#0EA5E9',
        },
        accent: {
          DEFAULT: '#FCB900',
          light: '#FCD34D',
          pale: '#FEF3C7',
          teal: '#0284C7',
          blue: '#0284C7',
          pink: '#FB7185',
        },
        surface: {
          DEFAULT: '#FAFAFC',
          soft: '#F8FAFC',
          card: '#FFFFFF',
        },
        border: '#E2E8F0',
        text: {
          DEFAULT: '#0F172A',
          muted: '#64748B',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        serif: ['DM Sans', 'sans-serif'],
        cormorant: ['DM Sans', 'sans-serif'],
        playfair: ['DM Sans', 'sans-serif'],
        montserrat: ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
