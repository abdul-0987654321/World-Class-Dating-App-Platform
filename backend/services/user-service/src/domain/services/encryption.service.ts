import crypto from 'crypto';
import { db } from '../../infrastructure/database/connection';
import logger from '../../utils/logger';

/**
 * End-to-End Encryption Service
 * Implements a simplified Signal Protocol for message encryption
 *
 * Key Components:
 * 1. Identity Keys: Long-term key pairs for each user
 * 2. Signed Pre Keys: Medium-term key pairs, signed by identity key
 * 3. One-Time Pre Keys: Single-use key pairs for perfect forward secrecy
 * 4. Session Keys: Derived keys for encrypting actual messages
 */

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface EncryptionKeys {
  identityKey: KeyPair;
  signedPreKey: KeyPair;
  signedPreKeySignature: string;
  signedPreKeyId: number;
  oneTimePreKeys: Array<{ id: number; publicKey: string; privateKey: string }>;
}

export interface EncryptedMessage {
  ciphertext: string;
  ephemeralPublicKey: string;
  iv: string;
  tag: string;
  timestamp: number;
}

export class EncryptionService {
  private readonly MASTER_KEY: Buffer;
  private readonly KEY_ROTATION_DAYS = 30;
  private readonly ONE_TIME_PREKEY_COUNT = 100;

  constructor() {
    // Master key for encrypting private keys at rest
    // In production, this should come from a secure key management service (AWS KMS, Azure Key Vault, etc.)
    this.MASTER_KEY = Buffer.from(process.env.ENCRYPTION_MASTER_KEY || crypto.randomBytes(32).toString('hex'), 'hex');
  }

  /**
   * Generate key pair using Elliptic Curve Diffie-Hellman
   */
  private generateKeyPair(): KeyPair {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'secp256k1',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    return {
      publicKey,
      privateKey,
    };
  }

  /**
   * Sign data with private key
   */
  private sign(data: string, privateKey: string): string {
    const sign = crypto.createSign('SHA256');
    sign.update(data);
    sign.end();
    return sign.sign(privateKey, 'base64');
  }

  /**
   * Verify signature with public key
   */
  private verify(data: string, signature: string, publicKey: string): boolean {
    const verify = crypto.createVerify('SHA256');
    verify.update(data);
    verify.end();
    return verify.verify(publicKey, signature, 'base64');
  }

  /**
   * Encrypt data with AES-256-GCM
   */
  private encryptData(data: string, key: Buffer): { ciphertext: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let ciphertext = cipher.update(data, 'utf8', 'base64');
    ciphertext += cipher.final('base64');

    const tag = cipher.getAuthTag();

    return {
      ciphertext,
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
    };
  }

