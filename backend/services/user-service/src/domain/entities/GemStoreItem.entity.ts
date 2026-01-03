/**
 * GemStoreItem Entity
 * Defines items available for purchase with gems in the store
 */

export type GemStoreItemType = 'boost' | 'superlike' | 'spotlight' | 'gift' | 'utility' | 'cosmetic';

export interface GemStoreItem {
  id: string;
  name: string;
  description: string;
  type: GemStoreItemType;
  gemCost: number;
  durationMinutes: number | null; // Duration in minutes for time-based items, null for permanent/consumable
  quantity: number | null; // For pack items (e.g., 5 super likes), null for single items
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GemStoreItemCreateInput {
  name: string;
  description: string;
  type: GemStoreItemType;
  gemCost: number;
  durationMinutes?: number;
  quantity?: number;
  imageUrl?: string;
  isActive?: boolean;
  sortOrder?: number;
  metadata?: Record<string, any>;
}

export interface GemStoreItemUpdateInput {
  name?: string;
  description?: string;
  type?: GemStoreItemType;
  gemCost?: number;
  durationMinutes?: number | null;
  quantity?: number | null;
  imageUrl?: string | null;
  isActive?: boolean;
  sortOrder?: number;
  metadata?: Record<string, any> | null;
}

// Predefined store items - these will be seeded into the database
export const DEFAULT_STORE_ITEMS: Omit<GemStoreItem, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Profile Boost',
    description: 'Get 10x more visibility for 30 minutes. Your profile appears at the top of discovery.',
    type: 'boost',
    gemCost: 50,
    durationMinutes: 30,
    quantity: null,
    imageUrl: '/assets/store/boost.png',
    isActive: true,
    sortOrder: 1,
    metadata: { multiplier: 10, feature: 'discovery_priority' },
  },
  {
    name: 'Super Like Pack',
    description: 'Stand out from the crowd! Get 5 extra Super Likes to show special interest.',
    type: 'superlike',
    gemCost: 30,
    durationMinutes: null,
    quantity: 5,
    imageUrl: '/assets/store/superlike.png',
    isActive: true,
    sortOrder: 2,
    metadata: { feature: 'super_like' },
  },
  {
    name: 'Spotlight',
    description: 'Be featured prominently in discovery for 1 hour. Get seen by up to 10x more people.',
    type: 'spotlight',
    gemCost: 100,
    durationMinutes: 60,
    quantity: null,
    imageUrl: '/assets/store/spotlight.png',
    isActive: true,
    sortOrder: 3,
    metadata: { feature: 'featured_placement' },
  },
  {
    name: 'Read Receipts',
    description: 'See when your messages have been read for the next 7 days.',
    type: 'utility',
    gemCost: 20,
    durationMinutes: 10080, // 7 days
    quantity: null,
    imageUrl: '/assets/store/read-receipts.png',
    isActive: true,
    sortOrder: 4,
    metadata: { feature: 'read_receipts' },
  },
  {
    name: 'Virtual Rose',
    description: 'Send a beautiful virtual rose to your match.',
    type: 'gift',
    gemCost: 10,
    durationMinutes: null,
    quantity: 1,
    imageUrl: '/assets/store/gift-rose.png',
    isActive: true,
    sortOrder: 5,
    metadata: { giftType: 'rose', emoji: '🌹' },
  },
  {
    name: 'Virtual Heart',
    description: 'Show you care with a heartfelt virtual heart.',
    type: 'gift',
    gemCost: 15,
    durationMinutes: null,
    quantity: 1,
    imageUrl: '/assets/store/gift-heart.png',
    isActive: true,
    sortOrder: 6,
    metadata: { giftType: 'heart', emoji: '❤️' },
  },
  {
    name: 'Virtual Star',
    description: 'Let them know they are your star with this special gift.',
    type: 'gift',
    gemCost: 25,
    durationMinutes: null,
    quantity: 1,
    imageUrl: '/assets/store/gift-star.png',
    isActive: true,
    sortOrder: 7,
    metadata: { giftType: 'star', emoji: '⭐' },
  },
  {
    name: 'Virtual Diamond',
    description: 'The most prestigious gift - show them they are truly special.',
    type: 'gift',
    gemCost: 50,
    durationMinutes: null,
    quantity: 1,
    imageUrl: '/assets/store/gift-diamond.png',
    isActive: true,
    sortOrder: 8,
    metadata: { giftType: 'diamond', emoji: '💎' },
  },
  {
    name: 'Undo Pass',
    description: 'Changed your mind? Undo your last pass and get another chance.',
    type: 'utility',
    gemCost: 25,
    durationMinutes: null,
    quantity: 1,
    imageUrl: '/assets/store/undo.png',
    isActive: true,
    sortOrder: 9,
    metadata: { feature: 'undo_pass' },
  },
  {
    name: 'Profile Highlight',
    description: 'Get a gold border on your profile for 24 hours. Stand out in chat lists!',
    type: 'cosmetic',
    gemCost: 75,
    durationMinutes: 1440, // 24 hours
    quantity: null,
    imageUrl: '/assets/store/highlight.png',
    isActive: true,
    sortOrder: 10,
    metadata: { feature: 'gold_border' },
  },
];
