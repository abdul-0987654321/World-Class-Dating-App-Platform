import express, { Express } from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

import { AdminRole, Permission, ROLE_PERMISSIONS } from '../../../src/types';

// Mock services
jest.mock('../../../src/services/dashboard.service', () => ({
  DashboardService: jest.fn().mockImplementation(() => ({
    getDashboardStats: jest.fn(),
    getRecentActivity: jest.fn(),
  })),
}));

jest.mock('../../../src/services/users.service', () => ({
  UsersService: jest.fn().mockImplementation(() => ({
    searchUsers: jest.fn(),
    getUserDetails: jest.fn(),
    banUser: jest.fn(),
    unbanUser: jest.fn(),
    verifyUser: jest.fn(),
    deleteUser: jest.fn(),
    resetPassword: jest.fn(),
  })),
}));

jest.mock('../../../src/services/health.service', () => ({
  HealthService: jest.fn().mockImplementation(() => ({
    getSystemHealth: jest.fn(),
    getServiceLogs: jest.fn(),
    restartService: jest.fn(),
  })),
}));

jest.mock('../../../src/services/abtest.service', () => ({
  ABTestService: jest.fn().mockImplementation(() => ({
    listTests: jest.fn(),
    getTest: jest.fn(),
    createTest: jest.fn(),
    updateTest: jest.fn(),
    startTest: jest.fn(),
    pauseTest: jest.fn(),
    completeTest: jest.fn(),
    deleteTest: jest.fn(),
    getTestMetrics: jest.fn(),
  })),
}));

jest.mock('../../../src/services/tickets.service', () => ({
  TicketsService: jest.fn().mockImplementation(() => ({
    listTickets: jest.fn(),
    getTicket: jest.fn(),
    assignTicket: jest.fn(),
    addMessage: jest.fn(),
    updateTicketStatus: jest.fn(),
    updateTicketPriority: jest.fn(),
    getTicketStats: jest.fn(),
  })),
}));

// Mock database
jest.mock('../../../src/infrastructure/database', () => {
  const mockDb = jest.fn().mockImplementation((tableName: string) => ({
    where: jest.fn().mockReturnThis(),
    update: jest.fn().mockResolvedValue(1),
    first: jest.fn(),
    insert: jest.fn().mockResolvedValue([1]),
  }));
  mockDb.fn = {
    now: jest.fn().mockReturnValue(new Date()),
  };
  return { db: mockDb };
});

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import router from '../../../src/routes/index';
import { DashboardService } from '../../../src/services/dashboard.service';
import { UsersService } from '../../../src/services/users.service';
import { HealthService } from '../../../src/services/health.service';
import { ABTestService } from '../../../src/services/abtest.service';
import { TicketsService } from '../../../src/services/tickets.service';
import { db } from '../../../src/infrastructure/database';

const JWT_SECRET = process.env.JWT_ADMIN_SECRET!;

