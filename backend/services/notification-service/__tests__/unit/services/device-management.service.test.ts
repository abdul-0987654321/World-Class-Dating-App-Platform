/**
 * Unit tests for DeviceManagementService
 */

import { DeviceManagementService, RegisterDeviceRequest } from '../../../src/services/device-management.service';

// Mock dependencies
jest.mock('../../../src/config/database', () => ({
  db: jest.fn(),
}));

jest.mock('../../../src/utils/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'device-uuid-12345'),
}));

import { db } from '../../../src/config/database';

describe('DeviceManagementService', () => {
  let service: DeviceManagementService;
  let mockDb: jest.MockedFunction<typeof db>;

  beforeEach(() => {
    service = new DeviceManagementService();
    mockDb = db as jest.MockedFunction<typeof db>;
    jest.clearAllMocks();
  });

  describe('registerDevice', () => {
    it('should register a new device successfully', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
        insert: jest.fn().mockResolvedValue([1]),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const request: RegisterDeviceRequest = {
        userId: 'user-123',
        deviceToken: 'token-abc',
        platform: 'android',
        deviceId: 'device-123',
        deviceModel: 'Pixel 7',
        osVersion: '14.0',
        appVersion: '1.0.0',
      };

      const result = await service.registerDevice(request);

      expect(result.success).toBe(true);
      expect(result.deviceId).toBe('device-uuid-12345');
      expect(result.isNew).toBe(true);
    });

    it('should update existing device', async () => {
      const existingDevice = {
        id: 'existing-device-id',
        device_id: 'old-device-id',
        device_model: 'Old Model',
      };

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(existingDevice),
        update: jest.fn().mockResolvedValue(1),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const request: RegisterDeviceRequest = {
        userId: 'user-123',
        deviceToken: 'token-abc',
        platform: 'android',
        deviceModel: 'New Model',
      };

      const result = await service.registerDevice(request);

      expect(result.success).toBe(true);
      expect(result.deviceId).toBe('existing-device-id');
      expect(result.isNew).toBe(false);
    });

    it('should return error for missing required fields', async () => {
      const result = await service.registerDevice({
        userId: '',
        deviceToken: 'token',
        platform: 'android',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing required fields');
    });

    it('should handle database errors', async () => {
      mockDb.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await service.registerDevice({
        userId: 'user-123',
        deviceToken: 'token',
        platform: 'android',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to register device');
    });
  });

  describe('unregisterDevice', () => {
    it('should unregister device successfully', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.unregisterDevice('user-123', 'token-abc');

      expect(result.success).toBe(true);
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_active: false,
        })
      );
    });

    it('should return error when device not found', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(0),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.unregisterDevice('user-123', 'nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Device not found');
    });
  });

  describe('updateDevice', () => {
    it('should update device info successfully', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.updateDevice('user-123', 'token-abc', {
        osVersion: '15.0',
        appVersion: '2.0.0',
        deviceModel: 'Pixel 8',
      });

      expect(result.success).toBe(true);
    });

    it('should update last active timestamp', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      await service.updateDevice('user-123', 'token-abc', {});

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          last_active_at: expect.any(Date),
          updated_at: expect.any(Date),
        })
      );
    });

    it('should return error when device not found', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(0),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.updateDevice('user-123', 'nonexistent', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Device not found');
    });
  });

  describe('getUserDevices', () => {
    it('should return all devices for user', async () => {
      const mockDevices = [
        {
          id: 'device-1',
          user_id: 'user-123',
          device_token: 'token-1',
          platform: 'android',
          device_id: 'd1',
          device_model: 'Pixel 7',
          os_version: '14',
          app_version: '1.0',
          is_active: true,
          last_active_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'device-2',
          user_id: 'user-123',
          device_token: 'token-2',
          platform: 'ios',
          device_id: 'd2',
          device_model: 'iPhone 15',
          os_version: '17',
          app_version: '1.0',
          is_active: true,
          last_active_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue(mockDevices),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.getUserDevices('user-123');

      expect(result.success).toBe(true);
      expect(result.devices).toHaveLength(2);
      expect(result.devices?.[0].platform).toBe('android');
    });

    it('should filter active devices only when requested', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([]),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      await service.getUserDevices('user-123', true);

      expect(mockQuery.where).toHaveBeenCalledWith({ is_active: true });
    });
  });

  describe('getDeviceById', () => {
    it('should return device by ID', async () => {
      const mockDevice = {
        id: 'device-1',
        user_id: 'user-123',
        device_token: 'token-1',
        platform: 'android',
        device_model: 'Pixel 7',
        is_active: true,
        last_active_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockDevice),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.getDeviceById('device-1');

      expect(result.success).toBe(true);
      expect(result.device?.id).toBe('device-1');
    });

    it('should return error when device not found', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.getDeviceById('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Device not found');
    });
  });

  describe('updateLastActive', () => {
    it('should update last active timestamp', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.updateLastActive('token-abc');

      expect(result.success).toBe(true);
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          last_active_at: expect.any(Date),
        })
      );
    });
  });

  describe('deleteUserDevices', () => {
    it('should delete all devices for user', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        delete: jest.fn().mockResolvedValue(3),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.deleteUserDevices('user-123');

      expect(result.success).toBe(true);
      expect(result.deleted).toBe(3);
    });
  });

  describe('cleanupInactiveDevices', () => {
    it('should delete old inactive devices', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        delete: jest.fn().mockResolvedValue(10),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.cleanupInactiveDevices(90);

      expect(result.success).toBe(true);
      expect(result.deleted).toBe(10);
    });

    it('should use default 90 days when not specified', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        delete: jest.fn().mockResolvedValue(5),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      await service.cleanupInactiveDevices();

      expect(mockQuery.where).toHaveBeenCalledWith('is_active', false);
    });
  });

  describe('getDeviceStats', () => {
    it('should return device statistics for user', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        clone: jest.fn().mockReturnThis(),
        count: jest.fn().mockReturnThis(),
        first: jest.fn()
          .mockResolvedValueOnce({ count: '5' }) // total
          .mockResolvedValueOnce({ count: '3' }) // active
          .mockResolvedValueOnce({ count: '2' }) // inactive
          .mockResolvedValueOnce({ count: '1' }) // ios
          .mockResolvedValueOnce({ count: '2' }) // android
          .mockResolvedValueOnce({ count: '0' }), // web
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.getDeviceStats('user-123');

      expect(result.success).toBe(true);
      expect(result.stats?.total).toBe(5);
      expect(result.stats?.active).toBe(3);
      expect(result.stats?.inactive).toBe(2);
      expect(result.stats?.byPlatform.ios).toBe(1);
      expect(result.stats?.byPlatform.android).toBe(2);
      expect(result.stats?.byPlatform.web).toBe(0);
    });

    it('should return global stats when userId not provided', async () => {
      const mockQuery = {
        clone: jest.fn().mockReturnThis(),
        count: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ count: '100' }),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.getDeviceStats();

      expect(result.success).toBe(true);
    });
  });

  describe('bulkRegisterDevices', () => {
    it('should register multiple devices', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
        insert: jest.fn().mockResolvedValue([1]),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const devices: RegisterDeviceRequest[] = [
        { userId: 'user-1', deviceToken: 'token-1', platform: 'android' },
        { userId: 'user-2', deviceToken: 'token-2', platform: 'ios' },
        { userId: 'user-3', deviceToken: 'token-3', platform: 'web' },
      ];

      const result = await service.bulkRegisterDevices(devices);

      expect(result.success).toBe(true);
      expect(result.registered).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('should handle partial failures', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
        insert: jest.fn()
          .mockResolvedValueOnce([1])
          .mockRejectedValueOnce(new Error('Insert failed'))
          .mockResolvedValueOnce([1]),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const devices: RegisterDeviceRequest[] = [
        { userId: 'user-1', deviceToken: 'token-1', platform: 'android' },
        { userId: 'user-2', deviceToken: 'token-2', platform: 'ios' },
        { userId: 'user-3', deviceToken: 'token-3', platform: 'web' },
      ];

      const result = await service.bulkRegisterDevices(devices);

      expect(result.registered).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('deactivateByPlatform', () => {
    it('should deactivate all devices of a platform', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(3),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.deactivateByPlatform('user-123', 'ios');

      expect(result.success).toBe(true);
      expect(result.deactivated).toBe(3);
    });

    it('should update is_active to false', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      await service.deactivateByPlatform('user-123', 'android');

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_active: false,
        })
      );
    });
  });
});
