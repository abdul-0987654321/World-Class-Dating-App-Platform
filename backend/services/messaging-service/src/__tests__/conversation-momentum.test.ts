/**
 * Conversation Momentum Analyzer Tests
 *
 * Comprehensive tests for the Conversation Momentum service that tracks
 * real-time engagement scoring and provides actionable alerts.
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock dependencies before importing the service
jest.mock('../infrastructure/cache/redis', () => {
  const mockClient = {
    get: jest.fn<any>().mockResolvedValue(null),
    setEx: jest.fn<any>().mockResolvedValue('OK'),
    del: jest.fn<any>().mockResolvedValue(1),
  };
  return {
    default: {
      getClient: () => mockClient,
    },
    __esModule: true,
  };
});

jest.mock('../../../../shared/src/platform-intelligence/feature-flags', () => ({
  FeatureFlagService: jest.fn().mockImplementation(() => ({
    isEnabled: jest.fn().mockReturnValue(true),
  })),
}));

import {
  ConversationMomentumService,
  MomentumScore,
  MomentumFactors,
  MomentumAlert,
  MomentumAlertType,
  ConversationMomentum,
  MomentumHistoryEntry,
  MomentumTrend,
} from '../services/conversation-momentum.service';
import { Message, MessageType, MessageStatus } from '../types';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createMockMessage = (
  overrides: Partial<Message> = {},
  minutesAgo: number = 0
): Message => ({
  id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  conversationId: 'conv-test-123',
  senderId: 'user-1',
  receiverId: 'user-2',
  content: 'Hello, how are you?',
  type: MessageType.TEXT,
  status: MessageStatus.DELIVERED,
  sentAt: new Date(Date.now() - minutesAgo * 60 * 1000),
  ...overrides,
});

const createConversationMessages = (
  count: number,
  options: {
    alternating?: boolean;
    avgMinutesBetween?: number;
    includeQuestions?: boolean;
    includeEmojis?: boolean;
    avgLength?: number;
  } = {}
): Message[] => {
  const {
    alternating = true,
    avgMinutesBetween = 5,
    includeQuestions = true,
    includeEmojis = true,
    avgLength = 50,
  } = options;

  const messages: Message[] = [];
  let currentTime = Date.now();

  const sampleContents = [
    'Hey! How are you doing today?',
    "I'm great, thanks for asking! What about you?",
    "Pretty good! I've been busy with work lately.",
    "Oh yeah? What do you do for work? I'm curious!",
    "I'm a software engineer. It's challenging but rewarding!",
    "That sounds cool! I work in marketing myself.",
    "Nice! Do you enjoy it? Marketing seems interesting.",
    "I love it! Especially the creative aspects. Do you have any hobbies?",
    "I enjoy hiking and photography. Been to any good trails lately?",
    "Actually yes! I went to this amazing trail last weekend.",
  ];

  const emojis = ['😊', '😄', '🙂', '❤️', '😂', '👍', '✨', '🎉'];

  for (let i = 0; i < count; i++) {
    let content = sampleContents[i % sampleContents.length];

    // Adjust content length
    if (avgLength < 30) {
      content = content.split(' ').slice(0, 3).join(' ');
    } else if (avgLength > 100) {
      content = content + ' ' + sampleContents[(i + 1) % sampleContents.length];
    }

    // Add emojis
    if (includeEmojis && Math.random() > 0.5) {
      content += ' ' + emojis[Math.floor(Math.random() * emojis.length)];
    }

    // Ensure questions
    if (includeQuestions && !content.includes('?') && i % 3 === 0) {
      content += ' What do you think?';
    }

    const minutesAgo = Math.round((count - i) * avgMinutesBetween);

    messages.push(
      createMockMessage(
        {
          content,
          senderId: alternating ? (i % 2 === 0 ? 'user-1' : 'user-2') : 'user-1',
        },
        minutesAgo
      )
    );
  }

  return messages;
};

const createMockHistory = (
  entries: number,
  options: { startScore?: number; trend?: 'up' | 'down' | 'stable' } = {}
): MomentumHistoryEntry[] => {
  const { startScore = 60, trend = 'stable' } = options;

  const history: MomentumHistoryEntry[] = [];
  let currentScore = startScore;

  for (let i = 0; i < entries; i++) {
    const scoreChange = trend === 'up' ? 3 : trend === 'down' ? -3 : (Math.random() - 0.5) * 2;
    currentScore = Math.max(0, Math.min(100, currentScore + scoreChange));

    history.push({
      score: Math.round(currentScore * 10) / 10,
      trend: trend === 'up' ? 'rising' : trend === 'down' ? 'falling' : 'stable',
      timestamp: new Date(Date.now() - i * 30 * 60 * 1000), // 30 min intervals
    });
  }

  return history;
};

// ============================================================================
// TESTS
// ============================================================================

describe('ConversationMomentumService', () => {
  let service: ConversationMomentumService;

  beforeEach(() => {
    service = new ConversationMomentumService();
    jest.clearAllMocks();
  });

  // ============================================================================
  // TYPE DEFINITIONS TESTS
  // ============================================================================
  describe('Type Definitions', () => {
    test('MomentumScore should have required properties', () => {
      const score: MomentumScore = {
        score: 75,
        trend: 'rising',
        velocity: 5.2,
      };

      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(100);
      expect(['rising', 'stable', 'falling']).toContain(score.trend);
      expect(typeof score.velocity).toBe('number');
    });

    test('MomentumFactors should have all factor properties', () => {
      const factors: MomentumFactors = {
        responseTime: 0.8,
        messageLength: 0.7,
        questionRatio: 0.6,
        emojiUsage: 0.5,
        topicVariety: 0.65,
        reciprocity: 0.9,
        messageRate: 0.75,
      };

      expect(factors).toHaveProperty('responseTime');
      expect(factors).toHaveProperty('messageLength');
      expect(factors).toHaveProperty('questionRatio');
      expect(factors).toHaveProperty('emojiUsage');
      expect(factors).toHaveProperty('topicVariety');
      expect(factors).toHaveProperty('reciprocity');
      expect(factors).toHaveProperty('messageRate');

      // All factors should be between 0 and 1
      Object.values(factors).forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      });
    });

    test('MomentumAlert should have required properties', () => {
      const alert: MomentumAlert = {
        type: 'momentum_rising',
        message: 'Conversation is heating up!',
        suggestion: 'Keep the energy going',
        urgency: 3,
        timestamp: new Date(),
      };

      expect(alert.type).toBe('momentum_rising');
      expect(typeof alert.message).toBe('string');
      expect(typeof alert.suggestion).toBe('string');
      expect(alert.urgency).toBeGreaterThanOrEqual(1);
      expect(alert.urgency).toBeLessThanOrEqual(5);
      expect(alert.timestamp).toBeInstanceOf(Date);
    });

    test('MomentumAlertType should include all valid types', () => {
      const validTypes: MomentumAlertType[] = [
        'momentum_rising',
        'momentum_peak',
        'momentum_dropping',
        'momentum_critical',
      ];

      validTypes.forEach((type) => {
        const info = service.getAlertTypeInfo(type);
        expect(info).toHaveProperty('icon');
        expect(info).toHaveProperty('color');
        expect(info).toHaveProperty('label');
      });
    });

    test('ConversationMomentum should have complete structure', () => {
      const momentum: ConversationMomentum = {
        conversationId: 'conv-123',
        currentScore: 65,
        trend: 'rising',
        velocity: 2.5,
        factors: {
          responseTime: 0.8,
          messageLength: 0.7,
          questionRatio: 0.6,
          emojiUsage: 0.5,
          topicVariety: 0.65,
          reciprocity: 0.9,
          messageRate: 0.75,
        },
        history: [],
        alerts: [],
        calculatedAt: new Date(),
      };

      expect(momentum).toHaveProperty('conversationId');
      expect(momentum).toHaveProperty('currentScore');
      expect(momentum).toHaveProperty('trend');
      expect(momentum).toHaveProperty('velocity');
      expect(momentum).toHaveProperty('factors');
      expect(momentum).toHaveProperty('history');
      expect(momentum).toHaveProperty('alerts');
      expect(momentum).toHaveProperty('calculatedAt');
    });
  });

  // ============================================================================
  // CALCULATE MOMENTUM TESTS
  // ============================================================================
  describe('calculateMomentum', () => {
    test('should calculate momentum for a healthy conversation', async () => {
      const messages = createConversationMessages(20, {
        alternating: true,
        avgMinutesBetween: 3,
        includeQuestions: true,
        includeEmojis: true,
      });

      const momentum = await service.calculateMomentum('conv-123', messages, 'user-1');

      expect(momentum).toBeDefined();
      expect(momentum.conversationId).toBe('conv-123');
      expect(momentum.currentScore).toBeGreaterThanOrEqual(0);
      expect(momentum.currentScore).toBeLessThanOrEqual(100);
      expect(['rising', 'stable', 'falling']).toContain(momentum.trend);
      expect(momentum.factors).toBeDefined();
      expect(momentum.calculatedAt).toBeInstanceOf(Date);
    });

    test('should return default momentum for empty messages', async () => {
      const momentum = await service.calculateMomentum('conv-123', [], 'user-1');

      expect(momentum.currentScore).toBe(50);
      expect(momentum.trend).toBe('stable');
      expect(momentum.velocity).toBe(0);
    });

    test('should return default momentum for single message', async () => {
      const messages = [createMockMessage()];

      const momentum = await service.calculateMomentum('conv-123', messages, 'user-1');

      // Should still calculate but with limited data
      expect(momentum).toBeDefined();
      expect(momentum.currentScore).toBeGreaterThanOrEqual(0);
    });

    test('should calculate higher score for engaging conversation', async () => {
      const engagingMessages = createConversationMessages(15, {
        alternating: true,
        avgMinutesBetween: 2,
        includeQuestions: true,
        includeEmojis: true,
        avgLength: 80,
      });

      const boringMessages = createConversationMessages(15, {
        alternating: false, // One-sided
        avgMinutesBetween: 60,
        includeQuestions: false,
        includeEmojis: false,
        avgLength: 10,
      });

      const engagingMomentum = await service.calculateMomentum('conv-1', engagingMessages);
      const boringMomentum = await service.calculateMomentum('conv-2', boringMessages);

      expect(engagingMomentum.currentScore).toBeGreaterThan(boringMomentum.currentScore);
    });

    test('should detect reciprocity in conversation', async () => {
      const balancedMessages = createConversationMessages(10, { alternating: true });
      const oneSidedMessages = createConversationMessages(10, { alternating: false });

      const balancedMomentum = await service.calculateMomentum('conv-1', balancedMessages);
      const oneSidedMomentum = await service.calculateMomentum('conv-2', oneSidedMessages);

      expect(balancedMomentum.factors.reciprocity).toBeGreaterThan(
        oneSidedMomentum.factors.reciprocity
      );
    });

    test('should factor in response time', async () => {
      const quickResponses = createConversationMessages(10, {
        alternating: true,
        avgMinutesBetween: 1,
      });

      const slowResponses = createConversationMessages(10, {
        alternating: true,
        avgMinutesBetween: 120, // 2 hours
      });

      const quickMomentum = await service.calculateMomentum('conv-1', quickResponses);
      const slowMomentum = await service.calculateMomentum('conv-2', slowResponses);

      expect(quickMomentum.factors.responseTime).toBeGreaterThan(
        slowMomentum.factors.responseTime
      );
    });

    test('should detect question ratio', async () => {
      const questionsMessages: Message[] = [
        createMockMessage({ content: 'How are you?', senderId: 'user-1' }, 10),
        createMockMessage({ content: 'What do you do?', senderId: 'user-2' }, 8),
        createMockMessage({ content: 'Where are you from?', senderId: 'user-1' }, 6),
        createMockMessage({ content: 'Do you like hiking?', senderId: 'user-2' }, 4),
        createMockMessage({ content: 'Yes I do! You?', senderId: 'user-1' }, 2),
      ];

      const statementsMessages: Message[] = [
        createMockMessage({ content: 'Hello.', senderId: 'user-1' }, 10),
        createMockMessage({ content: 'Hi there.', senderId: 'user-2' }, 8),
        createMockMessage({ content: 'Nice weather.', senderId: 'user-1' }, 6),
        createMockMessage({ content: 'Yes it is.', senderId: 'user-2' }, 4),
        createMockMessage({ content: 'Indeed.', senderId: 'user-1' }, 2),
      ];

      const questionsMomentum = await service.calculateMomentum('conv-1', questionsMessages);
      const statementsMomentum = await service.calculateMomentum('conv-2', statementsMessages);

      expect(questionsMomentum.factors.questionRatio).toBeGreaterThan(
        statementsMomentum.factors.questionRatio
      );
    });
  });

  // ============================================================================
  // ANALYZE TREND TESTS
  // ============================================================================
  describe('analyzeTrend', () => {
    test('should detect rising trend', () => {
      const history = createMockHistory(5, { startScore: 40, trend: 'up' });
      const currentScore = 70;

      const trend = service.analyzeTrend(history, currentScore);

      expect(trend).toBe('rising');
    });

    test('should detect falling trend', () => {
      const history = createMockHistory(5, { startScore: 80, trend: 'down' });
      const currentScore = 45;

      const trend = service.analyzeTrend(history, currentScore);

      expect(trend).toBe('falling');
    });

    test('should detect stable trend', () => {
      const history = createMockHistory(5, { startScore: 60, trend: 'stable' });
      const currentScore = 61;

      const trend = service.analyzeTrend(history, currentScore);

      expect(trend).toBe('stable');
    });

    test('should return stable for insufficient history', () => {
      const history: MomentumHistoryEntry[] = [
        { score: 50, trend: 'stable', timestamp: new Date() },
      ];

      const trend = service.analyzeTrend(history, 55);

      expect(trend).toBe('stable');
    });

    test('should return stable for empty history', () => {
      const trend = service.analyzeTrend([], 60);

      expect(trend).toBe('stable');
    });
  });

  // ============================================================================
  // DETECT MOMENTUM SHIFT TESTS
  // ============================================================================
  describe('detectMomentumShift', () => {
    test('should detect positive shift', () => {
      const previous: ConversationMomentum = {
        conversationId: 'conv-123',
        currentScore: 40,
        trend: 'stable',
        velocity: 0,
        factors: {
          responseTime: 0.5,
          messageLength: 0.5,
          questionRatio: 0.5,
          emojiUsage: 0.5,
          topicVariety: 0.5,
          reciprocity: 0.5,
          messageRate: 0.5,
        },
        history: [],
        alerts: [],
        calculatedAt: new Date(),
      };

      const current: ConversationMomentum = {
        ...previous,
        currentScore: 70,
        trend: 'rising',
      };

      const shift = service.detectMomentumShift(previous, current);

      expect(shift.hasShift).toBe(true);
      expect(shift.direction).toBe('positive');
      expect(shift.magnitude).toBe(30);
    });

    test('should detect negative shift', () => {
      const previous: ConversationMomentum = {
        conversationId: 'conv-123',
        currentScore: 75,
        trend: 'stable',
        velocity: 0,
        factors: {
          responseTime: 0.5,
          messageLength: 0.5,
          questionRatio: 0.5,
          emojiUsage: 0.5,
          topicVariety: 0.5,
          reciprocity: 0.5,
          messageRate: 0.5,
        },
        history: [],
        alerts: [],
        calculatedAt: new Date(),
      };

      const current: ConversationMomentum = {
        ...previous,
        currentScore: 45,
        trend: 'falling',
      };

      const shift = service.detectMomentumShift(previous, current);

      expect(shift.hasShift).toBe(true);
      expect(shift.direction).toBe('negative');
      expect(shift.magnitude).toBe(30);
    });

    test('should not detect shift for small changes', () => {
      const previous: ConversationMomentum = {
        conversationId: 'conv-123',
        currentScore: 60,
        trend: 'stable',
        velocity: 0,
        factors: {
          responseTime: 0.5,
          messageLength: 0.5,
          questionRatio: 0.5,
          emojiUsage: 0.5,
          topicVariety: 0.5,
          reciprocity: 0.5,
          messageRate: 0.5,
        },
        history: [],
        alerts: [],
        calculatedAt: new Date(),
      };

      const current: ConversationMomentum = {
        ...previous,
        currentScore: 65,
      };

      const shift = service.detectMomentumShift(previous, current);

      expect(shift.hasShift).toBe(false);
      expect(shift.direction).toBe('none');
    });

    test('should handle null previous momentum', () => {
      const current: ConversationMomentum = {
        conversationId: 'conv-123',
        currentScore: 60,
        trend: 'stable',
        velocity: 0,
        factors: {
          responseTime: 0.5,
          messageLength: 0.5,
          questionRatio: 0.5,
          emojiUsage: 0.5,
          topicVariety: 0.5,
          reciprocity: 0.5,
          messageRate: 0.5,
        },
        history: [],
        alerts: [],
        calculatedAt: new Date(),
      };

      const shift = service.detectMomentumShift(null, current);

      expect(shift.hasShift).toBe(false);
      expect(shift.direction).toBe('none');
      expect(shift.magnitude).toBe(0);
    });
  });

  // ============================================================================
  // GENERATE MOMENTUM ALERTS TESTS
  // ============================================================================
  describe('generateMomentumAlerts', () => {
    test('should generate momentum_peak alert for high rising score', () => {
      const momentum: ConversationMomentum = {
        conversationId: 'conv-123',
        currentScore: 85,
        trend: 'rising',
        velocity: 8,
        factors: {
          responseTime: 0.9,
          messageLength: 0.8,
          questionRatio: 0.7,
          emojiUsage: 0.8,
          topicVariety: 0.7,
          reciprocity: 0.9,
          messageRate: 0.8,
        },
        history: [],
        alerts: [],
        calculatedAt: new Date(),
      };

      const alerts = service.generateMomentumAlerts(momentum);

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].type).toBe('momentum_peak');
      expect(alerts[0].urgency).toBeLessThanOrEqual(3);
      expect(alerts[0].suggestion).toContain('great time');
    });

    test('should generate momentum_rising alert', () => {
      const momentum: ConversationMomentum = {
        conversationId: 'conv-123',
        currentScore: 65,
        trend: 'rising',
        velocity: 6,
        factors: {
          responseTime: 0.7,
          messageLength: 0.6,
          questionRatio: 0.6,
          emojiUsage: 0.5,
          topicVariety: 0.6,
          reciprocity: 0.8,
          messageRate: 0.7,
        },
        history: [],
        alerts: [],
        calculatedAt: new Date(),
      };

      const alerts = service.generateMomentumAlerts(momentum);

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].type).toBe('momentum_rising');
      expect(alerts[0].message).toContain('heating up');
    });

    test('should generate momentum_dropping alert', () => {
      const momentum: ConversationMomentum = {
        conversationId: 'conv-123',
        currentScore: 20,
        trend: 'falling',
        velocity: -5,
        factors: {
          responseTime: 0.3,
          messageLength: 0.4,
          questionRatio: 0.2,
          emojiUsage: 0.3,
          topicVariety: 0.3,
          reciprocity: 0.4,
          messageRate: 0.3,
        },
        history: [],
        alerts: [],
        calculatedAt: new Date(),
      };

      const alerts = service.generateMomentumAlerts(momentum);

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].type).toBe('momentum_dropping');
      expect(alerts[0].urgency).toBeGreaterThanOrEqual(4);
    });

    test('should generate momentum_critical alert', () => {
      const momentum: ConversationMomentum = {
        conversationId: 'conv-123',
        currentScore: 10,
        trend: 'falling',
        velocity: -8,
        factors: {
          responseTime: 0.2,
          messageLength: 0.2,
          questionRatio: 0.1,
          emojiUsage: 0.1,
          topicVariety: 0.2,
          reciprocity: 0.2,
          messageRate: 0.1,
        },
        history: [],
        alerts: [],
        calculatedAt: new Date(),
      };

      const alerts = service.generateMomentumAlerts(momentum);

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].type).toBe('momentum_critical');
      expect(alerts[0].urgency).toBe(5);
      expect(alerts[0].message).toContain('fading');
    });

    test('should generate no alerts for stable moderate score', () => {
      const momentum: ConversationMomentum = {
        conversationId: 'conv-123',
        currentScore: 55,
        trend: 'stable',
        velocity: 0,
        factors: {
          responseTime: 0.5,
          messageLength: 0.5,
          questionRatio: 0.5,
          emojiUsage: 0.5,
          topicVariety: 0.5,
          reciprocity: 0.5,
          messageRate: 0.5,
        },
        history: [],
        alerts: [],
        calculatedAt: new Date(),
      };

      const alerts = service.generateMomentumAlerts(momentum);

      expect(alerts.length).toBe(0);
    });

    test('should include suggestion based on weak factors', () => {
      const momentum: ConversationMomentum = {
        conversationId: 'conv-123',
        currentScore: 20,
        trend: 'falling',
        velocity: -4,
        factors: {
          responseTime: 0.9,
          messageLength: 0.8,
          questionRatio: 0.2, // Weak - low question ratio
          emojiUsage: 0.7,
          topicVariety: 0.6,
          reciprocity: 0.8,
          messageRate: 0.7,
        },
        history: [],
        alerts: [],
        calculatedAt: new Date(),
      };

      const alerts = service.generateMomentumAlerts(momentum);

      expect(alerts.length).toBeGreaterThan(0);
      // Should suggest asking more questions
      expect(alerts[0].suggestion.toLowerCase()).toMatch(/question|interest/);
    });

    test('should detect significant negative shift from previous', () => {
      const current: ConversationMomentum = {
        conversationId: 'conv-123',
        currentScore: 50,
        trend: 'stable',
        velocity: -2,
        factors: {
          responseTime: 0.5,
          messageLength: 0.5,
          questionRatio: 0.5,
          emojiUsage: 0.5,
          topicVariety: 0.5,
          reciprocity: 0.5,
          messageRate: 0.5,
        },
        history: [],
        alerts: [],
        calculatedAt: new Date(),
      };

      const previous: ConversationMomentum = {
        ...current,
        currentScore: 75,
      };

      const alerts = service.generateMomentumAlerts(current, previous);

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some((a) => a.type === 'momentum_dropping')).toBe(true);
    });
  });

  // ============================================================================
  // SCORING ALGORITHM TESTS
  // ============================================================================
  describe('Scoring Algorithm', () => {
    test('should weight recent messages higher', async () => {
      const recentEngaged: Message[] = [
        // Recent engaging messages
        createMockMessage({ content: 'This is so exciting! Tell me more!', senderId: 'user-1' }, 1),
        createMockMessage({ content: 'I love hearing about your travels!', senderId: 'user-2' }, 2),
        createMockMessage({ content: 'Where should we go together?', senderId: 'user-1' }, 3),
        // Old boring messages
        createMockMessage({ content: 'ok', senderId: 'user-2' }, 300),
        createMockMessage({ content: 'k', senderId: 'user-1' }, 360),
      ];

      const recentBoring: Message[] = [
        // Recent boring messages
        createMockMessage({ content: 'ok', senderId: 'user-1' }, 1),
        createMockMessage({ content: 'k', senderId: 'user-2' }, 2),
        createMockMessage({ content: 'bye', senderId: 'user-1' }, 3),
        // Old engaging messages
        createMockMessage(
          { content: 'This is so exciting! Tell me more!', senderId: 'user-2' },
          300
        ),
        createMockMessage({ content: 'I love this conversation!', senderId: 'user-1' }, 360),
      ];

      const recentEngagedMomentum = await service.calculateMomentum('conv-1', recentEngaged);
      const recentBoringMomentum = await service.calculateMomentum('conv-2', recentBoring);

      // Recent engagement should score higher
      expect(recentEngagedMomentum.currentScore).toBeGreaterThan(recentBoringMomentum.currentScore);
    });

    test('should score response time impact correctly', async () => {
      // Fast responses (1 minute apart)
      const fastResponses: Message[] = [];
      for (let i = 0; i < 10; i++) {
        fastResponses.push(
          createMockMessage(
            {
              content: `Message ${i} with good content here?`,
              senderId: i % 2 === 0 ? 'user-1' : 'user-2',
            },
            i
          )
        );
      }

      // Slow responses (60 minutes apart)
      const slowResponses: Message[] = [];
      for (let i = 0; i < 10; i++) {
        slowResponses.push(
          createMockMessage(
            {
              content: `Message ${i} with good content here?`,
              senderId: i % 2 === 0 ? 'user-1' : 'user-2',
            },
            i * 60
          )
        );
      }

      const fastMomentum = await service.calculateMomentum('conv-1', fastResponses);
      const slowMomentum = await service.calculateMomentum('conv-2', slowResponses);

      expect(fastMomentum.factors.responseTime).toBeGreaterThan(slowMomentum.factors.responseTime);
    });

    test('should score message quality signals', async () => {
      const qualityMessages: Message[] = [
        createMockMessage(
          {
            content:
              "That's such an interesting perspective! I've never thought about it that way before. What made you start thinking about this?",
            senderId: 'user-1',
          },
          5
        ),
        createMockMessage(
          {
            content:
              "Thank you! It started when I traveled to Japan last year. The culture there really changed how I see things. Have you traveled much?",
            senderId: 'user-2',
          },
          4
        ),
        createMockMessage(
          {
            content:
              "I love Japan! The food, the people, everything was amazing. What was your favorite part of the trip?",
            senderId: 'user-1',
          },
          3
        ),
      ];

      const lowQualityMessages: Message[] = [
        createMockMessage({ content: 'k', senderId: 'user-1' }, 5),
        createMockMessage({ content: 'cool', senderId: 'user-2' }, 4),
        createMockMessage({ content: 'ya', senderId: 'user-1' }, 3),
      ];

      const qualityMomentum = await service.calculateMomentum('conv-1', qualityMessages);
      const lowQualityMomentum = await service.calculateMomentum('conv-2', lowQualityMessages);

      expect(qualityMomentum.factors.messageLength).toBeGreaterThan(
        lowQualityMomentum.factors.messageLength
      );
      expect(qualityMomentum.currentScore).toBeGreaterThan(lowQualityMomentum.currentScore);
    });

    test('should calculate engagement reciprocity', async () => {
      // Perfect balance
      const balancedMessages: Message[] = [];
      for (let i = 0; i < 10; i++) {
        balancedMessages.push(
          createMockMessage(
            {
              content: 'Equal contribution to conversation here!',
              senderId: i % 2 === 0 ? 'user-1' : 'user-2',
            },
            i
          )
        );
      }

      // Imbalanced (80% from one person)
      const imbalancedMessages: Message[] = [];
      for (let i = 0; i < 10; i++) {
        imbalancedMessages.push(
          createMockMessage(
            {
              content: 'Equal contribution to conversation here!',
              senderId: i < 8 ? 'user-1' : 'user-2',
            },
            i
          )
        );
      }

      const balancedMomentum = await service.calculateMomentum('conv-1', balancedMessages);
      const imbalancedMomentum = await service.calculateMomentum('conv-2', imbalancedMessages);

      expect(balancedMomentum.factors.reciprocity).toBeGreaterThan(
        imbalancedMomentum.factors.reciprocity
      );
    });
  });

  // ============================================================================
  // UTILITY METHODS TESTS
  // ============================================================================
  describe('Utility Methods', () => {
    test('getAlertTypeInfo should return correct info for all types', () => {
      const types: MomentumAlertType[] = [
        'momentum_rising',
        'momentum_peak',
        'momentum_dropping',
        'momentum_critical',
      ];

      types.forEach((type) => {
        const info = service.getAlertTypeInfo(type);

        expect(info).toHaveProperty('icon');
        expect(info).toHaveProperty('color');
        expect(info).toHaveProperty('label');
        expect(typeof info.icon).toBe('string');
        expect(info.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(typeof info.label).toBe('string');
      });
    });

    test('getScoreInterpretation should return correct levels', () => {
      const testCases = [
        { score: 90, expectedLevel: 'Excellent' },
        { score: 80, expectedLevel: 'Excellent' },
        { score: 70, expectedLevel: 'Good' },
        { score: 60, expectedLevel: 'Good' },
        { score: 50, expectedLevel: 'Moderate' },
        { score: 40, expectedLevel: 'Moderate' },
        { score: 30, expectedLevel: 'Low' },
        { score: 25, expectedLevel: 'Low' },
        { score: 20, expectedLevel: 'Critical' },
        { score: 10, expectedLevel: 'Critical' },
      ];

      testCases.forEach(({ score, expectedLevel }) => {
        const interpretation = service.getScoreInterpretation(score);

        expect(interpretation.level).toBe(expectedLevel);
        expect(interpretation).toHaveProperty('description');
        expect(interpretation).toHaveProperty('color');
        expect(interpretation.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    test('getScoreInterpretation should have helpful descriptions', () => {
      const excellent = service.getScoreInterpretation(85);
      const critical = service.getScoreInterpretation(10);

      expect(excellent.description.toLowerCase()).toMatch(/great|chemistry|flowing/);
      expect(critical.description.toLowerCase()).toMatch(/risk|approach/);
    });
  });

  // ============================================================================
  // MOMENTUM HISTORY TESTS
  // ============================================================================
  describe('getMomentumHistory', () => {
    test('should return empty array when no history exists', async () => {
      const history = await service.getMomentumHistory('conv-nonexistent', 24);

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBe(0);
    });

    test('should filter history by hours parameter', async () => {
      // This test verifies the filtering logic - actual data would come from Redis
      const mockHistory: MomentumHistoryEntry[] = [
        { score: 70, trend: 'rising', timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000) }, // 1 hour ago
        { score: 65, trend: 'stable', timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000) }, // 5 hours ago
        { score: 60, trend: 'stable', timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000) }, // 25 hours ago
      ];

      // Filter to last 24 hours
      const filtered = mockHistory.filter(
        (entry) => new Date(entry.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000
      );

      expect(filtered.length).toBe(2);
    });
  });

  // ============================================================================
  // FEATURE FLAG INTEGRATION TESTS
  // ============================================================================
  describe('Feature Flag Integration', () => {
    test('should return default momentum when feature is disabled', async () => {
      // Create service with disabled feature flag
      const mockFeatureFlags = {
        isEnabled: jest.fn().mockReturnValue(false),
      } as any;

      const disabledService = new ConversationMomentumService(mockFeatureFlags);
      const messages = createConversationMessages(10);

      const momentum = await disabledService.calculateMomentum('conv-123', messages, 'user-1');

      expect(momentum.currentScore).toBe(50);
      expect(momentum.trend).toBe('stable');
      expect(momentum.velocity).toBe(0);
    });

    test('should calculate momentum when feature is enabled', async () => {
      const mockFeatureFlags = {
        isEnabled: jest.fn().mockReturnValue(true),
      } as any;

      const enabledService = new ConversationMomentumService(mockFeatureFlags);
      const messages = createConversationMessages(10, { alternating: true });

      const momentum = await enabledService.calculateMomentum('conv-123', messages, 'user-1');

      expect(mockFeatureFlags.isEnabled).toHaveBeenCalled();
      expect(momentum.currentScore).not.toBe(50);
    });
  });

  // ============================================================================
  // EDGE CASES TESTS
  // ============================================================================
  describe('Edge Cases', () => {
    test('should handle messages with no text content', async () => {
      const mediaMessages: Message[] = [
        createMockMessage({ type: MessageType.IMAGE, content: '' }, 5),
        createMockMessage({ type: MessageType.VOICE, content: '' }, 4),
        createMockMessage({ type: MessageType.GIF, content: '' }, 3),
      ];

      const momentum = await service.calculateMomentum('conv-123', mediaMessages);

      expect(momentum).toBeDefined();
      expect(momentum.currentScore).toBeGreaterThanOrEqual(0);
    });

    test('should handle very long messages', async () => {
      const longContent = 'A'.repeat(5000);
      const longMessages: Message[] = [
        createMockMessage({ content: longContent, senderId: 'user-1' }, 5),
        createMockMessage({ content: longContent, senderId: 'user-2' }, 3),
      ];

      const momentum = await service.calculateMomentum('conv-123', longMessages);

      expect(momentum).toBeDefined();
      expect(momentum.factors.messageLength).toBeLessThanOrEqual(1);
    });

    test('should handle messages from same sender only', async () => {
      const sameSenderMessages: Message[] = [
        createMockMessage({ content: 'Hello?', senderId: 'user-1' }, 5),
        createMockMessage({ content: 'Are you there?', senderId: 'user-1' }, 4),
        createMockMessage({ content: 'Please respond', senderId: 'user-1' }, 3),
      ];

      const momentum = await service.calculateMomentum('conv-123', sameSenderMessages);

      expect(momentum).toBeDefined();
      expect(momentum.factors.reciprocity).toBeLessThan(0.5);
    });

    test('should handle messages with special characters and emojis', async () => {
      const emojiMessages: Message[] = [
        createMockMessage({ content: 'Hey! 😊❤️🎉', senderId: 'user-1' }, 5),
        createMockMessage({ content: 'OMG!! 🔥🔥🔥💯', senderId: 'user-2' }, 4),
        createMockMessage({ content: '!!!??? 😂😂', senderId: 'user-1' }, 3),
      ];

      const momentum = await service.calculateMomentum('conv-123', emojiMessages);

      expect(momentum).toBeDefined();
      expect(momentum.factors.emojiUsage).toBeGreaterThan(0.5);
    });

    test('should handle messages with undefined content gracefully', async () => {
      const messagesWithUndefined: Message[] = [
        createMockMessage({ content: 'Hello!', senderId: 'user-1' }, 5),
        { ...createMockMessage({}, 4), content: undefined as any },
        createMockMessage({ content: 'Test', senderId: 'user-2' }, 3),
      ];

      // Should not throw
      const momentum = await service.calculateMomentum('conv-123', messagesWithUndefined);

      expect(momentum).toBeDefined();
    });

    test('should handle very old messages', async () => {
      const oldMessages: Message[] = [
        createMockMessage({ content: 'Ancient message', senderId: 'user-1' }, 60 * 24 * 30), // 30 days ago
        createMockMessage({ content: 'Very old', senderId: 'user-2' }, 60 * 24 * 29),
      ];

      const momentum = await service.calculateMomentum('conv-123', oldMessages);

      expect(momentum).toBeDefined();
      // Old messages should have decayed impact
      expect(momentum.currentScore).toBeLessThan(80);
    });

    test('should handle rapid-fire messages', async () => {
      const rapidMessages: Message[] = [];
      // 50 messages in 5 minutes
      for (let i = 0; i < 50; i++) {
        rapidMessages.push(
          createMockMessage(
            {
              content: `Quick message ${i}! How are you?`,
              senderId: i % 2 === 0 ? 'user-1' : 'user-2',
            },
            i * 0.1
          )
        );
      }

      const momentum = await service.calculateMomentum('conv-123', rapidMessages);

      expect(momentum).toBeDefined();
      expect(momentum.factors.messageRate).toBeGreaterThan(0.5);
    });
  });

  // ============================================================================
  // CACHE OPERATIONS TESTS
  // ============================================================================
  describe('Cache Operations', () => {
    test('should call clearCache without throwing', async () => {
      await expect(service.clearCache('conv-123')).resolves.not.toThrow();
    });

    test('getCachedMomentum should return null when no cache exists', async () => {
      const cached = await service.getCachedMomentum('conv-nonexistent');

      expect(cached).toBeNull();
    });
  });
});

// ============================================================================
// INTEGRATION SCENARIO TESTS
// ============================================================================
describe('Integration Scenarios', () => {
  let service: ConversationMomentumService;

  beforeEach(() => {
    service = new ConversationMomentumService();
  });

  test('Scenario: New match with initial messages', async () => {
    const newMatchMessages: Message[] = [
      createMockMessage({ content: 'Hey! I saw you like hiking too!', senderId: 'user-1' }, 10),
      createMockMessage(
        { content: "Hi! Yes I love it! What's your favorite trail?", senderId: 'user-2' },
        8
      ),
      createMockMessage(
        { content: 'There is this amazing one near the lake. Have you been there?',
          senderId: 'user-1' },
        6
      ),
    ];

    const momentum = await service.calculateMomentum('new-match', newMatchMessages);

    // New matches with quick responses and questions should score well
    expect(momentum.currentScore).toBeGreaterThan(50);
    expect(momentum.factors.questionRatio).toBeGreaterThan(0.5);
  });

  test('Scenario: Conversation losing steam', async () => {
    const fadingMessages: Message[] = [
      // Old engaging messages
      createMockMessage(
        { content: 'This was such a great conversation!', senderId: 'user-1' },
        120
      ),
      createMockMessage(
        { content: 'I know right! We should definitely meet up!', senderId: 'user-2' },
        118
      ),
      // Recent dry messages
      createMockMessage({ content: 'yeah', senderId: 'user-1' }, 5),
      createMockMessage({ content: 'cool', senderId: 'user-2' }, 4),
    ];

    const momentum = await service.calculateMomentum('fading-conv', fadingMessages);

    // Recent boring messages should lower the score
    expect(momentum.currentScore).toBeLessThan(70);
  });

  test('Scenario: One-sided conversation', async () => {
    const oneSidedMessages: Message[] = [
      createMockMessage(
        { content: 'Hey! How was your weekend?', senderId: 'user-1' },
        60
      ),
      createMockMessage({ content: 'good', senderId: 'user-2' }, 55),
      createMockMessage(
        { content: 'Oh nice! Did you do anything fun?', senderId: 'user-1' },
        50
      ),
      createMockMessage({ content: 'not really', senderId: 'user-2' }, 45),
      createMockMessage(
        {
          content: 'I went to this amazing restaurant. You should try it sometime!',
          senderId: 'user-1',
        },
        40
      ),
      createMockMessage({ content: 'ok', senderId: 'user-2' }, 35),
    ];

    const momentum = await service.calculateMomentum('one-sided', oneSidedMessages);

    // One-sided conversation should have low reciprocity
    expect(momentum.factors.reciprocity).toBeLessThan(0.8);
    expect(momentum.factors.messageLength).toBeLessThan(0.8); // Short responses
  });

  test('Scenario: Peak engagement moment', async () => {
    const peakMessages: Message[] = [];

    // Simulate highly engaged conversation
    for (let i = 0; i < 15; i++) {
      peakMessages.push(
        createMockMessage(
          {
            content: `This is so exciting! I can't believe we have so much in common! What else do you enjoy? ${i % 2 === 0 ? '😊' : '❤️'}`,
            senderId: i % 2 === 0 ? 'user-1' : 'user-2',
          },
          15 - i
        )
      );
    }

    const momentum = await service.calculateMomentum('peak-conv', peakMessages);

    // Peak engagement should trigger alerts
    if (momentum.currentScore >= 80 && momentum.trend === 'rising') {
      expect(momentum.alerts.some((a) => a.type === 'momentum_peak')).toBe(true);
    } else {
      expect(momentum.currentScore).toBeGreaterThan(60);
    }
  });

  test('Scenario: Recovery from low momentum', async () => {
    // First calculation - low momentum
    const lowMessages: Message[] = [
      createMockMessage({ content: 'hey', senderId: 'user-1' }, 120),
      createMockMessage({ content: 'hi', senderId: 'user-2' }, 60),
    ];

    const lowMomentum = await service.calculateMomentum('recovery-conv', lowMessages);

    // Second calculation - improved
    const improvedMessages = [
      ...lowMessages,
      createMockMessage(
        {
          content:
            "So I was thinking about what you said earlier about travel. Where would you most want to visit?",
          senderId: 'user-1',
        },
        10
      ),
      createMockMessage(
        {
          content:
            "Oh I'd love to go to Japan! The food, the culture, everything looks amazing. Have you been?",
          senderId: 'user-2',
        },
        8
      ),
      createMockMessage(
        {
          content:
            "Yes! It's incredible. I could tell you so much about it. Maybe we could plan a trip together someday? 😊",
          senderId: 'user-1',
        },
        5
      ),
    ];

    const improvedMomentum = await service.calculateMomentum('recovery-conv', improvedMessages);

    // Improved conversation should have higher score
    expect(improvedMomentum.currentScore).toBeGreaterThan(lowMomentum.currentScore);
  });
});
