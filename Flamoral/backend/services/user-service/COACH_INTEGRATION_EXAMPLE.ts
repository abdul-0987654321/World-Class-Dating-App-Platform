/**
 * AI Dating Coach Integration Example
 *
 * This file shows how to integrate the Dating Coach service with the User Service.
 * Add these routes and services to your user-service.
 */

import express, { Request, Response, Router } from 'express';
import axios from 'axios';
import { authenticateToken } from '../middleware/auth.middleware';
import { checkSubscription } from '../middleware/subscription.middleware';

const router: Router = express.Router();

// Configuration
const COACH_SERVICE_URL = process.env.COACH_SERVICE_URL || 'http://dating-coach-service:8004';

// =====================================================
// Types
// =====================================================

interface CoachRequest {
  userId: string;
  subscriptionTier: 'free' | 'basic' | 'premium' | 'premium_plus';
}

interface IcebreakerRequest extends CoachRequest {
  matchProfile: any;
  numSuggestions?: number;
  tone?: string;
}

interface ResponseSuggestionRequest extends CoachRequest {
  conversationHistory: any[];
  matchProfile: any;
  userProfile?: any;
  numSuggestions?: number;
  style?: string;
}

interface ProfileTipsRequest extends CoachRequest {
  profileData: any;
  photos?: any[];
  prompts?: any[];
}

interface DateIdeasRequest extends CoachRequest {
  matchProfile: any;
  userProfile: any;
  location?: string;
  budget?: string;
  dateType?: string;
  numSuggestions?: number;
}

interface ConversationAnalysisRequest extends CoachRequest {
  conversationHistory: any[];
  matchProfile: any;
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Get user's subscription tier from database
 */
async function getUserSubscriptionTier(userId: string): Promise<string> {
  // TODO: Implement actual database query
  // const user = await User.findById(userId);
  // return user.subscription.tier;

  // For now, return a default
  return 'premium';
}

/**
 * Get user's profile data
 */
async function getUserProfile(userId: string): Promise<any> {
  // TODO: Implement actual database query
  // const profile = await Profile.findOne({ userId });
  // return profile;

  return {
    firstName: 'John',
    bio: 'Sample bio',
    interests: ['hiking', 'photography'],
    occupation: 'Software Engineer',
  };
}

/**
 * Get match's profile data
 */
async function getMatchProfile(matchId: string): Promise<any> {
  // TODO: Implement actual database query
  return {
    firstName: 'Sarah',
    bio: 'Love hiking and photography',
    interests: ['hiking', 'photography', 'travel'],
    occupation: 'Photographer',
  };
}

/**
 * Get conversation history between users
 */
async function getConversationHistory(userId: string, matchId: string): Promise<any[]> {
  // TODO: Implement actual database query
  return [
    { sender: userId, text: 'Hi! How are you?', timestamp: Date.now() - 3600000 },
    { sender: matchId, text: 'Great! Just came back from a hike. You?', timestamp: Date.now() - 3000000 },
  ];
}

/**
 * Make request to Coach service
 */
async function callCoachService(endpoint: string, data: any): Promise<any> {
  try {
    const response = await axios.post(`${COACH_SERVICE_URL}/api/coach/${endpoint}`, data, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });

    return response.data;
  } catch (error: any) {
    if (error.response?.status === 429) {
      // Rate limit exceeded
      throw new Error('RATE_LIMIT_EXCEEDED');
    }

    console.error('Coach service error:', error);
    throw new Error('COACH_SERVICE_ERROR');
  }
}

// =====================================================
// Routes
// =====================================================

/**
 * POST /api/coach/icebreakers
 * Generate icebreaker messages for a match
 *
 * Body:
 * {
 *   "matchId": "match123",
 *   "numSuggestions": 3,
 *   "tone": "friendly"
 * }
 */
router.post(
  '/icebreakers',
  authenticateToken,
  checkSubscription(['premium', 'premium_plus']),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { matchId, numSuggestions = 3, tone = 'friendly' } = req.body;

      // Validate input
      if (!matchId) {
        return res.status(400).json({ error: 'matchId is required' });
      }

      // Get subscription tier
      const subscriptionTier = await getUserSubscriptionTier(userId);

      // Get match profile
      const matchProfile = await getMatchProfile(matchId);

      // Call coach service
      const result = await callCoachService('icebreakers', {
        user_id: userId,
        match_profile: matchProfile,
        num_suggestions: numSuggestions,
        tone,
      });

      return res.json(result);
    } catch (error: any) {
      if (error.message === 'RATE_LIMIT_EXCEEDED') {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'You have reached your daily limit. Upgrade to Premium+ for unlimited suggestions.',
        });
      }

      console.error('Icebreaker generation error:', error);
      return res.status(500).json({ error: 'Failed to generate icebreakers' });
    }
  }
);

/**
 * POST /api/coach/suggest-response
 * Get AI-powered response suggestions
 *
 * Body:
 * {
 *   "matchId": "match123",
 *   "numSuggestions": 3,
 *   "style": "balanced"
 * }
 */
