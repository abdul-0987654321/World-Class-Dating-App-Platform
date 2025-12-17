/// <reference types="jest" />
// Mock database connection BEFORE any imports
jest.mock('../../../infrastructure/database/connection', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import { Request, Response } from 'express';
import { AuthController } from '../../../api/controllers/auth.controller';
import { AuthService } from '../../../domain/services/auth.service';
import { createMockUser } from '../../helpers/test-data';

// Mock the AuthService
jest.mock('../../../domain/services/auth.service');

describe('AuthController', () => {
  let authController: AuthController;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAuthService = new AuthService() as jest.Mocked<AuthService>;
    authController = new AuthController();
    (authController as any).authService = mockAuthService;

    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn().mockReturnThis();

    mockRequest = {
      body: {},
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const registerData = {
        email: 'test@example.com',
        password: 'Test123!@#',
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1995-01-01',
        gender: 'male',
      };

      const mockUser = createMockUser({
        email: registerData.email,
        first_name: registerData.first_name,
      });

      const mockAuthResponse = {
        user: mockUser,
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      };

      mockRequest.body = registerData;
      mockAuthService.register = jest.fn().mockResolvedValue(mockAuthResponse);

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.register).toHaveBeenCalledWith(registerData);
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'User registered successfully',
        data: mockAuthResponse,
      });
    });

    it('should return 400 for validation error', async () => {
      mockRequest.body = {
        email: 'invalid-email',
        password: 'weak',
      };

      mockAuthService.register = jest.fn().mockRejectedValue(
        new Error('Validation failed')
      );

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
      });
    });

    it('should return 400 for duplicate email', async () => {
      mockRequest.body = {
        email: 'existing@example.com',
        password: 'Test123!@#',
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1995-01-01',
        gender: 'male',
      };

      mockAuthService.register = jest.fn().mockRejectedValue(
        new Error('Email already registered')
      );

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Email already registered',
      });
    });

    it('should return 400 for server errors', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'Test123!@#',
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1995-01-01',
        gender: 'male',
      };

      mockAuthService.register = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      );

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Database connection failed',
      });
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'Test123!@#',
      };

      const mockUser = createMockUser({ email: loginData.email });
      const mockAuthResponse = {
        user: mockUser,
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      };

      mockRequest.body = loginData;
      mockAuthService.login = jest.fn().mockResolvedValue(mockAuthResponse);

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.login).toHaveBeenCalledWith(loginData);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Login successful',
        data: mockAuthResponse,
      });
    });

    it('should return 401 when email is missing', async () => {
      mockRequest.body = {
        password: 'Test123!@#',
      };

      mockAuthService.login = jest.fn().mockRejectedValue(
        new Error('Invalid credentials')
      );

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.login).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid credentials',
      });
    });

    it('should return 401 when password is missing', async () => {
      mockRequest.body = {
        email: 'test@example.com',
      };

      mockAuthService.login = jest.fn().mockRejectedValue(
        new Error('Invalid credentials')
      );

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.login).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid credentials',
      });
    });

    it('should return 401 for invalid credentials', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'WrongPassword123!',
      };

      mockAuthService.login = jest.fn().mockRejectedValue(
        new Error('Invalid email or password')
      );

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid email or password',
      });
    });

    it('should return 401 for deactivated account', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'Test123!@#',
      };

      mockAuthService.login = jest.fn().mockRejectedValue(
        new Error('Account is deactivated')
      );

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Account is deactivated',
      });
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh tokens', async () => {
      const refreshToken = 'valid_refresh_token';
      const mockTokenResponse = {
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
      };

      mockRequest.body = { refreshToken };
      mockAuthService.refreshToken = jest.fn().mockResolvedValue(mockTokenResponse);

      await authController.refreshToken(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(refreshToken);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Token refreshed successfully',
        data: mockTokenResponse,
      });
    });

    it('should return 400 when refresh token is missing', async () => {
      mockRequest.body = {};

      await authController.refreshToken(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Refresh token is required',
      });
    });

    it('should return 401 for invalid refresh token', async () => {
      mockRequest.body = { refreshToken: 'invalid_token' };

      mockAuthService.refreshToken = jest.fn().mockRejectedValue(
        new Error('Invalid refresh token')
      );

      await authController.refreshToken(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid refresh token',
      });
    });

    it('should return 401 for expired refresh token', async () => {
      mockRequest.body = { refreshToken: 'expired_token' };

      mockAuthService.refreshToken = jest.fn().mockRejectedValue(
        new Error('Token expired')
      );

      await authController.refreshToken(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
    });
  });
});
