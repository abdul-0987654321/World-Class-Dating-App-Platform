import db from '../../infrastructure/database/connection';
import { ProfileEntity, CreateProfileDto, UpdateProfileDto } from '../entities/Profile.entity';

export class ProfileRepository {
  private tableName = 'profiles';

  async create(profileData: CreateProfileDto): Promise<ProfileEntity> {
    const [profile] = await db(this.tableName)
      .insert({
        ...profileData,
        interests: JSON.stringify(profileData.interests || []),
        languages: JSON.stringify(profileData.languages || []),
      })
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

    if (profileData.interests) {
      updateData.interests = JSON.stringify(profileData.interests);
    }
    if (profileData.languages) {
      updateData.languages = JSON.stringify(profileData.languages);
    }

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
    return {
      ...profile,
      interests: typeof profile.interests === 'string'
        ? JSON.parse(profile.interests)
        : profile.interests || [],
      languages: typeof profile.languages === 'string'
        ? JSON.parse(profile.languages)
        : profile.languages || [],
    };
  }
}
