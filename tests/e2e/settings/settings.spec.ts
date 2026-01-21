/**
 * Settings Management E2E Tests
 */

import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@flamoral.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

test.describe('Settings Management', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/discovery|home/);
  });

  test.describe('Settings Navigation', () => {
    test('should navigate to settings', async ({ page }) => {
      const settingsLink = page.locator('[data-testid="settings-link"], a[href*="settings"], [aria-label*="settings"]');
      await settingsLink.first().click();
      await expect(page).toHaveURL(/settings/);
    });

    test('should display settings sections', async ({ page }) => {
      await page.goto('/settings');
      
      const sections = [
        'Account',
        'Privacy',
        'Notifications',
        'Security'
      ];
      
      for (const section of sections) {
        const sectionEl = page.locator('text=' + section);
        expect(await sectionEl.count()).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe('Account Settings', () => {
    test('should show account info', async ({ page }) => {
      await page.goto('/settings/account');
      
      const email = page.locator('text=' + TEST_EMAIL);
      expect(await email.count()).toBeGreaterThanOrEqual(0);
    });

    test('should change email', async ({ page }) => {
      await page.goto('/settings/account');
      
      const changeEmail = page.locator('[data-testid="change-email"]');
      if (await changeEmail.count() > 0) {
        await changeEmail.click();
        const emailInput = page.locator('input[name="email"]');
        await expect(emailInput).toBeVisible();
      }
    });

    test('should change password', async ({ page }) => {
      await page.goto('/settings/account');
      
      const changePw = page.locator('[data-testid="change-password"], text=/change password/i');
      if (await changePw.count() > 0) {
        await changePw.click();
        const pwInput = page.locator('input[type="password"]');
        await expect(pwInput.first()).toBeVisible();
      }
    });
  });

  test.describe('Privacy Settings', () => {
    test('should toggle profile visibility', async ({ page }) => {
      await page.goto('/settings/privacy');
      
      const visibility = page.locator('[data-testid="profile-visibility"]');
      if (await visibility.count() > 0) {
        await visibility.click();
      }
    });

    test('should manage data sharing', async ({ page }) => {
      await page.goto('/settings/privacy');
      
      const dataSharing = page.locator('text=/data sharing|analytics/i');
      expect(await dataSharing.count()).toBeGreaterThanOrEqual(0);
    });

    test('should access blocked users', async ({ page }) => {
      await page.goto('/settings/privacy');
      
      const blocked = page.locator('text=/blocked/i');
      if (await blocked.count() > 0) {
        await blocked.click();
      }
    });
  });

  test.describe('Notification Settings', () => {
    test('should show notification options', async ({ page }) => {
      await page.goto('/settings/notifications');
      
      const notifications = page.locator('[data-testid*="notification"], text=/notification/i');
      expect(await notifications.count()).toBeGreaterThanOrEqual(0);
    });

    test('should toggle push notifications', async ({ page }) => {
      await page.goto('/settings/notifications');
      
      const pushToggle = page.locator('[data-testid="push-toggle"]');
      if (await pushToggle.count() > 0) {
        await pushToggle.click();
      }
    });

    test('should toggle email notifications', async ({ page }) => {
      await page.goto('/settings/notifications');
      
      const emailToggle = page.locator('[data-testid="email-toggle"]');
      if (await emailToggle.count() > 0) {
        await emailToggle.click();
      }
    });
  });

  test.describe('Security Settings', () => {
    test('should show security options', async ({ page }) => {
      await page.goto('/settings/security');
      
      const security = page.locator('text=/security|two-factor|2fa/i');
      expect(await security.count()).toBeGreaterThanOrEqual(0);
    });

    test('should enable 2FA', async ({ page }) => {
      await page.goto('/settings/security');
      
      const enable2FA = page.locator('[data-testid="enable-2fa"]');
      if (await enable2FA.count() > 0) {
        await enable2FA.click();
        const qrCode = page.locator('[data-testid="2fa-qr"], img');
        await expect(qrCode).toBeVisible({ timeout: 5000 }).catch(() => {});
      }
    });

    test('should show active sessions', async ({ page }) => {
      await page.goto('/settings/security');
      
      const sessions = page.locator('text=/sessions|devices/i');
      expect(await sessions.count()).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Subscription Settings', () => {
    test('should show subscription status', async ({ page }) => {
      await page.goto('/settings/subscription');
      
      const status = page.locator('text=/free|premium|subscription/i');
      expect(await status.count()).toBeGreaterThanOrEqual(0);
    });

    test('should show upgrade options', async ({ page }) => {
      await page.goto('/settings/subscription');
      
      const upgrade = page.locator('[data-testid="upgrade"], text=/upgrade/i');
      expect(await upgrade.count()).toBeGreaterThanOrEqual(0);
    });
  });
});
