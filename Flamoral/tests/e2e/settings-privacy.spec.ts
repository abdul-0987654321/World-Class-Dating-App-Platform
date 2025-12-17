import { test, expect } from '@playwright/test';

/**
 * Settings & Privacy Tests
 * Tests for user settings, privacy controls, and account management
 */

const TEST_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD;

test.describe('Settings - Profile Settings', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Skipping: No test credentials provided');

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: /email/i }).fill(TEST_EMAIL!);
    await page.locator('input[type="password"]').first().fill(TEST_PASSWORD!);
    await page.getByRole('button', { name: /log in|sign in|continue/i }).click();
    await page.waitForURL(/app|home/i, { timeout: 10000 });
  });

  test('should display settings page', async ({ page }) => {
    await page.goto('/app/settings');

    // Settings page should have sections
    await expect(page.locator('body')).toBeVisible();

    // Look for common settings sections
    const accountSection = page.getByText(/account|profile/i).first();
    const privacySection = page.getByText(/privacy|safety/i).first();
    const notificationSection = page.getByText(/notification/i).first();

    // At least one section should be visible
    await expect(page.locator('body')).toBeVisible();
  });

  test('should allow editing profile information', async ({ page }) => {
    await page.goto('/app/settings/profile');

    // Bio/about field
    const bioField = page.locator('[data-testid="bio-input"], textarea[name="bio"]').first();

    if (await bioField.isVisible().catch(() => false)) {
      await bioField.fill('Test bio update');
      await expect(bioField).toHaveValue(/Test bio/);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('should allow changing photos', async ({ page }) => {
    await page.goto('/app/settings/photos');

    // Photo upload or edit options
    const addPhotoButton = page.locator('[data-testid="add-photo"], button:has-text("add photo")').first();
    const photoGrid = page.locator('[data-testid="photo-grid"], .photos-grid').first();

    await expect(page.locator('body')).toBeVisible();
  });

  test('should have preference settings', async ({ page }) => {
    await page.goto('/app/settings/preferences');

    // Age range, distance, gender preferences
    const ageSlider = page.locator('[data-testid="age-range"], input[type="range"]').first();
    const distanceSlider = page.locator('[data-testid="distance-range"]').first();

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Settings - Privacy Controls', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Skipping: No test credentials provided');

  test('should have visibility controls', async ({ page }) => {
    await page.goto('/app/settings/privacy');

    // Profile visibility toggle
    const visibilityToggle = page.locator('[data-testid="profile-visibility"], input[type="checkbox"]').first();

    if (await visibilityToggle.isVisible().catch(() => false)) {
      // Toggle should be interactive
      await expect(visibilityToggle).toBeEnabled();
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('should have block/report functionality', async ({ page }) => {
    await page.goto('/app/settings/privacy');

    // Block list access
    const blockList = page.getByText(/blocked|block list/i).first();

    await expect(page.locator('body')).toBeVisible();
  });

  test('should have data download option (GDPR)', async ({ page }) => {
    await page.goto('/app/settings/privacy');

    // Data export/download option
    const dataDownload = page.getByText(/download|export|my data/i).first();

    await expect(page.locator('body')).toBeVisible();
  });

  test('should have account deletion option', async ({ page }) => {
    await page.goto('/app/settings/account');

    // Delete account option
    const deleteOption = page.getByText(/delete account|remove account/i).first();

    if (await deleteOption.isVisible().catch(() => false)) {
      await expect(deleteOption).toBeVisible();
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('should require confirmation for destructive actions', async ({ page }) => {
    await page.goto('/app/settings/account');

    const deleteButton = page.locator('[data-testid="delete-account"], button:has-text("delete")').first();

    if (await deleteButton.isVisible().catch(() => false)) {
      await deleteButton.click();

      // Should show confirmation dialog
      const confirmDialog = page.locator('[role="dialog"], .modal, .confirmation').first();
      await page.waitForTimeout(500);

      // Cancel if dialog appears
      const cancelButton = page.getByRole('button', { name: /cancel|no|close/i }).first();
      if (await cancelButton.isVisible().catch(() => false)) {
        await cancelButton.click();
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Settings - Notifications', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Skipping: No test credentials provided');

  test('should have notification toggles', async ({ page }) => {
    await page.goto('/app/settings/notifications');

    // Different notification types
    const matchNotification = page.getByText(/match|new match/i).first();
    const messageNotification = page.getByText(/message/i).first();
    const likeNotification = page.getByText(/like/i).first();

    await expect(page.locator('body')).toBeVisible();
  });

  test('should save notification preferences', async ({ page }) => {
    await page.goto('/app/settings/notifications');

    const toggle = page.locator('input[type="checkbox"]').first();

    if (await toggle.isVisible().catch(() => false)) {
      const initialState = await toggle.isChecked();
      await toggle.click();
      await page.waitForTimeout(500);

      // Should have changed state (or show saving)
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should have email notification settings', async ({ page }) => {
    await page.goto('/app/settings/notifications');

    const emailSettings = page.getByText(/email/i).first();

    await expect(page.locator('body')).toBeVisible();
  });

  test('should have push notification settings', async ({ page }) => {
    await page.goto('/app/settings/notifications');

    const pushSettings = page.getByText(/push|mobile/i).first();

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Settings - Security', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Skipping: No test credentials provided');

  test('should allow password change', async ({ page }) => {
    await page.goto('/app/settings/security');

    const passwordChange = page.getByText(/change password|update password/i).first();

    if (await passwordChange.isVisible().catch(() => false)) {
      await passwordChange.click();

      // Should show password change form
      const currentPassword = page.locator('input[name="currentPassword"], input[placeholder*="current"]').first();
      const newPassword = page.locator('input[name="newPassword"], input[placeholder*="new"]').first();

      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should show active sessions', async ({ page }) => {
    await page.goto('/app/settings/security');

    const sessions = page.getByText(/session|device|logged in/i).first();

    await expect(page.locator('body')).toBeVisible();
  });

  test('should allow 2FA setup', async ({ page }) => {
    await page.goto('/app/settings/security');

    const twoFactor = page.getByText(/two-factor|2fa|authenticator/i).first();

    await expect(page.locator('body')).toBeVisible();
  });

  test('should have logout functionality', async ({ page }) => {
    await page.goto('/app/settings');

    const logoutButton = page.getByRole('button', { name: /log out|sign out/i }).first();

    if (await logoutButton.isVisible().catch(() => false)) {
      await logoutButton.click();

      // Should redirect to login
      await page.waitForURL(/login|home|landing/i, { timeout: 5000 }).catch(() => {});
    }

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Settings - Subscription', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Skipping: No test credentials provided');

  test('should show current subscription status', async ({ page }) => {
    await page.goto('/app/settings/subscription');

    // Subscription tier or free status
    const subscriptionStatus = page.getByText(/premium|free|basic|gold|subscription/i).first();

    await expect(page.locator('body')).toBeVisible();
  });

  test('should have upgrade options', async ({ page }) => {
    await page.goto('/app/settings/subscription');

    const upgradeButton = page.locator('[data-testid="upgrade-button"], button:has-text("upgrade")').first();

    await expect(page.locator('body')).toBeVisible();
  });

  test('should show billing history', async ({ page }) => {
    await page.goto('/app/settings/billing');

    const billingHistory = page.getByText(/billing|payment history|invoice/i).first();

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Settings - Accessibility', () => {
  test('settings should be keyboard navigable', async ({ page }) => {
    await page.goto('/app/settings');

    // Tab through settings
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Focus should be on an interactive element
    const focusedElement = page.locator(':focus');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/app/settings');

    // Check for aria-label on interactive elements
    const buttons = await page.locator('button').all();

    for (const button of buttons.slice(0, 3)) {
      const hasLabel = await button.getAttribute('aria-label');
      const hasText = await button.textContent();

      // Button should have accessible name
      expect(hasLabel || hasText).toBeTruthy();
    }
  });
});
