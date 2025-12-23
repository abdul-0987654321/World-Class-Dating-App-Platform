/**
 * Unit tests for Match Controller
 * Tests all match controller methods including get, unmatch, extend, and rematch
 */

import { Request, Response } from 'express';
import { MatchController } from '../../../src/api/controllers/match.controller';
import matchRepository from '../../../src/domain/repositories/match.repository';
import matchService from '../../../src/domain/services/match.service';
import { MatchStatus } from '../../../src/types';

jest.mock('../../../src/domain/repositories/match.repository');
jest.mock('../../../src/domain/services/match.service');
jest.mock('@flamoral/backend-shared', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('MatchController', () => {
  let matchController: MatchController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  const userId = 'user-123';
  const matchId = 'match-456';
  const targetUserId = 'user-789';

  beforeEach(() => {
    jest.clearAllMocks();
    matchController = new MatchController();

    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn().mockReturnThis();

    mockRequest = {
      params: {},
      query: {},
      body: {},
      user: { userId } as any,
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };
  });

  describe('getMatches', () => {
    it('should return all matches for user', async () => {
      const mockMatches = [
        { id: 'match-1', user1Id: userId, user2Id: 'user-2', status: MatchStatus.MATCHED },
        { id: 'match-2', user1Id: userId, user2Id: 'user-3', status: MatchStatus.MATCHED },
      ];

      (matchRepository.findByUserId as jest.Mock).mockResolvedValue(mockMatches);

      await matchController.getMatches(mockRequest as Request, mockResponse as Response);

      expect(matchRepository.findByUserId).toHaveBeenCalledWith(userId, undefined);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          count: 2,
          matches: mockMatches,
        },
      });
    });

    it('should filter matches by status', async () => {
      const mockMatches = [
        { id: 'match-1', user1Id: userId, user2Id: 'user-2', status: MatchStatus.MATCHED },
      ];

      mockRequest.query = { status: MatchStatus.MATCHED };
      (matchRepository.findByUserId as jest.Mock).mockResolvedValue(mockMatches);

      await matchController.getMatches(mockRequest as Request, mockResponse as Response);

      expect(matchRepository.findByUserId).toHaveBeenCalledWith(userId, MatchStatus.MATCHED);
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should handle errors gracefully', async () => {
      (matchRepository.findByUserId as jest.Mock).mockRejectedValue(new Error('Database error'));

      await matchController.getMatches(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve matches',
      });
    });
  });

  describe('getMatch', () => {
    it('should return specific match by ID', async () => {
      const mockMatch = {
        id: matchId,
        user1Id: userId,
        user2Id: targetUserId,
        status: MatchStatus.MATCHED,
        requiresWomenFirst: false,
      };

      mockRequest.params = { matchId };
      (matchRepository.findById as jest.Mock).mockResolvedValue(mockMatch);

      await matchController.getMatch(mockRequest as Request, mockResponse as Response);

      expect(matchRepository.findById).toHaveBeenCalledWith(matchId);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: matchId,
          canSendMessage: true,
          waitingForFirstMessage: false,
          requiresWomenFirst: false,
        }),
      });
    });

    it('should return 404 if match not found', async () => {
      mockRequest.params = { matchId };
      (matchRepository.findById as jest.Mock).mockResolvedValue(null);

      await matchController.getMatch(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Match not found',
      });
    });

    it('should return 403 if user is not part of match', async () => {
      const mockMatch = {
        id: matchId,
        user1Id: 'other-user',
        user2Id: 'another-user',
        status: MatchStatus.MATCHED,
      };

      mockRequest.params = { matchId };
      (matchRepository.findById as jest.Mock).mockResolvedValue(mockMatch);

      await matchController.getMatch(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied',
      });
    });

    it('should include women-first messaging permissions', async () => {
      const womanUserId = targetUserId;
      const mockMatch = {
        id: matchId,
        user1Id: userId,
        user2Id: womanUserId,
        status: MatchStatus.MATCHED,
        requiresWomenFirst: true,
        womanUserId,
        conversationInitiated: false,
      };

      mockRequest.params = { matchId };
      (matchRepository.findById as jest.Mock).mockResolvedValue(mockMatch);

      await matchController.getMatch(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          canSendMessage: false, // Only woman can send first message
          waitingForFirstMessage: true,
          requiresWomenFirst: true,
        }),
      });
    });
  });

  describe('unmatch', () => {
    it('should successfully unmatch users', async () => {
      const mockMatch = {
        id: matchId,
        user1Id: userId,
        user2Id: targetUserId,
        status: MatchStatus.MATCHED,
      };

      mockRequest.params = { matchId };
      (matchRepository.findById as jest.Mock).mockResolvedValue(mockMatch);
      (matchRepository.updateStatus as jest.Mock).mockResolvedValue(undefined);

      await matchController.unmatch(mockRequest as Request, mockResponse as Response);

      expect(matchRepository.updateStatus).toHaveBeenCalledWith(matchId, MatchStatus.UNMATCHED);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Successfully unmatched',
      });
    });

    it('should return 404 if match not found', async () => {
      mockRequest.params = { matchId };
      (matchRepository.findById as jest.Mock).mockResolvedValue(null);

      await matchController.unmatch(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(matchRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should return 403 if user not part of match', async () => {
      const mockMatch = {
        id: matchId,
        user1Id: 'other-user',
        user2Id: 'another-user',
        status: MatchStatus.MATCHED,
      };

      mockRequest.params = { matchId };
      (matchRepository.findById as jest.Mock).mockResolvedValue(mockMatch);

      await matchController.unmatch(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(matchRepository.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('getRecentMatches', () => {
    it('should return recent matches with default limit', async () => {
      const mockMatches = [
        { id: 'match-1', user1Id: userId, user2Id: 'user-2' },
        { id: 'match-2', user1Id: userId, user2Id: 'user-3' },
      ];

      (matchRepository.getRecentMatches as jest.Mock).mockResolvedValue(mockMatches);

      await matchController.getRecentMatches(mockRequest as Request, mockResponse as Response);

      expect(matchRepository.getRecentMatches).toHaveBeenCalledWith(userId, 10);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          count: 2,
          matches: mockMatches,
        },
      });
    });

    it('should respect custom limit parameter', async () => {
      mockRequest.query = { limit: '5' };
      (matchRepository.getRecentMatches as jest.Mock).mockResolvedValue([]);

      await matchController.getRecentMatches(mockRequest as Request, mockResponse as Response);

      expect(matchRepository.getRecentMatches).toHaveBeenCalledWith(userId, 5);
    });
  });

  describe('getMatchCount', () => {
    it('should return total match count', async () => {
      (matchRepository.countByUserId as jest.Mock).mockResolvedValue(15);

      await matchController.getMatchCount(mockRequest as Request, mockResponse as Response);

      expect(matchRepository.countByUserId).toHaveBeenCalledWith(userId, MatchStatus.MATCHED);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: { count: 15 },
      });
    });

    it('should handle errors', async () => {
      (matchRepository.countByUserId as jest.Mock).mockRejectedValue(new Error('DB error'));

      await matchController.getMatchCount(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('extendMatch', () => {
    it('should extend match for premium users', async () => {
      const extendedMatch = {
        id: matchId,
        user1Id: userId,
        user2Id: targetUserId,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      };

      mockRequest.params = { matchId };
      mockRequest.user = { userId, isPremium: true } as any;
      (matchService.extendMatch as jest.Mock).mockResolvedValue(extendedMatch);

      await matchController.extendMatch(mockRequest as Request, mockResponse as Response);

      expect(matchService.extendMatch).toHaveBeenCalledWith(matchId, userId, true);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Match extended successfully',
        data: extendedMatch,
      });
    });

    it('should return 403 for non-premium users', async () => {
      mockRequest.params = { matchId };
      mockRequest.user = { userId, isPremium: false } as any;
      (matchService.extendMatch as jest.Mock).mockRejectedValue(
        new Error('Match extension is a Premium feature')
      );

      await matchController.extendMatch(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Match extension is a Premium feature',
        premiumRequired: true,
      });
    });

    it('should return 404 if match not found', async () => {
      mockRequest.params = { matchId };
      mockRequest.user = { userId, isPremium: true } as any;
      (matchService.extendMatch as jest.Mock).mockRejectedValue(new Error('Match not found'));

      await matchController.extendMatch(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Match not found',
      });
    });

    it('should return 400 if match cannot be extended', async () => {
      mockRequest.params = { matchId };
      mockRequest.user = { userId, isPremium: true } as any;
      (matchService.extendMatch as jest.Mock).mockRejectedValue(
        new Error('Match cannot be extended')
      );

      await matchController.extendMatch(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe('rematch', () => {
    it('should rematch with expired match for premium users', async () => {
      const newMatch = {
        id: 'new-match-123',
        user1Id: userId,
        user2Id: targetUserId,
        isRematch: true,
      };

      mockRequest.params = { targetUserId };
      mockRequest.user = { userId, isPremium: true } as any;
      (matchService.rematch as jest.Mock).mockResolvedValue(newMatch);

      await matchController.rematch(mockRequest as Request, mockResponse as Response);

      expect(matchService.rematch).toHaveBeenCalledWith(userId, targetUserId, true);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Rematch successful',
        data: newMatch,
      });
    });

    it('should return 403 for non-premium users', async () => {
      mockRequest.params = { targetUserId };
      mockRequest.user = { userId, isPremium: false } as any;
      (matchService.rematch as jest.Mock).mockRejectedValue(
        new Error('Rematch is a Premium feature')
      );

      await matchController.rematch(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Rematch is a Premium feature',
        premiumRequired: true,
      });
    });

    it('should return 404 if no expired match found', async () => {
      mockRequest.params = { targetUserId };
      mockRequest.user = { userId, isPremium: true } as any;
      (matchService.rematch as jest.Mock).mockRejectedValue(
        new Error('No expired match found')
      );

      await matchController.rematch(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'No expired match found',
      });
    });
  });
});
