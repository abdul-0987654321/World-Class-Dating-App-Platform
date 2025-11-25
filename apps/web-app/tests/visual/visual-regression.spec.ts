import { test, expect } from '@playwright/test';

/**
 * Visual Regression Tests
 * These tests capture screenshots and compare against baseline images.
 */

test.describe('Visual Regression - Core Pages', () => {
  test.beforeEach(async ({ page }) => {
    // Set consistent viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('Login page matches snapshot', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('login-page.png', {
      maxDiffPixels: 100,
    });
  });

  test('Discover page matches snapshot', async ({ page }) => {
    await page.goto('/discover');
    await page.waitForLoadState('networkidle');

    // Wait for profile card to load
    await page.waitForSelector('[data-testid="profile-card"]', { timeout: 10000 });

    // Mask dynamic content
    await expect(page).toHaveScreenshot('discover-page.png', {
      maxDiffPixels: 500,
      mask: [
        page.locator('[data-testid="profile-photo"]'),
        page.locator('[data-testid="profile-name"]'),
        page.locator('[data-testid="profile-age"]'),
      ],
    });
  });

  test('Messages page matches snapshot', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('messages-page.png', {
      maxDiffPixels: 300,
      mask: [
        page.locator('[data-testid="conversation-item"]'),
        page.locator('[data-testid="message-item"]'),
      ],
    });
  });

  test('Profile page matches snapshot', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('profile-page.png', {
      maxDiffPixels: 300,
      mask: [
        page.locator('[data-testid="profile-photo"]'),
        page.locator('[data-testid="user-name"]'),
      ],
    });
  });

  test('Settings page matches snapshot', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('settings-page.png', {
      maxDiffPixels: 100,
    });
  });

  test('Subscription page matches snapshot', async ({ page }) => {
    await page.goto('/subscription');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('subscription-page.png', {
      maxDiffPixels: 100,
    });
  });
});

test.describe('Visual Regression - Components', () => {
  test('Primary button styles', async ({ page }) => {
    await page.goto('/components-demo');
    const button = page.getByTestId('primary-button');
    await expect(button).toHaveScreenshot('primary-button.png');
  });

  test('Secondary button styles', async ({ page }) => {
    await page.goto('/components-demo');
    const button = page.getByTestId('secondary-button');
    await expect(button).toHaveScreenshot('secondary-button.png');
  });

  test('Input field styles', async ({ page }) => {
    await page.goto('/components-demo');
    const input = page.getByTestId('text-input');
    await expect(input).toHaveScreenshot('text-input.png');
  });

  test('Card component styles', async ({ page }) => {
    await page.goto('/components-demo');
    const card = page.getByTestId('card-component');
    await expect(card).toHaveScreenshot('card-component.png');
  });

  test('Modal component styles', async ({ page }) => {
    await page.goto('/components-demo');
    await page.getByTestId('open-modal-button').click();
    const modal = page.getByRole('dialog');
    await expect(modal).toHaveScreenshot('modal-component.png');
  });

  test('Navigation bar styles', async ({ page }) => {
    await page.goto('/discover');
    const nav = page.getByTestId('navigation-bar');
    await expect(nav).toHaveScreenshot('navigation-bar.png');
  });
});

test.describe('Visual Regression - Responsive', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 720 },
    { name: 'desktop-large', width: 1920, height: 1080 },
  ];

  for (const viewport of viewports) {
    test(`Login page - ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot(`login-${viewport.name}.png`, {
        maxDiffPixels: 100,
      });
    });

    test(`Discover page - ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/discover');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-testid="profile-card"]', { timeout: 10000 });

      await expect(page).toHaveScreenshot(`discover-${viewport.name}.png`, {
        maxDiffPixels: 500,
        mask: [
          page.locator('[data-testid="profile-photo"]'),
          page.locator('[data-testid="profile-name"]'),
        ],
      });
    });
  }
});

test.describe('Visual Regression - Dark Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });

  test('Login page dark mode', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('login-dark-mode.png', {
      maxDiffPixels: 100,
    });
  });

  test('Discover page dark mode', async ({ page }) => {
    await page.goto('/discover');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="profile-card"]', { timeout: 10000 });

    await expect(page).toHaveScreenshot('discover-dark-mode.png', {
      maxDiffPixels: 500,
      mask: [
        page.locator('[data-testid="profile-photo"]'),
        page.locator('[data-testid="profile-name"]'),
      ],
    });
  });

  test('Messages page dark mode', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('messages-dark-mode.png', {
      maxDiffPixels: 300,
      mask: [page.locator('[data-testid="conversation-item"]')],
    });
  });
});

test.describe('Visual Regression - States', () => {
  test('Button hover state', async ({ page }) => {
    await page.goto('/login');
    const button = page.getByTestId('login-submit');
    await button.hover();

    await expect(button).toHaveScreenshot('button-hover.png');
  });

  test('Button focus state', async ({ page }) => {
    await page.goto('/login');
    const button = page.getByTestId('login-submit');
    await button.focus();

    await expect(button).toHaveScreenshot('button-focus.png');
  });

  test('Input focus state', async ({ page }) => {
    await page.goto('/login');
    const input = page.getByTestId('login-email');
    await input.focus();

    await expect(input).toHaveScreenshot('input-focus.png');
  });

  test('Input error state', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('login-submit').click();
    const input = page.getByTestId('login-email');

    await expect(input).toHaveScreenshot('input-error.png');
  });

  test('Loading state', async ({ page }) => {
    await page.goto('/discover');
    // Capture initial loading state
    await expect(page.getByTestId('loading-skeleton')).toHaveScreenshot('loading-skeleton.png');
  });

  test('Empty state', async ({ page }) => {
    await page.goto('/messages');
    // If no messages, capture empty state
    const emptyState = page.getByTestId('empty-messages');
    if (await emptyState.isVisible()) {
      await expect(emptyState).toHaveScreenshot('empty-messages-state.png');
    }
  });
});
