/**
 * Visual Regression Tests
 *
 * Uses Playwright's built-in screenshot comparison for visual regression testing.
 * Tests key pages at multiple viewport sizes (mobile, tablet, desktop).
 *
 * Baseline images are stored in:
 *   tests/e2e/visual/screenshots/
 *
 * To update baselines, run:
 *   npx playwright test tests/e2e/visual --update-snapshots
 */

import { test, expect, Page } from '@playwright/test';

// Viewport configurations for responsive testing
const VIEWPORTS = {
  mobile: { width: 375, height: 667, name: 'mobile' },
  tablet: { width: 768, height: 1024, name: 'tablet' },
  desktop: { width: 1280, height: 720, name: 'desktop' },
  largeDesktop: { width: 1920, height: 1080, name: 'large-desktop' },
};

// Test user credentials
const TEST_USER = {
  email: process.env.VISUAL_TEST_EMAIL || 'visual-test@flamoral.com',
  password: process.env.VISUAL_TEST_PASSWORD || 'VisualTest123!',
};

// Screenshot comparison options
const SCREENSHOT_OPTIONS = {
  fullPage: false,
  maxDiffPixels: 100, // Allow small differences for anti-aliasing
  threshold: 0.2, // Color difference threshold (0-1)
  animations: 'disabled' as const, // Disable CSS animations for consistent screenshots
};

/**
 * Helper: Wait for page to be visually stable
 */
async function waitForStableVisuals(page: Page): Promise<void> {
  // Wait for network idle
  await page.waitForLoadState('networkidle', { timeout: 15000 });

  // Wait for fonts to load
  await page.evaluate(() => document.fonts.ready);

  // Wait for any lazy-loaded images
  await page.evaluate(async () => {
    const images = Array.from(document.images);
    await Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.addEventListener('load', resolve);
          img.addEventListener('error', resolve);
        });
      })
    );
  });

  // Small delay for any CSS transitions to complete
  await page.waitForTimeout(500);
}

/**
 * Helper: Hide dynamic content that changes between runs
 */
async function hideDynamicContent(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Hide timestamps, dates, counters
    const dynamicSelectors = [
      '[data-testid="timestamp"]',
      '[data-testid="date"]',
      '.timestamp',
      '.date-time',
      'time',
      '[data-dynamic="true"]',
    ];

    dynamicSelectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        (el as HTMLElement).style.visibility = 'hidden';
      });
    });
  });
}

/**
 * Helper: Login to application
 */
async function login(page: Page): Promise<void> {
  await page.goto('/login');
  const emailInput = page.locator('[data-testid="login-email"]').or(page.locator('input[name="email"]'));
  const passwordInput = page.locator('[data-testid="login-password"]').or(page.locator('input[name="password"]'));
  const submitButton = page.locator('[data-testid="login-submit"]').or(page.locator('button[type="submit"]'));

  await emailInput.fill(TEST_USER.email);
  await passwordInput.fill(TEST_USER.password);
  await submitButton.click();
  await page.waitForURL(/.*(?:discover|dashboard|home)/, { timeout: 15000 });
}

/**
 * Helper: Take a full-page screenshot with consistent settings
 */
async function takeSnapshot(page: Page, name: string): Promise<Buffer> {
  await waitForStableVisuals(page);
  await hideDynamicContent(page);

  return page.screenshot({
    ...SCREENSHOT_OPTIONS,
    fullPage: true,
  });
}

