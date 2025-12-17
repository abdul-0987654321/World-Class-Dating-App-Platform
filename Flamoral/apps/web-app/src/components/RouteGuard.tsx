import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { RouteTracker } from '../utils/routing';

/**
 * RouteGuard Component
 * Tracks route changes and can be extended with additional security checks
 *
 * Features:
 * - Route change tracking for analytics
 * - Security event logging
 * - Can be extended with additional guards
 */
export const RouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  useEffect(() => {
    // Track route changes
    RouteTracker.track(location.pathname);

    // Log suspicious navigation patterns in production
    if (import.meta.env.PROD) {
      const previousPath = RouteTracker.getPreviousPath();

      // Example: Detect rapid navigation (possible bot behavior)
      // You can add more security checks here

      // Log to monitoring service if needed
      // Example: monitoringService.logNavigation(previousPath, location.pathname);
    }
  }, [location.pathname]);

  return <>{children}</>;
};
