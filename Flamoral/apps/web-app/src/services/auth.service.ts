/**
 * Authentication Service - SECURE VERSION
 * Handles user authentication and session management
 * Uses httpOnly cookies - NO localStorage token storage
 */

import apiClient, { ApiError } from './api.client';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  photoUrl?: string;
  subscription?: string;
  isVerified: boolean;
  premiumTier?: string;
  coinBalance?: number;
  profileCompletion?: number;
}

export interface LoginResponse {
  user: User;
  // Tokens are no longer returned to client - stored in httpOnly cookies
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  dateOfBirth: string;
  gender: string;
}

class AuthService {
  // Only enable mock mode in development when explicitly no API URL is set
  // In production, we should NEVER use mock data
  private isMock = import.meta.env.MODE === 'development' &&
                   import.meta.env.VITE_USE_MOCKS === 'true' &&
                   !import.meta.env.VITE_API_URL;
  private cachedUser: User | null = null;

  constructor() {
    // Fail loudly in production if API URL is not configured
    if (import.meta.env.MODE === 'production' && !import.meta.env.VITE_API_URL) {
      console.error('CRITICAL: VITE_API_URL not configured in production');
    }
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    if (this.isMock) {
      const { mockApi } = await import('../mocks/mockApi');
      return mockApi.login(email, password);
    }

    // Backend returns { success: true, data: { user } }
    // Tokens are set in httpOnly cookies by the backend
    const response = await apiClient.post<{ success: boolean; data: { user: User } }>(
      '/api/v1/auth/login',
      { email, password },
      { skipAuth: true }
    );

    const loginResponse: LoginResponse = {
      user: response.data.user,
    };

    // Cache user data in memory only (not localStorage)
    this.cachedUser = response.data.user;

    // Store minimal user data in sessionStorage for UI persistence (non-sensitive)
    sessionStorage.setItem('currentUser', JSON.stringify(response.data.user));

    return loginResponse;
  }

  async register(data: RegisterData): Promise<LoginResponse> {
    if (this.isMock) {
      // Mock registration - create a complete user object
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
      const mockUser: User = {
        id: `user-${Date.now()}`,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        isVerified: false,
        profileCompletion: 20,
        subscription: 'free',
        coinBalance: 50,
      };
      const response: LoginResponse = { user: mockUser };
      this.cachedUser = mockUser;
      sessionStorage.setItem('currentUser', JSON.stringify(mockUser));
      return response;
    }

    // Backend returns { success: true, data: { user } }
    // Tokens are set in httpOnly cookies by the backend
    const response = await apiClient.post<{ success: boolean; data: { user: User } }>(
      '/api/v1/auth/register',
      data,
      { skipAuth: true }
    );

    const loginResponse: LoginResponse = {
      user: response.data.user,
    };

    // Cache user data
    this.cachedUser = response.data.user;
    sessionStorage.setItem('currentUser', JSON.stringify(response.data.user));

    return loginResponse;
  }

  async logout(): Promise<void> {
    if (this.isMock) {
      const { mockApi } = await import('../mocks/mockApi');
      await mockApi.logout();
      this.clearSession();
      return;
    }

    try {
      // Backend will clear httpOnly cookies
      await apiClient.post('/api/v1/auth/logout');
    } finally {
      this.clearSession();
    }
  }

  async getCurrentUser(): Promise<User> {
    // Return cached user if available
    if (this.cachedUser) {
      return this.cachedUser;
    }

    // Try to get from sessionStorage
    const sessionUser = sessionStorage.getItem('currentUser');
    if (sessionUser) {
      this.cachedUser = JSON.parse(sessionUser);
      if (!this.cachedUser) {
        throw new Error('Invalid cached user data');
      }
      return this.cachedUser;
    }

    if (this.isMock) {
      const { mockApi } = await import('../mocks/mockApi');
      return mockApi.getCurrentUser();
    }

    // Fetch from API - authentication via httpOnly cookie
    const user = await apiClient.get<User>('/api/v1/auth/me');
    this.cachedUser = user;
    sessionStorage.setItem('currentUser', JSON.stringify(user));
    return user;
  }

  async refreshToken(): Promise<void> {
    // Token refresh is handled automatically by api.client
    // This method is kept for compatibility but does nothing
    // The httpOnly refresh token cookie is sent automatically
    try {
      await apiClient.post('/api/v1/auth/refresh-token', {}, { skipAuth: true });
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }

  async forgotPassword(email: string): Promise<void> {
    if (this.isMock) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return;
    }

    await apiClient.post('/api/v1/auth/forgot-password', { email }, { skipAuth: true });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    if (this.isMock) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return;
    }

    await apiClient.post(
      '/api/v1/auth/reset-password',
      { token, newPassword },
      { skipAuth: true }
    );
  }

  async verifyEmail(token: string): Promise<void> {
    if (this.isMock) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return;
    }

    await apiClient.post('/api/v1/auth/verify-email', { token }, { skipAuth: true });
  }

  async resendVerificationEmail(): Promise<void> {
    if (this.isMock) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return;
    }

    await apiClient.post('/api/v1/auth/resend-verification');
  }

  isAuthenticated(): boolean {
    // Check if user data exists in cache or sessionStorage
    // The actual authentication is verified by the backend via httpOnly cookies
    return !!(this.cachedUser || sessionStorage.getItem('currentUser'));
  }

  private clearSession(): void {
    // Clear cached data
    this.cachedUser = null;
    sessionStorage.removeItem('currentUser');

    // NO MORE localStorage token removal - tokens are in httpOnly cookies
    // The backend clears the cookies
  }
}

export const authService = new AuthService();
export default authService;
