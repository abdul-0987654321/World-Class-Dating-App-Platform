/**
 * Self-Healing API Hook - Flamoral Dating Platform
 * Provides resilient API calls with retry, circuit breaker, and graceful degradation
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { apiClient, ApiError } from '../services/api.client.secure';

// Circuit breaker states
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number; // ms
  halfOpenRequests: number;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // ms
  maxDelay: number; // ms
  retryOn: number[]; // HTTP status codes to retry on
}

interface SelfHealingConfig {
  circuitBreaker?: Partial<CircuitBreakerConfig>;
  retry?: Partial<RetryConfig>;
  fallbackData?: unknown;
  onError?: (error: ApiError, context: { endpoint: string; attempts: number }) => void;
  onCircuitOpen?: () => void;
  onRecovery?: () => void;
}

interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  lastFailure: number;
  halfOpenSuccesses: number;
}

const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 30000, // 30 seconds
  halfOpenRequests: 2,
};

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  retryOn: [408, 429, 500, 502, 503, 504], // Timeout, Rate limit, Server errors
};

// Global circuit breakers per endpoint pattern
const circuitBreakers = new Map<string, CircuitBreakerState>();

function getEndpointPattern(endpoint: string): string {
  // Group endpoints by service pattern
  const patterns = [
    /^\/api\/auth/,
    /^\/api\/users/,
    /^\/api\/matching/,
    /^\/api\/messages/,
    /^\/api\/notifications/,
    /^\/api\/payments/,
    /^\/api\/subscriptions/,
    /^\/api\/media/,
    /^\/api\/profiles/,
  ];

  for (const pattern of patterns) {
    if (pattern.test(endpoint)) {
      return pattern.source;
    }
  }
  return 'default';
}

function getCircuitBreaker(pattern: string): CircuitBreakerState {
  if (!circuitBreakers.has(pattern)) {
    circuitBreakers.set(pattern, {
      state: 'CLOSED',
      failures: 0,
      lastFailure: 0,
      halfOpenSuccesses: 0,
    });
  }
  return circuitBreakers.get(pattern)!;
}

export function useSelfHealingAPI<T>(
  endpoint: string,
  config: SelfHealingConfig = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRecovered, setIsRecovered] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const circuitConfig = { ...DEFAULT_CIRCUIT_CONFIG, ...config.circuitBreaker };
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config.retry };

  const pattern = getEndpointPattern(endpoint);

  const checkCircuitBreaker = useCallback((): boolean => {
    const circuit = getCircuitBreaker(pattern);

    if (circuit.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - circuit.lastFailure;
      if (timeSinceLastFailure >= circuitConfig.resetTimeout) {
        // Transition to half-open
        circuit.state = 'HALF_OPEN';
        circuit.halfOpenSuccesses = 0;
        return true;
      }
      return false;
    }

    return true;
  }, [pattern, circuitConfig.resetTimeout]);

  const recordSuccess = useCallback(() => {
    const circuit = getCircuitBreaker(pattern);

    if (circuit.state === 'HALF_OPEN') {
      circuit.halfOpenSuccesses++;
      if (circuit.halfOpenSuccesses >= circuitConfig.halfOpenRequests) {
        // Fully recovered
        circuit.state = 'CLOSED';
        circuit.failures = 0;
        circuit.halfOpenSuccesses = 0;
        setIsRecovered(true);
        config.onRecovery?.();
      }
    } else if (circuit.state === 'CLOSED') {
      // Reset failure count on success
      circuit.failures = 0;
    }
  }, [pattern, circuitConfig.halfOpenRequests, config.onRecovery]);

  const recordFailure = useCallback(() => {
    const circuit = getCircuitBreaker(pattern);
    circuit.failures++;
    circuit.lastFailure = Date.now();

    if (circuit.state === 'HALF_OPEN') {
      // Failed during half-open, go back to open
      circuit.state = 'OPEN';
      config.onCircuitOpen?.();
    } else if (circuit.failures >= circuitConfig.failureThreshold) {
      // Open the circuit
      circuit.state = 'OPEN';
      config.onCircuitOpen?.();
    }
  }, [pattern, circuitConfig.failureThreshold, config.onCircuitOpen]);

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const calculateDelay = (attempt: number): number => {
    // Exponential backoff with jitter
    const exponentialDelay = retryConfig.baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.3 * exponentialDelay;
    return Math.min(exponentialDelay + jitter, retryConfig.maxDelay);
  };

  const execute = useCallback(
    async (
      method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
      body?: unknown
    ): Promise<T | null> => {
      // Check circuit breaker first
      if (!checkCircuitBreaker()) {
        const fallback = config.fallbackData as T | undefined;
        if (fallback) {
          setData(fallback);
          return fallback;
        }
        const circuitError = new ApiError(
          'Service temporarily unavailable. Please try again later.',
          503,
          { circuitOpen: true }
        );
        setError(circuitError);
        return null;
      }

      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setLoading(true);
      setError(null);
      setIsRecovered(false);

      let lastError: ApiError | null = null;
      let attempts = 0;

      while (attempts <= retryConfig.maxRetries) {
        try {
          let result: T;

          switch (method) {
            case 'POST':
              result = await apiClient.post<T>(endpoint, body, {
                signal: abortControllerRef.current.signal,
              });
              break;
            case 'PUT':
              result = await apiClient.put<T>(endpoint, body, {
                signal: abortControllerRef.current.signal,
              });
              break;
            case 'PATCH':
              result = await apiClient.patch<T>(endpoint, body, {
                signal: abortControllerRef.current.signal,
              });
              break;
            case 'DELETE':
              result = await apiClient.delete<T>(endpoint, {
                signal: abortControllerRef.current.signal,
              });
              break;
            default:
              result = await apiClient.get<T>(endpoint, {
                signal: abortControllerRef.current.signal,
              });
          }

          recordSuccess();
          setData(result);
          setLoading(false);
          return result;
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') {
            // Request was cancelled, don't retry
            setLoading(false);
            return null;
          }

          lastError =
            err instanceof ApiError
              ? err
              : new ApiError('Network error', 0, err);

          attempts++;

          // Check if we should retry
          const shouldRetry =
            attempts <= retryConfig.maxRetries &&
            (retryConfig.retryOn.includes(lastError.status) ||
              lastError.status === 0); // Network error

          if (shouldRetry) {
            const delay = calculateDelay(attempts - 1);
            await sleep(delay);
            continue;
          }

          break;
        }
      }

      // All retries failed
      recordFailure();
      setError(lastError);
      setLoading(false);

      config.onError?.(lastError!, { endpoint, attempts });

      // Return fallback data if available
      const fallback = config.fallbackData as T | undefined;
      if (fallback) {
        setData(fallback);
        return fallback;
      }

      return null;
    },
    [
      endpoint,
      checkCircuitBreaker,
      recordSuccess,
      recordFailure,
      retryConfig,
      config,
    ]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    error,
    loading,
    isRecovered,
    execute,
    get: () => execute('GET'),
    post: (body?: unknown) => execute('POST', body),
    put: (body?: unknown) => execute('PUT', body),
    patch: (body?: unknown) => execute('PATCH', body),
    delete: () => execute('DELETE'),
    // Utility to check circuit state
    getCircuitState: () => getCircuitBreaker(pattern).state,
    // Force reset circuit (for admin/debugging)
    resetCircuit: () => {
      const circuit = getCircuitBreaker(pattern);
      circuit.state = 'CLOSED';
      circuit.failures = 0;
      circuit.halfOpenSuccesses = 0;
    },
  };
}

// Hook for pre-fetching with automatic retry
export function useSelfHealingQuery<T>(
  endpoint: string,
  config: SelfHealingConfig & { enabled?: boolean; refetchInterval?: number } = {}
) {
  const api = useSelfHealingAPI<T>(endpoint, config);
  const { enabled = true, refetchInterval } = config;

  useEffect(() => {
    if (enabled) {
      api.get();
    }
  }, [endpoint, enabled]);

  useEffect(() => {
    if (enabled && refetchInterval) {
      const interval = setInterval(() => {
        api.get();
      }, refetchInterval);
      return () => clearInterval(interval);
    }
  }, [enabled, refetchInterval, api.get]);

  return api;
}

export default useSelfHealingAPI;
