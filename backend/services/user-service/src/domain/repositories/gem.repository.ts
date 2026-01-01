import { db } from '../../infrastructure/database';
import {
  Gem,
  GemCreateInput,
  GemUpdateInput,
  GemTransaction,
  GemSpendingCategory,
  GEM_PRICES,
} from '../entities/Gem.entity';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../utils/logger';

export class GemRepository {
  /**
   * Get gem balance for user
   */
  async getByUserId(userId: string): Promise<Gem | null> {
    const gem = await db('gems').where({ user_id: userId }).first();
    if (!gem) return null;

    return {
      id: gem.id,
      userId: gem.user_id,
      balance: gem.balance,
      totalEarned: gem.total_earned,
      totalSpent: gem.total_spent,
      createdAt: gem.created_at,
      updatedAt: gem.updated_at,
    };
  }

  /**
   * Create gem record for new user
   */
  async create(input: GemCreateInput): Promise<Gem> {
    const id = uuidv4();
    const now = new Date();

    const gem = {
      id,
      user_id: input.userId,
      balance: input.initialBalance || 0,
      total_earned: input.initialBalance || 0,
      total_spent: 0,
      created_at: now,
      updated_at: now,
    };

    await db('gems').insert(gem);
    return this.getByUserId(input.userId) as Promise<Gem>;
  }

  /**
   * Get or create gem record
   */
  async getOrCreate(userId: string): Promise<Gem> {
    const existing = await this.getByUserId(userId);
    if (existing) return existing;
    return this.create({ userId, initialBalance: 0 });
  }

  /**
   * Add gems to user balance
   */
  async addGems(
    userId: string,
    amount: number,
    type: 'earned' | 'purchased' | 'bonus' | 'refund',
    description: string,
    metadata?: Record<string, any>
  ): Promise<Gem> {
    const gem = await this.getOrCreate(userId);

    // Update balance
    await db('gems')
      .where({ user_id: userId })
      .update({
        balance: db.raw('balance + ?', [amount]),
        total_earned: db.raw('total_earned + ?', [amount]),
        updated_at: new Date(),
      });

    // Record transaction
    await this.createTransaction({
      userId,
      amount,
      type,
      description,
      metadata,
    });

    logger.info(`Added ${amount} gems to user ${userId}`, { type, description });

    return this.getByUserId(userId) as Promise<Gem>;
  }

  /**
   * Spend gems from user balance
   */
  async spendGems(
    userId: string,
    amount: number,
    itemType: keyof typeof GEM_PRICES,
    category: GemSpendingCategory,
    description: string,
    metadata?: Record<string, any>
  ): Promise<Gem> {
    const gem = await this.getOrCreate(userId);

    if (gem.balance < amount) {
      throw new Error('Insufficient gem balance');
    }

    // Update balance
    await db('gems')
      .where({ user_id: userId })
      .update({
        balance: db.raw('balance - ?', [amount]),
        total_spent: db.raw('total_spent + ?', [amount]),
        updated_at: new Date(),
      });

    // Record transaction
    await this.createTransaction({
      userId,
      amount: -amount,
      type: 'spent',
      category,
      itemType,
      description,
      metadata,
    });

    logger.info(`User ${userId} spent ${amount} gems on ${itemType}`, { category });

    return this.getByUserId(userId) as Promise<Gem>;
  }

  /**
   * Create transaction record
   */
  async createTransaction(input: {
    userId: string;
    amount: number;
    type: 'earned' | 'spent' | 'purchased' | 'bonus' | 'refund';
    category?: GemSpendingCategory;
    itemType?: keyof typeof GEM_PRICES;
    description: string;
    metadata?: Record<string, any>;
  }): Promise<GemTransaction> {
    const id = uuidv4();
    const now = new Date();

    const transaction = {
      id,
      user_id: input.userId,
      amount: input.amount,
      type: input.type,
      category: input.category || null,
      item_type: input.itemType || null,
      description: input.description,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      created_at: now,
    };

    await db('gem_transactions').insert(transaction);

    return {
      id,
      userId: input.userId,
      amount: input.amount,
      type: input.type,
      category: input.category,
      itemType: input.itemType,
      description: input.description,
      metadata: input.metadata,
      createdAt: now,
    };
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<GemTransaction[]> {
    const transactions = await db('gem_transactions')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return transactions.map((t: any) => ({
      id: t.id,
      userId: t.user_id,
      amount: t.amount,
      type: t.type,
      category: t.category,
      itemType: t.item_type,
      description: t.description,
      metadata: t.metadata ? JSON.parse(t.metadata) : null,
      createdAt: t.created_at,
    }));
  }

  /**
   * Get spending by category
   */
  async getSpendingByCategory(userId: string): Promise<Record<GemSpendingCategory, number>> {
    const spending = await db('gem_transactions')
      .where({ user_id: userId, type: 'spent' })
      .whereNotNull('category')
      .groupBy('category')
      .select('category')
      .sum({ total: db.raw('ABS(amount)') });

    const result: Record<GemSpendingCategory, number> = {
      visibility: 0,
      profile: 0,
      communication: 0,
      insights: 0,
      matching: 0,
      gifts: 0,
    };

    for (const row of spending) {
      if (row.category) {
        result[row.category as GemSpendingCategory] = Number(row.total) || 0;
      }
    }

    return result;
  }
}

export const gemRepository = new GemRepository();
