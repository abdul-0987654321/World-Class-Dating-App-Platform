export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    phoneVerified: boolean;
  };
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone?: string;
}

export interface RegisterResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
  };
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface VerifyPhoneRequest {
  code: string;
  phone: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

// Social Authentication Types
export interface GoogleTokenPayload {
  code?: string;
  id_token?: string;
  access_token?: string;
}

export interface AppleTokenPayload {
  code: string;
  id_token: string;
  user?: {
    name?: {
      firstName?: string;
      lastName?: string;
    };
    email?: string;
  };
}

export interface FacebookTokenPayload {
  access_token: string;
}

export interface SocialAuthResponse {
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    phoneVerified: boolean;
    firstName?: string;
    lastName?: string;
  };
  accessToken: string;
  refreshToken: string;
  isNewUser: boolean;
  needsProfileSetup: boolean;
}

export type SocialProvider = 'google' | 'apple' | 'facebook';

export interface LinkedSocialAccount {
  provider: SocialProvider;
  providerUserId: string;
  email?: string;
  linkedAt: string;
}

// Auth State Types
export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export interface AuthState {
  status: AuthStatus;
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    phoneVerified: boolean;
    firstName?: string;
    lastName?: string;
  } | null;
  error: string | null;
}

// Token Storage Interface - Platform agnostic
export interface TokenStorageInterface {
  getAccessToken(): Promise<string | null>;
  getRefreshToken(): Promise<string | null>;
  setTokens(accessToken: string, refreshToken?: string): Promise<void>;
  clearTokens(): Promise<void>;
  isAuthenticated(): Promise<boolean>;
}
