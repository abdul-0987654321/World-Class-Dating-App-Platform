/**
 * Auth Token Service - JWT Authentication
 *
 * This service manages JWT authentication tokens.
 * In production, tokens are stored in httpOnly cookies by the backend,
 * so this service mainly tracks authentication state.
 *
 * For development/mock mode, it can store tokens in sessionStorage.
 */

class AuthTokenService {
  private isAuth: boolean = false;
  private mockToken: string | null = null;

  constructor() {
    // Check if there's a stored session on initialization
    this.initializeFromStorage();
  }

  /**
   * Initialize authentication state from storage
   */
  private initializeFromStorage(): void {
    // Check sessionStorage for user data (indicates active session)
    const storedUser = sessionStorage.getItem('currentUser');
    if (storedUser) {
      this.isAuth = true;
    }

    // Check for legacy token storage (mock mode)
    const legacyToken = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
    if (legacyToken) {
      this.mockToken = legacyToken;
      this.isAuth = true;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.isAuth;
  }

  /**
   * Set authentication state
   * In production, this is called after successful login/logout
   * Tokens are in httpOnly cookies, not accessible to JavaScript
   */
  setAuthenticated(authenticated: boolean): void {
    this.isAuth = authenticated;
    if (!authenticated) {
      this.mockToken = null;
    }
  }

  /**
   * Set tokens (for mock/development mode)
   * In production, tokens are in httpOnly cookies set by the backend
   */
  setTokens(accessToken: string, refreshToken?: string): void {
    this.mockToken = accessToken;
    this.isAuth = true;

    // Store in sessionStorage for mock mode persistence
    if (accessToken) {
      sessionStorage.setItem('authToken', accessToken);
    }
    if (refreshToken) {
      sessionStorage.setItem('refreshToken', refreshToken);
    }
  }

  /**
   * Get the current access token
   * In production with httpOnly cookies, this returns null
   * (tokens are sent automatically with requests via credentials: 'include')
   */
  getToken(): string | null {
    return this.mockToken;
  }

  /**
   * Get token asynchronously
   */
  async getTokenAsync(): Promise<string | null> {
    return this.mockToken;
  }

  /**
   * Get the refresh token (mock mode only)
   */
  getRefreshToken(): string | null {
    return sessionStorage.getItem('refreshToken');
  }

  /**
   * Clear all authentication data
   */
  clearTokens(): void {
    this.isAuth = false;
    this.mockToken = null;

    // Clear all storage
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('entitlements');
    localStorage.removeItem('authToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('userGender');
  }

  /**
   * Get Authorization header with Bearer token
   * In production with httpOnly cookies, returns empty object
   * (cookies are sent automatically)
   */
  getAuthorizationHeader(): Record<string, string> {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}

export const authTokenService = new AuthTokenService();
export default authTokenService;
