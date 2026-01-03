export interface AffiliateClick {
  id: string;
  userId: string;
  partnerId: string;
  trackingId: string;
  resourceType: 'restaurant' | 'event' | 'gift';
  resourceId: string;
  referrerUrl?: string;
  userAgent?: string;
  ipAddress?: string;
  convertedAt?: Date;
  conversionOrderId?: string;
  createdAt: Date;
}

export interface AffiliateClickCreateInput {
  userId: string;
  partnerId: string;
  resourceType: 'restaurant' | 'event' | 'gift';
  resourceId: string;
  referrerUrl?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface AffiliateCommission {
  id: string;
  partnerId: string;
  orderId: string;
  orderType: 'reservation' | 'ticket' | 'gift';
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
  currency: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AffiliateCommissionCreateInput {
  partnerId: string;
  orderId: string;
  orderType: 'reservation' | 'ticket' | 'gift';
  orderAmount: number;
  commissionRate: number;
  currency?: string;
}

export interface AffiliateCommissionUpdateInput {
  status?: 'pending' | 'approved' | 'paid' | 'rejected';
  paidAt?: Date;
}

export const COMMISSION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  PAID: 'paid',
  REJECTED: 'rejected',
} as const;

// Affiliate tracking configuration
export const AFFILIATE_CONFIG = {
  // Cookie/tracking expiration in days
  TRACKING_EXPIRATION_DAYS: 30,

  // Minimum order amount for commission (in cents)
  MIN_ORDER_AMOUNT: 1000, // $10.00

  // Commission payout threshold (in cents)
  PAYOUT_THRESHOLD: 10000, // $100.00

  // Days to wait before approving commission (to account for refunds)
  APPROVAL_WAIT_DAYS: 7,

  // Attribution window for conversions
  ATTRIBUTION_WINDOW_HOURS: 24,
};

// Calculate commission amount
export function calculateCommission(orderAmount: number, commissionRate: number): number {
  return Math.round((orderAmount * commissionRate) / 100);
}

// Generate unique affiliate tracking ID
export function generateAffiliateTrackingId(
  userId: string,
  partnerId: string,
  resourceType: string
): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `aff_${userId.substring(0, 8)}_${partnerId.substring(0, 8)}_${resourceType.substring(0, 3)}_${timestamp}_${random}`;
}
