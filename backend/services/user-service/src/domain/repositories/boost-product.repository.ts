import {
  BoostProduct,
  BoostProductCreateInput,
  BoostProductUpdateInput
} from '../entities/BoostProduct.entity';
import db from '../../infrastructure/database/connection';

export class BoostProductRepository {
  private tableName = 'boost_products';

  async create(input: BoostProductCreateInput): Promise<BoostProduct> {
    const now = new Date();
    const productData = {
      sku: input.sku,
      name: input.name,
      description: input.description,
      type: input.type,
      duration_minutes: input.durationMinutes,
      visibility_multiplier: input.visibilityMultiplier,
      quantity: input.quantity,
      coin_price: input.coinPrice,
      usd_price: input.usdPrice,
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

  async findById(id: string): Promise<BoostProduct | null> {
    const product = await db(this.tableName)
      .where({ id })
      .first();

    return product ? this.mapToEntity(product) : null;
  }

  async findBySku(sku: string): Promise<BoostProduct | null> {
    const product = await db(this.tableName)
      .where({ sku })
      .first();

    return product ? this.mapToEntity(product) : null;
  }

  async findByType(type: string): Promise<BoostProduct[]> {
    const products = await db(this.tableName)
      .where({ type, active: true })
      .orderBy('display_order', 'asc')
      .orderBy('quantity', 'asc')
      .select('*');

    return products.map(this.mapToEntity);
  }

  async findAllActive(): Promise<BoostProduct[]> {
    const products = await db(this.tableName)
      .where({ active: true })
      .orderBy('display_order', 'asc')
      .orderBy('type', 'asc')
      .orderBy('quantity', 'asc')
      .select('*');

    return products.map(this.mapToEntity);
  }

  async findAll(): Promise<BoostProduct[]> {
    const products = await db(this.tableName)
      .orderBy('display_order', 'asc')
      .orderBy('type', 'asc')
      .orderBy('quantity', 'asc')
      .select('*');

    return products.map(this.mapToEntity);
  }

  async update(id: string, input: BoostProductUpdateInput): Promise<BoostProduct> {
    const updateData: any = {
      updated_at: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.durationMinutes !== undefined) updateData.duration_minutes = input.durationMinutes;
    if (input.visibilityMultiplier !== undefined) updateData.visibility_multiplier = input.visibilityMultiplier;
    if (input.quantity !== undefined) updateData.quantity = input.quantity;
    if (input.coinPrice !== undefined) updateData.coin_price = input.coinPrice;
    if (input.usdPrice !== undefined) updateData.usd_price = input.usdPrice;
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

  async toggleActive(id: string, active: boolean): Promise<BoostProduct> {
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
  async deactivate(id: string): Promise<BoostProduct> {
    return this.toggleActive(id, false);
  }

  // Find single boost products (quantity = 1)
  async findSingleBoosts(): Promise<BoostProduct[]> {
    const products = await db(this.tableName)
      .where({ active: true, quantity: 1 })
      .orderBy('coin_price', 'asc')
      .select('*');

    return products.map(this.mapToEntity);
  }

  // Find boost packs (quantity > 1)
  async findBoostPacks(): Promise<BoostProduct[]> {
    const products = await db(this.tableName)
      .where({ active: true })
      .where('quantity', '>', 1)
      .orderBy('quantity', 'asc')
      .select('*');

    return products.map(this.mapToEntity);
  }

  // Find products by price range
  async findByCoinPriceRange(minPrice: number, maxPrice: number): Promise<BoostProduct[]> {
    const products = await db(this.tableName)
      .where({ active: true })
      .whereBetween('coin_price', [minPrice, maxPrice])
      .orderBy('coin_price', 'asc')
      .select('*');

    return products.map(this.mapToEntity);
  }

  // Map database row to entity
  private mapToEntity(row: any): BoostProduct {
    return {
      id: row.id,
      sku: row.sku,
      name: row.name,
      description: row.description,
      type: row.type,
      durationMinutes: row.duration_minutes,
      visibilityMultiplier: parseFloat(row.visibility_multiplier),
      quantity: row.quantity,
      coinPrice: row.coin_price,
      usdPrice: parseFloat(row.usd_price),
      stripePriceId: row.stripe_price_id,
      active: row.active,
      displayOrder: row.display_order,
      badgeText: row.badge_text,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new BoostProductRepository();
