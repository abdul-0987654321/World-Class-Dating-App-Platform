import * as SecureStore from 'expo-secure-store';
import { KeyPair, SignedPreKey, OneTimePreKey } from './EncryptionService';

/**
 * Secure Key Storage using Expo SecureStore
 * Stores encryption keys securely on device
 */

const STORAGE_KEYS = {
  IDENTITY_KEY: (userId: string) => `encryption_identity_${userId}`,
  SIGNED_PREKEY: (userId: string) => `encryption_signed_prekey_${userId}`,
  ONE_TIME_PREKEYS: (userId: string) => `encryption_one_time_prekeys_${userId}`,
  SESSION_KEY: (conversationId: string) => `session_key_${conversationId}`,
  SESSION_KEYS_INDEX: 'session_keys_index',
};

export class SecureKeyStorage {
  private static instance: SecureKeyStorage;

  private constructor() {}

  public static getInstance(): SecureKeyStorage {
    if (!SecureKeyStorage.instance) {
      SecureKeyStorage.instance = new SecureKeyStorage();
    }
    return SecureKeyStorage.instance;
  }

  /**
   * Store identity key pair
   */
  async storeIdentityKey(userId: string, keyPair: KeyPair): Promise<void> {
    try {
      const key = STORAGE_KEYS.IDENTITY_KEY(userId);
      await SecureStore.setItemAsync(key, JSON.stringify(keyPair));
    } catch (error) {
      console.error('Failed to store identity key:', error);
      throw new Error('Failed to store identity key');
    }
  }

