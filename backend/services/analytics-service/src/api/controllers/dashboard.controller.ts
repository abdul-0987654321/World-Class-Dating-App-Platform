/**
 * Dashboard Analytics Controller
 * Handles all analytics endpoints for the admin dashboard
 */

import { Request, Response } from 'express';
import eventsRepository from '../../domain/repositories/events.repository';
import engagementRepository from '../../domain/repositories/engagement.repository';
import matchSuccessRepository from '../../domain/repositories/match-success.repository';
import revenueRepository from '../../domain/repositories/revenue.repository';
import timeSeriesRepository from '../../domain/repositories/time-series.repository';
import { createLogger } from '@flamoral/backend-shared';

const logger = createLogger('dashboard-controller');

/**
 * Get dashboard overview
 * GET /api/dashboard/overview
 */
export async function getDashboardOverview(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Get key metrics in parallel
    const [
      engagementMetrics,
      matchMetrics,
      revenueMetrics,
      realTimeMetrics,
    ] = await Promise.all([
      engagementRepository.getEngagementMetrics(start, end),
      matchSuccessRepository.getMatchSuccessMetrics(start, end),
      revenueRepository.getRevenueMetrics(start, end),
      timeSeriesRepository.getRealTimeMetrics(),
    ]);

    // Calculate totals
    const totalDAU = engagementMetrics.reduce((sum, day) => sum + day.dau, 0) / engagementMetrics.length;
    const totalNewUsers = engagementMetrics.reduce((sum, day) => sum + day.newUsers, 0);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          averageDAU: Math.round(totalDAU),
          totalNewUsers,
          totalMatches: matchMetrics.totalMatches,
          totalRevenue: revenueMetrics.totalRevenue,
          conversionRate: matchMetrics.conversationRate,
          mrr: revenueMetrics.mrr,
          arr: revenueMetrics.arr,
        },
        realTime: realTimeMetrics,
        trends: {
          engagement: engagementMetrics.slice(0, 7),
          revenue: revenueMetrics,
        },
      },
    });
  } catch (error: any) {
    logger.error('Get dashboard overview error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get dashboard overview',
    });
  }
}

/**
 * Get engagement analytics
 * GET /api/dashboard/engagement
 */
export async function getEngagementAnalytics(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const today = new Date();
    const dau = await engagementRepository.getDAU(today);
    const wau = await engagementRepository.getWAU(today);
    const mau = await engagementRepository.getMAU(today);

    const [
      engagementMetrics,
      retentionCohorts,
      churnRate,
      featureUsage,
      timeOnApp,
    ] = await Promise.all([
      engagementRepository.getEngagementMetrics(start, end),
      engagementRepository.getRetentionCohorts(start, end),
      engagementRepository.getChurnRate(start, end),
      engagementRepository.getFeatureUsage(start, end),
      engagementRepository.getTimeOnAppStats(start, end),
    ]);

    res.status(200).json({
      success: true,
      data: {
        currentMetrics: {
          dau,
          wau,
          mau,
          stickinessRatio: mau > 0 ? (dau / mau) * 100 : 0,
        },
        trends: engagementMetrics,
        retention: retentionCohorts,
        churn: churnRate,
        featureUsage: featureUsage.slice(0, 20),
        timeOnApp,
      },
    });
  } catch (error: any) {
    logger.error('Get engagement analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get engagement analytics',
    });
  }
}

/**
 * Get match success analytics
 * GET /api/dashboard/match-success
 */
export async function getMatchSuccessAnalytics(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const [
      matchMetrics,
      matchFunnel,
      dateArrangementStats,
      responseTimeDistribution,
      topMatches,
    ] = await Promise.all([
      matchSuccessRepository.getMatchSuccessMetrics(start, end),
      matchSuccessRepository.getMatchToConversationFunnel(start, end),
      matchSuccessRepository.getDateArrangementStats(start, end),
      matchSuccessRepository.getResponseTimeDistribution(start, end),
      matchSuccessRepository.getTopMatches(100, start, end),
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: matchMetrics,
        funnel: matchFunnel,
        dateArrangements: dateArrangementStats,
        responseTimeDistribution,
        topConversations: topMatches.slice(0, 10),
      },
    });
  } catch (error: any) {
    logger.error('Get match success analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get match success analytics',
    });
  }
}

