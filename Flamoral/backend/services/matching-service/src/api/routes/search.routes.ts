/**
 * Advanced Search Routes
 * Comprehensive filtering for discovery feed
 */

import express, { Request, Response } from 'express';
import { authenticate as requireAuth } from '../middleware/auth.middleware';
import { createLogger } from '@flamoral/shared';

const router = express.Router();
const logger = createLogger('search-routes');

// Import services dynamically to avoid circular dependencies
let searchService: any;
let searchAnalyticsService: any;

// Lazy load services
const getServices = async () => {
  if (!searchService) {
    const searchModule = await import('../../services/search.service');
    searchService = searchModule.searchService;
  }
  if (!searchAnalyticsService) {
    // Placeholder for analytics service
    searchAnalyticsService = {
      trackSearch: async (data: any) => logger.debug('Track search', data),
      trackNoResults: async (userId: string, filters: any) => logger.debug('Track no results'),
      getSuggestionsForNoResults: async (userId: string) => ({ suggestions: [], relaxedFilters: {} }),
      getUserSearchPatterns: async (userId: string, days: number) => ({}),
    };
  }
  return { searchService, searchAnalyticsService };
};

/**
 * @swagger
 * /api/search/advanced:
 *   post:
 *     summary: Advanced search with filters
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 */
router.post('/advanced', requireAuth, async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const userId = (req as any).user?.userId || (req as any).user?.id;
    const filters = req.body;

    const { searchService } = await getServices();

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

    // Track analytics
    const responseTime = Date.now() - startTime;
    const { searchAnalyticsService } = await getServices();
    searchAnalyticsService.trackSearch({
      userId,
      filters,
      resultCount: result.users.length,
      responseTime,
      timestamp: new Date(),
    }).catch((err: any) => {
      logger.warn('Failed to track search analytics', { error: err.message });
    });

    // Track no-results for optimization suggestions
    if (result.users.length === 0) {
      searchAnalyticsService.trackNoResults(userId, filters).catch((err: any) => {
        logger.warn('Failed to track no-results', { error: err.message });
      });
    }

    res.status(200).json(result);
  } catch (error: any) {
    logger.error('Advanced search failed', {
      userId: (req as any).user?.userId || (req as any).user?.id,
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
 */
router.get('/filters', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId || (req as any).user?.id;
    const { searchService } = await getServices();

    const filters = await searchService.getSavedFilters(userId);

    res.status(200).json({
      success: true,
      filters,
    });
  } catch (error: any) {
    logger.error('Failed to get saved filters', {
      userId: (req as any).user?.userId || (req as any).user?.id,
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
 */
router.post('/filters', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId || (req as any).user?.id;
    const { name, filters } = req.body;

    if (!name || !filters) {
      return res.status(400).json({
        success: false,
        error: 'Name and filters are required',
      });
    }

    const { searchService } = await getServices();
    const result = await searchService.saveFilterPreset(userId, name, filters);

    res.status(201).json(result);
  } catch (error: any) {
    logger.error('Failed to save filter preset', {
      userId: (req as any).user?.userId || (req as any).user?.id,
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
 */
router.delete('/filters/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId || (req as any).user?.id;
    const { id } = req.params;

    const { searchService } = await getServices();
    const result = await searchService.deleteFilterPreset(userId, id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.status(200).json(result);
  } catch (error: any) {
    logger.error('Failed to delete filter preset', {
      userId: (req as any).user?.userId || (req as any).user?.id,
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
 */
router.get('/username', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId || (req as any).user?.id;
    const query = req.query.q as string;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Query must be at least 2 characters',
      });
    }

    const { searchService } = await getServices();
    const result = await searchService.searchByUsername(userId, query);

    res.status(200).json(result);
  } catch (error: any) {
    logger.error('Username search failed', {
      userId: (req as any).user?.userId || (req as any).user?.id,
      query: req.query.q,
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
 * /api/search/suggestions:
 *   get:
 *     summary: Get search suggestions after no results
 */
router.get('/suggestions', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId || (req as any).user?.id;
    const { searchAnalyticsService } = await getServices();

    const suggestions = await searchAnalyticsService.getSuggestionsForNoResults(userId);

    res.status(200).json({
      success: true,
      ...suggestions,
    });
  } catch (error: any) {
    logger.error('Failed to get search suggestions', {
      userId: (req as any).user?.userId || (req as any).user?.id,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get suggestions',
    });
  }
});

/**
 * @swagger
 * /api/search/analytics/patterns:
 *   get:
 *     summary: Get user's search patterns
 */
router.get('/analytics/patterns', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId || (req as any).user?.id;
    const days = parseInt(req.query.days as string) || 30;

    const { searchAnalyticsService } = await getServices();
    const patterns = await searchAnalyticsService.getUserSearchPatterns(userId, days);

    res.status(200).json({
      success: true,
      patterns,
    });
  } catch (error: any) {
    logger.error('Failed to get search patterns', {
      userId: (req as any).user?.userId || (req as any).user?.id,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve patterns',
    });
  }
});

export default router;
