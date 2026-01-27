/**
 * Protected Route Component
 *
 * Guards routes that require authentication.
 * Redirects unauthenticated users to login.
 * Optionally checks for profile completion.
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireProfileComplete?: boolean;
}

// Loading screen component
const LoadingScreen: React.FC = () => (
  <div
    className="min-h-screen flex items-center justify-center"
    style={{ backgroundColor: '#14141f' }}
  >
    <div
      className="w-12 h-12 border-3 border-gray-700 border-t-pink-500 rounded-full animate-spin"
      style={{
        borderWidth: '3px',
        borderTopColor: '#D62839',
      }}
    />
  </div>
);

/**
 * ProtectedRoute - Requires authentication
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireProfileComplete = false,
}) => {
  const { isAuthenticated, isAuthReady, user } = useAuth();
  const location = useLocation();

  // Show loading while auth state is being determined
  if (!isAuthReady) {
    return <LoadingScreen />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Check profile completion if required
  if (requireProfileComplete && user) {
    const profileCompletion = user.profileCompletion ?? 0;
    if (profileCompletion < 50) {
      return <Navigate to="/profile-setup" replace />;
    }
  }

  return <>{children}</>;
};

/**
 * PublicOnlyRoute - Redirects authenticated users
 */
interface PublicOnlyRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export const PublicOnlyRoute: React.FC<PublicOnlyRouteProps> = ({
  children,
  redirectTo = '/discover',
}) => {
  const { isAuthenticated, isAuthReady } = useAuth();

  // Show loading while auth state is being determined
  if (!isAuthReady) {
    return <LoadingScreen />;
  }

  // Redirect authenticated users
  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

/**
 * SignedInRoute - Similar to PublicOnlyRoute but with different default
 */
export const SignedInRoute: React.FC<PublicOnlyRouteProps> = PublicOnlyRoute;

export default ProtectedRoute;
