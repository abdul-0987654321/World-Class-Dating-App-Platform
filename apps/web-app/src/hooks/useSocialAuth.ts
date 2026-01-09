/**
 * Social Authentication Hook - SECURE VERSION
 * Handles social login (Google, Apple, Facebook) with secure token storage
 *
 * SECURITY FEATURES:
 * - Uses authTokenService for secure token storage (sessionStorage, not localStorage)
 * - Uses apiClient for CSRF protection and httpOnly cookie support
 * - Clears legacy localStorage tokens on login
 */

import { useState } from 'react';
import { authTokenService } from '../services/auth-token.service';
import apiClient from '../services/api.client';

interface GoogleTokenPayload {
  code?: string;
  id_token?: string;
  access_token?: string;
}

interface AppleTokenPayload {
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

interface FacebookTokenPayload {
  access_token: string;
}

interface SocialAuthResponse {
  user: any;
  isNewUser: boolean;
  needsProfileSetup: boolean;
}

export const useSocialAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Store user session after successful social auth
   * Tokens are expected to be in httpOnly cookies set by the backend
   */
  const saveSession = (user: any, accessToken?: string, refreshToken?: string): void => {
    // Store user in sessionStorage (non-sensitive data)
    sessionStorage.setItem('currentUser', JSON.stringify(user));

    // If backend returns tokens (mock/dev mode), store them securely
    if (accessToken) {
      authTokenService.setTokens(accessToken, refreshToken);
    }

    // Clear any legacy localStorage tokens
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
  };

  const loginWithGoogle = async (payload: GoogleTokenPayload): Promise<SocialAuthResponse> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<{ success: boolean; data: any; message?: string }>(
        '/api/v1/auth/google',
        payload,
        { skipAuth: true, skipCsrf: true }
      );

      if (response.success) {
        const { user, accessToken, refreshToken, isNewUser, needsProfileSetup } = response.data;
        saveSession(user, accessToken, refreshToken);
        return { user, isNewUser, needsProfileSetup };
      } else {
        throw new Error(response.message || 'Google login failed');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Google login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loginWithApple = async (payload: AppleTokenPayload): Promise<SocialAuthResponse> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<{ success: boolean; data: any; message?: string }>(
        '/api/v1/auth/apple',
        payload,
        { skipAuth: true, skipCsrf: true }
      );

      if (response.success) {
        const { user, accessToken, refreshToken, isNewUser, needsProfileSetup } = response.data;
        saveSession(user, accessToken, refreshToken);
        return { user, isNewUser, needsProfileSetup };
      } else {
        throw new Error(response.message || 'Apple login failed');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Apple login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loginWithFacebook = async (payload: FacebookTokenPayload): Promise<SocialAuthResponse> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<{ success: boolean; data: any; message?: string }>(
        '/api/v1/auth/facebook',
        payload,
        { skipAuth: true, skipCsrf: true }
      );

      if (response.success) {
        const { user, accessToken, refreshToken, isNewUser, needsProfileSetup } = response.data;
        saveSession(user, accessToken, refreshToken);
        return { user, isNewUser, needsProfileSetup };
      } else {
        throw new Error(response.message || 'Facebook login failed');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Facebook login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const linkSocialAccount = async (
    provider: 'google' | 'apple' | 'facebook',
    token: GoogleTokenPayload | AppleTokenPayload | FacebookTokenPayload
  ): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<{ success: boolean; message?: string }>(
        '/api/v1/auth/social/link',
        { provider, token }
      );

      if (!response.success) {
        throw new Error(response.message || 'Failed to link account');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to link account';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const unlinkSocialAccount = async (provider: 'google' | 'apple' | 'facebook'): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<{ success: boolean; message?: string }>(
        '/api/v1/auth/social/unlink',
        { provider }
      );

      if (!response.success) {
        throw new Error(response.message || 'Failed to unlink account');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to unlink account';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getLinkedAccounts = async (): Promise<any[]> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<{ success: boolean; data: any[]; message?: string }>(
        '/api/v1/auth/social/linked'
      );

      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to get linked accounts');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to get linked accounts';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    loginWithGoogle,
    loginWithApple,
    loginWithFacebook,
    linkSocialAccount,
    unlinkSocialAccount,
    getLinkedAccounts,
    loading,
    error,
  };
};
