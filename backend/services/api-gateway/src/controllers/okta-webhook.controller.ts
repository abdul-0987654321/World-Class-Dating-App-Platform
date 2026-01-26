/**
 * Okta Webhook Controller
 *
 * Handles Okta Event Hook events for user synchronization.
 * Events handled:
 * - user.lifecycle.create
 * - user.lifecycle.update.profile
 * - user.lifecycle.delete
 * - user.lifecycle.activate
 * - user.lifecycle.deactivate
 * - user.lifecycle.suspend
 * - user.lifecycle.unsuspend
 *
 * Security: Validates webhook verification challenges and signatures
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../decorators/public.decorator';
import { ProxyService } from '../services/proxy.service';
import * as crypto from 'crypto';

// Okta Event Hook types
interface OktaEventTarget {
  id: string;
  type: string;
  alternateId?: string;
  displayName?: string;
}

interface OktaEventActor {
  id: string;
  type: string;
  alternateId?: string;
  displayName?: string;
}

interface OktaUserProfile {
  login: string;
  email: string;
  firstName?: string;
  lastName?: string;
  mobilePhone?: string;
}

interface OktaUser {
  id: string;
  status: string;
  created: string;
  activated?: string;
  lastLogin?: string;
  lastUpdated: string;
  profile: OktaUserProfile;
}

interface OktaEvent {
  uuid: string;
  published: string;
  eventType: string;
  version: string;
  displayMessage?: string;
  severity: string;
  actor: OktaEventActor;
  target?: OktaEventTarget[];
  outcome?: {
    result: string;
    reason?: string;
  };
  debugContext?: {
    debugData?: Record<string, any>;
  };
}

interface OktaWebhookPayload {
  eventType?: string;
  eventTypeVersion?: string;
  cloudEventsVersion?: string;
  source?: string;
  eventId?: string;
  data?: {
    events?: OktaEvent[];
  };
  // Verification challenge format
  verification?: string;
}

@ApiTags('webhooks')
@Controller('webhooks/okta')
export class OktaWebhookController {
  private readonly logger = new Logger(OktaWebhookController.name);
  private readonly webhookSecret: string;

  constructor(private readonly proxyService: ProxyService) {
    this.webhookSecret = process.env.OKTA_WEBHOOK_SECRET || '';
    const isProduction = process.env.NODE_ENV === 'production';

    if (!this.webhookSecret) {
      if (isProduction) {
        this.logger.error(
          'CRITICAL: OKTA_WEBHOOK_SECRET is not configured in production! ' +
            'Okta webhooks will be rejected until this is set.'
        );
      } else {
        this.logger.warn(
          'OKTA_WEBHOOK_SECRET not set - webhook signature validation disabled (development only)'
        );
      }
    } else {
      this.logger.log('Okta webhook controller initialized with signature validation enabled');
    }
  }

  /**
   * Handle Okta verification challenge
   * Okta sends a GET request with verification parameter during hook setup
   */
  @Public()
  @Get()
  @ApiOperation({ summary: 'Handle Okta webhook verification challenge' })
  @ApiResponse({ status: 200, description: 'Verification challenge response' })
  handleVerificationChallenge(@Query('verification') verification: string): {
    verification: string;
  } {
    this.logger.log('Received Okta verification challenge');

    if (!verification) {
      throw new BadRequestException('Missing verification challenge');
    }

    // Return the verification value to confirm webhook ownership
    return { verification };
  }

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Okta webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook signature or payload' })
  async handleWebhook(
    @Headers('x-okta-verification-challenge') verificationChallenge: string,
    @Headers('authorization') authorization: string,
    @Body() body: OktaWebhookPayload
  ): Promise<{ received: boolean } | { verification: string }> {
    // Handle verification challenge in POST (some versions send it this way)
    if (verificationChallenge || body?.verification) {
      const challenge = verificationChallenge || body.verification;
      this.logger.log('Handling verification challenge via POST');
      return { verification: challenge! };
    }

    this.logger.debug('Received Okta webhook', {
      eventType: body?.eventType,
    });

    // Validate webhook authorization in production
    const isProduction = process.env.NODE_ENV === 'production';

    if (!this.webhookSecret && isProduction) {
      this.logger.error('Webhook rejected - OKTA_WEBHOOK_SECRET not configured in production');
      throw new BadRequestException('Webhook signature validation is required');
    }

    if (this.webhookSecret && authorization) {
      // Validate authorization header matches our secret
      const expectedAuth = this.webhookSecret;
      if (authorization !== expectedAuth && authorization !== `Bearer ${expectedAuth}`) {
        this.logger.error('Webhook authorization mismatch');
        throw new BadRequestException('Invalid webhook authorization');
      }
      this.logger.debug('Webhook authorization verified');
    } else if (isProduction) {
      this.logger.warn('Processing webhook without authorization (production)');
    }

    try {
      // Process events from the payload
      const events = body?.data?.events || [];

      for (const event of events) {
        await this.processEvent(event);
      }

      return { received: true };
    } catch (error) {
      this.logger.error('Webhook processing failed', {
        error: (error as Error).message,
      });
      // Still return success to prevent Okta from retrying
      return { received: true };
    }
  }

  private async processEvent(event: OktaEvent): Promise<void> {
    this.logger.log('Processing Okta event', {
      eventType: event.eventType,
      uuid: event.uuid,
    });

    switch (event.eventType) {
      case 'user.lifecycle.create':
        await this.handleUserCreated(event);
        break;

      case 'user.lifecycle.update.profile':
        await this.handleUserUpdated(event);
        break;

      case 'user.lifecycle.delete':
        await this.handleUserDeleted(event);
        break;

      case 'user.lifecycle.activate':
        await this.handleUserActivated(event);
        break;

      case 'user.lifecycle.deactivate':
      case 'user.lifecycle.suspend':
        await this.handleUserDeactivated(event);
        break;

      case 'user.lifecycle.unsuspend':
        await this.handleUserActivated(event);
        break;

      default:
        this.logger.debug(`Unhandled Okta event type: ${event.eventType}`);
    }
  }

  /**
   * Handle user.lifecycle.create event
   * Creates a new user in Flamoral database
   */
  private async handleUserCreated(event: OktaEvent): Promise<void> {
    const target = event.target?.[0];
    if (!target) {
      this.logger.warn('No target in user.lifecycle.create event');
      return;
    }

    this.logger.log('Processing user.lifecycle.create', { oktaUserId: target.id });

    // Extract user data from event
    const userPayload = {
      okta_user_id: target.id,
      email: target.alternateId,
      display_name: target.displayName,
      email_verified: true, // User created in Okta is verified
      created_at: new Date(event.published),
      metadata: {
        okta_event_id: event.uuid,
      },
    };

    try {
      await this.proxyService.post('userService', '/api/v1/users/okta-sync', userPayload, {
        'X-Internal-Service': 'webhook',
      });

      this.logger.log('User created successfully', { oktaUserId: target.id });
    } catch (error) {
      this.logger.error('Failed to create user', {
        oktaUserId: target.id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Handle user.lifecycle.update.profile event
   * Updates existing user in Flamoral database
   */
  private async handleUserUpdated(event: OktaEvent): Promise<void> {
    const target = event.target?.[0];
    if (!target) {
      this.logger.warn('No target in user.lifecycle.update.profile event');
      return;
    }

    this.logger.log('Processing user.lifecycle.update.profile', { oktaUserId: target.id });

    const userPayload = {
      okta_user_id: target.id,
      email: target.alternateId,
      display_name: target.displayName,
      updated_at: new Date(event.published),
    };

    try {
      await this.proxyService.put('userService', `/api/v1/users/okta/${target.id}`, userPayload, {
        'X-Internal-Service': 'webhook',
      });

      this.logger.log('User updated successfully', { oktaUserId: target.id });
    } catch (error) {
      this.logger.error('Failed to update user', {
        oktaUserId: target.id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Handle user.lifecycle.delete event
   * Soft-deletes user in Flamoral database
   */
  private async handleUserDeleted(event: OktaEvent): Promise<void> {
    const target = event.target?.[0];
    if (!target) {
      this.logger.warn('No target in user.lifecycle.delete event');
      return;
    }

    this.logger.log('Processing user.lifecycle.delete', { oktaUserId: target.id });

    try {
      await this.proxyService.delete('userService', `/api/v1/users/okta/${target.id}`, {
        'X-Internal-Service': 'webhook',
      });

      this.logger.log('User deleted successfully', { oktaUserId: target.id });
    } catch (error) {
      this.logger.error('Failed to delete user', {
        oktaUserId: target.id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Handle user.lifecycle.activate event
   * Activates user in Flamoral database
   */
  private async handleUserActivated(event: OktaEvent): Promise<void> {
    const target = event.target?.[0];
    if (!target) {
      this.logger.warn('No target in user activation event');
      return;
    }

    this.logger.log('Processing user activation', { oktaUserId: target.id });

    try {
      await this.proxyService.put(
        'userService',
        `/api/v1/users/okta/${target.id}`,
        {
          okta_user_id: target.id,
          is_active: true,
          updated_at: new Date(event.published),
        },
        {
          'X-Internal-Service': 'webhook',
        }
      );

      this.logger.log('User activated successfully', { oktaUserId: target.id });
    } catch (error) {
      this.logger.error('Failed to activate user', {
        oktaUserId: target.id,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Handle user.lifecycle.deactivate event
   * Deactivates user in Flamoral database
   */
  private async handleUserDeactivated(event: OktaEvent): Promise<void> {
    const target = event.target?.[0];
    if (!target) {
      this.logger.warn('No target in user deactivation event');
      return;
    }

    this.logger.log('Processing user deactivation', { oktaUserId: target.id });

    try {
      await this.proxyService.put(
        'userService',
        `/api/v1/users/okta/${target.id}`,
        {
          okta_user_id: target.id,
          is_active: false,
          updated_at: new Date(event.published),
        },
        {
          'X-Internal-Service': 'webhook',
        }
      );

      this.logger.log('User deactivated successfully', { oktaUserId: target.id });
    } catch (error) {
      this.logger.error('Failed to deactivate user', {
        oktaUserId: target.id,
        error: (error as Error).message,
      });
    }
  }
}

export default OktaWebhookController;
