/**
 * Secure HTTP Client with SSL Certificate Pinning
 * Provides SSL/TLS certificate pinning for all network requests
 */

import { Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SSL_PIN_CONFIG,
  SSL_PINNING_OPTIONS,
  getPinConfigForHostname,
  isPinningExempt,
} from '../../config/sslPinning.config';

// Type definitions for SSL pinning
interface SSLPinningRequest {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  timeoutInterval?: number;
  sslPinning?: {
    certs: string[];
  };
  pkPinning?: {
    hashes: string[];
  };
}

interface SSLPinningResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
  bodyString: string;
}

// Native module interface (if using react-native-ssl-pinning)
interface SSLPinningModule {
  fetch(url: string, options: SSLPinningRequest): Promise<SSLPinningResponse>;
}

export interface SecureApiResponse<T> {
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

export interface SecureRequestOptions {
  timeout?: number;
  retries?: number;
  skipAuth?: boolean;
  skipPinning?: boolean;
  headers?: Record<string, string>;
}

/**
 * SSL Pinning Error Types
 */
export enum SSLPinningErrorType {
  CERTIFICATE_MISMATCH = 'CERTIFICATE_MISMATCH',
  INVALID_CERTIFICATE = 'INVALID_CERTIFICATE',
  EXPIRED_CERTIFICATE = 'EXPIRED_CERTIFICATE',
  UNTRUSTED_CERTIFICATE = 'UNTRUSTED_CERTIFICATE',
  HOSTNAME_MISMATCH = 'HOSTNAME_MISMATCH',
  NO_PINS_CONFIGURED = 'NO_PINS_CONFIGURED',
  NETWORK_ERROR = 'NETWORK_ERROR',
}

class SecureHttpClient {
  private baseUrl: string;
  private sslPinningModule: SSLPinningModule | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;

