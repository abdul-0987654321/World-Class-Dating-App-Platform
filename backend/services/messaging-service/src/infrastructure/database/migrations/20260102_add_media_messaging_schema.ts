/**
 * Database Migration: Add Media Messaging Schema
 *
 * This migration adds support for enhanced communication features:
 * 1. Photo sharing in chat
 * 2. Voice messages with transcription
 * 3. GIF message metadata
 * 4. Typing indicators (handled in Redis, not DB)
 *
 * For PostgreSQL, this creates the necessary schema extensions.
 */

import { Knex } from 'knex';

import { createLogger } from '../../../utils/logger';

const logger = createLogger('media-messaging-migration');

/**
 * Message Schema Extension for Media Messaging
 *
 * Enhanced metadata structure for different message types:
 *
 * IMAGE Message metadata:
 * {
 *   mediaUrl: string;      // CDN URL to full-size image
 *   thumbnailUrl: string;  // CDN URL to thumbnail
 *   width: number;         // Image width in pixels
 *   height: number;        // Image height in pixels
 *   fileSize: number;      // File size in bytes
 *   mimeType: string;      // e.g., 'image/webp', 'image/jpeg'
 * }
 *
 * VOICE Message metadata:
 * {
 *   mediaUrl: string;      // CDN URL to audio file
 *   duration: number;      // Duration in seconds
 *   waveform: number[];    // Amplitude data for visualization (50 samples)
 *   fileSize: number;      // File size in bytes
 *   mimeType: string;      // e.g., 'audio/mpeg'
 *   transcription?: string; // Optional voice-to-text transcription
 * }
 *
 * GIF Message metadata:
 * {
 *   mediaUrl: string;      // Full GIF URL
 *   thumbnailUrl: string;  // Preview/still image URL
 *   giphyId?: string;      // Giphy ID for attribution
 *   tenorId?: string;      // Tenor ID for attribution
 *   width: number;         // GIF width
 *   height: number;        // GIF height
 * }
 */

export interface MediaMessageSchema {
  // Common fields
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'voice' | 'file' | 'gif' | 'gift';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;

  // Media metadata (structure depends on type)
  metadata?: {
    // Common media fields
    mediaUrl?: string;
    thumbnailUrl?: string;
    fileSize?: number;
    mimeType?: string;

    // Image-specific
    width?: number;
    height?: number;

    // Voice/Audio-specific
    duration?: number;
    waveform?: number[];
    transcription?: string;

    // GIF-specific
    giphyId?: string;
    tenorId?: string;

    // File-specific
    fileName?: string;

    // Gift-specific
    gift?: any;
    transactionId?: string;
  };

  // Reply support
  replyTo?: string;

  // Deletion tracking
  deleted?: boolean;
  deletedAt?: Date;
  deletedFor?: string[];

  // Pinning support
  isPinned?: boolean;
  pinnedBy?: string;
  pinnedAt?: Date;

  // Premium feature
  isBeforeMatch?: boolean;

  // Encryption
  encryption?: {
    isEncrypted: boolean;
    iv?: string;
    authTag?: string;
    version?: number;
  };
}

/**
 * Typing Indicator Schema (stored in Redis, not PostgreSQL)
 *
 * Key pattern: typing:{conversationId}:{userId}
 * TTL: 10 seconds (auto-expires if not refreshed)
 *
 * {
 *   userId: string;
 *   conversationId: string;
 *   isTyping: boolean;
 *   startedAt: Date;
 *   expiresAt: Date;
 * }
 */

/**
 * Migration function to ensure proper indexes for media messages
 */
export async function up(knex: Knex): Promise<void> {
  try {
    logger.info('Running media messaging schema migration...');

    // Check if messages table exists and add necessary columns/indexes
    const hasMessagesTable = await knex.schema.hasTable('messages');

    if (hasMessagesTable) {
      // Add indexes for efficient querying if they don't exist
      // Index: (conversationId, sentAt DESC) - For message history pagination
      await knex.schema.alterTable('messages', (table) => {
        // These columns should already exist, but ensure indexes are created
      });

      // Create composite indexes using raw SQL for better control
      await knex.raw(`
        CREATE INDEX IF NOT EXISTS idx_messages_conversation_sent
        ON messages (conversation_id, sent_at DESC)
      `);

      await knex.raw(`
        CREATE INDEX IF NOT EXISTS idx_messages_conversation_type_sent
        ON messages (conversation_id, type, sent_at DESC)
      `);

      await knex.raw(`
        CREATE INDEX IF NOT EXISTS idx_messages_receiver_status_sent
        ON messages (receiver_id, status, sent_at DESC)
      `);

      await knex.raw(`
        CREATE INDEX IF NOT EXISTS idx_messages_conversation_pinned
        ON messages (conversation_id, is_pinned) WHERE is_pinned = true
      `);

      logger.info('Media messaging indexes created successfully');
    } else {
      logger.warn('Messages table does not exist - indexes will be created when table is created');
    }

    logger.info('Media messaging schema migration completed successfully');
  } catch (error: any) {
    logger.error('Media messaging schema migration failed:', error);
    throw error;
  }
}

/**
 * Rollback function
 */
export async function down(knex: Knex): Promise<void> {
  logger.info('Rollback: Media messaging schema migration');

  try {
    // Drop indexes
    await knex.raw('DROP INDEX IF EXISTS idx_messages_conversation_sent');
    await knex.raw('DROP INDEX IF EXISTS idx_messages_conversation_type_sent');
    await knex.raw('DROP INDEX IF EXISTS idx_messages_receiver_status_sent');
    await knex.raw('DROP INDEX IF EXISTS idx_messages_conversation_pinned');

    logger.info('Rollback completed - indexes dropped');
  } catch (error: any) {
    logger.warn('Rollback warning:', error.message);
  }
}

export default { up, down };
