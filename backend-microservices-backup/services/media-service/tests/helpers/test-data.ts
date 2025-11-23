/**
 * Test data helpers
 * Provides common test data for tests
 */

import { MediaMetadata, ModerationStatus, UploadedFile } from '../../src/types';

export const createMockFile = (overrides?: Partial<UploadedFile>): UploadedFile => {
  return {
    fieldname: 'photo',
    originalname: 'test-photo.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer: Buffer.from('fake-image-data'),
    size: 500000,
    ...overrides,
  };
};

export const createMockMedia = (overrides?: Partial<MediaMetadata>): MediaMetadata => {
  return {
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
    ...overrides,
  };
};

export const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export const invalidImageTypes = ['application/pdf', 'text/plain', 'video/mp4'];

export const createLargeFile = (): UploadedFile => {
  return createMockFile({
    size: 15000000, // 15MB
    buffer: Buffer.alloc(15000000),
  });
};
