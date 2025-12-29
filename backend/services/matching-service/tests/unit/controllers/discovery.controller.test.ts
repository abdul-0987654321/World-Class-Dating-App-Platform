/**
 * Unit tests for Discovery Controller
 * Tests discovery feed, likes, passes, and super-likes
 */

import { Request, Response } from 'express';
import { DiscoveryController } from '../../../src/api/controllers/discovery.controller';
import discoveryService from '../../../src/domain/services/discovery.service';

jest.mock('../../../src/domain/services/discovery.service');
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

describe('DiscoveryController', () => {
  let discoveryController: DiscoveryController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;
  let sendMock: jest.Mock;

  const userId = 'user-123';
  const targetUserId = 'user-456';

  beforeEach(() => {
    jest.clearAllMocks();
    discoveryController = new DiscoveryController();

    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn().mockReturnThis();
    sendMock = jest.fn().mockReturnThis();

    mockRequest = {
      params: {},
      query: {},
      body: {},
      user: { userId } as any,
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
      send: sendMock,
    };
  });

  describe('getFeed', () => {
    it('should return discovery feed with candidates', async () => {
      const mockFeed = {
        items: [
          { user_id: 'candidate-1', profile_preview: {}, reasons: ['nearby'] },
          { user_id: 'candidate-2', profile_preview: {}, reasons: ['shared_interests'] },
        ],
        next_cursor: 'cursor-abc',
        candidatesExist: true,
      };

      (discoveryService.getDiscoveryFeed as jest.Mock).mockResolvedValue(mockFeed);

      await discoveryController.getFeed(mockRequest as Request, mockResponse as Response);

      expect(discoveryService.getDiscoveryFeed).toHaveBeenCalledWith({
        userId,
        limit: 20,
        cursor: undefined,
      });
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          items: mockFeed.items,
          next_cursor: 'cursor-abc',
        },
      });
    });

    it('should use custom limit from query params', async () => {
      mockRequest.query = { limit: '10' };

      const mockFeed = {
        items: [],
        next_cursor: null,
        candidatesExist: false,
        emptyReason: 'No candidates in your area',
      };

      (discoveryService.getDiscoveryFeed as jest.Mock).mockResolvedValue(mockFeed);

      await discoveryController.getFeed(mockRequest as Request, mockResponse as Response);

      expect(discoveryService.getDiscoveryFeed).toHaveBeenCalledWith({
        userId,
        limit: 10,
        cursor: undefined,
      });
    });

    it('should pass cursor for pagination', async () => {
      mockRequest.query = { cursor: 'next-page-cursor' };

      const mockFeed = {
        items: [{ user_id: 'candidate-3' }],
        next_cursor: 'another-cursor',
        candidatesExist: true,
      };

      (discoveryService.getDiscoveryFeed as jest.Mock).mockResolvedValue(mockFeed);

      await discoveryController.getFeed(mockRequest as Request, mockResponse as Response);

      expect(discoveryService.getDiscoveryFeed).toHaveBeenCalledWith({
        userId,
        limit: 20,
        cursor: 'next-page-cursor',
      });
    });

    it('should include message when feed is empty', async () => {
      const mockFeed = {
        items: [],
        next_cursor: null,
        candidatesExist: false,
        emptyReason: 'You have swiped on all available profiles',
      };

      (discoveryService.getDiscoveryFeed as jest.Mock).mockResolvedValue(mockFeed);

      await discoveryController.getFeed(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          items: [],
          next_cursor: null,
          message: 'You have swiped on all available profiles',
        },
      });
    });

    it('should handle service errors', async () => {
      (discoveryService.getDiscoveryFeed as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await discoveryController.getFeed(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve discovery feed',
        code: 'DISCOVERY_FEED_ERROR',
        correlation_id: 'unknown',
      });
    });
  });

  describe('like', () => {
    it('should process like successfully without match', async () => {
      mockRequest.body = { target_user_id: targetUserId };

      const mockResult = {
        success: true,
        matchCreated: false,
        match: null,
      };

      (discoveryService.processLike as jest.Mock).mockResolvedValue(mockResult);

      await discoveryController.like(mockRequest as Request, mockResponse as Response);

      expect(discoveryService.processLike).toHaveBeenCalledWith({
        userId,
        targetUserId,
      });
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          liked: true,
          match_created: false,
          match: null,
        },
      });
    });

    it('should process like with match creation', async () => {
      mockRequest.body = { target_user_id: targetUserId };

      const mockMatch = {
        id: 'match-123',
        user1Id: userId,
        user2Id: targetUserId,
      };

      const mockResult = {
        success: true,
        matchCreated: true,
        match: mockMatch,
      };

      (discoveryService.processLike as jest.Mock).mockResolvedValue(mockResult);

      await discoveryController.like(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          liked: true,
          match_created: true,
          match: mockMatch,
        },
      });
    });

    it('should return 400 if target_user_id is missing', async () => {
      mockRequest.body = {};

      await discoveryController.like(mockRequest as Request, mockResponse as Response);

      expect(discoveryService.processLike).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'target_user_id is required',
        code: 'MISSING_TARGET_USER',
        correlation_id: 'unknown',
      });
    });

    it('should return 400 when trying to like yourself', async () => {
      mockRequest.body = { target_user_id: userId };

      await discoveryController.like(mockRequest as Request, mockResponse as Response);

      expect(discoveryService.processLike).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot like yourself',
        code: 'SELF_LIKE_NOT_ALLOWED',
        correlation_id: 'unknown',
      });
    });

    it('should return 429 when daily limit exceeded', async () => {
      mockRequest.body = { target_user_id: targetUserId };

      const mockResult = {
        success: false,
        error: 'Daily like limit exceeded',
        code: 'DAILY_LIMIT_EXCEEDED',
        requiredPlan: 'plus',
        currentPlan: 'free',
      };

      (discoveryService.processLike as jest.Mock).mockResolvedValue(mockResult);

      await discoveryController.like(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(429);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Daily like limit exceeded',
        code: 'DAILY_LIMIT_EXCEEDED',
        correlation_id: 'unknown',
        required_plan: 'plus',
        current_plan: 'free',
      });
    });

    it('should return 400 for other like failures', async () => {
      mockRequest.body = { target_user_id: targetUserId };

      const mockResult = {
        success: false,
        error: 'User blocked',
        code: 'USER_BLOCKED',
      };

      (discoveryService.processLike as jest.Mock).mockResolvedValue(mockResult);

      await discoveryController.like(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should handle service errors', async () => {
      mockRequest.body = { target_user_id: targetUserId };

      (discoveryService.processLike as jest.Mock).mockRejectedValue(new Error('Database error'));

      await discoveryController.like(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to process like',
        code: 'LIKE_ERROR',
        correlation_id: 'unknown',
      });
    });
  });

  describe('pass', () => {
    it('should process pass successfully', async () => {
      mockRequest.body = { target_user_id: targetUserId };

      (discoveryService.processPass as jest.Mock).mockResolvedValue(undefined);

      await discoveryController.pass(mockRequest as Request, mockResponse as Response);

      expect(discoveryService.processPass).toHaveBeenCalledWith({
        userId,
        targetUserId,
      });
      expect(statusMock).toHaveBeenCalledWith(204);
      expect(sendMock).toHaveBeenCalled();
    });

    it('should return 400 if target_user_id is missing', async () => {
      mockRequest.body = {};

      await discoveryController.pass(mockRequest as Request, mockResponse as Response);

      expect(discoveryService.processPass).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'target_user_id is required',
        code: 'MISSING_TARGET_USER',
        correlation_id: 'unknown',
      });
    });

    it('should return 400 when trying to pass on yourself', async () => {
      mockRequest.body = { target_user_id: userId };

      await discoveryController.pass(mockRequest as Request, mockResponse as Response);

      expect(discoveryService.processPass).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot pass on yourself',
        code: 'SELF_PASS_NOT_ALLOWED',
        correlation_id: 'unknown',
      });
    });

    it('should handle service errors', async () => {
      mockRequest.body = { target_user_id: targetUserId };

      (discoveryService.processPass as jest.Mock).mockRejectedValue(new Error('Database error'));

      await discoveryController.pass(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to process pass',
        code: 'PASS_ERROR',
        correlation_id: 'unknown',
      });
    });
  });

  describe('superLike', () => {
    it('should process super-like successfully', async () => {
      mockRequest.body = { target_user_id: targetUserId, message: 'You seem amazing!' };

      const mockResult = {
        success: true,
      };

      (discoveryService.processSuperLike as jest.Mock).mockResolvedValue(mockResult);

      await discoveryController.superLike(mockRequest as Request, mockResponse as Response);

      expect(discoveryService.processSuperLike).toHaveBeenCalledWith({
        userId,
        targetUserId,
        message: 'You seem amazing!',
      });
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          super_liked: true,
        },
      });
    });

    it('should process super-like without message', async () => {
      mockRequest.body = { target_user_id: targetUserId };

      const mockResult = {
        success: true,
      };

      (discoveryService.processSuperLike as jest.Mock).mockResolvedValue(mockResult);

      await discoveryController.superLike(mockRequest as Request, mockResponse as Response);

      expect(discoveryService.processSuperLike).toHaveBeenCalledWith({
        userId,
        targetUserId,
        message: undefined,
      });
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should return 400 if target_user_id is missing', async () => {
      mockRequest.body = {};

      await discoveryController.superLike(mockRequest as Request, mockResponse as Response);

      expect(discoveryService.processSuperLike).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'target_user_id is required',
        code: 'MISSING_TARGET_USER',
        correlation_id: 'unknown',
      });
    });

    it('should return 400 when trying to super-like yourself', async () => {
      mockRequest.body = { target_user_id: userId };

      await discoveryController.superLike(mockRequest as Request, mockResponse as Response);

      expect(discoveryService.processSuperLike).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot super-like yourself',
        code: 'SELF_SUPERLIKE_NOT_ALLOWED',
        correlation_id: 'unknown',
      });
    });

    it('should return 402 when tier not sufficient', async () => {
      mockRequest.body = { target_user_id: targetUserId };

      const mockResult = {
        success: false,
        error: 'Super-like requires Plus or Premium subscription',
        code: 'TIER_NOT_SUFFICIENT',
        requiredPlan: 'plus',
        currentPlan: 'free',
      };

      (discoveryService.processSuperLike as jest.Mock).mockResolvedValue(mockResult);

      await discoveryController.superLike(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(402);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Super-like requires Plus or Premium subscription',
        code: 'TIER_NOT_SUFFICIENT',
        correlation_id: 'unknown',
        required_plan: 'plus',
        current_plan: 'free',
      });
    });

    it('should return 429 when daily super-like limit exceeded', async () => {
      mockRequest.body = { target_user_id: targetUserId };

      const mockResult = {
        success: false,
        error: 'Daily super-like limit exceeded',
        code: 'DAILY_LIMIT_EXCEEDED',
        requiredPlan: 'premium',
        currentPlan: 'plus',
      };

      (discoveryService.processSuperLike as jest.Mock).mockResolvedValue(mockResult);

      await discoveryController.superLike(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(429);
    });

    it('should return 400 for other super-like failures', async () => {
      mockRequest.body = { target_user_id: targetUserId };

      const mockResult = {
        success: false,
        error: 'Already super-liked this user',
        code: 'ALREADY_SUPERLIKED',
        requiredPlan: undefined,
        currentPlan: 'plus',
      };

      (discoveryService.processSuperLike as jest.Mock).mockResolvedValue(mockResult);

      await discoveryController.superLike(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should handle service errors', async () => {
      mockRequest.body = { target_user_id: targetUserId };

      (discoveryService.processSuperLike as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await discoveryController.superLike(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to process super-like',
        code: 'SUPERLIKE_ERROR',
        correlation_id: 'unknown',
      });
    });
  });

  describe('getStats', () => {
    it('should return discovery statistics', async () => {
      const mockStats = {
        likesGiven: 50,
        likesRemaining: 50,
        superLikesRemaining: 3,
        boostActive: false,
        profileViewsToday: 25,
      };

      (discoveryService.getDiscoveryStats as jest.Mock).mockResolvedValue(mockStats);

      await discoveryController.getStats(mockRequest as Request, mockResponse as Response);

      expect(discoveryService.getDiscoveryStats).toHaveBeenCalledWith(userId);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockStats,
      });
    });

    it('should handle service errors', async () => {
      (discoveryService.getDiscoveryStats as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await discoveryController.getStats(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve discovery stats',
        code: 'STATS_ERROR',
        correlation_id: 'unknown',
      });
    });
  });
});
