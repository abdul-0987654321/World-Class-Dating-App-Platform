import db from '../../infrastructure/database/connection';
import { PreferencesEntity, CreatePreferencesDto, UpdatePreferencesDto } from '../entities/Preferences.entity';

export class PreferencesRepository {
  private tableName = 'preferences';

  async create(preferencesData: CreatePreferencesDto): Promise<PreferencesEntity> {
    const insertData: any = { ...preferencesData };

    // Stringify genders array if provided
    if (insertData.genders) {
      insertData.genders = JSON.stringify(insertData.genders);
    } else {
      insertData.genders = JSON.stringify([]);
    }

    const [preferences] = await db(this.tableName)
      .insert(insertData)
      .returning('*');

    return this.parseJsonFields(preferences);
  }

  async findByUserId(userId: string): Promise<PreferencesEntity | null> {
    const preferences = await db(this.tableName).where({ user_id: userId }).first();
    return preferences ? this.parseJsonFields(preferences) : null;
  }

  async findById(id: string): Promise<PreferencesEntity | null> {
    const preferences = await db(this.tableName).where({ id }).first();
    return preferences ? this.parseJsonFields(preferences) : null;
  }

  async update(userId: string, preferencesData: UpdatePreferencesDto): Promise<PreferencesEntity | null> {
    const updateData: any = { ...preferencesData, updated_at: db.fn.now() };

    // Stringify genders array if provided
    if (preferencesData.genders) {
      updateData.genders = JSON.stringify(preferencesData.genders);
    }

    const [preferences] = await db(this.tableName)
      .where({ user_id: userId })
      .update(updateData)
      .returning('*');

    return preferences ? this.parseJsonFields(preferences) : null;
  }

  async delete(userId: string): Promise<void> {
    await db(this.tableName).where({ user_id: userId }).delete();
  }

  private parseJsonFields(preferences: any): PreferencesEntity {
    const parseArrayField = (field: any): any[] => {
      if (typeof field === 'string') {
        try {
          return JSON.parse(field);
        } catch {
          return [];
        }
      }
      return Array.isArray(field) ? field : [];
    };

    return {
      ...preferences,
      genders: parseArrayField(preferences.genders),
    };
  }
}
