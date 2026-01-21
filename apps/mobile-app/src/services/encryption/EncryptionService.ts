import * as Crypto from 'expo-crypto';
import { Buffer } from 'buffer';
import { SecureKeyStorage } from './SecureKeyStorage';

/**
 * Encryption Service for React Native Mobile App
 * Implements Signal Protocol-like E2E encryption
 */

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface SignedPreKey {
  keyId: number;
  publicKey: string;
  privateKey: string;
  signature: string;
  timestamp: number;
}

export interface OneTimePreKey {
  keyId: number;
  publicKey: string;
  privateKey: string;
}

export interface EncryptedMessage {
  ciphertext: string;
  iv: string;
  authTag: string;
  version: number;
}

export class EncryptionService {
  private keyStorage: SecureKeyStorage;
  private static instance: EncryptionService;

  private constructor() {
    this.keyStorage = SecureKeyStorage.getInstance();
  }

  public static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * Generate identity key pair
   * Note: React Native doesn't have native X25519 support
   * This is a simplified implementation using available crypto APIs
   */
  async generateIdentityKeyPair(): Promise<KeyPair> {
    try {
      // In production, use a proper Curve25519 library like react-native-libsodium
      // For MVP, we'll use a placeholder that should be replaced
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      const publicKey = Buffer.from(randomBytes).toString('base64');

      const privateRandomBytes = await Crypto.getRandomBytesAsync(32);
      const privateKey = Buffer.from(privateRandomBytes).toString('base64');

      return {
        publicKey,
        privateKey,
      };
    } catch (error) {
      console.error('Failed to generate identity key pair:', error);
      throw new Error('Failed to generate identity key pair');
    }
  }

  /**
   * Generate signed pre-key
   */
  async generateSignedPreKey(identityPrivateKey: string): Promise<SignedPreKey> {
    try {
      const keyId = Math.floor(Math.random() * 16777215);

      const randomBytes = await Crypto.getRandomBytesAsync(32);
      const publicKey = Buffer.from(randomBytes).toString('base64');

      const privateRandomBytes = await Crypto.getRandomBytesAsync(32);
      const privateKey = Buffer.from(privateRandomBytes).toString('base64');

      // Simplified signature (should use proper signing in production)
      const signature = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        publicKey + identityPrivateKey
      );

      return {
        keyId,
        publicKey,
        privateKey,
        signature,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Failed to generate signed pre-key:', error);
      throw new Error('Failed to generate signed pre-key');
    }
  }

  /**
   * Generate one-time pre-keys
   */
  async generateOneTimePreKeys(count: number = 100): Promise<OneTimePreKey[]> {
    try {
      const keys: OneTimePreKey[] = [];

      for (let i = 0; i < count; i++) {
        const keyId = Math.floor(Math.random() * 16777215);

        const randomBytes = await Crypto.getRandomBytesAsync(32);
        const publicKey = Buffer.from(randomBytes).toString('base64');

        const privateRandomBytes = await Crypto.getRandomBytesAsync(32);
        const privateKey = Buffer.from(privateRandomBytes).toString('base64');

        keys.push({
          keyId,
          publicKey,
          privateKey,
        });
      }

      return keys;
    } catch (error) {
      console.error('Failed to generate one-time pre-keys:', error);
      throw new Error('Failed to generate one-time pre-keys');
    }
  }

  /**
   * Initialize encryption keys for user
   */
  async initializeUserKeys(userId: string): Promise<{
    identityKey: KeyPair;
    signedPreKey: SignedPreKey;
    oneTimePreKeys: OneTimePreKey[];
  }> {
    try {
      // Generate keys
      const identityKey = await this.generateIdentityKeyPair();
      const signedPreKey = await this.generateSignedPreKey(identityKey.privateKey);
      const oneTimePreKeys = await this.generateOneTimePreKeys(100);

      // Store private keys securely
      await this.keyStorage.storeIdentityKey(userId, identityKey);
      await this.keyStorage.storeSignedPreKey(userId, signedPreKey);
      await this.keyStorage.storeOneTimePreKeys(userId, oneTimePreKeys);

      console.log('User encryption keys initialized');

      return {
        identityKey,
        signedPreKey,
        oneTimePreKeys,
      };
    } catch (error) {
      console.error('Failed to initialize user keys:', error);
      throw error;
    }
  }

