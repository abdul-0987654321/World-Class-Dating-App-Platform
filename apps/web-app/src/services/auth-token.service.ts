/**
 * Auth Token Service - SECURE VERSION
 * Manages authentication tokens using sessionStorage (not localStorage)
 *
 * SECURITY NOTES:
 * - In production, tokens should be stored in httpOnly cookies
 * - This service exists for mock/development mode compatibility
 * - For production, the backend should set httpOnly cookies
 */

class AuthTokenService {
  private cachedToken: string | null = null;
  private cachedRefreshToken: string | null = null;

  /**
   * Get the access token
   * Uses sessionStorage for better security than localStorage
   */
  getToken(): string | null {
    if (this.cachedToken) {
      return this.cachedToken;
    }
    this.cachedToken = sessionStorage.getItem('authToken');
    return this.cachedToken;
  }

  /**
   * Get the refresh token
   * Uses sessionStorage for better security than localStorage
   */
  getRefreshToken(): string | null {
    if (this.cachedRefreshToken) {
      return this.cachedRefreshToken;
    }
    this.cachedRefreshToken = sessionStorage.getItem('refreshToken');
    return this.cachedRefreshToken;
  }

  /**
   * Set tokens
   * @param accessToken The access token
   * @param refreshToken Optional refresh token
   */
  setTokens(accessToken: string, refreshToken?: string): void {
    this.cachedToken = accessToken;
    sessionStorage.setItem('authToken', accessToken);

    if (refreshToken) {
      this.cachedRefreshToken = refreshToken;
      sessionStorage.setItem('refreshToken', refreshToken);
    }
  }

  /**
   * Clear all tokens
   */
  clearTokens(): void {
    this.cachedToken = null;
    this.cachedRefreshToken = null;
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('refreshToken');

    // Also clear any legacy localStorage tokens for migration
    localStorage.removeItem('authToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  /**
   * Check if user appears to be authenticated
   * This is for UI purposes only - server must validate all requests
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Get Authorization header value
   */
  getAuthorizationHeader(): Record<string, string> {
    const token = this.getToken();
    return token ? { Authorization: 'Bearer ' + token } : {};
  }
}

export const authTokenService = new AuthTokenService();
export default authTokenService;
