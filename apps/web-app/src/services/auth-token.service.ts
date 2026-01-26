/**
 * Auth Token Service - Clerk Integration
 *
 * This service provides a bridge between Clerk's authentication and
 * the rest of the application. It stores the Clerk session token
 * for use in API requests.
 *
 * USAGE:
 * - Call setClerkToken() after Clerk sign-in to store the token
 * - Call getToken() to retrieve the token for API requests
 * - The token is automatically refreshed by Clerk
 */

class AuthTokenService {
  private clerkToken: string | null = null;
  private tokenPromise: (() => Promise<string | null>) | null = null;

  /**
   * Set the Clerk token getter function
   * This should be called once when the app initializes with Clerk
   */
  setTokenGetter(getter: () => Promise<string | null>): void {
    this.tokenPromise = getter;
  }

  /**
   * Set the current Clerk token
   * Called after successful Clerk authentication
   */
  setClerkToken(token: string | null): void {
    this.clerkToken = token;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.clerkToken;
  }

  /**
   * Get the current access token
   * Returns the Clerk JWT token for API requests
   */
  getToken(): string | null {
    return this.clerkToken;
  }

  /**
   * Get token asynchronously (preferred method)
   * This ensures we always have a fresh token from Clerk
   */
  async getTokenAsync(): Promise<string | null> {
    if (this.tokenPromise) {
      try {
        const token = await this.tokenPromise();
        this.clerkToken = token;
        return token;
      } catch (error) {
        console.error('Failed to get Clerk token:', error);
        return this.clerkToken;
      }
    }
    return this.clerkToken;
  }

  /**
   * Legacy method - marks user as authenticated
   * @deprecated Use setClerkToken instead
   */
  setAuthenticated(authenticated: boolean): void {
    if (!authenticated) {
      this.clerkToken = null;
    }
  }

  /**
   * Legacy method - set tokens
   * @deprecated Use setClerkToken instead
   */
  setTokens(accessToken: string, _refreshToken?: string): void {
    this.clerkToken = accessToken;
  }

  /**
   * Clear authentication state
   */
  clearTokens(): void {
    this.clerkToken = null;

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
   * @deprecated Clerk handles token refresh automatically
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
