/**
 * Unit tests for Swipe Controller
 * Tests swipe actions, likes, stats, and undo functionality
 */

import { Request, Response } from 'express';
import { SwipeController } from '../../../src/api/controllers/swipe.controller';
import swipeService from '../../../src/domain/services/swipe.service';
import { SwipeAction } from '../../../src/types';

jest.mock('../../../src/domain/services/swipe.service');
jest.mock('@flamoral/shared', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
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

      await swipeController.swipe(mockRequest as Request, mockResponse as Response);

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
        action: SwipeAction.SUPERLIKE,
      };

      mockRequest.body = {
        targetUserId,
        action: SwipeAction.SUPERLIKE,
      };

      (swipeService.processSwipe as jest.Mock).mockResolvedValue(swipeResult);

      await swipeController.swipe(mockRequest as Request, mockResponse as Response);

      expect(swipeService.processSwipe).toHaveBeenCalledWith({
        userId,
        targetUserId,
        action: SwipeAction.SUPERLIKE,
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

      await swipeController.swipe(mockRequest as Request, mockResponse as Response);

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

      await swipeController.swipe(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          matched: true,
          matchId: 'match-123',
        }),
      });
    });

    it('should return 400 for invalid swipe action', async () => {
      mockRequest.body = {
        targetUserId,
        action: 'INVALID_ACTION',
      };

      await swipeController.swipe(mockRequest as Request, mockResponse as Response);

      expect(swipeService.processSwipe).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid swipe action',
      });
    });

    it('should return 400 if targetUserId is missing', async () => {
      mockRequest.body = {
        action: SwipeAction.LIKE,
      };

      await swipeController.swipe(mockRequest as Request, mockResponse as Response);

      expect(swipeService.processSwipe).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Target user ID is required',
      });
    });

    it('should return 400 when trying to swipe on self', async () => {
      mockRequest.body = {
        targetUserId: userId, // same as logged-in user
        action: SwipeAction.LIKE,
      };

      await swipeController.swipe(mockRequest as Request, mockResponse as Response);

      expect(swipeService.processSwipe).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot swipe on yourself',
      });
    });

    it('should handle service errors gracefully', async () => {
      mockRequest.body = {
        targetUserId,
        action: SwipeAction.LIKE,
      };

      (swipeService.processSwipe as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await swipeController.swipe(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to process swipe',
      });
    });
  });

  describe('getWhoLikedMe', () => {
    it('should return list of users who liked me', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];
      (swipeService.getUsersWhoLikedMe as jest.Mock).mockResolvedValue(userIds);

      await swipeController.getWhoLikedMe(mockRequest as Request, mockResponse as Response);

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

      await swipeController.getWhoLikedMe(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          count: 0,
          userIds: [],
        },
      });
    });

    it('should handle errors', async () => {
      (swipeService.getUsersWhoLikedMe as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await swipeController.getWhoLikedMe(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve likes',
      });
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

      await swipeController.getStats(mockRequest as Request, mockResponse as Response);

      expect(swipeService.getSwipeStats).toHaveBeenCalledWith(userId);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: stats,
      });
    });

    it('should handle errors', async () => {
      (swipeService.getSwipeStats as jest.Mock).mockRejectedValue(new Error('Database error'));

      await swipeController.getStats(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve statistics',
      });
    });
  });

  describe('undoSwipe', () => {
    it('should undo last swipe successfully', async () => {
      (swipeService.undoLastSwipe as jest.Mock).mockResolvedValue(true);

      await swipeController.undoSwipe(mockRequest as Request, mockResponse as Response);

      expect(swipeService.undoLastSwipe).toHaveBeenCalledWith(userId);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Swipe undone successfully',
      });
    });

    it('should return 400 if cannot undo swipe', async () => {
      (swipeService.undoLastSwipe as jest.Mock).mockResolvedValue(false);

      await swipeController.undoSwipe(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot undo swipe',
      });
    });

    it('should handle errors', async () => {
      (swipeService.undoLastSwipe as jest.Mock).mockRejectedValue(new Error('Service error'));

      await swipeController.undoSwipe(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to undo swipe',
      });
    });
  });
});
