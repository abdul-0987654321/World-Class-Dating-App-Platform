/**
 * Unit tests for Swipe Controller
 * Tests swipe actions, likes, stats, and undo functionality
 */

import { Request, Response, NextFunction } from 'express';
import { SwipeController } from '../../../src/api/controllers/swipe.controller';
import swipeService from '../../../src/domain/services/swipe.service';
import { SwipeAction } from '../../../src/types';

const mockNext: NextFunction = jest.fn();

jest.mock('../../../src/domain/services/swipe.service');
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
  ApiError: class ApiError extends Error {
    code: string;
    details?: any;
    constructor(options: { code: string; message: string; details?: any }) {
      super(options.message);
      this.code = options.code;
      this.details = options.details;
    }
  },
  ValidationErrorCode: {
    VALIDATION_FAILED: 'VALIDATION_FAILED',
    FIELD_REQUIRED: 'FIELD_REQUIRED',
  },
  MatchingErrorCode: {
    SELF_ACTION_NOT_ALLOWED: 'SELF_ACTION_NOT_ALLOWED',
    UNDO_NOT_ALLOWED: 'UNDO_NOT_ALLOWED',
  },
}));

describe('SwipeController', () => {
  let swipeController: SwipeController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  const userId = 'user-123';
  const targetUserId = 'user-456';

  beforeEach(() => {
    jest.clearAllMocks();
    swipeController = new SwipeController();

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

  describe('swipe', () => {
    it('should process a LIKE swipe successfully', async () => {
      const swipeResult = {
        matched: false,
        swipeId: 'swipe-123',
        action: SwipeAction.LIKE,
      };

      mockRequest.body = {
        targetUserId,
        action: SwipeAction.LIKE,
      };

      (swipeService.processSwipe as jest.Mock).mockResolvedValue(swipeResult);

      await swipeController.swipe(mockRequest as Request, mockResponse as Response, mockNext);

      expect(swipeService.processSwipe).toHaveBeenCalledWith({
        userId,
        targetUserId,
        action: SwipeAction.LIKE,
      });
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: swipeResult,
      });
    });

    it('should process a SUPERLIKE swipe successfully', async () => {
      const swipeResult = {
        matched: false,
        swipeId: 'swipe-123',
        action: SwipeAction.SUPER_LIKE,
      };

      mockRequest.body = {
        targetUserId,
        action: SwipeAction.SUPER_LIKE,
      };

      (swipeService.processSwipe as jest.Mock).mockResolvedValue(swipeResult);

      await swipeController.swipe(mockRequest as Request, mockResponse as Response, mockNext);

      expect(swipeService.processSwipe).toHaveBeenCalledWith({
        userId,
        targetUserId,
        action: SwipeAction.SUPER_LIKE,
      });
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should process a PASS swipe successfully', async () => {
      const swipeResult = {
        matched: false,
        swipeId: 'swipe-123',
        action: SwipeAction.PASS,
      };

      mockRequest.body = {
        targetUserId,
        action: SwipeAction.PASS,
      };

      (swipeService.processSwipe as jest.Mock).mockResolvedValue(swipeResult);

      await swipeController.swipe(mockRequest as Request, mockResponse as Response, mockNext);

      expect(swipeService.processSwipe).toHaveBeenCalledWith({
        userId,
        targetUserId,
        action: SwipeAction.PASS,
      });
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should return match when both users like each other', async () => {
      const swipeResult = {
        matched: true,
        matchId: 'match-123',
        swipeId: 'swipe-123',
        action: SwipeAction.LIKE,
      };

      mockRequest.body = {
        targetUserId,
        action: SwipeAction.LIKE,
      };

      (swipeService.processSwipe as jest.Mock).mockResolvedValue(swipeResult);

      await swipeController.swipe(mockRequest as Request, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          matched: true,
          matchId: 'match-123',
        }),
      });
    });

    it('should call next with error for invalid swipe action', async () => {
      mockRequest.body = {
        targetUserId,
        action: 'INVALID_ACTION',
      };

      await swipeController.swipe(mockRequest as Request, mockResponse as Response, mockNext);

      expect(swipeService.processSwipe).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Invalid swipe action'),
        })
      );
    });

    it('should call next with error if targetUserId is missing', async () => {
      mockRequest.body = {
        action: SwipeAction.LIKE,
      };

      await swipeController.swipe(mockRequest as Request, mockResponse as Response, mockNext);

      expect(swipeService.processSwipe).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Target user ID is required',
        })
      );
    });

    it('should call next with error when trying to swipe on self', async () => {
      mockRequest.body = {
        targetUserId: userId, // same as logged-in user
        action: SwipeAction.LIKE,
      };

      await swipeController.swipe(mockRequest as Request, mockResponse as Response, mockNext);

      expect(swipeService.processSwipe).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Cannot swipe on yourself',
        })
      );
    });

    it('should call next with error on service failure', async () => {
      mockRequest.body = {
        targetUserId,
        action: SwipeAction.LIKE,
      };

      (swipeService.processSwipe as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await swipeController.swipe(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Database connection failed',
        })
      );
    });
  });

  describe('getWhoLikedMe', () => {
    it('should return list of users who liked me', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];
      (swipeService.getUsersWhoLikedMe as jest.Mock).mockResolvedValue(userIds);

      await swipeController.getWhoLikedMe(mockRequest as Request, mockResponse as Response, mockNext);

      expect(swipeService.getUsersWhoLikedMe).toHaveBeenCalledWith(userId);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          count: 3,
          userIds,
        },
      });
    });

    it('should return empty list if no likes', async () => {
      (swipeService.getUsersWhoLikedMe as jest.Mock).mockResolvedValue([]);

      await swipeController.getWhoLikedMe(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          count: 0,
          userIds: [],
        },
      });
    });

    it('should call next with error on failure', async () => {
      (swipeService.getUsersWhoLikedMe as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await swipeController.getWhoLikedMe(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Database error',
        })
      );
    });
  });

  describe('getStats', () => {
    it('should return swipe statistics', async () => {
      const stats = {
        likesGiven: 50,
        likesReceived: 30,
        superlikesGiven: 5,
        superlikesReceived: 2,
        passesGiven: 100,
        matches: 10,
        matchRate: 0.2, // 10 matches / 50 likes given
      };

      (swipeService.getSwipeStats as jest.Mock).mockResolvedValue(stats);

      await swipeController.getStats(mockRequest as Request, mockResponse as Response, mockNext);

      expect(swipeService.getSwipeStats).toHaveBeenCalledWith(userId);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: stats,
      });
    });

    it('should call next with error on failure', async () => {
      (swipeService.getSwipeStats as jest.Mock).mockRejectedValue(new Error('Database error'));

      await swipeController.getStats(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Database error',
        })
      );
    });
  });

  describe('undoSwipe', () => {
    it('should undo last swipe successfully', async () => {
      (swipeService.undoLastSwipe as jest.Mock).mockResolvedValue(true);

      await swipeController.undoSwipe(mockRequest as Request, mockResponse as Response, mockNext);

      expect(swipeService.undoLastSwipe).toHaveBeenCalledWith(userId);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Swipe undone successfully',
      });
    });

    it('should call next with error if cannot undo swipe', async () => {
      (swipeService.undoLastSwipe as jest.Mock).mockResolvedValue(false);

      await swipeController.undoSwipe(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Cannot undo swipe'),
        })
      );
    });

    it('should call next with error on failure', async () => {
      (swipeService.undoLastSwipe as jest.Mock).mockRejectedValue(new Error('Service error'));

      await swipeController.undoSwipe(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Service error',
        })
      );
    });
  });
});
