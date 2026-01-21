import { test, expect } from '@playwright/test';
import { createTestHelpers } from '../fixtures/test-helpers';

/**
 * Example E2E Test: Complete User Flow
 * This demonstrates testing a complete user journey
 */

test.describe('User Journey - From Registration to First Match', () => {
  test('complete user onboarding flow', async ({ page }) => {
    const helpers = createTestHelpers(page);

    // Step 1: Navigate to registration page
    await page.goto('/register');
    await expect(page).toHaveTitle(/Register/);

    // Step 2: Fill registration form
    await page.fill('input[name="email"]', `test${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');
    await page.fill('input[name="dateOfBirth"]', '1990-01-01');
    await page.selectOption('select[name="gender"]', 'male');

    // Step 3: Submit registration
    await page.click('button[type="submit"]');

    // Step 4: Wait for welcome page
    await page.waitForURL('/welcome', { timeout: 10000 });
    await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();

    // Step 5: Complete profile
    await page.click('[data-testid="continue-button"]');
    await page.waitForURL('/profile/setup');

    // Fill profile details
    await page.fill('textarea[name="bio"]', 'Love to travel and meet new people!');
    await page.fill('input[name="occupation"]', 'Software Engineer');

    // Select interests
    const interests = ['travel', 'music', 'sports'];
    for (const interest of interests) {
      await page.click(`[data-interest="${interest}"]`);
    }

    // Step 6: Upload profile photo (mock)
    // In real test, you'd upload an actual file
    await page.click('[data-testid="continue-button"]');

    // Step 7: Set preferences
    await page.waitForURL('/preferences/setup');
    await page.fill('input[name="minAge"]', '25');
    await page.fill('input[name="maxAge"]', '35');
    await page.fill('input[name="distance"]', '50');
    await page.click('[data-testid="continue-button"]');

    // Step 8: Verify we're on the main app
    await page.waitForURL('/discover', { timeout: 10000 });
    await expect(page.locator('[data-testid="swipe-card"]')).toBeVisible();
  });
});

test.describe('Matching Flow', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  test('should swipe and create matches', async ({ page }) => {
    const helpers = createTestHelpers(page);

    // Navigate to discover page
    await page.goto('/discover');

    // Wait for profiles to load
    await expect(page.locator('[data-testid="swipe-card"]')).toBeVisible();

    // Swipe right on 3 profiles
    for (let i = 0; i < 3; i++) {
      await helpers.swipeRight();
      await page.waitForTimeout(1000); // Wait for next card
    }

    // Swipe left on 2 profiles
    for (let i = 0; i < 2; i++) {
      await helpers.swipeLeft();
      await page.waitForTimeout(1000);
    }

    // Check if we got a match
    const matchModal = page.locator('[data-testid="match-modal"]');
    if (await matchModal.isVisible()) {
      await expect(matchModal).toContainText("It's a Match!");
      await page.click('[data-testid="send-message-button"]');
      await page.waitForURL(/\/messages\//);
    }
  });

  test('should view matches list', async ({ page }) => {
    await page.goto('/matches');

    // Wait for matches to load
    await page.waitForSelector('[data-testid="match-card"]', { timeout: 10000 });

    // Verify matches are displayed
    const matchCards = page.locator('[data-testid="match-card"]');
    const count = await matchCards.count();
    expect(count).toBeGreaterThan(0);

    // Click on first match
    await matchCards.first().click();

    // Should navigate to conversation
    await page.waitForURL(/\/messages\//);
    await expect(page.locator('[data-testid="conversation-header"]')).toBeVisible();
  });
});

test.describe('Messaging Flow', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  test('should send and receive messages', async ({ page }) => {
    const helpers = createTestHelpers(page);

    // Navigate to messages
    await page.goto('/messages');

    // Select first conversation
    const conversations = page.locator('[data-testid="conversation-item"]');
    if ((await conversations.count()) > 0) {
      await conversations.first().click();

      // Wait for conversation to load
      await page.waitForSelector('[data-testid="message-list"]');

      // Send a message
      const messageText = `Test message ${Date.now()}`;
      await helpers.sendMessage(messageText);

      // Verify message appears in conversation
      await expect(page.locator(`text="${messageText}"`)).toBeVisible();

      // Verify message is marked as sent
      const lastMessage = page.locator('[data-testid="message-item"]').last();
      await expect(lastMessage).toHaveAttribute('data-status', 'sent');
    }
  });

  test('should show typing indicator', async ({ page }) => {
    await page.goto('/messages');

    const conversations = page.locator('[data-testid="conversation-item"]');
    if ((await conversations.count()) > 0) {
      await conversations.first().click();

      // Start typing
      await page.fill('[data-testid="message-input"]', 'Hello');

      // Typing indicator should be visible to other user
      // This would require a second browser context in real test
    }
  });
});

test.describe('Profile Management', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  test('should update profile information', async ({ page }) => {
    await page.goto('/profile/edit');

    // Update bio
    const newBio = 'Updated bio text with new interests!';
    await page.fill('textarea[name="bio"]', newBio);

    // Update occupation
    await page.fill('input[name="occupation"]', 'Senior Engineer');

    // Save changes
    await page.click('button[type="submit"]');

    // Wait for success notification
    const toast = await page.waitForSelector('[data-testid="toast-notification"]');
    await expect(toast).toContainText('Profile updated successfully');

    // Verify changes persisted
    await page.reload();
    await expect(page.locator('textarea[name="bio"]')).toHaveValue(newBio);
  });

  test('should upload profile photos', async ({ page }) => {
    await page.goto('/profile/edit');

    // Mock file upload
    const fileInput = page.locator('input[type="file"]');

    // In real test, you'd use an actual image file
    // await fileInput.setInputFiles('path/to/test-image.jpg');

    // Verify upload progress or success
    // await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
  });
});

test.describe('Settings and Preferences', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  test('should update matching preferences', async ({ page }) => {
    await page.goto('/settings/preferences');

    // Update age range
    await page.fill('input[name="minAge"]', '21');
    await page.fill('input[name="maxAge"]', '40');

    // Update distance
    await page.fill('input[name="distance"]', '100');

    // Save changes
    await page.click('button[type="submit"]');

    // Verify success
    const toast = await page.waitForSelector('[data-testid="toast-notification"]');
    await expect(toast).toContainText('Preferences updated');
  });

  test('should manage notification settings', async ({ page }) => {
    await page.goto('/settings/notifications');

    // Toggle email notifications
    await page.click('input[name="emailNotifications"]');

    // Toggle push notifications
    await page.click('input[name="pushNotifications"]');

    // Save settings
    await page.click('button[type="submit"]');

    // Verify success
    const toast = await page.waitForSelector('[data-testid="toast-notification"]');
    await expect(toast).toBeVisible();
  });
});
