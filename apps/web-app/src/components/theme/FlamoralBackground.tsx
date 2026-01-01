/**
 * FlamoralBackground Component
 *
 * Single source of truth for the global Flamoral background.
 * Used across all pages: marketing, auth, dashboard, modals, etc.
 *
 * Features:
 * - Layered gradients for depth (2 radials + 1 base linear)
 * - Near-black base for gradient visibility
 * - Respects prefers-reduced-motion
 * - Optional noise texture overlay
 * - No layout shift or GPU overload
 */

import React, { memo } from 'react';

interface FlamoralBackgroundProps {
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

const FlamoralBackground: React.FC<FlamoralBackgroundProps> = memo(({
  className = '',
  animated = false,
  withNoise = true,
  children,
  fixed = false,
}) => {
  return (
    <div
      className={`
        ${fixed ? 'fixed inset-0' : 'relative min-h-screen'}
        overflow-hidden
        ${className}
      `}
      style={{
        background: '#08080c',
      }}
    >
      {/* Base gradient layer */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, #08080c 0%, #0d0d14 50%, #08080c 100%)',
        }}
      />

      {/* Pink radial glow (top center) */}
      <div
        className={`
          absolute inset-0 pointer-events-none
          ${animated ? 'animate-pulse-slow' : ''}
        `}
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(212, 88, 122, 0.15) 0%, transparent 50%)',
        }}
      />

      {/* Blue radial glow (right side) */}
      <div
        className={`
          absolute inset-0 pointer-events-none
          ${animated ? 'animate-pulse-slow [animation-delay:1.5s]' : ''}
        `}
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 100% 50%, rgba(91, 127, 184, 0.1) 0%, transparent 50%)',
        }}
      />

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
        <div className="relative z-10">
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
});

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
    romance: 'linear-gradient(135deg, rgba(212, 88, 122, 0.1) 0%, rgba(123, 97, 255, 0.1) 50%, rgba(46, 212, 255, 0.1) 100%)',
    trust: 'linear-gradient(135deg, rgba(26, 39, 68, 0.3) 0%, rgba(59, 130, 246, 0.2) 50%, rgba(46, 212, 255, 0.1) 100%)',
    elite: 'linear-gradient(135deg, rgba(139, 105, 20, 0.2) 0%, rgba(212, 165, 116, 0.15) 50%, rgba(245, 214, 138, 0.1) 100%)',
  };

  return (
    <div
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ background: gradients[variant] }}
    />
  );
});

BackgroundGradientOverlay.displayName = 'BackgroundGradientOverlay';
