/**
 * useSession Hook
 * Handles session initialization and entitlements on app load
 * This hook should be called at the app root to initialize the session
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { authService, Entitlements, User, SessionResponse } from '../services';

interface UseSessionReturn {
  user: User | null;
  entitlements: Entitlements | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  refreshSession: () => Promise<void>;
  hasFeature: (feature: string) => boolean;
  getLimit: (limitKey: keyof Entitlements['limits']) => number | boolean;
}

/**
 * Hook to manage user session and entitlements
 *
 * Usage:
 * ```tsx
 * // In App.tsx or root component
 * function App() {
 *   const { user, entitlements, isLoading, hasFeature } = useSession();
 *
 *   if (isLoading) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   // Use hasFeature for UI display (server enforces actual limits)
 *   const canSeeWhoLikesYou = hasFeature('see_likes');
 *
 *   return (
 *     <AppContent />
 *   );
 * }
 * ```
 */
export function useSession(): UseSessionReturn {
  const [user, setUser] = useState<User | null>(null);
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if user has a token
      if (!authService.isAuthenticated()) {
        setUser(null);
        setEntitlements(null);
        setIsAuthenticated(false);
        return;
      }

      // Fetch session from server
      const session = await authService.getSession();

      if (session && session.isAuthenticated) {
        setUser(session.user);
        setEntitlements(session.entitlements);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setEntitlements(null);
        setIsAuthenticated(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
      setUser(null);
      setEntitlements(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize session on mount
  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  /**
   * Check if user has a feature (for UI display only - server enforces)
   */
  const hasFeature = useCallback((feature: string): boolean => {
    if (!entitlements) return false;
    return entitlements.features.includes(feature) || entitlements.features.includes('all');
  }, [entitlements]);

  /**
   * Get a limit value (for UI display only - server enforces)
   * Returns -1 for unlimited
   */
  const getLimit = useCallback((limitKey: keyof Entitlements['limits']): number | boolean => {
    if (!entitlements) {
      // Return restrictive defaults for non-authenticated users
      const defaults: Record<string, number | boolean> = {
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
      };
      return defaults[limitKey] ?? 0;
    }
    return entitlements.limits[limitKey];
  }, [entitlements]);

  return useMemo(() => ({
    user,
    entitlements,
    isAuthenticated,
    isLoading,
    error,
    refreshSession,
    hasFeature,
    getLimit,
  }), [user, entitlements, isAuthenticated, isLoading, error, refreshSession, hasFeature, getLimit]);
}

export default useSession;
