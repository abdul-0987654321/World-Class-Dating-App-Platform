/**
 * Mock for Image Processing Service
 */

export const mockImageProcessingService = {
  validateImage: jest.fn().mockReturnValue({
    valid: true,
  }),

  getMetadata: jest.fn().mockResolvedValue({
    width: 1920,
    height: 1080,
    format: 'jpeg',
    size: 500000,
  }),

  processImage: jest.fn().mockResolvedValue({
    thumbnail: Buffer.from('thumbnail'),
    standard: Buffer.from('standard'),
    hd: Buffer.from('hd'),
    original: Buffer.from('original'),
  }),
};

// Mock the module
jest.mock('../../src/domain/services/image-processing.service', () => ({
  __esModule: true,
  default: mockImageProcessingService,
}));
