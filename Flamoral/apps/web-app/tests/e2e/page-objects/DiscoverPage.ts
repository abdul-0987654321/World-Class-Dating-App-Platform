import { Page, Locator, expect } from '@playwright/test';

export class DiscoverPage {
  readonly page: Page;
  readonly profileCard: Locator;
  readonly likeButton: Locator;
  readonly dislikeButton: Locator;
  readonly superLikeButton: Locator;
  readonly rewindButton: Locator;
  readonly boostButton: Locator;
  readonly filterButton: Locator;
  readonly noMoreProfilesMessage: Locator;
  readonly matchModal: Locator;
  readonly profileName: Locator;
  readonly profileAge: Locator;
  readonly profileDistance: Locator;
  readonly profilePhotos: Locator;
  readonly expandProfileButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.profileCard = page.getByTestId('profile-card');
    this.likeButton = page.getByTestId('like-button');
    this.dislikeButton = page.getByTestId('dislike-button');
    this.superLikeButton = page.getByTestId('superlike-button');
    this.rewindButton = page.getByTestId('rewind-button');
    this.boostButton = page.getByTestId('boost-button');
    this.filterButton = page.getByTestId('filter-button');
    this.noMoreProfilesMessage = page.getByTestId('no-more-profiles');
    this.matchModal = page.getByTestId('match-modal');
    this.profileName = page.getByTestId('profile-name');
    this.profileAge = page.getByTestId('profile-age');
    this.profileDistance = page.getByTestId('profile-distance');
    this.profilePhotos = page.getByTestId('profile-photo');
    this.expandProfileButton = page.getByTestId('expand-profile');
  }

  async goto() {
    await this.page.goto('/discover');
    await expect(this.page).toHaveURL(/.*discover/);
  }

  async waitForProfileToLoad() {
    await expect(this.profileCard.first()).toBeVisible({ timeout: 10000 });
  }

  async swipeRight() {
    await this.likeButton.click();
    await this.page.waitForTimeout(500); // Animation delay
  }

  async swipeLeft() {
    await this.dislikeButton.click();
    await this.page.waitForTimeout(500);
  }

  async superLike() {
    await this.superLikeButton.click();
    await this.page.waitForTimeout(500);
  }

  async rewind() {
    await this.rewindButton.click();
  }

  async openFilters() {
    await this.filterButton.click();
  }

  async boost() {
    await this.boostButton.click();
  }

  async expandProfile() {
    await this.expandProfileButton.click();
  }

  async getProfileInfo() {
    const name = await this.profileName.textContent();
    const age = await this.profileAge.textContent();
    const distance = await this.profileDistance.textContent();
    return { name, age, distance };
  }

  async closeMatchModal() {
    if (await this.matchModal.isVisible()) {
      await this.page.getByTestId('close-match-modal').click();
    }
  }

  async sendMessageFromMatch(message: string) {
    if (await this.matchModal.isVisible()) {
      await this.page.getByTestId('match-message-input').fill(message);
      await this.page.getByTestId('match-send-message').click();
    }
  }

  async expectMatchModalVisible() {
    await expect(this.matchModal).toBeVisible({ timeout: 5000 });
  }

  async isLoaded() {
    await expect(this.likeButton).toBeVisible();
    await expect(this.dislikeButton).toBeVisible();
  }
}