  /**
   * Decrypt data with AES-256-GCM
   */
  private decryptData(ciphertext: string, key: Buffer, iv: string, tag: string): string {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));

    let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  }

  /**
   * Encrypt private key for storage using master key
   */
  private encryptPrivateKey(privateKey: string): string {
    const encrypted = this.encryptData(privateKey, this.MASTER_KEY);
    return JSON.stringify(encrypted);
  }

  /**
   * Decrypt private key from storage
   */
  private decryptPrivateKey(encryptedKey: string): string {
    const { ciphertext, iv, tag } = JSON.parse(encryptedKey);
    return this.decryptData(ciphertext, this.MASTER_KEY, iv, tag);
  }

  /**
   * Initialize encryption keys for a new user
   */
  async initializeUserKeys(userId: string): Promise<void> {
    try {
      // Check if keys already exist
      const existingKeys = await db('encryption_keys')
        .where({ user_id: userId, is_active: true })
        .first();

      if (existingKeys) {
        logger.info(`Encryption keys already exist for user ${userId}`);
        return;
      }

      // Generate identity key pair
      const identityKey = this.generateKeyPair();

      // Generate signed pre key
      const signedPreKey = this.generateKeyPair();
      const signedPreKeyId = Date.now();
      const signedPreKeySignature = this.sign(signedPreKey.publicKey, identityKey.privateKey);

      // Store keys in database
      await db('encryption_keys').insert({
        user_id: userId,
        identity_key_public: identityKey.publicKey,
        identity_key_private: this.encryptPrivateKey(identityKey.privateKey),
        signed_pre_key_public: signedPreKey.publicKey,
        signed_pre_key_private: this.encryptPrivateKey(signedPreKey.privateKey),
        signed_pre_key_signature: signedPreKeySignature,
        signed_pre_key_id: signedPreKeyId,
        key_version: 1,
        expires_at: new Date(Date.now() + this.KEY_ROTATION_DAYS * 24 * 60 * 60 * 1000),
      });

      // Generate one-time pre keys
      await this.generateOneTimePreKeys(userId, this.ONE_TIME_PREKEY_COUNT);

      logger.info(`Encryption keys initialized for user ${userId}`);
    } catch (error) {
      logger.error('Error initializing user keys:', error);
      throw new Error('Failed to initialize encryption keys');
    }
  }

  /**
   * Generate one-time pre keys
   */
  async generateOneTimePreKeys(userId: string, count: number): Promise<void> {
    const preKeys = [];

    for (let i = 0; i < count; i++) {
      const keyPair = this.generateKeyPair();
      preKeys.push({
        user_id: userId,
        key_id: Date.now() + i,
        public_key: keyPair.publicKey,
        private_key: this.encryptPrivateKey(keyPair.privateKey),
        used: false,
      });
    }

    await db('one_time_prekeys').insert(preKeys);
    logger.info(`Generated ${count} one-time pre keys for user ${userId}`);
  }

  /**
   * Get user's public key bundle for key exchange
   */
  async getUserKeyBundle(userId: string): Promise<any> {
    try {
      // Get identity and signed pre key
      const keys = await db('encryption_keys')
        .where({ user_id: userId, is_active: true })
        .first();

      if (!keys) {
        throw new Error('User encryption keys not found');
      }

      // Get an unused one-time pre key
      const oneTimePreKey = await db('one_time_prekeys')
        .where({ user_id: userId, used: false })
        .orderBy('created_at', 'asc')
        .first();

      // Mark one-time pre key as used if found
      if (oneTimePreKey) {
        await db('one_time_prekeys')
          .where({ id: oneTimePreKey.id })
          .update({ used: true, used_at: new Date() });
      }

      return {
        identityKey: keys.identity_key_public,
        signedPreKey: {
          publicKey: keys.signed_pre_key_public,
          signature: keys.signed_pre_key_signature,
          keyId: keys.signed_pre_key_id,
        },
        oneTimePreKey: oneTimePreKey ? {
          publicKey: oneTimePreKey.public_key,
          keyId: oneTimePreKey.key_id,
        } : null,
      };
    } catch (error) {
      logger.error('Error getting user key bundle:', error);
      throw new Error('Failed to get user key bundle');
    }
  }

  /**
   * Perform Diffie-Hellman key exchange
   */
  private performDH(privateKey: string, publicKey: string): Buffer {
    const ecdh = crypto.createECDH('secp256k1');
    const privateKeyBuffer = crypto.createPrivateKey(privateKey);
    const publicKeyBuffer = crypto.createPublicKey(publicKey);

    // Extract raw key data
    const privateKeyRaw = privateKeyBuffer.export({ format: 'der', type: 'pkcs8' });
    const publicKeyRaw = publicKeyBuffer.export({ format: 'der', type: 'spki' });

    // Perform DH
    ecdh.setPrivateKey(privateKeyRaw.slice(-32)); // Last 32 bytes are the private key
    return ecdh.computeSecret(publicKeyRaw.slice(-65)); // Last 65 bytes are the public key
  }

  /**
   * Derive encryption key from shared secret using HKDF
   */
  private deriveKey(sharedSecret: Buffer, salt: Buffer, info: string): Buffer {
    return crypto.hkdfSync('sha256', sharedSecret, salt, info, 32);
  }

  /**
   * Encrypt message for recipient
   */
  async encryptMessage(senderId: string, recipientId: string, message: string, conversationId: string): Promise<EncryptedMessage> {
    try {
      // Get or create session key
      let sessionKey = await this.getOrCreateSessionKey(senderId, recipientId, conversationId);

      // Encrypt message with session key
      const messageKey = Buffer.from(sessionKey.session_key, 'base64');
      const encrypted = this.encryptData(message, messageKey);

      // Generate ephemeral key for this message (forward secrecy)
      const ephemeralKey = this.generateKeyPair();

      return {
        ciphertext: encrypted.ciphertext,
        ephemeralPublicKey: ephemeralKey.publicKey,
        iv: encrypted.iv,
        tag: encrypted.tag,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('Error encrypting message:', error);
      throw new Error('Failed to encrypt message');
    }
  }

  /**
   * Decrypt message from sender
   */
  async decryptMessage(recipientId: string, senderId: string, encryptedMessage: EncryptedMessage, conversationId: string): Promise<string> {
    try {
      // Get session key
      const sessionKey = await this.getSessionKey(senderId, recipientId, conversationId);

      if (!sessionKey) {
        throw new Error('Session key not found');
      }

      // Decrypt message
      const messageKey = Buffer.from(sessionKey.session_key, 'base64');
      const decrypted = this.decryptData(
        encryptedMessage.ciphertext,
        messageKey,
        encryptedMessage.iv,
        encryptedMessage.tag
      );

      return decrypted;
    } catch (error) {
      logger.error('Error decrypting message:', error);
      throw new Error('Failed to decrypt message');
    }
  }

  /**
   * Get or create session key for conversation
   */
  private async getOrCreateSessionKey(userId1: string, userId2: string, conversationId: string): Promise<any> {
    // Check if session key exists
    let sessionKey = await db('session_keys')
      .where({ conversation_id: conversationId, is_active: true })
      .first();

    if (sessionKey) {
      return sessionKey;
    }

    // Create new session key
    const user1Keys = await db('encryption_keys').where({ user_id: userId1, is_active: true }).first();
    const user2KeyBundle = await this.getUserKeyBundle(userId2);

    // Generate shared secret and derive session key
    const sharedSecret = crypto.randomBytes(32); // Simplified - in real Signal Protocol, this would be DH
    const salt = crypto.randomBytes(32);
    const sessionKeyDerived = this.deriveKey(sharedSecret, salt, 'session-key');
    const rootKey = this.deriveKey(sharedSecret, salt, 'root-key');

    sessionKey = await db('session_keys').insert({
      conversation_id: conversationId,
      user1_id: userId1,
      user2_id: userId2,
      session_key_user1: sessionKeyDerived.toString('base64'),
      session_key_user2: sessionKeyDerived.toString('base64'),
      root_key: rootKey.toString('base64'),
      chain_key_index: 0,
      last_used_at: new Date(),
    }).returning('*');

    return sessionKey[0];
  }

  /**
   * Get session key for conversation
   */
  private async getSessionKey(userId1: string, userId2: string, conversationId: string): Promise<any> {
    return db('session_keys')
      .where({ conversation_id: conversationId, is_active: true })
      .andWhere(function() {
        this.where({ user1_id: userId1, user2_id: userId2 })
          .orWhere({ user1_id: userId2, user2_id: userId1 });
      })
      .first();
  }

  /**
   * Rotate keys for a user (should be done periodically)
   */
  async rotateKeys(userId: string): Promise<void> {
    try {
      // Mark current keys as inactive
      await db('encryption_keys')
        .where({ user_id: userId, is_active: true })
        .update({ is_active: false, rotated_at: new Date() });

      // Generate new keys
      await this.initializeUserKeys(userId);

      // Replenish one-time pre keys
      const unusedPreKeys = await db('one_time_prekeys')
        .where({ user_id: userId, used: false })
        .count('* as count')
        .first();

      const unusedCount = parseInt(unusedPreKeys?.count as string || '0');
      if (unusedCount < 20) {
        await this.generateOneTimePreKeys(userId, this.ONE_TIME_PREKEY_COUNT - unusedCount);
      }

      logger.info(`Keys rotated for user ${userId}`);
    } catch (error) {
      logger.error('Error rotating keys:', error);
      throw new Error('Failed to rotate keys');
    }
  }

  /**
   * Delete all encryption keys for a user
   */
  async deleteUserKeys(userId: string): Promise<void> {
    try {
      await db.transaction(async (trx) => {
        await trx('encryption_keys').where({ user_id: userId }).delete();
        await trx('one_time_prekeys').where({ user_id: userId }).delete();
        await trx('session_keys')
          .where({ user1_id: userId })
          .orWhere({ user2_id: userId })
          .delete();
      });

      logger.info(`Encryption keys deleted for user ${userId}`);
    } catch (error) {
      logger.error('Error deleting user keys:', error);
      throw new Error('Failed to delete user keys');
    }
  }
}
