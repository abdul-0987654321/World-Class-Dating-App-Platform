export interface Coin {
  id: string;
  userId: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  totalPurchased: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CoinCreateInput {
  userId: string;
  initialBalance?: number;
}

export interface CoinUpdateInput {
  balance?: number;
  totalEarned?: number;
  totalSpent?: number;
  totalPurchased?: number;
}

// Coin prices for various actions
export const COIN_PRICES = {
  BOOST_STANDARD: 30,
  BOOST_PRIME_TIME: 50,
  BOOST_SPOTLIGHT: 100,
  SUPER_LIKE: 5,
  REWIND: 3,
  READ_RECEIPTS_24H: 10,
  INCOGNITO_24H: 20,
  MESSAGE_BEFORE_MATCH: 10,
  REMATCH: 15,
} as const;

// Helper functions
export function hasEnoughCoins(coin: Coin, amount: number): boolean {
  return coin.balance >= amount;
}

export function calculateNewBalance(
  currentBalance: number,
  amount: number,
  isDebit: boolean
): number {
  if (isDebit) {
    const newBalance = currentBalance - amount;
    if (newBalance < 0) {
      throw new Error('Insufficient coin balance');
    }
    return newBalance;
  }
  return currentBalance + amount;
}
