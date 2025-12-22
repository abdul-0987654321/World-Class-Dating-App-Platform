/**
 * API Client with Global Error Handling
 * Axios/fetch wrapper that automatically intercepts responses and routes errors through the global handler
 *
 * IMPORTANT:
 * - Never display raw backend messages to users
 * - All errors are routed through the global error handler
 * - Uses errorCode for logic, never message text
 * - Handles correlation IDs for debugging
 */

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

  /**
   * Get authorization header
   */
  async function getAuthHeader(): Promise<Record<string, string>> {
    if (!clientConfig.getAuthToken) {
      return {};
    }

    const token = await clientConfig.getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Get CSRF token header
   */
  async function getCsrfHeader(): Promise<Record<string, string>> {
    if (!clientConfig.getCsrfToken) {
      return {};
    }

    const token = await clientConfig.getCsrfToken();
    return token ? { 'X-CSRF-Token': token } : {};
  }

  /**
   * Extract correlation ID from response headers
   */
  function getCorrelationId(response: Response): string | undefined {
    return response.headers.get('X-Correlation-ID') ||
           response.headers.get('X-Request-ID') ||
           undefined;
  }

  /**
   * Extract rate limit info from response headers
   */
  function getRateLimitInfo(response: Response): RateLimitInfo | undefined {
    const limit = response.headers.get('X-RateLimit-Limit');
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');

    if (limit && remaining && reset) {
      return {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        reset: parseInt(reset, 10),
      };
    }

    return undefined;
  }

  /**
   * Extract retry-after value from response headers
   */
  function getRetryAfter(response: Response): number | undefined {
    const retryAfter = response.headers.get('Retry-After');
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        return seconds;
      }
      // Handle date format
      const date = new Date(retryAfter);
      if (!isNaN(date.getTime())) {
        return Math.ceil((date.getTime() - Date.now()) / 1000);
      }
    }
    return undefined;
  }

  /**
   * Make an API request
   */
  async function request<T>(
    endpoint: string,
    options: ApiRequestOptions & RequestInit = {}
  ): Promise<T> {
    const {
      skipAuth = false,
      skipCsrf = false,
      timeout = clientConfig.timeout,
      headers: customHeaders = {},
      suppressGlobalError = false,
      signal: customSignal,
      ...fetchOptions
    } = options;

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = timeout
      ? setTimeout(() => controller.abort(), timeout)
      : null;

    // Merge signals if custom signal provided
    const signal = customSignal || controller.signal;
    if (customSignal) {
      customSignal.addEventListener('abort', () => controller.abort());
    }

    try {
      // Determine if CSRF token is needed
      const needsCsrf = !skipCsrf && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(
        fetchOptions.method?.toUpperCase() || 'GET'
      );

      // Build headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(!skipAuth ? await getAuthHeader() : {}),
        ...(needsCsrf ? await getCsrfHeader() : {}),
        ...customHeaders,
      };

      // Make request
      const response = await fetch(`${clientConfig.baseUrl}${endpoint}`, {
        ...fetchOptions,
        headers,
        credentials: 'include',
        signal,
      });

      // Clear timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Extract metadata
      const correlationId = getCorrelationId(response);

      // Handle non-OK responses
      if (!response.ok) {
        let errorData: ApiErrorResponse;

        try {
          const json = await response.json();
          errorData = {
            statusCode: response.status,
            message: json.message || json.error || `Request failed with status ${response.status}`,
            errorCode: json.errorCode || json.code || json.error,
            error: json.error,
            correlationId,
            details: json.details || json.errors,
            retryAfter: getRetryAfter(response),
          };
        } catch {
          errorData = {
            statusCode: response.status,
            message: `Request failed with status ${response.status}`,
            correlationId,
            retryAfter: getRetryAfter(response),
          };
        }

        const processedError = processApiError(errorData);

        // Route through global error handler
        if (!suppressGlobalError) {
          handleError(errorData, { suppressGlobalHandling: false });
        }

        throw new ApiError(processedError);
      }

      // Handle empty responses
      const text = await response.text();
      if (!text) {
        return {} as T;
      }

      // Parse JSON response
      const data = JSON.parse(text);

      // Handle wrapped responses
      if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
        return data.data as T;
      }

      return data as T;
    } catch (error) {
      // Clear timeout on error
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Re-throw ApiError as-is
      if (error instanceof ApiError) {
        throw error;
      }

      // Handle abort/timeout
      if (error instanceof DOMException && error.name === 'AbortError') {
        const timeoutError: ApiErrorResponse = {
          statusCode: 0,
          message: 'Request timed out',
          errorCode: NetworkErrorCode.TIMEOUT,
        };

        if (!suppressGlobalError) {
          handleError(timeoutError, { suppressGlobalHandling: false });
        }

        throw new ApiError(processApiError(timeoutError));
      }

      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const networkError: ApiErrorResponse = {
          statusCode: 0,
          message: 'Network request failed',
          errorCode: NetworkErrorCode.CONNECTION_FAILED,
        };

        if (!suppressGlobalError) {
          handleError(networkError, { suppressGlobalHandling: false });
        }

        throw new ApiError(processApiError(networkError));
      }

      // Handle unknown errors
      const normalized = normalizeError(error);
      const processed = processApiError(normalized);

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
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async function put<T>(
    endpoint: string,
    data?: unknown,
    options?: ApiRequestOptions
  ): Promise<T> {
    return request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
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
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async function del<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  return {
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
    throw new Error(
      'API client not initialized. Call initializeApiClient() first.'
    );
  }
  return defaultClient;
}

export default {
  createApiClient,
  initializeApiClient,
  getApiClient,
  ApiError,
};
