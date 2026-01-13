/**
 * Encryption Schema Definitions for PostgreSQL
 *
 * This file defines the schema structures for encryption-related data
 * stored in PostgreSQL. These TypeScript interfaces define the data
 * structure for encryption keys and sessions.
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
}

/**
 * Table names for encryption-related data in PostgreSQL
 */
export const ENCRYPTION_TABLES = {
  KEY_BUNDLES: 'encryption_keys',
  SESSION_KEYS: 'session_keys',
  ONE_TIME_PREKEYS: 'one_time_prekeys',
} as const;

/**
 * TTL (Time-to-Live) settings for automatic cleanup (used by scheduled jobs)
 */
export const ENCRYPTION_TTL_SETTINGS = {
  // Session keys expire after 30 days of inactivity
  SESSION_KEYS: 30 * 24 * 60 * 60, // 30 days in seconds
  // One-time pre-keys expire after 90 days if unused
  ONE_TIME_PREKEYS: 90 * 24 * 60 * 60, // 90 days in seconds
  // Key bundles don't expire automatically
  KEY_BUNDLES: -1, // No TTL
};
