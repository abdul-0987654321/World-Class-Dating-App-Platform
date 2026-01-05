import db from '../../infrastructure/database/connection';
import { PhotoEntity, CreatePhotoDto, UpdatePhotoDto } from '../entities/Photo.entity';

export class PhotoRepository {
  private readonly tableName = 'photos';

  async create(data: CreatePhotoDto): Promise<PhotoEntity> {
    const [photo] = await db(this.tableName).insert(data).returning('*');
    return photo;
  }

  async findByUserId(userId: string): Promise<PhotoEntity[]> {
    return db(this.tableName).where({ user_id: userId }).orderBy('position', 'asc');
  }

  async findById(id: string): Promise<PhotoEntity | null> {
    const photo = await db(this.tableName).where({ id }).first();
    return photo || null;
  }

  async update(id: string, data: UpdatePhotoDto): Promise<PhotoEntity> {
    const [photo] = await db(this.tableName)
      .where({ id })
      .update({
        ...data,
        updated_at: db.fn.now(),
      })
      .returning('*');
    return photo;
  }

  async delete(id: string): Promise<void> {
    await db(this.tableName).where({ id }).delete();
  }

  async setPrimary(userId: string, photoId: string): Promise<void> {
    await db.transaction(async (trx) => {
      // Set all photos as not primary
      await trx(this.tableName).where({ user_id: userId }).update({ is_primary: false });

      // Set the selected photo as primary
      await trx(this.tableName)
        .where({ id: photoId, user_id: userId })
        .update({ is_primary: true });
    });
  }

  async getPrimaryPhoto(userId: string): Promise<PhotoEntity | null> {
    const photo = await db(this.tableName).where({ user_id: userId, is_primary: true }).first();
    return photo || null;
  }

  async count(userId: string): Promise<number> {
    const result = await db(this.tableName).where({ user_id: userId }).count('* as count').first();
    return parseInt(result?.count as string) || 0;
  }

  async reorder(userId: string, photoOrders: { id: string; position: number }[]): Promise<void> {
    await db.transaction(async (trx) => {
      for (const { id, position } of photoOrders) {
        await trx(this.tableName).where({ id, user_id: userId }).update({ position });
      }
    });
  }

  /**
   * PERFORMANCE: Batch fetch photos for multiple users
   * Fixes N+1 query issue in discovery feed
   */
  async findByUserIds(userIds: string[]): Promise<PhotoEntity[]> {
    if (userIds.length === 0) {
      return [];
    }

    return db(this.tableName).whereIn('user_id', userIds).orderBy('position', 'asc');
  }

  /**
   * PERFORMANCE: Batch fetch primary photos for multiple users
   * Fixes N+1 query issue in match list
   */
  async findPrimaryPhotosBatch(userIds: string[]): Promise<PhotoEntity[]> {
    if (userIds.length === 0) {
      return [];
    }

    return db(this.tableName).whereIn('user_id', userIds).where('is_primary', true);
  }
}
