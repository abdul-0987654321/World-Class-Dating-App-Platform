import { by, device, element, expect } from 'detox';

describe('Messaging Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    // Login with test user
    await element(by.id('login-button')).tap();
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('TestPassword123!');
    await element(by.id('submit-login')).tap();
    await waitFor(element(by.id('main-tabs'))).toBeVisible().withTimeout(5000);
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    // Navigate to messages tab
    await element(by.id('messages-tab')).tap();
  });

  describe('Conversations List', () => {
    it('should show messages screen', async () => {
      await expect(element(by.id('messages-screen'))).toBeVisible();
    });

    it('should show list of conversations', async () => {
      await expect(element(by.id('conversations-list'))).toBeVisible();
    });

    it('should show match previews section', async () => {
      await expect(element(by.id('new-matches-section'))).toBeVisible();
    });

    it('should show conversation preview with user info', async () => {
      await expect(element(by.id('conversation-item-0'))).toBeVisible();
      await expect(element(by.id('conversation-avatar-0'))).toBeVisible();
      await expect(element(by.id('conversation-name-0'))).toBeVisible();
      await expect(element(by.id('conversation-preview-0'))).toBeVisible();
    });

    it('should show unread indicator for unread messages', async () => {
      // Assuming there are unread messages in test data
      await expect(element(by.id('unread-indicator'))).toExist();
    });
  });

  describe('Opening Conversation', () => {
    it('should open chat when tapping conversation', async () => {
      await element(by.id('conversation-item-0')).tap();
      await expect(element(by.id('chat-screen'))).toBeVisible();
    });

    it('should show chat header with user info', async () => {
      await element(by.id('conversation-item-0')).tap();
      await expect(element(by.id('chat-header'))).toBeVisible();
      await expect(element(by.id('chat-user-name'))).toBeVisible();
    });

    it('should show message history', async () => {
      await element(by.id('conversation-item-0')).tap();
      await expect(element(by.id('messages-list'))).toBeVisible();
    });

    it('should show message input field', async () => {
      await element(by.id('conversation-item-0')).tap();
      await expect(element(by.id('message-input'))).toBeVisible();
      await expect(element(by.id('send-button'))).toBeVisible();
    });
  });

  describe('Sending Messages', () => {
    beforeEach(async () => {
      await element(by.id('conversation-item-0')).tap();
    });

    it('should send a text message', async () => {
      const testMessage = `Test message ${Date.now()}`;
      await element(by.id('message-input')).typeText(testMessage);
      await element(by.id('send-button')).tap();
      await expect(element(by.text(testMessage))).toBeVisible();
    });

    it('should show sending indicator', async () => {
      await element(by.id('message-input')).typeText('Hello!');
      await element(by.id('send-button')).tap();
      // Brief sending indicator should appear
      await expect(element(by.id('sending-indicator'))).toExist();
    });

    it('should show delivered checkmark', async () => {
      await element(by.id('message-input')).typeText('Test');
      await element(by.id('send-button')).tap();
      await waitFor(element(by.id('delivered-indicator'))).toBeVisible().withTimeout(3000);
    });

    it('should disable send button when input is empty', async () => {
      await expect(element(by.id('send-button'))).toHaveLabel('disabled');
    });
  });

  describe('Media Messages', () => {
    beforeEach(async () => {
      await element(by.id('conversation-item-0')).tap();
    });

    it('should show media options button', async () => {
      await expect(element(by.id('media-button'))).toBeVisible();
    });

    it('should open media picker', async () => {
      await element(by.id('media-button')).tap();
      await expect(element(by.id('media-options-modal'))).toBeVisible();
    });

    it('should show photo option', async () => {
      await element(by.id('media-button')).tap();
      await expect(element(by.id('send-photo-option'))).toBeVisible();
    });

    it('should show GIF option', async () => {
      await element(by.id('media-button')).tap();
      await expect(element(by.id('send-gif-option'))).toBeVisible();
    });
  });

  describe('Chat Actions', () => {
    beforeEach(async () => {
      await element(by.id('conversation-item-0')).tap();
    });

    it('should open user profile from chat header', async () => {
      await element(by.id('chat-user-avatar')).tap();
      await expect(element(by.id('user-profile-modal'))).toBeVisible();
    });

    it('should show chat menu options', async () => {
      await element(by.id('chat-menu-button')).tap();
      await expect(element(by.id('chat-menu'))).toBeVisible();
    });

    it('should have unmatch option', async () => {
      await element(by.id('chat-menu-button')).tap();
      await expect(element(by.id('unmatch-option'))).toBeVisible();
    });

    it('should have report option', async () => {
      await element(by.id('chat-menu-button')).tap();
      await expect(element(by.id('report-option'))).toBeVisible();
    });
  });

  describe('Message Interactions', () => {
    beforeEach(async () => {
      await element(by.id('conversation-item-0')).tap();
    });

    it('should show message options on long press', async () => {
      await element(by.id('message-item-0')).longPress();
      await expect(element(by.id('message-options-menu'))).toBeVisible();
    });

    it('should copy message to clipboard', async () => {
      await element(by.id('message-item-0')).longPress();
      await element(by.id('copy-message-option')).tap();
      // Toast should appear
      await expect(element(by.id('copied-toast'))).toBeVisible();
    });
  });

  describe('Pull to Refresh', () => {
    it('should refresh conversations on pull', async () => {
      await element(by.id('conversations-list')).swipe('down', 'slow', 0.5);
      await expect(element(by.id('refresh-indicator'))).toBeVisible();
      await waitFor(element(by.id('refresh-indicator'))).not.toBeVisible().withTimeout(5000);
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no matches', async () => {
      // For a user with no matches
      await expect(element(by.id('no-matches-empty-state'))).toBeVisible();
      await expect(element(by.id('start-swiping-button'))).toBeVisible();
    });

    it('should navigate to discovery from empty state', async () => {
      await element(by.id('start-swiping-button')).tap();
      await expect(element(by.id('discovery-screen'))).toBeVisible();
    });
  });

  describe('Navigation', () => {
    it('should go back to conversations list from chat', async () => {
      await element(by.id('conversation-item-0')).tap();
      await element(by.id('back-button')).tap();
      await expect(element(by.id('messages-screen'))).toBeVisible();
    });
  });
});
