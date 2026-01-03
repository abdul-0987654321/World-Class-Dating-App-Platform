export interface CoinTransaction {
  id: string;
  userId: string;
  type: 'purchase' | 'reward' | 'spent' | 'refund' | 'admin_adjustment';
  amount: number; // Positive for credit, negative for debit
  balanceAfter: number;
  reason: string;
  referenceId?: string;
  referenceType?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface CoinTransactionCreateInput {
  userId: string;
  type: CoinTransaction['type'];
  amount: number;
  balanceAfter: number;
  reason: string;
  referenceId?: string;
  referenceType?: string;
  metadata?: Record<string, any>;
}

export const TRANSACTION_TYPES = {
  PURCHASE: 'purchase',
  REWARD: 'reward',
  SPENT: 'spent',
  REFUND: 'refund',
  ADMIN_ADJUSTMENT: 'admin_adjustment',
} as const;

export const REFERENCE_TYPES = {
  BOOST: 'boost',
  SUPER_LIKE: 'super_like',
  REWIND: 'rewind',
  STRIPE_PAYMENT: 'stripe_payment',
  DAILY_REWARD: 'daily_reward',
  ACHIEVEMENT: 'achievement',
  REFUND: 'refund',
  REFERRAL: 'referral',
} as const;

// Helper to create transaction reason
export function formatTransactionReason(
  type: CoinTransaction['type'],
  referenceType?: string,
  details?: string
): string {
  const typeLabels = {
    purchase: 'Purchased',
    reward: 'Rewarded',
    spent: 'Spent on',
    refund: 'Refunded for',
    admin_adjustment: 'Admin adjustment',
  };

  const base = typeLabels[type] || type;

  if (referenceType) {
    const formattedRef = referenceType.replace(/_/g, ' ');
    return `${base} ${formattedRef}${details ? `: ${details}` : ''}`;
  }

  return base;
}

// Validate transaction amount
export function validateTransactionAmount(
  type: CoinTransaction['type'],
  amount: number
): void {
  if (type === 'spent' && amount > 0) {
    throw new Error('Spent transactions must have negative amount');
  }

  if ((type === 'purchase' || type === 'reward') && amount < 0) {
    throw new Error('Purchase and reward transactions must have positive amount');
  }

  if (amount === 0) {
    throw new Error('Transaction amount cannot be zero');
  }
}
