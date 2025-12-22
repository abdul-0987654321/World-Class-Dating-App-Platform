/**
 * Error Handler Module
 * Centralized error handling for Flamoral web application
 *
 * Usage:
 *
 * 1. Configure the error handler in your app initialization:
 * ```tsx
 * import { configureErrorHandler, initializeApiClient } from '@/utils/error-handler';
 *
 * configureErrorHandler({
 *   onAuthRequired: () => navigate('/login'),
 *   onBillingRequired: () => navigate('/subscription'),
 *   showToast: (message, type) => toast[type](message),
 * });
 *
 * initializeApiClient({
 *   baseUrl: import.meta.env.VITE_API_URL,
 *   getAuthToken: () => localStorage.getItem('authToken'),
 * });
 * ```
 *
 * 2. Wrap your app with ErrorProvider and ErrorBoundary:
 * ```tsx
 * import { ErrorProvider, ErrorBoundary } from '@/utils/error-handler';
 *
 * function App() {
 *   return (
 *     <ErrorProvider>
 *       <ErrorBoundary>
 *         <YourApp />
 *       </ErrorBoundary>
 *     </ErrorProvider>
 *   );
 * }
 * ```
 *
 * 3. Use the API client for requests:
 * ```tsx
 * import { getApiClient } from '@/utils/error-handler';
 *
 * const api = getApiClient();
 * const users = await api.get('/users');
 * ```
 *
 * 4. Use hooks in components:
 * ```tsx
 * import { useError, useValidationErrors } from '@/utils/error-handler';
 *
 * function MyComponent() {
 *   const { error, handleError, clearError } = useError();
 *   const { getError, hasError } = useValidationErrors(error);
 *
 *   return (
 *     <input
 *       className={hasError('email') ? 'error' : ''}
 *       helperText={getError('email')}
 *     />
 *   );
 * }
 * ```
 */

// Error codes
export {
  AuthErrorCode,
  PermissionErrorCode,
  BillingErrorCode,
  ValidationErrorCode,
  ResourceErrorCode,
  RateLimitErrorCode,
  ServerErrorCode,
  NetworkErrorCode,
  ModerationErrorCode,
  MatchErrorCode,
  isKnownErrorCode,
  getErrorCategory,
  type ErrorCode,
} from './error-codes';

// Types
export type {
  ApiErrorResponse,
  ValidationErrorDetail,
  ProcessedError,
  ErrorHandlerConfig,
  ErrorContextValue,
  ErrorBoundaryProps,
  ErrorBoundaryState,
  ApiRequestOptions,
  ApiClientConfig,
  ApiResponse,
  RateLimitInfo,
} from './types';

// Error handler
export {
  configureErrorHandler,
  handleError,
  processApiError,
  normalizeError,
  createErrorHandler,
} from './error-handler';

// API client
export {
  createApiClient,
  initializeApiClient,
  getApiClient,
  ApiError,
} from './api-client';

// Error boundary
export {
  ErrorBoundary,
  withErrorBoundary,
  useErrorHandler,
} from './error-boundary';

// Hooks
export {
  ErrorProvider,
  useError,
  useApiError,
  useValidationErrors,
  useRetryTimer,
  useErrorCode,
} from './use-error';
