/**
 * Coin Service
 * Handles virtual currency functionality
 */

export interface CoinBalance {
  coins: number;
  gems: number;
  lastUpdated: string;
}

export interface CoinPackage {
  id: string;
  name: string;
  coins: number;
  bonusCoins: number;
  price: number;
  currency: string;
  popular?: boolean;
  bestValue?: boolean;
  description?: string;
}

export interface CoinTransaction {
  id: string;
  type: 'purchase' | 'earned' | 'spent' | 'bonus' | 'refund';
  amount: number;
  currency: 'coins' | 'gems';
  description: string;
  createdAt: string;
  balanceAfter: number;
  metadata?: {
    itemId?: string;
    itemType?: string;
    paymentId?: string;
  };
}

export interface PurchaseResponse {
  success: boolean;
  transactionId?: string;
  newBalance?: CoinBalance;
  message?: string;
}

class CoinService {
  private isMock = !import.meta.env.VITE_API_URL;

  async getBalance(): Promise<CoinBalance> {
    if (this.isMock) {
      return {
        coins: 150,
        gems: 25,
        lastUpdated: new Date().toISOString(),
      };
    }

    const response = await fetch('/api/coins/balance', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch coin balance');
    }

    return response.json();
  }

  async getCoinPackages(): Promise<CoinPackage[]> {
    if (this.isMock) {
      return [
        {
          id: 'coins-small',
          name: 'Starter Pack',
          coins: 100,
          bonusCoins: 0,
          price: 4.99,
          currency: 'USD',
          description: '100 coins to get started',
        },
        {
          id: 'coins-medium',
          name: 'Popular Pack',
          coins: 500,
          bonusCoins: 50,
          price: 19.99,
          currency: 'USD',
          popular: true,
          description: '500 coins + 50 bonus',
        },
        {
          id: 'coins-large',
          name: 'Value Pack',
          coins: 1200,
          bonusCoins: 200,
          price: 39.99,
          currency: 'USD',
          bestValue: true,
          description: '1200 coins + 200 bonus',
        },
        {
          id: 'coins-xlarge',
          name: 'Premium Pack',
          coins: 3000,
          bonusCoins: 750,
          price: 79.99,
          currency: 'USD',
          description: '3000 coins + 750 bonus',
        },
      ];
    }

    const response = await fetch('/api/coins/packages', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch coin packages');
    }

    return response.json();
  }

  async purchaseCoins(packageId: string, paymentMethodId: string): Promise<PurchaseResponse> {
    if (this.isMock) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        success: true,
        transactionId: `txn-${Date.now()}`,
        newBalance: {
          coins: 250,
          gems: 25,
          lastUpdated: new Date().toISOString(),
        },
        message: 'Purchase successful!',
      };
    }

    const response = await fetch('/api/coins/purchase', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ packageId, paymentMethodId }),
    });

    if (!response.ok) {
      throw new Error('Failed to purchase coins');
    }

    return response.json();
  }

  async spendCoins(amount: number, itemType: string, itemId: string): Promise<PurchaseResponse> {
    if (this.isMock) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        success: true,
        transactionId: `txn-${Date.now()}`,
        newBalance: {
          coins: 100,
          gems: 25,
          lastUpdated: new Date().toISOString(),
        },
      };
    }

    const response = await fetch('/api/coins/spend', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount, itemType, itemId }),
    });

    if (!response.ok) {
      throw new Error('Failed to spend coins');
    }

    return response.json();
  }

  async getTransactionHistory(cursor?: string): Promise<{ transactions: CoinTransaction[]; nextCursor?: string }> {
    if (this.isMock) {
      return {
        transactions: [
          {
            id: 'txn-1',
            type: 'purchase',
            amount: 100,
            currency: 'coins',
            description: 'Purchased Starter Pack',
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            balanceAfter: 100,
          },
          {
            id: 'txn-2',
            type: 'spent',
            amount: -50,
            currency: 'coins',
            description: 'Super Like',
            createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
            balanceAfter: 50,
          },
        ],
      };
    }

    const url = cursor
      ? `/api/coins/transactions?cursor=${cursor}`
      : '/api/coins/transactions';

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch transaction history');
    }

    return response.json();
  }
}

export const coinService = new CoinService();
export default coinService;

// Type alias for backward compatibility
export type CoinProduct = CoinPackage;
