import { ProfileRepository } from '../repositories/profile.repository';
import { PhotoService } from './photo.service';
import { PrivacyService } from './privacy.service';
import { CreateProfileDto, UpdateProfileDto, ProfileResponse, ProfileEntity } from '../entities/Profile.entity';
import logger from '../../utils/logger';
import db from '../../infrastructure/database/connection';

export class ProfileService {
  private profileRepository: ProfileRepository;
  private photoService: PhotoService;
  private privacyService: PrivacyService;

  constructor(
    profileRepository?: ProfileRepository,
    photoService?: PhotoService,
    privacyService?: PrivacyService
  ) {
    this.profileRepository = profileRepository || new ProfileRepository();
    this.photoService = photoService || new PhotoService();
    this.privacyService = privacyService || new PrivacyService();
  }

  /**
   * Create a new profile for a user
   */
  async createProfile(userId: string, profileData: CreateProfileDto): Promise<ProfileResponse> {
    try {
      // Check if profile already exists
      const existing = await this.profileRepository.findByUserId(userId);
      if (existing) {
        throw new Error('Profile already exists for this user');
      }

      // Validate profile data
      this.validateProfileData(profileData);

      // Create the profile
      const profile = await this.profileRepository.create({
        ...profileData,
        user_id: userId,
      });

      // Initialize privacy settings
      await this.privacyService.initializePrivacySettings(userId);

      logger.info(`Profile created for user: ${userId}`);

      // Calculate completion percentage
      const enrichedProfile = await this.enrichProfileWithMetadata(profile);

      return enrichedProfile;
    } catch (error: any) {
      logger.error(`Error creating profile for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get profile by user ID
   */
  async getProfileByUserId(userId: string, viewerId?: string): Promise<ProfileResponse> {
    const profile = await this.profileRepository.findByUserId(userId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    // Apply privacy filtering if viewer is different from profile owner
    if (viewerId && viewerId !== userId) {
      return await this.getFilteredProfile(profile, viewerId);
    }

    return await this.enrichProfileWithMetadata(profile);
  }

  /**
   * Get profile by ID
   */
  async getProfileById(profileId: string, viewerId?: string): Promise<ProfileResponse> {
    const profile = await this.profileRepository.findById(profileId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    // Apply privacy filtering if viewer is different from profile owner
    if (viewerId && viewerId !== profile.user_id) {
      return await this.getFilteredProfile(profile, viewerId);
    }

    return await this.enrichProfileWithMetadata(profile);
  }

  /**
   * Update profile
   */
  async updateProfile(userId: string, updateData: UpdateProfileDto): Promise<ProfileResponse> {
    try {
      // Validate update data
      this.validateProfileData(updateData);

      const profile = await this.profileRepository.update(userId, updateData);
      if (!profile) {
        throw new Error('Profile not found');
      }

      logger.info(`Profile updated for user: ${userId}`);

      // Recalculate completion percentage
      await this.updateProfileCompletion(userId);

      // Update search index
      await this.updateSearchIndex(userId);

      return await this.enrichProfileWithMetadata(profile);
    } catch (error: any) {
      logger.error(`Error updating profile for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delete profile
   */
  async deleteProfile(userId: string): Promise<void> {
    try {
      const profile = await this.profileRepository.findByUserId(userId);
      if (!profile) {
        throw new Error('Profile not found');
      }

      await this.profileRepository.delete(userId);
      logger.info(`Profile deleted for user: ${userId}`);
    } catch (error: any) {
      logger.error(`Error deleting profile for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate and update profile completion percentage
   */
  async updateProfileCompletion(userId: string): Promise<number> {
    try {
      const profile = await this.profileRepository.findByUserId(userId);
      if (!profile) {
        throw new Error('Profile not found');
      }

      const completionPercentage = this.calculateProfileCompletion(profile);
      const isCompleted = completionPercentage >= 80;

      // Update profile completion status
      await db('profiles')
        .where({ user_id: userId })
        .update({
          profile_completion_percentage: completionPercentage,
          profile_completed: isCompleted,
          updated_at: db.fn.now(),
        });

      return completionPercentage;
    } catch (error: any) {
      logger.error(`Error updating profile completion for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate profile completion percentage
   */
  private calculateProfileCompletion(profile: ProfileEntity): number {
    let score = 0;
    const weights = {
      bio: 15,
      occupation: 5,
      education: 5,
      height: 5,
      location: 10,
      interests: 10,
      languages: 5,
      lifestyle: 15, // smoking, drinking, exercise, diet, pets
      relationship: 10, // relationship_type, has_children, wants_children
      personal: 10, // zodiac, religion, politics
      photos: 15, // minimum 2 photos
    };

    // Bio (15%)
    if (profile.bio && profile.bio.length >= 50) {
      score += weights.bio;
    } else if (profile.bio && profile.bio.length >= 20) {
      score += weights.bio * 0.5;
    }

    // Occupation (5%)
    if (profile.occupation) {
      score += weights.occupation;
    }

    // Education (5%)
    if (profile.education) {
      score += weights.education;
    }

    // Height (5%)
    if (profile.height) {
      score += weights.height;
    }

    // Location (10%)
    if (profile.city && profile.country) {
      score += weights.location;
    } else if (profile.city || profile.country) {
      score += weights.location * 0.5;
    }

    // Interests (10%)
    if (profile.interests && profile.interests.length >= 5) {
      score += weights.interests;
    } else if (profile.interests && profile.interests.length >= 3) {
      score += weights.interests * 0.7;
    } else if (profile.interests && profile.interests.length >= 1) {
      score += weights.interests * 0.3;
    }

    // Languages (5%)
    if (profile.languages && profile.languages.length >= 1) {
      score += weights.languages;
    }

    // Lifestyle (15%)
    let lifestyleCount = 0;
    if (profile.smoking) lifestyleCount++;
    if (profile.drinking) lifestyleCount++;
    if (profile.exercise) lifestyleCount++;
    if (profile.diet) lifestyleCount++;
    if (profile.pets) lifestyleCount++;
    score += (lifestyleCount / 5) * weights.lifestyle;

    // Relationship preferences (10%)
    let relationshipCount = 0;
    if (profile.relationship_type) relationshipCount++;
    if (profile.has_children !== undefined) relationshipCount++;
    if (profile.wants_children !== undefined) relationshipCount++;
    score += (relationshipCount / 3) * weights.relationship;

    // Personal info (10%)
    let personalCount = 0;
    if (profile.zodiac_sign) personalCount++;
    if (profile.religion) personalCount++;
    if (profile.politics) personalCount++;
    score += (personalCount / 3) * weights.personal;

    // Photos (15%) - checked separately
    // This will be added when enriching the profile

    return Math.round(score);
  }

  /**
   * Enrich profile with photos and metadata
   */
  private async enrichProfileWithMetadata(profile: ProfileEntity): Promise<ProfileResponse> {
    try {
      // Get photos count
      const photoCount = await this.photoService.getUserPhotos(profile.user_id).then(p => p.length);

      // Add photo completion score
      let photoScore = 0;
      if (photoCount >= 6) {
        photoScore = 15;
      } else if (photoCount >= 4) {
        photoScore = 12;
      } else if (photoCount >= 2) {
        photoScore = 9;
      } else if (photoCount >= 1) {
        photoScore = 5;
      }

      // Get current completion and add photo score
      const baseCompletion = this.calculateProfileCompletion(profile);
      const totalCompletion = Math.min(100, baseCompletion + photoScore);

      return {
        ...profile,
        profile_completion_percentage: totalCompletion,
        profile_completed: totalCompletion >= 80,
      } as ProfileResponse;
    } catch (error) {
      // Return profile without enrichment if error
      logger.warn('Error enriching profile:', error);
      return profile as ProfileResponse;
    }
  }

  /**
   * Get filtered profile based on privacy settings
   */
  private async getFilteredProfile(
    profile: ProfileEntity,
    viewerId: string
  ): Promise<ProfileResponse> {
    try {
      // Check if viewer can see the profile
      const canView = await this.privacyService.canViewProfile(viewerId, profile.user_id, false);

      if (!canView.canView) {
        throw new Error(canView.reason || 'Profile not accessible');
      }

      // Get privacy settings
      const privacyInfo = await this.privacyService.getVisibleProfileInfo(
        profile.user_id,
        viewerId,
        false
      );

      // Apply location privacy
      let location = {
        latitude: profile.latitude,
        longitude: profile.longitude,
      };

      if (profile.latitude && profile.longitude) {
        location = await this.privacyService.getUserLocation(
          profile.user_id,
          profile.latitude,
          profile.longitude
        );
      }

      // Build filtered response
      const filtered: any = {
        ...profile,
        latitude: location.latitude,
        longitude: location.longitude,
      };

      // Remove sensitive data based on privacy settings
      if (!privacyInfo.showAge) {
        // Don't show exact age/birthday if hidden
      }

      if (!privacyInfo.showLastActive) {
        filtered.last_active_at = undefined;
      }

      return await this.enrichProfileWithMetadata(filtered);
    } catch (error) {
      logger.error('Error filtering profile:', error);
      throw error;
    }
  }

  /**
   * Validate profile data
   */
  private validateProfileData(data: Partial<CreateProfileDto | UpdateProfileDto>): void {
    // Bio validation
    if (data.bio !== undefined) {
      if (data.bio && data.bio.length > 500) {
        throw new Error('Bio cannot exceed 500 characters');
      }
      if (data.bio && data.bio.length < 10) {
        throw new Error('Bio must be at least 10 characters');
      }
    }

    // Height validation
    if (data.height !== undefined && data.height !== null) {
      if (data.height < 120 || data.height > 250) {
        throw new Error('Height must be between 120 and 250 cm');
      }
    }

    // Interests validation
    if (data.interests) {
      if (data.interests.length > 10) {
        throw new Error('Maximum 10 interests allowed');
      }
      for (const interest of data.interests) {
        if (interest.length > 50) {
          throw new Error('Each interest must be 50 characters or less');
        }
      }
    }

    // Languages validation
    if (data.languages) {
      if (data.languages.length > 10) {
        throw new Error('Maximum 10 languages allowed');
      }
    }

    // Coordinates validation
    if (data.latitude !== undefined && data.latitude !== null) {
      if (data.latitude < -90 || data.latitude > 90) {
        throw new Error('Invalid latitude value');
      }
    }

    if (data.longitude !== undefined && data.longitude !== null) {
      if (data.longitude < -180 || data.longitude > 180) {
        throw new Error('Invalid longitude value');
      }
    }

    // URL validation
    if ((data as any).network_linkedin_url) {
      if (!(data as any).network_linkedin_url.startsWith('http')) {
        throw new Error('LinkedIn URL must be a valid URL');
      }
    }

    if ((data as any).network_portfolio_url) {
      if (!(data as any).network_portfolio_url.startsWith('http')) {
        throw new Error('Portfolio URL must be a valid URL');
      }
    }
  }

  /**
   * Increment profile view count
   */
  async incrementViewCount(userId: string): Promise<void> {
    try {
      await db('profiles')
        .where({ user_id: userId })
        .increment('view_count', 1);
    } catch (error) {
      logger.error(`Error incrementing view count for user ${userId}:`, error);
    }
  }

  /**
   * Increment profile like count
   */
  async incrementLikeCount(userId: string): Promise<void> {
    try {
      await db('profiles')
        .where({ user_id: userId })
        .increment('like_count', 1);
    } catch (error) {
      logger.error(`Error incrementing like count for user ${userId}:`, error);
    }
  }

  /**
   * Decrement profile like count
   */
  async decrementLikeCount(userId: string): Promise<void> {
    try {
      await db('profiles')
        .where({ user_id: userId })
        .decrement('like_count', 1);
    } catch (error) {
      logger.error(`Error decrementing like count for user ${userId}:`, error);
    }
  }

  /**
   * Update last active timestamp
   */
  async updateLastActive(userId: string): Promise<void> {
    try {
      await db('profiles')
        .where({ user_id: userId })
        .update({ last_active_at: db.fn.now() });
    } catch (error) {
      logger.error(`Error updating last active for user ${userId}:`, error);
    }
  }

  /**
   * Update photo verification status
   */
  async updatePhotoVerificationStatus(userId: string, verified: boolean): Promise<void> {
    try {
      await db('profiles')
        .where({ user_id: userId })
        .update({
          is_photo_verified: verified,
          updated_at: db.fn.now(),
        });

      logger.info(`Photo verification status updated for user ${userId}: ${verified}`);
    } catch (error) {
      logger.error(`Error updating photo verification status for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update search index for profile
   * This would integrate with Elasticsearch or similar search service
   */
  private async updateSearchIndex(userId: string): Promise<void> {
    try {
      const profile = await this.profileRepository.findByUserId(userId);
      if (!profile) {
        return;
      }

      // Build search document
      const searchDocument = {
        user_id: userId,
        bio: profile.bio || '',
        occupation: profile.occupation || '',
        interests: profile.interests || [],
        languages: profile.languages || [],
        city: profile.city || '',
        country: profile.country || '',
        latitude: profile.latitude,
        longitude: profile.longitude,
        relationship_type: profile.relationship_type,
        education: profile.education,
        smoking: profile.smoking,
        drinking: profile.drinking,
        exercise: profile.exercise,
        is_photo_verified: profile.is_photo_verified,
        profile_completion_percentage: profile.profile_completion_percentage,
        updated_at: profile.updated_at,
      };

      // TODO: Integrate with Elasticsearch
      // await searchClient.index({
      //   index: 'profiles',
      //   id: userId,
      //   body: searchDocument,
      // });

      logger.debug(`Search index updated for user ${userId}`);
    } catch (error) {
      logger.error(`Error updating search index for user ${userId}:`, error);
      // Don't throw - search index update should not block profile updates
    }
  }

  /**
   * Search profiles (placeholder for Elasticsearch integration)
   */
  async searchProfiles(criteria: {
    query?: string;
    location?: { latitude: number; longitude: number; radius: number };
    ageRange?: { min: number; max: number };
    interests?: string[];
    relationshipType?: string;
    limit?: number;
    offset?: number;
  }): Promise<ProfileResponse[]> {
    try {
      // TODO: Implement Elasticsearch query
      // For now, return empty array
      logger.warn('Profile search not yet implemented with Elasticsearch');
      return [];
    } catch (error) {
      logger.error('Error searching profiles:', error);
      throw error;
    }
  }

  /**
   * Get profile analytics
   */
  async getProfileAnalytics(userId: string): Promise<{
    views: number;
    likes: number;
    completionPercentage: number;
    isVerified: boolean;
  }> {
    try {
      const profile = await this.profileRepository.findByUserId(userId);
      if (!profile) {
        throw new Error('Profile not found');
      }

      return {
        views: profile.view_count || 0,
        likes: profile.like_count || 0,
        completionPercentage: profile.profile_completion_percentage || 0,
        isVerified: profile.is_photo_verified || false,
      };
    } catch (error) {
      logger.error(`Error getting profile analytics for user ${userId}:`, error);
      throw error;
    }
  }
}
