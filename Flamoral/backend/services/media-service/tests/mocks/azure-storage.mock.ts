/**
 * Mock for Azure Storage Service
 */

export const mockAzureStorageService = {
  initialize: jest.fn().mockResolvedValue(undefined),

  uploadImageVersions: jest.fn().mockResolvedValue({
    thumbnail: 'https://test-cdn.azureedge.net/thumbnail.jpg',
    standard: 'https://test-cdn.azureedge.net/standard.jpg',
    hd: 'https://test-cdn.azureedge.net/hd.jpg',
    original: 'https://test-cdn.azureedge.net/original.jpg',
  }),

  deleteImageVersions: jest.fn().mockResolvedValue(true),

  getBlobUrl: jest.fn((blobName: string) => `https://test-cdn.azureedge.net/${blobName}`),
};

// Mock the module
jest.mock('../../src/infrastructure/storage/azure-storage.service', () => ({
  __esModule: true,
  default: mockAzureStorageService,
}));
