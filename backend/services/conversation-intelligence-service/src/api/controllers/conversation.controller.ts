/**
 * Conversation Intelligence Controller
 * HTTP handlers for connection scoring, ghost prevention, and intent signaling
 */

import { createLogger } from '@flamoral/backend-shared';
import { Request, Response } from 'express';

import { connectionScoreService } from '../../domain/services/connection-score.service';
import { ghostPreventionService } from '../../domain/services/ghost-prevention.service';
import { intentService } from '../../domain/services/intent.service';

const logger = createLogger('conversation-controller');

// ============================================================================
// Connection Score Endpoints
// ============================================================================

/**
 * Analyze a message and update connection score
 * POST /api/v1/conversation/analyze
 */
export async function analyzeMessage(req: Request, res: Response) {
  try {
    const { conversationId, messageId, senderId, content, timestamp } = req.body;

    if (!conversationId || !messageId || !senderId || !content) {
      return res.status(400).json({
        success: false,
        error: 'conversationId, messageId, senderId, and content are required',
      });
    }

    // Calculate response time if possible
    let responseTimeMinutes = null;
    // Note: In production, this would query the last message in the conversation

    const score = await connectionScoreService.analyzeMessage({
      conversationId,
      messageId,
      senderId,
      messageContent: content,
      messageTimestamp: timestamp || new Date().toISOString(),
      isQuestion: content.includes('?'),
      wordCount: content.split(/\s+/).filter((w: string) => w.length > 0).length,
      responseTimeMinutes,
    });

    res.status(200).json({
      success: true,
      data: score,
    });
  } catch (error: any) {
    logger.error('Analyze message error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze message',
    });
  }
}

/**
 * Get connection score for a conversation
 * GET /api/v1/conversation/:conversationId/score
 */
export async function getConnectionScore(req: Request, res: Response) {
  try {
    const { conversationId } = req.params;

    const score = await connectionScoreService.getConnectionScore(conversationId);

    res.status(200).json({
      success: true,
      data: score,
    });
  } catch (error: any) {
    logger.error('Get connection score error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get connection score',
    });
  }
}

/**
 * Get full conversation analysis
 * GET /api/v1/conversation/:conversationId/analysis
 */
export async function getConversationAnalysis(req: Request, res: Response) {
  try {
    const { conversationId } = req.params;

    const analysis = await connectionScoreService.getConversationAnalysis(conversationId);

    res.status(200).json({
      success: true,
      data: analysis,
    });
  } catch (error: any) {
    logger.error('Get conversation analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get conversation analysis',
    });
  }
}

/**
 * Get suggestions for a user in a conversation
 * GET /api/v1/conversation/:conversationId/suggestions
 */
export async function getSuggestions(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { conversationId } = req.params;

    const suggestions = await connectionScoreService.getSuggestions(conversationId, userId);

    res.status(200).json({
      success: true,
      data: suggestions,
    });
  } catch (error: any) {
    logger.error('Get suggestions error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get suggestions',
    });
  }
}

/**
 * Dismiss a suggestion
 * POST /api/v1/conversation/suggestions/:suggestionId/dismiss
 */
export async function dismissSuggestion(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { suggestionId } = req.params;

    await connectionScoreService.dismissSuggestion(suggestionId, userId);

    res.status(200).json({
      success: true,
      message: 'Suggestion dismissed',
    });
  } catch (error: any) {
    logger.error('Dismiss suggestion error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to dismiss suggestion',
    });
  }
}

// ============================================================================
// Ghost Prevention Endpoints
// ============================================================================

/**
 * Assess ghost risk for a conversation
 * GET /api/v1/conversation/:conversationId/ghost-risk
 */
export async function assessGhostRisk(req: Request, res: Response) {
  try {
    const { conversationId } = req.params;

    const assessment = await ghostPreventionService.assessGhostRisk(conversationId);

    res.status(200).json({
      success: true,
      data: assessment,
    });
  } catch (error: any) {
    logger.error('Assess ghost risk error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to assess ghost risk',
    });
  }
}

/**
 * Initiate a graceful exit
 * POST /api/v1/conversation/:conversationId/graceful-exit
 */
export async function initiateGracefulExit(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { conversationId } = req.params;
    const { reason, customMessage, provideFeedback, feedbackCategories } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'reason is required',
      });
    }

    const result = await ghostPreventionService.initiateGracefulExit({
      conversationId,
      userId,
      reason,
      customMessage,
      provideFeedback: provideFeedback || false,
      feedbackCategories,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Initiate graceful exit error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to initiate graceful exit',
    });
  }
}

/**
 * Get graceful exit message templates
 * GET /api/v1/conversation/exit-templates
 */
export async function getExitTemplates(req: Request, res: Response) {
  try {
    const templates = ghostPreventionService.getExitMessageTemplates();

    res.status(200).json({
      success: true,
      data: templates,
    });
  } catch (error: any) {
    logger.error('Get exit templates error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get exit templates',
    });
  }
}

/**
 * Get aggregated feedback for a user
 * GET /api/v1/conversation/feedback
 */
export async function getAggregatedFeedback(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const feedback = await ghostPreventionService.getAggregatedFeedback(userId);

    res.status(200).json({
      success: true,
      data: feedback,
    });
  } catch (error: any) {
    logger.error('Get aggregated feedback error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get feedback',
    });
  }
}

// ============================================================================
// Intent Signaling Endpoints
// ============================================================================

/**
 * Update user intent
 * POST /api/v1/conversation/intent
 */
export async function updateIntent(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { conversationId, intent, availableTimeframe, preferredDateTypes, notes } = req.body;

    if (!intent) {
      return res.status(400).json({
        success: false,
        error: 'intent is required',
      });
    }

    const result = await intentService.updateIntent({
      userId,
      conversationId,
      intent,
      availableTimeframe,
      preferredDateTypes,
      notes,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Update intent error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update intent',
    });
  }
}

/**
 * Get user intent
 * GET /api/v1/conversation/intent
 */
export async function getIntent(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { conversationId } = req.query;

    const intent = await intentService.getIntent(userId, conversationId as string);

    res.status(200).json({
      success: true,
      data: intent,
    });
  } catch (error: any) {
    logger.error('Get intent error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get intent',
    });
  }
}

/**
 * Check intent match between users
 * GET /api/v1/conversation/:conversationId/intent-match
 */
export async function checkIntentMatch(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { conversationId } = req.params;
    const { otherUserId } = req.query;

    if (!otherUserId) {
      return res.status(400).json({
        success: false,
        error: 'otherUserId is required',
      });
    }

    const match = await intentService.checkIntentMatch(
      userId,
      otherUserId as string,
      conversationId
    );

    res.status(200).json({
      success: true,
      data: match,
    });
  } catch (error: any) {
    logger.error('Check intent match error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check intent match',
    });
  }
}

/**
 * Get available intent options
 * GET /api/v1/conversation/intent-options
 */
export async function getIntentOptions(req: Request, res: Response) {
  try {
    const options = intentService.getIntentOptions();

    res.status(200).json({
      success: true,
      data: options,
    });
  } catch (error: any) {
    logger.error('Get intent options error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get intent options',
    });
  }
}

/**
 * Infer intent from conversation behavior
 * GET /api/v1/conversation/:conversationId/infer-intent
 */
export async function inferIntent(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { conversationId } = req.params;

    const inferredIntent = await intentService.inferIntent(userId, conversationId);

    res.status(200).json({
      success: true,
      data: { inferredIntent },
    });
  } catch (error: any) {
    logger.error('Infer intent error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to infer intent',
    });
  }
}
