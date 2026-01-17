import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { AuthApi, createApiClient } from '../api/client';
import type { LoginRequest, RegisterRequest } from '../types';

// Token storage keys
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

// Secure storage wrapper - uses SecureStore on native, falls back to in-memory for web
class TokenStorage {
  private static memoryStorage: Map<string, string> = new Map();

  static async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return this.memoryStorage.get(key) ?? null;
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('SecureStore getItem error:', error);
      return null;
    }
  }

  static async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      this.memoryStorage.set(key, value);
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } catch (error) {
      console.error('SecureStore setItem error:', error);
    }
  }

  static async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      this.memoryStorage.delete(key);
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('SecureStore removeItem error:', error);
    }
  }

  static async clear(): Promise<void> {
    await this.removeItem(ACCESS_TOKEN_KEY);
    await this.removeItem(REFRESH_TOKEN_KEY);
    if (Platform.OS === 'web') {
      this.memoryStorage.clear();
    }
  }
}

export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: any) => void;
  setToken: (accessToken: string, refreshToken: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const apiClient = createApiClient({
  getToken: async (): Promise<string | null> => {
    return await TokenStorage.getItem(ACCESS_TOKEN_KEY);
  }
});

const authApi = new AuthApi(apiClient);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUserState] = useState<any | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await TokenStorage.getItem(ACCESS_TOKEN_KEY);
      if (token) {
        const userData = await authApi.getCurrentUser();
        setUserState(userData);
        setIsAuthenticated(true);
      }
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
      await TokenStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
      await TokenStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
      setUserState(response.user);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      const response = await authApi.register(data);
      await TokenStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
      await TokenStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
      setUserState(response.user);
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
      await TokenStorage.clear();
      setUserState(null);
      setIsAuthenticated(false);
    }
  };

  const deleteAccount = async () => {
    try {
      const token = await TokenStorage.getItem(ACCESS_TOKEN_KEY);

      const response = await fetch('https://api.flamoral.com/api/v1/auth/account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      await TokenStorage.clear();
      setUserState(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Delete account error:', error);
      throw error;
    }
  };

  const setUser = (userData: any) => {
    setUserState(userData);
    if (userData) {
      setIsAuthenticated(true);
    }
  };

  const setToken = async (accessToken: string, refreshToken: string) => {
    await TokenStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    await TokenStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    setIsAuthenticated(true);
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      isLoading,
      user,
      login,
      register,
      logout,
      setUser,
      setToken,
      deleteAccount
    }}>
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

// Export TokenStorage for direct access in screens that need it
export { TokenStorage, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY };
