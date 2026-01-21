import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/LoginPage';

test.describe('Authentication Flow', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('should display login page correctly', async () => {
    await loginPage.isLoaded();
    await expect(loginPage.googleSignInButton).toBeVisible();
    await expect(loginPage.appleSignInButton).toBeVisible();
  });

  test('should login with valid credentials', async () => {
    await loginPage.login(process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!);
    await loginPage.expectSuccessfulLogin();
  });

  test('should show error for invalid credentials', async () => {
    await loginPage.login('invalid@email.com', 'wrongpassword');
    await loginPage.expectErrorMessage('Invalid email or password');
  });

  test('should show error for empty email', async () => {
    await loginPage.login('', 'somepassword');
    await loginPage.expectErrorMessage('Email is required');
  });

  test('should show error for invalid email format', async () => {
    await loginPage.login('notanemail', 'somepassword');
    await loginPage.expectErrorMessage('Invalid email format');
  });

  test('should navigate to forgot password', async () => {
    await loginPage.clickForgotPassword();
  });

  test('should navigate to sign up', async () => {
    await loginPage.clickSignUp();
  });

  test('should maintain login with remember me', async ({ page, context }) => {
    await loginPage.loginWithRememberMe(
      process.env.TEST_USER_EMAIL!,
      process.env.TEST_USER_PASSWORD!
    );
    await loginPage.expectSuccessfulLogin();

    // Close and reopen browser
    const cookies = await context.cookies();
    expect(
      cookies.some((c) => c.name.includes('auth') && c.expires > Date.now() / 1000 + 86400)
    ).toBeTruthy();
  });

  test('should handle rate limiting', async () => {
    // Attempt multiple failed logins
    for (let i = 0; i < 6; i++) {
      await loginPage.login('test@test.com', 'wrongpassword');
    }
    await loginPage.expectErrorMessage('Too many attempts');
  });
});

test.describe('Session Management', () => {
  test('should redirect to login when session expires', async ({ page }) => {
    // Login first
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!);

    // Clear session storage/cookies
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.context().clearCookies();

    // Try to navigate to protected route
    await page.goto('/discover');
    await expect(page).toHaveURL(/.*login/);
  });

  test('should logout successfully', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!);
    await loginPage.expectSuccessfulLogin();

    // Logout
    await page.getByTestId('user-menu').click();
    await page.getByTestId('logout-button').click();
    await expect(page).toHaveURL(/.*login/);
  });
});
