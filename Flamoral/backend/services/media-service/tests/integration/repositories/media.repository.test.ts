/// <reference types="jest" />
/**
 * Integration tests for Media Repository
 * These tests use an in-memory database or test database
 */

import { MediaRepository } from '../../../src/domain/repositories/media.repository';
import { MediaMetadata, ModerationStatus } from '../../../src/types';
import { Knex } from 'knex';

// Mock database query builder for testing
let mockQueryBuilder: any;
let mockDb: jest.Mock;
let mediaRepository: MediaRepository;

describe('MediaRepository Integration Tests', () => {
  beforeAll(async () => {
    // Create chainable query builder mock
    mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      del: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      first: jest.fn(),
      returning: jest.fn(),
      orderBy: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis(),
    };

    // Create mock db function that returns the query builder (mimics Knex behavior)
    mockDb = jest.fn().mockReturnValue(mockQueryBuilder);

    // Create repository instance with mock db
    mediaRepository = new MediaRepository(mockDb as any);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new media record', async () => {
      const mediaData: MediaMetadata = {
        id: 'media-123',
        userId: 'user-123',
        fileName: 'test.jpg',
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 500000,
        urls: {
          thumbnail: 'https://cdn.test/thumb.jpg',
          standard: 'https://cdn.test/standard.jpg',
          hd: 'https://cdn.test/hd.jpg',
          original: 'https://cdn.test/original.jpg',
        },
        dimensions: { width: 1920, height: 1080 },
        isProfilePhoto: false,
        isVerified: false,
        moderationStatus: ModerationStatus.PENDING,
        uploadedAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCreated = {
        id: mediaData.id,
        user_id: mediaData.userId,
        file_name: mediaData.fileName,
        original_name: mediaData.originalName,
        mime_type: mediaData.mimeType,
        size: mediaData.size,
        urls: JSON.stringify(mediaData.urls),
        dimensions: JSON.stringify(mediaData.dimensions),
        is_profile_photo: mediaData.isProfilePhoto,
        is_verified: mediaData.isVerified,
        moderation_status: mediaData.moderationStatus,
        moderation_result: null,
        uploaded_at: mediaData.uploadedAt,
        updated_at: mediaData.updatedAt,
      };

      mockQueryBuilder.returning.mockResolvedValue([mockCreated]);

      const result = await mediaRepository.create(mediaData);

      expect(result).toBeDefined();
      expect(result.id).toBe(mediaData.id);
      expect(result.userId).toBe(mediaData.userId);
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
      expect(mockQueryBuilder.returning).toHaveBeenCalledWith('*');
    });
  });

  describe('findById', () => {
    it('should find media by ID', async () => {
      const mediaId = 'media-123';
      const mockMedia = {
        id: mediaId,
        user_id: 'user-123',
        file_name: 'test.jpg',
        original_name: 'test.jpg',
        mime_type: 'image/jpeg',
        size: 500000,
        urls: JSON.stringify({
          thumbnail: 'https://cdn.test/thumb.jpg',
          standard: 'https://cdn.test/standard.jpg',
          hd: 'https://cdn.test/hd.jpg',
          original: 'https://cdn.test/original.jpg',
        }),
        dimensions: JSON.stringify({ width: 1920, height: 1080 }),
        is_profile_photo: false,
        is_verified: false,
        moderation_status: ModerationStatus.PENDING,
        moderation_result: null,
        uploaded_at: new Date(),
        updated_at: new Date(),
      };

      mockQueryBuilder.first.mockResolvedValue(mockMedia);

      const result = await mediaRepository.findById(mediaId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(mediaId);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: mediaId });
      expect(mockQueryBuilder.first).toHaveBeenCalled();
    });

    it('should return null when media not found', async () => {
      mockQueryBuilder.first.mockResolvedValue(null);

      const result = await mediaRepository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should find all media for a user', async () => {
      const userId = 'user-123';
      const mockMedia = [
        {
          id: 'media-1',
          user_id: userId,
          file_name: 'test1.jpg',
          original_name: 'test1.jpg',
          mime_type: 'image/jpeg',
          size: 500000,
          urls: JSON.stringify({ thumbnail: 'url1' }),
          dimensions: JSON.stringify({ width: 1920, height: 1080 }),
          is_profile_photo: false,
          is_verified: false,
          moderation_status: ModerationStatus.APPROVED,
          moderation_result: null,
          uploaded_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockQueryBuilder.orderBy.mockResolvedValue(mockMedia);

      const result = await mediaRepository.findByUserId(userId);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ user_id: userId });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('uploaded_at', 'desc');
    });
  });

  describe('update', () => {
    it('should update media record', async () => {
      const mediaId = 'media-123';
      const updates = {
        isVerified: true,
        moderationStatus: ModerationStatus.APPROVED,
      };

      const mockUpdated = {
        id: mediaId,
        is_verified: true,
        moderation_status: ModerationStatus.APPROVED,
        user_id: 'user-123',
        file_name: 'test.jpg',
        urls: JSON.stringify({}),
        dimensions: JSON.stringify({}),
      };

      mockQueryBuilder.returning.mockResolvedValue([mockUpdated]);

      const result = await mediaRepository.update(mediaId, updates);

      expect(result).toBeDefined();
      expect(mockQueryBuilder.update).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: mediaId });
    });
  });

  describe('delete', () => {
    it('should delete media record', async () => {
      const mediaId = 'media-123';

      mockQueryBuilder.del.mockResolvedValue(1);

      const result = await mediaRepository.delete(mediaId);

      expect(result).toBe(true);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: mediaId });
      expect(mockQueryBuilder.del).toHaveBeenCalled();
    });

    it('should return false when no record deleted', async () => {
      const mediaId = 'non-existent';

      mockQueryBuilder.del.mockResolvedValue(0);

      const result = await mediaRepository.delete(mediaId);

      expect(result).toBe(false);
    });
  });

  describe('countByUserId', () => {
    it('should count user media', async () => {
      const userId = 'user-123';

      mockQueryBuilder.first.mockResolvedValue({ count: '5' });

      const result = await mediaRepository.countByUserId(userId);

      expect(result).toBe(5);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ user_id: userId });
      expect(mockQueryBuilder.count).toHaveBeenCalledWith('* as count');
    });
  });

  describe('findByModerationStatus', () => {
    it('should find media by moderation status', async () => {
      const status = ModerationStatus.PENDING;

      const mockMedia = [
        {
          id: 'media-1',
          moderation_status: status,
          user_id: 'user-123',
          urls: JSON.stringify({}),
          dimensions: JSON.stringify({}),
        },
      ];

      mockQueryBuilder.orderBy.mockResolvedValue(mockMedia);

      const result = await mediaRepository.findByModerationStatus(status);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ moderation_status: status });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('uploaded_at', 'asc');
    });
  });

  describe('unsetProfilePhotos', () => {
    it('should unset all profile photos for a user', async () => {
      const userId = 'user-123';

      mockQueryBuilder.update.mockResolvedValue(undefined);

      await mediaRepository.unsetProfilePhotos(userId);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ user_id: userId });
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({ is_profile_photo: false });
    });
  });
});
