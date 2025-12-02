import { useState, useCallback } from 'react';
import { useEncryption } from './useEncryption';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  encryption?: {
    isEncrypted: boolean;
    iv?: string;
    authTag?: string;
    version?: number;
  };
  sentAt: Date;
  status: 'sent' | 'delivered' | 'read' | 'failed';
}

/**
 * Hook for encrypting and decrypting messages in conversations
 */
export const useMessageEncryption = () => {
  const { status, encryptMessage, decryptMessage } = useEncryption();
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Prepare message for sending (encrypt)
   */
  const prepareMessageForSending = useCallback(
    async (
      plaintext: string,
      conversationId: string
    ): Promise<{
      content: string;
      encryption: {
        isEncrypted: boolean;
        iv?: string;
        authTag?: string;
        version?: number;
      };
    }> => {
      setIsProcessing(true);
      try {
        if (!status.isInitialized) {
          console.warn('Encryption not initialized, sending unencrypted message');
          return {
            content: plaintext,
            encryption: {
              isEncrypted: false,
            },
          };
        }

        const encrypted = await encryptMessage(plaintext, conversationId);

        if (!encrypted) {
          console.error('Encryption failed, falling back to unencrypted');
          return {
            content: plaintext,
            encryption: {
              isEncrypted: false,
            },
          };
        }

        return {
          content: encrypted.ciphertext,
          encryption: {
            isEncrypted: true,
            iv: encrypted.iv,
            authTag: encrypted.authTag,
            version: encrypted.version,
          },
        };
      } finally {
        setIsProcessing(false);
      }
    },
    [status.isInitialized, encryptMessage]
  );

  /**
   * Decrypt received message
   */
  const decryptReceivedMessage = useCallback(
    async (message: Message): Promise<string> => {
      if (!message.encryption?.isEncrypted) {
        return message.content;
      }

      setIsProcessing(true);
      try {
        if (!status.isInitialized) {
          console.warn('Encryption not initialized, cannot decrypt message');
          return '[Encrypted message - encryption not initialized]';
        }

        if (!message.encryption.iv || !message.encryption.authTag) {
          console.error('Invalid encryption metadata');
          return '[Encrypted message - invalid metadata]';
        }

        const plaintext = await decryptMessage(
          {
            ciphertext: message.content,
            iv: message.encryption.iv,
            authTag: message.encryption.authTag,
            version: message.encryption.version || 1,
          },
          message.conversationId
        );

        if (!plaintext) {
          console.error('Decryption failed');
          return '[Encrypted message - decryption failed]';
        }

        return plaintext;
      } catch (error) {
        console.error('Failed to decrypt message:', error);
        return '[Encrypted message - decryption error]';
      } finally {
        setIsProcessing(false);
      }
    },
    [status.isInitialized, decryptMessage]
  );

  /**
   * Decrypt multiple messages (for conversation history)
   */
  const decryptMessages = useCallback(
    async (messages: Message[]): Promise<Map<string, string>> => {
      const decryptedMap = new Map<string, string>();

      setIsProcessing(true);
      try {
        await Promise.all(
          messages.map(async (message) => {
            const plaintext = await decryptReceivedMessage(message);
            decryptedMap.set(message.id, plaintext);
          })
        );
      } finally {
        setIsProcessing(false);
      }

      return decryptedMap;
    },
    [decryptReceivedMessage]
  );

  /**
   * Check if message is encrypted
   */
  const isMessageEncrypted = useCallback((message: Message): boolean => {
    return message.encryption?.isEncrypted === true;
  }, []);

  return {
    isProcessing,
    encryptionStatus: status,
    prepareMessageForSending,
    decryptReceivedMessage,
    decryptMessages,
    isMessageEncrypted,
  };
};

export default useMessageEncryption;