router.post(
  '/suggest-response',
  authenticateToken,
  checkSubscription(['premium', 'premium_plus']),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { matchId, numSuggestions = 3, style = 'balanced' } = req.body;

      if (!matchId) {
        return res.status(400).json({ error: 'matchId is required' });
      }

      // Get data
      const subscriptionTier = await getUserSubscriptionTier(userId);
      const userProfile = await getUserProfile(userId);
      const matchProfile = await getMatchProfile(matchId);
      const conversationHistory = await getConversationHistory(userId, matchId);

      // Call coach service
      const result = await callCoachService('suggest-response', {
        user_id: userId,
        conversation_history: conversationHistory,
        match_profile: matchProfile,
        user_profile: userProfile,
        num_suggestions: numSuggestions,
        style,
      });

      return res.json(result);
    } catch (error: any) {
      if (error.message === 'RATE_LIMIT_EXCEEDED') {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'You have reached your daily limit. Upgrade to Premium+ for unlimited suggestions.',
        });
      }

      console.error('Response suggestion error:', error);
      return res.status(500).json({ error: 'Failed to generate suggestions' });
    }
  }
);

/**
 * POST /api/coach/profile-tips
 * Analyze profile and get optimization tips
 */
router.post(
  '/profile-tips',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      // Get user data
      const subscriptionTier = await getUserSubscriptionTier(userId);
      const userProfile = await getUserProfile(userId);

      // TODO: Get photos and prompts from database
      const photos: any[] = [];
      const prompts: any[] = [];

      // Call coach service
      const result = await callCoachService('profile-tips', {
        user_id: userId,
        profile_data: userProfile,
        photos,
        prompts,
      });

      return res.json(result);
    } catch (error: any) {
      if (error.message === 'RATE_LIMIT_EXCEEDED') {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'You have reached your daily limit. Upgrade for more profile analyses.',
        });
      }

      console.error('Profile analysis error:', error);
      return res.status(500).json({ error: 'Failed to analyze profile' });
    }
  }
);

/**
 * POST /api/coach/date-ideas
 * Generate personalized date ideas
 *
 * Body:
 * {
 *   "matchId": "match123",
 *   "location": "San Francisco",
 *   "budget": "moderate",
 *   "dateType": "first",
 *   "numSuggestions": 3
 * }
 */
router.post(
  '/date-ideas',
  authenticateToken,
  checkSubscription(['premium', 'premium_plus']),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const {
        matchId,
        location,
        budget = 'moderate',
        dateType = 'first',
        numSuggestions = 3,
      } = req.body;

      if (!matchId) {
        return res.status(400).json({ error: 'matchId is required' });
      }

      // Get data
      const subscriptionTier = await getUserSubscriptionTier(userId);
      const userProfile = await getUserProfile(userId);
      const matchProfile = await getMatchProfile(matchId);

      // Call coach service
      const result = await callCoachService('date-ideas', {
        user_id: userId,
        match_profile: matchProfile,
        user_profile: userProfile,
        location,
        budget,
        date_type: dateType,
        num_suggestions: numSuggestions,
      });

      return res.json(result);
    } catch (error: any) {
      if (error.message === 'RATE_LIMIT_EXCEEDED') {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'You have reached your daily limit. Upgrade to Premium+ for unlimited suggestions.',
        });
      }

      console.error('Date idea generation error:', error);
      return res.status(500).json({ error: 'Failed to generate date ideas' });
    }
  }
);

/**
 * POST /api/coach/conversation-analysis
 * Analyze conversation dynamics and get insights
 *
 * Body:
 * {
 *   "matchId": "match123"
 * }
 */
router.post(
  '/conversation-analysis',
  authenticateToken,
  checkSubscription(['premium_plus']), // Premium+ only
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { matchId } = req.body;

      if (!matchId) {
        return res.status(400).json({ error: 'matchId is required' });
      }

      // Get data
      const subscriptionTier = await getUserSubscriptionTier(userId);
      const matchProfile = await getMatchProfile(matchId);
      const conversationHistory = await getConversationHistory(userId, matchId);

      // Call coach service
      const result = await callCoachService('conversation-analysis', {
        user_id: userId,
        conversation_history: conversationHistory,
        match_profile: matchProfile,
      });

      return res.json(result);
    } catch (error: any) {
      if (error.message === 'RATE_LIMIT_EXCEEDED') {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Conversation analysis is only available for Premium+ users.',
        });
      }

      console.error('Conversation analysis error:', error);
      return res.status(500).json({ error: 'Failed to analyze conversation' });
    }
  }
);

/**
 * GET /api/coach/usage
 * Get remaining usage quota for the day
 */
router.get(
  '/usage',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const subscriptionTier = await getUserSubscriptionTier(userId);

      // Call coach service for each coaching type
      const types = ['icebreaker', 'response', 'profile_tips', 'date_ideas', 'conversation_analysis'];
      const usagePromises = types.map(type =>
        callCoachService('usage', {
          user_id: userId,
          coaching_type: type,
          subscription_tier: subscriptionTier,
        })
      );

      const usageResults = await Promise.all(usagePromises);

      // Format response
      const usage: any = {};
      types.forEach((type, index) => {
        usage[type] = usageResults[index];
      });

      return res.json({
        subscriptionTier,
        usage,
      });
    } catch (error) {
      console.error('Usage check error:', error);
      return res.status(500).json({ error: 'Failed to check usage' });
    }
  }
);

/**
 * GET /api/coach/health
 * Check if coach service is available
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${COACH_SERVICE_URL}/health`, {
      timeout: 5000,
    });

    return res.json({
      status: 'healthy',
      coachService: response.data,
    });
  } catch (error) {
    return res.status(503).json({
      status: 'unhealthy',
      error: 'Coach service unavailable',
    });
  }
});

// =====================================================
// Export Router
// =====================================================

export default router;

/**
 * Add to your main user-service index.ts:
 *
 * import coachRoutes from './api/routes/coach.routes';
 * app.use('/api/coach', coachRoutes);
 */
