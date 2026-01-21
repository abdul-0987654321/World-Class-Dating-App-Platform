/**
 * API Client
 * Central API client for Flamoral web application
 *
 * SECURITY FEATURES:
 * - httpOnly cookie-based authentication (XSS protection)
 * - CSRF protection via double-submit cookie pattern
 * - Automatic credential inclusion for cross-origin requests
 *
 * RESILIENCE FEATURES:
 * - Configurable timeouts for all requests
 * - Exponential backoff retry logic for transient failures
 * - Circuit breaker pattern for failing endpoints
 * - Idempotency key support for write operations
 *
 * NOTE: Authentication tokens are stored in httpOnly cookies (set by backend),
 * not accessible to JavaScript. This protects against XSS token theft.
 */

import { authTokenService } from './auth-token.service';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  skipCsrf?: boolean;
  timeout?: number; // Timeout in milliseconds
  retries?: number; // Number of retry attempts
  retryDelay?: number; // Base delay for retry in milliseconds
  idempotencyKey?: string; // Idempotency key for write operations
  skipRetry?: boolean; // Skip retry logic for non-idempotent operations
}

// Default timeout for API requests (30 seconds)
const DEFAULT_TIMEOUT = 30000;

// Retry configuration
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 10000;

// HTTP status codes that should trigger a retry
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

// Methods that are safe to retry without idempotency key
const IDEMPOTENT_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * Circuit Breaker State
 */
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenSuccessThreshold: number;
}

/**
 * Simple Circuit Breaker for client-side resilience
 */
class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;
  private config: CircuitBreakerConfig;

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = {
      failureThreshold: config?.failureThreshold ?? 5,
      resetTimeoutMs: config?.resetTimeoutMs ?? 30000,
      halfOpenSuccessThreshold: config?.halfOpenSuccessThreshold ?? 2,
    };
  }

  getState(): CircuitState {
    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure >= this.config.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      }
    }
    return this.state;
  }

  allowRequest(): boolean {
    const currentState = this.getState();
    return currentState !== 'OPEN';
  }

  recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.config.halfOpenSuccessThreshold) {
        this.state = 'CLOSED';
        this.failureCount = 0;
      }
    } else if (this.state === 'CLOSED') {
      this.failureCount = 0;
    }
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
  }
}

/**
 * Calculate exponential backoff delay with jitter
 */
function calculateBackoffDelay(attempt: number, baseDelay: number): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, MAX_RETRY_DELAY);
  // Add jitter: 50-100% of calculated delay
  const jitter = cappedDelay * (0.5 + Math.random() * 0.5);
  return Math.floor(jitter);
}

/**
 * Check if an error/status is retryable
 */
function isRetryableError(status: number, error?: Error): boolean {
  if (RETRYABLE_STATUS_CODES.includes(status)) {
    return true;
  }
  // Network errors are retryable
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }
  return false;
}

/**
 * Generate a UUID v4 for idempotency keys
 */
