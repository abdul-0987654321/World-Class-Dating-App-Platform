/**
 * Encryption Schema Definitions for Cosmos DB
 *
 * This file defines the schema structures for encryption-related data
 * stored in Cosmos DB. Since Cosmos DB is NoSQL, these are TypeScript
 * interfaces rather than SQL migrations.
 */

export interface EncryptionKeyBundle {
  id: string; // Format: keys_{userId}
  type: 'key_bundle';
  userId: string;
  identityKey: {
    publicKey: string;
    privateKey: string; // Should be encrypted in production with HSM/KMS
  };
  signedPreKey: {
    keyId: number;
    publicKey: string;
    privateKey: string; // Should be encrypted in production
    signature: string;
    timestamp: Date;
  };
  oneTimePreKeys: Array<{
    keyId: number;
    publicKey: string;
    privateKey: string; // Should be encrypted in production
    used?: boolean;
    usedAt?: Date;
    usedBy?: string; // User ID who claimed this key
  }>;
  createdAt: Date;
  updatedAt: Date;
  // Cosmos DB specific
  _rid?: string;
  _self?: string;
  _etag?: string;
  _attachments?: string;
  _ts?: number;
}

export interface SessionKey {
  id: string; // Format: session_{conversationId}_{userId}
  type: 'session_key';
  conversationId: string;
  userId: string;
  rootKey: string; // Base64 encoded
  chainKey: string; // Base64 encoded
  messageNumber: number;
  ratchetState?: {
    sendingChainKey?: string;
    receivingChainKey?: string;
    previousCounter?: number;
  };
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt?: Date;
  // Cosmos DB specific
  _rid?: string;
  _self?: string;
  _etag?: string;
  _attachments?: string;
  _ts?: number;
}

export interface OneTimePreKey {
  id: string; // Format: otpk_{userId}_{keyId}
  type: 'one_time_prekey';
  userId: string;
  keyId: number;
  publicKey: string;
  privateKey: string; // Should be encrypted in production
  isUsed: boolean;
  usedAt?: Date;
  usedBy?: string; // User ID who claimed this key
  createdAt: Date;
  // Cosmos DB specific
  _rid?: string;
  _self?: string;
  _etag?: string;
  _attachments?: string;
  _ts?: number;
}

/**
 * Initialize encryption-related containers in Cosmos DB
 */
export const ENCRYPTION_CONTAINERS = {
  KEY_BUNDLES: 'EncryptionKeys',
  SESSION_KEYS: 'SessionKeys',
  ONE_TIME_PREKEYS: 'OneTimePreKeys',
} as const;

/**
 * Indexing policies for encryption containers
 */
export const ENCRYPTION_INDEXING_POLICIES = {
  keyBundles: {
    automatic: true,
    indexingMode: 'consistent' as const,
    includedPaths: [
      { path: '/userId/?' },
      { path: '/type/?' },
      { path: '/createdAt/?' },
      { path: '/updatedAt/?' },
    ],
    excludedPaths: [
      { path: '/identityKey/*' },
      { path: '/signedPreKey/privateKey/?' },
      { path: '/oneTimePreKeys/*/privateKey/?' },
      { path: '/"_etag"/?' },
    ],
  },
  sessionKeys: {
    automatic: true,
    indexingMode: 'consistent' as const,
    includedPaths: [
      { path: '/conversationId/?' },
      { path: '/userId/?' },
      { path: '/type/?' },
      { path: '/createdAt/?' },
      { path: '/lastUsedAt/?' },
    ],
    excludedPaths: [
      { path: '/rootKey/?' },
      { path: '/chainKey/?' },
      { path: '/ratchetState/*' },
      { path: '/"_etag"/?' },
    ],
  },
  oneTimePreKeys: {
    automatic: true,
    indexingMode: 'consistent' as const,
    includedPaths: [
      { path: '/userId/?' },
      { path: '/keyId/?' },
      { path: '/type/?' },
      { path: '/isUsed/?' },
      { path: '/createdAt/?' },
    ],
    excludedPaths: [{ path: '/privateKey/?' }, { path: '/"_etag"/?' }],
  },
};

/**
 * TTL (Time-to-Live) settings for automatic cleanup
 */
export const ENCRYPTION_TTL_SETTINGS = {
  // Session keys expire after 30 days of inactivity
  SESSION_KEYS: 30 * 24 * 60 * 60, // 30 days in seconds
  // One-time pre-keys expire after 90 days if unused
  ONE_TIME_PREKEYS: 90 * 24 * 60 * 60, // 90 days in seconds
  // Key bundles don't expire automatically
  KEY_BUNDLES: -1, // No TTL
};
