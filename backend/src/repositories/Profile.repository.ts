import { Knex } from 'knex';
import { ProfileModel, ProfilePhoto, ProfileCreateInput, ProfileUpdateInput } from '../models/Profile.model';
import { v4 as uuidv4 } from 'uuid';

export class ProfileRepository {
  private db: Knex;

  constructor(db: Knex) {
    this.db = db;
  }

  async create(input: ProfileCreateInput): Promise<ProfileModel> {
    const profileId = uuidv4();

    const [profile] = await this.db('profiles')
      .insert({
        id: profileId,
        user_id: input.userId,
        bio: input.bio,
        occupation: input.occupation,
        education: input.education,
        height: input.height,
        relationship_goal: input.relationshipGoal,
        sexual_orientation: input.sexualOrientation,
        interests: JSON.stringify(input.interests || []),
        languages: JSON.stringify(input.languages || []),
        profile_completion_percentage: this.calculateCompletion(input),
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    // Parse JSON fields
    profile.interests = JSON.parse(profile.interests);
    profile.languages = JSON.parse(profile.languages);

    return profile;
  }

  async findByUserId(userId: string): Promise<ProfileModel | null> {
    const profile = await this.db('profiles')
      .where({ user_id: userId })
      .first();

    if (!profile) return null;

    // Parse JSON fields
    profile.interests = JSON.parse(profile.interests || '[]');
    profile.languages = JSON.parse(profile.languages || '[]');
    profile.pets = JSON.parse(profile.pets || '[]');
    profile.looking_for = JSON.parse(profile.looking_for || '[]');
    profile.personality_traits = JSON.parse(profile.personality_traits || '[]');

    return profile;
  }

  async update(userId: string, input: ProfileUpdateInput): Promise<ProfileModel> {
    const updateData: any = {
      updated_at: new Date(),
    };

    if (input.bio !== undefined) updateData.bio = input.bio;
    if (input.occupation !== undefined) updateData.occupation = input.occupation;
    if (input.education !== undefined) updateData.education = input.education;
    if (input.height !== undefined) updateData.height = input.height;
    if (input.relationshipGoal !== undefined) updateData.relationship_goal = input.relationshipGoal;
    if (input.sexualOrientation !== undefined) updateData.sexual_orientation = input.sexualOrientation;
    if (input.interests !== undefined) updateData.interests = JSON.stringify(input.interests);
    if (input.languages !== undefined) updateData.languages = JSON.stringify(input.languages);
    if (input.hometown !== undefined) updateData.hometown = input.hometown;
    if (input.currentCity !== undefined) updateData.current_city = input.currentCity;
    if (input.zodiacSign !== undefined) updateData.zodiac_sign = input.zodiacSign;
    if (input.religion !== undefined) updateData.religion = input.religion;
    if (input.politics !== undefined) updateData.politics = input.politics;
    if (input.smoking !== undefined) updateData.smoking = input.smoking;
    if (input.drinking !== undefined) updateData.drinking = input.drinking;
    if (input.exercise !== undefined) updateData.exercise = input.exercise;
    if (input.pets !== undefined) updateData.pets = JSON.stringify(input.pets);
    if (input.lookingFor !== undefined) updateData.looking_for = JSON.stringify(input.lookingFor);
    if (input.personalityTraits !== undefined) updateData.personality_traits = JSON.stringify(input.personalityTraits);

    // Recalculate completion percentage
    const current = await this.findByUserId(userId);
    if (current) {
      updateData.profile_completion_percentage = this.calculateCompletion({ ...current, ...input });
    }

    const [profile] = await this.db('profiles')
      .where({ user_id: userId })
      .update(updateData)
      .returning('*');

    // Parse JSON fields
    profile.interests = JSON.parse(profile.interests || '[]');
    profile.languages = JSON.parse(profile.languages || '[]');
    profile.pets = JSON.parse(profile.pets || '[]');
    profile.looking_for = JSON.parse(profile.looking_for || '[]');
    profile.personality_traits = JSON.parse(profile.personality_traits || '[]');

    return profile;
  }

  private calculateCompletion(data: any): number {
    const fields = [
      'bio', 'occupation', 'education', 'height', 'relationshipGoal',
      'sexualOrientation', 'interests', 'languages', 'hometown',
      'currentCity', 'zodiacSign', 'smoking', 'drinking', 'exercise'
    ];

    const filledFields = fields.filter(field => {
      const value = data[field];
      return value !== null && value !== undefined && value !== '' &&
             (Array.isArray(value) ? value.length > 0 : true);
    });

    return Math.round((filledFields.length / fields.length) * 100);
  }

  // Photo methods
  async addPhoto(userId: string, url: string, thumbnailUrl?: string): Promise<ProfilePhoto> {
    const photoId = uuidv4();

    // Get current max order
    const maxOrder = await this.db('profile_photos')
      .where({ user_id: userId })
      .max('order_index as max')
      .first();

    const orderIndex = (maxOrder?.max || -1) + 1;

    const [photo] = await this.db('profile_photos')
      .insert({
        id: photoId,
        user_id: userId,
        url,
        thumbnail_url: thumbnailUrl,
        order_index: orderIndex,
        is_verified: false,
        moderation_status: 'pending',
        uploaded_at: new Date(),
        created_at: new Date(),
      })
      .returning('*');

    return photo;
  }

  async getPhotos(userId: string): Promise<ProfilePhoto[]> {
    const photos = await this.db('profile_photos')
      .where({ user_id: userId })
      .orderBy('order_index', 'asc');

    return photos;
  }

  async deletePhoto(photoId: string, userId: string): Promise<void> {
    await this.db('profile_photos')
      .where({ id: photoId, user_id: userId })
      .delete();
  }

  async reorderPhotos(userId: string, photoIds: string[]): Promise<void> {
    // Update order_index for each photo
    for (let i = 0; i < photoIds.length; i++) {
      await this.db('profile_photos')
        .where({ id: photoIds[i], user_id: userId })
        .update({ order_index: i });
    }
  }

  async moderatePhoto(photoId: string, status: 'approved' | 'rejected', notes?: string): Promise<void> {
    await this.db('profile_photos')
      .where({ id: photoId })
      .update({
        moderation_status: status,
        moderation_notes: notes,
        is_verified: status === 'approved',
      });
  }

  async getPendingPhotos(limit: number = 50): Promise<ProfilePhoto[]> {
    const photos = await this.db('profile_photos')
      .where({ moderation_status: 'pending' })
      .orderBy('created_at', 'asc')
      .limit(limit);

    return photos;
  }
}
