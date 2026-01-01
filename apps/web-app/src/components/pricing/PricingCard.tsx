/**
 * PricingCard Component
 *
 * Pixel-perfect pricing card following Flamoral Design System.
 * Features glass morphism, gradient borders, and tier-specific glows.
 *
 * @example
 * <PricingCard
 *   plan={plan}
 *   isCurrentPlan={false}
 *   onSelect={() => handleSubscribe(plan)}
 *   interval="monthly"
 * />
 */

import React, { memo } from 'react';

export interface PricingPlan {
  id: string;
  name: string;
  tier: string;
  price: number;
  currency?: string;
  interval?: 'month' | 'year';
  features: string[];
  highlighted?: boolean;
  bestValue?: boolean;
  badge?: string;
}

interface PricingCardProps {
  plan: PricingPlan;
  isCurrentPlan?: boolean;
  onSelect?: () => void;
  interval?: 'monthly' | 'yearly';
  loading?: boolean;
  className?: string;
}

// Tier-specific styling configurations
const TIER_STYLES: Record<string, {
  gradient: string;
  glowClass: string;
  iconBg: string;
  accentColor: string;
}> = {
  free: {
    gradient: 'from-gray-500 to-gray-600',
    glowClass: '',
    iconBg: 'bg-gray-500/20',
    accentColor: 'text-gray-400',
  },
  basic: {
    gradient: 'from-blue-500 to-blue-600',
    glowClass: 'hover:shadow-fm-glow-cyan',
    iconBg: 'bg-blue-500/20',
    accentColor: 'text-blue-400',
  },
  plus: {
    gradient: 'from-emerald-500 to-teal-500',
    glowClass: 'hover:shadow-fm-glow-mint',
    iconBg: 'bg-emerald-500/20',
    accentColor: 'text-emerald-400',
  },
  premium: {
    gradient: 'from-fm-pink to-fm-violet',
    glowClass: 'hover:shadow-fm-glow-pink shadow-fm-glow-pink/50',
    iconBg: 'bg-fm-pink/20',
    accentColor: 'text-fm-pink',
  },
  premium_plus: {
    gradient: 'from-fm-cyan to-blue-500',
    glowClass: 'hover:shadow-fm-glow-cyan',
    iconBg: 'bg-fm-cyan/20',
    accentColor: 'text-fm-cyan',
  },
  elite: {
    gradient: 'from-amber-500 to-yellow-500',
    glowClass: 'hover:shadow-fm-glow-gold shadow-fm-glow-gold/30',
    iconBg: 'bg-amber-500/20',
    accentColor: 'text-amber-400',
  },
};

// Tier icons
const TIER_ICONS: Record<string, React.ReactNode> = {
  free: (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
    </svg>
  ),
  basic: (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  ),
  plus: (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
    </svg>
  ),
  premium: (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3H5v1a1 1 0 001 1h12a1 1 0 001-1v-1z" />
    </svg>
  ),
  premium_plus: (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 2l-6 8 12 12 12-12-6-8H6zm13.2 6.8l-7.2 7.2-7.2-7.2L7.2 4h9.6l2.4 4.8z" />
    </svg>
  ),
  elite: (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm-1.06 13.54L7.4 12l1.41-1.41 2.12 2.12 4.24-4.24 1.41 1.41-5.64 5.66z" />
    </svg>
  ),
};

const PricingCard: React.FC<PricingCardProps> = memo(({
  plan,
  isCurrentPlan = false,
  onSelect,
  interval = 'monthly',
  loading = false,
  className = '',
}) => {
  const tierId = plan.id.toLowerCase().replace('-', '_');
  const styles = TIER_STYLES[tierId] || TIER_STYLES.free;
  const icon = TIER_ICONS[tierId] || TIER_ICONS.free;

  // Calculate yearly price with 20% discount
  const displayPrice = interval === 'yearly' && plan.price > 0
    ? (plan.price * 12 * 0.8).toFixed(2)
    : plan.price.toFixed(2);

  const monthlyEquivalent = interval === 'yearly' && plan.price > 0
    ? (parseFloat(displayPrice) / 12).toFixed(2)
    : null;

  return (
    <div
      className={`
        relative flex flex-col
        w-full min-w-[180px] max-w-[320px]
        rounded-fm-card overflow-hidden
        transition-all duration-fm-base ease-fm
        bg-fm-surface-card
        border border-fm-border-subtle
        ${plan.highlighted ? 'border-fm-pink scale-[1.02] z-10' : ''}
        ${plan.bestValue ? 'border-fm-mint' : ''}
        ${isCurrentPlan ? 'border-fm-success' : ''}
        ${styles.glowClass}
        hover:-translate-y-1
        ${className}
      `}
    >
      {/* Badge */}
      {(plan.highlighted || plan.bestValue || plan.badge) && (
        <div
          className={`
            absolute -top-0 left-1/2 -translate-x-1/2 -translate-y-1/2
            px-3 py-1 rounded-fm-chip
            text-[10px] font-semibold uppercase tracking-wider
            text-white
            ${plan.highlighted ? 'bg-gradient-to-r from-fm-pink to-fm-violet' : ''}
            ${plan.bestValue && !plan.highlighted ? 'bg-fm-success' : ''}
          `}
        >
          {plan.badge || (plan.highlighted ? 'Most Popular' : plan.bestValue ? 'Best Value' : '')}
        </div>
      )}

      {/* Header with gradient */}
      <div className={`bg-gradient-to-br ${styles.gradient} p-fm-5`}>
        {/* Icon and Name */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`${styles.iconBg} p-2 rounded-lg text-white`}>
            {icon}
          </div>
          <h3 className="text-xl font-bold text-white">{plan.name}</h3>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-white">
            ${displayPrice}
          </span>
          {plan.price > 0 && (
            <span className="text-white/70 text-sm">
              /{interval === 'yearly' ? 'year' : 'month'}
            </span>
          )}
        </div>

        {/* Monthly equivalent for yearly */}
        {monthlyEquivalent && (
          <p className="text-white/60 text-xs mt-1">
            ${monthlyEquivalent}/mo billed annually
          </p>
        )}
      </div>

      {/* Features */}
      <div className="flex-1 p-fm-5 bg-fm-glass backdrop-blur-sm">
        <ul className="space-y-3 mb-6">
          {plan.features.slice(0, 6).map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <svg
                className="w-4 h-4 text-fm-success flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm text-fm-text-secondary leading-tight">
                {feature}
              </span>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        <button
          onClick={onSelect}
          disabled={isCurrentPlan || loading || plan.price === 0}
          className={`
            w-full py-3 rounded-xl font-medium
            transition-all duration-fm-base ease-fm
            ${isCurrentPlan || plan.price === 0
              ? 'bg-fm-surface-elevated text-fm-text-muted cursor-not-allowed'
              : 'bg-gradient-to-r from-fm-pink to-fm-violet text-white hover:opacity-90 hover:shadow-fm-glow-pink'
            }
          `}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Processing...
            </span>
          ) : isCurrentPlan ? (
            'Current Plan'
          ) : plan.price === 0 ? (
            'Free Forever'
          ) : (
            'Upgrade Now'
          )}
        </button>
      </div>
    </div>
  );
});

PricingCard.displayName = 'PricingCard';

export default PricingCard;
