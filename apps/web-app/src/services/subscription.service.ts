/**
 * Subscription Service
 * Handles subscription-related API calls
 */

export type SubscriptionTier = 'FREE' | 'GOLD' | 'PLATINUM' | 'DIAMOND';

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
  startDate: string;
  endDate: string | null;
  autoRenew: boolean;
  features: string[];
}

// Mock subscription data based on current user
const getMockSubscription = (): Subscription => {
  const storedUser = localStorage.getItem('currentUser');
  if (storedUser) {
    const user = JSON.parse(storedUser);
    return {
      id: `sub-${user.id}`,
      userId: user.id,
      tier: user.premium_tier || 'FREE',
      status: 'active',
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      autoRenew: true,
      features: getFeaturesByTier(user.premium_tier || 'FREE'),
    };
  }

  return {
    id: 'sub-default',
    userId: 'unknown',
    tier: 'FREE',
    status: 'active',
    startDate: new Date().toISOString(),
    endDate: null,
    autoRenew: false,
    features: getFeaturesByTier('FREE'),
  };
};

const getFeaturesByTier = (tier: SubscriptionTier): string[] => {
  const features: Record<SubscriptionTier, string[]> = {
    FREE: [
      '20 likes per day',
      '1 super like per day',
      'Basic filters',
      'See who liked you (blurred)',
    ],
    GOLD: [
      'Unlimited likes',
      '5 super likes per day',
      'See who liked you',
      'Rewind last swipe',
      'No ads',
      'Read receipts',
      '1 free boost per month',
    ],
    PLATINUM: [
      'Everything in Gold',
      'Unlimited super likes',
      'Priority likes',
      'Message before matching',
      'Weekly free boost',
      'Incognito mode',
      'Travel mode',
    ],
    DIAMOND: [
      'Everything in Platinum',
      'VIP badge on profile',
      'Priority support',
      'Exclusive VIP events',
      'AI matchmaker',
      'Unlimited boosts',
      'Daily Top Picks',
      'Profile review by experts',
    ],
  };

  return features[tier] || features.FREE;
};

class SubscriptionService {
  private baseUrl = '/api/subscriptions';

  async getCurrentSubscription(): Promise<Subscription> {
    // In mock mode, return mock data
    if (!process.env.VITE_API_URL) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return getMockSubscription();
    }

    const response = await fetch(`${this.baseUrl}/current`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch subscription');
    }

    return response.json();
  }

  async getPlans(): Promise<{ tier: SubscriptionTier; price: number; features: string[] }[]> {
    // Mock plans
    return [
      { tier: 'FREE', price: 0, features: getFeaturesByTier('FREE') },
      { tier: 'GOLD', price: 29.99, features: getFeaturesByTier('GOLD') },
      { tier: 'PLATINUM', price: 49.99, features: getFeaturesByTier('PLATINUM') },
      { tier: 'DIAMOND', price: 99.99, features: getFeaturesByTier('DIAMOND') },
    ];
  }

  async upgradePlan(tier: SubscriptionTier): Promise<Subscription> {
    // In mock mode, simulate upgrade
    if (!process.env.VITE_API_URL) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        user.premium_tier = tier;
        localStorage.setItem('currentUser', JSON.stringify(user));
      }
      return getMockSubscription();
    }

    const response = await fetch(`${this.baseUrl}/upgrade`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tier }),
    });

    if (!response.ok) {
      throw new Error('Failed to upgrade subscription');
    }

    return response.json();
  }

  async cancelSubscription(): Promise<void> {
    if (!process.env.VITE_API_URL) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return;
    }

    const response = await fetch(`${this.baseUrl}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to cancel subscription');
    }
  }
}

export const subscriptionService = new SubscriptionService();
