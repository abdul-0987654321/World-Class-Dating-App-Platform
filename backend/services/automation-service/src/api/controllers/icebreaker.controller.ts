import { createLogger } from '@flamoral/backend-shared';
import { Response } from 'express';

import { GenerateIcebreakerDto } from '../../dtos';
import { IcebreakerService } from '../../services/icebreaker.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

const logger = createLogger('automation-service:icebreaker-controller');
const icebreakerService = new IcebreakerService();

/**
 * Generate icebreaker suggestions
 */
export const generateIcebreakers = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { matchId, matchUserId, category, tone, includeEmoji, maxLength } = req.body;

    const dto: GenerateIcebreakerDto = {
      userId: req.userId,
      matchUserId,
      matchId,
      category,
      tone,
      includeEmoji,
      maxLength,
    };

    const result = await icebreakerService.generateIcebreakers(dto);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Generate failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Mark icebreaker as used
 */
export const markIcebreakerUsed = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { suggestionId } = req.params;

    await icebreakerService.markAsUsed(suggestionId);

    res.json({
      success: true,
      message: 'Icebreaker marked as used',
    });
  } catch (error: any) {
    logger.error('Mark used failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
