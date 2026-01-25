/**
 * Clerk Login Page
 *
 * Uses Clerk's SignIn component with Flamoral branding.
 * Supports:
 * - Email/password login
 * - Social logins (Google, Apple, etc.)
 * - MFA verification
 * - Session management
 */

import React from 'react';
import { SignIn, useAuth } from '@clerk/clerk-react';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { FlamoralLogo } from '../../components/Logo/FlamoralLogo';

export const ClerkLoginPage: React.FC = () => {
  const { isSignedIn, isLoaded } = useAuth();
  const location = useLocation();

  // Get redirect path from location state
  const from = (location.state as { from?: string })?.from || '/discover';

  // Loading state
  if (!isLoaded) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
        }}
      >
        <div
          className="w-12 h-12 border-3 rounded-full animate-spin"
          style={{
            borderColor: '#2d2d3d',
            borderTopColor: '#FF6B7A',
            borderWidth: '3px',
          }}
        />
      </div>
    );
  }

  // Already signed in - redirect
  if (isSignedIn) {
    return <Navigate to={from} replace />;
  }

  return (
    <div
      className="min-h-screen min-h-[100dvh] w-full flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
        paddingTop: 'max(2rem, env(safe-area-inset-top))',
        paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
      }}
    >
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/4 -left-24 w-72 h-72 rounded-full filter blur-3xl opacity-30 animate-pulse"
          style={{ background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)' }}
        />
        <div
          className="absolute bottom-1/4 -right-24 w-72 h-72 rounded-full filter blur-3xl opacity-30 animate-pulse"
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
            animationDelay: '2s',
          }}
        />
      </div>

      {/* Main card */}
      <div className="relative w-full max-w-md">
        {/* Logo header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center mb-4">
            <FlamoralLogo variant="horizontal" size="lg" />
          </Link>
          <p className="text-gray-400 text-sm">Welcome back! Sign in to continue.</p>
        </div>

        {/* Clerk SignIn component */}
        <div className="clerk-signin-wrapper">
          <SignIn
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'bg-white/95 backdrop-blur-xl shadow-2xl border-0 rounded-2xl',
                headerTitle: 'text-gray-900 font-semibold',
                headerSubtitle: 'text-gray-600',
                socialButtonsBlockButton:
                  'border border-gray-200 hover:bg-gray-50 transition-colors rounded-xl',
                socialButtonsBlockButtonText: 'text-gray-700 font-medium',
                dividerLine: 'bg-gray-200',
                dividerText: 'text-gray-500 text-sm',
                formFieldLabel: 'text-gray-700 font-medium',
                formFieldInput:
                  'border-gray-200 focus:border-[#D62839] focus:ring-[#D62839]/20 rounded-xl',
                formButtonPrimary:
                  'bg-[#D62839] hover:bg-[#B82232] text-white font-semibold rounded-xl min-h-[48px] transition-colors',
                footerActionLink: 'text-[#D62839] hover:text-[#B82232] font-medium',
                identityPreviewEditButton: 'text-[#D62839]',
                formFieldAction: 'text-[#D62839] hover:text-[#B82232]',
                alertText: 'text-sm',
                formFieldInputShowPasswordButton: 'text-gray-500 hover:text-gray-700',
              },
            }}
            routing="path"
            path="/login"
            signUpUrl="/signup"
            afterSignInUrl={from}
          />
        </div>

        {/* Additional links */}
        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="text-[#D62839] hover:text-[#B82232] font-semibold transition-colors"
            >
              Sign up
            </Link>
          </p>
        </div>

        {/* Terms */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-xs">
            By continuing, you agree to our{' '}
            <Link to="/terms-of-service" className="text-gray-400 hover:text-white underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy-policy" className="text-gray-400 hover:text-white underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClerkLoginPage;
