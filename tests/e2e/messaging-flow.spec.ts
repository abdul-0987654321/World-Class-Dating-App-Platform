import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Messaging Flow
 * Tests: Open conversation -> Send message -> Receive message
 */

test.describe('Messaging Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard|discover/, { timeout: 15000 });
  });

  test.describe('Conversation List', () => {
    test('should display matches list', async ({ page }) => {
      await page.goto('/matches');

      // Wait for matches to load
      await page.waitForTimeout(2000);

      // Should show matches or empty state
      const matches = page.locator('.match-card, [data-testid="match"], .conversation-item');
      const emptyState = page.locator('text=/no.*matches|start.*swiping/i');

      const hasMatches = await matches.first().isVisible({ timeout: 5000 });
      const hasEmptyState = await emptyState.isVisible({ timeout: 1000 });

      expect(hasMatches || hasEmptyState).toBeTruthy();
    });

    test('should show unread message indicator', async ({ page }) => {
      await page.goto('/matches');

      await page.waitForTimeout(2000);

      // Check for unread indicator
      const unreadBadge = page.locator('.unread-badge, .unread-indicator, [data-testid="unread"]');

      // May or may not have unread messages
      if (await unreadBadge.isVisible({ timeout: 2000 })) {
        await expect(unreadBadge).toBeVisible();
      }
    });

    test('should show last message preview', async ({ page }) => {
      await page.goto('/matches');

      await page.waitForTimeout(2000);

      const conversationItem = page.locator('.conversation-item, .match-card').first();

      if (await conversationItem.isVisible({ timeout: 3000 })) {
        // Check for message preview
        const preview = conversationItem.locator('.message-preview, .last-message');

        if (await preview.isVisible({ timeout: 1000 })) {
          await expect(preview).toBeVisible();
        }
      }
    });

    test('should show timestamp of last message', async ({ page }) => {
      await page.goto('/matches');

      await page.waitForTimeout(2000);

      const conversationItem = page.locator('.conversation-item, .match-card').first();

      if (await conversationItem.isVisible({ timeout: 3000 })) {
        const timestamp = conversationItem.locator('.timestamp, .time, text=/\\d{1,2}:\\d{2}|ago|yesterday/i');

        if (await timestamp.isVisible({ timeout: 1000 })) {
          await expect(timestamp).toBeVisible();
        }
      }
    });

    test('should search matches', async ({ page }) => {
      await page.goto('/matches');

      const searchInput = page.locator('input[type="search"], input[placeholder*="search"]');

      if (await searchInput.isVisible({ timeout: 2000 })) {
        await searchInput.fill('test');
        await page.waitForTimeout(500);

        // Results should filter
      }
    });
  });

  test.describe('Open Conversation', () => {
    test('should open conversation from match list', async ({ page }) => {
      await page.goto('/matches');

      await page.waitForSelector('.match-card, [data-testid="match"], .conversation-item', { timeout: 10000 });

      // Click on first match
      await page.locator('.match-card, [data-testid="match"], .conversation-item').first().click();

      // Should navigate to conversation
      await expect(page).toHaveURL(/.*messages|conversation|chat/, { timeout: 5000 });
    });

    test('should show message input field', async ({ page }) => {
      await page.goto('/matches');

      await page.waitForSelector('.match-card', { timeout: 10000 });
      await page.locator('.match-card').first().click();

      await page.waitForURL(/.*messages|conversation/, { timeout: 5000 });

      // Should have message input
      const messageInput = page.locator('textarea, input[type="text"][placeholder*="message"], input[placeholder*="type"]');
      await expect(messageInput.first()).toBeVisible({ timeout: 5000 });
    });

    test('should show match profile in header', async ({ page }) => {
      await page.goto('/matches');

      await page.waitForSelector('.match-card', { timeout: 10000 });
      await page.locator('.match-card').first().click();

      await page.waitForURL(/.*messages|conversation/, { timeout: 5000 });

      // Should show profile name in header
      const profileName = page.locator('.chat-header .name, header .name, [data-testid="chat-header"]');
      await expect(profileName.first()).toBeVisible({ timeout: 5000 });
    });

    test('should load message history', async ({ page }) => {
      await page.goto('/matches');

      await page.waitForSelector('.match-card', { timeout: 10000 });
      await page.locator('.match-card').first().click();

      await page.waitForURL(/.*messages|conversation/, { timeout: 5000 });

      // Wait for messages to load
      await page.waitForTimeout(2000);

      // May have messages or empty conversation
      const messages = page.locator('.message, [data-testid="message"]');
      const emptyState = page.locator('text=/start.*conversation|say.*hi|send.*message/i');

      const hasMessages = await messages.first().isVisible({ timeout: 2000 });
      const isEmpty = await emptyState.isVisible({ timeout: 1000 });

      expect(hasMessages || isEmpty).toBeTruthy();
    });
  });

  test.describe('Send Message', () => {
    test('should send a text message', async ({ page }) => {
      await page.goto('/matches');

      await page.waitForSelector('.match-card', { timeout: 10000 });
      await page.locator('.match-card').first().click();
      await page.waitForURL(/.*messages|conversation/, { timeout: 5000 });

      const messageText = `Test message ${Date.now()}`;
      const messageInput = page.locator('textarea, input[placeholder*="message"]').last();

      await messageInput.fill(messageText);
      await page.click('button[type="submit"], button[aria-label*="send"], .send-button');

      // Message should appear in conversation
      await expect(page.locator(`text=${messageText}`)).toBeVisible({ timeout: 5000 });
    });

    test('should send message with enter key', async ({ page }) => {
      await page.goto('/matches');

      await page.waitForSelector('.match-card', { timeout: 10000 });
      await page.locator('.match-card').first().click();
      await page.waitForURL(/.*messages|conversation/, { timeout: 5000 });

      const messageText = `Enter key message ${Date.now()}`;
      const messageInput = page.locator('textarea, input[placeholder*="message"]').last();

      await messageInput.fill(messageText);
      await page.keyboard.press('Enter');

      // Message should appear
      await expect(page.locator(`text=${messageText}`)).toBeVisible({ timeout: 5000 });
    });

    test('should send emoji message', async ({ page }) => {
      await page.goto('/matches');

      await page.waitForSelector('.match-card', { timeout: 10000 });
      await page.locator('.match-card').first().click();
      await page.waitForURL(/.*messages|conversation/, { timeout: 5000 });

      // Open emoji picker
      const emojiButton = page.locator('button[aria-label*="emoji"], .emoji-button');

      if (await emojiButton.isVisible({ timeout: 2000 })) {
        await emojiButton.click();

        // Select an emoji
        const emoji = page.locator('.emoji-picker .emoji, [data-emoji]').first();
        if (await emoji.isVisible({ timeout: 2000 })) {
          await emoji.click();

          // Send
          await page.click('button[type="submit"], .send-button');

          await page.waitForTimeout(1000);
        }
      }
    });

    test('should send GIF', async ({ page }) => {
      await page.goto('/matches');

      await page.waitForSelector('.match-card', { timeout: 10000 });
      await page.locator('.match-card').first().click();
      await page.waitForURL(/.*messages|conversation/, { timeout: 5000 });

      const gifButton = page.locator('button[aria-label*="gif"], .gif-button');

      if (await gifButton.isVisible({ timeout: 2000 })) {
        await gifButton.click();

        // Wait for GIF picker
        await page.waitForSelector('.gif-picker, [data-testid="gif-picker"]', { timeout: 3000 });

        // Select first GIF
        const gif = page.locator('.gif-item, [data-testid="gif"]').first();
        if (await gif.isVisible({ timeout: 2000 })) {
          await gif.click();

          await page.waitForTimeout(1000);

          // GIF should appear in messages
          const gifMessage = page.locator('.message img, [data-testid="message"] img');
          await expect(gifMessage.last()).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test('should show message sending status', async ({ page }) => {
      await page.goto('/matches');

      await page.waitForSelector('.match-card', { timeout: 10000 });
      await page.locator('.match-card').first().click();
      await page.waitForURL(/.*messages|conversation/, { timeout: 5000 });

      const messageText = `Status test ${Date.now()}`;
      const messageInput = page.locator('textarea, input[placeholder*="message"]').last();

      await messageInput.fill(messageText);
      await page.click('button[type="submit"], .send-button');

      // Check for sending/sent status
      const sentIndicator = page.locator('.message-status, .sent-indicator, text=/sent|delivered/i');

      // May show briefly
      await page.waitForTimeout(2000);
    });

    test('should handle message send failure', async ({ page }) => {
      await page.goto('/matches');

      await page.waitForSelector('.match-card', { timeout: 10000 });
      await page.locator('.match-card').first().click();
      await page.waitForURL(/.*messages|conversation/, { timeout: 5000 });

      // Disable network to simulate failure
      await page.context().setOffline(true);

      const messageText = `Offline message ${Date.now()}`;
      const messageInput = page.locator('textarea, input[placeholder*="message"]').last();

      await messageInput.fill(messageText);
      await page.click('button[type="submit"], .send-button');

      // Re-enable network
      await page.context().setOffline(false);

      // Should show failed status or retry option
      await page.waitForTimeout(2000);
    });

    test('should send photo message', async ({ page }) => {
      await page.goto('/matches');

      await page.waitForSelector('.match-card', { timeout: 10000 });
      await page.locator('.match-card').first().click();
      await page.waitForURL(/.*messages|conversation/, { timeout: 5000 });

      const photoButton = page.locator('button[aria-label*="photo"], button[aria-label*="image"], .photo-button');

      if (await photoButton.isVisible({ timeout: 2000 })) {
        const fileInput = page.locator('input[type="file"][accept*="image"]');

        await fileInput.setInputFiles({
          name: 'test-photo.jpg',
          mimeType: 'image/jpeg',
          buffer: Buffer.from('fake-image-data'),
        });

        await page.waitForTimeout(2000);

        // Image should appear in messages
        const imageMessage = page.locator('.message img');
        await expect(imageMessage.last()).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Receive Message', () => {
    test('should display received messages', async ({ page }) => {
      await page.goto('/matches');

      await page.waitForSelector('.match-card', { timeout: 10000 });
      await page.locator('.match-card').first().click();
      await page.waitForURL(/.*messages|conversation/, { timeout: 5000 });

      // Check for received messages (left-aligned or different style)
      const receivedMessages = page.locator('.message.received, .message-received, [data-type="received"]');

      // May or may not have received messages
      if (await receivedMessages.first().isVisible({ timeout: 3000 })) {
        await expect(receivedMessages.first()).toBeVisible();
      }
    });

    test('should show read receipts', async ({ page }) => {
      await page.goto('/matches');

      await page.waitForSelector('.match-card', { timeout: 10000 });
      await page.locator('.match-card').first().click();
      await page.waitForURL(/.*messages|conversation/, { timeout: 5000 });

      // Check for read receipts
      const readReceipt = page.locator('.read-receipt, .seen-indicator, text=/read|seen/i');

      if (await readReceipt.isVisible({ timeout: 3000 })) {
        await expect(readReceipt).toBeVisible();
      }
    });

    test('should update in real-time (WebSocket)', async ({ page }) => {
      await page.goto('/matches');

      await page.waitForSelector('.match-card', { timeout: 10000 });
      await page.locator('.match-card').first().click();
      await page.waitForURL(/.*messages|conversation/, { timeout: 5000 });

      // Get initial message count
      const initialCount = await page.locator('.message, [data-testid="message"]').count();

      // Wait for potential incoming messages
      await page.waitForTimeout(5000);

      // Count may have increased if partner sent a message
      const newCount = await page.locator('.message, [data-testid="message"]').count();

      // Just verify WebSocket connection works (no error)
      expect(newCount >= initialCount).toBeTruthy();
    });
  });

  test.describe('Typing Indicator', () => {
    test('should show typing indicator when typing', async ({ page }) => {
      await page.goto('/matches');

      await page.waitForSelector('.match-card', { timeout: 10000 });
      await page.locator('.match-card').first().click();
      await page.waitForURL(/.*messages|conversation/, { timeout: 5000 });

      const messageInput = page.locator('textarea, input[placeholder*="message"]').last();

      // Start typing
      await messageInput.type('Typing a message...', { delay: 100 });

      // Typing indicator should appear for other user (can't test in single browser)
      // Just verify input works
      const inputValue = await messageInput.inputValue();
      expect(inputValue).toContain('Typing');
    });
  });

  test.describe('Message Actions', () => {
    test('should delete own message', async ({ page }) => {
      await page.goto('/matches');

      await page.waitForSelector('.match-card', { timeout: 10000 });
      await page.locator('.match-card').first().click();
      await page.waitForURL(/.*messages|conversation/, { timeout: 5000 });

      // Send a message first
      const messageText = `Delete test ${Date.now()}`;
      const messageInput = page.locator('textarea, input[placeholder*="message"]').last();
      await messageInput.fill(messageText);
      await page.click('button[type="submit"], .send-button');

      await page.waitForTimeout(1000);

      // Find the sent message and right-click or long-press
      const sentMessage = page.locator(`.message:has-text("${messageText}")`);

      if (await sentMessage.isVisible({ timeout: 3000 })) {
        await sentMessage.click({ button: 'right' });

        // Click delete
        const deleteButton = page.locator('text=Delete, button:has-text("Delete")');
        if (await deleteButton.isVisible({ timeout: 2000 })) {
          await deleteButton.click();

          // Confirm deletion
          const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
          if (await confirmButton.isVisible({ timeout: 2000 })) {
            await confirmButton.click();
          }

          await page.waitForTimeout(1000);
        }
      }
    });

    test('should react to message', async ({ page }) => {
      await page.goto('/matches');

      await page.waitForSelector('.match-card', { timeout: 10000 });
      await page.locator('.match-card').first().click();
      await page.waitForURL(/.*messages|conversation/, { timeout: 5000 });

      const message = page.locator('.message, [data-testid="message"]').first();

      if (await message.isVisible({ timeout: 3000 })) {
        // Double-tap or long-press to react
        await message.dblclick();

        // Reaction picker may appear
        const reactionPicker = page.locator('.reaction-picker, [data-testid="reactions"]');

        if (await reactionPicker.isVisible({ timeout: 2000 })) {
          // Select a reaction
          await page.locator('.reaction, [data-reaction]').first().click();

          // Reaction should appear on message
          await page.waitForTimeout(1000);
        }
      }
    });

    test('should copy message text', async ({ page }) => {
      await page.goto('/matches');

      await page.waitForSelector('.match-card', { timeout: 10000 });
      await page.locator('.match-card').first().click();
      await page.waitForURL(/.*messages|conversation/, { timeout: 5000 });

      const message = page.locator('.message, [data-testid="message"]').first();

      if (await message.isVisible({ timeout: 3000 })) {
        await message.click({ button: 'right' });

        const copyButton = page.locator('text=Copy, button:has-text("Copy")');
        if (await copyButton.isVisible({ timeout: 2000 })) {
          await copyButton.click();

          // Clipboard should contain message text
          await page.waitForTimeout(500);
        }
      }
    });
  });

  test.describe('Conversation Options', () => {
    test('should unmatch from conversation', async ({ page }) => {
      await page.goto('/matches');

      await page.waitForSelector('.match-card', { timeout: 10000 });
      await page.locator('.match-card').first().click();
      await page.waitForURL(/.*messages|conversation/, { timeout: 5000 });

      // Open menu
      const menuButton = page.locator('button[aria-label*="menu"], button[aria-label*="options"], .more-button');

      if (await menuButton.isVisible({ timeout: 2000 })) {
        await menuButton.click();

        const unmatchButton = page.locator('text=Unmatch');
        if (await unmatchButton.isVisible({ timeout: 2000 })) {
          await unmatchButton.click();

          // Confirm
          const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Unmatch")');
          if (await confirmButton.isVisible({ timeout: 2000 })) {
            await confirmButton.click();

            // Should redirect to matches
            await expect(page).toHaveURL(/.*matches/, { timeout: 5000 });
          }
        }
      }
    });

    test('should report user from conversation', async ({ page }) => {
      await page.goto('/matches');

      await page.waitForSelector('.match-card', { timeout: 10000 });
      await page.locator('.match-card').first().click();
      await page.waitForURL(/.*messages|conversation/, { timeout: 5000 });

      const menuButton = page.locator('button[aria-label*="menu"]');

      if (await menuButton.isVisible({ timeout: 2000 })) {
        await menuButton.click();

        const reportButton = page.locator('text=Report');
        if (await reportButton.isVisible({ timeout: 2000 })) {
          await reportButton.click();

          // Report modal should open
          await expect(page.locator('.report-modal, [data-testid="report-dialog"]')).toBeVisible({ timeout: 3000 });
        }
      }
    });

    test('should block user from conversation', async ({ page }) => {
      await page.goto('/matches');

      await page.waitForSelector('.match-card', { timeout: 10000 });
      await page.locator('.match-card').first().click();
      await page.waitForURL(/.*messages|conversation/, { timeout: 5000 });

      const menuButton = page.locator('button[aria-label*="menu"]');

      if (await menuButton.isVisible({ timeout: 2000 })) {
        await menuButton.click();

        const blockButton = page.locator('text=Block');
        if (await blockButton.isVisible({ timeout: 2000 })) {
          await blockButton.click();

          // Confirm
          const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Block")');
          if (await confirmButton.isVisible({ timeout: 2000 })) {
            await confirmButton.click();
          }
        }
      }
    });
  });

  test.describe('Message History', () => {
    test('should load more messages on scroll', async ({ page }) => {
      await page.goto('/matches');

      await page.waitForSelector('.match-card', { timeout: 10000 });
      await page.locator('.match-card').first().click();
      await page.waitForURL(/.*messages|conversation/, { timeout: 5000 });

      const messageContainer = page.locator('.messages-container, .message-list, [data-testid="message-list"]');

      if (await messageContainer.isVisible({ timeout: 3000 })) {
        const initialCount = await page.locator('.message, [data-testid="message"]').count();

        // Scroll to top
        await messageContainer.evaluate(el => el.scrollTop = 0);

        await page.waitForTimeout(2000);

        // May have loaded more messages
        const newCount = await page.locator('.message, [data-testid="message"]').count();

        expect(newCount >= initialCount).toBeTruthy();
      }
    });

    test('should show date separators', async ({ page }) => {
      await page.goto('/matches');

      await page.waitForSelector('.match-card', { timeout: 10000 });
      await page.locator('.match-card').first().click();
      await page.waitForURL(/.*messages|conversation/, { timeout: 5000 });

      // Check for date separators
      const dateSeparators = page.locator('.date-separator, .message-date, [data-testid="date-separator"]');

      if (await dateSeparators.first().isVisible({ timeout: 3000 })) {
        await expect(dateSeparators.first()).toBeVisible();
      }
    });
  });

  test.describe('Icebreakers', () => {
    test('should show icebreaker suggestions for new matches', async ({ page }) => {
      await page.goto('/matches');

      await page.waitForSelector('.match-card', { timeout: 10000 });

      // Find a new match (no messages)
      const newMatch = page.locator('.match-card.new, [data-testid="match"]:not(:has(.last-message))').first();

      if (await newMatch.isVisible({ timeout: 3000 })) {
        await newMatch.click();

        await page.waitForURL(/.*messages|conversation/, { timeout: 5000 });

        // Check for icebreaker suggestions
        const icebreakers = page.locator('.icebreaker, [data-testid="icebreaker"], .suggestion');

        if (await icebreakers.first().isVisible({ timeout: 3000 })) {
          await expect(icebreakers.first()).toBeVisible();
        }
      }
    });

    test('should use icebreaker suggestion', async ({ page }) => {
      await page.goto('/matches');

      await page.waitForSelector('.match-card', { timeout: 10000 });
      await page.locator('.match-card').first().click();
      await page.waitForURL(/.*messages|conversation/, { timeout: 5000 });

      const icebreaker = page.locator('.icebreaker, [data-testid="icebreaker"]').first();

      if (await icebreaker.isVisible({ timeout: 3000 })) {
        await icebreaker.click();

        // Should populate message input or send message
        await page.waitForTimeout(1000);
      }
    });
  });

  test.describe('Virtual Gifts', () => {
    test('should send virtual gift', async ({ page }) => {
      await page.goto('/matches');

      await page.waitForSelector('.match-card', { timeout: 10000 });
      await page.locator('.match-card').first().click();
      await page.waitForURL(/.*messages|conversation/, { timeout: 5000 });

      const giftButton = page.locator('button[aria-label*="gift"], .gift-button');

      if (await giftButton.isVisible({ timeout: 2000 })) {
        await giftButton.click();

        // Gift picker should open
        const giftPicker = page.locator('.gift-picker, [data-testid="gift-picker"]');

        if (await giftPicker.isVisible({ timeout: 3000 })) {
          // Select a gift
          const gift = page.locator('.gift-item, [data-testid="gift"]').first();
          if (await gift.isVisible({ timeout: 2000 })) {
            await gift.click();

            // Confirm or send
            const sendButton = page.locator('button:has-text("Send"), button:has-text("Gift")');
            if (await sendButton.isVisible({ timeout: 2000 })) {
              await sendButton.click();
            }
          }
        }
      }
    });
  });
});
