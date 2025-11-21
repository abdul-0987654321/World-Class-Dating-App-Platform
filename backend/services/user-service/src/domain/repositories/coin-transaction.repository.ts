import { CoinTransaction, CoinTransactionCreateInput } from '../entities/CoinTransaction.entity';
import db from '../../infrastructure/database/connection';

export class CoinTransactionRepository {
  private tableName = 'coin_transactions';

  async create(input: CoinTransactionCreateInput): Promise<CoinTransaction> {
    const now = new Date();
    const transactionData = {
      user_id: input.userId,
      type: input.type,
      amount: input.amount,
      balance_after: input.balanceAfter,
      reason: input.reason,
      reference_id: input.referenceId,
      reference_type: input.referenceType,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      created_at: now,
    };

    const [transaction] = await db(this.tableName)
      .insert(transactionData)
      .returning('*');

    return this.mapToEntity(transaction);
  }

  async findById(id: string): Promise<CoinTransaction | null> {
    const transaction = await db(this.tableName)
      .where({ id })
      .first();

    return transaction ? this.mapToEntity(transaction) : null;
  }

  async findByUserId(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      type?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<CoinTransaction[]> {
    let query = db(this.tableName)
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');

    if (options?.type) {
      query = query.where({ type: options.type });
    }

    if (options?.startDate) {
      query = query.where('created_at', '>=', options.startDate);
    }

    if (options?.endDate) {
      query = query.where('created_at', '<=', options.endDate);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.offset(options.offset);
    }

    const transactions = await query.select('*');
    return transactions.map(this.mapToEntity);
  }

  async findByReference(referenceId: string, referenceType: string): Promise<CoinTransaction[]> {
    const transactions = await db(this.tableName)
      .where({ reference_id: referenceId, reference_type: referenceType })
      .orderBy('created_at', 'desc')
      .select('*');

    return transactions.map(this.mapToEntity);
  }

  async findByType(type: string, limit: number = 100): Promise<CoinTransaction[]> {
    const transactions = await db(this.tableName)
      .where({ type })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .select('*');

    return transactions.map(this.mapToEntity);
  }

  async countByUserId(userId: string): Promise<number> {
    const result = await db(this.tableName)
      .where({ user_id: userId })
      .count('* as count')
      .first();

    return parseInt(result?.count as string || '0', 10);
  }

  async getUserTransactionSummary(userId: string): Promise<{
    totalTransactions: number;
    totalPurchased: number;
    totalEarned: number;
    totalSpent: number;
    totalRefunded: number;
  }> {
    const transactions = await db(this.tableName)
      .where({ user_id: userId })
      .select('type', db.raw('SUM(amount) as total'))
      .groupBy('type');

    const summary = {
      totalTransactions: 0,
      totalPurchased: 0,
      totalEarned: 0,
      totalSpent: 0,
      totalRefunded: 0,
    };

    transactions.forEach((row: any) => {
      const total = parseInt(row.total, 10) || 0;
      summary.totalTransactions++;

      switch (row.type) {
        case 'purchase':
          summary.totalPurchased += total;
          break;
        case 'reward':
          summary.totalEarned += total;
          break;
        case 'spent':
          summary.totalSpent += Math.abs(total);
          break;
        case 'refund':
          summary.totalRefunded += total;
          break;
      }
    });

    return summary;
  }

  // Get recent transactions across all users (for admin)
  async getRecentTransactions(limit: number = 50): Promise<CoinTransaction[]> {
    const transactions = await db(this.tableName)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .select('*');

    return transactions.map(this.mapToEntity);
  }

  // Delete old transactions (for cleanup/archival)
  async deleteOlderThan(date: Date): Promise<number> {
    return await db(this.tableName)
      .where('created_at', '<', date)
      .del();
  }

  // Map database row to entity
  private mapToEntity(row: any): CoinTransaction {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      amount: row.amount,
      balanceAfter: row.balance_after,
      reason: row.reason,
      referenceId: row.reference_id,
      referenceType: row.reference_type,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at,
    };
  }
}

export default new CoinTransactionRepository();
