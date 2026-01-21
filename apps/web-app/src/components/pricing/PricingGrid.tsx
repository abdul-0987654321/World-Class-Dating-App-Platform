/**
 * PricingGrid Component
 *
 * Responsive grid layout for Flamoral's 6-tier pricing system.
 * Features: horizontal scroll on mobile, grid on desktop, interval toggle.
 *
 * @example
 * <PricingGrid
 *   currentPlanId="basic"
 *   onSelectPlan={(plan) => handleSubscribe(plan)}
 * />
 */

import React, { useState, memo } from 'react';
import PricingCard, { PricingPlan } from './PricingCard';

interface PricingGridProps {
  currentPlanId?: string;
  onSelectPlan?: (plan: PricingPlan) => void;
  loading?: boolean;
  className?: string;
}

// Flamoral 6-tier pricing data
const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    tier: 'free',
    price: 0,
    currency: 'USD',
    interval: 'month',
    features: [
      '10 likes per day',
      'Basic filters',
      'See who likes you (blurred)',
      'Limited messaging',
      'Standard support',
      'Ad-supported',
    ],
  },
  {
    id: 'basic',
    name: 'Basic',
    tier: 'basic',
    price: 9.99,
    currency: 'USD',
    interval: 'month',
    features: [
      '50 likes per day',
      'Advanced filters',
      'See who likes you',
      'Unlimited messaging',
      '1 Super Like/day',
      'Ad-free experience',
    ],
  },
  {
    id: 'plus',
    name: 'Plus',
    tier: 'plus',
    price: 19.99,
    currency: 'USD',
    interval: 'month',
    bestValue: true,
    badge: 'Best Value',
    features: [
      'Unlimited likes',
      'All filters unlocked',
      '5 Super Likes/day',
      '1 Boost/week',
      'Read receipts',
      'Priority support',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    tier: 'premium',
    price: 29.99,
    currency: 'USD',
    interval: 'month',
    highlighted: true,
    badge: 'Most Popular',
    features: [
      'Everything in Plus',
      '10 Super Likes/day',
      '3 Boosts/week',
      'AI Icebreakers',
      'Advanced analytics',
      'Video dating access',
    ],
  },
  {
    id: 'premium-plus',
    name: 'Premium+',
    tier: 'premium_plus',
    price: 39.99,
    currency: 'USD',
    interval: 'month',
    features: [
      'Everything in Premium',
      'Unlimited Super Likes',
      '1 Boost/day',
      'Priority in discover',
      'Profile highlighting',
      'Dedicated support',
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    tier: 'elite',
    price: 59.99,
    currency: 'USD',
    interval: 'month',
    features: [
      'Everything in Premium+',
      'Unlimited Boosts',
      'Speed Dating access',
      'Concierge matching',
      'VIP events access',
      'White-glove support',
    ],
  },
];

const PricingGrid: React.FC<PricingGridProps> = memo(
  ({ currentPlanId, onSelectPlan, loading = false, className = '' }) => {
    const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');

    return (
      <div className={`w-full ${className}`}>
        {/* Interval Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center bg-fm-surface-card rounded-full p-1 border border-fm-border-subtle">
            <button
              onClick={() => setInterval('monthly')}
              className={`
              px-6 py-2 rounded-full text-sm font-medium
              transition-all duration-fm-base ease-fm
              ${
                interval === 'monthly'
                  ? 'bg-gradient-to-r from-fm-pink to-fm-violet text-white shadow-sm'
                  : 'text-fm-text-muted hover:text-fm-text'
              }
            `}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval('yearly')}
              className={`
              px-6 py-2 rounded-full text-sm font-medium
              transition-all duration-fm-base ease-fm
              flex items-center gap-2
              ${
                interval === 'yearly'
                  ? 'bg-gradient-to-r from-fm-pink to-fm-violet text-white shadow-sm'
                  : 'text-fm-text-muted hover:text-fm-text'
              }
            `}
            >
              Yearly
              <span
                className={`
              text-[10px] px-2 py-0.5 rounded-full font-bold
              ${
                interval === 'yearly'
                  ? 'bg-white/20 text-white'
                  : 'bg-fm-success/20 text-fm-success'
              }
            `}
              >
                -20%
              </span>
            </button>
          </div>
        </div>

        {/* Desktop Grid (hidden on mobile) */}
        <div className="hidden lg:grid lg:grid-cols-3 xl:grid-cols-6 gap-4 justify-items-center">
          {PRICING_PLANS.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              isCurrentPlan={currentPlanId === plan.id}
              onSelect={() => onSelectPlan?.(plan)}
              interval={interval}
              loading={loading}
            />
          ))}
        </div>

        {/* Tablet Grid (3 columns) */}
        <div className="hidden md:grid lg:hidden md:grid-cols-3 gap-4 justify-items-center">
          {PRICING_PLANS.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              isCurrentPlan={currentPlanId === plan.id}
              onSelect={() => onSelectPlan?.(plan)}
              interval={interval}
              loading={loading}
            />
          ))}
        </div>

        {/* Mobile Horizontal Scroll */}
        <div className="md:hidden">
          <div className="flex gap-4 overflow-x-auto pb-4 px-4 -mx-4 snap-x snap-mandatory scrollbar-hide">
            {PRICING_PLANS.map((plan) => (
              <div
                key={plan.id}
                className="flex-shrink-0 snap-center"
                style={{ width: 'calc(100vw - 64px)', maxWidth: '300px' }}
              >
                <PricingCard
                  plan={plan}
                  isCurrentPlan={currentPlanId === plan.id}
                  onSelect={() => onSelectPlan?.(plan)}
                  interval={interval}
                  loading={loading}
                />
              </div>
            ))}
          </div>

          {/* Scroll indicator dots */}
          <div className="flex justify-center gap-1.5 mt-4">
            {PRICING_PLANS.map((plan, idx) => (
              <div
                key={plan.id}
                className={`
                w-1.5 h-1.5 rounded-full transition-all duration-fm-base
                ${idx === 0 ? 'bg-fm-pink' : 'bg-fm-border-subtle'}
              `}
              />
            ))}
          </div>
        </div>

        {/* Mobile Sticky CTA (for highlighted plan) */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-fm-bg-0 via-fm-bg-0 to-transparent z-50">
          <button
            onClick={() => {
              const premium = PRICING_PLANS.find((p) => p.highlighted);
              if (premium && onSelectPlan) onSelectPlan(premium);
            }}
            disabled={loading || currentPlanId === 'premium'}
            className={`
            w-full py-4 rounded-xl font-semibold text-lg
            transition-all duration-fm-base ease-fm
            ${
              currentPlanId === 'premium'
                ? 'bg-fm-surface-elevated text-fm-text-muted cursor-not-allowed'
                : 'bg-gradient-to-r from-fm-pink to-fm-violet text-white shadow-fm-glow-pink hover:opacity-90'
            }
          `}
          >
            {loading
              ? 'Processing...'
              : currentPlanId === 'premium'
                ? 'Current Plan'
                : 'Get Premium - $29.99/mo'}
          </button>
        </div>

        {/* Bottom padding for mobile sticky CTA */}
        <div className="md:hidden h-24" />

        {/* Guarantee badge */}
        <div className="flex justify-center mt-8">
          <div className="flex items-center gap-2 text-fm-text-muted text-sm">
            <svg className="w-5 h-5 text-fm-success" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>30-day money-back guarantee</span>
            <span className="text-fm-border-subtle">|</span>
            <span>Cancel anytime</span>
          </div>
        </div>

        {/* Hide scrollbar utility */}
        <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      </div>
    );
  }
);

PricingGrid.displayName = 'PricingGrid';

export default PricingGrid;

// Export plans for use elsewhere
export { PRICING_PLANS };
