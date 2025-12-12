/**
 * Unit tests for Events Controller
 * Tests event tracking for swipes, matches, messages, sessions, and revenue
 */

import { Request, Response } from 'express';
import * as eventsController from '../../../src/api/controllers/events.controller';
import eventsRepository from '../../../src/domain/repositories/events.repository';
import matchSuccessRepository from '../../../src/domain/repositories/match-success.repository';
import revenueRepository from '../../../src/domain/repositories/revenue.repository';

jest.mock('../../../src/domain/repositories/events.repository');
jest.mock('../../../src/domain/repositories/match-success.repository');
jest.mock('../../../src/domain/repositories/revenue.repository');

describe('EventsController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn().mockReturnThis();

    mockRequest = {
      params: {},
      query: {},
      body: {},
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };
  });

  describe('trackSwipe', () => {
    it('should track a swipe event successfully', async () => {
      const swipeData = {
        userId: 'user-123',
        targetUserId: 'user-456',
        direction: 'right',
        sessionId: 'session-789',
        location: 'New York',
        metadata: { source: 'recommendations' },
      };

      const mockEvent = {
        id: 'event-123',
        ...swipeData,
        timestamp: new Date(),
      };

      mockRequest.body = swipeData;
      (eventsRepository.trackSwipe as jest.Mock).mockResolvedValue(mockEvent);

      await eventsController.trackSwipe(mockRequest as Request, mockResponse as Response);

      expect(eventsRepository.trackSwipe).toHaveBeenCalledWith(swipeData);
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockEvent,
        message: 'Swipe tracked successfully',
      });
    });

    it('should return 400 if required fields are missing', async () => {
      mockRequest.body = {
        userId: 'user-123',
        // missing targetUserId and direction
      };

      await eventsController.trackSwipe(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'userId, targetUserId, and direction are required',
      });
      expect(eventsRepository.trackSwipe).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockRequest.body = {
        userId: 'user-123',
        targetUserId: 'user-456',
        direction: 'right',
      };

      (eventsRepository.trackSwipe as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await eventsController.trackSwipe(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to track swipe',
      });
    });
  });

  describe('trackMatch', () => {
    it('should track a match event successfully', async () => {
      const matchData = {
        matchId: 'match-123',
        userId1: 'user-123',
        userId2: 'user-456',
        mutualSwipeTime: 120,
        sessionId: 'session-789',
      };

      const mockEvent = {
        id: 'event-456',
        ...matchData,
        timestamp: new Date(),
      };

      mockRequest.body = matchData;
      (eventsRepository.trackMatch as jest.Mock).mockResolvedValue(mockEvent);

      await eventsController.trackMatch(mockRequest as Request, mockResponse as Response);

      expect(eventsRepository.trackMatch).toHaveBeenCalledWith({
        matchId: matchData.matchId,
        userId1: matchData.userId1,
        userId2: matchData.userId2,
        mutualSwipeTime: matchData.mutualSwipeTime,
        sessionId: matchData.sessionId,
      });
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockEvent,
        message: 'Match tracked successfully',
      });
    });

    it('should default mutualSwipeTime to 0 if not provided', async () => {
      mockRequest.body = {
        matchId: 'match-123',
        userId1: 'user-123',
        userId2: 'user-456',
      };

      (eventsRepository.trackMatch as jest.Mock).mockResolvedValue({});

      await eventsController.trackMatch(mockRequest as Request, mockResponse as Response);

      expect(eventsRepository.trackMatch).toHaveBeenCalledWith(
        expect.objectContaining({
          mutualSwipeTime: 0,
        })
      );
    });

    it('should return 400 if required fields missing', async () => {
      mockRequest.body = {
        matchId: 'match-123',
        // missing userId1 and userId2
      };

      await eventsController.trackMatch(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(eventsRepository.trackMatch).not.toHaveBeenCalled();
    });
  });

  describe('trackMessage', () => {
    it('should track a message event successfully', async () => {
      const messageData = {
        conversationId: 'conv-123',
        senderId: 'user-123',
        receiverId: 'user-456',
        messageLength: 50,
        hasMedia: false,
        responseTime: 30,
        sessionId: 'session-789',
      };

      const mockEvent = {
        id: 'event-789',
        ...messageData,
        timestamp: new Date(),
      };

      mockRequest.body = messageData;
      (eventsRepository.trackMessage as jest.Mock).mockResolvedValue(mockEvent);

      await eventsController.trackMessage(mockRequest as Request, mockResponse as Response);

      expect(eventsRepository.trackMessage).toHaveBeenCalledWith(messageData);
      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it('should default optional fields', async () => {
      mockRequest.body = {
        conversationId: 'conv-123',
        senderId: 'user-123',
        receiverId: 'user-456',
      };

      (eventsRepository.trackMessage as jest.Mock).mockResolvedValue({});

      await eventsController.trackMessage(mockRequest as Request, mockResponse as Response);

      expect(eventsRepository.trackMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          messageLength: 0,
          hasMedia: false,
        })
      );
    });
  });

  describe('trackSession', () => {
    it('should track a session event successfully', async () => {
      const sessionData = {
        sessionId: 'session-123',
        userId: 'user-123',
        startTime: '2025-01-01T10:00:00Z',
        endTime: '2025-01-01T10:30:00Z',
        duration: 1800,
        screenViews: 10,
        swipeCount: 20,
        messageCount: 5,
        profileViews: 8,
        deviceType: 'mobile',
        appVersion: '1.2.3',
      };

      const mockEvent = {
        id: 'event-session-123',
        ...sessionData,
      };

      mockRequest.body = sessionData;
      (eventsRepository.trackSession as jest.Mock).mockResolvedValue(mockEvent);

      await eventsController.trackSession(mockRequest as Request, mockResponse as Response);

      expect(eventsRepository.trackSession).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: sessionData.sessionId,
          userId: sessionData.userId,
          startTime: expect.any(Date),
          endTime: expect.any(Date),
          duration: sessionData.duration,
        })
      );
      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it('should return 400 if sessionId missing', async () => {
      mockRequest.body = {
        userId: 'user-123',
      };

      await eventsController.trackSession(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(eventsRepository.trackSession).not.toHaveBeenCalled();
    });
  });

  describe('trackDateArrangement', () => {
    it('should track date arrangement successfully', async () => {
      const dateData = {
        conversationId: 'conv-123',
        userId1: 'user-123',
        userId2: 'user-456',
        status: 'proposed',
      };

      const mockArrangement = {
        id: 'arrangement-123',
        ...dateData,
        createdAt: new Date(),
      };

      mockRequest.body = dateData;
      (matchSuccessRepository.trackDateArrangement as jest.Mock).mockResolvedValue(
        mockArrangement
      );

      await eventsController.trackDateArrangement(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(matchSuccessRepository.trackDateArrangement).toHaveBeenCalledWith(dateData);
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockArrangement,
        message: 'Date arrangement tracked successfully',
      });
    });

    it('should return 400 if required fields missing', async () => {
      mockRequest.body = {
        conversationId: 'conv-123',
        // missing userId1 and userId2
      };

      await eventsController.trackDateArrangement(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe('updateDateArrangementStatus', () => {
    it('should update date arrangement status', async () => {
      const arrangementId = 'arrangement-123';
      const newStatus = 'confirmed';

      mockRequest.params = { id: arrangementId };
      mockRequest.body = { status: newStatus };

      const updatedArrangement = {
        id: arrangementId,
        status: newStatus,
        updatedAt: new Date(),
      };

      (matchSuccessRepository.updateDateArrangementStatus as jest.Mock).mockResolvedValue(
        updatedArrangement
      );

      await eventsController.updateDateArrangementStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(matchSuccessRepository.updateDateArrangementStatus).toHaveBeenCalledWith(
        arrangementId,
        newStatus
      );
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should return 400 if status missing', async () => {
      mockRequest.params = { id: 'arrangement-123' };
      mockRequest.body = {};

      await eventsController.updateDateArrangementStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe('trackRevenue', () => {
    it('should track revenue transaction successfully', async () => {
      const revenueData = {
        userId: 'user-123',
        transactionType: 'subscription',
        amount: 29.99,
        currency: 'USD',
        paymentMethod: 'credit_card',
        status: 'completed',
        subscriptionPlan: 'premium_monthly',
        metadata: { platform: 'ios' },
      };

      const mockTransaction = {
        id: 'txn-123',
        ...revenueData,
        createdAt: new Date(),
      };

      mockRequest.body = revenueData;
      (revenueRepository.trackTransaction as jest.Mock).mockResolvedValue(mockTransaction);

      await eventsController.trackRevenue(mockRequest as Request, mockResponse as Response);

      expect(revenueRepository.trackTransaction).toHaveBeenCalledWith(revenueData);
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockTransaction,
        message: 'Revenue transaction tracked successfully',
      });
    });

    it('should return 400 if required fields missing', async () => {
      mockRequest.body = {
        userId: 'user-123',
        // missing transactionType and amount
      };

      await eventsController.trackRevenue(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(revenueRepository.trackTransaction).not.toHaveBeenCalled();
    });
  });

  describe('updateTransactionStatus', () => {
    it('should update transaction status', async () => {
      const transactionId = 'txn-123';
      const newStatus = 'refunded';

      mockRequest.params = { id: transactionId };
      mockRequest.body = { status: newStatus };

      const updatedTransaction = {
        id: transactionId,
        status: newStatus,
        updatedAt: new Date(),
      };

      (revenueRepository.updateTransactionStatus as jest.Mock).mockResolvedValue(
        updatedTransaction
      );

      await eventsController.updateTransactionStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(revenueRepository.updateTransactionStatus).toHaveBeenCalledWith(
        transactionId,
        newStatus
      );
      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe('getUserSwipeStats', () => {
    it('should return user swipe statistics', async () => {
      const userId = 'user-123';
      const startDate = '2025-01-01';
      const endDate = '2025-01-31';

      mockRequest.params = { userId };
      mockRequest.query = { startDate, endDate };

      const mockStats = {
        totalSwipes: 100,
        rightSwipes: 60,
        leftSwipes: 40,
        matchRate: 0.25,
      };

      (eventsRepository.getUserSwipeStats as jest.Mock).mockResolvedValue(mockStats);

      await eventsController.getUserSwipeStats(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(eventsRepository.getUserSwipeStats).toHaveBeenCalledWith(
        userId,
        new Date(startDate),
        new Date(endDate)
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockStats,
      });
    });

    it('should work without date filters', async () => {
      const userId = 'user-123';
      mockRequest.params = { userId };
      mockRequest.query = {};

      (eventsRepository.getUserSwipeStats as jest.Mock).mockResolvedValue({});

      await eventsController.getUserSwipeStats(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(eventsRepository.getUserSwipeStats).toHaveBeenCalledWith(
        userId,
        undefined,
        undefined
      );
    });
  });

  describe('getUserMatchSuccess', () => {
    it('should return user match success rate', async () => {
      const userId = 'user-123';
      mockRequest.params = { userId };

      const mockStats = {
        totalMatches: 50,
        activeMatches: 10,
        expiredMatches: 30,
        conversationsStarted: 20,
        successRate: 0.4,
      };

      (eventsRepository.getUserMatchSuccessRate as jest.Mock).mockResolvedValue(mockStats);

      await eventsController.getUserMatchSuccess(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(eventsRepository.getUserMatchSuccessRate).toHaveBeenCalledWith(userId);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockStats,
      });
    });

    it('should handle errors gracefully', async () => {
      mockRequest.params = { userId: 'user-123' };
      (eventsRepository.getUserMatchSuccessRate as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await eventsController.getUserMatchSuccess(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });
});
