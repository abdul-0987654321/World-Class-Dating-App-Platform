/**
 * useError Hook for React Native
 * React hook for components to access error state and handlers
 *
 * Usage:
 * const { error, handleError, clearError, hasError } = useError();
 *
 * // Handle an API error
 * try {
 *   await api.get('/users');
 * } catch (e) {
 *   const processed = handleError(e);
 *   if (processed.validationErrors) {
 *     setFieldErrors(processed.validationErrors);
 *   }
 * }
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { handleError as globalHandleError, processApiError, normalizeError } from './error-handler';
import type { ProcessedError, ErrorContextValue, ErrorCode } from './types';

/**
 * Error context
 */
const ErrorContext = createContext<ErrorContextValue | undefined>(undefined);

/**
 * Error provider props
 */
interface ErrorProviderProps {
  children: ReactNode;
}

/**
 * Error Provider component
 * Wrap your app with this to enable useError hook
 */
export function ErrorProvider({ children }: ErrorProviderProps): JSX.Element {
  const [error, setError] = useState<ProcessedError | null>(null);
  const [retryAfterRemaining, setRetryAfterRemaining] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear retry timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Update retry countdown
  useEffect(() => {
    if (error?.retryAfter && error.retryAfter > 0) {
      setRetryAfterRemaining(error.retryAfter);

      timerRef.current = setInterval(() => {
        setRetryAfterRemaining((prev) => {
          if (prev === null || prev <= 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setRetryAfterRemaining(null);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [error?.retryAfter]);

  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    setError(null);
    setRetryAfterRemaining(null);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, []);

  /**
   * Handle an error and optionally suppress global handling
   */
  const handleError = useCallback(
    (err: unknown, suppressGlobalHandling = false): ProcessedError => {
      const processed = globalHandleError(err, { suppressGlobalHandling });
      setError(processed);
      return processed;
    },
    []
  );

  const value: ErrorContextValue = {
    error,
    setError,
    clearError,
    handleError,
    hasError: error !== null,
    retryAfterRemaining,
  };

  return React.createElement(ErrorContext.Provider, { value }, children);
}

/**
 * useError hook
 * Access error state and handlers in components
 */
export function useError(): ErrorContextValue {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
}

/**
 * useApiError hook
 * Specialized hook for handling API errors with loading state
 */
export interface UseApiErrorResult<T> {
  data: T | null;
  error: ProcessedError | null;
  isLoading: boolean;
  execute: () => Promise<T | null>;
  reset: () => void;
}

export function useApiError<T>(
  apiCall: () => Promise<T>,
  options: {
    immediate?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: ProcessedError) => void;
    suppressGlobalHandling?: boolean;
  } = {}
): UseApiErrorResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ProcessedError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { immediate = false, onSuccess, onError, suppressGlobalHandling = false } = options;

  const execute = useCallback(async (): Promise<T | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await apiCall();
      setData(result);
      onSuccess?.(result);
      return result;
    } catch (err) {
      const processed = globalHandleError(err, { suppressGlobalHandling });
      setError(processed);
      onError?.(processed);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [apiCall, onSuccess, onError, suppressGlobalHandling]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  // Execute immediately if configured
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  return { data, error, isLoading, execute, reset };
}

/**
 * useValidationErrors hook
 * Extract validation errors for form display
 */
export function useValidationErrors(error: ProcessedError | null): {
  errors: Record<string, string>;
  getError: (field: string) => string | undefined;
  hasError: (field: string) => boolean;
  clearErrors: () => void;
} {
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (error?.validationErrors) {
      setErrors(error.validationErrors);
    }
  }, [error]);

  const getError = useCallback(
    (field: string): string | undefined => errors[field],
    [errors]
  );

  const hasError = useCallback(
    (field: string): boolean => field in errors,
    [errors]
  );

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  return { errors, getError, hasError, clearErrors };
}

/**
 * useRetryTimer hook
 * Track retry cooldown for rate limit errors
 */
export function useRetryTimer(retryAfter: number | undefined): {
  remaining: number;
  isActive: boolean;
  canRetry: boolean;
} {
  const [remaining, setRemaining] = useState(retryAfter || 0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (retryAfter && retryAfter > 0) {
      setRemaining(retryAfter);

      timerRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [retryAfter]);

  return {
    remaining,
    isActive: remaining > 0,
    canRetry: remaining === 0,
  };
}

/**
 * useErrorCode hook
 * Check if current error matches specific error codes
 */
export function useErrorCode(
  error: ProcessedError | null,
  codes: (ErrorCode | string)[]
): boolean {
  return error !== null && codes.includes(error.errorCode as ErrorCode);
}

export default {
  ErrorProvider,
  useError,
  useApiError,
  useValidationErrors,
  useRetryTimer,
  useErrorCode,
};
