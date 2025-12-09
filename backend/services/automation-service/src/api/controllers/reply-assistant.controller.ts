import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ReplyAssistantService } from '../../services/reply-assistant.service';
import { GenerateReplyDto } from '../../dtos';

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
    console.error('[ReplyAssistantController] Generate failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