    // Initialize SSL pinning native module if available
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      try {
        // Attempt to load react-native-ssl-pinning or similar native module
        this.sslPinningModule = NativeModules.RNSslPinning as SSLPinningModule;
      } catch (error) {
        console.warn('SSL Pinning native module not available, falling back to standard fetch');
      }
    }
  }

  /**
   * Get authentication token
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      return token;
    } catch {
      return null;
    }
  }

  /**
   * Build request headers
   */
  private async buildHeaders(options: SecureRequestOptions = {}): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
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

  /**
   * Extract hostname from URL
   */
  private extractHostname(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return '';
    }
  }

  /**
   * Check if pinning is required for the URL
   */
  private shouldApplyPinning(url: string, options: SecureRequestOptions): boolean {
    if (!SSL_PINNING_OPTIONS.enabled || options.skipPinning) {
      return false;
    }

    const hostname = this.extractHostname(url);

    // Skip pinning for exempt domains
    if (isPinningExempt(hostname)) {
      return false;
    }

    // Check if we have pin configuration for this hostname
    const pinConfig = getPinConfigForHostname(hostname);
    return pinConfig !== undefined && pinConfig.pins.length > 0;
  }

  /**
   * Make a secure request with SSL pinning
   */
  private async secureRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    body?: any,
    options: SecureRequestOptions = {}
  ): Promise<SecureApiResponse<T>> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const hostname = this.extractHostname(url);
    const timeout = options.timeout || 30000;
    const maxRetries = options.retries ?? 3;

    let lastError: any = null;
    let retryCount = 0;

    while (retryCount <= maxRetries) {
      try {
        const headers = await this.buildHeaders(options);

        // Check if we should apply SSL pinning
        const applyPinning = this.shouldApplyPinning(url, options);

        if (applyPinning && this.sslPinningModule) {
          // Use native SSL pinning module
          const pinConfig = getPinConfigForHostname(hostname);
          if (!pinConfig || pinConfig.pins.length === 0) {
            throw new Error(SSLPinningErrorType.NO_PINS_CONFIGURED);
          }

          const requestOptions: SSLPinningRequest = {
            url,
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            timeoutInterval: timeout / 1000, // Convert to seconds
            pkPinning: {
              hashes: pinConfig.pins.map(pin => pin.replace('sha256/', '')),
            },
          };

          const response = await this.sslPinningModule.fetch(url, requestOptions);
          const data = JSON.parse(response.bodyString || response.body || '{}');

          if (response.status >= 200 && response.status < 300) {
            return {
              success: true,
              data: data.data || data,
              meta: data.meta,
            };
          } else {
            return {
              success: false,
              error: {
                code: data.error?.code || `HTTP_${response.status}`,
                message: data.error?.message || 'Request failed',
                details: data.error?.details,
              },
            };
          }
        } else {
          // Fallback to standard fetch (with warning if pinning should be applied)
          if (applyPinning && !this.sslPinningModule) {
            console.warn(
              `SSL Pinning is configured for ${hostname} but native module is not available. ` +
              'Install react-native-ssl-pinning or similar library.'
            );
          }

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);

          const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          const data = await response.json();

          if (response.ok) {
            return {
              success: true,
              data: data.data || data,
              meta: data.meta,
            };
          } else {
            return {
              success: false,
              error: {
                code: data.error?.code || `HTTP_${response.status}`,
                message: data.error?.message || response.statusText,
                details: data.error?.details,
              },
            };
          }
        }
      } catch (error: any) {
        lastError = error;

        // Handle SSL pinning errors
        if (this.isSSLPinningError(error)) {
          const pinningError = this.handleSSLPinningError(error, hostname);

          // Don't retry on pinning errors in strict mode
          if (SSL_PINNING_OPTIONS.validationMode === 'strict') {
            return {
              success: false,
              error: pinningError,
            };
          }
        }

        // Don't retry on abort or if max retries reached
        if (error.name === 'AbortError' || retryCount >= maxRetries) {
          break;
        }

        // Exponential backoff
        const delay = 1000 * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        retryCount++;
      }
    }

    return {
      success: false,
      error: {
        code: this.isSSLPinningError(lastError)
          ? SSLPinningErrorType.CERTIFICATE_MISMATCH
          : 'NETWORK_ERROR',
        message: lastError?.message || 'Network request failed',
        isPinningError: this.isSSLPinningError(lastError),
      },
    };
  }

  /**
   * Check if error is SSL pinning related
   */
  private isSSLPinningError(error: any): boolean {
    if (!error) return false;

    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code?.toLowerCase() || '';

    return (
      errorMessage.includes('certificate') ||
      errorMessage.includes('ssl') ||
      errorMessage.includes('tls') ||
      errorMessage.includes('pin') ||
      errorMessage.includes('trust') ||
      errorCode.includes('cert') ||
      errorCode.includes('ssl') ||
      Object.values(SSLPinningErrorType).includes(error.message)
    );
  }

  /**
   * Handle SSL pinning errors
   */
  private handleSSLPinningError(error: any, hostname: string) {
    const errorMessage = error.message?.toLowerCase() || '';

    let errorType = SSLPinningErrorType.CERTIFICATE_MISMATCH;
    let userMessage = 'SSL certificate validation failed. Please ensure you are connected to a secure network.';

    if (errorMessage.includes('expired')) {
      errorType = SSLPinningErrorType.EXPIRED_CERTIFICATE;
      userMessage = 'Server certificate has expired. Please update the app.';
    } else if (errorMessage.includes('hostname')) {
      errorType = SSLPinningErrorType.HOSTNAME_MISMATCH;
      userMessage = 'Server hostname does not match certificate. This may indicate a security issue.';
    } else if (errorMessage.includes('untrusted') || errorMessage.includes('trust')) {
      errorType = SSLPinningErrorType.UNTRUSTED_CERTIFICATE;
      userMessage = 'Server certificate is not trusted. This may indicate a man-in-the-middle attack.';
    }

    // Log security event
    console.error(`[SECURITY] SSL Pinning Error for ${hostname}:`, {
      type: errorType,
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    // In production, you should also report this to your security monitoring service
    this.reportSecurityEvent(errorType, hostname, error);

    return {
      code: errorType,
      message: userMessage,
      details: __DEV__ ? error.message : undefined,
      isPinningError: true,
    };
  }

  /**
   * Report security event to monitoring service
   */
  private async reportSecurityEvent(type: SSLPinningErrorType, hostname: string, error: any) {
    // TODO: Implement security event reporting to your backend
    // This should NOT use the pinned connection to avoid infinite loops
    if (!__DEV__) {
      try {
        // Example: Send to separate security monitoring endpoint
        // await fetch('https://security-monitoring.flamoral.com/events', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({
        //     type,
        //     hostname,
        //     error: error.message,
        //     timestamp: new Date().toISOString(),
        //     platform: Platform.OS,
        //   }),
        // });
      } catch (reportError) {
        console.error('Failed to report security event:', reportError);
      }
    }
  }

  // Public API methods
  async get<T>(endpoint: string, options?: SecureRequestOptions): Promise<SecureApiResponse<T>> {
    return this.secureRequest<T>('GET', endpoint, undefined, options);
  }

  async post<T>(endpoint: string, body?: any, options?: SecureRequestOptions): Promise<SecureApiResponse<T>> {
    return this.secureRequest<T>('POST', endpoint, body, options);
  }

  async put<T>(endpoint: string, body?: any, options?: SecureRequestOptions): Promise<SecureApiResponse<T>> {
    return this.secureRequest<T>('PUT', endpoint, body, options);
  }

  async patch<T>(endpoint: string, body?: any, options?: SecureRequestOptions): Promise<SecureApiResponse<T>> {
    return this.secureRequest<T>('PATCH', endpoint, body, options);
  }

  async delete<T>(endpoint: string, options?: SecureRequestOptions): Promise<SecureApiResponse<T>> {
    return this.secureRequest<T>('DELETE', endpoint, undefined, options);
  }
}

export default SecureHttpClient;
