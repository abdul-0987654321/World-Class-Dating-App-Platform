/**
 * FLAMORAL AI Assistant - Controller
 * HTTP request handlers with authentication and validation
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { assistantService } from './assistant.service';
import { sessionMemoryService } from './session-memory.service';
import {
  messageSchema,
  streamMessageSchema,
  getHistorySchema,
  clearHistorySchema,
  feedbackSchema,
} from './assistant.validator';
import {
  AssistantRequest,
  AssistantContext,
  UserContext,
  SubscriptionTier,
  AssistantError,
  ErrorCodes,
} from './assistant.types';
import logger from '../../utils/logger';
import redisCache from '../../infrastructure/cache/redis';

// ============================================================================
// TYPES
// ============================================================================

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    premiumTier?: string;
    isVerified?: boolean;
  };
  correlationId?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get user context from database/cache for personalization
 */
async function getUserContext(userId: string): Promise<UserContext | undefined> {
  try {
    // Try to get from cache first
    const cacheKey = `user:context:${userId}`;
    const cached = await redisCache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // In production, this would fetch from the profile service/database
    // For now, return a basic context that will be populated by the auth middleware
    return undefined;
  } catch (error) {
    logger.warn('Failed to get user context', { userId, error });
    return undefined;
  }
}

/**
 * Build user context from request user
 */
function buildUserContextFromRequest(req: AuthenticatedRequest): UserContext | undefined {
  if (!req.user) return undefined;

  return {
    profile: {
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.firstName || 'there',
      lastName: req.user.lastName,
      interests: [],
      lookingFor: [],
      photos: [],
      prompts: [],
      isVerified: req.user.isVerified || false,
      premiumTier: (req.user.premiumTier as SubscriptionTier) || SubscriptionTier.FREE,
      profileCompletion: 0,
      createdAt: new Date().toISOString(),
    },
    matchCount: 0,
    conversationCount: 0,
    lastActive: new Date().toISOString(),
    appUsageSignals: {
      daysActive: 1,
      profileViewsReceived: 0,
      likesReceived: 0,
      likesSent: 0,
      matchRate: 0,
      responseRate: 0,
    },
  };
}

/**
 * Validate request body against schema
 */
function validateRequest<T>(schema: any, data: any): T {
  const { error, value } = schema.validate(data, { abortEarly: false });
  if (error) {
    const messages = error.details.map((d: any) => d.message).join(', ');
    throw new AssistantError(messages, ErrorCodes.INVALID_INPUT, 400);
  }
  return value as T;
}

// ============================================================================
// CONTROLLER
// ============================================================================

class AssistantController {
  /**
   * POST /api/v1/assistant/message
   * Send a message and get AI response
   */
  async sendMessage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const correlationId = req.correlationId || uuidv4();

