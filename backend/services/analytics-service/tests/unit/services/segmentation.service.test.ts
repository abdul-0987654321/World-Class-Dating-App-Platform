/**
 * Unit tests for Segmentation Service
 * Tests user segmentation, segment analytics, and segment transitions
 */

import { SegmentationService } from '../../../src/services/segmentation.service';
import { dbClient } from '../../../src/infrastructure/database/db-client';
import { UserSegmentType, UserSegment } from '../../../src/types';

jest.mock('../../../src/infrastructure/database/db-client');
jest.mock('@flamoral/backend-shared', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('SegmentationService', () => {
  let segmentationService: SegmentationService;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = jest.fn();
    (dbClient.query as jest.Mock) = mockQuery;
    segmentationService = new SegmentationService();
  });

  describe('constructor', () => {
    it('should initialize with default criteria', () => {
      const service = new SegmentationService();
      expect(service).toBeDefined();
    });

    it('should accept custom criteria', () => {
      const customCriteria = {
        powerUserDaysActive: 28,
        activeUserDaysActive: 14,
        dormantDaysInactive: 45,
        churnedDaysInactive: 120,
      };

      const service = new SegmentationService(customCriteria);
      expect(service).toBeDefined();
    });
  });

  describe('segmentUser', () => {
    const mockActiveUserMetrics = {
      id: 'user-123',
      created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
      last_active_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      profile_completion: 85,
      subscription_tier: 'GOLD',
      subscription_start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      photo_count: 4,
      has_verification: true,
      days_active_30: 15,
      total_swipes: 500,
      total_matches: 50,
      total_messages: 200,
      total_spend: 60,
      relationship_goal: 'RELATIONSHIP',
    };

    it('should segment an active user correctly', async () => {
      const userId = 'user-active-123';

      // Mock main metrics query
      mockQuery.mockResolvedValueOnce({ rows: [mockActiveUserMetrics] });

      // Mock response rate query
      mockQuery.mockResolvedValueOnce({ rows: [{ responded: 40, total: 50 }] });

      // Mock weekly swipes query
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 80 }] });

      // Mock weekly messages query
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 35 }] });

      // Mock previous engagement score query
      mockQuery.mockResolvedValueOnce({ rows: [{ engagement_score: 70 }] });

      // Mock store segment query
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Mock check transition query
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await segmentationService.segmentUser(userId);

      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.segments).toBeDefined();
      expect(Array.isArray(result.segments)).toBe(true);
      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.primarySegment).toBeDefined();
      expect(result.engagementScore).toBeGreaterThanOrEqual(0);
      expect(result.engagementScore).toBeLessThanOrEqual(100);
      expect(['high', 'medium', 'low', 'none']).toContain(result.activityLevel);
    });

    it('should identify power users correctly', async () => {
      const userId = 'user-power-123';

      const powerUserMetrics = {
        ...mockActiveUserMetrics,
        days_active_30: 28, // Very active
        total_swipes: 2000,
        total_matches: 150,
        total_messages: 500,
      };

      mockQuery.mockResolvedValueOnce({ rows: [powerUserMetrics] });
      mockQuery.mockResolvedValueOnce({ rows: [{ responded: 80, total: 100 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 150 }] }); // High weekly swipes
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 80 }] }); // High weekly messages
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await segmentationService.segmentUser(userId);

      expect(result.segments).toContain(UserSegmentType.POWER_USER);
    });

    it('should identify dormant users correctly', async () => {
      const userId = 'user-dormant-123';

      const dormantUserMetrics = {
        ...mockActiveUserMetrics,
        last_active_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
        days_active_30: 0,
      };

      mockQuery.mockResolvedValueOnce({ rows: [dormantUserMetrics] });
      mockQuery.mockResolvedValueOnce({ rows: [{ responded: 0, total: 0 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 0 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 0 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await segmentationService.segmentUser(userId);

      expect(result.segments).toContain(UserSegmentType.DORMANT_USER);
      expect(result.activityLevel).toBe('none');
    });

    it('should identify churned users correctly', async () => {
      const userId = 'user-churned-123';

      const churnedUserMetrics = {
        ...mockActiveUserMetrics,
        last_active_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // 100 days ago
        days_active_30: 0,
      };

      mockQuery.mockResolvedValueOnce({ rows: [churnedUserMetrics] });
      mockQuery.mockResolvedValueOnce({ rows: [{ responded: 0, total: 0 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 0 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 0 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await segmentationService.segmentUser(userId);

      expect(result.segments).toContain(UserSegmentType.CHURNED_USER);
    });

    it('should identify premium users correctly', async () => {
      const userId = 'user-premium-123';

      const premiumUserMetrics = {
        ...mockActiveUserMetrics,
        subscription_tier: 'DIAMOND',
        total_spend: 500,
      };

      mockQuery.mockResolvedValueOnce({ rows: [premiumUserMetrics] });
      mockQuery.mockResolvedValueOnce({ rows: [{ responded: 50, total: 60 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 50 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 30 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await segmentationService.segmentUser(userId);

      expect(result.segments).toContain(UserSegmentType.PREMIUM_USER);
      expect(result.segments).toContain(UserSegmentType.HIGH_LTV);
    });

    it('should identify swipers correctly', async () => {
      const userId = 'user-swiper-123';

      mockQuery.mockResolvedValueOnce({ rows: [mockActiveUserMetrics] });
      mockQuery.mockResolvedValueOnce({ rows: [{ responded: 30, total: 40 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 150 }] }); // 150 swipes/week
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 20 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await segmentationService.segmentUser(userId);

      expect(result.segments).toContain(UserSegmentType.SWIPER);
    });

    it('should identify conversationalists correctly', async () => {
      const userId = 'user-chat-123';

      mockQuery.mockResolvedValueOnce({ rows: [mockActiveUserMetrics] });
      mockQuery.mockResolvedValueOnce({ rows: [{ responded: 45, total: 50 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 40 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 70 }] }); // 70 messages/week
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await segmentationService.segmentUser(userId);

      expect(result.segments).toContain(UserSegmentType.CONVERSATIONALIST);
    });

    it('should identify ghosts correctly', async () => {
      const userId = 'user-ghost-123';

      const ghostMetrics = {
        ...mockActiveUserMetrics,
        total_matches: 50,
      };

      mockQuery.mockResolvedValueOnce({ rows: [ghostMetrics] });
      mockQuery.mockResolvedValueOnce({ rows: [{ responded: 2, total: 50 }] }); // Low response rate
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 80 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 5 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await segmentationService.segmentUser(userId);

      expect(result.segments).toContain(UserSegmentType.GHOST);
    });

    it('should identify new users correctly', async () => {
      const userId = 'user-new-123';

      const newUserMetrics = {
        ...mockActiveUserMetrics,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      };

      mockQuery.mockResolvedValueOnce({ rows: [newUserMetrics] });
      mockQuery.mockResolvedValueOnce({ rows: [{ responded: 0, total: 0 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 20 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 5 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await segmentationService.segmentUser(userId);

      expect(result.segments).toContain(UserSegmentType.NEW_USER);
    });

    it('should identify profile builders correctly', async () => {
      const userId = 'user-profile-builder-123';

      const profileBuilderMetrics = {
        ...mockActiveUserMetrics,
        profile_completion: 95,
        photo_count: 6,
      };

      mockQuery.mockResolvedValueOnce({ rows: [profileBuilderMetrics] });
      mockQuery.mockResolvedValueOnce({ rows: [{ responded: 30, total: 40 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 60 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 30 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await segmentationService.segmentUser(userId);

      expect(result.segments).toContain(UserSegmentType.PROFILE_BUILDER);
    });

    it('should identify at-risk users correctly', async () => {
      const userId = 'user-at-risk-123';

      mockQuery.mockResolvedValueOnce({ rows: [mockActiveUserMetrics] });
      mockQuery.mockResolvedValueOnce({ rows: [{ responded: 20, total: 40 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 30 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 15 }] });
      mockQuery.mockResolvedValueOnce({
        rows: [{ engagement_score: 80 }], // Previous was 80, current ~40 = 50% drop
      });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await segmentationService.segmentUser(userId);

      // At-risk should be identified when there's a significant engagement drop
      expect(result.churnRisk).toBeGreaterThan(0);
    });

    it('should calculate upsell potential correctly', async () => {
      const userId = 'user-upsell-123';

      const freeUserMetrics = {
        ...mockActiveUserMetrics,
        subscription_tier: 'FREE',
        total_spend: 0,
        days_active_30: 20,
        profile_completion: 90,
      };

      mockQuery.mockResolvedValueOnce({ rows: [freeUserMetrics] });
      mockQuery.mockResolvedValueOnce({ rows: [{ responded: 40, total: 50 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 80 }] }); // High swipes = hitting limits
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 40 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await segmentationService.segmentUser(userId);

      expect(result.upsellPotential).toBeGreaterThan(0);
      expect(result.upsellPotential).toBeLessThanOrEqual(1);
    });

    it('should calculate predicted LTV correctly', async () => {
      const userId = 'user-ltv-123';

      mockQuery.mockResolvedValueOnce({ rows: [mockActiveUserMetrics] });
      mockQuery.mockResolvedValueOnce({ rows: [{ responded: 40, total: 50 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 60 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 30 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await segmentationService.segmentUser(userId);

      expect(result.ltvPredicted).toBeGreaterThanOrEqual(result.ltv);
    });

    it('should handle unknown users with default metrics', async () => {
      const userId = 'user-unknown-123';

      mockQuery.mockResolvedValueOnce({ rows: [] }); // No user found

      const result = await segmentationService.segmentUser(userId);

      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.engagementScore).toBe(0);
    });

    it('should record segment transitions', async () => {
      const userId = 'user-transition-123';

      mockQuery.mockResolvedValueOnce({ rows: [mockActiveUserMetrics] });
      mockQuery.mockResolvedValueOnce({ rows: [{ responded: 40, total: 50 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 60 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 30 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] }); // Store segment

      // Mock previous segment check - different from current
      mockQuery.mockResolvedValueOnce({
        rows: [{ primary_segment: UserSegmentType.DORMANT_USER }],
      });

      // Mock record transition
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await segmentationService.segmentUser(userId);

      // Verify transition was recorded
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO segment_transitions'),
        expect.arrayContaining([userId])
      );
    });
  });

  describe('segmentUsers', () => {
    it('should batch segment multiple users', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];

      // Setup mocks for each user
      for (const userId of userIds) {
        mockQuery.mockResolvedValueOnce({ rows: [{ ...mockActiveUserMetrics, id: userId }] });
        mockQuery.mockResolvedValueOnce({ rows: [{ responded: 30, total: 40 }] });
        mockQuery.mockResolvedValueOnce({ rows: [{ count: 50 }] });
        mockQuery.mockResolvedValueOnce({ rows: [{ count: 25 }] });
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({ rows: [] });
      }

      const results = await segmentationService.segmentUsers(userIds);

      expect(results).toBeDefined();
      expect(results.length).toBe(3);
      results.forEach((result) => {
        expect(result.userId).toBeDefined();
        expect(result.segments.length).toBeGreaterThan(0);
      });
    });

    it('should handle failed segmentation for some users', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];

      // First user succeeds
      mockQuery.mockResolvedValueOnce({ rows: [mockActiveUserMetrics] });
      mockQuery.mockResolvedValueOnce({ rows: [{ responded: 30, total: 40 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 50 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 25 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Second user fails
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      // Third user succeeds
      mockQuery.mockResolvedValueOnce({ rows: [mockActiveUserMetrics] });
      mockQuery.mockResolvedValueOnce({ rows: [{ responded: 30, total: 40 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 50 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 25 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const results = await segmentationService.segmentUsers(userIds);

      // Should return results for users that succeeded
      expect(results.length).toBe(2);
    });

    it('should process users in batches of 100', async () => {
      const userIds = Array.from({ length: 150 }, (_, i) => `user-${i}`);

      // Mock for all users
      for (let i = 0; i < 150; i++) {
        mockQuery.mockResolvedValueOnce({ rows: [mockActiveUserMetrics] });
        mockQuery.mockResolvedValueOnce({ rows: [{ responded: 30, total: 40 }] });
        mockQuery.mockResolvedValueOnce({ rows: [{ count: 50 }] });
        mockQuery.mockResolvedValueOnce({ rows: [{ count: 25 }] });
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({ rows: [] });
      }

      const results = await segmentationService.segmentUsers(userIds);

      expect(results.length).toBe(150);
    });
  });

  describe('getSegmentAnalytics', () => {
    it('should return segment analytics', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            segment: UserSegmentType.ACTIVE_USER,
            user_count: '500',
            avg_engagement_score: '75.5',
            avg_ltv: '45.00',
            avg_match_rate: '0.05',
            conversion_rate: '0.15',
            churn_rate: '0.08',
          },
          {
            segment: UserSegmentType.POWER_USER,
            user_count: '100',
            avg_engagement_score: '92.3',
            avg_ltv: '150.00',
            avg_match_rate: '0.08',
            conversion_rate: '0.45',
            churn_rate: '0.02',
          },
          {
            segment: UserSegmentType.DORMANT_USER,
            user_count: '200',
            avg_engagement_score: '15.0',
            avg_ltv: '20.00',
            avg_match_rate: '0.02',
            conversion_rate: '0.05',
            churn_rate: '0.40',
          },
        ],
      });

      const analytics = await segmentationService.getSegmentAnalytics();

      expect(analytics).toBeDefined();
      expect(Array.isArray(analytics)).toBe(true);
      expect(analytics.length).toBe(3);

      analytics.forEach((segment) => {
        expect(segment.segment).toBeDefined();
        expect(segment.userCount).toBeGreaterThanOrEqual(0);
        expect(segment.percentOfTotal).toBeGreaterThanOrEqual(0);
        expect(segment.avgEngagementScore).toBeGreaterThanOrEqual(0);
        expect(segment.avgLtv).toBeGreaterThanOrEqual(0);
        expect(segment.avgMatchRate).toBeGreaterThanOrEqual(0);
        expect(segment.conversionRate).toBeGreaterThanOrEqual(0);
        expect(segment.churnRate).toBeGreaterThanOrEqual(0);
      });
    });

    it('should calculate percent of total correctly', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            segment: UserSegmentType.ACTIVE_USER,
            user_count: '750',
            avg_engagement_score: '70',
            avg_ltv: '40',
            avg_match_rate: '0.04',
            conversion_rate: '0.10',
            churn_rate: '0.10',
          },
          {
            segment: UserSegmentType.POWER_USER,
            user_count: '250',
            avg_engagement_score: '90',
            avg_ltv: '120',
            avg_match_rate: '0.07',
            conversion_rate: '0.40',
            churn_rate: '0.03',
          },
        ],
      });

      const analytics = await segmentationService.getSegmentAnalytics();

      const activeUserAnalytics = analytics.find(
        (a) => a.segment === UserSegmentType.ACTIVE_USER
      );
      const powerUserAnalytics = analytics.find(
        (a) => a.segment === UserSegmentType.POWER_USER
      );

      expect(activeUserAnalytics?.percentOfTotal).toBeCloseTo(0.75, 2);
      expect(powerUserAnalytics?.percentOfTotal).toBeCloseTo(0.25, 2);
    });

    it('should handle empty results', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const analytics = await segmentationService.getSegmentAnalytics();

      expect(analytics).toBeDefined();
      expect(analytics.length).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Query failed'));

      const analytics = await segmentationService.getSegmentAnalytics();

      expect(analytics).toBeDefined();
      expect(analytics.length).toBe(0);
    });
  });

  describe('getUsersInSegment', () => {
    it('should return users in a specific segment', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { user_id: 'user-1' },
          { user_id: 'user-2' },
          { user_id: 'user-3' },
        ],
      });

      const users = await segmentationService.getUsersInSegment(
        UserSegmentType.POWER_USER,
        100,
        0
      );

      expect(users).toBeDefined();
      expect(users.length).toBe(3);
      expect(users).toContain('user-1');
      expect(users).toContain('user-2');
      expect(users).toContain('user-3');
    });

    it('should respect limit and offset', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ user_id: 'user-11' }, { user_id: 'user-12' }],
      });

      await segmentationService.getUsersInSegment(UserSegmentType.ACTIVE_USER, 10, 10);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([UserSegmentType.ACTIVE_USER, 10, 10])
      );
    });

    it('should handle empty results', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const users = await segmentationService.getUsersInSegment(UserSegmentType.CHURNED_USER);

      expect(users).toBeDefined();
      expect(users.length).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Query failed'));

      const users = await segmentationService.getUsersInSegment(UserSegmentType.POWER_USER);

      expect(users).toBeDefined();
      expect(users.length).toBe(0);
    });
  });

  describe('getSegmentTransitions', () => {
    it('should return recent segment transitions', async () => {
      const mockTransitions = [
        {
          user_id: 'user-1',
          from_segment: UserSegmentType.ACTIVE_USER,
          to_segment: UserSegmentType.DORMANT_USER,
          transitioned_at: new Date(),
          trigger: 'inactivity',
        },
        {
          user_id: 'user-2',
          from_segment: UserSegmentType.FREE_USER,
          to_segment: UserSegmentType.PAID_USER,
          transitioned_at: new Date(),
          trigger: 'subscription_purchase',
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockTransitions });

      const transitions = await segmentationService.getSegmentTransitions(7, 100);

      expect(transitions).toBeDefined();
      expect(transitions.length).toBe(2);

      transitions.forEach((transition) => {
        expect(transition.userId).toBeDefined();
        expect(transition.fromSegment).toBeDefined();
        expect(transition.toSegment).toBeDefined();
        expect(transition.transitionedAt).toBeInstanceOf(Date);
      });
    });

    it('should use default parameters', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await segmentationService.getSegmentTransitions();

      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [100]);
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Query failed'));

      const transitions = await segmentationService.getSegmentTransitions();

      expect(transitions).toBeDefined();
      expect(transitions.length).toBe(0);
    });
  });

  describe('engagement score calculation', () => {
    it('should calculate engagement score based on multiple factors', async () => {
      const userId = 'user-engagement';

      // High engagement user
      const highEngagementMetrics = {
        ...mockActiveUserMetrics,
        days_active_30: 25,
        profile_completion: 95,
      };

      mockQuery.mockResolvedValueOnce({ rows: [highEngagementMetrics] });
      mockQuery.mockResolvedValueOnce({ rows: [{ responded: 90, total: 100 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 150 }] }); // High swipes
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 80 }] }); // High messages
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await segmentationService.segmentUser(userId);

      expect(result.engagementScore).toBeGreaterThan(70);
    });

    it('should give low engagement score to inactive users', async () => {
      const userId = 'user-low-engagement';

      const lowEngagementMetrics = {
        ...mockActiveUserMetrics,
        days_active_30: 2,
        profile_completion: 30,
        total_swipes: 10,
        total_matches: 0,
        total_messages: 0,
      };

      mockQuery.mockResolvedValueOnce({ rows: [lowEngagementMetrics] });
      mockQuery.mockResolvedValueOnce({ rows: [{ responded: 0, total: 0 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 5 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 0 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await segmentationService.segmentUser(userId);

      expect(result.engagementScore).toBeLessThan(30);
    });
  });

  describe('churn risk calculation', () => {
    it('should calculate high churn risk for inactive users', async () => {
      const userId = 'user-churn-risk';

      const atRiskMetrics = {
        ...mockActiveUserMetrics,
        last_active_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
        days_active_30: 3,
        total_matches: 0,
        profile_completion: 40,
      };

      mockQuery.mockResolvedValueOnce({ rows: [atRiskMetrics] });
      mockQuery.mockResolvedValueOnce({ rows: [{ responded: 1, total: 5 }] }); // Low response
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 10 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 2 }] });
      mockQuery.mockResolvedValueOnce({
        rows: [{ engagement_score: 70 }], // Previous high engagement
      });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await segmentationService.segmentUser(userId);

      expect(result.churnRisk).toBeGreaterThan(0.3);
    });

    it('should calculate low churn risk for engaged users', async () => {
      const userId = 'user-low-churn';

      mockQuery.mockResolvedValueOnce({ rows: [mockActiveUserMetrics] });
      mockQuery.mockResolvedValueOnce({ rows: [{ responded: 45, total: 50 }] }); // High response
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 100 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 60 }] });
      mockQuery.mockResolvedValueOnce({
        rows: [{ engagement_score: 75 }], // Similar previous engagement
      });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await segmentationService.segmentUser(userId);

      expect(result.churnRisk).toBeLessThan(0.3);
    });
  });

  const mockActiveUserMetrics = {
    id: 'user-123',
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    last_active_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    profile_completion: 85,
    subscription_tier: 'GOLD',
    subscription_start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    photo_count: 4,
    has_verification: true,
    days_active_30: 15,
    total_swipes: 500,
    total_matches: 50,
    total_messages: 200,
    total_spend: 60,
    relationship_goal: 'RELATIONSHIP',
  };
});
