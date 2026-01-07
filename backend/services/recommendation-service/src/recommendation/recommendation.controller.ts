import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpException,
} from '@nestjs/common';

import logger from '../utils/logger';
import { RecommendationService, Recommendation, BoostStatus } from './recommendation.service';

interface GetRecommendationsQuery {
  limit?: number;
}

interface RecordInteractionDto {
  targetId: string;
  action: 'like' | 'pass' | 'super_like' | 'view';
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp: string;
}

@Controller('api/v1/recommendations')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  /**
   * GET /api/v1/recommendations/:userId
   * Get personalized recommendations for a user
   */
  @Get(':userId')
  async getRecommendations(
    @Param('userId') userId: string,
    @Query() query: GetRecommendationsQuery
  ): Promise<ApiResponse<{ recommendations: Recommendation[]; count: number }>> {
    try {
      const limit = Math.min(query.limit || 20, 100);
      logger.info(`GET recommendations for user ${userId}, limit: ${limit}`);

      const recommendations = await this.recommendationService.getRecommendations(userId, limit);

      return {
        success: true,
        data: {
          recommendations,
          count: recommendations.length,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Failed to get recommendations for user ${userId}:`, error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch recommendations',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * POST /api/v1/recommendations/:userId/refresh
   * Force refresh recommendations for a user
   */
  @Post(':userId/refresh')
  async refreshRecommendations(
    @Param('userId') userId: string
  ): Promise<ApiResponse<{ recommendations: Recommendation[]; count: number }>> {
    try {
      logger.info(`POST refresh recommendations for user ${userId}`);

      const recommendations = await this.recommendationService.refreshRecommendations(userId);

      return {
        success: true,
        data: {
          recommendations,
          count: recommendations.length,
        },
        message: 'Recommendations refreshed successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Failed to refresh recommendations for user ${userId}:`, error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to refresh recommendations',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * POST /api/v1/recommendations/:userId/interactions
   * Record a user interaction for improving recommendations
   */
  @Post(':userId/interactions')
  async recordInteraction(
    @Param('userId') userId: string,
    @Body() dto: RecordInteractionDto
  ): Promise<ApiResponse<{ recorded: boolean }>> {
    try {
      if (!dto.targetId || !dto.action) {
        throw new HttpException(
          {
            success: false,
            message: 'targetId and action are required',
            timestamp: new Date().toISOString(),
          },
          HttpStatus.BAD_REQUEST
        );
      }

      const validActions = ['like', 'pass', 'super_like', 'view'];
      if (!validActions.includes(dto.action)) {
        throw new HttpException(
          {
            success: false,
            message: `Invalid action. Must be one of: ${validActions.join(', ')}`,
            timestamp: new Date().toISOString(),
          },
          HttpStatus.BAD_REQUEST
        );
      }

      logger.info(`POST interaction: ${userId} -> ${dto.targetId}, action: ${dto.action}`);

      const result = await this.recommendationService.recordInteraction(
        userId,
        dto.targetId,
        dto.action
      );

      return {
        success: result.success,
        data: {
          recorded: result.recorded,
        },
        message: result.recorded ? 'Interaction recorded' : 'Interaction logged (cache unavailable)',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      logger.error(`Failed to record interaction for user ${userId}:`, error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to record interaction',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * GET /api/v1/recommendations/:userId/boost
   * Get the current boost status for a user
   */
  @Get(':userId/boost')
  async getBoostStatus(
    @Param('userId') userId: string
  ): Promise<ApiResponse<BoostStatus>> {
    try {
      logger.info(`GET boost status for user ${userId}`);

      const boostStatus = await this.recommendationService.getBoostStatus(userId);

      return {
        success: true,
        data: boostStatus,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Failed to get boost status for user ${userId}:`, error);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch boost status',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
