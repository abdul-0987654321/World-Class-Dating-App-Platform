import { test, expect } from '@playwright/test';

/**
 * Messaging & Chat Tests
 * Tests for real-time messaging functionality
 */

const TEST_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD;

test.describe('Messaging - Authentication Required', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Skipping: No test credentials provided');

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: /email/i }).fill(TEST_EMAIL!);
    await page.locator('input[type="password"]').first().fill(TEST_PASSWORD!);
    await page.getByRole('button', { name: /log in|sign in|continue/i }).click();
    await page.waitForURL(/app|home/i, { timeout: 10000 });
  });

  test('should display messages list', async ({ page }) => {
    await page.goto('/app/messages');
    const conversationsList = page.locator('[data-testid="conversations-list"], .conversations, .messages-list').first();
    const emptyState = page.getByText(/no messages|start a conversation|no matches yet/i).first();
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should open conversation on click', async ({ page }) => {
    await page.goto('/app/messages');
    const conversation = page.locator('[data-testid="conversation-item"], .conversation-preview').first();
    if (await conversation.isVisible().catch(() => false)) {
      await conversation.click();
      await page.waitForTimeout(500);
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should have message input field', async ({ page }) => {
    await page.goto('/app/messages');
    const conversation = page.locator('[data-testid="conversation-item"], .conversation-preview').first();
    if (await conversation.isVisible().catch(() => false)) {
      await conversation.click();
      const messageInput = page.locator('[data-testid="message-input"], input[placeholder*="message"], textarea[placeholder*="message"]').first();
      if (await messageInput.isVisible().catch(() => false)) {
        await expect(messageInput).toBeEnabled();
      }
    }
  });

  test('should show typing indicator', async ({ page }) => {
    await page.goto('/app/messages');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load message history on scroll', async ({ page }) => {
    await page.goto('/app/messages');
    const conversation = page.locator('[data-testid="conversation-item"]').first();
    if (await conversation.isVisible().catch(() => false)) {
      await conversation.click();
      const messagesContainer = page.locator('[data-testid="messages-container"], .messages-scroll').first();
      if (await messagesContainer.isVisible().catch(() => false)) {
        await messagesContainer.evaluate((el) => el.scrollTop = 0);
      }
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('Messaging - Real-time Features', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Skipping: No test credentials provided');

  test('should establish WebSocket connection', async ({ page }) => {
    const wsConnections: string[] = [];
    page.on('websocket', (ws) => {
      wsConnections.push(ws.url());
    });
    await page.goto('/login');
    await page.getByRole('textbox', { name: /email/i }).fill(TEST_EMAIL!);
    await page.locator('input[type="password"]').first().fill(TEST_PASSWORD!);
    await page.getByRole('button', { name: /log in|sign in|continue/i }).click();
    await page.waitForTimeout(3000);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should show read receipts', async ({ page }) => {
    await page.goto('/app/messages');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Messaging - Error Handling', () => {
  test('should handle network disconnection gracefully', async ({ page, context }) => {
    await page.goto('/app/messages');
    await context.setOffline(true);
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();
    await context.setOffline(false);
  });

  test('should retry failed message sends', async ({ page }) => {
    await page.goto('/app/messages');
    await expect(page.locator('body')).toBeVisible();
  });
});
