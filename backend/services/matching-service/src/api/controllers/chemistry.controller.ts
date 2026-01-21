import { createLogger } from '@flamoral/backend-shared';
import { Response } from 'express';

import { AuthRequest } from '../middleware/auth.middleware';
import chemistryMatchingService from '../../domain/services/chemistry-matching.service';
import {
  ChemistryScoreResponseDto,
  ChemistryExplanationDto,
  ChemistryProfileResponseDto,
  TopChemistryMatchesResponseDto,
  ChemistryAvailabilityResponseDto,
} from '../../dto/chemistry.dto';

const logger = createLogger('chemistry-controller');

/**
 * Chemistry Matching Controller
 *
 * Handles REST endpoints for the Chemistry Matching feature.
 * This is an experimental/research feature with limited rollout.
 *
 * All endpoints require authentication via JWT.
 */
export class ChemistryController {
  /**
   * Check if chemistry matching is available for the current user
   * GET /api/v1/matching/chemistry/availability
   */
  async checkAvailability(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const available = chemistryMatchingService.isAvailable(userId);

      const response: ChemistryAvailabilityResponseDto = {
        available,
        reason: available ? undefined : 'Chemistry matching is currently in limited beta',
      };

      res.status(200).json({
        success: true,
        data: response,
      });
    } catch (error) {
      logger.error('Failed to check chemistry availability', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check availability',
      });
    }
  }

  /**
   * Build chemistry profile from behavior data
   * POST /api/v1/matching/chemistry/profile
   *
   * This endpoint analyzes user behavior data to build a chemistry profile
   * that can be used for matching with other users.
   */
  async buildProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      // Check feature availability
      if (!chemistryMatchingService.isAvailable(userId)) {
        res.status(403).json({
          success: false,
          error: 'Chemistry matching is not available for your account',
          code: 'FEATURE_NOT_AVAILABLE',
        });
        return;
      }

      const { behaviorData, forceRebuild } = req.body;

      const profile = await chemistryMatchingService.buildChemistryProfile({
        userId,
        behaviorData,
        forceRebuild,
      });

      const response: ChemistryProfileResponseDto = {
        userId: profile.userId,
        primaryPersonalityType: profile.primaryPersonalityType,
        energyLevel: profile.energyLevel,
        mysteryFactor: profile.mysteryFactor,
        warmthFactor: profile.warmthFactor,
        dataQuality: profile.dataQuality,
        totalInteractions: profile.totalInteractions,
        lastCalculated: profile.lastCalculated.toISOString(),
      };

      res.status(200).json({
        success: true,
        data: response,
      });
    } catch (error) {
      logger.error('Failed to build chemistry profile', error);
      res.status(500).json({
        success: false,
        error: 'Failed to build chemistry profile',
      });
    }
  }

  /**
   * Get user's chemistry profile
   * GET /api/v1/matching/chemistry/profile
   */
  async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      // Check feature availability
      if (!chemistryMatchingService.isAvailable(userId)) {
        res.status(403).json({
          success: false,
          error: 'Chemistry matching is not available for your account',
          code: 'FEATURE_NOT_AVAILABLE',
        });
        return;
      }

      const profile = chemistryMatchingService.getProfile(userId);

      if (!profile) {
        res.status(404).json({
          success: false,
          error: 'Chemistry profile not found. Build one first by posting behavior data.',
        });
        return;
      }

      const response: ChemistryProfileResponseDto = {
        userId: profile.userId,
        primaryPersonalityType: profile.primaryPersonalityType,
        energyLevel: profile.energyLevel,
        mysteryFactor: profile.mysteryFactor,
        warmthFactor: profile.warmthFactor,
        dataQuality: profile.dataQuality,
        totalInteractions: profile.totalInteractions,
        lastCalculated: profile.lastCalculated.toISOString(),
      };

      res.status(200).json({
        success: true,
        data: response,
      });
    } catch (error) {
      logger.error('Failed to get chemistry profile', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve chemistry profile',
      });
    }
  }

  /**
   * Calculate chemistry score with a specific match
   * GET /api/v1/matching/chemistry/score/:matchId
   */
  async getChemistryScore(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const { matchId } = req.params;

      if (!matchId) {
        res.status(400).json({
          success: false,
          error: 'Match ID is required',
        });
        return;
      }

      // Check feature availability
      if (!chemistryMatchingService.isAvailable(userId)) {
        res.status(403).json({
          success: false,
          error: 'Chemistry matching is not available for your account',
          code: 'FEATURE_NOT_AVAILABLE',
        });
        return;
      }

      // Get both profiles
      const userProfile = chemistryMatchingService.getProfile(userId);
      const matchProfile = chemistryMatchingService.getProfile(matchId);

      if (!userProfile) {
        res.status(404).json({
          success: false,
          error: 'Your chemistry profile not found. Build one first.',
        });
        return;
      }

      if (!matchProfile) {
        res.status(404).json({
          success: false,
          error: 'Match chemistry profile not available',
        });
        return;
      }

      // Calculate chemistry score
      const score = chemistryMatchingService.calculateChemistryScore(userProfile, matchProfile);

      const response: ChemistryScoreResponseDto = {
        matchId,
        overall: score.overall,
        confidence: score.confidence,
        dimensions: score.dimensions,
        sparkPotential: score.sparkPotential,
        antiPatterns: score.antiPatterns.map((ap) => ({
          type: ap.type,
          severity: ap.severity,
          description: ap.description,
          recommendation: ap.recommendation,
        })),
        weights: score.weights,
      };

      res.status(200).json({
        success: true,
        data: response,
      });
    } catch (error) {
      logger.error('Failed to calculate chemistry score', error);
      res.status(500).json({
        success: false,
        error: 'Failed to calculate chemistry score',
      });
    }
  }

  /**
   * Get top chemistry matches from the user's potential matches
   * GET /api/v1/matching/chemistry/top-matches
   */
  async getTopMatches(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      // Check feature availability
      if (!chemistryMatchingService.isAvailable(userId)) {
        res.status(403).json({
          success: false,
          error: 'Chemistry matching is not available for your account',
          code: 'FEATURE_NOT_AVAILABLE',
        });
        return;
      }

      const { limit, minimumScore, includeExplanations } = (req as any).validatedQuery || req.query;

      // Parse query params with defaults
      const parsedLimit = limit ? parseInt(String(limit), 10) : 20;
      const parsedMinScore = minimumScore ? parseInt(String(minimumScore), 10) : 75;
      const shouldIncludeExplanations = includeExplanations !== 'false';

      // Get user's profile first
      const userProfile = chemistryMatchingService.getProfile(userId);
      if (!userProfile) {
        res.status(404).json({
          success: false,
          error: 'Your chemistry profile not found. Build one first.',
        });
        return;
      }

      // In a real implementation, we would fetch candidate IDs from the matching service
      // For now, we'll return an appropriate message
      // This would typically integrate with the recommendation service

      // Placeholder: In production, get candidate IDs from match repository
      const candidateIds: string[] = []; // Would be populated from database

      const result = await chemistryMatchingService.findHighChemistryMatches({
        userId,
        candidateIds,
        limit: parsedLimit,
        minimumScore: parsedMinScore,
        includeExplanations: shouldIncludeExplanations,
      });

      const response: TopChemistryMatchesResponseDto = {
        matches: result.matches.map((match) => ({
          matchId: match.matchId,
          score: {
            matchId: match.matchId,
            overall: match.score.overall,
            confidence: match.score.confidence,
            dimensions: match.score.dimensions,
            sparkPotential: match.score.sparkPotential,
            antiPatterns: match.score.antiPatterns.map((ap) => ({
              type: ap.type,
              severity: ap.severity,
              description: ap.description,
              recommendation: ap.recommendation,
            })),
            weights: match.score.weights,
          },
          explanation: shouldIncludeExplanations ? {
            matchId: match.matchId,
            summary: match.explanation.summary,
            highlights: match.explanation.highlights,
            concerns: match.explanation.concerns,
            tips: match.explanation.tips,
            iceBreakers: match.explanation.iceBreakers,
            factors: match.chemistryFactors.map((f) => ({
              factor: f.factor,
              score: f.score,
              weight: f.weight,
              positive: f.positive,
              explanation: f.explanation,
            })),
          } : undefined,
          predictedOutcome: match.predictedOutcome,
          calculatedAt: match.calculatedAt.toISOString(),
        })),
        totalCandidates: result.totalCandidates,
        profilesWithInsufficientData: result.profilesWithInsufficientData,
        calculationTime: result.calculationTime,
      };

      res.status(200).json({
        success: true,
        data: response,
      });
    } catch (error) {
      logger.error('Failed to get top chemistry matches', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve top matches',
      });
    }
  }

  /**
   * Get chemistry explanation for a specific match
   * GET /api/v1/matching/chemistry/explain/:matchId
   */
  async getChemistryExplanation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const { matchId } = req.params;

      if (!matchId) {
        res.status(400).json({
          success: false,
          error: 'Match ID is required',
        });
        return;
      }

      // Check feature availability
      if (!chemistryMatchingService.isAvailable(userId)) {
        res.status(403).json({
          success: false,
          error: 'Chemistry matching is not available for your account',
          code: 'FEATURE_NOT_AVAILABLE',
        });
        return;
      }

      // Get both profiles
      const userProfile = chemistryMatchingService.getProfile(userId);
      const matchProfile = chemistryMatchingService.getProfile(matchId);

      if (!userProfile) {
        res.status(404).json({
          success: false,
          error: 'Your chemistry profile not found. Build one first.',
        });
        return;
      }

      if (!matchProfile) {
        res.status(404).json({
          success: false,
          error: 'Match chemistry profile not available',
        });
        return;
      }

      // Calculate chemistry score and get explanation
      const score = chemistryMatchingService.calculateChemistryScore(userProfile, matchProfile);
      const explanation = chemistryMatchingService.explainChemistry(score, userProfile, matchProfile);

      // Extract factors
      const factors = [
        {
          factor: 'Schedule Alignment',
          score: score.dimensions.rhythmSync,
          weight: score.weights.rhythmSync,
          positive: score.dimensions.rhythmSync >= 60,
          explanation: score.dimensions.rhythmSync >= 70
            ? 'Your online times overlap well'
            : score.dimensions.rhythmSync >= 40
            ? 'Some overlap in your schedules'
            : 'Different schedules may slow responses',
        },
        {
          factor: 'Communication Style',
          score: score.dimensions.engagementMatch,
          weight: score.weights.engagementMatch,
          positive: score.dimensions.engagementMatch >= 60,
          explanation: score.dimensions.engagementMatch >= 70
            ? 'Compatible messaging styles'
            : 'Different but potentially complementary styles',
        },
        {
          factor: 'Personality Match',
          score: score.dimensions.personalityComplement,
          weight: score.weights.personalityComplement,
          positive: score.dimensions.personalityComplement >= 60,
          explanation: score.dimensions.personalityComplement >= 70
            ? 'Well-matched personalities'
            : 'Personalities that may need adjustment',
        },
        {
          factor: 'Energy Level',
          score: score.dimensions.energyMatch,
          weight: score.weights.energyMatch,
          positive: score.dimensions.energyMatch >= 60,
          explanation: score.dimensions.energyMatch >= 70
            ? 'Well-matched conversation energy'
            : 'Different energy levels',
        },
      ];

      const response: ChemistryExplanationDto = {
        matchId,
        summary: explanation.summary,
        highlights: explanation.highlights,
        concerns: explanation.concerns,
        tips: explanation.tips,
        iceBreakers: explanation.iceBreakers,
        factors,
      };

      res.status(200).json({
        success: true,
        data: response,
      });
    } catch (error) {
      logger.error('Failed to get chemistry explanation', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve chemistry explanation',
      });
    }
  }

  /**
   * Find high chemistry matches from a provided list of candidates
   * POST /api/v1/matching/chemistry/find-matches
   */
  async findMatches(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      // Check feature availability
      if (!chemistryMatchingService.isAvailable(userId)) {
        res.status(403).json({
          success: false,
          error: 'Chemistry matching is not available for your account',
          code: 'FEATURE_NOT_AVAILABLE',
        });
        return;
      }

      const { candidateIds, limit, minimumScore, includeExplanations } = req.body;

      // Validate candidateIds
      if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'At least one candidate ID is required',
        });
        return;
      }

      // Get user's profile first
      const userProfile = chemistryMatchingService.getProfile(userId);
      if (!userProfile) {
        res.status(404).json({
          success: false,
          error: 'Your chemistry profile not found. Build one first.',
        });
        return;
      }

      const result = await chemistryMatchingService.findHighChemistryMatches({
        userId,
        candidateIds,
        limit: limit ?? 20,
        minimumScore: minimumScore ?? 75,
        includeExplanations: includeExplanations ?? true,
      });

      const response: TopChemistryMatchesResponseDto = {
        matches: result.matches.map((match) => ({
          matchId: match.matchId,
          score: {
            matchId: match.matchId,
            overall: match.score.overall,
            confidence: match.score.confidence,
            dimensions: match.score.dimensions,
            sparkPotential: match.score.sparkPotential,
            antiPatterns: match.score.antiPatterns.map((ap) => ({
              type: ap.type,
              severity: ap.severity,
              description: ap.description,
              recommendation: ap.recommendation,
            })),
            weights: match.score.weights,
          },
          explanation: includeExplanations !== false ? {
            matchId: match.matchId,
            summary: match.explanation.summary,
            highlights: match.explanation.highlights,
            concerns: match.explanation.concerns,
            tips: match.explanation.tips,
            iceBreakers: match.explanation.iceBreakers,
            factors: match.chemistryFactors.map((f) => ({
              factor: f.factor,
              score: f.score,
              weight: f.weight,
              positive: f.positive,
              explanation: f.explanation,
            })),
          } : undefined,
          predictedOutcome: match.predictedOutcome,
          calculatedAt: match.calculatedAt.toISOString(),
        })),
        totalCandidates: result.totalCandidates,
        profilesWithInsufficientData: result.profilesWithInsufficientData,
        calculationTime: result.calculationTime,
      };

      res.status(200).json({
        success: true,
        data: response,
      });
    } catch (error) {
      logger.error('Failed to find chemistry matches', error);
      res.status(500).json({
        success: false,
        error: 'Failed to find matches',
      });
    }
  }
}

export default new ChemistryController();
