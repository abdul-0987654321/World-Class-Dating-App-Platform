/// <reference types="jest" />
/**
 * Unit tests for Recommendation Controller
 * Tests recommendation retrieval, top matches, and refresh functionality
 */

import { Request, Response } from 'express';
import { RecommendationController } from '../../../src/api/controllers/recommendation.controller';
import recommendationService from '../../../src/domain/services/recommendation.service';

jest.mock('../../../src/domain/services/recommendation.service');
jest.mock('@flamoral/shared', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('RecommendationController', () => {
  let recommendationController: RecommendationController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  const userId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    recommendationController = new RecommendationController();

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

  describe('getRecommendations', () => {
    it('should return personalized recommendations with default pagination', async () => {
      const mockRecommendations = [
        { userId: 'user-1', matchScore: 0.95, compatibilityReasons: ['shared interests'] },
        { userId: 'user-2', matchScore: 0.92, compatibilityReasons: ['location'] },
        { userId: 'user-3', matchScore: 0.88, compatibilityReasons: ['age range'] },
      ];

      (recommendationService.getRecommendations as jest.Mock).mockResolvedValue(
        mockRecommendations
      );

      await recommendationController.getRecommendations(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(recommendationService.getRecommendations).toHaveBeenCalledWith({
        userId,
        limit: 20,
        offset: 0,
        filters: undefined,
      });
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          count: 3,
          recommendations: mockRecommendations,
        },
      });
    });

    it('should respect custom limit and offset parameters', async () => {
      mockRequest.query = {
        limit: '10',
        offset: '5',
      };

      (recommendationService.getRecommendations as jest.Mock).mockResolvedValue([]);

      await recommendationController.getRecommendations(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(recommendationService.getRecommendations).toHaveBeenCalledWith({
        userId,
        limit: 10,
        offset: 5,
        filters: undefined,
      });
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should apply filters when provided', async () => {
      mockRequest.query = {
        limit: '20',
        offset: '0',
        minAge: '25',
        maxAge: '35',
        maxDistance: '50',
      };

      (recommendationService.getRecommendations as jest.Mock).mockResolvedValue([]);

      await recommendationController.getRecommendations(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(recommendationService.getRecommendations).toHaveBeenCalledWith({
        userId,
        limit: 20,
        offset: 0,
        filters: {
          minAge: '25',
          maxAge: '35',
          maxDistance: '50',
        },
      });
    });

    it('should handle errors gracefully', async () => {
      (recommendationService.getRecommendations as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await recommendationController.getRecommendations(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve recommendations',
      });
    });
  });

  describe('getTopMatches', () => {
    it('should return top matches with default limit', async () => {
      const mockTopMatches = [
        { userId: 'user-1', matchScore: 0.98, reasons: ['perfect compatibility'] },
        { userId: 'user-2', matchScore: 0.96, reasons: ['high compatibility'] },
      ];

      (recommendationService.getTopMatches as jest.Mock).mockResolvedValue(mockTopMatches);

      await recommendationController.getTopMatches(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(recommendationService.getTopMatches).toHaveBeenCalledWith(userId, 10);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          count: 2,
          topMatches: mockTopMatches,
        },
      });
    });

    it('should respect custom limit parameter', async () => {
      mockRequest.query = { limit: '5' };

      (recommendationService.getTopMatches as jest.Mock).mockResolvedValue([]);

      await recommendationController.getTopMatches(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(recommendationService.getTopMatches).toHaveBeenCalledWith(userId, 5);
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should handle errors', async () => {
      (recommendationService.getTopMatches as jest.Mock).mockRejectedValue(
        new Error('Service error')
      );

      await recommendationController.getTopMatches(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve top matches',
      });
    });
  });

  describe('refreshRecommendations', () => {
    it('should refresh recommendations successfully', async () => {
      (recommendationService.refreshRecommendations as jest.Mock).mockResolvedValue(undefined);

      await recommendationController.refreshRecommendations(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(recommendationService.refreshRecommendations).toHaveBeenCalledWith(userId);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Recommendations refreshed successfully',
      });
    });

    it('should handle errors during refresh', async () => {
      (recommendationService.refreshRecommendations as jest.Mock).mockRejectedValue(
        new Error('Refresh failed')
      );

      await recommendationController.refreshRecommendations(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to refresh recommendations',
      });
    });
  });
});
