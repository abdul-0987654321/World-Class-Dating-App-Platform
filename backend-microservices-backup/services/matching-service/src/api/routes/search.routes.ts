/**
 * Advanced Search Routes
 * Comprehensive filtering for discovery feed
 */

import express, { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { searchService } from '../../services/search.service';
import { logger } from '../../utils/logger';

const router = express.Router();

/**
 * @swagger
 * /api/search/advanced:
 *   post:
 *     summary: Advanced search with filters
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Search for potential matches with advanced filtering options.
 *
 *       **Available Filters:**
 *       - Age range (min/max)
 *       - Distance radius (km)
 *       - Height range (cm)
 *       - Education level
 *       - Occupation
 *       - Religion
 *       - Interests/hobbies
 *       - Relationship goals
 *       - Dealbreakers
 *       - Verified users only
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               minAge:
 *                 type: integer
 *                 minimum: 18
 *                 maximum: 100
 *                 example: 25
 *               maxAge:
 *                 type: integer
 *                 minimum: 18
 *                 maximum: 100
 *                 example: 35
 *               maxDistance:
 *                 type: integer
 *                 description: Maximum distance in kilometers
 *                 minimum: 1
 *                 maximum: 500
 *                 example: 50
 *               minHeight:
 *                 type: integer
 *                 description: Minimum height in cm
 *                 example: 160
 *               maxHeight:
 *                 type: integer
 *                 description: Maximum height in cm
 *                 example: 190
 *               education:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [high_school, some_college, bachelors, masters, phd, other]
 *                 example: [bachelors, masters]
 *               occupation:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: [engineer, doctor, teacher]
 *               religion:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [christian, muslim, jewish, hindu, buddhist, atheist, agnostic, spiritual, other]
 *                 example: [christian, spiritual]
 *               interests:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: [hiking, reading, travel]
 *               relationshipGoals:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [casual, long_term, marriage, friendship, not_sure]
 *                 example: [long_term, marriage]
 *               dealbreakers:
 *                 type: object
 *                 properties:
 *                   noSmokers:
 *                     type: boolean
 *                   noDrinkers:
 *                     type: boolean
 *                   noChildren:
 *                     type: boolean
 *                   noPets:
 *                     type: boolean
 *               verifiedOnly:
 *                 type: boolean
 *                 description: Show only verified users
 *                 example: false
 *               limit:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 default: 20
 *               offset:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *                 hasMore:
 *                   type: boolean
 *       400:
 *         description: Invalid filters
 *       401:
 *         description: Not authenticated
 */
router.post('/advanced', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const filters = req.body;

    // Validate filters
    const validation = searchService.validateFilters(filters);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
      });
    }

    // Execute search
    const result = await searchService.advancedSearch(userId, filters);

    res.status(200).json(result);
  } catch (error: any) {
    logger.error('Advanced search failed', {
      userId: req.user?.id,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Search failed',
    });
  }
});

/**
 * @swagger
 * /api/search/filters:
 *   get:
 *     summary: Get saved filter presets
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's saved filters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 filters:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/filters', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const filters = await searchService.getSavedFilters(userId);

    res.status(200).json({
      success: true,
      filters,
    });
  } catch (error: any) {
    logger.error('Failed to get saved filters', {
      userId: req.user?.id,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve filters',
    });
  }
});

/**
 * @swagger
 * /api/search/filters:
 *   post:
 *     summary: Save filter preset
 *     tags: [Search]
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
 *               - filters
 *             properties:
 *               name:
 *                 type: string
 *                 example: My Ideal Match
 *               filters:
 *                 type: object
 *     responses:
 *       201:
 *         description: Filter preset saved
 *       400:
 *         description: Invalid data
 */
router.post('/filters', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, filters } = req.body;

    if (!name || !filters) {
      return res.status(400).json({
        success: false,
        error: 'Name and filters are required',
      });
    }

    const result = await searchService.saveFilterPreset(userId, name, filters);

    res.status(201).json(result);
  } catch (error: any) {
    logger.error('Failed to save filter preset', {
      userId: req.user?.id,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to save filter preset',
    });
  }
});

/**
 * @swagger
 * /api/search/filters/{id}:
 *   delete:
 *     summary: Delete filter preset
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Filter deleted
 *       404:
 *         description: Filter not found
 */
router.delete('/filters/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const result = await searchService.deleteFilterPreset(userId, id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.status(200).json(result);
  } catch (error: any) {
    logger.error('Failed to delete filter preset', {
      userId: req.user?.id,
      filterId: req.params.id,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to delete filter preset',
    });
  }
});

/**
 * @swagger
 * /api/search/username:
 *   get:
 *     summary: Search by username
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Username query
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 users:
 *                   type: array
 */
router.get('/username', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const query = req.query.q as string;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Query must be at least 2 characters',
      });
    }

    const result = await searchService.searchByUsername(userId, query);

    res.status(200).json(result);
  } catch (error: any) {
    logger.error('Username search failed', {
      userId: req.user?.id,
      query: req.query.q,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Search failed',
    });
  }
});

export default router;