  /**
   * Get identity key pair
   */
  async getIdentityKey(userId: string): Promise<KeyPair | null> {
    try {
      const key = STORAGE_KEYS.IDENTITY_KEY(userId);
      const value = await SecureStore.getItemAsync(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Failed to get identity key:', error);
      return null;
    }
  }

  /**
   * Store signed pre-key
   */
  async storeSignedPreKey(userId: string, signedPreKey: SignedPreKey): Promise<void> {
    try {
      const key = STORAGE_KEYS.SIGNED_PREKEY(userId);
      await SecureStore.setItemAsync(key, JSON.stringify(signedPreKey));
    } catch (error) {
      console.error('Failed to store signed pre-key:', error);
      throw new Error('Failed to store signed pre-key');
    }
  }

  /**
   * Get signed pre-key
   */
  async getSignedPreKey(userId: string): Promise<SignedPreKey | null> {
    try {
      const key = STORAGE_KEYS.SIGNED_PREKEY(userId);
      const value = await SecureStore.getItemAsync(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Failed to get signed pre-key:', error);
      return null;
    }
  }

  /**
   * Store one-time pre-keys
   */
  async storeOneTimePreKeys(
    userId: string,
    oneTimePreKeys: OneTimePreKey[]
  ): Promise<void> {
    try {
      const key = STORAGE_KEYS.ONE_TIME_PREKEYS(userId);
      await SecureStore.setItemAsync(key, JSON.stringify(oneTimePreKeys));
    } catch (error) {
      console.error('Failed to store one-time pre-keys:', error);
      throw new Error('Failed to store one-time pre-keys');
    }
  }

  /**
   * Get one-time pre-keys
   */
  async getOneTimePreKeys(userId: string): Promise<OneTimePreKey[] | null> {
    try {
      const key = STORAGE_KEYS.ONE_TIME_PREKEYS(userId);
      const value = await SecureStore.getItemAsync(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Failed to get one-time pre-keys:', error);
      return null;
    }
  }

  /**
   * Store session key for conversation
   */
  async storeSessionKey(conversationId: string, sessionKey: string): Promise<void> {
    try {
      const key = STORAGE_KEYS.SESSION_KEY(conversationId);
      await SecureStore.setItemAsync(key, sessionKey);

      // Update session keys index
      await this.addToSessionKeysIndex(conversationId);
    } catch (error) {
      console.error('Failed to store session key:', error);
      throw new Error('Failed to store session key');
    }
  }

  /**
   * Get session key for conversation
   */
  async getSessionKey(conversationId: string): Promise<string | null> {
    try {
      const key = STORAGE_KEYS.SESSION_KEY(conversationId);
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('Failed to get session key:', error);
      return null;
    }
  }

  /**
   * Delete session key
   */
  async deleteSessionKey(conversationId: string): Promise<void> {
    try {
      const key = STORAGE_KEYS.SESSION_KEY(conversationId);
      await SecureStore.deleteItemAsync(key);

      // Update session keys index
      await this.removeFromSessionKeysIndex(conversationId);
    } catch (error) {
      console.error('Failed to delete session key:', error);
    }
  }

  /**
   * Add conversation to session keys index
   */
  private async addToSessionKeysIndex(conversationId: string): Promise<void> {
    try {
      const indexKey = STORAGE_KEYS.SESSION_KEYS_INDEX;
      const indexValue = await SecureStore.getItemAsync(indexKey);
      const index: string[] = indexValue ? JSON.parse(indexValue) : [];

      if (!index.includes(conversationId)) {
        index.push(conversationId);
        await SecureStore.setItemAsync(indexKey, JSON.stringify(index));
      }
    } catch (error) {
      console.error('Failed to update session keys index:', error);
    }
  }

  /**
   * Remove conversation from session keys index
   */
  private async removeFromSessionKeysIndex(conversationId: string): Promise<void> {
    try {
      const indexKey = STORAGE_KEYS.SESSION_KEYS_INDEX;
      const indexValue = await SecureStore.getItemAsync(indexKey);
      const index: string[] = indexValue ? JSON.parse(indexValue) : [];

      const updatedIndex = index.filter(id => id !== conversationId);
      await SecureStore.setItemAsync(indexKey, JSON.stringify(updatedIndex));
    } catch (error) {
      console.error('Failed to update session keys index:', error);
    }
  }

  /**
   * Delete all user keys
   */
  async deleteUserKeys(userId: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.IDENTITY_KEY(userId));
      await SecureStore.deleteItemAsync(STORAGE_KEYS.SIGNED_PREKEY(userId));
      await SecureStore.deleteItemAsync(STORAGE_KEYS.ONE_TIME_PREKEYS(userId));

      // Delete all session keys
      const indexKey = STORAGE_KEYS.SESSION_KEYS_INDEX;
      const indexValue = await SecureStore.getItemAsync(indexKey);
      const index: string[] = indexValue ? JSON.parse(indexValue) : [];

      for (const conversationId of index) {
        await SecureStore.deleteItemAsync(STORAGE_KEYS.SESSION_KEY(conversationId));
      }

      await SecureStore.deleteItemAsync(indexKey);
    } catch (error) {
      console.error('Failed to delete user keys:', error);
      throw error;
    }
  }

  /**
   * Check if user has encryption keys initialized
   */
  async hasKeys(userId: string): Promise<boolean> {
    try {
      const identityKey = await this.getIdentityKey(userId);
      return identityKey !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all session keys for backup/sync
   */
  async getAllSessionKeys(): Promise<{ conversationId: string; key: string }[]> {
    try {
      const indexKey = STORAGE_KEYS.SESSION_KEYS_INDEX;
      const indexValue = await SecureStore.getItemAsync(indexKey);
      const index: string[] = indexValue ? JSON.parse(indexValue) : [];

      const sessionKeys: { conversationId: string; key: string }[] = [];

      for (const conversationId of index) {
        const key = await this.getSessionKey(conversationId);
        if (key) {
          sessionKeys.push({ conversationId, key });
        }
      }

      return sessionKeys;
    } catch (error) {
      console.error('Failed to get all session keys:', error);
      return [];
    }
  }

  /**
   * Clear all encryption data (for logout/reset)
   */
  async clearAll(): Promise<void> {
    try {
      // Get all session keys
      const indexKey = STORAGE_KEYS.SESSION_KEYS_INDEX;
      const indexValue = await SecureStore.getItemAsync(indexKey);
      const index: string[] = indexValue ? JSON.parse(indexValue) : [];

      // Delete all session keys
      for (const conversationId of index) {
        await SecureStore.deleteItemAsync(STORAGE_KEYS.SESSION_KEY(conversationId));
      }

      await SecureStore.deleteItemAsync(indexKey);

      console.log('All encryption data cleared');
    } catch (error) {
      console.error('Failed to clear encryption data:', error);
      throw error;
    }
  }
}

export default SecureKeyStorage.getInstance();
