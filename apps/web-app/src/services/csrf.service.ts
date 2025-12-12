/**
 * CSRF Token Service
 * Manages CSRF tokens for the web application
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

class CsrfService {
  private token: string | null = null;

  /**
   * Get CSRF token from cookie
   */
  getTokenFromCookie(): string | null {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'XSRF-TOKEN') {
        return decodeURIComponent(value);
      }
    }
    return null;
  }

  /**
   * Fetch CSRF token from server
   */
  async fetchToken(): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/csrf/token`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch CSRF token');
      }

      const data = await response.json();
      this.token = data.csrfToken;
      return this.token;
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
      throw error;
    }
  }

  /**
   * Get current CSRF token, fetching if necessary
   */
  async getToken(): Promise<string> {
    // Try cookie first (most up-to-date)
    const cookieToken = this.getTokenFromCookie();
    if (cookieToken) {
      this.token = cookieToken;
      return cookieToken;
    }

    // Use cached token if available
    if (this.token) {
      return this.token;
    }

    // Fetch new token
    return this.fetchToken();
  }

  /**
   * Refresh CSRF token
   */
  async refreshToken(): Promise<string> {
    this.token = null;
    return this.fetchToken();
  }

  /**
   * Get CSRF token header object
   */
  async getTokenHeader(): Promise<{ 'X-CSRF-Token': string }> {
    const token = await this.getToken();
    return { 'X-CSRF-Token': token };
  }

  /**
   * Verify CSRF token is valid
   */
  async verifyToken(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/csrf/verify`, {
        method: 'GET',
        credentials: 'include',
        headers: await this.getTokenHeader(),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.valid;
    } catch (error) {
      console.error('Error verifying CSRF token:', error);
      return false;
    }
  }

  /**
   * Clear cached token
   */
  clearToken(): void {
    this.token = null;
  }

  /**
   * Add CSRF token to FormData
   */
  async addToFormData(formData: FormData): Promise<FormData> {
    const token = await this.getToken();
    formData.append('_csrf', token);
    return formData;
  }

  /**
   * Add CSRF token to request body
   */
  async addToBody<T extends Record<string, unknown>>(body: T): Promise<T & { _csrf: string }> {
    const token = await this.getToken();
    return {
      ...body,
      _csrf: token,
    };
  }
}

export const csrfService = new CsrfService();
export default csrfService;
