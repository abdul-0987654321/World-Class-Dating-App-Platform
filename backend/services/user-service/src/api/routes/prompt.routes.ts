import { Router } from 'express';

import { PromptController } from '../controllers/prompt.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const promptController = new PromptController();

/**
 * @swagger
 * /api/prompts:
 *   get:
 *     summary: Get all available prompts
 *     tags: [Prompts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Prompts retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, promptController.getAvailablePrompts.bind(promptController));

/**
 * @swagger
 * /api/prompts/user:
 *   get:
 *     summary: Get user's prompt answers
 *     tags: [Prompts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User prompts retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/user', authenticate, promptController.getUserPrompts.bind(promptController));

/**
 * @swagger
 * /api/prompts/user:
 *   post:
 *     summary: Add a prompt answer
 *     tags: [Prompts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt_id
 *               - answer
 *             properties:
 *               prompt_id:
 *                 type: string
 *               answer:
 *                 type: string
 *                 maxLength: 200
 *     responses:
 *       201:
 *         description: Prompt answer added successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/user', authenticate, promptController.addUserPrompt.bind(promptController));

/**
 * @swagger
 * /api/prompts/user/{promptId}:
 *   put:
 *     summary: Update a prompt answer
 *     tags: [Prompts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: promptId
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
 *               - answer
 *             properties:
 *               answer:
 *                 type: string
 *                 maxLength: 200
 *     responses:
 *       200:
 *         description: Prompt answer updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.put(
  '/user/:promptId',
  authenticate,
  promptController.updateUserPrompt.bind(promptController)
);

/**
 * @swagger
 * /api/prompts/user/{promptId}:
 *   delete:
 *     summary: Delete a prompt answer
 *     tags: [Prompts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: promptId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Prompt answer deleted successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.delete(
  '/user/:promptId',
  authenticate,
  promptController.deleteUserPrompt.bind(promptController)
);

export default router;
