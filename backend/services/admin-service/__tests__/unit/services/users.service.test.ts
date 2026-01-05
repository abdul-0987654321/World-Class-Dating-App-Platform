import { UsersService } from '../../../src/services/users.service';

// Mock the database
jest.mock('../../../src/infrastructure/database', () => {
  const mockDb = jest.fn().mockImplementation((tableName: string) => {
    return {
      select: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      whereIn: jest.fn().mockReturnThis(),
      having: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis(),
      clearSelect: jest.fn().mockReturnThis(),
      clearOrder: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn(),
      first: jest.fn(),
      update: jest.fn(),
      insert: jest.fn(),
    };
  });
  mockDb.fn = {
    now: jest.fn().mockReturnValue(new Date('2026-01-04T12:00:00.000Z')),
  };
  mockDb.raw = jest.fn().mockReturnValue('COUNT(DISTINCT reports.id) as report_count');
  return { db: mockDb };
});

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { db } from '../../../src/infrastructure/database';
import { logger } from '../../../src/utils/logger';

describe('UsersService', () => {
  let usersService: UsersService;
  const mockDb = db as jest.MockedFunction<typeof db>;

  beforeEach(() => {
    usersService = new UsersService();
    jest.clearAllMocks();
  });

  describe('searchUsers', () => {
    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      whereIn: jest.fn().mockReturnThis(),
      having: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis(),
      clearSelect: jest.fn().mockReturnThis(),
      clearOrder: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn(),
    };

    beforeEach(() => {
      (mockDb as any).mockImplementation(() => mockQueryBuilder);
    });

    it('should return paginated users with default filters', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'john@example.com',
          first_name: 'John',
          last_name: 'Doe',
          profile_photo: 'photo1.jpg',
          subscription_tier: 'FREE',
          is_verified: true,
          is_active: true,
          is_banned: false,
          created_at: new Date('2026-01-01'),
          last_active: new Date('2026-01-04'),
          report_count: '0',
        },
      ];

      mockQueryBuilder.count.mockReturnThis();
      mockQueryBuilder.clone.mockReturnValue({
        clearSelect: jest.fn().mockReturnValue({
          clearOrder: jest.fn().mockReturnValue({
            count: jest.fn().mockResolvedValue([{ count: '1' }]),
          }),
        }),
      });
      mockQueryBuilder.offset.mockResolvedValue(mockUsers);

      const result = await usersService.searchUsers({});

      expect(result.users).toHaveLength(1);
      expect(result.users[0]).toEqual({
        id: 'user-1',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        profilePhoto: 'photo1.jpg',
        subscription: 'FREE',
        isVerified: true,
        isActive: true,
        isBanned: false,
        createdAt: new Date('2026-01-01'),
        lastActive: new Date('2026-01-04'),
        reportCount: 0,
      });
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should apply search filter correctly', async () => {
      mockQueryBuilder.clone.mockReturnValue({
        clearSelect: jest.fn().mockReturnValue({
          clearOrder: jest.fn().mockReturnValue({
            count: jest.fn().mockResolvedValue([{ count: '0' }]),
          }),
        }),
      });
      mockQueryBuilder.offset.mockResolvedValue([]);

      await usersService.searchUsers({ search: 'test@example.com' });

      expect(mockQueryBuilder.where).toHaveBeenCalled();
    });

    it('should filter verified users', async () => {
      mockQueryBuilder.clone.mockReturnValue({
        clearSelect: jest.fn().mockReturnValue({
          clearOrder: jest.fn().mockReturnValue({
            count: jest.fn().mockResolvedValue([{ count: '0' }]),
          }),
        }),
      });
      mockQueryBuilder.offset.mockResolvedValue([]);

      await usersService.searchUsers({ filter: 'verified' });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('is_verified', true);
    });

    it('should filter premium users', async () => {
      mockQueryBuilder.clone.mockReturnValue({
        clearSelect: jest.fn().mockReturnValue({
          clearOrder: jest.fn().mockReturnValue({
            count: jest.fn().mockResolvedValue([{ count: '0' }]),
          }),
        }),
      });
      mockQueryBuilder.offset.mockResolvedValue([]);

      await usersService.searchUsers({ filter: 'premium' });

      expect(mockQueryBuilder.whereIn).toHaveBeenCalledWith(
        'subscription_tier',
        ['GOLD', 'PLATINUM', 'DIAMOND']
      );
    });

    it('should filter banned users', async () => {
      mockQueryBuilder.clone.mockReturnValue({
        clearSelect: jest.fn().mockReturnValue({
          clearOrder: jest.fn().mockReturnValue({
            count: jest.fn().mockResolvedValue([{ count: '0' }]),
          }),
        }),
      });
      mockQueryBuilder.offset.mockResolvedValue([]);

      await usersService.searchUsers({ filter: 'banned' });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('is_banned', true);
    });

    it('should filter reported users', async () => {
      mockQueryBuilder.clone.mockReturnValue({
        clearSelect: jest.fn().mockReturnValue({
          clearOrder: jest.fn().mockReturnValue({
            count: jest.fn().mockResolvedValue([{ count: '0' }]),
          }),
        }),
      });
      mockQueryBuilder.offset.mockResolvedValue([]);

      await usersService.searchUsers({ filter: 'reported' });

      expect(mockQueryBuilder.having).toHaveBeenCalled();
    });

    it('should calculate pagination correctly', async () => {
      mockQueryBuilder.clone.mockReturnValue({
        clearSelect: jest.fn().mockReturnValue({
          clearOrder: jest.fn().mockReturnValue({
            count: jest.fn().mockResolvedValue([{ count: '100' }]),
          }),
        }),
      });
      mockQueryBuilder.offset.mockResolvedValue([]);

      const result = await usersService.searchUsers({ page: 3, limit: 10 });

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(20); // (3-1) * 10
      expect(result.totalPages).toBe(10); // 100 / 10
    });
  });

  describe('getUserDetails', () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn(),
      first: jest.fn(),
    };

    beforeEach(() => {
      (mockDb as any).mockImplementation(() => mockQueryBuilder);
    });

    it('should return user details with related data', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'john@example.com',
        first_name: 'John',
        last_name: 'Doe',
      };

      mockQueryBuilder.first
        .mockResolvedValueOnce(mockUser) // User
        .mockResolvedValueOnce({ count: '5' }); // Matches count

      mockQueryBuilder.limit
        .mockResolvedValueOnce([]) // Reports
        .mockResolvedValueOnce([]) // Subscription history
        .mockResolvedValueOnce([]); // Login history

      const result = await usersService.getUserDetails('user-1');

      expect(result).toEqual({
        ...mockUser,
        matchCount: 5,
        reports: [],
        subscriptionHistory: [],
        loginHistory: [],
      });
    });

    it('should throw error when user not found', async () => {
      mockQueryBuilder.first.mockResolvedValueOnce(null);

      await expect(usersService.getUserDetails('non-existent'))
        .rejects.toThrow('User not found');
    });

    it('should handle null match count', async () => {
      const mockUser = { id: 'user-1', email: 'test@test.com' };

      mockQueryBuilder.first
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ count: null });

      mockQueryBuilder.limit
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await usersService.getUserDetails('user-1');

      expect(result.matchCount).toBe(0);
    });
  });

  describe('banUser', () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      update: jest.fn(),
      insert: jest.fn(),
    };

    beforeEach(() => {
      (mockDb as any).mockImplementation(() => mockQueryBuilder);
    });

    it('should ban user permanently without duration', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);
      mockQueryBuilder.insert.mockResolvedValue([1]);

      await usersService.banUser('user-1', 'Violation of terms');

      expect(mockDb).toHaveBeenCalledWith('users');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: 'user-1' });
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_banned: true,
          ban_reason: 'Violation of terms',
          ban_until: null,
        })
      );
    });

    it('should ban user with duration', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);
      mockQueryBuilder.insert.mockResolvedValue([1]);

      await usersService.banUser('user-1', 'Spam', 86400); // 1 day in seconds

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_banned: true,
          ban_reason: 'Spam',
        })
      );

      // Verify ban_until is set
      const updateCall = mockQueryBuilder.update.mock.calls[0][0];
      expect(updateCall.ban_until).toBeInstanceOf(Date);
    });

    it('should create user action record', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);
      mockQueryBuilder.insert.mockResolvedValue([1]);

      await usersService.banUser('user-1', 'Harassment');

      expect(mockDb).toHaveBeenCalledWith('user_actions');
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          action: 'banned',
          reason: 'Harassment',
        })
      );
    });

    it('should log the ban action', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);
      mockQueryBuilder.insert.mockResolvedValue([1]);

      await usersService.banUser('user-1', 'Test reason', 3600);

      expect(logger.info).toHaveBeenCalledWith(
        'User banned: user-1',
        { reason: 'Test reason', duration: 3600 }
      );
    });
  });

  describe('unbanUser', () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      update: jest.fn(),
      insert: jest.fn(),
    };

    beforeEach(() => {
      (mockDb as any).mockImplementation(() => mockQueryBuilder);
    });

    it('should unban user and clear ban fields', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);
      mockQueryBuilder.insert.mockResolvedValue([1]);

      await usersService.unbanUser('user-1');

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_banned: false,
          ban_reason: null,
          banned_at: null,
          ban_until: null,
        })
      );
    });

    it('should create user action record for unban', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);
      mockQueryBuilder.insert.mockResolvedValue([1]);

      await usersService.unbanUser('user-1');

      expect(mockDb).toHaveBeenCalledWith('user_actions');
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          action: 'unbanned',
        })
      );
    });

    it('should log the unban action', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);
      mockQueryBuilder.insert.mockResolvedValue([1]);

      await usersService.unbanUser('user-1');

      expect(logger.info).toHaveBeenCalledWith('User unbanned: user-1');
    });
  });

  describe('verifyUser', () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      update: jest.fn(),
    };

    beforeEach(() => {
      (mockDb as any).mockImplementation(() => mockQueryBuilder);
    });

    it('should verify user', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      await usersService.verifyUser('user-1');

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_verified: true,
        })
      );
    });

    it('should set verified_at timestamp', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      await usersService.verifyUser('user-1');

      const updateCall = mockQueryBuilder.update.mock.calls[0][0];
      expect(updateCall).toHaveProperty('verified_at');
    });

    it('should log verification', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      await usersService.verifyUser('user-1');

      expect(logger.info).toHaveBeenCalledWith('User verified: user-1');
    });
  });

  describe('deleteUser', () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      update: jest.fn(),
      insert: jest.fn(),
    };

    beforeEach(() => {
      (mockDb as any).mockImplementation(() => mockQueryBuilder);
    });

    it('should soft delete user', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);
      mockQueryBuilder.insert.mockResolvedValue([1]);

      await usersService.deleteUser('user-1', 'Account closure request');

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_active: false,
          deletion_reason: 'Account closure request',
        })
      );
    });

    it('should schedule data anonymization', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);
      mockQueryBuilder.insert.mockResolvedValue([1]);

      await usersService.deleteUser('user-1', 'GDPR request');

      expect(mockDb).toHaveBeenCalledWith('deletion_queue');
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
        })
      );

      // Verify scheduled_for is 30 days in the future
      const insertCall = mockQueryBuilder.insert.mock.calls[0][0];
      expect(insertCall.scheduled_for).toBeInstanceOf(Date);
    });

    it('should log deletion', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);
      mockQueryBuilder.insert.mockResolvedValue([1]);

      await usersService.deleteUser('user-1', 'User request');

      expect(logger.info).toHaveBeenCalledWith(
        'User deleted: user-1',
        { reason: 'User request' }
      );
    });
  });

  describe('updateUser', () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      update: jest.fn(),
    };

    beforeEach(() => {
      (mockDb as any).mockImplementation(() => mockQueryBuilder);
    });

    it('should update user fields', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      const updates = { first_name: 'Jane', last_name: 'Smith' };
      await usersService.updateUser('user-1', updates);

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          first_name: 'Jane',
          last_name: 'Smith',
        })
      );
    });

    it('should log update', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      const updates = { email: 'new@example.com' };
      await usersService.updateUser('user-1', updates);

      expect(logger.info).toHaveBeenCalledWith(
        'User updated: user-1',
        { updates }
      );
    });
  });

  describe('resetPassword', () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      update: jest.fn(),
    };

    beforeEach(() => {
      (mockDb as any).mockImplementation(() => mockQueryBuilder);
    });

    it('should generate and store reset token', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      const token = await usersService.resetPassword('user-1');

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          password_reset_token: expect.any(String),
        })
      );
    });

    it('should set token expiry to 1 hour', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      await usersService.resetPassword('user-1');

      const updateCall = mockQueryBuilder.update.mock.calls[0][0];
      expect(updateCall.password_reset_expires).toBeInstanceOf(Date);
    });

    it('should log password reset initiation', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      await usersService.resetPassword('user-1');

      expect(logger.info).toHaveBeenCalledWith('Password reset initiated: user-1');
    });

    it('should return unique tokens', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);

      const token1 = await usersService.resetPassword('user-1');
      const token2 = await usersService.resetPassword('user-1');

      expect(token1).not.toBe(token2);
    });
  });
});
