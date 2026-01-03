/**
 * GemPurchase Entity
 * Tracks user purchases made with gems from the store
 */

export type GemPurchaseStatus = 'pending' | 'active' | 'used' | 'expired' | 'refunded';

export interface GemPurchase {
  id: string;
  userId: string;
  itemId: string;
  itemName: string; // Snapshot of item name at purchase time
  itemType: string; // Snapshot of item type at purchase time
  gemsCost: number;
  quantity: number; // How many of this item (for packs)
  quantityRemaining: number; // How many left to use
  purchasedAt: Date;
  activatedAt: Date | null; // When the item was first used/activated
  expiresAt: Date | null; // For time-based items
  status: GemPurchaseStatus;
  recipientId: string | null; // For gifts sent to another user
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GemPurchaseCreateInput {
  userId: string;
  itemId: string;
  itemName: string;
  itemType: string;
  gemsCost: number;
  quantity?: number;
  expiresAt?: Date;
  recipientId?: string;
  metadata?: Record<string, any>;
}

export interface GemPurchaseUpdateInput {
  activatedAt?: Date;
  expiresAt?: Date;
  status?: GemPurchaseStatus;
  quantityRemaining?: number;
  metadata?: Record<string, any>;
}

// Helper to determine if a purchase is currently active
export function isPurchaseActive(purchase: GemPurchase): boolean {
  if (purchase.status !== 'active') {
    return false;
  }
  if (purchase.expiresAt && new Date() > purchase.expiresAt) {
    return false;
  }
  return true;
}

// Helper to determine if a purchase has remaining uses
export function hasRemainingUses(purchase: GemPurchase): boolean {
  return purchase.quantityRemaining > 0;
}

// Helper to calculate expiration date from duration
export function calculateExpiration(durationMinutes: number): Date {
  const now = new Date();
  return new Date(now.getTime() + durationMinutes * 60 * 1000);
}
