/**
 * Okta Callback Page
 *
 * Handles the OIDC callback after authentication.
 * Processes the authorization code exchange and redirects to the appropriate page.
 */

import React, { useEffect } from 'react';
import { useOktaAuth } from '@okta/okta-react';
import { useNavigate } from 'react-router-dom';
import { LoginCallback } from '@okta/okta-react';
import logger from '../../utils/logger';

// Loading component with Flamoral branding
const LoadingScreen: React.FC = () => (
  <div
    className="min-h-screen flex items-center justify-center flex-col"
    style={{
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
    }}
  >
    <div className="text-center">
      <div
        className="w-16 h-16 border-4 rounded-full animate-spin mx-auto mb-6"
        style={{
          borderColor: '#2d2d3d',
          borderTopColor: '#D62839',
        }}
      />
      <h2 className="text-white text-xl font-semibold mb-2">Completing sign in...</h2>
      <p className="text-gray-400 text-sm">Please wait while we verify your credentials</p>
    </div>
  </div>
);

// Error component
const ErrorScreen: React.FC<{ error: Error }> = ({ error }) => {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex items-center justify-center flex-col px-4"
      style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
      }}
    >
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h2 className="text-white text-xl font-semibold mb-2">Authentication Error</h2>
        <p className="text-gray-400 text-sm mb-6">
          {error.message || 'An error occurred during authentication. Please try again.'}
        </p>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-3 bg-[#D62839] hover:bg-[#B82232] text-white font-semibold rounded-xl transition-colors"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
};

export const OktaCallbackPage: React.FC = () => {
  const { oktaAuth, authState } = useOktaAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Handle successful authentication
    if (authState?.isAuthenticated) {
      logger.info('Okta authentication successful');

      // Check if user needs profile setup
      // For now, redirect to discover or profile-setup based on user data
      navigate('/discover', { replace: true });
    }
  }, [authState, navigate]);

  const handleError = (error: Error) => {
    logger.error('Okta callback error', error);
    return <ErrorScreen error={error} />;
  };

  return (
    <LoginCallback
      loadingElement={<LoadingScreen />}
      errorComponent={({ error }) => handleError(error)}
    />
  );
};

export default OktaCallbackPage;
