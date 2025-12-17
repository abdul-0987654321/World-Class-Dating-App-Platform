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

@ApiTags('advertising')
@ApiBearerAuth('JWT-auth')
@Controller('advertising')
export class AdvertisingController {
  constructor(private readonly proxyService: ProxyService) {}

  /**
   * Get advertising campaigns
   */
  @Get('campaigns')
  @ApiOperation({ summary: 'Get advertising campaigns' })
  async getCampaigns(
    @Headers('authorization') authorization: string,
    @Query('status') status?: string,
  ) {
    const queryString = new URLSearchParams();
    if (status) queryString.append('status', status);

    const path = `/api/campaigns${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('advertisingService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Create advertising campaign
   */
  @Post('campaigns')
  @ApiOperation({ summary: 'Create advertising campaign' })
  @HttpCode(HttpStatus.CREATED)
  async createCampaign(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('advertisingService', '/api/campaigns', body, {
      Authorization: authorization,
    });
  }

  /**
   * Get campaign by ID
   */
  @Get('campaigns/:campaignId')
  @ApiOperation({ summary: 'Get campaign by ID' })
  async getCampaign(
    @Headers('authorization') authorization: string,
    @Param('campaignId') campaignId: string,
  ) {
    return this.proxyService.get('advertisingService', `/api/campaigns/${campaignId}`, {
      Authorization: authorization,
    });
  }

  /**
   * Update campaign
   */
  @Put('campaigns/:campaignId')
  @ApiOperation({ summary: 'Update campaign' })
  async updateCampaign(
    @Headers('authorization') authorization: string,
    @Param('campaignId') campaignId: string,
    @Body() body: any,
  ) {
    return this.proxyService.put('advertisingService', `/api/campaigns/${campaignId}`, body, {
      Authorization: authorization,
    });
  }

  /**
   * Delete campaign
   */
  @Delete('campaigns/:campaignId')
  @ApiOperation({ summary: 'Delete campaign' })
  async deleteCampaign(
    @Headers('authorization') authorization: string,
    @Param('campaignId') campaignId: string,
  ) {
    return this.proxyService.delete('advertisingService', `/api/campaigns/${campaignId}`, {
      Authorization: authorization,
    });
  }

  /**
   * Get campaign analytics
   */
  @Get('campaigns/:campaignId/analytics')
  @ApiOperation({ summary: 'Get campaign analytics' })
  async getCampaignAnalytics(
    @Headers('authorization') authorization: string,
    @Param('campaignId') campaignId: string,
  ) {
    return this.proxyService.get('advertisingService', `/api/campaigns/${campaignId}/analytics`, {
      Authorization: authorization,
    });
  }
}