    try {
      // Validate user is authenticated
      if (!req.user?.id) {
        throw new AssistantError('Authentication required', 'AUTH_REQUIRED', 401);
      }

      // Validate request
      const validatedData = validateRequest<AssistantRequest>(messageSchema, req.body);

      // Get user context for personalization
      const userContext = buildUserContextFromRequest(req) || await getUserContext(req.user.id);

      // Process message
      const response = await assistantService.processMessage(
        req.user.id,
        validatedData,
        userContext
      );

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/assistant/stream
   * Send a message and stream AI response
   */
  async streamMessage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const correlationId = req.correlationId || uuidv4();

    try {
      // Validate user is authenticated
      if (!req.user?.id) {
        throw new AssistantError('Authentication required', 'AUTH_REQUIRED', 401);
      }

      // Validate request
      const validatedData = validateRequest<AssistantRequest>(streamMessageSchema, req.body);

      // Get user context for personalization
      const userContext = buildUserContextFromRequest(req) || await getUserContext(req.user.id);

      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Correlation-ID', correlationId);

      // Stream response
      const stream = assistantService.streamMessage(req.user.id, validatedData, userContext);

      for await (const chunk of stream) {
        if (chunk.type === 'content') {
          res.write(`data: ${JSON.stringify({ type: 'content', content: chunk.content })}\n\n`);
        } else if (chunk.type === 'done') {
          res.write(`data: ${JSON.stringify({ type: 'done', sessionId: chunk.sessionId })}\n\n`);
        } else if (chunk.type === 'error') {
          res.write(`data: ${JSON.stringify({ type: 'error', error: chunk.error })}\n\n`);
        }
      }

      res.end();
    } catch (error) {
      // For streaming, send error as SSE event
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'text/event-stream');
      }
      const errorMessage = error instanceof AssistantError ? error.message : 'An error occurred';
      res.write(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`);
      res.end();
    }
  }

  /**
   * GET /api/v1/assistant/history/:sessionId
   * Get conversation history
   */
  async getHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate user is authenticated
      if (!req.user?.id) {
        throw new AssistantError('Authentication required', 'AUTH_REQUIRED', 401);
      }

      // Validate request
      const { sessionId } = validateRequest<{ sessionId: string }>(getHistorySchema, {
        sessionId: req.params.sessionId,
      });

      // Get history
      const history = await assistantService.getHistory(req.user.id, sessionId);

      res.status(200).json({
        success: true,
        data: {
          sessionId,
          messages: history,
          count: history.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/assistant/history/:sessionId
   * Clear conversation history
   */
  async clearHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate user is authenticated
      if (!req.user?.id) {
        throw new AssistantError('Authentication required', 'AUTH_REQUIRED', 401);
      }

      // Validate request
      const { sessionId } = validateRequest<{ sessionId: string }>(clearHistorySchema, {
        sessionId: req.params.sessionId,
      });

      // Clear history
      await assistantService.clearHistory(req.user.id, sessionId);

      res.status(200).json({
        success: true,
        message: 'Conversation history cleared',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/assistant/sessions
   * Get all sessions for current user
   */
  async getSessions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate user is authenticated
      if (!req.user?.id) {
        throw new AssistantError('Authentication required', 'AUTH_REQUIRED', 401);
      }

      // Get session stats
      const stats = await sessionMemoryService.getSessionStats(req.user.id);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/assistant/usage
   * Get usage statistics for current user
   */
  async getUsage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate user is authenticated
      if (!req.user?.id) {
        throw new AssistantError('Authentication required', 'AUTH_REQUIRED', 401);
      }

      // Get user tier
      const tier = (req.user.premiumTier as SubscriptionTier) || SubscriptionTier.FREE;

      // Get usage stats
      const usage = await assistantService.getUsageStats(req.user.id, tier);

      res.status(200).json({
        success: true,
        data: usage,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/assistant/feedback
   * Submit feedback for a message
   */
  async submitFeedback(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate user is authenticated
      if (!req.user?.id) {
        throw new AssistantError('Authentication required', 'AUTH_REQUIRED', 401);
      }

      // Validate request
      const validatedData = validateRequest<{
        sessionId: string;
        messageId: string;
        rating: 'helpful' | 'not_helpful';
        feedback?: string;
      }>(feedbackSchema, req.body);

      // Store feedback in Redis for analysis
      const feedbackKey = `assistant:feedback:${validatedData.sessionId}:${validatedData.messageId}`;
      await redisCache.set(
        feedbackKey,
        JSON.stringify({
          userId: req.user.id,
          ...validatedData,
          timestamp: new Date().toISOString(),
        }),
        30 * 24 * 60 * 60 // 30 days
      );

      logger.info('Assistant feedback received', {
        userId: req.user.id,
        sessionId: validatedData.sessionId,
        messageId: validatedData.messageId,
        rating: validatedData.rating,
      });

      res.status(200).json({
        success: true,
        message: 'Feedback submitted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/assistant/contexts
   * Get available assistant contexts
   */
  async getContexts(req: AuthenticatedRequest, res: Response): Promise<void> {
    const contexts = Object.values(AssistantContext).map(context => ({
      id: context,
      name: context.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      description: getContextDescription(context),
    }));

    res.status(200).json({
      success: true,
      data: contexts,
    });
  }
}

/**
 * Get human-readable description for each context
 */
function getContextDescription(context: AssistantContext): string {
  const descriptions: Record<AssistantContext, string> = {
    [AssistantContext.ONBOARDING]: 'Help getting started with FLAMORAL',
    [AssistantContext.DATING_ADVICE]: 'Dating tips and relationship guidance',
    [AssistantContext.SAFETY_GUIDANCE]: 'Safety tips and reporting concerns',
    [AssistantContext.FEATURE_HELP]: 'How to use FLAMORAL features',
    [AssistantContext.PROFILE_COACHING]: 'Profile optimization and tips',
    [AssistantContext.CONVERSATION_TIPS]: 'Conversation starters and messaging help',
    [AssistantContext.TROUBLESHOOTING]: 'Technical support and account help',
    [AssistantContext.GENERAL]: 'General questions and assistance',
  };
  return descriptions[context];
}

// Export singleton instance
export const assistantController = new AssistantController();
export default assistantController;
