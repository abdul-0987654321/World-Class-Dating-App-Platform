/**
 * RequireAdmin Component
 *
 * SECURITY: This component protects admin routes by verifying admin status
 * via a real API call to the backend. It does NOT trust any client-side flags.
 *
 * The server must verify the user's role from the session/token and return
 * the actual admin status. This prevents privilege escalation attacks.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import apiClient, { ApiError } from '../../services/api.client';

interface AdminVerificationResponse {
  isAdmin: boolean;
  role?: string;
  permissions?: string[];
}

interface RequireAdminProps {
  children: React.ReactNode;
  /** URL to redirect to if user is not authenticated */
  loginRedirect?: string;
  /** URL to redirect to if user is authenticated but not admin */
  unauthorizedRedirect?: string;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
  /** Custom unauthorized component (shown briefly before redirect) */
  unauthorizedComponent?: React.ReactNode;
}

/**
 * RequireAdmin - Protects admin routes with server-side role verification
 *
 * IMPORTANT: This component makes an API call to verify admin status.
 * Never trust client-side flags like localStorage or local state for admin access.
 */
export const RequireAdmin: React.FC<RequireAdminProps> = ({
  children,
  loginRedirect = '/login',
  unauthorizedRedirect = '/unauthorized',
  loadingComponent,
  unauthorizedComponent,
}) => {
  const location = useLocation();
  const [verificationState, setVerificationState] = useState<{
    isLoading: boolean;
    isAuthenticated: boolean;
    isAdmin: boolean;
    error: string | null;
  }>({
    isLoading: true,
    isAuthenticated: false,
    isAdmin: false,
    error: null,
  });

  const verifyAdminStatus = useCallback(async () => {
    try {
      // SECURITY: Always verify admin status via API call
      // The server checks the session/token and returns the actual role
      const response = await apiClient.get<{ success: boolean; data: AdminVerificationResponse }>(
        '/api/v1/auth/admin/verify'
      );

      if (response.success && response.data?.isAdmin) {
        setVerificationState({
          isLoading: false,
          isAuthenticated: true,
          isAdmin: true,
          error: null,
        });
      } else {
        setVerificationState({
          isLoading: false,
          isAuthenticated: true,
          isAdmin: false,
          error: 'User does not have admin privileges',
        });
      }
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          // Not authenticated
          setVerificationState({
            isLoading: false,
            isAuthenticated: false,
            isAdmin: false,
            error: 'Authentication required',
          });
        } else if (error.status === 403) {
          // Authenticated but not admin
          setVerificationState({
            isLoading: false,
            isAuthenticated: true,
            isAdmin: false,
            error: 'Admin access denied',
          });
        } else {
          // Other error - fail closed (deny access)
          setVerificationState({
            isLoading: false,
            isAuthenticated: false,
            isAdmin: false,
            error: error.message || 'Verification failed',
          });
        }
      } else {
        // Network error or other issue - fail closed
        setVerificationState({
          isLoading: false,
          isAuthenticated: false,
          isAdmin: false,
          error: 'Unable to verify admin status',
        });
      }
    }
  }, []);

  useEffect(() => {
    verifyAdminStatus();
  }, [verifyAdminStatus]);

  // Loading state
  if (verificationState.isLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!verificationState.isAuthenticated) {
    return <Navigate to={loginRedirect} state={{ from: location }} replace />;
  }

  // Authenticated but not admin - redirect to unauthorized page
  if (!verificationState.isAdmin) {
    if (unauthorizedComponent) {
      return <>{unauthorizedComponent}</>;
    }
    return <Navigate to={unauthorizedRedirect} state={{ from: location }} replace />;
  }

  // Verified admin - render children
  return <>{children}</>;
};

export default RequireAdmin;
