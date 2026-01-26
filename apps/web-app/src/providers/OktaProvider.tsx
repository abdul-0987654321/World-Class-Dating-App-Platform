/**
 * Okta Authentication Provider
 *
 * Wraps the application with Okta authentication context.
 * Provides:
 * - Session management
 * - User authentication state
 * - Sign in/sign up flows with PKCE
 * - Token management
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { OktaAuth, toRelativeUrl } from '@okta/okta-auth-js';
import { Security } from '@okta/okta-react';
import logger from '../utils/logger';

// Okta configuration - required from environment
const OKTA_CLIENT_ID = import.meta.env.VITE_OKTA_CLIENT_ID;
const OKTA_DOMAIN = import.meta.env.VITE_OKTA_DOMAIN;
const OKTA_REDIRECT_URI =
  import.meta.env.VITE_OKTA_REDIRECT_URI || `${window.location.origin}/login/callback`;
const OKTA_POST_LOGOUT_REDIRECT_URI =
  import.meta.env.VITE_OKTA_POST_LOGOUT_REDIRECT_URI || window.location.origin;

if (!OKTA_CLIENT_ID || !OKTA_DOMAIN) {
  const errorMessage =
    'Missing VITE_OKTA_CLIENT_ID or VITE_OKTA_DOMAIN environment variables. ' +
    'Please set these values in your .env file. ' +
    'Get these from your Okta dashboard.';
  logger.error(errorMessage);

  // In production, throw to prevent app from starting without auth
  if (import.meta.env.PROD) {
    throw new Error(errorMessage);
  }
}

// Create OktaAuth instance
const oktaAuth = new OktaAuth({
  issuer: `https://${OKTA_DOMAIN}/oauth2/default`,
  clientId: OKTA_CLIENT_ID,
  redirectUri: OKTA_REDIRECT_URI,
  postLogoutRedirectUri: OKTA_POST_LOGOUT_REDIRECT_URI,
  scopes: ['openid', 'profile', 'email'],
  pkce: true,
  tokenManager: {
    autoRenew: true,
    autoRemove: true,
  },
});

// Loading spinner component with Flamoral branding
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
        borderTopColor: '#D62839',
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

interface OktaProviderProps {
  children: React.ReactNode;
}

/**
 * Okta Provider Component
 *
 * Provides authentication context to the entire application.
 * Handles navigation after authentication.
 */
export const OktaProvider: React.FC<OktaProviderProps> = ({ children }) => {
  const navigate = useNavigate();

  const restoreOriginalUri = async (_oktaAuth: OktaAuth, originalUri: string) => {
    // Navigate to the original URI or default to discover
    const uri = toRelativeUrl(originalUri || '/', window.location.origin);
    navigate(uri === '/' ? '/discover' : uri, { replace: true });
  };

  const onAuthRequired = () => {
    // Redirect to login when authentication is required
    navigate('/login');
  };

  return (
    <Security
      oktaAuth={oktaAuth}
      restoreOriginalUri={restoreOriginalUri}
      onAuthRequired={onAuthRequired}
    >
      {children}
    </Security>
  );
};

// Export the oktaAuth instance for use in services
export { oktaAuth };
export default OktaProvider;
