/// <reference types="jest" />
/**
 * Unit tests for Upload Service
 */

import { UploadService } from '../../../src/domain/services/upload.service';
import { UploadedFile, ModerationStatus } from '../../../src/types';
import '../../mocks/azure-storage.mock';
import '../../mocks/content-moderation.mock';
import '../../mocks/image-processing.mock';

// Mock dependencies - must be defined before jest.mock()
jest.mock('../../../src/domain/repositories/media.repository', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    unsetProfilePhotos: jest.fn(),
  },
}));

const mockMediaRepository = require('../../../src/domain/repositories/media.repository').default;

describe('UploadService', () => {
  let uploadService: UploadService;
  let mockFile: UploadedFile;

  beforeEach(() => {
    uploadService = new UploadService();

    // Reset all mocks
    jest.clearAllMocks();

    // Mock file
    mockFile = {
      fieldname: 'photo',
      originalname: 'test-photo.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('fake-image-data'),
      size: 500000,
    };
  });

  describe('uploadPhoto', () => {
    it('should successfully upload a photo', async () => {
      const userId = 'user-123';
      const mockMedia = {
        id: 'media-123',
        userId,
        fileName: 'media-123-test-photo.jpg',
        originalName: 'test-photo.jpg',
        mimeType: 'image/jpeg',
        size: 500000,
        urls: {
          thumbnail: 'https://test-cdn.azureedge.net/thumbnail.jpg',
          standard: 'https://test-cdn.azureedge.net/standard.jpg',
          hd: 'https://test-cdn.azureedge.net/hd.jpg',
          original: 'https://test-cdn.azureedge.net/original.jpg',
        },
        dimensions: { width: 1920, height: 1080 },
        isProfilePhoto: false,
        isVerified: false,
        moderationStatus: ModerationStatus.PENDING,
        uploadedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      };

      mockMediaRepository.create.mockResolvedValue(mockMedia);

      const result = await uploadService.uploadPhoto(mockFile, userId);

      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.originalName).toBe('test-photo.jpg');
      expect(result.moderationStatus).toBe(ModerationStatus.PENDING);
      expect(mockMediaRepository.create).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid image validation', async () => {
      const userId = 'user-123';

      // Mock validation failure
      const imageProcessingService = require('../../../src/domain/services/image-processing.service').default;
      const originalValidate = imageProcessingService.validateImage;
      imageProcessingService.validateImage = jest.fn().mockReturnValue({
        valid: false,
        error: 'File size exceeds maximum allowed size',
      });

      await expect(uploadService.uploadPhoto(mockFile, userId)).rejects.toThrow(
        'File size exceeds maximum allowed size'
      );

      expect(mockMediaRepository.create).not.toHaveBeenCalled();

      // Restore original
      imageProcessingService.validateImage = originalValidate;
    });

    it('should upload profile photo with correct flag', async () => {
      const userId = 'user-123';
      const mockMedia = {
        id: 'media-123',
        userId,
        isProfilePhoto: true,
        moderationStatus: ModerationStatus.PENDING,
      };

      mockMediaRepository.create.mockResolvedValue(mockMedia);

      const result = await uploadService.uploadPhoto(mockFile, userId, true);

      expect(result.isProfilePhoto).toBe(true);
    });
  });

  describe('deletePhoto', () => {
    it('should successfully delete a photo', async () => {
      const mediaId = 'media-123';
      const urls = {
        thumbnail: 'https://test-cdn.azureedge.net/thumbnail.jpg',
        standard: 'https://test-cdn.azureedge.net/standard.jpg',
        hd: 'https://test-cdn.azureedge.net/hd.jpg',
        original: 'https://test-cdn.azureedge.net/original.jpg',
      };

      mockMediaRepository.delete.mockResolvedValue(true);

      const result = await uploadService.deletePhoto(mediaId, urls);

      expect(result).toBe(true);
      expect(mockMediaRepository.delete).toHaveBeenCalledWith(mediaId);
    });

    it('should handle deletion failure', async () => {
      const mediaId = 'media-123';
      const urls = {
        thumbnail: 'https://test-cdn.azureedge.net/thumbnail.jpg',
        standard: 'https://test-cdn.azureedge.net/standard.jpg',
        hd: 'https://test-cdn.azureedge.net/hd.jpg',
        original: 'https://test-cdn.azureedge.net/original.jpg',
      };

      // Mock Azure Storage deletion failure
      const azureStorageService = require('../../../src/infrastructure/storage/azure-storage.service').default;
      const originalDelete = azureStorageService.deleteImageVersions;
      azureStorageService.deleteImageVersions = jest.fn().mockResolvedValue(false);

      const result = await uploadService.deletePhoto(mediaId, urls);

      expect(result).toBe(false);
      expect(mockMediaRepository.delete).not.toHaveBeenCalled();

      // Restore original
      azureStorageService.deleteImageVersions = originalDelete;
    });
  });

  describe('getUserPhotos', () => {
    it('should retrieve all photos for a user', async () => {
      const userId = 'user-123';
      const mockPhotos = [
        {
          id: 'media-1',
          userId,
          originalName: 'photo1.jpg',
          moderationStatus: ModerationStatus.APPROVED,
        },
        {
          id: 'media-2',
          userId,
          originalName: 'photo2.jpg',
          moderationStatus: ModerationStatus.APPROVED,
        },
      ];

      mockMediaRepository.findByUserId.mockResolvedValue(mockPhotos);

      const result = await uploadService.getUserPhotos(userId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('media-1');
      expect(mockMediaRepository.findByUserId).toHaveBeenCalledWith(userId);
    });

    it('should return empty array when user has no photos', async () => {
      const userId = 'user-123';

      mockMediaRepository.findByUserId.mockResolvedValue([]);

      const result = await uploadService.getUserPhotos(userId);

      expect(result).toHaveLength(0);
    });
  });

  describe('getPhoto', () => {
    it('should retrieve a specific photo', async () => {
      const mediaId = 'media-123';
      const mockPhoto = {
        id: mediaId,
        userId: 'user-123',
        originalName: 'test.jpg',
        moderationStatus: ModerationStatus.APPROVED,
      };

      mockMediaRepository.findById.mockResolvedValue(mockPhoto);

      const result = await uploadService.getPhoto(mediaId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(mediaId);
      expect(mockMediaRepository.findById).toHaveBeenCalledWith(mediaId);
    });

    it('should return null when photo not found', async () => {
      const mediaId = 'non-existent';

      mockMediaRepository.findById.mockResolvedValue(null);

      const result = await uploadService.getPhoto(mediaId);

      expect(result).toBeNull();
    });
  });

  describe('setAsProfilePhoto', () => {
    it('should set a photo as profile photo', async () => {
      const mediaId = 'media-123';
      const userId = 'user-123';

      mockMediaRepository.unsetProfilePhotos.mockResolvedValue(undefined);
      mockMediaRepository.update.mockResolvedValue({ id: mediaId, isProfilePhoto: true });

      const result = await uploadService.setAsProfilePhoto(mediaId, userId);

      expect(result).toBe(true);
      expect(mockMediaRepository.unsetProfilePhotos).toHaveBeenCalledWith(userId);
      expect(mockMediaRepository.update).toHaveBeenCalledWith(mediaId, { isProfilePhoto: true });
    });
  });

  describe('verifyPhotoRequirements', () => {
    it('should verify photo with face present', async () => {
      const imageUrl = 'https://test-cdn.azureedge.net/test.jpg';

      const result = await uploadService.verifyPhotoRequirements(imageUrl);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject photo without face', async () => {
      const imageUrl = 'https://test-cdn.azureedge.net/test.jpg';

      const contentModerationService = require('../../../src/domain/services/content-moderation.service').default;
      const originalVerify = contentModerationService.verifyFacePresence;
      contentModerationService.verifyFacePresence = jest.fn().mockResolvedValue(false);

      const result = await uploadService.verifyPhotoRequirements(imageUrl);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Photo must contain a clear view of your face');

      // Restore original
      contentModerationService.verifyFacePresence = originalVerify;
    });
  });
});
