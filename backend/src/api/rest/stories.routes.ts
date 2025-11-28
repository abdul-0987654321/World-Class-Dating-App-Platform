/**
 * Stories API Routes
 * Stories, highlights, views, reactions, replies, and templates
 */

import { Router, Request, Response, NextFunction } from 'express';
import { storiesService } from '../../services/core/Stories.service';
import { logger } from '../../utils/logger';

const router = Router();

// Middleware to extract user ID (in production, from JWT)
const getUserId = (req: Request): string => {
  return (req as any).user?.id || req.headers['x-user-id'] as string || 'demo_user';
};

// ============================================================
// STORY CRUD
// ============================================================

/**
 * @swagger
 * /api/stories:
 *   post:
 *     summary: Create a new story
 *     tags: [Stories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mediaType
 *               - mediaUrl
 *             properties:
 *               mediaType:
 *                 type: string
 *                 enum: [photo, video]
 *               mediaUrl:
 *                 type: string
 *               thumbnailUrl:
 *                 type: string
 *               caption:
 *                 type: string
 *               location:
 *                 type: string
 *               visibility:
 *                 type: string
 *                 enum: [public, matches_only, close_friends]
 *     responses:
 *       201:
 *         description: Story created successfully
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const story = await storiesService.createStory({
      userId,
      mediaType: req.body.mediaType,
      mediaUrl: req.body.mediaUrl,
      thumbnailUrl: req.body.thumbnailUrl,
      caption: req.body.caption,
      location: req.body.location,
      locationCoordinates: req.body.locationCoordinates,
      mentions: req.body.mentions,
      hashtags: req.body.hashtags,
      musicTrackId: req.body.musicTrackId,
      musicTrackName: req.body.musicTrackName,
      stickers: req.body.stickers,
      textOverlays: req.body.textOverlays,
      filters: req.body.filters,
      durationSeconds: req.body.durationSeconds,
      visibility: req.body.visibility,
    });

    res.status(201).json({
      success: true,
      data: story,
    });
  } catch (error: any) {
    if (error.message === 'Daily story limit reached') {
      return res.status(429).json({
        success: false,
        error: { message: 'Daily story limit reached', code: 'LIMIT_REACHED' },
      });
    }
    next(error);
  }
});

/**
 * @swagger
 * /api/stories/{storyId}:
 *   get:
 *     summary: Get a specific story
 *     tags: [Stories]
 *     parameters:
 *       - in: path
 *         name: storyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Story retrieved successfully
 */
