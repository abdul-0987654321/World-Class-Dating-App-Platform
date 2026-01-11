import axios from 'axios';
import { getAuthToken } from '../auth';

const API_BASE_URL = process.env.EXPO_PUBLIC_MESSAGING_SERVICE_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3003' : (() => { throw new Error('EXPO_PUBLIC_MESSAGING_SERVICE_URL environment variable is required in production'); })());

export interface KeyBundle {
  identityKey: {
    publicKey: string;
  };
  signedPreKey: {
    keyId: number;
    publicKey: string;
    signature: string;
    timestamp: number;
  };
  oneTimePreKeys: Array<{
    keyId: number;
    publicKey: string;
  }>;
}

export interface UserPublicKeys {
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

/**
 * API client for encryption keys management
 */
export class EncryptionKeysAPI {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Get axios instance with auth headers
   */
  private async getAxiosInstance() {
    const token = await getAuthToken();
    return axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  }

  /**
   * Upload encryption keys to server
   */
  async uploadKeys(keyBundle: KeyBundle): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const api = await this.getAxiosInstance();
      const response = await api.post('/api/keys/upload', keyBundle);
      return response.data;
    } catch (error: any) {
      console.error('Failed to upload keys:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  /**
   * Get user's public keys for initiating encrypted conversation
   */
  async getUserKeys(userId: string): Promise<{
    success: boolean;
    data?: UserPublicKeys;
    error?: string;
  }> {
    try {
      const api = await this.getAxiosInstance();
      const response = await api.get(`/api/keys/${userId}`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to get user keys:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  /**
   * Claim one-time pre-keys for establishing session
   */
  async claimPreKeys(
    userId: string,
    count: number = 1
  ): Promise<{
    success: boolean;
    data?: {
      oneTimePreKeys: Array<{ keyId: number; publicKey: string }>;
      remaining: number;
    };
    error?: string;
  }> {
    try {
      const api = await this.getAxiosInstance();
      const response = await api.post('/api/keys/claim', { userId, count });
      return response.data;
    } catch (error: any) {
      console.error('Failed to claim pre-keys:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  /**
   * Generate new keys (server-side generation)
   */
  async generateKeys(): Promise<{
    success: boolean;
    data?: {
      identityKey: { publicKey: string; privateKey: string };
      signedPreKey: any;
      oneTimePreKeys: any[];
    };
    error?: string;
  }> {
    try {
      const api = await this.getAxiosInstance();
      const response = await api.post('/api/keys/generate');
      return response.data;
    } catch (error: any) {
      console.error('Failed to generate keys:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  /**
   * Create session key for conversation
   */
  async createSessionKey(
    conversationId: string,
    rootKey: string,
    chainKey: string
  ): Promise<{
    success: boolean;
    data?: { sessionId: string };
    error?: string;
  }> {
    try {
      const api = await this.getAxiosInstance();
      const response = await api.post('/api/keys/session', {
        conversationId,
        rootKey,
        chainKey,
      });
      return response.data;
    } catch (error: any) {
      console.error('Failed to create session key:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  /**
   * Get session key for conversation
   */
  async getSessionKey(conversationId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const api = await this.getAxiosInstance();
      const response = await api.get(`/api/keys/session/${conversationId}`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to get session key:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  /**
   * Update session key after ratchet
   */
  async updateSessionKey(
    conversationId: string,
    chainKey: string,
    messageNumber: number
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const api = await this.getAxiosInstance();
      const response = await api.put(`/api/keys/session/${conversationId}`, {
        chainKey,
        messageNumber,
      });
      return response.data;
    } catch (error: any) {
      console.error('Failed to update session key:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  /**
   * Delete session key
   */
  async deleteSessionKey(conversationId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const api = await this.getAxiosInstance();
      const response = await api.delete(`/api/keys/session/${conversationId}`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to delete session key:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }
}

// Export singleton instance
export const encryptionKeysAPI = new EncryptionKeysAPI();
export default encryptionKeysAPI;
