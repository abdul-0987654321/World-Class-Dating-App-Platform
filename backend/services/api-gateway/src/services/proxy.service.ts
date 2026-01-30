import { Injectable, HttpException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

export interface ServiceConfig {
  name: string;
  url: string;
  timeout?: number;
}

/** Map service names to their timeout config keys */
const SERVICE_TIMEOUT_MAP: Record<string, string> = {
  authService: 'serviceTimeouts.auth',
  mediaService: 'serviceTimeouts.media',
  paymentService: 'serviceTimeouts.payment',
};

/** HTTP status codes that indicate a transient failure worth retrying */
const RETRYABLE_STATUS_CODES = new Set([502, 503, 504]);

/** Max number of retries for transient failures */
const MAX_RETRIES = 2;

/** Base delay in ms between retries (exponential backoff) */
const RETRY_BASE_DELAY_MS = 300;

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private readonly services: Map<string, AxiosInstance> = new Map();
  private readonly internalServiceKey: string;

  constructor(private readonly configService: ConfigService) {
    this.internalServiceKey = this.configService.get<string>('internalServiceKey');
    this.initializeServices();
  }

  private initializeServices(): void {
    const servicesConfig = this.configService.get<Record<string, string>>('services');

    if (servicesConfig) {
      Object.entries(servicesConfig).forEach(([name, url]) => {
        const timeoutKey = SERVICE_TIMEOUT_MAP[name] || 'serviceTimeouts.default';
        const timeout = this.configService.get<number>(timeoutKey) || 30000;
        this.registerService(name, url, timeout);
      });
    }
  }

  private registerService(name: string, url: string, timeout = 30000): void {
    const axiosInstance = axios.create({
      baseURL: url,
      timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': this.internalServiceKey,
      },
    });

    // Request interceptor for logging
    axiosInstance.interceptors.request.use(
      (config) => {
        this.logger.debug(`Proxying ${config.method?.toUpperCase()} ${config.url} to ${name}`);
        return config;
      },
      (error) => {
        this.logger.error(`Request error for ${name}:`, error.message);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    axiosInstance.interceptors.response.use(
      (response) => {
        this.logger.debug(`Response from ${name}: ${response.status}`);
        return response;
      },
      (error) => {
        this.logger.error(`Response error from ${name}:`, error.message);
        return Promise.reject(error);
      }
    );

    this.services.set(name, axiosInstance);
    this.logger.log(`Registered service: ${name} -> ${url}`);
  }

  private getService(serviceName: string): AxiosInstance {
    const service = this.services.get(serviceName);
    if (!service) {
      this.logger.error(`Service ${serviceName} is not registered`);
      throw new HttpException(
        { code: 'SERVICE_NOT_FOUND', message: `Service ${serviceName} is not configured` },
        503,
      );
    }
    return service;
  }

  /**
   * Forward a request to a specific service with retry logic for transient failures.
   * Only idempotent methods (GET, PUT, DELETE, HEAD, OPTIONS) are retried by default.
   * POST is NOT retried to avoid duplicate side effects.
   */
  async forward<T = any>(
    serviceName: string,
    method: string,
    path: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<T> {
    const service = this.getService(serviceName);

    const config: AxiosRequestConfig = {
      method,
      url: path,
      data,
      headers: headers ? { ...headers } : undefined,
    };

    const isIdempotent = ['GET', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
    const maxAttempts = isIdempotent ? MAX_RETRIES + 1 : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response: AxiosResponse<T> = await service.request(config);
        return response.data;
      } catch (error: any) {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status || 500;
          const responseData = error.response?.data;
          const isTransient =
            RETRYABLE_STATUS_CODES.has(status) ||
            error.code === 'ECONNRESET' ||
            error.code === 'ECONNREFUSED' ||
            error.code === 'ETIMEDOUT';

          // Retry transient failures on idempotent methods
          if (isTransient && attempt < maxAttempts) {
            const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
            this.logger.warn(
              `Transient error ${status} from ${serviceName} (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms`
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          this.logger.error(
            `Error ${status} from ${serviceName} ${method} ${path}: ${JSON.stringify(responseData)}`
          );
          throw new HttpException(
            responseData || { code: 'SERVICE_ERROR', message: error.message },
            status,
          );
        }
        throw new HttpException(
          { code: 'SERVICE_COMMUNICATION_ERROR', message: 'Service communication error' },
          500,
        );
      }
    }

    // Unreachable in practice, but TypeScript needs an explicit return/throw
    // to guarantee the Promise<T> contract. This guards against logic errors
    // if the retry loop is ever refactored.
    throw new HttpException(
      { code: 'SERVICE_COMMUNICATION_ERROR', message: 'Request failed after all retry attempts' },
      500,
    );
  }

  /**
   * Forward GET request
   */
  async get<T = any>(
    serviceName: string,
    path: string,
    headers?: Record<string, string>
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
    headers?: Record<string, string>
  ): Promise<T> {
    return this.forward<T>(serviceName, 'POST', path, data, headers);
  }

  /**
   * Forward POST request with raw body (Buffer)
   * Used for webhook endpoints that require raw body for signature verification
   */
  async postRaw<T = any>(
    serviceName: string,
    path: string,
    rawBody: Buffer | string,
    headers?: Record<string, string>
  ): Promise<T> {
    const service = this.getService(serviceName);

    const config: AxiosRequestConfig = {
      method: 'POST',
      url: path,
      data: rawBody,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      // Prevent axios from transforming the raw body
      transformRequest: [(data) => data],
    };

    try {
      const response: AxiosResponse<T> = await service.request(config);
      return response.data;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 500;
        const responseData = error.response?.data;
        this.logger.error(
          `Error ${status} from ${serviceName} postRaw ${path}: ${JSON.stringify(responseData)}`
        );
        throw new HttpException(
          responseData || { code: 'SERVICE_ERROR', message: error.message },
          status,
        );
      }
      throw new HttpException(
        { code: 'SERVICE_COMMUNICATION_ERROR', message: 'Service communication error' },
        500,
      );
    }
  }

  /**
   * Forward PUT request
   */
  async put<T = any>(
    serviceName: string,
    path: string,
    data?: any,
    headers?: Record<string, string>
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
    headers?: Record<string, string>
  ): Promise<T> {
    return this.forward<T>(serviceName, 'PATCH', path, data, headers);
  }

  /**
   * Forward DELETE request
   */
  async delete<T = any>(
    serviceName: string,
    path: string,
    headers?: Record<string, string>
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
