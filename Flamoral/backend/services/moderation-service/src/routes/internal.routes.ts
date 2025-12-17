import { Router, Request, Response } from 'express';
import { authenticateService } from '../middleware/service-auth.middleware';
import moderationService from '../services/moderation.service';
import db from '../infrastructure/database/connection';
import { ContentType } from '../types';

const router = Router();

// All internal routes require service authentication
router.use(authenticateService);

/**
 * Internal endpoint: Moderate content (photo, profile, message)
 * POST /api/internal/moderation/moderate
 *
 * Request body:
 * {
 *   contentId: string;
 *   contentType: 'photo' | 'profile' | 'message' | 'bio';
 *   content: string | { url: string };
 *   userId: string;
 *   priority?: 'low' | 'medium' | 'high';
 * }
 */
router.post('/moderate', async (req: Request, res: Response) => {
  try {
    const { contentId, contentType, content, userId, priority = 'medium' } = req.body;

    // Validate required fields
    if (!contentId || !contentType || !content || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        code: 'MISSING_REQUIRED_FIELDS',
        message: 'contentId, contentType, content, and userId are required',
      });
    }

    // Validate content type
    const validContentTypes = ['photo', 'profile', 'message', 'bio'];
    if (!validContentTypes.includes(contentType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid content type',
        code: 'INVALID_CONTENT_TYPE',
        message: `contentType must be one of: ${validContentTypes.join(', ')}`,
      });
    }

    // Route to appropriate moderation method based on content type
    let moderationResult;

    if (contentType === 'photo') {
      // Image moderation
      const imageUrl = typeof content === 'object' ? content.url : content;
      moderationResult = await moderationService.moderateImage({
        contentId,
        contentType: ContentType.IMAGE,
        userId,
        imageUrl,
      });
    } else {
      // Text moderation (profile, message, bio)
      const text = typeof content === 'string' ? content : JSON.stringify(content);
      moderationResult = await moderationService.moderateText({
        contentId,
        contentType: contentType as any,
        userId,
        text,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Content moderated successfully',
      data: {
        contentId: moderationResult.contentId,
        contentType: moderationResult.contentType,
        userId: moderationResult.userId,
        status: moderationResult.status,
        flags: moderationResult.detectedViolations || [],
        score: 1 - (moderationResult.overallRiskScore || 0), // Convert risk to safety score
        moderatedAt: moderationResult.moderatedAt,
        moderator: 'ai-moderator',
        action: moderationResult.action,
        recommendations: moderationResult.recommendations,
      },
    });
  } catch (error: any) {
    console.error('[InternalAPI] Moderate content error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to moderate content',
      code: 'MODERATION_FAILED',
      message: error.message || 'An error occurred while moderating content',
    });
  }
});

/**
 * Internal endpoint: Get moderation status for content
 * GET /api/internal/moderation/status/:contentId
 */
router.get('/status/:contentId', async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;

    // Get moderation status from database
    const moderationLog = await db('moderation_logs')
      .where('content_id', contentId)
      .orderBy('created_at', 'desc')
      .first();

    if (!moderationLog) {
      return res.status(404).json({
        success: false,
        error: 'Moderation record not found',
        code: 'NOT_FOUND',
        message: `No moderation record found for content ${contentId}`,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        contentId: moderationLog.content_id,
        status: moderationLog.status,
        action: moderationLog.action,
        riskScore: moderationLog.risk_score,
        violations: moderationLog.violations || [],
        moderatedAt: moderationLog.moderated_at,
        moderator: moderationLog.moderated_by || 'ai-moderator',
        reviewedAt: moderationLog.reviewed_at,
        reviewedBy: moderationLog.reviewed_by,
        reviewNotes: moderationLog.review_notes,
      },
    });
  } catch (error: any) {
    console.error('[InternalAPI] Get moderation status error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get moderation status',
      code: 'GET_STATUS_FAILED',
      message: error.message || 'An error occurred while getting moderation status',
    });
  }
});

/**
 * Internal endpoint: Flag content for review
 * POST /api/internal/moderation/flag
 *
 * Request body:
 * {
 *   contentId: string;
 *   contentType: 'photo' | 'profile' | 'message' | 'bio';
 *   userId: string;
 *   reason: string;
 *   reportedBy?: string;
 * }
 */
router.post('/flag', async (req: Request, res: Response) => {
  try {
    const { contentId, contentType, userId, reason, reportedBy } = req.body;

    // Validate required fields
    if (!contentId || !contentType || !userId || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        code: 'MISSING_REQUIRED_FIELDS',
        message: 'contentId, contentType, userId, and reason are required',
      });
    }

    // Add to moderation queue for manual review
    const { v4: uuidv4 } = await import('uuid');
    const flagId = uuidv4();

    await db('moderation_queue').insert({
      id: flagId,
      content_id: contentId,
      content_type: contentType,
      user_id: userId,
      risk_score: 0.5, // Default risk score for flagged content
      violations: [reason],
      status: 'flagged',
      priority: 'medium',
      flagged_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    }).onConflict('content_id').merge({
      violations: db.raw("array_append(violations, ?)", [reason]),
      updated_at: new Date(),
    });

    // Also log the flag report
    await db('moderation_logs').insert({
      id: uuidv4(),
      content_id: contentId,
      content_type: contentType,
      user_id: userId,
      status: 'flagged',
      action: 'user_reported',
      risk_score: 0.5,
      violations: [reason],
      recommendations: [],
      moderated_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: 'Content flagged for review',
      data: {
        flagId,
        contentId,
        contentType,
        userId,
        reason,
        reportedBy,
        flaggedAt: new Date(),
        status: 'pending_review',
      },
    });
  } catch (error: any) {
    console.error('[InternalAPI] Flag content error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to flag content',
      code: 'FLAG_CONTENT_FAILED',
      message: error.message || 'An error occurred while flagging content',
    });
  }
});

