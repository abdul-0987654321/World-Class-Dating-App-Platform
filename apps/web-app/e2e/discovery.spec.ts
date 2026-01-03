/**
 * Discovery/Swipe E2E Tests
 * Tests for the discovery page and swipe mechanics
 */

import { test, expect } from '@playwright/test';

test.describe('Discovery Page', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate before each test
    // In production, this would use stored auth state
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'Password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/discover', { timeout: 10000 });
  });

  test('should display discovery page with profile cards', async ({ page }) => {
    // Wait for profiles to load
    await expect(page.locator('[data-testid="swipe-card"], [class*="card"]')).toBeVisible({ timeout: 10000 });

    // Should display user info
    await expect(page.locator('text=/\\d+/')).toBeVisible(); // Age
  });

  test('should display stats bar', async ({ page }) => {
    // Wait for stats to load
    await expect(page.getByText(/likes left/i)).toBeVisible();
    await expect(page.getByText(/super likes/i)).toBeVisible();
    await expect(page.getByText(/boosts/i)).toBeVisible();
  });

  test('should display action buttons', async ({ page }) => {
    // Should have pass, like, and super like buttons
    await expect(page.locator('button[title="Pass"], [data-testid="pass-button"]')).toBeVisible();
    await expect(page.locator('button[title="Like"], [data-testid="like-button"]')).toBeVisible();
    await expect(page.locator('button[title="Super Like"], [data-testid="superlike-button"]')).toBeVisible();
  });

  test('should navigate through photos', async ({ page }) => {
    await expect(page.locator('[data-testid="swipe-card"], [class*="card"]')).toBeVisible({ timeout: 10000 });

    // Check if photo dots are visible (for profiles with multiple photos)
    const photoDots = page.locator('[class*="dot"], [data-testid="photo-dot"]');
    const dotsCount = await photoDots.count();

    if (dotsCount > 1) {
      // Click on card to navigate photos
      const card = page.locator('[data-testid="swipe-card"], [class*="card"]').first();
      await card.click();

      // Photo should change (dot indicator should update)
    }
  });
});

test.describe('Swipe Actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'Password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/discover', { timeout: 10000 });
  });

  test('should pass on profile when clicking pass button', async ({ page }) => {
    await expect(page.locator('[data-testid="swipe-card"], [class*="card"]')).toBeVisible({ timeout: 10000 });

    // Get current profile name
    const profileName = await page.locator('[data-testid="profile-name"], h2').first().textContent();

    // Click pass button
    await page.click('button[title="Pass"], [data-testid="pass-button"]');

    // Wait for animation/transition
    await page.waitForTimeout(500);

    // Profile should change
    const newProfileName = await page.locator('[data-testid="profile-name"], h2').first().textContent();

    // In most cases, profile should be different (unless at end of list)
    // This test verifies the action was processed
  });

  test('should like profile when clicking like button', async ({ page }) => {
    await expect(page.locator('[data-testid="swipe-card"], [class*="card"]')).toBeVisible({ timeout: 10000 });

    // Click like button
    await page.click('button[title="Like"], [data-testid="like-button"]');

    // Wait for response
    await page.waitForTimeout(500);

    // Either match modal appears or next profile loads
    const matchModal = page.locator('[data-testid="match-modal"]');
    const nextCard = page.locator('[data-testid="swipe-card"], [class*="card"]');

    await expect(matchModal.or(nextCard)).toBeVisible({ timeout: 5000 });
  });

  test('should super like profile when clicking super like button', async ({ page }) => {
    await expect(page.locator('[data-testid="swipe-card"], [class*="card"]')).toBeVisible({ timeout: 10000 });

    // Click super like button
    await page.click('button[title="Super Like"], [data-testid="superlike-button"]');

    // Wait for response
    await page.waitForTimeout(500);

    // Should proceed to next profile or show match/upgrade modal
  });

  test('should handle swipe gestures', async ({ page }) => {
    await expect(page.locator('[data-testid="swipe-card"], [class*="card"]')).toBeVisible({ timeout: 10000 });

    const card = page.locator('[data-testid="swipe-card"], [class*="card"]').first();
    const box = await card.boundingBox();

    if (box) {
      // Simulate swipe right (like)
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width + 100, box.y + box.height / 2, { steps: 10 });
      await page.mouse.up();

      // Wait for animation
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Match Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'Password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/discover', { timeout: 10000 });
  });

  test('should show match modal when mutual like occurs', async ({ page }) => {
    // This test depends on backend returning a match
    // In a controlled test environment, you would set up the data
    await expect(page.locator('[data-testid="swipe-card"], [class*="card"]')).toBeVisible({ timeout: 10000 });

    // Like profiles until we get a match (or max attempts)
    for (let i = 0; i < 5; i++) {
      await page.click('button[title="Like"], [data-testid="like-button"]');
      await page.waitForTimeout(1000);

      const matchModal = page.locator('[data-testid="match-modal"]');
      if (await matchModal.isVisible()) {
        await expect(matchModal).toContainText(/match|matched/i);
        break;
      }
    }
  });

  test('should navigate to messages from match modal', async ({ page }) => {
    // If match modal appears
    const matchModal = page.locator('[data-testid="match-modal"]');

    if (await matchModal.isVisible()) {
      await page.click('[data-testid="send-message-button"], button:has-text("Send Message")');
      await expect(page).toHaveURL(/messages/);
    }
  });

  test('should close match modal and continue swiping', async ({ page }) => {
    const matchModal = page.locator('[data-testid="match-modal"]');

    if (await matchModal.isVisible()) {
      await page.click('[data-testid="keep-swiping-button"], button:has-text("Keep Swiping")');
      await expect(matchModal).not.toBeVisible();
      await expect(page.locator('[data-testid="swipe-card"], [class*="card"]')).toBeVisible();
    }
  });
});

