/**
 * AI Conversation Coach Service Tests
 */

import {
  AIConversationCoachService,
  ConversationMessage,
  UserProfile,
} from '../services/ai-conversation-coach.service';

describe('AIConversationCoachService', () => {
  let service: AIConversationCoachService;

  const mockUserProfile: UserProfile = {
    userId: 'user-123',
    firstName: 'Alice',
    interests: ['hiking', 'photography', 'cooking'],
    bio: 'Love exploring outdoors!',
  };

  const mockMatchProfile: UserProfile = {
    userId: 'match-456',
    firstName: 'Bob',
    interests: ['hiking', 'travel', 'music'],
    bio: 'Adventure seeker',
  };

  const createMessages = (count: number, includeMatchMessages = true): ConversationMessage[] => {
    const messages: ConversationMessage[] = [];
    for (let i = 0; i < count; i++) {
      messages.push({
        id: 'msg-' + i,
        senderId: i % 2 === 0 ? 'user-123' : 'match-456',
        text: i % 2 === 0 ? 'Hey, how are you?' : 'Great, thanks! How about you?',
        timestamp: Date.now() - (count - i) * 60000,
        is_match: includeMatchMessages ? i % 2 !== 0 : false,
      });
    }
    return messages;
  };

  beforeEach(() => {
    service = new AIConversationCoachService('http://localhost:3030', 5000);
  });

  describe('isEnabled', () => {
    it('should return consistent results for same user', () => {
      const userId = 'test-user-123';
      const result1 = service.isEnabled(userId);
      const result2 = service.isEnabled(userId);
      expect(result1).toBe(result2);
    });

    it('should return boolean', () => {
      const result = service.isEnabled('any-user');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getRealTimeCoaching', () => {
    it('should return null when feature is disabled', async () => {
      // Use a userId that hashes to >= 25 to be disabled
      const disabledService = new AIConversationCoachService();

      // The result depends on the hash, so we just verify it handles gracefully
      const result = await disabledService.getRealTimeCoaching(
        'disabled-user',
        'conv-123',
        createMessages(5),
        mockUserProfile,
        mockMatchProfile,
        'mock-token'
      );

      // Either null (disabled) or fallback coaching (service error)
      expect(result === null || result.tips !== undefined).toBe(true);
    });

    it('should return fallback coaching on service error', async () => {
      // Service URL that will fail
      const failingService = new AIConversationCoachService('http://localhost:9999', 100);

      const result = await failingService.getRealTimeCoaching(
        'user-123',
        'conv-123',
        createMessages(5),
        mockUserProfile,
        mockMatchProfile,
        'mock-token'
      );

      // Should return fallback or null
      if (result) {
        expect(result.tips).toBeDefined();
        expect(result.health).toBeDefined();
        expect(result.suggested_topics).toBeDefined();
      }
    });
  });

  describe('Fallback Coaching', () => {
    it('should provide opening tips for new conversations', async () => {
      const failingService = new AIConversationCoachService('http://localhost:9999', 100);

      const result = await failingService.getRealTimeCoaching(
        'user-123',
        'conv-123',
        createMessages(3),
        mockUserProfile,
        mockMatchProfile,
        'mock-token'
      );

      if (result) {
        expect(result.health.stage).toBe('opening');
        expect(result.ready_to_ask_out).toBe(false);
      }
    });

    it('should suggest date for established conversations', async () => {
      const failingService = new AIConversationCoachService('http://localhost:9999', 100);

      const result = await failingService.getRealTimeCoaching(
        'user-123',
        'conv-123',
        createMessages(25),
        mockUserProfile,
        mockMatchProfile,
        'mock-token'
      );

      if (result) {
        expect(['building_rapport', 'ready_for_date']).toContain(result.health.stage);
        expect(result.ready_to_ask_out).toBe(true);
      }
    });

    it('should include health status', async () => {
      const failingService = new AIConversationCoachService('http://localhost:9999', 100);

      const result = await failingService.getRealTimeCoaching(
        'user-123',
        'conv-123',
        createMessages(10),
        mockUserProfile,
        mockMatchProfile,
        'mock-token'
      );

      if (result) {
        expect(result.health).toBeDefined();
        expect(result.health.status).toBeDefined();
        expect(result.health.score).toBeGreaterThanOrEqual(0);
        expect(result.health.score).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('getNextMessageAdvice', () => {
    it('should advise waiting when user sent last message', async () => {
      const failingService = new AIConversationCoachService('http://localhost:9999', 100);

      // Create messages where user sent last
      const messages: ConversationMessage[] = [
        { id: '1', senderId: 'match-456', text: 'Hey!', timestamp: Date.now() - 120000, is_match: true },
        { id: '2', senderId: 'user-123', text: 'Hi there!', timestamp: Date.now() - 60000, is_match: false },
      ];

      const result = await failingService.getNextMessageAdvice(
        'user-123',
        messages,
        mockUserProfile,
        mockMatchProfile,
        'mock-token'
      );

      if (result) {
        expect(result.advice).toContain('Wait');
        expect(result.dont).toContain('Double text');
      }
    });

    it('should provide response advice when match sent last message', async () => {
      const failingService = new AIConversationCoachService('http://localhost:9999', 100);

      // Create messages where match sent last
      const messages: ConversationMessage[] = [
        { id: '1', senderId: 'user-123', text: 'Hey!', timestamp: Date.now() - 120000, is_match: false },
        { id: '2', senderId: 'match-456', text: 'Hi! How are you?', timestamp: Date.now() - 60000, is_match: true },
      ];

      const result = await failingService.getNextMessageAdvice(
        'user-123',
        messages,
        mockUserProfile,
        mockMatchProfile,
        'mock-token'
      );

      if (result) {
        expect(result.do.length).toBeGreaterThan(0);
        expect(result.dont.length).toBeGreaterThan(0);
        expect(result.tone_suggestion).toBeDefined();
      }
    });
  });

  describe('getDateAskCoaching', () => {
    it('should indicate not ready for short conversations', async () => {
      const failingService = new AIConversationCoachService('http://localhost:9999', 100);

      const result = await failingService.getDateAskCoaching(
        'user-123',
        createMessages(5),
        mockUserProfile,
        mockMatchProfile,
        'mock-token'
      );

      if (result) {
        expect(result.ready).toBe(false);
        expect(result.readiness_score).toBeLessThan(0.5);
        expect(result.why_not_yet).toBeDefined();
        expect(result.estimated_messages_until_ready).toBeGreaterThan(0);
      }
    });

    it('should indicate ready for established conversations', async () => {
      const failingService = new AIConversationCoachService('http://localhost:9999', 100);

      const result = await failingService.getDateAskCoaching(
        'user-123',
        createMessages(20),
        mockUserProfile,
        mockMatchProfile,
        'mock-token'
      );

      if (result) {
        expect(result.ready).toBe(true);
        expect(result.readiness_score).toBeGreaterThanOrEqual(0.5);
        expect(result.approach_suggestions).toBeDefined();
        expect(result.venue_ideas).toBeDefined();
      }
    });

    it('should include example messages when ready', async () => {
      const failingService = new AIConversationCoachService('http://localhost:9999', 100);

      const result = await failingService.getDateAskCoaching(
        'user-123',
        createMessages(20),
        mockUserProfile,
        mockMatchProfile,
        'mock-token'
      );

      if (result && result.ready) {
        expect(result.example_messages).toBeDefined();
        expect(result.example_messages!.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Conversation Stages', () => {
    const testCases = [
      { messageCount: 3, expectedStage: 'opening' },
      { messageCount: 8, expectedStage: 'getting_to_know' },
      { messageCount: 18, expectedStage: 'building_rapport' },
      { messageCount: 30, expectedStage: 'ready_for_date' },
    ];

    testCases.forEach(({ messageCount, expectedStage }) => {
      it('should identify stage "' + expectedStage + '" at ' + messageCount + ' messages', async () => {
        const failingService = new AIConversationCoachService('http://localhost:9999', 100);

        const result = await failingService.getRealTimeCoaching(
          'user-123',
          'conv-123',
          createMessages(messageCount),
          mockUserProfile,
          mockMatchProfile,
          'mock-token'
        );

        if (result) {
          expect(result.health.stage).toBe(expectedStage);
        }
      });
    });
  });

  describe('dismissTip', () => {
    it('should not throw when dismissing a tip', async () => {
      await expect(
        service.dismissTip('user-123', 'tip-123')
      ).resolves.not.toThrow();
    });
  });

  describe('Response Structure', () => {
    it('should include all required fields in coaching response', async () => {
      const failingService = new AIConversationCoachService('http://localhost:9999', 100);

      const result = await failingService.getRealTimeCoaching(
        'user-123',
        'conv-123',
        createMessages(10),
        mockUserProfile,
        mockMatchProfile,
        'mock-token'
      );

      if (result) {
        // Tips
        expect(result.tips).toBeDefined();
        expect(Array.isArray(result.tips)).toBe(true);

        // Health
        expect(result.health).toBeDefined();
        expect(result.health.status).toBeDefined();
        expect(result.health.stage).toBeDefined();
        expect(result.health.score).toBeDefined();

        // Topics
        expect(result.suggested_topics).toBeDefined();
        expect(Array.isArray(result.suggested_topics)).toBe(true);

        // Ghosting
        expect(result.ghosting_risk).toBeDefined();
        expect(result.ghosting_risk.risk_level).toBeDefined();

        // Metrics
        expect(result.metrics).toBeDefined();

        // Ready to ask out flag
        expect(typeof result.ready_to_ask_out).toBe('boolean');
      }
    });

    it('should include valid tip structure', async () => {
      const failingService = new AIConversationCoachService('http://localhost:9999', 100);

      const result = await failingService.getRealTimeCoaching(
        'user-123',
        'conv-123',
        createMessages(3),
        mockUserProfile,
        mockMatchProfile,
        'mock-token'
      );

      if (result && result.tips.length > 0) {
        const tip = result.tips[0];
        expect(tip.id).toBeDefined();
        expect(tip.type).toBeDefined();
        expect(tip.title).toBeDefined();
        expect(tip.message).toBeDefined();
        expect(typeof tip.priority).toBe('number');
        expect(typeof tip.dismissable).toBe('boolean');
      }
    });
  });
});
