import { CreatePhotoDto, PhotoResponse } from '../entities/Photo.entity';
import { PhotoRepository } from '../repositories/photo.repository';

export class PhotoService {
  private photoRepository: PhotoRepository;
  private readonly MIN_PHOTOS = 2;
  private readonly MAX_PHOTOS = 9;

  constructor(photoRepository?: PhotoRepository) {
    this.photoRepository = photoRepository || new PhotoRepository();
  }

  async addPhoto(
    userId: string,
    url: string,
    thumbnailUrl?: string,
    storageKey?: string
  ): Promise<PhotoResponse> {
    // Check photo limit
    const count = await this.photoRepository.count(userId);
    if (count >= this.MAX_PHOTOS) {
      throw new Error(`Maximum ${this.MAX_PHOTOS} photos allowed`);
    }

    const createData: CreatePhotoDto = {
      user_id: userId,
      url,
      thumbnail_url: thumbnailUrl,
      storage_key: storageKey,
      position: count, // Next position
      is_primary: count === 0, // First photo is primary
    };

    const photo = await this.photoRepository.create(createData);
    return this.mapToResponse(photo);
  }

  async getUserPhotos(userId: string): Promise<PhotoResponse[]> {
    const photos = await this.photoRepository.findByUserId(userId);
    return photos.map(this.mapToResponse);
  }

  async deletePhoto(userId: string, photoId: string): Promise<void> {
    const photo = await this.photoRepository.findById(photoId);
    if (!photo) {
      throw new Error('Photo not found');
    }

    if (photo.user_id !== userId) {
      throw new Error('Unauthorized to delete this photo');
    }

    // Check minimum photos requirement
    const count = await this.photoRepository.count(userId);
    if (count <= this.MIN_PHOTOS) {
      throw new Error(`Minimum ${this.MIN_PHOTOS} photos required`);
    }

    await this.photoRepository.delete(photoId);

    // If deleted photo was primary, set another as primary
    if (photo.is_primary) {
      const remainingPhotos = await this.photoRepository.findByUserId(userId);
      if (remainingPhotos.length > 0) {
        await this.photoRepository.setPrimary(userId, remainingPhotos[0].id);
      }
    }
  }

  async setPrimaryPhoto(userId: string, photoId: string): Promise<void> {
    const photo = await this.photoRepository.findById(photoId);
    if (!photo) {
      throw new Error('Photo not found');
    }

    if (photo.user_id !== userId) {
      throw new Error('Unauthorized to modify this photo');
    }

    await this.photoRepository.setPrimary(userId, photoId);
  }

  async reorderPhotos(
    userId: string,
    photoOrders: { id: string; position: number }[]
  ): Promise<void> {
    // Validate all photos belong to user
    for (const { id } of photoOrders) {
      const photo = await this.photoRepository.findById(id);
      if (!photo || photo.user_id !== userId) {
        throw new Error('Invalid photo ID or unauthorized');
      }
    }

    await this.photoRepository.reorder(userId, photoOrders);
  }

  async hasMinimumPhotos(userId: string): Promise<boolean> {
    const count = await this.photoRepository.count(userId);
    return count >= this.MIN_PHOTOS;
  }

  private mapToResponse(photo: any): PhotoResponse {
    return {
      id: photo.id,
      url: photo.url,
      thumbnail_url: photo.thumbnail_url,
      position: photo.position,
      is_primary: photo.is_primary,
      is_verified: photo.is_verified,
      created_at: photo.created_at,
    };
  }
}
