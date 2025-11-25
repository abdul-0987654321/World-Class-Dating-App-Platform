import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly forgotPasswordLink: Locator;
  readonly signUpLink: Locator;
  readonly googleSignInButton: Locator;
  readonly appleSignInButton: Locator;
  readonly rememberMeCheckbox: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId('login-email');
    this.passwordInput = page.getByTestId('login-password');
    this.submitButton = page.getByTestId('login-submit');
    this.errorMessage = page.getByTestId('login-error');
    this.forgotPasswordLink = page.getByTestId('forgot-password-link');
    this.signUpLink = page.getByTestId('signup-link');
    this.googleSignInButton = page.getByTestId('google-signin');
    this.appleSignInButton = page.getByTestId('apple-signin');
    this.rememberMeCheckbox = page.getByTestId('remember-me');
  }

  async goto() {
    await this.page.goto('/login');
    await expect(this.page).toHaveURL(/.*login/);
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async loginWithRememberMe(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.rememberMeCheckbox.check();
    await this.submitButton.click();
  }

  async expectErrorMessage(message: string) {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText(message);
  }

  async expectSuccessfulLogin() {
    await expect(this.page).toHaveURL(/.*discover|dashboard/);
  }

  async clickForgotPassword() {
    await this.forgotPasswordLink.click();
    await expect(this.page).toHaveURL(/.*forgot-password/);
  }

  async clickSignUp() {
    await this.signUpLink.click();
    await expect(this.page).toHaveURL(/.*signup/);
  }

  async isLoaded() {
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }
}
