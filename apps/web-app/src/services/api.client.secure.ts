/**
 * API Client - SECURE VERSION
 * Central API client for Flamoral web application
 * Uses httpOnly cookies for authentication instead of localStorage
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { skipAuth = false, ...fetchOptions } = options;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string> || {}),
    };

    // Include credentials to send httpOnly cookies
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...fetchOptions,
      headers,
      credentials: 'include', // CRITICAL: Send cookies with requests
    });

    // Handle 401 Unauthorized - attempt token refresh
    if (response.status === 401 && !skipAuth && !endpoint.includes('/refresh-token')) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        // Retry the original request
        return this.request<T>(endpoint, options);
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || `Request failed with status ${response.status}`,
        response.status,
        errorData
      );
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text);
  }

  /**
   * Refresh access token using httpOnly refresh token cookie
   */
  private async refreshToken(): Promise<boolean> {
    try {
      await fetch(`${this.baseUrl}/api/auth/refresh-token`, {
        method: 'POST',
        credentials: 'include', // Send refresh token cookie
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Clear any user session data and redirect to login
      window.location.href = '/login';
      return false;
    }
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // Check if we're in mock mode
  static get isMockMode(): boolean {
    return !API_BASE_URL;
  }
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
