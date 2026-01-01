import { Router, Request, Response } from 'express';
import { communityService } from '../../domain/services/community.service';
import { CommunityCategory } from '../../domain/entities/Community.entity';
import { authMiddleware } from '../middleware/auth.middleware';
import logger from '../../utils/logger';

const router = Router();

// Public routes
router.get('/categories', async (_req: Request, res: Response) => {
  try {
    const categories = communityService.getCategories();
    res.json({ success: true, data: categories });
  } catch (error: any) {
    logger.error('Error getting categories:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// All other routes require authentication
router.use(authMiddleware);

// ==================== COMMUNITIES ====================

/**
 * @swagger
 * /api/v1/communities:
 *   get:
 *     summary: Get all communities
 *     tags: [Communities]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const category = req.query.category as CommunityCategory | undefined;
    const communities = await communityService.getAllCommunities(userId, category);
    res.json({ success: true, data: { communities } });
  } catch (error: any) {
    logger.error('Error getting communities:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/joined', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const communities = await communityService.getJoinedCommunities(userId);
    res.json({ success: true, data: { communities } });
  } catch (error: any) {
    logger.error('Error getting joined communities:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/search', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ success: false, message: 'Search query required' });
    }
    const communities = await communityService.searchCommunities(query, userId);
    res.json({ success: true, data: { communities } });
  } catch (error: any) {
    logger.error('Error searching communities:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/events', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const events = await communityService.getEvents(undefined, userId);
    res.json({ success: true, data: { events } });
  } catch (error: any) {
    logger.error('Error getting events:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:communityId', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { communityId } = req.params;
    const community = await communityService.getCommunity(communityId, userId);
    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }
    res.json({ success: true, data: community });
  } catch (error: any) {
    logger.error('Error getting community:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:communityId/join', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { communityId } = req.params;
    const result = await communityService.joinCommunity(communityId, userId);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }
    res.json({ success: true, message: result.message });
  } catch (error: any) {
    logger.error('Error joining community:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:communityId/leave', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { communityId } = req.params;
    const result = await communityService.leaveCommunity(communityId, userId);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }
    res.json({ success: true, message: result.message });
  } catch (error: any) {
    logger.error('Error leaving community:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:communityId/members', async (req: Request, res: Response) => {
  try {
    const { communityId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const result = await communityService.getMembers(communityId, page, limit);
    res.json({ success: true, data: { items: result.members, total: result.total } });
  } catch (error: any) {
    logger.error('Error getting members:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== POSTS ====================

router.get('/:communityId/posts', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { communityId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const result = await communityService.getPosts(communityId, userId, page, limit);
    res.json({ success: true, data: { items: result.posts, total: result.total } });
  } catch (error: any) {
    logger.error('Error getting posts:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:communityId/posts', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { communityId } = req.params;
    const { content, images } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    const result = await communityService.createPost(communityId, userId, content, images);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }
    res.status(201).json({ success: true, data: result.post });
  } catch (error: any) {
    logger.error('Error creating post:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:communityId/posts/:postId', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { postId } = req.params;
    const { content, images } = req.body;
    const result = await communityService.updatePost(postId, userId, content, images);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }
    res.json({ success: true, message: result.message });
  } catch (error: any) {
    logger.error('Error updating post:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:communityId/posts/:postId', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { postId } = req.params;
    const result = await communityService.deletePost(postId, userId);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }
    res.json({ success: true, message: result.message });
  } catch (error: any) {
    logger.error('Error deleting post:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:communityId/posts/:postId/like', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { postId } = req.params;
    await communityService.likePost(postId, userId);
    res.json({ success: true, message: 'Post liked' });
  } catch (error: any) {
    logger.error('Error liking post:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:communityId/posts/:postId/like', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { postId } = req.params;
    await communityService.unlikePost(postId, userId);
    res.json({ success: true, message: 'Post unliked' });
  } catch (error: any) {
    logger.error('Error unliking post:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== COMMENTS ====================

router.get('/:communityId/posts/:postId/comments', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { postId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const result = await communityService.getComments(postId, userId, page, limit);
    res.json({ success: true, data: { items: result.comments, total: result.total } });
  } catch (error: any) {
    logger.error('Error getting comments:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:communityId/posts/:postId/comments', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { postId } = req.params;
    const { content, parentId } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    const comment = await communityService.createComment(postId, userId, content, parentId);
    res.status(201).json({ success: true, data: comment });
  } catch (error: any) {
    logger.error('Error creating comment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:communityId/posts/:postId/comments/:commentId', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { postId, commentId } = req.params;
    const result = await communityService.deleteComment(commentId, postId, userId);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }
    res.json({ success: true, message: result.message });
  } catch (error: any) {
    logger.error('Error deleting comment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:communityId/posts/:postId/comments/:commentId/like', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { commentId } = req.params;
    await communityService.likeComment(commentId, userId);
    res.json({ success: true, message: 'Comment liked' });
  } catch (error: any) {
    logger.error('Error liking comment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== EVENTS ====================

router.get('/:communityId/events', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { communityId } = req.params;
    const events = await communityService.getEvents(communityId, userId);
    res.json({ success: true, data: { events } });
  } catch (error: any) {
    logger.error('Error getting community events:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:communityId/events/:eventId', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { eventId } = req.params;
    const event = await communityService.getEvent(eventId, userId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    res.json({ success: true, data: event });
  } catch (error: any) {
    logger.error('Error getting event:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:communityId/events/:eventId/attend', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { eventId } = req.params;
    const result = await communityService.attendEvent(eventId, userId);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }
    res.json({ success: true, message: result.message });
  } catch (error: any) {
    logger.error('Error attending event:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:communityId/events/:eventId/attend', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { eventId } = req.params;
    const result = await communityService.unattendEvent(eventId, userId);
    res.json({ success: true, message: result.message });
  } catch (error: any) {
    logger.error('Error unattending event:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:communityId/events/:eventId/attendees', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const result = await communityService.getEventAttendees(eventId, page, limit);
    res.json({ success: true, data: { items: result.attendees, total: result.total } });
  } catch (error: any) {
    logger.error('Error getting attendees:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