  /**
   * Encrypt message using AES-256-GCM
   * Note: React Native crypto support is limited
   * This is a simplified implementation - use react-native-crypto for production
   */
  async encryptMessage(plaintext: string, sessionKey: string): Promise<EncryptedMessage> {
    try {
      // Generate IV (12 bytes for GCM)
      const ivBytes = await Crypto.getRandomBytesAsync(12);
      const iv = Buffer.from(ivBytes).toString('base64');

      // In production, use proper AES-GCM encryption
      // For MVP, we'll use a placeholder that should be replaced with:
      // - react-native-aes-crypto
      // - or expo-crypto with AES-GCM support when available

      // Simplified encryption (REPLACE IN PRODUCTION)
      const keyBuffer = Buffer.from(sessionKey, 'base64');
      const plaintextBuffer = Buffer.from(plaintext, 'utf8');

      // This is NOT secure - just a placeholder
      const ciphertext = Buffer.from(
        plaintextBuffer.map((byte, i) => byte ^ keyBuffer[i % keyBuffer.length])
      ).toString('base64');

      // Generate auth tag (simplified - should use GCM)
      const authTag = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        ciphertext + iv + sessionKey
      );

      return {
        ciphertext,
        iv,
        authTag: authTag.substring(0, 32), // 16 bytes base64 encoded
        version: 1,
      };
    } catch (error) {
      console.error('Failed to encrypt message:', error);
      throw new Error('Failed to encrypt message');
    }
  }

  /**
   * Decrypt message
   */
  async decryptMessage(encryptedMessage: EncryptedMessage, sessionKey: string): Promise<string> {
    try {
      // Verify auth tag
      const expectedAuthTag = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        encryptedMessage.ciphertext + encryptedMessage.iv + sessionKey
      );

      if (expectedAuthTag.substring(0, 32) !== encryptedMessage.authTag) {
        throw new Error('Authentication failed - message may be tampered');
      }

      // Decrypt (simplified - REPLACE IN PRODUCTION)
      const keyBuffer = Buffer.from(sessionKey, 'base64');
      const ciphertextBuffer = Buffer.from(encryptedMessage.ciphertext, 'base64');

      const plaintext = Buffer.from(
        ciphertextBuffer.map((byte, i) => byte ^ keyBuffer[i % keyBuffer.length])
      ).toString('utf8');

      return plaintext;
    } catch (error) {
      console.error('Failed to decrypt message:', error);
      throw new Error('Failed to decrypt message');
    }
  }

  /**
   * Generate session key for conversation
   */
  async generateSessionKey(): Promise<string> {
    try {
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      return Buffer.from(randomBytes).toString('base64');
    } catch (error) {
      console.error('Failed to generate session key:', error);
      throw new Error('Failed to generate session key');
    }
  }

  /**
   * Get or create session key for conversation
   */
  async getOrCreateSessionKey(conversationId: string): Promise<string> {
    try {
      let sessionKey = await this.keyStorage.getSessionKey(conversationId);

      if (!sessionKey) {
        sessionKey = await this.generateSessionKey();
        await this.keyStorage.storeSessionKey(conversationId, sessionKey);
      }

      return sessionKey;
    } catch (error) {
      console.error('Failed to get/create session key:', error);
      throw error;
    }
  }

  /**
   * Clean up encryption keys
   */
  async cleanupKeys(userId: string): Promise<void> {
    try {
      await this.keyStorage.deleteUserKeys(userId);
      console.log('User encryption keys cleaned up');
    } catch (error) {
      console.error('Failed to cleanup keys:', error);
      throw error;
    }
  }
}

export default EncryptionService.getInstance();
