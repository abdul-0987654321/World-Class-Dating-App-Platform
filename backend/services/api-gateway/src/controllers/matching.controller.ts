import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiBody } from '@nestjs/swagger';

import { CurrentUser, JwtPayload } from '../decorators/current-user.decorator';
import { RequireSubscription, SubscriptionTier } from '../decorators/subscription.decorator';
import { ProxyService } from '../services/proxy.service';

// DTOs for super-like endpoint
interface SuperLikeRequest {
  target_user_id: string;
}

interface SuperLikeResponse {
  super_liked: boolean;
  matched?: boolean;
  match_id?: string;
  remaining_super_likes: number;
}

// Tier-based daily super-like limits
const SUPER_LIKE_LIMITS: Record<string, number> = {
  free: 1,
  basic: 3,
  plus: 5,
  premium: 10,
  premium_plus: -1, // unlimited
  elite: -1, // unlimited
};

@ApiTags('matches', 'discovery')
@ApiBearerAuth('JWT-auth')
@Controller()
export class MatchingController {
  constructor(private readonly proxyService: ProxyService) {}

  // ==================== Discovery Endpoints ====================

  /**
   * Get recommended profiles
   */
  @Get('discovery/recommendations')
  @ApiOperation({ summary: 'Get recommended profiles for matching' })
  async getRecommendations(
    @Headers('authorization') authorization: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const queryString = new URLSearchParams();
    if (limit) queryString.append('limit', limit);
    if (offset) queryString.append('offset', offset);

    const path = `/api/discovery/recommendations${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('matchingService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Search for profiles
   */
  @Post('discovery/search')
  @ApiOperation({ summary: 'Search for profiles with filters' })
  @HttpCode(HttpStatus.OK)
  async searchProfiles(@Headers('authorization') authorization: string, @Body() body: any) {
    return this.proxyService.post('matchingService', '/api/discovery/search', body, {
      Authorization: authorization,
    });
  }

  /**
   * Super-like a user (tier enforced - Plus/Premium only for higher limits)
   * Free users get 1/day, Plus get 5/day, Premium get 10/day
   */
  @Post('discovery/super-like')
  @ApiOperation({ summary: 'Super-like a user (tier enforced)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['target_user_id'],
      properties: {
        target_user_id: {
          type: 'string',
          format: 'uuid',
          description: 'UUID of the user to super-like',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Super-like recorded successfully',
    schema: {
      type: 'object',
      properties: {
        super_liked: { type: 'boolean' },
        matched: { type: 'boolean' },
        match_id: { type: 'string' },
        remaining_super_likes: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid target_user_id' })
  @ApiResponse({
    status: 402,
    description: 'Payment required - upgrade subscription for more super-likes',
  })
  @ApiResponse({ status: 429, description: 'Rate limited - daily super-like limit reached' })
  @HttpCode(HttpStatus.OK)
  async superLikeUser(
    @Headers('authorization') authorization: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: SuperLikeRequest
  ): Promise<SuperLikeResponse> {
    // Validate request
    if (!body.target_user_id) {
      throw new BadRequestException({
        code: 'INVALID_REQUEST',
        message: 'target_user_id is required',
        correlation_id: this.generateCorrelationId(),
      });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(body.target_user_id)) {
      throw new BadRequestException({
        code: 'INVALID_UUID',
        message: 'target_user_id must be a valid UUID',
        correlation_id: this.generateCorrelationId(),
      });
    }

    // Get user's subscription tier
    const tier = user?.subscription || 'free';
    const dailyLimit = SUPER_LIKE_LIMITS[tier] ?? SUPER_LIKE_LIMITS.free;

    // Check current usage for non-unlimited tiers
    if (dailyLimit !== -1) {
      try {
        const usageStats = await this.proxyService.get(
          'matchingService',
          '/api/super-likes/usage/today',
          {
            Authorization: authorization,
          }
        );

        const usedToday = usageStats?.count || 0;

        if (usedToday >= dailyLimit) {
          // Determine if user can upgrade
          const canUpgrade = tier === 'free' || tier === 'basic' || tier === 'plus';

          if (canUpgrade) {
            throw new HttpException(
              {
                code: 'SUPER_LIKE_LIMIT_REACHED',
                message: `Daily super-like limit reached (${dailyLimit}/${dailyLimit}). Upgrade for more super-likes.`,
                required_plan: tier === 'free' ? 'plus' : 'premium',
                current_plan: tier,
                correlation_id: this.generateCorrelationId(),
              },
              402
            );
          } else {
            throw new HttpException(
              {
                code: 'RATE_LIMITED',
                message: `Daily super-like limit reached. Try again tomorrow.`,
                correlation_id: this.generateCorrelationId(),
              },
              429
            );
          }
        }
      } catch (error) {
        // If it's our own HttpException, re-throw it
        if (error instanceof HttpException) {
          throw error;
        }
        // Otherwise, continue with the super-like (usage check failed gracefully)
      }
    }

    // Send super-like to matching service
    try {
      const result = await this.proxyService.post(
        'matchingService',
        '/api/super-likes',
        { targetUserId: body.target_user_id },
        { Authorization: authorization }
      );

      // Get remaining count
      let remaining = -1;
      if (dailyLimit !== -1) {
        try {
          const usageAfter = await this.proxyService.get(
            'matchingService',
            '/api/super-likes/usage/today',
            {
              Authorization: authorization,
            }
          );
          remaining = Math.max(0, dailyLimit - (usageAfter?.count || 1));
        } catch {
          remaining = Math.max(0, dailyLimit - 1);
        }
      }

      return {
        super_liked: true,
        matched: result?.matched || false,
        match_id: result?.matchId,
        remaining_super_likes: remaining,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException({
        code: 'SUPER_LIKE_FAILED',
        message: 'Failed to process super-like',
        correlation_id: this.generateCorrelationId(),
      });
    }
  }

  /**
   * Generate a correlation ID for error tracking
   */
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get nearby users
   */
  @Get('discovery/nearby')
  @ApiOperation({ summary: 'Get nearby users' })
  async getNearbyUsers(
    @Headers('authorization') authorization: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
    @Query('radius') radius?: string,
    @Query('limit') limit?: string
  ) {
    const queryString = new URLSearchParams();
    if (latitude) queryString.append('latitude', latitude);
    if (longitude) queryString.append('longitude', longitude);
    if (radius) queryString.append('radius', radius);
    if (limit) queryString.append('limit', limit);

    const path = `/api/discovery/nearby${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('matchingService', path, {
      Authorization: authorization,
    });
  }

  // ==================== Like/Pass Endpoints ====================

  /**
   * Like a profile
   */
  @Post('likes')
  @ApiOperation({ summary: 'Like a profile' })
  @HttpCode(HttpStatus.CREATED)
  async likeProfile(@Headers('authorization') authorization: string, @Body() body: any) {
    return this.proxyService.post('matchingService', '/api/likes', body, {
      Authorization: authorization,
    });
  }

  /**
   * Get users who liked me
   */
  @Get('likes/received')
  @ApiOperation({ summary: 'Get users who liked me' })
  async getLikesReceived(
    @Headers('authorization') authorization: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const queryString = new URLSearchParams();
    if (limit) queryString.append('limit', limit);
    if (offset) queryString.append('offset', offset);

    const path = `/api/likes/received${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('matchingService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Get users I liked
   */
  @Get('likes/sent')
  @ApiOperation({ summary: 'Get users I liked' })
  async getLikesSent(
    @Headers('authorization') authorization: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const queryString = new URLSearchParams();
    if (limit) queryString.append('limit', limit);
    if (offset) queryString.append('offset', offset);

    const path = `/api/likes/sent${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('matchingService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Pass on a profile
   */
  @Post('passes')
  @ApiOperation({ summary: 'Pass on a profile' })
  @HttpCode(HttpStatus.CREATED)
  async passProfile(@Headers('authorization') authorization: string, @Body() body: any) {
    return this.proxyService.post('matchingService', '/api/passes', body, {
      Authorization: authorization,
    });
  }

  /**
   * Undo last action (like/pass)
   */
  @Post('actions/undo')
  @ApiOperation({ summary: 'Undo last swipe action' })
  @HttpCode(HttpStatus.OK)
  async undoAction(@Headers('authorization') authorization: string) {
    return this.proxyService.post(
      'matchingService',
      '/api/actions/undo',
      {},
      {
        Authorization: authorization,
      }
    );
  }

  // ==================== Match Endpoints ====================

  /**
   * Get all matches
   */
  @Get('matches')
  @ApiOperation({ summary: 'Get all matches' })
  async getMatches(
    @Headers('authorization') authorization: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const queryString = new URLSearchParams();
    if (limit) queryString.append('limit', limit);
    if (offset) queryString.append('offset', offset);

    const path = `/api/matches${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('matchingService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Get a specific match
   */
  @Get('matches/:matchId')
  @ApiOperation({ summary: 'Get a specific match' })
  async getMatch(
    @Headers('authorization') authorization: string,
    @Param('matchId') matchId: string
  ) {
    return this.proxyService.get('matchingService', `/api/matches/${matchId}`, {
      Authorization: authorization,
    });
  }

  /**
   * Unmatch a user
   */
  @Delete('matches/:matchId')
  @ApiOperation({ summary: 'Unmatch a user' })
  async unmatch(
    @Headers('authorization') authorization: string,
    @Param('matchId') matchId: string
  ) {
    return this.proxyService.delete('matchingService', `/api/matches/${matchId}`, {
      Authorization: authorization,
    });
  }

  /**
   * Get match count
   */
  @Get('matches/count')
  @ApiOperation({ summary: 'Get total match count' })
  async getMatchCount(@Headers('authorization') authorization: string) {
    return this.proxyService.get('matchingService', '/api/matches/count', {
      Authorization: authorization,
    });
  }

  // ==================== Super Like Endpoints ====================

  /**
   * Super like a profile
   */
  @Post('super-likes')
  @ApiOperation({ summary: 'Super like a profile' })
  @HttpCode(HttpStatus.CREATED)
  async superLike(@Headers('authorization') authorization: string, @Body() body: any) {
    return this.proxyService.post('matchingService', '/api/super-likes', body, {
      Authorization: authorization,
    });
  }

  /**
   * Get remaining super likes
   */
  @Get('super-likes/remaining')
  @ApiOperation({ summary: 'Get remaining super likes count' })
  async getRemainingSuperLikes(@Headers('authorization') authorization: string) {
    return this.proxyService.get('matchingService', '/api/super-likes/remaining', {
      Authorization: authorization,
    });
  }

  // ==================== Boost Endpoints ====================

  /**
   * Activate profile boost
   */
  @Post('boost')
  @ApiOperation({ summary: 'Activate profile boost' })
  @HttpCode(HttpStatus.CREATED)
  async activateBoost(@Headers('authorization') authorization: string) {
    return this.proxyService.post(
      'matchingService',
      '/api/boost',
      {},
      {
        Authorization: authorization,
      }
    );
  }

  /**
   * Get boost status
   */
  @Get('boost/status')
  @ApiOperation({ summary: 'Get current boost status' })
  async getBoostStatus(@Headers('authorization') authorization: string) {
    return this.proxyService.get('matchingService', '/api/boost/status', {
      Authorization: authorization,
    });
  }

  // ==================== Match Quality Endpoints ====================

  /**
   * Get match compatibility score
   */
  @Get('matches/:matchId/compatibility')
  @ApiOperation({ summary: 'Get compatibility score with a match' })
  async getCompatibilityScore(
    @Headers('authorization') authorization: string,
    @Param('matchId') matchId: string
  ) {
    return this.proxyService.get('matchingService', `/api/matches/${matchId}/compatibility`, {
      Authorization: authorization,
    });
  }
}
