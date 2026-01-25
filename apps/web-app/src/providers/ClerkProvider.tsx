/**
 * Clerk Authentication Provider
 *
 * Wraps the application with Clerk authentication context.
 * Provides:
 * - Session management
 * - User authentication state
 * - Sign in/sign up flows
 * - MFA support
 * - Email verification
 */

import React from 'react';
import { ClerkProvider as ClerkProviderBase, ClerkLoaded, ClerkLoading } from '@clerk/clerk-react';
import { useNavigate, useLocation } from 'react-router-dom';
import logger from '../utils/logger';

// Clerk publishable key - loaded from environment
const CLERK_PUBLISHABLE_KEY =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_live_Y2xlcmsuZmxhbW9yYWwuY29tJA';

if (!CLERK_PUBLISHABLE_KEY) {
  logger.error('Missing VITE_CLERK_PUBLISHABLE_KEY environment variable');
}

// Loading spinner component
const LoadingSpinner: React.FC = () => (
  <div
    style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#14141f',
    }}
  >
    <div
      style={{
        width: '48px',
        height: '48px',
        border: '3px solid #2d2d3d',
        borderTopColor: '#FF6B7A',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }}
    />
    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

interface ClerkProviderProps {
  children: React.ReactNode;
}

/**
 * Clerk Provider Component
 *
 * Provides authentication context to the entire application.
 * Handles navigation after sign-in/sign-up.
 */
export const ClerkProvider: React.FC<ClerkProviderProps> = ({ children }) => {
  const navigate = useNavigate();

  return (
    <ClerkProviderBase
      publishableKey={CLERK_PUBLISHABLE_KEY}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      signInFallbackRedirectUrl="/discover"
      signUpFallbackRedirectUrl="/profile-setup"
      signInUrl="/login"
      signUpUrl="/signup"
      appearance={{
        baseTheme: undefined,
        variables: {
          colorPrimary: '#D62839',
          colorBackground: '#ffffff',
          colorText: '#1a1a2e',
          colorTextSecondary: '#6b7280',
          colorInputBackground: '#f9fafb',
          colorInputText: '#1a1a2e',
          borderRadius: '0.75rem',
          fontFamily: 'DM Sans, Inter, system-ui, sans-serif',
        },
        elements: {
          // Card styling
          card: {
            backgroundColor: '#ffffff',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            borderRadius: '1.5rem',
            border: '1px solid #e5e7eb',
          },
          // Header styling
          headerTitle: {
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#1a1a2e',
          },
          headerSubtitle: {
            color: '#6b7280',
          },
          // Form styling
          formButtonPrimary: {
            backgroundColor: '#D62839',
            '&:hover': {
              backgroundColor: '#B82232',
            },
            borderRadius: '0.75rem',
            fontWeight: '600',
            minHeight: '48px',
          },
          formFieldInput: {
            borderRadius: '0.75rem',
            border: '1px solid #e5e7eb',
            '&:focus': {
              borderColor: '#D62839',
              boxShadow: '0 0 0 3px rgba(214, 40, 57, 0.1)',
            },
          },
          formFieldLabel: {
            color: '#374151',
            fontWeight: '500',
          },
          // Social buttons
          socialButtonsBlockButton: {
            borderRadius: '0.75rem',
            border: '1px solid #e5e7eb',
            '&:hover': {
              backgroundColor: '#f9fafb',
            },
          },
          // Footer
          footerActionLink: {
            color: '#D62839',
            '&:hover': {
              color: '#B82232',
            },
          },
          // Divider
          dividerLine: {
            backgroundColor: '#e5e7eb',
          },
          dividerText: {
            color: '#9ca3af',
          },
          // Identity preview
          identityPreviewEditButton: {
            color: '#D62839',
          },
          // Alert
          alert: {
            borderRadius: '0.75rem',
          },
          alertText: {
            fontSize: '0.875rem',
          },
          // Avatar
          avatarBox: {
            borderRadius: '50%',
          },
          // User button
          userButtonPopoverCard: {
            borderRadius: '1rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          },
          userButtonPopoverActionButton: {
            '&:hover': {
              backgroundColor: '#f9fafb',
            },
          },
          // Modal
          modalBackdrop: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          },
          modalContent: {
            borderRadius: '1.5rem',
          },
        },
      }}
    >
      <ClerkLoading>
        <LoadingSpinner />
      </ClerkLoading>
      <ClerkLoaded>{children}</ClerkLoaded>
    </ClerkProviderBase>
  );
};

export default ClerkProvider;
