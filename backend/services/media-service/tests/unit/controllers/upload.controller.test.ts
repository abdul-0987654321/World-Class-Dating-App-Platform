/**
 * Upload Controller Unit Tests
 *
 * Tests for presigned URL endpoint and content type validation
 */

import { Response } from 'express';

// Mock the S3 storage service
const mockGetPresignedUploadUrl = jest.fn();
jest.mock('../../../src/infrastructure/storage/s3-storage.service', () => ({
  __esModule: true,
  default: {
    getPresignedUploadUrl: mockGetPresignedUploadUrl,
  },
  S3StorageService: jest.fn(),
}));

// Mock the upload service
jest.mock('../../../src/domain/services/upload.service', () => ({
  __esModule: true,
  default: {
    uploadPhoto: jest.fn(),
    getUserPhotos: jest.fn(),
    getPhoto: jest.fn(),
    deletePhoto: jest.fn(),
    setAsProfilePhoto: jest.fn(),
  },
}));

// Mock logger
jest.mock('@flamoral/backend-shared', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

import { UploadController } from '../../../src/api/controllers/upload.controller';
import { AuthRequest } from '../../../src/api/middleware/auth.middleware';

describe('UploadController', () => {
  let controller: UploadController;
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let jsonSpy: jest.Mock;
  let statusSpy: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    controller = new UploadController();

    jsonSpy = jest.fn().mockReturnThis();
    statusSpy = jest.fn().mockReturnValue({ json: jsonSpy });

    mockRequest = {
      body: {},
      params: {},
      headers: {},
      user: undefined,
    };

    mockResponse = {
      status: statusSpy,
      json: jsonSpy,
    };
  });

  describe('getPresignedUploadUrl', () => {
    describe('Authentication', () => {
      it('should return 401 if user is not authenticated', async () => {
        mockRequest.user = undefined;

        await controller.getPresignedUploadUrl(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        expect(statusSpy).toHaveBeenCalledWith(401);
        expect(jsonSpy).toHaveBeenCalledWith({
          success: false,
          error: 'Unauthorized',
        });
      });
    });

    describe('Request Validation', () => {
      it('should return 400 if fileName is missing', async () => {
        mockRequest.user = { userId: 'user-123' };
        mockRequest.body = { contentType: 'image/jpeg' };

        await controller.getPresignedUploadUrl(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        expect(statusSpy).toHaveBeenCalledWith(400);
        expect(jsonSpy).toHaveBeenCalledWith({
          success: false,
          error: 'fileName and contentType are required',
        });
      });

      it('should return 400 if contentType is missing', async () => {
        mockRequest.user = { userId: 'user-123' };
        mockRequest.body = { fileName: 'photo.jpg' };

        await controller.getPresignedUploadUrl(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        expect(statusSpy).toHaveBeenCalledWith(400);
        expect(jsonSpy).toHaveBeenCalledWith({
          success: false,
          error: 'fileName and contentType are required',
        });
      });

      it('should return 400 if both fileName and contentType are missing', async () => {
        mockRequest.user = { userId: 'user-123' };
        mockRequest.body = {};

        await controller.getPresignedUploadUrl(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        expect(statusSpy).toHaveBeenCalledWith(400);
        expect(jsonSpy).toHaveBeenCalledWith({
          success: false,
          error: 'fileName and contentType are required',
        });
      });
    });

    describe('Content Type Validation', () => {
      it('should accept image/jpeg content type', async () => {
        mockRequest.user = { userId: 'user-123' };
        mockRequest.body = { fileName: 'photo.jpg', contentType: 'image/jpeg' };

        const mockResult = {
          uploadUrl: 'https://s3.amazonaws.com/presigned-url',
          key: 'user-123/uploads/uuid.jpg',
          expiresAt: new Date(),
          publicUrl: 'https://cdn.example.com/user-123/uploads/uuid.jpg',
        };
        mockGetPresignedUploadUrl.mockResolvedValue(mockResult);

        await controller.getPresignedUploadUrl(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        expect(statusSpy).toHaveBeenCalledWith(200);
      });

      it('should accept image/png content type', async () => {
        mockRequest.user = { userId: 'user-123' };
        mockRequest.body = { fileName: 'photo.png', contentType: 'image/png' };

        const mockResult = {
          uploadUrl: 'https://s3.amazonaws.com/presigned-url',
          key: 'user-123/uploads/uuid.png',
          expiresAt: new Date(),
          publicUrl: 'https://cdn.example.com/user-123/uploads/uuid.png',
        };
        mockGetPresignedUploadUrl.mockResolvedValue(mockResult);

        await controller.getPresignedUploadUrl(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        expect(statusSpy).toHaveBeenCalledWith(200);
      });

      it('should accept image/webp content type', async () => {
        mockRequest.user = { userId: 'user-123' };
        mockRequest.body = { fileName: 'photo.webp', contentType: 'image/webp' };

        const mockResult = {
          uploadUrl: 'https://s3.amazonaws.com/presigned-url',
          key: 'user-123/uploads/uuid.webp',
          expiresAt: new Date(),
          publicUrl: 'https://cdn.example.com/user-123/uploads/uuid.webp',
        };
        mockGetPresignedUploadUrl.mockResolvedValue(mockResult);

        await controller.getPresignedUploadUrl(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        expect(statusSpy).toHaveBeenCalledWith(200);
      });

      it('should accept image/gif content type', async () => {
        mockRequest.user = { userId: 'user-123' };
        mockRequest.body = { fileName: 'animation.gif', contentType: 'image/gif' };

        const mockResult = {
          uploadUrl: 'https://s3.amazonaws.com/presigned-url',
          key: 'user-123/uploads/uuid.gif',
          expiresAt: new Date(),
          publicUrl: 'https://cdn.example.com/user-123/uploads/uuid.gif',
        };
        mockGetPresignedUploadUrl.mockResolvedValue(mockResult);

        await controller.getPresignedUploadUrl(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        expect(statusSpy).toHaveBeenCalledWith(200);
      });

      it('should accept video/mp4 content type', async () => {
        mockRequest.user = { userId: 'user-123' };
        mockRequest.body = { fileName: 'video.mp4', contentType: 'video/mp4' };

        const mockResult = {
          uploadUrl: 'https://s3.amazonaws.com/presigned-url',
          key: 'user-123/uploads/uuid.mp4',
          expiresAt: new Date(),
          publicUrl: 'https://cdn.example.com/user-123/uploads/uuid.mp4',
        };
        mockGetPresignedUploadUrl.mockResolvedValue(mockResult);

        await controller.getPresignedUploadUrl(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        expect(statusSpy).toHaveBeenCalledWith(200);
      });

      it('should accept video/quicktime content type', async () => {
        mockRequest.user = { userId: 'user-123' };
        mockRequest.body = { fileName: 'video.mov', contentType: 'video/quicktime' };

        const mockResult = {
          uploadUrl: 'https://s3.amazonaws.com/presigned-url',
          key: 'user-123/uploads/uuid.mov',
          expiresAt: new Date(),
          publicUrl: 'https://cdn.example.com/user-123/uploads/uuid.mov',
        };
        mockGetPresignedUploadUrl.mockResolvedValue(mockResult);

        await controller.getPresignedUploadUrl(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        expect(statusSpy).toHaveBeenCalledWith(200);
      });

      it('should accept audio/mpeg content type', async () => {
        mockRequest.user = { userId: 'user-123' };
        mockRequest.body = { fileName: 'voice.mp3', contentType: 'audio/mpeg' };

        const mockResult = {
          uploadUrl: 'https://s3.amazonaws.com/presigned-url',
          key: 'user-123/uploads/uuid.mp3',
          expiresAt: new Date(),
          publicUrl: 'https://cdn.example.com/user-123/uploads/uuid.mp3',
        };
        mockGetPresignedUploadUrl.mockResolvedValue(mockResult);

        await controller.getPresignedUploadUrl(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        expect(statusSpy).toHaveBeenCalledWith(200);
      });

      it('should accept audio/wav content type', async () => {
        mockRequest.user = { userId: 'user-123' };
        mockRequest.body = { fileName: 'voice.wav', contentType: 'audio/wav' };

        const mockResult = {
          uploadUrl: 'https://s3.amazonaws.com/presigned-url',
          key: 'user-123/uploads/uuid.wav',
          expiresAt: new Date(),
          publicUrl: 'https://cdn.example.com/user-123/uploads/uuid.wav',
        };
        mockGetPresignedUploadUrl.mockResolvedValue(mockResult);

        await controller.getPresignedUploadUrl(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        expect(statusSpy).toHaveBeenCalledWith(200);
      });

      it('should reject unsupported content type with 400 error', async () => {
        mockRequest.user = { userId: 'user-123' };
        mockRequest.body = { fileName: 'document.pdf', contentType: 'application/pdf' };

        mockGetPresignedUploadUrl.mockRejectedValue(
          new Error('Unsupported content type: application/pdf')
        );

        await controller.getPresignedUploadUrl(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        expect(statusSpy).toHaveBeenCalledWith(400);
        expect(jsonSpy).toHaveBeenCalledWith({
          success: false,
          error: 'Unsupported content type: application/pdf',
        });
      });

      it('should reject text/plain content type', async () => {
        mockRequest.user = { userId: 'user-123' };
        mockRequest.body = { fileName: 'file.txt', contentType: 'text/plain' };

        mockGetPresignedUploadUrl.mockRejectedValue(
          new Error('Unsupported content type: text/plain')
        );

        await controller.getPresignedUploadUrl(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        expect(statusSpy).toHaveBeenCalledWith(400);
      });

      it('should reject application/octet-stream content type', async () => {
        mockRequest.user = { userId: 'user-123' };
        mockRequest.body = { fileName: 'file.bin', contentType: 'application/octet-stream' };

        mockGetPresignedUploadUrl.mockRejectedValue(
          new Error('Unsupported content type: application/octet-stream')
        );

        await controller.getPresignedUploadUrl(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        expect(statusSpy).toHaveBeenCalledWith(400);
      });

      it('should reject application/x-executable content type', async () => {
        mockRequest.user = { userId: 'user-123' };
        mockRequest.body = { fileName: 'malware.exe', contentType: 'application/x-executable' };

        mockGetPresignedUploadUrl.mockRejectedValue(
          new Error('Unsupported content type: application/x-executable')
        );

        await controller.getPresignedUploadUrl(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        expect(statusSpy).toHaveBeenCalledWith(400);
      });
    });

    describe('Successful Response', () => {
      it('should return presigned URL data on success', async () => {
        mockRequest.user = { userId: 'user-123' };
        mockRequest.body = { fileName: 'photo.jpg', contentType: 'image/jpeg' };

        const mockResult = {
          uploadUrl: 'https://s3.amazonaws.com/bucket/presigned-url?sig=abc',
          key: 'user-123/uploads/uuid-123.jpg',
          expiresAt: new Date('2025-01-05T12:00:00Z'),
          publicUrl: 'https://cdn.example.com/user-123/uploads/uuid-123.jpg',
        };
        mockGetPresignedUploadUrl.mockResolvedValue(mockResult);

        await controller.getPresignedUploadUrl(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        expect(statusSpy).toHaveBeenCalledWith(200);
        expect(jsonSpy).toHaveBeenCalledWith({
          success: true,
          data: {
            uploadUrl: mockResult.uploadUrl,
            key: mockResult.key,
            expiresAt: mockResult.expiresAt,
            publicUrl: mockResult.publicUrl,
          },
        });
      });

      it('should use default folder if not provided', async () => {
        mockRequest.user = { userId: 'user-123' };
        mockRequest.body = { fileName: 'photo.jpg', contentType: 'image/jpeg' };

        const mockResult = {
          uploadUrl: 'https://s3.amazonaws.com/presigned-url',
          key: 'user-123/uploads/uuid.jpg',
          expiresAt: new Date(),
          publicUrl: 'https://cdn.example.com/user-123/uploads/uuid.jpg',
        };
        mockGetPresignedUploadUrl.mockResolvedValue(mockResult);

        await controller.getPresignedUploadUrl(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        expect(mockGetPresignedUploadUrl).toHaveBeenCalledWith(
          'user-123',
          'photo.jpg',
          'image/jpeg',
          'uploads'
        );
      });

      it('should use custom folder if provided', async () => {
        mockRequest.user = { userId: 'user-123' };
        mockRequest.body = {
          fileName: 'photo.jpg',
          contentType: 'image/jpeg',
          folder: 'profile',
        };

        const mockResult = {
          uploadUrl: 'https://s3.amazonaws.com/presigned-url',
          key: 'user-123/profile/uuid.jpg',
          expiresAt: new Date(),
          publicUrl: 'https://cdn.example.com/user-123/profile/uuid.jpg',
        };
        mockGetPresignedUploadUrl.mockResolvedValue(mockResult);

        await controller.getPresignedUploadUrl(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        expect(mockGetPresignedUploadUrl).toHaveBeenCalledWith(
          'user-123',
          'photo.jpg',
          'image/jpeg',
          'profile'
        );
      });
    });

    describe('Error Handling', () => {
      it('should return 500 for generic service errors', async () => {
        mockRequest.user = { userId: 'user-123' };
        mockRequest.body = { fileName: 'photo.jpg', contentType: 'image/jpeg' };

        mockGetPresignedUploadUrl.mockRejectedValue(new Error('S3 service unavailable'));

        await controller.getPresignedUploadUrl(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        expect(statusSpy).toHaveBeenCalledWith(500);
        expect(jsonSpy).toHaveBeenCalledWith({
          success: false,
          error: 'S3 service unavailable',
        });
      });

      it('should handle error without message', async () => {
        mockRequest.user = { userId: 'user-123' };
        mockRequest.body = { fileName: 'photo.jpg', contentType: 'image/jpeg' };

        mockGetPresignedUploadUrl.mockRejectedValue(new Error());

        await controller.getPresignedUploadUrl(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        expect(statusSpy).toHaveBeenCalledWith(500);
        expect(jsonSpy).toHaveBeenCalledWith({
          success: false,
          error: 'Failed to generate presigned URL',
        });
      });
    });

    describe('API Response Contract', () => {
      it('should follow success/data pattern for successful response', async () => {
        mockRequest.user = { userId: 'user-123' };
        mockRequest.body = { fileName: 'photo.jpg', contentType: 'image/jpeg' };

        const mockResult = {
          uploadUrl: 'https://s3.amazonaws.com/presigned-url',
          key: 'user-123/uploads/uuid.jpg',
          expiresAt: new Date(),
          publicUrl: 'https://cdn.example.com/user-123/uploads/uuid.jpg',
        };
        mockGetPresignedUploadUrl.mockResolvedValue(mockResult);

        await controller.getPresignedUploadUrl(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        const response = jsonSpy.mock.calls[0][0];
        expect(response).toHaveProperty('success', true);
        expect(response).toHaveProperty('data');
        expect(response.data).toHaveProperty('uploadUrl');
        expect(response.data).toHaveProperty('key');
        expect(response.data).toHaveProperty('expiresAt');
        expect(response.data).toHaveProperty('publicUrl');
      });

      it('should follow success/error pattern for error response', async () => {
        mockRequest.user = { userId: 'user-123' };
        mockRequest.body = {};

        await controller.getPresignedUploadUrl(
          mockRequest as AuthRequest,
          mockResponse as Response
        );

        const response = jsonSpy.mock.calls[0][0];
        expect(response).toHaveProperty('success', false);
        expect(response).toHaveProperty('error');
      });
    });
  });

  describe('uploadPhoto', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;

      await controller.uploadPhoto(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized',
      });
    });

    it('should return 400 if no file is uploaded', async () => {
      mockRequest.user = { userId: 'user-123' };
      mockRequest.file = undefined;

      await controller.uploadPhoto(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'No file uploaded',
      });
    });
  });

  describe('getUserPhotos', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;

      await controller.getUserPhotos(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized',
      });
    });
  });

  describe('deletePhoto', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: 'photo-123' };

      await controller.deletePhoto(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized',
      });
    });
  });

  describe('setAsProfilePhoto', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: 'photo-123' };

      await controller.setAsProfilePhoto(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized',
      });
    });
  });
});
