import colors from 'tailwindcss/colors';
/**
 * FLAMORAL Tailwind Configuration
 * Premium Futuristic Multi-Gradient Design System
 *
 * Version: 2.0.0
 * Theme: Dark Mode First + Multi-Gradient Accents
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Extend default Tailwind colors
        ...colors,

        // Base Colors - Dark Mode First
        base: {
          black: '#000000',
          'deep-black': '#0A0A0A',
          'rich-black': '#0D0D0D',
          charcoal: '#1A1A1A',
          'dark-gray': '#2A2A2A',
          gray: '#3A3A3A',
          'light-gray': '#6B7280',
          white: '#FFFFFF',
          'off-white': '#F9FAFB',
        },

        // Primary Accent - Pink (Romance + Emotion)
        pink: {
          50: '#FDF2F8',
          100: '#FCE7F3',
          200: '#FBCFE8',
          300: '#F9A8D4',
          400: '#F472B6',
          500: '#EC4899',
          600: '#DB2777',
          700: '#BE185D',
          800: '#9D174D',
          900: '#831843',
        },

        // Secondary Accent - Blue (Trust + Growth)
        blue: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },

        // Tertiary Accent - Green (Trust + Safety)
        green: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
        },

        // Quaternary Accent - Yellow (Energy + Warmth)
        yellow: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },

        // Semantic Colors
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
      },

      backgroundImage: {
        // Primary Gradients
        'gradient-pink-blue': 'linear-gradient(135deg, #EC4899 0%, #3B82F6 100%)',
        'gradient-blue-green': 'linear-gradient(135deg, #3B82F6 0%, #10B981 100%)',
        'gradient-pink-yellow': 'linear-gradient(135deg, #EC4899 0%, #F59E0B 100%)',
        'gradient-green-yellow': 'linear-gradient(135deg, #10B981 0%, #F59E0B 100%)',

        // Black Depth Gradients
        'gradient-black-pink': 'linear-gradient(135deg, #0A0A0A 0%, #EC4899 100%)',
        'gradient-black-blue': 'linear-gradient(135deg, #0A0A0A 0%, #3B82F6 100%)',
        'gradient-black-green': 'linear-gradient(135deg, #0A0A0A 0%, #10B981 100%)',
        'gradient-black-yellow': 'linear-gradient(135deg, #0A0A0A 0%, #F59E0B 100%)',

        // Multi-stop Gradients
        'gradient-aurora': 'linear-gradient(135deg, #EC4899 0%, #3B82F6 50%, #10B981 100%)',
        'gradient-spectrum': 'linear-gradient(135deg, #EC4899 0%, #F59E0B 33%, #10B981 66%, #3B82F6 100%)',

        // Radial Gradients
        'gradient-radial-pink': 'radial-gradient(circle at center, rgba(236, 72, 153, 0.3) 0%, transparent 70%)',
        'gradient-radial-blue': 'radial-gradient(circle at center, rgba(59, 130, 246, 0.3) 0%, transparent 70%)',
        'gradient-radial-green': 'radial-gradient(circle at center, rgba(16, 185, 129, 0.3) 0%, transparent 70%)',

        // Mesh Gradients
        'gradient-mesh': `
          radial-gradient(at 40% 20%, rgba(236, 72, 153, 0.3) 0px, transparent 50%),
          radial-gradient(at 80% 0%, rgba(59, 130, 246, 0.3) 0px, transparent 50%),
          radial-gradient(at 0% 50%, rgba(16, 185, 129, 0.2) 0px, transparent 50%),
          radial-gradient(at 80% 50%, rgba(245, 158, 11, 0.2) 0px, transparent 50%),
          radial-gradient(at 0% 100%, rgba(236, 72, 153, 0.2) 0px, transparent 50%)
        `,
      },

      fontFamily: {
        heading: ['"Space Grotesk"', '"Inter"', 'system-ui', 'sans-serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },

      fontSize: {
        'display-1': ['4.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-2': ['3.75rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-3': ['3rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
      },

      boxShadow: {
        // Glow Shadows
        'glow-pink': '0 0 40px rgba(236, 72, 153, 0.4), 0 0 80px rgba(236, 72, 153, 0.2)',
        'glow-blue': '0 0 40px rgba(59, 130, 246, 0.4), 0 0 80px rgba(59, 130, 246, 0.2)',
        'glow-green': '0 0 40px rgba(16, 185, 129, 0.4), 0 0 80px rgba(16, 185, 129, 0.2)',
        'glow-yellow': '0 0 40px rgba(245, 158, 11, 0.4), 0 0 80px rgba(245, 158, 11, 0.2)',
        'glow-white': '0 0 40px rgba(255, 255, 255, 0.3), 0 0 80px rgba(255, 255, 255, 0.15)',

        // Subtle Glow
        'glow-pink-sm': '0 0 20px rgba(236, 72, 153, 0.3)',
        'glow-blue-sm': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-green-sm': '0 0 20px rgba(16, 185, 129, 0.3)',
        'glow-yellow-sm': '0 0 20px rgba(245, 158, 11, 0.3)',

        // Elevation Shadows (Dark Mode Optimized)
        'elevation-1': '0 2px 4px rgba(0, 0, 0, 0.4)',
        'elevation-2': '0 4px 8px rgba(0, 0, 0, 0.5)',
        'elevation-3': '0 8px 16px rgba(0, 0, 0, 0.6)',
        'elevation-4': '0 16px 32px rgba(0, 0, 0, 0.7)',
        'elevation-5': '0 24px 48px rgba(0, 0, 0, 0.8)',

        // Card shadows
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)',
        'card-hover': '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
      },

      animation: {
        'gradient-shift': 'gradient-shift 8s ease infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        'fade-in-down': 'fadeInDown 0.6s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.4s ease-out',
        'heartbeat': 'heartbeat 1.5s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'avatar-pulse': 'avatarPulse 4s ease-in-out infinite',
        'border-glow': 'borderGlow 3s ease-in-out infinite',
      },

      keyframes: {
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(236, 72, 153, 0.4)' },
          '50%': { boxShadow: '0 0 40px rgba(236, 72, 153, 0.8)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'fadeIn': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fadeInUp': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fadeInDown': {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scaleIn': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slideUp': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slideDown': {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'heartbeat': {
          '0%, 100%': { transform: 'scale(1)' },
          '14%': { transform: 'scale(1.1)' },
          '28%': { transform: 'scale(1)' },
          '42%': { transform: 'scale(1.1)' },
          '70%': { transform: 'scale(1)' },
        },
        'avatarPulse': {
          '0%, 100%': {
            boxShadow: '0 0 0 0 rgba(236, 72, 153, 0.4)',
            transform: 'scale(1)',
          },
          '50%': {
            boxShadow: '0 0 0 20px rgba(236, 72, 153, 0)',
            transform: 'scale(1.02)',
          },
        },
        'borderGlow': {
          '0%, 100%': {
            borderColor: 'rgba(236, 72, 153, 0.5)',
            boxShadow: '0 0 20px rgba(236, 72, 153, 0.3)',
          },
          '33%': {
            borderColor: 'rgba(59, 130, 246, 0.5)',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)',
          },
          '66%': {
            borderColor: 'rgba(16, 185, 129, 0.5)',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)',
          },
        },
      },

      // Extended max-width for larger screens (1440px, 1920px)
      maxWidth: {
        '7xl': '1400px',    // Increased from default 80rem (1280px)
        '8xl': '1600px',    // For ultra-wide displays
        '9xl': '1920px',    // Full ultra-wide support
      },

      // Custom screens for 1440px and 1920px optimization
      screens: {
        'xs': '375px',
        '3xl': '1440px',
        '4xl': '1920px',
      },

      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },

      backdropBlur: {
        xs: '2px',
      },

      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
        '2000': '2000ms',
      },

      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    },
  },
  plugins: [
    // Custom plugin for text gradient
    function({ addUtilities }) {
      addUtilities({
        '.text-gradient-pink-blue': {
          background: 'linear-gradient(135deg, #EC4899 0%, #3B82F6 100%)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        '.text-gradient-blue-green': {
          background: 'linear-gradient(135deg, #3B82F6 0%, #10B981 100%)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        '.text-gradient-pink-yellow': {
          background: 'linear-gradient(135deg, #EC4899 0%, #F59E0B 100%)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        '.text-gradient-aurora': {
          background: 'linear-gradient(135deg, #EC4899 0%, #3B82F6 50%, #10B981 100%)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        '.bg-glass': {
          background: 'rgba(26, 26, 26, 0.8)',
          backdropFilter: 'blur(12px)',
          '-webkit-backdrop-filter': 'blur(12px)',
        },
        '.bg-glass-light': {
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(12px)',
          '-webkit-backdrop-filter': 'blur(12px)',
        },
        '.border-gradient': {
          border: '2px solid transparent',
          backgroundImage: 'linear-gradient(#0A0A0A, #0A0A0A), linear-gradient(135deg, #EC4899 0%, #3B82F6 100%)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
        },
      });
    },
  ],
};
