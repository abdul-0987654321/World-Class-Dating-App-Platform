/**
 * Protected Route Component - SECURE VERSION
 * Wraps routes that require authentication
 *
 * SECURITY NOTES:
 * - Uses authService for consistent authentication check
 * - Does not directly access localStorage/sessionStorage
 * - Redirects to login on authentication failure
 * - Shows loading state while auth is being verified
 * - Preserves intended destination for post-login redirect
 */

import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '../services';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Optional: Require email verification for this route */
  requireEmailVerified?: boolean;
  /** Optional: Require phone verification for this route */
  requirePhoneVerified?: boolean;
  /** Optional: Custom redirect path instead of /login */
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireEmailVerified = false,
  requirePhoneVerified = false,
  redirectTo = '/login',
}) => {
  const location = useLocation();
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<{
    emailVerified: boolean;
    phoneVerified: boolean;
  } | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // First check local state for immediate response
        const localAuth = authService.isAuthenticated();

        if (localAuth) {
          // Verify session is still valid
          try {
            const session = await authService.getSession();
            setIsAuthenticated(session?.isAuthenticated ?? false);
            setVerificationStatus({
              emailVerified: session?.user?.isVerified ?? false,
              phoneVerified: false, // phoneVerified is not in the User type, default to false
            });
          } catch {
            // Session check failed, user is not authenticated
            setIsAuthenticated(false);
            setVerificationStatus(null);
          }
        } else {
          setIsAuthenticated(false);
          setVerificationStatus(null);
        }
      } finally {
        setIsAuthReady(true);
      }
    };

    checkAuth();
  }, []);

  // Show loading state while auth is being verified
  if (!isAuthReady) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--fm-gradient-interior, #1a1a2e)' }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2"
            style={{ borderColor: 'var(--fm-pink, #ec4899)' }}
          />
          <p className="text-sm" style={{ color: 'var(--fm-text-muted, #a0a0b0)' }}>
            Verifying authentication...
          </p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  // Preserve the intended destination for post-login redirect
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location.pathname }} replace />;
  }

  // Check email verification requirement
  if (requireEmailVerified && verificationStatus && !verificationStatus.emailVerified) {
    return <Navigate to="/verify-email" state={{ from: location.pathname }} replace />;
  }

  // Check phone verification requirement
  if (requirePhoneVerified && verificationStatus && !verificationStatus.phoneVerified) {
    return <Navigate to="/verify-phone" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
