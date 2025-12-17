/**
 * API Client
 * Axios-based HTTP client with interceptors, retry logic, and CSRF protection
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';

export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  getToken?: () => string | null;
  refreshToken?: () => Promise<string | null>;
  onTokenExpired?: () => void;
  onError?: (error: ApiError) => void;
}

export interface ApiError {
  message: string;
  code: string;
  status: number;
  details?: Record<string, any>;
  isRetryable?: boolean;
}

export class ApiClient {
  private client: AxiosInstance;
  private config: ApiClientConfig;
  private csrfToken: string | null = null;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor(config: ApiClientConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Important for CSRF cookies
    });

    this.setupInterceptors();
    this.initCsrfToken();
  }

  /**
   * Fetch CSRF token on initialization
   */
  private async initCsrfToken(): Promise<void> {
    try {
      const response = await this.client.get<{ csrfToken: string }>('/auth/csrf-token');
      this.csrfToken = response.data.csrfToken;
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
    }
  }

  /**
   * Get the current CSRF token
   */
  public getCsrfToken(): string | null {
    return this.csrfToken;
  }

  /**
   * Refresh the CSRF token
   */
  public async refreshCsrfToken(): Promise<void> {
    await this.initCsrfToken();
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor - add auth token and CSRF token
    this.client.interceptors.request.use(
      (config) => {
        // Add JWT token
        const token = this.config.getToken?.();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add CSRF token for mutation requests (POST, PUT, PATCH, DELETE)
        if (
          this.csrfToken &&
          config.method &&
          ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())
        ) {
          config.headers['X-CSRF-Token'] = this.csrfToken;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors and token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<{ message?: string; code?: string; details?: any }>) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Handle 401 - Token expired, try to refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          if (this.config.refreshToken) {
            try {
              const newToken = await this.onTokenRefresh();
              if (newToken && originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return this.client(originalRequest);
              }
            } catch (refreshError) {
              this.config.onTokenExpired?.();
              return Promise.reject(this.createApiError(error));
            }
          } else {
            this.config.onTokenExpired?.();
          }
        }

        // Handle 403 - CSRF token might be invalid
        if (error.response?.status === 403 && error.response?.data?.code === 'CSRF_TOKEN_INVALID') {
          await this.refreshCsrfToken();
          if (originalRequest && !originalRequest._retry) {
            originalRequest._retry = true;
            return this.client(originalRequest);
          }
        }

        const apiError = this.createApiError(error);

        // Call global error handler
        this.config.onError?.(apiError);

        return Promise.reject(apiError);
      }
    );

    // Setup retry logic for transient failures
    this.setupRetryLogic();
  }

  /**
   * Setup axios retry logic for 503 and network errors
   */
  private setupRetryLogic(): void {
    const retries = this.config.retries ?? 3;
    const retryDelay = this.config.retryDelay ?? 1000;

    this.client.interceptors.response.use(undefined, async (error) => {
      const config = error.config as AxiosRequestConfig & { __retryCount?: number };

      // Don't retry if already exceeded max retries
      if (!config || (config.__retryCount ?? 0) >= retries) {
        return Promise.reject(error);
      }

      // Determine if error is retryable
      const isRetryable = this.isRetryableError(error);
      if (!isRetryable) {
        return Promise.reject(error);
      }

      // Increment retry count
      config.__retryCount = (config.__retryCount ?? 0) + 1;

      // Exponential backoff delay
      const delay = retryDelay * Math.pow(2, config.__retryCount - 1);
      await this.delay(delay);

      // Retry the request
      return this.client(config);
    });
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: AxiosError): boolean {
    if (!error.response) {
      // Network errors are retryable
      return true;
    }

    const status = error.response.status;
    const retryableStatuses = [408, 429, 500, 502, 503, 504];

    return retryableStatuses.includes(status);
  }

  /**
   * Create standardized API error
   */
  private createApiError(error: AxiosError<{ message?: string; code?: string; details?: any }>): ApiError {
    const status = error.response?.status || 500;
    const isRetryable = this.isRetryableError(error);

    return {
      message: error.response?.data?.message || error.message || 'An error occurred',
      code: error.response?.data?.code || 'UNKNOWN_ERROR',
      status,
      details: error.response?.data?.details,
      isRetryable,
    };
  }

  /**
   * Handle token refresh with queue to prevent multiple simultaneous refresh calls
   */
  private async onTokenRefresh(): Promise<string | null> {
    if (!this.config.refreshToken) {
      return null;
    }

    if (this.isRefreshing) {
      return new Promise((resolve) => {
        this.refreshSubscribers.push((token: string) => {
          resolve(token);
        });
      });
    }

    this.isRefreshing = true;

    try {
      const newToken = await this.config.refreshToken();
      this.isRefreshing = false;

      if (newToken) {
        this.refreshSubscribers.forEach((callback) => callback(newToken));
        this.refreshSubscribers = [];
      }

      return newToken;
    } catch (error) {
      this.isRefreshing = false;
      this.refreshSubscribers = [];
      throw error;
    }
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  // File upload with progress
  async upload<T>(
    url: string,
    file: File | Blob,
    onProgress?: (progress: number) => void,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post<T>(url, formData, {
      ...config,
      headers: {
        ...config?.headers,
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress?.(progress);
        }
      },
    });

    return response.data;
  }
}

// Singleton instance
let apiClient: ApiClient | null = null;

export function initApiClient(config: ApiClientConfig): ApiClient {
  apiClient = new ApiClient(config);
  return apiClient;
}

export function getApiClient(): ApiClient {
  if (!apiClient) {
    throw new Error('API client not initialized. Call initApiClient first.');
  }
  return apiClient;
}
