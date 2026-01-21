/**
 * MessagesPage - Page object for messaging functionality
 *
 * Uses data-testid selectors for stability:
 * - conversation-list: List of all conversations
 * - conversation-item: Individual conversation preview
 * - message-list: Container for messages in chat
 * - message-item: Individual message bubble
 * - message-input: Text input for composing messages
 * - send-message-button: Button to send message
 * - search-conversations: Search input for conversations
 * - empty-messages: Empty state when no messages
 * - typing-indicator: Shows when other user is typing
 * - read-receipt: Message read indicator
 * - attachment-button: Add media attachment
 * - gif-button: Add GIF button
 * - icebreakers-button: Suggested messages
 * - video-call-button: Start video call
 * - unmatch-button: Unmatch user
 * - report-button: Report user
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage, DEFAULT_TIMEOUTS } from './BasePage';

export interface MessageInfo {
  text: string | null;
  timestamp?: string | null;
  isSent: boolean;
  isRead?: boolean;
}

export interface ConversationInfo {
  name: string | null;
  lastMessage: string | null;
  unread?: boolean;
  timestamp?: string | null;
}

export class MessagesPage extends BasePage {
  // Conversation list elements
  readonly conversationList: Locator;
  readonly conversationItem: Locator;
  readonly conversationName: Locator;
  readonly conversationPreview: Locator;
  readonly conversationAvatar: Locator;
  readonly unreadBadge: Locator;
  readonly searchConversations: Locator;
  readonly emptyMessages: Locator;
  readonly newMatchesList: Locator;
  readonly newMatchItem: Locator;

  // Chat view elements
  readonly chatContainer: Locator;
  readonly chatHeader: Locator;
  readonly chatUserName: Locator;
  readonly chatUserAvatar: Locator;
  readonly messageList: Locator;
  readonly messageItem: Locator;
  readonly sentMessage: Locator;
  readonly receivedMessage: Locator;
  readonly messageInput: Locator;
  readonly sendButton: Locator;
  readonly typingIndicator: Locator;
  readonly readReceipt: Locator;
  readonly messageTimestamp: Locator;

  // Chat actions
  readonly attachmentButton: Locator;
  readonly gifButton: Locator;
  readonly gifSearch: Locator;
  readonly gifResult: Locator;
  readonly icebreakersButton: Locator;
  readonly icebreakerOption: Locator;
  readonly videoCallButton: Locator;
  readonly voiceCallButton: Locator;
  readonly chatMenuButton: Locator;

  // Moderation actions
  readonly unmatchButton: Locator;
  readonly confirmUnmatchButton: Locator;
  readonly reportButton: Locator;
  readonly reportReasonOption: Locator;
  readonly reportDetailsInput: Locator;
  readonly submitReportButton: Locator;
  readonly blockButton: Locator;

  // Video call elements
  readonly incomingCallModal: Locator;
  readonly acceptCallButton: Locator;
  readonly declineCallButton: Locator;
  readonly endCallButton: Locator;
  readonly localVideo: Locator;
  readonly remoteVideo: Locator;
  readonly muteButton: Locator;
  readonly cameraToggleButton: Locator;

  constructor(page: Page) {
    super(page);

    // Conversation list
    this.conversationList = page.locator('[data-testid="conversation-list"]').or(page.locator('.conversation-list, .messages-list'));
    this.conversationItem = page.locator('[data-testid="conversation-item"]').or(page.locator('.conversation-item, .chat-preview'));
    this.conversationName = page.locator('[data-testid="conversation-name"]').or(this.conversationItem.locator('.user-name, h3, h4'));
    this.conversationPreview = page.locator('[data-testid="conversation-preview"]').or(this.conversationItem.locator('.preview-text, .last-message'));
    this.conversationAvatar = page.locator('[data-testid="conversation-avatar"]').or(this.conversationItem.locator('img, .avatar'));
    this.unreadBadge = page.locator('[data-testid="unread-badge"]').or(page.locator('.unread-badge, .unread-count'));
    this.searchConversations = page.locator('[data-testid="search-conversations"]').or(page.locator('input[placeholder*="search" i]'));
    this.emptyMessages = page.locator('[data-testid="empty-messages"]').or(page.locator('.empty-messages, .no-messages'));
    this.newMatchesList = page.locator('[data-testid="new-matches-list"]').or(page.locator('.new-matches, .matches-carousel'));
    this.newMatchItem = page.locator('[data-testid="new-match-item"]').or(this.newMatchesList.locator('.match-item, .new-match'));

    // Chat view
    this.chatContainer = page.locator('[data-testid="chat-container"]').or(page.locator('.chat-container, .conversation-view'));
    this.chatHeader = page.locator('[data-testid="chat-header"]').or(page.locator('.chat-header'));
    this.chatUserName = page.locator('[data-testid="chat-user-name"]').or(this.chatHeader.locator('.user-name, h2'));
    this.chatUserAvatar = page.locator('[data-testid="chat-user-avatar"]').or(this.chatHeader.locator('img, .avatar'));
    this.messageList = page.locator('[data-testid="message-list"]').or(page.locator('.message-list, .messages-container'));
    this.messageItem = page.locator('[data-testid="message-item"]').or(page.locator('.message-item, .message-bubble'));
    this.sentMessage = page.locator('[data-testid="sent-message"]').or(page.locator('.sent-message, .message-sent, .my-message'));
    this.receivedMessage = page.locator('[data-testid="received-message"]').or(page.locator('.received-message, .message-received, .their-message'));
    this.messageInput = page.locator('[data-testid="message-input"]').or(page.locator('textarea[name="message"], input[name="message"], .message-input'));
    this.sendButton = page.locator('[data-testid="send-message-button"]').or(page.locator('button[aria-label*="send" i], button:has-text("Send")'));
    this.typingIndicator = page.locator('[data-testid="typing-indicator"]').or(page.locator('.typing-indicator, .is-typing'));
    this.readReceipt = page.locator('[data-testid="read-receipt"]').or(page.locator('.read-receipt, .message-status'));
    this.messageTimestamp = page.locator('[data-testid="message-timestamp"]').or(page.locator('.message-time, .timestamp'));

    // Chat actions
    this.attachmentButton = page.locator('[data-testid="attachment-button"]').or(page.locator('button[aria-label*="attachment" i], button[aria-label*="photo" i]'));
    this.gifButton = page.locator('[data-testid="gif-button"]').or(page.locator('button[aria-label*="gif" i], button:has-text("GIF")'));
    this.gifSearch = page.locator('[data-testid="gif-search"]').or(page.locator('.gif-search input, input[placeholder*="gif" i]'));
    this.gifResult = page.locator('[data-testid="gif-result"]').or(page.locator('.gif-result, .gif-item'));
    this.icebreakersButton = page.locator('[data-testid="icebreakers-button"]').or(page.locator('button[aria-label*="icebreaker" i], button:has-text("Icebreaker")'));
    this.icebreakerOption = page.locator('[data-testid="icebreaker-option"]').or(page.locator('.icebreaker-option, .suggested-message'));
    this.videoCallButton = page.locator('[data-testid="video-call-button"]').or(page.locator('button[aria-label*="video" i]'));
    this.voiceCallButton = page.locator('[data-testid="voice-call-button"]').or(page.locator('button[aria-label*="call" i]:not([aria-label*="video"])'));
    this.chatMenuButton = page.locator('[data-testid="chat-menu-button"]').or(page.locator('button[aria-label*="menu" i], button[aria-label*="more" i]'));

    // Moderation
    this.unmatchButton = page.locator('[data-testid="unmatch-button"]').or(page.locator('button:has-text("Unmatch")'));
    this.confirmUnmatchButton = page.locator('[data-testid="confirm-unmatch"]').or(page.locator('.confirm-unmatch, button:has-text("Yes, Unmatch")'));
    this.reportButton = page.locator('[data-testid="report-button"]').or(page.locator('button:has-text("Report")'));
    this.reportReasonOption = page.locator('[data-testid^="report-reason-"]').or(page.locator('.report-reason, input[name="reportReason"]'));
    this.reportDetailsInput = page.locator('[data-testid="report-details"]').or(page.locator('textarea[name="reportDetails"]'));
    this.submitReportButton = page.locator('[data-testid="submit-report"]').or(page.locator('button:has-text("Submit Report")'));
    this.blockButton = page.locator('[data-testid="block-button"]').or(page.locator('button:has-text("Block")'));

    // Video call
    this.incomingCallModal = page.locator('[data-testid="incoming-call-modal"]').or(page.locator('.incoming-call-modal'));
    this.acceptCallButton = page.locator('[data-testid="accept-call"]').or(page.locator('button:has-text("Accept"), button[aria-label*="accept" i]'));
    this.declineCallButton = page.locator('[data-testid="decline-call"]').or(page.locator('button:has-text("Decline"), button[aria-label*="decline" i]'));
    this.endCallButton = page.locator('[data-testid="end-call"]').or(page.locator('button[aria-label*="end" i], .end-call-button'));
    this.localVideo = page.locator('[data-testid="local-video"]').or(page.locator('video.local-video, .self-video'));
    this.remoteVideo = page.locator('[data-testid="remote-video"]').or(page.locator('video.remote-video, .peer-video'));
    this.muteButton = page.locator('[data-testid="mute-button"]').or(page.locator('button[aria-label*="mute" i]'));
    this.cameraToggleButton = page.locator('[data-testid="camera-toggle"]').or(page.locator('button[aria-label*="camera" i]'));
  }

  /**
   * Navigate to messages page
   */
  async goto(): Promise<void> {
    await this.page.goto('/messages');
    await this.waitForPageLoad();
    await expect(this.page).toHaveURL(/.*messages/);
  }

  /**
   * Check if messages page is loaded
   */
  async isLoaded(): Promise<boolean> {
    try {
      await Promise.race([
        this.conversationList.waitFor({ state: 'visible', timeout: DEFAULT_TIMEOUTS.medium }),
        this.emptyMessages.waitFor({ state: 'visible', timeout: DEFAULT_TIMEOUTS.medium }),
      ]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if there are any conversations
   */
  async hasConversations(): Promise<boolean> {
    return await this.conversationItem.first().isVisible().catch(() => false);
  }

  /**
   * Get count of conversations
   */
  async getConversationCount(): Promise<number> {
    return await this.conversationItem.count();
  }

  /**
   * Get count of unread conversations
   */
  async getUnreadCount(): Promise<number> {
    return await this.unreadBadge.count();
  }

  /**
   * Select conversation by index
   */
  async selectConversation(index: number = 0): Promise<void> {
    await this.safeClick(this.conversationItem.nth(index));
    await this.waitForChatToLoad();
  }

  /**
   * Select conversation by user name
   */
  async selectConversationByName(name: string): Promise<void> {
    const conversation = this.conversationItem.filter({ hasText: name });
    await this.safeClick(conversation.first());
    await this.waitForChatToLoad();
  }

  /**
   * Wait for chat view to load
   */
  async waitForChatToLoad(): Promise<void> {
    await expect(this.chatContainer).toBeVisible({ timeout: DEFAULT_TIMEOUTS.medium });
    await expect(this.messageInput).toBeVisible({ timeout: DEFAULT_TIMEOUTS.short });
  }

  /**
   * Search for conversations
   */
  async searchConversation(query: string): Promise<void> {
    await this.safeFill(this.searchConversations, query);
    await this.waitForLoadingComplete();
  }

  /**
   * Clear search
   */
  async clearSearch(): Promise<void> {
    await this.searchConversations.clear();
    await this.waitForLoadingComplete();
  }

  /**
   * Send a text message
   */
  async sendMessage(message: string): Promise<void> {
    await this.safeFill(this.messageInput, message);
    await this.safeClick(this.sendButton);
    await this.waitForAnimation();
  }

  /**
   * Get count of messages in current chat
   */
  async getMessageCount(): Promise<number> {
    return await this.messageItem.count();
  }

  /**
   * Get the last message text
   */
  async getLastMessage(): Promise<string | null> {
    return await this.messageItem.last().textContent();
  }

  /**
   * Get the last sent message text
   */
  async getLastSentMessage(): Promise<string | null> {
    return await this.sentMessage.last().textContent();
  }

  /**
   * Wait for a new message to arrive
   */
  async waitForNewMessage(timeout: number = DEFAULT_TIMEOUTS.medium): Promise<void> {
    const currentCount = await this.getMessageCount();

    await expect(async () => {
      const newCount = await this.getMessageCount();
      expect(newCount).toBeGreaterThan(currentCount);
    }).toPass({ timeout });
  }

  /**
   * Check if typing indicator is visible
   */
  async isTyping(): Promise<boolean> {
    return await this.typingIndicator.isVisible().catch(() => false);
  }

  /**
   * Wait for typing indicator
   */
  async waitForTypingIndicator(timeout: number = DEFAULT_TIMEOUTS.short): Promise<void> {
    await this.typingIndicator.waitFor({ state: 'visible', timeout });
  }

  /**
   * Check if last sent message has read receipt
   */
  async hasReadReceipt(): Promise<boolean> {
    return await this.readReceipt.isVisible().catch(() => false);
  }

  /**
   * Open GIF picker
   */
  async openGifPicker(): Promise<void> {
    await this.safeClick(this.gifButton);
    await expect(this.gifSearch).toBeVisible({ timeout: DEFAULT_TIMEOUTS.short });
  }

  /**
   * Send a GIF
   */
  async sendGif(searchTerm: string): Promise<void> {
    await this.openGifPicker();
    await this.safeFill(this.gifSearch, searchTerm);
    await this.waitForLoadingComplete();
    await this.safeClick(this.gifResult.first());
    await this.waitForAnimation();
  }

  /**
   * Open icebreakers panel
   */
  async openIcebreakers(): Promise<void> {
    await this.safeClick(this.icebreakersButton);
    await expect(this.icebreakerOption.first()).toBeVisible({ timeout: DEFAULT_TIMEOUTS.short });
  }

  /**
   * Send an icebreaker message
   */
  async sendIcebreaker(index: number = 0): Promise<void> {
    await this.openIcebreakers();
    await this.safeClick(this.icebreakerOption.nth(index));
    await this.waitForAnimation();
  }

  /**
   * Start a video call
   */
  async initiateVideoCall(): Promise<void> {
    await this.safeClick(this.videoCallButton);
  }

  /**
   * Accept incoming video call
   */
  async acceptCall(): Promise<void> {
    await expect(this.incomingCallModal).toBeVisible({ timeout: DEFAULT_TIMEOUTS.medium });
    await this.safeClick(this.acceptCallButton);
  }

  /**
   * Decline incoming video call
   */
  async declineCall(): Promise<void> {
    await expect(this.incomingCallModal).toBeVisible({ timeout: DEFAULT_TIMEOUTS.short });
    await this.safeClick(this.declineCallButton);
  }

  /**
   * End current call
   */
  async endCall(): Promise<void> {
    await this.safeClick(this.endCallButton);
  }

  /**
   * Check if in active call
   */
  async isInCall(): Promise<boolean> {
    return (
      await this.localVideo.isVisible().catch(() => false) &&
      await this.remoteVideo.isVisible().catch(() => false)
    );
  }

  /**
   * Toggle mute in call
   */
  async toggleMute(): Promise<void> {
    await this.safeClick(this.muteButton);
  }

  /**
   * Toggle camera in call
   */
  async toggleCamera(): Promise<void> {
    await this.safeClick(this.cameraToggleButton);
  }

  /**
   * Open chat menu
   */
  async openChatMenu(): Promise<void> {
    await this.safeClick(this.chatMenuButton);
    await this.waitForAnimation();
  }

  /**
   * Unmatch with current user
   */
  async unmatch(): Promise<void> {
    await this.openChatMenu();
    await this.safeClick(this.unmatchButton);
    await expect(this.confirmUnmatchButton).toBeVisible({ timeout: DEFAULT_TIMEOUTS.short });
    await this.safeClick(this.confirmUnmatchButton);
    await this.waitForPageLoad();
  }

  /**
   * Report current user
   */
  async reportUser(reason: string, details?: string): Promise<void> {
    await this.openChatMenu();
    await this.safeClick(this.reportButton);

    // Select report reason
    const reasonOption = this.page.locator(`[data-testid="report-reason-${reason}"]`).or(
      this.page.locator(`input[value="${reason}"], label:has-text("${reason}")`)
    );
    await this.safeClick(reasonOption.first());

    // Add details if provided
    if (details) {
      await this.safeFill(this.reportDetailsInput, details);
    }

    await this.safeClick(this.submitReportButton);
    await this.waitForAnimation();
  }

  /**
   * Block current user
   */
  async blockUser(): Promise<void> {
    await this.openChatMenu();
    await this.safeClick(this.blockButton);
    // Confirm if needed
    const confirmButton = this.page.locator('button:has-text("Confirm"), button:has-text("Yes")');
    if (await confirmButton.isVisible({ timeout: 1000 })) {
      await this.safeClick(confirmButton);
    }
    await this.waitForPageLoad();
  }

  /**
   * Select a new match from the matches list
   */
  async selectNewMatch(index: number = 0): Promise<void> {
    await this.safeClick(this.newMatchItem.nth(index));
    await this.waitForChatToLoad();
  }

  /**
   * Get conversation list info
   */
  async getConversationsList(): Promise<ConversationInfo[]> {
    const conversations: ConversationInfo[] = [];
    const count = await this.conversationItem.count();

    for (let i = 0; i < count; i++) {
      const item = this.conversationItem.nth(i);
      conversations.push({
        name: await item.locator('.user-name, h3, h4').textContent().catch(() => null),
        lastMessage: await item.locator('.preview-text, .last-message').textContent().catch(() => null),
        unread: await item.locator('.unread-badge').isVisible().catch(() => false),
      });
    }

    return conversations;
  }

  /**
   * Go back to conversation list
   */
  async goBackToList(): Promise<void> {
    await this.goBack();
    await expect(this.conversationList).toBeVisible({ timeout: DEFAULT_TIMEOUTS.short });
  }

  /**
   * Assert chat is ready for messaging
   */
  async assertChatReady(): Promise<void> {
    await expect(this.chatContainer).toBeVisible();
    await expect(this.messageInput).toBeVisible();
    await expect(this.messageInput).toBeEnabled();
    await expect(this.sendButton).toBeVisible();
  }
}
