/**
 * Unit tests for Boost Controller
 * Tests boost activation, retrieval, stats, history, and cancellation
 */

import { Request, Response } from 'express';
import { BoostController } from '../../../src/api/controllers/boost.controller';
import boostService from '../../../src/domain/services/boost.service';

jest.mock('../../../src/domain/services/boost.service');
jest.mock('@flamoral/backend-shared', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
  ServiceClient: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  })),
}));

describe('BoostController', () => {
  let boostController: BoostController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  const userId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    boostController = new BoostController();

    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn().mockReturnThis();

    mockRequest = {
      params: {},
      query: {},
      body: {},
      user: { userId } as any,
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };
  });

  describe('activateBoost', () => {
    it('should activate boost successfully', async () => {
      const mockBoost = {
        id: 'boost-123',
        userId,
        duration: 30,
        activatedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        isActive: true,
      };

      mockRequest.body = {
        duration: 30,
        paymentId: 'payment-123',
      };

      (boostService.activateBoost as jest.Mock).mockResolvedValue(mockBoost);

      await boostController.activateBoost(mockRequest as Request, mockResponse as Response);

      expect(boostService.activateBoost).toHaveBeenCalledWith({
        userId,
        duration: 30,
        paymentId: 'payment-123',
      });
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockBoost,
      });
    });

    it('should activate boost with 60-minute duration', async () => {
      const mockBoost = {
        id: 'boost-456',
        userId,
        duration: 60,
        activatedAt: new Date(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        isActive: true,
      };

      mockRequest.body = {
        duration: 60,
        paymentId: 'payment-456',
      };

      (boostService.activateBoost as jest.Mock).mockResolvedValue(mockBoost);

      await boostController.activateBoost(mockRequest as Request, mockResponse as Response);

      expect(boostService.activateBoost).toHaveBeenCalledWith({
        userId,
        duration: 60,
        paymentId: 'payment-456',
      });
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should return 400 when activation fails', async () => {
      mockRequest.body = {
        duration: 30,
        paymentId: 'invalid-payment',
      };

      (boostService.activateBoost as jest.Mock).mockRejectedValue(
        new Error('Invalid payment')
      );

      await boostController.activateBoost(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid payment',
      });
    });

    it('should return 400 when boost already active', async () => {
      mockRequest.body = {
        duration: 30,
        paymentId: 'payment-123',
      };

      (boostService.activateBoost as jest.Mock).mockRejectedValue(
        new Error('Boost already active')
      );

      await boostController.activateBoost(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Boost already active',
      });
    });

    it('should return 400 when insufficient credits', async () => {
      mockRequest.body = {
        duration: 30,
        paymentId: 'payment-123',
      };

      (boostService.activateBoost as jest.Mock).mockRejectedValue(
        new Error('Insufficient boost credits')
      );

      await boostController.activateBoost(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient boost credits',
      });
    });
  });

  describe('getActiveBoost', () => {
    it('should return active boost', async () => {
      const mockBoost = {
        id: 'boost-123',
        userId,
        duration: 30,
        activatedAt: new Date(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes remaining
        isActive: true,
        viewsGenerated: 50,
      };

      (boostService.getActiveBoost as jest.Mock).mockResolvedValue(mockBoost);

      await boostController.getActiveBoost(mockRequest as Request, mockResponse as Response);

      expect(boostService.getActiveBoost).toHaveBeenCalledWith(userId);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockBoost,
      });
    });

    it('should return null when no active boost', async () => {
      (boostService.getActiveBoost as jest.Mock).mockResolvedValue(null);

      await boostController.getActiveBoost(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: null,
      });
    });

    it('should handle service errors', async () => {
      (boostService.getActiveBoost as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await boostController.getActiveBoost(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve boost',
      });
    });
  });

  describe('getBoostStats', () => {
    it('should return boost statistics', async () => {
      const mockStats = {
        totalBoosts: 10,
        totalViewsGenerated: 500,
        totalMatchesFromBoosts: 25,
        averageViewsPerBoost: 50,
        boostCreditsRemaining: 5,
        lastBoostDate: new Date(),
      };

      (boostService.getBoostStats as jest.Mock).mockResolvedValue(mockStats);

      await boostController.getBoostStats(mockRequest as Request, mockResponse as Response);

      expect(boostService.getBoostStats).toHaveBeenCalledWith(userId);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockStats,
      });
    });

    it('should return empty stats for new user', async () => {
      const emptyStats = {
        totalBoosts: 0,
        totalViewsGenerated: 0,
        totalMatchesFromBoosts: 0,
        averageViewsPerBoost: 0,
        boostCreditsRemaining: 0,
        lastBoostDate: null,
      };

      (boostService.getBoostStats as jest.Mock).mockResolvedValue(emptyStats);

      await boostController.getBoostStats(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: emptyStats,
      });
    });

    it('should handle service errors', async () => {
      (boostService.getBoostStats as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await boostController.getBoostStats(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve stats',
      });
    });
  });

  describe('getBoostHistory', () => {
    it('should return boost history with default pagination', async () => {
      const mockHistory = {
        boosts: [
          {
            id: 'boost-1',
            userId,
            duration: 30,
            activatedAt: new Date(),
            expiresAt: new Date(),
            viewsGenerated: 60,
          },
          {
            id: 'boost-2',
            userId,
            duration: 60,
            activatedAt: new Date(),
            expiresAt: new Date(),
            viewsGenerated: 120,
          },
        ],
        total: 10,
        hasMore: true,
      };

      (boostService.getBoostHistory as jest.Mock).mockResolvedValue(mockHistory);

      await boostController.getBoostHistory(mockRequest as Request, mockResponse as Response);

      expect(boostService.getBoostHistory).toHaveBeenCalledWith(userId, {
        limit: 20,
        offset: 0,
      });
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockHistory,
      });
    });

    it('should respect custom pagination parameters', async () => {
      mockRequest.query = { limit: '10', offset: '5' };

      const mockHistory = {
        boosts: [],
        total: 10,
        hasMore: false,
      };

      (boostService.getBoostHistory as jest.Mock).mockResolvedValue(mockHistory);

      await boostController.getBoostHistory(mockRequest as Request, mockResponse as Response);

      expect(boostService.getBoostHistory).toHaveBeenCalledWith(userId, {
        limit: 10,
        offset: 5,
      });
    });

    it('should return empty history for new user', async () => {
      const emptyHistory = {
        boosts: [],
        total: 0,
        hasMore: false,
      };

      (boostService.getBoostHistory as jest.Mock).mockResolvedValue(emptyHistory);

      await boostController.getBoostHistory(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: emptyHistory,
      });
    });

    it('should handle service errors', async () => {
      (boostService.getBoostHistory as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await boostController.getBoostHistory(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve history',
      });
    });
  });

  describe('cancelBoost', () => {
    it('should cancel active boost successfully', async () => {
      mockRequest.body = { reason: 'User requested' };

      (boostService.cancelBoost as jest.Mock).mockResolvedValue(true);

      await boostController.cancelBoost(mockRequest as Request, mockResponse as Response);

      expect(boostService.cancelBoost).toHaveBeenCalledWith(userId, 'User requested');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Boost cancelled successfully',
      });
    });

    it('should cancel boost without reason', async () => {
      mockRequest.body = {};

      (boostService.cancelBoost as jest.Mock).mockResolvedValue(true);

      await boostController.cancelBoost(mockRequest as Request, mockResponse as Response);

      expect(boostService.cancelBoost).toHaveBeenCalledWith(userId, undefined);
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should return 400 when no active boost to cancel', async () => {
      mockRequest.body = {};

      (boostService.cancelBoost as jest.Mock).mockResolvedValue(false);

      await boostController.cancelBoost(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'No active boost to cancel',
      });
    });

    it('should handle service errors', async () => {
      mockRequest.body = {};

      (boostService.cancelBoost as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await boostController.cancelBoost(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to cancel boost',
      });
    });
  });
});
