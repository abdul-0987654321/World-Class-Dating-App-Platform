/**
 * Dynamic Pricing Configuration Service
 *
 * Allows admin users to update subscription prices without code changes.
 * Prices are stored in database and can be updated via admin API.
 */

import { createLogger } from '@flamoral/backend-shared';
import { SubscriptionTier } from './payment.service';

const logger = createLogger('pricing-config-service');

// Billing cycle types
export type BillingCycle = 'monthly' | '3_months' | '6_months' | 'yearly';

// Currency codes
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD';

// Price configuration interface
export interface TierPriceConfig {
  tier: SubscriptionTier;
  billingCycle: BillingCycle;
  currency: CurrencyCode;
  amount: number; // In cents
  stripePriceId: string;
  isActive: boolean;
  discountPercentage?: number;
  trialDays?: number;
}

// Regional pricing configuration
export interface RegionalPricing {
  region: string;
  currency: CurrencyCode;
  priceMultiplier: number; // e.g., 0.5 for 50% of base price
}

// Coin package configuration
export interface CoinPackageConfig {
  sku: string;
  coins: number;
  bonusCoins: number;
  currency: CurrencyCode;
  amount: number; // In cents
  stripePriceId: string;
  isActive: boolean;
}

// Boost package configuration
export interface BoostPackageConfig {
  sku: string;
  durationMinutes: number;
  quantity: number;
  currency: CurrencyCode;
  amount: number; // In cents
  stripePriceId: string;
  isActive: boolean;
}

// Default pricing configuration - used as fallback
const DEFAULT_SUBSCRIPTION_PRICES: TierPriceConfig[] = [
  // Free tier (no price)
  { tier: 'free', billingCycle: 'monthly', currency: 'USD', amount: 0, stripePriceId: '', isActive: true },

  // Basic tier
  { tier: 'basic', billingCycle: 'monthly', currency: 'USD', amount: 999, stripePriceId: 'price_basic_monthly', isActive: true },
  { tier: 'basic', billingCycle: 'yearly', currency: 'USD', amount: 9599, stripePriceId: 'price_basic_yearly', isActive: true, discountPercentage: 20 },

  // Plus tier
  { tier: 'plus', billingCycle: 'monthly', currency: 'USD', amount: 1999, stripePriceId: 'price_plus_monthly', isActive: true },
  { tier: 'plus', billingCycle: 'yearly', currency: 'USD', amount: 19199, stripePriceId: 'price_plus_yearly', isActive: true, discountPercentage: 20 },

  // Premium tier
  { tier: 'premium', billingCycle: 'monthly', currency: 'USD', amount: 2999, stripePriceId: 'price_premium_monthly', isActive: true, trialDays: 7 },
  { tier: 'premium', billingCycle: 'yearly', currency: 'USD', amount: 28799, stripePriceId: 'price_premium_yearly', isActive: true, discountPercentage: 20, trialDays: 7 },

  // Premium+ tier
  { tier: 'premium_plus', billingCycle: 'monthly', currency: 'USD', amount: 3999, stripePriceId: 'price_premium_plus_monthly', isActive: true },
  { tier: 'premium_plus', billingCycle: 'yearly', currency: 'USD', amount: 38399, stripePriceId: 'price_premium_plus_yearly', isActive: true, discountPercentage: 20 },

  // Elite tier
  { tier: 'elite', billingCycle: 'monthly', currency: 'USD', amount: 5999, stripePriceId: 'price_elite_monthly', isActive: true },
  { tier: 'elite', billingCycle: 'yearly', currency: 'USD', amount: 57599, stripePriceId: 'price_elite_yearly', isActive: true, discountPercentage: 20 },
];

const DEFAULT_REGIONAL_PRICING: RegionalPricing[] = [
  { region: 'US', currency: 'USD', priceMultiplier: 1.0 },
  { region: 'EU', currency: 'EUR', priceMultiplier: 0.95 },
  { region: 'UK', currency: 'GBP', priceMultiplier: 0.80 },
  { region: 'CA', currency: 'CAD', priceMultiplier: 1.30 },
  { region: 'AU', currency: 'AUD', priceMultiplier: 1.50 },
  { region: 'LATAM', currency: 'USD', priceMultiplier: 0.50 },
  { region: 'SSA', currency: 'USD', priceMultiplier: 0.40 },
  { region: 'MENA', currency: 'USD', priceMultiplier: 0.70 },
  { region: 'APAC', currency: 'USD', priceMultiplier: 0.80 },
];

