import { Request, Response } from 'express';
import matchRepository from '../../domain/repositories/match.repository';
import matchService from '../../domain/services/match.service';
import { MatchStatus } from '../../types';
import { createLogger } from '@flamoral/shared';

const logger = createLogger('match-controller');

export class MatchController {
  /**
   * Get all matches for current user
   * GET /api/matches
   */
  async getMatches(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { status } = req.query;

      const matches = await matchRepository.findByUserId(
        userId,
        status as MatchStatus | undefined
      );

      res.status(200).json({
        success: true,
        data: {
          count: matches.length,
          matches,
        },
      });
    } catch (error) {
      logger.error('Failed to get matches', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve matches',
      });
    }
  }

  /**
   * Get specific match by ID
   * GET /api/matches/:matchId
   */
  async getMatch(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { matchId } = req.params;

      const match = await matchRepository.findById(matchId);

      if (!match) {
        res.status(404).json({
          success: false,
          error: 'Match not found',
        });
        return;
      }

      // Verify user is part of the match
      if (match.user1Id !== userId && match.user2Id !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      // Determine messaging permissions
      const messagingPermissions = this.getMessagingPermissions(match, userId);

      res.status(200).json({
        success: true,
        data: {
          ...match,
          ...messagingPermissions,
        },
      });
    } catch (error) {
      logger.error('Failed to get match', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve match',
      });
    }
  }

  /**
   * Unmatch with a user
   * DELETE /api/matches/:matchId
   */
  async unmatch(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { matchId } = req.params;

      const match = await matchRepository.findById(matchId);

      if (!match) {
        res.status(404).json({
          success: false,
          error: 'Match not found',
        });
        return;
      }

      // Verify user is part of the match
      if (match.user1Id !== userId && match.user2Id !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      await matchRepository.updateStatus(matchId, MatchStatus.UNMATCHED);

      res.status(200).json({
        success: true,
        message: 'Successfully unmatched',
      });
    } catch (error) {
      logger.error('Failed to unmatch', error);
      res.status(500).json({
        success: false,
        error: 'Failed to unmatch',
      });
    }
  }

  /**
   * Get recent matches
   * GET /api/matches/recent
   */
  async getRecentMatches(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { limit } = req.query;

      const matches = await matchRepository.getRecentMatches(
        userId,
        limit ? parseInt(limit as string, 10) : 10
      );

      res.status(200).json({
        success: true,
        data: {
          count: matches.length,
          matches,
        },
      });
    } catch (error) {
      logger.error('Failed to get recent matches', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve recent matches',
      });
    }
  }

  /**
   * Get match count
   * GET /api/matches/count
   */
  async getMatchCount(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;

      const count = await matchRepository.countByUserId(userId, MatchStatus.MATCHED);

      res.status(200).json({
        success: true,
        data: { count },
      });
    } catch (error) {
      logger.error('Failed to get match count', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve match count',
      });
    }
  }

  /**
   * Extend match expiration (Premium feature)
   * POST /api/matches/:matchId/extend
   */
  async extendMatch(req: Request, res: Response): Promise<void> {
    try {
      const { userId, isPremium } = (req as any).user;
      const { matchId } = req.params;

      const extendedMatch = await matchService.extendMatch(matchId, userId, isPremium);

      res.status(200).json({
        success: true,
        message: 'Match extended successfully',
        data: extendedMatch,
      });
    } catch (error: any) {
      logger.error('Failed to extend match', error);

      if (error.message === 'Match extension is a Premium feature') {
        res.status(403).json({
          success: false,
          error: error.message,
          premiumRequired: true,
        });
        return;
      }

      if (error.message === 'Match not found') {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }

      if (error.message === 'Access denied' || error.message.includes('cannot be extended')) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to extend match',
      });
    }
  }

  /**
   * Rematch with expired match (Premium feature)
   * POST /api/matches/:targetUserId/rematch
   */
  async rematch(req: Request, res: Response): Promise<void> {
    try {
      const { userId, isPremium } = (req as any).user;
      const { targetUserId } = req.params;

      const match = await matchService.rematch(userId, targetUserId, isPremium);

      res.status(200).json({
        success: true,
        message: 'Rematch successful',
        data: match,
      });
    } catch (error: any) {
      logger.error('Failed to rematch', error);

      if (error.message === 'Rematch is a Premium feature') {
        res.status(403).json({
          success: false,
          error: error.message,
          premiumRequired: true,
        });
        return;
      }

      if (error.message === 'No expired match found') {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to rematch',
      });
    }
  }

  /**
   * Helper method to determine messaging permissions for a match
   */
  private getMessagingPermissions(match: any, userId: string) {
    const { requiresWomenFirst, womanUserId, conversationInitiated } = match;

    // If women-first rule doesn't apply, everyone can message
    if (!requiresWomenFirst) {
      return {
        canSendMessage: true,
        waitingForFirstMessage: false,
        requiresWomenFirst: false,
      };
    }

    // If conversation is already initiated, everyone can message
    if (conversationInitiated) {
      return {
        canSendMessage: true,
        waitingForFirstMessage: false,
        requiresWomenFirst: true,
        conversationInitiated: true,
      };
    }

    // Women-first rule applies and conversation not initiated
    // Only the woman can send the first message
    const canSendMessage = userId === womanUserId;

    return {
      canSendMessage,
      waitingForFirstMessage: !canSendMessage,
      requiresWomenFirst: true,
      womanUserId,
      conversationInitiated: false,
      message: canSendMessage
        ? 'You can send the first message'
        : 'Waiting for her to send the first message',
    };
  }
}

export default new MatchController();
