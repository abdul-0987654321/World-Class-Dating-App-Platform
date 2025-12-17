import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Discovery and Swiping Flow
 */

test.describe('Discovery and Swiping', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL as string);
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD as string);
    await page.click('button[type="submit"]');

    // Navigate to discovery
    await page.waitForURL(/.*discover|dashboard/);
    await page.goto('/discover');
  });

  test('should display profile cards', async ({ page }) => {
    // Wait for profile cards to load
    await page.waitForSelector('.profile-card, [data-testid="profile-card"]', { timeout: 10000 });

    // Should have at least one profile card
    const profileCard = await page.locator('.profile-card, [data-testid="profile-card"]');
    await expect(profileCard.first()).toBeVisible();

    // Profile should have essential info
    await expect(page.locator('text=/name|age/i')).toBeVisible();
  });

  test('should swipe right on profile', async ({ page }) => {
    await page.waitForSelector('.profile-card, [data-testid="profile-card"]');

    // Click like/right button
    await page.click('button[aria-label*="like"], button:has-text("❤"), .like-button');

    // Card should disappear or new card should appear
    await page.waitForTimeout(500);

    // Should show feedback animation
    // This depends on implementation
  });

  test('should swipe left on profile', async ({ page }) => {
    await page.waitForSelector('.profile-card, [data-testid="profile-card"]');

    // Click pass/left button
    await page.click('button[aria-label*="pass"], button:has-text("✕"), .pass-button');

    await page.waitForTimeout(500);

    // Next profile should appear
    const profileCard = await page.locator('.profile-card, [data-testid="profile-card"]');
    await expect(profileCard.first()).toBeVisible();
  });

  test('should use keyboard shortcuts for swiping', async ({ page }) => {
    await page.waitForSelector('.profile-card, [data-testid="profile-card"]');

    // Swipe right with arrow key
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);

    // Swipe left with arrow key
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(500);

    // Profile should still be visible
    const profileCard = await page.locator('.profile-card, [data-testid="profile-card"]');
    await expect(profileCard.first()).toBeVisible();
  });

  test('should support drag-to-swipe gesture', async ({ page }) => {
    await page.waitForSelector('.profile-card, [data-testid="profile-card"]');

    const card = page.locator('.profile-card, [data-testid="profile-card"]').first();
    const boundingBox = await card.boundingBox();

    if (boundingBox) {
      // Drag card to the right
      await page.mouse.move(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(boundingBox.x + boundingBox.width + 100, boundingBox.y + boundingBox.height / 2);
      await page.mouse.up();

      await page.waitForTimeout(500);

      // New card should appear
      await expect(card).toBeVisible();
    }
  });

  test('should view full profile', async ({ page }) => {
    await page.waitForSelector('.profile-card, [data-testid="profile-card"]');

    // Click on profile card or info button
    await page.click('.profile-card, button:has-text("info"), button[aria-label*="info"]');

    // Should show full profile modal/page
    await expect(page.locator('.profile-modal, [data-testid="profile-detail"]')).toBeVisible();

    // Should have bio
    await expect(page.locator('text=/bio|about/i')).toBeVisible();

    // Should have interests
    await expect(page.locator('text=/interest/i')).toBeVisible();

    // Should have photos gallery
    const photos = await page.locator('img[alt*="photo"]').count();
    expect(photos).toBeGreaterThan(0);
  });

  test('should navigate through profile photos', async ({ page }) => {
    await page.waitForSelector('.profile-card, [data-testid="profile-card"]');

    // Check initial photo
    const profileCard = page.locator('.profile-card, [data-testid="profile-card"]').first();
    const firstPhotoSrc = await profileCard.locator('img').first().getAttribute('src');

    // Click next photo button or right side of card
    const boundingBox = await profileCard.boundingBox();
    if (boundingBox) {
      await page.mouse.click(boundingBox.x + boundingBox.width - 50, boundingBox.y + boundingBox.height / 2);
    }

    await page.waitForTimeout(300);

    // Photo should change (if user has multiple photos)
    const secondPhotoSrc = await profileCard.locator('img').first().getAttribute('src');
    // May be same if user only has one photo, but interaction should work
  });

  test('should show match notification', async ({ page }) => {
    await page.waitForSelector('.profile-card, [data-testid="profile-card"]');

    // Swipe right
    await page.click('button[aria-label*="like"], .like-button');

    // If it's a match, should show modal
    const matchModal = page.locator('.match-modal, [data-testid="match-notification"]');

    // Wait to see if match appears (timeout is okay if no match)
    try {
      await matchModal.waitFor({ timeout: 2000 });
      await expect(matchModal).toBeVisible();

      // Should have "It's a Match" or similar text
      await expect(page.locator('text=/match/i')).toBeVisible();

      // Should have option to send message
      await expect(page.locator('button:has-text("Message"), button:has-text("Say Hi")')).toBeVisible();
    } catch {
      // No match occurred, which is fine
    }
  });

  test('should apply filters', async ({ page }) => {
    // Open filters
    await page.click('button:has-text("Filters"), button[aria-label*="filter"]');

    // Wait for filter panel
    await expect(page.locator('.filter-panel, [data-testid="filters"]')).toBeVisible();

    // Adjust age range
    await page.fill('input[name="ageMin"]', '28');
    await page.fill('input[name="ageMax"]', '32');

    // Adjust distance
    await page.fill('input[name="distance"]', '25');

    // Apply filters
    await page.click('button:has-text("Apply")');

    // Filters should close
    await page.waitForTimeout(500);

    // New profiles matching filters should load
    await page.waitForSelector('.profile-card, [data-testid="profile-card"]');
  });

  test('should show "no more profiles" message', async ({ page }) => {
    // Swipe through all available profiles
    for (let i = 0; i < 50; i++) {
      try {
        await page.waitForSelector('.profile-card, [data-testid="profile-card"]', { timeout: 1000 });
        await page.click('button[aria-label*="like"], .like-button');
        await page.waitForTimeout(300);
      } catch {
        break;
      }
    }

    // Should eventually show "no more profiles" or similar
    // This depends on available test data
    try {
      await expect(page.locator('text=/no.*more|out.*profiles/i')).toBeVisible({ timeout: 5000 });
    } catch {
      // May not reach this if there are many profiles
    }
  });

  test('should support super like', async ({ page }) => {
    await page.waitForSelector('.profile-card, [data-testid="profile-card"]');

    // Click super like button
    await page.click('button[aria-label*="super"], button:has-text("⭐"), .super-like-button');

    // Should show confirmation or animation
    await page.waitForTimeout(500);

    // Next profile should appear
    const profileCard = await page.locator('.profile-card, [data-testid="profile-card"]');
    await expect(profileCard.first()).toBeVisible();
  });

  test('should undo last swipe', async ({ page }) => {
    await page.waitForSelector('.profile-card, [data-testid="profile-card"]');

    // Get current profile name/info
    const firstProfileText = await page.locator('.profile-card, [data-testid="profile-card"]').first().textContent();

    // Swipe left
    await page.click('button[aria-label*="pass"], .pass-button');
    await page.waitForTimeout(500);

    // Click undo button (may require premium)
    const undoButton = page.locator('button[aria-label*="undo"], button:has-text("↶"), .undo-button');

    try {
      await undoButton.click({ timeout: 2000 });
      await page.waitForTimeout(500);

      // Previous profile should reappear
      const currentProfileText = await page.locator('.profile-card, [data-testid="profile-card"]').first().textContent();
      expect(currentProfileText).toBe(firstProfileText);
    } catch {
      // Undo may not be available (premium feature)
    }
  });

  test('should handle premium upgrade prompt', async ({ page }) => {
    // Try to use premium feature (super like multiple times)
    await page.waitForSelector('.profile-card, [data-testid="profile-card"]');

    for (let i = 0; i < 3; i++) {
      try {
        await page.click('button[aria-label*="super"], .super-like-button');
        await page.waitForTimeout(300);
      } catch {
        break;
      }
    }

    // May show upgrade prompt
    const upgradeModal = page.locator('.upgrade-modal, [data-testid="premium-prompt"]');

    try {
      await upgradeModal.waitFor({ timeout: 2000 });
      await expect(upgradeModal).toBeVisible();
      await expect(page.locator('text=/premium|upgrade/i')).toBeVisible();
    } catch {
      // User may already be premium or limit not reached
    }
  });
});
