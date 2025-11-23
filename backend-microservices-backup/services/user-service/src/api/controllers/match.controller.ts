import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { MatchService } from '../../domain/services/match.service';
import logger from '../../utils/logger';

export class MatchController {
  private matchService: MatchService;

  constructor(matchService?: MatchService) {
    this.matchService = matchService || new MatchService();
  }

  async getUserMatches(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;

      const matches = await this.matchService.getUserMatches(userId);

      return res.status(200).json({
        success: true,
        data: matches,
      });
    } catch (error: any) {
      logger.error('Get matches error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve matches',
      });
    }
  }

  async getMatchDetail(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { matchId } = req.params;

      const match = await this.matchService.getMatchDetail(userId, matchId);

      return res.status(200).json({
        success: true,
        data: match,
      });
    } catch (error: any) {
      logger.error('Get match detail error:', error);
      return res.status(404).json({
        success: false,
        message: error.message || 'Match not found',
      });
    }
  }

  async unmatch(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { matchId } = req.params;

      await this.matchService.unmatch(userId, matchId);

      return res.status(200).json({
        success: true,
        message: 'Unmatched successfully',
      });
    } catch (error: any) {
      logger.error('Unmatch error:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to unmatch',
      });
    }
  }

  async getMatchStats(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;

      const stats = await this.matchService.getMatchStats(userId);

      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      logger.error('Get match stats error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve match stats',
      });
    }
  }
}
