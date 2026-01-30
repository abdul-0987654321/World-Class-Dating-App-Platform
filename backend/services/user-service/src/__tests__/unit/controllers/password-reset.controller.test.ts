// Mock database connection BEFORE any imports
jest.mock('../../../infrastructure/database/connection', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import { Request, Response } from 'express';
import { PasswordResetController } from '../../../api/controllers/password-reset.controller';
import { PasswordResetService } from '../../../domain/services/password-reset.service';

// Mock the PasswordResetService
jest.mock('../../../domain/services/password-reset.service');

describe('PasswordResetController', () => {
  let passwordResetController: PasswordResetController;
  let mockPasswordResetService: jest.Mocked<PasswordResetService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPasswordResetService = new PasswordResetService() as jest.Mocked<PasswordResetService>;
    passwordResetController = new PasswordResetController();
    (passwordResetController as any).passwordResetService = mockPasswordResetService;

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

  describe('requestReset', () => {
    it('should successfully request password reset', async () => {
      const email = 'test@example.com';
      mockRequest.body = { email };

      mockPasswordResetService.requestPasswordReset = jest.fn().mockResolvedValue(undefined);

      await passwordResetController.requestReset(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockPasswordResetService.requestPasswordReset).toHaveBeenCalledWith(email);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'If an account exists with that email, a password reset link has been sent',
      });
    });

    it('should return 400 when email is missing', async () => {
      mockRequest.body = {};

      await passwordResetController.requestReset(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockPasswordResetService.requestPasswordReset).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Email is required',
      });
    });

    it('should return same message for non-existent email (security)', async () => {
      const email = 'nonexistent@example.com';
      mockRequest.body = { email };

      mockPasswordResetService.requestPasswordReset = jest.fn().mockResolvedValue(undefined);

      await passwordResetController.requestReset(
        mockRequest as Request,
        mockResponse as Response
      );

      // Should not reveal if email exists
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'If an account exists with that email, a password reset link has been sent',
      });
    });

    it('should return 500 for server errors', async () => {
      const email = 'test@example.com';
      mockRequest.body = { email };

      mockPasswordResetService.requestPasswordReset = jest.fn().mockRejectedValue(
        new Error('Email service error')
      );

      await passwordResetController.requestReset(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to process password reset request',
      });
    });
  });

  describe('resetPassword', () => {
    it('should successfully reset password', async () => {
      const resetData = {
        token: 'valid-reset-token',
        newPassword: 'NewPass123!@#',
      };

      mockRequest.body = resetData;
      mockPasswordResetService.resetPassword = jest.fn().mockResolvedValue(undefined);

      await passwordResetController.resetPassword(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockPasswordResetService.resetPassword).toHaveBeenCalledWith(
        resetData.token,
        resetData.newPassword
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Password reset successful',
      });
    });

    it('should return 400 when token is missing', async () => {
      mockRequest.body = {
        newPassword: 'NewPass123!@#',
      };

      await passwordResetController.resetPassword(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockPasswordResetService.resetPassword).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Token and new password are required',
      });
    });

    it('should return 400 when new password is missing', async () => {
      mockRequest.body = {
        token: 'valid-token',
      };

      await passwordResetController.resetPassword(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockPasswordResetService.resetPassword).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid token', async () => {
      mockRequest.body = {
        token: 'invalid-token',
        newPassword: 'NewPass123!@#',
      };

      mockPasswordResetService.resetPassword = jest.fn().mockRejectedValue(
        new Error('Invalid or expired reset token')
      );

      await passwordResetController.resetPassword(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired reset token',
      });
    });

    it('should return 400 for weak password', async () => {
      mockRequest.body = {
        token: 'valid-token',
        newPassword: 'weak',
      };

      mockPasswordResetService.resetPassword = jest.fn().mockRejectedValue(
        new Error('Password must be at least 12 characters long')
      );

      await passwordResetController.resetPassword(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Password must be at least 12 characters long',
      });
    });
  });

  describe('verifyToken', () => {
    it('should successfully verify valid token', async () => {
      const token = 'valid-token';
      mockRequest.body = { token };

      mockPasswordResetService.verifyResetToken = jest.fn().mockResolvedValue(true);

      await passwordResetController.verifyToken(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockPasswordResetService.verifyResetToken).toHaveBeenCalledWith(token);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        valid: true,
      });
    });

    it('should return false for invalid token', async () => {
      const token = 'invalid-token';
      mockRequest.body = { token };

      mockPasswordResetService.verifyResetToken = jest.fn().mockResolvedValue(false);

      await passwordResetController.verifyToken(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        valid: false,
      });
    });

    it('should return 400 when token is missing', async () => {
      mockRequest.body = {};

      await passwordResetController.verifyToken(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockPasswordResetService.verifyResetToken).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Token is required',
      });
    });

    it('should return 500 for server errors', async () => {
      const token = 'some-token';
      mockRequest.body = { token };

      mockPasswordResetService.verifyResetToken = jest.fn().mockRejectedValue(
        new Error('Database error')
      );

      await passwordResetController.verifyToken(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Token verification failed',
      });
    });
  });
});
