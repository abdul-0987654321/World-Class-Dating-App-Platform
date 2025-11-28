/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Flamoral Brand Colors
        flame: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#E45C5C',
          500: '#D62839', // Primary Flame Red
          600: '#B91C30',
          700: '#9B1827',
          800: '#7A1020', // Velvet Wine
          900: '#5C0C18',
        },
        ember: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FF8C4B',
          500: '#FF6E35', // Ember Orange
          600: '#EA5A22',
          700: '#C77A45', // Copper
          800: '#9A3412',
          900: '#7C2D12',
        },
        gold: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#D9A657', // Ember Gold
          600: '#B8944A',
          700: '#92400E',
          800: '#78350F',
          900: '#451A03',
        },
        charcoal: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#C4C4C4', // Smoke Grey
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#2A2A2A',
          900: '#1A1A1A', // Rich Charcoal
        },
        ivory: {
          DEFAULT: '#FFF6EE', // Soft Ivory
          50: '#FFFDFB',
          100: '#FFF6EE',
        },
        // Keep compatibility with existing primary/secondary
        primary: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#E45C5C',
          500: '#D62839',
          600: '#B91C30',
          700: '#9B1827',
          800: '#7A1020',
          900: '#5C0C18',
        },
        secondary: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FF8C4B',
          500: '#FF6E35',
          600: '#EA5A22',
          700: '#C77A45',
          800: '#9A3412',
          900: '#7C2D12',
        },
      },
      backgroundImage: {
        'gradient-flamoral': 'linear-gradient(135deg, #D62839 0%, #FF6E35 100%)',
        'gradient-velvet': 'linear-gradient(135deg, #7A1020 0%, #1A1A1A 100%)',
        'gradient-gold': 'linear-gradient(135deg, #D9A657 0%, #C77A45 100%)',
        'gradient-blush': 'linear-gradient(135deg, #E45C5C 0%, #D9A657 100%)',
        'gradient-sunset': 'linear-gradient(135deg, #FF6E35 0%, #D62839 50%, #7A1020 100%)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Playfair Display', 'Georgia', 'serif'],
      },
      boxShadow: {
        'flame': '0 4px 24px rgba(214, 40, 57, 0.35)',
        'flame-lg': '0 8px 40px rgba(214, 40, 57, 0.5)',
        'gold': '0 4px 24px rgba(217, 166, 87, 0.35)',
        'ember': '0 4px 24px rgba(255, 110, 53, 0.35)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'gradient-shift': 'gradient-shift 4s ease infinite',
      },
      keyframes: {
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
}
