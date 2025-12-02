/**
 * Boost Service
 * Handles profile boost functionality
 */

export interface Boost {
  id: string;
  userId: string;
  startedAt: string;
  expiresAt: string;
  boostType: 'standard' | 'super' | 'spotlight';
  multiplier: number;
  isActive: boolean;
  active?: boolean; // Alias for isActive
  viewsGained?: number;
  matchesGained?: number;
  // Extended properties for component compatibility
  startTime?: string;
  endTime?: string;
  productSku?: string;
  visibilityMultiplier?: number;
  durationMinutes?: number;
  coinCost?: number;
}

export interface BoostPackage {
  id: string;
  name: string;
  boostType: 'standard' | 'super' | 'spotlight';
  duration: number; // in minutes
  multiplier: number;
  price: number;
  currency: string;
  coinPrice?: number;
  description: string;
  // Extended properties for component compatibility
  popular?: boolean;
  durationMinutes?: number;
  visibilityMultiplier?: number;
  costCoins?: number;
}

export interface BoostStats {
  totalBoosts: number;
  activeBoost?: Boost;
  viewsFromBoosts: number;
  matchesFromBoosts: number;
  lastBoostAt?: string;
}

export interface ActivateBoostResponse {
  success: boolean;
  boost?: Boost;
  message?: string;
}

class BoostService {
  private isMock = !import.meta.env.VITE_API_URL;

  async getActiveBoost(): Promise<Boost | null> {
    if (this.isMock) {
      return null;
    }

    const response = await fetch('/api/boosts/active', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch active boost');
    }

    const result = await response.json();
    return result.boost || null;
  }

  async getBoostHistory(): Promise<{ boosts: Boost[]; totalCount: number }> {
    if (this.isMock) {
      return { boosts: [], totalCount: 0 };
    }

    const response = await fetch('/api/boosts/history', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch boost history');
    }

    return response.json();
  }

  async getBoostPackages(): Promise<BoostPackage[]> {
    if (this.isMock) {
      return [
        {
          id: 'boost-standard',
          name: 'Standard Boost',
          boostType: 'standard',
          duration: 30,
          multiplier: 2,
          price: 4.99,
          currency: 'USD',
          coinPrice: 50,
          description: '2x visibility for 30 minutes',
        },
        {
          id: 'boost-super',
          name: 'Super Boost',
          boostType: 'super',
          duration: 60,
          multiplier: 5,
          price: 9.99,
          currency: 'USD',
          coinPrice: 100,
          description: '5x visibility for 1 hour',
        },
        {
          id: 'boost-spotlight',
          name: 'Spotlight',
          boostType: 'spotlight',
          duration: 180,
          multiplier: 10,
          price: 19.99,
          currency: 'USD',
          coinPrice: 200,
          description: '10x visibility for 3 hours, priority placement',
        },
      ];
    }

    const response = await fetch('/api/boosts/packages', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch boost packages');
    }

    return response.json();
  }

  async activateBoost(packageId: string, paymentMethod: 'card' | 'coins' = 'coins'): Promise<ActivateBoostResponse> {
    if (this.isMock) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        success: true,
        boost: {
          id: `boost-${Date.now()}`,
          userId: 'current-user',
          startedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          boostType: 'standard',
          multiplier: 2,
          isActive: true,
        },
        message: 'Boost activated successfully!',
      };
    }

    const response = await fetch('/api/boosts/activate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ packageId, paymentMethod }),
    });

    if (!response.ok) {
      throw new Error('Failed to activate boost');
    }

    return response.json();
  }

  async getBoostStats(): Promise<BoostStats> {
    if (this.isMock) {
      return {
        totalBoosts: 5,
        viewsFromBoosts: 150,
        matchesFromBoosts: 8,
      };
    }

    const response = await fetch('/api/boosts/stats', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch boost stats');
    }

    return response.json();
  }
}

export const boostService = new BoostService();
export default boostService;

// Type aliases for backward compatibility
export type BoostInstance = Boost;
export type BoostProduct = BoostPackage;
