/**
 * Database Connection Retry Logic with Exponential Backoff
 *
 * This module provides robust retry mechanisms for database operations
 * to handle transient failures and network issues gracefully.
 */

export interface RetryOptions {
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
  warn: (message: string, meta?: any) => console.warn(`[Retry] ${message}`, meta || ''),
  error: (message: string, meta?: any) => console.error(`[Retry] ${message}`, meta || ''),
  info: (message: string, meta?: any) => console.log(`[Retry] ${message}`, meta || ''),
};

/**
 * Common database error codes that should trigger retries
 */
const RETRYABLE_ERROR_CODES = [
  'ECONNREFUSED', // Connection refused
  'ECONNRESET', // Connection reset
  'ETIMEDOUT', // Connection timeout
  'EHOSTUNREACH', // Host unreachable
  'ENETUNREACH', // Network unreachable
  'EAI_AGAIN', // DNS lookup timeout
  'EPIPE', // Broken pipe
  '08003', // PostgreSQL: connection does not exist
  '08006', // PostgreSQL: connection failure
  '08001', // PostgreSQL: unable to establish connection
  '57P01', // PostgreSQL: admin shutdown
  '57P02', // PostgreSQL: crash shutdown
  '57P03', // PostgreSQL: cannot connect now
  '53300', // PostgreSQL: too many connections
  '40001', // PostgreSQL: serialization failure
  '40P01', // PostgreSQL: deadlock detected
];

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: any, customRetryableCodes?: string[]): boolean {
  if (!error) return false;

  const errorCode = error.code || error.errno || error.sqlState;
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
    'pool',
    'temporary',
    'transient',
  ];

  return retryablePatterns.some((pattern) => errorMessage.includes(pattern));
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
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute an operation with retry logic and exponential backoff
 *
 * @param operation - The async operation to execute
 * @param options - Retry configuration options
 * @param logger - Logger instance for logging retry attempts
 * @returns Promise resolving to the operation result
 * @throws Error if max retries exceeded or non-retryable error occurs
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
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

  let lastError: Error = new Error('Operation failed');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Execute the operation
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Check if error is retryable
      if (!isRetryableError(error, retryableErrors)) {
        logger.error('Non-retryable error encountered', {
          error: error.message,
          code: error.code,
          attempt,
        });
        throw error;
      }

      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        logger.error('Max retries exceeded', {
          error: error.message,
          code: error.code,
          maxRetries,
          totalAttempts: attempt,
        });
        throw new Error(`Max retries (${maxRetries}) exceeded. Last error: ${error.message}`);
      }

      // Calculate delay for next retry
      const delay = calculateDelay(attempt, baseDelay, maxDelay, exponentialBase, jitter);

      // Log the retry attempt
      logger.warn('Database operation failed, retrying', {
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
  throw lastError;
}

/**
 * Create a retry wrapper for database connection establishment
 */
export function createConnectionRetryWrapper<T>(
  connectFn: () => Promise<T>,
  serviceName: string,
  logger: Logger = defaultLogger
): () => Promise<T> {
  return async (): Promise<T> => {
    return withRetry(
      connectFn,
      {
        maxRetries: 5,
        baseDelay: 1000,
        maxDelay: 30000,
        exponentialBase: 2,
        jitter: true,
        onRetry: (error, attempt, delay) => {
          logger.warn(`[${serviceName}] Connection retry`, {
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
 * Create a retry wrapper for database queries
 */
export function createQueryRetryWrapper<T>(
  queryFn: () => Promise<T>,
  queryName: string,
  logger: Logger = defaultLogger,
  maxRetries: number = 3
): () => Promise<T> {
  return async (): Promise<T> => {
    return withRetry(
      queryFn,
      {
        maxRetries,
        baseDelay: 500,
        maxDelay: 10000,
        exponentialBase: 2,
        jitter: true,
        onRetry: (error, attempt, delay) => {
          logger.warn(`[Query: ${queryName}] Retry attempt`, {
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
 * Wrap a Knex instance to add retry logic to queries
 */
export function wrapKnexWithRetry(knex: any, logger: Logger = defaultLogger): any {
  const originalRaw = knex.raw.bind(knex);

  // Wrap the raw query method
  knex.raw = function (...args: any[]) {
    const query = originalRaw(...args);
    const originalThen = query.then.bind(query);

    query.then = function (onFulfilled?: any, onRejected?: any) {
      return withRetry(
        () => originalThen(),
        {
          maxRetries: 3,
          baseDelay: 500,
          maxDelay: 10000,
        },
        logger
      ).then(onFulfilled, onRejected);
    };

    return query;
  };

  return knex;
}

/**
 * Health check with retry logic
 */
export async function healthCheckWithRetry(
  healthCheckFn: () => Promise<boolean>,
  serviceName: string,
  logger: Logger = defaultLogger
): Promise<boolean> {
  try {
    return await withRetry(
      async () => {
        const result = await healthCheckFn();
        if (!result) {
          throw new Error('Health check failed');
        }
        return result;
      },
      {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 5000,
        onRetry: (error, attempt) => {
          logger.warn(`[${serviceName}] Health check retry`, {
            attempt,
            error: error.message,
          });
        },
      },
      logger
    );
  } catch (error) {
    logger.error(`[${serviceName}] Health check failed after retries`, error);
    return false;
  }
}

export default {
  withRetry,
  isRetryableError,
  calculateDelay,
  sleep,
  createConnectionRetryWrapper,
  createQueryRetryWrapper,
  wrapKnexWithRetry,
  healthCheckWithRetry,
  RETRYABLE_ERROR_CODES,
};
