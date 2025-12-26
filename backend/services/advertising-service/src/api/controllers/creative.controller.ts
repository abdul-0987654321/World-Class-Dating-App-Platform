import { Request, Response } from 'express';
import { creativeService } from '../../domain/services/creative.service';
import logger from '../../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class CreativeController {
  // Feature 1: Dynamic Dating Scene Personalization
  async personalizeScene(req: Request, res: Response): Promise<Response> {
    try {
      const { baseCreative, userProfile } = req.body;

      if (!baseCreative || !userProfile) {
        return res.status(400).json({
          success: false,
          message: 'Base creative and user profile are required',
        });
      }

      const scene = await creativeService.personalizeScene(baseCreative, userProfile);
      return res.status(200).json({ success: true, data: scene });
    } catch (error: any) {
      logger.error('Personalize scene error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to personalize scene',
      });
    }
  }

  // Feature 2: Emotion-Based Creative Selection
  // SECURITY: This endpoint supports two authentication modes:
  // 1. User JWT auth (req.user.id) - for direct user access
  // 2. Service-to-service auth (req.body.userId) - only with valid service API key
  async selectEmotionBasedCreative(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      // SECURITY: Get userId from JWT if user-authenticated, otherwise from body (for service-to-service calls)
      // Service-to-service calls are secured by authenticateService middleware which validates the service API key
      const userId = req.user?.id || req.body.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
          code: 'UNAUTHORIZED',
        });
      }

      const { context } = req.body;

      if (!context) {
        return res.status(400).json({
          success: false,
          message: 'Context is required',
        });
      }

      const creative = await creativeService.selectEmotionBasedCreative(userId, context);
      return res.status(200).json({ success: true, data: creative });
    } catch (error: any) {
      logger.error('Select emotion-based creative error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to select emotion-based creative',
      });
    }
  }

  // Feature 3: AI Dating Photo Enhancement for Ads
  async enhancePhoto(req: Request, res: Response): Promise<Response> {
    try {
      const { photoUrl } = req.body;

      if (!photoUrl) {
        return res.status(400).json({
          success: false,
          message: 'Photo URL is required',
        });
      }

      const enhanced = await creativeService.enhancePhoto(photoUrl);
      return res.status(200).json({ success: true, data: enhanced });
    } catch (error: any) {
      logger.error('Enhance photo error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to enhance photo',
      });
    }
  }

  // Feature 4: Personalized Success Story Generation
  async generateSuccessStory(req: Request, res: Response): Promise<Response> {
    try {
      const { targetSegment, storyTemplate } = req.body;

      if (!targetSegment || !storyTemplate) {
        return res.status(400).json({
          success: false,
          message: 'Target segment and story template are required',
        });
      }

      const story = await creativeService.generateSuccessStory(targetSegment, storyTemplate);
      return res.status(200).json({ success: true, data: story });
    } catch (error: any) {
      logger.error('Generate success story error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate success story',
      });
    }
  }

  // Feature 5: Real-Time Copy Optimization
  async optimizeCopy(req: Request, res: Response): Promise<Response> {
    try {
      const { baseCopy, goal } = req.body;

      if (!baseCopy || !goal) {
        return res.status(400).json({
          success: false,
          message: 'Base copy and goal are required',
        });
      }

      const optimized = await creativeService.optimizeCopy(baseCopy, goal);
      return res.status(200).json({ success: true, data: optimized });
    } catch (error: any) {
      logger.error('Optimize copy error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to optimize copy',
      });
    }
  }

  // Feature 6: Interest-Matched Visual Theming
  async getVisualTheme(req: Request, res: Response): Promise<Response> {
    try {
      const { interestCategory } = req.params;

      if (!interestCategory) {
        return res.status(400).json({
          success: false,
          message: 'Interest category is required',
        });
      }

      const theme = await creativeService.getVisualTheme(interestCategory);
      return res.status(200).json({ success: true, data: theme });
    } catch (error: any) {
      logger.error('Get visual theme error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get visual theme',
      });
    }
  }

  // Feature 7: Date Idea Creative Generator
  async generateDateIdeaCreative(req: Request, res: Response): Promise<Response> {
    try {
      const { location, interests } = req.body;

      if (!location || !interests) {
        return res.status(400).json({
          success: false,
          message: 'Location and interests are required',
        });
      }

      const creative = await creativeService.generateDateIdeaCreative(location, interests);
      return res.status(200).json({ success: true, data: creative });
    } catch (error: any) {
      logger.error('Generate date idea creative error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate date idea creative',
      });
    }
  }

  // Feature 8: User Testimonial Style Matching
  async matchTestimonial(req: Request, res: Response): Promise<Response> {
    try {
      const { viewerProfile } = req.body;

      if (!viewerProfile) {
        return res.status(400).json({
          success: false,
          message: 'Viewer profile is required',
        });
      }

      const testimonial = await creativeService.matchTestimonial(viewerProfile);
      return res.status(200).json({ success: true, data: testimonial });
    } catch (error: any) {
      logger.error('Match testimonial error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to match testimonial',
      });
    }
  }

  // Feature 9: Animated Matching Visualization
  async createMatchingVisualization(req: Request, res: Response): Promise<Response> {
    try {
      const { type } = req.body;

      if (!type) {
        return res.status(400).json({
          success: false,
          message: 'Visualization type is required',
        });
      }

      const visualization = await creativeService.createMatchingVisualization(type);
      return res.status(200).json({ success: true, data: visualization });
    } catch (error: any) {
      logger.error('Create matching visualization error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to create matching visualization',
      });
    }
  }

  // Feature 10: A/B Testing Creative Framework
  async createCreativeExperiment(req: Request, res: Response): Promise<Response> {
    try {
      const { name, variants } = req.body;

      if (!name || !variants || !Array.isArray(variants) || variants.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Name and at least 2 variants are required',
        });
      }

      const experiment = await creativeService.createCreativeExperiment(name, variants);
      return res.status(201).json({ success: true, data: experiment });
    } catch (error: any) {
      logger.error('Create creative experiment error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to create creative experiment',
      });
    }
  }
}

export const creativeController = new CreativeController();
