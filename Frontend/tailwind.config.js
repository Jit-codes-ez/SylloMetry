/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#FFFBF1',
        background: '#FFFBF1',
        primary: {
          DEFAULT: '#850E35',
          foreground: '#FFFBF1',
        },
        'primary-foreground': '#FFFBF1',
        brand: {
          primary: '#850E35',
          'primary-dark': '#6F0A2B',
          'primary-light': '#9E1542',
          secondary: '#FFF5E4',
          'secondary-dark': '#F5E4CE',
          accent: '#E36A6A',
          'accent-dark': '#CE5555',
          'accent-light': '#FCE7E7',
          bg: '#FFFBF1',
          text: '#850E35',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
        serif: ['"Bodoni Moda"', '"Playfair Display"', 'Georgia', 'serif'],
        display: ['"Bodoni Moda"', '"Playfair Display"', 'serif'],
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float-slow': 'float 6s ease-in-out infinite',
        'rippling': 'rippling var(--duration, 600ms) ease-out',
        'shine': 'shine var(--duration, 14s) infinite linear',
        'spin-glare': 'spin-glare var(--duration, 8s) linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        rippling: {
          '0%': { opacity: '1' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
        shine: {
          '0%': { 'background-position': '0% 0%' },
          '50%': { 'background-position': '100% 100%' },
          'to': { 'background-position': '0% 0%' },
        },
        'spin-glare': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      }
    },
  },
  plugins: [],
}
