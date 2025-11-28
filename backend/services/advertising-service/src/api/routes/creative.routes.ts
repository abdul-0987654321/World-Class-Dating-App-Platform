import { Router } from 'express';
import { creativeController } from '../controllers/creative.controller';

const router = Router();

// Feature 1: Dynamic Dating Scene Personalization
router.post('/personalize-scene', (req, res) => creativeController.personalizeScene(req, res));

// Feature 2: Emotion-Based Creative Selection
router.post('/emotion-select', (req, res) => creativeController.selectEmotionBasedCreative(req, res));

// Feature 3: AI Dating Photo Enhancement for Ads
router.post('/enhance-photo', (req, res) => creativeController.enhancePhoto(req, res));

// Feature 4: Personalized Success Story Generation
router.post('/success-story', (req, res) => creativeController.generateSuccessStory(req, res));

// Feature 5: Real-Time Copy Optimization
router.post('/optimize-copy', (req, res) => creativeController.optimizeCopy(req, res));

// Feature 6: Interest-Matched Visual Theming
router.get('/visual-theme/:interestCategory', (req, res) => creativeController.getVisualTheme(req, res));

// Feature 7: Date Idea Creative Generator
router.post('/date-idea', (req, res) => creativeController.generateDateIdeaCreative(req, res));

// Feature 8: User Testimonial Style Matching
router.post('/testimonial-match', (req, res) => creativeController.matchTestimonial(req, res));

// Feature 9: Animated Matching Visualization
router.post('/matching-visualization', (req, res) => creativeController.createMatchingVisualization(req, res));

// Feature 10: A/B Testing Creative Framework
router.post('/experiment', (req, res) => creativeController.createCreativeExperiment(req, res));

export default router;
