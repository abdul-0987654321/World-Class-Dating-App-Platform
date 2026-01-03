import { db } from '../../infrastructure/database';
import {
  GemStoreItem,
  GemStoreItemCreateInput,
  GemStoreItemUpdateInput,
  GemStoreItemType,
} from '../entities/GemStoreItem.entity';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../utils/logger';

export class GemStoreRepository {
  /**
   * Get all active store items
   */
  async getActiveItems(): Promise<GemStoreItem[]> {
    const items = await db('gem_store_items')
      .where({ is_active: true })
      .orderBy('sort_order', 'asc');

    return items.map(this.mapToEntity);
  }

  /**
   * Get all store items (including inactive)
   */
  async getAllItems(): Promise<GemStoreItem[]> {
    const items = await db('gem_store_items')
      .orderBy('sort_order', 'asc');

    return items.map(this.mapToEntity);
  }

  /**
   * Get store item by ID
   */
  async getById(id: string): Promise<GemStoreItem | null> {
    const item = await db('gem_store_items').where({ id }).first();
    if (!item) return null;
    return this.mapToEntity(item);
  }

  /**
   * Get store items by type
   */
  async getByType(type: GemStoreItemType): Promise<GemStoreItem[]> {
    const items = await db('gem_store_items')
      .where({ type, is_active: true })
      .orderBy('sort_order', 'asc');

    return items.map(this.mapToEntity);
  }

  /**
   * Create a new store item
   */
  async create(input: GemStoreItemCreateInput): Promise<GemStoreItem> {
    const id = uuidv4();
    const now = new Date();

    const item = {
      id,
      name: input.name,
      description: input.description,
      type: input.type,
      gem_cost: input.gemCost,
      duration_minutes: input.durationMinutes || null,
      quantity: input.quantity || null,
      image_url: input.imageUrl || null,
      is_active: input.isActive !== false,
      sort_order: input.sortOrder || 0,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      created_at: now,
      updated_at: now,
    };

    await db('gem_store_items').insert(item);
    logger.info(`Created gem store item: ${input.name}`, { id });

    return this.getById(id) as Promise<GemStoreItem>;
  }

  /**
   * Update a store item
   */
  async update(id: string, input: GemStoreItemUpdateInput): Promise<GemStoreItem | null> {
    const updateData: Record<string, any> = { updated_at: new Date() };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.type !== undefined) updateData.type = input.type;
    if (input.gemCost !== undefined) updateData.gem_cost = input.gemCost;
    if (input.durationMinutes !== undefined) updateData.duration_minutes = input.durationMinutes;
    if (input.quantity !== undefined) updateData.quantity = input.quantity;
    if (input.imageUrl !== undefined) updateData.image_url = input.imageUrl;
    if (input.isActive !== undefined) updateData.is_active = input.isActive;
    if (input.sortOrder !== undefined) updateData.sort_order = input.sortOrder;
    if (input.metadata !== undefined) {
      updateData.metadata = input.metadata ? JSON.stringify(input.metadata) : null;
    }

    await db('gem_store_items').where({ id }).update(updateData);
    logger.info(`Updated gem store item: ${id}`);

    return this.getById(id);
  }

  /**
   * Delete a store item (soft delete by deactivating)
   */
  async deactivate(id: string): Promise<boolean> {
    const result = await db('gem_store_items')
      .where({ id })
      .update({ is_active: false, updated_at: new Date() });

    return result > 0;
  }

  /**
   * Seed default store items
   */
  async seedDefaultItems(items: Omit<GemStoreItem, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void> {
    for (const item of items) {
      const existing = await db('gem_store_items')
        .where({ name: item.name })
        .first();

      if (!existing) {
        await this.create({
          name: item.name,
          description: item.description,
          type: item.type,
          gemCost: item.gemCost,
          durationMinutes: item.durationMinutes || undefined,
          quantity: item.quantity || undefined,
          imageUrl: item.imageUrl || undefined,
          isActive: item.isActive,
          sortOrder: item.sortOrder,
          metadata: item.metadata || undefined,
        });
      }
    }
    logger.info(`Seeded ${items.length} default store items`);
  }

  /**
   * Map database row to entity
   */
  private mapToEntity(row: any): GemStoreItem {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      gemCost: row.gem_cost,
      durationMinutes: row.duration_minutes,
      quantity: row.quantity,
      imageUrl: row.image_url,
      isActive: row.is_active,
      sortOrder: row.sort_order,
      metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const gemStoreRepository = new GemStoreRepository();
