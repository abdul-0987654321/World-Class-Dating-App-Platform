/**
 * User Analytics Tests
 *
 * Tests for:
 * - Daily active users calculation
 * - Session duration tracking
 * - Funnel analysis (registration -> profile -> match -> message)
 * - Cohort analysis
 */

import { EngagementRepository } from '../domain/repositories/engagement.repository';
import { FunnelRepository } from '../domain/repositories/funnel.repository';
import { dbClient } from '../infrastructure/database/db-client';
import {
  ConversionFunnel,
  FunnelConversionRates,
} from '../types';

// Mock the database client
jest.mock('../infrastructure/database/db-client', () => ({
  dbClient: {
    query: jest.fn(),
  },
}));

// =============================================
// MOCK DATA GENERATORS
// =============================================

/**
 * Generate mock session data for a user
 */
function generateMockSessionData(options: {
  userId: string;
  daysActive?: number;
  avgSessionDuration?: number;
  totalSessions?: number;
} = { userId: 'user-123' }): any {
  const { userId, daysActive = 15, avgSessionDuration = 480, totalSessions = 25 } = options;

  return {
    user_id: userId,
    last_active_at: new Date(),
    total_sessions: totalSessions,
    total_days_active: daysActive,
    average_session_duration: avgSessionDuration,
  };
}

/**
 * Generate mock engagement metrics for a date range
 */
function generateMockEngagementMetrics(days: number = 7): any[] {
  const metrics = [];
  const baseDate = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() - i);

    metrics.push({
      date: date.toISOString().split('T')[0],
      dau: Math.floor(Math.random() * 5000) + 5000,
      new_users: Math.floor(Math.random() * 500) + 200,
    });
  }

  return metrics;
}

/**
 * Generate mock retention cohort data
 */
function generateMockCohortData(cohorts: number = 4): any[] {
  const data = [];
  const baseDate = new Date();

  for (let i = 0; i < cohorts; i++) {
    const cohortDate = new Date(baseDate);
    cohortDate.setDate(cohortDate.getDate() - (i * 7));

    data.push({
      cohort_date: cohortDate.toISOString().split('T')[0],
      cohort_size: Math.floor(Math.random() * 1000) + 500,
      day_1_retention: (Math.random() * 20 + 60).toFixed(2),
      day_7_retention: (Math.random() * 15 + 40).toFixed(2),
      day_30_retention: (Math.random() * 10 + 25).toFixed(2),
      day_90_retention: (Math.random() * 5 + 15).toFixed(2),
    });
  }

  return data;
}

/**
 * Generate mock funnel data
 */
function generateMockFunnelData(utmSource: string = 'google'): any {
  return {
    id: 'funnel-123',
    user_id: 'user-123',
    session_id: 'session-123',
    utm_source: utmSource,
    utm_campaign: 'summer_campaign',
    landing_page_view_at: new Date(Date.now() - 3600000 * 5),
    registration_started_at: new Date(Date.now() - 3600000 * 4.5),
    email_entered_at: new Date(Date.now() - 3600000 * 4.4),
    password_created_at: new Date(Date.now() - 3600000 * 4.3),
    registration_completed_at: new Date(Date.now() - 3600000 * 4),
    email_verified_at: new Date(Date.now() - 3600000 * 3.5),
    profile_started_at: new Date(Date.now() - 3600000 * 3),
    photo_uploaded_at: new Date(Date.now() - 3600000 * 2.5),
    profile_completed_at: new Date(Date.now() - 3600000 * 2),
    first_match_at: new Date(Date.now() - 3600000 * 1),
    first_message_at: new Date(Date.now() - 1800000),
    subscription_purchased_at: null,
    time_to_register: 3600,
    time_to_verify: 1800,
    time_to_profile: 5400,
    time_to_match: 3600,
    time_to_subscribe: null,
    dropped_at_step: null,
    completed: false,
    created_at: new Date(Date.now() - 3600000 * 5),
    updated_at: new Date(),
  };
}

/**
 * Generate mock conversion rates data
 */
function generateMockConversionRates(source: string = 'google'): any {
  return {
    utm_source: source,
    total_sessions: 10000,
    landing_views: 10000,
    registrations_started: 4500,
    registrations_completed: 3000,
    emails_verified: 2700,
    profiles_completed: 2200,
    first_matches: 1800,
    subscriptions: 300,
    registration_rate: 30.00,
    profile_completion_rate: 73.33,
    subscription_rate: 10.00,
  };
}