const DEFAULT_COIN_PACKAGES: CoinPackageConfig[] = [
  { sku: 'COIN_PACK_SMALL', coins: 100, bonusCoins: 0, currency: 'USD', amount: 499, stripePriceId: 'price_coins_small', isActive: true },
  { sku: 'COIN_PACK_MEDIUM', coins: 500, bonusCoins: 50, currency: 'USD', amount: 1999, stripePriceId: 'price_coins_medium', isActive: true },
  { sku: 'COIN_PACK_LARGE', coins: 1200, bonusCoins: 200, currency: 'USD', amount: 3999, stripePriceId: 'price_coins_large', isActive: true },
  { sku: 'COIN_PACK_XL', coins: 2500, bonusCoins: 500, currency: 'USD', amount: 7499, stripePriceId: 'price_coins_xl', isActive: true },
];

const DEFAULT_BOOST_PACKAGES: BoostPackageConfig[] = [
  { sku: 'BOOST_SINGLE', durationMinutes: 30, quantity: 1, currency: 'USD', amount: 599, stripePriceId: 'price_boost_single', isActive: true },
  { sku: 'BOOST_3_PACK', durationMinutes: 30, quantity: 3, currency: 'USD', amount: 1499, stripePriceId: 'price_boost_3pack', isActive: true },
  { sku: 'BOOST_10_PACK', durationMinutes: 30, quantity: 10, currency: 'USD', amount: 3999, stripePriceId: 'price_boost_10pack', isActive: true },
];

/**
 * Pricing Configuration Service
 *
 * In production, this should:
 * 1. Store configurations in database
 * 2. Cache configurations in Redis
 * 3. Sync with Stripe Price catalog
 * 4. Provide admin API for updates
 */
export class PricingConfigService {
  private subscriptionPrices: Map<string, TierPriceConfig> = new Map();
  private regionalPricing: Map<string, RegionalPricing> = new Map();
  private coinPackages: Map<string, CoinPackageConfig> = new Map();
  private boostPackages: Map<string, BoostPackageConfig> = new Map();
  private lastRefresh: Date = new Date();

  constructor() {
    this.loadDefaultPricing();
  }

  /**
   * Load default pricing into memory
   * In production, this should load from database
   */
  private loadDefaultPricing(): void {
    // Load subscription prices
    for (const price of DEFAULT_SUBSCRIPTION_PRICES) {
      const key = `${price.tier}_${price.billingCycle}_${price.currency}`;
      this.subscriptionPrices.set(key, price);
    }

    // Load regional pricing
    for (const regional of DEFAULT_REGIONAL_PRICING) {
      this.regionalPricing.set(regional.region, regional);
    }

    // Load coin packages
    for (const pkg of DEFAULT_COIN_PACKAGES) {
      this.coinPackages.set(pkg.sku, pkg);
    }

    // Load boost packages
    for (const pkg of DEFAULT_BOOST_PACKAGES) {
      this.boostPackages.set(pkg.sku, pkg);
    }

    logger.info('Pricing configuration loaded');
  }

  /**
   * Refresh pricing from database
   * Call this periodically or on admin update
   */
  async refreshPricing(): Promise<void> {
    // In production, fetch from database here
    // For now, use defaults
    this.loadDefaultPricing();
    this.lastRefresh = new Date();
    logger.info('Pricing configuration refreshed at', this.lastRefresh);
  }

  /**
   * Get subscription price for tier and billing cycle
   */
  getSubscriptionPrice(
    tier: SubscriptionTier,
    billingCycle: BillingCycle = 'monthly',
    currency: CurrencyCode = 'USD'
  ): TierPriceConfig | null {
    const key = `${tier}_${billingCycle}_${currency}`;
    return this.subscriptionPrices.get(key) || null;
  }

  /**
   * Get all subscription prices for a tier
   */
  getTierPrices(tier: SubscriptionTier): TierPriceConfig[] {
    const prices: TierPriceConfig[] = [];
    for (const [, price] of this.subscriptionPrices) {
      if (price.tier === tier && price.isActive) {
        prices.push(price);
      }
    }
    return prices;
  }

  /**
   * Get all active subscription prices
   */
  getAllSubscriptionPrices(): TierPriceConfig[] {
    return Array.from(this.subscriptionPrices.values()).filter(p => p.isActive);
  }

  /**
   * Get regional pricing adjustment
   */
  getRegionalPricing(region: string): RegionalPricing | null {
    return this.regionalPricing.get(region) || this.regionalPricing.get('US') || null;
  }

