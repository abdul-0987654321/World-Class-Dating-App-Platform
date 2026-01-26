import logger from '../../utils/logger';
import { UpdateProfileDto, ProfileResponse, CreateProfileDto } from '../entities/Profile.entity';
import { ProfileRepository } from '../repositories/profile.repository';

// Profile setup DTO
export interface ProfileSetupDto {
  gender?: string;
  date_of_birth?: string;
  interested_in?: string;
  bio?: string;
  location?: string;
  okta_user_id?: string;
}

export class ProfileService {
  private profileRepository: ProfileRepository;

  constructor() {
    this.profileRepository = new ProfileRepository();
  }

  async getProfileByUserId(userId: string): Promise<ProfileResponse> {
    const profile = await this.profileRepository.findByUserId(userId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    return profile;
  }

  async updateProfile(userId: string, updateData: UpdateProfileDto): Promise<ProfileResponse> {
    const profile = await this.profileRepository.update(userId, updateData);
    if (!profile) {
      throw new Error('Profile not found');
    }

    logger.info(`Profile updated for user: ${userId}`);
    return profile;
  }

  async setupProfile(userId: string, setupData: ProfileSetupDto): Promise<ProfileResponse> {
    // Check if profile already exists
    const existingProfile = await this.profileRepository.findByUserId(userId);
    if (existingProfile) {
      // Update existing profile instead of creating new one
      const profile = await this.profileRepository.update(userId, {
        ...setupData,
        profile_completed: true,
      } as UpdateProfileDto);
      logger.info(`Profile setup completed (updated) for user: ${userId}`);
      return profile!;
    }

    // Create new profile
    const profile = await this.profileRepository.create({
      user_id: userId,
      ...setupData,
      profile_completed: true,
    } as CreateProfileDto);

    logger.info(`Profile setup completed (created) for user: ${userId}`);
    return profile;
  }

  async getProfileStatus(userId: string): Promise<{ isComplete: boolean }> {
    try {
      const profile = await this.profileRepository.findByUserId(userId);
      return {
        isComplete: !!(profile && profile.profile_completed),
      };
    } catch {
      return { isComplete: false };
    }
  }
}
