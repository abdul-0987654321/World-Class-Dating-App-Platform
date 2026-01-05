import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

import { createLogger } from './logger';

const logger = createLogger('service-client');

export interface ServiceClientConfig {
  baseUrl: string;
  serviceName: string;
  timeout?: number;
}

export class ServiceClient {
  private client: AxiosInstance;
  private serviceName: string;

  constructor(config: ServiceClientConfig) {
    this.serviceName = config.serviceName;
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Name': config.serviceName,
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        logger.info(`[${this.serviceName}] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error(`[${this.serviceName}] Request error:`, error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.info(
          `[${this.serviceName}] Response ${response.status} from ${response.config.url}`
        );
        return response;
      },
      (error) => {
        logger.error(
          `[${this.serviceName}] Response error:`,
          error.response?.status,
          error.message
        );
        return Promise.reject(error);
      }
    );
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}
