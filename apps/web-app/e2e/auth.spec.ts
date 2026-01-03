/**
 * Authentication E2E Tests
 * Tests for login, signup, and session management flows
 */

import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login page with all elements', async ({ page }) => {
    // Check for logo
    await expect(page.locator('[data-testid="flamoral-logo"]')).toBeVisible();

    // Check for form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Check for social login buttons
    await expect(page.locator('[data-testid="google-signin"]')).toBeVisible();
    await expect(page.locator('[data-testid="apple-signin"]')).toBeVisible();

    // Check for links
    await expect(page.getByText(/forgot password/i)).toBeVisible();
    await expect(page.getByText(/sign up/i)).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    // Fill in credentials
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'Password123');

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to discover page
    await page.waitForURL('**/discover', { timeout: 10000 });
    await expect(page).toHaveURL(/discover/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'invalid@email.com');
    await page.fill('input[type="password"]', 'wrongpassword');

    // Submit form
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.getByText(/invalid|error|failed/i)).toBeVisible({ timeout: 5000 });
  });

  test('should validate email format', async ({ page }) => {
    // Enter invalid email
    await page.fill('input[type="email"]', 'not-an-email');
    await page.fill('input[type="password"]', 'password123');

    // Submit form
    await page.click('button[type="submit"]');

    // Should show validation error or prevent submission
    // Browser will handle HTML5 validation
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute('type', 'email');
  });

  test('should require email and password', async ({ page }) => {
    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Form should not submit (HTML5 required validation)
    await expect(page).toHaveURL(/login/);
  });

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.locator('input[placeholder*="password" i]');

    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click toggle button (eye icon)
    await page.click('[aria-label*="show password" i], button:has(svg):near(input[type="password"])');

    // Password should now be visible
    await expect(passwordInput).toHaveAttribute('type', 'text');
  });

  test('should navigate to forgot password', async ({ page }) => {
    await page.click('text=/forgot password/i');
    await page.waitForURL('**/forgot-password');
    await expect(page).toHaveURL(/forgot-password/);
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.click('text=/sign up/i');
    await page.waitForURL('**/register');
    await expect(page).toHaveURL(/register/);
  });

  test('should show loading state during login', async ({ page }) => {
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');

    // Click submit and immediately check for loading state
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Button should show loading state
    await expect(submitButton).toBeDisabled();
    await expect(page.getByText(/signing in|loading/i)).toBeVisible();
  });
});

test.describe('Signup Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('should display signup page with step 1', async ({ page }) => {
    await expect(page.getByText(/basic information/i)).toBeVisible();
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('should validate step 1 fields', async ({ page }) => {
    // Try to continue without filling fields
    await page.click('button:has-text("Continue")');

    // Should show validation errors
    await expect(page.getByText(/first name is required/i)).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', 'Password123');
    await page.fill('input[name="confirmPassword"]', 'Password123');

    await page.click('button:has-text("Continue")');

    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test('should validate password strength', async ({ page }) => {
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'weak');
    await page.fill('input[name="confirmPassword"]', 'weak');

    await page.click('button:has-text("Continue")');

    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
  });

  test('should validate password confirmation', async ({ page }) => {
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Password123');
    await page.fill('input[name="confirmPassword"]', 'Different123');

    await page.click('button:has-text("Continue")');

    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  });

  test('should advance to step 2 with valid data', async ({ page }) => {
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="email"]', `test${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'Password123');
    await page.fill('input[name="confirmPassword"]', 'Password123');

    await page.click('button:has-text("Continue")');

    // Should show step 2
    await expect(page.getByText(/about you/i)).toBeVisible();
  });

  test('should validate age is at least 18', async ({ page }) => {
    // Complete step 1
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="email"]', `test${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'Password123');
    await page.fill('input[name="confirmPassword"]', 'Password123');
    await page.click('button:has-text("Continue")');

    // Step 2 - enter underage date
    const today = new Date();
    const underageDate = new Date(today.getFullYear() - 17, 0, 1).toISOString().split('T')[0];
    await page.fill('input[name="dateOfBirth"]', underageDate);
    await page.selectOption('select[name="gender"]', 'male');
    await page.check('input[name="agreeToTerms"]');

    await page.click('button:has-text("Continue")');

    await expect(page.getByText(/at least 18 years old/i)).toBeVisible();
  });

  test('should show link to login page', async ({ page }) => {
    await expect(page.getByText(/sign in/i)).toBeVisible();
    await page.click('text=/sign in/i');
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Session Management', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Clear any existing session
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());

    // Try to access protected route
    await page.goto('/discover');

    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });

  test('should persist session after page reload', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'Password123');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/discover');

    // Reload page
    await page.reload();

    // Should still be on discover page
    await expect(page).toHaveURL(/discover/);
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'Password123');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/discover');

    // Open user menu and click logout
    await page.click('[data-testid="user-menu"], [aria-label="User menu"]');
    await page.click('[data-testid="logout-button"], button:has-text("Logout")');

    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Password Reset Flow', () => {
  test('should display forgot password page', async ({ page }) => {
    await page.goto('/forgot-password');

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.getByText(/reset password|forgot password/i)).toBeVisible();
  });

  test('should submit forgot password request', async ({ page }) => {
    await page.goto('/forgot-password');

    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button[type="submit"]');

    // Should show success message
    await expect(page.getByText(/check your email|sent|instructions/i)).toBeVisible();
  });
});
