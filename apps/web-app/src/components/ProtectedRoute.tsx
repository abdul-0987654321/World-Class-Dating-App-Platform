/**
 * Protected Route Component - SECURE VERSION
 * Wraps routes that require authentication
 *
 * SECURITY NOTES:
 * - Uses authService for consistent authentication check
 * - Does not directly access localStorage/sessionStorage
 * - Redirects to login on authentication failure
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../services';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // Use authService for authentication check
  // This ensures consistent behavior across the app
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
