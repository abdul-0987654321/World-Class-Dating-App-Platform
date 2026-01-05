import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';

/**
 * Configuration options for ServiceClient
 */
export interface ServiceClientConfig {
  /**
   * Base URL of the target service
   */
  baseURL: string;

  /**
   * Service API key for authentication
   * @default process.env.SERVICE_API_KEY
   */
  serviceApiKey?: string;

  /**
   * Service identifier (e.g., 'payment-service', 'user-service')
   */
  serviceName: string;

  /**
   * Request timeout in milliseconds
   * @default 10000 (10 seconds)
   */
  timeout?: number;

  /**
   * Maximum number of retry attempts for failed requests
   * @default 3
   */
  maxRetries?: number;

  /**
   * Delay between retry attempts in milliseconds
   * @default 1000
   */
  retryDelay?: number;

  /**
   * Whether to use exponential backoff for retries
   * @default true
   */
  exponentialBackoff?: boolean;

  /**
   * HTTP status codes that should trigger a retry
   * @default [408, 429, 500, 502, 503, 504]
   */
  retryableStatusCodes?: number[];

  /**
   * Whether to enable request/response logging
   * @default true
   */
  enableLogging?: boolean;

  /**
   * Custom logger function
   */
  logger?: ServiceClientLogger;

  /**
   * Additional headers to include in all requests
   */
  headers?: Record<string, string>;

  /**
   * Whether to enable circuit breaker pattern
   * @default false
   */
  enableCircuitBreaker?: boolean;

  /**
   * Circuit breaker failure threshold
   * @default 5
   */
  circuitBreakerThreshold?: number;

  /**
   * Circuit breaker reset timeout in milliseconds
   * @default 60000 (60 seconds)
   */
  circuitBreakerTimeout?: number;
}

/**
 * Logger interface for ServiceClient
 */
export interface ServiceClientLogger {
  info: (message: string, meta?: any) => void;
  warn: (message: string, meta?: any) => void;
  error: (message: string, meta?: any) => void;
  debug: (message: string, meta?: any) => void;
}

/**
 * Default logger implementation
 */
const defaultLogger: ServiceClientLogger = {
  info: (message: string, meta?: any) => console.info(`[ServiceClient] ${message}`, meta || ''),
  warn: (message: string, meta?: any) => console.warn(`[ServiceClient] ${message}`, meta || ''),
  error: (message: string, meta?: any) => console.error(`[ServiceClient] ${message}`, meta || ''),
  debug: (message: string, meta?: any) => console.debug(`[ServiceClient] ${message}`, meta || ''),
};

/**
 * Circuit breaker state
 */
enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Circuit breaker for handling service failures
 */
class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private successCount = 0;

  constructor(
    private threshold: number,
    private timeout: number,
    private logger: ServiceClientLogger
  ) {}

  /**
   * Check if request is allowed based on circuit state
   */
  public allowRequest(): boolean {
    if (this.state === CircuitState.CLOSED) {
      return true;
    }

    if (this.state === CircuitState.OPEN) {
      // Check if timeout has passed
      if (this.lastFailureTime && Date.now() - this.lastFailureTime >= this.timeout) {
        this.logger.info('Circuit breaker transitioning to HALF_OPEN state');
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
        return true;
      }
      return false;
    }

    // HALF_OPEN state - allow request
    return true;
  }

  /**
   * Record a successful request
   */
  public recordSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= 2) {
        this.logger.info('Circuit breaker transitioning to CLOSED state');
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  /**
   * Record a failed request
   */
  public recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.logger.warn('Circuit breaker transitioning to OPEN state (failure in HALF_OPEN)');
      this.state = CircuitState.OPEN;
    } else if (this.failureCount >= this.threshold) {
      this.logger.warn(
        `Circuit breaker OPEN: ${this.failureCount} failures exceeded threshold ${this.threshold}`
      );
      this.state = CircuitState.OPEN;
    }
  }

  /**
   * Get current circuit state
   */
  public getState(): CircuitState {
    return this.state;
  }
}

/**
 * Enhanced HTTP client for service-to-service communication
 *
 * Features:
 * - Automatic service authentication (X-Service-Key header)
 * - Request tracing (X-Request-ID header)
 * - Retry logic with exponential backoff
 * - Timeout handling
 * - Circuit breaker pattern (optional)
 * - Request/response logging
 * - Error handling and transformation
 *
 * @example
 * const client = new ServiceClient({
 *   baseURL: 'http://user-service:3001',
 *   serviceName: 'payment-service',
 *   maxRetries: 3,
 *   timeout: 10000,
 * });
 *
 * const response = await client.post('/api/internal/coins/add', {
 *   userId: '123',
 *   amount: 100,
 * });
 */
export class ServiceClient {
  private client: AxiosInstance;
  private config: Required<ServiceClientConfig>;
  private circuitBreaker?: CircuitBreaker;
  private logger: ServiceClientLogger;

