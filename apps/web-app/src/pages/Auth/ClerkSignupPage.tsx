/**
 * Clerk Signup Page
 *
 * Uses Clerk's SignUp component with Flamoral branding.
 * Supports:
 * - Email/password registration
 * - Social signups (Google, Apple, etc.)
 * - Email verification
 * - MFA setup
 */

import React from 'react';
import { SignUp, useAuth } from '@clerk/clerk-react';
import { Navigate, Link, useSearchParams } from 'react-router-dom';
import { FlamoralLogo } from '../../components/Logo/FlamoralLogo';

export const ClerkSignupPage: React.FC = () => {
  const { isSignedIn, isLoaded } = useAuth();
  const [searchParams] = useSearchParams();
  const tierParam = searchParams.get('tier');

  // Loading state
  if (!isLoaded) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 50%, #f8f9fa 100%)',
        }}
      >
        <div
          className="w-12 h-12 border-3 rounded-full animate-spin"
          style={{
            borderColor: '#e5e7eb',
            borderTopColor: '#D62839',
            borderWidth: '3px',
          }}
        />
      </div>
    );
  }

  // Already signed in - redirect
  if (isSignedIn) {
    if (tierParam) {
      return <Navigate to={`/subscription?tier=${tierParam}`} replace />;
    }
    return <Navigate to="/profile-setup" replace />;
  }

  return (
    <div
      className="min-h-screen min-h-[100dvh] w-full flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12 relative overflow-x-hidden"
      style={{
        background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 50%, #f8f9fa 100%)',
        paddingTop: 'max(2rem, env(safe-area-inset-top))',
        paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
      }}
    >
      {/* Main content */}
      <div className="relative w-full max-w-md sm:max-w-lg">
        {/* Logo header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center mb-4">
            <FlamoralLogo variant="primary" size="lg" showTagline={true} />
          </Link>
          <p className="text-gray-600 text-base font-medium">
            {tierParam
              ? `Join Flamoral ${tierParam.charAt(0).toUpperCase() + tierParam.slice(1)}`
              : 'Create your account'}
          </p>
        </div>

        {/* Clerk SignUp component */}
        <div className="clerk-signup-wrapper">
          <SignUp
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'bg-white shadow-xl border border-gray-100 rounded-2xl sm:rounded-3xl p-6 sm:p-8',
                headerTitle: 'text-gray-900 font-semibold text-xl',
                headerSubtitle: 'text-gray-600',
                socialButtonsBlockButton:
                  'border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all rounded-xl min-h-[48px]',
                socialButtonsBlockButtonText: 'text-gray-700 font-medium',
                dividerLine: 'bg-gray-200',
                dividerText: 'text-gray-500 text-sm',
                formFieldLabel: 'text-gray-700 font-medium text-sm',
                formFieldInput:
                  'border-gray-200 focus:border-[#D62839] focus:ring-[#D62839]/20 rounded-xl py-3 text-gray-900',
                formFieldInputShowPasswordButton: 'text-gray-500 hover:text-gray-700',
                formButtonPrimary:
                  'bg-[#D62839] hover:bg-[#B82232] text-white font-semibold rounded-xl min-h-[48px] transition-all hover:shadow-lg',
                footerActionLink: 'text-[#D62839] hover:text-[#B82232] font-semibold',
                identityPreviewEditButton: 'text-[#D62839]',
                formFieldAction: 'text-[#D62839] hover:text-[#B82232]',
                alertText: 'text-sm',
                formResendCodeLink: 'text-[#D62839] hover:text-[#B82232]',
                otpCodeFieldInput: 'border-gray-200 focus:border-[#D62839] rounded-lg',
                // Verification
                verificationLinkStatusBox: 'bg-green-50 border-green-200',
                verificationLinkStatusText: 'text-green-700',
                verificationLinkStatusIconBox: 'bg-green-100',
              },
            }}
            routing="path"
            path="/signup"
            signInUrl="/login"
            afterSignUpUrl={tierParam ? `/subscription?tier=${tierParam}` : '/profile-setup'}
          />
        </div>

        {/* Additional links */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-[#D62839] hover:text-[#B82232] font-semibold transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Terms */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-xs leading-relaxed">
            By signing up, you agree to our{' '}
            <Link to="/terms-of-service" className="text-[#D62839] hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy-policy" className="text-[#D62839] hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClerkSignupPage;
