/**
 * useAdminAuth Hook
 *
 * SECURITY: This hook verifies admin status via a real API call to the backend.
 * It should be used by any component that needs to conditionally render admin content.
 *
 * IMPORTANT: Never trust client-side flags for admin access decisions.
 * Always use this hook which verifies against the server.
 */

import { useState, useEffect, useCallback } from 'react';
import apiClient, { ApiError } from '../services/api.client';

interface AdminAuthState {
  /** Whether the verification is still in progress */
  isLoading: boolean;
  /** Whether the user is authenticated (may or may not be admin) */
  isAuthenticated: boolean;
  /** Whether the user has verified admin privileges - ONLY trust this after isLoading is false */
  isAdmin: boolean;
  /** User's role as returned by the server */
  role: string | null;
  /** List of permissions the admin user has */
  permissions: string[];
  /** Any error that occurred during verification */
  error: string | null;
  /** Function to manually re-verify admin status */
  reverify: () => Promise<void>;
}

interface AdminVerificationResponse {
  isAdmin: boolean;
  role?: string;
  permissions?: string[];
}

/**
 * Hook to verify and track admin authentication status
 *
 * Usage:
 * ```tsx
 * const { isLoading, isAdmin, isAuthenticated } = useAdminAuth();
 *
 * if (isLoading) return <LoadingSpinner />;
 * if (!isAuthenticated) return <Navigate to="/login" />;
 * if (!isAdmin) return <Navigate to="/unauthorized" />;
 *
 * // Render admin content only after verification
 * return <AdminDashboard />;
 * ```
 */
export function useAdminAuth(): AdminAuthState {
  const [state, setState] = useState<Omit<AdminAuthState, 'reverify'>>({
    isLoading: true,
    isAuthenticated: false,
    isAdmin: false,
    role: null,
    permissions: [],
    error: null,
  });

  const verifyAdminStatus = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // SECURITY: Verify admin status via API call
      // The server validates the session/token and returns the actual role
      const response = await apiClient.get<{ success: boolean; data: AdminVerificationResponse }>(
        '/api/v1/auth/admin/verify'
      );

      if (response.success && response.data?.isAdmin) {
        setState({
          isLoading: false,
          isAuthenticated: true,
          isAdmin: true,
          role: response.data.role || 'admin',
          permissions: response.data.permissions || [],
          error: null,
        });
      } else {
        setState({
          isLoading: false,
          isAuthenticated: true,
          isAdmin: false,
          role: response.data?.role || null,
          permissions: [],
          error: 'User does not have admin privileges',
        });
      }
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          setState({
            isLoading: false,
            isAuthenticated: false,
            isAdmin: false,
            role: null,
            permissions: [],
            error: 'Authentication required',
          });
        } else if (error.status === 403) {
          setState({
            isLoading: false,
            isAuthenticated: true,
            isAdmin: false,
            role: null,
            permissions: [],
            error: 'Admin access denied',
          });
        } else {
          // Fail closed - deny access on unknown errors
          setState({
            isLoading: false,
            isAuthenticated: false,
            isAdmin: false,
            role: null,
            permissions: [],
            error: error.message || 'Verification failed',
          });
        }
      } else {
        // Network error or other issue - fail closed
        setState({
          isLoading: false,
          isAuthenticated: false,
          isAdmin: false,
          role: null,
          permissions: [],
          error: 'Unable to verify admin status',
        });
      }
    }
  }, []);

  useEffect(() => {
    verifyAdminStatus();
  }, [verifyAdminStatus]);

  return {
    ...state,
    reverify: verifyAdminStatus,
  };
}

/**
 * Check if user has a specific admin permission
 * Use this for fine-grained permission checks after verifying admin status
 */
export function useAdminPermission(permission: string): boolean {
  const { isAdmin, permissions, isLoading } = useAdminAuth();

  // While loading or if not admin, deny access
  if (isLoading || !isAdmin) {
    return false;
  }

  // Check if user has the specific permission or wildcard admin access
  return permissions.includes(permission) || permissions.includes('*') || permissions.includes('admin:*');
}

export default useAdminAuth;