/**
 * Get revenue analytics
 * GET /api/dashboard/revenue
 */
export async function getRevenueAnalytics(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const [
      revenueMetrics,
      subscriptionMetrics,
      coinPurchaseMetrics,
      conversionFunnel,
      revenueByTime,
      arpu,
      arppu,
      topUsers,
    ] = await Promise.all([
      revenueRepository.getRevenueMetrics(start, end),
      revenueRepository.getSubscriptionMetrics(start, end),
      revenueRepository.getCoinPurchaseMetrics(start, end),
      revenueRepository.getConversionFunnelMetrics(start, end),
      revenueRepository.getRevenueByTimePeriod(start, end, 'day'),
      revenueRepository.getARPU(start, end),
      revenueRepository.getARPPU(start, end),
      revenueRepository.getTopRevenueUsers(10, start, end),
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: revenueMetrics,
        subscriptions: subscriptionMetrics,
        coinPurchases: coinPurchaseMetrics,
        conversionFunnel,
        revenueTimeSeries: revenueByTime,
        arpu,
        arppu,
        topRevenueUsers: topUsers,
      },
    });
  } catch (error: any) {
    logger.error('Get revenue analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get revenue analytics',
    });
  }
}

/**
 * Get user behavior analytics
 * GET /api/dashboard/user-behavior
 */
export async function getUserBehaviorAnalytics(req: Request, res: Response) {
  try {
    const { startDate, endDate, groupBy } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();
    const group = (groupBy as 'hour' | 'day' | 'week') || 'day';

    const [
      sessionStats,
      swipesByTime,
      featureUsage,
      powerUsers,
    ] = await Promise.all([
      eventsRepository.getSessionStats(start, end),
      eventsRepository.getSwipesByTimeRange(start, end, group),
      engagementRepository.getFeatureUsage(start, end),
      engagementRepository.getPowerUsers(10, start, end),
    ]);

    res.status(200).json({
      success: true,
      data: {
        sessionStats,
        swipeActivity: swipesByTime,
        featureUsage: featureUsage.slice(0, 15),
        powerUsers: powerUsers.slice(0, 20),
      },
    });
  } catch (error: any) {
    logger.error('Get user behavior analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get user behavior analytics',
    });
  }
}

/**
 * Get time-series data
 * GET /api/dashboard/time-series
 */
export async function getTimeSeriesData(req: Request, res: Response) {
  try {
    const { metric, startDate, endDate, groupBy } = req.query;

    if (!metric) {
      return res.status(400).json({
        success: false,
        error: 'metric parameter is required',
      });
    }

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();
    const group = (groupBy as 'hour' | 'day' | 'week' | 'month') || 'day';

    const data = await timeSeriesRepository.getMetricsByPeriod(
      metric as string,
      start,
      end,
      group
    );

    res.status(200).json({
      success: true,
      data: {
        metric: metric as string,
        period: group,
        dataPoints: data,
      },
    });
  } catch (error: any) {
    logger.error('Get time-series data error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get time-series data',
    });
  }
}

/**
 * Get comparison metrics
 * GET /api/dashboard/comparison
 */
export async function getComparisonMetrics(req: Request, res: Response) {
  try {
    const { currentStart, currentEnd, previousStart, previousEnd } = req.query;

    if (!currentStart || !currentEnd || !previousStart || !previousEnd) {
      return res.status(400).json({
        success: false,
        error: 'currentStart, currentEnd, previousStart, and previousEnd are required',
      });
    }

    const comparison = await timeSeriesRepository.getComparisonMetrics(
      new Date(currentStart as string),
      new Date(currentEnd as string),
      new Date(previousStart as string),
      new Date(previousEnd as string)
    );

    res.status(200).json({
      success: true,
      data: comparison,
    });
  } catch (error: any) {
    logger.error('Get comparison metrics error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get comparison metrics',
    });
  }
}

