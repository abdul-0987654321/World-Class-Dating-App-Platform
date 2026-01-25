/**
 * Clerk Webhook Controller
 *
 * Handles Clerk webhook events for user synchronization.
 * Events handled:
 * - user.created
 * - user.updated
 * - user.deleted
 * - session.created
 *
 * Security: Validates webhook signatures using Svix
 */

import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { Webhook } from 'svix';
import { Public } from '../decorators/public.decorator';
import { ProxyService } from '../services/proxy.service';

// Clerk webhook types
interface ClerkUserData {
  id: string;
  email_addresses: Array<{
    id: string;
    email_address: string;
    verification: { status: string };
  }>;
  primary_email_address_id: string;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  profile_image_url: string | null;
  username: string | null;
  created_at: number;
  updated_at: number;
  last_sign_in_at: number | null;
  banned: boolean;
  has_image: boolean;
  two_factor_enabled: boolean;
  external_accounts: Array<{
    provider: string;
    provider_user_id: string;
  }>;
  public_metadata: Record<string, any>;
  private_metadata: Record<string, any>;
  unsafe_metadata: Record<string, any>;
}

interface ClerkSessionData {
  id: string;
  user_id: string;
  client_id: string;
  status: string;
  created_at: number;
  updated_at: number;
  last_active_at: number;
  expire_at: number;
}

interface ClerkWebhookEvent {
  type: string;
  data: ClerkUserData | ClerkSessionData;
  object: string;
}

@ApiTags('webhooks')
@Controller('webhooks/clerk')
export class ClerkWebhookController {
  private readonly logger = new Logger(ClerkWebhookController.name);
  private readonly webhookSecret: string;

