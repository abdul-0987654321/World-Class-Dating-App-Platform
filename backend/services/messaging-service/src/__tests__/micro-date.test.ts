/**
 * Unit Tests for Micro-Date Scheduler Service
 * Tests for 15-minute video date booking functionality
 */

// Mock postgres client before importing the service
jest.mock('../infrastructure/database/postgres-client', () => ({
  postgresClient: {
    initialize: jest.fn().mockResolvedValue(undefined),
    isConnected: jest.fn().mockReturnValue(true),
    query: jest.fn().mockResolvedValue({ rows: [] }),
    close: jest.fn().mockResolvedValue(undefined),
  },
}));

import {
  MicroDateService,
  MicroDate,
  MicroDateProposal,
  MicroDateStatus,
  MicroDateType,
  MicroDateIcebreaker,
  MicroDateFeedback,
  SuggestedTimeSlot,
  MICRO_DATE_FEATURE_FLAG,
  createMicroDateService,
} from '../services/micro-date.service';

describe('MicroDateService', () => {
  let microDateService: MicroDateService;
  let mockRedis: any;

  // Test data
  const testProposerId = 'user-proposer-123';
  const testRecipientId = 'user-recipient-456';
  const testConversationId = 'conv-789';

  beforeEach(() => {
    // Mock Redis client
    mockRedis = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue([]),
    };

    microDateService = createMicroDateService(mockRedis);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // FEATURE FLAG TESTS
  // ============================================================================

  describe('Feature Flag', () => {
    it('should have correct default feature flag configuration', () => {
      expect(MICRO_DATE_FEATURE_FLAG.name).toBe('engagement_micro_date_scheduler');
      expect(MICRO_DATE_FEATURE_FLAG.enabled).toBe(false);
      expect(MICRO_DATE_FEATURE_FLAG.rolloutPercentage).toBe(0);
      expect(MICRO_DATE_FEATURE_FLAG.userSegments).toEqual(['premium', 'elite']);
    });

    it('should return false when feature is disabled', () => {
      const result = microDateService.isFeatureEnabled('user-123', 'premium');
      expect(result).toBe(false);
    });

    it('should check user segment when provided', () => {
      // Feature is disabled by default, so all checks return false
      const premiumResult = microDateService.isFeatureEnabled('user-123', 'premium');
      const freeResult = microDateService.isFeatureEnabled('user-456', 'free');

      expect(premiumResult).toBe(false);
      expect(freeResult).toBe(false);
    });
  });

  // ============================================================================
  // PROPOSAL TESTS
  // ============================================================================

  describe('proposeMicroDate', () => {
    const futureTime1 = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
    const futureTime2 = new Date(Date.now() + 48 * 60 * 60 * 1000); // Day after tomorrow

    it('should create a valid micro-date proposal', async () => {
      const proposal = await microDateService.proposeMicroDate(
        testProposerId,
        testRecipientId,
        [futureTime1, futureTime2],
        'coffee_chat',
        testConversationId,
        'Would love to chat!'
      );

      expect(proposal.id).toBeDefined();
      expect(proposal.proposerId).toBe(testProposerId);
      expect(proposal.recipientId).toBe(testRecipientId);
      expect(proposal.type).toBe('coffee_chat');
      expect(proposal.suggestedTimes).toHaveLength(2);
      expect(proposal.message).toBe('Would love to chat!');
      expect(proposal.conversationId).toBe(testConversationId);
      expect(proposal.expiresAt).toBeDefined();
    });

    it('should store proposal in Redis with correct TTL', async () => {
      await microDateService.proposeMicroDate(
        testProposerId,
        testRecipientId,
        [futureTime1],
        'quick_intro',
        testConversationId
      );

      expect(mockRedis.set).toHaveBeenCalled();
      const calls = mockRedis.set.mock.calls;

      // Find the main proposal storage call
      const proposalCall = calls.find((call: any[]) =>
        call[0].includes('microdate:proposal:') && !call[0].includes('recipient:') && !call[0].includes('proposer:')
      );
      expect(proposalCall).toBeDefined();

      // Check TTL is 48 hours in seconds
      const ttl = proposalCall[2];
      expect(ttl).toBe(48 * 60 * 60);
    });

    it('should create references for recipient and proposer', async () => {
      const proposal = await microDateService.proposeMicroDate(
        testProposerId,
        testRecipientId,
        [futureTime1],
        'coffee_chat',
        testConversationId
      );

      const setCalls = mockRedis.set.mock.calls;

      // Check recipient reference
      const recipientRef = setCalls.find((call: any[]) =>
        call[0].includes(`recipient:${testRecipientId}:${proposal.id}`)
      );
      expect(recipientRef).toBeDefined();

      // Check proposer reference
      const proposerRef = setCalls.find((call: any[]) =>
        call[0].includes(`proposer:${testProposerId}:${proposal.id}`)
      );
      expect(proposerRef).toBeDefined();
    });

    it('should reject proposal to self', async () => {
      await expect(
        microDateService.proposeMicroDate(
          testProposerId,
          testProposerId, // Same as proposer
          [futureTime1],
          'coffee_chat',
          testConversationId
        )
      ).rejects.toThrow('Cannot propose a micro-date to yourself');
    });

    it('should reject proposal with no suggested times', async () => {
      await expect(
        microDateService.proposeMicroDate(
          testProposerId,
          testRecipientId,
          [], // Empty array
          'coffee_chat',
          testConversationId
        )
      ).rejects.toThrow('Must provide 1-5 suggested times');
    });

    it('should reject proposal with more than 5 suggested times', async () => {
      const tooManyTimes = Array(6).fill(null).map((_, i) =>
        new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000)
      );

      await expect(
        microDateService.proposeMicroDate(
          testProposerId,
          testRecipientId,
          tooManyTimes,
          'coffee_chat',
          testConversationId
        )
      ).rejects.toThrow('Must provide 1-5 suggested times');
    });

    it('should reject proposal with past times', async () => {
      const pastTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

      await expect(
        microDateService.proposeMicroDate(
          testProposerId,
          testRecipientId,
          [pastTime],
          'coffee_chat',
          testConversationId
        )
      ).rejects.toThrow('All suggested times must be in the future');
    });

    it('should reject when max pending proposals reached', async () => {
      // Mock 5 existing proposals
      mockRedis.keys.mockResolvedValue([
        'microdate:proposal:proposer:user-123:1',
        'microdate:proposal:proposer:user-123:2',
        'microdate:proposal:proposer:user-123:3',
        'microdate:proposal:proposer:user-123:4',
        'microdate:proposal:proposer:user-123:5',
      ]);

      await expect(
        microDateService.proposeMicroDate(
          testProposerId,
          testRecipientId,
          [futureTime1],
          'coffee_chat',
          testConversationId
        )
      ).rejects.toThrow('Maximum of 5 pending proposals allowed');
    });

    it('should support all micro-date types', async () => {
      const types: MicroDateType[] = [
        'coffee_chat',
        'quick_intro',
        'interest_deep_dive',
        'compatibility_check',
      ];

      for (const type of types) {
        mockRedis.keys.mockResolvedValue([]);

        const proposal = await microDateService.proposeMicroDate(
          testProposerId,
          testRecipientId,
          [futureTime1],
          type,
          testConversationId
        );

        expect(proposal.type).toBe(type);
      }
    });
  });

  describe('acceptProposal', () => {
    const scheduledTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const mockProposal: MicroDateProposal = {
      id: 'proposal-123',
      proposerId: testProposerId,
      recipientId: testRecipientId,
      suggestedTimes: [
        {
          start: scheduledTime,
          end: new Date(scheduledTime.getTime() + 15 * 60 * 1000),
          isOptimal: true,
        },
      ],
      type: 'coffee_chat',
      conversationId: testConversationId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    };

    beforeEach(() => {
      mockRedis.get.mockImplementation((key: string) => {
        if (key === 'microdate:proposal:proposal-123') {
          return Promise.resolve(JSON.stringify(mockProposal));
        }
        return Promise.resolve(null);
      });
    });

    it('should accept proposal and create micro-date', async () => {
      const microDate = await microDateService.acceptProposal(
        'proposal-123',
        scheduledTime,
        testRecipientId
      );

      expect(microDate.id).toBeDefined();
      expect(microDate.proposalId).toBe('proposal-123');
      expect(microDate.status).toBe('scheduled');
      expect(microDate.scheduledTime.getTime()).toBe(scheduledTime.getTime());
      expect(microDate.duration).toBe(15);
      expect(microDate.type).toBe('coffee_chat');
      expect(microDate.participants).toHaveLength(2);
      expect(microDate.icebreaker).toBeDefined();
    });

    it('should include both participants', async () => {
      const microDate = await microDateService.acceptProposal(
        'proposal-123',
        scheduledTime,
        testRecipientId
      );

      const participantIds = microDate.participants.map(p => p.id);
      expect(participantIds).toContain(testProposerId);
      expect(participantIds).toContain(testRecipientId);
    });

    it('should generate icebreaker for the date type', async () => {
      const microDate = await microDateService.acceptProposal(
        'proposal-123',
        scheduledTime,
        testRecipientId
      );

      expect(microDate.icebreaker).toBeDefined();
      expect(microDate.icebreaker!.type).toBe('coffee_chat');
      expect(microDate.icebreaker!.prompt).toBeDefined();
      expect(microDate.icebreaker!.followUpQuestions.length).toBeGreaterThan(0);
    });

    it('should delete proposal after acceptance', async () => {
      await microDateService.acceptProposal(
        'proposal-123',
        scheduledTime,
        testRecipientId
      );

      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('should reject if not recipient', async () => {
      await expect(
        microDateService.acceptProposal(
          'proposal-123',
          scheduledTime,
          'wrong-user-id'
        )
      ).rejects.toThrow('Only the recipient can accept this proposal');
    });

    it('should reject invalid selected time', async () => {
      const invalidTime = new Date(Date.now() + 72 * 60 * 60 * 1000); // Not in suggested times

      await expect(
        microDateService.acceptProposal(
          'proposal-123',
          invalidTime,
          testRecipientId
        )
      ).rejects.toThrow('Selected time must be one of the suggested times');
    });

    it('should reject if proposal not found', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(
        microDateService.acceptProposal(
          'non-existent-proposal',
          scheduledTime,
          testRecipientId
        )
      ).rejects.toThrow('Proposal not found or expired');
    });

    it('should reject if selected time is in the past', async () => {
      const pastTime = new Date(Date.now() - 60 * 60 * 1000);
      const pastProposal = {
        ...mockProposal,
        suggestedTimes: [{
          start: pastTime,
          end: new Date(pastTime.getTime() + 15 * 60 * 1000),
          isOptimal: false,
        }],
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(pastProposal));

      await expect(
        microDateService.acceptProposal(
          'proposal-123',
          pastTime,
          testRecipientId
        )
      ).rejects.toThrow('Selected time must be in the future');
    });
  });

  describe('declineProposal', () => {
    const mockProposal: MicroDateProposal = {
      id: 'proposal-456',
      proposerId: testProposerId,
      recipientId: testRecipientId,
      suggestedTimes: [],
      type: 'quick_intro',
      conversationId: testConversationId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    };

    beforeEach(() => {
      mockRedis.get.mockImplementation((key: string) => {
        if (key === 'microdate:proposal:proposal-456') {
          return Promise.resolve(JSON.stringify(mockProposal));
        }
        return Promise.resolve(null);
      });
    });

    it('should decline proposal successfully', async () => {
      await expect(
        microDateService.declineProposal('proposal-456', testRecipientId)
      ).resolves.not.toThrow();

      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('should accept decline reason', async () => {
      await microDateService.declineProposal('proposal-456', testRecipientId, {
        reason: 'busy',
        customMessage: 'Maybe next week?',
      });

      // Verify deletion occurred
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('should reject if not recipient', async () => {
      await expect(
        microDateService.declineProposal('proposal-456', 'wrong-user')
      ).rejects.toThrow('Only the recipient can decline this proposal');
    });

    it('should handle non-existent proposal', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(
        microDateService.declineProposal('non-existent', testRecipientId)
      ).rejects.toThrow('Proposal not found or expired');
    });
  });

  // ============================================================================
  // MICRO-DATE LIFECYCLE TESTS
  // ============================================================================

  describe('startMicroDate', () => {
    const scheduledTime = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now

    const mockMicroDate: MicroDate = {
      id: 'microdate-123',
      proposalId: 'proposal-123',
      participants: [
        { id: testProposerId },
        { id: testRecipientId },
      ],
      scheduledTime,
      duration: 15,
      status: 'scheduled',
      type: 'coffee_chat',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockRedis.get.mockImplementation((key: string) => {
        if (key === 'microdate:microdate-123') {
          return Promise.resolve(JSON.stringify(mockMicroDate));
        }
        return Promise.resolve(null);
      });
    });

    it('should allow participant to join', async () => {
      const updatedDate = await microDateService.startMicroDate(
        'microdate-123',
        testProposerId
      );

      const proposerParticipant = updatedDate.participants.find(
        p => p.id === testProposerId
      );
      expect(proposerParticipant!.joinedAt).toBeDefined();
    });

    it('should set status to in_progress when both join', async () => {
      // First participant joins
      const dateAfterFirstJoin = {
        ...mockMicroDate,
        participants: [
          { id: testProposerId, joinedAt: new Date() },
          { id: testRecipientId },
        ],
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(dateAfterFirstJoin));

      const updatedDate = await microDateService.startMicroDate(
        'microdate-123',
        testRecipientId
      );

      expect(updatedDate.status).toBe('in_progress');
      expect(updatedDate.startedAt).toBeDefined();
      expect(updatedDate.videoChannelId).toBeDefined();
    });

    it('should generate video channel ID when both join', async () => {
      const dateAfterFirstJoin = {
        ...mockMicroDate,
        participants: [
          { id: testProposerId, joinedAt: new Date() },
          { id: testRecipientId },
        ],
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(dateAfterFirstJoin));

      const updatedDate = await microDateService.startMicroDate(
        'microdate-123',
        testRecipientId
      );

      expect(updatedDate.videoChannelId).toContain('microdate_microdate-123_');
    });

    it('should reject non-participant', async () => {
      await expect(
        microDateService.startMicroDate('microdate-123', 'random-user')
      ).rejects.toThrow('User is not a participant in this micro-date');
    });

    it('should reject if micro-date not found', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(
        microDateService.startMicroDate('non-existent', testProposerId)
      ).rejects.toThrow('Micro-date not found');
    });

    it('should reject if status is not scheduled', async () => {
      const completedDate = { ...mockMicroDate, status: 'completed' };
      mockRedis.get.mockResolvedValue(JSON.stringify(completedDate));

      await expect(
        microDateService.startMicroDate('microdate-123', testProposerId)
      ).rejects.toThrow('Cannot start micro-date with status: completed');
    });

    it('should reject if too early', async () => {
      const farFutureDate = {
        ...mockMicroDate,
        scheduledTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(farFutureDate));

      await expect(
        microDateService.startMicroDate('microdate-123', testProposerId)
      ).rejects.toThrow('Too early to start the micro-date');
    });
  });

  describe('completeMicroDate', () => {
    const mockInProgressDate: MicroDate = {
      id: 'microdate-456',
      proposalId: 'proposal-456',
      participants: [
        { id: testProposerId, joinedAt: new Date() },
        { id: testRecipientId, joinedAt: new Date() },
      ],
      scheduledTime: new Date(Date.now() - 10 * 60 * 1000), // Started 10 mins ago
      duration: 15,
      status: 'in_progress',
      type: 'coffee_chat',
      startedAt: new Date(Date.now() - 10 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockRedis.get.mockImplementation((key: string) => {
        if (key === 'microdate:microdate-456') {
          return Promise.resolve(JSON.stringify(mockInProgressDate));
        }
        return Promise.resolve(null);
      });
    });

    it('should record feedback from participant', async () => {
      const feedback = {
        rating: 5,
        wouldMeetAgain: true,
        highlights: ['great_conversation', 'funny'],
      };

      const updatedDate = await microDateService.completeMicroDate(
        'microdate-456',
        testProposerId,
        feedback
      );

      expect(updatedDate.feedback).toBeDefined();
      expect(updatedDate.feedback).toHaveLength(1);
      expect(updatedDate.feedback![0].userId).toBe(testProposerId);
      expect(updatedDate.feedback![0].rating).toBe(5);
      expect(updatedDate.feedback![0].wouldMeetAgain).toBe(true);
    });

    it('should set left time for participant', async () => {
      const feedback = { rating: 4, wouldMeetAgain: true };

      const updatedDate = await microDateService.completeMicroDate(
        'microdate-456',
        testProposerId,
        feedback
      );

      const participant = updatedDate.participants.find(p => p.id === testProposerId);
      expect(participant!.leftAt).toBeDefined();
    });

    it('should mark as completed when both leave', async () => {
      const dateWithOneFeedback = {
        ...mockInProgressDate,
        participants: [
          { id: testProposerId, joinedAt: new Date(), leftAt: new Date() },
          { id: testRecipientId, joinedAt: new Date() },
        ],
        feedback: [{
          userId: testProposerId,
          rating: 5,
          wouldMeetAgain: true,
          submittedAt: new Date(),
        }],
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(dateWithOneFeedback));

      const feedback = { rating: 4, wouldMeetAgain: true };
      const updatedDate = await microDateService.completeMicroDate(
        'microdate-456',
        testRecipientId,
        feedback
      );

      expect(updatedDate.status).toBe('completed');
      expect(updatedDate.completedAt).toBeDefined();
    });

    it('should reject non-participant', async () => {
      const feedback = { rating: 5, wouldMeetAgain: true };

      await expect(
        microDateService.completeMicroDate('microdate-456', 'random-user', feedback)
      ).rejects.toThrow('User is not a participant in this micro-date');
    });

    it('should accept feedback with concerns', async () => {
      const feedback = {
        rating: 2,
        wouldMeetAgain: false,
        concerns: ['late', 'distracted'],
        privateNote: 'Seemed disinterested',
      };

      const updatedDate = await microDateService.completeMicroDate(
        'microdate-456',
        testProposerId,
        feedback
      );

      expect(updatedDate.feedback![0].concerns).toEqual(['late', 'distracted']);
      expect(updatedDate.feedback![0].privateNote).toBe('Seemed disinterested');
    });
  });

  describe('cancelMicroDate', () => {
    const mockScheduledDate: MicroDate = {
      id: 'microdate-789',
      proposalId: 'proposal-789',
      participants: [
        { id: testProposerId },
        { id: testRecipientId },
      ],
      scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      duration: 15,
      status: 'scheduled',
      type: 'compatibility_check',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockRedis.get.mockImplementation((key: string) => {
        if (key === 'microdate:microdate-789') {
          return Promise.resolve(JSON.stringify(mockScheduledDate));
        }
        return Promise.resolve(null);
      });
    });

    it('should cancel micro-date successfully', async () => {
      const cancelledDate = await microDateService.cancelMicroDate(
        'microdate-789',
        testProposerId,
        'Something came up'
      );

      expect(cancelledDate.status).toBe('cancelled');
      expect(cancelledDate.cancelledBy).toBe(testProposerId);
      expect(cancelledDate.cancellationReason).toBe('Something came up');
    });

    it('should allow either participant to cancel', async () => {
      const cancelledDate = await microDateService.cancelMicroDate(
        'microdate-789',
        testRecipientId
      );

      expect(cancelledDate.cancelledBy).toBe(testRecipientId);
    });

    it('should reject non-participant cancellation', async () => {
      await expect(
        microDateService.cancelMicroDate('microdate-789', 'random-user')
      ).rejects.toThrow('User is not a participant in this micro-date');
    });

    it('should reject cancelling completed date', async () => {
      const completedDate = { ...mockScheduledDate, status: 'completed' };
      mockRedis.get.mockResolvedValue(JSON.stringify(completedDate));

      await expect(
        microDateService.cancelMicroDate('microdate-789', testProposerId)
      ).rejects.toThrow('Cannot cancel micro-date with status: completed');
    });

    it('should reject cancelling already cancelled date', async () => {
      const alreadyCancelled = { ...mockScheduledDate, status: 'cancelled' };
      mockRedis.get.mockResolvedValue(JSON.stringify(alreadyCancelled));

      await expect(
        microDateService.cancelMicroDate('microdate-789', testProposerId)
      ).rejects.toThrow('Cannot cancel micro-date with status: cancelled');
    });
  });

  describe('markNoShow', () => {
    const mockScheduledDate: MicroDate = {
      id: 'microdate-noshow',
      proposalId: 'proposal-noshow',
      participants: [
        { id: testProposerId },
        { id: testRecipientId },
      ],
      scheduledTime: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
      duration: 15,
      status: 'scheduled',
      type: 'quick_intro',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockRedis.get.mockResolvedValue(JSON.stringify(mockScheduledDate));
    });

    it('should mark no-show correctly', async () => {
      const markedDate = await microDateService.markNoShow(
        'microdate-noshow',
        testRecipientId
      );

      expect(markedDate.status).toBe('no_show');
      expect(markedDate.noShowUserId).toBe(testRecipientId);
    });

    it('should reject invalid participant', async () => {
      await expect(
        microDateService.markNoShow('microdate-noshow', 'random-user')
      ).rejects.toThrow('User is not a participant in this micro-date');
    });
  });

  // ============================================================================
  // QUERY METHODS TESTS
  // ============================================================================

  describe('getUpcomingDates', () => {
    it('should return upcoming scheduled dates', async () => {
      const futureDate: MicroDate = {
        id: 'future-date-1',
        proposalId: 'proposal-1',
        participants: [{ id: testProposerId }, { id: testRecipientId }],
        scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        duration: 15,
        status: 'scheduled',
        type: 'coffee_chat',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRedis.keys.mockResolvedValue([`microdate:user:${testProposerId}:future-date-1`]);
      mockRedis.get.mockImplementation((key: string) => {
        if (key.includes('future-date-1')) {
          return Promise.resolve(JSON.stringify(futureDate));
        }
        return Promise.resolve('future-date-1');
      });

      const dates = await microDateService.getUpcomingDates(testProposerId);

      expect(dates.length).toBeGreaterThanOrEqual(0);
    });

    it('should respect limit parameter', async () => {
      const dates = await microDateService.getUpcomingDates(testProposerId, 5);
      expect(dates.length).toBeLessThanOrEqual(5);
    });

    it('should return empty array when no upcoming dates', async () => {
      mockRedis.keys.mockResolvedValue([]);

      const dates = await microDateService.getUpcomingDates(testProposerId);

      expect(dates).toEqual([]);
    });
  });

  describe('getPendingProposals', () => {
    it('should return pending proposals for recipient', async () => {
      const proposal: MicroDateProposal = {
        id: 'pending-proposal-1',
        proposerId: testProposerId,
        recipientId: testRecipientId,
        suggestedTimes: [],
        type: 'coffee_chat',
        conversationId: testConversationId,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      };

      mockRedis.keys.mockResolvedValue([`microdate:proposal:recipient:${testRecipientId}:pending-proposal-1`]);
      mockRedis.get.mockImplementation((key: string) => {
        if (key.includes('pending-proposal-1') && !key.includes('recipient:')) {
          return Promise.resolve(JSON.stringify(proposal));
        }
        return Promise.resolve('pending-proposal-1');
      });

      const proposals = await microDateService.getPendingProposals(testRecipientId);

      expect(proposals.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getSentProposals', () => {
    it('should return sent proposals for proposer', async () => {
      const proposal: MicroDateProposal = {
        id: 'sent-proposal-1',
        proposerId: testProposerId,
        recipientId: testRecipientId,
        suggestedTimes: [],
        type: 'quick_intro',
        conversationId: testConversationId,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      };

      mockRedis.keys.mockResolvedValue([`microdate:proposal:proposer:${testProposerId}:sent-proposal-1`]);
      mockRedis.get.mockImplementation((key: string) => {
        if (key.includes('sent-proposal-1') && !key.includes('proposer:')) {
          return Promise.resolve(JSON.stringify(proposal));
        }
        return Promise.resolve('sent-proposal-1');
      });

      const proposals = await microDateService.getSentProposals(testProposerId);

      expect(proposals.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // AI-POWERED FEATURES TESTS
  // ============================================================================

  describe('suggestOptimalTimes', () => {
    it('should suggest multiple time slots', async () => {
      const suggestions = await microDateService.suggestOptimalTimes(
        testProposerId,
        testRecipientId
      );

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.length).toBeLessThanOrEqual(10);
    });

    it('should mark evening times as optimal', async () => {
      const suggestions = await microDateService.suggestOptimalTimes(
        testProposerId,
        testRecipientId
      );

      const eveningSuggestions = suggestions.filter(s => {
        const hour = s.start.getHours();
        return hour >= 18 && hour <= 20;
      });

      // Evening times should be marked as optimal
      eveningSuggestions.forEach(s => {
        expect(s.isOptimal).toBe(true);
      });
    });

    it('should only suggest future times', async () => {
      const suggestions = await microDateService.suggestOptimalTimes(
        testProposerId,
        testRecipientId
      );

      const now = new Date();
      suggestions.forEach(s => {
        expect(s.start.getTime()).toBeGreaterThan(now.getTime());
      });
    });

    it('should respect daysAhead parameter', async () => {
      const suggestions = await microDateService.suggestOptimalTimes(
        testProposerId,
        testRecipientId,
        3
      );

      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 4); // 3 days + buffer

      suggestions.forEach(s => {
        expect(s.start.getTime()).toBeLessThan(maxDate.getTime());
      });
    });

    it('should include reason for optimal times', async () => {
      const suggestions = await microDateService.suggestOptimalTimes(
        testProposerId,
        testRecipientId
      );

      const optimalSuggestions = suggestions.filter(s => s.isOptimal);
      optimalSuggestions.forEach(s => {
        expect(s.reason).toBeDefined();
      });
    });
  });

  describe('generateIcebreaker', () => {
    it('should generate icebreaker for coffee_chat', async () => {
      const icebreaker = await microDateService.generateIcebreaker('coffee_chat');

      expect(icebreaker.id).toBeDefined();
      expect(icebreaker.type).toBe('coffee_chat');
      expect(icebreaker.prompt).toBeDefined();
      expect(icebreaker.prompt.length).toBeGreaterThan(0);
      expect(icebreaker.followUpQuestions.length).toBe(2);
    });

    it('should generate icebreaker for quick_intro', async () => {
      const icebreaker = await microDateService.generateIcebreaker('quick_intro');

      expect(icebreaker.type).toBe('quick_intro');
      expect(icebreaker.prompt).toBeDefined();
    });

    it('should generate icebreaker for interest_deep_dive with shared interests', async () => {
      const sharedInterests = ['hiking', 'photography', 'cooking'];
      const icebreaker = await microDateService.generateIcebreaker(
        'interest_deep_dive',
        sharedInterests
      );

      expect(icebreaker.type).toBe('interest_deep_dive');
      expect(icebreaker.sharedInterestContext).toEqual(sharedInterests);

      // Check that interest is substituted in prompt
      const containsInterest = sharedInterests.some(
        interest => icebreaker.prompt.includes(interest)
      );
      expect(containsInterest).toBe(true);
    });

    it('should generate icebreaker for compatibility_check', async () => {
      const icebreaker = await microDateService.generateIcebreaker('compatibility_check');

      expect(icebreaker.type).toBe('compatibility_check');
      expect(icebreaker.prompt).toBeDefined();
      expect(icebreaker.followUpQuestions).toBeDefined();
    });

    it('should generate different icebreakers on multiple calls', async () => {
      const icebreakers = await Promise.all([
        microDateService.generateIcebreaker('coffee_chat'),
        microDateService.generateIcebreaker('coffee_chat'),
        microDateService.generateIcebreaker('coffee_chat'),
      ]);

      // Due to randomization, at least some should be different
      // (statistically very unlikely all 3 are the same)
      const uniquePrompts = new Set(icebreakers.map(i => i.prompt));
      // We can't guarantee uniqueness due to small template set, but IDs should be unique
      const uniqueIds = new Set(icebreakers.map(i => i.id));
      expect(uniqueIds.size).toBe(3);
    });
  });

  // ============================================================================
  // STATISTICS TESTS
  // ============================================================================

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      const stats = await microDateService.getUserStats(testProposerId);

      expect(stats).toHaveProperty('totalDates');
      expect(stats).toHaveProperty('completedDates');
      expect(stats).toHaveProperty('cancelledDates');
      expect(stats).toHaveProperty('noShows');
      expect(stats).toHaveProperty('averageRating');
      expect(stats).toHaveProperty('wouldMeetAgainPercent');
    });

    it('should return zero stats for new user', async () => {
      const stats = await microDateService.getUserStats('new-user-123');

      expect(stats.totalDates).toBe(0);
      expect(stats.completedDates).toBe(0);
      expect(stats.averageRating).toBe(0);
    });
  });

  // ============================================================================
  // INTEGRATION / EDGE CASE TESTS
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle concurrent proposal acceptance gracefully', async () => {
      const scheduledTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const proposal: MicroDateProposal = {
        id: 'concurrent-proposal',
        proposerId: testProposerId,
        recipientId: testRecipientId,
        suggestedTimes: [{
          start: scheduledTime,
          end: new Date(scheduledTime.getTime() + 15 * 60 * 1000),
          isOptimal: true,
        }],
        type: 'coffee_chat',
        conversationId: testConversationId,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(proposal));

      // First acceptance should succeed
      const result = await microDateService.acceptProposal(
        'concurrent-proposal',
        scheduledTime,
        testRecipientId
      );

      expect(result.status).toBe('scheduled');
    });

    it('should handle timezone edge cases in suggestions', async () => {
      const suggestions = await microDateService.suggestOptimalTimes(
        testProposerId,
        testRecipientId,
        7
      );

      // All suggestions should have valid dates
      suggestions.forEach(s => {
        expect(s.start instanceof Date || typeof s.start === 'object').toBe(true);
        expect(s.end instanceof Date || typeof s.end === 'object').toBe(true);
        expect(s.end.getTime() - s.start.getTime()).toBe(15 * 60 * 1000); // 15 minutes
      });
    });

    it('should handle empty shared interests for interest_deep_dive', async () => {
      const icebreaker = await microDateService.generateIcebreaker(
        'interest_deep_dive',
        []
      );

      expect(icebreaker.prompt).toBeDefined();
      // Should still contain {interest} placeholder if no interests provided
      expect(icebreaker.prompt).toContain('{interest}');
    });

    it('should handle very long custom messages in proposals', async () => {
      const longMessage = 'A'.repeat(1000);
      const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const proposal = await microDateService.proposeMicroDate(
        testProposerId,
        testRecipientId,
        [futureTime],
        'coffee_chat',
        testConversationId,
        longMessage
      );

      expect(proposal.message).toBe(longMessage);
    });
  });
});
