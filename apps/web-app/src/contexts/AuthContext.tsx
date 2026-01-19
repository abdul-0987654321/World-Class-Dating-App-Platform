/**
 * FLAMORAL Auth Context
 * Provides authentication state across the application
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authService, User } from '@/services/auth.service';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isAuthReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check local state first
        const localAuth = authService.isAuthenticated();

        if (localAuth) {
          // Verify session is still valid
          try {
            const session = await authService.getSession();
            if (session?.isAuthenticated && session.user) {
              setUser(session.user);
              setIsAuthenticated(true);
            } else {
              setIsAuthenticated(false);
              setUser(null);
            }
          } catch {
            setIsAuthenticated(false);
            setUser(null);
          }
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } finally {
        setIsAuthReady(true);
      }
    };

    initAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authService.login(email, password);
    setUser(response.user);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch {
      // Ignore errors
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      isAuthReady,
      login,
      logout,
      refreshUser,
    }),
    [user, isAuthenticated, isAuthReady, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