router.get('/:storyId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const story = await storiesService.getStory(req.params.storyId, userId);

    if (!story) {
      return res.status(404).json({
        success: false,
        error: { message: 'Story not found or expired', code: 'NOT_FOUND' },
      });
    }

    res.json({
      success: true,
      data: story,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/stories/{storyId}:
 *   delete:
 *     summary: Delete a story
 *     tags: [Stories]
 */
router.delete('/:storyId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const success = await storiesService.deleteStory(req.params.storyId, userId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: { message: 'Story not found or unauthorized', code: 'NOT_FOUND' },
      });
    }

    res.json({
      success: true,
      message: 'Story deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/stories/{storyId}/archive:
 *   post:
 *     summary: Archive a story (save for highlights)
 *     tags: [Stories]
 */
router.post('/:storyId/archive', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const success = await storiesService.archiveStory(req.params.storyId, userId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: { message: 'Story not found or unauthorized', code: 'NOT_FOUND' },
      });
    }

    res.json({
      success: true,
      message: 'Story archived successfully',
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// STORY FEED
// ============================================================

/**
 * @swagger
 * /api/stories/feed:
 *   get:
 *     summary: Get story feed (story rings for matches)
 *     tags: [Stories]
 *     responses:
 *       200:
 *         description: Story feed retrieved successfully
 */
router.get('/feed/list', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    // In production, get match IDs from matching service
    const matchIds = (req.query.matchIds as string)?.split(',') || [];

    const feed = await storiesService.getStoryFeed(userId, matchIds);

    res.json({
      success: true,
      data: feed,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/stories/user/{userId}:
 *   get:
 *     summary: Get all stories from a specific user
 *     tags: [Stories]
 */
router.get('/user/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const viewerId = getUserId(req);
    const stories = await storiesService.getUserStoriesForViewer(req.params.userId, viewerId);

    res.json({
      success: true,
      data: stories,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/stories/my:
 *   get:
 *     summary: Get current user's stories
 *     tags: [Stories]
 */
router.get('/my/list', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const stories = await storiesService.getUserStories(userId);

    res.json({
      success: true,
      data: stories,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// STORY VIEWS
// ============================================================

/**
 * @swagger
 * /api/stories/{storyId}/view:
 *   post:
 *     summary: Record a story view
 *     tags: [Stories]
 */
router.post('/:storyId/view', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const success = await storiesService.viewStory(
      req.params.storyId,
      userId,
      req.body.viewDurationSeconds,
      req.body.viewedCompletely
    );

    res.json({
      success,
      message: success ? 'View recorded' : 'Unable to record view',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/stories/{storyId}/viewers:
 *   get:
 *     summary: Get viewers of a story (owner only)
 *     tags: [Stories]
 */
router.get('/:storyId/viewers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const viewers = await storiesService.getStoryViewers(req.params.storyId, userId);

    res.json({
      success: true,
      data: viewers,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// STORY REACTIONS
// ============================================================

/**
 * @swagger
 * /api/stories/{storyId}/reaction:
 *   post:
 *     summary: React to a story
 *     tags: [Stories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reactionType
 *             properties:
 *               reactionType:
 *                 type: string
 *                 enum: [fire, heart, laugh, wow, sad, clap, eyes, hundred]
 */
router.post('/:storyId/reaction', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const reaction = await storiesService.reactToStory(
      req.params.storyId,
      userId,
      req.body.reactionType
    );

    if (!reaction) {
      return res.status(400).json({
        success: false,
        error: { message: 'Unable to react to story', code: 'REACTION_FAILED' },
      });
    }

    res.json({
      success: true,
      data: reaction,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/stories/{storyId}/reaction:
 *   delete:
 *     summary: Remove reaction from a story
 *     tags: [Stories]
 */
router.delete('/:storyId/reaction', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const success = await storiesService.removeReaction(req.params.storyId, userId);

    res.json({
      success,
      message: success ? 'Reaction removed' : 'No reaction to remove',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/stories/{storyId}/reactions:
 *   get:
 *     summary: Get reactions for a story
 *     tags: [Stories]
 */
router.get('/:storyId/reactions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reactions = await storiesService.getStoryReactions(req.params.storyId);

    res.json({
      success: true,
      data: reactions,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// STORY REPLIES
// ============================================================

/**
 * @swagger
 * /api/stories/{storyId}/reply:
 *   post:
 *     summary: Reply to a story
 *     tags: [Stories]
 */
router.post('/:storyId/reply', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const reply = await storiesService.replyToStory(
      req.params.storyId,
      userId,
      req.body.message,
      req.body.mediaUrl,
      req.body.mediaType
    );

    if (!reply) {
      return res.status(400).json({
        success: false,
        error: { message: 'Unable to reply to story', code: 'REPLY_FAILED' },
      });
    }

    res.status(201).json({
      success: true,
      data: reply,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/stories/{storyId}/replies:
 *   get:
 *     summary: Get replies for a story (owner only)
 *     tags: [Stories]
 */
router.get('/:storyId/replies', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const replies = await storiesService.getStoryReplies(req.params.storyId, userId);

    res.json({
      success: true,
      data: replies,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/stories/replies/{replyId}/read:
 *   post:
 *     summary: Mark a story reply as read
 *     tags: [Stories]
 */
router.post('/replies/:replyId/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const success = await storiesService.markReplyAsRead(req.params.replyId, userId);

    res.json({
      success,
      message: success ? 'Reply marked as read' : 'Unable to mark as read',
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// HIGHLIGHTS
// ============================================================

/**
 * @swagger
 * /api/stories/highlights:
 *   post:
 *     summary: Create a new highlight
 *     tags: [Highlights]
 */
router.post('/highlights', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const highlight = await storiesService.createHighlight({
      userId,
      title: req.body.title,
      coverImageUrl: req.body.coverImageUrl,
      emoji: req.body.emoji,
      storyIds: req.body.storyIds,
    });

    res.status(201).json({
      success: true,
      data: highlight,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/stories/highlights/my:
 *   get:
 *     summary: Get current user's highlights
 *     tags: [Highlights]
 */
router.get('/highlights/my', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const highlights = await storiesService.getUserHighlights(userId);

    res.json({
      success: true,
      data: highlights,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/stories/highlights/user/{userId}:
 *   get:
 *     summary: Get a user's highlights
 *     tags: [Highlights]
 */
router.get('/highlights/user/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const highlights = await storiesService.getUserHighlights(req.params.userId);

    res.json({
      success: true,
      data: highlights,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/stories/highlights/{highlightId}:
 *   get:
 *     summary: Get a specific highlight with stories
 *     tags: [Highlights]
 */
router.get('/highlights/:highlightId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const highlight = await storiesService.getHighlight(req.params.highlightId);
    if (!highlight) {
      return res.status(404).json({
        success: false,
        error: { message: 'Highlight not found', code: 'NOT_FOUND' },
      });
    }

    const stories = await storiesService.getHighlightStories(req.params.highlightId);

    res.json({
      success: true,
      data: {
        ...highlight,
        stories,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/stories/highlights/{highlightId}:
 *   patch:
 *     summary: Update a highlight
 *     tags: [Highlights]
 */
router.patch('/highlights/:highlightId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const highlight = await storiesService.updateHighlight(
      req.params.highlightId,
      userId,
      {
        title: req.body.title,
        coverImageUrl: req.body.coverImageUrl,
        emoji: req.body.emoji,
      }
    );

    if (!highlight) {
      return res.status(404).json({
        success: false,
        error: { message: 'Highlight not found or unauthorized', code: 'NOT_FOUND' },
      });
    }

    res.json({
      success: true,
      data: highlight,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/stories/highlights/{highlightId}:
 *   delete:
 *     summary: Delete a highlight
 *     tags: [Highlights]
 */
router.delete('/highlights/:highlightId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const success = await storiesService.deleteHighlight(req.params.highlightId, userId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: { message: 'Highlight not found or unauthorized', code: 'NOT_FOUND' },
      });
    }

    res.json({
      success: true,
      message: 'Highlight deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/stories/highlights/{highlightId}/stories:
 *   post:
 *     summary: Add a story to a highlight
 *     tags: [Highlights]
 */
router.post('/highlights/:highlightId/stories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const success = await storiesService.addStoryToHighlight(
      req.params.highlightId,
      req.body.storyId,
      userId
    );

    if (!success) {
      return res.status(400).json({
        success: false,
        error: { message: 'Unable to add story to highlight', code: 'ADD_FAILED' },
      });
    }

    res.json({
      success: true,
      message: 'Story added to highlight',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/stories/highlights/{highlightId}/stories/{storyId}:
 *   delete:
 *     summary: Remove a story from a highlight
 *     tags: [Highlights]
 */
router.delete('/highlights/:highlightId/stories/:storyId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const success = await storiesService.removeStoryFromHighlight(
      req.params.highlightId,
      req.params.storyId,
      userId
    );

    if (!success) {
      return res.status(400).json({
        success: false,
        error: { message: 'Unable to remove story from highlight', code: 'REMOVE_FAILED' },
      });
    }

    res.json({
      success: true,
      message: 'Story removed from highlight',
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// CLOSE FRIENDS
// ============================================================

/**
 * @swagger
 * /api/stories/close-friends:
 *   get:
 *     summary: Get close friends list
 *     tags: [Close Friends]
 */
router.get('/close-friends', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const friends = await storiesService.getCloseFriends(userId);

    res.json({
      success: true,
      data: friends,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/stories/close-friends/{friendId}:
 *   post:
 *     summary: Add user to close friends
 *     tags: [Close Friends]
 */
router.post('/close-friends/:friendId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const success = await storiesService.addCloseFriend(userId, req.params.friendId);

    res.json({
      success,
      message: 'Added to close friends',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/stories/close-friends/{friendId}:
 *   delete:
 *     summary: Remove user from close friends
 *     tags: [Close Friends]
 */
router.delete('/close-friends/:friendId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const success = await storiesService.removeCloseFriend(userId, req.params.friendId);

    res.json({
      success,
      message: success ? 'Removed from close friends' : 'User was not in close friends',
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// TEMPLATES
// ============================================================

/**
 * @swagger
 * /api/stories/templates:
 *   get:
 *     summary: Get available story templates
 *     tags: [Templates]
 */
router.get('/templates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = req.query.category as string | undefined;
    const templates = await storiesService.getTemplates(category);

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/stories/templates/{templateId}/use:
 *   post:
 *     summary: Use a story template
 *     tags: [Templates]
 */
router.post('/templates/:templateId/use', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    // In production, check if user is premium from user service
    const isPremiumUser = req.body.isPremium || false;

    const success = await storiesService.useTemplate(req.params.templateId, userId, isPremiumUser);

    res.json({
      success,
      message: 'Template usage recorded',
    });
  } catch (error: any) {
    if (error.message === 'Premium template requires premium subscription') {
      return res.status(403).json({
        success: false,
        error: { message: error.message, code: 'PREMIUM_REQUIRED' },
      });
    }
    next(error);
  }
});

// ============================================================
// ANALYTICS
// ============================================================

/**
 * @swagger
 * /api/stories/{storyId}/analytics:
 *   get:
 *     summary: Get analytics for a story (owner only)
 *     tags: [Analytics]
 */
router.get('/:storyId/analytics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const analytics = await storiesService.getStoryAnalytics(req.params.storyId, userId);

    if (!analytics) {
      return res.status(404).json({
        success: false,
        error: { message: 'Analytics not found or unauthorized', code: 'NOT_FOUND' },
      });
    }

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/stories/analytics/summary:
 *   get:
 *     summary: Get story analytics summary for current user
 *     tags: [Analytics]
 */
router.get('/analytics/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const summary = await storiesService.getUserStoryAnalyticsSummary(userId);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
