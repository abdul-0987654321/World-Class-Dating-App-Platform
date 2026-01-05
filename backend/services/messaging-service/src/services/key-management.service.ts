import { Knex } from 'knex';

import { createLogger } from '../utils/logger';

import encryptionService from './encryption.service';

const logger = createLogger('key-management-service');

interface EncryptionKey {
  id: string;
  user_id: string;
  public_key: string;
  private_key_encrypted: string;
  key_type: 'identity' | 'signed_pre_key' | 'one_time_pre_key';
  key_id: number;
  created_at: Date;
  expires_at?: Date;
  is_active: boolean;
}

interface SessionKey {
  id: string;
  conversation_id: string;
  root_key: string;
  chain_key: string;
  message_number: number;
  created_at: Date;
  last_used_at: Date;
}

/**
 * Key Management Service
 * Manages encryption keys lifecycle, rotation, and storage
 */
export class KeyManagementService {
  private db: Knex;
  private readonly KEY_ROTATION_DAYS = 90;
  private readonly SIGNED_PREKEY_EXPIRY_DAYS = 30;
  private readonly SESSION_KEY_EXPIRY_DAYS = 7;

  constructor(database: Knex) {
    this.db = database;
  }

  /**
   * Initialize user encryption keys
   */
  async initializeUserKeys(userId: string): Promise<{
    identityKey: { publicKey: string };
    signedPreKey: { keyId: number; publicKey: string };
    oneTimePreKeys: Array<{ keyId: number; publicKey: string }>;
  }> {
    try {
      // Generate identity key pair
      const identityKeyPair = await encryptionService.generateIdentityKeyPair();

      // Store identity key (private key should be encrypted in production)
      await this.db('encryption_keys').insert({
        user_id: userId,
        public_key: identityKeyPair.publicKey,
        private_key_encrypted: this.encryptPrivateKey(identityKeyPair.privateKey),
        key_type: 'identity',
        key_id: 0,
        is_active: true,
        created_at: new Date(),
      });

      // Generate and store signed pre-key
      const signedPreKey = await encryptionService.generateSignedPreKey();
      await this.db('encryption_keys').insert({
        user_id: userId,
        public_key: signedPreKey.publicKey,
        private_key_encrypted: this.encryptPrivateKey(signedPreKey.privateKey),
        key_type: 'signed_pre_key',
        key_id: signedPreKey.keyId,
        is_active: true,
        created_at: new Date(),
        expires_at: new Date(Date.now() + this.SIGNED_PREKEY_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      });

      // Generate and store one-time pre-keys
      const oneTimePreKeys = await encryptionService.generateOneTimePreKeys(100);
      const oneTimePreKeyInserts = oneTimePreKeys.map((key) => ({
        user_id: userId,
        public_key: key.publicKey,
        private_key_encrypted: this.encryptPrivateKey(key.privateKey),
        key_type: 'one_time_pre_key',
        key_id: key.keyId,
        is_active: true,
        created_at: new Date(),
      }));

      await this.db('one_time_prekeys').insert(
        oneTimePreKeyInserts.map((k) => ({
          user_id: k.user_id,
          key_id: k.key_id,
          public_key: k.public_key,
          private_key_encrypted: k.private_key_encrypted,
          is_used: false,
          created_at: k.created_at,
        }))
      );

      logger.info(`Initialized encryption keys for user ${userId}`);

      return {
        identityKey: { publicKey: identityKeyPair.publicKey },
        signedPreKey: {
          keyId: signedPreKey.keyId,
          publicKey: signedPreKey.publicKey,
        },
        oneTimePreKeys: oneTimePreKeys.map((k) => ({
          keyId: k.keyId,
          publicKey: k.publicKey,
        })),
      };
    } catch (error) {
      logger.error(`Failed to initialize user keys: ${error}`);
      throw new Error('Failed to initialize encryption keys');
    }
  }

  /**
   * Get user's public keys (for initiating conversation)
   */
  async getUserPublicKeys(userId: string): Promise<{
    identityKey: string;
    signedPreKey: { keyId: number; publicKey: string };
    oneTimePreKey?: { keyId: number; publicKey: string };
  }> {
    // Get identity key
    const identityKey = await this.db('encryption_keys')
      .where({ user_id: userId, key_type: 'identity', is_active: true })
      .first();

    if (!identityKey) {
      throw new Error('User identity key not found');
    }

    // Get signed pre-key
    const signedPreKey = await this.db('encryption_keys')
      .where({ user_id: userId, key_type: 'signed_pre_key', is_active: true })
      .orderBy('created_at', 'desc')
      .first();

    if (!signedPreKey) {
      throw new Error('User signed pre-key not found');
    }

    // Get and mark one-time pre-key as used
    const oneTimePreKey = await this.db('one_time_prekeys')
      .where({ user_id: userId, is_used: false })
      .orderBy('created_at', 'asc')
      .first();

    if (oneTimePreKey) {
      await this.db('one_time_prekeys')
        .where({ id: oneTimePreKey.id })
        .update({ is_used: true, used_at: new Date() });
    }

    return {
      identityKey: identityKey.public_key,
      signedPreKey: {
        keyId: signedPreKey.key_id,
        publicKey: signedPreKey.public_key,
      },
      oneTimePreKey: oneTimePreKey
        ? {
            keyId: oneTimePreKey.key_id,
            publicKey: oneTimePreKey.public_key,
          }
        : undefined,
    };
  }

  /**
   * Create session key for conversation
   */
  async createSessionKey(conversationId: string, rootKey: Buffer, chainKey: Buffer): Promise<void> {
    await this.db('session_keys').insert({
      conversation_id: conversationId,
      root_key: rootKey.toString('base64'),
      chain_key: chainKey.toString('base64'),
      message_number: 0,
      created_at: new Date(),
      last_used_at: new Date(),
    });

    logger.info(`Created session key for conversation ${conversationId}`);
  }

  /**
   * Get session key for conversation
   */
  async getSessionKey(conversationId: string): Promise<SessionKey | null> {
    return this.db('session_keys')
      .where({ conversation_id: conversationId })
      .orderBy('created_at', 'desc')
      .first();
  }

  /**
   * Update session key after message
   */
  async updateSessionKey(
    conversationId: string,
    newChainKey: Buffer,
    messageNumber: number
  ): Promise<void> {
    await this.db('session_keys')
      .where({ conversation_id: conversationId })
      .update({
        chain_key: newChainKey.toString('base64'),
        message_number: messageNumber,
        last_used_at: new Date(),
      });
  }

  /**
   * Rotate signed pre-key
   */
  async rotateSignedPreKey(userId: string): Promise<void> {
    try {
      // Deactivate old signed pre-key
      await this.db('encryption_keys')
        .where({ user_id: userId, key_type: 'signed_pre_key' })
        .update({ is_active: false });

      // Generate new signed pre-key
      const newSignedPreKey = await encryptionService.generateSignedPreKey();

      await this.db('encryption_keys').insert({
        user_id: userId,
        public_key: newSignedPreKey.publicKey,
        private_key_encrypted: this.encryptPrivateKey(newSignedPreKey.privateKey),
        key_type: 'signed_pre_key',
        key_id: newSignedPreKey.keyId,
        is_active: true,
        created_at: new Date(),
        expires_at: new Date(Date.now() + this.SIGNED_PREKEY_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      });

      logger.info(`Rotated signed pre-key for user ${userId}`);
    } catch (error) {
      logger.error(`Failed to rotate signed pre-key: ${error}`);
      throw error;
    }
  }

  /**
   * Replenish one-time pre-keys
   */
  async replenishOneTimePreKeys(userId: string): Promise<void> {
    try {
      // Check current count
      const currentCount = await this.db('one_time_prekeys')
        .where({ user_id: userId, is_used: false })
        .count('* as count')
        .first();

      const count = parseInt((currentCount?.count as string) || '0');

      if (count < 20) {
        // Generate new keys
        const newKeys = await encryptionService.generateOneTimePreKeys(100);

        const inserts = newKeys.map((key) => ({
          user_id: userId,
          key_id: key.keyId,
          public_key: key.publicKey,
          private_key_encrypted: this.encryptPrivateKey(key.privateKey),
          is_used: false,
          created_at: new Date(),
        }));

        await this.db('one_time_prekeys').insert(inserts);

        logger.info(`Replenished one-time pre-keys for user ${userId}`);
      }
    } catch (error) {
      logger.error(`Failed to replenish one-time pre-keys: ${error}`);
      throw error;
    }
  }

  /**
   * Clean up expired keys
   */
  async cleanupExpiredKeys(): Promise<void> {
    try {
      const now = new Date();

      // Delete expired signed pre-keys
      await this.db('encryption_keys')
        .where('key_type', 'signed_pre_key')
        .where('expires_at', '<', now)
        .where('is_active', false)
        .delete();

      // Delete old used one-time pre-keys (older than 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await this.db('one_time_prekeys')
        .where('is_used', true)
        .where('used_at', '<', thirtyDaysAgo)
        .delete();

      // Delete old session keys
      const sevenDaysAgo = new Date(
        Date.now() - this.SESSION_KEY_EXPIRY_DAYS * 24 * 60 * 60 * 1000
      );
      await this.db('session_keys').where('last_used_at', '<', sevenDaysAgo).delete();

      logger.info('Cleaned up expired encryption keys');
    } catch (error) {
      logger.error(`Failed to cleanup expired keys: ${error}`);
      throw error;
    }
  }

  /**
   * Delete all user keys (for account deletion)
   */
  async deleteUserKeys(userId: string): Promise<void> {
    await this.db.transaction(async (trx) => {
      await trx('encryption_keys').where({ user_id: userId }).delete();
      await trx('one_time_prekeys').where({ user_id: userId }).delete();

      // Delete session keys for user's conversations
      const conversations = await trx('conversations')
        .where('user1_id', userId)
        .orWhere('user2_id', userId)
        .select('id');

      const conversationIds = conversations.map((c) => c.id);
      if (conversationIds.length > 0) {
        await trx('session_keys').whereIn('conversation_id', conversationIds).delete();
      }

      logger.info(`Deleted all encryption keys for user ${userId}`);
    });
  }

  /**
   * Encrypt private key for storage (using master key)
   * In production, use proper key encryption with HSM or KMS
   */
  private encryptPrivateKey(privateKey: string): string {
    // This is simplified - use proper encryption in production
    return Buffer.from(privateKey).toString('base64');
  }

  /**
   * Decrypt private key from storage
   */
  private decryptPrivateKey(encryptedKey: string): string {
    // This is simplified - use proper decryption in production
    return Buffer.from(encryptedKey, 'base64').toString('utf8');
  }
}
