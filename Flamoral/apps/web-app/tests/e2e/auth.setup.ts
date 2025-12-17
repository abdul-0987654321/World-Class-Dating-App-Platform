import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
  // Navigate to login
  await page.goto('/login');

  // Use test credentials from environment
  const testEmail = process.env.TEST_USER_EMAIL || 'test1@connectsphere.com';
  const testPassword = process.env.TEST_USER_PASSWORD || 'TestUser1!';

  // Fill in login form
  await page.getByTestId('login-email').fill(testEmail);
  await page.getByTestId('login-password').fill(testPassword);
  await page.getByTestId('login-submit').click();

  // Wait for successful login
  await expect(page).toHaveURL(/.*discover|dashboard|home/, { timeout: 10000 });

  // Save authentication state
  await page.context().storageState({ path: authFile });
});
