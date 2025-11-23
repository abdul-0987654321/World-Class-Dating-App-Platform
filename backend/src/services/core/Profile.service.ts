import { ProfileRepository } from '../../repositories';
import { ProfileUpdateInput } from '../../models/Profile.model';

export class ProfileService {
  private profileRepo: ProfileRepository;

  constructor(profileRepo: ProfileRepository) {
    this.profileRepo = profileRepo;
  }

  async getProfile(userId: string) {
    return await this.profileRepo.findByUserId(userId);
  }

  async updateProfile(userId: string, input: ProfileUpdateInput) {
    return await this.profileRepo.update(userId, input);
  }

  async addPhoto(userId: string, url: string, thumbnailUrl?: string) {
    return await this.profileRepo.addPhoto(userId, url, thumbnailUrl);
  }

  async getPhotos(userId: string) {
    return await this.profileRepo.getPhotos(userId);
  }

  async deletePhoto(photoId: string, userId: string) {
    await this.profileRepo.deletePhoto(photoId, userId);
  }

  async reorderPhotos(userId: string, photoIds: string[]) {
    await this.profileRepo.reorderPhotos(userId, photoIds);
  }

  async moderatePhoto(photoId: string, status: 'approved' | 'rejected', notes?: string) {
    await this.profileRepo.moderatePhoto(photoId, status, notes);
  }

  async getPendingPhotos(limit: number = 50) {
    return await this.profileRepo.getPendingPhotos(limit);
  }
}
