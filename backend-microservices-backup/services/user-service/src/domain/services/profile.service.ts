import { ProfileRepository } from '../repositories/profile.repository';
import { UpdateProfileDto, ProfileResponse } from '../entities/Profile.entity';
import logger from '../../utils/logger';

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
}
