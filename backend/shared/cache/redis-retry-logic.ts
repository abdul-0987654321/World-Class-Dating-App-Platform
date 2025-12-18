/**
 * Redis Connection Retry Logic with Exponential Backoff
 *
 * This module provides robust retry mechanisms for Redis operations
 * to handle transient failures and network issues gracefully.
 */

export interface RedisRetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  exponentialBase?: number;
  jitter?: boolean;
  retryableErrors?: string[];
  onRetry?: (error: Error, attempt: number, delay: number) => void;
}

export interface Logger {
  warn: (message: string, meta?: any) => void;
  error: (message: string, meta?: any) => void;
  info?: (message: string, meta?: any) => void;
}

/**
 * Default logger implementation
 */
const defaultLogger: Logger = {
  warn: (message: string, meta?: any) => console.warn(`[Redis Retry] ${message}`, meta || ''),
  error: (message: string, meta?: any) => console.error(`[Redis Retry] ${message}`, meta || ''),
  info: (message: string, meta?: any) => console.log(`[Redis Retry] ${message}`, meta || ''),
};

/**
 * Common Redis error codes and messages that should trigger retries
 */
const RETRYABLE_ERROR_CODES = [
  'ECONNREFUSED',   // Connection refused
  'ECONNRESET',     // Connection reset
  'ETIMEDOUT',      // Connection timeout
  'EHOSTUNREACH',   // Host unreachable
  'ENETUNREACH',    // Network unreachable
  'EAI_AGAIN',      // DNS lookup timeout
  'EPIPE',          // Broken pipe
  'NR_CLOSED',      // Redis: connection closed
  'CONNECTION_CLOSED', // Redis: connection closed
  'UNCERTAIN_STATE', // Redis: connection in uncertain state
];

/**
 * Check if an error is retryable
 */
export function isRetryableRedisError(error: any, customRetryableCodes?: string[]): boolean {
  if (!error) return false;

  const errorCode = error.code || error.errno;
  const errorMessage = error.message?.toLowerCase() || '';

  // Check against retryable error codes
  const retryableCodes = customRetryableCodes || RETRYABLE_ERROR_CODES;
  if (errorCode && retryableCodes.includes(errorCode)) {
    return true;
  }

  // Check error message patterns
  const retryablePatterns = [
    'connection',
    'timeout',
    'econnrefused',
    'econnreset',
    'etimedout',
    'network',
    'socket',
    'closed',
    'broken',
    'lost',
    'unavailable',
  ];

  return retryablePatterns.some(pattern => errorMessage.includes(pattern));
}

/**
 * Calculate delay with exponential backoff and optional jitter
 */
