import { Injectable, HttpException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

export interface ServiceConfig {
  name: string;
  url: string;
  timeout?: number;
}

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
        this.registerService(name, url);
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
      throw new HttpException(`Service ${serviceName} not found`, 500);
    }
    return service;
  }

  /**
   * Forward a request to a specific service
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

    try {
      const response: AxiosResponse<T> = await service.request(config);
      return response.data;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 500;
        const responseData = error.response?.data;
        this.logger.error(`Error ${status} from ${serviceName}: ${JSON.stringify(responseData)}`);
        throw new HttpException(responseData || { error: error.message }, status);
      }
      throw new HttpException('Service communication error', 500);
    }
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
        this.logger.error(`Error ${status} from ${serviceName}: ${JSON.stringify(responseData)}`);
        throw new HttpException(responseData || { error: error.message }, status);
      }
      throw new HttpException('Service communication error', 500);
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
