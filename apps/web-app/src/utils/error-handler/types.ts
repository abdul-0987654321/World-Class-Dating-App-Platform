/**
 * Error Handler Types
 * TypeScript interfaces for API error responses and error handling
 */

import type { ErrorCode } from './error-codes';

// Re-export ErrorCode for convenience
export type { ErrorCode };

/**
 * Standard API error response from backend
 */
export interface ApiErrorResponse {
  /** HTTP status code */
  statusCode: number;
  /** Human-readable error message (for logging only, not display) */
  message: string;
  /** Machine-readable error code for frontend logic */
  errorCode?: ErrorCode | string;
  /** Error name/type */
  error?: string;
  /** Correlation ID for debugging */
  correlationId?: string;
  /** Timestamp of error */
  timestamp?: string;
  /** Request path */
  path?: string;
  /** Validation error details */
  details?: ValidationErrorDetail[];
  /** Retry-After header value in seconds (for 429 errors) */
  retryAfter?: number;
}

/**
 * Validation error detail for form field errors
 */
export interface ValidationErrorDetail {
  /** Field name that has the error */
  field: string;
  /** Validation error code */
  code: string;
  /** Constraints that were violated */
  constraints?: Record<string, string>;
}

/**
 * Processed error ready for UI consumption
 */
export interface ProcessedError {
  /** HTTP status code */
  status: number;
  /** Error code for frontend logic */
  errorCode: ErrorCode | string;
  /** User-friendly message for display */
  userMessage: string;
  /** Original error message (for logging only) */
  originalMessage: string;
  /** Correlation ID for debugging */
  correlationId?: string;
  /** Validation errors for form display */
  validationErrors?: Record<string, string>;
  /** Seconds until retry is allowed (for rate limit errors) */
  retryAfter?: number;
  /** Whether the error is recoverable */
  isRecoverable: boolean;
  /** Whether a retry button should be shown */
  showRetry: boolean;
  /** Timestamp of error occurrence */
  timestamp: Date;
}

/**
 * Error handler configuration
 */
export interface ErrorHandlerConfig {
  /** Callback for redirecting to login page */
  onAuthRequired?: () => void;
  /** Callback for redirecting to billing page */
  onBillingRequired?: () => void;
  /** Callback for showing 404 page */
  onNotFound?: () => void;
  /** Callback for showing maintenance page */
  onMaintenance?: () => void;
  /** Callback for showing toast notifications */
  showToast?: (message: string, type: 'error' | 'warning' | 'info') => void;
  /** Callback for logging errors */
  logError?: (error: ProcessedError, originalError: unknown) => void;
  /** Custom user messages by error code */
  customMessages?: Partial<Record<ErrorCode | string, string>>;
}

/**
 * Error context provided by useError hook
 */
export interface ErrorContextValue {
  /** Current error, if any */
  error: ProcessedError | null;
  /** Set an error to be displayed */
  setError: (error: ProcessedError | null) => void;
  /** Clear the current error */
  clearError: () => void;
  /** Handle an API error */
  handleError: (error: unknown) => ProcessedError;
  /** Check if currently showing an error */
  hasError: boolean;
  /** Retry after time remaining (for rate limit) */
  retryAfterRemaining: number | null;
}

/**
 * Error boundary props
 */
export interface ErrorBoundaryProps {
  /** Child components to render */
  children: React.ReactNode;
  /** Fallback UI to render on error */
  fallback?: React.ReactNode | ((error: Error, reset: () => void) => React.ReactNode);
  /** Callback when error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Whether to reset on navigation */
  resetOnNavigate?: boolean;
}

/**
 * Error boundary state
 */
export interface ErrorBoundaryState {
  /** Whether an error has been caught */
  hasError: boolean;
  /** The caught error */
  error: Error | null;
  /** React error info */
  errorInfo: React.ErrorInfo | null;
}

/**
 * API client request options
 */
export interface ApiRequestOptions {
  /** Skip authentication header */
  skipAuth?: boolean;
  /** Skip CSRF token */
  skipCsrf?: boolean;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Custom headers */
  headers?: Record<string, string>;
  /** Abort signal for request cancellation */
  signal?: AbortSignal;
  /** Whether to suppress global error handling */
  suppressGlobalError?: boolean;
}

/**
 * API client configuration
 */
export interface ApiClientConfig {
  /** Base URL for API requests */
  baseUrl: string;
  /** Function to get current auth token */
  getAuthToken?: () => string | null | Promise<string | null>;
  /** Function to get CSRF token */
  getCsrfToken?: () => string | null | Promise<string | null>;
  /** Default request timeout */
  timeout?: number;
  /** Error handler configuration */
  errorHandlerConfig?: ErrorHandlerConfig;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  /** Whether the request was successful */
  success: boolean;
  /** Response data */
  data: T;
  /** Optional message */
  message?: string;
  /** Pagination metadata */
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

/**
 * Rate limit info from response headers
 */
export interface RateLimitInfo {
  /** Maximum requests allowed */
  limit: number;
  /** Remaining requests */
  remaining: number;
  /** Time until reset (in seconds) */
  reset: number;
}
