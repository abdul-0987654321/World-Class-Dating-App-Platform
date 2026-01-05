/**
 * Unit tests for Events Repository
 * Tests event tracking for swipes, matches, messages, and sessions
 */

import { EventsRepository, SwipeEvent, MatchEvent, MessageEvent, SessionEvent } from '../../../src/domain/repositories/events.repository';
import { dbClient } from '../../../src/infrastructure/database/db-client';

jest.mock('../../../src/infrastructure/database/db-client');

describe('EventsRepository', () => {
  let eventsRepository: EventsRepository;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = jest.fn();
    (dbClient.query as jest.Mock) = mockQuery;
    eventsRepository = new EventsRepository();
  });

  describe('trackSwipe', () => {
    it('should track a swipe event successfully', async () => {
      const swipeData = {
        userId: 'user-123',
        targetUserId: 'user-456',
        direction: 'right' as const,
        sessionId: 'session-789',
        location: { latitude: 40.7128, longitude: -74.006 },
        metadata: { source: 'discovery' },
      };

      const mockRow = {
        id: 'swipe-123',
        user_id: swipeData.userId,
        target_user_id: swipeData.targetUserId,
        direction: swipeData.direction,
        session_id: swipeData.sessionId,
        location: swipeData.location,
        metadata: swipeData.metadata,
        timestamp: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await eventsRepository.trackSwipe(swipeData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO swipe_events'),
        expect.arrayContaining([
          swipeData.userId,
          swipeData.targetUserId,
          swipeData.direction,
          swipeData.sessionId,
          JSON.stringify(swipeData.location),
          JSON.stringify(swipeData.metadata),
        ])
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('swipe-123');
      expect(result.userId).toBe(swipeData.userId);
      expect(result.targetUserId).toBe(swipeData.targetUserId);
      expect(result.direction).toBe('right');
    });

    it('should track a left swipe correctly', async () => {
      const swipeData = {
        userId: 'user-123',
        targetUserId: 'user-456',
        direction: 'left' as const,
      };

      const mockRow = {
        id: 'swipe-456',
        user_id: swipeData.userId,
        target_user_id: swipeData.targetUserId,
        direction: 'left',
        session_id: null,
        timestamp: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await eventsRepository.trackSwipe(swipeData);

      expect(result.direction).toBe('left');
    });

    it('should track a super like correctly', async () => {
      const swipeData = {
        userId: 'user-123',
        targetUserId: 'user-456',
        direction: 'super' as const,
      };

      const mockRow = {
        id: 'swipe-789',
        user_id: swipeData.userId,
        target_user_id: swipeData.targetUserId,
        direction: 'super',
        session_id: null,
        timestamp: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await eventsRepository.trackSwipe(swipeData);

      expect(result.direction).toBe('super');
    });

    it('should handle optional fields correctly', async () => {
      const swipeData = {
        userId: 'user-123',
        targetUserId: 'user-456',
        direction: 'right' as const,
      };

      const mockRow = {
        id: 'swipe-minimal',
        user_id: swipeData.userId,
        target_user_id: swipeData.targetUserId,
        direction: swipeData.direction,
        session_id: null,
        location: null,
        metadata: null,
        timestamp: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await eventsRepository.trackSwipe(swipeData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([swipeData.userId, swipeData.targetUserId, swipeData.direction, null, null, null])
      );

      expect(result).toBeDefined();
      expect(result.sessionId).toBeNull();
    });
  });

  describe('trackMatch', () => {
    it('should track a match event successfully', async () => {
      const matchData = {
        matchId: 'match-123',
        userId1: 'user-123',
        userId2: 'user-456',
        mutualSwipeTime: 3600000, // 1 hour in ms
        sessionId: 'session-789',
      };

      const mockRow = {
        id: 'event-123',
        match_id: matchData.matchId,
        user_id_1: matchData.userId1,
        user_id_2: matchData.userId2,
        mutual_swipe_time: matchData.mutualSwipeTime,
        session_id: matchData.sessionId,
        timestamp: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await eventsRepository.trackMatch(matchData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO match_events'),
        expect.arrayContaining([
          matchData.matchId,
          matchData.userId1,
          matchData.userId2,
          matchData.mutualSwipeTime,
          matchData.sessionId,
        ])
      );

      expect(result).toBeDefined();
      expect(result.matchId).toBe(matchData.matchId);
      expect(result.userId1).toBe(matchData.userId1);
      expect(result.userId2).toBe(matchData.userId2);
      expect(result.mutualSwipeTime).toBe(matchData.mutualSwipeTime);
    });

    it('should handle instant matches with zero mutual swipe time', async () => {
      const matchData = {
        matchId: 'match-instant',
        userId1: 'user-123',
        userId2: 'user-456',
        mutualSwipeTime: 0,
      };

      const mockRow = {
        id: 'event-instant',
        match_id: matchData.matchId,
        user_id_1: matchData.userId1,
        user_id_2: matchData.userId2,
        mutual_swipe_time: 0,
        session_id: null,
        timestamp: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await eventsRepository.trackMatch(matchData);

      expect(result.mutualSwipeTime).toBe(0);
    });
  });

  describe('trackMessage', () => {
    it('should track a message event successfully', async () => {
      const messageData = {
        conversationId: 'conv-123',
        senderId: 'user-123',
        receiverId: 'user-456',
        messageLength: 150,
        hasMedia: false,
        responseTime: 300, // 5 minutes
        sessionId: 'session-789',
      };

      const mockRow = {
        id: 'msg-event-123',
        conversation_id: messageData.conversationId,
        sender_id: messageData.senderId,
        receiver_id: messageData.receiverId,
        message_length: messageData.messageLength,
        has_media: messageData.hasMedia,
        response_time: messageData.responseTime,
        session_id: messageData.sessionId,
        timestamp: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await eventsRepository.trackMessage(messageData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO message_events'),
        expect.arrayContaining([
          messageData.conversationId,
          messageData.senderId,
          messageData.receiverId,
          messageData.messageLength,
          messageData.hasMedia,
          messageData.responseTime,
          messageData.sessionId,
        ])
      );

      expect(result).toBeDefined();
      expect(result.conversationId).toBe(messageData.conversationId);
      expect(result.senderId).toBe(messageData.senderId);
      expect(result.messageLength).toBe(150);
      expect(result.hasMedia).toBe(false);
    });

    it('should track a message with media correctly', async () => {
      const messageData = {
        conversationId: 'conv-456',
        senderId: 'user-123',
        receiverId: 'user-456',
        messageLength: 0, // Media only
        hasMedia: true,
      };

      const mockRow = {
        id: 'msg-media',
        conversation_id: messageData.conversationId,
        sender_id: messageData.senderId,
        receiver_id: messageData.receiverId,
        message_length: 0,
        has_media: true,
        response_time: null,
        session_id: null,
        timestamp: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await eventsRepository.trackMessage(messageData);

      expect(result.hasMedia).toBe(true);
      expect(result.messageLength).toBe(0);
    });

    it('should handle first message in conversation (no response time)', async () => {
      const messageData = {
        conversationId: 'conv-789',
        senderId: 'user-123',
        receiverId: 'user-456',
        messageLength: 50,
        hasMedia: false,
      };

      const mockRow = {
        id: 'msg-first',
        conversation_id: messageData.conversationId,
        sender_id: messageData.senderId,
        receiver_id: messageData.receiverId,
        message_length: 50,
        has_media: false,
        response_time: null,
        session_id: null,
        timestamp: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await eventsRepository.trackMessage(messageData);

      expect(result.responseTime).toBeNull();
    });
  });

  describe('trackSession', () => {
    it('should create a new session successfully', async () => {
      const sessionData = {
        sessionId: 'session-123',
        userId: 'user-123',
        startTime: new Date(),
        deviceType: 'mobile',
        appVersion: '2.1.0',
      };

      // Mock: Session doesn't exist
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Mock: Insert new session
      const mockRow = {
        id: 'event-session-123',
        session_id: sessionData.sessionId,
        user_id: sessionData.userId,
        start_time: sessionData.startTime,
        end_time: null,
        duration: null,
        screen_views: 0,
        swipe_count: 0,
        message_count: 0,
        profile_views: 0,
        device_type: sessionData.deviceType,
        app_version: sessionData.appVersion,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await eventsRepository.trackSession(sessionData);

      expect(result).toBeDefined();
      expect(result.sessionId).toBe(sessionData.sessionId);
      expect(result.userId).toBe(sessionData.userId);
      expect(result.deviceType).toBe('mobile');
      expect(result.appVersion).toBe('2.1.0');
    });

    it('should update an existing session', async () => {
      const sessionData = {
        sessionId: 'session-existing',
        endTime: new Date(),
        duration: 1800, // 30 minutes
        screenViews: 25,
        swipeCount: 50,
        messageCount: 10,
        profileViews: 15,
      };

      // Mock: Session exists
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            session_id: sessionData.sessionId,
            start_time: new Date(Date.now() - 1800000),
          },
        ],
      });

      // Mock: Update session
      const mockRow = {
        id: 'event-session-existing',
        session_id: sessionData.sessionId,
        user_id: 'user-123',
        start_time: new Date(Date.now() - 1800000),
        end_time: sessionData.endTime,
        duration: sessionData.duration,
        screen_views: sessionData.screenViews,
        swipe_count: sessionData.swipeCount,
        message_count: sessionData.messageCount,
        profile_views: sessionData.profileViews,
        device_type: 'mobile',
        app_version: '2.1.0',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await eventsRepository.trackSession(sessionData);

      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(result.duration).toBe(1800);
      expect(result.screenViews).toBe(25);
      expect(result.swipeCount).toBe(50);
    });

    it('should use default values for new session', async () => {
      const sessionData = {
        sessionId: 'session-minimal',
      };

      mockQuery.mockResolvedValueOnce({ rows: [] }); // Session doesn't exist

      const mockRow = {
        id: 'event-session-minimal',
        session_id: sessionData.sessionId,
        user_id: null,
        start_time: new Date(),
        end_time: null,
        duration: null,
        screen_views: 0,
        swipe_count: 0,
        message_count: 0,
        profile_views: 0,
        device_type: 'unknown',
        app_version: null,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await eventsRepository.trackSession(sessionData);

      expect(result.deviceType).toBe('unknown');
      expect(result.screenViews).toBe(0);
      expect(result.swipeCount).toBe(0);
    });
  });

  describe('getUserSwipeStats', () => {
    it('should return user swipe statistics', async () => {
      const userId = 'user-123';

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            total_swipes: '100',
            right_swipes: '60',
            left_swipes: '35',
            super_likes: '5',
          },
        ],
      });

      const result = await eventsRepository.getUserSwipeStats(userId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [userId]
      );

      expect(result).toBeDefined();
      expect(result.totalSwipes).toBe(100);
      expect(result.rightSwipes).toBe(60);
      expect(result.leftSwipes).toBe(35);
      expect(result.superLikes).toBe(5);
      expect(result.swipeRate).toBe(60); // (60/100) * 100
    });

    it('should filter by date range', async () => {
      const userId = 'user-123';
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            total_swipes: '50',
            right_swipes: '30',
            left_swipes: '18',
            super_likes: '2',
          },
        ],
      });

      const result = await eventsRepository.getUserSwipeStats(userId, startDate, endDate);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('timestamp >= $'),
        expect.arrayContaining([userId, startDate, endDate])
      );

      expect(result.totalSwipes).toBe(50);
    });

    it('should handle zero swipes correctly', async () => {
      const userId = 'user-new';

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            total_swipes: '0',
            right_swipes: '0',
            left_swipes: '0',
            super_likes: '0',
          },
        ],
      });

      const result = await eventsRepository.getUserSwipeStats(userId);

      expect(result.totalSwipes).toBe(0);
      expect(result.swipeRate).toBe(0); // Avoid division by zero
    });
  });

  describe('getUserMatchSuccessRate', () => {
    it('should return match success statistics', async () => {
      const userId = 'user-123';

      // Mock total matches query
      mockQuery.mockResolvedValueOnce({
        rows: [{ total_matches: '50' }],
      });

      // Mock conversations started query
      mockQuery.mockResolvedValueOnce({
        rows: [{ conversations_started: '30' }],
      });

      // Mock average response time query
      mockQuery.mockResolvedValueOnce({
        rows: [{ avg_response_time: '180' }],
      });

      const result = await eventsRepository.getUserMatchSuccessRate(userId);

      expect(result).toBeDefined();
      expect(result.totalMatches).toBe(50);
      expect(result.conversationStarted).toBe(30);
      expect(result.conversationRate).toBe(60); // (30/50) * 100
      expect(result.averageResponseTime).toBe(180);
    });

    it('should handle zero matches correctly', async () => {
      const userId = 'user-no-matches';

      mockQuery.mockResolvedValueOnce({ rows: [{ total_matches: '0' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ conversations_started: '0' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ avg_response_time: null }] });

      const result = await eventsRepository.getUserMatchSuccessRate(userId);

      expect(result.totalMatches).toBe(0);
      expect(result.conversationRate).toBe(0);
      expect(result.averageResponseTime).toBe(0);
    });
  });

  describe('getSessionStats', () => {
    it('should return session statistics', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            total_sessions: '1000',
            avg_duration: '600',
            avg_swipes: '25',
            avg_messages: '8',
          },
        ],
      });

      const result = await eventsRepository.getSessionStats();

      expect(result).toBeDefined();
      expect(result.totalSessions).toBe(1000);
      expect(result.averageDuration).toBe(600);
      expect(result.averageSwipesPerSession).toBe(25);
      expect(result.averageMessagesPerSession).toBe(8);
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            total_sessions: '500',
            avg_duration: '720',
            avg_swipes: '30',
            avg_messages: '10',
          },
        ],
      });

      const result = await eventsRepository.getSessionStats(startDate, endDate);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('start_time >= $'),
        expect.arrayContaining([startDate, endDate])
      );

      expect(result.totalSessions).toBe(500);
    });

    it('should handle null values', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            total_sessions: '0',
            avg_duration: null,
            avg_swipes: null,
            avg_messages: null,
          },
        ],
      });

      const result = await eventsRepository.getSessionStats();

      expect(result.totalSessions).toBe(0);
      expect(result.averageDuration).toBe(0);
      expect(result.averageSwipesPerSession).toBe(0);
      expect(result.averageMessagesPerSession).toBe(0);
    });
  });

  describe('getSwipesByTimeRange', () => {
    it('should return swipes grouped by day', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-07');

      mockQuery.mockResolvedValueOnce({
        rows: [
          { period: new Date('2025-01-07'), direction: 'right', count: '500' },
          { period: new Date('2025-01-07'), direction: 'left', count: '300' },
          { period: new Date('2025-01-06'), direction: 'right', count: '450' },
          { period: new Date('2025-01-06'), direction: 'left', count: '280' },
        ],
      });

      const result = await eventsRepository.getSwipesByTimeRange(startDate, endDate, 'day');

      expect(result).toBeDefined();
      expect(result.length).toBe(4);

      result.forEach((item) => {
        expect(item.period).toBeDefined();
        expect(item.count).toBeGreaterThanOrEqual(0);
        expect(['right', 'left', 'super']).toContain(item.direction);
      });
    });

    it('should group by hour correctly', async () => {
      const startDate = new Date('2025-01-01T00:00:00');
      const endDate = new Date('2025-01-01T23:59:59');

      mockQuery.mockResolvedValueOnce({
        rows: [
          { period: new Date('2025-01-01T18:00:00'), direction: 'right', count: '100' },
          { period: new Date('2025-01-01T19:00:00'), direction: 'right', count: '120' },
          { period: new Date('2025-01-01T20:00:00'), direction: 'right', count: '150' },
        ],
      });

      const result = await eventsRepository.getSwipesByTimeRange(startDate, endDate, 'hour');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("DATE_TRUNC('hour'"),
        [startDate, endDate]
      );

      expect(result.length).toBe(3);
    });

    it('should group by week correctly', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      mockQuery.mockResolvedValueOnce({
        rows: [
          { period: new Date('2025-01-27'), direction: 'right', count: '3500' },
          { period: new Date('2025-01-20'), direction: 'right', count: '3200' },
        ],
      });

      const result = await eventsRepository.getSwipesByTimeRange(startDate, endDate, 'week');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("DATE_TRUNC('week'"),
        [startDate, endDate]
      );

      expect(result.length).toBe(2);
    });

    it('should default to day grouping', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-07');

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await eventsRepository.getSwipesByTimeRange(startDate, endDate);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("DATE_TRUNC('day'"),
        [startDate, endDate]
      );
    });
  });
});
