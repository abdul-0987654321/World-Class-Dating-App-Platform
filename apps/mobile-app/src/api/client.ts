/**
 * API Client for mobile app
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
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
import { API_BASE_URL } from '../services/config';

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
      baseURL: config.baseURL || API_BASE_URL,
      timeout: 30000,
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
    return this.client.post<LoginResponse>('/api/v1/auth/login', credentials);
  }

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    // Transform to backend format with snake_case and consents
    const backendData = {
      email: data.email,
      password: data.password,
      first_name: data.firstName,
      last_name: data.lastName || '',
      date_of_birth: data.dateOfBirth,
      gender: data.gender,
      interested_in: data.interestedIn,
      phone_number: data.phoneNumber,
      consents: {
        terms_accepted: data.consents?.terms ?? true,
        privacy_accepted: data.consents?.privacy ?? true,
        marketing_emails: data.consents?.marketing ?? false,
      },
    };
    return this.client.post<RegisterResponse>('/api/v1/auth/register', backendData);
  }

  async refreshToken(data: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    return this.client.post<RefreshTokenResponse>('/api/v1/auth/refresh-token', data);
  }

  async logout(): Promise<void> {
    return this.client.post<void>('/api/v1/auth/logout');
  }

  async getCurrentUser(): Promise<User> {
    return this.client.get<User>('/api/v1/auth/me');
  }

  async forgotPassword(email: string): Promise<void> {
    return this.client.post<void>('/api/v1/auth/forgot-password', { email });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    return this.client.post<void>('/api/v1/auth/reset-password', { token, newPassword });
  }
}

export interface OnboardingProfileData {
  name: string;
  birthday: string;
  gender: string;
  interestedIn: string[];
  photos: string[];
  interests: string[];
  prompts: { question: string; answer: string }[];
  location?: { latitude: number; longitude: number };
  lifestyle?: Record<string, string>;
  relationshipGoals?: string;
}

export class ProfileApi {
  constructor(private client: ApiClient) {}

  async createProfile(data: OnboardingProfileData): Promise<User> {
    return this.client.post<User>('/api/v1/profiles', data);
  }

  async updateProfile(data: Partial<OnboardingProfileData>): Promise<User> {
    return this.client.patch<User>('/api/v1/profiles/me', data);
  }

  async getProfile(): Promise<User> {
    return this.client.get<User>('/api/v1/profiles/me');
  }

  async uploadPhoto(photo: FormData): Promise<{ url: string }> {
    return this.client.post<{ url: string }>('/api/v1/profiles/photos', photo, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  async deletePhoto(photoUrl: string): Promise<void> {
    return this.client.delete<void>('/api/v1/profiles/photos', { data: { url: photoUrl } });
  }
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}