/**
 * Internal endpoint: Bulk moderate content
 * POST /api/internal/moderation/moderate-bulk
 *
 * Request body:
 * {
 *   items: Array<{
 *     contentId: string;
 *     contentType: 'photo' | 'profile' | 'message' | 'bio';
 *     content: string | { url: string };
 *     userId: string;
 *   }>;
 * }
 */
router.post('/moderate-bulk', async (req: Request, res: Response) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        code: 'INVALID_REQUEST',
        message: 'items must be a non-empty array',
      });
    }

    // Process each item through moderation service
    const results = await Promise.all(
      items.map(async (item: any) => {
        try {
          let moderationResult;

          if (item.contentType === 'photo') {
            const imageUrl = typeof item.content === 'object' ? item.content.url : item.content;
            moderationResult = await moderationService.moderateImage({
              contentId: item.contentId,
              contentType: ContentType.IMAGE,
              userId: item.userId,
              imageUrl,
            });
          } else {
            const text = typeof item.content === 'string' ? item.content : JSON.stringify(item.content);
            moderationResult = await moderationService.moderateText({
              contentId: item.contentId,
              contentType: item.contentType,
              userId: item.userId,
              text,
            });
          }

          return {
            contentId: item.contentId,
            status: moderationResult.status,
            action: moderationResult.action,
            riskScore: moderationResult.overallRiskScore,
            moderatedAt: moderationResult.moderatedAt,
            success: true,
          };
        } catch (error: any) {
          return {
            contentId: item.contentId,
            status: 'error',
            error: error.message,
            success: false,
          };
        }
      })
    );

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return res.status(200).json({
      success: true,
      message: `Moderated ${successful} items successfully, ${failed} failed`,
      data: {
        total: items.length,
        successful,
        failed,
        results,
      },
    });
  } catch (error: any) {
    console.error('[InternalAPI] Bulk moderate error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to bulk moderate content',
      code: 'BULK_MODERATION_FAILED',
      message: error.message || 'An error occurred while bulk moderating content',
    });
  }
});

/**
 * Internal endpoint: Get user moderation history
 * GET /api/internal/moderation/users/:userId/history
 *
 * Query params:
 * - limit: number (default: 50)
 * - offset: number (default: 0)
 */
router.get('/users/:userId/history', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // Get user's moderation history from database
    const history = await db('moderation_logs')
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const totalResult = await db('moderation_logs')
      .where('user_id', userId)
      .count('id as count')
      .first();
    const total = parseInt(totalResult?.count as string) || 0;

    return res.status(200).json({
      success: true,
      data: {
        userId,
        history: history.map((log: any) => ({
          id: log.id,
          contentId: log.content_id,
          contentType: log.content_type,
          status: log.status,
          action: log.action,
          riskScore: log.risk_score,
          violations: log.violations || [],
          moderatedAt: log.moderated_at,
          createdAt: log.created_at,
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
    });
  } catch (error: any) {
    console.error('[InternalAPI] Get user moderation history error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get user moderation history',
      code: 'GET_HISTORY_FAILED',
      message: error.message || 'An error occurred while getting user moderation history',
    });
  }
});

/**
 * Internal endpoint: Check if user is banned/restricted
 * GET /api/internal/moderation/users/:userId/restrictions
 */
router.get('/users/:userId/restrictions', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Check user restrictions using moderation service
    const restrictionStatus = await moderationService.isUserRestricted(userId);
    const moderationRecord = await moderationService.getUserModerationStatus(userId);

    // Get active violations
    const violations = await db('user_violations')
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .limit(10);

    return res.status(200).json({
      success: true,
      data: {
        userId,
        isBanned: moderationRecord?.permanentlyBanned || false,
        isRestricted: restrictionStatus.restricted,
        restrictionReason: restrictionStatus.reason,
        restrictionEndsAt: restrictionStatus.endsAt || null,
        status: moderationRecord?.status || 'active',
        totalViolations: moderationRecord?.totalViolations || 0,
        severeViolations: moderationRecord?.severeViolations || 0,
        warningsIssued: moderationRecord?.warningsIssued || 0,
        suspensionCount: moderationRecord?.suspensionCount || 0,
        recentViolations: violations.map((v: any) => ({
          type: v.violation_type,
          severity: v.severity,
          contentType: v.content_type,
          createdAt: v.created_at,
        })),
      },
    });
  } catch (error: any) {
    console.error('[InternalAPI] Get user restrictions error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get user restrictions',
      code: 'GET_RESTRICTIONS_FAILED',
      message: error.message || 'An error occurred while getting user restrictions',
    });
  }
});

export default router;
