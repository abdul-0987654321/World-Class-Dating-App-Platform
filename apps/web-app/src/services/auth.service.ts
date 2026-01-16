/**
 * Authentication Service
 * Handles user authentication and session management
 */

import { authTokenService } from './auth-token.service';
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

export interface Entitlements {
  tier: string;
  features: string[];
  limits: {
    dailyLikes: number;
    dailySuperLikes: number;
    dailyBoosts: number;
    messagesBeforeMatch: boolean;
    seeWhoLikesYou: boolean;
    advancedFilters: boolean;
    readReceipts: boolean;
    incognitoMode: boolean;
    videoCalls: boolean;
    prioritySupport: boolean;
  };
  expiresAt?: string;
}

export interface SessionResponse {
  user: User;
  entitlements: Entitlements;
  isAuthenticated: boolean;
}

export interface LoginResponse {
  user: User;
  token?: string; // Deprecated: tokens now in httpOnly cookies
  accessToken?: string; // Deprecated: tokens now in httpOnly cookies
  refreshToken?: string; // Deprecated: tokens now in httpOnly cookies
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
  private cachedUser: User | null = null;
  private cachedEntitlements: Entitlements | null = null;
  private isMock = !import.meta.env.VITE_API_URL;

  async login(email: string, password: string): Promise<LoginResponse> {
    if (this.isMock) {
      const { mockApi } = await import('../mocks/mockApi');
      return mockApi.login(email, password);
    }

    // Backend returns { success: true, data: { user } }
    // Tokens are now set in httpOnly cookies by the backend (not in response body)
    const response = await apiClient.post<{ success: boolean; data: { user: User } }>(
      '/api/v1/auth/login',
      { email, password },
      { skipAuth: true, skipCsrf: true }
    );

    // Create LoginResponse with user data only
    // Tokens are in httpOnly cookies, not accessible to JavaScript (XSS protection)
    const loginResponse: LoginResponse = {
      user: response.data.user,
      // Note: tokens are no longer in the response - they're in httpOnly cookies
    };

    this.saveSession(loginResponse);
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
      const token = `mock-token-${mockUser.id}`;
      const response: LoginResponse = { user: mockUser, token };
      this.saveSession(response);
      return response;
    }

    // Transform camelCase to snake_case for backend
    const backendData = {
      email: data.email,
      password: data.password,
      first_name: data.firstName,
      last_name: data.lastName || '',
      date_of_birth: data.dateOfBirth,
      gender: data.gender,
      consents: {
        terms_accepted: true,
        privacy_accepted: true,
        marketing_emails: false,
      },
    };

    // Backend returns { success: true, data: { user } }
    // Tokens are now set in httpOnly cookies by the backend (not in response body)
    const response = await apiClient.post<{ success: boolean; data: { user: User } }>(
      '/api/v1/auth/register',
      backendData,
      { skipAuth: true, skipCsrf: true }
    );

    // Create LoginResponse with user data only
    // Tokens are in httpOnly cookies, not accessible to JavaScript (XSS protection)
    const loginResponse: LoginResponse = {
      user: response.data.user,
      // Note: tokens are no longer in the response - they're in httpOnly cookies
    };

