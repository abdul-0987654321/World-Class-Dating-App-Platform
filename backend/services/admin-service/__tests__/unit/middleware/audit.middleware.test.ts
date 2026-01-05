import { Response, NextFunction } from 'express';

import { auditLog, queryAuditLogs } from '../../../src/middleware/audit';
import { AdminRole, AuthRequest } from '../../../src/types';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('audit-uuid-1234'),
}));

// Mock the database
jest.mock('../../../src/infrastructure/database', () => {
  const mockDb = jest.fn().mockImplementation((tableName: string) => {
    return {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis(),
      count: jest.fn(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn(),
      insert: jest.fn(),
    };
  });
  mockDb.fn = {
    now: jest.fn().mockReturnValue(new Date('2026-01-04T12:00:00.000Z')),
  };
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
import { v4 as uuidv4 } from 'uuid';

describe('Audit Middleware', () => {
  const mockDb = db as jest.MockedFunction<typeof db>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('auditLog middleware', () => {
    let mockRequest: Partial<AuthRequest>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction;
    let originalJson: jest.Mock;

    const mockQueryBuilder = {
      insert: jest.fn(),
    };

    beforeEach(() => {
      (mockDb as any).mockImplementation(() => mockQueryBuilder);

      originalJson = jest.fn().mockReturnValue({});

      mockRequest = {
        admin: {
          id: 'admin-123',
          email: 'admin@example.com',
          firstName: 'John',
          lastName: 'Admin',
          role: AdminRole.ADMIN,
          permissions: [],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        params: { id: 'resource-456' },
        body: { field: 'value' },
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'x-forwarded-for': '192.168.1.100',
        },
        socket: {
          remoteAddress: '127.0.0.1',
        } as any,
      };

      mockResponse = {
        statusCode: 200,
        json: originalJson,
      };

      nextFunction = jest.fn();
    });

    it('should wrap response.json and log successful actions', async () => {
      mockQueryBuilder.insert.mockResolvedValue([1]);

      const middleware = auditLog('ban_user', 'user');
      await middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.json).toBeDefined();

      // Simulate calling the wrapped json method
      const wrappedJson = mockResponse.json as jest.Mock;
      await wrappedJson({ success: true });

      // Give time for async insert
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockDb).toHaveBeenCalledWith('audit_logs');
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'audit-uuid-1234',
          admin_id: 'admin-123',
          admin_email: 'admin@example.com',
          action: 'ban_user',
          resource: 'user',
          resource_id: 'resource-456',
        })
      );
    });

    it('should not log failed actions (non-2xx status)', async () => {
      mockResponse.statusCode = 400;

      const middleware = auditLog('create_test', 'ab_test');
      await middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      const wrappedJson = mockResponse.json as jest.Mock;
      await wrappedJson({ error: 'Bad request' });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockQueryBuilder.insert).not.toHaveBeenCalled();
    });

    it('should not log when admin is not attached', async () => {
      mockRequest.admin = undefined;

      const middleware = auditLog('some_action', 'resource');
      await middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      const wrappedJson = mockResponse.json as jest.Mock;
      await wrappedJson({ success: true });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockQueryBuilder.insert).not.toHaveBeenCalled();
    });

    it('should extract resourceId from params.id', async () => {
      mockRequest.params = { id: 'param-resource-id' };
      mockRequest.body = {};
      mockQueryBuilder.insert.mockResolvedValue([1]);

      const middleware = auditLog('update', 'test');
      await middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      const wrappedJson = mockResponse.json as jest.Mock;
      await wrappedJson({ success: true });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          resource_id: 'param-resource-id',
        })
      );
    });

    it('should extract resourceId from params.userId', async () => {
      mockRequest.params = { userId: 'user-resource-id' };
      mockRequest.body = {};
      mockQueryBuilder.insert.mockResolvedValue([1]);

      const middleware = auditLog('verify', 'user');
      await middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      const wrappedJson = mockResponse.json as jest.Mock;
      await wrappedJson({ success: true });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          resource_id: 'user-resource-id',
        })
      );
    });

    it('should extract resourceId from body.id', async () => {
      mockRequest.params = {};
      mockRequest.body = { id: 'body-resource-id' };
      mockQueryBuilder.insert.mockResolvedValue([1]);

      const middleware = auditLog('create', 'resource');
      await middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      const wrappedJson = mockResponse.json as jest.Mock;
      await wrappedJson({ success: true });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          resource_id: 'body-resource-id',
        })
      );
    });

    it('should redact sensitive fields from changes', async () => {
      mockRequest.body = {
        username: 'testuser',
        password: 'secret123',
        apiKey: 'key-123',
        normalField: 'normal',
        secretToken: 'token-abc',
      };
      mockQueryBuilder.insert.mockResolvedValue([1]);

      const middleware = auditLog('update', 'user');
      await middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      const wrappedJson = mockResponse.json as jest.Mock;
      await wrappedJson({ success: true });

      await new Promise(resolve => setTimeout(resolve, 10));

      const insertCall = mockQueryBuilder.insert.mock.calls[0][0];
      const changes = JSON.parse(insertCall.changes);

      expect(changes.username).toBe('testuser');
      expect(changes.normalField).toBe('normal');
      expect(changes.password).toBe('[REDACTED]');
      expect(changes.apiKey).toBe('[REDACTED]');
      expect(changes.secretToken).toBe('[REDACTED]');
    });

    it('should get IP from x-forwarded-for header', async () => {
      mockRequest.headers = {
        'x-forwarded-for': '203.0.113.195, 70.41.3.18',
        'user-agent': 'Test Agent',
      };
      mockQueryBuilder.insert.mockResolvedValue([1]);

      const middleware = auditLog('action', 'resource');
      await middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      const wrappedJson = mockResponse.json as jest.Mock;
      await wrappedJson({ success: true });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_address: '203.0.113.195',
        })
      );
    });

    it('should get IP from x-real-ip header as fallback', async () => {
      mockRequest.headers = {
        'x-real-ip': '10.0.0.1',
        'user-agent': 'Test Agent',
      };
      mockQueryBuilder.insert.mockResolvedValue([1]);

      const middleware = auditLog('action', 'resource');
      await middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      const wrappedJson = mockResponse.json as jest.Mock;
      await wrappedJson({ success: true });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_address: '10.0.0.1',
        })
      );
    });

    it('should get IP from socket as final fallback', async () => {
      mockRequest.headers = {};
      mockRequest.socket = { remoteAddress: '192.168.0.1' } as any;
      mockQueryBuilder.insert.mockResolvedValue([1]);

      const middleware = auditLog('action', 'resource');
      await middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      const wrappedJson = mockResponse.json as jest.Mock;
      await wrappedJson({ success: true });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_address: '192.168.0.1',
        })
      );
    });

    it('should handle insert errors gracefully', async () => {
      mockQueryBuilder.insert.mockRejectedValue(new Error('Database error'));

      const middleware = auditLog('action', 'resource');
      await middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      const wrappedJson = mockResponse.json as jest.Mock;
      await wrappedJson({ success: true });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to create audit log:',
        expect.any(Error)
      );
    });

    it('should handle null body gracefully', async () => {
      mockRequest.body = null as any;
      mockQueryBuilder.insert.mockResolvedValue([1]);

      const middleware = auditLog('action', 'resource');
      await middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      const wrappedJson = mockResponse.json as jest.Mock;
      await wrappedJson({ success: true });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          changes: 'null',
        })
      );
    });

    it('should log audit creation info', async () => {
      mockQueryBuilder.insert.mockResolvedValue([1]);

      const middleware = auditLog('test_action', 'test_resource');
      await middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      const wrappedJson = mockResponse.json as jest.Mock;
      await wrappedJson({ success: true });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(logger.info).toHaveBeenCalledWith(
        'Audit log created:',
        expect.objectContaining({
          adminEmail: 'admin@example.com',
          action: 'test_action',
          resource: 'test_resource',
        })
      );
    });
  });

  describe('queryAuditLogs', () => {
    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis(),
      count: jest.fn(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn(),
    };

    beforeEach(() => {
      (mockDb as any).mockImplementation(() => mockQueryBuilder);
    });

    it('should return paginated audit logs', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          admin_id: 'admin-1',
          admin_email: 'admin@test.com',
          action: 'ban_user',
          resource: 'user',
          resource_id: 'user-123',
          changes: JSON.stringify({ reason: 'spam' }),
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          created_at: new Date('2026-01-04T10:00:00Z'),
        },
      ];

      mockQueryBuilder.clone.mockReturnValue({
        count: jest.fn().mockResolvedValue([{ count: '1' }]),
      });
      mockQueryBuilder.offset.mockResolvedValue(mockLogs);

      const result = await queryAuditLogs({});

      expect(result.logs).toHaveLength(1);
      expect(result.logs[0]).toEqual({
        id: 'log-1',
        adminId: 'admin-1',
        adminEmail: 'admin@test.com',
        action: 'ban_user',
        resource: 'user',
        resourceId: 'user-123',
        changes: { reason: 'spam' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date('2026-01-04T10:00:00Z'),
      });
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });

    it('should filter by adminId', async () => {
      mockQueryBuilder.clone.mockReturnValue({
        count: jest.fn().mockResolvedValue([{ count: '0' }]),
      });
      mockQueryBuilder.offset.mockResolvedValue([]);

      await queryAuditLogs({ adminId: 'admin-123' });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('admin_id', 'admin-123');
    });

    it('should filter by action', async () => {
      mockQueryBuilder.clone.mockReturnValue({
        count: jest.fn().mockResolvedValue([{ count: '0' }]),
      });
      mockQueryBuilder.offset.mockResolvedValue([]);

      await queryAuditLogs({ action: 'ban_user' });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('action', 'ban_user');
    });

    it('should filter by resource', async () => {
      mockQueryBuilder.clone.mockReturnValue({
        count: jest.fn().mockResolvedValue([{ count: '0' }]),
      });
      mockQueryBuilder.offset.mockResolvedValue([]);

      await queryAuditLogs({ resource: 'user' });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('resource', 'user');
    });

    it('should filter by date range', async () => {
      mockQueryBuilder.clone.mockReturnValue({
        count: jest.fn().mockResolvedValue([{ count: '0' }]),
      });
      mockQueryBuilder.offset.mockResolvedValue([]);

      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');

      await queryAuditLogs({ startDate, endDate });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('created_at', '>=', startDate);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('created_at', '<=', endDate);
    });

    it('should apply pagination', async () => {
      mockQueryBuilder.clone.mockReturnValue({
        count: jest.fn().mockResolvedValue([{ count: '100' }]),
      });
      mockQueryBuilder.offset.mockResolvedValue([]);

      await queryAuditLogs({ page: 3, limit: 25 });

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(25);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(50); // (3-1) * 25
    });

    it('should order by created_at descending', async () => {
      mockQueryBuilder.clone.mockReturnValue({
        count: jest.fn().mockResolvedValue([{ count: '0' }]),
      });
      mockQueryBuilder.offset.mockResolvedValue([]);

      await queryAuditLogs({});

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('created_at', 'desc');
    });

    it('should handle null changes', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          admin_id: 'admin-1',
          admin_email: 'admin@test.com',
          action: 'view',
          resource: 'user',
          resource_id: 'user-123',
          changes: null,
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          created_at: new Date(),
        },
      ];

      mockQueryBuilder.clone.mockReturnValue({
        count: jest.fn().mockResolvedValue([{ count: '1' }]),
      });
      mockQueryBuilder.offset.mockResolvedValue(mockLogs);

      const result = await queryAuditLogs({});

      expect(result.logs[0].changes).toBeNull();
    });

    it('should combine multiple filters', async () => {
      mockQueryBuilder.clone.mockReturnValue({
        count: jest.fn().mockResolvedValue([{ count: '0' }]),
      });
      mockQueryBuilder.offset.mockResolvedValue([]);

      await queryAuditLogs({
        adminId: 'admin-1',
        action: 'ban_user',
        resource: 'user',
        startDate: new Date('2026-01-01'),
        page: 2,
        limit: 10,
      });

      expect(mockQueryBuilder.where).toHaveBeenCalledTimes(4);
    });

    it('should return correct total count', async () => {
      mockQueryBuilder.clone.mockReturnValue({
        count: jest.fn().mockResolvedValue([{ count: '42' }]),
      });
      mockQueryBuilder.offset.mockResolvedValue([]);

      const result = await queryAuditLogs({});

      expect(result.total).toBe(42);
    });
  });
});
