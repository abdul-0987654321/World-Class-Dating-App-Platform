import { Response } from 'express';
import { createLogger } from '@flamoral/backend-shared';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ReplyAssistantService } from '../../services/reply-assistant.service';
import { GenerateReplyDto } from '../../dtos';

const logger = createLogger('automation-service:reply-assistant-controller');
const replyAssistantService = new ReplyAssistantService();

/**
 * Generate reply suggestions
 */
export const generateReplies = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { conversationId, messageHistory, tone, maxLength, includeEmoji } = req.body;

    const dto: GenerateReplyDto = {
      userId: req.userId!,
      conversationId,
      messageHistory,
      tone,
      maxLength,
      includeEmoji,
    };

    const result = await replyAssistantService.generateReplies(dto);

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
