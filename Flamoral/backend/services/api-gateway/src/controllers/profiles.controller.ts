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

@ApiTags('profiles')
@ApiBearerAuth('JWT-auth')
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly proxyService: ProxyService) {}

  /**
   * Get all profiles (admin or listing)
   */
  @Get()
  @ApiOperation({ summary: 'Get all profiles' })
  async getAllProfiles(
    @Headers('authorization') authorization: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const queryString = new URLSearchParams();
    if (limit) queryString.append('limit', limit);
    if (offset) queryString.append('offset', offset);

    const path = `/api/users${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('userService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Get profile recommendations
   * NOTE: Must be BEFORE :profileId to avoid route conflict
   */
  @Get('recommendations')
  @ApiOperation({ summary: 'Get recommended profiles' })
  async getRecommendations(
    @Headers('authorization') authorization: string,
    @Query('limit') limit?: string,
  ) {
    const queryString = new URLSearchParams();
    if (limit) queryString.append('limit', limit);

    const path = `/api/discovery/recommendations${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('matchingService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Search profiles
   */
  @Post('search')
  @ApiOperation({ summary: 'Search profiles' })
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
   * Get profile by ID
   * NOTE: Must be AFTER specific routes like /recommendations to avoid conflicts
   */
  @Get(':profileId')
  @ApiOperation({ summary: 'Get profile by ID' })
  async getProfile(
    @Headers('authorization') authorization: string,
    @Param('profileId') profileId: string,
  ) {
    return this.proxyService.get('userService', `/api/users/${profileId}`, {
      Authorization: authorization,
    });
  }
}
