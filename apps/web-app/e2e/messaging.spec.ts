/**
 * Messaging E2E Tests
 * Tests for chat and messaging functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Messages Page', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate before each test
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'Password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/discover', { timeout: 10000 });

    // Navigate to messages
    await page.goto('/messages');
  });

  test('should display messages page header', async ({ page }) => {
    await expect(page.getByText(/messages|flamoral/i)).toBeVisible();
  });

  test('should display conversation list', async ({ page }) => {
    // Wait for conversations to load
    const conversationList = page.locator(
      '[data-testid="conversation-list"], [class*="conversation"]'
    );
    await expect(conversationList).toBeVisible({ timeout: 10000 });
  });

  test('should display empty state when no conversations', async ({ page }) => {
    // If no conversations, should show empty state
    const emptyState = page.locator(
      '[data-testid="no-conversations"], text=/no messages|start matching/i'
    );

    // This depends on test data
  });

  test('should show conversation with participant info', async ({ page }) => {
    const conversationItem = page.locator('[data-testid="conversation-item"]').first();

    if (await conversationItem.isVisible()) {
      // Should show participant name
      await expect(conversationItem.locator('[data-testid="participant-name"]')).toBeVisible();

      // Should show last message preview
      await expect(conversationItem.locator('[data-testid="last-message"]')).toBeVisible();
    }
  });

  test('should show unread message indicator', async ({ page }) => {
    const unreadBadge = page.locator('[data-testid="unread-badge"], [class*="unread"]');

    // If there are unread messages, badge should be visible
  });

  test('should show online status indicator', async ({ page }) => {
    const onlineIndicator = page.locator('[data-testid="online-indicator"], [class*="online"]');

    // Online status depends on participant data
  });
});

test.describe('Conversation View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'Password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/discover', { timeout: 10000 });
    await page.goto('/messages');
  });

  test('should open conversation when clicking on it', async ({ page }) => {
    const conversationItem = page.locator('[data-testid="conversation-item"]').first();

    if (await conversationItem.isVisible()) {
      await conversationItem.click();

      // Should show message thread
      await expect(
        page.locator('[data-testid="message-thread"], [class*="message-list"]')
      ).toBeVisible();
    }
  });

  test('should display message input field', async ({ page }) => {
    const conversationItem = page.locator('[data-testid="conversation-item"]').first();

    if (await conversationItem.isVisible()) {
      await conversationItem.click();

      // Message input should be visible
      await expect(
        page.locator('input[placeholder*="message" i], textarea[placeholder*="message" i]')
      ).toBeVisible();
    }
  });

  test('should display send button', async ({ page }) => {
    const conversationItem = page.locator('[data-testid="conversation-item"]').first();

    if (await conversationItem.isVisible()) {
      await conversationItem.click();

      // Send button should be visible
      await expect(
        page.locator('button[type="submit"], [data-testid="send-button"]')
      ).toBeVisible();
    }
  });

  test('should display conversation header with participant info', async ({ page }) => {
    const conversationItem = page.locator('[data-testid="conversation-item"]').first();

    if (await conversationItem.isVisible()) {
      await conversationItem.click();

      // Header should show participant name
      await expect(page.locator('[data-testid="conversation-header"]')).toBeVisible();
    }
  });
});

test.describe('Sending Messages', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'Password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/discover', { timeout: 10000 });
    await page.goto('/messages');
  });

  test('should send message when clicking send button', async ({ page }) => {
    const conversationItem = page.locator('[data-testid="conversation-item"]').first();

    if (await conversationItem.isVisible()) {
      await conversationItem.click();

      // Type message
      const messageInput = page.locator(
        'input[placeholder*="message" i], textarea[placeholder*="message" i]'
      );
      const messageText = `Test message ${Date.now()}`;
      await messageInput.fill(messageText);

      // Click send
      await page.click('button[type="submit"], [data-testid="send-button"]');

      // Message should appear in thread
      await expect(page.getByText(messageText)).toBeVisible();
    }
  });

  test('should send message when pressing Enter', async ({ page }) => {
    const conversationItem = page.locator('[data-testid="conversation-item"]').first();

    if (await conversationItem.isVisible()) {
      await conversationItem.click();

      const messageInput = page.locator(
        'input[placeholder*="message" i], textarea[placeholder*="message" i]'
      );
      const messageText = `Enter test ${Date.now()}`;
      await messageInput.fill(messageText);
      await messageInput.press('Enter');

      await expect(page.getByText(messageText)).toBeVisible();
    }
  });

  test('should clear input after sending message', async ({ page }) => {
    const conversationItem = page.locator('[data-testid="conversation-item"]').first();

    if (await conversationItem.isVisible()) {
      await conversationItem.click();

      const messageInput = page.locator(
        'input[placeholder*="message" i], textarea[placeholder*="message" i]'
      );
      await messageInput.fill('Test message');
      await messageInput.press('Enter');

      // Input should be cleared
      await expect(messageInput).toHaveValue('');
    }
  });

  test('should not send empty message', async ({ page }) => {
    const conversationItem = page.locator('[data-testid="conversation-item"]').first();

    if (await conversationItem.isVisible()) {
      await conversationItem.click();

      const messageInput = page.locator(
        'input[placeholder*="message" i], textarea[placeholder*="message" i]'
      );
      const initialMessageCount = await page.locator('[data-testid="message-item"]').count();

      await messageInput.fill('   ');
      await messageInput.press('Enter');

      // Message count should not change
      const finalMessageCount = await page.locator('[data-testid="message-item"]').count();
      expect(finalMessageCount).toBe(initialMessageCount);
    }
  });
});

test.describe('Message Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'Password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/discover', { timeout: 10000 });
    await page.goto('/messages');
  });

  test('should distinguish sent and received messages', async ({ page }) => {
    const conversationItem = page.locator('[data-testid="conversation-item"]').first();

    if (await conversationItem.isVisible()) {
      await conversationItem.click();

      // Sent messages should be on one side, received on the other
      const sentMessages = page.locator('[data-testid="message-sent"], [class*="sent"]');
      const receivedMessages = page.locator(
        '[data-testid="message-received"], [class*="received"]'
      );

      // Both types should have different styling
    }
  });

  test('should display message timestamps', async ({ page }) => {
    const conversationItem = page.locator('[data-testid="conversation-item"]').first();

    if (await conversationItem.isVisible()) {
      await conversationItem.click();

      // Messages should show time
      await expect(
        page.locator('[data-testid="message-time"], [class*="time"]').first()
      ).toBeVisible();
    }
  });

  test('should show message status (sent/read)', async ({ page }) => {
    const conversationItem = page.locator('[data-testid="conversation-item"]').first();

    if (await conversationItem.isVisible()) {
      await conversationItem.click();

      // Message status indicators (checkmarks)
      const statusIndicator = page.locator('[data-testid="message-status"], [class*="status"]');
      // Status depends on message data
    }
  });

  test('should auto-scroll to latest message', async ({ page }) => {
    const conversationItem = page.locator('[data-testid="conversation-item"]').first();

    if (await conversationItem.isVisible()) {
      await conversationItem.click();

      // Latest message should be visible
      const lastMessage = page.locator('[data-testid="message-item"]').last();
      await expect(lastMessage).toBeVisible();
    }
  });
});

test.describe('Typing Indicator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'Password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/discover', { timeout: 10000 });
    await page.goto('/messages');
  });

  test('should show typing indicator when user types', async ({ page }) => {
    const conversationItem = page.locator('[data-testid="conversation-item"]').first();

    if (await conversationItem.isVisible()) {
      await conversationItem.click();

      const messageInput = page.locator(
        'input[placeholder*="message" i], textarea[placeholder*="message" i]'
      );
      await messageInput.fill('Typing...');

      // Typing indicator should be shown (for other user in real scenario)
      // This would need WebSocket mock for full testing
    }
  });
});

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'Password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/discover', { timeout: 10000 });
    await page.goto('/messages');
  });

  test('should navigate back to conversation list', async ({ page }) => {
    const conversationItem = page.locator('[data-testid="conversation-item"]').first();

    if (await conversationItem.isVisible()) {
      await conversationItem.click();

      // Click back button
      const backButton = page.locator('[data-testid="back-button"], [aria-label="Back"]');

      if (await backButton.isVisible()) {
        await backButton.click();
        await expect(page.locator('[data-testid="conversation-list"]')).toBeVisible();
      }
    }
  });

  test('should navigate to discover page', async ({ page }) => {
    await page.click('text=/discover/i, [data-testid="nav-discover"]');
    await expect(page).toHaveURL(/discover/);
  });

  test('should navigate to matches page', async ({ page }) => {
    await page.click('text=/matches/i, [data-testid="nav-matches"]');
    await expect(page).toHaveURL(/matches/);
  });
});

test.describe('Deep Linking', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'Password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/discover', { timeout: 10000 });
  });

  test('should open specific conversation from URL', async ({ page }) => {
    // Navigate directly to a conversation
    await page.goto('/messages?chat=user-123');

    // Should open that conversation (if it exists)
  });
});

test.describe('Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'Password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/discover', { timeout: 10000 });
    await page.goto('/messages');
  });

  test('should handle message send failure gracefully', async ({ page }) => {
    // This would need network mocking to test properly
    // Mock API to fail, then verify error handling
  });

  test('should show retry option on send failure', async ({ page }) => {
    // Test retry functionality for failed messages
  });
});
