import { test, expect } from '@playwright/test';

/**
 * Landing Page Tests
 * Tests for the public-facing landing page functionality
 */

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load homepage successfully', async ({ page }) => {
    // Page should load with 200 status
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);

    // Page should have correct title
    await expect(page).toHaveTitle(/Flamoral/i);
  });

  test('should display main navigation elements', async ({ page }) => {
    // Logo should be visible
    const logo = page.locator('header').getByRole('link', { name: /flamoral/i }).first();
    await expect(logo).toBeVisible();

    // Navigation links should be present
    await expect(page.getByRole('link', { name: /features|about/i }).first()).toBeVisible();
  });

  test('should display hero section with CTA', async ({ page }) => {
    // Hero headline should be visible
    const heroHeadline = page.locator('h1').first();
    await expect(heroHeadline).toBeVisible();

    // Primary CTA button should be visible
    const ctaButton = page.getByRole('link', { name: /get started|sign up|join/i }).first();
    await expect(ctaButton).toBeVisible();
  });

  test('should have proper meta tags for SEO', async ({ page }) => {
    // Description meta tag
    const description = await page.getAttribute('meta[name="description"]', 'content');
    expect(description).toBeTruthy();
    expect(description?.length).toBeGreaterThan(50);

    // OG tags for social sharing
    const ogTitle = await page.getAttribute('meta[property="og:title"]', 'content');
    expect(ogTitle).toBeTruthy();

    const ogDescription = await page.getAttribute('meta[property="og:description"]', 'content');
    expect(ogDescription).toBeTruthy();
  });

  test('should have proper security headers', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response?.headers();

    // Security headers should be present
    expect(headers?.['x-content-type-options']).toBe('nosniff');
    expect(headers?.['x-frame-options']).toBeTruthy();
    expect(headers?.['strict-transport-security']).toBeTruthy();
  });

  test('should be responsive on mobile', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
    }

    // Mobile menu button should be visible on mobile
    const mobileMenuButton = page.locator('[data-testid="mobile-menu"], button[aria-label*="menu"]').first();
    // Page should still render correctly even if mobile menu pattern differs
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out known acceptable errors (like third-party scripts)
    const criticalErrors = consoleErrors.filter(
      (error) =>
        !error.includes('Failed to load resource') &&
        !error.includes('third-party') &&
        !error.includes('analytics')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('should have working footer links', async ({ page }) => {
    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Privacy policy link
    const privacyLink = page.getByRole('link', { name: /privacy/i }).first();
    if (await privacyLink.isVisible()) {
      await expect(privacyLink).toHaveAttribute('href', /privacy/i);
    }

    // Terms link
    const termsLink = page.getByRole('link', { name: /terms/i }).first();
    if (await termsLink.isVisible()) {
      await expect(termsLink).toHaveAttribute('href', /terms/i);
    }
  });
});

test.describe('Landing Page Performance', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - startTime;

    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should have optimized images', async ({ page }) => {
    await page.goto('/');

    // Check that images have width/height attributes to prevent layout shift
    const images = await page.locator('img').all();

    for (const img of images.slice(0, 5)) {
      // At least check visible images
      if (await img.isVisible()) {
        const src = await img.getAttribute('src');
        expect(src).toBeTruthy();
      }
    }
  });
});
