import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';

import config from '../config';

/**
 * Service Client Configuration
 */
interface ServiceClientConfig {
  baseURL: string;
  serviceName: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Service Client
 * HTTP client for service-to-service communication with authentication
 */
export class ServiceClient {
  private client: AxiosInstance;
  private serviceName: string;
  private maxRetries: number;
  private retryDelay: number;

  constructor(clientConfig: ServiceClientConfig) {
    this.serviceName = clientConfig.serviceName;
    this.maxRetries = clientConfig.maxRetries || 3;
    this.retryDelay = clientConfig.retryDelay || 1000;

    this.client = axios.create({
      baseURL: clientConfig.baseURL,
      timeout: clientConfig.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for authentication
    this.client.interceptors.request.use((config) => {
      config.headers['X-Service-Key'] = process.env.SERVICE_API_KEY || '';
      config.headers['X-Source-Service'] = this.serviceName;
      config.headers['X-Request-ID'] = uuidv4();
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const config = error.config;

        // Retry logic
        if (!config._retryCount) {
          config._retryCount = 0;
        }

        if (config._retryCount < this.maxRetries && this.shouldRetry(error)) {
          config._retryCount++;
          await this.delay(this.retryDelay * config._retryCount);
          return this.client(config);
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * GET request
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config);
  }

  /**
   * POST request
   */
  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, config);
  }

  /**
   * PUT request
   */
  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.client.put<T>(url, data, config);
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete<T>(url, config);
  }

  /**
   * Check if error should be retried
   */
  private shouldRetry(error: any): boolean {
    if (!error.response) {
      return true; // Network error
    }

    const status = error.response.status;
    return status === 408 || status === 429 || status >= 500;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
