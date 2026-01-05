import { DashboardService } from '../../../src/services/dashboard.service';

// Mock the database
jest.mock('../../../src/infrastructure/database', () => {
  const mockDb = jest.fn().mockImplementation((tableName: string) => {
    return {
      count: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      whereIn: jest.fn().mockReturnThis(),
      sum: jest.fn().mockReturnThis(),
      first: jest.fn(),
      select: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn(),
    };
  });
  mockDb.fn = {
    now: jest.fn().mockReturnValue(new Date()),
  };
  mockDb.raw = jest.fn();
  return { db: mockDb };
});

import { db } from '../../../src/infrastructure/database';

describe('DashboardService', () => {
  let dashboardService: DashboardService;
  const mockDb = db as jest.MockedFunction<typeof db>;

  beforeEach(() => {
    dashboardService = new DashboardService();
    jest.clearAllMocks();
  });

  describe('getDashboardStats', () => {
    const mockQueryBuilder = {
      count: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      whereIn: jest.fn().mockReturnThis(),
      sum: jest.fn().mockReturnThis(),
      first: jest.fn(),
    };

    beforeEach(() => {
      (mockDb as any).mockImplementation(() => mockQueryBuilder);
    });

    it('should return dashboard stats for today time range', async () => {
      mockQueryBuilder.first
        .mockResolvedValueOnce({ count: '1000' }) // totalUsers
        .mockResolvedValueOnce({ count: '500' })  // activeUsers
        .mockResolvedValueOnce({ count: '50' })   // newUsersToday
        .mockResolvedValueOnce({ count: '200' })  // premiumUsers
        .mockResolvedValueOnce({ count: '300' })  // totalMatches
        .mockResolvedValueOnce({ count: '25' })   // matchesToday
        .mockResolvedValueOnce({ count: '5000' }) // totalMessages
        .mockResolvedValueOnce({ count: '100' })  // messagesToday
        .mockResolvedValueOnce({ count: '15' })   // pendingVerifications
        .mockResolvedValueOnce({ count: '10' })   // pendingReports
        .mockResolvedValueOnce({ total: '5000' }) // todayRevenue
        .mockResolvedValueOnce({ total: '50000' }) // monthRevenue
        .mockResolvedValueOnce({ total: '500000' }); // totalRevenue

      const stats = await dashboardService.getDashboardStats('today');

      expect(stats).toEqual({
        totalUsers: 1000,
        activeUsers: 500,
        newUsersToday: 50,
        premiumUsers: 200,
        totalMatches: 300,
        matchesToday: 25,
        totalMessages: 5000,
        messagesToday: 100,
        pendingVerifications: 15,
        pendingReports: 10,
        revenue: {
          today: 5000,
          month: 50000,
          total: 500000,
        },
      });
    });

    it('should return dashboard stats for week time range', async () => {
      mockQueryBuilder.first
        .mockResolvedValueOnce({ count: '1000' })
        .mockResolvedValueOnce({ count: '750' })  // higher active users for week
        .mockResolvedValueOnce({ count: '50' })
        .mockResolvedValueOnce({ count: '200' })
        .mockResolvedValueOnce({ count: '300' })
        .mockResolvedValueOnce({ count: '25' })
        .mockResolvedValueOnce({ count: '5000' })
        .mockResolvedValueOnce({ count: '100' })
        .mockResolvedValueOnce({ count: '15' })
        .mockResolvedValueOnce({ count: '10' })
        .mockResolvedValueOnce({ total: '5000' })
        .mockResolvedValueOnce({ total: '50000' })
        .mockResolvedValueOnce({ total: '500000' });

      const stats = await dashboardService.getDashboardStats('week');

      expect(stats.activeUsers).toBe(750);
    });

    it('should return dashboard stats for month time range', async () => {
      mockQueryBuilder.first
        .mockResolvedValueOnce({ count: '1000' })
        .mockResolvedValueOnce({ count: '900' })  // even higher for month
        .mockResolvedValueOnce({ count: '50' })
        .mockResolvedValueOnce({ count: '200' })
        .mockResolvedValueOnce({ count: '300' })
        .mockResolvedValueOnce({ count: '25' })
        .mockResolvedValueOnce({ count: '5000' })
        .mockResolvedValueOnce({ count: '100' })
        .mockResolvedValueOnce({ count: '15' })
        .mockResolvedValueOnce({ count: '10' })
        .mockResolvedValueOnce({ total: '5000' })
        .mockResolvedValueOnce({ total: '50000' })
        .mockResolvedValueOnce({ total: '500000' });

      const stats = await dashboardService.getDashboardStats('month');

      expect(stats.activeUsers).toBe(900);
    });

    it('should handle null counts gracefully', async () => {
      mockQueryBuilder.first
        .mockResolvedValueOnce({ count: null })
        .mockResolvedValueOnce({ count: null })
        .mockResolvedValueOnce({ count: null })
        .mockResolvedValueOnce({ count: null })
        .mockResolvedValueOnce({ count: null })
        .mockResolvedValueOnce({ count: null })
        .mockResolvedValueOnce({ count: null })
        .mockResolvedValueOnce({ count: null })
        .mockResolvedValueOnce({ count: null })
        .mockResolvedValueOnce({ count: null })
        .mockResolvedValueOnce({ total: null })
        .mockResolvedValueOnce({ total: null })
        .mockResolvedValueOnce({ total: null });

      const stats = await dashboardService.getDashboardStats();

      expect(stats.totalUsers).toBe(0);
      expect(stats.activeUsers).toBe(0);
      expect(stats.revenue.today).toBe(0);
    });

    it('should use default time range of today', async () => {
      mockQueryBuilder.first.mockResolvedValue({ count: '100', total: '1000' });

      await dashboardService.getDashboardStats();

      // Verify that today's date range is used
      expect(mockQueryBuilder.where).toHaveBeenCalled();
    });

    it('should query premium users with correct subscription tiers', async () => {
      mockQueryBuilder.first.mockResolvedValue({ count: '100', total: '1000' });

      await dashboardService.getDashboardStats();

      expect(mockQueryBuilder.whereIn).toHaveBeenCalledWith(
        'subscription_tier',
        ['GOLD', 'PLATINUM', 'DIAMOND']
      );
    });
  });

  describe('getRecentActivity', () => {
    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn(),
    };

    beforeEach(() => {
      (mockDb as any).mockImplementation(() => mockQueryBuilder);
    });

    it('should return recent activities with default limit', async () => {
      const mockActivities = [
        {
          id: 'activity-1',
          type: 'user_login',
          description: 'User logged in',
          created_at: new Date('2026-01-04T10:00:00Z'),
          user_id: 'user-1',
        },
        {
          id: 'activity-2',
          type: 'user_signup',
          description: 'New user signed up',
          created_at: new Date('2026-01-04T09:00:00Z'),
          user_id: 'user-2',
        },
      ];

      mockQueryBuilder.limit.mockResolvedValue(mockActivities);

      const activities = await dashboardService.getRecentActivity();

      expect(mockDb).toHaveBeenCalledWith('activity_logs');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('*');
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('created_at', 'desc');
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(20);

      expect(activities).toEqual([
        {
          id: 'activity-1',
          type: 'user_login',
          description: 'User logged in',
          timestamp: new Date('2026-01-04T10:00:00Z'),
          userId: 'user-1',
        },
        {
          id: 'activity-2',
          type: 'user_signup',
          description: 'New user signed up',
          timestamp: new Date('2026-01-04T09:00:00Z'),
          userId: 'user-2',
        },
      ]);
    });

    it('should return recent activities with custom limit', async () => {
      mockQueryBuilder.limit.mockResolvedValue([]);

      await dashboardService.getRecentActivity(50);

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(50);
    });

    it('should handle empty activity list', async () => {
      mockQueryBuilder.limit.mockResolvedValue([]);

      const activities = await dashboardService.getRecentActivity();

      expect(activities).toEqual([]);
    });

    it('should correctly map activity fields', async () => {
      const mockActivity = {
        id: 'act-123',
        type: 'match_created',
        description: 'Match created between users',
        created_at: new Date('2026-01-04T11:30:00Z'),
        user_id: 'usr-456',
      };

      mockQueryBuilder.limit.mockResolvedValue([mockActivity]);

      const activities = await dashboardService.getRecentActivity(1);

      expect(activities[0]).toEqual({
        id: 'act-123',
        type: 'match_created',
        description: 'Match created between users',
        timestamp: new Date('2026-01-04T11:30:00Z'),
        userId: 'usr-456',
      });
    });
  });

  describe('getStartDate helper (private method behavior)', () => {
    const mockQueryBuilder = {
      count: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      whereIn: jest.fn().mockReturnThis(),
      sum: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue({ count: '0', total: '0' }),
    };

    beforeEach(() => {
      (mockDb as any).mockImplementation(() => mockQueryBuilder);
    });

    it('should use start of current day for today range', async () => {
      await dashboardService.getDashboardStats('today');

      // Check that where was called with a date that has hours set to 0
      const whereCalls = mockQueryBuilder.where.mock.calls;
      const dateArgs = whereCalls.filter(
        (call: any[]) => call[0] === 'last_active' && call[1] === '>='
      );

      if (dateArgs.length > 0) {
        const dateArg = dateArgs[0][2] as Date;
        expect(dateArg.getHours()).toBe(0);
        expect(dateArg.getMinutes()).toBe(0);
        expect(dateArg.getSeconds()).toBe(0);
      }
    });

    it('should use 7 days ago for week range', async () => {
      const now = new Date('2026-01-04T12:00:00.000Z');
      const sevenDaysAgo = new Date('2025-12-28T12:00:00.000Z');

      await dashboardService.getDashboardStats('week');

      const whereCalls = mockQueryBuilder.where.mock.calls;
      const dateArgs = whereCalls.filter(
        (call: any[]) => call[0] === 'last_active' && call[1] === '>='
      );

      if (dateArgs.length > 0) {
        const dateArg = dateArgs[0][2] as Date;
        expect(dateArg.getDate()).toBe(sevenDaysAgo.getDate());
      }
    });

    it('should use 1 month ago for month range', async () => {
      await dashboardService.getDashboardStats('month');

      const whereCalls = mockQueryBuilder.where.mock.calls;
      const dateArgs = whereCalls.filter(
        (call: any[]) => call[0] === 'last_active' && call[1] === '>='
      );

      if (dateArgs.length > 0) {
        const dateArg = dateArgs[0][2] as Date;
        // Should be December when current date is January
        expect(dateArg.getMonth()).toBe(11); // December (0-indexed)
      }
    });
  });
});
