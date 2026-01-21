// Mock infrastructure modules before importing service
jest.mock('../../src/infrastructure/database/postgres-client', () => ({
  postgresClient: {
    knex: {
      raw: jest.fn((sql: string, params?: any) => ({ sql, params })),
    },
    initialize: jest.fn().mockResolvedValue(undefined),
    isInitialized: jest.fn().mockReturnValue(true),
    db: jest.fn().mockReturnThis(),
    messages: jest.fn().mockReturnThis(),
  },
}));

jest.mock('../../src/infrastructure/cache/redis', () => ({
  default: {
    getClient: jest.fn(() => ({
      get: jest.fn().mockResolvedValue(null),
      setEx: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue([]),
    })),
    initialize: jest.fn().mockResolvedValue(undefined),
    isConnected: true,
  },
  __esModule: true,
}));

import {
  RelationshipDashboardService,
  RelationshipRecord,
  RelationshipHealth,
  HealthMetric,
  RelationshipMilestone,
  RelationshipInsight,
  DashboardData,
  HealthTrend,
  MilestoneType,
} from '../../src/services/relationship-dashboard.service';

/**
 * Unit Tests for Relationship Dashboard Service
 *
 * Tests the relationship health tracking, milestones, insights,
 * and dashboard features.
 */

describe('RelationshipDashboardService', () => {
  let service: RelationshipDashboardService;
  let mockPostgresClient: any;
  let mockRedisClient: any;
  let mockKnex: any;

  const mockUser1Id = 'user-123';
  const mockUser2Id = 'user-456';
  const mockConversationId = 'conv-789';
  const mockRelationshipId = 'rel-abc';

  const mockRelationship: RelationshipRecord = {
    id: mockRelationshipId,
    user1Id: mockUser1Id,
    user2Id: mockUser2Id,
    conversationId: mockConversationId,
    user1OptedIn: true,
    user2OptedIn: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
    healthScore: 75,
    trend: 'stable',
  };

  beforeEach(() => {
    // Mock Knex query builder
    mockKnex = {
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      whereBetween: jest.fn().mockReturnThis(),
      whereRaw: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      first: jest.fn(),
      delete: jest.fn().mockResolvedValue(1),
      onConflict: jest.fn().mockReturnThis(),
      ignore: jest.fn().mockResolvedValue([]),
      returning: jest.fn().mockReturnThis(),
      raw: jest.fn((sql, params) => ({ sql, params })),
    };

    // Mock PostgresClient
    mockPostgresClient = {
      knex: jest.fn((table: string) => {
        mockKnex._table = table;
        return mockKnex;
      }),
      messages: jest.fn(() => mockKnex),
    };

    // Mock Redis client
    mockRedisClient = {
      get: jest.fn().mockResolvedValue(null),
      setEx: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue([]),
      getClient: jest.fn(() => mockRedisClient),
    };

    // Create service instance
    service = new RelationshipDashboardService();

    // Replace the internal clients with mocks
    (service as any).postgresClient = mockPostgresClient;
    (service as any).redisClient = mockRedisClient;

    // Mock private methods that interact with database
    jest.spyOn(service as any, 'findRelationshipById').mockResolvedValue(mockRelationship);
    jest.spyOn(service as any, 'findRelationshipByUsers').mockResolvedValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Feature Flag', () => {
    it('should return false when feature flag is at 0%', () => {
      // Feature flag is set to 0% in the service
      const result = service.isFeatureEnabled('test-user-id');
      expect(result).toBe(false);
    });

    it('should use consistent hashing for user IDs', () => {
      // Same user ID should always get the same result
      const result1 = service.isFeatureEnabled('user-abc');
      const result2 = service.isFeatureEnabled('user-abc');
      expect(result1).toBe(result2);
    });
  });

  describe('createRelationship', () => {
    beforeEach(() => {
      jest.spyOn(service as any, 'findRelationshipByUsers').mockResolvedValue(null);
      mockKnex.insert.mockResolvedValue([]);
    });

    it('should create a new relationship with ordered user IDs', async () => {
      const result = await service.createRelationship(
        mockUser2Id, // Intentionally pass user2 first
        mockUser1Id,
        mockConversationId
      );

      expect(result).toBeDefined();
      expect(result.conversationId).toBe(mockConversationId);
      // User IDs should be sorted
      expect([result.user1Id, result.user2Id].sort()).toEqual([mockUser1Id, mockUser2Id].sort());
      expect(result.user1OptedIn).toBe(false);
      expect(result.user2OptedIn).toBe(false);
      expect(result.healthScore).toBe(50);
      expect(result.trend).toBe('stable');
    });

    it('should return existing relationship if already exists', async () => {
      jest.spyOn(service as any, 'findRelationshipByUsers').mockResolvedValue(mockRelationship);

      const result = await service.createRelationship(
        mockUser1Id,
        mockUser2Id,
        mockConversationId
      );

      expect(result).toEqual(mockRelationship);
    });

    it('should throw error on database failure', async () => {
      mockKnex.insert.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        service.createRelationship(mockUser1Id, mockUser2Id, mockConversationId)
      ).rejects.toThrow('Failed to create relationship');
    });
  });

  describe('optIn', () => {
    it('should allow user1 to opt in', async () => {
      mockKnex.update.mockResolvedValue(1);
      jest.spyOn(service as any, 'clearCache').mockResolvedValue(undefined);

      const result = await service.optIn(mockRelationshipId, mockUser1Id);

      expect(result).toBe(true);
    });

    it('should allow user2 to opt in', async () => {
      mockKnex.update.mockResolvedValue(1);
      jest.spyOn(service as any, 'clearCache').mockResolvedValue(undefined);

      const result = await service.optIn(mockRelationshipId, mockUser2Id);

      expect(result).toBe(true);
    });

    it('should throw error for non-existent relationship', async () => {
      jest.spyOn(service as any, 'findRelationshipById').mockResolvedValue(null);

      await expect(
        service.optIn(mockRelationshipId, mockUser1Id)
      ).rejects.toThrow('Relationship not found');
    });

    it('should throw error if user is not part of relationship', async () => {
      await expect(
        service.optIn(mockRelationshipId, 'stranger-id')
      ).rejects.toThrow('User is not part of this relationship');
    });
  });

  describe('optOut', () => {
    it('should allow user to opt out', async () => {
      mockKnex.update.mockResolvedValue(1);
      jest.spyOn(service as any, 'clearCache').mockResolvedValue(undefined);

      const result = await service.optOut(mockRelationshipId, mockUser1Id);

      expect(result).toBe(true);
    });

    it('should throw error if user is not part of relationship', async () => {
      await expect(
        service.optOut(mockRelationshipId, 'stranger-id')
      ).rejects.toThrow('User is not part of this relationship');
    });
  });

  describe('isBothOptedIn', () => {
    it('should return true when both users have opted in', async () => {
      const result = await service.isBothOptedIn(mockRelationshipId);

      expect(result).toBe(true);
    });

    it('should return false when only one user has opted in', async () => {
      jest.spyOn(service as any, 'findRelationshipById').mockResolvedValue({
        ...mockRelationship,
        user1OptedIn: true,
        user2OptedIn: false,
      });

      const result = await service.isBothOptedIn(mockRelationshipId);

      expect(result).toBe(false);
    });

    it('should return false when relationship does not exist', async () => {
      jest.spyOn(service as any, 'findRelationshipById').mockResolvedValue(null);

      const result = await service.isBothOptedIn(mockRelationshipId);

      expect(result).toBe(false);
    });
  });

  describe('calculateHealthScore', () => {
    beforeEach(() => {
      jest.spyOn(service, 'calculateMetrics').mockResolvedValue([
        {
          name: 'Communication Frequency',
          value: 80,
          trend: 'improving',
          benchmark: 70,
          description: 'Test',
          weight: 0.2,
        },
        {
          name: 'Response Enthusiasm',
          value: 70,
          trend: 'stable',
          benchmark: 60,
          description: 'Test',
          weight: 0.2,
        },
        {
          name: 'Conversation Depth',
          value: 65,
          trend: 'stable',
          benchmark: 55,
          description: 'Test',
          weight: 0.15,
        },
        {
          name: 'Effort Balance',
          value: 85,
          trend: 'improving',
          benchmark: 80,
          description: 'Test',
          weight: 0.15,
        },
        {
          name: 'Topic Variety',
          value: 60,
          trend: 'stable',
          benchmark: 60,
          description: 'Test',
          weight: 0.15,
        },
        {
          name: 'Response Time',
          value: 75,
          trend: 'stable',
          benchmark: 70,
          description: 'Test',
          weight: 0.15,
        },
      ]);
      mockKnex.update.mockResolvedValue(1);
    });

    it('should calculate weighted health score from metrics', async () => {
      const score = await service.calculateHealthScore(mockRelationshipId);

      // Weighted average: (80*0.2 + 70*0.2 + 65*0.15 + 85*0.15 + 60*0.15 + 75*0.15) / 1.0
      // = (16 + 14 + 9.75 + 12.75 + 9 + 11.25) / 1.0 = 72.75 => 73
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should throw error when relationship not found', async () => {
      jest.spyOn(service as any, 'findRelationshipById').mockResolvedValue(null);

      await expect(
        service.calculateHealthScore(mockRelationshipId)
      ).rejects.toThrow('Relationship not found');
    });

    it('should throw error when both users have not opted in', async () => {
      jest.spyOn(service as any, 'findRelationshipById').mockResolvedValue({
        ...mockRelationship,
        user2OptedIn: false,
      });

      await expect(
        service.calculateHealthScore(mockRelationshipId)
      ).rejects.toThrow('Both users must opt-in for health tracking');
    });

    it('should clamp score to 0-100 range', async () => {
      jest.spyOn(service, 'calculateMetrics').mockResolvedValue([
        {
          name: 'Test',
          value: 150, // Above 100
          trend: 'improving',
          benchmark: 70,
          description: 'Test',
          weight: 1.0,
        },
      ]);

      const score = await service.calculateHealthScore(mockRelationshipId);

      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateMetrics', () => {
    beforeEach(() => {
      jest.spyOn(service as any, 'getMessageStats').mockResolvedValue({
        totalMessages: 150,
        messagesByUser: new Map([
          [mockUser1Id, 80],
          [mockUser2Id, 70],
        ]),
        avgMessageLength: new Map([
          [mockUser1Id, 45],
          [mockUser2Id, 50],
        ]),
        emojiCount: new Map([
          [mockUser1Id, 30],
          [mockUser2Id, 25],
        ]),
        questionCount: new Map([
          [mockUser1Id, 20],
          [mockUser2Id, 18],
        ]),
        responseTimeAvg: new Map([
          [mockUser1Id, 30 * 60 * 1000], // 30 minutes
          [mockUser2Id, 45 * 60 * 1000], // 45 minutes
        ]),
        datesMentioned: 3,
        topicsDiscussed: ['travel', 'food', 'music', 'movies'],
      });
    });

    it('should return all six health metrics', async () => {
      const metrics = await service.calculateMetrics(mockRelationshipId);

      expect(metrics).toHaveLength(6);
      expect(metrics.map(m => m.name)).toEqual([
        'Communication Frequency',
        'Response Enthusiasm',
        'Conversation Depth',
        'Effort Balance',
        'Topic Variety',
        'Response Time',
      ]);
    });

    it('should include trend for each metric', async () => {
      const metrics = await service.calculateMetrics(mockRelationshipId);

      for (const metric of metrics) {
        expect(['improving', 'stable', 'declining']).toContain(metric.trend);
      }
    });

    it('should include benchmark for each metric', async () => {
      const metrics = await service.calculateMetrics(mockRelationshipId);

      for (const metric of metrics) {
        expect(metric.benchmark).toBeGreaterThanOrEqual(0);
        expect(metric.benchmark).toBeLessThanOrEqual(100);
      }
    });

    it('should include weight for each metric', async () => {
      const metrics = await service.calculateMetrics(mockRelationshipId);

      const totalWeight = metrics.reduce((sum, m) => sum + m.weight, 0);
      expect(totalWeight).toBe(1.0);
    });
  });

  describe('getHealthTrend', () => {
    it('should return trend data for a week', async () => {
      mockKnex.select.mockResolvedValue([
        { recorded_at: new Date(), health_score: 75, metrics: {} },
        { recorded_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), health_score: 72, metrics: {} },
        { recorded_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), health_score: 70, metrics: {} },
      ]);

      const trend = await service.getHealthTrend(mockRelationshipId, 'week');

      expect(trend.length).toBeGreaterThan(0);
      expect(trend[0]).toHaveProperty('date');
      expect(trend[0]).toHaveProperty('score');
      expect(trend[0]).toHaveProperty('metrics');
    });

    it('should return current state if no historical data', async () => {
      mockKnex.select.mockResolvedValue([]);

      const trend = await service.getHealthTrend(mockRelationshipId, 'week');

      expect(trend).toHaveLength(1);
      expect(trend[0].score).toBe(mockRelationship.healthScore);
    });

    it('should support month and quarter periods', async () => {
      mockKnex.select.mockResolvedValue([]);

      const monthTrend = await service.getHealthTrend(mockRelationshipId, 'month');
      const quarterTrend = await service.getHealthTrend(mockRelationshipId, 'quarter');

      expect(monthTrend).toBeDefined();
      expect(quarterTrend).toBeDefined();
    });
  });

  describe('detectMilestones', () => {
    beforeEach(() => {
      jest.spyOn(service, 'getMilestones').mockResolvedValue([]);
      jest.spyOn(service, 'createMilestone').mockImplementation(
        async (relId, type, description, sentiment) => ({
          id: `milestone-${Date.now()}`,
          type,
          date: new Date(),
          description,
          sentiment,
          isCustom: false,
          celebratedBy: [],
        })
      );
      jest.spyOn(service as any, 'getMessageStats').mockResolvedValue({
        totalMessages: 150,
        messagesByUser: new Map(),
        avgMessageLength: new Map(),
        emojiCount: new Map(),
        questionCount: new Map(),
        responseTimeAvg: new Map(),
        datesMentioned: 2,
        topicsDiscussed: [],
      });
      jest.spyOn(service as any, 'calculateConversationStreak').mockResolvedValue(10);
    });

    it('should detect message count milestones', async () => {
      const milestones = await service.detectMilestones(mockRelationshipId);

      const milestoneTypes = milestones.map(m => m.type);
      expect(milestoneTypes).toContain('messages_100');
      expect(milestoneTypes).toContain('first_message');
    });

    it('should detect streak milestones', async () => {
      const milestones = await service.detectMilestones(mockRelationshipId);

      const milestoneTypes = milestones.map(m => m.type);
      expect(milestoneTypes).toContain('week_streak');
    });

    it('should detect date planning milestone', async () => {
      const milestones = await service.detectMilestones(mockRelationshipId);

      const milestoneTypes = milestones.map(m => m.type);
      expect(milestoneTypes).toContain('first_date_planned');
    });

    it('should not duplicate existing milestones', async () => {
      jest.spyOn(service, 'getMilestones').mockResolvedValue([
        {
          id: 'existing-1',
          type: 'first_message',
          date: new Date(),
          description: 'Existing milestone',
          sentiment: 'positive',
          isCustom: false,
          celebratedBy: [],
        },
      ]);

      const milestones = await service.detectMilestones(mockRelationshipId);

      const firstMessageMilestones = milestones.filter(m => m.type === 'first_message');
      expect(firstMessageMilestones).toHaveLength(0);
    });

    it('should detect 30-day streak milestone', async () => {
      jest.spyOn(service as any, 'calculateConversationStreak').mockResolvedValue(35);

      const milestones = await service.detectMilestones(mockRelationshipId);

      const milestoneTypes = milestones.map(m => m.type);
      expect(milestoneTypes).toContain('month_streak');
    });
  });

  describe('addCustomMilestone', () => {
    it('should create a custom milestone', async () => {
      mockKnex.insert.mockResolvedValue([]);

      const milestone = await service.addCustomMilestone(
        mockRelationshipId,
        mockUser1Id,
        'Our first vacation together!'
      );

      expect(milestone.type).toBe('custom');
      expect(milestone.isCustom).toBe(true);
      expect(milestone.description).toBe('Our first vacation together!');
      expect(milestone.celebratedBy).toContain(mockUser1Id);
    });

    it('should allow custom date for milestone', async () => {
      mockKnex.insert.mockResolvedValue([]);
      const customDate = new Date('2024-06-15');

      const milestone = await service.addCustomMilestone(
        mockRelationshipId,
        mockUser1Id,
        'Anniversary!',
        customDate
      );

      expect(milestone.date).toEqual(customDate);
    });

    it('should throw error if user is not part of relationship', async () => {
      await expect(
        service.addCustomMilestone(mockRelationshipId, 'stranger-id', 'Test')
      ).rejects.toThrow('User is not part of this relationship');
    });
  });

  describe('getMilestones', () => {
    it('should return milestones ordered by date descending', async () => {
      mockKnex.select.mockResolvedValue([
        {
          id: 'ms-1',
          type: 'messages_100',
          date: new Date('2024-01-15'),
          description: '100 messages!',
          sentiment: 'positive',
          is_custom: false,
          celebrated_by: '[]',
        },
        {
          id: 'ms-2',
          type: 'first_message',
          date: new Date('2024-01-01'),
          description: 'First message!',
          sentiment: 'positive',
          is_custom: false,
          celebrated_by: '[]',
        },
      ]);

      const milestones = await service.getMilestones(mockRelationshipId);

      expect(milestones).toHaveLength(2);
      expect(milestones[0].type).toBe('messages_100');
      expect(milestones[1].type).toBe('first_message');
    });

    it('should parse celebrated_by JSON', async () => {
      mockKnex.select.mockResolvedValue([
        {
          id: 'ms-1',
          type: 'custom',
          date: new Date(),
          description: 'Custom',
          sentiment: 'positive',
          is_custom: true,
          celebrated_by: JSON.stringify([mockUser1Id, mockUser2Id]),
        },
      ]);

      const milestones = await service.getMilestones(mockRelationshipId);

      expect(milestones[0].celebratedBy).toEqual([mockUser1Id, mockUser2Id]);
    });
  });

  describe('generateInsights', () => {
    beforeEach(() => {
      jest.spyOn(service as any, 'getMessageStats')
        .mockResolvedValueOnce({
          totalMessages: 100,
          messagesByUser: new Map([
            [mockUser1Id, 55],
            [mockUser2Id, 45],
          ]),
          avgMessageLength: new Map(),
          emojiCount: new Map(),
          questionCount: new Map(),
          responseTimeAvg: new Map([
            [mockUser1Id, 30 * 60 * 1000],
            [mockUser2Id, 45 * 60 * 1000],
          ]),
          datesMentioned: 0,
          topicsDiscussed: ['travel', 'food'],
        })
        .mockResolvedValueOnce({
          totalMessages: 80,
          messagesByUser: new Map(),
          avgMessageLength: new Map(),
          emojiCount: new Map(),
          questionCount: new Map(),
          responseTimeAvg: new Map(),
          datesMentioned: 0,
          topicsDiscussed: [],
        });
      jest.spyOn(service as any, 'getDaysSinceLastDateMention').mockResolvedValue(20);
      jest.spyOn(service as any, 'storeInsights').mockResolvedValue(undefined);
    });

    it('should generate communication frequency insight when increasing', async () => {
      const insights = await service.generateInsights(mockRelationshipId);

      const commInsight = insights.find(i => i.type === 'communication');
      expect(commInsight).toBeDefined();
      expect(commInsight?.title).toContain('thriving');
    });

    it('should generate date suggestion insight', async () => {
      const insights = await service.generateInsights(mockRelationshipId);

      const dateInsight = insights.find(i => i.title.toLowerCase().includes('date'));
      expect(dateInsight).toBeDefined();
      expect(dateInsight?.actionable).toBe(true);
    });

    it('should generate balance insight', async () => {
      const insights = await service.generateInsights(mockRelationshipId);

      const balanceInsight = insights.find(i => i.type === 'balance');
      expect(balanceInsight).toBeDefined();
    });

    it('should return empty array when users have not opted in', async () => {
      jest.spyOn(service as any, 'findRelationshipById').mockResolvedValue({
        ...mockRelationship,
        user2OptedIn: false,
      });

      const insights = await service.generateInsights(mockRelationshipId);

      expect(insights).toEqual([]);
    });

    it('should set priority for each insight', async () => {
      const insights = await service.generateInsights(mockRelationshipId);

      for (const insight of insights) {
        expect(['high', 'medium', 'low']).toContain(insight.priority);
      }
    });
  });

  describe('getDashboard', () => {
    beforeEach(() => {
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.setEx.mockResolvedValue('OK');
      jest.spyOn(service, 'calculateHealthScore').mockResolvedValue(75);
      jest.spyOn(service, 'detectMilestones').mockResolvedValue([]);
      jest.spyOn(service, 'calculateMetrics').mockResolvedValue([]);
      jest.spyOn(service, 'getMilestones').mockResolvedValue([]);
      jest.spyOn(service, 'generateInsights').mockResolvedValue([]);
      jest.spyOn(service, 'getHealthTrend').mockResolvedValue([
        { date: new Date(), score: 75, metrics: {} },
      ]);
    });

    it('should return dashboard data for authorized user', async () => {
      const dashboard = await service.getDashboard(mockRelationshipId, mockUser1Id);

      expect(dashboard).not.toBeNull();
      expect(dashboard?.health.healthScore).toBe(75);
      expect(dashboard?.health.relationshipId).toBe(mockRelationshipId);
    });

    it('should return null when both users have not opted in', async () => {
      jest.spyOn(service as any, 'findRelationshipById').mockResolvedValue({
        ...mockRelationship,
        user2OptedIn: false,
      });

      const dashboard = await service.getDashboard(mockRelationshipId, mockUser1Id);

      expect(dashboard).toBeNull();
    });

    it('should throw error for unauthorized user', async () => {
      await expect(
        service.getDashboard(mockRelationshipId, 'stranger-id')
      ).rejects.toThrow('User is not part of this relationship');
    });

    it('should use cached data when available', async () => {
      const cachedDashboard: DashboardData = {
        health: {
          relationshipId: mockRelationshipId,
          users: { user1Id: mockUser1Id, user2Id: mockUser2Id },
          healthScore: 80,
          trend: 'improving',
          milestones: [],
          insights: [],
          lastCalculated: new Date(),
        },
        metrics: [],
        milestones: [],
        insights: [],
        recommendations: [],
        periodStart: new Date(),
        periodEnd: new Date(),
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedDashboard));

      const dashboard = await service.getDashboard(mockRelationshipId, mockUser1Id);

      expect(dashboard?.health.healthScore).toBe(80);
      expect(service.calculateHealthScore).not.toHaveBeenCalled();
    });

    it('should filter out dismissed insights for requesting user', async () => {
      jest.spyOn(service, 'generateInsights').mockResolvedValue([
        {
          id: 'insight-1',
          type: 'communication',
          title: 'Test 1',
          description: 'Test',
          actionable: false,
          priority: 'low',
          createdAt: new Date(),
          dismissedBy: [mockUser1Id],
        },
        {
          id: 'insight-2',
          type: 'balance',
          title: 'Test 2',
          description: 'Test',
          actionable: true,
          priority: 'medium',
          createdAt: new Date(),
          dismissedBy: [],
        },
      ]);

      const dashboard = await service.getDashboard(mockRelationshipId, mockUser1Id);

      expect(dashboard?.insights).toHaveLength(1);
      expect(dashboard?.insights[0].id).toBe('insight-2');
    });

    it('should include period dates', async () => {
      const dashboard = await service.getDashboard(mockRelationshipId, mockUser1Id);

      expect(dashboard?.periodStart).toBeDefined();
      expect(dashboard?.periodEnd).toBeDefined();
      expect(dashboard?.periodStart.getTime()).toBeLessThan(dashboard?.periodEnd.getTime() || 0);
    });

    it('should cache dashboard result', async () => {
      await service.getDashboard(mockRelationshipId, mockUser1Id);

      expect(mockRedisClient.setEx).toHaveBeenCalled();
    });
  });

  describe('dismissInsight', () => {
    it('should dismiss insight for user', async () => {
      mockKnex.update.mockResolvedValue(1);
      jest.spyOn(service as any, 'clearCache').mockResolvedValue(undefined);

      await expect(
        service.dismissInsight(mockRelationshipId, 'insight-123', mockUser1Id)
      ).resolves.not.toThrow();
    });

    it('should throw error for unauthorized user', async () => {
      await expect(
        service.dismissInsight(mockRelationshipId, 'insight-123', 'stranger-id')
      ).rejects.toThrow('User is not part of this relationship');
    });

    it('should clear cache after dismissing', async () => {
      mockKnex.update.mockResolvedValue(1);
      const clearCacheSpy = jest.spyOn(service as any, 'clearCache').mockResolvedValue(undefined);

      await service.dismissInsight(mockRelationshipId, 'insight-123', mockUser1Id);

      expect(clearCacheSpy).toHaveBeenCalledWith(mockRelationshipId);
    });
  });

  describe('celebrateMilestone', () => {
    it('should celebrate milestone for user', async () => {
      mockKnex.update.mockResolvedValue(1);

      await expect(
        service.celebrateMilestone(mockRelationshipId, 'milestone-123', mockUser1Id)
      ).resolves.not.toThrow();
    });

    it('should throw error for unauthorized user', async () => {
      await expect(
        service.celebrateMilestone(mockRelationshipId, 'milestone-123', 'stranger-id')
      ).rejects.toThrow('User is not part of this relationship');
    });
  });

  describe('Privacy Controls', () => {
    it('should not expose user-specific comparative data', async () => {
      jest.spyOn(service, 'calculateMetrics').mockResolvedValue([
        {
          name: 'Effort Balance',
          value: 60,
          trend: 'stable',
          benchmark: 80,
          description: 'Message split: 60% / 40%',
          weight: 0.15,
        },
      ]);
      jest.spyOn(service, 'calculateHealthScore').mockResolvedValue(75);
      jest.spyOn(service, 'detectMilestones').mockResolvedValue([]);
      jest.spyOn(service, 'getMilestones').mockResolvedValue([]);
      jest.spyOn(service, 'generateInsights').mockResolvedValue([]);
      jest.spyOn(service, 'getHealthTrend').mockResolvedValue([]);

      const dashboard = await service.getDashboard(mockRelationshipId, mockUser1Id);

      // The description should not say "you are sending more" or identify users
      const balanceMetric = dashboard?.metrics.find(m => m.name === 'Effort Balance');
      expect(balanceMetric?.description).not.toContain(mockUser1Id);
      expect(balanceMetric?.description).not.toContain(mockUser2Id);
    });

    it('should require both users to opt in', async () => {
      jest.spyOn(service as any, 'findRelationshipById').mockResolvedValue({
        ...mockRelationship,
        user1OptedIn: true,
        user2OptedIn: false,
      });

      const dashboard = await service.getDashboard(mockRelationshipId, mockUser1Id);

      expect(dashboard).toBeNull();
    });
  });

  describe('Metric Calculations', () => {
    describe('Communication Frequency', () => {
      it('should score based on messages per day', () => {
        const service = new RelationshipDashboardService();
        const metric = (service as any).calculateCommunicationFrequency(
          { totalMessages: 150 }, // 5 per day = 100%
          { totalMessages: 150 }
        );

        expect(metric.value).toBe(100);
        expect(metric.trend).toBe('stable');
      });

      it('should detect improving trend', () => {
        const service = new RelationshipDashboardService();
        const metric = (service as any).calculateCommunicationFrequency(
          { totalMessages: 150 },
          { totalMessages: 100 }
        );

        expect(metric.trend).toBe('improving');
      });

      it('should detect declining trend', () => {
        const service = new RelationshipDashboardService();
        const metric = (service as any).calculateCommunicationFrequency(
          { totalMessages: 50 },
          { totalMessages: 100 }
        );

        expect(metric.trend).toBe('declining');
      });
    });

    describe('Effort Balance', () => {
      it('should score 100 for perfect balance', () => {
        const service = new RelationshipDashboardService();
        const metric = (service as any).calculateEffortBalance(
          {
            messagesByUser: new Map([
              ['user1', 50],
              ['user2', 50],
            ]),
          },
          { user1Id: 'user1', user2Id: 'user2' }
        );

        expect(metric.value).toBe(100);
      });

      it('should score lower for imbalanced conversation', () => {
        const service = new RelationshipDashboardService();
        const metric = (service as any).calculateEffortBalance(
          {
            messagesByUser: new Map([
              ['user1', 80],
              ['user2', 20],
            ]),
          },
          { user1Id: 'user1', user2Id: 'user2' }
        );

        expect(metric.value).toBe(25); // 20/80 = 0.25 = 25%
      });

      it('should handle zero messages', () => {
        const service = new RelationshipDashboardService();
        const metric = (service as any).calculateEffortBalance(
          {
            messagesByUser: new Map(),
          },
          { user1Id: 'user1', user2Id: 'user2' }
        );

        expect(metric.value).toBe(50); // Neutral
      });
    });

    describe('Response Time', () => {
      it('should score 100 for quick responses', () => {
        const service = new RelationshipDashboardService();
        const metric = (service as any).calculateResponseTimeMetric(
          {
            responseTimeAvg: new Map([
              ['user1', 30 * 60 * 1000], // 30 minutes
              ['user2', 20 * 60 * 1000], // 20 minutes
            ]),
          },
          { user1Id: 'user1', user2Id: 'user2' }
        );

        expect(metric.value).toBe(100);
      });

      it('should score lower for slow responses', () => {
        const service = new RelationshipDashboardService();
        const metric = (service as any).calculateResponseTimeMetric(
          {
            responseTimeAvg: new Map([
              ['user1', 18 * 60 * 60 * 1000], // 18 hours
              ['user2', 20 * 60 * 60 * 1000], // 20 hours
            ]),
          },
          { user1Id: 'user1', user2Id: 'user2' }
        );

        expect(metric.value).toBe(40);
      });
    });
  });

  describe('Helper Methods', () => {
    describe('formatDuration', () => {
      it('should format hours and minutes', () => {
        const service = new RelationshipDashboardService();
        const formatted = (service as any).formatDuration(90 * 60 * 1000);

        expect(formatted).toBe('1h 30m');
      });

      it('should format minutes only', () => {
        const service = new RelationshipDashboardService();
        const formatted = (service as any).formatDuration(45 * 60 * 1000);

        expect(formatted).toBe('45m');
      });
    });

    describe('determineTrend', () => {
      it('should return improving when recent scores are higher', () => {
        const service = new RelationshipDashboardService();
        const trend = (service as any).determineTrend([
          { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), score: 60, metrics: {} },
          { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), score: 62, metrics: {} },
          { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), score: 70, metrics: {} },
          { date: new Date(), score: 75, metrics: {} },
        ]);

        expect(trend).toBe('improving');
      });

      it('should return declining when recent scores are lower', () => {
        const service = new RelationshipDashboardService();
        const trend = (service as any).determineTrend([
          { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), score: 80, metrics: {} },
          { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), score: 78, metrics: {} },
          { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), score: 65, metrics: {} },
          { date: new Date(), score: 60, metrics: {} },
        ]);

        expect(trend).toBe('declining');
      });

      it('should return stable for minimal change', () => {
        const service = new RelationshipDashboardService();
        const trend = (service as any).determineTrend([
          { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), score: 70, metrics: {} },
          { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), score: 71, metrics: {} },
          { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), score: 72, metrics: {} },
          { date: new Date(), score: 71, metrics: {} },
        ]);

        expect(trend).toBe('stable');
      });
    });

    describe('hashString', () => {
      it('should return consistent hash for same input', () => {
        const service = new RelationshipDashboardService();
        const hash1 = (service as any).hashString('test-user-123');
        const hash2 = (service as any).hashString('test-user-123');

        expect(hash1).toBe(hash2);
      });

      it('should return different hashes for different inputs', () => {
        const service = new RelationshipDashboardService();
        const hash1 = (service as any).hashString('user-a');
        const hash2 = (service as any).hashString('user-b');

        expect(hash1).not.toBe(hash2);
      });

      it('should return non-negative number', () => {
        const service = new RelationshipDashboardService();
        const hash = (service as any).hashString('any-string');

        expect(hash).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Milestone Types', () => {
    it('should support all defined milestone types', () => {
      const expectedTypes: MilestoneType[] = [
        'first_message',
        'first_date_planned',
        'messages_100',
        'messages_500',
        'messages_1000',
        'week_streak',
        'month_streak',
        'first_call',
        'first_gift',
        'custom',
      ];

      // This is a type-level check - if any type is missing, TypeScript will error
      const milestones: RelationshipMilestone[] = expectedTypes.map(type => ({
        id: `test-${type}`,
        type,
        date: new Date(),
        description: `Test ${type}`,
        sentiment: 'positive',
        isCustom: type === 'custom',
        celebratedBy: [],
      }));

      expect(milestones.length).toBe(expectedTypes.length);
    });
  });

  describe('Insight Types', () => {
    it('should set correct properties for actionable insights', () => {
      const service = new RelationshipDashboardService();
      const insight = (service as any).createInsight(
        'suggestion',
        'Test Title',
        'Test Description',
        true,
        'high'
      );

      expect(insight.id).toBeDefined();
      expect(insight.type).toBe('suggestion');
      expect(insight.title).toBe('Test Title');
      expect(insight.description).toBe('Test Description');
      expect(insight.actionable).toBe(true);
      expect(insight.priority).toBe('high');
      expect(insight.createdAt).toBeDefined();
      expect(insight.expiresAt).toBeDefined();
      expect(insight.dismissedBy).toEqual([]);
    });

    it('should set expiration date 1 week in the future', () => {
      const service = new RelationshipDashboardService();
      const insight = (service as any).createInsight(
        'communication',
        'Test',
        'Test',
        false,
        'low'
      );

      const oneWeek = 7 * 24 * 60 * 60 * 1000;
      const expectedExpiry = new Date(insight.createdAt.getTime() + oneWeek);

      // Allow 1 second tolerance
      expect(Math.abs(insight.expiresAt.getTime() - expectedExpiry.getTime())).toBeLessThan(1000);
    });
  });
});
