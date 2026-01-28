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
  };
}

/**
 * Clerk webhook endpoint for user synchronization
 * Handles user.created, user.updated, user.deleted events
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
    return res.status(400).json({ error: 'Missing webhook signature headers' });
  }

  let event: ClerkWebhookEvent;

  try {
    const wh = new Webhook(webhookSecret);
    const body = JSON.stringify(req.body);
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    logger.error('Clerk webhook signature verification failed', err);
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
        const { id: clerkId, banned, locked } = event.data;

        const user = await userRepository.findByClerkId(clerkId);

        if (user) {
          if (banned || locked) {
            await userRepository.deactivate(user.id);
            logger.info(`Deactivated user ${user.id} due to Clerk ban/lock`);
          }
        }
        break;
      }

      case 'user.deleted': {
        const { id: clerkId } = event.data;

        const user = await userRepository.findByClerkId(clerkId);

        if (user) {
          await userRepository.deactivate(user.id);
          logger.info(`Deactivated user ${user.id} due to Clerk deletion`);
        }
        break;
      }

      default:
        logger.debug(`Unhandled Clerk webhook event: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    logger.error(`Error processing Clerk webhook event: ${event.type}`, error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
