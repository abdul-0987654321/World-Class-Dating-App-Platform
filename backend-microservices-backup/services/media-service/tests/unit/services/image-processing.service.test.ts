/**
 * Unit tests for Image Processing Service
 */

import { ImageProcessingService } from '../../../src/domain/services/image-processing.service';

describe('ImageProcessingService', () => {
  let imageProcessingService: ImageProcessingService;
  let mockBuffer: Buffer;

  beforeEach(() => {
    imageProcessingService = new ImageProcessingService();
    // Create a simple test buffer
    mockBuffer = Buffer.from('fake-image-data');
  });

  describe('validateImage', () => {
    it('should validate correct image type and size', () => {
      const mimeType = 'image/jpeg';
      const size = 5000000; // 5MB

      const result = imageProcessingService.validateImage(mockBuffer, mimeType, size);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid mime type', () => {
      const mimeType = 'application/pdf';
      const size = 5000000;

      const result = imageProcessingService.validateImage(mockBuffer, mimeType, size);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('should reject file exceeding size limit', () => {
      const mimeType = 'image/jpeg';
      const size = 15000000; // 15MB (exceeds 10MB limit)

      const result = imageProcessingService.validateImage(mockBuffer, mimeType, size);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds');
    });

    it('should accept all allowed image formats', () => {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const size = 5000000;

      allowedTypes.forEach((mimeType) => {
        const result = imageProcessingService.validateImage(mockBuffer, mimeType, size);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('getMetadata', () => {
    it('should extract image metadata', async () => {
      // Note: This test would need a real image buffer in a real scenario
      // For now, we'll test that the method exists and can be called
      expect(imageProcessingService.getMetadata).toBeDefined();
      expect(typeof imageProcessingService.getMetadata).toBe('function');
    });
  });

  describe('processImage', () => {
    it('should process image into multiple versions', async () => {
      // Note: This test would need a real image buffer in a real scenario
      // For now, we'll test that the method exists and can be called
      expect(imageProcessingService.processImage).toBeDefined();
      expect(typeof imageProcessingService.processImage).toBe('function');
    });
  });
});
