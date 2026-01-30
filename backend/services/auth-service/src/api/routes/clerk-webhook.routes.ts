import { Router, Request, Response } from 'express';
import { Webhook } from 'svix';

import { config } from '../../config';
import { userRepository } from '../../domain/repositories/user.repository';
import logger from '../../utils/logger';

const router = Router();

interface ClerkWebhookEvent {
  type: string;
  data: {
    id: string;
    email_addresses?: Array<{
      email_address: string;
      id: string;
      verification: { status: string };
    }>;
    first_name?: string;
    last_name?: string;
    primary_email_address_id?: string;
    created_at?: number;
    updated_at?: number;
    banned?: boolean;
    locked?: boolean;
    profile_image_url?: string;
    image_url?: string;
  };
}

/**
 * Clerk webhook endpoint for user synchronization
 * Handles user.created, user.updated, user.deleted events
 *
 * IMPORTANT: This route MUST receive the raw request body (Buffer) for Svix
 * signature verification. The parent Express app must apply express.raw()
 * or equivalent middleware to this route BEFORE JSON parsing.
 */
router.post('/', async (req: Request, res: Response) => {
  const webhookSecret = config.clerk.webhookSecret;

  if (!webhookSecret) {
    logger.error('CLERK_WEBHOOK_SECRET is not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  // Verify webhook signature using Svix
  const svixId = req.headers['svix-id'] as string;
  const svixTimestamp = req.headers['svix-timestamp'] as string;
  const svixSignature = req.headers['svix-signature'] as string;

  if (!svixId || !svixTimestamp || !svixSignature) {
    logger.warn('Clerk webhook missing signature headers', {
      hasSvixId: !!svixId,
      hasSvixTimestamp: !!svixTimestamp,
      hasSvixSignature: !!svixSignature,
    });
    return res.status(400).json({ error: 'Missing webhook signature headers' });
  }

  let event: ClerkWebhookEvent;

  try {
    const wh = new Webhook(webhookSecret);
    // SECURITY: Use the raw body (Buffer/string) for signature verification.
    // JSON.stringify(req.body) can reorder keys and change whitespace,
    // which will cause Svix signature verification to fail.
    // If raw body is available (via express.raw() middleware), use it;
    // otherwise fall back to JSON.stringify for backwards compatibility.
    const rawBody = typeof (req as any).rawBody === 'string'
      ? (req as any).rawBody
      : Buffer.isBuffer(req.body)
        ? req.body.toString('utf8')
        : JSON.stringify(req.body);

    event = wh.verify(rawBody, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    logger.error('Clerk webhook signature verification failed', {
      error: (err as Error).message,
      svixId,
    });
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  try {
    switch (event.type) {
      case 'user.created': {
        const {
          id: clerkId,
          email_addresses,
          first_name,
          last_name,
          primary_email_address_id,
        } = event.data;

        const primaryEmail = email_addresses?.find(
          (e) => e.id === primary_email_address_id
        )?.email_address;

        if (!primaryEmail) {
          logger.warn(`Clerk user.created webhook: no primary email for ${clerkId}`);
          return res.status(200).json({ received: true });
        }

        // Check if user already exists by email
        const existingUser = await userRepository.findByEmail(primaryEmail);

        if (existingUser) {
          // Link existing user to Clerk ID
          await userRepository.updateClerkId(existingUser.id, clerkId);
          logger.info(`Linked existing user ${existingUser.id} to Clerk ID ${clerkId}`);
        } else {
          // Create new user from Clerk data
          const newUser = await userRepository.create({
            email: primaryEmail,
            password_hash: '', // Clerk manages passwords
            first_name: first_name || '',
            last_name: last_name || '',
            date_of_birth: new Date('2000-01-01'), // Placeholder - user updates in profile
            gender: 'other', // Placeholder - user updates in profile
          });
          await userRepository.updateClerkId(newUser.id, clerkId);
          // Mark email as verified since Clerk already verified it
          await userRepository.verifyEmail(newUser.id);
          logger.info(`Created new user ${newUser.id} from Clerk user ${clerkId}`);
        }
        break;
      }

      case 'user.updated': {
        const {
          id: clerkId,
          email_addresses,
          first_name,
          last_name,
          primary_email_address_id,
          banned,
          locked,
        } = event.data;

        const user = await userRepository.findByClerkId(clerkId);

        if (!user) {
          logger.warn(`Clerk user.updated webhook: no local user for Clerk ID ${clerkId}`);
          break;
        }

        // Handle ban/lock status
        if (banned || locked) {
          await userRepository.deactivate(user.id);
          logger.info(`Deactivated user ${user.id} due to Clerk ban/lock`);
        } else if (banned === false && locked === false && !user.is_active) {
          // Re-activate if explicitly unbanned/unlocked
          await userRepository.reactivate(user.id);
          logger.info(`Reactivated user ${user.id} after Clerk unban/unlock`);
        }

        // Sync profile fields from Clerk
        const updates: Record<string, string> = {};
        if (first_name !== undefined && first_name !== user.first_name) {
          updates.first_name = first_name;
        }
        if (last_name !== undefined && last_name !== user.last_name) {
          updates.last_name = last_name;
        }

        // Sync primary email if changed
        const newPrimaryEmail = email_addresses?.find(
          (e) => e.id === primary_email_address_id
        )?.email_address;
        if (newPrimaryEmail && newPrimaryEmail !== user.email) {
          updates.email = newPrimaryEmail;
        }

        if (Object.keys(updates).length > 0) {
          await userRepository.updateProfile(user.id, updates);
          logger.info(`Synced profile updates for user ${user.id} from Clerk`, {
            fields: Object.keys(updates),
          });
        }

        break;
      }

      case 'user.deleted': {
        const { id: clerkId } = event.data;

        const user = await userRepository.findByClerkId(clerkId);

        if (user) {
          await userRepository.deactivate(user.id);
          logger.info(`Deactivated user ${user.id} due to Clerk deletion`);
        } else {
          logger.debug(`Clerk user.deleted webhook: no local user for Clerk ID ${clerkId}`);
        }
        break;
      }

      case 'session.created':
      case 'session.ended':
      case 'session.removed':
      case 'session.revoked':
        // Session events are handled by Clerk client-side SDK; log for audit trail
        logger.debug(`Clerk session event: ${event.type}`, { clerkId: event.data.id });
        break;

      default:
        logger.info(`Unhandled Clerk webhook event type: ${event.type}`, {
          eventType: event.type,
          dataId: event.data.id,
        });
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    logger.error(`Error processing Clerk webhook event: ${event.type}`, {
      error: (error as Error).message,
      stack: (error as Error).stack,
      eventType: event.type,
      dataId: event.data?.id,
    });
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
