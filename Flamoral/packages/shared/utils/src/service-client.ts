/**
 * ServiceClient
 * HTTP client for inter-service communication with retry logic and logging
 */

import type { Logger } from './logger';

export interface ServiceClientConfig {
  baseURL: string;
  serviceName: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  enableLogging?: boolean;
  logger?: Logger;
  headers?: Record<string, string>;
}

export interface RequestConfig {
  headers?: Record<string, string>;
  timeout?: number;
  params?: Record<string, any>;
}

export interface ServiceResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export class ServiceClientError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: any,
  ) {
    super(message);
    this.name = 'ServiceClientError';
  }
}

export class ServiceClient {
  private baseURL: string;
  private serviceName: string;
  private timeout: number;
  private maxRetries: number;
  private retryDelay: number;
  private enableLogging: boolean;
  private logger?: Logger;
  private defaultHeaders: Record<string, string>;

  constructor(config: ServiceClientConfig) {
    this.baseURL = config.baseURL.replace(/\/$/, ''); // Remove trailing slash
    this.serviceName = config.serviceName;
    this.timeout = config.timeout || 5000;
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
    this.enableLogging = config.enableLogging ?? true;
    this.logger = config.logger;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': `${config.serviceName}-service`,
      ...config.headers,
    };
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: any): void {
    if (this.enableLogging && this.logger) {
      this.logger[level](message, meta);
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private buildURL(path: string, params?: Record<string, any>): string {
    const url = new URL(path.startsWith('/') ? path.slice(1) : path, this.baseURL);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  private async executeRequest<T>(
    method: string,
    url: string,
    config?: RequestConfig,
    body?: any,
    retryCount = 0,
  ): Promise<ServiceResponse<T>> {
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      const headers = {
        ...this.defaultHeaders,
        ...config?.headers,
        'X-Request-ID': requestId,
      };

      this.log('debug', `Request [${method}] ${url}`, {
        requestId,
        method,
        url,
        retryCount,
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config?.timeout || this.timeout);

      const fetchOptions: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (body) {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new ServiceClientError(
          `Request failed with status ${response.status}`,
          response.status,
          responseData,
        );
      }

      this.log('debug', `Response [${method}] ${url}`, {
        requestId,
        status: response.status,
      });

      return {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      };
    } catch (error: any) {
      const shouldRetry = retryCount < this.maxRetries && this.isRetryableError(error);

      this.log('error', `Request failed [${method}] ${url}`, {
        requestId,
        error: error.message,
        retryCount,
        willRetry: shouldRetry,
      });

      if (shouldRetry) {
        const delay = this.retryDelay * Math.pow(2, retryCount); // Exponential backoff
        await this.sleep(delay);
        return this.executeRequest<T>(method, url, config, body, retryCount + 1);
      }

      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    // Retry on network errors, timeouts, and 5xx server errors
    if (error.name === 'AbortError') return true;
    if (error instanceof ServiceClientError) {
      return error.status ? error.status >= 500 : false;
    }
    return true; // Retry on unknown errors
  }

  /**
   * Perform a GET request
   */
  async get<T = any>(path: string, config?: RequestConfig): Promise<ServiceResponse<T>> {
    const url = this.buildURL(path, config?.params);
    return this.executeRequest<T>('GET', url, config);
  }

  /**
   * Perform a POST request
   */
  async post<T = any>(path: string, data?: any, config?: RequestConfig): Promise<ServiceResponse<T>> {
    const url = this.buildURL(path, config?.params);
    return this.executeRequest<T>('POST', url, config, data);
  }

  /**
   * Perform a PUT request
   */
  async put<T = any>(path: string, data?: any, config?: RequestConfig): Promise<ServiceResponse<T>> {
    const url = this.buildURL(path, config?.params);
    return this.executeRequest<T>('PUT', url, config, data);
  }

  /**
   * Perform a PATCH request
   */
  async patch<T = any>(path: string, data?: any, config?: RequestConfig): Promise<ServiceResponse<T>> {
    const url = this.buildURL(path, config?.params);
    return this.executeRequest<T>('PATCH', url, config, data);
  }

  /**
   * Perform a DELETE request
   */
  async delete<T = any>(path: string, config?: RequestConfig): Promise<ServiceResponse<T>> {
    const url = this.buildURL(path, config?.params);
    return this.executeRequest<T>('DELETE', url, config);
  }
}
