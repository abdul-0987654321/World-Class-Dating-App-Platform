/**
 * Error Handler Module for React Native
 * Centralized error handling for Flamoral mobile application
 *
 * Usage:
 *
 * 1. Configure the error handler in your app initialization:
 * ```tsx
 * import { configureErrorHandler, initializeApiClient } from '@/utils/error-handler';
 * import AsyncStorage from '@react-native-async-storage/async-storage';
 * import { Alert } from 'react-native';
 *
 * configureErrorHandler({
 *   onAuthRequired: () => navigation.navigate('Login'),
 *   onBillingRequired: () => navigation.navigate('Subscription'),
 *   showAlert: (message, type) => Alert.alert(
 *     type === 'error' ? 'Error' : 'Notice',
 *     message
 *   ),
 * });
 *
 * initializeApiClient({
 *   baseUrl: Config.API_URL,
 *   getAuthToken: () => AsyncStorage.getItem('accessToken'),
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
 *     <TextInput
 *       style={hasError('email') ? styles.error : styles.normal}
 *     />
 *     {hasError('email') && <Text style={styles.errorText}>{getError('email')}</Text>}
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
