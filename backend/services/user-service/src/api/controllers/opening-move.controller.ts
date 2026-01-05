import { Response } from 'express';

import { OpeningMoveService } from '../../domain/services/opening-move.service';
import logger from '../../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

export class OpeningMoveController {
  private service: OpeningMoveService;

  constructor(service?: OpeningMoveService) {
    this.service = service || new OpeningMoveService();
  }

  // GET /api/users/me/opening-moves
  async getOpeningMoves(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.userId;
      const moves = await this.service.getUserOpeningMoves(userId);

      return res.status(200).json({
        success: true,
        data: moves,
      });
    } catch (error: any) {
      logger.error('Get opening moves error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch opening moves',
      });
    }
  }

  // POST /api/users/me/opening-moves
  async createOpeningMove(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.userId;
      const move = await this.service.createOpeningMove(userId, req.body);

      return res.status(201).json({
        success: true,
        message: 'Opening move created successfully',
        data: move,
      });
    } catch (error: any) {
      logger.error('Create opening move error:', error);

      const statusCode = error.message.includes('can only have') ? 400 : 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to create opening move',
      });
    }
  }

  // PUT /api/users/me/opening-moves/:id
  async updateOpeningMove(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.userId;
      const { id } = req.params;

      const move = await this.service.updateOpeningMove(id, userId, req.body);

      return res.status(200).json({
        success: true,
        message: 'Opening move updated successfully',
        data: move,
      });
    } catch (error: any) {
      logger.error('Update opening move error:', error);

      const statusCode = error.message.includes('not found')
        ? 404
        : error.message.includes('can only')
          ? 403
          : 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to update opening move',
      });
    }
  }

  // DELETE /api/users/me/opening-moves/:id
  async deleteOpeningMove(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.userId;
      const { id } = req.params;

      await this.service.deleteOpeningMove(id, userId);

      return res.status(200).json({
        success: true,
        message: 'Opening move deleted successfully',
      });
    } catch (error: any) {
      logger.error('Delete opening move error:', error);

      const statusCode = error.message.includes('not found')
        ? 404
        : error.message.includes('can only')
          ? 403
          : 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to delete opening move',
      });
    }
  }

  // PUT /api/users/me/opening-moves/reorder
  async reorderOpeningMoves(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.userId;
      const { orderedIds } = req.body;

      if (!Array.isArray(orderedIds)) {
        return res.status(400).json({
          success: false,
          message: 'orderedIds must be an array',
        });
      }

      const moves = await this.service.reorderOpeningMoves(userId, orderedIds);

      return res.status(200).json({
        success: true,
        message: 'Opening moves reordered successfully',
        data: moves,
      });
    } catch (error: any) {
      logger.error('Reorder opening moves error:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to reorder opening moves',
      });
    }
  }

  // GET /api/opening-move-templates
  async getAllTemplates(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const templates = await this.service.getAllTemplates();

      return res.status(200).json({
        success: true,
        data: templates,
      });
    } catch (error: any) {
      logger.error('Get templates error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch templates',
      });
    }
  }

  // GET /api/opening-move-templates/:category
  async getTemplatesByCategory(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { category } = req.params;
      const templates = await this.service.getTemplatesByCategory(category as any);

      return res.status(200).json({
        success: true,
        data: templates,
      });
    } catch (error: any) {
      logger.error('Get templates by category error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch templates',
      });
    }
  }

  // POST /api/matches/:matchId/respond
  async respondToOpeningMove(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.userId;
      const { matchId } = req.params;
      const { opening_move_id, response_text } = req.body;

      const response = await this.service.createOpeningMoveResponse(userId, {
        match_id: matchId,
        opening_move_id,
        response_text,
      });

      return res.status(201).json({
        success: true,
        message: 'Response submitted successfully',
        data: response,
      });
    } catch (error: any) {
      logger.error('Respond to opening move error:', error);

      const statusCode = error.message.includes('already responded')
        ? 409
        : error.message.includes('not found')
          ? 404
          : 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to submit response',
      });
    }
  }

  // GET /api/matches/:matchId/response
  async getMatchResponse(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { matchId } = req.params;
      const response = await this.service.getMatchResponse(matchId);

      if (!response) {
        return res.status(404).json({
          success: false,
          message: 'No response found for this match',
        });
      }

      return res.status(200).json({
        success: true,
        data: response,
      });
    } catch (error: any) {
      logger.error('Get match response error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch response',
      });
    }
  }
}
