/**
 * Unit tests for QuietHoursService
 */

import { QuietHoursService } from '../../../src/services/quiet-hours.service';

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

import { db } from '../../../src/config/database';

describe('QuietHoursService', () => {
  let service: QuietHoursService;
  let mockDb: jest.MockedFunction<typeof db>;

  beforeEach(() => {
    service = new QuietHoursService();
    mockDb = db as jest.MockedFunction<typeof db>;
    jest.clearAllMocks();
  });

  describe('isQuietHours', () => {
    it('should return false when user has no preferences', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.isQuietHours('user-123');

      expect(result.isQuietHours).toBe(false);
    });

    it('should return false when quiet hours are disabled', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          quiet_hours_enabled: false,
          quiet_hours_start: '22:00',
          quiet_hours_end: '08:00',
          timezone: 'UTC',
        }),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.isQuietHours('user-123');

      expect(result.isQuietHours).toBe(false);
    });

    it('should return true when current time is within quiet hours', async () => {
      // Mock the current time to be 23:00 UTC
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-10T23:00:00.000Z'));

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          quiet_hours_enabled: true,
          quiet_hours_start: '22:00',
          quiet_hours_end: '08:00',
          timezone: 'UTC',
        }),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.isQuietHours('user-123');

      expect(result.isQuietHours).toBe(true);
      expect(result.nextAvailableTime).toBeDefined();

      jest.useRealTimers();
    });

    it('should return false when current time is outside quiet hours', async () => {
      // Mock the current time to be 12:00 UTC
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-10T12:00:00.000Z'));

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          quiet_hours_enabled: true,
          quiet_hours_start: '22:00',
          quiet_hours_end: '08:00',
          timezone: 'UTC',
        }),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.isQuietHours('user-123');

      expect(result.isQuietHours).toBe(false);

      jest.useRealTimers();
    });

    it('should handle quiet hours that span midnight', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-10T02:00:00.000Z')); // 2 AM

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          quiet_hours_enabled: true,
          quiet_hours_start: '23:00',
          quiet_hours_end: '07:00',
          timezone: 'UTC',
        }),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.isQuietHours('user-123');

      expect(result.isQuietHours).toBe(true);

      jest.useRealTimers();
    });

    it('should handle errors gracefully', async () => {
      mockDb.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await service.isQuietHours('user-123');

      // Should default to allowing notifications on error
      expect(result.isQuietHours).toBe(false);
    });
  });

  describe('shouldSendNow', () => {
    it('should bypass quiet hours for urgent notification types', async () => {
      const result = await service.shouldSendNow('user-123', 'video_call_incoming');

      expect(result.shouldSend).toBe(true);
      expect(result.reason).toContain('Urgent notification bypasses quiet hours');
    });

    it('should bypass quiet hours for security alerts', async () => {
      const result = await service.shouldSendNow('user-123', 'security_alert');

      expect(result.shouldSend).toBe(true);
    });

    it('should bypass quiet hours for payment failures', async () => {
      const result = await service.shouldSendNow('user-123', 'payment_failed');

      expect(result.shouldSend).toBe(true);
    });

    it('should return scheduled time when in quiet hours', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-10T23:00:00.000Z'));

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          quiet_hours_enabled: true,
          quiet_hours_start: '22:00',
          quiet_hours_end: '08:00',
          timezone: 'UTC',
        }),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.shouldSendNow('user-123', 'new_match');

      expect(result.shouldSend).toBe(false);
      expect(result.scheduleFor).toBeDefined();

      jest.useRealTimers();
    });

    it('should allow sending when not in quiet hours', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-10T12:00:00.000Z'));

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          quiet_hours_enabled: true,
          quiet_hours_start: '22:00',
          quiet_hours_end: '08:00',
          timezone: 'UTC',
        }),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.shouldSendNow('user-123', 'new_match');

      expect(result.shouldSend).toBe(true);

      jest.useRealTimers();
    });
  });

  describe('batchCheckQuietHours', () => {
    it('should check quiet hours for multiple users', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-10T23:00:00.000Z'));

      const mockPrefs = [
        {
          user_id: 'user-1',
          quiet_hours_enabled: true,
          quiet_hours_start: '22:00',
          quiet_hours_end: '08:00',
          timezone: 'UTC',
        },
        {
          user_id: 'user-2',
          quiet_hours_enabled: false,
          quiet_hours_start: '22:00',
          quiet_hours_end: '08:00',
          timezone: 'UTC',
        },
      ];

      const mockQuery = {
        whereIn: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(mockPrefs),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.batchCheckQuietHours(['user-1', 'user-2', 'user-3']);

      expect(result.get('user-1')?.isQuietHours).toBe(true);
      expect(result.get('user-2')?.isQuietHours).toBe(false);
      expect(result.get('user-3')?.isQuietHours).toBe(false); // No preferences

      jest.useRealTimers();
    });
  });

  describe('getOptimalSendTime', () => {
    it('should return preferred time when not in quiet hours', async () => {
      jest.useFakeTimers();
      const preferredTime = new Date('2025-01-10T12:00:00.000Z');
      jest.setSystemTime(preferredTime);

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          quiet_hours_enabled: true,
          quiet_hours_start: '22:00',
          quiet_hours_end: '08:00',
          timezone: 'UTC',
        }),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.getOptimalSendTime('user-123', preferredTime);

      expect(result).toEqual(preferredTime);

      jest.useRealTimers();
    });

    it('should return next available time when in quiet hours', async () => {
      jest.useFakeTimers();
      const preferredTime = new Date('2025-01-10T23:00:00.000Z');
      jest.setSystemTime(preferredTime);

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          quiet_hours_enabled: true,
          quiet_hours_start: '22:00',
          quiet_hours_end: '08:00',
          timezone: 'UTC',
        }),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.getOptimalSendTime('user-123', preferredTime);

      // Should be scheduled for 08:00 next day
      expect(result.getHours()).toBe(8);

      jest.useRealTimers();
    });

    it('should return current time when quiet hours not enabled', async () => {
      const now = new Date();

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          quiet_hours_enabled: false,
        }),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.getOptimalSendTime('user-123');

      expect(result.getTime()).toBeCloseTo(now.getTime(), -3);
    });
  });

  describe('updateQuietHours', () => {
    it('should update quiet hours preferences', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ user_id: 'user-123' }),
        update: jest.fn().mockResolvedValue(1),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.updateQuietHours('user-123', {
        quietHoursEnabled: true,
        quietHoursStart: '23:00',
        quietHoursEnd: '07:00',
        timezone: 'America/New_York',
      });

      expect(result.success).toBe(true);
      expect(mockQuery.update).toHaveBeenCalled();
    });

    it('should create preferences if they do not exist', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
        insert: jest.fn().mockResolvedValue([1]),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.updateQuietHours('user-123', {
        quietHoursEnabled: true,
      });

      expect(result.success).toBe(true);
      expect(mockQuery.insert).toHaveBeenCalled();
    });

    it('should validate time format', async () => {
      const result = await service.updateQuietHours('user-123', {
        quietHoursStart: '25:00', // Invalid
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid quietHoursStart format');
    });

    it('should validate timezone', async () => {
      const result = await service.updateQuietHours('user-123', {
        timezone: 'Invalid/Timezone',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid timezone');
    });
  });

  describe('getUserLocalTime', () => {
    it('should return user local time and timezone', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          timezone: 'America/New_York',
        }),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.getUserLocalTime('user-123');

      expect(result.timezone).toBe('America/New_York');
      expect(result.localTime).toBeDefined();
    });

    it('should default to UTC when no timezone set', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.getUserLocalTime('user-123');

      expect(result.timezone).toBe('UTC');
    });
  });

  describe('Time range calculation', () => {
    it('should correctly identify time within same-day range', () => {
      // Create a test time of 14:00
      const testTime = new Date();
      testTime.setHours(14, 0, 0, 0);

      const result = (service as any).isTimeInRange(testTime, '09:00', '17:00');

      expect(result).toBe(true);
    });

    it('should correctly identify time outside same-day range', () => {
      // Create a test time of 20:00
      const testTime = new Date();
      testTime.setHours(20, 0, 0, 0);

      const result = (service as any).isTimeInRange(testTime, '09:00', '17:00');

      expect(result).toBe(false);
    });

    it('should correctly handle midnight-spanning ranges', () => {
      // Create a test time of 01:00
      const testTime = new Date();
      testTime.setHours(1, 0, 0, 0);

      const result = (service as any).isTimeInRange(testTime, '22:00', '06:00');

      expect(result).toBe(true);
    });

    it('should correctly identify time outside midnight-spanning range', () => {
      // Create a test time of 12:00
      const testTime = new Date();
      testTime.setHours(12, 0, 0, 0);

      const result = (service as any).isTimeInRange(testTime, '22:00', '06:00');

      expect(result).toBe(false);
    });
  });

  describe('Time format validation', () => {
    it('should accept valid 24-hour format', () => {
      expect((service as any).isValidTimeFormat('00:00')).toBe(true);
      expect((service as any).isValidTimeFormat('12:30')).toBe(true);
      expect((service as any).isValidTimeFormat('23:59')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect((service as any).isValidTimeFormat('24:00')).toBe(false);
      expect((service as any).isValidTimeFormat('12:60')).toBe(false);
      expect((service as any).isValidTimeFormat('1:30')).toBe(false);
      expect((service as any).isValidTimeFormat('12:5')).toBe(false);
      expect((service as any).isValidTimeFormat('invalid')).toBe(false);
    });
  });
});
