import {
  GiftCategory,
  GiftOrderStatus,
  GiftOption,
  DeliveryOption,
  GiftOrderItem,
  Address,
} from '../../types';

export interface GiftProduct {
  id: string;
  partnerId: string;
  externalId: string;
  name: string;
  description?: string;
  category: GiftCategory;
  price: number;
  currency: string;
  imageUrls: string[];
  options?: GiftOption[];
  isAvailable: boolean;
  deliveryOptions: DeliveryOption[];
  isRomantic: boolean;
  occasionTags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GiftOrder {
  id: string;
  userId: string;
  recipientMatchId?: string;
  partnerId: string;
  externalOrderId?: string;
  status: GiftOrderStatus;
  items: GiftOrderItem[];
  shippingAddress: Address;
  billingAddress?: Address;
  deliveryOption: DeliveryOption;
  giftMessage?: string;
  isAnonymous: boolean;
  subtotal: number;
  shippingCost: number;
  tax: number;
  totalAmount: number;
  currency: string;
  paymentIntentId?: string;
  affiliateTrackingId: string;
  commission?: number;
  trackingNumber?: string;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface GiftOrderCreateInput {
  userId: string;
  recipientMatchId?: string;
  partnerId: string;
  items: GiftOrderItem[];
  shippingAddress: Address;
  billingAddress?: Address;
  deliveryOptionId: string;
  giftMessage?: string;
  isAnonymous?: boolean;
}

export interface GiftOrderUpdateInput {
  status?: GiftOrderStatus;
  externalOrderId?: string;
  paymentIntentId?: string;
  trackingNumber?: string;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  commission?: number;
  metadata?: Record<string, any>;
}

export const GIFT_ORDER_STATUS = {
  PENDING: 'pending' as GiftOrderStatus,
  CONFIRMED: 'confirmed' as GiftOrderStatus,
  PROCESSING: 'processing' as GiftOrderStatus,
  SHIPPED: 'shipped' as GiftOrderStatus,
  DELIVERED: 'delivered' as GiftOrderStatus,
  CANCELLED: 'cancelled' as GiftOrderStatus,
  REFUNDED: 'refunded' as GiftOrderStatus,
} as const;

export const GIFT_CATEGORIES = {
  FLOWERS: 'flowers' as GiftCategory,
  CHOCOLATES: 'chocolates' as GiftCategory,
  WINE: 'wine' as GiftCategory,
  JEWELRY: 'jewelry' as GiftCategory,
  EXPERIENCES: 'experiences' as GiftCategory,
  CUSTOM: 'custom' as GiftCategory,
} as const;

// Romantic gift categories for date scenarios
export const ROMANTIC_GIFT_CATEGORIES: GiftCategory[] = [
  'flowers',
  'chocolates',
  'wine',
  'experiences',
];

// Occasion tags for gift filtering
export const GIFT_OCCASIONS = [
  'first_date',
  'anniversary',
  'just_because',
  'apology',
  'valentines',
  'birthday',
  'thinking_of_you',
  'congratulations',
  'thank_you',
  'get_well',
];

// Popular flower arrangements for dating app
export const POPULAR_ARRANGEMENTS = [
  {
    name: 'Classic Red Roses',
    description: 'A timeless symbol of love',
    romanticScore: 10,
    priceRange: { min: 49.99, max: 149.99 },
  },
  {
    name: 'Mixed Spring Bouquet',
    description: 'Bright and cheerful arrangement',
    romanticScore: 7,
    priceRange: { min: 39.99, max: 89.99 },
  },
  {
    name: 'Elegant Orchid',
    description: 'Sophisticated and long-lasting',
    romanticScore: 8,
    priceRange: { min: 59.99, max: 129.99 },
  },
  {
    name: 'Romantic Pink Roses',
    description: 'Soft and romantic gesture',
    romanticScore: 9,
    priceRange: { min: 44.99, max: 119.99 },
  },
];
