import { v4 as uuidv4 } from 'uuid';

import { db } from '../../infrastructure/database';
import logger from '../../utils/logger';
import {
  GemPurchase,
  GemPurchaseCreateInput,
  GemPurchaseUpdateInput,
  GemPurchaseStatus,
} from '../entities/GemPurchase.entity';

export class GemPurchaseRepository {
  /**
   * Get purchase by ID
   */
  async getById(id: string): Promise<GemPurchase | null> {
    const purchase = await db('gem_purchases').where({ id }).first();
    if (!purchase) return null;
    return this.mapToEntity(purchase);
  }

  /**
   * Get all purchases for a user
   */
  async getByUserId(userId: string, limit = 50, offset = 0): Promise<GemPurchase[]> {
    const purchases = await db('gem_purchases')
      .where({ user_id: userId })
      .orderBy('purchased_at', 'desc')
      .limit(limit)
      .offset(offset);

    return purchases.map(this.mapToEntity);
  }

  /**
   * Get active purchases for a user (not expired, not fully used)
   */
  async getActivePurchases(userId: string): Promise<GemPurchase[]> {
    const now = new Date();
    const purchases = await db('gem_purchases')
      .where({ user_id: userId })
      .where('status', 'active')
      .where(function () {
        this.whereNull('expires_at').orWhere('expires_at', '>', now);
      })
      .where('quantity_remaining', '>', 0)
      .orderBy('purchased_at', 'desc');

    return purchases.map(this.mapToEntity);
  }

  /**
   * Get active purchases of a specific type
   */
  async getActivePurchasesByType(userId: string, itemType: string): Promise<GemPurchase[]> {
    const now = new Date();
    const purchases = await db('gem_purchases')
      .where({ user_id: userId, item_type: itemType })
      .where('status', 'active')
      .where(function () {
        this.whereNull('expires_at').orWhere('expires_at', '>', now);
      })
      .where('quantity_remaining', '>', 0)
      .orderBy('expires_at', 'asc');

    return purchases.map(this.mapToEntity);
  }

  /**
   * Get gifts received by a user
   */
  async getReceivedGifts(userId: string, limit = 50, offset = 0): Promise<GemPurchase[]> {
    const purchases = await db('gem_purchases')
      .where({ recipient_id: userId })
      .whereNotNull('recipient_id')
      .orderBy('purchased_at', 'desc')
      .limit(limit)
      .offset(offset);

    return purchases.map(this.mapToEntity);
  }

  /**
   * Create a new purchase
   */
  async create(input: GemPurchaseCreateInput): Promise<GemPurchase> {
    const id = uuidv4();
    const now = new Date();

    const purchase = {
      id,
      user_id: input.userId,
      item_id: input.itemId,
      item_name: input.itemName,
      item_type: input.itemType,
      gems_cost: input.gemsCost,
      quantity: input.quantity || 1,
      quantity_remaining: input.quantity || 1,
      purchased_at: now,
      activated_at: null,
      expires_at: input.expiresAt || null,
      status: 'active' as GemPurchaseStatus,
      recipient_id: input.recipientId || null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      created_at: now,
      updated_at: now,
    };

    await db('gem_purchases').insert(purchase);
    logger.info(`Created gem purchase: ${input.itemName} for user ${input.userId}`, {
      id,
      gemsCost: input.gemsCost,
    });

    return this.getById(id);
  }

  /**
   * Update a purchase
   */
  async update(id: string, input: GemPurchaseUpdateInput): Promise<GemPurchase | null> {
    const updateData: Record<string, any> = { updated_at: new Date() };

    if (input.activatedAt !== undefined) updateData.activated_at = input.activatedAt;
    if (input.expiresAt !== undefined) updateData.expires_at = input.expiresAt;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.quantityRemaining !== undefined)
      updateData.quantity_remaining = input.quantityRemaining;
    if (input.metadata !== undefined) {
      updateData.metadata = input.metadata ? JSON.stringify(input.metadata) : null;
    }

    await db('gem_purchases').where({ id }).update(updateData);
    logger.info(`Updated gem purchase: ${id}`);

    return this.getById(id);
  }

  /**
   * Use one unit of a purchase (decrement quantity)
   */
  async useOne(id: string): Promise<GemPurchase | null> {
    const purchase = await this.getById(id);
    if (!purchase || purchase.quantityRemaining <= 0) {
      return null;
    }

    const newQuantity = purchase.quantityRemaining - 1;
    const newStatus: GemPurchaseStatus = newQuantity === 0 ? 'used' : 'active';
    const activatedAt = purchase.activatedAt || new Date();

    await db('gem_purchases').where({ id }).update({
      quantity_remaining: newQuantity,
      status: newStatus,
      activated_at: activatedAt,
      updated_at: new Date(),
    });

    logger.info(`Used 1 unit of gem purchase: ${id}`, { remaining: newQuantity });

    return this.getById(id);
  }

  /**
   * Expire old purchases
   */
  async expireOldPurchases(): Promise<number> {
    const now = new Date();
    const result = await db('gem_purchases')
      .where('status', 'active')
      .where('expires_at', '<', now)
      .update({ status: 'expired', updated_at: now });

    if (result > 0) {
      logger.info(`Expired ${result} gem purchases`);
    }

    return result;
  }

  /**
   * Get purchase statistics for a user
   */
  async getPurchaseStats(userId: string): Promise<{
    totalPurchases: number;
    totalGemsSpent: number;
    purchasesByType: Record<string, number>;
  }> {
    const stats: any = await db('gem_purchases')
      .where({ user_id: userId })
      .select(
        db.raw('COUNT(*) as total_purchases'),
        db.raw('COALESCE(SUM(gems_cost), 0) as total_gems_spent')
      )
      .first();

    const byType: any[] = await db('gem_purchases')
      .where({ user_id: userId })
      .groupBy('item_type')
      .select('item_type')
      .count('* as count');

    const purchasesByType: Record<string, number> = {};
    for (const row of byType) {
      purchasesByType[row.item_type] = Number(row.count);
    }

    return {
      totalPurchases: Number(stats?.total_purchases) || 0,
      totalGemsSpent: Number(stats?.total_gems_spent) || 0,
      purchasesByType,
    };
  }

  /**
   * Map database row to entity
   */
  private mapToEntity(row: any): GemPurchase {
    return {
      id: row.id,
      userId: row.user_id,
      itemId: row.item_id,
      itemName: row.item_name,
      itemType: row.item_type,
      gemsCost: row.gems_cost,
      quantity: row.quantity,
      quantityRemaining: row.quantity_remaining,
      purchasedAt: row.purchased_at,
      activatedAt: row.activated_at,
      expiresAt: row.expires_at,
      status: row.status,
      recipientId: row.recipient_id,
      metadata: row.metadata
        ? typeof row.metadata === 'string'
          ? JSON.parse(row.metadata)
          : row.metadata
        : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const gemPurchaseRepository = new GemPurchaseRepository();
