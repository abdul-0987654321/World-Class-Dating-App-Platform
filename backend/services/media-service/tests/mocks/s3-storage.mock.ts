/**
 * Mock for S3 Storage Service
 */

export const mockS3StorageService = {
  initialize: jest.fn().mockResolvedValue(undefined),

  uploadFile: jest.fn().mockResolvedValue('https://test-cdn.cloudfront.net/uploads/test.jpg'),

  uploadImageVersions: jest.fn().mockResolvedValue({
    thumbnail: 'https://test-cdn.cloudfront.net/thumbnails/test-thumb.jpg',
    standard: 'https://test-cdn.cloudfront.net/standard/test-std.jpg',
    hd: 'https://test-cdn.cloudfront.net/hd/test-hd.jpg',
    original: 'https://test-cdn.cloudfront.net/original/test.jpg',
  }),

  deleteFile: jest.fn().mockResolvedValue(true),

  deleteImageVersions: jest.fn().mockResolvedValue(true),

  getFile: jest.fn().mockResolvedValue(Buffer.from('fake-file-data')),

  uploadBlob: jest.fn().mockResolvedValue('https://test-cdn.cloudfront.net/uploads/blob.jpg'),

  deleteBlob: jest.fn().mockResolvedValue(true),

  downloadBlob: jest.fn().mockResolvedValue(Buffer.from('fake-blob-data')),

  blobExists: jest.fn().mockResolvedValue(true),

  getBlobMetadata: jest.fn().mockResolvedValue({
    contentType: 'image/jpeg',
    contentLength: 500000,
    lastModified: new Date(),
  }),

  getSignedUrl: jest.fn().mockResolvedValue({
    signedUrl: 'https://test-cdn.cloudfront.net/signed/test.jpg?signature=xxx',
    expiresAt: new Date(Date.now() + 3600000),
    expirySeconds: 3600,
  }),

  getSignedUrls: jest.fn().mockResolvedValue([
    {
      url: 'https://test-cdn.cloudfront.net/test1.jpg',
      signedUrl: 'https://test-cdn.cloudfront.net/signed/test1.jpg?signature=xxx',
      expiresAt: new Date(Date.now() + 3600000),
    },
  ]),

  getSignedUrlWithAccessCheck: jest.fn().mockResolvedValue({
    signedUrl: 'https://test-cdn.cloudfront.net/signed/test.jpg?signature=xxx',
    expiresAt: new Date(Date.now() + 3600000),
    expirySeconds: 3600,
  }),

  getPresignedUploadUrl: jest.fn().mockResolvedValue({
    uploadUrl: 'https://test-cdn.cloudfront.net/presigned-upload?signature=xxx',
    key: 'user-123/uploads/test.jpg',
    expiresAt: new Date(Date.now() + 900000),
    publicUrl: 'https://test-cdn.cloudfront.net/user-123/uploads/test.jpg',
  }),
};

// Mock the module
jest.mock('../../src/infrastructure/storage/s3-storage.service', () => ({
  __esModule: true,
  default: mockS3StorageService,
  S3StorageService: jest.fn().mockImplementation(() => mockS3StorageService),
  storageService: mockS3StorageService,
}));
