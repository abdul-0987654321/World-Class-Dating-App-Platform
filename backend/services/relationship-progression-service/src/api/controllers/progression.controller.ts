/**
 * Progression Controller
 * HTTP handlers for relationship progression endpoints
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { progressionService } from '../../domain/services/progression.service';
import { milestoneService } from '../../domain/services/milestone.service';
import {
  CreateProgressionRequest,
  UpdateStageRequest,
  CreateMilestoneRequest,
  AddMemoryRequest,
  CreateExperienceRequest,
  RecordMoodRequest,
  CelebrateRequest,
} from '../../domain/types/progression.types';

// ============================================================================
// Progression Endpoints
// ============================================================================

/**
 * Get all stages information
 */
export async function getStages(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const stages = progressionService.getStages();

    res.json({
      success: true,
      data: stages,
    });
  } catch (error) {
    console.error('Failed to get stages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stages',
    });
  }
}

/**
 * Create a new relationship progression
 */
export async function createProgression(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const request: CreateProgressionRequest = req.body;

    if (!request.partnerId || !request.conversationId) {
      res.status(400).json({
        success: false,
        error: 'partnerId and conversationId are required',
      });
      return;
    }

    const progression = await progressionService.createProgression(userId, request);

    res.status(201).json({
      success: true,
      data: progression,
    });
  } catch (error) {
    console.error('Failed to create progression:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create progression',
    });
  }
}

/**
 * Get progression by ID
 */
export async function getProgression(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { progressionId } = req.params;

    const progression = await progressionService.getProgression(progressionId);

    if (!progression) {
      res.status(404).json({
        success: false,
        error: 'Progression not found',
      });
      return;
    }

    res.json({
      success: true,
      data: progression,
    });
  } catch (error) {
    console.error('Failed to get progression:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get progression',
    });
  }
}

/**
 * Get progression by conversation ID
 */
export async function getProgressionByConversation(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { conversationId } = req.params;

    const progression = await progressionService.getProgressionByConversation(conversationId);

    if (!progression) {
      res.status(404).json({
        success: false,
        error: 'Progression not found for this conversation',
      });
      return;
    }

    res.json({
      success: true,
      data: progression,
    });
  } catch (error) {
    console.error('Failed to get progression:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get progression',
    });
  }
}

/**
 * Get all progressions for the current user
 */
export async function getUserProgressions(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;

    const progressions = await progressionService.getUserProgressions(userId);

    res.json({
      success: true,
      data: progressions,
    });
  } catch (error) {
    console.error('Failed to get user progressions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get progressions',
    });
  }
}

/**
 * Update relationship stage
 */
export async function updateStage(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { progressionId } = req.params;
    const request: UpdateStageRequest = req.body;

    if (!request.newStage) {
      res.status(400).json({
        success: false,
        error: 'newStage is required',
      });
      return;
    }

    const progression = await progressionService.updateStage(progressionId, userId, request);

    res.json({
      success: true,
      data: progression,
    });
  } catch (error) {
    console.error('Failed to update stage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update stage',
    });
  }
}

/**
 * Get relationship timeline
 */
export async function getTimeline(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { progressionId } = req.params;

    const timeline = await progressionService.getTimeline(progressionId);

    res.json({
      success: true,
      data: timeline,
    });
  } catch (error) {
    console.error('Failed to get timeline:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get timeline',
    });
  }
}

/**
 * Get compatibility insights
 */
export async function getCompatibility(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { progressionId } = req.params;

    const insights = await progressionService.getCompatibilityInsights(progressionId);

    res.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    console.error('Failed to get compatibility:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get compatibility insights',
    });
  }
}

// ============================================================================
// Milestone Endpoints
// ============================================================================

/**
 * Get milestone templates
 */
export async function getMilestoneTemplates(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const templates = milestoneService.getTemplates();

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error('Failed to get templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get milestone templates',
    });
  }
}

/**
 * Get milestones for a relationship
 */
export async function getMilestones(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { progressionId } = req.params;

    const milestones = await milestoneService.getMilestones(progressionId);

    res.json({
      success: true,
      data: milestones,
    });
  } catch (error) {
    console.error('Failed to get milestones:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get milestones',
    });
  }
}

/**
 * Create a milestone
 */
export async function createMilestone(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { progressionId } = req.params;
    const request: CreateMilestoneRequest = req.body;

    if (!request.type) {
      res.status(400).json({
        success: false,
        error: 'type is required',
      });
      return;
    }

    const milestone = await milestoneService.createMilestone(progressionId, userId, request);

    res.status(201).json({
      success: true,
      data: milestone,
    });
  } catch (error) {
    console.error('Failed to create milestone:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create milestone',
    });
  }
}

/**
 * Add memory to milestone
 */
export async function addMemory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { milestoneId } = req.params;
    const request: AddMemoryRequest = req.body;

    if (!request.type || !request.content) {
      res.status(400).json({
        success: false,
        error: 'type and content are required',
      });
      return;
    }

    const memory = await milestoneService.addMemory(milestoneId, userId, request);

    res.status(201).json({
      success: true,
      data: memory,
    });
  } catch (error) {
    console.error('Failed to add memory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add memory',
    });
  }
}

/**
 * Celebrate a milestone
 */
export async function celebrate(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { milestoneId } = req.params;

    const milestone = await milestoneService.celebrate(milestoneId, userId);

    res.json({
      success: true,
      data: milestone,
    });
  } catch (error) {
    console.error('Failed to celebrate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to celebrate milestone',
    });
  }
}

/**
 * Get celebration prompts
 */
export async function getCelebrationPrompts(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.userId!;
    const { progressionId } = req.params;

    const prompts = await milestoneService.getCelebrationPrompts(progressionId, userId);

    res.json({
      success: true,
      data: prompts,
    });
  } catch (error) {
    console.error('Failed to get celebration prompts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get celebration prompts',
    });
  }
}

// ============================================================================
// Experience Endpoints
// ============================================================================

/**
 * Create a shared experience
 */
export async function createExperience(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { progressionId } = req.params;
    const request: CreateExperienceRequest = req.body;

    if (!request.type || !request.title || !request.date) {
      res.status(400).json({
        success: false,
        error: 'type, title, and date are required',
      });
      return;
    }

    const experience = await progressionService.createExperience(progressionId, userId, request);

    res.status(201).json({
      success: true,
      data: experience,
    });
  } catch (error) {
    console.error('Failed to create experience:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create experience',
    });
  }
}

/**
 * Get experiences for a relationship
 */
export async function getExperiences(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { progressionId } = req.params;

    const experiences = await progressionService.getExperiences(progressionId);

    res.json({
      success: true,
      data: experiences,
    });
  } catch (error) {
    console.error('Failed to get experiences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get experiences',
    });
  }
}

/**
 * Record mood for an experience
 */
export async function recordMood(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const request: RecordMoodRequest = {
      experienceId: req.params.experienceId,
      mood: req.body.mood,
    };

    if (!request.mood) {
      res.status(400).json({
        success: false,
        error: 'mood is required',
      });
      return;
    }

    const experience = await progressionService.recordMood(userId, request);

    res.json({
      success: true,
      data: experience,
    });
  } catch (error) {
    console.error('Failed to record mood:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record mood',
    });
  }
}