test.describe('Visual Regression - Public Pages', () => {

  test.describe('Desktop Viewport', () => {
    test.use({ viewport: VIEWPORTS.desktop });

    test('Home page - desktop', async ({ page }) => {
      await page.goto('/');
      await waitForStableVisuals(page);

      await expect(page).toHaveScreenshot('home-desktop.png', {
        maxDiffPixels: SCREENSHOT_OPTIONS.maxDiffPixels,
        threshold: SCREENSHOT_OPTIONS.threshold,
        animations: SCREENSHOT_OPTIONS.animations,
      });
    });

    test('Login page - desktop', async ({ page }) => {
      await page.goto('/login');
      await waitForStableVisuals(page);

      await expect(page).toHaveScreenshot('login-desktop.png', {
        maxDiffPixels: SCREENSHOT_OPTIONS.maxDiffPixels,
        threshold: SCREENSHOT_OPTIONS.threshold,
        animations: SCREENSHOT_OPTIONS.animations,
      });
    });

    test('Sign up page - desktop', async ({ page }) => {
      await page.goto('/signup');
      await waitForStableVisuals(page);

      await expect(page).toHaveScreenshot('signup-desktop.png', {
        maxDiffPixels: SCREENSHOT_OPTIONS.maxDiffPixels,
        threshold: SCREENSHOT_OPTIONS.threshold,
        animations: SCREENSHOT_OPTIONS.animations,
      });
    });

    test('Forgot password page - desktop', async ({ page }) => {
      await page.goto('/forgot-password');
      await waitForStableVisuals(page);

      await expect(page).toHaveScreenshot('forgot-password-desktop.png', {
        maxDiffPixels: SCREENSHOT_OPTIONS.maxDiffPixels,
        threshold: SCREENSHOT_OPTIONS.threshold,
        animations: SCREENSHOT_OPTIONS.animations,
      });
    });
  });

  test.describe('Tablet Viewport', () => {
    test.use({ viewport: VIEWPORTS.tablet });

    test('Home page - tablet', async ({ page }) => {
      await page.goto('/');
      await waitForStableVisuals(page);

      await expect(page).toHaveScreenshot('home-tablet.png', {
        maxDiffPixels: SCREENSHOT_OPTIONS.maxDiffPixels,
        threshold: SCREENSHOT_OPTIONS.threshold,
        animations: SCREENSHOT_OPTIONS.animations,
      });
    });

    test('Login page - tablet', async ({ page }) => {
      await page.goto('/login');
      await waitForStableVisuals(page);

      await expect(page).toHaveScreenshot('login-tablet.png', {
        maxDiffPixels: SCREENSHOT_OPTIONS.maxDiffPixels,
        threshold: SCREENSHOT_OPTIONS.threshold,
        animations: SCREENSHOT_OPTIONS.animations,
      });
    });
  });

  test.describe('Mobile Viewport', () => {
    test.use({ viewport: VIEWPORTS.mobile });

    test('Home page - mobile', async ({ page }) => {
      await page.goto('/');
      await waitForStableVisuals(page);

      await expect(page).toHaveScreenshot('home-mobile.png', {
        maxDiffPixels: SCREENSHOT_OPTIONS.maxDiffPixels,
        threshold: SCREENSHOT_OPTIONS.threshold,
        animations: SCREENSHOT_OPTIONS.animations,
      });
    });

    test('Login page - mobile', async ({ page }) => {
      await page.goto('/login');
      await waitForStableVisuals(page);

      await expect(page).toHaveScreenshot('login-mobile.png', {
        maxDiffPixels: SCREENSHOT_OPTIONS.maxDiffPixels,
        threshold: SCREENSHOT_OPTIONS.threshold,
        animations: SCREENSHOT_OPTIONS.animations,
      });
    });

    test('Sign up page - mobile', async ({ page }) => {
      await page.goto('/signup');
      await waitForStableVisuals(page);

      await expect(page).toHaveScreenshot('signup-mobile.png', {
        maxDiffPixels: SCREENSHOT_OPTIONS.maxDiffPixels,
        threshold: SCREENSHOT_OPTIONS.threshold,
        animations: SCREENSHOT_OPTIONS.animations,
      });
    });
  });
});