    this.saveSession(loginResponse);
    return loginResponse;
  }

  async logout(): Promise<void> {
    if (this.isMock) {
      const { mockApi } = await import('../mocks/mockApi');
      await mockApi.logout();
      return;
    }

    try {
      await apiClient.post('/api/v1/auth/logout');
    } finally {
      this.clearSession();
    }
  }

  async getCurrentUser(): Promise<User> {
    if (this.isMock) {
      const { mockApi } = await import('../mocks/mockApi');
      return mockApi.getCurrentUser();
    }

    return apiClient.get<User>('/api/v1/auth/me');
  }

  /**
   * Get current session with entitlements
   * Call this on app load to get user info and their current entitlements
   * Entitlements are for UI display only - server enforces actual limits
   */
  async getSession(): Promise<SessionResponse | null> {
    if (this.isMock) {
      // Mock session response
      const storedUser = sessionStorage.getItem('currentUser');
      if (!storedUser) return null;

      const user = JSON.parse(storedUser);
      return {
        user,
        entitlements: this.getDefaultEntitlements(user.premiumTier || 'FREE'),
        isAuthenticated: true,
      };
    }

    try {
      const response = await apiClient.get<{ success: boolean; data: SessionResponse }>(
        '/api/v1/auth/session'
      );

      if (response.success && response.data) {
        // Store entitlements for UI display (not enforcement)
        this.saveEntitlements(response.data.entitlements);
        return response.data;
      }
      return null;
    } catch (error) {
      // If 401 or session invalid, clear local storage
      if (error instanceof ApiError && error.status === 401) {
        this.clearSession();
      }
      return null;
    }
  }

  /**
   * Get default entitlements for a tier (used in mock mode)
   */
  private getDefaultEntitlements(tier: string): Entitlements {
    const tierEntitlements: Record<string, Entitlements> = {
      FREE: {
        tier: 'FREE',
        features: ['basic_matching', 'messaging'],
        limits: {
          dailyLikes: 10,
          dailySuperLikes: 0,
          dailyBoosts: 0,
          messagesBeforeMatch: false,
          seeWhoLikesYou: false,
          advancedFilters: false,
          readReceipts: false,
          incognitoMode: false,
          videoCalls: false,
          prioritySupport: false,
        },
      },
      GOLD: {
        tier: 'GOLD',
        features: ['basic_matching', 'messaging', 'unlimited_likes', 'see_likes', 'rewind'],
        limits: {
          dailyLikes: -1, // unlimited
          dailySuperLikes: 5,
          dailyBoosts: 1,
          messagesBeforeMatch: false,
          seeWhoLikesYou: true,
          advancedFilters: true,
          readReceipts: false,
          incognitoMode: false,
          videoCalls: false,
          prioritySupport: false,
        },
      },
      PLATINUM: {
        tier: 'PLATINUM',
        features: ['basic_matching', 'messaging', 'unlimited_likes', 'see_likes', 'rewind', 'priority', 'read_receipts', 'incognito'],
        limits: {
          dailyLikes: -1,
          dailySuperLikes: 10,
          dailyBoosts: 3,
          messagesBeforeMatch: true,
          seeWhoLikesYou: true,
          advancedFilters: true,
          readReceipts: true,
          incognitoMode: true,
          videoCalls: true,
          prioritySupport: false,
        },
      },
      DIAMOND: {
        tier: 'DIAMOND',
        features: ['all'],
        limits: {
          dailyLikes: -1,
          dailySuperLikes: -1,
          dailyBoosts: -1,
          messagesBeforeMatch: true,
          seeWhoLikesYou: true,
          advancedFilters: true,
          readReceipts: true,
          incognitoMode: true,
          videoCalls: true,
          prioritySupport: true,
        },
      },
      ELITE: {
        tier: 'ELITE',
        features: ['all', 'vip'],
        limits: {
          dailyLikes: -1,
          dailySuperLikes: -1,
          dailyBoosts: -1,
          messagesBeforeMatch: true,
          seeWhoLikesYou: true,
          advancedFilters: true,
          readReceipts: true,
          incognitoMode: true,
          videoCalls: true,
          prioritySupport: true,
        },
      },
    };

    return tierEntitlements[tier] || tierEntitlements.FREE;
  }

  /**
   * Save entitlements to local storage for UI display
   */
  private saveEntitlements(entitlements: Entitlements): void {
    sessionStorage.setItem('entitlements', JSON.stringify(entitlements));
  }

  /**
   * Get stored entitlements (for UI display only)
   */
  getStoredEntitlements(): Entitlements | null {
    const stored = sessionStorage.getItem('entitlements');
    return stored ? JSON.parse(stored) : null;
  }

  /**
   * Check if user has a feature (for UI display only - server enforces)
   */
  hasFeature(feature: string): boolean {
    const entitlements = this.getStoredEntitlements();
    if (!entitlements) return false;
    return entitlements.features.includes(feature) || entitlements.features.includes('all');
  }

  async refreshToken(): Promise<void> {
    // In production, refresh token is in httpOnly cookie and sent automatically
    // The backend will set new tokens in httpOnly cookies
    const isMock = !import.meta.env.VITE_API_URL;

    if (isMock) {
      // Mock mode: use the old flow for development compatibility
      const refreshToken = authTokenService.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      // Mock doesn't need actual refresh - just keep existing state
      return;
    }

    // Production: call refresh endpoint, cookies are sent/set automatically
    await apiClient.post<{ success: boolean; message: string }>(
      '/api/v1/auth/refresh-token',
      {}, // No body needed - refresh token is in httpOnly cookie
      { skipAuth: true, skipCsrf: true }
    );

    // Tokens are refreshed in httpOnly cookies by the backend
    // Update authentication state
    authTokenService.setAuthenticated(true);
  }

  async forgotPassword(email: string): Promise<void> {
    if (this.isMock) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return;
    }

    await apiClient.post('/api/v1/auth/forgot-password', { email }, { skipAuth: true, skipCsrf: true });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    if (this.isMock) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return;
    }

    await apiClient.post(
      '/api/v1/auth/reset-password',
      { token, newPassword },
      { skipAuth: true, skipCsrf: true }
    );
  }

  async verifyEmail(token: string): Promise<void> {
    if (this.isMock) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return;
    }

    await apiClient.post('/api/v1/auth/verify-email', { token }, { skipAuth: true, skipCsrf: true });
  }

  async resendVerificationEmail(): Promise<void> {
    if (this.isMock) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return;
    }

    await apiClient.post('/api/v1/auth/resend-verification');
  }

  isAuthenticated(): boolean {
    return authTokenService.isAuthenticated();
  }

  getToken(): string | null {
    return authTokenService.getToken();
  }

  private saveSession(response: LoginResponse): void {
    // In production, tokens are in httpOnly cookies set by the backend
    // We only store the user data and update auth state
    const isMock = !import.meta.env.VITE_API_URL;

    if (isMock && response.token) {
      // Mock mode: store tokens in sessionStorage for development
      authTokenService.setTokens(response.token, response.refreshToken);
    } else {
      // Production: just mark as authenticated (tokens are in httpOnly cookies)
      authTokenService.setAuthenticated(true);
    }

    // Store user data for UI purposes
    sessionStorage.setItem('currentUser', JSON.stringify(response.user));
  }

  private clearSession(): void {
    authTokenService.clearTokens();
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('entitlements');
    localStorage.removeItem('userGender');
  }
}

export const authService = new AuthService();
export default authService;
