import { Page, Locator, expect } from '@playwright/test';

export class MessagesPage {
  readonly page: Page;
  readonly conversationList: Locator;
  readonly conversationItem: Locator;
  readonly messageInput: Locator;
  readonly sendButton: Locator;
  readonly messageList: Locator;
  readonly messageItem: Locator;
  readonly searchInput: Locator;
  readonly emptyState: Locator;
  readonly typingIndicator: Locator;
  readonly readReceipt: Locator;
  readonly attachmentButton: Locator;
  readonly gifButton: Locator;
  readonly icebreakersButton: Locator;
  readonly videoCallButton: Locator;
  readonly unmatchButton: Locator;
  readonly reportButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.conversationList = page.getByTestId('conversation-list');
    this.conversationItem = page.getByTestId('conversation-item');
    this.messageInput = page.getByTestId('message-input');
    this.sendButton = page.getByTestId('send-message-button');
    this.messageList = page.getByTestId('message-list');
    this.messageItem = page.getByTestId('message-item');
    this.searchInput = page.getByTestId('search-conversations');
    this.emptyState = page.getByTestId('empty-messages');
    this.typingIndicator = page.getByTestId('typing-indicator');
    this.readReceipt = page.getByTestId('read-receipt');
    this.attachmentButton = page.getByTestId('attachment-button');
    this.gifButton = page.getByTestId('gif-button');
    this.icebreakersButton = page.getByTestId('icebreakers-button');
    this.videoCallButton = page.getByTestId('video-call-button');
    this.unmatchButton = page.getByTestId('unmatch-button');
    this.reportButton = page.getByTestId('report-button');
  }

  async goto() {
    await this.page.goto('/messages');
    await expect(this.page).toHaveURL(/.*messages/);
  }

  async selectConversation(index: number = 0) {
    await this.conversationItem.nth(index).click();
  }

  async selectConversationByName(name: string) {
    await this.conversationItem.filter({ hasText: name }).click();
  }

  async sendMessage(message: string) {
    await this.messageInput.fill(message);
    await this.sendButton.click();
  }

  async searchConversations(query: string) {
    await this.searchInput.fill(query);
  }

  async getMessageCount() {
    return await this.messageItem.count();
  }

  async getLastMessage() {
    return await this.messageItem.last().textContent();
  }

  async waitForNewMessage() {
    const currentCount = await this.getMessageCount();
    await expect(async () => {
      const newCount = await this.getMessageCount();
      expect(newCount).toBeGreaterThan(currentCount);
    }).toPass({ timeout: 10000 });
  }

  async expectTypingIndicator() {
    await expect(this.typingIndicator).toBeVisible();
  }

  async expectReadReceipt() {
    await expect(this.readReceipt).toBeVisible();
  }

  async openIcebreakers() {
    await this.icebreakersButton.click();
  }

  async sendGif(searchTerm: string) {
    await this.gifButton.click();
    await this.page.getByTestId('gif-search').fill(searchTerm);
    await this.page.getByTestId('gif-result').first().click();
  }

  async initiateVideoCall() {
    await this.videoCallButton.click();
  }

  async unmatch() {
    await this.unmatchButton.click();
    await this.page.getByTestId('confirm-unmatch').click();
  }

  async reportUser(reason: string) {
    await this.reportButton.click();
    await this.page.getByTestId(`report-reason-${reason}`).click();
    await this.page.getByTestId('submit-report').click();
  }

  async isLoaded() {
    await expect(this.conversationList).toBeVisible();
  }
}
