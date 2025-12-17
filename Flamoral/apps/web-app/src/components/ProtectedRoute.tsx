import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authService, User } from '../services';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

/**
 * ProtectedRoute Component
 * Handles route protection based on authentication and admin status
 * Features:
 * - Redirects unauthenticated users to login
 * - Preserves return URL for post-login redirect
 * - Supports admin-only routes
 * - Shows loading state during auth check
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false
}) => {
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // First check if user is authenticated via cached session
        if (!authService.isAuthenticated()) {
          setIsChecking(false);
          return;
        }

        // Get user data to check admin status if needed
        if (requireAdmin) {
          try {
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);
          } catch (error) {
            // If we can't get user data, treat as unauthenticated
            console.error('Failed to get current user:', error);
            setAuthError('Authentication failed');
          }
        } else {
          // For non-admin routes, just verify authentication
          setIsChecking(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setAuthError('Authentication check failed');
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [requireAdmin]);

  // Show loading while checking auth
  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-charcoal-400 text-sm">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  const isAuthenticated = authService.isAuthenticated();

  if (!isAuthenticated || authError) {
    // Redirect to login with return URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check admin access if required
  if (requireAdmin) {
    // If we're still checking user data, show loading
    if (!user && isChecking) {
      return (
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
        </div>
      );
    }

    // Check if user has admin role
    const isAdmin = user && (user.isAdmin || (user as any).role === 'admin');

    if (!isAdmin) {
      // Redirect to discover if user is not admin
      return <Navigate to="/discover" replace />;
    }
  }

  return <>{children}</>;
};
