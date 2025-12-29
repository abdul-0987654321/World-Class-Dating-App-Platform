/**
 * Unit tests for Super Like Controller
 * Tests super like sending, quota, received/sent lists, messages, and stats
 */

import { Request, Response } from 'express';
import { SuperLikeController } from '../../../src/api/controllers/super-like.controller';
import superLikeService from '../../../src/domain/services/super-like.service';

jest.mock('../../../src/domain/services/super-like.service');
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

describe('SuperLikeController', () => {
  let superLikeController: SuperLikeController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  const userId = 'user-123';
  const targetUserId = 'user-456';

  beforeEach(() => {
    jest.clearAllMocks();
    superLikeController = new SuperLikeController();

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

  describe('sendSuperLike', () => {
    it('should send super like successfully without message', async () => {
      mockRequest.body = { targetUserId };

      const mockResult = {
        success: true,
        superLikeId: 'superlike-123',
        matched: false,
      };

      (superLikeService.sendSuperLike as jest.Mock).mockResolvedValue(mockResult);

      await superLikeController.sendSuperLike(mockRequest as Request, mockResponse as Response);

      expect(superLikeService.sendSuperLike).toHaveBeenCalledWith({
        userId,
        targetUserId,
        message: undefined,
      });
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });

    it('should send super like with message', async () => {
      mockRequest.body = {
        targetUserId,
        message: 'You seem like an amazing person!',
      };

      const mockResult = {
        success: true,
        superLikeId: 'superlike-123',
        matched: false,
        messageId: 'message-123',
      };

      (superLikeService.sendSuperLike as jest.Mock).mockResolvedValue(mockResult);

      await superLikeController.sendSuperLike(mockRequest as Request, mockResponse as Response);

      expect(superLikeService.sendSuperLike).toHaveBeenCalledWith({
        userId,
        targetUserId,
        message: 'You seem like an amazing person!',
      });
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should return matched result when super like creates match', async () => {
      mockRequest.body = { targetUserId };

      const mockResult = {
        success: true,
        superLikeId: 'superlike-123',
        matched: true,
        matchId: 'match-456',
      };

      (superLikeService.sendSuperLike as jest.Mock).mockResolvedValue(mockResult);

      await superLikeController.sendSuperLike(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          matched: true,
          matchId: 'match-456',
        }),
      });
    });

    it('should return 400 if targetUserId is missing', async () => {
      mockRequest.body = {};

      await superLikeController.sendSuperLike(mockRequest as Request, mockResponse as Response);

      expect(superLikeService.sendSuperLike).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Target user ID is required',
      });
    });

    it('should return 400 when super like fails', async () => {
      mockRequest.body = { targetUserId };

      const mockResult = {
        success: false,
        error: 'No super likes remaining today',
      };

      (superLikeService.sendSuperLike as jest.Mock).mockResolvedValue(mockResult);

      await superLikeController.sendSuperLike(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'No super likes remaining today',
      });
    });

    it('should return 400 when already super liked user', async () => {
      mockRequest.body = { targetUserId };

      const mockResult = {
        success: false,
        error: 'You have already super liked this user',
      };

      (superLikeService.sendSuperLike as jest.Mock).mockResolvedValue(mockResult);

      await superLikeController.sendSuperLike(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should handle service errors', async () => {
      mockRequest.body = { targetUserId };

      (superLikeService.sendSuperLike as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await superLikeController.sendSuperLike(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to send Super Like',
      });
    });
  });

  describe('getQuota', () => {
    it('should return super like quota', async () => {
      const mockQuota = {
        daily: 5,
        remaining: 3,
        resetsAt: new Date(),
        bonusRemaining: 0,
      };

      (superLikeService.getSuperLikeQuota as jest.Mock).mockResolvedValue(mockQuota);

      await superLikeController.getQuota(mockRequest as Request, mockResponse as Response);

      expect(superLikeService.getSuperLikeQuota).toHaveBeenCalledWith(userId);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockQuota,
      });
    });

    it('should return quota with bonus super likes', async () => {
      const mockQuota = {
        daily: 5,
        remaining: 5,
        resetsAt: new Date(),
        bonusRemaining: 3,
      };

      (superLikeService.getSuperLikeQuota as jest.Mock).mockResolvedValue(mockQuota);

      await superLikeController.getQuota(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          bonusRemaining: 3,
        }),
      });
    });

    it('should handle service errors', async () => {
      (superLikeService.getSuperLikeQuota as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await superLikeController.getQuota(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve quota',
      });
    });
  });

  describe('getReceived', () => {
    it('should return received super likes with default pagination', async () => {
      const mockSuperLikes = {
        items: [
          {
            id: 'superlike-1',
            fromUserId: 'user-1',
            message: 'Hi!',
            createdAt: new Date(),
            read: false,
          },
          {
            id: 'superlike-2',
            fromUserId: 'user-2',
            message: null,
            createdAt: new Date(),
            read: true,
          },
        ],
        total: 5,
        hasMore: true,
      };

      (superLikeService.getReceivedSuperLikes as jest.Mock).mockResolvedValue(mockSuperLikes);

      await superLikeController.getReceived(mockRequest as Request, mockResponse as Response);

      expect(superLikeService.getReceivedSuperLikes).toHaveBeenCalledWith(userId, {
        limit: 20,
        offset: 0,
        unreadOnly: false,
      });
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockSuperLikes,
      });
    });

    it('should respect custom pagination and filters', async () => {
      mockRequest.query = { limit: '10', offset: '5', unreadOnly: 'true' };

      const mockSuperLikes = {
        items: [],
        total: 0,
        hasMore: false,
      };

      (superLikeService.getReceivedSuperLikes as jest.Mock).mockResolvedValue(mockSuperLikes);

      await superLikeController.getReceived(mockRequest as Request, mockResponse as Response);

      expect(superLikeService.getReceivedSuperLikes).toHaveBeenCalledWith(userId, {
        limit: 10,
        offset: 5,
        unreadOnly: true,
      });
    });

    it('should handle service errors', async () => {
      (superLikeService.getReceivedSuperLikes as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await superLikeController.getReceived(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve Super Likes',
      });
    });
  });

  describe('getSent', () => {
    it('should return sent super likes with default pagination', async () => {
      const mockSuperLikes = {
        items: [
          {
            id: 'superlike-1',
            toUserId: 'user-1',
            message: 'You are amazing!',
            createdAt: new Date(),
            matched: false,
          },
          {
            id: 'superlike-2',
            toUserId: 'user-2',
            message: null,
            createdAt: new Date(),
            matched: true,
          },
        ],
        total: 10,
        hasMore: true,
      };

      (superLikeService.getSentSuperLikes as jest.Mock).mockResolvedValue(mockSuperLikes);

      await superLikeController.getSent(mockRequest as Request, mockResponse as Response);

      expect(superLikeService.getSentSuperLikes).toHaveBeenCalledWith(userId, {
        limit: 20,
        offset: 0,
      });
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockSuperLikes,
      });
    });

    it('should respect custom pagination parameters', async () => {
      mockRequest.query = { limit: '5', offset: '10' };

      const mockSuperLikes = {
        items: [],
        total: 10,
        hasMore: false,
      };

      (superLikeService.getSentSuperLikes as jest.Mock).mockResolvedValue(mockSuperLikes);

      await superLikeController.getSent(mockRequest as Request, mockResponse as Response);

      expect(superLikeService.getSentSuperLikes).toHaveBeenCalledWith(userId, {
        limit: 5,
        offset: 10,
      });
    });

    it('should handle service errors', async () => {
      (superLikeService.getSentSuperLikes as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await superLikeController.getSent(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve Super Likes',
      });
    });
  });

  describe('getMessage', () => {
    it('should return super like message', async () => {
      mockRequest.params = { messageId: 'message-123' };

      const mockMessage = {
        id: 'message-123',
        content: 'You seem amazing!',
        fromUserId: 'user-1',
        toUserId: userId,
        createdAt: new Date(),
        read: false,
      };

      (superLikeService.getSuperLikeMessage as jest.Mock).mockResolvedValue(mockMessage);

      await superLikeController.getMessage(mockRequest as Request, mockResponse as Response);

      expect(superLikeService.getSuperLikeMessage).toHaveBeenCalledWith('message-123');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockMessage,
      });
    });

    it('should return 404 if message not found', async () => {
      mockRequest.params = { messageId: 'nonexistent-message' };

      (superLikeService.getSuperLikeMessage as jest.Mock).mockResolvedValue(null);

      await superLikeController.getMessage(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Message not found',
      });
    });

    it('should handle service errors', async () => {
      mockRequest.params = { messageId: 'message-123' };

      (superLikeService.getSuperLikeMessage as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await superLikeController.getMessage(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve message',
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark message as read successfully', async () => {
      mockRequest.params = { messageId: 'message-123' };

      (superLikeService.markMessageAsRead as jest.Mock).mockResolvedValue(true);

      await superLikeController.markAsRead(mockRequest as Request, mockResponse as Response);

      expect(superLikeService.markMessageAsRead).toHaveBeenCalledWith('message-123', userId);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Message marked as read',
      });
    });

    it('should return 400 if marking as read fails', async () => {
      mockRequest.params = { messageId: 'message-123' };

      (superLikeService.markMessageAsRead as jest.Mock).mockResolvedValue(false);

      await superLikeController.markAsRead(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to mark as read',
      });
    });

    it('should handle service errors', async () => {
      mockRequest.params = { messageId: 'message-123' };

      (superLikeService.markMessageAsRead as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await superLikeController.markAsRead(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to mark as read',
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      (superLikeService.getUnreadCount as jest.Mock).mockResolvedValue(5);

      await superLikeController.getUnreadCount(mockRequest as Request, mockResponse as Response);

      expect(superLikeService.getUnreadCount).toHaveBeenCalledWith(userId);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: { count: 5 },
      });
    });

    it('should return zero when no unread messages', async () => {
      (superLikeService.getUnreadCount as jest.Mock).mockResolvedValue(0);

      await superLikeController.getUnreadCount(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: { count: 0 },
      });
    });

    it('should handle service errors', async () => {
      (superLikeService.getUnreadCount as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await superLikeController.getUnreadCount(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve count',
      });
    });
  });

  describe('getStats', () => {
    it('should return super like statistics', async () => {
      const mockStats = {
        totalSent: 50,
        totalReceived: 30,
        matchesFromSuperLikes: 10,
        conversionRate: 0.2,
        averageResponseTime: 3600, // seconds
      };

      (superLikeService.getSuperLikeStats as jest.Mock).mockResolvedValue(mockStats);

      await superLikeController.getStats(mockRequest as Request, mockResponse as Response);

      expect(superLikeService.getSuperLikeStats).toHaveBeenCalledWith(userId);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockStats,
      });
    });

    it('should return empty stats for new user', async () => {
      const emptyStats = {
        totalSent: 0,
        totalReceived: 0,
        matchesFromSuperLikes: 0,
        conversionRate: 0,
        averageResponseTime: null,
      };

      (superLikeService.getSuperLikeStats as jest.Mock).mockResolvedValue(emptyStats);

      await superLikeController.getStats(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: emptyStats,
      });
    });

    it('should handle service errors', async () => {
      (superLikeService.getSuperLikeStats as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await superLikeController.getStats(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve stats',
      });
    });
  });

  describe('deleteMessage', () => {
    it('should delete message successfully', async () => {
      mockRequest.params = { messageId: 'message-123' };

      (superLikeService.deleteSuperLikeMessage as jest.Mock).mockResolvedValue(true);

      await superLikeController.deleteMessage(mockRequest as Request, mockResponse as Response);

      expect(superLikeService.deleteSuperLikeMessage).toHaveBeenCalledWith('message-123', userId);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Message deleted',
      });
    });

    it('should return 400 if delete fails', async () => {
      mockRequest.params = { messageId: 'message-123' };

      (superLikeService.deleteSuperLikeMessage as jest.Mock).mockResolvedValue(false);

      await superLikeController.deleteMessage(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to delete message',
      });
    });

    it('should return 400 with error message when deletion time expired', async () => {
      mockRequest.params = { messageId: 'message-123' };

      (superLikeService.deleteSuperLikeMessage as jest.Mock).mockRejectedValue(
        new Error('Cannot delete message after 5 minutes')
      );

      await superLikeController.deleteMessage(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot delete message after 5 minutes',
      });
    });

    it('should return 400 when not message owner', async () => {
      mockRequest.params = { messageId: 'message-123' };

      (superLikeService.deleteSuperLikeMessage as jest.Mock).mockRejectedValue(
        new Error('You can only delete your own messages')
      );

      await superLikeController.deleteMessage(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'You can only delete your own messages',
      });
    });
  });
});