describe('Admin Routes', () => {
  let app: Express;
  let mockDashboardService: jest.Mocked<DashboardService>;
  let mockUsersService: jest.Mocked<UsersService>;
  let mockHealthService: jest.Mocked<HealthService>;
  let mockABTestService: jest.Mocked<ABTestService>;
  let mockTicketsService: jest.Mocked<TicketsService>;

  const createToken = (role: AdminRole = AdminRole.SUPER_ADMIN) => {
    return jwt.sign(
      {
        adminId: 'admin-123',
        email: 'admin@example.com',
        role,
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  };

  const mockAdmin = {
    id: 'admin-123',
    email: 'admin@example.com',
    first_name: 'Test',
    last_name: 'Admin',
    role: AdminRole.SUPER_ADMIN,
    is_active: true,
    last_login: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/admin', router);

    // Get mocked service instances
    mockDashboardService = (DashboardService as jest.Mock).mock.results[0]?.value;
    mockUsersService = (UsersService as jest.Mock).mock.results[0]?.value;
    mockHealthService = (HealthService as jest.Mock).mock.results[0]?.value;
    mockABTestService = (ABTestService as jest.Mock).mock.results[0]?.value;
    mockTicketsService = (TicketsService as jest.Mock).mock.results[0]?.value;

    // Setup default db mock for auth
    const mockDbQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(mockAdmin),
      update: jest.fn().mockResolvedValue(1),
      insert: jest.fn().mockResolvedValue([1]),
    };
    (db as any).mockImplementation(() => mockDbQueryBuilder);

    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should reject requests without token', async () => {
      const response = await request(app).get('/admin/dashboard');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/admin/dashboard')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid or expired token');
    });

    it('should accept requests with valid token', async () => {
      const token = createToken();

      // Mock the dashboard service response
      const mockStats = {
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
        revenue: { today: 5000, month: 50000, total: 500000 },
      };

      if (mockDashboardService) {
        mockDashboardService.getDashboardStats.mockResolvedValue(mockStats);
        mockDashboardService.getRecentActivity.mockResolvedValue([]);
      }

      const response = await request(app)
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Dashboard Routes', () => {
    const token = jwt.sign(
      { adminId: 'admin-123', email: 'admin@example.com', role: AdminRole.ADMIN },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    beforeEach(() => {
      const adminWithAnalytics = { ...mockAdmin, role: AdminRole.ADMIN };
      const mockDbQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(adminWithAnalytics),
        update: jest.fn().mockResolvedValue(1),
        insert: jest.fn().mockResolvedValue([1]),
      };
      (db as any).mockImplementation(() => mockDbQueryBuilder);
    });

    it('GET /dashboard should return stats and activities', async () => {
      const mockStats = {
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
        revenue: { today: 5000, month: 50000, total: 500000 },
      };
      const mockActivities = [
        { id: 'act-1', type: 'login', description: 'User logged in', timestamp: new Date(), userId: 'user-1' },
      ];

      if (mockDashboardService) {
        mockDashboardService.getDashboardStats.mockResolvedValue(mockStats);
        mockDashboardService.getRecentActivity.mockResolvedValue(mockActivities);
      }

      const response = await request(app)
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.stats).toEqual(mockStats);
      expect(response.body.data.activities).toEqual(mockActivities);
    });

    it('GET /dashboard should accept time range parameter', async () => {
      if (mockDashboardService) {
        mockDashboardService.getDashboardStats.mockResolvedValue({} as any);
        mockDashboardService.getRecentActivity.mockResolvedValue([]);
      }

      await request(app)
        .get('/admin/dashboard?range=week')
        .set('Authorization', `Bearer ${token}`);

      expect(mockDashboardService?.getDashboardStats).toHaveBeenCalledWith('week');
    });
  });

  describe('User Management Routes', () => {
    const token = jwt.sign(
      { adminId: 'admin-123', email: 'admin@example.com', role: AdminRole.SUPER_ADMIN },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    it('GET /users should return paginated users', async () => {
      const mockResult = {
        users: [{ id: 'user-1', email: 'test@test.com' }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      if (mockUsersService) {
        mockUsersService.searchUsers.mockResolvedValue(mockResult);
      }

      const response = await request(app)
        .get('/admin/users')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockResult);
    });

    it('GET /users/:userId should return user details', async () => {
      const mockUser = { id: 'user-1', email: 'test@test.com', matchCount: 5 };

      if (mockUsersService) {
        mockUsersService.getUserDetails.mockResolvedValue(mockUser);
      }

      const response = await request(app)
        .get('/admin/users/user-1')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockUser);
    });

    it('POST /users/:userId/ban should ban a user', async () => {
      if (mockUsersService) {
        mockUsersService.banUser.mockResolvedValue(undefined);
      }

      const response = await request(app)
        .post('/admin/users/user-1/ban')
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'Spam', duration: 86400 });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User banned successfully');
      expect(mockUsersService?.banUser).toHaveBeenCalledWith('user-1', 'Spam', 86400);
    });

    it('POST /users/:userId/unban should unban a user', async () => {
      if (mockUsersService) {
        mockUsersService.unbanUser.mockResolvedValue(undefined);
      }

      const response = await request(app)
        .post('/admin/users/user-1/unban')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User unbanned successfully');
    });

    it('POST /users/:userId/verify should verify a user', async () => {
      if (mockUsersService) {
        mockUsersService.verifyUser.mockResolvedValue(undefined);
      }

      const response = await request(app)
        .post('/admin/users/user-1/verify')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User verified successfully');
    });

    it('DELETE /users/:userId should delete a user', async () => {
      if (mockUsersService) {
        mockUsersService.deleteUser.mockResolvedValue(undefined);
      }

      const response = await request(app)
        .delete('/admin/users/user-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'User request' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User deleted successfully');
    });

    it('POST /users/:userId/reset-password should initiate password reset', async () => {
      if (mockUsersService) {
        mockUsersService.resetPassword.mockResolvedValue('reset-token-123');
      }

      const response = await request(app)
        .post('/admin/users/user-1/reset-password')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.resetToken).toBe('reset-token-123');
    });
  });

  describe('Health Routes', () => {
    const token = jwt.sign(
      { adminId: 'admin-123', email: 'admin@example.com', role: AdminRole.ADMIN },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    beforeEach(() => {
      const adminWithHealth = { ...mockAdmin, role: AdminRole.ADMIN };
      const mockDbQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(adminWithHealth),
        update: jest.fn().mockResolvedValue(1),
        insert: jest.fn().mockResolvedValue([1]),
      };
      (db as any).mockImplementation(() => mockDbQueryBuilder);
    });

    it('GET /health should return system health', async () => {
      const mockHealth = {
        status: 'healthy' as const,
        services: [],
        database: { status: 'up' as const, connections: 10, latency: 5 },
        redis: { status: 'up' as const, memory: 1000, latency: 2 },
        metrics: { cpu: 25, memory: 50, disk: 0 },
      };

      if (mockHealthService) {
        mockHealthService.getSystemHealth.mockResolvedValue(mockHealth);
      }

      const response = await request(app)
        .get('/admin/health')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockHealth);
    });

    it('GET /health/services/:serviceName/logs should return service logs', async () => {
      const mockLogs = { serviceName: 'user-service', logs: [], limit: 100 };

      if (mockHealthService) {
        mockHealthService.getServiceLogs.mockResolvedValue(mockLogs);
      }

      const response = await request(app)
        .get('/admin/health/services/user-service/logs')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockLogs);
    });
  });

  describe('A/B Test Routes', () => {
    const token = jwt.sign(
      { adminId: 'admin-123', email: 'admin@example.com', role: AdminRole.SUPER_ADMIN },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    it('GET /ab-tests should return paginated tests', async () => {
      const mockResult = {
        tests: [{ id: 'test-1', name: 'Test 1' }],
        total: 1,
        page: 1,
        limit: 20,
      };

      if (mockABTestService) {
        mockABTestService.listTests.mockResolvedValue(mockResult);
      }

      const response = await request(app)
        .get('/admin/ab-tests')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockResult);
    });

    it('GET /ab-tests/:testId should return test details', async () => {
      const mockTest = {
        id: 'test-1',
        name: 'Test 1',
        description: 'Description',
        status: 'running' as const,
        variants: [],
        metrics: { primaryMetric: 'conversion', secondaryMetrics: [] },
        createdBy: 'admin-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (mockABTestService) {
        mockABTestService.getTest.mockResolvedValue(mockTest);
      }

      const response = await request(app)
        .get('/admin/ab-tests/test-1')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });

    it('POST /ab-tests should create a new test', async () => {
      const testData = {
        name: 'New Test',
        description: 'Test description',
        variants: [
          { name: 'Control', description: 'Original', allocation: 50 },
          { name: 'Variant A', description: 'New', allocation: 50 },
        ],
        metrics: { primaryMetric: 'clicks', secondaryMetrics: [] },
      };

      if (mockABTestService) {
        mockABTestService.createTest.mockResolvedValue({
          id: 'new-test',
          ...testData,
          status: 'draft',
          createdBy: 'admin-123',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);
      }

      const response = await request(app)
        .post('/admin/ab-tests')
        .set('Authorization', `Bearer ${token}`)
        .send(testData);

      expect(response.status).toBe(200);
    });

    it('POST /ab-tests/:testId/start should start a test', async () => {
      if (mockABTestService) {
        mockABTestService.startTest.mockResolvedValue(undefined);
      }

      const response = await request(app)
        .post('/admin/ab-tests/test-1/start')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('A/B test started');
    });

    it('POST /ab-tests/:testId/pause should pause a test', async () => {
      if (mockABTestService) {
        mockABTestService.pauseTest.mockResolvedValue(undefined);
      }

      const response = await request(app)
        .post('/admin/ab-tests/test-1/pause')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('A/B test paused');
    });

    it('DELETE /ab-tests/:testId should delete a test', async () => {
      if (mockABTestService) {
        mockABTestService.deleteTest.mockResolvedValue(undefined);
      }

      const response = await request(app)
        .delete('/admin/ab-tests/test-1')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('A/B test deleted');
    });
  });

  describe('Ticket Routes', () => {
    const token = jwt.sign(
      { adminId: 'admin-123', email: 'admin@example.com', role: AdminRole.SUPPORT },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    beforeEach(() => {
      const supportAdmin = { ...mockAdmin, role: AdminRole.SUPPORT };
      const mockDbQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(supportAdmin),
        update: jest.fn().mockResolvedValue(1),
        insert: jest.fn().mockResolvedValue([1]),
      };
      (db as any).mockImplementation(() => mockDbQueryBuilder);
    });

    it('GET /tickets should return paginated tickets', async () => {
      const mockResult = {
        tickets: [{ id: 'ticket-1', subject: 'Help needed' }],
        total: 1,
        page: 1,
        limit: 20,
      };

      if (mockTicketsService) {
        mockTicketsService.listTickets.mockResolvedValue(mockResult);
      }

      const response = await request(app)
        .get('/admin/tickets')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockResult);
    });

    it('GET /tickets/stats should return ticket statistics', async () => {
      const mockStats = {
        open: 10,
        inProgress: 5,
        waitingUser: 3,
        resolved: 20,
        byPriority: { high: 5, medium: 10, low: 3 },
        avgResponseTime: 3600,
      };

      if (mockTicketsService) {
        mockTicketsService.getTicketStats.mockResolvedValue(mockStats);
      }

      const response = await request(app)
        .get('/admin/tickets/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockStats);
    });

    it('POST /tickets/:ticketId/assign should assign a ticket', async () => {
      if (mockTicketsService) {
        mockTicketsService.assignTicket.mockResolvedValue(undefined);
      }

      const response = await request(app)
        .post('/admin/tickets/ticket-1/assign')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Ticket assigned successfully');
    });

    it('POST /tickets/:ticketId/messages should add a message', async () => {
      if (mockTicketsService) {
        mockTicketsService.addMessage.mockResolvedValue(undefined);
      }

      const response = await request(app)
        .post('/admin/tickets/ticket-1/messages')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Here is help' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Message added successfully');
    });
  });

  describe('Permission Checks', () => {
    it('should deny access to users without required permission', async () => {
      // Analyst role doesn't have USER_BAN permission
      const analystToken = jwt.sign(
        { adminId: 'admin-123', email: 'analyst@example.com', role: AdminRole.ANALYST },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const analystAdmin = { ...mockAdmin, role: AdminRole.ANALYST };
      const mockDbQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(analystAdmin),
        update: jest.fn().mockResolvedValue(1),
      };
      (db as any).mockImplementation(() => mockDbQueryBuilder);

      const response = await request(app)
        .post('/admin/users/user-1/ban')
        .set('Authorization', `Bearer ${analystToken}`)
        .send({ reason: 'Test' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
    });
  });

  describe('Error Handling', () => {
    const token = jwt.sign(
      { adminId: 'admin-123', email: 'admin@example.com', role: AdminRole.SUPER_ADMIN },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    it('should handle service errors gracefully', async () => {
      if (mockUsersService) {
        mockUsersService.getUserDetails.mockRejectedValue(new Error('User not found'));
      }

      const response = await request(app)
        .get('/admin/users/non-existent')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User not found');
    });

    it('should return 500 for unexpected errors', async () => {
      if (mockDashboardService) {
        mockDashboardService.getDashboardStats.mockRejectedValue(new Error('Database connection lost'));
      }

      const response = await request(app)
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });
});
