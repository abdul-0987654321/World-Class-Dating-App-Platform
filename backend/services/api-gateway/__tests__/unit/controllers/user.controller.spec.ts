import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';

import { UserController } from '../../../src/controllers/user.controller';
import { ProxyService } from '../../../src/services/proxy.service';

describe('UserController', () => {
  let controller: UserController;
  let proxyService: jest.Mocked<ProxyService>;

  const mockProxyService = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  };

  const authorization = 'Bearer valid-jwt-token';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: ProxyService,
          useValue: mockProxyService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    proxyService = module.get(ProxyService) as jest.Mocked<ProxyService>;
  });

  describe('User Profile Endpoints', () => {
    describe('getCurrentUser', () => {
      it('should call userService to get current user profile', async () => {
        const expectedUser = {
          id: 'user-123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          bio: 'Hello world',
        };
        proxyService.get.mockResolvedValue(expectedUser);

        const result = await controller.getCurrentUser(authorization);

        expect(proxyService.get).toHaveBeenCalledWith('userService', '/api/users/me', {
          Authorization: authorization,
        });
        expect(result).toEqual(expectedUser);
      });

      it('should propagate unauthorized errors', async () => {
        const error = new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        proxyService.get.mockRejectedValue(error);

        await expect(controller.getCurrentUser(authorization)).rejects.toThrow(HttpException);
      });
    });

    describe('updateCurrentUser', () => {
      it('should call userService to update current user profile', async () => {
        const updateDto = {
          firstName: 'Jane',
          bio: 'Updated bio',
        };
        const expectedUser = {
          id: 'user-123',
          firstName: 'Jane',
          bio: 'Updated bio',
        };
        proxyService.put.mockResolvedValue(expectedUser);

        const result = await controller.updateCurrentUser(authorization, updateDto);

        expect(proxyService.put).toHaveBeenCalledWith(
          'userService',
          '/api/users/me',
          updateDto,
          { Authorization: authorization }
        );
        expect(result).toEqual(expectedUser);
      });

      it('should handle validation errors', async () => {
        const error = new HttpException('Validation failed', HttpStatus.BAD_REQUEST);
        proxyService.put.mockRejectedValue(error);

        await expect(controller.updateCurrentUser(authorization, {})).rejects.toThrow(
          HttpException
        );
      });
    });

    describe('getUserById', () => {
      it('should call userService to get user by ID', async () => {
        const userId = 'user-456';
        const expectedUser = {
          id: userId,
          firstName: 'John',
          photos: [],
        };
        proxyService.get.mockResolvedValue(expectedUser);

        const result = await controller.getUserById(authorization, userId);

        expect(proxyService.get).toHaveBeenCalledWith(
          'userService',
          `/api/users/${userId}`,
          { Authorization: authorization }
        );
        expect(result).toEqual(expectedUser);
      });

      it('should handle user not found', async () => {
        const error = new HttpException('User not found', HttpStatus.NOT_FOUND);
        proxyService.get.mockRejectedValue(error);

        await expect(controller.getUserById(authorization, 'nonexistent')).rejects.toThrow(
          HttpException
        );
      });
    });

    describe('updateUser', () => {
      it('should call userService to update user by ID (admin)', async () => {
        const userId = 'user-456';
        const updateDto = { verified: true };
        proxyService.put.mockResolvedValue({ id: userId, verified: true });

        await controller.updateUser(authorization, userId, updateDto);

        expect(proxyService.put).toHaveBeenCalledWith(
          'userService',
          `/api/users/${userId}`,
          updateDto,
          { Authorization: authorization }
        );
      });

      it('should handle forbidden access', async () => {
        const error = new HttpException('Forbidden', HttpStatus.FORBIDDEN);
        proxyService.put.mockRejectedValue(error);

        await expect(
          controller.updateUser(authorization, 'user-456', {})
        ).rejects.toThrow(HttpException);
      });
    });

    describe('deleteUser', () => {
      it('should call userService to delete user', async () => {
        const userId = 'user-456';
        proxyService.delete.mockResolvedValue({ success: true });

        await controller.deleteUser(authorization, userId);

        expect(proxyService.delete).toHaveBeenCalledWith(
          'userService',
          `/api/users/${userId}`,
          { Authorization: authorization }
        );
      });
    });
  });

  describe('Profile Photo Endpoints', () => {
    describe('uploadPhoto', () => {
      it('should call userService to upload photo', async () => {
        const photoData = { url: 'https://example.com/photo.jpg' };
        const expectedResponse = { id: 'photo-123', url: photoData.url };
        proxyService.post.mockResolvedValue(expectedResponse);

        const result = await controller.uploadPhoto(authorization, photoData);

        expect(proxyService.post).toHaveBeenCalledWith(
          'userService',
          '/api/users/me/photos',
          photoData,
          { Authorization: authorization }
        );
        expect(result).toEqual(expectedResponse);
      });
    });

    describe('getUserPhotos', () => {
      it('should call userService to get user photos', async () => {
        const expectedPhotos = [
          { id: 'photo-1', url: 'https://example.com/1.jpg', isPrimary: true },
          { id: 'photo-2', url: 'https://example.com/2.jpg', isPrimary: false },
        ];
        proxyService.get.mockResolvedValue(expectedPhotos);

        const result = await controller.getUserPhotos(authorization);

        expect(proxyService.get).toHaveBeenCalledWith('userService', '/api/users/me/photos', {
          Authorization: authorization,
        });
        expect(result).toEqual(expectedPhotos);
      });
    });

    describe('deletePhoto', () => {
      it('should call userService to delete photo', async () => {
        const photoId = 'photo-123';
        proxyService.delete.mockResolvedValue({ success: true });

        await controller.deletePhoto(authorization, photoId);

        expect(proxyService.delete).toHaveBeenCalledWith(
          'userService',
          `/api/users/me/photos/${photoId}`,
          { Authorization: authorization }
        );
      });

      it('should handle photo not found', async () => {
        const error = new HttpException('Photo not found', HttpStatus.NOT_FOUND);
        proxyService.delete.mockRejectedValue(error);

        await expect(controller.deletePhoto(authorization, 'nonexistent')).rejects.toThrow(
          HttpException
        );
      });
    });

    describe('setPrimaryPhoto', () => {
      it('should call userService to set primary photo', async () => {
        const photoId = 'photo-123';
        proxyService.put.mockResolvedValue({ id: photoId, isPrimary: true });

        await controller.setPrimaryPhoto(authorization, photoId);

        expect(proxyService.put).toHaveBeenCalledWith(
          'userService',
          `/api/users/me/photos/${photoId}/primary`,
          {},
          { Authorization: authorization }
        );
      });
    });
  });

  describe('User Preferences Endpoints', () => {
    describe('getPreferences', () => {
      it('should call userService to get user preferences', async () => {
        const expectedPreferences = {
          ageRange: { min: 18, max: 35 },
          distance: 50,
          gender: ['female'],
        };
        proxyService.get.mockResolvedValue(expectedPreferences);

        const result = await controller.getPreferences(authorization);

        expect(proxyService.get).toHaveBeenCalledWith(
          'userService',
          '/api/users/me/preferences',
          { Authorization: authorization }
        );
        expect(result).toEqual(expectedPreferences);
      });
    });

    describe('updatePreferences', () => {
      it('should call userService to update user preferences', async () => {
        const updateDto = {
          ageRange: { min: 21, max: 40 },
          distance: 100,
        };
        proxyService.put.mockResolvedValue(updateDto);

        const result = await controller.updatePreferences(authorization, updateDto);

        expect(proxyService.put).toHaveBeenCalledWith(
          'userService',
          '/api/users/me/preferences',
          updateDto,
          { Authorization: authorization }
        );
        expect(result).toEqual(updateDto);
      });
    });
  });

  describe('User Settings Endpoints', () => {
    describe('getSettings', () => {
      it('should call userService to get user settings', async () => {
        const expectedSettings = {
          notifications: { push: true, email: false },
          privacy: { showOnline: true, showDistance: false },
        };
        proxyService.get.mockResolvedValue(expectedSettings);

        const result = await controller.getSettings(authorization);

        expect(proxyService.get).toHaveBeenCalledWith(
          'userService',
          '/api/users/me/settings',
          { Authorization: authorization }
        );
        expect(result).toEqual(expectedSettings);
      });
    });

    describe('updateSettings', () => {
      it('should call userService to update user settings', async () => {
        const updateDto = {
          notifications: { push: false },
        };
        proxyService.put.mockResolvedValue(updateDto);

        const result = await controller.updateSettings(authorization, updateDto);

        expect(proxyService.put).toHaveBeenCalledWith(
          'userService',
          '/api/users/me/settings',
          updateDto,
          { Authorization: authorization }
        );
        expect(result).toEqual(updateDto);
      });
    });
  });

  describe('Location Endpoints', () => {
    describe('updateLocation', () => {
      it('should call userService to update user location', async () => {
        const locationDto = {
          latitude: 40.7128,
          longitude: -74.006,
        };
        proxyService.put.mockResolvedValue({ success: true });

        await controller.updateLocation(authorization, locationDto);

        expect(proxyService.put).toHaveBeenCalledWith(
          'userService',
          '/api/users/me/location',
          locationDto,
          { Authorization: authorization }
        );
      });
    });
  });

  describe('Block/Report Endpoints', () => {
    describe('blockUser', () => {
      it('should call userService to block a user', async () => {
        const blockDto = { userId: 'user-to-block' };
        proxyService.post.mockResolvedValue({ success: true });

        await controller.blockUser(authorization, blockDto);

        expect(proxyService.post).toHaveBeenCalledWith(
          'userService',
          '/api/users/me/blocks',
          blockDto,
          { Authorization: authorization }
        );
      });
    });

    describe('getBlockedUsers', () => {
      it('should call userService to get blocked users', async () => {
        const expectedBlocks = [
          { id: 'user-1', blockedAt: '2024-01-01T00:00:00Z' },
          { id: 'user-2', blockedAt: '2024-01-02T00:00:00Z' },
        ];
        proxyService.get.mockResolvedValue(expectedBlocks);

        const result = await controller.getBlockedUsers(authorization);

        expect(proxyService.get).toHaveBeenCalledWith('userService', '/api/users/me/blocks', {
          Authorization: authorization,
        });
        expect(result).toEqual(expectedBlocks);
      });
    });

    describe('unblockUser', () => {
      it('should call userService to unblock a user', async () => {
        const blockedUserId = 'user-to-unblock';
        proxyService.delete.mockResolvedValue({ success: true });

        await controller.unblockUser(authorization, blockedUserId);

        expect(proxyService.delete).toHaveBeenCalledWith(
          'userService',
          `/api/users/me/blocks/${blockedUserId}`,
          { Authorization: authorization }
        );
      });
    });

    describe('reportUser', () => {
      it('should call userService to report a user', async () => {
        const reportDto = {
          userId: 'user-to-report',
          reason: 'inappropriate',
          description: 'User sent inappropriate messages',
        };
        proxyService.post.mockResolvedValue({ success: true });

        await controller.reportUser(authorization, reportDto);

        expect(proxyService.post).toHaveBeenCalledWith(
          'userService',
          '/api/users/me/reports',
          reportDto,
          { Authorization: authorization }
        );
      });
    });
  });

  describe('Verification Endpoints', () => {
    describe('requestVerification', () => {
      it('should call userService to request profile verification', async () => {
        const verificationDto = {
          type: 'photo',
          photoUrl: 'https://example.com/selfie.jpg',
        };
        proxyService.post.mockResolvedValue({ status: 'pending' });

        await controller.requestVerification(authorization, verificationDto);

        expect(proxyService.post).toHaveBeenCalledWith(
          'userService',
          '/api/users/me/verification',
          verificationDto,
          { Authorization: authorization }
        );
      });
    });

    describe('getVerificationStatus', () => {
      it('should call userService to get verification status', async () => {
        const expectedStatus = {
          verified: false,
          status: 'pending',
          submittedAt: '2024-01-01T00:00:00Z',
        };
        proxyService.get.mockResolvedValue(expectedStatus);

        const result = await controller.getVerificationStatus(authorization);

        expect(proxyService.get).toHaveBeenCalledWith(
          'userService',
          '/api/users/me/verification',
          { Authorization: authorization }
        );
        expect(result).toEqual(expectedStatus);
      });
    });
  });

  describe('Error Handling', () => {
    it('should propagate HTTP errors with correct status', async () => {
      const testCases = [
        { status: HttpStatus.BAD_REQUEST, message: 'Bad Request' },
        { status: HttpStatus.UNAUTHORIZED, message: 'Unauthorized' },
        { status: HttpStatus.FORBIDDEN, message: 'Forbidden' },
        { status: HttpStatus.NOT_FOUND, message: 'Not Found' },
        { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal Server Error' },
      ];

      for (const { status, message } of testCases) {
        const error = new HttpException(message, status);
        proxyService.get.mockRejectedValue(error);

        try {
          await controller.getCurrentUser(authorization);
          fail(`Expected HttpException with status ${status}`);
        } catch (e) {
          expect(e).toBeInstanceOf(HttpException);
          expect((e as HttpException).getStatus()).toBe(status);
        }
      }
    });

    it('should handle network errors', async () => {
      proxyService.get.mockRejectedValue(new Error('Network error'));

      await expect(controller.getCurrentUser(authorization)).rejects.toThrow();
    });

    it('should handle service unavailable', async () => {
      const error = new HttpException('Service Unavailable', HttpStatus.SERVICE_UNAVAILABLE);
      proxyService.get.mockRejectedValue(error);

      await expect(controller.getCurrentUser(authorization)).rejects.toThrow(HttpException);
    });
  });

  describe('Authorization Header Forwarding', () => {
    it('should forward authorization header to all requests', async () => {
      const differentTokens = [
        'Bearer token-1',
        'Bearer token-2',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
      ];

      for (const token of differentTokens) {
        proxyService.get.mockResolvedValue({});

        await controller.getCurrentUser(token);

        expect(proxyService.get).toHaveBeenCalledWith(
          'userService',
          '/api/users/me',
          { Authorization: token }
        );
      }
    });
  });

  describe('Path Parameter Handling', () => {
    it('should correctly interpolate userId in path', async () => {
      const testUserIds = ['user-123', 'abc-def-ghi', '12345', 'user_with_underscore'];

      for (const userId of testUserIds) {
        proxyService.get.mockResolvedValue({ id: userId });

        await controller.getUserById(authorization, userId);

        expect(proxyService.get).toHaveBeenCalledWith(
          'userService',
          `/api/users/${userId}`,
          { Authorization: authorization }
        );
      }
    });

    it('should correctly interpolate photoId in path', async () => {
      const testPhotoIds = ['photo-123', 'abc-def', '12345'];

      for (const photoId of testPhotoIds) {
        proxyService.delete.mockResolvedValue({ success: true });

        await controller.deletePhoto(authorization, photoId);

        expect(proxyService.delete).toHaveBeenCalledWith(
          'userService',
          `/api/users/me/photos/${photoId}`,
          { Authorization: authorization }
        );
      }
    });

    it('should correctly interpolate blockedUserId in path', async () => {
      const blockedUserId = 'blocked-user-123';
      proxyService.delete.mockResolvedValue({ success: true });

      await controller.unblockUser(authorization, blockedUserId);

      expect(proxyService.delete).toHaveBeenCalledWith(
        'userService',
        `/api/users/me/blocks/${blockedUserId}`,
        { Authorization: authorization }
      );
    });
  });
});
