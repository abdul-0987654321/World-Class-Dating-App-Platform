/**
 * API Client for Flamoral Mobile App
 * Centralized HTTP client with authentication, error handling, and interceptors
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import { ENV } from '@config/env';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  User,
  ApiError,
} from '../types';

export interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
  getToken: () => string | null | Promise<string | null>;
  onUnauthorized?: () => void;
  onRefreshToken?: () => Promise<string | null>;
}

export class ApiClient {
  private axiosInstance: AxiosInstance;
  private getToken: () => string | null | Promise<string | null>;
  private onUnauthorized?: () => void;
  private onRefreshToken?: () => Promise<string | null>;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor(config: ApiClientConfig) {
    this.getToken = config.getToken;
    this.onUnauthorized = config.onUnauthorized;
    this.onRefreshToken = config.onRefreshToken;

    this.axiosInstance = axios.create({
      baseURL: config.baseURL || ENV.API_BASE_URL,
      timeout: config.timeout || ENV.API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupRequestInterceptor();
    this.setupResponseInterceptor();
  }

  private setupRequestInterceptor(): void {
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        try {
          const token = await this.getToken();
          if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.error('Error getting token:', error);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }

  private setupResponseInterceptor(): void {
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Handle 401 Unauthorized errors
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.onRefreshToken) {
            if (this.isRefreshing) {
              // Wait for the token refresh to complete
              return new Promise((resolve) => {
                this.refreshSubscribers.push((token: string) => {
                  if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                  }
                  resolve(this.axiosInstance(originalRequest));
                });
              });
            }

            originalRequest._retry = true;
            this.isRefreshing = true;

            try {
              const newToken = await this.onRefreshToken();
              this.isRefreshing = false;

              if (newToken) {
                // Notify all pending requests with new token
                this.refreshSubscribers.forEach((callback) => callback(newToken));
                this.refreshSubscribers = [];

                // Retry the original request
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${newToken}`;
                }
                return this.axiosInstance(originalRequest);
              }
            } catch (refreshError) {
              this.isRefreshing = false;
              this.refreshSubscribers = [];

              // Call unauthorized callback if refresh failed
              if (this.onUnauthorized) {
                this.onUnauthorized();
              }
              return Promise.reject(refreshError);
            }
          } else {
            // No refresh token handler, call unauthorized callback
            if (this.onUnauthorized) {
              this.onUnauthorized();
            }
          }
        }

        return Promise.reject(this.normalizeError(error));
      }
    );
  }

  private normalizeError(error: AxiosError<ApiError>): ApiError {
    if (error.response) {
      // Server responded with error status
      return {
        statusCode: error.response.status,
        message: error.response.data?.message || error.message || 'An error occurred',
        error: error.response.data?.error,
        details: error.response.data?.details,
      };
    } else if (error.request) {
      // Request made but no response
      return {
        statusCode: 0,
        message: 'Network error. Please check your internet connection.',
        error: 'NETWORK_ERROR',
      };
    } else {
      // Something else happened
      return {
        statusCode: 0,
        message: error.message || 'An unexpected error occurred',
        error: 'UNKNOWN_ERROR',
      };
    }
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.delete<T>(url, config);
    return response.data;
  }

  /**
   * Upload file with progress tracking
   */
  async upload<T>(
    url: string,
    formData: FormData,
    onProgress?: (progress: number) => void
  ): Promise<T> {
    const response = await this.axiosInstance.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: ENV.UPLOAD_TIMEOUT,
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
    return response.data;
  }

  /**
   * Get the underlying axios instance for advanced usage
   */
  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }
}

/**
 * Authentication API endpoints
 */
export class AuthApi {
  constructor(private client: ApiClient) {}

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return this.client.post<LoginResponse>('/auth/login', credentials);
  }

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    return this.client.post<RegisterResponse>('/auth/register', data);
  }

  async refreshToken(data: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    return this.client.post<RefreshTokenResponse>('/auth/refresh', data);
  }

  async logout(): Promise<void> {
    return this.client.post<void>('/auth/logout');
  }

  async getCurrentUser(): Promise<User> {
    return this.client.get<User>('/auth/me');
  }

  async forgotPassword(email: string): Promise<void> {
    return this.client.post<void>('/auth/forgot-password', { email });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    return this.client.post<void>('/auth/reset-password', { token, newPassword });
  }

  async verifyEmail(token: string): Promise<void> {
    return this.client.post<void>('/auth/verify-email', { token });
  }

  async resendVerificationEmail(): Promise<void> {
    return this.client.post<void>('/auth/resend-verification');
  }
}

/**
 * Factory function to create API client
 */
export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}

/**
 * Factory function to create Auth API
 */
export function createAuthApi(client: ApiClient): AuthApi {
  return new AuthApi(client);
}
