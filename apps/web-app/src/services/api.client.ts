/**
 * API Client
 * Central API client for Flamoral web application
 * Includes CSRF protection support
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  skipCsrf?: boolean;
}

class ApiClient {
  private baseUrl: string;
  private csrfToken: string | null = null;
  private csrfTokenPromise: Promise<string> | null = null;

  constructor() {
    this.baseUrl = API_BASE_URL;
    // Initialize CSRF token on construction
    this.initializeCsrfToken();
  }

  /**
   * Initialize CSRF token from cookie or fetch from server
   */
  private async initializeCsrfToken(): Promise<void> {
    // Try to get token from cookie first
    const cookieToken = this.getCsrfTokenFromCookie();
    if (cookieToken) {
      this.csrfToken = cookieToken;
      return;
    }

    // If no token in cookie, fetch from server
    await this.fetchCsrfToken();
  }

  /**
   * Get CSRF token from cookie
   */
  private getCsrfTokenFromCookie(): string | null {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'XSRF-TOKEN') {
        return decodeURIComponent(value);
      }
    }
    return null;
  }

  /**
   * Fetch CSRF token from server
   */
  private async fetchCsrfToken(): Promise<string> {
    // Prevent multiple simultaneous token fetches
    if (this.csrfTokenPromise) {
      const result = await this.csrfTokenPromise;
    if (!result) {
      throw new Error('Failed to fetch CSRF token');
    }
    return result;
    }

    this.csrfTokenPromise = (async () => {
      try {
        const response = await fetch(`${this.baseUrl}/api/v1/csrf/token`, {
          method: 'GET',
          credentials: 'include', // Important: include cookies
        });

        if (!response.ok) {
          throw new Error('Failed to fetch CSRF token');
        }

        const data = await response.json();
        this.csrfToken = data.csrfToken;
        if (!this.csrfToken) {
          throw new Error('CSRF token not found in response');
        }
        return this.csrfToken;
      } catch (error) {
        console.error('Error fetching CSRF token:', error);
        throw error;
      } finally {
        this.csrfTokenPromise = null;
      }
    })();

    return this.csrfTokenPromise;
  }

  /**
   * Get current CSRF token, fetching if necessary
   */
  private async getCsrfToken(): Promise<string> {
    // Try cookie first (most up-to-date)
    const cookieToken = this.getCsrfTokenFromCookie();
    if (cookieToken) {
      this.csrfToken = cookieToken;
      return cookieToken;
    }

    // Use cached token if available
    if (this.csrfToken) {
      return this.csrfToken;
    }

    // Fetch new token
    return this.fetchCsrfToken();
  }

  /**
   * Refresh CSRF token
   */
  async refreshCsrfToken(): Promise<string> {
    this.csrfToken = null;
    return this.fetchCsrfToken();
  }

  private getAuthHeader(): Record<string, string> {
    const token = localStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Get CSRF header
   */
  private async getCsrfHeader(skipCsrf: boolean): Promise<Record<string, string>> {
    if (skipCsrf) {
      return {};
    }

    const token = await this.getCsrfToken();
    return token ? { 'X-CSRF-Token': token } : {};
  }

  async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { skipAuth = false, skipCsrf = false, ...fetchOptions } = options;

    // Determine if CSRF token is needed (for state-changing methods)
    const needsCsrf = !skipCsrf && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(fetchOptions.method || 'GET');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(!skipAuth ? this.getAuthHeader() : {}),
      ...(needsCsrf ? await this.getCsrfHeader(skipCsrf) : {}),
      ...(fetchOptions.headers as Record<string, string> || {}),
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...fetchOptions,
      headers,
      credentials: 'include', // Important: include cookies for CSRF
    });

    // If CSRF token is invalid, try refreshing it once
    if (response.status === 403 && needsCsrf) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.message?.toLowerCase().includes('csrf')) {
        // Refresh token and retry
        await this.refreshCsrfToken();
        const retryHeaders = {
          ...headers,
          ...(await this.getCsrfHeader(skipCsrf)),
        };

        const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
          ...fetchOptions,
          headers: retryHeaders,
          credentials: 'include',
        });

        if (!retryResponse.ok) {
          const retryErrorData = await retryResponse.json().catch(() => ({}));
          throw new ApiError(
            retryErrorData.message || `Request failed with status ${retryResponse.status}`,
            retryResponse.status,
            retryErrorData
          );
        }

        const text = await retryResponse.text();
        if (!text) {
          return {} as T;
        }

        return JSON.parse(text);
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
