/**
 * Unit tests for Churn Prediction Service
 * Tests churn risk calculation, indicators, at-risk user detection, and retention campaigns
 */

import { ChurnPredictionService } from '../../../src/services/churn-prediction.service';
import { dbClient } from '../../../src/infrastructure/database/db-client';
import {
  ChurnRiskTier,
  ChurnIndicatorType,
  RetentionCampaignType,
  ChurnIndicator,
} from '../../../src/types';

jest.mock('../../../src/infrastructure/database/db-client');
jest.mock('@flamoral/backend-shared', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('ChurnPredictionService', () => {
  let churnPredictionService: ChurnPredictionService;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockQuery = jest.fn();
    (dbClient.query as jest.Mock) = mockQuery;

    // Mock loading active model weights to return empty (use defaults)
    mockQuery.mockResolvedValueOnce({ rows: [] });

    churnPredictionService = new ChurnPredictionService();
  });

  describe('calculateChurnRisk', () => {
    it('should calculate churn risk for a user successfully', async () => {
      const userId = 'user-123';

      // Mock user features query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            days_since_last_login: 3,
            logins_last_7_days: 5,
            logins_last_30_days: 20,
            avg_session_duration: 600,
            total_sessions_30_days: 25,
            swipes_last_7_days: 150,
            swipes_last_30_days: 500,
            right_swipe_ratio: 0.4,
            matches_last_30_days: 15,
            match_rate: 0.03,
            messages_sent_30_days: 50,
            messages_received_30_days: 40,
            response_rate: 0.75,
            profile_completion: 85,
            photo_count: 4,
            has_verification: true,
            subscription_tier: 'GOLD',
            subscription_age: 45,
            days_until_renewal: 15,
            payment_failures_90_days: 0,
            used_boost_30_days: true,
            used_super_like_30_days: true,
            support_tickets_90_days: 0,
          },
        ],
      });

      // Mock historical data for each indicator
      mockQuery.mockResolvedValue({ rows: [] });

      // Mock previous prediction query
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Mock store prediction
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await churnPredictionService.calculateChurnRisk(userId);

      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(1);
      expect(Object.values(ChurnRiskTier)).toContain(result.riskTier);
      expect(result.indicators).toBeDefined();
      expect(Array.isArray(result.indicators)).toBe(true);
      expect(result.modelVersion).toBeDefined();
      expect(result.predictedAt).toBeInstanceOf(Date);
      expect(result.nextPredictionAt).toBeInstanceOf(Date);
    });

    it('should determine correct risk tier based on score', async () => {
      const userId = 'user-456';

      // Mock high-risk user features
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            days_since_last_login: 45,
            logins_last_7_days: 0,
            logins_last_30_days: 2,
            avg_session_duration: 60,
            total_sessions_30_days: 2,
            swipes_last_7_days: 5,
            swipes_last_30_days: 10,
            right_swipe_ratio: 0.1,
            matches_last_30_days: 0,
            match_rate: 0,
            messages_sent_30_days: 0,
            messages_received_30_days: 0,
            response_rate: 0,
            profile_completion: 30,
            photo_count: 1,
            has_verification: false,
            subscription_tier: 'FREE',
            subscription_age: 0,
            days_until_renewal: 0,
            payment_failures_90_days: 2,
            used_boost_30_days: false,
            used_super_like_30_days: false,
            support_tickets_90_days: 3,
          },
        ],
      });

      mockQuery.mockResolvedValue({ rows: [] });

      const result = await churnPredictionService.calculateChurnRisk(userId);

      // High-risk users should have elevated risk tier
      expect([ChurnRiskTier.HIGH, ChurnRiskTier.CRITICAL]).toContain(result.riskTier);
      expect(result.riskScore).toBeGreaterThan(0.5);
    });

    it('should identify top risk factors correctly', async () => {
      const userId = 'user-789';

      // Mock user with specific high-risk indicators
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            days_since_last_login: 30, // Very high - should be top risk factor
            logins_last_7_days: 0,
            logins_last_30_days: 1,
            avg_session_duration: 600,
            total_sessions_30_days: 1,
            swipes_last_7_days: 0,
            swipes_last_30_days: 0,
            right_swipe_ratio: 0,
            matches_last_30_days: 0,
            match_rate: 0,
            messages_sent_30_days: 0,
            messages_received_30_days: 0,
            response_rate: 0,
            profile_completion: 100,
            photo_count: 6,
            has_verification: true,
            subscription_tier: 'GOLD',
            subscription_age: 60,
            days_until_renewal: 30,
            payment_failures_90_days: 0,
            used_boost_30_days: false,
            used_super_like_30_days: false,
            support_tickets_90_days: 0,
          },
        ],
      });

      mockQuery.mockResolvedValue({ rows: [] });

      const result = await churnPredictionService.calculateChurnRisk(userId);

      expect(result.topRiskFactors).toBeDefined();
      expect(result.topRiskFactors.length).toBeGreaterThan(0);
      expect(result.topRiskFactors.length).toBeLessThanOrEqual(5);

      // Login frequency should be a top risk factor for this user
      const hasLoginRiskFactor = result.topRiskFactors.some(
        (f) => f.type === ChurnIndicatorType.LOGIN_FREQUENCY
      );
      expect(hasLoginRiskFactor).toBe(true);
    });

    it('should calculate risk trend correctly', async () => {
      const userId = 'user-trend';

      // Mock user features
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            days_since_last_login: 5,
            logins_last_7_days: 3,
            logins_last_30_days: 15,
            avg_session_duration: 300,
            total_sessions_30_days: 15,
            swipes_last_7_days: 50,
            swipes_last_30_days: 200,
            right_swipe_ratio: 0.3,
            matches_last_30_days: 5,
            match_rate: 0.025,
            messages_sent_30_days: 20,
            messages_received_30_days: 15,
            response_rate: 0.5,
            profile_completion: 70,
            photo_count: 3,
            has_verification: false,
            subscription_tier: 'FREE',
            subscription_age: 0,
            days_until_renewal: 0,
            payment_failures_90_days: 0,
            used_boost_30_days: false,
            used_super_like_30_days: false,
            support_tickets_90_days: 0,
          },
        ],
      });

      // Mock previous prediction with higher risk score
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            risk_score: 0.7,
            predicted_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        ],
      });

      mockQuery.mockResolvedValue({ rows: [] });

      const result = await churnPredictionService.calculateChurnRisk(userId);

      expect(result.previousRiskScore).toBe(0.7);
      expect(['increasing', 'stable', 'decreasing']).toContain(result.riskTrend);
      expect(result.daysSinceLastPrediction).toBe(7);
    });

    it('should recommend appropriate campaigns based on risk factors', async () => {
      const userId = 'user-campaign';

      // Mock user who should receive discount offer
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            days_since_last_login: 14,
            logins_last_7_days: 1,
            logins_last_30_days: 5,
            avg_session_duration: 180,
            total_sessions_30_days: 5,
            swipes_last_7_days: 10,
            swipes_last_30_days: 40,
            right_swipe_ratio: 0.25,
            matches_last_30_days: 2,
            match_rate: 0.02,
            messages_sent_30_days: 5,
            messages_received_30_days: 3,
            response_rate: 0.4,
            profile_completion: 60,
            photo_count: 2,
            has_verification: false,
            subscription_tier: 'FREE',
            subscription_age: 0,
            days_until_renewal: 0,
            payment_failures_90_days: 0,
            used_boost_30_days: false,
            used_super_like_30_days: false,
            support_tickets_90_days: 0,
          },
        ],
      });

      mockQuery.mockResolvedValue({ rows: [] });

      const result = await churnPredictionService.calculateChurnRisk(userId);

      expect(result.recommendedCampaigns).toBeDefined();
      expect(Array.isArray(result.recommendedCampaigns)).toBe(true);
      expect(result.recommendedCampaigns.length).toBeGreaterThan(0);

      // Verify campaigns are valid types
      result.recommendedCampaigns.forEach((campaign) => {
        expect(Object.values(RetentionCampaignType)).toContain(campaign);
      });
    });

    it('should calculate confidence based on data availability', async () => {
      const userId = 'user-confidence';

      // Mock user with limited data (low confidence)
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            days_since_last_login: null,
            logins_last_7_days: null,
            logins_last_30_days: null,
            avg_session_duration: null,
            total_sessions_30_days: 1,
            swipes_last_7_days: null,
            swipes_last_30_days: null,
            right_swipe_ratio: null,
            matches_last_30_days: null,
            match_rate: null,
            messages_sent_30_days: null,
            messages_received_30_days: null,
            response_rate: null,
            profile_completion: 10,
            photo_count: 0,
            has_verification: false,
            subscription_tier: null,
            subscription_age: 0,
            days_until_renewal: null,
            payment_failures_90_days: null,
            used_boost_30_days: false,
            used_super_like_30_days: false,
            support_tickets_90_days: null,
          },
        ],
      });

      mockQuery.mockResolvedValue({ rows: [] });

      const result = await churnPredictionService.calculateChurnRisk(userId);

      expect(result.confidence).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should determine correct intervention urgency', async () => {
      const userId = 'user-urgent';

      // Mock critical user
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            days_since_last_login: 60,
            logins_last_7_days: 0,
            logins_last_30_days: 0,
            avg_session_duration: 0,
            total_sessions_30_days: 0,
            swipes_last_7_days: 0,
            swipes_last_30_days: 0,
            right_swipe_ratio: 0,
            matches_last_30_days: 0,
            match_rate: 0,
            messages_sent_30_days: 0,
            messages_received_30_days: 0,
            response_rate: 0,
            profile_completion: 20,
            photo_count: 1,
            has_verification: false,
            subscription_tier: 'GOLD',
            subscription_age: 90,
            days_until_renewal: 5,
            payment_failures_90_days: 1,
            used_boost_30_days: false,
            used_super_like_30_days: false,
            support_tickets_90_days: 2,
          },
        ],
      });

      mockQuery.mockResolvedValue({ rows: [] });

      const result = await churnPredictionService.calculateChurnRisk(userId);

      expect(['immediate', 'this_week', 'this_month', 'monitoring']).toContain(
        result.interventionUrgency
      );
    });
  });

  describe('getChurnIndicators', () => {
    it('should return all churn indicators for a user', async () => {
      const userId = 'user-indicators';

      // Mock user features
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            days_since_last_login: 5,
            logins_last_7_days: 4,
            logins_last_30_days: 18,
            avg_session_duration: 480,
            total_sessions_30_days: 18,
            swipes_last_7_days: 80,
            swipes_last_30_days: 300,
            right_swipe_ratio: 0.35,
            matches_last_30_days: 8,
            match_rate: 0.027,
            messages_sent_30_days: 30,
            messages_received_30_days: 25,
            response_rate: 0.6,
            profile_completion: 80,
            photo_count: 4,
            has_verification: true,
            subscription_tier: 'BASIC',
            subscription_age: 30,
            days_until_renewal: 20,
            payment_failures_90_days: 0,
            used_boost_30_days: true,
            used_super_like_30_days: false,
            support_tickets_90_days: 0,
          },
        ],
      });

      mockQuery.mockResolvedValue({ rows: [] });

      const indicators = await churnPredictionService.getChurnIndicators(userId);

      expect(indicators).toBeDefined();
      expect(Array.isArray(indicators)).toBe(true);
      expect(indicators.length).toBeGreaterThan(0);

      // Each indicator should have required properties
      indicators.forEach((indicator: ChurnIndicator) => {
        expect(indicator.type).toBeDefined();
        expect(indicator.name).toBeDefined();
        expect(indicator.description).toBeDefined();
        expect(indicator.score).toBeGreaterThanOrEqual(0);
        expect(indicator.score).toBeLessThanOrEqual(1);
        expect(indicator.weight).toBeDefined();
        expect(indicator.weightedScore).toBeDefined();
        expect(['improving', 'stable', 'declining']).toContain(indicator.trend);
        expect(['low', 'medium', 'high', 'critical']).toContain(indicator.severity);
      });
    });

    it('should calculate weighted scores correctly', async () => {
      const userId = 'user-weights';

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            days_since_last_login: 10,
            logins_last_7_days: 2,
            logins_last_30_days: 8,
            avg_session_duration: 300,
            total_sessions_30_days: 8,
            swipes_last_7_days: 30,
            swipes_last_30_days: 120,
            right_swipe_ratio: 0.3,
            matches_last_30_days: 3,
            match_rate: 0.025,
            messages_sent_30_days: 10,
            messages_received_30_days: 8,
            response_rate: 0.5,
            profile_completion: 70,
            photo_count: 3,
            has_verification: false,
            subscription_tier: 'FREE',
            subscription_age: 0,
            days_until_renewal: 0,
            payment_failures_90_days: 0,
            used_boost_30_days: false,
            used_super_like_30_days: false,
            support_tickets_90_days: 0,
          },
        ],
      });

      mockQuery.mockResolvedValue({ rows: [] });

      const indicators = await churnPredictionService.getChurnIndicators(userId);

      indicators.forEach((indicator: ChurnIndicator) => {
        // Weighted score should be score * weight
        expect(indicator.weightedScore).toBeCloseTo(indicator.score * indicator.weight, 2);
      });
    });
  });

  describe('getAtRiskUsers', () => {
    it('should return at-risk users filtered by risk level', async () => {
      const mockUsers = [
        {
          user_id: 'user-1',
          risk_score: 0.85,
          risk_tier: ChurnRiskTier.CRITICAL,
          indicators: JSON.stringify([
            { type: ChurnIndicatorType.LOGIN_FREQUENCY, weightedScore: 0.15 },
          ]),
          predicted_at: new Date(),
          email: 'user1@example.com',
          display_name: 'User One',
          subscription_tier: 'GOLD',
          user_created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
          last_active_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          ltv: 150,
          prev_risk_score: 0.8,
        },
        {
          user_id: 'user-2',
          risk_score: 0.78,
          risk_tier: ChurnRiskTier.HIGH,
          indicators: JSON.stringify([
            { type: ChurnIndicatorType.SWIPE_ACTIVITY, weightedScore: 0.1 },
          ]),
          predicted_at: new Date(),
          email: 'user2@example.com',
          display_name: 'User Two',
          subscription_tier: 'BASIC',
          user_created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          last_active_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          ltv: 50,
          prev_risk_score: 0.7,
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockUsers });

      const result = await churnPredictionService.getAtRiskUsers(ChurnRiskTier.HIGH, 100, 0);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);

      result.forEach((user) => {
        expect(user.userId).toBeDefined();
        expect(user.riskScore).toBeGreaterThanOrEqual(0);
        expect(user.riskScore).toBeLessThanOrEqual(1);
        expect(Object.values(ChurnRiskTier)).toContain(user.riskTier);
        expect(['increasing', 'stable', 'decreasing']).toContain(user.riskTrend);
      });
    });

    it('should return empty array when no at-risk users found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await churnPredictionService.getAtRiskUsers(ChurnRiskTier.CRITICAL);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      const result = await churnPredictionService.getAtRiskUsers(ChurnRiskTier.HIGH);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should calculate risk trend correctly from previous score', async () => {
      const mockUsers = [
        {
          user_id: 'user-increasing',
          risk_score: 0.7,
          risk_tier: ChurnRiskTier.HIGH,
          indicators: JSON.stringify([]),
          predicted_at: new Date(),
          email: 'increasing@example.com',
          display_name: 'Increasing Risk',
          subscription_tier: 'FREE',
          user_created_at: new Date(),
          last_active_at: new Date(),
          ltv: 0,
          prev_risk_score: 0.5, // Significant increase
        },
        {
          user_id: 'user-decreasing',
          risk_score: 0.5,
          risk_tier: ChurnRiskTier.MEDIUM,
          indicators: JSON.stringify([]),
          predicted_at: new Date(),
          email: 'decreasing@example.com',
          display_name: 'Decreasing Risk',
          subscription_tier: 'GOLD',
          user_created_at: new Date(),
          last_active_at: new Date(),
          ltv: 100,
          prev_risk_score: 0.7, // Significant decrease
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockUsers });

      const result = await churnPredictionService.getAtRiskUsers(ChurnRiskTier.MEDIUM);

      const increasingUser = result.find((u) => u.userId === 'user-increasing');
      const decreasingUser = result.find((u) => u.userId === 'user-decreasing');

      expect(increasingUser?.riskTrend).toBe('increasing');
      expect(decreasingUser?.riskTrend).toBe('decreasing');
    });
  });

  describe('triggerRetentionCampaign', () => {
    it('should trigger a retention campaign successfully', async () => {
      const userId = 'user-campaign-123';
      const campaignType = RetentionCampaignType.DISCOUNT_OFFER;

      // Mock get previous prediction
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            risk_score: 0.65,
            risk_tier: ChurnRiskTier.HIGH,
          },
        ],
      });

      // Mock insert campaign
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        churnPredictionService.triggerRetentionCampaign(userId, campaignType)
      ).resolves.not.toThrow();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO retention_campaigns'),
        expect.arrayContaining([
          expect.any(String), // id
          userId,
          campaignType,
          expect.any(Number), // risk score
          expect.any(String), // risk tier
          expect.any(Date), // triggered_at
          'pending',
          'pending',
          expect.any(Date), // expires_at
        ])
      );
    });

    it('should handle campaign trigger failure', async () => {
      const userId = 'user-campaign-fail';
      const campaignType = RetentionCampaignType.REENGAGEMENT_EMAIL;

      mockQuery.mockResolvedValueOnce({ rows: [] }); // Previous prediction
      mockQuery.mockRejectedValueOnce(new Error('Insert failed'));

      await expect(
        churnPredictionService.triggerRetentionCampaign(userId, campaignType)
      ).rejects.toThrow('Insert failed');
    });
  });

  describe('updateChurnModel', () => {
    it('should throw error when insufficient training data', async () => {
      // Mock training data query returning less than 100 samples
      mockQuery.mockResolvedValueOnce({
        rows: Array(50).fill({
          user_id: 'user',
          features: {},
          label: 0,
        }),
      });

      await expect(churnPredictionService.updateChurnModel()).rejects.toThrow(
        'Insufficient training data (minimum 100 samples required)'
      );
    });

    it('should update model when new weights improve performance', async () => {
      // Mock training data with 100+ samples
      const trainingData = Array(150).fill({
        user_id: 'user',
        features: {
          daysSinceLastLogin: 5,
          loginsLast7Days: 3,
        },
        label: 1,
      });

      mockQuery.mockResolvedValueOnce({ rows: trainingData });

      // Mock optimal weights calculation
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            accuracy: 0.85,
            precision: 0.8,
            recall: 0.9,
            f1_score: 0.85,
            auc: 0.9,
          },
        ],
      });

      // Mock current model performance
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            accuracy: 0.75,
          },
        ],
      });

      // Mock saving new model
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await churnPredictionService.updateChurnModel();

      expect(result).toBeDefined();
      expect(result.version).toBeDefined();
      expect(result.accuracy).toBeGreaterThan(0);
      expect(result.isActive).toBe(true);
    });
  });

  describe('getChurnAnalytics', () => {
    it('should return churn analytics summary', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      // Mock total users query
      mockQuery.mockResolvedValueOnce({
        rows: [{ total_users: 1000 }],
      });

      // Mock tier distribution query
      mockQuery.mockResolvedValueOnce({
        rows: [
          { risk_tier: ChurnRiskTier.LOW, count: 600, avg_score: 0.15 },
          { risk_tier: ChurnRiskTier.MEDIUM, count: 250, avg_score: 0.4 },
          { risk_tier: ChurnRiskTier.HIGH, count: 100, avg_score: 0.65 },
          { risk_tier: ChurnRiskTier.CRITICAL, count: 50, avg_score: 0.85 },
        ],
      });

      // Mock trends query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            date: new Date('2025-01-01'),
            avg_risk_score: 0.35,
            at_risk_count: 150,
            churned_count: 5,
          },
          {
            date: new Date('2025-01-02'),
            avg_risk_score: 0.36,
            at_risk_count: 155,
            churned_count: 7,
          },
        ],
      });

      // Mock indicators query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            indicator_type: ChurnIndicatorType.LOGIN_FREQUENCY,
            avg_score: 0.7,
            affected_users: 200,
            contribution: 0.18,
          },
        ],
      });

      // Mock campaign query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            campaign_type: RetentionCampaignType.DISCOUNT_OFFER,
            sent: 100,
            engaged: 40,
            retained: 30,
          },
        ],
      });

      // Mock accuracy query
      mockQuery.mockResolvedValueOnce({
        rows: [{ predicted: 150, actual_churned: 120 }],
      });

      const result = await churnPredictionService.getChurnAnalytics(startDate, endDate);

      expect(result).toBeDefined();
      expect(result.period.startDate).toEqual(startDate);
      expect(result.period.endDate).toEqual(endDate);
      expect(result.totalUsersAnalyzed).toBe(1000);
      expect(result.atRiskUserCount).toBe(400); // HIGH + CRITICAL + MEDIUM
      expect(result.tierDistribution).toBeDefined();
      expect(result.riskTrends).toBeDefined();
      expect(result.topRiskIndicators).toBeDefined();
      expect(result.campaignMetrics).toBeDefined();
      expect(result.predictionAccuracy).toBeDefined();
    });

    it('should handle missing data gracefully', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ total_users: 0 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockRejectedValueOnce(new Error('Query failed'));
      mockQuery.mockRejectedValueOnce(new Error('Query failed'));
      mockQuery.mockRejectedValueOnce(new Error('Query failed'));

      const result = await churnPredictionService.getChurnAnalytics();

      expect(result).toBeDefined();
      expect(result.totalUsersAnalyzed).toBe(0);
      expect(result.atRiskPercentage).toBe(0);
    });
  });

  describe('runDailyPredictions', () => {
    it('should run daily predictions for all active users', async () => {
      // Mock store job
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Mock active users query
      mockQuery.mockResolvedValueOnce({
        rows: [
          { user_id: 'user-1' },
          { user_id: 'user-2' },
          { user_id: 'user-3' },
        ],
      });

      // Mock user features for each user
      for (let i = 0; i < 3; i++) {
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              days_since_last_login: 2,
              logins_last_7_days: 5,
              logins_last_30_days: 20,
              avg_session_duration: 600,
              total_sessions_30_days: 20,
              swipes_last_7_days: 100,
              swipes_last_30_days: 400,
              right_swipe_ratio: 0.35,
              matches_last_30_days: 10,
              match_rate: 0.025,
              messages_sent_30_days: 40,
              messages_received_30_days: 35,
              response_rate: 0.7,
              profile_completion: 85,
              photo_count: 4,
              has_verification: true,
              subscription_tier: 'GOLD',
              subscription_age: 60,
              days_until_renewal: 25,
              payment_failures_90_days: 0,
              used_boost_30_days: true,
              used_super_like_30_days: true,
              support_tickets_90_days: 0,
            },
          ],
        });
        // Mock remaining queries for each user
        mockQuery.mockResolvedValue({ rows: [] });
      }

      // Mock update job
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await churnPredictionService.runDailyPredictions();

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.usersTotal).toBe(3);
      expect(result.usersProcessed).toBe(3);
    });

    it('should handle empty user list', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); // Store job
      mockQuery.mockResolvedValueOnce({ rows: [] }); // Active users
      mockQuery.mockResolvedValueOnce({ rows: [] }); // Update job

      const result = await churnPredictionService.runDailyPredictions();

      expect(result.usersTotal).toBe(0);
      expect(result.usersProcessed).toBe(0);
      expect(result.status).toBe('completed');
    });
  });
});
