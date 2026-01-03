/**
 * Database Migration: Add Media Messaging Schema
 *
 * This migration adds support for enhanced communication features:
 * 1. Photo sharing in chat
 * 2. Voice messages with transcription
 * 3. GIF message metadata
 * 4. Typing indicators (handled in Redis, not DB)
 *
 * For Cosmos DB, this is primarily documentation of the schema structure
 * as Cosmos DB is schemaless. The schema is enforced at the application level.
 */

import { Container, Database } from '@azure/cosmos';
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
 * Typing Indicator Schema (stored in Redis, not Cosmos DB)
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
export async function up(database: Database): Promise<void> {
  try {
    logger.info('Running media messaging schema migration...');

    const messagesContainer = database.container('Messages');

    // Log the schema documentation (Cosmos DB is schemaless)
    logger.info('Media messaging schema documentation applied');
    logger.info('Supported message types: text, image, video, audio, voice, file, gif, gift');

    // Note: In Cosmos DB, indexes are defined in the container configuration
    // The following composite indexes should be configured in Azure Portal or via ARM templates:
    //
    // Composite Indexes for efficient querying:
    // 1. (conversationId ASC, sentAt DESC) - For message history pagination
    // 2. (conversationId ASC, type ASC, sentAt DESC) - For media gallery queries
    // 3. (receiverId ASC, status ASC, sentAt DESC) - For unread message queries
    // 4. (conversationId ASC, isPinned ASC) - For pinned messages

    logger.info('Media messaging schema migration completed successfully');
  } catch (error: any) {
    logger.error('Media messaging schema migration failed:', error);
    throw error;
  }
}

/**
 * Rollback function (for documentation purposes)
 */
export async function down(database: Database): Promise<void> {
  logger.info('Rollback: Media messaging schema migration');
  // Cosmos DB is schemaless - no structural rollback needed
  // Messages with media metadata will continue to exist
  logger.info('Rollback completed (no structural changes in schemaless DB)');
}

export default { up, down };
