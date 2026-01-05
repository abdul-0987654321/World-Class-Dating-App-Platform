import db from '../../infrastructure/database/connection';
import { Coin, CoinCreateInput, CoinUpdateInput } from '../entities/Coin.entity';

export class CoinRepository {
  private tableName = 'coins';

  async create(input: CoinCreateInput): Promise<Coin> {
    const now = new Date();
    const coinData = {
      user_id: input.userId,
      balance: input.initialBalance || 0,
      total_earned: 0,
      total_spent: 0,
      total_purchased: input.initialBalance || 0,
      created_at: now,
      updated_at: now,
    };

    const [coin] = await db(this.tableName).insert(coinData).returning('*');

    return this.mapToEntity(coin);
  }

  async findById(id: string): Promise<Coin | null> {
    const coin = await db(this.tableName).where({ id }).first();

    return coin ? this.mapToEntity(coin) : null;
  }

  async findByUserId(userId: string): Promise<Coin | null> {
    const coin = await db(this.tableName).where({ user_id: userId }).first();

    return coin ? this.mapToEntity(coin) : null;
  }

  async update(id: string, input: CoinUpdateInput): Promise<Coin> {
    const updateData: any = {
      updated_at: new Date(),
    };

    if (input.balance !== undefined) updateData.balance = input.balance;
    if (input.totalEarned !== undefined) updateData.total_earned = input.totalEarned;
    if (input.totalSpent !== undefined) updateData.total_spent = input.totalSpent;
    if (input.totalPurchased !== undefined) updateData.total_purchased = input.totalPurchased;

    const [coin] = await db(this.tableName).where({ id }).update(updateData).returning('*');

    return this.mapToEntity(coin);
  }

  // Add coins (purchase or reward)
  async addCoins(userId: string, amount: number, isPurchase: boolean = false): Promise<Coin> {
    const updateData: any = {
      balance: db.raw('balance + ?', [amount]),
      updated_at: new Date(),
    };

    if (isPurchase) {
      updateData.total_purchased = db.raw('total_purchased + ?', [amount]);
    } else {
      updateData.total_earned = db.raw('total_earned + ?', [amount]);
    }

    const [coin] = await db(this.tableName)
      .where({ user_id: userId })
      .update(updateData)
      .returning('*');

    return this.mapToEntity(coin);
  }

  // Spend coins
  async spendCoins(userId: string, amount: number): Promise<Coin> {
    const [coin] = await db(this.tableName)
      .where({ user_id: userId })
      .update({
        balance: db.raw('balance - ?', [amount]),
        total_spent: db.raw('total_spent + ?', [amount]),
        updated_at: new Date(),
      })
      .returning('*');

    if (!coin) {
      throw new Error('Coin record not found');
    }

    return this.mapToEntity(coin);
  }

  // Transaction-safe balance update
  async updateBalanceTransaction(userId: string, amount: number, isDebit: boolean): Promise<Coin> {
    return await db.transaction(async (trx) => {
      // Lock the row for update
      const currentCoin = await trx(this.tableName).where({ user_id: userId }).forUpdate().first();

      if (!currentCoin) {
        throw new Error('Coin record not found');
      }

      const newBalance = isDebit ? currentCoin.balance - amount : currentCoin.balance + amount;

      if (newBalance < 0) {
        throw new Error('Insufficient coin balance');
      }

      const updateData: any = {
        balance: newBalance,
        updated_at: new Date(),
      };

      if (isDebit) {
        updateData.total_spent = currentCoin.total_spent + amount;
      } else {
        updateData.total_earned = currentCoin.total_earned + amount;
      }

      const [updatedCoin] = await trx(this.tableName)
        .where({ user_id: userId })
        .update(updateData)
        .returning('*');

      return this.mapToEntity(updatedCoin);
    });
  }

  async delete(id: string): Promise<void> {
    await db(this.tableName).where({ id }).del();
  }

  async deleteByUserId(userId: string): Promise<void> {
    await db(this.tableName).where({ user_id: userId }).del();
  }

  // Get top users by coin balance
  async getTopUsersByBalance(limit: number = 10): Promise<Coin[]> {
    const coins = await db(this.tableName).orderBy('balance', 'desc').limit(limit).select('*');

    return coins.map(this.mapToEntity);
  }

  // Map database row to entity
  private mapToEntity(row: any): Coin {
    return {
      id: row.id,
      userId: row.user_id,
      balance: row.balance,
      totalEarned: row.total_earned,
      totalSpent: row.total_spent,
      totalPurchased: row.total_purchased,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new CoinRepository();
