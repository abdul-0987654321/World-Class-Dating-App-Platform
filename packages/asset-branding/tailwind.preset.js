/**
 * Flamoral Brand System - Tailwind CSS Preset
 *
 * This preset extends Tailwind CSS with Flamoral design tokens.
 * Add this to your tailwind.config.js presets array.
 *
 * Usage:
 * module.exports = {
 *   presets: [require('@flamoral/asset-branding/tailwind.preset.js')],
 *   // ... your config
 * }
 */

const tokens = require('./tokens.json');

module.exports = {
  theme: {
    extend: {
      colors: {
        // Primary Colors (Blue Gradient)
        primary: {
          DEFAULT: tokens.colors.primary['gradient-start'],
          'gradient-start': tokens.colors.primary['gradient-start'],
          'gradient-end': tokens.colors.primary['gradient-end'],
        },

        // Secondary Colors (Pink)
        secondary: {
          DEFAULT: tokens.colors.secondary.pink,
          pink: tokens.colors.secondary.pink,
          'pink-light': tokens.colors.secondary['pink-light'],
        },

        // Accent Colors (Green)
        accent: {
          DEFAULT: tokens.colors.accent.green,
          green: tokens.colors.accent.green,
          'green-dark': tokens.colors.accent['green-dark'],
        },

        // Surface Colors
        surface: {
          black: tokens.colors.surface.black,
          dark: tokens.colors.surface.dark,
          'dark-elevated': tokens.colors.surface['dark-elevated'],
        },

        // Text Colors
        text: {
          primary: tokens.colors.text.primary,
          secondary: tokens.colors.text.secondary,
          muted: tokens.colors.text.muted,
        },

        // State Colors
        success: tokens.colors.state.success,
        error: tokens.colors.state.error,
        warning: tokens.colors.state.warning,
        info: tokens.colors.state.info,
      },

      fontFamily: {
        display: tokens.typography.fontFamily.display.split(', '),
        body: tokens.typography.fontFamily.body.split(', '),
        mono: tokens.typography.fontFamily.mono.split(', '),
      },

      fontSize: {
        xs: tokens.typography.fontSize.xs,
        sm: tokens.typography.fontSize.sm,
        base: tokens.typography.fontSize.base,
        lg: tokens.typography.fontSize.lg,
        xl: tokens.typography.fontSize.xl,
        '2xl': tokens.typography.fontSize['2xl'],
        '3xl': tokens.typography.fontSize['3xl'],
        '4xl': tokens.typography.fontSize['4xl'],
        '5xl': tokens.typography.fontSize['5xl'],
      },

      spacing: {
        xs: tokens.spacing.xs,
        sm: tokens.spacing.sm,
        md: tokens.spacing.md,
        lg: tokens.spacing.lg,
        xl: tokens.spacing.xl,
        '2xl': tokens.spacing['2xl'],
      },

      borderRadius: {
        sm: tokens.borderRadius.sm,
        md: tokens.borderRadius.md,
        lg: tokens.borderRadius.lg,
        xl: tokens.borderRadius.xl,
        full: tokens.borderRadius.full,
      },

      boxShadow: {
        'glow-blue': tokens.shadows['glow-blue'],
        'glow-pink': tokens.shadows['glow-pink'],
        'glow-green': '0 0 20px rgba(0, 255, 127, 0.3)',
        elevated: tokens.shadows.elevated,
        card: '0 2px 10px rgba(0, 0, 0, 0.3)',
      },

      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, ' + tokens.colors.primary['gradient-start'] + ', ' + tokens.colors.primary['gradient-end'] + ')',
        'gradient-secondary': 'linear-gradient(135deg, ' + tokens.colors.secondary.pink + ', ' + tokens.colors.secondary['pink-light'] + ')',
        'gradient-accent': 'linear-gradient(135deg, ' + tokens.colors.accent['green-dark'] + ', ' + tokens.colors.accent.green + ')',
        'gradient-radial': 'radial-gradient(ellipse at center, var(--tw-gradient-stops))',
      },

      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
      },

      keyframes: {
        'glow-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },

      transitionDuration: {
        fast: '150ms',
        normal: '250ms',
        slow: '400ms',
      },

      zIndex: {
        dropdown: '100',
        sticky: '200',
        'modal-backdrop': '300',
        modal: '400',
        popover: '500',
        tooltip: '600',
        toast: '700',
      },
    },
  },

  plugins: [
    // Custom plugin for Flamoral utilities
    function(params) {
      var addUtilities = params.addUtilities;
      var addComponents = params.addComponents;
      var theme = params.theme;

      // Gradient text utilities
      addUtilities({
        '.text-gradient-primary': {
          background: 'linear-gradient(135deg, ' + theme('colors.primary.gradient-start') + ', ' + theme('colors.primary.gradient-end') + ')',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        '.text-gradient-secondary': {
          background: 'linear-gradient(135deg, ' + theme('colors.secondary.pink') + ', ' + theme('colors.secondary.pink-light') + ')',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        '.text-gradient-accent': {
          background: 'linear-gradient(135deg, ' + theme('colors.accent.green-dark') + ', ' + theme('colors.accent.green') + ')',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
      });

      // Glass effect component
      addComponents({
        '.glass': {
          background: 'rgba(26, 26, 26, 0.8)',
          'backdrop-filter': 'blur(10px)',
          '-webkit-backdrop-filter': 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
        '.glass-light': {
          background: 'rgba(42, 42, 42, 0.6)',
          'backdrop-filter': 'blur(10px)',
          '-webkit-backdrop-filter': 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        },
      });
    },
  ],
};
