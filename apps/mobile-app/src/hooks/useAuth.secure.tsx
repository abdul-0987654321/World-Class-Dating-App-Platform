import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthApi, createApiClient } from '@flamoral/api-client';
import type { LoginRequest, RegisterRequest } from '@flamoral/types';
import { secureTokenStorage } from '../services/storage';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getToken = async (): Promise<string | null> => {
  return await secureTokenStorage.getAccessToken();
};

const apiClient = createApiClient({
  getToken: async () => {
    const token = await secureTokenStorage.getAccessToken();
    return token;
  }
});

const authApi = new AuthApi(apiClient);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Check if tokens exist in secure storage
      const hasTokens = await secureTokenStorage.hasTokens();

      if (!hasTokens) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // Attempt to get tokens with biometric auth
      const tokens = await secureTokenStorage.getTokens();

      if (!tokens) {
        // Biometric auth failed or tokens don't exist
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // Verify tokens by fetching user data
      const userData = await authApi.getCurrentUser();
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Auth check failed:', error);
      await logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginRequest) => {
    try {
      const response = await authApi.login(credentials);

      // Calculate token expiration (assuming 15 minutes for access token)
      const expiresAt = Date.now() + (15 * 60 * 1000);

      // Store tokens securely with biometric protection
      await secureTokenStorage.storeTokens({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresAt,
      });

      setUser(response.user);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      const response = await authApi.register(data);

      // Calculate token expiration
      const expiresAt = Date.now() + (15 * 60 * 1000);

      // Store tokens securely
      await secureTokenStorage.storeTokens({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresAt,
      });

      setUser(response.user);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // CRITICAL: Clear tokens from secure storage
      await secureTokenStorage.clearTokens();
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
