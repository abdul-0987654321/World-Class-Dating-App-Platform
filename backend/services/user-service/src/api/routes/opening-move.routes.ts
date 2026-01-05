import { Router } from 'express';

import { OpeningMoveController } from '../controllers/opening-move.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  createOpeningMoveSchema,
  updateOpeningMoveSchema,
  reorderOpeningMovesSchema,
  createOpeningResponseSchema,
  categoryParamSchema,
} from '../validators/opening-move.validator';

const router = Router();
const controller = new OpeningMoveController();

/**
 * @swagger
 * /api/users/me/opening-moves:
 *   get:
 *     summary: Get current user's opening moves
 *     tags: [Opening Moves]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Opening moves retrieved successfully
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
 *                     $ref: '#/components/schemas/OpeningMoveResponse'
 */
router.get('/users/me/opening-moves', authenticate, controller.getOpeningMoves.bind(controller));

/**
 * @swagger
 * /api/users/me/opening-moves:
 *   post:
 *     summary: Create a new opening move (max 3)
 *     tags: [Opening Moves]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [text, image, system]
 *               content:
 *                 type: string
 *                 maxLength: 200
 *                 description: Required for text type
 *               image_url:
 *                 type: string
 *                 format: uri
 *                 description: Required for image type
 *               template_id:
 *                 type: string
 *                 format: uuid
 *                 description: Required for system type
 *               order:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 2
 *     responses:
 *       201:
 *         description: Opening move created successfully
 *       400:
 *         description: Validation error or max limit reached
 */
router.post(
  '/users/me/opening-moves',
  authenticate,
  validate(createOpeningMoveSchema),
  controller.createOpeningMove.bind(controller)
);

/**
 * @swagger
 * /api/users/me/opening-moves/{id}:
 *   put:
 *     summary: Update an opening move
 *     tags: [Opening Moves]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 maxLength: 200
 *               image_url:
 *                 type: string
 *                 format: uri
 *               order:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 2
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Opening move updated successfully
 *       404:
 *         description: Opening move not found
 *       403:
 *         description: Not authorized to update this opening move
 */
router.put(
  '/users/me/opening-moves/:id',
  authenticate,
  validate(updateOpeningMoveSchema),
  controller.updateOpeningMove.bind(controller)
);

/**
 * @swagger
 * /api/users/me/opening-moves/{id}:
 *   delete:
 *     summary: Delete an opening move
 *     tags: [Opening Moves]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Opening move deleted successfully
 *       404:
 *         description: Opening move not found
 *       403:
 *         description: Not authorized to delete this opening move
 */
router.delete(
  '/users/me/opening-moves/:id',
  authenticate,
  controller.deleteOpeningMove.bind(controller)
);

/**
 * @swagger
 * /api/users/me/opening-moves/reorder:
 *   put:
 *     summary: Reorder opening moves
 *     tags: [Opening Moves]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderedIds
 *             properties:
 *               orderedIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 1
 *                 maxItems: 3
 *     responses:
 *       200:
 *         description: Opening moves reordered successfully
 *       400:
 *         description: Invalid request
 */
router.put(
  '/users/me/opening-moves/reorder',
  authenticate,
  validate(reorderOpeningMovesSchema),
  controller.reorderOpeningMoves.bind(controller)
);

/**
 * @swagger
 * /api/opening-move-templates:
 *   get:
 *     summary: Get all opening move templates
 *     tags: [Opening Move Templates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Templates retrieved successfully
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
 *                     $ref: '#/components/schemas/OpeningMoveTemplate'
 */
router.get('/opening-move-templates', authenticate, controller.getAllTemplates.bind(controller));

/**
 * @swagger
 * /api/opening-move-templates/{category}:
 *   get:
 *     summary: Get templates by category
 *     tags: [Opening Move Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *           enum: [interests, date_ideas, travel, fun, conversation, food, entertainment]
 *     responses:
 *       200:
 *         description: Templates retrieved successfully
 */
router.get(
  '/opening-move-templates/:category',
  authenticate,
  validate(categoryParamSchema, 'params'),
  controller.getTemplatesByCategory.bind(controller)
);

/**
 * @swagger
 * /api/matches/{matchId}/respond:
 *   post:
 *     summary: Respond to an opening move in a match
 *     tags: [Opening Moves]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - opening_move_id
 *               - response_text
 *             properties:
 *               opening_move_id:
 *                 type: string
 *                 format: uuid
 *               response_text:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 500
 *     responses:
 *       201:
 *         description: Response submitted successfully
 *       409:
 *         description: Already responded to this match
 *       404:
 *         description: Opening move not found
 */
router.post(
  '/matches/:matchId/respond',
  authenticate,
  validate(createOpeningResponseSchema),
  controller.respondToOpeningMove.bind(controller)
);

/**
 * @swagger
 * /api/matches/{matchId}/response:
 *   get:
 *     summary: Get response for a match
 *     tags: [Opening Moves]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Response retrieved successfully
 *       404:
 *         description: No response found
 */
router.get(
  '/matches/:matchId/response',
  authenticate,
  controller.getMatchResponse.bind(controller)
);

export default router;
