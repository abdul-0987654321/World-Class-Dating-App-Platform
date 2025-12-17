import db from '../../infrastructure/database/connection';
import { ProfileEntity, CreateProfileDto, UpdateProfileDto } from '../entities/Profile.entity';

export class ProfileRepository {
  private tableName = 'profiles';

  async create(profileData: CreateProfileDto): Promise<ProfileEntity> {
    const insertData: any = { ...profileData };

    // Stringify all array fields for database storage
    const arrayFields = ['interests', 'languages'];
    arrayFields.forEach(field => {
      if (insertData[field]) {
        insertData[field] = JSON.stringify(insertData[field]);
      } else {
        insertData[field] = JSON.stringify([]);
      }
    });

    const [profile] = await db(this.tableName)
      .insert(insertData)
      .returning('*');

    return this.parseJsonFields(profile);
  }

  async findByUserId(userId: string): Promise<ProfileEntity | null> {
    const profile = await db(this.tableName).where({ user_id: userId }).first();
    return profile ? this.parseJsonFields(profile) : null;
  }

  async findById(id: string): Promise<ProfileEntity | null> {
    const profile = await db(this.tableName).where({ id }).first();
    return profile ? this.parseJsonFields(profile) : null;
  }

  async update(userId: string, profileData: UpdateProfileDto): Promise<ProfileEntity | null> {
    const updateData: any = { ...profileData, updated_at: db.fn.now() };

    // Stringify all array fields for database storage
    const arrayFields = [
      'interests',
      'languages',
      'friend_looking_for',
      'friend_activities',
      'network_skills',
      'network_looking_for'
    ];

    arrayFields.forEach(field => {
      if (profileData[field as keyof UpdateProfileDto]) {
        updateData[field] = JSON.stringify(profileData[field as keyof UpdateProfileDto]);
      }
    });

    const [profile] = await db(this.tableName)
      .where({ user_id: userId })
      .update(updateData)
      .returning('*');

    return profile ? this.parseJsonFields(profile) : null;
  }

  async delete(userId: string): Promise<void> {
    await db(this.tableName).where({ user_id: userId }).delete();
  }

  private parseJsonFields(profile: any): ProfileEntity {
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
      ...profile,
      interests: parseArrayField(profile.interests),
      languages: parseArrayField(profile.languages),
      friend_looking_for: parseArrayField(profile.friend_looking_for),
      friend_activities: parseArrayField(profile.friend_activities),
      network_skills: parseArrayField(profile.network_skills),
      network_looking_for: parseArrayField(profile.network_looking_for),
    };
  }
}
