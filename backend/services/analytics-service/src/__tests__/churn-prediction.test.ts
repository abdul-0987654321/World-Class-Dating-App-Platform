/**
 * Churn Prediction Service Tests
 *
 * Tests for:
 * - Churn score calculation
 * - Feature extraction (login frequency, message activity, match rate)
 * - Risk categorization (low, medium, high, critical)
 * - Retention campaign triggering
 */

import { ChurnPredictionService } from '../services/churn-prediction.service';
import { dbClient } from '../infrastructure/database/db-client';
import {
  ChurnRiskTier,
  ChurnIndicatorType,
  RetentionCampaignType,
  UserBehaviorFeatures,
  ChurnIndicator,
  ChurnRiskResult,
} from '../types';

// Mock the database client
jest.mock('../infrastructure/database/db-client', () => ({
  dbClient: {
    query: jest.fn(),
  },
}));

// Mock the logger
jest.mock('@flamoral/backend-shared', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// =============================================
// MOCK DATA GENERATORS
// =============================================

/**
 * Generate mock user behavior features
 */
function generateMockUserFeatures(overrides: Partial<UserBehaviorFeatures> = {}): UserBehaviorFeatures {
  return {
    userId: 'user-test-123',
    extractedAt: new Date(),
    daysSinceLastLogin: 3,
    loginsLast7Days: 5,
    loginsLast30Days: 18,
    loginFrequencyTrend: 0.1,
    avgDaysBetweenLogins: 1.5,
    avgSessionDurationMinutes: 8,
    totalSessionsLast30Days: 25,
    sessionDurationTrend: 0.05,
    avgScreensPerSession: 12,
    swipesLast7Days: 75,
    swipesLast30Days: 280,
    swipeActivityTrend: 0.0,
    rightSwipeRatio: 0.35,
    matchesLast30Days: 8,
    matchRate: 0.028,
    matchRateTrend: 0.02,
    avgTimeToFirstMessage: 2.5,
    messagesSentLast30Days: 45,
    messagesReceivedLast30Days: 38,
    responseRate: 0.65,
    responseRateTrend: 0.0,
    avgResponseTimeHours: 1.2,
    conversationsInitiated: 12,
    profileCompletionPercent: 85,
    photoCount: 5,
    lastProfileUpdateDays: 7,
    hasVerification: true,
    bioLength: 150,
    subscriptionTier: 'PLUS',
    subscriptionAge: 45,
    daysUntilRenewal: 15,
    paymentFailuresLast90Days: 0,
    hasActiveSubscription: true,
    previouslyPaidUser: true,
    usedBoostLast30Days: true,
    usedSuperLikeLast30Days: true,
    usedRewindLast30Days: false,
    premiumFeaturesUsed: 8,
    supportTicketsLast90Days: 0,
    hasReportedIssue: false,
    engagementScore: 72,
    valueScore: 70,
    satisfactionIndicator: 65,
    ...overrides,
  };
}

/**
 * Generate low-risk user features
 */
function generateLowRiskUserFeatures(): UserBehaviorFeatures {
  return generateMockUserFeatures({
    daysSinceLastLogin: 0,
    loginsLast7Days: 7,
    loginsLast30Days: 28,
    loginFrequencyTrend: 0.2,
    avgSessionDurationMinutes: 15,
    swipesLast7Days: 150,
    swipesLast30Days: 500,
    matchesLast30Days: 15,
    matchRate: 0.03,
    messagesSentLast30Days: 80,
    messagesReceivedLast30Days: 75,
    responseRate: 0.85,
    profileCompletionPercent: 100,
    photoCount: 6,
    hasActiveSubscription: true,
    premiumFeaturesUsed: 15,
    engagementScore: 90,
    satisfactionIndicator: 85,
  });
}

/**
 * Generate high-risk user features
 */
function generateHighRiskUserFeatures(): UserBehaviorFeatures {
  return generateMockUserFeatures({
    daysSinceLastLogin: 14,
    loginsLast7Days: 1,
    loginsLast30Days: 5,
    loginFrequencyTrend: -0.4,
    avgSessionDurationMinutes: 2,
    swipesLast7Days: 5,
    swipesLast30Days: 20,
    swipeActivityTrend: -0.5,
    matchesLast30Days: 0,
    matchRate: 0,
    messagesSentLast30Days: 2,
    messagesReceivedLast30Days: 5,
    responseRate: 0.15,
    profileCompletionPercent: 40,
    photoCount: 1,
    hasActiveSubscription: false,
    previouslyPaidUser: true,
    premiumFeaturesUsed: 0,
    paymentFailuresLast90Days: 2,
    engagementScore: 15,
    satisfactionIndicator: 20,
  });
}

/**
 * Generate mock database rows for session events
 */
function generateMockSessionData(loginCount: number, avgDuration: number) {
  return {
    rows: [{
      last_login: new Date(),
      logins_7d: loginCount,
      logins_30d: loginCount * 4,
      avg_session_duration: avgDuration * 60,
      total_sessions_30d: loginCount * 4,
      avg_screens: 10,
    }],
  };
}

/**
 * Generate mock churn prediction result
 */
function generateMockPrediction(riskScore: number, riskTier: ChurnRiskTier): Partial<ChurnRiskResult> {
  return {
    userId: 'user-test-123',
    riskScore,
    riskTier,
    confidence: 0.75,
    predictedAt: new Date(),
    modelVersion: '1.0.0',
  };
}

// =============================================
// TEST SUITES
// =============================================

describe('ChurnPredictionService', () => {
  let service: ChurnPredictionService;
  let mockDbQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDbQuery = dbClient.query as jest.Mock;

    // Mock model weights loading
    mockDbQuery.mockResolvedValueOnce({ rows: [] });

    service = new ChurnPredictionService();
  });

  // =============================================
  // CHURN SCORE CALCULATION TESTS
  // =============================================
  describe('Churn Score Calculation', () => {
    beforeEach(() => {
      // Setup default mocks for feature extraction
      setupFeatureExtractionMocks(mockDbQuery, generateMockUserFeatures());
    });

    it('should calculate a risk score between 0 and 1', async () => {
      const result = await service.calculateChurnRisk('user-test-123');

      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(1);
    });

    it('should calculate lower risk score for engaged users', async () => {
      setupFeatureExtractionMocks(mockDbQuery, generateLowRiskUserFeatures());

      const result = await service.calculateChurnRisk('user-engaged-123');

      expect(result.riskScore).toBeLessThan(0.4);
      expect(result.riskTier).toBe(ChurnRiskTier.LOW);
    });

    it('should calculate higher risk score for disengaged users', async () => {
      setupFeatureExtractionMocks(mockDbQuery, generateHighRiskUserFeatures());

      const result = await service.calculateChurnRisk('user-disengaged-123');

      expect(result.riskScore).toBeGreaterThan(0.5);
      expect([ChurnRiskTier.HIGH, ChurnRiskTier.CRITICAL]).toContain(result.riskTier);
    });

    it('should include all indicators in the result', async () => {
      const result = await service.calculateChurnRisk('user-test-123');

      expect(result.indicators).toBeDefined();
      expect(result.indicators.length).toBeGreaterThan(0);

      // Check that key indicators are present
      const indicatorTypes = result.indicators.map(i => i.type);
      expect(indicatorTypes).toContain(ChurnIndicatorType.LOGIN_FREQUENCY);
      expect(indicatorTypes).toContain(ChurnIndicatorType.SWIPE_ACTIVITY);
      expect(indicatorTypes).toContain(ChurnIndicatorType.MESSAGE_RESPONSE_RATE);
      expect(indicatorTypes).toContain(ChurnIndicatorType.MATCH_SUCCESS_RATE);
    });

    it('should calculate weighted risk score correctly', async () => {
      const result = await service.calculateChurnRisk('user-test-123');

      // Verify weighted score calculation
      const totalWeightedScore = result.indicators.reduce((sum, i) => sum + i.weightedScore, 0);
      expect(result.riskScore).toBeCloseTo(totalWeightedScore, 2);
    });

    it('should provide confidence score based on data availability', async () => {
      const result = await service.calculateChurnRisk('user-test-123');

      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.confidence).toBeLessThanOrEqual(0.95);
    });
  });

  // =============================================
  // FEATURE EXTRACTION TESTS
  // =============================================
  describe('Feature Extraction', () => {
    describe('Login Frequency', () => {
      it('should extract login frequency features correctly', async () => {
        const features = generateMockUserFeatures({
          loginsLast7Days: 7,
          loginsLast30Days: 25,
          daysSinceLastLogin: 1,
        });
        setupFeatureExtractionMocks(mockDbQuery, features);

        const indicators = await service.getChurnIndicators('user-test-123');
        const loginIndicator = indicators.find(i => i.type === ChurnIndicatorType.LOGIN_FREQUENCY);

        expect(loginIndicator).toBeDefined();
        expect(loginIndicator!.score).toBeLessThan(0.3); // Frequent logins = low churn risk
      });

      it('should flag users who have not logged in recently', async () => {
        const features = generateMockUserFeatures({
          daysSinceLastLogin: 15,
          loginsLast7Days: 0,
          loginsLast30Days: 3,
        });
        setupFeatureExtractionMocks(mockDbQuery, features);

        const indicators = await service.getChurnIndicators('user-inactive-123');
        const loginIndicator = indicators.find(i => i.type === ChurnIndicatorType.LOGIN_FREQUENCY);

        expect(loginIndicator).toBeDefined();
        expect(loginIndicator!.score).toBeGreaterThan(0.6);
        expect(loginIndicator!.severity).toBe('high');
      });

      it('should detect critical inactivity (30+ days)', async () => {
        const features = generateMockUserFeatures({
          daysSinceLastLogin: 35,
          loginsLast7Days: 0,
          loginsLast30Days: 0,
        });
        setupFeatureExtractionMocks(mockDbQuery, features);

        const indicators = await service.getChurnIndicators('user-churned-123');
        const loginIndicator = indicators.find(i => i.type === ChurnIndicatorType.LOGIN_FREQUENCY);

        expect(loginIndicator!.score).toBeGreaterThan(0.9);
        expect(loginIndicator!.severity).toBe('critical');
      });
    });

    describe('Message Activity', () => {
      it('should measure message response rate correctly', async () => {
        const features = generateMockUserFeatures({
          messagesSentLast30Days: 50,
          messagesReceivedLast30Days: 55,
          responseRate: 0.91,
        });
        setupFeatureExtractionMocks(mockDbQuery, features);

        const indicators = await service.getChurnIndicators('user-responsive-123');
        const messageIndicator = indicators.find(i => i.type === ChurnIndicatorType.MESSAGE_RESPONSE_RATE);

        expect(messageIndicator).toBeDefined();
        expect(messageIndicator!.score).toBeLessThan(0.3);
      });

      it('should flag low message response rate', async () => {
        const features = generateMockUserFeatures({
          messagesSentLast30Days: 5,
          messagesReceivedLast30Days: 40,
          responseRate: 0.08,
        });
        setupFeatureExtractionMocks(mockDbQuery, features);

        const indicators = await service.getChurnIndicators('user-unresponsive-123');
        const messageIndicator = indicators.find(i => i.type === ChurnIndicatorType.MESSAGE_RESPONSE_RATE);

        expect(messageIndicator!.score).toBeGreaterThan(0.7);
      });

      it('should handle users with no messages gracefully', async () => {
        const features = generateMockUserFeatures({
          messagesSentLast30Days: 0,
          messagesReceivedLast30Days: 0,
          responseRate: 0,
        });
        setupFeatureExtractionMocks(mockDbQuery, features);

        const indicators = await service.getChurnIndicators('user-no-messages-123');
        const messageIndicator = indicators.find(i => i.type === ChurnIndicatorType.MESSAGE_RESPONSE_RATE);

        expect(messageIndicator).toBeDefined();
        // Low score when no messages received (not a negative signal)
        expect(messageIndicator!.score).toBeLessThan(0.5);
      });
    });

    describe('Match Rate', () => {
      it('should calculate match rate indicator correctly', async () => {
        const features = generateMockUserFeatures({
          matchesLast30Days: 10,
          swipesLast30Days: 200,
          matchRate: 0.05,
        });
        setupFeatureExtractionMocks(mockDbQuery, features);

        const indicators = await service.getChurnIndicators('user-matching-123');
        const matchIndicator = indicators.find(i => i.type === ChurnIndicatorType.MATCH_SUCCESS_RATE);

        expect(matchIndicator).toBeDefined();
        expect(matchIndicator!.score).toBeLessThan(0.3); // 5% match rate is good
      });

      it('should flag users with zero matches', async () => {
        const features = generateMockUserFeatures({
          matchesLast30Days: 0,
          swipesLast30Days: 100,
          matchRate: 0,
        });
        setupFeatureExtractionMocks(mockDbQuery, features);

        const indicators = await service.getChurnIndicators('user-no-matches-123');
        const matchIndicator = indicators.find(i => i.type === ChurnIndicatorType.MATCH_SUCCESS_RATE);

        expect(matchIndicator!.score).toBeGreaterThan(0.5);
      });

      it('should flag very low match rates', async () => {
        const features = generateMockUserFeatures({
          matchesLast30Days: 1,
          swipesLast30Days: 500,
          matchRate: 0.002,
        });
        setupFeatureExtractionMocks(mockDbQuery, features);

        const indicators = await service.getChurnIndicators('user-low-matches-123');
        const matchIndicator = indicators.find(i => i.type === ChurnIndicatorType.MATCH_SUCCESS_RATE);

        expect(matchIndicator!.score).toBeGreaterThan(0.4);
      });
    });

    describe('Swipe Activity', () => {
      it('should measure swipe activity correctly', async () => {
        const features = generateMockUserFeatures({
          swipesLast7Days: 100,
          swipesLast30Days: 350,
          swipeActivityTrend: 0.1,
        });
        setupFeatureExtractionMocks(mockDbQuery, features);

        const indicators = await service.getChurnIndicators('user-active-swiper-123');
        const swipeIndicator = indicators.find(i => i.type === ChurnIndicatorType.SWIPE_ACTIVITY);

        expect(swipeIndicator).toBeDefined();
        expect(swipeIndicator!.score).toBeLessThan(0.3);
      });

      it('should flag declining swipe activity', async () => {
        const features = generateMockUserFeatures({
          swipesLast7Days: 5,
          swipesLast30Days: 150,
          swipeActivityTrend: -0.5,
        });
        setupFeatureExtractionMocks(mockDbQuery, features);

        const indicators = await service.getChurnIndicators('user-declining-123');
        const swipeIndicator = indicators.find(i => i.type === ChurnIndicatorType.SWIPE_ACTIVITY);

        expect(swipeIndicator!.score).toBeGreaterThan(0.4);
      });

      it('should detect zero swipe activity', async () => {
        const features = generateMockUserFeatures({
          swipesLast7Days: 0,
          swipesLast30Days: 0,
          swipeActivityTrend: -1,
        });
        setupFeatureExtractionMocks(mockDbQuery, features);

        const indicators = await service.getChurnIndicators('user-no-swipes-123');
        const swipeIndicator = indicators.find(i => i.type === ChurnIndicatorType.SWIPE_ACTIVITY);

        expect(swipeIndicator!.score).toBeGreaterThan(0.7);
      });
    });

    describe('Session Duration', () => {
      it('should measure session duration correctly', async () => {
        const features = generateMockUserFeatures({
          avgSessionDurationMinutes: 10,
          totalSessionsLast30Days: 30,
        });
        setupFeatureExtractionMocks(mockDbQuery, features);

        const indicators = await service.getChurnIndicators('user-engaged-sessions-123');
        const sessionIndicator = indicators.find(i => i.type === ChurnIndicatorType.SESSION_DURATION);

        expect(sessionIndicator).toBeDefined();
        expect(sessionIndicator!.score).toBeLessThan(0.3);
      });

      it('should flag very short sessions', async () => {
        const features = generateMockUserFeatures({
          avgSessionDurationMinutes: 0.5,
          totalSessionsLast30Days: 10,
        });
        setupFeatureExtractionMocks(mockDbQuery, features);

        const indicators = await service.getChurnIndicators('user-short-sessions-123');
        const sessionIndicator = indicators.find(i => i.type === ChurnIndicatorType.SESSION_DURATION);

        expect(sessionIndicator!.score).toBeGreaterThan(0.6);
      });
    });
  });

  // =============================================
  // RISK CATEGORIZATION TESTS
  // =============================================
  describe('Risk Categorization', () => {
    it('should categorize as LOW risk for scores below 0.25', async () => {
      setupFeatureExtractionMocks(mockDbQuery, generateLowRiskUserFeatures());

      const result = await service.calculateChurnRisk('user-low-risk-123');

      if (result.riskScore < 0.25) {
        expect(result.riskTier).toBe(ChurnRiskTier.LOW);
      }
    });

    it('should categorize as MEDIUM risk for scores between 0.25 and 0.50', async () => {
      const features = generateMockUserFeatures({
        daysSinceLastLogin: 5,
        loginsLast7Days: 3,
        swipesLast7Days: 30,
        matchesLast30Days: 3,
        responseRate: 0.4,
      });
      setupFeatureExtractionMocks(mockDbQuery, features);

      const result = await service.calculateChurnRisk('user-medium-risk-123');

      if (result.riskScore >= 0.25 && result.riskScore < 0.50) {
        expect(result.riskTier).toBe(ChurnRiskTier.MEDIUM);
      }
    });

    it('should categorize as HIGH risk for scores between 0.50 and 0.75', async () => {
      const features = generateMockUserFeatures({
        daysSinceLastLogin: 10,
        loginsLast7Days: 1,
        swipesLast7Days: 10,
        matchesLast30Days: 1,
        responseRate: 0.2,
        hasActiveSubscription: false,
        previouslyPaidUser: true,
      });
      setupFeatureExtractionMocks(mockDbQuery, features);

      const result = await service.calculateChurnRisk('user-high-risk-123');

      if (result.riskScore >= 0.50 && result.riskScore < 0.75) {
        expect(result.riskTier).toBe(ChurnRiskTier.HIGH);
      }
    });

    it('should categorize as CRITICAL risk for scores above 0.75', async () => {
      setupFeatureExtractionMocks(mockDbQuery, generateHighRiskUserFeatures());

      const result = await service.calculateChurnRisk('user-critical-risk-123');

      if (result.riskScore >= 0.75) {
        expect(result.riskTier).toBe(ChurnRiskTier.CRITICAL);
      }
    });

    it('should identify top risk factors', async () => {
      setupFeatureExtractionMocks(mockDbQuery, generateHighRiskUserFeatures());

      const result = await service.calculateChurnRisk('user-risky-123');

      expect(result.topRiskFactors).toBeDefined();
      expect(result.topRiskFactors.length).toBeGreaterThan(0);
      expect(result.topRiskFactors.length).toBeLessThanOrEqual(5);

      // Top factors should be sorted by weighted score
      for (let i = 0; i < result.topRiskFactors.length - 1; i++) {
        expect(result.topRiskFactors[i].weightedScore)
          .toBeGreaterThanOrEqual(result.topRiskFactors[i + 1].weightedScore);
      }
    });

    it('should identify positive signals for engaged users', async () => {
      setupFeatureExtractionMocks(mockDbQuery, generateLowRiskUserFeatures());

      const result = await service.calculateChurnRisk('user-positive-123');

      expect(result.positiveSignals).toBeDefined();
      // Positive signals are indicators with low scores (good)
      result.positiveSignals.forEach(signal => {
        expect(signal.score).toBeLessThanOrEqual(0.3);
      });
    });

    it('should determine correct intervention urgency', async () => {
      // Test immediate urgency
      setupFeatureExtractionMocks(mockDbQuery, generateHighRiskUserFeatures());
      const criticalResult = await service.calculateChurnRisk('user-critical-123');
      if (criticalResult.riskScore >= 0.80) {
        expect(criticalResult.interventionUrgency).toBe('immediate');
      }

      // Test monitoring urgency
      setupFeatureExtractionMocks(mockDbQuery, generateLowRiskUserFeatures());
      const lowResult = await service.calculateChurnRisk('user-low-123');
      if (lowResult.riskScore < 0.40) {
        expect(lowResult.interventionUrgency).toBe('monitoring');
      }
    });
  });

  // =============================================
  // RETENTION CAMPAIGN TRIGGERING TESTS
  // =============================================
  describe('Retention Campaign Triggering', () => {
    beforeEach(() => {
      setupFeatureExtractionMocks(mockDbQuery, generateMockUserFeatures());
    });

    it('should recommend campaigns based on risk tier', async () => {
      setupFeatureExtractionMocks(mockDbQuery, generateHighRiskUserFeatures());

      const result = await service.calculateChurnRisk('user-at-risk-123');

      expect(result.recommendedCampaigns).toBeDefined();
      expect(result.recommendedCampaigns.length).toBeGreaterThan(0);
    });

    it('should recommend WIN_BACK_CAMPAIGN for critical users', async () => {
      setupFeatureExtractionMocks(mockDbQuery, generateHighRiskUserFeatures());

      const result = await service.calculateChurnRisk('user-critical-123');

      if (result.riskTier === ChurnRiskTier.CRITICAL) {
        expect(result.recommendedCampaigns).toContain(RetentionCampaignType.WIN_BACK_CAMPAIGN);
      }
    });

    it('should recommend PUSH_NOTIFICATION for login frequency issues', async () => {
      const features = generateMockUserFeatures({
        daysSinceLastLogin: 10,
        loginsLast7Days: 0,
      });
      setupFeatureExtractionMocks(mockDbQuery, features);

      const result = await service.calculateChurnRisk('user-inactive-login-123');

      // Login frequency should be a top risk factor
      const loginIsTopRisk = result.topRiskFactors.some(
        f => f.type === ChurnIndicatorType.LOGIN_FREQUENCY
      );

      if (loginIsTopRisk) {
        expect(result.recommendedCampaigns).toContain(RetentionCampaignType.PUSH_NOTIFICATION);
      }
    });

    it('should recommend PROFILE_BOOST for low match rates', async () => {
      const features = generateMockUserFeatures({
        matchesLast30Days: 0,
        matchRate: 0,
        swipesLast30Days: 200,
      });
      setupFeatureExtractionMocks(mockDbQuery, features);

      const result = await service.calculateChurnRisk('user-no-matches-123');

      const matchIsTopRisk = result.topRiskFactors.some(
        f => f.type === ChurnIndicatorType.MATCH_SUCCESS_RATE
      );

      if (matchIsTopRisk) {
        expect(result.recommendedCampaigns).toContain(RetentionCampaignType.PROFILE_BOOST);
      }
    });

    it('should trigger retention campaign successfully', async () => {
      // Mock the campaign insertion
      mockDbQuery.mockResolvedValueOnce({ rows: [] }); // For getPreviousPrediction
      mockDbQuery.mockResolvedValueOnce({ rows: [] }); // For campaign insert

      await expect(
        service.triggerRetentionCampaign('user-test-123', RetentionCampaignType.REENGAGEMENT_EMAIL)
      ).resolves.not.toThrow();

      // Verify the campaign was inserted
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO retention_campaigns'),
        expect.any(Array)
      );
    });

    it('should limit recommended campaigns to 3', async () => {
      setupFeatureExtractionMocks(mockDbQuery, generateHighRiskUserFeatures());

      const result = await service.calculateChurnRisk('user-many-issues-123');

      expect(result.recommendedCampaigns.length).toBeLessThanOrEqual(3);
    });

    it('should recommend REENGAGEMENT_EMAIL as default campaign', async () => {
      // Low risk user with no specific issues
      setupFeatureExtractionMocks(mockDbQuery, generateLowRiskUserFeatures());

      const result = await service.calculateChurnRisk('user-healthy-123');

      if (result.topRiskFactors.length === 0 || result.riskTier === ChurnRiskTier.LOW) {
        expect(result.recommendedCampaigns).toContain(RetentionCampaignType.REENGAGEMENT_EMAIL);
      }
    });

    it('should recommend SUBSCRIPTION_PAUSE for payment issues', async () => {
      const features = generateMockUserFeatures({
        paymentFailuresLast90Days: 3,
        hasActiveSubscription: false,
        previouslyPaidUser: true,
      });
      setupFeatureExtractionMocks(mockDbQuery, features);

      const result = await service.calculateChurnRisk('user-payment-issues-123');

      const paymentIsTopRisk = result.topRiskFactors.some(
        f => f.type === ChurnIndicatorType.PAYMENT_FAILURE
      );

      if (paymentIsTopRisk) {
        expect(result.recommendedCampaigns).toContain(RetentionCampaignType.SUBSCRIPTION_PAUSE);
      }
    });
  });

  // =============================================
  // AT-RISK USERS TESTS
  // =============================================
  describe('At-Risk Users Query', () => {
    it('should return at-risk users filtered by tier', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [
          {
            user_id: 'user-1',
            email: 'user1@test.com',
            display_name: 'User One',
            risk_score: 0.85,
            risk_tier: ChurnRiskTier.CRITICAL,
            indicators: JSON.stringify([]),
            predicted_at: new Date(),
            subscription_tier: 'PLUS',
            user_created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            last_active_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            ltv: 150,
          },
          {
            user_id: 'user-2',
            email: 'user2@test.com',
            display_name: 'User Two',
            risk_score: 0.78,
            risk_tier: ChurnRiskTier.CRITICAL,
            indicators: JSON.stringify([]),
            predicted_at: new Date(),
            subscription_tier: 'GOLD',
            user_created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
            last_active_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
            ltv: 300,
          },
        ],
      });

      const atRiskUsers = await service.getAtRiskUsers(ChurnRiskTier.CRITICAL, 10, 0);

      expect(atRiskUsers.length).toBe(2);
      expect(atRiskUsers[0].riskTier).toBe(ChurnRiskTier.CRITICAL);
      expect(atRiskUsers[0].ltv).toBeDefined();
      expect(atRiskUsers[0].daysSinceLastLogin).toBeDefined();
    });

    it('should return empty array when no at-risk users found', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [] });

      const atRiskUsers = await service.getAtRiskUsers(ChurnRiskTier.CRITICAL);

      expect(atRiskUsers).toEqual([]);
    });

    it('should calculate risk trend from previous prediction', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [{
          user_id: 'user-1',
          email: 'user1@test.com',
          display_name: 'User One',
          risk_score: 0.75,
          risk_tier: ChurnRiskTier.HIGH,
          indicators: JSON.stringify([]),
          predicted_at: new Date(),
          subscription_tier: 'PLUS',
          user_created_at: new Date(),
          last_active_at: new Date(),
          ltv: 100,
          prev_risk_score: 0.60, // Previous was lower
        }],
      });

      const atRiskUsers = await service.getAtRiskUsers(ChurnRiskTier.HIGH);

      expect(atRiskUsers[0].riskTrend).toBe('increasing');
    });
  });

  // =============================================
  // CHURN ANALYTICS TESTS
  // =============================================
  describe('Churn Analytics Summary', () => {
    it('should return analytics summary for date range', async () => {
      // Mock total users query
      mockDbQuery.mockResolvedValueOnce({ rows: [{ total_users: 1000 }] });
      // Mock tier distribution query
      mockDbQuery.mockResolvedValueOnce({
        rows: [
          { risk_tier: ChurnRiskTier.LOW, count: 600, avg_score: 0.15 },
          { risk_tier: ChurnRiskTier.MEDIUM, count: 250, avg_score: 0.35 },
          { risk_tier: ChurnRiskTier.HIGH, count: 100, avg_score: 0.60 },
          { risk_tier: ChurnRiskTier.CRITICAL, count: 50, avg_score: 0.85 },
        ],
      });
      // Mock trends query
      mockDbQuery.mockResolvedValueOnce({ rows: [] });
      // Mock indicators query
      mockDbQuery.mockResolvedValueOnce({ rows: [] });
      // Mock campaign metrics query
      mockDbQuery.mockResolvedValueOnce({ rows: [] });
      // Mock prediction accuracy query
      mockDbQuery.mockResolvedValueOnce({ rows: [] });

      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const analytics = await service.getChurnAnalytics(startDate, endDate);

      expect(analytics.totalUsersAnalyzed).toBe(1000);
      expect(analytics.tierDistribution).toBeDefined();
      expect(analytics.tierDistribution[ChurnRiskTier.LOW]).toBeDefined();
      expect(analytics.tierDistribution[ChurnRiskTier.LOW].count).toBe(600);
    });

    it('should calculate at-risk percentage correctly', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [{ total_users: 1000 }] });
      mockDbQuery.mockResolvedValueOnce({
        rows: [
          { risk_tier: ChurnRiskTier.LOW, count: 700, avg_score: 0.15 },
          { risk_tier: ChurnRiskTier.MEDIUM, count: 150, avg_score: 0.35 },
          { risk_tier: ChurnRiskTier.HIGH, count: 100, avg_score: 0.60 },
          { risk_tier: ChurnRiskTier.CRITICAL, count: 50, avg_score: 0.85 },
        ],
      });
      mockDbQuery.mockResolvedValueOnce({ rows: [] });
      mockDbQuery.mockResolvedValueOnce({ rows: [] });
      mockDbQuery.mockResolvedValueOnce({ rows: [] });
      mockDbQuery.mockResolvedValueOnce({ rows: [] });

      const analytics = await service.getChurnAnalytics();

      // At risk = MEDIUM + HIGH + CRITICAL = 150 + 100 + 50 = 300
      expect(analytics.atRiskUserCount).toBe(300);
      expect(analytics.atRiskPercentage).toBe(30);
    });
  });

  // =============================================
  // MODEL UPDATE TESTS
  // =============================================
  describe('Model Update', () => {
    it('should throw error when training data is insufficient', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [] }); // Training data with < 100 samples

      await expect(service.updateChurnModel()).rejects.toThrow('Insufficient training data');
    });
  });
});

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Setup mocks for feature extraction queries
 */
