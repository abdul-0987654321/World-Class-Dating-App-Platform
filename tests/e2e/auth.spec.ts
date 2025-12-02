import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for Authentication Flow
 */

test.describe('User Registration and Login', () => {
  const testUser = {
    email: `test${Date.now()}@example.com`,
    password: 'Test123!@#',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1990-01-15'
  };

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should complete full registration flow', async ({ page }) => {
    // Navigate to registration
    await page.click('text=Sign Up');
    await expect(page).toHaveURL(/.*register/);

    // Fill registration form
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    await page.fill('input[name="firstName"]', testUser.firstName);
    await page.fill('input[name="lastName"]', testUser.lastName);

    // Date of birth
    await page.fill('input[name="dateOfBirth"]', testUser.dateOfBirth);

    // Gender selection
    await page.click('input[name="gender"][value="male"]');

    // Accept terms
    await page.check('input[name="acceptTerms"]');

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to profile setup
    await expect(page).toHaveURL(/.*profile\/setup/, { timeout: 10000 });

    // Verify welcome message
    await expect(page.locator('text=Welcome')).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.click('text=Sign Up');

    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', testUser.password);
    await page.blur('input[name="email"]');

    // Should show validation error
    await expect(page.locator('text=/invalid.*email/i')).toBeVisible();
  });

  test('should validate password strength', async ({ page }) => {
    await page.click('text=Sign Up');

    await page.fill('input[name="password"]', '123');
    await page.blur('input[name="password"]');

    // Should show password requirements
    await expect(page.locator('text=/password.*strong/i')).toBeVisible();
  });

  test('should validate age requirement', async ({ page }) => {
    await page.click('text=Sign Up');

    // Set date of birth to under 18
    const underageDate = new Date();
    underageDate.setFullYear(underageDate.getFullYear() - 17);

    await page.fill('input[name="dateOfBirth"]', underageDate.toISOString().split('T')[0]);
    await page.blur('input[name="dateOfBirth"]');

    // Should show age requirement error
    await expect(page.locator('text=/18.*older/i')).toBeVisible();
  });

  test('should prevent duplicate registration', async ({ page }) => {
    // First registration
    await page.click('text=Sign Up');
    await page.fill('input[name="email"]', 'duplicate@example.com');
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    await page.fill('input[name="firstName"]', testUser.firstName);
    await page.fill('input[name="lastName"]', testUser.lastName);
    await page.fill('input[name="dateOfBirth"]', testUser.dateOfBirth);
    await page.click('input[name="gender"][value="male"]');
    await page.check('input[name="acceptTerms"]');
    await page.click('button[type="submit"]');

    // Wait for registration
    await page.waitForTimeout(2000);

    // Logout
    await page.goto('/');

    // Try to register again with same email
    await page.click('text=Sign Up');
    await page.fill('input[name="email"]', 'duplicate@example.com');
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Should show error
    await expect(page.locator('text=/already.*exists/i')).toBeVisible();
  });

  test('should login successfully', async ({ page }) => {
    // Assuming user is already registered
    await page.click('text=Log In');
    await expect(page).toHaveURL(/.*login/);

    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard|discover/, { timeout: 10000 });

    // Verify user is logged in
    await expect(page.locator('text=/logout|profile/i')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.click('text=Log In');

    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', 'WrongPassword123!');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=/invalid.*credentials/i')).toBeVisible();
  });

  test('should handle forgot password flow', async ({ page }) => {
    await page.click('text=Log In');
    await page.click('text=Forgot Password');

    await expect(page).toHaveURL(/.*forgot-password/);

    await page.fill('input[name="email"]', testUser.email);
    await page.click('button[type="submit"]');

    // Should show success message
    await expect(page.locator('text=/email.*sent/i')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.click('text=Log In');
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*dashboard|discover/);

    // Logout
    await page.click('text=/logout|sign out/i');

    // Should redirect to home/login
    await expect(page).toHaveURL(/.*\/$|.*login/);

    // Should not be able to access protected routes
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*login/);
  });

  test('should maintain session on page reload', async ({ page }) => {
    // Login
    await page.click('text=Log In');
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*dashboard|discover/);

    // Reload page
    await page.reload();

    // Should still be logged in
    await expect(page.locator('text=/logout|profile/i')).toBeVisible();
    await expect(page).toHaveURL(/.*dashboard|discover/);
  });
});
