/**
 * Progression Routes
 * API route definitions for relationship progression service
 */

import { Router } from 'express';
import { authenticate, requireUserId } from '../middleware/auth.middleware';
import * as controller from '../controllers/progression.controller';

const router = Router();

// ============================================================================
// Stage Routes
// ============================================================================

/**
 * @route   GET /api/v1/progression/stages
 * @desc    Get all relationship stages information
 * @access  Public
 */
router.get('/stages', controller.getStages);

// ============================================================================
// Progression Routes
// ============================================================================

/**
 * @route   POST /api/v1/progression
 * @desc    Create a new relationship progression
 * @access  Private
 */
router.post('/', authenticate, requireUserId, controller.createProgression);

/**
 * @route   GET /api/v1/progression/mine
 * @desc    Get all progressions for the current user
 * @access  Private
 */
router.get('/mine', authenticate, requireUserId, controller.getUserProgressions);

/**
 * @route   GET /api/v1/progression/conversation/:conversationId
 * @desc    Get progression by conversation ID
 * @access  Private
 */
router.get(
  '/conversation/:conversationId',
  authenticate,
  requireUserId,
  controller.getProgressionByConversation
);

/**
 * @route   GET /api/v1/progression/:progressionId
 * @desc    Get progression by ID
 * @access  Private
 */
router.get('/:progressionId', authenticate, requireUserId, controller.getProgression);

/**
 * @route   PUT /api/v1/progression/:progressionId/stage
 * @desc    Update relationship stage
 * @access  Private
 */
router.put('/:progressionId/stage', authenticate, requireUserId, controller.updateStage);

/**
 * @route   GET /api/v1/progression/:progressionId/timeline
 * @desc    Get relationship timeline
 * @access  Private
 */
router.get('/:progressionId/timeline', authenticate, requireUserId, controller.getTimeline);

/**
 * @route   GET /api/v1/progression/:progressionId/compatibility
 * @desc    Get compatibility insights
 * @access  Private
 */
router.get(
  '/:progressionId/compatibility',
  authenticate,
  requireUserId,
  controller.getCompatibility
);

// ============================================================================
// Milestone Routes
// ============================================================================

/**
 * @route   GET /api/v1/progression/milestones/templates
 * @desc    Get milestone templates
 * @access  Public
 */
router.get('/milestones/templates', controller.getMilestoneTemplates);

/**
 * @route   GET /api/v1/progression/:progressionId/milestones
 * @desc    Get milestones for a relationship
 * @access  Private
 */
router.get('/:progressionId/milestones', authenticate, requireUserId, controller.getMilestones);

/**
 * @route   POST /api/v1/progression/:progressionId/milestones
 * @desc    Create a milestone
 * @access  Private
 */
router.post('/:progressionId/milestones', authenticate, requireUserId, controller.createMilestone);

/**
 * @route   POST /api/v1/progression/milestones/:milestoneId/memory
 * @desc    Add memory to milestone
 * @access  Private
 */
router.post('/milestones/:milestoneId/memory', authenticate, requireUserId, controller.addMemory);

/**
 * @route   POST /api/v1/progression/milestones/:milestoneId/celebrate
 * @desc    Celebrate a milestone
 * @access  Private
 */
router.post(
  '/milestones/:milestoneId/celebrate',
  authenticate,
  requireUserId,
  controller.celebrate
);

/**
 * @route   GET /api/v1/progression/:progressionId/celebrations
 * @desc    Get celebration prompts
 * @access  Private
 */
router.get(
  '/:progressionId/celebrations',
  authenticate,
  requireUserId,
  controller.getCelebrationPrompts
);

// ============================================================================
// Experience Routes
// ============================================================================

/**
 * @route   POST /api/v1/progression/:progressionId/experiences
 * @desc    Create a shared experience
 * @access  Private
 */
router.post(
  '/:progressionId/experiences',
  authenticate,
  requireUserId,
  controller.createExperience
);

/**
 * @route   GET /api/v1/progression/:progressionId/experiences
 * @desc    Get experiences for a relationship
 * @access  Private
 */
router.get('/:progressionId/experiences', authenticate, requireUserId, controller.getExperiences);

/**
 * @route   POST /api/v1/progression/experiences/:experienceId/mood
 * @desc    Record mood for an experience
 * @access  Private
 */
router.post('/experiences/:experienceId/mood', authenticate, requireUserId, controller.recordMood);

export default router;
