import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger';
import { getServiceEndpoint } from '../config/service-registry';

const logger = createLogger('enhanced-service-client');

export interface EnhancedServiceClientConfig {
  serviceName: string;
  targetService?: string;
  baseURL?: string;
  serviceApiKey?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
  retryableStatusCodes?: number[];
  enableLogging?: boolean;
  enableCircuitBreaker?: boolean;
  circuitBreakerThreshold?: number;
  circuitBreakerTimeout?: number;
  circuitBreakerResetTimeout?: number;
  headers?: Record<string, string>;
}

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastStateChange: number;
}

/**
 * Enhanced Circuit Breaker with statistics and monitoring
 */
class EnhancedCircuitBreaker extends EventEmitter {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private lastStateChange: number = Date.now();
  private consecutiveSuccesses = 0;
  private slidingWindow: boolean[] = [];
  private readonly windowSize = 10;

  constructor(
    private threshold: number,
    private timeout: number,
    private resetTimeout: number,
    private serviceName: string
  ) {
    super();
  }

  public allowRequest(): boolean {
    if (this.state === CircuitState.CLOSED) {
      return true;
    }

    if (this.state === CircuitState.OPEN) {
      const timeSinceFailure = Date.now() - (this.lastFailureTime || 0);
      if (timeSinceFailure >= this.timeout) {
        logger.info(`Circuit breaker transitioning to HALF_OPEN`, { service: this.serviceName });
        this.transition(CircuitState.HALF_OPEN);
        this.consecutiveSuccesses = 0;
        return true;
      }
      return false;
    }

    return true; // HALF_OPEN allows requests
  }

  public recordSuccess(): void {
    this.slidingWindow.push(true);
    if (this.slidingWindow.length > this.windowSize) {
      this.slidingWindow.shift();
    }

    this.consecutiveSuccesses++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.consecutiveSuccesses >= 3) {
        logger.info(`Circuit breaker closing after ${this.consecutiveSuccesses} successes`, {
          service: this.serviceName,
        });
        this.transition(CircuitState.CLOSED);
        this.reset();
      }
    } else if (this.state === CircuitState.CLOSED) {
      const timeSinceLastFailure = Date.now() - (this.lastFailureTime || 0);
      if (timeSinceLastFailure >= this.resetTimeout) {
        this.reset();
      }
    }

    this.emit('success', this.getStats());
  }

  public recordFailure(): void {
    this.slidingWindow.push(false);
    if (this.slidingWindow.length > this.windowSize) {
      this.slidingWindow.shift();
    }

    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.consecutiveSuccesses = 0;

    const failureRate = this.calculateFailureRate();

    if (this.state === CircuitState.HALF_OPEN) {
      logger.warn(`Circuit breaker opening due to failure in HALF_OPEN state`, {
        service: this.serviceName,
      });
      this.transition(CircuitState.OPEN);
    } else if (this.failureCount >= this.threshold || failureRate >= 0.5) {
      logger.error(`Circuit breaker opening`, {
        service: this.serviceName,
        failures: this.failureCount,
        threshold: this.threshold,
        failureRate,
      });
      this.transition(CircuitState.OPEN);
    }

    this.emit('failure', this.getStats());
  }

  private transition(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();
    this.emit('stateChange', { from: oldState, to: newState, stats: this.getStats() });
  }

  private reset(): void {
    this.failureCount = 0;
    this.successCount = 0;
    this.consecutiveSuccesses = 0;
    this.slidingWindow = [];
  }

  private calculateFailureRate(): number {
    if (this.slidingWindow.length === 0) return 0;
    const failures = this.slidingWindow.filter((success) => !success).length;
    return failures / this.slidingWindow.length;
  }

  public getState(): CircuitState {
    return this.state;
  }

  public getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failureCount,
      successes: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastStateChange: this.lastStateChange,
    };
  }

  public forceState(state: CircuitState): void {
    logger.warn(`Manually forcing circuit breaker state`, {
      service: this.serviceName,
      from: this.state,
      to: state,
    });
    this.transition(state);
    if (state === CircuitState.CLOSED) {
      this.reset();
    }
  }
}

