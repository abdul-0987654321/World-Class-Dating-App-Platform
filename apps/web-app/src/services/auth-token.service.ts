/**
 * Auth Token Service - SECURE VERSION with httpOnly Cookies
 *
 * SECURITY IMPLEMENTATION:
 * - Access tokens are stored in httpOnly cookies (set by backend)
 * - httpOnly cookies are NOT accessible to JavaScript (XSS protection)
 * - Cookies are automatically sent with requests via credentials: 'include'
 * - This service manages authentication state WITHOUT direct token access
 *
 * NOTE: The actual tokens are managed entirely by the backend via httpOnly cookies.
 * The frontend only tracks authentication state, not the tokens themselves.
 */

class AuthTokenService {
  // Track authentication state (not the actual token, which is httpOnly)
  private isLoggedIn = false;

  /**
   * Check if user is authenticated
   * This is for UI purposes only - actual auth is validated by backend via httpOnly cookie
   *
   * In production mode: relies on session state
   * In mock mode: falls back to sessionStorage for development
   */
  isAuthenticated(): boolean {
    // Check if we're in mock mode (no API URL)
    const isMock = !import.meta.env.VITE_API_URL;

    if (isMock) {
      // Mock mode: use sessionStorage for development compatibility
      return !!sessionStorage.getItem('authToken');
    }

    // Production mode: rely on tracked login state
    // The actual auth cookie is httpOnly and cannot be read by JavaScript
    return this.isLoggedIn;
  }

  /**
   * Mark user as authenticated
   * Called after successful login/register
   *
   * NOTE: In production, the actual token is in an httpOnly cookie set by the backend.
   * This method just updates the UI state.
   */
  setAuthenticated(authenticated: boolean): void {
    this.isLoggedIn = authenticated;
  }

  /**
   * Get the access token - DEPRECATED for production use
   *
   * WARNING: In production, tokens are in httpOnly cookies and cannot be accessed.
   * This method only works in mock mode for development compatibility.
   *
   * @deprecated Use isAuthenticated() instead. Tokens should not be accessed by JS.
   */
  getToken(): string | null {
    const isMock = !import.meta.env.VITE_API_URL;

    if (isMock) {
      // Mock mode only - for development compatibility
      return sessionStorage.getItem('authToken');
    }

    // Production: tokens are in httpOnly cookies, not accessible to JS
    console.warn(
      'getToken() called in production mode - tokens are in httpOnly cookies and not accessible'
    );
    return null;
  }

  /**
   * Get the refresh token - DEPRECATED for production use
   *
   * WARNING: In production, tokens are in httpOnly cookies and cannot be accessed.
   *
   * @deprecated Refresh tokens are handled automatically by the backend via httpOnly cookies.
   */
  getRefreshToken(): string | null {
    const isMock = !import.meta.env.VITE_API_URL;

    if (isMock) {
      // Mock mode only - for development compatibility
      return sessionStorage.getItem('refreshToken');
    }

    // Production: refresh tokens are in httpOnly cookies
    return null;
  }

  /**
   * Set tokens - For mock mode only
   *
   * In production, tokens are set by the backend via httpOnly cookies.
   * This method is only used in mock mode for development.
   *
   * @param accessToken The access token (mock mode only)
   * @param refreshToken Optional refresh token (mock mode only)
   */
  setTokens(accessToken: string, refreshToken?: string): void {
    const isMock = !import.meta.env.VITE_API_URL;

    if (isMock) {
      // Mock mode: store in sessionStorage for development
      sessionStorage.setItem('authToken', accessToken);
      if (refreshToken) {
        sessionStorage.setItem('refreshToken', refreshToken);
      }
    }

    // Mark as authenticated regardless of mode
    this.isLoggedIn = true;
  }

  /**
   * Clear authentication state
   *
   * NOTE: In production, the actual httpOnly cookies are cleared by the backend
   * on logout. This method clears the frontend state and any legacy storage.
   */
  clearTokens(): void {
    this.isLoggedIn = false;

    // Clear any session storage (mock mode or migration)
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('refreshToken');

    // Clear any legacy localStorage tokens for migration
    localStorage.removeItem('authToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  /**
   * Get Authorization header value - DEPRECATED for production
   *
   * In production with httpOnly cookies, the Authorization header is not needed.
   * The browser automatically sends the httpOnly cookie with requests.
   *
   * This method exists for backwards compatibility and mobile app support.
   *
   * @deprecated For web apps, cookies are sent automatically. No header needed.
   */
  getAuthorizationHeader(): Record<string, string> {
    const isMock = !import.meta.env.VITE_API_URL;

    if (isMock) {
      // Mock mode: include Bearer token in header
      const token = this.getToken();
      return token ? { Authorization: 'Bearer ' + token } : {};
    }

    // Production: cookies are sent automatically, no header needed
    return {};
  }
}

export const authTokenService = new AuthTokenService();
export default authTokenService;