test.describe('Visual Regression - Authenticated Pages', () => {

  test.describe('Desktop Viewport', () => {
    test.use({ viewport: VIEWPORTS.desktop });

    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('Discovery page - desktop', async ({ page }) => {
      await page.goto('/discover');
      await waitForStableVisuals(page);
      await hideDynamicContent(page);

      // Hide user-specific content (profile cards)
      await page.evaluate(() => {
        document.querySelectorAll('[data-testid="profile-card"], .profile-card').forEach((el) => {
          (el as HTMLElement).style.visibility = 'hidden';
        });
      });

      await expect(page).toHaveScreenshot('discovery-desktop.png', {
        maxDiffPixels: 500, // Higher tolerance for dynamic content
        threshold: SCREENSHOT_OPTIONS.threshold,
        animations: SCREENSHOT_OPTIONS.animations,
      });
    });

    test('Profile page - desktop', async ({ page }) => {
      await page.goto('/profile');
      await waitForStableVisuals(page);
      await hideDynamicContent(page);

      // Hide user-specific photos but keep layout
      await page.evaluate(() => {
        document.querySelectorAll('[data-testid="profile-photo"], .profile-photo img').forEach((el) => {
          (el as HTMLElement).style.filter = 'blur(20px)';
        });
      });

      await expect(page).toHaveScreenshot('profile-desktop.png', {
        maxDiffPixels: 500,
        threshold: SCREENSHOT_OPTIONS.threshold,
        animations: SCREENSHOT_OPTIONS.animations,
      });
    });

    test('Messages page - desktop (empty state)', async ({ page }) => {
      await page.goto('/messages');
      await waitForStableVisuals(page);
      await hideDynamicContent(page);

      // Hide conversation content but test layout
      await page.evaluate(() => {
        document.querySelectorAll('[data-testid="conversation-item"], .conversation-item').forEach((el) => {
          (el as HTMLElement).style.visibility = 'hidden';
        });
      });

      await expect(page).toHaveScreenshot('messages-desktop.png', {
        maxDiffPixels: 500,
        threshold: SCREENSHOT_OPTIONS.threshold,
        animations: SCREENSHOT_OPTIONS.animations,
      });
    });

    test('Settings page - desktop', async ({ page }) => {
      await page.goto('/settings');
      await waitForStableVisuals(page);
      await hideDynamicContent(page);

      // Hide user-specific info
      await page.evaluate(() => {
        document.querySelectorAll('[data-testid="email-display"], .email').forEach((el) => {
          (el as HTMLElement).textContent = 'user@example.com';
        });
      });

      await expect(page).toHaveScreenshot('settings-desktop.png', {
        maxDiffPixels: 200,
        threshold: SCREENSHOT_OPTIONS.threshold,
        animations: SCREENSHOT_OPTIONS.animations,
      });
    });
  });

  test.describe('Mobile Viewport', () => {
    test.use({ viewport: VIEWPORTS.mobile });

    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('Discovery page - mobile', async ({ page }) => {
      await page.goto('/discover');
      await waitForStableVisuals(page);
      await hideDynamicContent(page);

      await page.evaluate(() => {
        document.querySelectorAll('[data-testid="profile-card"], .profile-card').forEach((el) => {
          (el as HTMLElement).style.visibility = 'hidden';
        });
      });

      await expect(page).toHaveScreenshot('discovery-mobile.png', {
        maxDiffPixels: 500,
        threshold: SCREENSHOT_OPTIONS.threshold,
        animations: SCREENSHOT_OPTIONS.animations,
      });
    });

    test('Profile page - mobile', async ({ page }) => {
      await page.goto('/profile');
      await waitForStableVisuals(page);
      await hideDynamicContent(page);

      await page.evaluate(() => {
        document.querySelectorAll('[data-testid="profile-photo"], .profile-photo img').forEach((el) => {
          (el as HTMLElement).style.filter = 'blur(20px)';
        });
      });

      await expect(page).toHaveScreenshot('profile-mobile.png', {
        maxDiffPixels: 500,
        threshold: SCREENSHOT_OPTIONS.threshold,
        animations: SCREENSHOT_OPTIONS.animations,
      });
    });

    test('Messages page - mobile', async ({ page }) => {
      await page.goto('/messages');
      await waitForStableVisuals(page);
      await hideDynamicContent(page);

      await page.evaluate(() => {
        document.querySelectorAll('[data-testid="conversation-item"], .conversation-item').forEach((el) => {
          (el as HTMLElement).style.visibility = 'hidden';
        });
      });

      await expect(page).toHaveScreenshot('messages-mobile.png', {
        maxDiffPixels: 500,
        threshold: SCREENSHOT_OPTIONS.threshold,
        animations: SCREENSHOT_OPTIONS.animations,
      });
    });

    test('Settings page - mobile', async ({ page }) => {
      await page.goto('/settings');
      await waitForStableVisuals(page);
      await hideDynamicContent(page);

      await expect(page).toHaveScreenshot('settings-mobile.png', {
        maxDiffPixels: 200,
        threshold: SCREENSHOT_OPTIONS.threshold,
        animations: SCREENSHOT_OPTIONS.animations,
      });
    });
  });
});

