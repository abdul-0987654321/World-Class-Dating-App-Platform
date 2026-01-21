/**
 * HTTP Client for Flamoral Mobile App
 * Provides standardized HTTP methods with error handling, retries, and auth
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, getAuthHeaders } from './config';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

/**
 * React Native FormData requires this blob-like object format
 * for file uploads, which differs from the standard Web Blob type
 */
interface ReactNativeFileBlob {
  uri: string;
  type: string;
  name: string;
}

export interface RequestOptions {
  timeout?: number;
  retries?: number;
  skipAuth?: boolean;
  headers?: Record<string, string>;
}

class HttpClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_CONFIG.BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      return token;
    } catch {
      return null;
    }
  }

  private async buildHeaders(options: RequestOptions = {}): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (!options.skipAuth) {
      const token = await this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: any,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const timeout = options.timeout || API_CONFIG.TIMEOUTS.DEFAULT;
    const maxRetries = options.retries ?? API_CONFIG.RETRY.MAX_RETRIES;

    let lastError: Error | null = null;
    let retryCount = 0;

    while (retryCount <= maxRetries) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const headers = await this.buildHeaders(options);
        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
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
              details: data.error?.details,
            },
          };
        }

        return {
          success: true,
          data: data.data || data,
          meta: data.meta,
        };
      } catch (error: any) {
        lastError = error;

        // Don't retry on abort or certain errors
        if (error.name === 'AbortError' || retryCount >= maxRetries) {
          break;
        }

        // Exponential backoff
        const delay =
          API_CONFIG.RETRY.RETRY_DELAY * Math.pow(API_CONFIG.RETRY.BACKOFF_MULTIPLIER, retryCount);
        await new Promise((resolve) => setTimeout(resolve, delay));
        retryCount++;
      }
    }

    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: lastError?.message || 'Network request failed',
      },
    };
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  async post<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, body, options);
  }

  async put<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, body, options);
  }

  async patch<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', endpoint, body, options);
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, undefined, options);
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

      // React Native requires this format for file uploads
      const fileBlob: ReactNativeFileBlob = {
        uri: file.uri,
        type: file.type,
        name: file.name,
      };
      formData.append('file', fileBlob as unknown as Blob);

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
          Authorization: token ? `Bearer ${token}` : '',
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

export const httpClient = new HttpClient();
export default HttpClient;