  constructor(private readonly proxyService: ProxyService) {
    this.webhookSecret = process.env.CLERK_WEBHOOK_SECRET || '';
    if (!this.webhookSecret) {
      this.logger.warn('CLERK_WEBHOOK_SECRET not set - webhook signature validation disabled');
    }
  }

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Clerk webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook signature or payload' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
    @Body() body: any
  ): Promise<{ received: boolean }> {
    this.logger.debug('Received Clerk webhook', {
      type: body?.type,
      svixId,
    });

    // Validate webhook signature if secret is configured
    if (this.webhookSecret) {
      try {
        const wh = new Webhook(this.webhookSecret);
        const rawBody = req.rawBody?.toString() || JSON.stringify(body);

        wh.verify(rawBody, {
          'svix-id': svixId,
          'svix-timestamp': svixTimestamp,
          'svix-signature': svixSignature,
        });

        this.logger.debug('Webhook signature verified');
      } catch (error) {
        this.logger.error('Webhook signature verification failed', {
          error: (error as Error).message,
        });
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    const event = body as ClerkWebhookEvent;

    try {
      switch (event.type) {
        case 'user.created':
          await this.handleUserCreated(event.data as ClerkUserData);
          break;

        case 'user.updated':
          await this.handleUserUpdated(event.data as ClerkUserData);
          break;

        case 'user.deleted':
          await this.handleUserDeleted(event.data as ClerkUserData);
          break;

        case 'session.created':
          await this.handleSessionCreated(event.data as ClerkSessionData);
          break;

        case 'session.ended':
        case 'session.removed':
          await this.handleSessionEnded(event.data as ClerkSessionData);
          break;

        default:
          this.logger.debug(`Unhandled webhook event type: ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      this.logger.error('Webhook processing failed', {
        type: event.type,
        error: (error as Error).message,
      });
      // Still return success to prevent Clerk from retrying
      // Log error for investigation
      return { received: true };
    }
  }

  /**
   * Handle user.created event
   * Creates a new user in Flamoral database
   */
  private async handleUserCreated(userData: ClerkUserData): Promise<void> {
    this.logger.log('Processing user.created webhook', { userId: userData.id });

    const primaryEmail = userData.email_addresses.find(
      (e) => e.id === userData.primary_email_address_id
    );

    const userPayload = {
      clerk_user_id: userData.id,
      email: primaryEmail?.email_address,
      email_verified: primaryEmail?.verification?.status === 'verified',
      first_name: userData.first_name || '',
      last_name: userData.last_name || '',
      image_url: userData.image_url || userData.profile_image_url,
      username: userData.username,
      two_factor_enabled: userData.two_factor_enabled,
      external_accounts: userData.external_accounts,
      created_at: new Date(userData.created_at),
      metadata: {
        ...userData.public_metadata,
      },
    };

    try {
      await this.proxyService.post('userService', '/api/v1/users/clerk-sync', userPayload, {
        'X-Internal-Service': 'webhook',
      });

      this.logger.log('User created successfully', { clerkUserId: userData.id });
    } catch (error) {
      this.logger.error('Failed to create user', {
        clerkUserId: userData.id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Handle user.updated event
   * Updates existing user in Flamoral database
   */
  private async handleUserUpdated(userData: ClerkUserData): Promise<void> {
    this.logger.log('Processing user.updated webhook', { userId: userData.id });

    const primaryEmail = userData.email_addresses.find(
      (e) => e.id === userData.primary_email_address_id
    );

    const userPayload = {
      clerk_user_id: userData.id,
      email: primaryEmail?.email_address,
      email_verified: primaryEmail?.verification?.status === 'verified',
      first_name: userData.first_name || '',
      last_name: userData.last_name || '',
      image_url: userData.image_url || userData.profile_image_url,
      username: userData.username,
      two_factor_enabled: userData.two_factor_enabled,
      banned: userData.banned,
      updated_at: new Date(userData.updated_at),
      last_sign_in_at: userData.last_sign_in_at ? new Date(userData.last_sign_in_at) : null,
      metadata: {
        ...userData.public_metadata,
      },
    };

    try {
      await this.proxyService.put(
        'userService',
        `/api/v1/users/clerk/${userData.id}`,
        userPayload,
        {
          'X-Internal-Service': 'webhook',
        }
      );

      this.logger.log('User updated successfully', { clerkUserId: userData.id });
    } catch (error) {
      this.logger.error('Failed to update user', {
        clerkUserId: userData.id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Handle user.deleted event
   * Soft-deletes user in Flamoral database
   */
  private async handleUserDeleted(userData: ClerkUserData): Promise<void> {
    this.logger.log('Processing user.deleted webhook', { userId: userData.id });

    try {
      await this.proxyService.delete('userService', `/api/v1/users/clerk/${userData.id}`, {
        'X-Internal-Service': 'webhook',
      });

      this.logger.log('User deleted successfully', { clerkUserId: userData.id });
    } catch (error) {
      this.logger.error('Failed to delete user', {
        clerkUserId: userData.id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Handle session.created event
   * Logs user session for analytics
   */
  private async handleSessionCreated(sessionData: ClerkSessionData): Promise<void> {
    this.logger.debug('Processing session.created webhook', {
      sessionId: sessionData.id,
      userId: sessionData.user_id,
    });

    try {
      await this.proxyService.post(
        'analyticsService',
        '/api/v1/sessions/track',
        {
          clerk_session_id: sessionData.id,
          clerk_user_id: sessionData.user_id,
          status: sessionData.status,
          created_at: new Date(sessionData.created_at),
          expires_at: new Date(sessionData.expire_at),
        },
        {
          'X-Internal-Service': 'webhook',
        }
      );
    } catch (error) {
      // Non-critical - just log
      this.logger.warn('Failed to track session', {
        sessionId: sessionData.id,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Handle session.ended event
   */
  private async handleSessionEnded(sessionData: ClerkSessionData): Promise<void> {
    this.logger.debug('Processing session.ended webhook', {
      sessionId: sessionData.id,
      userId: sessionData.user_id,
    });

    try {
      await this.proxyService.post(
        'analyticsService',
        '/api/v1/sessions/end',
        {
          clerk_session_id: sessionData.id,
          clerk_user_id: sessionData.user_id,
          ended_at: new Date(),
        },
        {
          'X-Internal-Service': 'webhook',
        }
      );
    } catch (error) {
      // Non-critical - just log
      this.logger.warn('Failed to track session end', {
        sessionId: sessionData.id,
        error: (error as Error).message,
      });
    }
  }
}

export default ClerkWebhookController;
