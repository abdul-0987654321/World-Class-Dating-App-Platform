/**
 * API Client for mobile app
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { ENV } from '@config/env';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  User,
  ApiError,
} from '../types';

export interface ApiClientConfig {
  baseURL?: string;
  getToken: () => string | null | Promise<string | null>;
}

export class ApiClient {
  private axiosInstance: AxiosInstance;
  private getToken: () => string | null | Promise<string | null>;

  constructor(config: ApiClientConfig) {
    this.getToken = config.getToken;
    this.axiosInstance = axios.create({
      baseURL: config.baseURL || ENV.API_BASE_URL,
      timeout: ENV.API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        const token = await this.getToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle errors
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiError>) => {
        if (error.response) {
          // Server responded with error status
          const apiError: ApiError = {
            statusCode: error.response.status,
            message: error.response.data?.message || error.message,
            error: error.response.data?.error,
            details: error.response.data?.details,
          };
          return Promise.reject(apiError);
        } else if (error.request) {
          // Request made but no response
          const apiError: ApiError = {
            statusCode: 0,
            message: 'Network error. Please check your connection.',
          };
          return Promise.reject(apiError);
        } else {
          // Something else happened
          const apiError: ApiError = {
            statusCode: 0,
            message: error.message || 'An unexpected error occurred',
          };
          return Promise.reject(apiError);
        }
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.delete<T>(url, config);
    return response.data;
  }
}

export class AuthApi {
  constructor(private client: ApiClient) {}

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return this.client.post<LoginResponse>('/auth/login', credentials);
  }

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    return this.client.post<RegisterResponse>('/auth/register', data);
  }

  async refreshToken(data: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    return this.client.post<RefreshTokenResponse>('/auth/refresh', data);
  }

  async logout(): Promise<void> {
    return this.client.post<void>('/auth/logout');
  }

  async getCurrentUser(): Promise<User> {
    return this.client.get<User>('/auth/me');
  }

  async forgotPassword(email: string): Promise<void> {
    return this.client.post<void>('/auth/forgot-password', { email });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    return this.client.post<void>('/auth/reset-password', { token, newPassword });
  }
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}