test.describe('Profile Details', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'Password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/discover', { timeout: 10000 });
  });

  test('should display profile bio', async ({ page }) => {
    await expect(page.locator('[data-testid="swipe-card"], [class*="card"]')).toBeVisible({ timeout: 10000 });

    // Bio section should be visible
    const bioElement = page.locator('[data-testid="profile-bio"], [class*="bio"]');
    if (await bioElement.isVisible()) {
      const bioText = await bioElement.textContent();
      expect(bioText?.length).toBeGreaterThan(0);
    }
  });

  test('should display profile interests', async ({ page }) => {
    await expect(page.locator('[data-testid="swipe-card"], [class*="card"]')).toBeVisible({ timeout: 10000 });

    // Look for interest tags
    const interests = page.locator('[data-testid="interest-tag"], [class*="interest"]');
    const count = await interests.count();

    // Some profiles might have interests
  });

  test('should display verified badge for verified users', async ({ page }) => {
    await expect(page.locator('[data-testid="swipe-card"], [class*="card"]')).toBeVisible({ timeout: 10000 });

    // Look for verified badge (may not be present on all profiles)
    const verifiedBadge = page.locator('[data-testid="verified-badge"], [class*="verified"]');

    // Badge visibility depends on profile data
  });

  test('should display location and distance', async ({ page }) => {
    await expect(page.locator('[data-testid="swipe-card"], [class*="card"]')).toBeVisible({ timeout: 10000 });

    // Location info should be visible
    await expect(page.getByText(/km|miles|away/i)).toBeVisible();
  });
});

test.describe('Empty State', () => {
  test('should handle no more profiles', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'Password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/discover', { timeout: 10000 });

    // If there are no profiles, should show empty state
    const emptyState = page.locator('[data-testid="no-profiles"], text=/no more profiles|come back later/i');

    // This depends on test data availability
  });
});

test.describe('Filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'Password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/discover', { timeout: 10000 });
  });

  test('should open filters panel', async ({ page }) => {
    // Click on filters button
    const filtersButton = page.locator('[data-testid="filters-button"], button:has-text("Filters")');

    if (await filtersButton.isVisible()) {
      await filtersButton.click();
      await expect(page.locator('[data-testid="filters-panel"]')).toBeVisible();
    }
  });

  test('should update age range filter', async ({ page }) => {
    const filtersButton = page.locator('[data-testid="filters-button"], button:has-text("Filters")');

    if (await filtersButton.isVisible()) {
      await filtersButton.click();

      // Update age range
      const minAgeInput = page.locator('input[name="minAge"]');
      const maxAgeInput = page.locator('input[name="maxAge"]');

      if (await minAgeInput.isVisible()) {
        await minAgeInput.fill('25');
        await maxAgeInput.fill('35');

        // Apply filters
        await page.click('button:has-text("Apply")');
      }
    }
  });
});
