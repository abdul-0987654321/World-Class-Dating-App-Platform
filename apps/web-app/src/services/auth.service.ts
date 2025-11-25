/**
 * Authentication Service
 * Handles user authentication and session management
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
  token: string;
  refreshToken?: string;
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
  private isMock = !import.meta.env.VITE_API_URL;

  async login(email: string, password: string): Promise<LoginResponse> {
    if (this.isMock) {
      const { mockApi } = await import('../mocks/mockApi');
      return mockApi.login(email, password);
    }

    const response = await apiClient.post<LoginResponse>(
      '/api/auth/login',
      { email, password },
      { skipAuth: true }
    );

    this.saveSession(response);
    return response;
  }

  async register(data: RegisterData): Promise<LoginResponse> {
    if (this.isMock) {
      // Mock registration
      const mockUser = {
        id: `user-${Date.now()}`,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        isVerified: false,
        profileCompletion: 20,
      };
      const token = `mock-token-${mockUser.id}`;
      localStorage.setItem('authToken', token);
      localStorage.setItem('currentUser', JSON.stringify(mockUser));
      return { user: mockUser as User, token };
    }

    const response = await apiClient.post<LoginResponse>(
      '/api/auth/register',
      data,
      { skipAuth: true }
    );

    this.saveSession(response);
    return response;
  }

  async logout(): Promise<void> {
    if (this.isMock) {
      const { mockApi } = await import('../mocks/mockApi');
      await mockApi.logout();
      return;
    }

    try {
      await apiClient.post('/api/auth/logout');
    } finally {
      this.clearSession();
    }
  }

  async getCurrentUser(): Promise<User> {
    if (this.isMock) {
      const { mockApi } = await import('../mocks/mockApi');
      return mockApi.getCurrentUser();
    }

    return apiClient.get<User>('/api/auth/me');
  }

  async refreshToken(): Promise<LoginResponse> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiClient.post<LoginResponse>(
      '/api/auth/refresh',
      { refreshToken },
      { skipAuth: true }
    );

    this.saveSession(response);
    return response;
  }

  async forgotPassword(email: string): Promise<void> {
    if (this.isMock) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return;
    }

    await apiClient.post('/api/auth/forgot-password', { email }, { skipAuth: true });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    if (this.isMock) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return;
    }

    await apiClient.post(
      '/api/auth/reset-password',
      { token, newPassword },
      { skipAuth: true }
    );
  }

  async verifyEmail(token: string): Promise<void> {
    if (this.isMock) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return;
    }

    await apiClient.post('/api/auth/verify-email', { token }, { skipAuth: true });
  }

  async resendVerificationEmail(): Promise<void> {
    if (this.isMock) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return;
    }

    await apiClient.post('/api/auth/resend-verification');
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken');
  }

  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  private saveSession(response: LoginResponse): void {
    localStorage.setItem('authToken', response.token);
    localStorage.setItem('currentUser', JSON.stringify(response.user));
    if (response.refreshToken) {
      localStorage.setItem('refreshToken', response.refreshToken);
    }
  }

  private clearSession(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('refreshToken');
  }
}

export const authService = new AuthService();
export default authService;
