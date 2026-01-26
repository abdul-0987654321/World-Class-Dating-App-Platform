/**
 * Auth Token Service - Okta Integration
 *
 * This service provides a bridge between Okta's authentication and
 * the rest of the application. It stores the Okta access token
 * for use in API requests.
 *
 * USAGE:
 * - Call setOktaToken() after Okta sign-in to store the token
 * - Call getToken() to retrieve the token for API requests
 * - The token is automatically refreshed by Okta
 */

class AuthTokenService {
  private oktaToken: string | null = null;
  private tokenPromise: (() => Promise<string | null>) | null = null;

  /**
   * Set the Okta token getter function
   * This should be called once when the app initializes with Okta
   */
  setTokenGetter(getter: () => Promise<string | null>): void {
    this.tokenPromise = getter;
  }

  /**
   * Set the current Okta token
   * Called after successful Okta authentication
   */
  setOktaToken(token: string | null): void {
    this.oktaToken = token;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.oktaToken;
  }

  /**
   * Get the current access token
   * Returns the Okta JWT token for API requests
   */
  getToken(): string | null {
    return this.oktaToken;
  }

  /**
   * Get token asynchronously (preferred method)
   * This ensures we always have a fresh token from Okta
   */
  async getTokenAsync(): Promise<string | null> {
    if (this.tokenPromise) {
      try {
        const token = await this.tokenPromise();
        this.oktaToken = token;
        return token;
      } catch (error) {
        console.error('Failed to get Okta token:', error);
        return this.oktaToken;
      }
    }
    return this.oktaToken;
  }

  /**
   * Legacy method - marks user as authenticated
   * @deprecated Use setOktaToken instead
   */
  setAuthenticated(authenticated: boolean): void {
    if (!authenticated) {
      this.oktaToken = null;
    }
  }

  /**
   * Legacy method - set tokens
   * @deprecated Use setOktaToken instead
   */
  setTokens(accessToken: string, _refreshToken?: string): void {
    this.oktaToken = accessToken;
  }

  /**
   * Clear authentication state
   */
  clearTokens(): void {
    this.oktaToken = null;

    // Clear any legacy storage
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('refreshToken');
    localStorage.removeItem('authToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  /**
   * Get the refresh token
   * @deprecated Okta handles token refresh automatically
   */
  getRefreshToken(): string | null {
    return null;
  }

  /**
   * Get Authorization header with Bearer token
   */
  getAuthorizationHeader(): Record<string, string> {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}

export const authTokenService = new AuthTokenService();
export default authTokenService;
