/**
 * Messaging API Module
 * Re-exports messaging functionality from MessagingService
 */

import MessagingService from './MessagingService';

// Export the messaging API interface
export const messagingAPI = {
  /**
   * Upload encryption keys to server
   */
  uploadEncryptionKeys: async (keyBundle: {
    identityKey: { publicKey: string };
    signedPreKey: {
      keyId: number;
      publicKey: string;
      signature: string;
      timestamp: number;
    };
    oneTimePreKeys: Array<{ keyId: number; publicKey: string }>;
  }) => {
    // Use the encryption keys API endpoint
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_MESSAGING_SERVICE_URL || 'http://localhost:3003'}/api/keys/upload`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(keyBundle),
      }
    );
    return response.json();
  },

  // Re-export other messaging functions
  ...MessagingService,
};

export default messagingAPI;
