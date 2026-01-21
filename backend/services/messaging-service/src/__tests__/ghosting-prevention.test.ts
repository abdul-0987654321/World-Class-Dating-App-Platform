/**
 * Ghosting Prevention Service Tests
 * Comprehensive tests for proactive re-engagement system
 */

import {
  GhostingPreventionService,
  GhostingSignalType,
  RiskLevel,
  ConversationData,
  ConversationMessage,
  UserProfile,
  GhostingRiskAssessment,
  ReengagementSuggestion,
  UserNotificationPreferences,
  PreventionAction,
} from '../services/ghosting-prevention.service';

describe('GhostingPreventionService', () => {
  let service: GhostingPreventionService;

  beforeEach(() => {
    service = new GhostingPreventionService();
  });

  // ==========================================================================
  // Feature Flag Tests
  // ==========================================================================
  describe('isEnabled', () => {
    it('should return consistent results for the same user', () => {
      const userId = 'test-user-123';
      const result1 = service.isEnabled(userId);
      const result2 = service.isEnabled(userId);
      expect(result1).toBe(result2);
    });

    it('should return false for all users at 0% rollout', () => {
      // At 0% rollout, all users should be disabled
      const results: boolean[] = [];
      for (let i = 0; i < 100; i++) {
        results.push(service.isEnabled(`user-${i}`));
      }
      // All should be false at 0% rollout
      expect(results.every((r) => r === false)).toBe(true);
    });
  });

  // ==========================================================================
  // Risk Assessment Tests
  // ==========================================================================
  describe('assessGhostingRisk', () => {
    const createConversation = (
      messages: Partial<ConversationMessage>[],
      daysSinceLastMessage = 0
    ): ConversationData => {
      const now = new Date();
      const lastMessageAt = new Date(now);
      lastMessageAt.setDate(lastMessageAt.getDate() - daysSinceLastMessage);

      // Calculate the base timestamp for the last message
      const lastMsgTime = lastMessageAt.getTime();
      const msgCount = messages.length;

      return {
        conversationId: 'conv-123',
        userId: 'user-1',
        matchId: 'user-2',
        messages: messages.map((m, i) => ({
          id: `msg-${i}`,
          senderId: m.senderId || 'user-1',
          content: m.content || 'Hello',
          // Oldest message first, newest last - last message is at lastMessageAt
          timestamp: m.timestamp || new Date(lastMsgTime - (msgCount - 1 - i) * 60000),
          messageLength: m.messageLength || (m.content?.length || 5),
          readAt: m.readAt,
        })),
        createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        lastMessageAt,
      };
    };

    it('should return low risk for active conversation', async () => {
      const conversation = createConversation([
        { senderId: 'user-2', content: 'Hey, how are you doing?' },
        { senderId: 'user-1', content: "I'm great! How about you?" },
        { senderId: 'user-2', content: 'Doing well, thanks for asking!' },
      ]);

      const assessment = await service.assessGhostingRisk(conversation, 'user-1');

      expect(assessment.riskLevel).toBe('low');
      expect(assessment.riskScore).toBeLessThan(25);
      expect(assessment.daysSinceLastMessage).toBe(0);
    });

    it('should return medium risk for stale conversation (2+ days)', async () => {
      const conversation = createConversation(
        [
          { senderId: 'user-1', content: 'Hey, how are you?' },
          { senderId: 'user-2', content: 'Good!' },
        ],
        3 // 3 days since last message
      );

      const assessment = await service.assessGhostingRisk(conversation, 'user-1');

      expect(['medium', 'high', 'critical']).toContain(assessment.riskLevel);
      expect(assessment.daysSinceLastMessage).toBe(3);
    });

    it('should return high risk for conversation with multiple warning signals', async () => {
      const now = new Date();
      const messages: Partial<ConversationMessage>[] = [];

      // Create a pattern of declining engagement
      for (let i = 0; i < 10; i++) {
        messages.push({
          senderId: i % 2 === 0 ? 'user-1' : 'user-2',
          content:
            i % 2 === 0
              ? 'Hey, what do you think about going out this weekend?'
              : i < 5
                ? 'Sure, that sounds fun!'
                : 'ok',
          timestamp: new Date(now.getTime() - (10 - i) * 3600000),
          messageLength:
            i % 2 === 0 ? 45 : i < 5 ? 25 : 2, // Declining message length
        });
      }

      const conversation = createConversation(messages, 5);

      const assessment = await service.assessGhostingRisk(conversation, 'user-1');

      expect(['high', 'critical']).toContain(assessment.riskLevel);
      expect(assessment.signals.length).toBeGreaterThan(0);
    });

    it('should include correct lastActiveUser', async () => {
      const conversationUserLast = createConversation([
        { senderId: 'user-2', content: 'Hello!' },
        { senderId: 'user-1', content: 'Hi there!' },
      ]);

      const assessmentUserLast = await service.assessGhostingRisk(
        conversationUserLast,
        'user-1'
      );
      expect(assessmentUserLast.lastActiveUser).toBe('self');

      const conversationMatchLast = createConversation([
        { senderId: 'user-1', content: 'Hello!' },
        { senderId: 'user-2', content: 'Hi there!' },
      ]);

      const assessmentMatchLast = await service.assessGhostingRisk(
        conversationMatchLast,
        'user-1'
      );
      expect(assessmentMatchLast.lastActiveUser).toBe('match');
    });

    it('should include assessedAt timestamp', async () => {
      const conversation = createConversation([
        { senderId: 'user-1', content: 'Hello' },
      ]);

      const before = new Date();
      const assessment = await service.assessGhostingRisk(conversation, 'user-1');
      const after = new Date();

      expect(assessment.assessedAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      );
      expect(assessment.assessedAt.getTime()).toBeLessThanOrEqual(
        after.getTime()
      );
    });
  });

  // ==========================================================================
  // Signal Detection Tests
  // ==========================================================================
  describe('detectRiskSignals', () => {
    const createMessages = (
      configs: Array<{
        senderId: string;
        content: string;
        timestamp?: Date;
        readAt?: Date;
      }>
    ): ConversationMessage[] => {
      const now = new Date();
      return configs.map((c, i) => ({
        id: `msg-${i}`,
        senderId: c.senderId,
        content: c.content,
        timestamp: c.timestamp || new Date(now.getTime() - (configs.length - i) * 60000),
        messageLength: c.content.length,
        readAt: c.readAt,
      }));
    };

    it('should detect time since last message signal', () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const messages = createMessages([
        { senderId: 'user-1', content: 'Hello', timestamp: threeDaysAgo },
      ]);

      const signals = service.detectRiskSignals(messages, 'user-1');

      const timeSignal = signals.find(
        (s) => s.type === GhostingSignalType.TIME_SINCE_LAST_MESSAGE
      );
      expect(timeSignal).toBeDefined();
      expect(timeSignal?.value).toBeGreaterThanOrEqual(2);
    });

    it('should detect message length decline', () => {
      const now = new Date();
      const messages: ConversationMessage[] = [];

      // First half: longer messages from match
      for (let i = 0; i < 5; i++) {
        messages.push({
          id: `msg-${i * 2}`,
          senderId: 'user-1',
          content: 'Hey, how was your day?',
          timestamp: new Date(now.getTime() - (10 - i * 2) * 3600000),
          messageLength: 22,
        });
        messages.push({
          id: `msg-${i * 2 + 1}`,
          senderId: 'user-2',
          content: 'It was really great! I did a lot of fun things today.',
          timestamp: new Date(now.getTime() - (9 - i * 2) * 3600000),
          messageLength: 52,
        });
      }

      // Second half: shorter messages from match
      for (let i = 5; i < 10; i++) {
        messages.push({
          id: `msg-${i * 2}`,
          senderId: 'user-1',
          content: 'What are you up to?',
          timestamp: new Date(now.getTime() - (10 - i * 2) * 3600000),
          messageLength: 19,
        });
        messages.push({
          id: `msg-${i * 2 + 1}`,
          senderId: 'user-2',
          content: 'nm',
          timestamp: new Date(now.getTime() - (9 - i * 2) * 3600000),
          messageLength: 2,
        });
      }

      const signals = service.detectRiskSignals(messages, 'user-1');

      const lengthSignal = signals.find(
        (s) => s.type === GhostingSignalType.MESSAGE_LENGTH_DECLINING
      );
      expect(lengthSignal).toBeDefined();
    });

    it('should detect one-sided conversation', () => {
      const messages = createMessages([
        { senderId: 'user-1', content: 'Hey!' },
        { senderId: 'user-1', content: 'How are you?' },
        { senderId: 'user-1', content: 'Just checking in' },
        { senderId: 'user-2', content: 'hi' },
        { senderId: 'user-1', content: 'Want to grab coffee?' },
        { senderId: 'user-1', content: 'Hello?' },
        { senderId: 'user-1', content: 'Are you there?' },
        { senderId: 'user-1', content: "I'd love to hear from you" },
        { senderId: 'user-2', content: 'maybe' },
        { senderId: 'user-1', content: 'Let me know!' },
      ]);

      const signals = service.detectRiskSignals(messages, 'user-1');

      const oneSidedSignal = signals.find(
        (s) => s.type === GhostingSignalType.ONE_SIDED_CONVERSATION
      );
      expect(oneSidedSignal).toBeDefined();
      expect(oneSidedSignal?.value).toBeGreaterThan(70);
    });

    it('should detect generic responses', () => {
      const messages = createMessages([
        { senderId: 'user-1', content: 'Hey, how was your weekend?' },
        { senderId: 'user-2', content: 'ok' },
        { senderId: 'user-1', content: 'Did you do anything fun?' },
        { senderId: 'user-2', content: 'lol' },
        { senderId: 'user-1', content: 'I went hiking!' },
        { senderId: 'user-2', content: 'cool' },
        { senderId: 'user-1', content: 'Have you been hiking before?' },
        { senderId: 'user-2', content: 'yeah' },
      ]);

      const signals = service.detectRiskSignals(messages, 'user-1');

      const genericSignal = signals.find(
        (s) => s.type === GhostingSignalType.GENERIC_RESPONSES
      );
      expect(genericSignal).toBeDefined();
    });

    it('should detect question avoidance', () => {
      const messages = createMessages([
        { senderId: 'user-1', content: 'What do you do for work?' },
        { senderId: 'user-2', content: 'stuff' },
        { senderId: 'user-1', content: 'What are your hobbies?' },
        { senderId: 'user-2', content: 'things' },
        { senderId: 'user-1', content: 'Want to meet up sometime?' },
        { senderId: 'user-2', content: 'idk' },
      ]);

      const signals = service.detectRiskSignals(messages, 'user-1');

      const avoidanceSignal = signals.find(
        (s) => s.type === GhostingSignalType.QUESTION_AVOIDANCE
      );
      expect(avoidanceSignal).toBeDefined();
    });

    it('should detect read but no reply', () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const readAt = new Date(twoDaysAgo);
      readAt.setHours(readAt.getHours() + 1);

      const messages = createMessages([
        { senderId: 'user-2', content: 'Hi there!' },
        {
          senderId: 'user-1',
          content: 'Want to grab coffee this weekend?',
          timestamp: twoDaysAgo,
          readAt: readAt,
        },
      ]);

      const signals = service.detectRiskSignals(messages, 'user-1');

      const readNoReplySignal = signals.find(
        (s) => s.type === GhostingSignalType.READ_BUT_NO_REPLY
      );
      expect(readNoReplySignal).toBeDefined();
    });

    it('should return empty array for empty messages', () => {
      const signals = service.detectRiskSignals([], 'user-1');
      expect(signals).toEqual([]);
    });
  });

  // ==========================================================================
  // Re-engagement Suggestion Tests
  // ==========================================================================
  describe('generateReengagementSuggestions', () => {
    const createTestData = () => {
      const conversation: ConversationData = {
        conversationId: 'conv-123',
        userId: 'user-1',
        matchId: 'user-2',
        messages: [
          {
            id: 'msg-1',
            senderId: 'user-1',
            content: 'Hey!',
            timestamp: new Date(),
            messageLength: 4,
          },
        ],
        createdAt: new Date(),
        lastMessageAt: new Date(),
      };

      const userProfile: UserProfile = {
        userId: 'user-1',
        firstName: 'John',
        interests: ['hiking', 'photography', 'cooking'],
        bio: 'Love the outdoors',
      };

      const matchProfile: UserProfile = {
        userId: 'user-2',
        firstName: 'Jane',
        interests: ['hiking', 'travel', 'reading'],
        bio: 'Adventure seeker',
      };

      const assessment: GhostingRiskAssessment = {
        conversationId: 'conv-123',
        riskLevel: 'high',
        riskScore: 75,
        signals: [],
        daysSinceLastMessage: 4,
        lastActiveUser: 'self',
        assessedAt: new Date(),
      };

      return { conversation, userProfile, matchProfile, assessment };
    };

    it('should generate multiple suggestions', async () => {
      const { conversation, userProfile, matchProfile, assessment } =
        createTestData();

      const suggestions = await service.generateReengagementSuggestions(
        conversation,
        userProfile,
        matchProfile,
        assessment
      );

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.length).toBeLessThanOrEqual(5);
    });

    it('should include shared interest suggestion when interests match', async () => {
      const { conversation, userProfile, matchProfile, assessment } =
        createTestData();

      const suggestions = await service.generateReengagementSuggestions(
        conversation,
        userProfile,
        matchProfile,
        assessment
      );

      const sharedInterestSuggestion = suggestions.find(
        (s) => s.type === 'callback_shared_interest'
      );
      expect(sharedInterestSuggestion).toBeDefined();
      expect(sharedInterestSuggestion?.context).toContain('hiking');
    });

    it('should include gentle check-in suggestion', async () => {
      const { conversation, userProfile, matchProfile, assessment } =
        createTestData();

      const suggestions = await service.generateReengagementSuggestions(
        conversation,
        userProfile,
        matchProfile,
        assessment
      );

      const checkinSuggestion = suggestions.find(
        (s) => s.type === 'gentle_checkin'
      );
      expect(checkinSuggestion).toBeDefined();
      expect(checkinSuggestion?.message).toBeTruthy();
    });

    it('should include activity suggestion for high-risk established conversations', async () => {
      const { conversation, userProfile, matchProfile, assessment } =
        createTestData();

      // Add more messages to make it an established conversation
      for (let i = 0; i < 15; i++) {
        conversation.messages.push({
          id: `msg-${i + 2}`,
          senderId: i % 2 === 0 ? 'user-1' : 'user-2',
          content: 'Test message',
          timestamp: new Date(),
          messageLength: 12,
        });
      }

      const suggestions = await service.generateReengagementSuggestions(
        conversation,
        userProfile,
        matchProfile,
        assessment
      );

      const activitySuggestion = suggestions.find(
        (s) => s.type === 'suggest_activity'
      );
      expect(activitySuggestion).toBeDefined();
    });

    it('should sort suggestions by confidence', async () => {
      const { conversation, userProfile, matchProfile, assessment } =
        createTestData();

      const suggestions = await service.generateReengagementSuggestions(
        conversation,
        userProfile,
        matchProfile,
        assessment
      );

      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i - 1].confidence).toBeGreaterThanOrEqual(
          suggestions[i].confidence
        );
      }
    });

    it('should include timing information in suggestions', async () => {
      const { conversation, userProfile, matchProfile, assessment } =
        createTestData();

      const suggestions = await service.generateReengagementSuggestions(
        conversation,
        userProfile,
        matchProfile,
        assessment
      );

      for (const suggestion of suggestions) {
        expect(suggestion.timing).toBeDefined();
        expect(suggestion.timing.optimalSendTime).toBeInstanceOf(Date);
        expect(['low', 'medium', 'high']).toContain(suggestion.timing.urgency);
        expect(typeof suggestion.timing.daysUntilCritical).toBe('number');
      }
    });

    it('should include match name in personalized messages', async () => {
      const { conversation, userProfile, matchProfile, assessment } =
        createTestData();

      const suggestions = await service.generateReengagementSuggestions(
        conversation,
        userProfile,
        matchProfile,
        assessment
      );

      const personalizedSuggestions = suggestions.filter((s) =>
        s.message.includes('Jane')
      );
      expect(personalizedSuggestions.length).toBeGreaterThan(0);
    });

    it('should provide alternate messages for suggestions', async () => {
      const { conversation, userProfile, matchProfile, assessment } =
        createTestData();

      const suggestions = await service.generateReengagementSuggestions(
        conversation,
        userProfile,
        matchProfile,
        assessment
      );

      const suggestionsWithAlternates = suggestions.filter(
        (s) => s.alternateMessages && s.alternateMessages.length > 0
      );
      expect(suggestionsWithAlternates.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Scheduling Tests
  // ==========================================================================
  describe('scheduleReengagementNudge', () => {
    const createSuggestion = (): ReengagementSuggestion => ({
      id: 'sug-123',
      type: 'gentle_checkin',
      message: 'Hey, how are you doing?',
      timing: {
        optimalSendTime: new Date(Date.now() + 3600000),
        urgency: 'medium',
        daysUntilCritical: 5,
      },
      confidence: 0.8,
    });

    it('should schedule a nudge and return action', async () => {
      const suggestion = createSuggestion();

      const action = await service.scheduleReengagementNudge(
        'conv-123',
        'user-1',
        suggestion
      );

      expect(action).toBeDefined();
      expect(action?.id).toBeTruthy();
      expect(action?.conversationId).toBe('conv-123');
      expect(action?.userId).toBe('user-1');
      expect(action?.status).toBe('pending');
    });

    it('should include suggestion in scheduled action', async () => {
      const suggestion = createSuggestion();

      const action = await service.scheduleReengagementNudge(
        'conv-123',
        'user-1',
        suggestion
      );

      expect(action?.suggestion).toBeDefined();
      expect(action?.suggestion?.type).toBe('gentle_checkin');
      expect(action?.content).toBe(suggestion.message);
    });

    it('should return null when nudges are disabled for user', async () => {
      const suggestion = createSuggestion();
      const preferences: UserNotificationPreferences = {
        userId: 'user-1',
        reengagementNudgesEnabled: false,
        maxNudgesPerDay: 3,
        maxNudgesPerConversation: 1,
      };

      const action = await service.scheduleReengagementNudge(
        'conv-123',
        'user-1',
        suggestion,
        preferences
      );

      expect(action).toBeNull();
    });

    it('should respect quiet hours when scheduling', async () => {
      const suggestion = createSuggestion();
      // Set optimal time during quiet hours
      suggestion.timing.optimalSendTime = new Date();
      suggestion.timing.optimalSendTime.setHours(23, 0, 0, 0); // 11 PM

      const preferences: UserNotificationPreferences = {
        userId: 'user-1',
        reengagementNudgesEnabled: true,
        maxNudgesPerDay: 3,
        maxNudgesPerConversation: 1,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
      };

      const action = await service.scheduleReengagementNudge(
        'conv-123',
        'user-1',
        suggestion,
        preferences
      );

      // Should be scheduled after quiet hours end
      expect(action?.scheduledFor.getHours()).toBe(8);
    });

    it('should include metadata in action', async () => {
      const suggestion = createSuggestion();

      const action = await service.scheduleReengagementNudge(
        'conv-123',
        'user-1',
        suggestion
      );

      expect(action?.metadata).toBeDefined();
      expect(action?.metadata?.suggestionType).toBe('gentle_checkin');
      expect(action?.metadata?.confidence).toBe(0.8);
      expect(action?.metadata?.urgency).toBe('medium');
    });
  });

  // ==========================================================================
  // At-Risk Conversations Tests
  // ==========================================================================
  describe('getAtRiskConversations', () => {
    const createConversations = (): ConversationData[] => {
      const now = new Date();

      return [
        {
          conversationId: 'conv-1',
          userId: 'user-1',
          matchId: 'match-1',
          messages: [
            {
              id: 'msg-1',
              senderId: 'match-1',
              content: 'Hey!',
              timestamp: now,
              messageLength: 4,
            },
          ],
          createdAt: now,
          lastMessageAt: now,
        },
        {
          conversationId: 'conv-2',
          userId: 'user-1',
          matchId: 'match-2',
          messages: [
            {
              id: 'msg-2',
              senderId: 'user-1',
              content: 'Hello!',
              timestamp: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
              messageLength: 6,
            },
          ],
          createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          lastMessageAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
        },
        {
          conversationId: 'conv-3',
          userId: 'user-1',
          matchId: 'match-3',
          messages: [
            {
              id: 'msg-3',
              senderId: 'user-1',
              content: 'Are you there?',
              timestamp: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
              messageLength: 14,
            },
          ],
          createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
          lastMessageAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        },
      ];
    };

    it('should return only at-risk conversations', async () => {
      const conversations = createConversations();
      const matchProfiles = new Map<string, UserProfile>();
      matchProfiles.set('match-1', { userId: 'match-1', firstName: 'Alice' });
      matchProfiles.set('match-2', { userId: 'match-2', firstName: 'Bob' });
      matchProfiles.set('match-3', { userId: 'match-3', firstName: 'Charlie' });

      const atRisk = await service.getAtRiskConversations(
        'user-1',
        conversations,
        matchProfiles
      );

      // Should only include conversations with medium+ risk
      expect(atRisk.length).toBeGreaterThanOrEqual(1);
      for (const convo of atRisk) {
        expect(['medium', 'high', 'critical']).toContain(
          convo.assessment.riskLevel
        );
      }
    });

    it('should sort by risk score (highest first)', async () => {
      const conversations = createConversations();
      const matchProfiles = new Map<string, UserProfile>();

      const atRisk = await service.getAtRiskConversations(
        'user-1',
        conversations,
        matchProfiles
      );

      for (let i = 1; i < atRisk.length; i++) {
        expect(atRisk[i - 1].assessment.riskScore).toBeGreaterThanOrEqual(
          atRisk[i].assessment.riskScore
        );
      }
    });

    it('should include match name when profile is available', async () => {
      const conversations = createConversations();
      const matchProfiles = new Map<string, UserProfile>();
      matchProfiles.set('match-2', { userId: 'match-2', firstName: 'Bob' });
      matchProfiles.set('match-3', { userId: 'match-3', firstName: 'Charlie' });

      const atRisk = await service.getAtRiskConversations(
        'user-1',
        conversations,
        matchProfiles
      );

      const withNames = atRisk.filter((c) => c.matchName);
      expect(withNames.length).toBeGreaterThan(0);
    });

    it('should include suggested action for high-risk conversations', async () => {
      const conversations = createConversations();
      const matchProfiles = new Map<string, UserProfile>();
      matchProfiles.set('match-3', {
        userId: 'match-3',
        firstName: 'Charlie',
        interests: ['music'],
      });

      const atRisk = await service.getAtRiskConversations(
        'user-1',
        conversations,
        matchProfiles
      );

      const highRisk = atRisk.filter(
        (c) =>
          c.assessment.riskLevel === 'high' ||
          c.assessment.riskLevel === 'critical'
      );

      for (const convo of highRisk) {
        expect(convo.suggestedAction).toBeDefined();
      }
    });
  });

  // ==========================================================================
  // Action Management Tests
  // ==========================================================================
  describe('cancelScheduledAction', () => {
    it('should cancel a pending action', async () => {
      const suggestion: ReengagementSuggestion = {
        id: 'sug-1',
        type: 'gentle_checkin',
        message: 'Hey!',
        timing: {
          optimalSendTime: new Date(Date.now() + 3600000),
          urgency: 'low',
          daysUntilCritical: 7,
        },
        confidence: 0.7,
      };

      const action = await service.scheduleReengagementNudge(
        'conv-123',
        'user-1',
        suggestion
      );

      expect(action).toBeDefined();
      const cancelled = service.cancelScheduledAction(action!.id);
      expect(cancelled).toBe(true);
    });

    it('should return false for non-existent action', () => {
      const cancelled = service.cancelScheduledAction('non-existent-id');
      expect(cancelled).toBe(false);
    });
  });

  describe('getPendingActions', () => {
    it('should return pending actions for user sorted by scheduled time', async () => {
      // Schedule multiple actions
      const suggestion1: ReengagementSuggestion = {
        id: 'sug-1',
        type: 'gentle_checkin',
        message: 'Hey!',
        timing: {
          optimalSendTime: new Date(Date.now() + 7200000), // 2 hours
          urgency: 'low',
          daysUntilCritical: 7,
        },
        confidence: 0.7,
      };

      const suggestion2: ReengagementSuggestion = {
        id: 'sug-2',
        type: 'interesting_question',
        message: 'What are you up to?',
        timing: {
          optimalSendTime: new Date(Date.now() + 3600000), // 1 hour
          urgency: 'medium',
          daysUntilCritical: 5,
        },
        confidence: 0.8,
      };

      await service.scheduleReengagementNudge('conv-1', 'user-1', suggestion1);
      await service.scheduleReengagementNudge('conv-2', 'user-1', suggestion2);

      const pending = service.getPendingActions('user-1');

      expect(pending.length).toBe(2);
      // Should be sorted by scheduled time (earliest first)
      expect(
        pending[0].scheduledFor.getTime()
      ).toBeLessThanOrEqual(pending[1].scheduledFor.getTime());
    });

    it('should return empty array for user with no pending actions', () => {
      const pending = service.getPendingActions('user-with-no-actions');
      expect(pending).toEqual([]);
    });
  });

  // ==========================================================================
  // Risk Level Tests
  // ==========================================================================
  describe('risk levels', () => {
    it('should correctly classify low risk (score < 25)', async () => {
      const conversation: ConversationData = {
        conversationId: 'conv-123',
        userId: 'user-1',
        matchId: 'user-2',
        messages: [
          {
            id: 'msg-1',
            senderId: 'user-2',
            content: 'Hey, how are you?',
            timestamp: new Date(),
            messageLength: 18,
          },
        ],
        createdAt: new Date(),
        lastMessageAt: new Date(),
      };

      const assessment = await service.assessGhostingRisk(conversation, 'user-1');
      expect(assessment.riskLevel).toBe('low');
      expect(assessment.riskScore).toBeLessThan(25);
    });

    it('should have all required fields in assessment', async () => {
      const conversation: ConversationData = {
        conversationId: 'conv-123',
        userId: 'user-1',
        matchId: 'user-2',
        messages: [],
        createdAt: new Date(),
      };

      const assessment = await service.assessGhostingRisk(conversation, 'user-1');

      expect(assessment).toHaveProperty('conversationId');
      expect(assessment).toHaveProperty('riskLevel');
      expect(assessment).toHaveProperty('riskScore');
      expect(assessment).toHaveProperty('signals');
      expect(assessment).toHaveProperty('daysSinceLastMessage');
      expect(assessment).toHaveProperty('lastActiveUser');
      expect(assessment).toHaveProperty('assessedAt');

      expect(typeof assessment.conversationId).toBe('string');
      expect(['low', 'medium', 'high', 'critical']).toContain(
        assessment.riskLevel
      );
      expect(typeof assessment.riskScore).toBe('number');
      expect(Array.isArray(assessment.signals)).toBe(true);
      expect(typeof assessment.daysSinceLastMessage).toBe('number');
      expect(['self', 'match']).toContain(assessment.lastActiveUser);
      expect(assessment.assessedAt).toBeInstanceOf(Date);
    });
  });

  // ==========================================================================
  // Signal Type Tests
  // ==========================================================================
  describe('GhostingSignalType', () => {
    it('should have all expected signal types', () => {
      expect(GhostingSignalType.TIME_SINCE_LAST_MESSAGE).toBe(
        'time_since_last_message'
      );
      expect(GhostingSignalType.MESSAGE_LENGTH_DECLINING).toBe(
        'message_length_declining'
      );
      expect(GhostingSignalType.RESPONSE_TIME_INCREASING).toBe(
        'response_time_increasing'
      );
      expect(GhostingSignalType.ONE_SIDED_CONVERSATION).toBe(
        'one_sided_conversation'
      );
      expect(GhostingSignalType.QUESTION_AVOIDANCE).toBe('question_avoidance');
      expect(GhostingSignalType.GENERIC_RESPONSES).toBe('generic_responses');
      expect(GhostingSignalType.ENGAGEMENT_DROP).toBe('engagement_drop');
      expect(GhostingSignalType.READ_BUT_NO_REPLY).toBe('read_but_no_reply');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('edge cases', () => {
    it('should handle conversation with no messages', async () => {
      const conversation: ConversationData = {
        conversationId: 'conv-123',
        userId: 'user-1',
        matchId: 'user-2',
        messages: [],
        createdAt: new Date(),
      };

      const assessment = await service.assessGhostingRisk(conversation, 'user-1');

      expect(assessment).toBeDefined();
      expect(assessment.riskLevel).toBe('low');
      expect(assessment.signals).toEqual([]);
    });

    it('should handle conversation with single message', async () => {
      const conversation: ConversationData = {
        conversationId: 'conv-123',
        userId: 'user-1',
        matchId: 'user-2',
        messages: [
          {
            id: 'msg-1',
            senderId: 'user-1',
            content: 'Hello!',
            timestamp: new Date(),
            messageLength: 6,
          },
        ],
        createdAt: new Date(),
        lastMessageAt: new Date(),
      };

      const assessment = await service.assessGhostingRisk(conversation, 'user-1');

      expect(assessment).toBeDefined();
      expect(assessment.lastActiveUser).toBe('self');
    });

    it('should handle profiles without interests', async () => {
      const conversation: ConversationData = {
        conversationId: 'conv-123',
        userId: 'user-1',
        matchId: 'user-2',
        messages: [
          {
            id: 'msg-1',
            senderId: 'user-1',
            content: 'Hey!',
            timestamp: new Date(),
            messageLength: 4,
          },
        ],
        createdAt: new Date(),
        lastMessageAt: new Date(),
      };

      const userProfile: UserProfile = { userId: 'user-1' };
      const matchProfile: UserProfile = { userId: 'user-2' };
      const assessment: GhostingRiskAssessment = {
        conversationId: 'conv-123',
        riskLevel: 'medium',
        riskScore: 50,
        signals: [],
        daysSinceLastMessage: 3,
        lastActiveUser: 'self',
        assessedAt: new Date(),
      };

      const suggestions = await service.generateReengagementSuggestions(
        conversation,
        userProfile,
        matchProfile,
        assessment
      );

      expect(suggestions.length).toBeGreaterThan(0);
      // Should not have shared interest suggestion
      const sharedInterestSuggestion = suggestions.find(
        (s) => s.type === 'callback_shared_interest'
      );
      expect(sharedInterestSuggestion).toBeUndefined();
    });

    it('should handle profiles without names', async () => {
      const conversation: ConversationData = {
        conversationId: 'conv-123',
        userId: 'user-1',
        matchId: 'user-2',
        messages: [
          {
            id: 'msg-1',
            senderId: 'user-1',
            content: 'Hey!',
            timestamp: new Date(),
            messageLength: 4,
          },
        ],
        createdAt: new Date(),
        lastMessageAt: new Date(),
      };

      const userProfile: UserProfile = { userId: 'user-1' };
      const matchProfile: UserProfile = { userId: 'user-2' }; // No firstName
      const assessment: GhostingRiskAssessment = {
        conversationId: 'conv-123',
        riskLevel: 'high',
        riskScore: 75,
        signals: [],
        daysSinceLastMessage: 5,
        lastActiveUser: 'self',
        assessedAt: new Date(),
      };

      const suggestions = await service.generateReengagementSuggestions(
        conversation,
        userProfile,
        matchProfile,
        assessment
      );

      // Should use fallback name
      const checkinSuggestion = suggestions.find(
        (s) => s.type === 'gentle_checkin'
      );
      expect(checkinSuggestion?.message).toContain('there');
    });
  });
});
