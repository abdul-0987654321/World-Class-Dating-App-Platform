/**
 * Clerk Protected Route Component
 *
 * Wraps routes that require authentication.
 * Redirects unauthenticated users to login.
 * Optionally checks for email verification and profile completion.
 */

import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, useUser, RedirectToSignIn, SignedIn, SignedOut } from '@clerk/clerk-react';
import {
  checkProfileComplete,
  getSubscriptionTier,
  SubscriptionTier,
} from '../../services/clerk-auth.service';

// Loading component
const LoadingScreen: React.FC = () => (
  <div
    className="min-h-screen flex items-center justify-center"
    style={{ backgroundColor: '#14141f' }}
  >
    <div className="text-center">
      <div
        className="w-12 h-12 border-3 border-gray-700 border-t-pink-500 rounded-full animate-spin mx-auto mb-4"
        style={{
          borderWidth: '3px',
          borderTopColor: '#FF6B7A',
        }}
      />
      <p className="text-gray-400 text-sm">Loading...</p>
    </div>
  </div>
);

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireEmailVerification?: boolean;
  requireProfileComplete?: boolean;
  requiredTier?: SubscriptionTier;
  fallbackPath?: string;
}

/**
 * Protected Route with Clerk Authentication
 */
export const ClerkProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireEmailVerification = false,
  requireProfileComplete = false,
  requiredTier,
  fallbackPath = '/login',
}) => {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const location = useLocation();

  const [isCheckingProfile, setIsCheckingProfile] = useState(requireProfileComplete);
  const [isProfileComplete, setIsProfileComplete] = useState(true);
  const [isCheckingTier, setIsCheckingTier] = useState(!!requiredTier);
  const [userTier, setUserTier] = useState<SubscriptionTier>('free');

  // Check profile completion
  useEffect(() => {
    if (!requireProfileComplete || !isSignedIn) {
      setIsCheckingProfile(false);
      return;
    }

    const checkProfile = async () => {
      const complete = await checkProfileComplete(getToken);
      setIsProfileComplete(complete);
      setIsCheckingProfile(false);
    };

    checkProfile();
  }, [isSignedIn, requireProfileComplete, getToken]);

  // Check subscription tier
  useEffect(() => {
    if (!requiredTier || !isSignedIn) {
      setIsCheckingTier(false);
      return;
    }

    const checkTier = async () => {
      const tier = await getSubscriptionTier(getToken);
      setUserTier(tier);
      setIsCheckingTier(false);
    };

    checkTier();
  }, [isSignedIn, requiredTier, getToken]);

  // Show loading while Clerk initializes
  if (!isLoaded) {
    return <LoadingScreen />;
  }

  // Show loading while checking profile/tier
  if (isCheckingProfile || isCheckingTier) {
    return <LoadingScreen />;
  }

  // Not signed in - redirect to login
  if (!isSignedIn) {
    return <Navigate to={fallbackPath} state={{ from: location.pathname }} replace />;
  }

  // Check email verification
  if (requireEmailVerification && user && !user.primaryEmailAddress?.verification?.status) {
    return <Navigate to="/verify-email" state={{ from: location.pathname }} replace />;
  }

  // Check profile completion
  if (requireProfileComplete && !isProfileComplete) {
    return <Navigate to="/profile-setup" state={{ from: location.pathname }} replace />;
  }

  // Check subscription tier
  if (requiredTier) {
    const tierOrder: SubscriptionTier[] = [
      'free',
      'basic',
      'plus',
      'premium',
      'premium_plus',
      'elite',
    ];
    const requiredIndex = tierOrder.indexOf(requiredTier);
    const userIndex = tierOrder.indexOf(userTier);

    if (userIndex < requiredIndex) {
      return (
        <Navigate to="/subscription" state={{ from: location.pathname, requiredTier }} replace />
      );
    }
  }

  return <>{children}</>;
};

/**
 * Simple signed-in only route
 */
export const SignedInRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <Navigate to="/login" state={{ from: location.pathname }} replace />
      </SignedOut>
    </>
  );
};

/**
 * Public only route (redirect if signed in)
 */
export const PublicOnlyRoute: React.FC<{ children: React.ReactNode; redirectTo?: string }> = ({
  children,
  redirectTo = '/discover',
}) => {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <LoadingScreen />;
  }

  if (isSignedIn) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default ClerkProtectedRoute;
