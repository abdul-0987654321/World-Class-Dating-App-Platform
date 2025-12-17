import { Injectable, HttpException, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { CircuitBreakerService } from './circuit-breaker.service';
import { v4 as uuidv4 } from 'uuid';
import http from 'http';
import https from 'https';

// HTTP connection pool for better performance
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 100,
  maxFreeSockets: 10,
  timeout: 60000,
  scheduling: 'lifo'
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 100,
  maxFreeSockets: 10,
  timeout: 60000,
  scheduling: 'lifo'
});

export interface ServiceConfig {
  name: string;
  url: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  critical?: boolean; // Whether this service is critical (no fallback)
}

interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryableStatusCodes: number[];
  retryableErrors: string[];
}

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private readonly services: Map<string, AxiosInstance> = new Map();
  private readonly serviceConfigs: Map<string, ServiceConfig> = new Map();
  private readonly internalServiceKey: string;

  // Timeout hierarchy: Gateway timeout < Service timeout < DB timeout
  // This ensures upstream times out before downstream to avoid orphaned requests
  private readonly serviceTimeouts: Record<string, number> = {
    authService: 5000,      // Auth is fast, 5s
    userService: 10000,     // User service, 10s
    profileService: 10000,  // Profile service, 10s
    messagingService: 15000, // Messaging can be slower, 15s
    mediaService: 45000,    // Media uploads are slow, 45s
    moderationService: 20000, // Moderation AI calls, 20s
    paymentService: 30000,  // Payment needs time, 30s
    analyticsService: 10000, // Analytics, 10s
    notificationService: 10000, // Notifications, 10s
    matchingService: 15000, // Matching algorithm, 15s
    advertisingService: 10000, // Ads, 10s
    aiService: 30000,       // AI inference, 30s
    adminService: 15000,    // Admin operations, 15s
    default: 15000,         // Default 15s
  };

  private readonly retryConfig: RetryConfig = {
    maxRetries: parseInt(process.env.PROXY_MAX_RETRIES, 10) || 1, // Max 1 retry (2 total attempts) for faster failure response
    retryDelay: parseInt(process.env.PROXY_RETRY_DELAY, 10) || 500, // 500ms initial delay
    retryableStatusCodes: [502, 503, 504], // Only retry gateway/unavailable errors, NOT 500
    retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EPIPE'],
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {
    this.internalServiceKey = this.configService.get<string>('internalServiceKey');
    this.initializeServices();
  }

  private initializeServices(): void {
    const servicesConfig = this.configService.get<Record<string, string>>('services');

    if (servicesConfig) {
      Object.entries(servicesConfig).forEach(([name, url]) => {
        const timeout = this.serviceTimeouts[name] || this.serviceTimeouts.default;
        this.registerService(name, url, timeout);
      });
    }
  }

  private registerService(name: string, url: string, timeout: number): void {
    const config: ServiceConfig = {
      name,
      url,
      timeout,
      maxRetries: this.retryConfig.maxRetries,
      retryDelay: this.retryConfig.retryDelay,
      critical: ['authService', 'paymentService'].includes(name),
    };

    this.serviceConfigs.set(name, config);

    const axiosInstance = axios.create({
      baseURL: url,
      timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': this.internalServiceKey,
      },
      httpAgent,
      httpsAgent,
      // Validate status - only 2xx and 3xx are success
      validateStatus: (status) => status >= 200 && status < 400,
    });

    // Request interceptor - add tracing and logging
    axiosInstance.interceptors.request.use(
      (requestConfig) => {
        const requestId = uuidv4();
        requestConfig.headers['X-Request-ID'] = requestId;
        requestConfig.headers['X-Request-Start'] = Date.now().toString();

        this.logger.debug(`[${requestId}] Proxying ${requestConfig.method?.toUpperCase()} ${requestConfig.url} to ${name}`);
        return requestConfig;
      },
      (error) => {
        this.logger.error(`Request error for ${name}:`, error.message);
        return Promise.reject(error);
      },
    );

    // Response interceptor - add timing and logging
    axiosInstance.interceptors.response.use(
      (response) => {
        const requestId = response.config.headers['X-Request-ID'];
        const startTime = parseInt(response.config.headers['X-Request-Start'] as string, 10);
        const duration = Date.now() - startTime;

        this.logger.debug(`[${requestId}] Response from ${name}: ${response.status} (${duration}ms)`);
        return response;
      },
      (error: AxiosError) => {
        const requestId = error.config?.headers?.['X-Request-ID'];
        const startTime = error.config?.headers?.['X-Request-Start'];
        const duration = startTime ? Date.now() - parseInt(startTime as string, 10) : 0;

        this.logger.warn(`[${requestId}] Error from ${name}: ${error.message} (${duration}ms)`);
        return Promise.reject(error);
      },
    );

    this.services.set(name, axiosInstance);
    this.logger.log(`Registered service: ${name} -> ${url} (timeout: ${timeout}ms)`);
  }

  private getService(serviceName: string): AxiosInstance {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new HttpException(`Service ${serviceName} not found`, 500);
    }
    return service;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: AxiosError): boolean {
    // Network errors
    if (!error.response && error.code) {
      return this.retryConfig.retryableErrors.includes(error.code);
    }

    // HTTP errors
    if (error.response) {
      return this.retryConfig.retryableStatusCodes.includes(error.response.status);
    }

    return false;
  }

  /**
   * Execute request with retry logic with exponential backoff and jitter
   */
  private async executeWithRetry<T>(
    serviceName: string,
    requestFn: () => Promise<AxiosResponse<T>>,
    attempt = 0,
  ): Promise<AxiosResponse<T>> {
    const config = this.serviceConfigs.get(serviceName);
    const maxRetries = config?.maxRetries ?? this.retryConfig.maxRetries;

    try {
      return await requestFn();
    } catch (error) {
      const axiosError = error as AxiosError;

      // Check if we should retry
      if (attempt < maxRetries && this.isRetryableError(axiosError)) {
        // Exponential backoff with jitter to prevent thundering herd
        const baseDelay = this.retryConfig.retryDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 0.3 * baseDelay; // 0-30% jitter
        const delay = Math.floor(baseDelay + jitter);

        this.logger.warn(`Retrying ${serviceName} request (attempt ${attempt + 1}/${maxRetries}) after ${delay}ms`);

        await this.sleep(delay);
        return this.executeWithRetry(serviceName, requestFn, attempt + 1);
      }

      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Forward a request to a specific service with circuit breaker and retry protection
   */
  async forward<T = any>(
    serviceName: string,
    method: string,
    path: string,
    data?: any,
    headers?: Record<string, string>,
  ): Promise<T> {
    const serviceConfig = this.serviceConfigs.get(serviceName);

    // Use circuit breaker to protect against cascading failures
    return this.circuitBreaker.execute(
      serviceName,
      async () => {
        const service = this.getService(serviceName);

        const config: AxiosRequestConfig = {
          method,
          url: path,
          data,
          headers: headers ? { ...headers } : undefined,
        };

        try {
          // Execute with retry logic
          const response = await this.executeWithRetry<T>(
            serviceName,
            () => service.request(config),
          );
          return response.data;
        } catch (error: any) {
          if (axios.isAxiosError(error)) {
            const status = error.response?.status || 500;
            const responseData = error.response?.data;

            // Preserve the original error message and status
            const message = responseData?.message || responseData?.error || error.message;

            // Create error with additional context
            const httpError = new HttpException(
              {
                message,
                service: serviceName,
                path,
                statusCode: status,
              },
              status,
            );
            (httpError as any).statusCode = status;
            throw httpError;
          }

          // Network or timeout error
          const networkError = new HttpException(
            {
              message: 'Service communication error',
              service: serviceName,
              path,
              originalError: error.message,
            },
            503,
          );
          (networkError as any).statusCode = 503;
          throw networkError;
        }
      },
      // Fallback function - returns graceful degradation response where possible
      this.createFallback(serviceName, method, path),
    );
  }

  /**
   * Create a fallback function for a service
   * Returns cached data or graceful degradation response where appropriate
   */
  private createFallback<T>(
    serviceName: string,
    method: string,
    path: string,
  ): () => Promise<T> {
    return async () => {
      this.logger.warn(`Circuit breaker fallback triggered for ${serviceName} - ${method} ${path}`);

      const serviceConfig = this.serviceConfigs.get(serviceName);
      const circuitStatus = this.circuitBreaker.getCircuitStatus(serviceName);

      // Critical services should not have fallbacks - provide detailed error context
      if (serviceConfig?.critical) {
        const errorContext = {
          statusCode: 503,
          error: 'Service Unavailable',
          message: `Critical service ${serviceName} is temporarily unavailable. Please try again shortly.`,
          retryAfter: 30, // Suggest retry after 30 seconds
          service: serviceName,
          path,
          method,
          circuitState: circuitStatus.state,
          failureCount: circuitStatus.failures,
          lastFailureTime: circuitStatus.lastFailureTime,
          timestamp: Date.now(),
        };

        this.logger.error(`Critical service fallback: ${JSON.stringify(errorContext)}`);

        throw new HttpException(errorContext, 503);
      }

      // For non-critical GET requests, return empty/degraded response
      if (method === 'GET') {
        // Return empty arrays for list endpoints
        if (path.includes('/list') || path.endsWith('s') || path.includes('/all')) {
          this.logger.warn(`Returning empty list fallback for ${serviceName} ${path}`);
          return [] as unknown as T;
        }

        // Return null for single item endpoints
        this.logger.warn(`Returning null fallback for ${serviceName} ${path}`);
        return null as unknown as T;
      }

      // For mutations, throw service unavailable with detailed context
      const errorContext = {
        statusCode: 503,
        error: 'Service Unavailable',
        message: `Service ${serviceName} is temporarily unavailable. Please try again shortly.`,
        retryAfter: 30,
        service: serviceName,
        path,
        method,
        circuitState: circuitStatus.state,
        timestamp: Date.now(),
      };

      this.logger.error(`Non-critical service fallback: ${JSON.stringify(errorContext)}`);

      throw new HttpException(errorContext, 503);
    };
  }

  /**
   * Forward GET request
   */
  async get<T = any>(
    serviceName: string,
    path: string,
    headers?: Record<string, string>,
  ): Promise<T> {
    return this.forward<T>(serviceName, 'GET', path, undefined, headers);
  }

  /**
   * Forward POST request
   */
  async post<T = any>(
    serviceName: string,
    path: string,
    data?: any,
    headers?: Record<string, string>,
  ): Promise<T> {
    return this.forward<T>(serviceName, 'POST', path, data, headers);
  }

  /**
   * Forward PUT request
   */
  async put<T = any>(
    serviceName: string,
    path: string,
    data?: any,
    headers?: Record<string, string>,
  ): Promise<T> {
    return this.forward<T>(serviceName, 'PUT', path, data, headers);
  }

  /**
   * Forward PATCH request
   */
  async patch<T = any>(
    serviceName: string,
    path: string,
    data?: any,
    headers?: Record<string, string>,
  ): Promise<T> {
    return this.forward<T>(serviceName, 'PATCH', path, data, headers);
  }

  /**
   * Forward DELETE request
   */
  async delete<T = any>(
    serviceName: string,
    path: string,
    headers?: Record<string, string>,
  ): Promise<T> {
    return this.forward<T>(serviceName, 'DELETE', path, undefined, headers);
  }

  /**
   * Check if a service is available
   */
  async healthCheck(serviceName: string): Promise<boolean> {
    try {
      await this.get(serviceName, '/health');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all registered service names
   */
  getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }
}
