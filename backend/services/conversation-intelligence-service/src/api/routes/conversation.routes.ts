/**
 * Conversation Intelligence Service Routes
 */

import { Router } from 'express';

import * as conversationController from '../controllers/conversation.controller';
import { authenticate, optionalAuthenticate, serviceAuth } from '../middleware/auth.middleware';

const router = Router();

// ============================================================================
// Connection Score Routes
// ============================================================================

/**
 * @route   POST /api/v1/conversation/analyze
 * @desc    Analyze a message and update connection score
 * @body    { conversationId, messageId, senderId, content, timestamp? }
 * @access  Service-to-Service
 */
router.post('/analyze', serviceAuth, conversationController.analyzeMessage);

/**
 * @route   GET /api/v1/conversation/:conversationId/score
 * @desc    Get connection score for a conversation
 * @access  Private
 */
router.get('/:conversationId/score', authenticate, conversationController.getConnectionScore);

/**
 * @route   GET /api/v1/conversation/:conversationId/analysis
 * @desc    Get full conversation analysis
 * @access  Private
 */
router.get(
  '/:conversationId/analysis',
  authenticate,
  conversationController.getConversationAnalysis
);

/**
 * @route   GET /api/v1/conversation/:conversationId/suggestions
 * @desc    Get suggestions for improving the conversation
 * @access  Private
 */
router.get('/:conversationId/suggestions', authenticate, conversationController.getSuggestions);

/**
 * @route   POST /api/v1/conversation/suggestions/:suggestionId/dismiss
 * @desc    Dismiss a suggestion
 * @access  Private
 */
router.post(
  '/suggestions/:suggestionId/dismiss',
  authenticate,
  conversationController.dismissSuggestion
);

// ============================================================================
// Ghost Prevention Routes
// ============================================================================

/**
 * @route   GET /api/v1/conversation/:conversationId/ghost-risk
 * @desc    Assess ghosting risk for a conversation
 * @access  Private
 */
router.get('/:conversationId/ghost-risk', authenticate, conversationController.assessGhostRisk);

/**
 * @route   POST /api/v1/conversation/:conversationId/graceful-exit
 * @desc    Initiate a graceful exit from a conversation
 * @body    { reason, customMessage?, provideFeedback?, feedbackCategories? }
 * @access  Private
 */
router.post(
  '/:conversationId/graceful-exit',
  authenticate,
  conversationController.initiateGracefulExit
);

/**
 * @route   GET /api/v1/conversation/exit-templates
 * @desc    Get available graceful exit message templates
 * @access  Public
 */
router.get('/exit-templates', conversationController.getExitTemplates);

/**
 * @route   GET /api/v1/conversation/feedback
 * @desc    Get aggregated feedback for the authenticated user
 * @access  Private
 */
router.get('/feedback', authenticate, conversationController.getAggregatedFeedback);

// ============================================================================
// Intent Signaling Routes
// ============================================================================

/**
 * @route   POST /api/v1/conversation/intent
 * @desc    Update user's dating intent
 * @body    { conversationId?, intent, availableTimeframe?, preferredDateTypes?, notes? }
 * @access  Private
 */
router.post('/intent', authenticate, conversationController.updateIntent);

/**
 * @route   GET /api/v1/conversation/intent
 * @desc    Get user's current intent
 * @query   conversationId (optional)
 * @access  Private
 */
router.get('/intent', authenticate, conversationController.getIntent);

/**
 * @route   GET /api/v1/conversation/:conversationId/intent-match
 * @desc    Check intent compatibility with another user
 * @query   otherUserId
 * @access  Private
 */
router.get('/:conversationId/intent-match', authenticate, conversationController.checkIntentMatch);

/**
 * @route   GET /api/v1/conversation/intent-options
 * @desc    Get all available intent options
 * @access  Public
 */
router.get('/intent-options', conversationController.getIntentOptions);

/**
 * @route   GET /api/v1/conversation/:conversationId/infer-intent
 * @desc    Infer user's intent from conversation behavior
 * @access  Private
 */
router.get('/:conversationId/infer-intent', authenticate, conversationController.inferIntent);

export default router;
