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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProxyService } from '../services/proxy.service';

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
    @Query('offset') offset?: string,
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
  async searchProfiles(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('matchingService', '/api/discovery/search', body, {
      Authorization: authorization,
    });
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
    @Query('limit') limit?: string,
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
  async likeProfile(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
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
    @Query('offset') offset?: string,
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
    @Query('offset') offset?: string,
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
  async passProfile(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
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
    return this.proxyService.post('matchingService', '/api/actions/undo', {}, {
      Authorization: authorization,
    });
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
    @Query('offset') offset?: string,
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
    @Param('matchId') matchId: string,
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
    @Param('matchId') matchId: string,
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
  async superLike(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
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
    return this.proxyService.post('matchingService', '/api/boost', {}, {
      Authorization: authorization,
    });
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
    @Param('matchId') matchId: string,
  ) {
    return this.proxyService.get('matchingService', `/api/matches/${matchId}/compatibility`, {
      Authorization: authorization,
    });
  }
}
