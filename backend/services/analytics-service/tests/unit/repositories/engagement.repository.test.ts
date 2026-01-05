/**
 * Unit tests for Engagement Repository
 * Tests DAU, WAU, MAU, retention cohorts, and engagement metrics
 */

import { EngagementRepository } from '../../../src/domain/repositories/engagement.repository';
import { dbClient } from '../../../src/infrastructure/database/db-client';

jest.mock('../../../src/infrastructure/database/db-client');

describe('EngagementRepository', () => {
  let engagementRepository: EngagementRepository;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = jest.fn();
    (dbClient.query as jest.Mock) = mockQuery;
    engagementRepository = new EngagementRepository();
  });

  describe('getDAU', () => {
    it('should return daily active users count', async () => {
      const date = new Date('2025-01-15');

      mockQuery.mockResolvedValueOnce({
        rows: [{ dau: '1500' }],
      });

      const result = await engagementRepository.getDAU(date);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(DISTINCT user_id)'),
        [date]
      );

      expect(result).toBe(1500);
    });

    it('should return 0 for days with no activity', async () => {
      const date = new Date('2020-01-01');

      mockQuery.mockResolvedValueOnce({
        rows: [{ dau: '0' }],
      });

      const result = await engagementRepository.getDAU(date);

      expect(result).toBe(0);
    });
  });

  describe('getWAU', () => {
    it('should return weekly active users count', async () => {
      const endDate = new Date('2025-01-15');

      mockQuery.mockResolvedValueOnce({
        rows: [{ wau: '5000' }],
      });

      const result = await engagementRepository.getWAU(endDate);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("INTERVAL '7 days'"),
        [endDate]
      );

      expect(result).toBe(5000);
    });

    it('should return 0 for weeks with no activity', async () => {
      const endDate = new Date('2020-01-15');

      mockQuery.mockResolvedValueOnce({
        rows: [{ wau: '0' }],
      });

      const result = await engagementRepository.getWAU(endDate);

      expect(result).toBe(0);
    });
  });

  describe('getMAU', () => {
    it('should return monthly active users count', async () => {
      const endDate = new Date('2025-01-31');

      mockQuery.mockResolvedValueOnce({
        rows: [{ mau: '15000' }],
      });

      const result = await engagementRepository.getMAU(endDate);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("INTERVAL '30 days'"),
        [endDate]
      );

      expect(result).toBe(15000);
    });

    it('should return 0 for months with no activity', async () => {
      const endDate = new Date('2020-01-31');

      mockQuery.mockResolvedValueOnce({
        rows: [{ mau: '0' }],
      });

      const result = await engagementRepository.getMAU(endDate);

      expect(result).toBe(0);
    });
  });

  describe('getEngagementMetrics', () => {
    it('should return engagement metrics for date range', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-07');

      mockQuery.mockResolvedValueOnce({
        rows: [
          { date: new Date('2025-01-01'), dau: '1000', new_users: '100' },
          { date: new Date('2025-01-02'), dau: '1100', new_users: '120' },
          { date: new Date('2025-01-03'), dau: '1050', new_users: '90' },
          { date: new Date('2025-01-04'), dau: '950', new_users: '80' },
          { date: new Date('2025-01-05'), dau: '1200', new_users: '150' },
          { date: new Date('2025-01-06'), dau: '1300', new_users: '130' },
          { date: new Date('2025-01-07'), dau: '1250', new_users: '110' },
        ],
      });

      const result = await engagementRepository.getEngagementMetrics(startDate, endDate);

      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [startDate, endDate]);

      expect(result).toBeDefined();
      expect(result.length).toBe(7);

      result.forEach((metrics) => {
        expect(metrics.date).toBeDefined();
        expect(metrics.dau).toBeGreaterThanOrEqual(0);
        expect(metrics.newUsers).toBeGreaterThanOrEqual(0);
        expect(metrics.returningUsers).toBeGreaterThanOrEqual(0);
      });
    });

    it('should calculate returning users correctly', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-01');

      mockQuery.mockResolvedValueOnce({
        rows: [{ date: new Date('2025-01-01'), dau: '1000', new_users: '200' }],
      });

      const result = await engagementRepository.getEngagementMetrics(startDate, endDate);

      expect(result[0].dau).toBe(1000);
      expect(result[0].newUsers).toBe(200);
      expect(result[0].returningUsers).toBe(800); // 1000 - 200
    });

    it('should return empty array for date range with no data', async () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2020-01-07');

      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await engagementRepository.getEngagementMetrics(startDate, endDate);

      expect(result).toBeDefined();
      expect(result.length).toBe(0);
    });
  });

  describe('getRetentionCohorts', () => {
    it('should return retention cohort data', async () => {
      const startDate = new Date('2024-12-01');
      const endDate = new Date('2024-12-31');

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            cohort_date: new Date('2024-12-01'),
            cohort_size: '500',
            day_1_retention: '65.5',
            day_7_retention: '45.2',
            day_30_retention: '28.0',
            day_90_retention: '15.5',
          },
          {
            cohort_date: new Date('2024-12-08'),
            cohort_size: '550',
            day_1_retention: '68.0',
            day_7_retention: '48.5',
            day_30_retention: '30.2',
            day_90_retention: null,
          },
        ],
      });

      const result = await engagementRepository.getRetentionCohorts(startDate, endDate);

      expect(result).toBeDefined();
      expect(result.length).toBe(2);

      expect(result[0].cohortDate).toBeDefined();
      expect(result[0].cohortSize).toBe(500);
      expect(result[0].day1Retention).toBeCloseTo(65.5, 1);
      expect(result[0].day7Retention).toBeCloseTo(45.2, 1);
      expect(result[0].day30Retention).toBeCloseTo(28.0, 1);
      expect(result[0].day90Retention).toBeCloseTo(15.5, 1);
    });

    it('should handle null retention values', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-07');

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            cohort_date: new Date('2025-01-01'),
            cohort_size: '100',
            day_1_retention: '60',
            day_7_retention: null, // Not enough time has passed
            day_30_retention: null,
            day_90_retention: null,
          },
        ],
      });

      const result = await engagementRepository.getRetentionCohorts(startDate, endDate);

      expect(result[0].day7Retention).toBe(0);
      expect(result[0].day30Retention).toBe(0);
      expect(result[0].day90Retention).toBe(0);
    });
  });

  describe('getUserActivitySummary', () => {
    it('should return user activity summary', async () => {
      const userId = 'user-123';

      // Mock session data
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            user_id: userId,
            last_active_at: new Date(),
            total_sessions: '150',
            total_days_active: '45',
            average_session_duration: '600',
          },
        ],
      });

      // Mock swipe count
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '2500' }],
      });

      // Mock match count
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '75' }],
      });

      // Mock message count
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '350' }],
      });

      const result = await engagementRepository.getUserActivitySummary(userId);

      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.totalSessions).toBe(150);
      expect(result.totalDaysActive).toBe(45);
      expect(result.averageSessionDuration).toBe(600);
      expect(result.totalSwipes).toBe(2500);
      expect(result.totalMatches).toBe(75);
      expect(result.totalMessages).toBe(350);
      expect(result.isActive).toBe(true);
    });

    it('should throw error for non-existent user', async () => {
      const userId = 'user-nonexistent';

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(engagementRepository.getUserActivitySummary(userId)).rejects.toThrow(
        'User not found'
      );
    });

    it('should correctly determine inactive user', async () => {
      const userId = 'user-inactive';
      const lastActiveAt = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000); // 45 days ago

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            user_id: userId,
            last_active_at: lastActiveAt,
            total_sessions: '10',
            total_days_active: '5',
            average_session_duration: '300',
          },
        ],
      });

      mockQuery.mockResolvedValueOnce({ rows: [{ count: '50' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '5' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '10' }] });

      const result = await engagementRepository.getUserActivitySummary(userId);

      expect(result.isActive).toBe(false);
    });
  });

  describe('getStickinessRatio', () => {
    it('should calculate stickiness ratio correctly', async () => {
      const date = new Date('2025-01-15');

      // Mock DAU
      mockQuery.mockResolvedValueOnce({ rows: [{ dau: '1500' }] });

      // Mock MAU
      mockQuery.mockResolvedValueOnce({ rows: [{ mau: '10000' }] });

      const result = await engagementRepository.getStickinessRatio(date);

      expect(result).toBe(15); // (1500 / 10000) * 100
    });

    it('should handle zero MAU', async () => {
      const date = new Date('2020-01-15');

      mockQuery.mockResolvedValueOnce({ rows: [{ dau: '0' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ mau: '0' }] });

      const result = await engagementRepository.getStickinessRatio(date);

      expect(result).toBe(0);
    });
  });

  describe('getChurnRate', () => {
    it('should calculate churn rate correctly', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      // Mock active users at start
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '10000' }],
      });

      // Mock churned users
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '500' }],
      });

      const result = await engagementRepository.getChurnRate(startDate, endDate);

      expect(result).toBeDefined();
      expect(result.totalUsersAtStart).toBe(10000);
      expect(result.churnedUsers).toBe(500);
      expect(result.churnRate).toBe(5); // (500 / 10000) * 100
    });

    it('should handle zero users at start', async () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2020-01-31');

      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const result = await engagementRepository.getChurnRate(startDate, endDate);

      expect(result.totalUsersAtStart).toBe(0);
      expect(result.churnRate).toBe(0);
    });
  });

  describe('getPowerUsers', () => {
    it('should return top percentile power users', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            user_id: 'user-1',
            last_active_at: new Date(),
            total_sessions: '200',
            total_days_active: '28',
            average_session_duration: '900',
            total_swipes: '5000',
            total_messages: '500',
          },
          {
            user_id: 'user-2',
            last_active_at: new Date(),
            total_sessions: '180',
            total_days_active: '26',
            average_session_duration: '850',
            total_swipes: '4500',
            total_messages: '450',
          },
        ],
      });

      const result = await engagementRepository.getPowerUsers(10);

      expect(result).toBeDefined();
      expect(result.length).toBe(2);

      result.forEach((user) => {
        expect(user.userId).toBeDefined();
        expect(user.totalSessions).toBeGreaterThan(0);
        expect(user.totalDaysActive).toBeGreaterThan(0);
        expect(user.isActive).toBe(true);
      });
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            user_id: 'user-1',
            last_active_at: new Date(),
            total_sessions: '50',
            total_days_active: '20',
            average_session_duration: '600',
            total_swipes: '1500',
            total_messages: '150',
          },
        ],
      });

      const result = await engagementRepository.getPowerUsers(10, startDate, endDate);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('start_time >= $'),
        expect.arrayContaining([startDate, endDate])
      );

      expect(result.length).toBe(1);
    });
  });

  describe('getFeatureUsage', () => {
    it('should return feature usage statistics', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            feature: 'boost',
            total_users: '500',
            total_events: '1200',
            average_per_user: '2.4',
          },
          {
            feature: 'super_like',
            total_users: '800',
            total_events: '3500',
            average_per_user: '4.375',
          },
          {
            feature: 'rewind',
            total_users: '300',
            total_events: '450',
            average_per_user: '1.5',
          },
        ],
      });

      const result = await engagementRepository.getFeatureUsage(startDate, endDate);

      expect(result).toBeDefined();
      expect(result.length).toBe(3);

      result.forEach((usage) => {
        expect(usage.feature).toBeDefined();
        expect(usage.totalUsers).toBeGreaterThanOrEqual(0);
        expect(usage.totalEvents).toBeGreaterThanOrEqual(0);
        expect(usage.averagePerUser).toBeGreaterThanOrEqual(0);
      });
    });

    it('should return empty array when no feature usage', async () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2020-01-31');

      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await engagementRepository.getFeatureUsage(startDate, endDate);

      expect(result).toBeDefined();
      expect(result.length).toBe(0);
    });
  });

  describe('getTimeOnAppStats', () => {
    it('should return time on app statistics', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            avg_duration: '480',
            median_duration: '360',
            total_duration: '1500000',
            avg_time_per_user: '1500',
          },
        ],
      });

      const result = await engagementRepository.getTimeOnAppStats(startDate, endDate);

      expect(result).toBeDefined();
      expect(result.averageSessionDuration).toBe(480);
      expect(result.medianSessionDuration).toBe(360);
      expect(result.totalTimeSpent).toBe(1500000);
      expect(result.averageTimePerUser).toBe(1500);
    });

    it('should handle null values', async () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2020-01-31');

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            avg_duration: null,
            median_duration: null,
            total_duration: null,
            avg_time_per_user: null,
          },
        ],
      });

      const result = await engagementRepository.getTimeOnAppStats(startDate, endDate);

      expect(result.averageSessionDuration).toBe(0);
      expect(result.medianSessionDuration).toBe(0);
      expect(result.totalTimeSpent).toBe(0);
      expect(result.averageTimePerUser).toBe(0);
    });
  });
});