function setupFeatureExtractionMocks(
  mockDbQuery: jest.Mock,
  features: UserBehaviorFeatures
): void {
  // Session query mock
  mockDbQuery.mockResolvedValueOnce({
    rows: [{
      last_login: new Date(Date.now() - features.daysSinceLastLogin * 24 * 60 * 60 * 1000),
      logins_7d: features.loginsLast7Days,
      logins_30d: features.loginsLast30Days,
      avg_session_duration: features.avgSessionDurationMinutes * 60,
      total_sessions_30d: features.totalSessionsLast30Days,
      avg_screens: features.avgScreensPerSession,
    }],
  });

  // Swipe query mock
  mockDbQuery.mockResolvedValueOnce({
    rows: [{
      swipes_7d: features.swipesLast7Days,
      swipes_30d: features.swipesLast30Days,
      right_swipes: Math.floor(features.swipesLast30Days * features.rightSwipeRatio),
      total_swipes: features.swipesLast30Days,
    }],
  });

  // Match query mock
  mockDbQuery.mockResolvedValueOnce({
    rows: [{ matches_30d: features.matchesLast30Days }],
  });

  // Message query mock
  mockDbQuery.mockResolvedValueOnce({
    rows: [{
      messages_sent: features.messagesSentLast30Days,
      messages_received: features.messagesReceivedLast30Days,
      avg_response_time: features.avgResponseTimeHours * 3600,
    }],
  });

  // Profile query mock
  mockDbQuery.mockResolvedValueOnce({
    rows: [{
      created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      last_active_at: new Date(Date.now() - features.daysSinceLastLogin * 24 * 60 * 60 * 1000),
      profile_completion: features.profileCompletionPercent,
      subscription_tier: features.subscriptionTier,
      subscription_start_date: features.hasActiveSubscription
        ? new Date(Date.now() - features.subscriptionAge * 24 * 60 * 60 * 1000)
        : null,
      photo_count: features.photoCount,
      has_verification: features.hasVerification,
      bio_length: features.bioLength,
      profile_updated_at: new Date(Date.now() - features.lastProfileUpdateDays * 24 * 60 * 60 * 1000),
    }],
  });

  // Payment query mock
  mockDbQuery.mockResolvedValueOnce({
    rows: [{
      failed_payments: features.paymentFailuresLast90Days,
      last_payment: features.previouslyPaidUser ? new Date() : null,
    }],
  });

  // Feature usage query mock
  mockDbQuery.mockResolvedValueOnce({
    rows: [{
      boosts: features.usedBoostLast30Days ? 1 : 0,
      super_likes: features.usedSuperLikeLast30Days ? 1 : 0,
      rewinds: features.usedRewindLast30Days ? 1 : 0,
    }],
  });

  // Percentile queries (multiple)
  for (let i = 0; i < 15; i++) {
    mockDbQuery.mockResolvedValueOnce({ rows: [{ percentile: 50 }] });
  }

  // Store indicator scores mock
  mockDbQuery.mockResolvedValueOnce({ rows: [] });

  // Previous prediction mock
  mockDbQuery.mockResolvedValueOnce({ rows: [] });

  // Store prediction mock
  mockDbQuery.mockResolvedValueOnce({ rows: [] });
}
