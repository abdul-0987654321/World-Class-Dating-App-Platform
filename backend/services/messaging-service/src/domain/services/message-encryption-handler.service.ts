import { createLogger } from '@flamoral/shared';
import { Message } from '../../types';
import { domainEncryptionService } from './encryption.service';

const logger = createLogger('message-encryption-handler');

/**
 * Service for handling message encryption/decryption in the messaging flow
 */
export class MessageEncryptionHandler {
  /**
   * Process incoming encrypted message
   * Validates encryption metadata and prepares for storage
   */
  async processIncomingMessage(messageData: {
    content: string;
    encryption?: {
      isEncrypted: boolean;
      iv?: string;
      authTag?: string;
      version?: number;
    };
  }): Promise<{
    content: string;
    encryption?: {
      isEncrypted: boolean;
      iv?: string;
      authTag?: string;
      version?: number;
    };
  }> {
    try {
      // If message is not encrypted, return as-is
      if (!messageData.encryption?.isEncrypted) {
        return {
          content: messageData.content,
          encryption: {
            isEncrypted: false,
          },
        };
      }

      // Validate encryption metadata
      if (!messageData.encryption.iv || !messageData.encryption.authTag) {
        throw new Error('Encrypted message missing iv or authTag');
      }

      if (!domainEncryptionService.validateEncryptionMetadata({
        iv: messageData.encryption.iv,
        authTag: messageData.encryption.authTag,
      })) {
        throw new Error('Invalid encryption metadata');
      }

      // Store encrypted message with metadata
      return {
        content: messageData.content, // Store encrypted content
        encryption: {
          isEncrypted: true,
          iv: messageData.encryption.iv,
          authTag: messageData.encryption.authTag,
          version: messageData.encryption.version || 1,
        },
      };
    } catch (error: any) {
      logger.error('Failed to process incoming message:', error);
      throw new Error(`Message encryption processing failed: ${error.message}`);
    }
  }

  /**
   * Process outgoing message for client
   * Returns encrypted message with metadata
   */
  async processOutgoingMessage(message: Message): Promise<Message> {
    try {
      // Message is already encrypted and stored with encryption metadata
      // Return as-is for client to decrypt
      return message;
    } catch (error: any) {
      logger.error('Failed to process outgoing message:', error);
      throw error;
    }
  }

  /**
   * Encrypt message content for client-side encryption
   * This is used when server needs to encrypt on behalf of client (legacy mode)
   */
  async encryptMessageContent(
    plaintext: string,
    sessionKey: Buffer
  ): Promise<{
    ciphertext: string;
    iv: string;
    authTag: string;
  }> {
    try {
      return await domainEncryptionService.encryptMessage(plaintext, sessionKey);
    } catch (error: any) {
      logger.error('Failed to encrypt message content:', error);
      throw error;
    }
  }

  /**
   * Decrypt message content
   * This is used when server needs to decrypt (e.g., for moderation)
   */
  async decryptMessageContent(
    ciphertext: string,
    sessionKey: Buffer,
    iv: string,
    authTag: string
  ): Promise<string> {
    try {
      return await domainEncryptionService.decryptMessage(
        ciphertext,
        sessionKey,
        iv,
        authTag
      );
    } catch (error: any) {
      logger.error('Failed to decrypt message content:', error);
      throw error;
    }
  }

  /**
   * Check if message is encrypted
   */
  isMessageEncrypted(message: Message): boolean {
    return message.encryption?.isEncrypted === true;
  }

  /**
   * Get encryption status for conversation
   */
  getEncryptionStatus(messages: Message[]): {
    allEncrypted: boolean;
    encryptedCount: number;
    totalCount: number;
  } {
    const encryptedCount = messages.filter(m => this.isMessageEncrypted(m)).length;
    const totalCount = messages.length;

    return {
      allEncrypted: encryptedCount === totalCount,
      encryptedCount,
      totalCount,
    };
  }

  /**
   * Validate encryption version compatibility
   */
  isEncryptionVersionSupported(version?: number): boolean {
    const SUPPORTED_VERSIONS = [1]; // Add new versions as protocol evolves
    return !version || SUPPORTED_VERSIONS.includes(version);
  }
}

export const messageEncryptionHandler = new MessageEncryptionHandler();
export default messageEncryptionHandler;