export function calculateDelay(
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000,
  exponentialBase: number = 2,
  jitter: boolean = true
): number {
  // Exponential backoff: baseDelay * (exponentialBase ^ attempt)
  const exponentialDelay = baseDelay * Math.pow(exponentialBase, attempt - 1);

  // Cap at maxDelay
  let delay = Math.min(exponentialDelay, maxDelay);

  // Add jitter to prevent thundering herd
  if (jitter) {
    // Random jitter between 50% and 100% of calculated delay
    const jitterAmount = delay * (0.5 + Math.random() * 0.5);
    delay = Math.floor(jitterAmount);
  }

  return delay;
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a Redis operation with retry logic and exponential backoff
 *
 * @param operation - The async operation to execute
 * @param options - Retry configuration options
 * @param logger - Logger instance for logging retry attempts
 * @returns Promise resolving to the operation result
 * @throws Error if max retries exceeded or non-retryable error occurs
 */
export async function withRedisRetry<T>(
  operation: () => Promise<T>,
  options: RedisRetryOptions = {},
  logger: Logger = defaultLogger
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    exponentialBase = 2,
    jitter = true,
    retryableErrors,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Execute the operation
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Check if error is retryable
      if (!isRetryableRedisError(error, retryableErrors)) {
        logger.error('Non-retryable Redis error encountered', {
          error: error.message,
          code: error.code,
          attempt,
        });
        throw error;
      }

      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        logger.error('Max Redis retries exceeded', {
          error: error.message,
          code: error.code,
          maxRetries,
          totalAttempts: attempt,
        });
        throw new Error(
          `Max Redis retries (${maxRetries}) exceeded. Last error: ${error.message}`
        );
      }

      // Calculate delay for next retry
      const delay = calculateDelay(attempt, baseDelay, maxDelay, exponentialBase, jitter);

      // Log the retry attempt
      logger.warn('Redis operation failed, retrying', {
        attempt,
        maxRetries,
        delay,
        nextAttempt: attempt + 1,
        error: error.message,
        code: error.code,
      });

      // Call custom retry handler if provided
      if (onRetry) {
        try {
          onRetry(error, attempt, delay);
        } catch (handlerError) {
          logger.error('Error in onRetry handler', handlerError);
        }
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError!;
}

/**
 * Create a retry wrapper for Redis connection establishment
 */
export function createRedisConnectionRetryWrapper<T>(
  connectFn: () => Promise<T>,
  serviceName: string,
  logger: Logger = defaultLogger
): () => Promise<T> {
  return async (): Promise<T> => {
    return withRedisRetry(
      connectFn,
      {
        maxRetries: 5,
        baseDelay: 1000,
        maxDelay: 30000,
        exponentialBase: 2,
        jitter: true,
        onRetry: (error, attempt, delay) => {
          logger.warn(`[${serviceName}] Redis connection retry`, {
            attempt,
            delay,
            error: error.message,
          });
        },
      },
      logger
    );
  };
}

/**
 * Create a retry wrapper for Redis commands
 */
export function createRedisCommandRetryWrapper<T>(
  commandFn: () => Promise<T>,
  commandName: string,
  logger: Logger = defaultLogger,
  maxRetries: number = 3
): () => Promise<T> {
  return async (): Promise<T> => {
    return withRedisRetry(
      commandFn,
      {
        maxRetries,
        baseDelay: 200,
        maxDelay: 5000,
        exponentialBase: 2,
        jitter: true,
        onRetry: (error, attempt, delay) => {
          logger.warn(`[Command: ${commandName}] Retry attempt`, {
            attempt,
            delay,
            error: error.message,
          });
        },
      },
      logger
    );
  };
}

/**
 * Health check with retry logic
 */
export async function healthCheckRedisWithRetry(
  healthCheckFn: () => Promise<boolean>,
  serviceName: string,
  logger: Logger = defaultLogger
): Promise<boolean> {
  try {
    return await withRedisRetry(
      async () => {
        const result = await healthCheckFn();
        if (!result) {
          throw new Error('Redis health check failed');
        }
        return result;
      },
      {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 5000,
        onRetry: (error, attempt) => {
          logger.warn(`[${serviceName}] Redis health check retry`, {
            attempt,
            error: error.message,
          });
        },
      },
      logger
    );
  } catch (error) {
    logger.error(`[${serviceName}] Redis health check failed after retries`, error);
    return false;
  }
}

/**
 * Redis client configuration with retry options
 */
export interface RedisClientConfig {
  socket?: {
    host: string;
    port: number;
    connectTimeout?: number;
    reconnectStrategy?: (retries: number) => number | Error;
  };
  password?: string;
  database?: number;
  url?: string;
}

/**
 * Create Redis reconnect strategy with exponential backoff
 */
export function createReconnectStrategy(
  maxRetries: number = 10,
  baseDelay: number = 1000,
  maxDelay: number = 30000
): (retries: number) => number | Error {
  return (retries: number) => {
    if (retries > maxRetries) {
      return new Error(`Max reconnection attempts (${maxRetries}) exceeded`);
    }

    const delay = calculateDelay(retries, baseDelay, maxDelay, 2, true);
    console.log(`[Redis] Reconnecting in ${delay}ms (attempt ${retries}/${maxRetries})`);
    return delay;
  };
}

/**
 * Enhance Redis client config with retry logic
 */
export function enhanceRedisConfig(config: RedisClientConfig): RedisClientConfig {
  return {
    ...config,
    socket: {
      ...config.socket,
      connectTimeout: config.socket?.connectTimeout || 10000,
      reconnectStrategy: config.socket?.reconnectStrategy || createReconnectStrategy(10, 1000, 30000),
    } as any,
  };
}

export default {
  withRedisRetry,
  isRetryableRedisError,
  calculateDelay,
  sleep,
  createRedisConnectionRetryWrapper,
  createRedisCommandRetryWrapper,
  healthCheckRedisWithRetry,
  createReconnectStrategy,
  enhanceRedisConfig,
  RETRYABLE_ERROR_CODES,
};
