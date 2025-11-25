import { Router } from 'express';
import { BlockController } from '../controllers/block.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  blockUserSchema,
  blockUserParamsSchema,
  checkBlockedParamsSchema,
} from '../validators/block.validator';

const router = Router();
const blockController = new BlockController();

/**
 * @swagger
 * /api/blocks/{blockedId}:
 *   post:
 *     summary: Block a user
 *     description: Block another user to prevent interactions and hide profiles from each other
 *     tags: [Blocks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: blockedId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the user to block
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 maxLength: 255
 *                 description: Optional reason for blocking
 *                 example: Not interested
 *     responses:
 *       200:
 *         description: User blocked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Block'
 *       400:
 *         description: Invalid user ID or cannot block yourself
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/:blockedId', authenticate, validate(blockUserParamsSchema, 'params'), validate(blockUserSchema), blockController.blockUser.bind(blockController));

/**
 * @swagger
 * /api/blocks/{blockedId}:
 *   delete:
 *     summary: Unblock a user
 *     description: Remove a block to allow interactions with the user again
 *     tags: [Blocks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: blockedId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the user to unblock
 *     responses:
 *       200:
 *         description: User unblocked successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: Block not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:blockedId', authenticate, validate(blockUserParamsSchema, 'params'), blockController.unblockUser.bind(blockController));

/**
 * @swagger
 * /api/blocks/list:
 *   get:
 *     summary: Get list of blocked users
 *     description: Returns all users that the current user has blocked
 *     tags: [Blocks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Blocked users list retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Block'
 */
router.get('/list', authenticate, blockController.getBlockedUsers.bind(blockController));

/**
 * @swagger
 * /api/blocks/check/{targetUserId}:
 *   get:
 *     summary: Check if user is blocked
 *     description: Check if there is a mutual block between current user and target user
 *     tags: [Blocks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: targetUserId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the user to check
 *     responses:
 *       200:
 *         description: Block status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     isBlocked:
 *                       type: boolean
 *                       description: Whether a block exists between the users
 *                     blockedByMe:
 *                       type: boolean
 *                       description: Whether current user blocked the target
 *                     blockedByThem:
 *                       type: boolean
 *                       description: Whether target user blocked the current user
 */
router.get('/check/:targetUserId', authenticate, validate(checkBlockedParamsSchema, 'params'), blockController.checkBlocked.bind(blockController));

export default router;