function generateIdempotencyKey(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class ApiClient {
  private baseUrl: string;
  private csrfToken: string | null = null;
  private csrfTokenPromise: Promise<string> | null = null;
  private circuitBreaker: CircuitBreaker;
  private isRefreshing = false;
  private refreshPromise: Promise<void> | null = null;

  constructor() {
    this.baseUrl = API_BASE_URL;
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeoutMs: 30000,
      halfOpenSuccessThreshold: 2,
    });
    // Initialize CSRF token on construction (fire and forget - errors handled internally)
    this.initializeCsrfToken().catch(() => {
      // Silently ignore initialization errors - token will be fetched on first request if needed
    });
  }

  /**
   * Refresh authentication token
   * Uses a singleton pattern to prevent multiple simultaneous refresh attempts
   */
  private async refreshAuthToken(): Promise<void> {
    // If already refreshing, wait for the existing refresh to complete
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;

    this.refreshPromise = (async () => {
      try {
        // Skip if no base URL (mock mode)
        if (!this.baseUrl) {
          return;
        }

        const response = await fetch(`${this.baseUrl}/api/v1/auth/refresh-token`, {
          method: 'POST',
          credentials: 'include', // Include httpOnly cookies
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Token refresh failed');
        }

        // Token refreshed successfully - cookies are updated automatically
        authTokenService.setAuthenticated(true);
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Initialize CSRF token from cookie or fetch from server
   */
  private async initializeCsrfToken(): Promise<void> {
    // Try to get token from cookie first
    const cookieToken = this.getCsrfTokenFromCookie();
    if (cookieToken) {
      this.csrfToken = cookieToken;
      return;
    }

    // If no token in cookie, fetch from server
    await this.fetchCsrfToken();
  }

  /**
   * Get CSRF token from cookie
   */
  private getCsrfTokenFromCookie(): string | null {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'XSRF-TOKEN') {
        return decodeURIComponent(value);
      }
    }
    return null;
  }

  /**
   * Fetch CSRF token from server
   * Returns empty string if fetch fails (allows app to continue without CSRF for mock mode)
   */
  private async fetchCsrfToken(): Promise<string> {
    // Prevent multiple simultaneous token fetches
    if (this.csrfTokenPromise) {
      try {
        const result = await this.csrfTokenPromise;
        return result || '';
      } catch {
        return '';
      }
    }

    const tokenPromise: Promise<string> = (async (): Promise<string> => {
      try {
        // Skip fetch if no base URL (mock mode)
        if (!this.baseUrl) {
          return '';
        }

        const response = await fetch(`${this.baseUrl}/api/v1/csrf/token`, {
          method: 'GET',
          credentials: 'include', // Important: include cookies
        });

        if (!response.ok) {
          console.warn('CSRF token fetch failed, continuing without CSRF protection');
          return '';
        }

        const data = await response.json();
        this.csrfToken = data.csrfToken || '';
        return this.csrfToken || '';
      } catch (error) {
        console.warn('Error fetching CSRF token, continuing without CSRF protection:', error);
        return '';
      } finally {
        this.csrfTokenPromise = null;
      }
    })();

    this.csrfTokenPromise = tokenPromise;
    return tokenPromise;
  }

  /**
   * Get current CSRF token, fetching if necessary
   */
  private async getCsrfToken(): Promise<string> {
    // Try cookie first (most up-to-date)
    const cookieToken = this.getCsrfTokenFromCookie();
    if (cookieToken) {
      this.csrfToken = cookieToken;
      return cookieToken;
    }

    // Use cached token if available
    if (this.csrfToken) {
      return this.csrfToken;
    }

    // Fetch new token
    return this.fetchCsrfToken();
  }

  /**
   * Refresh CSRF token
   */
  async refreshCsrfToken(): Promise<string> {
    this.csrfToken = null;
    return this.fetchCsrfToken();
  }

  /**
   * Get Authorization header using AuthTokenService
   *
   * SECURITY NOTE: In production, authentication uses httpOnly cookies instead of
   * Authorization headers. The browser automatically sends cookies with requests
   * when credentials: 'include' is set. This method only returns headers in mock mode.
   *
   * @deprecated In production, httpOnly cookies are used instead of Authorization header
   */
  private getAuthHeader(): Record<string, string> {
    // In production, auth is via httpOnly cookies sent automatically
    // This only returns a header in mock mode for development compatibility
    return authTokenService.getAuthorizationHeader();
  }

  /**
   * Get CSRF header
   */
  private async getCsrfHeader(skipCsrf: boolean): Promise<Record<string, string>> {
    if (skipCsrf) {
      return {};
    }

    const token = await this.getCsrfToken();
    return token ? { 'X-CSRF-Token': token } : {};
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const {
      skipAuth = false,
      skipCsrf = false,
      timeout = DEFAULT_TIMEOUT,
      retries = DEFAULT_RETRIES,
      retryDelay = DEFAULT_RETRY_DELAY,
      idempotencyKey,
      skipRetry = false,
      ...fetchOptions
    } = options;

    const method = fetchOptions.method || 'GET';

    // Check circuit breaker before making request
    if (!this.circuitBreaker.allowRequest()) {
      throw new ApiError('Service temporarily unavailable. Please try again later.', 503, {
        code: 'CIRCUIT_BREAKER_OPEN',
      });
    }

    // Determine if CSRF token is needed (for state-changing methods)
    const needsCsrf = !skipCsrf && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    // Determine if this request is safe to retry
    const isIdempotent = IDEMPOTENT_METHODS.includes(method);
    const hasIdempotencyKey = !!idempotencyKey;
    const canRetry = !skipRetry && (isIdempotent || hasIdempotencyKey);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(!skipAuth ? this.getAuthHeader() : {}),
      ...(needsCsrf ? await this.getCsrfHeader(skipCsrf) : {}),
      ...((fetchOptions.headers as Record<string, string>) || {}),
    };

    // Add idempotency key header for write operations
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    let lastError: ApiError | null = null;
    let attempt = 0;
    const maxAttempts = canRetry ? retries + 1 : 1;

    while (attempt < maxAttempts) {
      attempt++;

      // Create AbortController for timeout if not already provided
      const controller = new AbortController();
      const signal = fetchOptions.signal || controller.signal;

      // Set up timeout
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, timeout);

      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          ...fetchOptions,
          headers,
          credentials: 'include', // Important: include cookies for CSRF
          signal,
        });

        // If CSRF token is invalid, try refreshing it once
        if (response.status === 403 && needsCsrf) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData.message?.toLowerCase().includes('csrf')) {
            // Refresh token and retry
            await this.refreshCsrfToken();
            const retryHeaders = {
              ...headers,
              ...(await this.getCsrfHeader(skipCsrf)),
            };

            const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
              ...fetchOptions,
              headers: retryHeaders,
              credentials: 'include',
              signal,
            });

            clearTimeout(timeoutId);

            if (!retryResponse.ok) {
              const retryErrorData = await retryResponse.json().catch(() => ({}));
              this.circuitBreaker.recordFailure();
              throw new ApiError(
                retryErrorData.message || `Request failed with status ${retryResponse.status}`,
                retryResponse.status,
                retryErrorData
              );
            }

            this.circuitBreaker.recordSuccess();
            const text = await retryResponse.text();
            if (!text) {
              return {} as T;
            }

            return JSON.parse(text);
          }
        }

        clearTimeout(timeoutId);

        // Handle 401 Unauthorized - attempt token refresh
        if (response.status === 401 && !skipAuth && !this.isRefreshing) {
          const errorData = await response.json().catch(() => ({}));
          const errorCode = errorData.code || '';

          // Only attempt refresh for expired tokens, not invalid credentials
          if (
            errorCode === 'TOKEN_EXPIRED' ||
            errorData.message?.toLowerCase().includes('expired')
          ) {
            try {
              await this.refreshAuthToken();
              // Token refreshed - retry the original request (don't count as retry attempt)
              attempt--;
              continue;
            } catch (refreshError) {
              // Token refresh failed - clear auth state and throw
              authTokenService.clearTokens();
              this.circuitBreaker.recordFailure();
              throw new ApiError('Session expired. Please log in again.', 401, {
                code: 'SESSION_EXPIRED',
                ...errorData,
              });
            }
          }
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error = new ApiError(
            errorData.message || `Request failed with status ${response.status}`,
            response.status,
            errorData
          );

          // Check if we should retry
          if (canRetry && attempt < maxAttempts && isRetryableError(response.status)) {
            lastError = error;
            const delay = calculateBackoffDelay(attempt, retryDelay);
            await sleep(delay);
            continue;
          }

          this.circuitBreaker.recordFailure();
          throw error;
        }

        // Success - record it for circuit breaker
        this.circuitBreaker.recordSuccess();

        // Handle empty responses
        const text = await response.text();
        if (!text) {
          return {} as T;
        }

        return JSON.parse(text);
      } catch (error) {
        clearTimeout(timeoutId);

        // Handle network errors including timeouts
        if (error instanceof DOMException && error.name === 'AbortError') {
          const timeoutError = new ApiError(
            'Request timed out. Please check your connection and try again.',
            0,
            { code: 'TIMEOUT', originalError: error }
          );

          // Retry on timeout if allowed
          if (canRetry && attempt < maxAttempts) {
            lastError = timeoutError;
            const delay = calculateBackoffDelay(attempt, retryDelay);
            await sleep(delay);
            continue;
          }

          this.circuitBreaker.recordFailure();
          throw timeoutError;
        }

        if (error instanceof TypeError && error.message.includes('fetch')) {
          const networkError = new ApiError(
            'Unable to connect to server. Please check your internet connection.',
            0,
            { code: 'NETWORK_ERROR', originalError: error }
          );

          // Retry on network error if allowed
          if (canRetry && attempt < maxAttempts) {
            lastError = networkError;
            const delay = calculateBackoffDelay(attempt, retryDelay);
            await sleep(delay);
            continue;
          }

          this.circuitBreaker.recordFailure();
          throw networkError;
        }

        // Re-throw ApiError as-is
        if (error instanceof ApiError) {
          this.circuitBreaker.recordFailure();
          throw error;
        }

        // Wrap unknown errors
        this.circuitBreaker.recordFailure();
        throw new ApiError('An unexpected error occurred. Please try again.', 0, {
          code: 'UNKNOWN_ERROR',
          originalError: error,
        });
      }
    }

    // If we exhausted retries, throw the last error
    if (lastError) {
      this.circuitBreaker.recordFailure();
      throw lastError;
    }

    // This should never be reached
    throw new ApiError('Request failed after retries', 0, { code: 'RETRY_EXHAUSTED' });
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request - use idempotencyKey option for retryable write operations
   */
  async post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * POST request with auto-generated idempotency key (safe to retry)
   * Use for critical operations like payments, subscriptions, etc.
   */
  async postIdempotent<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      idempotencyKey: options?.idempotencyKey || generateIdempotencyKey(),
    });
  }

  /**
   * PUT request - inherently idempotent, safe to retry
   */
  async put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    // PUT is idempotent by design, but we add idempotency key for tracking
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      idempotencyKey: options?.idempotencyKey || generateIdempotencyKey(),
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request with auto-generated idempotency key (safe to retry)
   */
  async patchIdempotent<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      idempotencyKey: options?.idempotencyKey || generateIdempotencyKey(),
    });
  }

  /**
   * DELETE request - use idempotencyKey for retryable deletes
   */
  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    // DELETE is usually idempotent, add key for tracking
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
      idempotencyKey: options?.idempotencyKey || generateIdempotencyKey(),
    });
  }

  /**
   * Get circuit breaker state for monitoring
   */
  getCircuitBreakerState(): CircuitState {
    return this.circuitBreaker.getState();
  }

  /**
   * Reset circuit breaker (use with caution)
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }

  // Check if we're in mock mode
  static get isMockMode(): boolean {
    return !API_BASE_URL;
  }
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