  /**
   * Calculate price for a region
   */
  calculateRegionalPrice(baseAmount: number, region: string): { amount: number; currency: CurrencyCode } {
    const regional = this.getRegionalPricing(region);
    if (!regional) {
      return { amount: baseAmount, currency: 'USD' };
    }
    return {
      amount: Math.round(baseAmount * regional.priceMultiplier),
      currency: regional.currency,
    };
  }

  /**
   * Get coin package by SKU
   */
  getCoinPackage(sku: string): CoinPackageConfig | null {
    return this.coinPackages.get(sku) || null;
  }

  /**
   * Get all coin packages
   */
  getAllCoinPackages(): CoinPackageConfig[] {
    return Array.from(this.coinPackages.values()).filter(p => p.isActive);
  }

  /**
   * Get boost package by SKU
   */
  getBoostPackage(sku: string): BoostPackageConfig | null {
    return this.boostPackages.get(sku) || null;
  }

  /**
   * Get all boost packages
   */
  getAllBoostPackages(): BoostPackageConfig[] {
    return Array.from(this.boostPackages.values()).filter(p => p.isActive);
  }

  /**
   * Update subscription price (admin only)
   */
  async updateSubscriptionPrice(
    tier: SubscriptionTier,
    billingCycle: BillingCycle,
    currency: CurrencyCode,
    amount: number,
    stripePriceId: string
  ): Promise<boolean> {
    const key = `${tier}_${billingCycle}_${currency}`;
    const existing = this.subscriptionPrices.get(key);

    if (!existing) {
      // Create new price config
      this.subscriptionPrices.set(key, {
        tier,
        billingCycle,
        currency,
        amount,
        stripePriceId,
        isActive: true,
      });
    } else {
      // Update existing
      existing.amount = amount;
      existing.stripePriceId = stripePriceId;
    }

    // In production: save to database here
    logger.info(`Updated price for ${key}: ${amount / 100} ${currency}`);
    return true;
  }

  /**
   * Toggle tier active status
   */
  async setTierActive(tier: SubscriptionTier, isActive: boolean): Promise<boolean> {
    for (const [key, price] of this.subscriptionPrices) {
      if (price.tier === tier) {
        price.isActive = isActive;
      }
    }
    // In production: save to database
    logger.info(`Set tier ${tier} active: ${isActive}`);
    return true;
  }

  /**
   * Get Stripe price ID for a subscription
   */
  getStripePriceId(
    tier: SubscriptionTier,
    billingCycle: BillingCycle = 'monthly',
    currency: CurrencyCode = 'USD'
  ): string | null {
    const price = this.getSubscriptionPrice(tier, billingCycle, currency);
    return price?.stripePriceId || null;
  }

  /**
   * Get formatted price display
   */
  formatPrice(amount: number, currency: CurrencyCode): string {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    });
    return formatter.format(amount / 100);
  }

  /**
   * Get pricing summary for frontend
   */
  getPricingSummary(): {
    subscriptions: Record<SubscriptionTier, { monthly: number; yearly: number; yearlyDiscount: number }>;
    coins: { sku: string; coins: number; price: number }[];
    boosts: { sku: string; quantity: number; price: number }[];
  } {
    const subscriptions: Record<string, { monthly: number; yearly: number; yearlyDiscount: number }> = {};

    const tiers: SubscriptionTier[] = ['free', 'basic', 'plus', 'premium', 'premium_plus', 'elite'];
    for (const tier of tiers) {
      const monthly = this.getSubscriptionPrice(tier, 'monthly');
      const yearly = this.getSubscriptionPrice(tier, 'yearly');
      subscriptions[tier] = {
        monthly: monthly?.amount || 0,
        yearly: yearly?.amount || 0,
        yearlyDiscount: yearly?.discountPercentage || 0,
      };
    }

    return {
      subscriptions: subscriptions as Record<SubscriptionTier, { monthly: number; yearly: number; yearlyDiscount: number }>,
      coins: this.getAllCoinPackages().map(p => ({
        sku: p.sku,
        coins: p.coins + p.bonusCoins,
        price: p.amount,
      })),
      boosts: this.getAllBoostPackages().map(p => ({
        sku: p.sku,
        quantity: p.quantity,
        price: p.amount,
      })),
    };
  }
}

// Export singleton instance
export const pricingConfig = new PricingConfigService();
export default pricingConfig;
