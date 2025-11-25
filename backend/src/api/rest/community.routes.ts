/**
 * Community API Routes
 * Interest-based communities, posts, events
 */

import { Router, Request, Response, NextFunction } from 'express';
import { communityService } from '../../services/core/Community.service';
import { logger } from '../../utils/logger';

const router = Router();

// Middleware to extract user ID
const getUserId = (req: Request): string => {
  return (req as any).user?.id || req.headers['x-user-id'] as string || 'demo_user';
};

/**
 * @swagger
 * /api/communities:
 *   get:
 *     summary: Get all communities
 *     tags: [Communities]
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, isPublic, isPremium, search } = req.query;

    const communities = await communityService.getAllCommunities({
      category: category as any,
      isPublic: isPublic === 'true' ? true : isPublic === 'false' ? false : undefined,
      isPremium: isPremium === 'true' ? true : isPremium === 'false' ? false : undefined,
      searchQuery: search as string,
    });

    res.json({
      success: true,
      data: communities
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/communities/{communityId}:
 *   get:
 *     summary: Get community by ID
 *     tags: [Communities]
 */
router.get('/:communityId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { communityId } = req.params;
    const community = await communityService.getCommunity(communityId);

    if (!community) {
      return res.status(404).json({
        success: false,
        error: { message: 'Community not found', code: 'NOT_FOUND' }
      });
    }

    res.json({
      success: true,
      data: community
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/communities/{communityId}/join:
 *   post:
 *     summary: Join a community
 *     tags: [Communities]
 */
router.post('/:communityId/join', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { communityId } = req.params;

    const result = await communityService.joinCommunity(userId, communityId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { message: result.error, code: 'JOIN_FAILED' }
      });
    }

    res.json({
      success: true,
      data: { message: 'Successfully joined community' }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/communities/{communityId}/leave:
 *   post:
 *     summary: Leave a community
 *     tags: [Communities]
 */
router.post('/:communityId/leave', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { communityId } = req.params;

    const result = await communityService.leaveCommunity(userId, communityId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { message: result.error, code: 'LEAVE_FAILED' }
      });
    }

    res.json({
      success: true,
      data: { message: 'Successfully left community' }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/communities/me:
 *   get:
 *     summary: Get user's communities
 *     tags: [Communities]
 */
router.get('/user/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const communities = await communityService.getUserCommunities(userId);

    res.json({
      success: true,
      data: communities
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/communities/{communityId}/members:
 *   get:
 *     summary: Get community members
 *     tags: [Communities]
 */
router.get('/:communityId/members', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { communityId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await communityService.getCommunityMembers(communityId, limit, offset);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/communities/{communityId}/posts:
 *   get:
 *     summary: Get community posts
 *     tags: [Communities]
 */
router.get('/:communityId/posts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { communityId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await communityService.getCommunityPosts(communityId, limit, offset);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/communities/{communityId}/posts:
 *   post:
 *     summary: Create a post in community
 *     tags: [Communities]
 */
router.post('/:communityId/posts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { communityId } = req.params;
    const { content, type = 'text', mediaUrls } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: { message: 'Content is required', code: 'MISSING_CONTENT' }
      });
    }

    const result = await communityService.createPost(communityId, userId, content, type, mediaUrls);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { message: result.error, code: 'POST_FAILED' }
      });
    }

    res.status(201).json({
      success: true,
      data: result.post
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/communities/posts/{postId}/like:
 *   post:
 *     summary: Like a post
 *     tags: [Communities]
 */
router.post('/posts/:postId/like', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { postId } = req.params;

    const result = await communityService.likePost(postId, userId);

    res.json({
      success: true,
      data: { likeCount: result.likeCount }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/communities/posts/{postId}/comments:
 *   get:
 *     summary: Get post comments
 *     tags: [Communities]
 */
router.get('/posts/:postId/comments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { postId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await communityService.getPostComments(postId, limit, offset);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/communities/posts/{postId}/comments:
 *   post:
 *     summary: Add a comment
 *     tags: [Communities]
 */
router.post('/posts/:postId/comments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { postId } = req.params;
    const { content, parentCommentId } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: { message: 'Content is required', code: 'MISSING_CONTENT' }
      });
    }

    const result = await communityService.addComment(postId, userId, content, parentCommentId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { message: result.error, code: 'COMMENT_FAILED' }
      });
    }

    res.status(201).json({
      success: true,
      data: result.comment
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/communities/{communityId}/events:
 *   get:
 *     summary: Get community events
 *     tags: [Communities]
 */
router.get('/:communityId/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { communityId } = req.params;
    const includePast = req.query.includePast === 'true';

    const events = await communityService.getCommunityEvents(communityId, includePast);

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/communities/{communityId}/events:
 *   post:
 *     summary: Create a community event
 *     tags: [Communities]
 */
router.post('/:communityId/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { communityId } = req.params;
    const eventData = req.body;

    const result = await communityService.createEvent(communityId, userId, eventData);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { message: result.error, code: 'EVENT_CREATE_FAILED' }
      });
    }

    res.status(201).json({
      success: true,
      data: result.event
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/communities/events/{eventId}/rsvp:
 *   post:
 *     summary: RSVP to an event
 *     tags: [Communities]
 */
router.post('/events/:eventId/rsvp', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { eventId } = req.params;
    const { status } = req.body;

    const result = await communityService.rsvpToEvent(eventId, userId, status);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { message: result.error, code: 'RSVP_FAILED' }
      });
    }

    res.json({
      success: true,
      data: { message: 'RSVP recorded' }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/communities/create:
 *   post:
 *     summary: Create a new community
 *     tags: [Communities]
 */
router.post('/create', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const communityData = req.body;

    const result = await communityService.createCommunity(userId, communityData);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { message: result.error, code: 'CREATE_FAILED' }
      });
    }

    res.status(201).json({
      success: true,
      data: result.community
    });
  } catch (error) {
    next(error);
  }
});

export default router;
