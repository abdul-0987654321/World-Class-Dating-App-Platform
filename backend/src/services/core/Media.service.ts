import { ProfileRepository } from '../../repositories';
import sharp from 'sharp';
import { BlobServiceClient } from '@azure/storage-blob';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class MediaService {
  private profileRepo: ProfileRepository;
  private blobServiceClient?: BlobServiceClient;
  private containerName: string = 'photos';

  constructor(profileRepo: ProfileRepository) {
    this.profileRepo = profileRepo;

    // Initialize Azure Blob Storage if connection string is provided
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (connectionString) {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    }
  }

  async uploadPhoto(userId: string, file: Buffer, originalName: string): Promise<{
    url: string;
    thumbnailUrl: string;
  }> {
    // Process image
    const processed = await this.processImage(file);

    // Generate unique filename
    const extension = path.extname(originalName);
    const filename = `${uuidv4()}${extension}`;
    const thumbnailFilename = `${uuidv4()}_thumb${extension}`;

    // Upload to Azure Blob Storage (or local storage in development)
    const url = await this.uploadToStorage(filename, processed.image);
    const thumbnailUrl = await this.uploadToStorage(thumbnailFilename, processed.thumbnail);

    // Add photo to profile
    await this.profileRepo.addPhoto(userId, url, thumbnailUrl);

    return { url, thumbnailUrl };
  }

  async deletePhoto(userId: string, photoId: string) {
    // Get photo to find URLs
    const photos = await this.profileRepo.getPhotos(userId);
    const photo = photos.find(p => p.id === photoId);

    if (!photo) {
      throw new Error('Photo not found');
    }

    // Delete from storage
    if (photo.url) {
      await this.deleteFromStorage(photo.url);
    }
    if (photo.thumbnail_url) {
      await this.deleteFromStorage(photo.thumbnail_url);
    }

    // Delete from database
    await this.profileRepo.deletePhoto(photoId, userId);
  }

  async reorderPhotos(userId: string, photoIds: string[]) {
    await this.profileRepo.reorderPhotos(userId, photoIds);
  }

  private async processImage(buffer: Buffer): Promise<{
    image: Buffer;
    thumbnail: Buffer;
  }> {
    // Resize and optimize main image (max 1080px width/height)
    const image = await sharp(buffer)
      .resize(1080, 1080, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Create thumbnail (300px)
    const thumbnail = await sharp(buffer)
      .resize(300, 300, {
        fit: 'cover',
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    return { image, thumbnail };
  }

  private async uploadToStorage(filename: string, buffer: Buffer): Promise<string> {
    if (this.blobServiceClient) {
      // Upload to Azure Blob Storage
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);

      // Create container if it doesn't exist
      await containerClient.createIfNotExists({
        access: 'blob', // Public read access
      });

      const blockBlobClient = containerClient.getBlockBlobClient(filename);
      await blockBlobClient.uploadData(buffer, {
        blobHTTPHeaders: {
          blobContentType: 'image/jpeg',
        },
      });

      return blockBlobClient.url;
    } else {
      // In development, return a mock URL
      // In production, you should always use cloud storage
      return `http://localhost:3000/uploads/${filename}`;
    }
  }

  private async deleteFromStorage(url: string): Promise<void> {
    if (this.blobServiceClient) {
      // Extract blob name from URL
      const urlParts = url.split('/');
      const blobName = urlParts[urlParts.length - 1];

      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      await blockBlobClient.deleteIfExists();
    }
    // In development, you might want to delete from local filesystem
  }

  async moderatePhoto(photoId: string, status: 'approved' | 'rejected', notes?: string) {
    await this.profileRepo.moderatePhoto(photoId, status, notes);

    if (status === 'approved') {
      // Could trigger notification to user
    }
  }

  async getPendingPhotosForModeration(limit: number = 50) {
    return await this.profileRepo.getPendingPhotos(limit);
  }
}
