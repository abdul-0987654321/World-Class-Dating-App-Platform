/**
 * Discovery Page Object
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class DiscoveryPage extends BasePage {
  readonly profileCard: Locator;
  readonly likeButton: Locator;
  readonly passButton: Locator;
  readonly superLikeButton: Locator;
  readonly rewindButton: Locator;
  readonly boostButton: Locator;
  readonly filtersButton: Locator;
  readonly noMoreProfiles: Locator;
  readonly matchPopup: Locator;

  constructor(page: Page) {
    super(page);
    this.profileCard = page.locator('[data-testid="profile-card"], .profile-card, .swipe-card').first();
    this.likeButton = page.locator('[data-testid="like-button"], [aria-label*="like"], button:has-text("Like")').first();
    this.passButton = page.locator('[data-testid="pass-button"], [aria-label*="pass"], button:has-text("Pass")').first();
    this.superLikeButton = page.locator('[data-testid="super-like-button"], [aria-label*="super"]').first();
    this.rewindButton = page.locator('[data-testid="rewind-button"], [aria-label*="rewind"]').first();
    this.boostButton = page.locator('[data-testid="boost-button"], [aria-label*="boost"]').first();
    this.filtersButton = page.locator('[data-testid="filters-button"], [aria-label*="filter"]').first();
    this.noMoreProfiles = page.locator('[data-testid="no-profiles"], text=/no more|out of/i').first();
    this.matchPopup = page.locator('[data-testid="match-popup"], .match-popup, text=/match/i').first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/discovery');
    await this.waitForPageLoad();
  }

  async like(): Promise<void> {
    await this.safeClick(this.likeButton);
    await this.waitForLoadingComplete();
  }

  async pass(): Promise<void> {
    await this.safeClick(this.passButton);
    await this.waitForLoadingComplete();
  }

  async superLike(): Promise<void> {
    await this.safeClick(this.superLikeButton);
    await this.waitForLoadingComplete();
  }

  async hasProfiles(): Promise<boolean> {
    const hasCard = await this.profileCard.count() > 0;
    const noMore = await this.noMoreProfiles.count() > 0;
    return hasCard && !noMore;
  }

  async openFilters(): Promise<void> {
    await this.safeClick(this.filtersButton);
  }

  async closeMatchPopup(): Promise<void> {
    if (await this.matchPopup.isVisible()) {
      await this.closeModal();
    }
  }
}
