import { Request, Response } from 'express';
import { authController } from '../../../src/api/controllers/auth.controller';
import authService from '../../../src/domain/services/auth.service';

// Mock the auth service
jest.mock('../../../src/domain/services/auth.service');
jest.mock('../../../src/utils/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('AuthController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;

  beforeEach(() => {
    responseJson = jest.fn();
    responseStatus = jest.fn().mockReturnValue({ json: responseJson });

    mockRequest = {
      body: {},
      headers: {},
      user: undefined,
    };

    mockResponse = {
      status: responseStatus,
      json: responseJson,
    };

    jest.clearAllMocks();
  });

  describe('register', () => {
    const registrationData = {
      email: 'newuser@example.com',
      password: 'Password123!',
      first_name: 'John',
      last_name: 'Doe',
      date_of_birth: '1990-01-01',
      gender: 'male',
    };

    it('should return 201 on successful registration', async () => {
      const mockResult = {
        user: { id: 'user-123', email: 'newuser@example.com' },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockRequest.body = registrationData;
      (authService.register as jest.Mock).mockResolvedValue(mockResult);

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(201);
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        message: 'Registration successful. Please verify your email.',
        data: mockResult,
      });
    });

    it('should return 400 on registration failure', async () => {
      mockRequest.body = registrationData;
      (authService.register as jest.Mock).mockRejectedValue(new Error('Email already exists'));

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: 'Email already exists',
      });
    });
  });

  describe('login', () => {
    const loginData = {
      email: 'user@example.com',
      password: 'Password123!',
    };

    it('should return 200 on successful login', async () => {
      const mockResult = {
        user: { id: 'user-123', email: 'user@example.com' },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockRequest.body = loginData;
      (authService.login as jest.Mock).mockResolvedValue(mockResult);

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        message: 'Login successful',
        data: mockResult,
      });
    });

    it('should return 401 for invalid credentials', async () => {
      mockRequest.body = loginData;
      (authService.login as jest.Mock).mockRejectedValue(new Error('Invalid credentials'));

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid credentials',
      });
    });

    it('should return specific message for deactivated account', async () => {
      mockRequest.body = loginData;
      (authService.login as jest.Mock).mockRejectedValue(new Error('Account is deactivated'));

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: 'Account is deactivated',
      });
    });
  });

  describe('logout', () => {
    it('should return 200 on successful logout', async () => {
      mockRequest.user = { userId: 'user-123', email: 'user@example.com' } as any;
      mockRequest.headers = { authorization: 'Bearer access-token' };
      (authService.logout as jest.Mock).mockResolvedValue(undefined);

      await authController.logout(mockRequest as any, mockResponse as Response);

      expect(authService.logout).toHaveBeenCalledWith('user-123', 'access-token');
      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        message: 'Logout successful',
      });
    });

    it('should return 500 on logout failure', async () => {
      mockRequest.user = { userId: 'user-123', email: 'user@example.com' } as any;
      mockRequest.headers = { authorization: 'Bearer access-token' };
      (authService.logout as jest.Mock).mockRejectedValue(new Error('Logout failed'));

      await authController.logout(mockRequest as any, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('refreshToken', () => {
    it('should return 200 with new tokens', async () => {
      const mockTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      mockRequest.body = { refreshToken: 'old-refresh-token' };
      (authService.refreshToken as jest.Mock).mockResolvedValue(mockTokens);

      await authController.refreshToken(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        message: 'Token refreshed successfully',
        data: mockTokens,
      });
    });

    it('should return 400 if refresh token is missing', async () => {
      mockRequest.body = {};

      await authController.refreshToken(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: 'Refresh token is required',
      });
    });

    it('should return 401 for invalid refresh token', async () => {
      mockRequest.body = { refreshToken: 'invalid-token' };
      (authService.refreshToken as jest.Mock).mockRejectedValue(new Error('Invalid token'));

      await authController.refreshToken(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(401);
    });
  });

  describe('verifyEmail', () => {
    it('should return 200 on successful verification', async () => {
      mockRequest.body = { token: 'valid-verification-token' };
      (authService.verifyEmail as jest.Mock).mockResolvedValue(undefined);

      await authController.verifyEmail(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        message: 'Email verified successfully',
      });
    });

    it('should return 400 if token is missing', async () => {
      mockRequest.body = {};

      await authController.verifyEmail(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: 'Verification token is required',
      });
    });

    it('should return 400 for invalid token', async () => {
      mockRequest.body = { token: 'invalid-token' };
      (authService.verifyEmail as jest.Mock).mockRejectedValue(
        new Error('Invalid or expired verification token')
      );

      await authController.verifyEmail(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('forgotPassword', () => {
    it('should return 200 regardless of email existence', async () => {
      mockRequest.body = { email: 'user@example.com' };
      (authService.requestPasswordReset as jest.Mock).mockResolvedValue(undefined);

      await authController.forgotPassword(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        message: 'If an account exists with this email, a password reset link will be sent',
      });
    });

    it('should return 400 if email is missing', async () => {
      mockRequest.body = {};

      await authController.forgotPassword(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: 'Email is required',
      });
    });
  });

  describe('resetPassword', () => {
    it('should return 200 on successful password reset', async () => {
      mockRequest.body = { token: 'reset-token', newPassword: 'NewPassword123!' };
      (authService.resetPassword as jest.Mock).mockResolvedValue(undefined);

      await authController.resetPassword(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        message: 'Password reset successfully',
      });
    });

    it('should return 400 if token or password is missing', async () => {
      mockRequest.body = { token: 'reset-token' };

      await authController.resetPassword(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: 'Token and new password are required',
      });
    });
  });

  describe('me', () => {
    it('should return user info for authenticated user', async () => {
      const mockUser = { id: 'user-123', email: 'user@example.com', first_name: 'John' };

      mockRequest.user = { userId: 'user-123', email: 'user@example.com' } as any;
      (authService.getUserById as jest.Mock).mockResolvedValue(mockUser);

      await authController.me(mockRequest as any, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: mockUser,
      });
    });

    it('should return 404 if user not found', async () => {
      mockRequest.user = { userId: 'user-123', email: 'user@example.com' } as any;
      (authService.getUserById as jest.Mock).mockResolvedValue(null);

      await authController.me(mockRequest as any, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: 'User not found',
      });
    });
  });

  describe('validateToken', () => {
    it('should return valid user for valid token', async () => {
      const mockUser = { id: 'user-123', email: 'user@example.com' };

      mockRequest.body = { token: 'valid-access-token' };
      (authService.validateToken as jest.Mock).mockResolvedValue(mockUser);

      await authController.validateToken(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: { valid: true, user: mockUser },
      });
    });

    it('should return 400 if token is missing', async () => {
      mockRequest.body = {};

      await authController.validateToken(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: 'Token is required',
      });
    });

    it('should return 401 for invalid token', async () => {
      mockRequest.body = { token: 'invalid-token' };
      (authService.validateToken as jest.Mock).mockResolvedValue(null);

      await authController.validateToken(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid token',
      });
    });
  });
});
