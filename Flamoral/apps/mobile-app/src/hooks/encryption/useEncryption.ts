import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../useAuth';
import EncryptionService from '../../services/encryption/EncryptionService';
import SecureKeyStorage from '../../services/encryption/SecureKeyStorage';
import { messagingAPI } from '../../services/api/messaging';

export interface EncryptionStatus {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for managing end-to-end encryption
 */
export const useEncryption = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<EncryptionStatus>({
    isInitialized: false,
    isLoading: true,
    error: null,
  });

  /**
   * Initialize encryption keys for user
   */
  const initializeEncryption = useCallback(async () => {
    if (!user?.id) {
      setStatus({
        isInitialized: false,
        isLoading: false,
        error: 'User not authenticated',
      });
      return;
    }

    try {
      setStatus(prev => ({ ...prev, isLoading: true, error: null }));

      // Check if keys already exist
      const hasKeys = await SecureKeyStorage.hasKeys(user.id);

      if (hasKeys) {
        console.log('Encryption keys already initialized');
        setStatus({
          isInitialized: true,
          isLoading: false,
          error: null,
        });
        return;
      }

      // Generate new keys
      console.log('Initializing encryption keys...');
      const keys = await EncryptionService.initializeUserKeys(user.id);

      // Upload public keys to server
      await messagingAPI.uploadEncryptionKeys({
        identityKey: {
          publicKey: keys.identityKey.publicKey,
        },
        signedPreKey: {
          keyId: keys.signedPreKey.keyId,
          publicKey: keys.signedPreKey.publicKey,
          signature: keys.signedPreKey.signature,
          timestamp: keys.signedPreKey.timestamp,
        },
        oneTimePreKeys: keys.oneTimePreKeys.map(key => ({
          keyId: key.keyId,
          publicKey: key.publicKey,
        })),
      });

      console.log('Encryption keys uploaded to server');

      setStatus({
        isInitialized: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      console.error('Failed to initialize encryption:', error);
      setStatus({
        isInitialized: false,
        isLoading: false,
        error: error.message || 'Failed to initialize encryption',
      });
    }
  }, [user?.id]);

  /**
   * Encrypt a message
   */
  const encryptMessage = useCallback(
    async (plaintext: string, conversationId: string): Promise<{
      ciphertext: string;
      iv: string;
      authTag: string;
      version: number;
    } | null> => {
      try {
        const sessionKey = await EncryptionService.getOrCreateSessionKey(conversationId);
        const encrypted = await EncryptionService.encryptMessage(plaintext, sessionKey);
        return encrypted;
      } catch (error) {
        console.error('Failed to encrypt message:', error);
        return null;
      }
    },
    []
  );

  /**
   * Decrypt a message
   */
  const decryptMessage = useCallback(
    async (
      encryptedMessage: {
        ciphertext: string;
        iv: string;
        authTag: string;
        version: number;
      },
      conversationId: string
    ): Promise<string | null> => {
      try {
        const sessionKey = await EncryptionService.getOrCreateSessionKey(conversationId);
        const plaintext = await EncryptionService.decryptMessage(
          encryptedMessage,
          sessionKey
        );
        return plaintext;
      } catch (error) {
        console.error('Failed to decrypt message:', error);
        return null;
      }
    },
    []
  );

  /**
   * Clean up encryption keys (on logout)
   */
  const cleanupEncryption = useCallback(async () => {
    if (!user?.id) return;

    try {
      await EncryptionService.cleanupKeys(user.id);
      setStatus({
        isInitialized: false,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Failed to cleanup encryption:', error);
    }
  }, [user?.id]);

  /**
   * Check and initialize encryption on mount
   */
  useEffect(() => {
    if (user?.id) {
      initializeEncryption();
    }
  }, [user?.id, initializeEncryption]);

  return {
    status,
    initializeEncryption,
    encryptMessage,
    decryptMessage,
    cleanupEncryption,
  };
};

export default useEncryption;
