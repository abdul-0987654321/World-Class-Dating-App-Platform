/**
 * Mock Mode Utility
 *
 * PRODUCTION SAFETY: Mock data should NEVER be used in production.
 *
 * Mock mode is only enabled when ALL of these conditions are true:
 * 1. Running in development mode (import.meta.env.MODE === 'development')
 * 2. VITE_USE_MOCKS is explicitly set to 'true'
 * 3. VITE_API_URL is NOT set (no real API available)
 *
 * To enable mocks for local development without a backend:
 * - Add VITE_USE_MOCKS=true to your .env.local file
 * - Remove VITE_API_URL from your .env.local file
 *
 * For production or when using a real backend:
 * - Set VITE_API_URL to your API endpoint
 * - Do NOT set VITE_USE_MOCKS
 */

/**
 * Check if mock mode should be enabled
 * Returns true only in development with explicit opt-in and no API URL
 */
export const isMockModeEnabled = (): boolean => {
  return (
    import.meta.env.MODE === 'development' &&
    import.meta.env.VITE_USE_MOCKS === 'true' &&
    !import.meta.env.VITE_API_URL
  );
};

/**
 * Pre-computed mock mode flag for services to use
 * This is evaluated once at module load time
 */
export const MOCK_MODE = isMockModeEnabled();

/**
 * Log a warning if mock mode is detected (for debugging)
 */
if (MOCK_MODE) {
  console.warn(
    '⚠️ Mock mode is enabled. API calls will return fake data.',
    '\nTo disable, remove VITE_USE_MOCKS from .env or set VITE_API_URL.'
  );
}

/**
 * Helper to conditionally load mock data
 * @param mockLoader Function that returns mock data
 * @param apiLoader Function that returns real API data
 */
export async function loadWithMockFallback<T>(
  mockLoader: () => Promise<T>,
  apiLoader: () => Promise<T>
): Promise<T> {
  if (MOCK_MODE) {
    return mockLoader();
  }
  return apiLoader();
}
