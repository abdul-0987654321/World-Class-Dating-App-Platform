/**
 * Clerk Authentication Service
 *
 * Provides authentication utilities using Clerk.
 * Integrates with Flamoral backend for user sync.
 */

import { useAuth, useUser, useClerk, useSession } from '@clerk/clerk-react';
import logger from '../utils/logger';

// API base URL
const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Sync Clerk user with Flamoral backend
 */
export async function syncUserWithBackend(clerkUserId: string, token: string): Promise<void> {
  if (!API_URL) return;

  try {
    const response = await fetch(`${API_URL}/api/v1/users/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ clerkUserId }),
      credentials: 'include',
    });

    if (!response.ok) {
      logger.warn('User sync failed', { status: response.status });
    }
  } catch (error) {
    logger.warn('User sync error', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Get authenticated API headers
 */
export async function getAuthHeaders(
  getToken: () => Promise<string | null>
): Promise<Record<string, string>> {
  const token = await getToken();

  if (!token) {
    return {
      'Content-Type': 'application/json',
    };
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Make authenticated API request
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit,
  getToken: () => Promise<string | null>
): Promise<Response> {
  const token = await getToken();

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
}

/**
 * Hook: Get current user's Flamoral profile
 */
export function useUserProfile() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { getToken } = useAuth();

  const fetchProfile = async () => {
    if (!user || !API_URL) return null;

    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/v1/users/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        return response.json();
      }
    } catch (error) {
      logger.error('Failed to fetch profile', error instanceof Error ? error : undefined, {
        clerkUserId: user?.id,
      });
    }

    return null;
  };

  return {
    user,
    isUserLoaded,
    fetchProfile,
  };
}

/**
 * Check if user has completed profile setup
 */
export async function checkProfileComplete(
  getToken: () => Promise<string | null>
): Promise<boolean> {
  if (!API_URL) return true;

  try {
    const token = await getToken();
    const response = await fetch(`${API_URL}/api/v1/users/profile/status`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      return data.isComplete;
    }
  } catch (error) {
    logger.error('Profile status check failed', error instanceof Error ? error : undefined);
  }

  return false;
}

/**
 * User subscription tier
 */
export type SubscriptionTier = 'free' | 'basic' | 'plus' | 'premium' | 'premium_plus' | 'elite';

/**
 * Get user's subscription tier
 */
export async function getSubscriptionTier(
  getToken: () => Promise<string | null>
): Promise<SubscriptionTier> {
  if (!API_URL) return 'free';

  try {
    const token = await getToken();
    const response = await fetch(`${API_URL}/api/v1/subscriptions/current`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      return data.tier || 'free';
    }
  } catch (error) {
    logger.error('Subscription check failed', error instanceof Error ? error : undefined);
  }

  return 'free';
}

/**
 * Check if user has specific feature access
 */
export async function hasFeatureAccess(
  feature: string,
  getToken: () => Promise<string | null>
): Promise<boolean> {
  if (!API_URL) return true;

  try {
    const token = await getToken();
    const response = await fetch(`${API_URL}/api/v1/entitlements/check?feature=${feature}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      return data.hasAccess;
    }
  } catch (error) {
    logger.error('Feature access check failed', error instanceof Error ? error : undefined, {
      feature,
    });
  }

  return false;
}

export default {
  syncUserWithBackend,
  getAuthHeaders,
  authenticatedFetch,
  checkProfileComplete,
  getSubscriptionTier,
  hasFeatureAccess,
};
