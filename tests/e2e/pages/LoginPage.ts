/**
 * Login Page Object
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly forgotPasswordLink: Locator;
  readonly signupLink: Locator;
  readonly googleOAuthButton: Locator;
  readonly appleOAuthButton: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator('[data-testid="login-email"], input[type="email"], input[name="email"]').first();
    this.passwordInput = page.locator('[data-testid="login-password"], input[type="password"]').first();
    this.submitButton = page.locator('[data-testid="login-submit"], button[type="submit"]').first();
    this.errorMessage = page.locator('[data-testid="login-error"], .error-message, [role="alert"]').first();
    this.forgotPasswordLink = page.locator('[data-testid="forgot-password"], a[href*="forgot"]').first();
    this.signupLink = page.locator('[data-testid="signup-link"], a[href*="signup"], a[href*="register"]').first();
    this.googleOAuthButton = page.locator('[data-testid="google-oauth"], button:has-text("Google")').first();
    this.appleOAuthButton = page.locator('[data-testid="apple-oauth"], button:has-text("Apple")').first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
    await this.waitForPageLoad();
  }

  async login(email: string, password: string): Promise<void> {
    await this.safeFill(this.emailInput, email);
    await this.safeFill(this.passwordInput, password);
    await this.safeClick(this.submitButton);
    await this.waitForLoadingComplete();
  }

  async expectError(message?: string): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    if (message) {
      await expect(this.errorMessage).toContainText(message);
    }
  }

  async goToSignup(): Promise<void> {
    await this.safeClick(this.signupLink);
  }

  async goToForgotPassword(): Promise<void> {
    await this.safeClick(this.forgotPasswordLink);
  }
}