/**
 * Enhanced Service Client with advanced features
 */
export class EnhancedServiceClient extends EventEmitter {
  private client: AxiosInstance;
  private config: Required<EnhancedServiceClientConfig>;
  private circuitBreaker?: EnhancedCircuitBreaker;
  private requestCount = 0;
  private errorCount = 0;
  private totalResponseTime = 0;

  constructor(config: EnhancedServiceClientConfig) {
    super();

    // Get service endpoint from registry if targetService is provided
    let baseURL = config.baseURL;
    let timeout = config.timeout || 10000;
    let maxRetries = config.maxRetries || 3;

    if (config.targetService && !config.baseURL) {
      const endpoint = getServiceEndpoint(config.targetService);
      if (endpoint) {
        baseURL = endpoint.url;
        timeout = endpoint.timeout;
        maxRetries = endpoint.retries;
      }
    }

    if (!baseURL) {
      throw new Error('baseURL or targetService must be provided');
    }

    this.config = {
      serviceName: config.serviceName,
      targetService: config.targetService || 'unknown',
      baseURL,
      serviceApiKey: config.serviceApiKey || process.env.SERVICE_API_KEY || 'internal-service-key',
      timeout,
      maxRetries,
      retryDelay: config.retryDelay || 1000,
      exponentialBackoff: config.exponentialBackoff !== false,
      retryableStatusCodes: config.retryableStatusCodes || [408, 429, 500, 502, 503, 504],
      enableLogging: config.enableLogging !== false,
      enableCircuitBreaker: config.enableCircuitBreaker !== false,
      circuitBreakerThreshold: config.circuitBreakerThreshold || 5,
      circuitBreakerTimeout: config.circuitBreakerTimeout || 15000,
      circuitBreakerResetTimeout: config.circuitBreakerResetTimeout || 60000,
      headers: config.headers || {},
    };

    // Initialize circuit breaker
    if (this.config.enableCircuitBreaker) {
      this.circuitBreaker = new EnhancedCircuitBreaker(
        this.config.circuitBreakerThreshold,
        this.config.circuitBreakerTimeout,
        this.config.circuitBreakerResetTimeout,
        this.config.targetService
      );

      // Forward circuit breaker events
      this.circuitBreaker.on('stateChange', (data) => this.emit('circuitStateChange', data));
      this.circuitBreaker.on('success', (stats) => this.emit('circuitSuccess', stats));
      this.circuitBreaker.on('failure', (stats) => this.emit('circuitFailure', stats));
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

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const requestId = uuidv4();
        config.headers['X-Request-ID'] = requestId;
        config.headers['X-Request-Time'] = Date.now().toString();

        if (this.config.enableLogging) {
          logger.debug(`Request: ${config.method?.toUpperCase()} ${config.url}`, {
            requestId,
            service: this.config.targetService,
            data: config.data,
          });
        }

        this.emit('requestStart', { requestId, config });
        return config;
      },
      (error) => {
        logger.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        const requestId = response.config.headers['X-Request-ID'];
        const requestTime = parseInt(response.config.headers['X-Request-Time'] as string);
        const responseTime = Date.now() - requestTime;

        this.requestCount++;
        this.totalResponseTime += responseTime;

        if (this.config.enableLogging) {
          logger.debug(`Response: ${response.status} ${response.config.url} (${responseTime}ms)`, {
            requestId,
            service: this.config.targetService,
          });
        }

        if (this.circuitBreaker) {
          this.circuitBreaker.recordSuccess();
        }

        this.emit('requestSuccess', {
          requestId,
          status: response.status,
          responseTime,
        });

        return response;
      },
      async (error: AxiosError) => {
        const requestId = error.config?.headers['X-Request-ID'];
        const requestTime = error.config?.headers['X-Request-Time']
          ? parseInt(error.config.headers['X-Request-Time'] as string)
          : Date.now();
        const responseTime = Date.now() - requestTime;

        this.requestCount++;
        this.errorCount++;
        this.totalResponseTime += responseTime;

        if (this.config.enableLogging) {
          logger.error(`Response error: ${error.message} (${responseTime}ms)`, {
            requestId,
            service: this.config.targetService,
            status: error.response?.status,
            data: error.response?.data,
          });
        }

        if (this.circuitBreaker) {
          this.circuitBreaker.recordFailure();
        }

        this.emit('requestError', {
          requestId,
          error: error.message,
          status: error.response?.status,
          responseTime,
        });

        return Promise.reject(error);
      }
    );
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'PATCH', url, data });
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  private async request<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    // Check circuit breaker
    if (this.circuitBreaker && !this.circuitBreaker.allowRequest()) {
      const error = new Error(
        `Circuit breaker is OPEN for ${this.config.targetService} - service temporarily unavailable`
      );
      (error as any).code = 'CIRCUIT_BREAKER_OPEN';
      (error as any).service = this.config.targetService;
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

        const shouldRetry = this.shouldRetry(error, attempt);

        if (!shouldRetry) {
          throw this.transformError(error);
        }

        const delay = this.config.exponentialBackoff
          ? this.config.retryDelay * Math.pow(2, attempt - 1)
          : this.config.retryDelay;

        if (this.config.enableLogging) {
          logger.warn(
            `Request failed (attempt ${attempt}/${this.config.maxRetries}). Retrying in ${delay}ms...`,
            {
              service: this.config.targetService,
              method: config.method,
              url: config.url,
              error: error.message,
            }
          );
        }

        await this.sleep(delay);
      }
    }

    throw this.transformError(lastError);
  }

  private shouldRetry(error: AxiosError, attempt: number): boolean {
    if (attempt > this.config.maxRetries) {
      return false;
    }

    if (!error.response) {
      return true;
    }

    return this.config.retryableStatusCodes.includes(error.response.status);
  }

  private transformError(error: AxiosError): Error {
    if (!error.response) {
      const err = new Error(
        `Service unavailable: ${this.config.targetService} (${this.config.baseURL}) - ${error.message}`
      );
      (err as any).code = 'SERVICE_UNAVAILABLE';
      (err as any).service = this.config.targetService;
      (err as any).originalError = error;
      return err;
    }

    const statusCode = error.response.status;
    const responseData = error.response.data as any;

    let message = `Service error from ${this.config.targetService} (${statusCode}): ${error.message}`;
    if (responseData?.message) {
      message = responseData.message;
    }

    const err = new Error(message);
    (err as any).code = responseData?.code || `HTTP_${statusCode}`;
    (err as any).statusCode = statusCode;
    (err as any).service = this.config.targetService;
    (err as any).responseData = responseData;
    (err as any).originalError = error;

    return err;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public getCircuitBreakerState(): CircuitState | null {
    return this.circuitBreaker ? this.circuitBreaker.getState() : null;
  }

  public getCircuitBreakerStats(): CircuitBreakerStats | null {
    return this.circuitBreaker ? this.circuitBreaker.getStats() : null;
  }

  public forceCircuitState(state: CircuitState): void {
    if (this.circuitBreaker) {
      this.circuitBreaker.forceState(state);
    }
  }

  public getStats() {
    return {
      requests: this.requestCount,
      errors: this.errorCount,
      successRate: this.requestCount > 0 ? (this.requestCount - this.errorCount) / this.requestCount : 1,
      averageResponseTime: this.requestCount > 0 ? this.totalResponseTime / this.requestCount : 0,
      circuitBreaker: this.getCircuitBreakerStats(),
    };
  }

  public getAxiosInstance(): AxiosInstance {
    return this.client;
  }

  public updateServiceApiKey(apiKey: string): void {
    this.config.serviceApiKey = apiKey;
    this.client.defaults.headers.common['X-Service-Key'] = apiKey;
  }

  public updateBaseURL(baseURL: string): void {
    this.config.baseURL = baseURL;
    this.client.defaults.baseURL = baseURL;
  }
}

export function createEnhancedServiceClient(
  config: EnhancedServiceClientConfig
): EnhancedServiceClient {
  return new EnhancedServiceClient(config);
}

export default EnhancedServiceClient;
