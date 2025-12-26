import { Router } from 'express';
import { creativeController } from '../controllers/creative.controller';
import {
  authenticateJWT,
  requireAdvertiser,
  requireAdmin,
  authenticateService,
  rateLimiter,
} from '../middleware/auth.middleware';

const router = Router();

// ============================================================================
// Advertiser Routes - Require authenticated advertiser
// These are used by advertisers to create and manage ad creatives
// ============================================================================

// Feature 1: Dynamic Dating Scene Personalization
router.post('/personalize-scene', authenticateJWT, requireAdvertiser, (req, res) => creativeController.personalizeScene(req, res));

// Feature 3: AI Dating Photo Enhancement for Ads
router.post('/enhance-photo', authenticateJWT, requireAdvertiser, (req, res) => creativeController.enhancePhoto(req, res));

// Feature 4: Personalized Success Story Generation
router.post('/success-story', authenticateJWT, requireAdvertiser, (req, res) => creativeController.generateSuccessStory(req, res));

// Feature 5: Real-Time Copy Optimization
router.post('/optimize-copy', authenticateJWT, requireAdvertiser, (req, res) => creativeController.optimizeCopy(req, res));

// Feature 7: Date Idea Creative Generator
router.post('/date-idea', authenticateJWT, requireAdvertiser, (req, res) => creativeController.generateDateIdeaCreative(req, res));

// Feature 9: Animated Matching Visualization
router.post('/matching-visualization', authenticateJWT, requireAdvertiser, (req, res) => creativeController.createMatchingVisualization(req, res));

// Feature 10: A/B Testing Creative Framework
router.post('/experiment', authenticateJWT, requireAdvertiser, (req, res) => creativeController.createCreativeExperiment(req, res));

// ============================================================================
// Internal Service Routes - Require service API key
// These are used by other services to select and serve creatives
// ============================================================================

// Feature 2: Emotion-Based Creative Selection (used by ad-serving system)
router.post('/emotion-select', authenticateService, (req, res) => creativeController.selectEmotionBasedCreative(req, res));

// Feature 8: User Testimonial Style Matching (used by ad-serving system)
router.post('/testimonial-match', authenticateService, (req, res) => creativeController.matchTestimonial(req, res));

// ============================================================================
// Public Routes - Rate-limited, no authentication required
// These provide reference data for external use
// ============================================================================

// Feature 6: Interest-Matched Visual Theming (public reference data)
router.get('/visual-theme/:interestCategory', rateLimiter, (req, res) => creativeController.getVisualTheme(req, res));

export default router;
