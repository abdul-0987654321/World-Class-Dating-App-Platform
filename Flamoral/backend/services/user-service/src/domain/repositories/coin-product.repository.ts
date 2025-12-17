import {
  CoinProduct,
  CoinProductCreateInput,
  CoinProductUpdateInput
} from '../entities/CoinProduct.entity';
import db from '../../infrastructure/database/connection';

export class CoinProductRepository {
  private tableName = 'coin_packages';

  async create(input: CoinProductCreateInput): Promise<CoinProduct> {
    const now = new Date();
    const productData = {
      sku: input.sku,
      name: input.name,
      description: input.description,
      coin_amount: input.coinAmount,
      bonus_coins: input.bonusCoins || 0,
      price_usd: input.priceUsd,
      stripe_price_id: input.stripePriceId,
      active: true,
      display_order: input.displayOrder || 0,
      badge_text: input.badgeText,
      created_at: now,
      updated_at: now,
    };

    const [product] = await db(this.tableName)
      .insert(productData)
      .returning('*');

    return this.mapToEntity(product);
  }

  async findById(id: string): Promise<CoinProduct | null> {
    const product = await db(this.tableName)
      .where({ id })
      .first();

    return product ? this.mapToEntity(product) : null;
  }

  async findBySku(sku: string): Promise<CoinProduct | null> {
    const product = await db(this.tableName)
      .where({ sku })
      .first();

    return product ? this.mapToEntity(product) : null;
  }

  async findByStripePriceId(stripePriceId: string): Promise<CoinProduct | null> {
    const product = await db(this.tableName)
      .where({ stripe_price_id: stripePriceId })
      .first();

    return product ? this.mapToEntity(product) : null;
  }

  async findAllActive(): Promise<CoinProduct[]> {
    const products = await db(this.tableName)
      .where({ active: true })
      .orderBy('display_order', 'asc')
      .orderBy('price_usd', 'asc')
      .select('*');

    return products.map(this.mapToEntity);
  }

  async findAll(): Promise<CoinProduct[]> {
    const products = await db(this.tableName)
      .orderBy('display_order', 'asc')
      .orderBy('price_usd', 'asc')
      .select('*');

    return products.map(this.mapToEntity);
  }

  async update(id: string, input: CoinProductUpdateInput): Promise<CoinProduct> {
    const updateData: any = {
      updated_at: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.coinAmount !== undefined) updateData.coin_amount = input.coinAmount;
    if (input.bonusCoins !== undefined) updateData.bonus_coins = input.bonusCoins;
    if (input.priceUsd !== undefined) updateData.price_usd = input.priceUsd;
    if (input.stripePriceId !== undefined) updateData.stripe_price_id = input.stripePriceId;
    if (input.active !== undefined) updateData.active = input.active;
    if (input.displayOrder !== undefined) updateData.display_order = input.displayOrder;
    if (input.badgeText !== undefined) updateData.badge_text = input.badgeText;

    const [product] = await db(this.tableName)
      .where({ id })
      .update(updateData)
      .returning('*');

    return this.mapToEntity(product);
  }

  async toggleActive(id: string, active: boolean): Promise<CoinProduct> {
    const [product] = await db(this.tableName)
      .where({ id })
      .update({
        active,
        updated_at: new Date(),
      })
      .returning('*');

    return this.mapToEntity(product);
  }

  async delete(id: string): Promise<void> {
    await db(this.tableName)
      .where({ id })
      .del();
  }

  // Soft delete - just deactivate
  async deactivate(id: string): Promise<CoinProduct> {
    return this.toggleActive(id, false);
  }

  // Get products by price range
  async findByPriceRange(minPrice: number, maxPrice: number): Promise<CoinProduct[]> {
    const products = await db(this.tableName)
      .where({ active: true })
      .whereBetween('price_usd', [minPrice, maxPrice])
      .orderBy('price_usd', 'asc')
      .select('*');

    return products.map(this.mapToEntity);
  }

  // Map database row to entity
  private mapToEntity(row: any): CoinProduct {
    return {
      id: row.id,
      sku: row.sku,
      name: row.name,
      description: row.description,
      coinAmount: row.coin_amount,
      bonusCoins: row.bonus_coins,
      priceUsd: parseFloat(row.price_usd),
      stripePriceId: row.stripe_price_id,
      active: row.active,
      displayOrder: row.display_order,
      badgeText: row.badge_text,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new CoinProductRepository();
