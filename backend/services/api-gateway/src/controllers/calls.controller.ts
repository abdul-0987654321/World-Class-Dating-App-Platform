import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
  Param,
  Query,
} from '@nestjs/common';

import { RequireSubscription, SubscriptionTier } from '../decorators/subscription.decorator';
import { SubscriptionGuard } from '../guards/subscription.guard';
import { ProxyService } from '../services/proxy.service';

/**
 * Calls Controller
 * Handles audio/video calling endpoints for 1:1 calls between matched users.
 * All call endpoints require Premium subscription tier or higher.
 */
@Controller('calls')
export class CallsController {
  constructor(private readonly proxyService: ProxyService) {}

  // ==================== Call Request/Management Endpoints ====================

  /**
   * Request a 1:1 call with another user
   * POST /calls/request
   *
   * Requirements:
   * - Users must be matched
   * - Caller must have Premium subscription or higher
   * - Callee must be online (handled by messaging service)
   *
   * Request body:
   * {
   *   calleeId: string;      // User ID of the person to call
   *   callType: 'video' | 'audio';
   * }
   */
  @Post('request')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SubscriptionGuard)
  @RequireSubscription(SubscriptionTier.PREMIUM)
  async requestCall(
    @Headers('authorization') authorization: string,
    @Body() body: { calleeId: string; callType: 'video' | 'audio' }
  ) {
    return this.proxyService.post('messagingService', '/api/v1/calls/request', body, {
      Authorization: authorization,
    });
  }

  /**
   * Accept an incoming call
   * POST /calls/accept
   *
   * Request body:
   * {
   *   callId: string;    // The call session ID
   * }
   */
  @Post('accept')
  @HttpCode(HttpStatus.OK)
  async acceptCall(
    @Headers('authorization') authorization: string,
    @Body() body: { callId: string }
  ) {
    return this.proxyService.post('messagingService', '/api/v1/calls/accept', body, {
      Authorization: authorization,
    });
  }

  /**
   * Reject an incoming call
   * POST /calls/reject
   *
   * Request body:
   * {
   *   callId: string;    // The call session ID
   *   reason?: string;   // Optional rejection reason
   * }
   */
  @Post('reject')
  @HttpCode(HttpStatus.OK)
  async rejectCall(
    @Headers('authorization') authorization: string,
    @Body() body: { callId: string; reason?: string }
  ) {
    return this.proxyService.post('messagingService', '/api/v1/calls/reject', body, {
      Authorization: authorization,
    });
  }

  /**
   * End an active call
   * POST /calls/end
   *
   * Request body:
   * {
   *   callId: string;    // The call session ID
   *   duration?: number; // Optional call duration in seconds
   * }
   */
  @Post('end')
  @HttpCode(HttpStatus.OK)
  async endCall(
    @Headers('authorization') authorization: string,
    @Body() body: { callId: string; duration?: number }
  ) {
    return this.proxyService.post('messagingService', '/api/v1/calls/end', body, {
      Authorization: authorization,
    });
  }

  // ==================== Call Status/History Endpoints ====================

  /**
   * Get current call status
   * GET /calls/:callId
   */
  @Get(':callId')
  async getCallStatus(
    @Headers('authorization') authorization: string,
    @Param('callId') callId: string
  ) {
    return this.proxyService.get('messagingService', `/api/v1/calls/${callId}`, {
      Authorization: authorization,
    });
  }

  /**
   * Get call history for the authenticated user
   * GET /calls/history
   */
  @Get('history')
  async getCallHistory(
    @Headers('authorization') authorization: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const queryString = new URLSearchParams();
    if (limit) queryString.append('limit', limit);
    if (offset) queryString.append('offset', offset);

    const path = `/api/v1/calls/history${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('messagingService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Check if a user is available for a call
   * GET /calls/availability/:userId
   */
  @Get('availability/:userId')
  async checkCallAvailability(
    @Headers('authorization') authorization: string,
    @Param('userId') userId: string
  ) {
    return this.proxyService.get('messagingService', `/api/v1/calls/availability/${userId}`, {
      Authorization: authorization,
    });
  }
}
