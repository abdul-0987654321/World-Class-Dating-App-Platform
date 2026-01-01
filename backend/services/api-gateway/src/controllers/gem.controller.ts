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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ProxyService } from '../services/proxy.service';

@ApiTags('Gems')
@ApiBearerAuth('JWT-auth')
@Controller('gems')
export class GemController {
  constructor(private readonly proxyService: ProxyService) {}

  // ==================== BALANCE & INFO ====================

  @Get('balance')
  @ApiOperation({ summary: 'Get current gem balance' })
  @ApiResponse({ status: 200, description: 'Current gem balance' })
  async getBalance(@Headers('authorization') authorization: string) {
    return this.proxyService.get('userService', '/api/v1/gems/balance', {
      Authorization: authorization,
    });
  }

  @Get('items')
  @ApiOperation({ summary: 'Get all available items and prices' })
  @ApiResponse({ status: 200, description: 'List of available items' })
  async getItems(@Headers('authorization') authorization: string) {
    return this.proxyService.get('userService', '/api/v1/gems/items', {
      Authorization: authorization,
    });
  }

  @Get('can-afford/:itemType')
  @ApiOperation({ summary: 'Check if user can afford an item' })
  @ApiResponse({ status: 200, description: 'Affordability check result' })
  async canAfford(
    @Headers('authorization') authorization: string,
    @Param('itemType') itemType: string,
  ) {
    return this.proxyService.get(
      'userService',
      `/api/v1/gems/can-afford/${itemType}`,
      { Authorization: authorization },
    );
  }

  // ==================== SPENDING ====================

  @Post('spend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Spend gems on an item' })
  @ApiResponse({ status: 200, description: 'Purchase result' })
  async spendGems(
    @Headers('authorization') authorization: string,
    @Body() body: { itemType: string; metadata?: Record<string, any> },
  ) {
    return this.proxyService.post('userService', '/api/v1/gems/spend', body, {
      Authorization: authorization,
    });
  }

  @Post('activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a premium feature with gems' })
  @ApiResponse({ status: 200, description: 'Feature activation result' })
  async activateFeature(
    @Headers('authorization') authorization: string,
    @Body() body: { featureType: string },
  ) {
    return this.proxyService.post('userService', '/api/v1/gems/activate', body, {
      Authorization: authorization,
    });
  }

  @Post('gift')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a virtual gift to another user' })
  @ApiResponse({ status: 200, description: 'Gift sent successfully' })
  async sendGift(
    @Headers('authorization') authorization: string,
    @Body() body: {
      recipientId: string;
      giftType: 'GIFT_ROSE' | 'GIFT_HEART' | 'GIFT_DIAMOND' | 'GIFT_CROWN';
      message?: string;
    },
  ) {
    return this.proxyService.post('userService', '/api/v1/gems/gift', body, {
      Authorization: authorization,
    });
  }

  // ==================== HISTORY & ANALYTICS ====================

  @Get('transactions')
  @ApiOperation({ summary: 'Get gem transaction history' })
  @ApiResponse({ status: 200, description: 'Transaction history' })
  async getTransactions(
    @Headers('authorization') authorization: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const queryParams = new URLSearchParams();
    if (limit) queryParams.append('limit', limit.toString());
    if (offset) queryParams.append('offset', offset.toString());

    const queryString = queryParams.toString();
    const path = `/api/v1/gems/transactions${queryString ? `?${queryString}` : ''}`;

    return this.proxyService.get('userService', path, {
      Authorization: authorization,
    });
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get spending analytics' })
  @ApiResponse({ status: 200, description: 'Spending analytics' })
  async getAnalytics(@Headers('authorization') authorization: string) {
    return this.proxyService.get('userService', '/api/v1/gems/analytics', {
      Authorization: authorization,
    });
  }
}