/**
 * Get real-time metrics
 * GET /api/dashboard/real-time
 */
export async function getRealTimeMetrics(req: Request, res: Response) {
  try {
    const metrics = await timeSeriesRepository.getRealTimeMetrics();

    res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error: any) {
    logger.error('Get real-time metrics error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get real-time metrics',
    });
  }
}

/**
 * Get user activity summary
 * GET /api/dashboard/user/:userId/activity
 */
export async function getUserActivitySummary(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required',
      });
    }

    const [
      activitySummary,
      swipeStats,
      matchSuccessRate,
    ] = await Promise.all([
      engagementRepository.getUserActivitySummary(userId),
      eventsRepository.getUserSwipeStats(userId),
      eventsRepository.getUserMatchSuccessRate(userId),
    ]);

    res.status(200).json({
      success: true,
      data: {
        ...activitySummary,
        swipeStats,
        matchSuccessRate,
      },
    });
  } catch (error: any) {
    logger.error('Get user activity summary error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get user activity summary',
    });
  }
}

/**
 * Track event from dashboard (for testing)
 * POST /api/dashboard/track-event
 */
export async function trackEventFromDashboard(req: Request, res: Response) {
  try {
    const { eventType, ...eventData } = req.body;

    let result;

    switch (eventType) {
      case 'swipe':
        result = await eventsRepository.trackSwipe(eventData);
        break;
      case 'match':
        result = await eventsRepository.trackMatch(eventData);
        break;
      case 'message':
        result = await eventsRepository.trackMessage(eventData);
        break;
      case 'session':
        result = await eventsRepository.trackSession(eventData);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid event type',
        });
    }

    res.status(201).json({
      success: true,
      data: result,
      message: 'Event tracked successfully',
    });
  } catch (error: any) {
    logger.error('Track event from dashboard error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to track event',
    });
  }
}

/**
 * Aggregate metrics manually
 * POST /api/dashboard/aggregate
 */
export async function aggregateMetrics(req: Request, res: Response) {
  try {
    const { date, type } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'date is required',
      });
    }

    const targetDate = new Date(date);

    let result;

    if (type === 'daily' || !type) {
      result = await timeSeriesRepository.aggregateDailyMetrics(targetDate);
    } else if (type === 'hourly') {
      result = await timeSeriesRepository.aggregateHourlyMetrics(targetDate);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid aggregation type',
      });
    }

    res.status(200).json({
      success: true,
      data: result,
      message: 'Metrics aggregated successfully',
    });
  } catch (error: any) {
    logger.error('Aggregate metrics error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to aggregate metrics',
    });
  }
}

/**
 * Backfill aggregated metrics
 * POST /api/dashboard/backfill
 */
export async function backfillMetrics(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required',
      });
    }

    const count = await timeSeriesRepository.backfillDailyMetrics(
      new Date(startDate),
      new Date(endDate)
    );

    res.status(200).json({
      success: true,
      data: { daysProcessed: count },
      message: `Successfully backfilled ${count} days of metrics`,
    });
  } catch (error: any) {
    logger.error('Backfill metrics error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to backfill metrics',
    });
  }
}

/**
 * Get daily metrics
 * GET /api/dashboard/daily-metrics
 */
export async function getDailyMetrics(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const metrics = await timeSeriesRepository.getDailyMetrics(start, end);

    res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error: any) {
    logger.error('Get daily metrics error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get daily metrics',
    });
  }
}

/**
 * Get hourly metrics
 * GET /api/dashboard/hourly-metrics
 */
export async function getHourlyMetrics(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const metrics = await timeSeriesRepository.getHourlyMetrics(start, end);

    res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error: any) {
    logger.error('Get hourly metrics error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get hourly metrics',
    });
  }
}
