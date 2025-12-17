import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { IcebreakerService } from '../../services/icebreaker.service';
import { GenerateIcebreakerDto } from '../../dtos';

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
      userId: req.userId!,
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
    console.error('[IcebreakerController] Generate failed:', error.message);
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
    console.error('[IcebreakerController] Mark used failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
