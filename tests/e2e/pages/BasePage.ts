/**
 * Base Page Object
 * Common helpers and wait strategies
 */

import { Page, Locator } from '@playwright/test';

export class BasePage {
  readonly page: Page;
  readonly loadingSpinner: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loadingSpinner = page.locator('[data-testid="loading"], .loading, .spinner');
    this.errorMessage = page.locator('[data-testid="error-message"], .error, [role="alert"]');
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('networkidle');
  }

  async waitForLoadingComplete(): Promise<void> {
    try {
      await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    } catch {
      // Loading spinner may not exist, continue
    }
  }

  async safeClick(locator: Locator): Promise<void> {
    await locator.waitFor({ state: 'visible' });
    await locator.click();
  }

  async safeFill(locator: Locator, value: string): Promise<void> {
    await locator.waitFor({ state: 'visible' });
    await locator.clear();
    await locator.fill(value);
  }

  async isMobileViewport(): Promise<boolean> {
    const viewport = this.page.viewportSize();
    return viewport ? viewport.width < 768 : false;
  }

  async scrollToElement(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
  }

  async waitForToast(): Promise<Locator> {
    const toast = this.page.locator('[data-testid="toast"], .toast, [role="status"]');
    await toast.waitFor({ state: 'visible', timeout: 5000 });
    return toast;
  }

  async closeModal(): Promise<void> {
    const closeButton = this.page.locator('[data-testid="modal-close"], .modal-close, [aria-label="Close"]');
    if (await closeButton.count() > 0) {
      await closeButton.first().click();
    }
  }
}
