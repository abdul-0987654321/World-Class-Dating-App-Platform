/**
 * Unit tests for DeviceController
 */

import { Request, Response } from 'express';
import { DeviceController } from '../../../src/api/controllers/device.controller';

// Mock dependencies
jest.mock('../../../src/services/device-management.service', () => ({
  deviceManagementService: {
    registerDevice: jest.fn(),
    unregisterDevice: jest.fn(),
    updateDevice: jest.fn(),
    getUserDevices: jest.fn(),
    getDeviceById: jest.fn(),
    deleteUserDevices: jest.fn(),
    deactivateByPlatform: jest.fn(),
    getDeviceStats: jest.fn(),
    updateLastActive: jest.fn(),
  },
}));

jest.mock('../../../src/utils/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

import { deviceManagementService } from '../../../src/services/device-management.service';

describe('DeviceController', () => {
  let controller: DeviceController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;

  beforeEach(() => {
    controller = new DeviceController();

    responseJson = jest.fn();
    responseStatus = jest.fn(() => ({ json: responseJson }));

    mockRequest = {
      body: {},
      params: {},
      query: {},
      user: { id: 'user-123' },
    };

    mockResponse = {
      status: responseStatus,
      json: responseJson,
    };

    jest.clearAllMocks();
  });

  describe('registerDevice', () => {
    it('should register new device successfully', async () => {
      mockRequest.body = {
        deviceToken: 'token-abc123',
        platform: 'android',
        deviceId: 'device-123',
        deviceModel: 'Pixel 7',
        osVersion: '14.0',
        appVersion: '1.0.0',
      };

      (deviceManagementService.registerDevice as jest.Mock).mockResolvedValue({
        success: true,
        deviceId: 'new-device-id',
        isNew: true,
      });

      await controller.registerDevice(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          deviceId: 'new-device-id',
          isNew: true,
          message: 'Device registered successfully',
        })
      );
    });

    it('should update existing device', async () => {
      mockRequest.body = {
        deviceToken: 'existing-token',
        platform: 'ios',
      };

      (deviceManagementService.registerDevice as jest.Mock).mockResolvedValue({
        success: true,
        deviceId: 'existing-device-id',
        isNew: false,
      });

      await controller.registerDevice(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          isNew: false,
          message: 'Device updated successfully',
        })
      );
    });

    it('should return 400 when deviceToken is missing', async () => {
      mockRequest.body = {
        platform: 'android',
      };

      await controller.registerDevice(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Device token and platform are required',
        })
      );
    });

    it('should return 400 when platform is missing', async () => {
      mockRequest.body = {
        deviceToken: 'token-abc',
      };

      await controller.registerDevice(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid platform', async () => {
      mockRequest.body = {
        deviceToken: 'token-abc',
        platform: 'windows',
      };

      await controller.registerDevice(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Platform must be ios, android, or web',
        })
      );
    });

    it('should return 500 when service fails', async () => {
      mockRequest.body = {
        deviceToken: 'token-abc',
        platform: 'android',
      };

      (deviceManagementService.registerDevice as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Registration failed',
      });

      await controller.registerDevice(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(500);
    });

    it('should handle exceptions gracefully', async () => {
      mockRequest.body = {
        deviceToken: 'token-abc',
        platform: 'android',
      };

      (deviceManagementService.registerDevice as jest.Mock).mockRejectedValue(
        new Error('Unexpected error')
      );

      await controller.registerDevice(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal server error',
        })
      );
    });
  });

  describe('unregisterDevice', () => {
    it('should unregister device successfully', async () => {
      mockRequest.body = {
        deviceToken: 'token-abc',
      };

      (deviceManagementService.unregisterDevice as jest.Mock).mockResolvedValue({
        success: true,
      });

      await controller.unregisterDevice(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Device unregistered successfully',
        })
      );
    });

    it('should return 400 when deviceToken is missing', async () => {
      mockRequest.body = {};

      await controller.unregisterDevice(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Device token is required',
        })
      );
    });

    it('should return 404 when device not found', async () => {
      mockRequest.body = {
        deviceToken: 'nonexistent-token',
      };

      (deviceManagementService.unregisterDevice as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Device not found',
      });

      await controller.unregisterDevice(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(404);
    });
  });

  describe('updateDevice', () => {
    it('should update device successfully', async () => {
      mockRequest.body = {
        deviceToken: 'token-abc',
        osVersion: '15.0',
        appVersion: '2.0.0',
        deviceModel: 'Pixel 8',
      };

      (deviceManagementService.updateDevice as jest.Mock).mockResolvedValue({
        success: true,
      });

      await controller.updateDevice(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Device updated successfully',
        })
      );
    });

    it('should return 400 when deviceToken is missing', async () => {
      mockRequest.body = {
        osVersion: '15.0',
      };

      await controller.updateDevice(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
    });

    it('should return 404 when device not found', async () => {
      mockRequest.body = {
        deviceToken: 'nonexistent-token',
        osVersion: '15.0',
      };

      (deviceManagementService.updateDevice as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Device not found',
      });

      await controller.updateDevice(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(404);
    });
  });

  describe('getUserDevices', () => {
    it('should return all user devices', async () => {
      const mockDevices = [
        { id: 'device-1', platform: 'android', isActive: true },
        { id: 'device-2', platform: 'ios', isActive: true },
      ];

      mockRequest.query = { activeOnly: 'false' };

      (deviceManagementService.getUserDevices as jest.Mock).mockResolvedValue({
        success: true,
        devices: mockDevices,
      });

      await controller.getUserDevices(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          devices: mockDevices,
          count: 2,
        })
      );
    });

    it('should filter active devices only', async () => {
      mockRequest.query = { activeOnly: 'true' };

      (deviceManagementService.getUserDevices as jest.Mock).mockResolvedValue({
        success: true,
        devices: [],
      });

      await controller.getUserDevices(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(deviceManagementService.getUserDevices).toHaveBeenCalledWith(
        'user-123',
        true
      );
    });

    it('should return 500 when service fails', async () => {
      (deviceManagementService.getUserDevices as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Database error',
      });

      await controller.getUserDevices(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('getDeviceById', () => {
    it('should return device by ID', async () => {
      mockRequest.params = { deviceId: 'device-123' };

      const mockDevice = {
        id: 'device-123',
        userId: 'user-123',
        platform: 'android',
      };

      (deviceManagementService.getDeviceById as jest.Mock).mockResolvedValue({
        success: true,
        device: mockDevice,
      });

      await controller.getDeviceById(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          device: mockDevice,
        })
      );
    });

    it('should return 403 when device belongs to different user', async () => {
      mockRequest.params = { deviceId: 'device-123' };

      const mockDevice = {
        id: 'device-123',
        userId: 'different-user',
        platform: 'android',
      };

      (deviceManagementService.getDeviceById as jest.Mock).mockResolvedValue({
        success: true,
        device: mockDevice,
      });

      await controller.getDeviceById(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(403);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Access denied',
        })
      );
    });

    it('should return 404 when device not found', async () => {
      mockRequest.params = { deviceId: 'nonexistent' };

      (deviceManagementService.getDeviceById as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Device not found',
      });

      await controller.getDeviceById(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteAllDevices', () => {
    it('should delete all user devices', async () => {
      (deviceManagementService.deleteUserDevices as jest.Mock).mockResolvedValue({
        success: true,
        deleted: 3,
      });

      await controller.deleteAllDevices(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          deleted: 3,
          message: 'All devices deleted successfully',
        })
      );
    });

    it('should return 500 when service fails', async () => {
      (deviceManagementService.deleteUserDevices as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Delete failed',
      });

      await controller.deleteAllDevices(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('deactivateByPlatform', () => {
    it('should deactivate all iOS devices', async () => {
      mockRequest.params = { platform: 'ios' };

      (deviceManagementService.deactivateByPlatform as jest.Mock).mockResolvedValue({
        success: true,
        deactivated: 2,
      });

      await controller.deactivateByPlatform(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          deactivated: 2,
          message: 'All ios devices deactivated',
        })
      );
    });

    it('should return 400 for invalid platform', async () => {
      mockRequest.params = { platform: 'windows' };

      await controller.deactivateByPlatform(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid platform',
        })
      );
    });

    it('should return 500 when service fails', async () => {
      mockRequest.params = { platform: 'android' };

      (deviceManagementService.deactivateByPlatform as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Deactivation failed',
      });

      await controller.deactivateByPlatform(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('getDeviceStats', () => {
    it('should return device statistics', async () => {
      const mockStats = {
        total: 5,
        active: 3,
        inactive: 2,
        byPlatform: {
          ios: 2,
          android: 2,
          web: 1,
        },
      };

      (deviceManagementService.getDeviceStats as jest.Mock).mockResolvedValue({
        success: true,
        stats: mockStats,
      });

      await controller.getDeviceStats(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          stats: mockStats,
        })
      );
    });

    it('should return 500 when service fails', async () => {
      (deviceManagementService.getDeviceStats as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Stats fetch failed',
      });

      await controller.getDeviceStats(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('pingDevice', () => {
    it('should update device last active timestamp', async () => {
      mockRequest.body = {
        deviceToken: 'token-abc',
      };

      (deviceManagementService.updateLastActive as jest.Mock).mockResolvedValue({
        success: true,
      });

      await controller.pingDevice(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Device pinged successfully',
        })
      );
    });

    it('should return 400 when deviceToken is missing', async () => {
      mockRequest.body = {};

      await controller.pingDevice(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Device token is required',
        })
      );
    });

    it('should return 500 when service fails', async () => {
      mockRequest.body = {
        deviceToken: 'token-abc',
      };

      (deviceManagementService.updateLastActive as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Update failed',
      });

      await controller.pingDevice(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(500);
    });
  });
});
