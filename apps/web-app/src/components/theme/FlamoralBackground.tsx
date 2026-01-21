/**
 * FlamoralBackground Component v2.0
 *
 * Single source of truth for the global Flamoral background.
 * Implements the layered gradient system with different brightness levels.
 *
 * Variants:
 * - landing: Dramatic, deepest gradients (for landing/marketing pages)
 * - interior: Brighter for readability (for logged-in pages)
 * - dashboard: Brightest for data-heavy views
 * - auth: Centered glow for forms
 * - modal: Contained glow for overlays
 *
 * Features:
 * - Layered gradients for depth
 * - Near-black base for gradient visibility
 * - Respects prefers-reduced-motion
 * - Optional noise texture overlay
 * - No layout shift or GPU overload
 */

import React, { memo } from 'react';

export type BackgroundVariant = 'landing' | 'interior' | 'dashboard' | 'auth' | 'modal';

interface FlamoralBackgroundProps {
  /** Background variant - determines brightness level */
  variant?: BackgroundVariant;
  /** Additional CSS classes */
  className?: string;
  /** Enable subtle animated gradient shift */
  animated?: boolean;
  /** Show noise texture overlay */
  withNoise?: boolean;
  /** Children to render on top of background */
  children?: React.ReactNode;
  /** Fixed position (covers viewport) or relative (fills container) */
  fixed?: boolean;
}

// Background configuration per variant — BRIGHTER values for better readability
const backgroundConfig = {
  landing: {
    base: '#14141f', // Brighter from #0a0a0f
    gradient: 'linear-gradient(180deg, #14141f 0%, #1e1e2d 50%, #282840 100%)',
    glow1:
      'radial-gradient(ellipse 80% 50% at 20% 20%, rgba(168, 85, 247, 0.20) 0%, transparent 50%)',
    glow2:
      'radial-gradient(ellipse 60% 40% at 80% 80%, rgba(255, 107, 122, 0.18) 0%, transparent 50%)',
    glow3:
      'radial-gradient(ellipse 50% 50% at 50% 100%, rgba(34, 211, 238, 0.12) 0%, transparent 40%)',
    glowOpacity: 1,
  },
  interior: {
    base: '#282840', // Brighter from #1a1a25
    gradient: 'linear-gradient(180deg, #282840 0%, #282840 100%)',
    glow1:
      'radial-gradient(ellipse 80% 50% at 20% 20%, rgba(168, 85, 247, 0.15) 0%, transparent 50%)',
    glow2:
      'radial-gradient(ellipse 60% 40% at 80% 80%, rgba(255, 107, 122, 0.12) 0%, transparent 50%)',
    glow3: null,
    glowOpacity: 0.9,
  },
  dashboard: {
    base: '#323250', // Brighter from #232330
    gradient: 'linear-gradient(180deg, #323250 0%, #282840 100%)',
    glow1:
      'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(168, 85, 247, 0.10) 0%, transparent 50%)',
    glow2: null,
    glow3: null,
    glowOpacity: 0.7,
  },
  auth: {
    base: '#1e1e2d', // Brighter from #12121a
    gradient: 'linear-gradient(180deg, #1e1e2d 0%, #282840 100%)',
    glow1:
      'radial-gradient(ellipse 50% 50% at 50% 30%, rgba(255, 107, 122, 0.20) 0%, transparent 60%)',
    glow2: null,
    glow3: null,
    glowOpacity: 1,
  },
  modal: {
    base: '#1e1e2d', // Brighter from #12121a
    gradient: 'linear-gradient(180deg, #1e1e2d 0%, #282840 100%)',
    glow1:
      'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(168, 85, 247, 0.12) 0%, transparent 60%)',
    glow2: null,
    glow3: null,
    glowOpacity: 0.6,
  },
};

const FlamoralBackground: React.FC<FlamoralBackgroundProps> = memo(
  ({
    variant = 'interior',
    className = '',
    animated = false,
    withNoise = true,
    children,
    fixed = false,
  }) => {
    const config = backgroundConfig[variant];

    return (
      <div
        className={`
        ${fixed ? 'fixed inset-0' : 'relative min-h-screen'}
        overflow-hidden
        ${className}
      `}
        style={{
          background: config.base,
        }}
      >
        {/* Base gradient layer */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: config.gradient,
          }}
        />

        {/* Primary glow */}
        {config.glow1 && (
          <div
            className={`
            absolute inset-0 pointer-events-none
            ${animated ? 'animate-pulse-slow' : ''}
          `}
            style={{
              background: config.glow1,
              opacity: config.glowOpacity,
            }}
          />
        )}

        {/* Secondary glow */}
        {config.glow2 && (
          <div
            className={`
            absolute inset-0 pointer-events-none
            ${animated ? 'animate-pulse-slow [animation-delay:1.5s]' : ''}
          `}
            style={{
              background: config.glow2,
              opacity: config.glowOpacity,
            }}
          />
        )}

        {/* Tertiary glow (landing only) */}
        {config.glow3 && (
          <div
            className={`
            absolute inset-0 pointer-events-none
            ${animated ? 'animate-pulse-slow [animation-delay:3s]' : ''}
          `}
            style={{
              background: config.glow3,
              opacity: config.glowOpacity,
            }}
          />
        )}

        {/* Noise texture overlay for premium feel */}
        {withNoise && (
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.02]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'repeat',
            }}
          />
        )}

        {/* Content layer */}
        {children && (
          <div
            className={`relative z-10 ${fixed ? 'h-screen overflow-y-auto overflow-x-hidden' : ''}`}
          >
            {children}
          </div>
        )}

        {/* Reduced motion support */}
        <style>{`
        @media (prefers-reduced-motion: reduce) {
          .animate-pulse-slow {
            animation: none !important;
          }
        }
      `}</style>
      </div>
    );
  }
);

FlamoralBackground.displayName = 'FlamoralBackground';

export default FlamoralBackground;

/**
 * BackgroundGradientOverlay
 * For use in modals, cards, and sections that need the gradient feel
 * without the full background component
 */
export const BackgroundGradientOverlay: React.FC<{
  variant?: 'romance' | 'trust' | 'elite';
  className?: string;
}> = memo(({ variant = 'romance', className = '' }) => {
  const gradients = {
    romance:
      'linear-gradient(135deg, rgba(255, 107, 122, 0.1) 0%, rgba(168, 85, 247, 0.1) 50%, rgba(34, 211, 238, 0.1) 100%)',
    trust:
      'linear-gradient(135deg, rgba(30, 58, 95, 0.3) 0%, rgba(37, 99, 235, 0.2) 50%, rgba(34, 211, 238, 0.1) 100%)',
    elite:
      'linear-gradient(135deg, rgba(120, 53, 15, 0.2) 0%, rgba(205, 127, 50, 0.15) 50%, rgba(245, 158, 11, 0.1) 100%)',
  };

  return (
    <div
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ background: gradients[variant] }}
    />
  );
});

BackgroundGradientOverlay.displayName = 'BackgroundGradientOverlay';

/**
 * Export CSS class helpers for use with className prop
 */
export const bgClasses = {
  landing: 'fm-bg-landing',
  interior: 'fm-bg-interior',
  dashboard: 'fm-bg-dashboard',
  auth: 'fm-bg-auth',
} as const;