  constructor(config: ServiceClientConfig) {
    this.config = {
      serviceApiKey: process.env.SERVICE_API_KEY || 'internal-service-key',
      timeout: 10000,
      maxRetries: 3,
      retryDelay: 1000,
      exponentialBackoff: true,
      retryableStatusCodes: [408, 429, 500, 502, 503, 504],
      enableLogging: true,
      logger: defaultLogger,
      headers: {},
      enableCircuitBreaker: false,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 60000,
      ...config,
    };

    this.logger = this.config.logger;

    // Initialize circuit breaker if enabled
    if (this.config.enableCircuitBreaker) {
      this.circuitBreaker = new CircuitBreaker(
        this.config.circuitBreakerThreshold,
        this.config.circuitBreakerTimeout,
        this.logger
      );
    }

    // Create axios instance
    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': this.config.serviceApiKey,
        'X-Source-Service': this.config.serviceName,
        ...this.config.headers,
      },
    });

    // Add request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add request ID for tracing
        const requestId = uuidv4();
        config.headers['X-Request-ID'] = requestId;

        if (this.config.enableLogging) {
          this.logger.debug(`Request: ${config.method?.toUpperCase()} ${config.url}`, {
            requestId,
            data: config.data,
          });
        }

        return config;
      },
      (error) => {
        this.logger.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor
    this.client.interceptors.response.use(
      (response) => {
        const requestId = response.config.headers['X-Request-ID'];

        if (this.config.enableLogging) {
          this.logger.debug(`Response: ${response.status} ${response.config.url}`, {
            requestId,
            data: response.data,
          });
        }

        // Record success for circuit breaker
        if (this.circuitBreaker) {
          this.circuitBreaker.recordSuccess();
        }

        return response;
      },
      async (error: AxiosError) => {
        const requestId = error.config?.headers['X-Request-ID'];

        if (this.config.enableLogging) {
          this.logger.error(`Response error: ${error.message}`, {
            requestId,
            status: error.response?.status,
            data: error.response?.data,
          });
        }

        // Record failure for circuit breaker
        if (this.circuitBreaker) {
          this.circuitBreaker.recordFailure();
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Make a GET request
   */
  public async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  /**
   * Make a POST request
   */
  public async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  /**
   * Make a PUT request
   */
  public async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  /**
   * Make a PATCH request
   */
  public async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'PATCH', url, data });
  }

  /**
   * Make a DELETE request
   */
  public async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  /**
   * Make a request with retry logic
   */
  private async request<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    // Check circuit breaker
    if (this.circuitBreaker && !this.circuitBreaker.allowRequest()) {
      const error = new Error('Circuit breaker is OPEN - service temporarily unavailable');
      (error as any).code = 'CIRCUIT_BREAKER_OPEN';
      this.logger.warn(`Request blocked by circuit breaker: ${config.method} ${config.url}`);
      throw error;
    }

    let lastError: any;
    let attempt = 0;

    while (attempt <= this.config.maxRetries) {
      try {
        const response = await this.client.request<T>(config);
        return response;
      } catch (error: any) {
        lastError = error;
        attempt++;

        // Check if we should retry
        const shouldRetry = this.shouldRetry(error, attempt);

        if (!shouldRetry) {
          throw this.transformError(error);
        }

        // Calculate delay with exponential backoff
        const delay = this.config.exponentialBackoff
          ? this.config.retryDelay * Math.pow(2, attempt - 1)
          : this.config.retryDelay;

        this.logger.warn(
          `Request failed (attempt ${attempt}/${this.config.maxRetries}): ${config.method} ${config.url}. Retrying in ${delay}ms...`,
          { error: error.message }
        );

        // Wait before retrying
        await this.sleep(delay);
      }
    }

    // All retries exhausted
    this.logger.error(
      `Request failed after ${this.config.maxRetries} retries: ${config.method} ${config.url}`
    );
    throw this.transformError(lastError);
  }

  /**
   * Determine if a request should be retried
   */
  private shouldRetry(error: AxiosError, attempt: number): boolean {
    // Don't retry if we've exhausted attempts
    if (attempt > this.config.maxRetries) {
      return false;
    }

    // Don't retry if no response (network error, timeout)
    if (!error.response) {
      return true;
    }

    // Check if status code is retryable
    return this.config.retryableStatusCodes.includes(error.response.status);
  }

  /**
   * Transform axios error to a more user-friendly format
   */
  private transformError(error: AxiosError): Error {
    if (!error.response) {
      // Network error or timeout
      const err = new Error(`Service unavailable: ${this.config.baseURL} - ${error.message}`);
      (err as any).code = 'SERVICE_UNAVAILABLE';
      (err as any).originalError = error;
      return err;
    }

    // HTTP error
    const statusCode = error.response.status;
    const responseData = error.response.data as any;

    let message = `Service error (${statusCode}): ${error.message}`;
    if (responseData?.message) {
      message = responseData.message;
    }

    const err = new Error(message);
    (err as any).code = responseData?.code || `HTTP_${statusCode}`;
    (err as any).statusCode = statusCode;
    (err as any).responseData = responseData;
    (err as any).originalError = error;

    return err;
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get the underlying axios instance
   */
  public getAxiosInstance(): AxiosInstance {
    return this.client;
  }

  /**
   * Get circuit breaker state (if enabled)
   */
  public getCircuitBreakerState(): string | null {
    return this.circuitBreaker ? this.circuitBreaker.getState() : null;
  }

  /**
   * Update service API key
   */
  public updateServiceApiKey(apiKey: string): void {
    this.config.serviceApiKey = apiKey;
    this.client.defaults.headers.common['X-Service-Key'] = apiKey;
  }

  /**
   * Update base URL
   */
  public updateBaseURL(baseURL: string): void {
    this.config.baseURL = baseURL;
    this.client.defaults.baseURL = baseURL;
  }
}

/**
 * Create a service client instance
 * Helper function for creating clients with common configuration
 */
export function createServiceClient(config: ServiceClientConfig): ServiceClient {
  return new ServiceClient(config);
}

export default ServiceClient;
