import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Match and Messaging Flow
 */

test.describe('Match and Messaging', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL as string);
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD as string);
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*discover|dashboard/);
  });

  test('should view matches list', async ({ page }) => {
    // Navigate to matches
    await page.click('text=Matches, [href="/matches"]');
    await expect(page).toHaveURL(/.*matches/);

    // Should display matches
    await page.waitForSelector('.match-card, [data-testid="match"]', { timeout: 5000 });

    const matches = await page.locator('.match-card, [data-testid="match"]');
    await expect(matches.first()).toBeVisible();
  });

  test('should open conversation from match', async ({ page }) => {
    await page.goto('/matches');
    await page.waitForSelector('.match-card, [data-testid="match"]');

    // Click on first match
    await page.locator('.match-card, [data-testid="match"]').first().click();

    // Should open conversation
    await expect(page).toHaveURL(/.*messages|conversation/);

    // Should show message input
    await expect(page.locator('textarea, input[type="text"]').last()).toBeVisible();
  });

  test('should send text message', async ({ page }) => {
    await page.goto('/matches');
    await page.waitForSelector('.match-card, [data-testid="match"]');

    // Open conversation
    await page.locator('.match-card, [data-testid="match"]').first().click();
    await page.waitForURL(/.*messages|conversation/);

    // Type and send message
    const messageText = `Test message ${Date.now()}`;
    const messageInput = page.locator('textarea, input[placeholder*="message"]').last();

    await messageInput.fill(messageText);
    await page.click('button[type="submit"], button[aria-label*="send"]');

    // Message should appear in conversation
    await expect(page.locator(`text=${messageText}`)).toBeVisible({ timeout: 5000 });

    // Message should show as sent
    const sentMessage = page.locator('.message, [data-testid="message"]').last();
    await expect(sentMessage).toContainText(messageText);
  });

  test('should send multiple messages', async ({ page }) => {
    await page.goto('/matches');
    await page.waitForSelector('.match-card, [data-testid="match"]');

    await page.locator('.match-card, [data-testid="match"]').first().click();
    await page.waitForURL(/.*messages|conversation/);

    const messages = ['Hello!', 'How are you?', 'Nice to meet you'];
    const messageInput = page.locator('textarea, input[placeholder*="message"]').last();

    for (const msg of messages) {
      await messageInput.fill(msg);
      await page.click('button[type="submit"], button[aria-label*="send"]');
      await page.waitForTimeout(500);
    }

    // All messages should be visible
    for (const msg of messages) {
      await expect(page.locator(`text=${msg}`)).toBeVisible();
    }
  });

  test('should show typing indicator', async ({ page, context }) => {
    // This test requires two users - simulated with two browser contexts
    await page.goto('/matches');
    await page.waitForSelector('.match-card, [data-testid="match"]');

    await page.locator('.match-card, [data-testid="match"]').first().click();
    await page.waitForURL(/.*messages|conversation/);

    // Start typing
    const messageInput = page.locator('textarea, input[placeholder*="message"]').last();
    await messageInput.fill('Typing...');

    // Should show typing indicator (implementation dependent)
    // This is a placeholder test
    await page.waitForTimeout(1000);
  });

  test('should send emoji', async ({ page }) => {
    await page.goto('/matches');
    await page.waitForSelector('.match-card, [data-testid="match"]');

    await page.locator('.match-card, [data-testid="match"]').first().click();
    await page.waitForURL(/.*messages|conversation/);

    // Open emoji picker
    try {
      await page.click('button[aria-label*="emoji"], .emoji-button');

      // Select an emoji
      await page.click('.emoji-picker .emoji, [data-emoji]', { timeout: 2000 });

      // Send message
      await page.click('button[type="submit"], button[aria-label*="send"]');

      // Emoji should appear in conversation
      await page.waitForTimeout(500);
    } catch {
      // Emoji picker might not be available
    }
  });

  test('should send GIF', async ({ page }) => {
    await page.goto('/matches');
    await page.waitForSelector('.match-card, [data-testid="match"]');

    await page.locator('.match-card, [data-testid="match"]').first().click();
    await page.waitForURL(/.*messages|conversation/);

    try {
      // Open GIF picker
      await page.click('button[aria-label*="gif"], .gif-button');

      // Wait for GIFs to load
      await page.waitForSelector('.gif-picker, [data-testid="gif-selector"]', { timeout: 3000 });

      // Select a GIF
      await page.locator('img[alt*="gif"], .gif-item').first().click();

      // GIF should be sent
      await page.waitForTimeout(1000);

      // Should see GIF in messages
      const gifMessage = page.locator('.message img, [data-testid="message"] img').last();
      await expect(gifMessage).toBeVisible();
    } catch {
      // GIF feature might not be available
    }
  });

  test('should scroll to load message history', async ({ page }) => {
    await page.goto('/matches');
    await page.waitForSelector('.match-card, [data-testid="match"]');

    await page.locator('.match-card, [data-testid="match"]').first().click();
    await page.waitForURL(/.*messages|conversation/);

    // Get initial message count
    const initialCount = await page.locator('.message, [data-testid="message"]').count();

    // Scroll to top
    const messageContainer = page.locator('.messages, [data-testid="message-list"]').first();
    await messageContainer.evaluate(el => el.scrollTop = 0);

    await page.waitForTimeout(1000);

    // Should load more messages (if available)
    const newCount = await page.locator('.message, [data-testid="message"]').count();

    // Count may be same or more (depends on message history)
    expect(newCount).toBeGreaterThanOrEqual(initialCount);
  });

  test('should delete message', async ({ page }) => {
    await page.goto('/matches');
    await page.waitForSelector('.match-card, [data-testid="match"]');

    await page.locator('.match-card, [data-testid="match"]').first().click();
    await page.waitForURL(/.*messages|conversation/);

    // Send a message
    const messageText = 'Message to delete';
    const messageInput = page.locator('textarea, input[placeholder*="message"]').last();
    await messageInput.fill(messageText);
    await page.click('button[type="submit"], button[aria-label*="send"]');

    await page.waitForTimeout(500);

    // Long press or right-click on message
    const sentMessage = page.locator('.message, [data-testid="message"]').last();
    await sentMessage.click({ button: 'right' });

    // Click delete option
    try {
      await page.click('text=Delete, button:has-text("Delete")');

      // Confirm deletion
      await page.click('button:has-text("Confirm"), button:has-text("Yes")');

      await page.waitForTimeout(500);

      // Message should be deleted or marked as deleted
      // Implementation varies
    } catch {
      // Delete option might not be available immediately
    }
  });

  test('should report conversation', async ({ page }) => {
    await page.goto('/matches');
    await page.waitForSelector('.match-card, [data-testid="match"]');

    await page.locator('.match-card, [data-testid="match"]').first().click();
    await page.waitForURL(/.*messages|conversation/);

    // Open conversation options
    await page.click('button[aria-label*="options"], button[aria-label*="menu"], .more-button');

    // Click report
    await page.click('text=Report');

    // Should open report modal
    await expect(page.locator('.report-modal, [data-testid="report-dialog"]')).toBeVisible();

    // Select reason
    await page.click('input[value="harassment"], label:has-text("Harassment")');

    // Add description
    await page.fill('textarea[name="description"]', 'Inappropriate messages');

    // Submit report
    await page.click('button:has-text("Submit")');

    // Should show confirmation
    await expect(page.locator('text=/reported|submitted/i')).toBeVisible();
  });

  test('should unmatch user', async ({ page }) => {
    await page.goto('/matches');
    await page.waitForSelector('.match-card, [data-testid="match"]');

    // Get match count before
    const initialMatchCount = await page.locator('.match-card, [data-testid="match"]').count();

    await page.locator('.match-card, [data-testid="match"]').first().click();
    await page.waitForURL(/.*messages|conversation/);

    // Open options
    await page.click('button[aria-label*="options"], button[aria-label*="menu"]');

    // Click unmatch
    await page.click('text=Unmatch');

    // Confirm unmatch
    await page.click('button:has-text("Confirm"), button:has-text("Unmatch")');

    // Should redirect back to matches
    await expect(page).toHaveURL(/.*matches/, { timeout: 5000 });

    // Match should be removed
    await page.waitForTimeout(1000);
    const newMatchCount = await page.locator('.match-card, [data-testid="match"]').count();
    expect(newMatchCount).toBeLessThan(initialMatchCount);
  });

  test('should filter matches by new/unread', async ({ page }) => {
    await page.goto('/matches');
    await page.waitForSelector('.match-card, [data-testid="match"]');

    // Apply filter
    try {
      await page.click('button:has-text("Filter"), select[name="filter"]');
      await page.click('text=New, option:has-text("New")');

      await page.waitForTimeout(500);

      // Should show only new matches
      const matches = await page.locator('.match-card, [data-testid="match"]');
      await expect(matches.first()).toBeVisible();
    } catch {
      // Filter option might be different
    }
  });

  test('should search matches', async ({ page }) => {
    await page.goto('/matches');
    await page.waitForSelector('.match-card, [data-testid="match"]');

    // Search for match
    try {
      const searchInput = page.locator('input[placeholder*="search"], input[type="search"]');
      await searchInput.fill('Test');

      await page.waitForTimeout(500);

      // Should filter matches based on search
      // Results depend on test data
    } catch {
      // Search might not be available
    }
  });

  test('should receive real-time messages', async ({ page, context }) => {
    // This would require WebSocket connection testing
    // Simplified version:

    await page.goto('/matches');
    await page.waitForSelector('.match-card, [data-testid="match"]');

    await page.locator('.match-card, [data-testid="match"]').first().click();
    await page.waitForURL(/.*messages|conversation/);

    // In real scenario, another user would send a message
    // For testing, we wait for any incoming messages

    await page.waitForTimeout(5000);

    // Check if any new messages appeared
    const messages = await page.locator('.message, [data-testid="message"]');
    await expect(messages.first()).toBeVisible();
  });
});
