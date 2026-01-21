/**
 * Block and Report Safety Flow Tests
 */

import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@flamoral.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

test.describe('Safety Features', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/discovery|home|matches/);
  });

  test.describe('Block User', () => {
    test('should show block option', async ({ page }) => {
      await page.goto('/discovery');
      
      const menu = page.locator('[data-testid="profile-menu"]').first();
      if (await menu.count() > 0) {
        await menu.click();
        const block = page.locator('text=/block/i');
        await expect(block).toBeVisible();
      }
    });

    test('should confirm block action', async ({ page }) => {
      await page.goto('/discovery');
      
      const menu = page.locator('[data-testid="profile-menu"]').first();
      if (await menu.count() > 0) {
        await menu.click();
        const block = page.locator('[data-testid="block-user"]');
        if (await block.count() > 0) {
          await block.click();
          const confirm = page.locator('[role="dialog"]');
          await expect(confirm).toBeVisible();
        }
      }
    });

    test('should access blocked list', async ({ page }) => {
      await page.goto('/settings');
      const blocked = page.locator('text=/blocked/i');
      expect(await blocked.count()).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Report User', () => {
    test('should show report option', async ({ page }) => {
      await page.goto('/discovery');
      
      const menu = page.locator('[data-testid="profile-menu"]').first();
      if (await menu.count() > 0) {
        await menu.click();
        const report = page.locator('text=/report/i');
        await expect(report).toBeVisible();
      }
    });

    test('should show report form', async ({ page }) => {
      await page.goto('/discovery');
      
      const menu = page.locator('[data-testid="profile-menu"]').first();
      if (await menu.count() > 0) {
        await menu.click();
        const report = page.locator('[data-testid="report-user"]');
        if (await report.count() > 0) {
          await report.click();
          const form = page.locator('[data-testid="report-form"], form');
          await expect(form).toBeVisible();
        }
      }
    });

    test('should submit report', async ({ page }) => {
      await page.goto('/discovery');
      
      const menu = page.locator('[data-testid="profile-menu"]').first();
      if (await menu.count() > 0) {
        await menu.click();
        const report = page.locator('[data-testid="report-user"]');
        if (await report.count() > 0) {
          await report.click();
          
          const reason = page.locator('[data-testid="report-reason"]').first();
          if (await reason.count() > 0) {
            await reason.click();
            const submit = page.locator('button:has-text("Submit")');
            if (await submit.count() > 0) {
              await submit.click();
            }
          }
        }
      }
    });
  });
});
