import {
  Controller,
  Get,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ProxyService } from '../services/proxy.service';
import { CurrentUser, JwtPayload } from '../decorators/current-user.decorator';

// DTOs for audit log endpoint
interface AuditLogEvent {
  id: string;
  user_id: string;
  event_type: string;
  event_data: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

interface AuditLogsResponse {
  items: AuditLogEvent[];
  next_cursor: string | null;
  has_more: boolean;
}

// Valid event types for filtering
const VALID_EVENT_TYPES = [
  'login',
  'logout',
  'password_change',
  'email_change',
  'profile_update',
  'photo_upload',
  'photo_delete',
  'subscription_change',
  'payment',
  'match',
  'unmatch',
  'message_sent',
  'block_user',
  'unblock_user',
  'report_user',
  'settings_change',
  'privacy_settings_change',
  'notification_settings_change',
  'account_deactivate',
  'account_reactivate',
  'account_delete_request',
  'data_export_request',
];

@ApiTags('audit')
@ApiBearerAuth('JWT-auth')
@Controller('audit')
export class AuditController {
  constructor(private readonly proxyService: ProxyService) {}

  /**
   * Get user's own audit log events (append-only)
   * Users can only view their own audit logs for privacy compliance
   */
  @Get('logs')
  @ApiOperation({ summary: 'List user\'s own audit log events' })
  @ApiQuery({
    name: 'cursor',
    required: false,
    type: String,
    description: 'Cursor for pagination (opaque string from previous response)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items to return (default: 50, max: 100)',
  })
  @ApiQuery({
    name: 'event_type',
    required: false,
    type: String,
    description: 'Filter by event type (e.g., "login", "password_change")',
  })
  @ApiQuery({
    name: 'start_date',
    required: false,
    type: String,
    description: 'Filter events after this date (ISO 8601 format)',
  })
  @ApiQuery({
    name: 'end_date',
    required: false,
    type: String,
    description: 'Filter events before this date (ISO 8601 format)',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit log events retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              user_id: { type: 'string' },
              event_type: { type: 'string' },
              event_data: { type: 'object' },
              ip_address: { type: 'string' },
              user_agent: { type: 'string' },
              created_at: { type: 'string', format: 'date-time' },
            },
          },
        },
        next_cursor: { type: 'string', nullable: true },
        has_more: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @HttpCode(HttpStatus.OK)
  async getAuditLogs(
    @Headers('authorization') authorization: string,
    @CurrentUser() user: JwtPayload,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('event_type') eventType?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ): Promise<AuditLogsResponse> {
    // Validate limit
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      throw new BadRequestException({
        code: 'INVALID_LIMIT',
        message: 'limit must be between 1 and 100',
        correlation_id: this.generateCorrelationId(),
      });
    }

    // Validate event_type if provided
    if (eventType && !VALID_EVENT_TYPES.includes(eventType)) {
      throw new BadRequestException({
        code: 'INVALID_EVENT_TYPE',
        message: `event_type must be one of: ${VALID_EVENT_TYPES.join(', ')}`,
        correlation_id: this.generateCorrelationId(),
      });
    }

    // Validate dates if provided
    if (startDate && isNaN(Date.parse(startDate))) {
      throw new BadRequestException({
        code: 'INVALID_START_DATE',
        message: 'start_date must be a valid ISO 8601 date',
        correlation_id: this.generateCorrelationId(),
      });
    }

    if (endDate && isNaN(Date.parse(endDate))) {
      throw new BadRequestException({
        code: 'INVALID_END_DATE',
        message: 'end_date must be a valid ISO 8601 date',
        correlation_id: this.generateCorrelationId(),
      });
    }

    // Build query string for downstream service
    const queryParams = new URLSearchParams();
    if (cursor) queryParams.append('cursor', cursor);
    queryParams.append('limit', parsedLimit.toString());
    if (eventType) queryParams.append('event_type', eventType);
    if (startDate) queryParams.append('start_date', startDate);
    if (endDate) queryParams.append('end_date', endDate);

    try {
      // Forward to audit service or user service
      const result = await this.proxyService.get(
        'userService',
        `/api/audit/logs?${queryParams.toString()}`,
        { Authorization: authorization },
      );

      return {
        items: result?.items || [],
        next_cursor: result?.next_cursor || null,
        has_more: result?.has_more || false,
      };
    } catch (error) {
      // If the audit service is not available, return empty results
      // This ensures the endpoint is always available for compliance
      console.error('Failed to fetch audit logs:', error);
      return {
        items: [],
        next_cursor: null,
        has_more: false,
      };
    }
  }

  /**
   * Get available event types for filtering
   */
  @Get('event-types')
  @ApiOperation({ summary: 'Get available audit event types' })
  @ApiResponse({
    status: 200,
    description: 'List of valid event types',
    schema: {
      type: 'object',
      properties: {
        event_types: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  async getEventTypes(): Promise<{ event_types: string[] }> {
    return { event_types: VALID_EVENT_TYPES };
  }

  /**
   * Generate a correlation ID for error tracking
   */
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
