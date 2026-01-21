/**
 * Authentication Service
 * Handles user authentication and session management
 */

import { authTokenService } from './auth-token.service';
import apiClient, { ApiError } from './api.client';
import {
  transformUserResponse,
  normalizeSubscriptionTier,
  toArray,
  toNumber,
  toBoolean,
  BackendUserResponse,
  FrontendUser,
  SubscriptionTier,
} from '../utils/api-transformers';

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

/**
 * Backend user response shape (snake_case)
 */
interface BackendUser {
  id: string;
  email: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  photo_url?: string;
  photoUrl?: string;
  subscription?: string;
  subscription_tier?: string;
  premium_tier?: string;
  premiumTier?: string;
  is_email_verified?: boolean;
  is_verified?: boolean;
  isVerified?: boolean;
  coin_balance?: number;
  coinBalance?: number;
  profile_completion?: number;
  profileCompletion?: number;
}

/**
 * Transforms backend user to frontend User format
 */
function transformBackendUser(data: BackendUser): User {
  return {
    id: data.id,
    email: data.email,
    firstName: data.first_name || data.firstName || '',
    lastName: data.last_name || data.lastName,
    photoUrl: data.photo_url || data.photoUrl,
    subscription: data.subscription || data.subscription_tier || 'free',
    isVerified: toBoolean(data.is_email_verified ?? data.is_verified ?? data.isVerified ?? false),
    premiumTier:
      normalizeSubscriptionTier(data.premium_tier || data.premiumTier || data.subscription_tier) ||
      undefined,
    coinBalance: toNumber(data.coin_balance || data.coinBalance, 0),
    profileCompletion: toNumber(data.profile_completion || data.profileCompletion, 0),
  };
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

export interface ConsentData {
  terms: boolean;
  privacy: boolean;
  marketing?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  dateOfBirth: string;
  gender: string;
  consents?: ConsentData;
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
    const response = await apiClient.post<{ success: boolean; data: { user: BackendUser } }>(
      '/api/v1/auth/login',
      { email, password },
      { skipAuth: true, skipCsrf: true }
    );

    // Transform backend user response to frontend format
    // Handles snake_case to camelCase conversion and safe defaults
    const transformedUser = transformBackendUser(response.data.user);

    // Create LoginResponse with transformed user data
    // Tokens are in httpOnly cookies, not accessible to JavaScript (XSS protection)
    const loginResponse: LoginResponse = {
      user: transformedUser,
      // Note: tokens are no longer in the response - they're in httpOnly cookies
    };

    this.saveSession(loginResponse);
    return loginResponse;
  }

  async register(data: RegisterData): Promise<LoginResponse> {
    if (this.isMock) {
      // Mock registration - create a complete user object
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay
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
    // Only include last_name if it has a value (backend requires min 2 chars if present)
    const backendData: Record<string, unknown> = {
      email: data.email,
      password: data.password,
      first_name: data.firstName,
      date_of_birth: data.dateOfBirth,
      gender: data.gender,
      consents: {
        terms_accepted: data.consents?.terms ?? true,
        privacy_accepted: data.consents?.privacy ?? true,
        marketing_emails: data.consents?.marketing ?? false,
      },
    };

    // Only add last_name if provided and not empty
    if (data.lastName && data.lastName.trim().length >= 2) {
      backendData.last_name = data.lastName;
    }

    // Backend returns { success: true, data: { user } }
    // Tokens are now set in httpOnly cookies by the backend (not in response body)
    const response = await apiClient.post<{ success: boolean; data: { user: BackendUser } }>(
      '/api/v1/auth/register',
      backendData,
      { skipAuth: true, skipCsrf: true }
    );

    // Transform backend user response to frontend format
    // Handles snake_case to camelCase conversion and safe defaults
    const transformedUser = transformBackendUser(response.data.user);

    // Create LoginResponse with transformed user data
    // Tokens are in httpOnly cookies, not accessible to JavaScript (XSS protection)
    const loginResponse: LoginResponse = {
      user: transformedUser,
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

    // Backend may return wrapped response { success, data } or direct user
    const response = await apiClient.get<{ success: boolean; data: BackendUser } | BackendUser>(
      '/api/v1/auth/me'
    );

    // Handle both wrapped and unwrapped response formats
    const backendUser =
      'success' in response && response.data ? response.data : (response as BackendUser);
    return transformBackendUser(backendUser);
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
        features: [
          'basic_matching',
          'messaging',
          'unlimited_likes',
          'see_likes',
          'rewind',
          'priority',
          'read_receipts',
          'incognito',
        ],
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

    await apiClient.post(
      '/api/v1/auth/forgot-password',
      { email },
      { skipAuth: true, skipCsrf: true }
    );
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

    await apiClient.post(
      '/api/v1/auth/verify-email',
      { token },
      { skipAuth: true, skipCsrf: true }
    );
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