test.describe('Visual Regression - UI Components', () => {

  test.describe('Desktop Viewport', () => {
    test.use({ viewport: VIEWPORTS.desktop });

    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('Navigation bar appearance', async ({ page }) => {
      await page.goto('/discover');
      await waitForStableVisuals(page);

      const nav = page.locator('nav, [role="navigation"], header').first();
      await expect(nav).toHaveScreenshot('navigation-desktop.png', {
        maxDiffPixels: 50,
        threshold: SCREENSHOT_OPTIONS.threshold,
        animations: SCREENSHOT_OPTIONS.animations,
      });
    });

    test('Action buttons on discovery page', async ({ page }) => {
      await page.goto('/discover');
      await waitForStableVisuals(page);

      // Capture the action buttons area
      const actionsContainer = page.locator('[data-testid="discovery-actions"], .swipe-actions, .action-buttons').first();

      if (await actionsContainer.isVisible()) {
        await expect(actionsContainer).toHaveScreenshot('discovery-actions-desktop.png', {
          maxDiffPixels: 50,
          threshold: SCREENSHOT_OPTIONS.threshold,
          animations: SCREENSHOT_OPTIONS.animations,
        });
      }
    });

    test('Filter panel appearance', async ({ page }) => {
      await page.goto('/discover');
      await waitForStableVisuals(page);

      const filterButton = page.locator('[data-testid="filter-button"], .filter-button');
      if (await filterButton.isVisible()) {
        await filterButton.click();

        const filterPanel = page.locator('[data-testid="filter-panel"], .filter-panel, .filters-modal');
        await filterPanel.waitFor({ state: 'visible', timeout: 5000 });

        await expect(filterPanel).toHaveScreenshot('filter-panel-desktop.png', {
          maxDiffPixels: 50,
          threshold: SCREENSHOT_OPTIONS.threshold,
          animations: SCREENSHOT_OPTIONS.animations,
        });
      }
    });
  });

  test.describe('Mobile Viewport', () => {
    test.use({ viewport: VIEWPORTS.mobile });

    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('Bottom navigation appearance', async ({ page }) => {
      await page.goto('/discover');
      await waitForStableVisuals(page);

      const bottomNav = page.locator('[data-testid="bottom-nav"], .bottom-nav, nav[class*="bottom"]').first();

      if (await bottomNav.isVisible()) {
        await expect(bottomNav).toHaveScreenshot('bottom-nav-mobile.png', {
          maxDiffPixels: 50,
          threshold: SCREENSHOT_OPTIONS.threshold,
          animations: SCREENSHOT_OPTIONS.animations,
        });
      }
    });

    test('Mobile menu appearance', async ({ page }) => {
      await page.goto('/discover');
      await waitForStableVisuals(page);

      const menuButton = page.locator('[data-testid="mobile-menu-button"], button[aria-label*="menu"]').first();

      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.waitForTimeout(500);

        const menu = page.locator('[data-testid="mobile-menu"], .mobile-menu, [role="menu"]').first();
        if (await menu.isVisible()) {
          await expect(menu).toHaveScreenshot('mobile-menu.png', {
            maxDiffPixels: 50,
            threshold: SCREENSHOT_OPTIONS.threshold,
            animations: SCREENSHOT_OPTIONS.animations,
          });
        }
      }
    });
  });
});

