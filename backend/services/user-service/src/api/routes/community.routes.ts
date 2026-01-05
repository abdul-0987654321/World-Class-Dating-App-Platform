import { Router, Request, Response } from 'express';

import { communityController } from '../controllers/community.controller';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.get('/categories', (req: Request, res: Response) =>
  communityController.getCategories(req as AuthRequest, res)
);

// All other routes require authentication
router.use(authMiddleware);

// ==================== COMMUNITIES ====================

/**
 * @swagger
 * /api/v1/communities:
 *   get:
 *     summary: List all communities
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *     responses:
 *       200:
 *         description: List of communities
 */
router.get('/', (req: Request, res: Response) =>
  communityController.listCommunities(req as AuthRequest, res)
);

/**
 * @swagger
 * /api/v1/communities/joined:
 *   get:
 *     summary: Get communities the user has joined
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 */
router.get('/joined', (req: Request, res: Response) =>
  communityController.getJoinedCommunities(req as AuthRequest, res)
);

/**
 * @swagger
 * /api/v1/communities/search:
 *   get:
 *     summary: Search communities
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/search', (req: Request, res: Response) =>
  communityController.searchCommunities(req as AuthRequest, res)
);

/**
 * @swagger
 * /api/v1/communities/events:
 *   get:
 *     summary: Get all upcoming events across communities
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 */
router.get('/events', (req: Request, res: Response) =>
  communityController.getAllEvents(req as AuthRequest, res)
);

/**
 * @swagger
 * /api/v1/communities:
 *   post:
 *     summary: Create a new community
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - icon
 *               - category
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               icon:
 *                 type: string
 *               coverImage:
 *                 type: string
 *               category:
 *                 type: string
 *               color:
 *                 type: string
 *               rules:
 *                 type: array
 *                 items:
 *                   type: string
 */
router.post('/', (req: Request, res: Response) =>
  communityController.createCommunity(req as AuthRequest, res)
);

/**
 * @swagger
 * /api/v1/communities/{communityId}:
 *   get:
 *     summary: Get community details
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: communityId
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/:communityId', (req: Request, res: Response) =>
  communityController.getCommunity(req as AuthRequest, res)
);

/**
 * @swagger
 * /api/v1/communities/{communityId}/join:
 *   post:
 *     summary: Join a community
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: communityId
 *         required: true
 *         schema:
 *           type: string
 */
router.post('/:communityId/join', (req: Request, res: Response) =>
  communityController.joinCommunity(req as AuthRequest, res)
);

/**
 * @swagger
 * /api/v1/communities/{communityId}/leave:
 *   delete:
 *     summary: Leave a community
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: communityId
 *         required: true
 *         schema:
 *           type: string
 */
router.delete('/:communityId/leave', (req: Request, res: Response) =>
  communityController.leaveCommunity(req as AuthRequest, res)
);

/**
 * @swagger
 * /api/v1/communities/{communityId}/members:
 *   get:
 *     summary: Get community members
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: communityId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 */
router.get('/:communityId/members', (req: Request, res: Response) =>
  communityController.getMembers(req as AuthRequest, res)
);

// ==================== POSTS ====================

/**
 * @swagger
 * /api/v1/communities/{communityId}/posts:
 *   get:
 *     summary: Get community posts
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: communityId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 */
router.get('/:communityId/posts', (req: Request, res: Response) =>
  communityController.getPosts(req as AuthRequest, res)
);

/**
 * @swagger
 * /api/v1/communities/{communityId}/posts:
 *   post:
 *     summary: Create a post in a community
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: communityId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 */
router.post('/:communityId/posts', (req: Request, res: Response) =>
  communityController.createPost(req as AuthRequest, res)
);

/**
 * @swagger
 * /api/v1/communities/{communityId}/posts/{postId}:
 *   put:
 *     summary: Update a post
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:communityId/posts/:postId', (req: Request, res: Response) =>
  communityController.updatePost(req as AuthRequest, res)
);

/**
 * @swagger
 * /api/v1/communities/{communityId}/posts/{postId}:
 *   delete:
 *     summary: Delete a post
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:communityId/posts/:postId', (req: Request, res: Response) =>
  communityController.deletePost(req as AuthRequest, res)
);

/**
 * @swagger
 * /api/v1/communities/{communityId}/posts/{postId}/like:
 *   post:
 *     summary: Like a post
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:communityId/posts/:postId/like', (req: Request, res: Response) =>
  communityController.likePost(req as AuthRequest, res)
);

/**
 * @swagger
 * /api/v1/communities/{communityId}/posts/{postId}/like:
 *   delete:
 *     summary: Unlike a post
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:communityId/posts/:postId/like', (req: Request, res: Response) =>
  communityController.unlikePost(req as AuthRequest, res)
);

// ==================== COMMENTS ====================

/**
 * @swagger
 * /api/v1/communities/{communityId}/posts/{postId}/comments:
 *   get:
 *     summary: Get comments on a post
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:communityId/posts/:postId/comments', (req: Request, res: Response) =>
  communityController.getComments(req as AuthRequest, res)
);

/**
 * @swagger
 * /api/v1/communities/{communityId}/posts/{postId}/comments:
 *   post:
 *     summary: Add a comment to a post
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *               parentId:
 *                 type: string
 *                 description: For replies to existing comments
 */
router.post('/:communityId/posts/:postId/comments', (req: Request, res: Response) =>
  communityController.createComment(req as AuthRequest, res)
);

/**
 * @swagger
 * /api/v1/communities/{communityId}/posts/{postId}/comments/{commentId}:
 *   delete:
 *     summary: Delete a comment
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:communityId/posts/:postId/comments/:commentId', (req: Request, res: Response) =>
  communityController.deleteComment(req as AuthRequest, res)
);

/**
 * @swagger
 * /api/v1/communities/{communityId}/posts/{postId}/comments/{commentId}/like:
 *   post:
 *     summary: Like a comment
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:communityId/posts/:postId/comments/:commentId/like', (req: Request, res: Response) =>
  communityController.likeComment(req as AuthRequest, res)
);

// ==================== EVENTS ====================

/**
 * @swagger
 * /api/v1/communities/{communityId}/events:
 *   get:
 *     summary: Get community events
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:communityId/events', (req: Request, res: Response) =>
  communityController.getCommunityEvents(req as AuthRequest, res)
);

/**
 * @swagger
 * /api/v1/communities/{communityId}/events/{eventId}:
 *   get:
 *     summary: Get event details
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:communityId/events/:eventId', (req: Request, res: Response) =>
  communityController.getEvent(req as AuthRequest, res)
);

/**
 * @swagger
 * /api/v1/communities/{communityId}/events/{eventId}/attend:
 *   post:
 *     summary: Register for an event
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:communityId/events/:eventId/attend', (req: Request, res: Response) =>
  communityController.attendEvent(req as AuthRequest, res)
);

/**
 * @swagger
 * /api/v1/communities/{communityId}/events/{eventId}/attend:
 *   delete:
 *     summary: Unregister from an event
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:communityId/events/:eventId/attend', (req: Request, res: Response) =>
  communityController.unattendEvent(req as AuthRequest, res)
);

/**
 * @swagger
 * /api/v1/communities/{communityId}/events/{eventId}/attendees:
 *   get:
 *     summary: Get event attendees
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:communityId/events/:eventId/attendees', (req: Request, res: Response) =>
  communityController.getEventAttendees(req as AuthRequest, res)
);

export default router;
