import { Response } from 'express';
import { createLogger } from '../../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';
import encryptionService from '../../services/encryption.service';
import { cosmosClient } from '../../infrastructure/database/cosmos-client';
import { Container } from '@azure/cosmos';

const logger = createLogger('encryption-keys-controller');

interface EncryptionKeyBundle {
  identityKey: string;
  signedPreKey: {
    keyId: number;
    publicKey: string;
    signature: string;
    timestamp: Date;
  };
  oneTimePreKeys: Array<{
    keyId: number;
    publicKey: string;
  }>;
}

interface StoredKeyBundle {
  id: string;
  userId: string;
  identityKey: {
    publicKey: string;
    privateKey: string;
  };
  signedPreKey: {
    keyId: number;
    publicKey: string;
    privateKey: string;
    signature: string;
    timestamp: Date;
  };
  oneTimePreKeys: Array<{
    keyId: number;
    publicKey: string;
    privateKey: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

interface SessionKey {
  id: string;
  conversationId: string;
  userId: string;
  rootKey: string;
  chainKey: string;
  messageNumber: number;
  createdAt: Date;
  lastUsedAt: Date;
}

export class EncryptionKeysController {
  private _keysContainer: Container | null = null;

  private get keysContainer(): Container {
    if (!this._keysContainer) {
      this._keysContainer = cosmosClient.getMessagesContainer();
    }
    return this._keysContainer;
  }

  /**
   * POST /api/keys/upload
   * Upload user's pre-keys bundle
   */
  async uploadKeys(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { identityKey, signedPreKey, oneTimePreKeys } = req.body;

      // Validate required fields
      if (!identityKey || !signedPreKey || !oneTimePreKeys) {
        return res.status(400).json({
          success: false,
          error: 'identityKey, signedPreKey, and oneTimePreKeys are required',
        });
      }

      // Validate oneTimePreKeys is an array
      if (!Array.isArray(oneTimePreKeys) || oneTimePreKeys.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'oneTimePreKeys must be a non-empty array',
        });
      }

      // Check if user already has keys
      const existingKeysQuery = {
        query: 'SELECT * FROM c WHERE c.userId = @userId AND c.type = @type',
        parameters: [
          { name: '@userId', value: userId },
          { name: '@type', value: 'key_bundle' },
        ],
      };

      const { resources: existingKeys } = await this.keysContainer.items
        .query<StoredKeyBundle>(existingKeysQuery)
        .fetchAll();

      const keyBundle: StoredKeyBundle = {
        id: existingKeys.length > 0 ? existingKeys[0].id : `keys_${userId}`,
        userId,
        identityKey: {
          publicKey: identityKey.publicKey,
          privateKey: identityKey.privateKey || '', // Store encrypted in production
        },
        signedPreKey: {
          keyId: signedPreKey.keyId,
          publicKey: signedPreKey.publicKey,
          privateKey: signedPreKey.privateKey || '',
          signature: signedPreKey.signature,
          timestamp: new Date(signedPreKey.timestamp || Date.now()),
        },
        oneTimePreKeys: oneTimePreKeys.map((key: any) => ({
          keyId: key.keyId,
          publicKey: key.publicKey,
          privateKey: key.privateKey || '',
        })),
        createdAt: existingKeys.length > 0 ? existingKeys[0].createdAt : new Date(),
        updatedAt: new Date(),
      };

      // Store key bundle
      if (existingKeys.length > 0) {
        await this.keysContainer.item(keyBundle.id, userId).replace(keyBundle);
        logger.info(`Updated key bundle for user ${userId}`);
      } else {
        await this.keysContainer.items.create({ ...keyBundle, type: 'key_bundle' });
        logger.info(`Created key bundle for user ${userId}`);
      }

      return res.status(200).json({
        success: true,
        message: 'Keys uploaded successfully',
        data: {
          identityKeyId: keyBundle.id,
          signedPreKeyId: signedPreKey.keyId,
          oneTimePreKeyCount: oneTimePreKeys.length,
        },
      });
    } catch (error: any) {
      logger.error('Failed to upload keys:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to upload keys',
      });
    }
  }

  /**
   * GET /api/keys/:userId
   * Get user's public keys for initiating encrypted conversation
   */
  async getUserKeys(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const currentUserId = req.user!.userId;
      const { userId } = req.params;

      // Find user's key bundle
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.userId = @userId AND c.type = @type',
        parameters: [
          { name: '@userId', value: userId },
          { name: '@type', value: 'key_bundle' },
        ],
      };

      const { resources } = await this.keysContainer.items
        .query<StoredKeyBundle>(querySpec)
        .fetchAll();

      if (resources.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User keys not found. User may need to initialize encryption keys.',
        });
      }

      const keyBundle = resources[0];

      // Claim one one-time pre-key (mark as used)
      let claimedOneTimePreKey: { keyId: number; publicKey: string } | undefined;

      if (keyBundle.oneTimePreKeys.length > 0) {
        // Find first unused key (simplified - in production track used keys separately)
        const availableKey = keyBundle.oneTimePreKeys[0];
        claimedOneTimePreKey = {
          keyId: availableKey.keyId,
          publicKey: availableKey.publicKey,
        };

        // Remove claimed key from bundle
        keyBundle.oneTimePreKeys = keyBundle.oneTimePreKeys.slice(1);
        keyBundle.updatedAt = new Date();

        // Update bundle
        await this.keysContainer.item(keyBundle.id, userId).replace(keyBundle);

        logger.info(`User ${currentUserId} claimed one-time pre-key from user ${userId}`);
      }

      // Return public keys only
      const response: EncryptionKeyBundle = {
        identityKey: keyBundle.identityKey.publicKey,
        signedPreKey: {
          keyId: keyBundle.signedPreKey.keyId,
          publicKey: keyBundle.signedPreKey.publicKey,
          signature: keyBundle.signedPreKey.signature,
          timestamp: keyBundle.signedPreKey.timestamp,
        },
        oneTimePreKeys: claimedOneTimePreKey ? [claimedOneTimePreKey] : [],
      };

      return res.status(200).json({
        success: true,
        data: response,
      });
    } catch (error: any) {
      logger.error('Failed to get user keys:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve user keys',
      });
    }
  }

  /**
   * POST /api/keys/claim
   * Claim one-time pre-keys for establishing session
   */
  async claimPreKeys(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const currentUserId = req.user!.userId;
      const { userId, count = 1 } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'userId is required',
        });
      }

      // Find user's key bundle
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.userId = @userId AND c.type = @type',
        parameters: [
          { name: '@userId', value: userId },
          { name: '@type', value: 'key_bundle' },
        ],
      };

      const { resources } = await this.keysContainer.items
        .query<StoredKeyBundle>(querySpec)
        .fetchAll();

      if (resources.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User keys not found',
        });
      }

      const keyBundle = resources[0];

      // Claim requested number of one-time pre-keys
      const claimedKeys = keyBundle.oneTimePreKeys.slice(0, Math.min(count, keyBundle.oneTimePreKeys.length));

      if (claimedKeys.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No one-time pre-keys available. User should upload more keys.',
        });
      }

      // Remove claimed keys
      keyBundle.oneTimePreKeys = keyBundle.oneTimePreKeys.slice(claimedKeys.length);
      keyBundle.updatedAt = new Date();

      // Update bundle
      await this.keysContainer.item(keyBundle.id, userId).replace(keyBundle);

      logger.info(`User ${currentUserId} claimed ${claimedKeys.length} one-time pre-keys from user ${userId}`);

      // Return public keys only
      const response = claimedKeys.map(key => ({
        keyId: key.keyId,
        publicKey: key.publicKey,
      }));

      return res.status(200).json({
        success: true,
        data: {
          oneTimePreKeys: response,
          remaining: keyBundle.oneTimePreKeys.length,
        },
      });
    } catch (error: any) {
      logger.error('Failed to claim pre-keys:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to claim pre-keys',
      });
    }
  }

  /**
   * POST /api/keys/generate
   * Generate new key bundle for user (convenience endpoint)
   */
  async generateKeys(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;

      // Generate identity key pair
      const identityKeyPair = await encryptionService.generateIdentityKeyPair();

      // Generate signed pre-key
      const signedPreKey = await encryptionService.generateSignedPreKey();

      // Generate one-time pre-keys
      const oneTimePreKeys = await encryptionService.generateOneTimePreKeys(100);

      logger.info(`Generated new key bundle for user ${userId}`);

      return res.status(200).json({
        success: true,
        data: {
          identityKey: identityKeyPair,
          signedPreKey,
          oneTimePreKeys,
        },
        message: 'Keys generated successfully. Please store the private keys securely and upload the public keys.',
      });
    } catch (error: any) {
      logger.error('Failed to generate keys:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate keys',
      });
    }
  }

  /**
   * POST /api/keys/session
   * Create session key for conversation
   */
  async createSessionKey(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { conversationId, rootKey, chainKey } = req.body;

      if (!conversationId || !rootKey || !chainKey) {
        return res.status(400).json({
          success: false,
          error: 'conversationId, rootKey, and chainKey are required',
        });
      }

      const sessionKey: SessionKey = {
        id: `session_${conversationId}_${userId}`,
        conversationId,
        userId,
        rootKey,
        chainKey,
        messageNumber: 0,
        createdAt: new Date(),
        lastUsedAt: new Date(),
      };

      await this.keysContainer.items.create({ ...sessionKey, type: 'session_key' });

      logger.info(`Created session key for conversation ${conversationId}, user ${userId}`);

      return res.status(201).json({
        success: true,
        data: {
          sessionId: sessionKey.id,
        },
        message: 'Session key created successfully',
      });
    } catch (error: any) {
      logger.error('Failed to create session key:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to create session key',
      });
    }
  }

  /**
   * GET /api/keys/session/:conversationId
   * Get session key for conversation
   */
  async getSessionKey(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { conversationId } = req.params;

      const querySpec = {
        query: 'SELECT * FROM c WHERE c.conversationId = @conversationId AND c.userId = @userId AND c.type = @type',
        parameters: [
          { name: '@conversationId', value: conversationId },
          { name: '@userId', value: userId },
          { name: '@type', value: 'session_key' },
        ],
      };

      const { resources } = await this.keysContainer.items
        .query<SessionKey>(querySpec)
        .fetchAll();

      if (resources.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Session key not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: resources[0],
      });
    } catch (error: any) {
      logger.error('Failed to get session key:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve session key',
      });
    }
  }

  /**
   * PUT /api/keys/session/:conversationId
   * Update session key after message ratchet
   */
  async updateSessionKey(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { conversationId } = req.params;
      const { chainKey, messageNumber } = req.body;

      if (!chainKey || messageNumber === undefined) {
        return res.status(400).json({
          success: false,
          error: 'chainKey and messageNumber are required',
        });
      }

      const querySpec = {
        query: 'SELECT * FROM c WHERE c.conversationId = @conversationId AND c.userId = @userId AND c.type = @type',
        parameters: [
          { name: '@conversationId', value: conversationId },
          { name: '@userId', value: userId },
          { name: '@type', value: 'session_key' },
        ],
      };

      const { resources } = await this.keysContainer.items
        .query<SessionKey>(querySpec)
        .fetchAll();

      if (resources.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Session key not found',
        });
      }

      const sessionKey = resources[0];
      sessionKey.chainKey = chainKey;
      sessionKey.messageNumber = messageNumber;
      sessionKey.lastUsedAt = new Date();

      await this.keysContainer.item(sessionKey.id, conversationId).replace(sessionKey);

      logger.info(`Updated session key for conversation ${conversationId}, user ${userId}`);

      return res.status(200).json({
        success: true,
        message: 'Session key updated successfully',
      });
    } catch (error: any) {
      logger.error('Failed to update session key:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to update session key',
      });
    }
  }

  /**
   * DELETE /api/keys/session/:conversationId
   * Delete session key (when conversation ends or reset)
   */
  async deleteSessionKey(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { conversationId } = req.params;

      const querySpec = {
        query: 'SELECT * FROM c WHERE c.conversationId = @conversationId AND c.userId = @userId AND c.type = @type',
        parameters: [
          { name: '@conversationId', value: conversationId },
          { name: '@userId', value: userId },
          { name: '@type', value: 'session_key' },
        ],
      };

      const { resources } = await this.keysContainer.items
        .query<SessionKey>(querySpec)
        .fetchAll();

      if (resources.length > 0) {
        const sessionKey = resources[0];
        await this.keysContainer.item(sessionKey.id, conversationId).delete();
        logger.info(`Deleted session key for conversation ${conversationId}, user ${userId}`);
      }

      return res.status(200).json({
        success: true,
        message: 'Session key deleted successfully',
      });
    } catch (error: any) {
      logger.error('Failed to delete session key:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete session key',
      });
    }
  }
}

export const encryptionKeysController = new EncryptionKeysController();
export default encryptionKeysController;