test.describe('Visual Regression - Interactive States', () => {

  test.use({ viewport: VIEWPORTS.desktop });

  test('Login form - validation error state', async ({ page }) => {
    await page.goto('/login');
    await waitForStableVisuals(page);

    // Submit empty form to trigger validation
    const submitButton = page.locator('[data-testid="login-submit"]').or(page.locator('button[type="submit"]'));
    await submitButton.click();

    await page.waitForTimeout(500);

    const loginForm = page.locator('[data-testid="login-form"], form').first();
    await expect(loginForm).toHaveScreenshot('login-form-error.png', {
      maxDiffPixels: 100,
      threshold: SCREENSHOT_OPTIONS.threshold,
      animations: SCREENSHOT_OPTIONS.animations,
    });
  });

  test('Button hover states', async ({ page }) => {
    await page.goto('/login');
    await waitForStableVisuals(page);

    const submitButton = page.locator('[data-testid="login-submit"]').or(page.locator('button[type="submit"]'));

    // Capture hover state
    await submitButton.hover();
    await page.waitForTimeout(300);

    await expect(submitButton).toHaveScreenshot('button-hover.png', {
      maxDiffPixels: 50,
      threshold: SCREENSHOT_OPTIONS.threshold,
      animations: SCREENSHOT_OPTIONS.animations,
    });
  });

  test('Input focus states', async ({ page }) => {
    await page.goto('/login');
    await waitForStableVisuals(page);

    const emailInput = page.locator('[data-testid="login-email"]').or(page.locator('input[name="email"]'));
    await emailInput.focus();
    await page.waitForTimeout(300);

    await expect(emailInput).toHaveScreenshot('input-focus.png', {
      maxDiffPixels: 50,
      threshold: SCREENSHOT_OPTIONS.threshold,
      animations: SCREENSHOT_OPTIONS.animations,
    });
  });
});

// Dark mode tests (if applicable)
test.describe('Visual Regression - Dark Mode', () => {

  test.use({
    viewport: VIEWPORTS.desktop,
    colorScheme: 'dark',
  });

  test('Login page - dark mode', async ({ page }) => {
    await page.goto('/login');
    await waitForStableVisuals(page);

    // Check if dark mode is supported
    const hasDarkMode = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark') ||
             document.body.classList.contains('dark') ||
             window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    if (hasDarkMode) {
      await expect(page).toHaveScreenshot('login-dark-mode.png', {
        maxDiffPixels: SCREENSHOT_OPTIONS.maxDiffPixels,
        threshold: SCREENSHOT_OPTIONS.threshold,
        animations: SCREENSHOT_OPTIONS.animations,
      });
    } else {
      test.skip();
    }
  });

  test('Discovery page - dark mode', async ({ page }) => {
    await login(page);
    await page.goto('/discover');
    await waitForStableVisuals(page);

    const hasDarkMode = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark') ||
             document.body.classList.contains('dark');
    });

    if (hasDarkMode) {
      await hideDynamicContent(page);
      await page.evaluate(() => {
        document.querySelectorAll('[data-testid="profile-card"], .profile-card').forEach((el) => {
          (el as HTMLElement).style.visibility = 'hidden';
        });
      });

      await expect(page).toHaveScreenshot('discovery-dark-mode.png', {
        maxDiffPixels: 500,
        threshold: SCREENSHOT_OPTIONS.threshold,
        animations: SCREENSHOT_OPTIONS.animations,
      });
    } else {
      test.skip();
    }
  });
});

// High contrast mode tests (accessibility)
test.describe('Visual Regression - High Contrast Mode', () => {

  test.use({
    viewport: VIEWPORTS.desktop,
    forcedColors: 'active',
  });

  test('Login page - high contrast mode', async ({ page }) => {
    await page.goto('/login');
    await waitForStableVisuals(page);

    await expect(page).toHaveScreenshot('login-high-contrast.png', {
      maxDiffPixels: SCREENSHOT_OPTIONS.maxDiffPixels,
      threshold: SCREENSHOT_OPTIONS.threshold,
      animations: SCREENSHOT_OPTIONS.animations,
    });
  });
});
