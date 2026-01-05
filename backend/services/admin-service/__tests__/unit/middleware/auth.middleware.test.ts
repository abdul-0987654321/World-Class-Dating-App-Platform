import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import {
  authenticateAdmin,
  requirePermission,
  requireRole,
  canAccessUserData,
  generateAdminToken,
} from '../../../src/middleware/auth';
import { AdminRole, Permission, AuthRequest, ROLE_PERMISSIONS } from '../../../src/types';

// Mock the database
jest.mock('../../../src/infrastructure/database', () => {
  const mockDb = jest.fn().mockImplementation((tableName: string) => {
    return {
      where: jest.fn().mockReturnThis(),
      update: jest.fn(),
      first: jest.fn(),
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

const JWT_SECRET = process.env.JWT_ADMIN_SECRET!;

describe('Auth Middleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  const mockDb = db as jest.MockedFunction<typeof db>;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      params: {},
      body: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticateAdmin', () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      update: jest.fn(),
      first: jest.fn(),
    };

    beforeEach(() => {
      (mockDb as any).mockImplementation(() => mockQueryBuilder);
    });

    it('should authenticate valid admin token', async () => {
      const token = jwt.sign(
        {
          adminId: 'admin-123',
          email: 'admin@example.com',
          role: AdminRole.ADMIN,
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      mockRequest.headers = { authorization: `Bearer ${token}` };

      const mockAdmin = {
        id: 'admin-123',
        email: 'admin@example.com',
        first_name: 'John',
        last_name: 'Admin',
        role: AdminRole.ADMIN,
        is_active: true,
        last_login: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQueryBuilder.first.mockResolvedValue(mockAdmin);
      mockQueryBuilder.update.mockResolvedValue(1);

      await authenticateAdmin(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.admin).toBeDefined();
      expect(mockRequest.admin?.id).toBe('admin-123');
      expect(mockRequest.admin?.email).toBe('admin@example.com');
      expect(mockRequest.admin?.role).toBe(AdminRole.ADMIN);
    });

    it('should reject request without token', async () => {
      mockRequest.headers = {};

      await authenticateAdmin(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication required',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      mockRequest.headers = { authorization: 'Bearer invalid-token' };

      await authenticateAdmin(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token',
      });
      expect(logger.error).toHaveBeenCalled();
    });

    it('should reject expired token', async () => {
      const token = jwt.sign(
        {
          adminId: 'admin-123',
          email: 'admin@example.com',
          role: AdminRole.ADMIN,
        },
        JWT_SECRET,
        { expiresIn: '-1h' } // Already expired
      );

      mockRequest.headers = { authorization: `Bearer ${token}` };

      await authenticateAdmin(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token',
      });
    });

    it('should reject token for non-existent admin', async () => {
      const token = jwt.sign(
        {
          adminId: 'admin-123',
          email: 'admin@example.com',
          role: AdminRole.ADMIN,
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      mockRequest.headers = { authorization: `Bearer ${token}` };
      mockQueryBuilder.first.mockResolvedValue(null);

      await authenticateAdmin(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token',
      });
    });

    it('should reject token for inactive admin', async () => {
      const token = jwt.sign(
        {
          adminId: 'admin-123',
          email: 'admin@example.com',
          role: AdminRole.ADMIN,
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      mockRequest.headers = { authorization: `Bearer ${token}` };

      // Query with is_active: true should return null for inactive admin
      mockQueryBuilder.first.mockResolvedValue(null);

      await authenticateAdmin(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('should update last activity on successful auth', async () => {
      const token = jwt.sign(
        {
          adminId: 'admin-123',
          email: 'admin@example.com',
          role: AdminRole.ADMIN,
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      mockRequest.headers = { authorization: `Bearer ${token}` };

      const mockAdmin = {
        id: 'admin-123',
        email: 'admin@example.com',
        first_name: 'John',
        last_name: 'Admin',
        role: AdminRole.ADMIN,
        is_active: true,
      };

      mockQueryBuilder.first.mockResolvedValue(mockAdmin);
      mockQueryBuilder.update.mockResolvedValue(1);

      await authenticateAdmin(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockDb).toHaveBeenCalledWith('admins');
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        last_activity: expect.anything(),
      });
    });

    it('should attach correct permissions based on role', async () => {
      const token = jwt.sign(
        {
          adminId: 'admin-123',
          email: 'admin@example.com',
          role: AdminRole.SUPER_ADMIN,
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      mockRequest.headers = { authorization: `Bearer ${token}` };

      const mockAdmin = {
        id: 'admin-123',
        email: 'admin@example.com',
        first_name: 'Super',
        last_name: 'Admin',
        role: AdminRole.SUPER_ADMIN,
        is_active: true,
      };

      mockQueryBuilder.first.mockResolvedValue(mockAdmin);
      mockQueryBuilder.update.mockResolvedValue(1);

      await authenticateAdmin(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.admin?.permissions).toEqual(ROLE_PERMISSIONS[AdminRole.SUPER_ADMIN]);
    });
  });

  describe('requirePermission', () => {
    it('should allow access when admin has permission', () => {
      mockRequest.admin = {
        id: 'admin-123',
        email: 'admin@example.com',
        firstName: 'John',
        lastName: 'Admin',
        role: AdminRole.ADMIN,
        permissions: [Permission.USER_VIEW, Permission.USER_EDIT],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const middleware = requirePermission(Permission.USER_VIEW);
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should deny access when admin lacks permission', () => {
      mockRequest.admin = {
        id: 'admin-123',
        email: 'admin@example.com',
        firstName: 'John',
        lastName: 'Admin',
        role: AdminRole.SUPPORT,
        permissions: [Permission.TICKET_VIEW],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const middleware = requirePermission(Permission.USER_DELETE);
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        required: Permission.USER_DELETE,
      });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should return 401 when no admin attached', () => {
      mockRequest.admin = undefined;

      const middleware = requirePermission(Permission.USER_VIEW);
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication required',
      });
    });
  });

  describe('requireRole', () => {
    it('should allow access for exact role match', () => {
      mockRequest.admin = {
        id: 'admin-123',
        email: 'admin@example.com',
        firstName: 'John',
        lastName: 'Admin',
        role: AdminRole.MODERATOR,
        permissions: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const middleware = requireRole(AdminRole.MODERATOR);
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should allow access for higher role', () => {
      mockRequest.admin = {
        id: 'admin-123',
        email: 'admin@example.com',
        firstName: 'Super',
        lastName: 'Admin',
        role: AdminRole.SUPER_ADMIN,
        permissions: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const middleware = requireRole(AdminRole.MODERATOR);
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should deny access for lower role', () => {
      mockRequest.admin = {
        id: 'admin-123',
        email: 'analyst@example.com',
        firstName: 'Data',
        lastName: 'Analyst',
        role: AdminRole.ANALYST,
        permissions: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const middleware = requireRole(AdminRole.ADMIN);
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Insufficient role',
        required: AdminRole.ADMIN,
        current: AdminRole.ANALYST,
      });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should return 401 when no admin attached', () => {
      mockRequest.admin = undefined;

      const middleware = requireRole(AdminRole.ADMIN);
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('should follow role hierarchy correctly', () => {
      // Test SUPER_ADMIN > ADMIN > MODERATOR > SUPPORT > ANALYST
      const roleTests = [
        { userRole: AdminRole.SUPER_ADMIN, requiredRole: AdminRole.ADMIN, shouldPass: true },
        { userRole: AdminRole.ADMIN, requiredRole: AdminRole.SUPER_ADMIN, shouldPass: false },
        { userRole: AdminRole.MODERATOR, requiredRole: AdminRole.SUPPORT, shouldPass: true },
        { userRole: AdminRole.SUPPORT, requiredRole: AdminRole.MODERATOR, shouldPass: false },
        { userRole: AdminRole.ANALYST, requiredRole: AdminRole.ANALYST, shouldPass: true },
      ];

      roleTests.forEach(({ userRole, requiredRole, shouldPass }) => {
        jest.clearAllMocks();
        mockRequest.admin = {
          id: 'admin-123',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: userRole,
          permissions: [],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const middleware = requireRole(requiredRole);
        middleware(
          mockRequest as AuthRequest,
          mockResponse as Response,
          nextFunction
        );

        if (shouldPass) {
          expect(nextFunction).toHaveBeenCalled();
        } else {
          expect(mockResponse.status).toHaveBeenCalledWith(403);
        }
      });
    });
  });

  describe('canAccessUserData', () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      first: jest.fn(),
    };

    beforeEach(() => {
      (mockDb as any).mockImplementation(() => mockQueryBuilder);
    });

    it('should allow super admin to access any user', async () => {
      mockRequest.admin = {
        id: 'admin-123',
        email: 'super@example.com',
        firstName: 'Super',
        lastName: 'Admin',
        role: AdminRole.SUPER_ADMIN,
        permissions: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRequest.params = { userId: 'user-456' };

      await canAccessUserData(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockDb).not.toHaveBeenCalled(); // Should skip user check for super admin
    });

    it('should check user existence for non-super admin', async () => {
      mockRequest.admin = {
        id: 'admin-123',
        email: 'admin@example.com',
        firstName: 'Regular',
        lastName: 'Admin',
        role: AdminRole.ADMIN,
        permissions: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRequest.params = { userId: 'user-456' };

      mockQueryBuilder.first.mockResolvedValue({ id: 'user-456' });

      await canAccessUserData(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockDb).toHaveBeenCalledWith('users');
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should return 404 when user not found', async () => {
      mockRequest.admin = {
        id: 'admin-123',
        email: 'admin@example.com',
        firstName: 'Regular',
        lastName: 'Admin',
        role: AdminRole.ADMIN,
        permissions: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRequest.params = { userId: 'non-existent' };

      mockQueryBuilder.first.mockResolvedValue(null);

      await canAccessUserData(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should return 400 when userId is missing', async () => {
      mockRequest.admin = {
        id: 'admin-123',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: AdminRole.ADMIN,
        permissions: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRequest.params = {};
      mockRequest.body = {};

      await canAccessUserData(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'User ID required' });
    });

    it('should accept userId from body if not in params', async () => {
      mockRequest.admin = {
        id: 'admin-123',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: AdminRole.ADMIN,
        permissions: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRequest.params = {};
      mockRequest.body = { userId: 'user-789' };

      mockQueryBuilder.first.mockResolvedValue({ id: 'user-789' });

      await canAccessUserData(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: 'user-789' });
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('generateAdminToken', () => {
    it('should generate valid JWT token', () => {
      const admin = {
        id: 'admin-123',
        email: 'admin@example.com',
        role: AdminRole.ADMIN,
      };

      const token = generateAdminToken(admin);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      // Verify token can be decoded
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      expect(decoded.adminId).toBe('admin-123');
      expect(decoded.email).toBe('admin@example.com');
      expect(decoded.role).toBe(AdminRole.ADMIN);
    });

    it('should include expiration in token', () => {
      const admin = {
        id: 'admin-123',
        email: 'admin@example.com',
        role: AdminRole.ADMIN,
      };

      const token = generateAdminToken(admin);
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });

    it('should generate different tokens for different admins', () => {
      const admin1 = { id: 'admin-1', email: 'admin1@example.com', role: AdminRole.ADMIN };
      const admin2 = { id: 'admin-2', email: 'admin2@example.com', role: AdminRole.SUPPORT };

      const token1 = generateAdminToken(admin1);
      const token2 = generateAdminToken(admin2);

      expect(token1).not.toBe(token2);
    });

    it('should encode role correctly', () => {
      const roles = [
        AdminRole.SUPER_ADMIN,
        AdminRole.ADMIN,
        AdminRole.MODERATOR,
        AdminRole.SUPPORT,
        AdminRole.ANALYST,
      ];

      roles.forEach(role => {
        const admin = { id: 'admin-123', email: 'admin@example.com', role };
        const token = generateAdminToken(admin);
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        expect(decoded.role).toBe(role);
      });
    });
  });
});
