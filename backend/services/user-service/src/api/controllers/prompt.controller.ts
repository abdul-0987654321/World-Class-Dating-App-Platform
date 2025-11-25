import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { PromptService } from '../../domain/services/prompt.service';
import logger from '../../utils/logger';

export class PromptController {
  private promptService: PromptService;

  constructor(promptService?: PromptService) {
    this.promptService = promptService || new PromptService();
  }

  async getAvailablePrompts(_req: AuthRequest, res: Response): Promise<Response> {
    try {
      const prompts = await this.promptService.getAvailablePrompts();

      return res.status(200).json({
        success: true,
        data: prompts,
      });
    } catch (error: any) {
      logger.error('Get prompts error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve prompts',
      });
    }
  }

  async getUserPrompts(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const userPrompts = await this.promptService.getUserPrompts(userId);

      return res.status(200).json({
        success: true,
        data: userPrompts,
      });
    } catch (error: any) {
      logger.error('Get user prompts error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve user prompts',
      });
    }
  }

  async addUserPrompt(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { prompt_id, answer } = req.body;

      if (!prompt_id || !answer) {
        return res.status(400).json({
          success: false,
          message: 'prompt_id and answer are required',
        });
      }

      const userPrompt = await this.promptService.addUserPrompt(userId, prompt_id, answer);

      return res.status(201).json({
        success: true,
        message: 'Prompt answer added successfully',
        data: userPrompt,
      });
    } catch (error: any) {
      logger.error('Add user prompt error:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to add prompt answer',
      });
    }
  }

  async updateUserPrompt(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { promptId } = req.params;
      const { answer } = req.body;

      if (!answer) {
        return res.status(400).json({
          success: false,
          message: 'answer is required',
        });
      }

      const userPrompt = await this.promptService.updateUserPrompt(userId, promptId, answer);

      return res.status(200).json({
        success: true,
        message: 'Prompt answer updated successfully',
        data: userPrompt,
      });
    } catch (error: any) {
      logger.error('Update user prompt error:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to update prompt answer',
      });
    }
  }

  async deleteUserPrompt(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { promptId } = req.params;

      await this.promptService.deleteUserPrompt(userId, promptId);

      return res.status(200).json({
        success: true,
        message: 'Prompt answer deleted successfully',
      });
    } catch (error: any) {
      logger.error('Delete user prompt error:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to delete prompt answer',
      });
    }
  }
}
