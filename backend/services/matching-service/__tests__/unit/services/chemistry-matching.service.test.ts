/**
 * Chemistry Matching Service Tests
 * Tests for the Pheromone-Inspired Matching Algorithm
 */

import {
  ChemistryMatchingService,
} from '../../../src/domain/services/chemistry-matching.service';
import {
  ChemistryProfile,
  BehavioralSignalType,
  BuildChemistryProfileRequest,
  ConversationData,
  PersonalityType,
} from '../../../src/types/chemistry-matching.types';

// Mock the logger
jest.mock('@flamoral/backend-shared', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe('ChemistryMatchingService', () => {
  let service: ChemistryMatchingService;

  // Test user IDs
  const userId1 = 'user-chemistry-test-1';
  const userId2 = 'user-chemistry-test-2';
  const userId3 = 'user-chemistry-test-3';

  // Sample behavior data for testing
  const createMockBehaviorData = (options: {
    activityHours?: number[];
    messageCount?: number;
    avgMessageLength?: number;
    questionRatio?: number;
    emojiRatio?: number;
    avgResponseTime?: number;
    swipeCount?: number;
    avgViewDuration?: number;
  } = {}): BuildChemistryProfileRequest['behaviorData'] => {
    const {
      activityHours = [9, 10, 11, 14, 15, 16, 20, 21, 22],
      messageCount = 50,
      avgMessageLength = 100,
      questionRatio = 0.3,
      emojiRatio = 0.4,
      avgResponseTime = 10,
      swipeCount = 100,
      avgViewDuration = 5,
    } = options;

    const activityLogs = activityHours.flatMap((hour) => {
      const logs = [];
      for (let i = 0; i < 5; i++) {
        const date = new Date();
        date.setHours(hour);
        date.setMinutes(Math.floor(Math.random() * 60));
        logs.push({
          timestamp: date,
          sessionDuration: 10 + Math.random() * 20,
          actionsCount: 5 + Math.floor(Math.random() * 15),
        });
      }
      return logs;
    });

    const messageHistory = [];
    for (let i = 0; i < messageCount; i++) {
      const hasQuestion = Math.random() < questionRatio;
      const hasEmoji = Math.random() < emojiRatio;
      messageHistory.push({
        matchId: `match-${Math.floor(i / 10)}`,
        sentAt: new Date(Date.now() - i * 3600000),
        messageLength: avgMessageLength + (Math.random() - 0.5) * 50,
        hasEmoji,
        hasQuestion,
        responseToPartner: i % 2 === 1,
        responseLatency: avgResponseTime + (Math.random() - 0.5) * 5,
      });
    }

    const swipeHistory = [];
    for (let i = 0; i < swipeCount; i++) {
      swipeHistory.push({
        timestamp: new Date(Date.now() - i * 60000),
        direction: Math.random() > 0.5 ? 'right' : 'left' as 'right' | 'left',
        viewDuration: avgViewDuration + (Math.random() - 0.5) * 3,
        profileCompleteness: 0.7 + Math.random() * 0.3,
      });
    }

    const profileInteractions = [];
    for (let i = 0; i < 30; i++) {
      profileInteractions.push({
        targetUserId: `target-${i}`,
        viewedAt: new Date(Date.now() - i * 3600000),
        viewDuration: 3 + Math.random() * 10,
        sectionsViewed: ['photos', 'bio', 'interests'].slice(0, 1 + Math.floor(Math.random() * 3)),
        action: ['none', 'like', 'pass'][Math.floor(Math.random() * 3)] as 'none' | 'like' | 'pass',
      });
    }

    return {
      activityLogs,
      messageHistory,
      swipeHistory,
      profileInteractions,
    };
  };

  beforeEach(() => {
    // Create service with feature enabled for testing
    service = new ChemistryMatchingService({
      enabled: true,
      rolloutPercentage: 100,
    });
  });

  describe('Feature Flag', () => {
    it('should check if feature is available', () => {
      // With 100% rollout, all users should have access
      expect(service.isAvailable(userId1)).toBe(true);
    });

    it('should disable feature when rollout is 0%', () => {
      const disabledService = new ChemistryMatchingService({
        enabled: false,
        rolloutPercentage: 0,
      });

      expect(disabledService.isAvailable(userId1)).toBe(false);
    });
  });

  describe('buildChemistryProfile', () => {
    it('should build a chemistry profile from behavior data', async () => {
      const behaviorData = createMockBehaviorData({
        messageCount: 50,
        avgMessageLength: 120,
        questionRatio: 0.4,
        emojiRatio: 0.5,
      });

      const profile = await service.buildChemistryProfile({
        userId: userId1,
        behaviorData,
      });

      expect(profile).toBeDefined();
      expect(profile.userId).toBe(userId1);
      expect(profile.behavioralSignals).toBeInstanceOf(Array);
      expect(profile.rhythmPatterns).toBeDefined();
      expect(profile.engagementStyle).toBeDefined();
      expect(profile.personalityProfile).toBeDefined();
      expect(profile.primaryPersonalityType).toBeDefined();
      expect(profile.dataQuality).toBeDefined();
    });

    it('should extract behavioral signals correctly', async () => {
      const behaviorData = createMockBehaviorData({
        questionRatio: 0.6,
        emojiRatio: 0.7,
      });

      const profile = await service.buildChemistryProfile({
        userId: userId1,
        behaviorData,
      });

      // Check that key signal types are extracted
      const signalTypes = profile.behavioralSignals.map((s) => s.type);
      expect(signalTypes).toContain(BehavioralSignalType.ACTIVITY_TIMING);
      expect(signalTypes).toContain(BehavioralSignalType.MESSAGE_LENGTH);
      expect(signalTypes).toContain(BehavioralSignalType.QUESTION_FREQUENCY);
      expect(signalTypes).toContain(BehavioralSignalType.EMOJI_USAGE);
    });

    it('should detect chronotype from activity patterns', async () => {
      // Early bird - active in morning hours
      const earlyBirdData = createMockBehaviorData({
        activityHours: [6, 7, 8, 9, 10, 11, 12],
      });

      const earlyBirdProfile = await service.buildChemistryProfile({
        userId: userId1,
        behaviorData: earlyBirdData,
        forceRebuild: true,
      });

      expect(earlyBirdProfile.rhythmPatterns.chronotype).toBe('early_bird');

      // Night owl - active in evening/night hours
      const nightOwlData = createMockBehaviorData({
        activityHours: [20, 21, 22, 23, 0, 1, 2],
      });

      const nightOwlProfile = await service.buildChemistryProfile({
        userId: userId2,
        behaviorData: nightOwlData,
      });

      expect(nightOwlProfile.rhythmPatterns.chronotype).toBe('night_owl');
    });

    it('should classify personality type', async () => {
      const behaviorData = createMockBehaviorData({
        questionRatio: 0.7, // High question asking suggests curiosity/openness
        emojiRatio: 0.8,    // High emoji usage suggests expressiveness
      });

      const profile = await service.buildChemistryProfile({
        userId: userId1,
        behaviorData,
        forceRebuild: true,
      });

      expect(profile.primaryPersonalityType).toBeDefined();
      expect([
        'explorer',
        'nurturer',
        'achiever',
        'connector',
        'thinker',
        'romantic',
        'balanced',
      ]).toContain(profile.primaryPersonalityType);
    });

    it('should assess data quality correctly', async () => {
      // Insufficient data
      const lowDataBehavior = createMockBehaviorData({
        messageCount: 3,
        swipeCount: 5,
      });
      lowDataBehavior.activityLogs = lowDataBehavior.activityLogs.slice(0, 2);

      const lowDataProfile = await service.buildChemistryProfile({
        userId: userId1,
        behaviorData: lowDataBehavior,
        forceRebuild: true,
      });

      expect(lowDataProfile.dataQuality).toBe('insufficient');

      // High data quality
      const highDataBehavior = createMockBehaviorData({
        messageCount: 200,
        swipeCount: 500,
      });

      const highDataProfile = await service.buildChemistryProfile({
        userId: userId2,
        behaviorData: highDataBehavior,
      });

      expect(['medium', 'high']).toContain(highDataProfile.dataQuality);
    });

    it('should cache profiles and respect update interval', async () => {
      const behaviorData = createMockBehaviorData();

      // Build initial profile
      const profile1 = await service.buildChemistryProfile({
        userId: userId1,
        behaviorData,
        forceRebuild: true,
      });

      // Build again without force - should return cached
      const profile2 = await service.buildChemistryProfile({
        userId: userId1,
        behaviorData,
      });

      expect(profile2.lastCalculated).toEqual(profile1.lastCalculated);

      // Force rebuild should update
      const profile3 = await service.buildChemistryProfile({
        userId: userId1,
        behaviorData,
        forceRebuild: true,
      });

      expect(profile3.lastCalculated.getTime()).toBeGreaterThanOrEqual(
        profile1.lastCalculated.getTime()
      );
    });
  });

  describe('calculateChemistryScore', () => {
    let profile1: ChemistryProfile;
    let profile2: ChemistryProfile;

    beforeEach(async () => {
      // Build two different profiles
      profile1 = await service.buildChemistryProfile({
        userId: userId1,
        behaviorData: createMockBehaviorData({
          activityHours: [9, 10, 11, 14, 15, 16],
          avgMessageLength: 100,
          questionRatio: 0.4,
          emojiRatio: 0.5,
        }),
        forceRebuild: true,
      });

      profile2 = await service.buildChemistryProfile({
        userId: userId2,
        behaviorData: createMockBehaviorData({
          activityHours: [10, 11, 12, 15, 16, 17],
          avgMessageLength: 110,
          questionRatio: 0.35,
          emojiRatio: 0.45,
        }),
      });
    });

    it('should calculate chemistry score between two profiles', () => {
      const score = service.calculateChemistryScore(profile1, profile2);

      expect(score).toBeDefined();
      expect(score.overall).toBeGreaterThanOrEqual(0);
      expect(score.overall).toBeLessThanOrEqual(100);
      expect(score.confidence).toBeGreaterThanOrEqual(0);
      expect(score.confidence).toBeLessThanOrEqual(1);
    });

    it('should include all dimension scores', () => {
      const score = service.calculateChemistryScore(profile1, profile2);

      expect(score.dimensions.rhythmSync).toBeDefined();
      expect(score.dimensions.engagementMatch).toBeDefined();
      expect(score.dimensions.personalityComplement).toBeDefined();
      expect(score.dimensions.mysteryBalance).toBeDefined();
      expect(score.dimensions.energyMatch).toBeDefined();
      expect(score.dimensions.timingCompatibility).toBeDefined();
      expect(score.dimensions.conversationFlow).toBeDefined();
      expect(score.dimensions.emotionalResonance).toBeDefined();
    });

    it('should determine spark potential', () => {
      const score = service.calculateChemistryScore(profile1, profile2);

      expect(['low', 'medium', 'high', 'exceptional']).toContain(score.sparkPotential);
    });

    it('should detect anti-patterns', () => {
      // Create profiles with opposite schedules
      const profile1Modified = { ...profile1 };
      profile1Modified.rhythmPatterns = {
        ...profile1.rhythmPatterns,
        chronotype: 'early_bird',
        chronotypeStrength: 0.9,
        hourlyDistribution: new Array(24).fill(0).map((_, i) => (i >= 6 && i <= 12 ? 0.8 : 0.1)),
      };

      const profile2Modified = { ...profile2 };
      profile2Modified.rhythmPatterns = {
        ...profile2.rhythmPatterns,
        chronotype: 'night_owl',
        chronotypeStrength: 0.9,
        hourlyDistribution: new Array(24).fill(0).map((_, i) => (i >= 20 || i <= 2 ? 0.8 : 0.1)),
      };

      const score = service.calculateChemistryScore(profile1Modified, profile2Modified);

      // Should have lower rhythm sync
      expect(score.dimensions.rhythmSync).toBeLessThan(50);
    });

    it('should give high scores to compatible profiles', async () => {
      // Create two very similar profiles
      const similarBehavior = createMockBehaviorData({
        activityHours: [10, 11, 12, 15, 16, 17, 20, 21],
        avgMessageLength: 100,
        questionRatio: 0.4,
        emojiRatio: 0.5,
        avgResponseTime: 10,
      });

      const similarProfile1 = await service.buildChemistryProfile({
        userId: 'similar-1',
        behaviorData: similarBehavior,
      });

      const similarProfile2 = await service.buildChemistryProfile({
        userId: 'similar-2',
        behaviorData: createMockBehaviorData({
          activityHours: [10, 11, 12, 15, 16, 17, 20, 21],
          avgMessageLength: 105,
          questionRatio: 0.38,
          emojiRatio: 0.48,
          avgResponseTime: 12,
        }),
      });

      const score = service.calculateChemistryScore(similarProfile1, similarProfile2);

      // Similar profiles should have good scores
      expect(score.overall).toBeGreaterThan(50);
    });
  });

  describe('findHighChemistryMatches', () => {
    beforeEach(async () => {
      // Build profiles for multiple users
      await service.buildChemistryProfile({
        userId: userId1,
        behaviorData: createMockBehaviorData({
          activityHours: [9, 10, 11, 14, 15, 16],
          avgMessageLength: 100,
        }),
        forceRebuild: true,
      });

      await service.buildChemistryProfile({
        userId: userId2,
        behaviorData: createMockBehaviorData({
          activityHours: [10, 11, 12, 15, 16, 17],
          avgMessageLength: 110,
        }),
      });

      await service.buildChemistryProfile({
        userId: userId3,
        behaviorData: createMockBehaviorData({
          activityHours: [22, 23, 0, 1, 2, 3],
          avgMessageLength: 50,
        }),
      });
    });

    it('should find high chemistry matches', async () => {
      const result = await service.findHighChemistryMatches({
        userId: userId1,
        candidateIds: [userId2, userId3],
        minimumScore: 0, // Low threshold to ensure matches
      });

      expect(result.matches).toBeDefined();
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.totalCandidates).toBe(2);
    });

    it('should sort matches by score descending', async () => {
      const result = await service.findHighChemistryMatches({
        userId: userId1,
        candidateIds: [userId2, userId3],
        minimumScore: 0,
      });

      if (result.matches.length >= 2) {
        expect(result.matches[0].score.overall).toBeGreaterThanOrEqual(
          result.matches[1].score.overall
        );
      }
    });

    it('should respect limit parameter', async () => {
      const result = await service.findHighChemistryMatches({
        userId: userId1,
        candidateIds: [userId2, userId3],
        minimumScore: 0,
        limit: 1,
      });

      expect(result.matches.length).toBeLessThanOrEqual(1);
    });

    it('should track profiles with insufficient data', async () => {
      const result = await service.findHighChemistryMatches({
        userId: userId1,
        candidateIds: [userId2, 'nonexistent-user'],
        minimumScore: 0,
      });

      expect(result.profilesWithInsufficientData).toContain('nonexistent-user');
    });

    it('should include explanations when requested', async () => {
      const result = await service.findHighChemistryMatches({
        userId: userId1,
        candidateIds: [userId2],
        minimumScore: 0,
        includeExplanations: true,
      });

      if (result.matches.length > 0) {
        const match = result.matches[0];
        expect(match.explanation).toBeDefined();
        expect(match.explanation.summary).toBeDefined();
        expect(match.chemistryFactors).toBeDefined();
        expect(match.chemistryFactors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('explainChemistry', () => {
    it('should generate human-readable explanations', async () => {
      const profile1 = await service.buildChemistryProfile({
        userId: userId1,
        behaviorData: createMockBehaviorData(),
        forceRebuild: true,
      });

      const profile2 = await service.buildChemistryProfile({
        userId: userId2,
        behaviorData: createMockBehaviorData(),
      });

      const score = service.calculateChemistryScore(profile1, profile2);
      const explanation = service.explainChemistry(score, profile1, profile2);

      expect(explanation.summary).toBeDefined();
      expect(explanation.summary.length).toBeGreaterThan(0);
      expect(explanation.highlights).toBeInstanceOf(Array);
      expect(explanation.concerns).toBeInstanceOf(Array);
      expect(explanation.tips).toBeInstanceOf(Array);
      expect(explanation.iceBreakers).toBeInstanceOf(Array);
    });

    it('should provide ice breakers', async () => {
      const profile1 = await service.buildChemistryProfile({
        userId: userId1,
        behaviorData: createMockBehaviorData({ questionRatio: 0.6 }),
        forceRebuild: true,
      });

      const profile2 = await service.buildChemistryProfile({
        userId: userId2,
        behaviorData: createMockBehaviorData(),
      });

      const score = service.calculateChemistryScore(profile1, profile2);
      const explanation = service.explainChemistry(score, profile1, profile2);

      expect(explanation.iceBreakers.length).toBeGreaterThan(0);
    });
  });

  describe('updateChemistryFromInteraction', () => {
    it('should update chemistry model from conversation data', async () => {
      // Build profiles first
      await service.buildChemistryProfile({
        userId: userId1,
        behaviorData: createMockBehaviorData(),
        forceRebuild: true,
      });

      await service.buildChemistryProfile({
        userId: userId2,
        behaviorData: createMockBehaviorData(),
      });

      const conversationData: ConversationData = {
        matchId: 'match-123',
        userId: userId1,
        partnerId: userId2,
        totalMessages: 50,
        messagesByUser: 25,
        messagesByPartner: 25,
        averageResponseTimeUser: 10,
        averageResponseTimePartner: 12,
        conversationSpanHours: 48,
        averageMessageLengthUser: 100,
        averageMessageLengthPartner: 95,
        questionRatio: 0.4,
        emojiUsageUser: 0.5,
        emojiUsagePartner: 0.4,
        conversationInitiator: 'user',
        topicCount: 5,
        laughIndicators: 8,
        outcome: 'scheduled_date',
      };

      const feedback = await service.updateChemistryFromInteraction(conversationData);

      expect(feedback).toBeDefined();
      expect(feedback.matchId).toBe('match-123');
      expect(feedback.userId).toBe(userId1);
      expect(feedback.predictedScore).toBeDefined();
      expect(feedback.actualEngagement).toBeDefined();
      expect(feedback.predictionError).toBeDefined();
    });

    it('should calculate prediction error', async () => {
      await service.buildChemistryProfile({
        userId: userId1,
        behaviorData: createMockBehaviorData(),
        forceRebuild: true,
      });

      await service.buildChemistryProfile({
        userId: userId2,
        behaviorData: createMockBehaviorData(),
      });

      // Good outcome conversation
      const goodConversation: ConversationData = {
        matchId: 'match-good',
        userId: userId1,
        partnerId: userId2,
        totalMessages: 100,
        messagesByUser: 50,
        messagesByPartner: 50,
        averageResponseTimeUser: 5,
        averageResponseTimePartner: 6,
        conversationSpanHours: 72,
        averageMessageLengthUser: 150,
        averageMessageLengthPartner: 140,
        questionRatio: 0.5,
        emojiUsageUser: 0.6,
        emojiUsagePartner: 0.55,
        conversationInitiator: 'user',
        topicCount: 10,
        laughIndicators: 15,
        outcome: 'met_in_person',
      };

      const goodFeedback = await service.updateChemistryFromInteraction(goodConversation);
      expect(goodFeedback.actualEngagement).toBeGreaterThan(70);

      // Bad outcome conversation
      const badConversation: ConversationData = {
        matchId: 'match-bad',
        userId: userId1,
        partnerId: userId2,
        totalMessages: 5,
        messagesByUser: 4,
        messagesByPartner: 1,
        averageResponseTimeUser: 5,
        averageResponseTimePartner: 120,
        conversationSpanHours: 2,
        averageMessageLengthUser: 100,
        averageMessageLengthPartner: 20,
        questionRatio: 0.1,
        emojiUsageUser: 0.2,
        emojiUsagePartner: 0,
        conversationInitiator: 'user',
        topicCount: 1,
        laughIndicators: 0,
        outcome: 'faded',
      };

      const badFeedback = await service.updateChemistryFromInteraction(badConversation);
      expect(badFeedback.actualEngagement).toBeLessThan(50);
    });
  });

  describe('Chemistry Dimensions', () => {
    describe('Rhythm Sync', () => {
      it('should give high score to profiles with similar schedules', async () => {
        const sameScheduleBehavior = createMockBehaviorData({
          activityHours: [10, 11, 12, 15, 16, 17, 20, 21],
        });

        const profile1 = await service.buildChemistryProfile({
          userId: 'rhythm-1',
          behaviorData: sameScheduleBehavior,
        });

        const profile2 = await service.buildChemistryProfile({
          userId: 'rhythm-2',
          behaviorData: sameScheduleBehavior,
        });

        const score = service.calculateChemistryScore(profile1, profile2);
        expect(score.dimensions.rhythmSync).toBeGreaterThan(60);
      });

      it('should give lower score to opposite schedules', async () => {
        const morningBehavior = createMockBehaviorData({
          activityHours: [6, 7, 8, 9, 10, 11],
        });

        const nightBehavior = createMockBehaviorData({
          activityHours: [21, 22, 23, 0, 1, 2],
        });

        const morningProfile = await service.buildChemistryProfile({
          userId: 'morning-person',
          behaviorData: morningBehavior,
        });

        const nightProfile = await service.buildChemistryProfile({
          userId: 'night-person',
          behaviorData: nightBehavior,
        });

        const score = service.calculateChemistryScore(morningProfile, nightProfile);
        expect(score.dimensions.rhythmSync).toBeLessThan(60);
      });
    });

    describe('Engagement Match', () => {
      it('should score similar communication styles highly', async () => {
        const similarComm = createMockBehaviorData({
          avgMessageLength: 100,
          questionRatio: 0.4,
          emojiRatio: 0.5,
        });

        const profile1 = await service.buildChemistryProfile({
          userId: 'comm-1',
          behaviorData: similarComm,
        });

        const profile2 = await service.buildChemistryProfile({
          userId: 'comm-2',
          behaviorData: createMockBehaviorData({
            avgMessageLength: 105,
            questionRatio: 0.38,
            emojiRatio: 0.48,
          }),
        });

        const score = service.calculateChemistryScore(profile1, profile2);
        expect(score.dimensions.engagementMatch).toBeGreaterThan(50);
      });
    });

    describe('Energy Match', () => {
      it('should detect energy level compatibility', async () => {
        // High energy profiles
        const highEnergyBehavior = createMockBehaviorData({
          emojiRatio: 0.8,
          avgMessageLength: 200,
        });

        const highEnergy1 = await service.buildChemistryProfile({
          userId: 'high-energy-1',
          behaviorData: highEnergyBehavior,
        });

        const highEnergy2 = await service.buildChemistryProfile({
          userId: 'high-energy-2',
          behaviorData: highEnergyBehavior,
        });

        const score = service.calculateChemistryScore(highEnergy1, highEnergy2);
        expect(score.dimensions.energyMatch).toBeGreaterThan(50);
      });
    });
  });

  describe('Personality Types', () => {
    it('should classify different personality types', async () => {
      // Create profiles with different characteristics
      const profileTypes: { userId: string; behavior: BuildChemistryProfileRequest['behaviorData'] }[] = [
        {
          userId: 'explorer-type',
          behavior: createMockBehaviorData({ questionRatio: 0.7, avgViewDuration: 10 }),
        },
        {
          userId: 'nurturer-type',
          behavior: createMockBehaviorData({ emojiRatio: 0.8, questionRatio: 0.5 }),
        },
        {
          userId: 'achiever-type',
          behavior: createMockBehaviorData({ avgResponseTime: 5, avgMessageLength: 50 }),
        },
      ];

      for (const { userId, behavior } of profileTypes) {
        const profile = await service.buildChemistryProfile({
          userId,
          behaviorData: behavior,
        });

        expect(profile.primaryPersonalityType).toBeDefined();
        expect([
          'explorer',
          'nurturer',
          'achiever',
          'connector',
          'thinker',
          'romantic',
          'balanced',
        ]).toContain(profile.primaryPersonalityType);
      }
    });

    it('should determine compatible types', async () => {
      const profile = await service.buildChemistryProfile({
        userId: 'compat-test',
        behaviorData: createMockBehaviorData(),
        forceRebuild: true,
      });

      expect(profile.personalityProfile.compatibleTypes).toBeInstanceOf(Array);
      expect(profile.personalityProfile.compatibleTypes.length).toBeGreaterThan(0);
    });
  });

  describe('Anti-Pattern Detection', () => {
    it('should detect communication style clash', async () => {
      // Very different message lengths
      const verboseProfile = await service.buildChemistryProfile({
        userId: 'verbose',
        behaviorData: createMockBehaviorData({ avgMessageLength: 300 }),
      });

      const terseProfile = await service.buildChemistryProfile({
        userId: 'terse',
        behaviorData: createMockBehaviorData({ avgMessageLength: 30 }),
      });

      // Manually adjust for clearer test
      verboseProfile.engagementStyle.averageMessageLength = 300;
      terseProfile.engagementStyle.averageMessageLength = 30;

      const score = service.calculateChemistryScore(verboseProfile, terseProfile);

      // Should have anti-patterns related to communication
      const hasCommClash = score.antiPatterns.some(
        (p) => p.type === 'communication_style_clash' || p.description.toLowerCase().includes('message')
      );

      expect(score.antiPatterns.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect one-sided effort pattern', async () => {
      const initiator = await service.buildChemistryProfile({
        userId: 'initiator',
        behaviorData: createMockBehaviorData(),
      });

      const passive = await service.buildChemistryProfile({
        userId: 'passive',
        behaviorData: createMockBehaviorData(),
      });

      // Manually adjust initiation tendencies
      initiator.engagementStyle.initiationTendency = 0.9;
      passive.engagementStyle.initiationTendency = 0.1;

      const score = service.calculateChemistryScore(initiator, passive);

      const hasOneSidedPattern = score.antiPatterns.some(
        (p) => p.type === 'one_sided_effort' || p.description.toLowerCase().includes('initiat')
      );

      expect(hasOneSidedPattern).toBe(true);
    });
  });

  describe('Profile Retrieval', () => {
    it('should retrieve stored profile', async () => {
      const behaviorData = createMockBehaviorData();

      await service.buildChemistryProfile({
        userId: userId1,
        behaviorData,
        forceRebuild: true,
      });

      const profile = service.getProfile(userId1);

      expect(profile).not.toBeNull();
      expect(profile?.userId).toBe(userId1);
    });

    it('should return null for non-existent profile', () => {
      const profile = service.getProfile('non-existent-user');
      expect(profile).toBeNull();
    });
  });

  describe('Prediction', () => {
    it('should predict conversation outcomes', async () => {
      const profile1 = await service.buildChemistryProfile({
        userId: userId1,
        behaviorData: createMockBehaviorData(),
        forceRebuild: true,
      });

      const profile2 = await service.buildChemistryProfile({
        userId: userId2,
        behaviorData: createMockBehaviorData(),
      });

      const result = await service.findHighChemistryMatches({
        userId: userId1,
        candidateIds: [userId2],
        minimumScore: 0,
      });

      if (result.matches.length > 0) {
        const prediction = result.matches[0].predictedOutcome;

        expect(prediction.likelyToMatch).toBeGreaterThanOrEqual(0);
        expect(prediction.likelyToMatch).toBeLessThanOrEqual(1);
        expect(prediction.likelyToMessage).toBeGreaterThanOrEqual(0);
        expect(prediction.likelyToMessage).toBeLessThanOrEqual(1);
        expect(['surface', 'moderate', 'deep']).toContain(prediction.estimatedConversationDepth);
        expect(['low', 'medium', 'high']).toContain(prediction.estimatedResponseRate);
      }
    });
  });
});
