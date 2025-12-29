/**
 * Unit tests for Insights Controller
 * Tests profile insights, who viewed me, who liked me, and view tracking
 */

import { Request, Response } from 'express';
import { InsightsController } from '../../../src/api/controllers/insights.controller';
import profileInsightsService from '../../../src/domain/services/profile-insights.service';

jest.mock('../../../src/domain/services/profile-insights.service');
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

describe('InsightsController', () => {
  let insightsController: InsightsController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  const userId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    insightsController = new InsightsController();

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

  describe('getProfileInsights', () => {
    it('should return profile insights with default period (week)', async () => {
      const mockInsights = {
        profileViews: 150,
        profileViewsChange: 25,
        likesReceived: 45,
        likesReceivedChange: 10,
        matchRate: 0.3,
        matchRateChange: 0.05,
        topViewTimes: ['evening', 'night'],
        mostActiveDay: 'Saturday',
        profileCompleteness: 85,
        photoRanking: [
          { photoId: 'photo-1', views: 100, likeRate: 0.4 },
          { photoId: 'photo-2', views: 80, likeRate: 0.35 },
        ],
      };

      (profileInsightsService.getProfileInsights as jest.Mock).mockResolvedValue(mockInsights);

      await insightsController.getProfileInsights(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(profileInsightsService.getProfileInsights).toHaveBeenCalledWith(userId, 'week');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockInsights,
      });
    });

    it('should return insights for custom period (month)', async () => {
      mockRequest.query = { period: 'month' };

      const mockInsights = {
        profileViews: 500,
        profileViewsChange: 50,
        likesReceived: 120,
        likesReceivedChange: 20,
        matchRate: 0.28,
        matchRateChange: 0.02,
      };

      (profileInsightsService.getProfileInsights as jest.Mock).mockResolvedValue(mockInsights);

      await insightsController.getProfileInsights(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(profileInsightsService.getProfileInsights).toHaveBeenCalledWith(userId, 'month');
    });

    it('should return insights for day period', async () => {
      mockRequest.query = { period: 'day' };

      const mockInsights = {
        profileViews: 25,
        profileViewsChange: 5,
        likesReceived: 8,
        likesReceivedChange: 2,
        matchRate: 0.35,
        matchRateChange: 0.1,
      };

      (profileInsightsService.getProfileInsights as jest.Mock).mockResolvedValue(mockInsights);

      await insightsController.getProfileInsights(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(profileInsightsService.getProfileInsights).toHaveBeenCalledWith(userId, 'day');
    });

    it('should handle service errors', async () => {
      (profileInsightsService.getProfileInsights as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await insightsController.getProfileInsights(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve insights',
      });
    });
  });

  describe('getWhoViewedMe', () => {
    it('should return who viewed me with default pagination', async () => {
      const mockViews = {
        viewers: [
          {
            userId: 'viewer-1',
            viewedAt: new Date(),
            duration: 30,
            source: 'discovery',
          },
          {
            userId: 'viewer-2',
            viewedAt: new Date(),
            duration: 45,
            source: 'search',
          },
        ],
        total: 50,
        hasMore: true,
      };

      (profileInsightsService.getWhoViewedMe as jest.Mock).mockResolvedValue(mockViews);

      await insightsController.getWhoViewedMe(mockRequest as Request, mockResponse as Response);

      expect(profileInsightsService.getWhoViewedMe).toHaveBeenCalledWith(userId, {
        limit: 20,
        offset: 0,
        period: 'week',
      });
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockViews,
      });
    });

    it('should respect custom pagination and period', async () => {
      mockRequest.query = { limit: '10', offset: '5', period: 'month' };

      const mockViews = {
        viewers: [],
        total: 50,
        hasMore: false,
      };

      (profileInsightsService.getWhoViewedMe as jest.Mock).mockResolvedValue(mockViews);

      await insightsController.getWhoViewedMe(mockRequest as Request, mockResponse as Response);

      expect(profileInsightsService.getWhoViewedMe).toHaveBeenCalledWith(userId, {
        limit: 10,
        offset: 5,
        period: 'month',
      });
    });

    it('should return empty list for new user', async () => {
      const emptyViews = {
        viewers: [],
        total: 0,
        hasMore: false,
      };

      (profileInsightsService.getWhoViewedMe as jest.Mock).mockResolvedValue(emptyViews);

      await insightsController.getWhoViewedMe(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: emptyViews,
      });
    });

    it('should handle service errors', async () => {
      (profileInsightsService.getWhoViewedMe as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await insightsController.getWhoViewedMe(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve views',
      });
    });
  });

  describe('getWhoLikedYou', () => {
    it('should return who liked you with default pagination', async () => {
      const mockLikes = {
        likers: [
          {
            userId: 'liker-1',
            likedAt: new Date(),
            isSuperLike: false,
            matched: false,
          },
          {
            userId: 'liker-2',
            likedAt: new Date(),
            isSuperLike: true,
            matched: true,
          },
        ],
        total: 30,
        hasMore: true,
      };

      (profileInsightsService.getWhoLikedYou as jest.Mock).mockResolvedValue(mockLikes);

      await insightsController.getWhoLikedYou(mockRequest as Request, mockResponse as Response);

      expect(profileInsightsService.getWhoLikedYou).toHaveBeenCalledWith(userId, {
        limit: 20,
        offset: 0,
        unmatchedOnly: false,
      });
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockLikes,
      });
    });

    it('should filter unmatched only when requested', async () => {
      mockRequest.query = { unmatchedOnly: 'true' };

      const mockLikes = {
        likers: [
          {
            userId: 'liker-1',
            likedAt: new Date(),
            isSuperLike: false,
            matched: false,
          },
        ],
        total: 15,
        hasMore: false,
      };

      (profileInsightsService.getWhoLikedYou as jest.Mock).mockResolvedValue(mockLikes);

      await insightsController.getWhoLikedYou(mockRequest as Request, mockResponse as Response);

      expect(profileInsightsService.getWhoLikedYou).toHaveBeenCalledWith(userId, {
        limit: 20,
        offset: 0,
        unmatchedOnly: true,
      });
    });

    it('should respect custom pagination parameters', async () => {
      mockRequest.query = { limit: '15', offset: '10' };

      const mockLikes = {
        likers: [],
        total: 30,
        hasMore: false,
      };

      (profileInsightsService.getWhoLikedYou as jest.Mock).mockResolvedValue(mockLikes);

      await insightsController.getWhoLikedYou(mockRequest as Request, mockResponse as Response);

      expect(profileInsightsService.getWhoLikedYou).toHaveBeenCalledWith(userId, {
        limit: 15,
        offset: 10,
        unmatchedOnly: false,
      });
    });

    it('should return empty list for new user', async () => {
      const emptyLikes = {
        likers: [],
        total: 0,
        hasMore: false,
      };

      (profileInsightsService.getWhoLikedYou as jest.Mock).mockResolvedValue(emptyLikes);

      await insightsController.getWhoLikedYou(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: emptyLikes,
      });
    });

    it('should handle service errors', async () => {
      (profileInsightsService.getWhoLikedYou as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await insightsController.getWhoLikedYou(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve likes',
      });
    });
  });

  describe('getWhoLikedYouCount', () => {
    it('should return who liked you count', async () => {
      (profileInsightsService.getWhoLikedYouCount as jest.Mock).mockResolvedValue(25);

      await insightsController.getWhoLikedYouCount(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(profileInsightsService.getWhoLikedYouCount).toHaveBeenCalledWith(userId);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: { count: 25 },
      });
    });

    it('should return zero count for new user', async () => {
      (profileInsightsService.getWhoLikedYouCount as jest.Mock).mockResolvedValue(0);

      await insightsController.getWhoLikedYouCount(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: { count: 0 },
      });
    });

    it('should handle service errors', async () => {
      (profileInsightsService.getWhoLikedYouCount as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await insightsController.getWhoLikedYouCount(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve count',
      });
    });
  });

  describe('trackProfileView', () => {
    it('should track profile view successfully', async () => {
      mockRequest.body = {
        viewedUserId: 'viewed-user-123',
        source: 'discovery',
        duration: 15,
      };

      (profileInsightsService.trackProfileView as jest.Mock).mockResolvedValue(undefined);

      await insightsController.trackProfileView(mockRequest as Request, mockResponse as Response);

      expect(profileInsightsService.trackProfileView).toHaveBeenCalledWith({
        viewerId: userId,
        viewedUserId: 'viewed-user-123',
        source: 'discovery',
        duration: 15,
      });
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'View tracked',
      });
    });

    it('should track view from search source', async () => {
      mockRequest.body = {
        viewedUserId: 'viewed-user-456',
        source: 'search',
        duration: 30,
      };

      (profileInsightsService.trackProfileView as jest.Mock).mockResolvedValue(undefined);

      await insightsController.trackProfileView(mockRequest as Request, mockResponse as Response);

      expect(profileInsightsService.trackProfileView).toHaveBeenCalledWith({
        viewerId: userId,
        viewedUserId: 'viewed-user-456',
        source: 'search',
        duration: 30,
      });
    });

    it('should track view from match source', async () => {
      mockRequest.body = {
        viewedUserId: 'viewed-user-789',
        source: 'match',
        duration: 60,
      };

      (profileInsightsService.trackProfileView as jest.Mock).mockResolvedValue(undefined);

      await insightsController.trackProfileView(mockRequest as Request, mockResponse as Response);

      expect(profileInsightsService.trackProfileView).toHaveBeenCalledWith({
        viewerId: userId,
        viewedUserId: 'viewed-user-789',
        source: 'match',
        duration: 60,
      });
    });

    it('should return success even when tracking fails (graceful degradation)', async () => {
      mockRequest.body = {
        viewedUserId: 'viewed-user-123',
        source: 'discovery',
        duration: 15,
      };

      (profileInsightsService.trackProfileView as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await insightsController.trackProfileView(mockRequest as Request, mockResponse as Response);

      // Tracking errors should not fail the request
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Request processed',
      });
    });

    it('should handle missing optional fields', async () => {
      mockRequest.body = {
        viewedUserId: 'viewed-user-123',
      };

      (profileInsightsService.trackProfileView as jest.Mock).mockResolvedValue(undefined);

      await insightsController.trackProfileView(mockRequest as Request, mockResponse as Response);

      expect(profileInsightsService.trackProfileView).toHaveBeenCalledWith({
        viewerId: userId,
        viewedUserId: 'viewed-user-123',
        source: undefined,
        duration: undefined,
      });
      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });
});
