/**
 * API Client with Global Error Handling for React Native
 * Axios wrapper that automatically intercepts responses and routes errors through the global handler
 *
 * IMPORTANT:
 * - Never display raw backend messages to users
 * - All errors are routed through the global error handler
 * - Uses errorCode for logic, never message text
 * - Handles correlation IDs for debugging
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import { handleError, normalizeError, processApiError } from './error-handler';
import { NetworkErrorCode, ServerErrorCode } from './error-codes';
import type {
  ApiClientConfig,
  ApiRequestOptions,
  ApiResponse,
  ApiErrorResponse,
  ProcessedError,
  RateLimitInfo,
} from './types';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly errorCode: string;
  public readonly correlationId?: string;
  public readonly validationErrors?: Record<string, string>;
  public readonly retryAfter?: number;
  public readonly processedError: ProcessedError;

  constructor(processedError: ProcessedError) {
    super(processedError.userMessage);
    this.name = 'ApiError';
    this.status = processedError.status;
    this.errorCode = processedError.errorCode as string;
    this.correlationId = processedError.correlationId;
    this.validationErrors = processedError.validationErrors;
    this.retryAfter = processedError.retryAfter;
    this.processedError = processedError;
  }
}

/**
 * Default API configuration
 */
const DEFAULT_CONFIG: Partial<ApiClientConfig> = {
  timeout: 30000,
};

/**
 * Create an API client with global error handling
 */
export function createApiClient(config: ApiClientConfig) {
  const clientConfig = { ...DEFAULT_CONFIG, ...config };

  const axiosInstance: AxiosInstance = axios.create({
    baseURL: clientConfig.baseUrl,
    timeout: clientConfig.timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor to add auth token
  axiosInstance.interceptors.request.use(
    async (requestConfig) => {
      if (clientConfig.getAuthToken) {
        const token = await clientConfig.getAuthToken();
        if (token && requestConfig.headers) {
          requestConfig.headers.Authorization = `Bearer ${token}`;
        }
      }
      return requestConfig;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor to handle errors
  axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      // Extract correlation ID from response headers
      const correlationId =
        error.response?.headers?.['x-correlation-id'] || error.response?.headers?.['x-request-id'];

      // Extract retry-after for rate limit errors
      const retryAfterHeader = error.response?.headers?.['retry-after'];
      const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;

      if (error.response) {
        // Server responded with error status
        const errorData: ApiErrorResponse = {
          statusCode: error.response.status,
          message: (error.response.data as any)?.message || error.message || 'Request failed',
          errorCode: (error.response.data as any)?.errorCode || (error.response.data as any)?.code,
          error: (error.response.data as any)?.error,
          correlationId,
          details: (error.response.data as any)?.details,
          retryAfter,
        };

        return Promise.reject(errorData);
      } else if (error.code === 'ERR_NETWORK' || !error.response) {
        // Network error
        const networkError: ApiErrorResponse = {
          statusCode: 0,
          message: 'Network error. Please check your connection.',
          errorCode: NetworkErrorCode.CONNECTION_FAILED,
        };

        return Promise.reject(networkError);
      } else if (error.code === 'ECONNABORTED') {
        // Timeout
        const timeoutError: ApiErrorResponse = {
          statusCode: 0,
          message: 'Request timed out',
          errorCode: NetworkErrorCode.TIMEOUT,
        };

        return Promise.reject(timeoutError);
      } else {
        // Unknown error
        const unknownError: ApiErrorResponse = {
          statusCode: 500,
          message: error.message || 'An unexpected error occurred',
          errorCode: ServerErrorCode.INTERNAL_ERROR,
        };

        return Promise.reject(unknownError);
      }
    }
  );

  /**
   * Make an API request
   */
  async function request<T>(
    endpoint: string,
    options: ApiRequestOptions & AxiosRequestConfig = {}
  ): Promise<T> {
    const {
      skipAuth = false,
      timeout = clientConfig.timeout,
      headers: customHeaders = {},
      suppressGlobalError = false,
      signal,
      ...axiosOptions
    } = options;

    try {
      const response = await axiosInstance.request<T>({
        ...axiosOptions,
        url: endpoint,
        timeout,
        headers: {
          ...customHeaders,
          ...(skipAuth ? { Authorization: undefined } : {}),
        },
        signal,
      });

      // Handle wrapped responses
      const data = response.data;
      if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
        return (data as any).data as T;
      }

      return data;
    } catch (error) {
      const processed = processApiError(error as ApiErrorResponse);

      // Route through global error handler
      if (!suppressGlobalError) {
        handleError(error, { suppressGlobalHandling: false });
      }

      throw new ApiError(processed);
    }
  }

  /**
   * GET request
   */
  async function get<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async function post<T>(
    endpoint: string,
    data?: unknown,
    options?: ApiRequestOptions
  ): Promise<T> {
    return request<T>(endpoint, {
      ...options,
      method: 'POST',
      data,
    });
  }

  /**
   * PUT request
   */
  async function put<T>(endpoint: string, data?: unknown, options?: ApiRequestOptions): Promise<T> {
    return request<T>(endpoint, {
      ...options,
      method: 'PUT',
      data,
    });
  }

  /**
   * PATCH request
   */
  async function patch<T>(
    endpoint: string,
    data?: unknown,
    options?: ApiRequestOptions
  ): Promise<T> {
    return request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      data,
    });
  }

  /**
   * DELETE request
   */
  async function del<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  return {
    instance: axiosInstance,
    request,
    get,
    post,
    put,
    patch,
    delete: del,
  };
}

/**
 * Default API client instance
 * Configure with your app's settings before use
 */
let defaultClient: ReturnType<typeof createApiClient> | null = null;

/**
 * Initialize the default API client
 */
export function initializeApiClient(config: ApiClientConfig): void {
  defaultClient = createApiClient(config);
}

/**
 * Get the default API client
 */
export function getApiClient(): ReturnType<typeof createApiClient> {
  if (!defaultClient) {
    throw new Error('API client not initialized. Call initializeApiClient() first.');
  }
  return defaultClient;
}

export default {
  createApiClient,
  initializeApiClient,
  getApiClient,
  ApiError,
};
