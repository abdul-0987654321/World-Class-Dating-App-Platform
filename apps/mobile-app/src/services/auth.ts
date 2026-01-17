/**
 * Auth Token Utility
 * Provides utility functions for accessing auth tokens
 */

import { TokenStorage, ACCESS_TOKEN_KEY } from '../hooks/useAuth';

/**
 * Get the current auth token
 */
export async function getAuthToken(): Promise<string | null> {
  return await TokenStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken();
  return token !== null;
}

export default { getAuthToken, isAuthenticated };
