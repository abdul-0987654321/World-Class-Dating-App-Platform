import { test as setup, expect } from '@playwright/test';
import path from 'path';

/**
 * Authentication setup for Playwright E2E tests
 * This runs before all other tests to establish authenticated state
 */

const authFile = path.join(__dirname, '../.auth/user.json');

setup('authenticate', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login');

  // Fill in login form
  await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
  await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'Password123!');

  // Click login button
  await page.click('button[type="submit"]');

  // Wait for navigation to complete
  await page.waitForURL('/dashboard', { timeout: 10000 });

  // Verify we're logged in
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

  // Save authenticated state
  await page.context().storageState({ path: authFile });
});
