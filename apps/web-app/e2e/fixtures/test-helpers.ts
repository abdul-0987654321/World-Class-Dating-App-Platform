import { Page, expect } from '@playwright/test';

/**
 * E2E Test Helpers for Playwright
 * Reusable utilities for common test operations
 */

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Login with credentials
   */
  async login(email: string, password: string) {
    await this.page.goto('/login');
    await this.page.fill('input[name="email"]', email);
    await this.page.fill('input[name="password"]', password);
    await this.page.click('button[type="submit"]');
    await this.page.waitForURL('/dashboard', { timeout: 10000 });
  }

  /**
   * Logout
   */
  async logout() {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="logout-button"]');
    await this.page.waitForURL('/login', { timeout: 10000 });
  }

  /**
   * Navigate to a specific profile
   */
  async navigateToProfile(userId: string) {
    await this.page.goto(`/profile/${userId}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Swipe right on a profile
   */
  async swipeRight() {
    await this.page.click('[data-testid="swipe-right-button"]');
    await this.page.waitForTimeout(500); // Wait for animation
  }

  /**
   * Swipe left on a profile
   */
  async swipeLeft() {
    await this.page.click('[data-testid="swipe-left-button"]');
    await this.page.waitForTimeout(500); // Wait for animation
  }

  /**
   * Send a message in a conversation
   */
  async sendMessage(message: string) {
    await this.page.fill('[data-testid="message-input"]', message);
    await this.page.click('[data-testid="send-button"]');
    await this.page.waitForSelector(`text="${message}"`, { timeout: 5000 });
  }

  /**
   * Wait for toast notification
   */
  async waitForToast(message?: string) {
    const toast = this.page.locator('[data-testid="toast-notification"]');
    await expect(toast).toBeVisible({ timeout: 5000 });

    if (message) {
      await expect(toast).toContainText(message);
    }

    return toast;
  }

  /**
   * Wait for API request to complete
   */
  async waitForApiResponse(
    url: string | RegExp,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET'
  ) {
    return this.page.waitForResponse(
      (response) => {
        const matchesUrl =
          typeof url === 'string' ? response.url().includes(url) : url.test(response.url());
        return matchesUrl && response.request().method() === method;
      },
      { timeout: 10000 }
    );
  }

  /**
   * Upload a file
   */
  async uploadFile(selector: string, filePath: string) {
    const fileInput = this.page.locator(selector);
    await fileInput.setInputFiles(filePath);
  }

  /**
   * Take screenshot with custom name
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
  }

  /**
   * Wait for WebSocket connection
   */
  async waitForWebSocket() {
    await this.page.waitForEvent('websocket', { timeout: 10000 });
  }

  /**
   * Mock API response
   */
  async mockApiResponse(url: string | RegExp, responseBody: any, status = 200) {
    await this.page.route(url, (route) => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(responseBody),
      });
    });
  }

  /**
   * Clear all cookies and storage
   */
  async clearSession() {
    await this.page.context().clearCookies();
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  /**
   * Check if element is in viewport
   */
  async isInViewport(selector: string): Promise<boolean> {
    return this.page.locator(selector).evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
      );
    });
  }

  /**
   * Scroll element into view
   */
  async scrollIntoView(selector: string) {
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  /**
   * Wait for loading spinner to disappear
   */
  async waitForLoadingComplete() {
    await this.page.waitForSelector('[data-testid="loading-spinner"]', {
      state: 'hidden',
      timeout: 10000,
    });
  }

  /**
   * Check accessibility violations (requires @axe-core/playwright)
   */
  async checkAccessibility() {
    // This would require @axe-core/playwright to be installed
    // Example placeholder
    console.log('Accessibility check would run here');
  }
}

/**
 * Create test helpers instance
 */
export const createTestHelpers = (page: Page) => new TestHelpers(page);
