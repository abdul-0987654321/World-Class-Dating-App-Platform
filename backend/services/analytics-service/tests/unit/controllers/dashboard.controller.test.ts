/**
 * Unit tests for Dashboard Controller
 * Tests dashboard overview, engagement analytics, match success, revenue, and user behavior
 */

import { Request, Response } from 'express';
import * as dashboardController from '../../../src/api/controllers/dashboard.controller';
import engagementRepository from '../../../src/domain/repositories/engagement.repository';
import eventsRepository from '../../../src/domain/repositories/events.repository';
import matchSuccessRepository from '../../../src/domain/repositories/match-success.repository';
import revenueRepository from '../../../src/domain/repositories/revenue.repository';
import timeSeriesRepository from '../../../src/domain/repositories/time-series.repository';

jest.mock('../../../src/domain/repositories/engagement.repository');
jest.mock('../../../src/domain/repositories/events.repository');
jest.mock('../../../src/domain/repositories/match-success.repository');
jest.mock('../../../src/domain/repositories/revenue.repository');
jest.mock('../../../src/domain/repositories/time-series.repository');

describe('DashboardController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn().mockReturnThis();

    mockRequest = {
      params: {},
      query: {},
      body: {},
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };
  });

  describe('getDashboardOverview', () => {
    it('should return dashboard overview with all metrics', async () => {
      const mockEngagementMetrics = [
        { date: new Date('2025-01-01'), dau: 1000, newUsers: 100 },
        { date: new Date('2025-01-02'), dau: 1100, newUsers: 120 },
        { date: new Date('2025-01-03'), dau: 1050, newUsers: 90 },
      ];

      const mockMatchMetrics = {
        totalMatches: 5000,
        conversationRate: 45.5,
      };

      const mockRevenueMetrics = {
        totalRevenue: 50000,
        mrr: 25000,
        arr: 300000,
      };

      const mockRealTimeMetrics = {
        activeUsers: 250,
        activeConversations: 80,
        swipesPerMinute: 120,
      };

      mockRequest.query = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      (engagementRepository.getEngagementMetrics as jest.Mock).mockResolvedValue(
        mockEngagementMetrics
      );
      (matchSuccessRepository.getMatchSuccessMetrics as jest.Mock).mockResolvedValue(
        mockMatchMetrics
      );
      (revenueRepository.getRevenueMetrics as jest.Mock).mockResolvedValue(mockRevenueMetrics);
      (timeSeriesRepository.getRealTimeMetrics as jest.Mock).mockResolvedValue(mockRealTimeMetrics);

      await dashboardController.getDashboardOverview(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(engagementRepository.getEngagementMetrics).toHaveBeenCalled();
      expect(matchSuccessRepository.getMatchSuccessMetrics).toHaveBeenCalled();
      expect(revenueRepository.getRevenueMetrics).toHaveBeenCalled();
      expect(timeSeriesRepository.getRealTimeMetrics).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          overview: expect.objectContaining({
            averageDAU: expect.any(Number),
            totalNewUsers: expect.any(Number),
            totalMatches: 5000,
            totalRevenue: 50000,
            conversionRate: 45.5,
            mrr: 25000,
            arr: 300000,
          }),
          realTime: mockRealTimeMetrics,
        }),
      });
    });

    it('should use default date range when not provided', async () => {
      mockRequest.query = {};

      (engagementRepository.getEngagementMetrics as jest.Mock).mockResolvedValue([]);
      (matchSuccessRepository.getMatchSuccessMetrics as jest.Mock).mockResolvedValue({
        totalMatches: 0,
        conversationRate: 0,
      });
      (revenueRepository.getRevenueMetrics as jest.Mock).mockResolvedValue({
        totalRevenue: 0,
        mrr: 0,
        arr: 0,
      });
      (timeSeriesRepository.getRealTimeMetrics as jest.Mock).mockResolvedValue({});

      await dashboardController.getDashboardOverview(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(engagementRepository.getEngagementMetrics).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should handle errors gracefully', async () => {
      mockRequest.query = {};
      (engagementRepository.getEngagementMetrics as jest.Mock).mockRejectedValue(
        new Error('Database connection error')
      );

      await dashboardController.getDashboardOverview(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Database connection error',
      });
    });
  });

  describe('getEngagementAnalytics', () => {
    it('should return engagement analytics successfully', async () => {
      const today = new Date();

      (engagementRepository.getDAU as jest.Mock).mockResolvedValue(1000);
      (engagementRepository.getWAU as jest.Mock).mockResolvedValue(5000);
      (engagementRepository.getMAU as jest.Mock).mockResolvedValue(15000);
      (engagementRepository.getEngagementMetrics as jest.Mock).mockResolvedValue([]);
      (engagementRepository.getRetentionCohorts as jest.Mock).mockResolvedValue([]);
      (engagementRepository.getChurnRate as jest.Mock).mockResolvedValue({
        totalUsersAtStart: 10000,
        churnedUsers: 500,
        churnRate: 5,
      });
      (engagementRepository.getFeatureUsage as jest.Mock).mockResolvedValue([]);
      (engagementRepository.getTimeOnAppStats as jest.Mock).mockResolvedValue({
        averageSessionDuration: 480,
        medianSessionDuration: 360,
        totalTimeSpent: 1000000,
        averageTimePerUser: 600,
      });

      mockRequest.query = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      await dashboardController.getEngagementAnalytics(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(engagementRepository.getDAU).toHaveBeenCalled();
      expect(engagementRepository.getWAU).toHaveBeenCalled();
      expect(engagementRepository.getMAU).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          currentMetrics: expect.objectContaining({
            dau: 1000,
            wau: 5000,
            mau: 15000,
            stickinessRatio: expect.any(Number),
          }),
          trends: expect.any(Array),
          retention: expect.any(Array),
          churn: expect.any(Object),
          featureUsage: expect.any(Array),
          timeOnApp: expect.any(Object),
        }),
      });
    });

    it('should calculate stickiness ratio correctly', async () => {
      (engagementRepository.getDAU as jest.Mock).mockResolvedValue(500);
      (engagementRepository.getWAU as jest.Mock).mockResolvedValue(2000);
      (engagementRepository.getMAU as jest.Mock).mockResolvedValue(5000);
      (engagementRepository.getEngagementMetrics as jest.Mock).mockResolvedValue([]);
      (engagementRepository.getRetentionCohorts as jest.Mock).mockResolvedValue([]);
      (engagementRepository.getChurnRate as jest.Mock).mockResolvedValue({});
      (engagementRepository.getFeatureUsage as jest.Mock).mockResolvedValue([]);
      (engagementRepository.getTimeOnAppStats as jest.Mock).mockResolvedValue({});

      mockRequest.query = {};

      await dashboardController.getEngagementAnalytics(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentMetrics: expect.objectContaining({
              stickinessRatio: 10, // (500 / 5000) * 100 = 10%
            }),
          }),
        })
      );
    });

    it('should handle zero MAU for stickiness calculation', async () => {
      (engagementRepository.getDAU as jest.Mock).mockResolvedValue(0);
      (engagementRepository.getWAU as jest.Mock).mockResolvedValue(0);
      (engagementRepository.getMAU as jest.Mock).mockResolvedValue(0);
      (engagementRepository.getEngagementMetrics as jest.Mock).mockResolvedValue([]);
      (engagementRepository.getRetentionCohorts as jest.Mock).mockResolvedValue([]);
      (engagementRepository.getChurnRate as jest.Mock).mockResolvedValue({});
      (engagementRepository.getFeatureUsage as jest.Mock).mockResolvedValue([]);
      (engagementRepository.getTimeOnAppStats as jest.Mock).mockResolvedValue({});

      mockRequest.query = {};

      await dashboardController.getEngagementAnalytics(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentMetrics: expect.objectContaining({
              stickinessRatio: 0,
            }),
          }),
        })
      );
    });
  });

  describe('getMatchSuccessAnalytics', () => {
    it('should return match success analytics successfully', async () => {
      const mockMatchMetrics = {
        totalMatches: 10000,
        activeMatches: 3000,
        expiredMatches: 5000,
        conversationsStarted: 2000,
        conversationRate: 20,
      };

      const mockMatchFunnel = {
        matches: 10000,
        firstMessages: 4000,
        conversations: 3000,
        exchanges: 2000,
      };

      const mockDateArrangementStats = {
        total: 500,
        proposed: 200,
        confirmed: 200,
        completed: 100,
      };

      const mockResponseTimeDistribution = [
        { range: '0-1h', count: 1000 },
        { range: '1-4h', count: 2000 },
        { range: '4-24h', count: 1500 },
      ];

      const mockTopMatches = [
        { matchId: 'match-1', messagesExchanged: 100 },
        { matchId: 'match-2', messagesExchanged: 90 },
      ];

      mockRequest.query = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      (matchSuccessRepository.getMatchSuccessMetrics as jest.Mock).mockResolvedValue(
        mockMatchMetrics
      );
      (matchSuccessRepository.getMatchToConversationFunnel as jest.Mock).mockResolvedValue(
        mockMatchFunnel
      );
      (matchSuccessRepository.getDateArrangementStats as jest.Mock).mockResolvedValue(
        mockDateArrangementStats
      );
      (matchSuccessRepository.getResponseTimeDistribution as jest.Mock).mockResolvedValue(
        mockResponseTimeDistribution
      );
      (matchSuccessRepository.getTopMatches as jest.Mock).mockResolvedValue(mockTopMatches);

      await dashboardController.getMatchSuccessAnalytics(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(matchSuccessRepository.getMatchSuccessMetrics).toHaveBeenCalled();
      expect(matchSuccessRepository.getMatchToConversationFunnel).toHaveBeenCalled();
      expect(matchSuccessRepository.getDateArrangementStats).toHaveBeenCalled();
      expect(matchSuccessRepository.getResponseTimeDistribution).toHaveBeenCalled();
      expect(matchSuccessRepository.getTopMatches).toHaveBeenCalledWith(
        100,
        expect.any(Date),
        expect.any(Date)
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          overview: mockMatchMetrics,
          funnel: mockMatchFunnel,
          dateArrangements: mockDateArrangementStats,
          responseTimeDistribution: mockResponseTimeDistribution,
          topConversations: expect.any(Array),
        }),
      });
    });

    it('should handle errors gracefully', async () => {
      mockRequest.query = {};
      (matchSuccessRepository.getMatchSuccessMetrics as jest.Mock).mockRejectedValue(
        new Error('Query failed')
      );

      await dashboardController.getMatchSuccessAnalytics(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Query failed',
      });
    });
  });

  describe('getRevenueAnalytics', () => {
    it('should return revenue analytics successfully', async () => {
      mockRequest.query = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      (revenueRepository.getRevenueMetrics as jest.Mock).mockResolvedValue({
        totalRevenue: 100000,
        mrr: 50000,
        arr: 600000,
      });
      (revenueRepository.getSubscriptionMetrics as jest.Mock).mockResolvedValue({
        total: 5000,
        active: 4500,
        cancelled: 500,
      });
      (revenueRepository.getCoinPurchaseMetrics as jest.Mock).mockResolvedValue({
        totalPurchases: 2000,
        totalCoins: 100000,
        totalValue: 10000,
      });
      (revenueRepository.getConversionFunnelMetrics as jest.Mock).mockResolvedValue({
        freeUsers: 50000,
        trialUsers: 5000,
        paidUsers: 5000,
      });
      (revenueRepository.getRevenueByTimePeriod as jest.Mock).mockResolvedValue([]);
      (revenueRepository.getARPU as jest.Mock).mockResolvedValue(2.5);
      (revenueRepository.getARPPU as jest.Mock).mockResolvedValue(25);
      (revenueRepository.getTopRevenueUsers as jest.Mock).mockResolvedValue([]);

      await dashboardController.getRevenueAnalytics(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(revenueRepository.getRevenueMetrics).toHaveBeenCalled();
      expect(revenueRepository.getSubscriptionMetrics).toHaveBeenCalled();
      expect(revenueRepository.getCoinPurchaseMetrics).toHaveBeenCalled();
      expect(revenueRepository.getConversionFunnelMetrics).toHaveBeenCalled();
      expect(revenueRepository.getRevenueByTimePeriod).toHaveBeenCalled();
      expect(revenueRepository.getARPU).toHaveBeenCalled();
      expect(revenueRepository.getARPPU).toHaveBeenCalled();
      expect(revenueRepository.getTopRevenueUsers).toHaveBeenCalledWith(
        10,
        expect.any(Date),
        expect.any(Date)
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          overview: expect.any(Object),
          subscriptions: expect.any(Object),
          coinPurchases: expect.any(Object),
          conversionFunnel: expect.any(Object),
          revenueTimeSeries: expect.any(Array),
          arpu: expect.any(Number),
          arppu: expect.any(Number),
          topRevenueUsers: expect.any(Array),
        }),
      });
    });

    it('should handle errors gracefully', async () => {
      mockRequest.query = {};
      (revenueRepository.getRevenueMetrics as jest.Mock).mockRejectedValue(
        new Error('Revenue query failed')
      );

      await dashboardController.getRevenueAnalytics(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Revenue query failed',
      });
    });
  });

  describe('getUserBehaviorAnalytics', () => {
    it('should return user behavior analytics successfully', async () => {
      mockRequest.query = {
        startDate: '2025-01-01',
        endDate: '2025-01-07',
        groupBy: 'day',
      };

      (eventsRepository.getSessionStats as jest.Mock).mockResolvedValue({
        totalSessions: 10000,
        averageDuration: 480,
        averageSwipesPerSession: 25,
        averageMessagesPerSession: 5,
      });
      (eventsRepository.getSwipesByTimeRange as jest.Mock).mockResolvedValue([
        { period: '2025-01-01', count: 5000, direction: 'right' },
        { period: '2025-01-01', count: 3000, direction: 'left' },
      ]);
      (engagementRepository.getFeatureUsage as jest.Mock).mockResolvedValue([
        { feature: 'boost', totalUsers: 500, totalEvents: 1000 },
        { feature: 'super_like', totalUsers: 800, totalEvents: 2000 },
      ]);
      (engagementRepository.getPowerUsers as jest.Mock).mockResolvedValue([
        { userId: 'user-1', totalSessions: 100 },
        { userId: 'user-2', totalSessions: 90 },
      ]);

      await dashboardController.getUserBehaviorAnalytics(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(eventsRepository.getSessionStats).toHaveBeenCalled();
      expect(eventsRepository.getSwipesByTimeRange).toHaveBeenCalled();
      expect(engagementRepository.getFeatureUsage).toHaveBeenCalled();
      expect(engagementRepository.getPowerUsers).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          sessionStats: expect.any(Object),
          swipeActivity: expect.any(Array),
          featureUsage: expect.any(Array),
          powerUsers: expect.any(Array),
        }),
      });
    });

    it('should use default groupBy when not provided', async () => {
      mockRequest.query = {
        startDate: '2025-01-01',
        endDate: '2025-01-07',
      };

      (eventsRepository.getSessionStats as jest.Mock).mockResolvedValue({});
      (eventsRepository.getSwipesByTimeRange as jest.Mock).mockResolvedValue([]);
      (engagementRepository.getFeatureUsage as jest.Mock).mockResolvedValue([]);
      (engagementRepository.getPowerUsers as jest.Mock).mockResolvedValue([]);

      await dashboardController.getUserBehaviorAnalytics(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(eventsRepository.getSwipesByTimeRange).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
        'day'
      );
    });
  });

  describe('getTimeSeriesData', () => {
    it('should return time series data successfully', async () => {
      const mockDataPoints = [
        { timestamp: new Date('2025-01-01'), value: 100 },
        { timestamp: new Date('2025-01-02'), value: 120 },
        { timestamp: new Date('2025-01-03'), value: 110 },
      ];

      mockRequest.query = {
        metric: 'dau',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        groupBy: 'day',
      };

      (timeSeriesRepository.getMetricsByPeriod as jest.Mock).mockResolvedValue(mockDataPoints);

      await dashboardController.getTimeSeriesData(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(timeSeriesRepository.getMetricsByPeriod).toHaveBeenCalledWith(
        'dau',
        expect.any(Date),
        expect.any(Date),
        'day'
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          metric: 'dau',
          period: 'day',
          dataPoints: mockDataPoints,
        },
      });
    });

    it('should return 400 if metric is missing', async () => {
      mockRequest.query = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      await dashboardController.getTimeSeriesData(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'metric parameter is required',
      });
      expect(timeSeriesRepository.getMetricsByPeriod).not.toHaveBeenCalled();
    });

    it('should use default groupBy when not provided', async () => {
      mockRequest.query = {
        metric: 'revenue',
      };

      (timeSeriesRepository.getMetricsByPeriod as jest.Mock).mockResolvedValue([]);

      await dashboardController.getTimeSeriesData(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(timeSeriesRepository.getMetricsByPeriod).toHaveBeenCalledWith(
        'revenue',
        expect.any(Date),
        expect.any(Date),
        'day'
      );
    });
  });

  describe('getComparisonMetrics', () => {
    it('should return comparison metrics successfully', async () => {
      const mockComparison = {
        current: { dau: 1000, revenue: 50000, matches: 500 },
        previous: { dau: 900, revenue: 45000, matches: 450 },
        change: { dau: 11.1, revenue: 11.1, matches: 11.1 },
      };

      mockRequest.query = {
        currentStart: '2025-01-01',
        currentEnd: '2025-01-31',
        previousStart: '2024-12-01',
        previousEnd: '2024-12-31',
      };

      (timeSeriesRepository.getComparisonMetrics as jest.Mock).mockResolvedValue(mockComparison);

      await dashboardController.getComparisonMetrics(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(timeSeriesRepository.getComparisonMetrics).toHaveBeenCalledWith(
        new Date('2025-01-01'),
        new Date('2025-01-31'),
        new Date('2024-12-01'),
        new Date('2024-12-31')
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockComparison,
      });
    });

    it('should return 400 if any date parameter is missing', async () => {
      mockRequest.query = {
        currentStart: '2025-01-01',
        currentEnd: '2025-01-31',
        // missing previousStart and previousEnd
      };

      await dashboardController.getComparisonMetrics(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'currentStart, currentEnd, previousStart, and previousEnd are required',
      });
    });
  });

  describe('getRealTimeMetrics', () => {
    it('should return real-time metrics successfully', async () => {
      const mockMetrics = {
        activeUsers: 500,
        activeConversations: 150,
        swipesPerMinute: 200,
        matchesPerHour: 50,
        messagesPerMinute: 100,
      };

      (timeSeriesRepository.getRealTimeMetrics as jest.Mock).mockResolvedValue(mockMetrics);

      await dashboardController.getRealTimeMetrics(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(timeSeriesRepository.getRealTimeMetrics).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockMetrics,
      });
    });

    it('should handle errors gracefully', async () => {
      (timeSeriesRepository.getRealTimeMetrics as jest.Mock).mockRejectedValue(
        new Error('Real-time query failed')
      );

      await dashboardController.getRealTimeMetrics(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Real-time query failed',
      });
    });
  });

  describe('getUserActivitySummary', () => {
    it('should return user activity summary successfully', async () => {
      const userId = 'user-123';
      const mockActivitySummary = {
        userId,
        lastActiveAt: new Date(),
        totalSessions: 100,
        totalDaysActive: 50,
        averageSessionDuration: 600,
        totalSwipes: 5000,
        totalMatches: 100,
        totalMessages: 500,
        isActive: true,
      };

      const mockSwipeStats = {
        totalSwipes: 5000,
        rightSwipes: 2500,
        leftSwipes: 2000,
        superLikes: 500,
        swipeRate: 50,
      };

      const mockMatchSuccessRate = {
        totalMatches: 100,
        conversationStarted: 60,
        conversationRate: 60,
        averageResponseTime: 120,
      };

      mockRequest.params = { userId };

      (engagementRepository.getUserActivitySummary as jest.Mock).mockResolvedValue(
        mockActivitySummary
      );
      (eventsRepository.getUserSwipeStats as jest.Mock).mockResolvedValue(mockSwipeStats);
      (eventsRepository.getUserMatchSuccessRate as jest.Mock).mockResolvedValue(
        mockMatchSuccessRate
      );

      await dashboardController.getUserActivitySummary(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(engagementRepository.getUserActivitySummary).toHaveBeenCalledWith(userId);
      expect(eventsRepository.getUserSwipeStats).toHaveBeenCalledWith(userId);
      expect(eventsRepository.getUserMatchSuccessRate).toHaveBeenCalledWith(userId);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          ...mockActivitySummary,
          swipeStats: mockSwipeStats,
          matchSuccessRate: mockMatchSuccessRate,
        }),
      });
    });

    it('should return 400 if userId is missing', async () => {
      mockRequest.params = {};

      await dashboardController.getUserActivitySummary(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'userId is required',
      });
    });
  });

  describe('trackEventFromDashboard', () => {
    it('should track swipe event successfully', async () => {
      const eventData = {
        eventType: 'swipe',
        userId: 'user-123',
        targetUserId: 'user-456',
        direction: 'right',
      };

      mockRequest.body = eventData;
      (eventsRepository.trackSwipe as jest.Mock).mockResolvedValue({
        id: 'event-123',
        ...eventData,
      });

      await dashboardController.trackEventFromDashboard(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(eventsRepository.trackSwipe).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Object),
        message: 'Event tracked successfully',
      });
    });

    it('should track match event successfully', async () => {
      mockRequest.body = { eventType: 'match', matchId: 'match-123' };
      (eventsRepository.trackMatch as jest.Mock).mockResolvedValue({});

      await dashboardController.trackEventFromDashboard(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(eventsRepository.trackMatch).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it('should track message event successfully', async () => {
      mockRequest.body = { eventType: 'message', conversationId: 'conv-123' };
      (eventsRepository.trackMessage as jest.Mock).mockResolvedValue({});

      await dashboardController.trackEventFromDashboard(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(eventsRepository.trackMessage).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it('should track session event successfully', async () => {
      mockRequest.body = { eventType: 'session', sessionId: 'session-123' };
      (eventsRepository.trackSession as jest.Mock).mockResolvedValue({});

      await dashboardController.trackEventFromDashboard(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(eventsRepository.trackSession).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it('should return 400 for invalid event type', async () => {
      mockRequest.body = { eventType: 'invalid' };

      await dashboardController.trackEventFromDashboard(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid event type',
      });
    });
  });

  describe('aggregateMetrics', () => {
    it('should aggregate daily metrics successfully', async () => {
      mockRequest.body = {
        date: '2025-01-15',
        type: 'daily',
      };

      const mockResult = {
        date: new Date('2025-01-15'),
        dau: 1000,
        revenue: 5000,
        matches: 500,
      };

      (timeSeriesRepository.aggregateDailyMetrics as jest.Mock).mockResolvedValue(mockResult);

      await dashboardController.aggregateMetrics(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(timeSeriesRepository.aggregateDailyMetrics).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
        message: 'Metrics aggregated successfully',
      });
    });

    it('should aggregate hourly metrics successfully', async () => {
      mockRequest.body = {
        date: '2025-01-15',
        type: 'hourly',
      };

      (timeSeriesRepository.aggregateHourlyMetrics as jest.Mock).mockResolvedValue({});

      await dashboardController.aggregateMetrics(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(timeSeriesRepository.aggregateHourlyMetrics).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should default to daily aggregation', async () => {
      mockRequest.body = {
        date: '2025-01-15',
      };

      (timeSeriesRepository.aggregateDailyMetrics as jest.Mock).mockResolvedValue({});

      await dashboardController.aggregateMetrics(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(timeSeriesRepository.aggregateDailyMetrics).toHaveBeenCalled();
    });

    it('should return 400 if date is missing', async () => {
      mockRequest.body = { type: 'daily' };

      await dashboardController.aggregateMetrics(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'date is required',
      });
    });

    it('should return 400 for invalid aggregation type', async () => {
      mockRequest.body = {
        date: '2025-01-15',
        type: 'invalid',
      };

      await dashboardController.aggregateMetrics(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid aggregation type',
      });
    });
  });

  describe('backfillMetrics', () => {
    it('should backfill metrics successfully', async () => {
      mockRequest.body = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      (timeSeriesRepository.backfillDailyMetrics as jest.Mock).mockResolvedValue(31);

      await dashboardController.backfillMetrics(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(timeSeriesRepository.backfillDailyMetrics).toHaveBeenCalledWith(
        new Date('2025-01-01'),
        new Date('2025-01-31')
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: { daysProcessed: 31 },
        message: 'Successfully backfilled 31 days of metrics',
      });
    });

    it('should return 400 if startDate is missing', async () => {
      mockRequest.body = { endDate: '2025-01-31' };

      await dashboardController.backfillMetrics(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'startDate and endDate are required',
      });
    });

    it('should return 400 if endDate is missing', async () => {
      mockRequest.body = { startDate: '2025-01-01' };

      await dashboardController.backfillMetrics(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe('getDailyMetrics', () => {
    it('should return daily metrics successfully', async () => {
      const mockMetrics = [
        { date: new Date('2025-01-01'), dau: 1000, revenue: 5000 },
        { date: new Date('2025-01-02'), dau: 1100, revenue: 5500 },
      ];

      mockRequest.query = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      (timeSeriesRepository.getDailyMetrics as jest.Mock).mockResolvedValue(mockMetrics);

      await dashboardController.getDailyMetrics(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(timeSeriesRepository.getDailyMetrics).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockMetrics,
      });
    });
  });

  describe('getHourlyMetrics', () => {
    it('should return hourly metrics successfully', async () => {
      const mockMetrics = [
        { hour: new Date('2025-01-01T00:00:00'), activeUsers: 100 },
        { hour: new Date('2025-01-01T01:00:00'), activeUsers: 90 },
      ];

      mockRequest.query = {
        startDate: '2025-01-01T00:00:00',
        endDate: '2025-01-01T23:59:59',
      };

      (timeSeriesRepository.getHourlyMetrics as jest.Mock).mockResolvedValue(mockMetrics);

      await dashboardController.getHourlyMetrics(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(timeSeriesRepository.getHourlyMetrics).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockMetrics,
      });
    });
  });
});
