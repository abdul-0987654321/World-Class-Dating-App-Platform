/**
 * Ad Revenue Service Tests
 *
 * Tests for:
 * 1. Ad impression tracking
 * 2. Click tracking
 * 3. Revenue calculation
 * 4. Partner attribution
 * 5. Daily/monthly aggregation
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock the database connection
jest.mock('../infrastructure/database/connection', () => {
  const mockDb = jest.fn(() => mockDb);
  (mockDb as any).where = jest.fn(() => mockDb);
  (mockDb as any).first = jest.fn();
  (mockDb as any).select = jest.fn(() => mockDb);
  (mockDb as any).insert = jest.fn();
  (mockDb as any).update = jest.fn(() => mockDb);
  (mockDb as any).increment = jest.fn(() => mockDb);
  (mockDb as any).whereBetween = jest.fn(() => mockDb);
  (mockDb as any).groupBy = jest.fn(() => mockDb);
  (mockDb as any).countDistinct = jest.fn(() => mockDb);
  (mockDb as any).raw = jest.fn((sql: string) => sql);
  return { default: mockDb };
});

// Mock logger
jest.mock('../utils/logger', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-12345'),
}));

import db from '../infrastructure/database/connection';

// Type definitions for mocked db
interface MockDb {
  where: jest.Mock;
  first: jest.Mock;
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  increment: jest.Mock;
  whereBetween: jest.Mock;
  groupBy: jest.Mock;
  countDistinct: jest.Mock;
  raw: jest.Mock;
}

const mockDb = db as unknown as jest.Mock & MockDb;

// Helper to create mock date
const createMockDate = (dateString: string): Date => new Date(dateString);

// Helper to advance time
const advanceTime = (ms: number): void => {
  jest.advanceTimersByTime(ms);
};

describe('Ad Revenue Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-04T12:00:00Z'));

    // Reset mock chain returns
    mockDb.mockReturnValue(mockDb);
    mockDb.where.mockReturnValue(mockDb);
    mockDb.select.mockReturnValue(mockDb);
    mockDb.update.mockReturnValue(mockDb);
    mockDb.increment.mockReturnValue(mockDb);
    mockDb.whereBetween.mockReturnValue(mockDb);
    mockDb.groupBy.mockReturnValue(mockDb);
    mockDb.countDistinct.mockReturnValue(mockDb);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ============================================================================
  // IMPRESSION TRACKING TESTS
  // ============================================================================
  describe('Ad Impression Tracking', () => {
    describe('recordImpression', () => {
      test('should record a banner ad impression', async () => {
        const { adRevenueService } = await import('../domain/services/ad-revenue.service');

        mockDb.first.mockResolvedValue({
          user_id: 'user-123',
          interstitials_shown_today: 0,
          interstitials_shown_session: 0,
          rewarded_views_today: 0,
          actions_this_session: 0,
          last_reset_date: '2026-01-04',
        });
        mockDb.insert.mockResolvedValue([1]);

        const result = await adRevenueService.recordImpression({
          userId: 'user-123',
          adType: 'banner',
          network: 'admob',
          placement: 'home_bottom',
          platform: 'ios',
          sessionId: 'session-abc',
          deviceInfo: {
            deviceId: 'device-123',
            platform: 'ios',
            osVersion: '17.0',
            appVersion: '1.0.0',
          },
        });

        expect(result).toBeDefined();
        expect(result.id).toBe('mock-uuid-12345');
        expect(result.userId).toBe('user-123');
        expect(result.adType).toBe('banner');
        expect(result.network).toBe('admob');
        expect(result.placement).toBe('home_bottom');
        expect(result.clicked).toBe(false);
      });

      test('should record an interstitial ad impression', async () => {
        const { adRevenueService } = await import('../domain/services/ad-revenue.service');

        mockDb.first.mockResolvedValue({
          user_id: 'user-123',
          interstitials_shown_today: 2,
          interstitials_shown_session: 1,
          rewarded_views_today: 0,
          actions_this_session: 5,
          last_reset_date: '2026-01-04',
        });
        mockDb.insert.mockResolvedValue([1]);
        mockDb.update.mockResolvedValue(1);
        mockDb.increment.mockReturnValue(mockDb);

        const result = await adRevenueService.recordImpression({
          userId: 'user-123',
          adType: 'interstitial',
          network: 'facebook',
          placement: 'match_transition',
          platform: 'android',
          sessionId: 'session-def',
          deviceInfo: {
            deviceId: 'device-456',
            platform: 'android',
            osVersion: '14',
            appVersion: '1.0.0',
          },
        });

        expect(result.adType).toBe('interstitial');
        expect(result.network).toBe('facebook');
        expect(mockDb.insert).toHaveBeenCalled();
      });

      test('should record a rewarded video ad impression', async () => {
        const { adRevenueService } = await import('../domain/services/ad-revenue.service');

        mockDb.first.mockResolvedValue({
          user_id: 'user-789',
          interstitials_shown_today: 0,
          interstitials_shown_session: 0,
          rewarded_views_today: 3,
          actions_this_session: 10,
          last_reset_date: '2026-01-04',
        });
        mockDb.insert.mockResolvedValue([1]);
        mockDb.update.mockResolvedValue(1);
        mockDb.increment.mockReturnValue(mockDb);

        const result = await adRevenueService.recordImpression({
          userId: 'user-789',
          adType: 'rewarded',
          network: 'unity',
          placement: 'earn_coins_button',
          platform: 'ios',
          sessionId: 'session-ghi',
          deviceInfo: {
            deviceId: 'device-789',
            platform: 'ios',
            osVersion: '17.2',
            appVersion: '1.1.0',
          },
        });

        expect(result.adType).toBe('rewarded');
        expect(result.network).toBe('unity');
      });

      test('should track impression time accurately', async () => {
        const { adRevenueService } = await import('../domain/services/ad-revenue.service');

        mockDb.first.mockResolvedValue({
          user_id: 'user-123',
          last_reset_date: '2026-01-04',
        });
        mockDb.insert.mockResolvedValue([1]);

        const beforeCall = new Date();
        const result = await adRevenueService.recordImpression({
          userId: 'user-123',
          adType: 'banner',
          network: 'admob',
          placement: 'profile_top',
          platform: 'web',
          sessionId: 'session-123',
          deviceInfo: {
            deviceId: 'device-123',
            platform: 'web',
            osVersion: 'Chrome 120',
            appVersion: '1.0.0',
          },
        });
        const afterCall = new Date();

        expect(result.impressionTime).toBeDefined();
        expect(result.impressionTime.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
        expect(result.impressionTime.getTime()).toBeLessThanOrEqual(afterCall.getTime());
      });

      test('should handle multiple ad networks', async () => {
        const { adRevenueService } = await import('../domain/services/ad-revenue.service');

        const networks = ['admob', 'facebook', 'unity', 'applovin', 'custom'] as const;

        mockDb.first.mockResolvedValue({
          user_id: 'user-123',
          last_reset_date: '2026-01-04',
        });
        mockDb.insert.mockResolvedValue([1]);

        for (const network of networks) {
          const result = await adRevenueService.recordImpression({
            userId: 'user-123',
            adType: 'banner',
            network,
            placement: 'test_placement',
            platform: 'ios',
            sessionId: 'session-123',
            deviceInfo: {
              deviceId: 'device-123',
              platform: 'ios',
              osVersion: '17.0',
              appVersion: '1.0.0',
            },
          });

          expect(result.network).toBe(network);
          expect(result.adUnitId).toContain(network);
        }
      });
    });

    describe('Impression State Updates', () => {
      test('should update interstitial counters on impression', async () => {
        const { adRevenueService } = await import('../domain/services/ad-revenue.service');

        mockDb.first.mockResolvedValue({
          user_id: 'user-123',
          interstitials_shown_today: 1,
          interstitials_shown_session: 0,
          last_reset_date: '2026-01-04',
        });
        mockDb.insert.mockResolvedValue([1]);
        mockDb.update.mockResolvedValue(1);
        mockDb.increment.mockReturnValue(mockDb);

        await adRevenueService.recordImpression({
          userId: 'user-123',
          adType: 'interstitial',
          network: 'admob',
          placement: 'match_transition',
          platform: 'ios',
          sessionId: 'session-123',
          deviceInfo: {
            deviceId: 'device-123',
            platform: 'ios',
            osVersion: '17.0',
            appVersion: '1.0.0',
          },
        });

        // Verify increment was called for interstitial counters
        expect(mockDb.increment).toHaveBeenCalled();
      });

      test('should update rewarded counters on impression', async () => {
        const { adRevenueService } = await import('../domain/services/ad-revenue.service');

        mockDb.first.mockResolvedValue({
          user_id: 'user-123',
          rewarded_views_today: 2,
          last_reset_date: '2026-01-04',
        });
        mockDb.insert.mockResolvedValue([1]);
        mockDb.update.mockResolvedValue(1);
        mockDb.increment.mockReturnValue(mockDb);

        await adRevenueService.recordImpression({
          userId: 'user-123',
          adType: 'rewarded',
          network: 'unity',
          placement: 'earn_coins',
          platform: 'ios',
          sessionId: 'session-123',
          deviceInfo: {
            deviceId: 'device-123',
            platform: 'ios',
            osVersion: '17.0',
            appVersion: '1.0.0',
          },
        });

        expect(mockDb.increment).toHaveBeenCalled();
      });
    });
  });

  // ============================================================================
  // CLICK TRACKING TESTS
  // ============================================================================
  describe('Click Tracking', () => {
    describe('recordClick', () => {
      test('should record a click for existing impression', async () => {
        const { adRevenueService } = await import('../domain/services/ad-revenue.service');

        mockDb.first.mockResolvedValue({
          id: 'impression-123',
          user_id: 'user-123',
          ad_type: 'banner',
          network: 'admob',
        });
        mockDb.insert.mockResolvedValue([1]);
        mockDb.update.mockResolvedValue(1);

        const result = await adRevenueService.recordClick({
          impressionId: 'impression-123',
          userId: 'user-123',
          adType: 'banner',
        });

        expect(result).toBeDefined();
        expect(result?.impressionId).toBe('impression-123');
        expect(result?.userId).toBe('user-123');
        expect(result?.clickTime).toBeDefined();
      });

      test('should return null for non-existent impression', async () => {
        const { adRevenueService } = await import('../domain/services/ad-revenue.service');

        mockDb.first.mockResolvedValue(null);

        const result = await adRevenueService.recordClick({
          impressionId: 'non-existent-impression',
          userId: 'user-123',
          adType: 'banner',
        });

        expect(result).toBeNull();
      });

      test('should update impression clicked status', async () => {
        const { adRevenueService } = await import('../domain/services/ad-revenue.service');

        mockDb.first.mockResolvedValue({
          id: 'impression-456',
          user_id: 'user-456',
          ad_type: 'interstitial',
          clicked: false,
        });
        mockDb.insert.mockResolvedValue([1]);
        mockDb.update.mockResolvedValue(1);

        await adRevenueService.recordClick({
          impressionId: 'impression-456',
          userId: 'user-456',
          adType: 'interstitial',
        });

        expect(mockDb.update).toHaveBeenCalled();
      });

      test('should track click time accurately', async () => {
        const { adRevenueService } = await import('../domain/services/ad-revenue.service');

        mockDb.first.mockResolvedValue({
          id: 'impression-789',
          user_id: 'user-789',
          ad_type: 'banner',
        });
        mockDb.insert.mockResolvedValue([1]);
        mockDb.update.mockResolvedValue(1);

        const beforeCall = new Date();
        const result = await adRevenueService.recordClick({
          impressionId: 'impression-789',
          userId: 'user-789',
          adType: 'banner',
        });
        const afterCall = new Date();

        expect(result?.clickTime).toBeDefined();
        expect(result?.clickTime.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
        expect(result?.clickTime.getTime()).toBeLessThanOrEqual(afterCall.getTime());
      });
    });

    describe('CTR Calculation', () => {
      test('should calculate CTR correctly with clicks', async () => {
        const { adRevenueService } = await import('../domain/services/ad-revenue.service');

        mockDb.select.mockReturnValue(mockDb);
        mockDb.groupBy.mockResolvedValue([
          {
            ad_type: 'banner',
            network: 'admob',
            placement: 'home_bottom',
            impression_count: '1000',
            click_count: '25',
            total_revenue: '50.00',
          },
        ]);

        const startDate = new Date('2026-01-01');
        const endDate = new Date('2026-01-04');

        const metrics = await adRevenueService.getPerformanceMetrics(startDate, endDate, 'daily');

        expect(metrics.ctr).toBe(2.5); // 25/1000 * 100 = 2.5%
      });

      test('should handle zero impressions gracefully', async () => {
        const { adRevenueService } = await import('../domain/services/ad-revenue.service');

        mockDb.select.mockReturnValue(mockDb);
        mockDb.groupBy.mockResolvedValue([]);

        const startDate = new Date('2026-01-01');
        const endDate = new Date('2026-01-04');

        const metrics = await adRevenueService.getPerformanceMetrics(startDate, endDate, 'daily');

        expect(metrics.ctr).toBe(0);
        expect(metrics.impressions).toBe(0);
        expect(metrics.clicks).toBe(0);
      });
    });
  });

  // ============================================================================
  // REVENUE CALCULATION TESTS
  // ============================================================================
  describe('Revenue Calculation', () => {
    describe('getPerformanceMetrics', () => {
      test('should calculate total revenue across all networks', async () => {
        const { adRevenueService } = await import('../domain/services/ad-revenue.service');

        mockDb.select.mockReturnValue(mockDb);
        mockDb.groupBy.mockResolvedValue([
          {
            ad_type: 'banner',
            network: 'admob',
            placement: 'home',
            impression_count: '1000',
            click_count: '20',
            total_revenue: '5.00',
          },
          {
            ad_type: 'interstitial',
            network: 'facebook',
            placement: 'transition',
            impression_count: '500',
            click_count: '15',
            total_revenue: '15.00',
          },
          {
            ad_type: 'rewarded',
            network: 'unity',
            placement: 'earn_coins',
            impression_count: '200',
            click_count: '10',
            total_revenue: '30.00',
          },
        ]);

        const startDate = new Date('2026-01-01');
        const endDate = new Date('2026-01-04');

        const metrics = await adRevenueService.getPerformanceMetrics(startDate, endDate, 'daily');

        expect(metrics.revenue).toBe(50.00); // 5 + 15 + 30
        expect(metrics.impressions).toBe(1700); // 1000 + 500 + 200
        expect(metrics.clicks).toBe(45); // 20 + 15 + 10
      });

      test('should calculate eCPM correctly', async () => {
        const { adRevenueService } = await import('../domain/services/ad-revenue.service');

        mockDb.select.mockReturnValue(mockDb);
        mockDb.groupBy.mockResolvedValue([
          {
            ad_type: 'banner',
            network: 'admob',
            placement: 'home',
            impression_count: '2000',
            click_count: '40',
            total_revenue: '10.00',
          },
        ]);

        const startDate = new Date('2026-01-01');
        const endDate = new Date('2026-01-04');

        const metrics = await adRevenueService.getPerformanceMetrics(startDate, endDate, 'daily');

        expect(metrics.ecpm).toBe(5.00); // (10.00 / 2000) * 1000 = 5.00
      });

      test('should break down revenue by ad type', async () => {
        const { adRevenueService } = await import('../domain/services/ad-revenue.service');

        mockDb.select.mockReturnValue(mockDb);
        mockDb.groupBy.mockResolvedValue([
          {
            ad_type: 'banner',
            network: 'admob',
            placement: 'home',
            impression_count: '1000',
            click_count: '10',
            total_revenue: '5.00',
          },
          {
            ad_type: 'interstitial',
            network: 'admob',
            placement: 'transition',
            impression_count: '500',
            click_count: '25',
            total_revenue: '20.00',
          },
          {
            ad_type: 'rewarded',
            network: 'unity',
            placement: 'coins',
            impression_count: '300',
            click_count: '30',
            total_revenue: '45.00',
          },
        ]);

        const startDate = new Date('2026-01-01');
        const endDate = new Date('2026-01-04');

        const metrics = await adRevenueService.getPerformanceMetrics(startDate, endDate, 'daily');

        expect(metrics.byAdType.banner?.revenue).toBe(5.00);
        expect(metrics.byAdType.interstitial?.revenue).toBe(20.00);
        expect(metrics.byAdType.rewarded?.revenue).toBe(45.00);
      });

      test('should break down revenue by network', async () => {
        const { adRevenueService } = await import('../domain/services/ad-revenue.service');

        mockDb.select.mockReturnValue(mockDb);
        mockDb.groupBy.mockResolvedValue([
          {
            ad_type: 'banner',
            network: 'admob',
            placement: 'home',
            impression_count: '500',
            click_count: '10',
            total_revenue: '5.00',
          },
          {
            ad_type: 'banner',
            network: 'facebook',
            placement: 'profile',
            impression_count: '500',
            click_count: '15',
            total_revenue: '7.50',
          },
          {
            ad_type: 'rewarded',
            network: 'unity',
            placement: 'coins',
            impression_count: '200',
            click_count: '20',
            total_revenue: '30.00',
          },
        ]);

        const startDate = new Date('2026-01-01');
        const endDate = new Date('2026-01-04');

        const metrics = await adRevenueService.getPerformanceMetrics(startDate, endDate, 'daily');

        expect(metrics.byNetwork.admob?.revenue).toBe(5.00);
        expect(metrics.byNetwork.facebook?.revenue).toBe(7.50);
        expect(metrics.byNetwork.unity?.revenue).toBe(30.00);
      });

      test('should break down revenue by placement', async () => {
        const { adRevenueService } = await import('../domain/services/ad-revenue.service');

        mockDb.select.mockReturnValue(mockDb);
        mockDb.groupBy.mockResolvedValue([
          {
            ad_type: 'banner',
            network: 'admob',
            placement: 'home_bottom',
            impression_count: '1000',
            click_count: '20',
            total_revenue: '10.00',
          },
          {
            ad_type: 'banner',
            network: 'admob',
            placement: 'profile_top',
            impression_count: '500',
            click_count: '10',
            total_revenue: '5.00',
          },
          {
            ad_type: 'interstitial',
            network: 'facebook',
            placement: 'match_transition',
            impression_count: '300',
            click_count: '15',
            total_revenue: '25.00',
          },
        ]);

        const startDate = new Date('2026-01-01');
        const endDate = new Date('2026-01-04');

        const metrics = await adRevenueService.getPerformanceMetrics(startDate, endDate, 'daily');

        expect(metrics.byPlacement['home_bottom'].revenue).toBe(10.00);
        expect(metrics.byPlacement['profile_top'].revenue).toBe(5.00);
        expect(metrics.byPlacement['match_transition'].revenue).toBe(25.00);
      });
    });
  });

  // ============================================================================
  // PARTNER ATTRIBUTION TESTS
  // ============================================================================
  describe('Partner Attribution', () => {
    describe('Network Attribution', () => {
      test('should correctly attribute impressions to networks', async () => {
        const { adRevenueService } = await import('../domain/services/ad-revenue.service');

        mockDb.select.mockReturnValue(mockDb);
        mockDb.groupBy.mockResolvedValue([
          {
            ad_type: 'banner',
            network: 'admob',
            placement: 'home',
            impression_count: '5000',
            click_count: '100',
            total_revenue: '25.00',
          },
          {
            ad_type: 'interstitial',
            network: 'facebook',
            placement: 'transition',
            impression_count: '2000',
            click_count: '80',
            total_revenue: '40.00',
          },
          {
            ad_type: 'rewarded',
            network: 'unity',
            placement: 'coins',
            impression_count: '1000',
            click_count: '50',
            total_revenue: '75.00',
          },
          {
            ad_type: 'banner',
            network: 'applovin',
            placement: 'messages',
            impression_count: '3000',
            click_count: '60',
            total_revenue: '15.00',
          },
        ]);

        const startDate = new Date('2026-01-01');
        const endDate = new Date('2026-01-04');

        const metrics = await adRevenueService.getPerformanceMetrics(startDate, endDate, 'daily');

        expect(metrics.byNetwork.admob?.impressions).toBe(5000);
        expect(metrics.byNetwork.facebook?.impressions).toBe(2000);
        expect(metrics.byNetwork.unity?.impressions).toBe(1000);
        expect(metrics.byNetwork.applovin?.impressions).toBe(3000);
      });

      test('should calculate network-specific eCPM', async () => {
        const { adRevenueService } = await import('../domain/services/ad-revenue.service');

        mockDb.select.mockReturnValue(mockDb);
        mockDb.groupBy.mockResolvedValue([
          {
            ad_type: 'rewarded',
            network: 'unity',
            placement: 'coins',
            impression_count: '1000',
            click_count: '100',
            total_revenue: '80.00',
          },
          {
            ad_type: 'banner',
            network: 'admob',
            placement: 'home',
            impression_count: '2000',
            click_count: '40',
            total_revenue: '10.00',
          },
        ]);

        const startDate = new Date('2026-01-01');
        const endDate = new Date('2026-01-04');

        const metrics = await adRevenueService.getPerformanceMetrics(startDate, endDate, 'daily');

        expect(metrics.byNetwork.unity?.ecpm).toBe(80.00); // (80/1000)*1000
        expect(metrics.byNetwork.admob?.ecpm).toBe(5.00); // (10/2000)*1000
      });

      test('should calculate network-specific CTR', async () => {
        const { adRevenueService } = await import('../domain/services/ad-revenue.service');

        mockDb.select.mockReturnValue(mockDb);
        mockDb.groupBy.mockResolvedValue([
          {
            ad_type: 'banner',
            network: 'facebook',
            placement: 'home',
            impression_count: '1000',
            click_count: '50',
            total_revenue: '25.00',
          },
          {
            ad_type: 'banner',
            network: 'admob',
            placement: 'profile',
            impression_count: '2000',
            click_count: '30',
            total_revenue: '10.00',
          },
        ]);

        const startDate = new Date('2026-01-01');
        const endDate = new Date('2026-01-04');

        const metrics = await adRevenueService.getPerformanceMetrics(startDate, endDate, 'daily');

        expect(metrics.byNetwork.facebook?.ctr).toBe(5.00); // (50/1000)*100
        expect(metrics.byNetwork.admob?.ctr).toBe(1.50); // (30/2000)*100
      });
    });
  });

  // ============================================================================
  // DAILY/MONTHLY AGGREGATION TESTS
  // ============================================================================
  describe('Daily/Monthly Aggregation', () => {
    describe('Daily Aggregation', () => {
      test('should aggregate metrics for daily period', async () => {
        const { adRevenueService } = await import('../domain/services/ad-revenue.service');

        mockDb.select.mockReturnValue(mockDb);
        mockDb.groupBy.mockResolvedValue([
          {
            ad_type: 'banner',
            network: 'admob',
            placement: 'home',
            impression_count: '5000',
            click_count: '100',
            total_revenue: '25.00',
          },
        ]);

        const startDate = new Date('2026-01-04T00:00:00Z');
        const endDate = new Date('2026-01-04T23:59:59Z');

        const metrics = await adRevenueService.getPerformanceMetrics(startDate, endDate, 'daily');

        expect(metrics.period).toBe('daily');
        expect(metrics.startDate).toEqual(startDate);
        expect(metrics.endDate).toEqual(endDate);
      });

      test('should reset daily counters at midnight', async () => {
        const { adRevenueService } = await import('../domain/services/ad-revenue.service');

        // First day state
        mockDb.first.mockResolvedValueOnce({
          user_id: 'user-123',
          interstitials_shown_today: 10,
          rewarded_views_today: 5,
          last_reset_date: '2026-01-03', // Yesterday
        });
        mockDb.update.mockResolvedValue(1);

        const state = await adRevenueService.getUserState('user-123');

        // When date changes, counters should be reset
        expect(mockDb.update).toHaveBeenCalled();
      });
    });

    describe('Weekly Aggregation', () => {
      test('should aggregate metrics for weekly period', async () => {
        const { adRevenueService } = await import('../domain/services/ad-revenue.service');

        mockDb.select.mockReturnValue(mockDb);
        mockDb.groupBy.mockResolvedValue([
          {
            ad_type: 'banner',
            network: 'admob',
            placement: 'home',
            impression_count: '35000',
            click_count: '700',
            total_revenue: '175.00',
          },
        ]);

        const startDate = new Date('2025-12-29T00:00:00Z');
        const endDate = new Date('2026-01-04T23:59:59Z');

        const metrics = await adRevenueService.getPerformanceMetrics(startDate, endDate, 'weekly');

        expect(metrics.period).toBe('weekly');
        expect(metrics.impressions).toBe(35000);
        expect(metrics.revenue).toBe(175.00);
      });
    });

    describe('Monthly Aggregation', () => {
      test('should aggregate metrics for monthly period', async () => {
        const { adRevenueService } = await import('../domain/services/ad-revenue.service');

        mockDb.select.mockReturnValue(mockDb);
        mockDb.groupBy.mockResolvedValue([
          {
            ad_type: 'banner',
            network: 'admob',
            placement: 'home',
            impression_count: '150000',
            click_count: '3000',
            total_revenue: '750.00',
          },
          {
            ad_type: 'interstitial',
            network: 'facebook',
            placement: 'transition',
            impression_count: '30000',
            click_count: '1500',
            total_revenue: '600.00',
          },
          {
            ad_type: 'rewarded',
            network: 'unity',
            placement: 'coins',
            impression_count: '10000',
            click_count: '1000',
            total_revenue: '1500.00',
          },
        ]);

        const startDate = new Date('2025-12-01T00:00:00Z');
        const endDate = new Date('2025-12-31T23:59:59Z');

        const metrics = await adRevenueService.getPerformanceMetrics(startDate, endDate, 'monthly');

        expect(metrics.period).toBe('monthly');
        expect(metrics.impressions).toBe(190000);
        expect(metrics.revenue).toBe(2850.00);
        expect(metrics.clicks).toBe(5500);
      });
    });

    describe('Reward Analytics Aggregation', () => {
      test('should aggregate reward analytics by type', async () => {
        const { adRevenueService } = await import('../domain/services/ad-revenue.service');

        mockDb.select.mockReturnValue(mockDb);
        mockDb.groupBy.mockResolvedValue([
          {
            reward_type: 'coins',
            total_earned: '500',
            total_claimed: '480',
            total_value: '4800',
            avg_completion: '97.5',
          },
          {
            reward_type: 'super_likes',
            total_earned: '200',
            total_claimed: '195',
            total_value: '195',
            avg_completion: '98.0',
          },
          {
            reward_type: 'boosts',
            total_earned: '100',
            total_claimed: '95',
            total_value: '95',
            avg_completion: '96.5',
          },
        ]);
        mockDb.countDistinct.mockReturnValue(mockDb);
        mockDb.first.mockResolvedValue({ count: '350' });

        const startDate = new Date('2026-01-01');
        const endDate = new Date('2026-01-04');

        const analytics = await adRevenueService.getRewardAnalytics(startDate, endDate, 'daily');

        expect(analytics.totalRewardsEarned).toBe(800);
        expect(analytics.totalRewardsClaimed).toBe(770);
        expect(analytics.uniqueUsers).toBe(350);
        expect(analytics.byRewardType.coins?.earned).toBe(500);
        expect(analytics.byRewardType.super_likes?.earned).toBe(200);
        expect(analytics.byRewardType.boosts?.earned).toBe(100);
      });

      test('should calculate video completion rate', async () => {
        const { adRevenueService } = await import('../domain/services/ad-revenue.service');

        mockDb.select.mockReturnValue(mockDb);
        mockDb.groupBy.mockResolvedValue([
          {
            reward_type: 'coins',
            total_earned: '100',
            total_claimed: '95',
            total_value: '950',
            avg_completion: '97.0',
          },
          {
            reward_type: 'super_likes',
            total_earned: '50',
            total_claimed: '48',
            total_value: '48',
            avg_completion: '96.0',
          },
        ]);
        mockDb.countDistinct.mockReturnValue(mockDb);
        mockDb.first.mockResolvedValue({ count: '75' });

        const startDate = new Date('2026-01-01');
        const endDate = new Date('2026-01-04');

        const analytics = await adRevenueService.getRewardAnalytics(startDate, endDate, 'daily');

        // Average of 97.0 and 96.0
        expect(analytics.videoCompletionRate).toBeCloseTo(96.5, 1);
      });
    });
  });

  // ============================================================================
  // FREQUENCY CAPPING TESTS
  // ============================================================================
  describe('Frequency Capping', () => {
    test('should enforce interstitial frequency cap', async () => {
      const { adRevenueService } = await import('../domain/services/ad-revenue.service');

      mockDb.first.mockResolvedValue({
        user_id: 'user-123',
        interstitials_shown_today: 15, // At daily max
        interstitials_shown_session: 5, // At session max
        rewarded_views_today: 0,
        actions_this_session: 10,
        last_reset_date: '2026-01-04',
        last_interstitial_time: new Date('2026-01-04T11:59:00Z'),
      });

      const stateResponse = await adRevenueService.getAdStateResponse('user-123');

      expect(stateResponse.canShowInterstitial).toBe(false);
      expect(stateResponse.remainingInterstitialsToday).toBe(0);
    });

    test('should enforce rewarded video frequency cap', async () => {
      const { adRevenueService } = await import('../domain/services/ad-revenue.service');

      mockDb.first.mockResolvedValue({
        user_id: 'user-123',
        interstitials_shown_today: 0,
        interstitials_shown_session: 0,
        rewarded_views_today: 10, // At daily max
        actions_this_session: 5,
        last_reset_date: '2026-01-04',
        last_rewarded_time: new Date('2026-01-04T11:55:00Z'),
      });

      const stateResponse = await adRevenueService.getAdStateResponse('user-123');

      expect(stateResponse.canShowRewarded).toBe(false);
      expect(stateResponse.remainingRewardedToday).toBe(0);
    });

    test('should respect cooldown between rewarded views', async () => {
      const { adRevenueService } = await import('../domain/services/ad-revenue.service');

      // Last rewarded view was 2 minutes ago (need 5 min cooldown)
      mockDb.first.mockResolvedValue({
        user_id: 'user-123',
        rewarded_views_today: 5,
        actions_this_session: 10,
        last_reset_date: '2026-01-04',
        last_rewarded_time: new Date('2026-01-04T11:58:00Z'), // 2 minutes ago
      });

      const stateResponse = await adRevenueService.getAdStateResponse('user-123');

      expect(stateResponse.canShowRewarded).toBe(false);
      expect(stateResponse.timeUntilNextRewarded).toBeGreaterThan(0);
    });

    test('should allow ads after cooldown period', async () => {
      const { adRevenueService } = await import('../domain/services/ad-revenue.service');

      // Last rewarded view was 10 minutes ago (past 5 min cooldown)
      mockDb.first.mockResolvedValue({
        user_id: 'user-123',
        interstitials_shown_today: 5,
        interstitials_shown_session: 2,
        rewarded_views_today: 5,
        actions_this_session: 10,
        last_reset_date: '2026-01-04',
        last_rewarded_time: new Date('2026-01-04T11:50:00Z'), // 10 minutes ago
        last_interstitial_time: new Date('2026-01-04T11:58:00Z'), // 2 minutes ago
      });

      const stateResponse = await adRevenueService.getAdStateResponse('user-123');

      expect(stateResponse.canShowRewarded).toBe(true);
      expect(stateResponse.timeUntilNextRewarded).toBe(0);
    });
  });

  // ============================================================================
  // AD-FREE PERIOD TESTS
  // ============================================================================
  describe('Ad-Free Periods', () => {
    test('should not show ads to premium users', async () => {
      const { adRevenueService } = await import('../domain/services/ad-revenue.service');

      const premiumTiers = ['BASIC', 'PLUS', 'PREMIUM', 'PREMIUM_PLUS', 'ELITE'];

      for (const tier of premiumTiers) {
        const shouldShow = await adRevenueService.shouldShowAds('user-123', tier);
        expect(shouldShow).toBe(false);
      }
    });

    test('should show ads to free users', async () => {
      const { adRevenueService } = await import('../domain/services/ad-revenue.service');

      mockDb.first.mockResolvedValue(null);

      const shouldShow = await adRevenueService.shouldShowAds('user-123', undefined);
      expect(shouldShow).toBe(true);
    });

    test('should respect temporary ad-free period', async () => {
      const { adRevenueService } = await import('../domain/services/ad-revenue.service');

      mockDb.first.mockResolvedValue({
        user_id: 'user-123',
        ad_free_until: new Date('2026-01-04T14:00:00Z'), // 2 hours from now
      });

      const shouldShow = await adRevenueService.shouldShowAds('user-123', undefined);
      expect(shouldShow).toBe(false);
    });

    test('should grant ad-free period correctly', async () => {
      const { adRevenueService } = await import('../domain/services/ad-revenue.service');

      mockDb.first.mockResolvedValue({
        user_id: 'user-123',
        last_reset_date: '2026-01-04',
      });
      mockDb.update.mockResolvedValue(1);

      await adRevenueService.grantAdFreePeriod('user-123', 24); // 24 hours

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // REWARD CLAIMING TESTS
  // ============================================================================
  describe('Reward Claiming', () => {
    test('should claim reward after watching video', async () => {
      const { adRevenueService } = await import('../domain/services/ad-revenue.service');

      mockDb.first.mockResolvedValue(null); // No existing daily count
      mockDb.insert.mockResolvedValue([1]);

      const result = await adRevenueService.claimReward({
        userId: 'user-123',
        rewardId: 'coins',
        transactionId: 'txn-123',
        impressionId: 'imp-123',
        videoCompletionPercent: 100,
      });

      expect(result.success).toBe(true);
      expect(result.reward?.rewardType).toBe('coins');
      expect(result.reward?.amount).toBe(10);
    });

    test('should reject claim with incomplete video watch', async () => {
      const { adRevenueService } = await import('../domain/services/ad-revenue.service');

      const result = await adRevenueService.claimReward({
        userId: 'user-123',
        rewardId: 'coins',
        transactionId: 'txn-123',
        impressionId: 'imp-123',
        videoCompletionPercent: 80, // Less than 95%
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not fully watched');
    });

    test('should enforce daily reward limits', async () => {
      const { adRevenueService } = await import('../domain/services/ad-revenue.service');

      mockDb.first.mockResolvedValue({
        id: 'count-123',
        user_id: 'user-123',
        reward_id: 'coins',
        date: '2026-01-04',
        count: 5, // Already at max (5/day for coins)
      });

      const result = await adRevenueService.claimReward({
        userId: 'user-123',
        rewardId: 'coins',
        transactionId: 'txn-456',
        impressionId: 'imp-456',
        videoCompletionPercent: 100,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Daily limit reached');
    });

    test('should reject claim for invalid reward ID', async () => {
      const { adRevenueService } = await import('../domain/services/ad-revenue.service');

      const result = await adRevenueService.claimReward({
        userId: 'user-123',
        rewardId: 'invalid-reward',
        transactionId: 'txn-123',
        impressionId: 'imp-123',
        videoCompletionPercent: 100,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid reward ID');
    });
  });
});
