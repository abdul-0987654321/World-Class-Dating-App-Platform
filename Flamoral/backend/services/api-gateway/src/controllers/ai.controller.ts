import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProxyService } from '../services/proxy.service';

@ApiTags('ai')
@ApiBearerAuth('JWT-auth')
@Controller('ai')
export class AIController {
  constructor(private readonly proxyService: ProxyService) {}

  /**
   * Get AI-powered profile suggestions
   */
  @Get('suggestions')
  @ApiOperation({ summary: 'Get AI-powered profile suggestions' })
  async getSuggestions(
    @Headers('authorization') authorization: string,
    @Query('limit') limit?: string,
  ) {
    const queryString = new URLSearchParams();
    if (limit) queryString.append('limit', limit);

    const path = `/api/ai/suggestions${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('aiService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Get conversation starters
   */
  @Get('conversation-starters/:matchId')
  @ApiOperation({ summary: 'Get AI conversation starters' })
  async getConversationStarters(
    @Headers('authorization') authorization: string,
    @Param('matchId') matchId: string,
  ) {
    return this.proxyService.get('aiService', `/api/ai/conversation-starters/${matchId}`, {
      Authorization: authorization,
    });
  }

  /**
   * Get profile optimization tips
   */
  @Get('profile/optimize')
  @ApiOperation({ summary: 'Get AI profile optimization tips' })
  async getProfileOptimization(@Headers('authorization') authorization: string) {
    return this.proxyService.get('aiService', '/api/ai/profile/optimize', {
      Authorization: authorization,
    });
  }

  /**
   * Generate bio suggestions
   */
  @Post('bio/generate')
  @ApiOperation({ summary: 'Generate AI bio suggestions' })
  @HttpCode(HttpStatus.OK)
  async generateBio(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('aiService', '/api/ai/bio/generate', body, {
      Authorization: authorization,
    });
  }

  /**
   * Get compatibility analysis
   */
  @Get('compatibility/:userId')
  @ApiOperation({ summary: 'Get AI compatibility analysis' })
  async getCompatibility(
    @Headers('authorization') authorization: string,
    @Param('userId') userId: string,
  ) {
    return this.proxyService.get('aiService', `/api/ai/compatibility/${userId}`, {
      Authorization: authorization,
    });
  }

  /**
   * Moderate content
   */
  @Post('moderate')
  @ApiOperation({ summary: 'AI content moderation' })
  @HttpCode(HttpStatus.OK)
  async moderateContent(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('aiService', '/api/ai/moderate', body, {
      Authorization: authorization,
    });
  }
}