/**
 * Generate mock time on app statistics
 */
function generateMockTimeOnAppStats(): any {
  return {
    avg_duration: 480,  // 8 minutes
    median_duration: 420,  // 7 minutes
    total_duration: 96000000,  // ~27,000 hours
    avg_time_per_user: 5760,  // 96 minutes per user
  };
}

// =============================================
// TEST SUITES
// =============================================

describe('User Analytics', () => {
  let mockDbQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDbQuery = dbClient.query as jest.Mock;
  });

  // =============================================
  // DAILY ACTIVE USERS TESTS
  // =============================================
  describe('Daily Active Users Calculation', () => {
    let engagementRepo: EngagementRepository;

    beforeEach(() => {
      engagementRepo = new EngagementRepository();
    });

    it('should calculate DAU correctly', async () => {
      const expectedDAU = 7500;
      mockDbQuery.mockResolvedValueOnce({
        rows: [{ dau: expectedDAU }],
      });

      const dau = await engagementRepo.getDAU(new Date());

      expect(dau).toBe(expectedDAU);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(DISTINCT user_id)'),
        expect.any(Array)
      );
    });

    it('should calculate WAU correctly', async () => {
      const expectedWAU = 25000;
      mockDbQuery.mockResolvedValueOnce({
        rows: [{ wau: expectedWAU }],
      });

      const wau = await engagementRepo.getWAU(new Date());

      expect(wau).toBe(expectedWAU);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining("INTERVAL '7 days'"),
        expect.any(Array)
      );
    });

    it('should calculate MAU correctly', async () => {
      const expectedMAU = 75000;
      mockDbQuery.mockResolvedValueOnce({
        rows: [{ mau: expectedMAU }],
      });

      const mau = await engagementRepo.getMAU(new Date());

      expect(mau).toBe(expectedMAU);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining("INTERVAL '30 days'"),
        expect.any(Array)
      );
    });

    it('should calculate stickiness ratio (DAU/MAU)', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [{ dau: 10000 }] });
      mockDbQuery.mockResolvedValueOnce({ rows: [{ mau: 50000 }] });

      const stickiness = await engagementRepo.getStickinessRatio(new Date());

      expect(stickiness).toBe(20); // 10000/50000 * 100 = 20%
    });

    it('should handle zero MAU gracefully', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [{ dau: 0 }] });
      mockDbQuery.mockResolvedValueOnce({ rows: [{ mau: 0 }] });

      const stickiness = await engagementRepo.getStickinessRatio(new Date());

      expect(stickiness).toBe(0);
    });

    it('should get engagement metrics for date range', async () => {
      const mockMetrics = generateMockEngagementMetrics(7);
      mockDbQuery.mockResolvedValueOnce({ rows: mockMetrics });

      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const metrics = await engagementRepo.getEngagementMetrics(startDate, endDate);

      expect(metrics.length).toBe(7);
      expect(metrics[0]).toHaveProperty('dau');
      expect(metrics[0]).toHaveProperty('newUsers');
      expect(metrics[0]).toHaveProperty('returningUsers');
    });

    it('should calculate returning users correctly', async () => {
      const mockData = [{
        date: new Date().toISOString().split('T')[0],
        dau: 5000,
        new_users: 500,
      }];
      mockDbQuery.mockResolvedValueOnce({ rows: mockData });

      const metrics = await engagementRepo.getEngagementMetrics(
        new Date(Date.now() - 24 * 60 * 60 * 1000),
        new Date()
      );

      expect(metrics[0].dau).toBe(5000);
      expect(metrics[0].newUsers).toBe(500);
      expect(metrics[0].returningUsers).toBe(4500); // DAU - new users
    });

    it('should handle empty date range', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [] });

      const metrics = await engagementRepo.getEngagementMetrics(
        new Date(),
        new Date(Date.now() - 24 * 60 * 60 * 1000)
      );

      expect(metrics).toEqual([]);
    });
  });

  // =============================================
  // SESSION DURATION TRACKING TESTS
  // =============================================
  describe('Session Duration Tracking', () => {
    let engagementRepo: EngagementRepository;

    beforeEach(() => {
      engagementRepo = new EngagementRepository();
    });

    it('should get user activity summary', async () => {
      const mockSession = generateMockSessionData({ userId: 'user-123' });
      mockDbQuery.mockResolvedValueOnce({ rows: [mockSession] });
      mockDbQuery.mockResolvedValueOnce({ rows: [{ count: 250 }] }); // swipes
      mockDbQuery.mockResolvedValueOnce({ rows: [{ count: 15 }] }); // matches
      mockDbQuery.mockResolvedValueOnce({ rows: [{ count: 45 }] }); // messages

      const summary = await engagementRepo.getUserActivitySummary('user-123');

      expect(summary.userId).toBe('user-123');
      expect(summary.totalSessions).toBe(25);
      expect(summary.totalDaysActive).toBe(15);
      expect(summary.averageSessionDuration).toBe(480);
      expect(summary.totalSwipes).toBe(250);
      expect(summary.totalMatches).toBe(15);
      expect(summary.totalMessages).toBe(45);
    });

    it('should correctly determine if user is active', async () => {
      // Active user (last seen today)
      const activeSession = generateMockSessionData({ userId: 'active-user' });
      mockDbQuery.mockResolvedValueOnce({ rows: [activeSession] });
      mockDbQuery.mockResolvedValueOnce({ rows: [{ count: 100 }] });
      mockDbQuery.mockResolvedValueOnce({ rows: [{ count: 5 }] });
      mockDbQuery.mockResolvedValueOnce({ rows: [{ count: 20 }] });

      const activeSummary = await engagementRepo.getUserActivitySummary('active-user');
      expect(activeSummary.isActive).toBe(true);

      // Inactive user (last seen 45 days ago)
      const inactiveSession = {
        ...generateMockSessionData({ userId: 'inactive-user' }),
        last_active_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      };
      mockDbQuery.mockResolvedValueOnce({ rows: [inactiveSession] });
      mockDbQuery.mockResolvedValueOnce({ rows: [{ count: 50 }] });
      mockDbQuery.mockResolvedValueOnce({ rows: [{ count: 2 }] });
      mockDbQuery.mockResolvedValueOnce({ rows: [{ count: 5 }] });

      const inactiveSummary = await engagementRepo.getUserActivitySummary('inactive-user');
      expect(inactiveSummary.isActive).toBe(false);
    });

    it('should throw error for non-existent user', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [] });

      await expect(engagementRepo.getUserActivitySummary('non-existent'))
        .rejects.toThrow('User not found');
    });

    it('should get time on app statistics', async () => {
      const mockStats = generateMockTimeOnAppStats();
      mockDbQuery.mockResolvedValueOnce({ rows: [mockStats] });

      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const stats = await engagementRepo.getTimeOnAppStats(startDate, endDate);

      expect(stats.averageSessionDuration).toBe(480);
      expect(stats.medianSessionDuration).toBe(420);
      expect(stats.totalTimeSpent).toBe(96000000);
      expect(stats.averageTimePerUser).toBe(5760);
    });

    it('should handle null duration values', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [{
          avg_duration: null,
          median_duration: null,
          total_duration: null,
          avg_time_per_user: null,
        }],
      });

      const stats = await engagementRepo.getTimeOnAppStats(new Date(), new Date());

      expect(stats.averageSessionDuration).toBe(0);
      expect(stats.medianSessionDuration).toBe(0);
    });

    it('should get feature usage statistics', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [
          { feature: 'swipe', total_users: 5000, total_events: 250000, average_per_user: 50 },
          { feature: 'super_like', total_users: 2000, total_events: 6000, average_per_user: 3 },
          { feature: 'boost', total_users: 1500, total_events: 3000, average_per_user: 2 },
        ],
      });

      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const features = await engagementRepo.getFeatureUsage(startDate, endDate);

      expect(features.length).toBe(3);
      expect(features[0].feature).toBe('swipe');
      expect(features[0].totalUsers).toBe(5000);
      expect(features[0].averagePerUser).toBe(50);
    });

    it('should get power users based on percentile', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [
          {
            user_id: 'power-user-1',
            last_active_at: new Date(),
            total_sessions: 150,
            total_days_active: 30,
            average_session_duration: 900,
            total_swipes: 1500,
            total_messages: 200,
          },
          {
            user_id: 'power-user-2',
            last_active_at: new Date(),
            total_sessions: 120,
            total_days_active: 28,
            average_session_duration: 800,
            total_swipes: 1200,
            total_messages: 180,
          },
        ],
      });

      const powerUsers = await engagementRepo.getPowerUsers(10);

      expect(powerUsers.length).toBe(2);
      expect(powerUsers[0].totalSessions).toBe(150);
      expect(powerUsers[0].isActive).toBe(true);
    });
  });

  // =============================================
  // FUNNEL ANALYSIS TESTS
  // =============================================
  describe('Funnel Analysis', () => {
    let funnelRepo: FunnelRepository;

    beforeEach(() => {
      funnelRepo = new FunnelRepository();
    });

    describe('Registration to Profile to Match to Message Funnel', () => {
      it('should get conversion rates for all funnel steps', async () => {
        const mockRates = generateMockConversionRates('google');
        mockDbQuery.mockResolvedValueOnce({ rows: [mockRates] });

        const rates = await funnelRepo.getConversionRates('google');

        expect(rates.length).toBe(1);
        expect(rates[0].utmSource).toBe('google');
        expect(rates[0].totalSessions).toBe(10000);
        expect(rates[0].registrationsCompleted).toBe(3000);
        expect(rates[0].profilesCompleted).toBe(2200);
        expect(rates[0].firstMatches).toBe(1800);
        expect(rates[0].registrationRate).toBe(30);
        expect(rates[0].profileCompletionRate).toBe(73.33);
      });

      it('should calculate conversion rates between funnel steps', async () => {
        mockDbQuery.mockResolvedValueOnce({
          rows: [{
            utm_source: 'facebook',
            total_sessions: 5000,
            landing_views: 5000,
            registrations_started: 3000,
            registrations_completed: 2500,
            emails_verified: 2400,
            profiles_completed: 2000,
            first_matches: 1500,
            subscriptions: 200,
            registration_rate: 50.00, // 2500/5000
            profile_completion_rate: 80.00, // 2000/2500
            subscription_rate: 8.00, // 200/2500
          }],
        });

        const rates = await funnelRepo.getConversionRates('facebook');

        expect(rates[0].registrationRate).toBe(50);
        expect(rates[0].profileCompletionRate).toBe(80);
        expect(rates[0].subscriptionRate).toBe(8);
      });

      it('should handle multiple UTM sources', async () => {
        mockDbQuery.mockResolvedValueOnce({
          rows: [
            generateMockConversionRates('google'),
            generateMockConversionRates('facebook'),
            generateMockConversionRates('tiktok'),
          ],
        });

        const rates = await funnelRepo.getConversionRates();

        expect(rates.length).toBe(3);
        expect(rates.map(r => r.utmSource)).toContain('google');
        expect(rates.map(r => r.utmSource)).toContain('facebook');
        expect(rates.map(r => r.utmSource)).toContain('tiktok');
      });

      it('should filter conversion rates by date range', async () => {
        mockDbQuery.mockResolvedValueOnce({
          rows: [generateMockConversionRates('google')],
        });

        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = new Date();

        await funnelRepo.getConversionRates(undefined, startDate, endDate);

        expect(mockDbQuery).toHaveBeenCalledWith(
          expect.stringContaining('created_at >='),
          expect.any(Array)
        );
      });

      it('should handle null UTM source as direct traffic', async () => {
        mockDbQuery.mockResolvedValueOnce({
          rows: [{
            ...generateMockConversionRates('direct'),
            utm_source: null,
          }],
        });

        const rates = await funnelRepo.getConversionRates();

        expect(rates[0].utmSource).toBe('direct');
      });
    });

    describe('Funnel Step Tracking', () => {
      it('should create funnel entry on landing page view', async () => {
        mockDbQuery.mockResolvedValueOnce({
          rows: [generateMockFunnelData()],
        });

        const funnel = await funnelRepo.create('session-new', 'user-new', 'google', 'summer');

        expect(funnel.sessionId).toBe('session-123');
        expect(funnel.utmSource).toBe('google');
      });

      it('should update funnel step with timestamp', async () => {
        // First call for findBySessionId
        mockDbQuery.mockResolvedValueOnce({
          rows: [generateMockFunnelData()],
        });
        // Second call for update
        mockDbQuery.mockResolvedValueOnce({
          rows: [{
            ...generateMockFunnelData(),
            profile_completed_at: new Date(),
          }],
        });

        const updatedFunnel = await funnelRepo.updateStep({
          sessionId: 'session-123',
          step: 'profileCompletedAt',
          timestamp: new Date(),
        });

        expect(updatedFunnel.profileCompletedAt).toBeDefined();
      });

      it('should calculate time to complete registration', async () => {
        const funnelData = generateMockFunnelData();
        mockDbQuery.mockResolvedValueOnce({ rows: [funnelData] });
        mockDbQuery.mockResolvedValueOnce({
          rows: [{
            ...funnelData,
            time_to_register: 3600, // 1 hour
          }],
        });

        const funnel = await funnelRepo.updateStep({
          sessionId: 'session-123',
          step: 'registrationCompletedAt',
          timestamp: new Date(),
        });

        expect(funnel.timeToRegister).toBe(3600);
      });

      it('should mark funnel as completed on subscription purchase', async () => {
        const funnelData = generateMockFunnelData();
        mockDbQuery.mockResolvedValueOnce({ rows: [funnelData] });
        mockDbQuery.mockResolvedValueOnce({
          rows: [{
            ...funnelData,
            subscription_purchased_at: new Date(),
            completed: true,
          }],
        });

        const funnel = await funnelRepo.updateStep({
          sessionId: 'session-123',
          step: 'subscriptionPurchasedAt',
          timestamp: new Date(),
        });

        expect(funnel.completed).toBe(true);
        expect(funnel.subscriptionPurchasedAt).toBeDefined();
      });
    });

    describe('Drop-off Analysis', () => {
      it('should get drop-off analysis by step', async () => {
        mockDbQuery.mockResolvedValueOnce({
          rows: [
            { step: 'registration_started', count: 500, percentage: 5.00 },
            { step: 'email_verified', count: 300, percentage: 3.00 },
            { step: 'profile_started', count: 200, percentage: 2.00 },
          ],
        });

        const dropoffs = await funnelRepo.getDropoffAnalysis();

        expect(dropoffs.length).toBe(3);
        expect(dropoffs[0].step).toBe('registration_started');
        expect(dropoffs[0].count).toBe(500);
        expect(dropoffs[0].percentage).toBe(5);
      });

      it('should filter drop-offs by UTM source', async () => {
        mockDbQuery.mockResolvedValueOnce({
          rows: [{ step: 'profile_started', count: 100, percentage: 4.00 }],
        });

        await funnelRepo.getDropoffAnalysis('google');

        expect(mockDbQuery).toHaveBeenCalledWith(
          expect.stringContaining('utm_source'),
          ['google']
        );
      });

      it('should mark funnel as dropped at specific step', async () => {
        mockDbQuery.mockResolvedValueOnce({ rows: [] });

        await funnelRepo.markDroppedAt('session-123', 'profile_started');

        expect(mockDbQuery).toHaveBeenCalledWith(
          expect.stringContaining('dropped_at_step'),
          ['profile_started', 'session-123']
        );
      });
    });

    describe('Average Timings', () => {
      it('should get average time for each funnel step', async () => {
        mockDbQuery.mockResolvedValueOnce({
          rows: [{
            avg_time_to_register: 300,     // 5 minutes
            avg_time_to_verify: 7200,      // 2 hours
            avg_time_to_profile: 1800,     // 30 minutes
            avg_time_to_match: 86400,      // 1 day
            avg_time_to_subscribe: 604800, // 1 week
          }],
        });

        const timings = await funnelRepo.getAverageTimings();

        expect(timings.avgTimeToRegister).toBe(300);
        expect(timings.avgTimeToVerify).toBe(7200);
        expect(timings.avgTimeToProfile).toBe(1800);
        expect(timings.avgTimeToMatch).toBe(86400);
        expect(timings.avgTimeToSubscribe).toBe(604800);
      });

      it('should handle null timing values', async () => {
        mockDbQuery.mockResolvedValueOnce({
          rows: [{
            avg_time_to_register: null,
            avg_time_to_verify: null,
            avg_time_to_profile: null,
            avg_time_to_match: null,
            avg_time_to_subscribe: null,
          }],
        });

        const timings = await funnelRepo.getAverageTimings();

        expect(timings.avgTimeToRegister).toBe(0);
        expect(timings.avgTimeToVerify).toBe(0);
      });

      it('should filter timings by UTM source', async () => {
        mockDbQuery.mockResolvedValueOnce({
          rows: [{
            avg_time_to_register: 250,
            avg_time_to_verify: 5000,
            avg_time_to_profile: 1500,
            avg_time_to_match: 72000,
            avg_time_to_subscribe: 500000,
          }],
        });

        await funnelRepo.getAverageTimings('facebook');

        expect(mockDbQuery).toHaveBeenCalledWith(
          expect.stringContaining('utm_source'),
          ['facebook']
        );
      });
    });
  });

  // =============================================
  // COHORT ANALYSIS TESTS
  // =============================================
  describe('Cohort Analysis', () => {
    let engagementRepo: EngagementRepository;

    beforeEach(() => {
      engagementRepo = new EngagementRepository();
    });

    it('should get retention cohorts', async () => {
      const mockCohorts = generateMockCohortData(4);
      mockDbQuery.mockResolvedValueOnce({ rows: mockCohorts });

      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const cohorts = await engagementRepo.getRetentionCohorts(startDate, endDate);

      expect(cohorts.length).toBe(4);
      expect(cohorts[0]).toHaveProperty('cohortDate');
      expect(cohorts[0]).toHaveProperty('cohortSize');
      expect(cohorts[0]).toHaveProperty('day1Retention');
      expect(cohorts[0]).toHaveProperty('day7Retention');
      expect(cohorts[0]).toHaveProperty('day30Retention');
      expect(cohorts[0]).toHaveProperty('day90Retention');
    });

    it('should calculate retention rates as percentages', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [{
          cohort_date: new Date().toISOString().split('T')[0],
          cohort_size: 1000,
          day_1_retention: '75.50',
          day_7_retention: '45.25',
          day_30_retention: '28.00',
          day_90_retention: '18.75',
        }],
      });

      const cohorts = await engagementRepo.getRetentionCohorts(new Date(), new Date());

      expect(cohorts[0].cohortSize).toBe(1000);
      expect(cohorts[0].day1Retention).toBe(75.5);
      expect(cohorts[0].day7Retention).toBe(45.25);
      expect(cohorts[0].day30Retention).toBe(28);
      expect(cohorts[0].day90Retention).toBe(18.75);
    });

    it('should handle null retention values', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [{
          cohort_date: new Date().toISOString().split('T')[0],
          cohort_size: 500,
          day_1_retention: null,
          day_7_retention: '40.00',
          day_30_retention: null,
          day_90_retention: null,
        }],
      });

      const cohorts = await engagementRepo.getRetentionCohorts(new Date(), new Date());

      expect(cohorts[0].day1Retention).toBe(0);
      expect(cohorts[0].day7Retention).toBe(40);
      expect(cohorts[0].day30Retention).toBe(0);
      expect(cohorts[0].day90Retention).toBe(0);
    });

    it('should order cohorts by date descending', async () => {
      const mockCohorts = [
        { cohort_date: '2025-01-01', cohort_size: 500, day_1_retention: '70', day_7_retention: '40', day_30_retention: '25', day_90_retention: '15' },
        { cohort_date: '2024-12-25', cohort_size: 600, day_1_retention: '72', day_7_retention: '42', day_30_retention: '27', day_90_retention: '17' },
        { cohort_date: '2024-12-18', cohort_size: 550, day_1_retention: '68', day_7_retention: '38', day_30_retention: '23', day_90_retention: '13' },
      ];
      mockDbQuery.mockResolvedValueOnce({ rows: mockCohorts });

      const cohorts = await engagementRepo.getRetentionCohorts(
        new Date('2024-12-01'),
        new Date('2025-01-15')
      );

      // Should be ordered by cohort_date DESC from query
      expect(cohorts[0].cohortSize).toBe(500);
      expect(cohorts[1].cohortSize).toBe(600);
      expect(cohorts[2].cohortSize).toBe(550);
    });

    it('should calculate churn rate', async () => {
      // Active users before period
      mockDbQuery.mockResolvedValueOnce({ rows: [{ count: 10000 }] });
      // Churned users (active before but not during period)
      mockDbQuery.mockResolvedValueOnce({ rows: [{ count: 1500 }] });

      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const churnData = await engagementRepo.getChurnRate(startDate, endDate);

      expect(churnData.totalUsersAtStart).toBe(10000);
      expect(churnData.churnedUsers).toBe(1500);
      expect(churnData.churnRate).toBe(15); // 1500/10000 * 100
    });

    it('should handle zero users for churn rate', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [{ count: 0 }] });
      mockDbQuery.mockResolvedValueOnce({ rows: [{ count: 0 }] });

      const churnData = await engagementRepo.getChurnRate(new Date(), new Date());

      expect(churnData.totalUsersAtStart).toBe(0);
      expect(churnData.churnedUsers).toBe(0);
      expect(churnData.churnRate).toBe(0);
    });

    it('should return empty array when no cohort data', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [] });

      const cohorts = await engagementRepo.getRetentionCohorts(new Date(), new Date());

      expect(cohorts).toEqual([]);
    });
  });

  // =============================================
  // INTEGRATION SCENARIOS
  // =============================================
  describe('Analytics Integration Scenarios', () => {
    let engagementRepo: EngagementRepository;
    let funnelRepo: FunnelRepository;

    beforeEach(() => {
      engagementRepo = new EngagementRepository();
      funnelRepo = new FunnelRepository();
    });

    it('should track complete user journey through funnel', async () => {
      // 1. User lands on page
      mockDbQuery.mockResolvedValueOnce({
        rows: [{
          id: 'funnel-journey',
          session_id: 'session-journey',
          landing_page_view_at: new Date(),
        }],
      });

      const funnel = await funnelRepo.create('session-journey', undefined, 'google', 'brand');
      expect(funnel.sessionId).toBeDefined();

      // 2. User completes registration
      mockDbQuery.mockResolvedValueOnce({
        rows: [{
          id: 'funnel-journey',
          session_id: 'session-journey',
          registration_completed_at: new Date(),
          time_to_register: 180,
        }],
      });
      mockDbQuery.mockResolvedValueOnce({
        rows: [{
          id: 'funnel-journey',
          session_id: 'session-journey',
          user_id: 'user-journey',
          registration_completed_at: new Date(),
          time_to_register: 180,
        }],
      });

      const registeredFunnel = await funnelRepo.updateStep({
        sessionId: 'session-journey',
        userId: 'user-journey',
        step: 'registrationCompletedAt',
      });
      expect(registeredFunnel.timeToRegister).toBe(180);

      // 3. User appears in DAU
      mockDbQuery.mockResolvedValueOnce({ rows: [{ dau: 7501 }] });
      const dau = await engagementRepo.getDAU(new Date());
      expect(dau).toBe(7501);
    });

    it('should correlate funnel conversion with retention', async () => {
      // Get high-converting source
      mockDbQuery.mockResolvedValueOnce({
        rows: [{
          utm_source: 'instagram',
          total_sessions: 5000,
          landing_views: 5000,
          registrations_completed: 2000,
          profiles_completed: 1800,
          first_matches: 1500,
          subscriptions: 300,
          registration_rate: 40.00,
          profile_completion_rate: 90.00,
          subscription_rate: 15.00,
        }],
      });

      const conversionRates = await funnelRepo.getConversionRates('instagram');

      // High conversion source: 40% registration, 90% profile completion
      expect(conversionRates[0].registrationRate).toBe(40);
      expect(conversionRates[0].profileCompletionRate).toBe(90);

      // Users from this source should have good retention
      mockDbQuery.mockResolvedValueOnce({
        rows: [{
          cohort_date: new Date().toISOString().split('T')[0],
          cohort_size: 2000,
          day_1_retention: '80.00',
          day_7_retention: '55.00',
          day_30_retention: '35.00',
          day_90_retention: '25.00',
        }],
      });

      const cohorts = await engagementRepo.getRetentionCohorts(
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        new Date()
      );

      // Good retention for high-quality source
      expect(cohorts[0].day1Retention).toBe(80);
      expect(cohorts[0].day7Retention).toBe(55);
    });
  });
});
