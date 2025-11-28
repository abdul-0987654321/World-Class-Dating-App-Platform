import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { createLogger } from '../utils/logger';

const logger = createLogger('service-client');

export interface ServiceClientConfig {
  baseUrl: string;
  serviceName: string;
  timeout?: number;
  serviceKey?: string;
}

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
}

/**
 * Service Client for inter-service communication
 * Provides a standardized way for microservices to communicate with each other
 */
export class ServiceClient {
  private client: AxiosInstance;
  private serviceName: string;

  constructor(config: ServiceClientConfig) {
    this.serviceName = config.serviceName;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (config.serviceKey) {
      headers['X-Service-Key'] = config.serviceKey;
    }

    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      headers,
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (reqConfig) => {
        logger.debug(`[${this.serviceName}] Request: ${reqConfig.method?.toUpperCase()} ${reqConfig.url}`);
        return reqConfig;
      },
      (error) => {
        logger.error(`[${this.serviceName}] Request error:`, error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`[${this.serviceName}] Response: ${response.status}`);
        return response;
      },
      (error) => {
        const status = error.response?.status || 500;
        const message = error.response?.data?.error || error.message;
        logger.error(`[${this.serviceName}] Response error: ${status} - ${message}`);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Make a request to the service
   */
  private async request<T>(
    method: string,
    path: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<ServiceResponse<T>> {
    try {
      const config: AxiosRequestConfig = {
        method,
        url: path,
        data,
        headers,
      };

      const response: AxiosResponse = await this.client.request(config);

      return {
        success: true,
        data: response.data,
        statusCode: response.status,
      };
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: error.response?.data?.error || error.message,
          statusCode: error.response?.status || 500,
        };
      }

      return {
        success: false,
        error: 'Unknown error occurred',
        statusCode: 500,
      };
    }
  }

  /**
   * GET request
   */
  async get<T = any>(
    path: string,
    headers?: Record<string, string>
  ): Promise<ServiceResponse<T>> {
    return this.request<T>('GET', path, undefined, headers);
  }

  /**
   * POST request
   */
  async post<T = any>(
    path: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<ServiceResponse<T>> {
    return this.request<T>('POST', path, data, headers);
  }

  /**
   * PUT request
   */
  async put<T = any>(
    path: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<ServiceResponse<T>> {
    return this.request<T>('PUT', path, data, headers);
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    path: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<ServiceResponse<T>> {
    return this.request<T>('PATCH', path, data, headers);
  }

  /**
   * DELETE request
   */
  async delete<T = any>(
    path: string,
    headers?: Record<string, string>
  ): Promise<ServiceResponse<T>> {
    return this.request<T>('DELETE', path, undefined, headers);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get('/health');
      return response.success && response.statusCode === 200;
    } catch {
      return false;
    }
  }

  /**
   * Forward user's authorization header
   */
  withAuth(authHeader: string): Record<string, string> {
    return {
      Authorization: authHeader,
    };
  }
}

/**
 * Service Registry - manages connections to all microservices
 */
export class ServiceRegistry {
  private services: Map<string, ServiceClient> = new Map();
  private serviceKey: string;

  constructor(serviceKey: string = 'internal-service-key') {
    this.serviceKey = serviceKey;
  }

  /**
   * Register a service
   */
  register(serviceName: string, baseUrl: string, timeout?: number): void {
    const client = new ServiceClient({
      serviceName,
      baseUrl,
      timeout,
      serviceKey: this.serviceKey,
    });

    this.services.set(serviceName, client);
    logger.info(`Registered service: ${serviceName} -> ${baseUrl}`);
  }

  /**
   * Get a service client
   */
  get(serviceName: string): ServiceClient | undefined {
    return this.services.get(serviceName);
  }

  /**
   * Check if a service is registered
   */
  has(serviceName: string): boolean {
    return this.services.has(serviceName);
  }

  /**
   * Get all registered service names
   */
  getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Check health of all services
   */
  async healthCheckAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [name, client] of this.services) {
      results[name] = await client.healthCheck();
    }

    return results;
  }
}

/**
 * Pre-configured service clients factory
 */
export function createServiceClients(config: {
  authServiceUrl?: string;
  userServiceUrl?: string;
  matchingServiceUrl?: string;
  messagingServiceUrl?: string;
  mediaServiceUrl?: string;
  notificationServiceUrl?: string;
  serviceKey?: string;
}): ServiceRegistry {
  const registry = new ServiceRegistry(config.serviceKey);

  if (config.authServiceUrl) {
    registry.register('auth', config.authServiceUrl);
  }

  if (config.userServiceUrl) {
    registry.register('user', config.userServiceUrl);
  }

  if (config.matchingServiceUrl) {
    registry.register('matching', config.matchingServiceUrl);
  }

  if (config.messagingServiceUrl) {
    registry.register('messaging', config.messagingServiceUrl);
  }

  if (config.mediaServiceUrl) {
    registry.register('media', config.mediaServiceUrl);
  }

  if (config.notificationServiceUrl) {
    registry.register('notification', config.notificationServiceUrl);
  }

  return registry;
}
