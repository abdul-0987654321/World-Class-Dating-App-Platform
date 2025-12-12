/**
 * Secure HTTP Client for Flamoral Mobile App (SSL Pinning Enabled)
 * Drop-in replacement for httpClient.ts with SSL certificate pinning
 *
 * MIGRATION: Replace imports from './httpClient' with './httpClient.secure' to enable SSL pinning
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from './config';
import SecureHttpClient, { SecureApiResponse } from '../network/SecureHttpClient';

// Re-export types for compatibility
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    isPinningError?: boolean;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface RequestOptions {
  timeout?: number;
  retries?: number;
  skipAuth?: boolean;
  skipPinning?: boolean;
  headers?: Record<string, string>;
}

class HttpClientWithPinning {
  private baseUrl: string;
  private secureClient: SecureHttpClient;

  constructor(baseUrl: string = API_CONFIG.BASE_URL) {
    this.baseUrl = baseUrl;
    this.secureClient = new SecureHttpClient(baseUrl);
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      return token;
    } catch {
      return null;
    }
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.secureClient.get<T>(endpoint, options);
  }

  async post<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.secureClient.post<T>(endpoint, body, options);
  }

  async put<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.secureClient.put<T>(endpoint, body, options);
  }

  async patch<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.secureClient.patch<T>(endpoint, body, options);
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.secureClient.delete<T>(endpoint, undefined, options);
  }

  async uploadFile<T>(
    endpoint: string,
    file: { uri: string; type: string; name: string },
    additionalData?: Record<string, any>,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const timeout = options?.timeout || API_CONFIG.TIMEOUTS.UPLOAD;

    try {
      const token = await this.getAuthToken();
      const formData = new FormData();

      formData.append('file', {
        uri: file.uri,
        type: file.type,
        name: file.name,
      } as any);

      if (additionalData) {
        Object.entries(additionalData).forEach(([key, value]) => {
          formData.append(key, typeof value === 'string' ? value : JSON.stringify(value));
        });
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'multipart/form-data',
          ...options?.headers,
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: data.error?.code || `HTTP_${response.status}`,
            message: data.error?.message || response.statusText,
          },
        };
      }

      return {
        success: true,
        data: data.data || data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: error.message || 'File upload failed',
        },
      };
    }
  }
}

export const httpClient = new HttpClientWithPinning();
export default HttpClientWithPinning;
