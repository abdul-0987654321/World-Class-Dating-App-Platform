/**
 * Okta Token Sync Component
 *
 * Syncs Okta tokens with the auth token service for API calls.
 * Should be placed inside the OktaProvider context.
 */

import React, { useEffect } from 'react';
import { useOktaAuth } from '@okta/okta-react';
import { authTokenService } from '../../services/auth-token.service';
import { syncUserWithBackend } from '../../services/okta-auth.service';
import logger from '../../utils/logger';

interface OktaTokenSyncProps {
  children: React.ReactNode;
}

export const OktaTokenSync: React.FC<OktaTokenSyncProps> = ({ children }) => {
  const { authState, oktaAuth } = useOktaAuth();

  useEffect(() => {
    // Set up the token getter for async token fetching
    const tokenGetter = async (): Promise<string | null> => {
      try {
        const accessToken = await oktaAuth.getAccessToken();
        return accessToken || null;
      } catch (error) {
        logger.error('Failed to get Okta access token', error instanceof Error ? error : undefined);
        return null;
      }
    };

    authTokenService.setTokenGetter(tokenGetter);
  }, [oktaAuth]);

  useEffect(() => {
    // Sync token whenever auth state changes
    const syncToken = async () => {
      if (authState?.isAuthenticated) {
        try {
          const accessToken = await oktaAuth.getAccessToken();
          authTokenService.setOktaToken(accessToken || null);

          // Sync user with backend on sign in
          if (accessToken && authState.idToken?.claims?.sub) {
            const oktaUserId = authState.idToken.claims.sub as string;
            await syncUserWithBackend(oktaUserId, accessToken);
          }
        } catch (error) {
          logger.error('Failed to sync Okta token', error instanceof Error ? error : undefined);
          authTokenService.setOktaToken(null);
        }
      } else if (authState && !authState.isAuthenticated && !authState.isPending) {
        authTokenService.clearTokens();
      }
    };

    syncToken();

    // Set up periodic token refresh (every 50 seconds, tokens typically last 60+ seconds)
    const refreshInterval = setInterval(syncToken, 50000);
    return () => clearInterval(refreshInterval);
  }, [authState, oktaAuth]);

  return <>{children}</>;
};

export default OktaTokenSync;
