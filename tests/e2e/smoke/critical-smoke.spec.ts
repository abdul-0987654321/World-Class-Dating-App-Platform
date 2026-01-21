/**
 * Critical Smoke Tests for PR Gates
 * Target: 12 tests, < 3 min execution
 */

import { test, expect } from '@playwright/test';

test.describe('Critical Smoke Tests', () => {
  
  test.describe('App Loading', () => {
    test('should load the application', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveTitle(/Flamoral/i);
    });

    test('should display login page', async ({ page }) => {
      await page.goto('/login');
      await expect(page.locator('[data-testid="login-form"], form')).toBeVisible();
    });
  });

  test.describe('Authentication Flow', () => {
    test('should show login form elements', async ({ page }) => {
      await page.goto('/login');
      
      await expect(page.locator('[data-testid="login-email"], input[type="email"], input[name="email"]')).toBeVisible();
      await expect(page.locator('[data-testid="login-password"], input[type="password"]')).toBeVisible();
      await expect(page.locator('[data-testid="login-submit"], button[type="submit"]')).toBeVisible();
    });

    test('should validate required fields', async ({ page }) => {
      await page.goto('/login');
      
      await page.click('[data-testid="login-submit"], button[type="submit"]');
      
      // Should show validation error or stay on login page
      await expect(page).toHaveURL(/login/);
    });

    test('should navigate to signup page', async ({ page }) => {
      await page.goto('/login');
      
      const signupLink = page.locator('a[href*="signup"], a[href*="register"], [data-testid="signup-link"]');
      if (await signupLink.count() > 0) {
        await signupLink.first().click();
        await expect(page).toHaveURL(/signup|register/);
      }
    });
  });

  test.describe('Core Pages', () => {
    test.beforeEach(async ({ page }) => {
      // Skip if not authenticated - these are smoke tests
      await page.goto('/');
    });

    test('should have navigation elements', async ({ page }) => {
      const nav = page.locator('nav, [data-testid="navigation"], header');
      await expect(nav.first()).toBeVisible();
    });

    test('should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/login');
      
      await expect(page.locator('[data-testid="login-form"], form')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle 404 gracefully', async ({ page }) => {
      await page.goto('/nonexistent-page-12345');
      
      // Should show 404 page or redirect to home
      const is404 = await page.locator('text=/404|not found/i').count() > 0;
      const redirectedHome = page.url().endsWith('/') || page.url().includes('/login');
      
      expect(is404 || redirectedHome).toBe(true);
    });
  });

  test.describe('Performance', () => {
    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(5000); // 5 seconds max
    });
  });

  test.describe('Accessibility Basics', () => {
    test('should have proper document structure', async ({ page }) => {
      await page.goto('/login');
      
      // Check for basic accessibility
      const hasH1 = await page.locator('h1').count() > 0;
      const hasMain = await page.locator('main, [role="main"]').count() > 0;
      
      expect(hasH1 || hasMain).toBe(true);
    });
  });
});
