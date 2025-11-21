/**
 * Unit tests for Photo Verification Service
 */

import { PhotoVerificationService } from '../../../src/domain/services/photo-verification.service';
import '../../mocks/content-moderation.mock';

// Mock dependencies - must be defined before use
jest.mock('../../../src/domain/repositories/media.repository', () => ({
  __esModule: true,
  default: {
    update: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
  },
}));

jest.mock('../../../src/infrastructure/queue/queue-manager', () => ({
  __esModule: true,
  default: {
    addPhotoVerificationJob: jest.fn(),
  },
}));

const mockMediaRepository = require('../../../src/domain/repositories/media.repository').default;
const mockQueueManager = require('../../../src/infrastructure/queue/queue-manager').default;

describe('PhotoVerificationService', () => {
  let photoVerificationService: PhotoVerificationService;

  beforeEach(() => {
    photoVerificationService = new PhotoVerificationService();
    jest.clearAllMocks();
  });

  describe('verifyPhoto', () => {
    it('should verify photo with face detected', async () => {
      const mediaId = 'media-123';
      const imageUrl = 'https://test-cdn.azureedge.net/test.jpg';

      mockMediaRepository.update.mockResolvedValue({ id: mediaId, isVerified: true });

      const result = await photoVerificationService.verifyPhoto(mediaId, imageUrl);

      expect(result.verified).toBe(true);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.details?.faceDetected).toBe(true);
      expect(mockMediaRepository.update).toHaveBeenCalledWith(mediaId, { isVerified: true });
    });

    it('should reject photo without face', async () => {
      const mediaId = 'media-123';
      const imageUrl = 'https://test-cdn.azureedge.net/test.jpg';

      const contentModerationService = require('../../../src/domain/services/content-moderation.service').default;
      contentModerationService.verifyFacePresence.mockResolvedValueOnce(false);

      const result = await photoVerificationService.verifyPhoto(mediaId, imageUrl);

      expect(result.verified).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.reason).toBe('No face detected in the photo');
      expect(result.details?.faceDetected).toBe(false);
      expect(mockMediaRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('verifyProfilePhoto', () => {
    it('should verify profile photo without reference', async () => {
      const mediaId = 'media-123';
      const imageUrl = 'https://test-cdn.azureedge.net/test.jpg';

      mockMediaRepository.update.mockResolvedValue({ id: mediaId, isVerified: true });

      const result = await photoVerificationService.verifyProfilePhoto(mediaId, imageUrl);

      expect(result.verified).toBe(true);
      expect(result.details?.faceDetected).toBe(true);
    });

    it('should verify profile photo with reference', async () => {
      const mediaId = 'media-123';
      const imageUrl = 'https://test-cdn.azureedge.net/test.jpg';
      const referenceUrl = 'https://test-cdn.azureedge.net/reference.jpg';

      mockMediaRepository.update.mockResolvedValue({ id: mediaId, isVerified: true });

      const result = await photoVerificationService.verifyProfilePhoto(
        mediaId,
        imageUrl,
        referenceUrl
      );

      expect(result.verified).toBe(true);
      expect(result.details?.matchScore).toBeDefined();
    });

    it('should reject profile photo without face', async () => {
      const mediaId = 'media-123';
      const imageUrl = 'https://test-cdn.azureedge.net/test.jpg';

      const contentModerationService = require('../../../src/domain/services/content-moderation.service').default;
      contentModerationService.verifyFacePresence.mockResolvedValueOnce(false);

      const result = await photoVerificationService.verifyProfilePhoto(mediaId, imageUrl);

      expect(result.verified).toBe(false);
      expect(result.details?.faceDetected).toBe(false);
    });
  });

  describe('queueVerification', () => {
    it('should queue verification job', async () => {
      const mediaId = 'media-123';
      const userId = 'user-123';
      const imageUrl = 'https://test-cdn.azureedge.net/test.jpg';

      mockQueueManager.addPhotoVerificationJob.mockResolvedValue({ id: 'job-123' });

      await photoVerificationService.queueVerification(mediaId, userId, imageUrl);

      expect(mockQueueManager.addPhotoVerificationJob).toHaveBeenCalledWith(
        {
          mediaId,
          userId,
          imageUrl,
          referencePhotoUrl: undefined,
        },
        expect.any(Number) // JobPriority.HIGH
      );
    });

    it('should queue verification job with reference photo', async () => {
      const mediaId = 'media-123';
      const userId = 'user-123';
      const imageUrl = 'https://test-cdn.azureedge.net/test.jpg';
      const referenceUrl = 'https://test-cdn.azureedge.net/reference.jpg';

      mockQueueManager.addPhotoVerificationJob.mockResolvedValue({ id: 'job-123' });

      await photoVerificationService.queueVerification(
        mediaId,
        userId,
        imageUrl,
        referenceUrl
      );

      expect(mockQueueManager.addPhotoVerificationJob).toHaveBeenCalledWith(
        {
          mediaId,
          userId,
          imageUrl,
          referencePhotoUrl: referenceUrl,
        },
        expect.any(Number)
      );
    });
  });

  describe('getVerificationStatus', () => {
    it('should return verification status', async () => {
      const mediaId = 'media-123';
      const mockMedia = {
        id: mediaId,
        userId: 'user-123',
        isVerified: true,
      };

      mockMediaRepository.findById.mockResolvedValue(mockMedia);

      const result = await photoVerificationService.getVerificationStatus(mediaId);

      expect(result.mediaId).toBe(mediaId);
      expect(result.isVerified).toBe(true);
    });

    it('should throw error when media not found', async () => {
      const mediaId = 'non-existent';

      mockMediaRepository.findById.mockResolvedValue(null);

      await expect(
        photoVerificationService.getVerificationStatus(mediaId)
      ).rejects.toThrow('Media not found');
    });
  });

  describe('verifyUserPhotos', () => {
    it('should count verified and unverified photos', async () => {
      const userId = 'user-123';
      const mockPhotos = [
        { id: 'media-1', isVerified: true },
        { id: 'media-2', isVerified: true },
        { id: 'media-3', isVerified: false },
        { id: 'media-4', isVerified: false },
      ];

      mockMediaRepository.findByUserId.mockResolvedValue(mockPhotos);

      const result = await photoVerificationService.verifyUserPhotos(userId);

      expect(result.total).toBe(4);
      expect(result.verified).toBe(2);
      expect(result.unverified).toBe(2);
    });

    it('should handle user with no photos', async () => {
      const userId = 'user-123';

      mockMediaRepository.findByUserId.mockResolvedValue([]);

      const result = await photoVerificationService.verifyUserPhotos(userId);

      expect(result.total).toBe(0);
      expect(result.verified).toBe(0);
      expect(result.unverified).toBe(0);
    });
  });

  describe('verifyLiveness', () => {
    it('should return liveness detection result', async () => {
      const imageUrl = 'https://test-cdn.azureedge.net/test.jpg';

      const result = await photoVerificationService.verifyLiveness(imageUrl);

      expect(result.isLive).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });
  });
});
