/**
 * Unit tests for BatchNotificationService
 */

import { BatchNotificationService, BatchNotificationRequest, SegmentedNotificationRequest } from '../../../src/services/batch-notification.service';
import { NotificationType } from '../../../src/services/push-notification-delivery.service';

// Mock dependencies
jest.mock('../../../src/config/database', () => ({
  db: jest.fn(),
}));

jest.mock('../../../src/config', () => ({
  config: {
    notification: {
      batchSize: 10,
    },
  },
}));

jest.mock('../../../src/utils/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../../../src/services/push-notification-delivery.service', () => ({
  pushNotificationDeliveryService: {
    sendToUser: jest.fn(),
  },
  NotificationType: {
    NEW_MATCH: 'new_match',
    NEW_MESSAGE: 'new_message',
    PROMO: 'promo',
  },
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'batch-uuid-12345'),
}));

import { db } from '../../../src/config/database';
import { pushNotificationDeliveryService } from '../../../src/services/push-notification-delivery.service';

describe('BatchNotificationService', () => {
  let service: BatchNotificationService;
  let mockDb: jest.MockedFunction<typeof db>;

  beforeEach(() => {
    service = new BatchNotificationService();
    mockDb = db as jest.MockedFunction<typeof db>;
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('sendBatch', () => {
    it('should create batch job and return job ID', async () => {
      (pushNotificationDeliveryService.sendToUser as jest.Mock).mockResolvedValue({
        success: true,
        sent: 1,
        failed: 0,
      });

      const request: BatchNotificationRequest = {
        userIds: ['user-1', 'user-2', 'user-3'],
        type: NotificationType.NEW_MATCH as any,
        title: 'Batch Notification',
        body: 'This is a batch notification',
      };

      const result = await service.sendBatch(request);

      expect(result.success).toBe(true);
      expect(result.jobId).toBe('batch-uuid-12345');
      expect(result.totalUsers).toBe(3);
    });

    it('should throw error when userIds is empty', async () => {
      const request: BatchNotificationRequest = {
        userIds: [],
        type: NotificationType.NEW_MATCH as any,
        title: 'Test',
        body: 'Test',
      };

      await expect(service.sendBatch(request)).rejects.toThrow(
        'User IDs array is required and cannot be empty'
      );
    });

    it('should throw error when required fields are missing', async () => {
      const request: BatchNotificationRequest = {
        userIds: ['user-1'],
        type: '' as any,
        title: 'Test',
        body: 'Test',
      };

      await expect(service.sendBatch(request)).rejects.toThrow(
        'Type, title, and body are required'
      );
    });

    it('should use default priority of normal', async () => {
      (pushNotificationDeliveryService.sendToUser as jest.Mock).mockResolvedValue({
        success: true,
        sent: 1,
        failed: 0,
      });

      const request: BatchNotificationRequest = {
        userIds: ['user-1'],
        type: NotificationType.NEW_MATCH as any,
        title: 'Test',
        body: 'Test',
      };

      const result = await service.sendBatch(request);

      expect(result.success).toBe(true);
    });

    it('should respect optional parameters', async () => {
      (pushNotificationDeliveryService.sendToUser as jest.Mock).mockResolvedValue({
        success: true,
        sent: 1,
        failed: 0,
      });

      const request: BatchNotificationRequest = {
        userIds: ['user-1'],
        type: NotificationType.NEW_MATCH as any,
        title: 'Test',
        body: 'Test',
        data: { key: 'value' },
        imageUrl: 'https://example.com/image.jpg',
        deepLink: '/profile/123',
        badge: 5,
        sound: 'custom.wav',
        priority: 'high',
        respectQuietHours: false,
        respectPreferences: false,
      };

      const result = await service.sendBatch(request);

      expect(result.success).toBe(true);
    });
  });

  describe('processBatch', () => {
    it('should process all users in batch', async () => {
      (pushNotificationDeliveryService.sendToUser as jest.Mock).mockResolvedValue({
        success: true,
        sent: 1,
        failed: 0,
      });

      const request: BatchNotificationRequest = {
        userIds: ['user-1', 'user-2'],
        type: NotificationType.NEW_MATCH as any,
        title: 'Test',
        body: 'Test',
      };

      await service.sendBatch(request);

      // Allow the async batch processing to run
      await jest.advanceTimersByTimeAsync(500);

      expect(pushNotificationDeliveryService.sendToUser).toHaveBeenCalledTimes(2);
    });

    it('should handle failures for individual users', async () => {
      (pushNotificationDeliveryService.sendToUser as jest.Mock)
        .mockResolvedValueOnce({ success: true, sent: 1, failed: 0 })
        .mockResolvedValueOnce({ success: false, sent: 0, failed: 1 });

      const request: BatchNotificationRequest = {
        userIds: ['user-1', 'user-2'],
        type: NotificationType.NEW_MATCH as any,
        title: 'Test',
        body: 'Test',
      };

      await service.sendBatch(request);

      await jest.advanceTimersByTimeAsync(500);

      expect(pushNotificationDeliveryService.sendToUser).toHaveBeenCalledTimes(2);
    });

    it('should save batch job history after completion', async () => {
      (pushNotificationDeliveryService.sendToUser as jest.Mock).mockResolvedValue({
        success: true,
        sent: 1,
        failed: 0,
      });

      const mockQuery = {
        insert: jest.fn().mockResolvedValue([1]),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const request: BatchNotificationRequest = {
        userIds: ['user-1'],
        type: NotificationType.NEW_MATCH as any,
        title: 'Test',
        body: 'Test',
      };

      await service.sendBatch(request);

      await jest.advanceTimersByTimeAsync(500);

      expect(mockQuery.insert).toHaveBeenCalled();
    });
  });

  describe('sendToSegment', () => {
    it('should get users for segment and send batch', async () => {
      const mockUsers = [
        { user_id: 'user-1' },
        { user_id: 'user-2' },
      ];

      const mockQuery = {
        distinct: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(mockUsers),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      (pushNotificationDeliveryService.sendToUser as jest.Mock).mockResolvedValue({
        success: true,
        sent: 1,
        failed: 0,
      });

      const request: SegmentedNotificationRequest = {
        segment: {
          type: 'all',
        },
        payload: {
          type: NotificationType.PROMO as any,
          title: 'Promo',
          body: 'Special offer!',
        },
      };

      const result = await service.sendToSegment(request);

      expect(result.success).toBe(true);
      expect(result.totalUsers).toBe(2);
    });

    it('should filter by platform when specified', async () => {
      const mockQuery = {
        distinct: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ user_id: 'user-1' }]),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      (pushNotificationDeliveryService.sendToUser as jest.Mock).mockResolvedValue({
        success: true,
        sent: 1,
        failed: 0,
      });

      const request: SegmentedNotificationRequest = {
        segment: {
          type: 'platform',
          platform: 'ios',
        },
        payload: {
          type: NotificationType.PROMO as any,
          title: 'iOS Only',
          body: 'iOS promo!',
        },
      };

      await service.sendToSegment(request);

      expect(mockQuery.where).toHaveBeenCalledWith({ platform: 'ios' });
    });

    it('should filter by active since date', async () => {
      const activeSince = new Date('2025-01-01');

      const mockQuery = {
        distinct: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ user_id: 'user-1' }]),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      (pushNotificationDeliveryService.sendToUser as jest.Mock).mockResolvedValue({
        success: true,
        sent: 1,
        failed: 0,
      });

      const request: SegmentedNotificationRequest = {
        segment: {
          type: 'active',
          activeSince,
        },
        payload: {
          type: NotificationType.PROMO as any,
          title: 'Active Users',
          body: 'Active user promo!',
        },
      };

      await service.sendToSegment(request);

      expect(mockQuery.where).toHaveBeenCalledWith('last_active_at', '>=', activeSince);
    });

    it('should throw error when no users match segment', async () => {
      const mockQuery = {
        distinct: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const request: SegmentedNotificationRequest = {
        segment: {
          type: 'all',
        },
        payload: {
          type: NotificationType.PROMO as any,
          title: 'Test',
          body: 'Test',
        },
      };

      await expect(service.sendToSegment(request)).rejects.toThrow(
        'No users found matching the segment criteria'
      );
    });
  });

  describe('getJobStatus', () => {
    it('should return active job status', async () => {
      // First create a job
      (pushNotificationDeliveryService.sendToUser as jest.Mock).mockResolvedValue({
        success: true,
        sent: 1,
        failed: 0,
      });

      const request: BatchNotificationRequest = {
        userIds: ['user-1'],
        type: NotificationType.NEW_MATCH as any,
        title: 'Test',
        body: 'Test',
      };

      const { jobId } = await service.sendBatch(request);

      const result = await service.getJobStatus(jobId);

      expect(result.success).toBe(true);
      expect(result.job?.id).toBe(jobId);
    });

    it('should return job from database if not active', async () => {
      const mockDbJob = {
        id: 'old-job-123',
        user_ids: '["user-1"]',
        payload: '{"type":"promo","title":"Test","body":"Test"}',
        status: 'completed',
        total_users: 1,
        sent_count: 1,
        failed_count: 0,
        created_at: new Date(),
        started_at: new Date(),
        completed_at: new Date(),
      };

      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockDbJob),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.getJobStatus('old-job-123');

      expect(result.success).toBe(true);
      expect(result.job?.id).toBe('old-job-123');
      expect(result.job?.status).toBe('completed');
    });

    it('should return error when job not found', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.getJobStatus('nonexistent-job');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Job not found');
    });
  });

  describe('cancelJob', () => {
    it('should cancel pending job', async () => {
      const mockQuery = {
        insert: jest.fn().mockResolvedValue([1]),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      // Create a job but don't let it start processing
      (pushNotificationDeliveryService.sendToUser as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const request: BatchNotificationRequest = {
        userIds: ['user-1'],
        type: NotificationType.NEW_MATCH as any,
        title: 'Test',
        body: 'Test',
      };

      const { jobId } = await service.sendBatch(request);

      const result = await service.cancelJob(jobId);

      expect(result.success).toBe(true);
    });

    it('should return error when job not found', async () => {
      const result = await service.cancelJob('nonexistent-job');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Job not found or already completed');
    });
  });

  describe('getJobHistory', () => {
    it('should return batch job history with pagination', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          user_ids: '["user-1"]',
          payload: '{"type":"promo"}',
          status: 'completed',
          total_users: 1,
          sent_count: 1,
          failed_count: 0,
          created_at: new Date(),
        },
      ];

      const mockQuery = {
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockJobs),
        count: jest.fn().mockResolvedValue([{ count: '10' }]),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.getJobHistory(50, 0);

      expect(result.success).toBe(true);
      expect(result.jobs).toHaveLength(1);
      expect(result.total).toBe(10);
    });
  });

  describe('cleanupOldJobs', () => {
    it('should delete old completed jobs', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        delete: jest.fn().mockResolvedValue(5),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.cleanupOldJobs(30);

      expect(result.success).toBe(true);
      expect(result.deleted).toBe(5);
    });

    it('should use default 30 days when not specified', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        delete: jest.fn().mockResolvedValue(0),
      };

      mockDb.mockImplementation(() => mockQuery as any);

      await service.cleanupOldJobs();

      expect(mockQuery.where).toHaveBeenCalled();
    });
  });

  describe('getBatchStats', () => {
    it('should return batch statistics', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        count: jest.fn().mockReturnThis(),
        first: jest.fn()
          .mockResolvedValueOnce({ count: '5' })
          .mockResolvedValueOnce({ count: '100' }),
        sum: jest.fn().mockReturnThis(),
        whereRaw: jest.fn().mockReturnThis(),
        avg: jest.fn().mockReturnThis(),
      };

      // Set up for completed24h count
      mockQuery.first
        .mockResolvedValueOnce({ count: '5' })
        .mockResolvedValueOnce({ total: '1000' })
        .mockResolvedValueOnce({ rate: '95.5' });

      mockDb.mockImplementation(() => mockQuery as any);

      const result = await service.getBatchStats();

      expect(result.success).toBe(true);
      expect(result.stats).toBeDefined();
    });
  });
});
