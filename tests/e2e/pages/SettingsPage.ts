/**
 * SettingsPage - Page object for settings and preferences
 *
 * Uses data-testid selectors for stability:
 * - settings-container: Main settings container
 * - settings-section: Individual settings section
 * - account-settings: Account settings section
 * - notification-settings: Notification preferences
 * - privacy-settings: Privacy settings section
 * - discovery-settings: Discovery preferences
 * - subscription-settings: Subscription management
 * - delete-account-button: Delete account action
 * - logout-button: Logout action
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage, DEFAULT_TIMEOUTS } from './BasePage';

export interface NotificationPreferences {
  newMatches?: boolean;
  newMessages?: boolean;
  likes?: boolean;
  superLikes?: boolean;
  promotions?: boolean;
  email?: boolean;
  push?: boolean;
}

export interface DiscoveryPreferences {
  showMe?: 'men' | 'women' | 'everyone';
  ageMin?: number;
  ageMax?: number;
  distance?: number;
  distanceUnit?: 'km' | 'mi';
  globalMode?: boolean;
}

export interface PrivacySettings {
  showOnline?: boolean;
  showDistance?: boolean;
  readReceipts?: boolean;
  showAge?: boolean;
  hideProfile?: boolean;
}

export class SettingsPage extends BasePage {
  // Main containers
  readonly settingsContainer: Locator;
  readonly settingsSection: Locator;

  // Account settings
  readonly accountSection: Locator;
  readonly emailDisplay: Locator;
  readonly changeEmailButton: Locator;
  readonly emailInput: Locator;
  readonly changePasswordButton: Locator;
  readonly currentPasswordInput: Locator;
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly phoneNumber: Locator;
  readonly changePhoneButton: Locator;
  readonly linkedAccounts: Locator;
  readonly linkGoogleButton: Locator;
  readonly linkAppleButton: Locator;
  readonly unlinkButton: Locator;

  // Notification settings
  readonly notificationSection: Locator;
  readonly newMatchesToggle: Locator;
  readonly newMessagesToggle: Locator;
  readonly likesToggle: Locator;
  readonly superLikesToggle: Locator;
  readonly promotionsToggle: Locator;
  readonly emailNotificationsToggle: Locator;
  readonly pushNotificationsToggle: Locator;

  // Discovery settings
  readonly discoverySection: Locator;
  readonly showMeSelect: Locator;
  readonly ageRangeSlider: Locator;
  readonly ageMinInput: Locator;
  readonly ageMaxInput: Locator;
  readonly distanceSlider: Locator;
  readonly distanceInput: Locator;
  readonly distanceUnitSelect: Locator;
  readonly globalModeToggle: Locator;

  // Privacy settings
  readonly privacySection: Locator;
  readonly showOnlineToggle: Locator;
  readonly showDistanceToggle: Locator;
  readonly readReceiptsToggle: Locator;
  readonly showAgeToggle: Locator;
  readonly hideProfileToggle: Locator;
  readonly blockedUsersButton: Locator;
  readonly blockedUsersList: Locator;
  readonly unblockButton: Locator;

  // Subscription settings
  readonly subscriptionSection: Locator;
  readonly currentPlan: Locator;
  readonly subscriptionStatus: Locator;
  readonly renewalDate: Locator;
  readonly managePlanButton: Locator;
  readonly cancelSubscriptionButton: Locator;
  readonly restorePurchasesButton: Locator;
  readonly upgradeButton: Locator;

  // Data & Safety
  readonly dataSection: Locator;
  readonly downloadDataButton: Locator;
  readonly deleteAccountButton: Locator;
  readonly deleteConfirmInput: Locator;
  readonly confirmDeleteButton: Locator;
  readonly pauseAccountToggle: Locator;

  // Help & Support
  readonly helpSection: Locator;
  readonly helpCenterButton: Locator;
  readonly contactSupportButton: Locator;
  readonly faqButton: Locator;
  readonly termsOfServiceLink: Locator;
  readonly privacyPolicyLink: Locator;
  readonly communityGuidelinesLink: Locator;

  // App info
  readonly appVersion: Locator;
  readonly logoutButton: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    super(page);

    // Containers
    this.settingsContainer = page.locator('[data-testid="settings-container"]').or(page.locator('.settings-container, .settings-page'));
    this.settingsSection = page.locator('[data-testid="settings-section"]').or(page.locator('.settings-section'));

    // Account
    this.accountSection = page.locator('[data-testid="account-settings"]').or(page.locator('.account-settings, section:has-text("Account")'));
    this.emailDisplay = page.locator('[data-testid="email-display"]').or(this.accountSection.locator('.email, [data-field="email"]'));
    this.changeEmailButton = page.locator('[data-testid="change-email"]').or(page.locator('button:has-text("Change Email")'));
    this.emailInput = page.locator('[data-testid="email-input"]').or(page.locator('input[name="email"], input[type="email"]'));
    this.changePasswordButton = page.locator('[data-testid="change-password"]').or(page.locator('button:has-text("Change Password")'));
    this.currentPasswordInput = page.locator('[data-testid="current-password"]').or(page.locator('input[name="currentPassword"]'));
    this.newPasswordInput = page.locator('[data-testid="new-password"]').or(page.locator('input[name="newPassword"]'));
    this.confirmPasswordInput = page.locator('[data-testid="confirm-password"]').or(page.locator('input[name="confirmPassword"]'));
    this.phoneNumber = page.locator('[data-testid="phone-number"]').or(this.accountSection.locator('.phone, [data-field="phone"]'));
    this.changePhoneButton = page.locator('[data-testid="change-phone"]').or(page.locator('button:has-text("Change Phone")'));
    this.linkedAccounts = page.locator('[data-testid="linked-accounts"]').or(page.locator('.linked-accounts'));
    this.linkGoogleButton = page.locator('[data-testid="link-google"]').or(page.locator('button:has-text("Link Google")'));
    this.linkAppleButton = page.locator('[data-testid="link-apple"]').or(page.locator('button:has-text("Link Apple")'));
    this.unlinkButton = page.locator('[data-testid="unlink-account"]').or(page.locator('button:has-text("Unlink")'));

    // Notifications
    this.notificationSection = page.locator('[data-testid="notification-settings"]').or(page.locator('.notification-settings, section:has-text("Notification")'));
    this.newMatchesToggle = page.locator('[data-testid="toggle-new-matches"]').or(this.notificationSection.locator('[data-setting="newMatches"] input'));
    this.newMessagesToggle = page.locator('[data-testid="toggle-new-messages"]').or(this.notificationSection.locator('[data-setting="newMessages"] input'));
    this.likesToggle = page.locator('[data-testid="toggle-likes"]').or(this.notificationSection.locator('[data-setting="likes"] input'));
    this.superLikesToggle = page.locator('[data-testid="toggle-super-likes"]').or(this.notificationSection.locator('[data-setting="superLikes"] input'));
    this.promotionsToggle = page.locator('[data-testid="toggle-promotions"]').or(this.notificationSection.locator('[data-setting="promotions"] input'));
    this.emailNotificationsToggle = page.locator('[data-testid="toggle-email-notifications"]').or(this.notificationSection.locator('[data-setting="email"] input'));
    this.pushNotificationsToggle = page.locator('[data-testid="toggle-push-notifications"]').or(this.notificationSection.locator('[data-setting="push"] input'));

    // Discovery
    this.discoverySection = page.locator('[data-testid="discovery-settings"]').or(page.locator('.discovery-settings, section:has-text("Discovery")'));
    this.showMeSelect = page.locator('[data-testid="show-me-select"]').or(this.discoverySection.locator('select[name="showMe"]'));
    this.ageRangeSlider = page.locator('[data-testid="age-range-slider"]').or(this.discoverySection.locator('.age-slider'));
    this.ageMinInput = page.locator('[data-testid="age-min"]').or(this.discoverySection.locator('input[name="ageMin"]'));
    this.ageMaxInput = page.locator('[data-testid="age-max"]').or(this.discoverySection.locator('input[name="ageMax"]'));
    this.distanceSlider = page.locator('[data-testid="distance-slider"]').or(this.discoverySection.locator('.distance-slider'));
    this.distanceInput = page.locator('[data-testid="distance-input"]').or(this.discoverySection.locator('input[name="distance"]'));
    this.distanceUnitSelect = page.locator('[data-testid="distance-unit"]').or(this.discoverySection.locator('select[name="distanceUnit"]'));
    this.globalModeToggle = page.locator('[data-testid="toggle-global-mode"]').or(this.discoverySection.locator('[data-setting="globalMode"] input'));

    // Privacy
    this.privacySection = page.locator('[data-testid="privacy-settings"]').or(page.locator('.privacy-settings, section:has-text("Privacy")'));
    this.showOnlineToggle = page.locator('[data-testid="toggle-show-online"]').or(this.privacySection.locator('[data-setting="showOnline"] input'));
    this.showDistanceToggle = page.locator('[data-testid="toggle-show-distance"]').or(this.privacySection.locator('[data-setting="showDistance"] input'));
    this.readReceiptsToggle = page.locator('[data-testid="toggle-read-receipts"]').or(this.privacySection.locator('[data-setting="readReceipts"] input'));
    this.showAgeToggle = page.locator('[data-testid="toggle-show-age"]').or(this.privacySection.locator('[data-setting="showAge"] input'));
    this.hideProfileToggle = page.locator('[data-testid="toggle-hide-profile"]').or(this.privacySection.locator('[data-setting="hideProfile"] input'));
    this.blockedUsersButton = page.locator('[data-testid="blocked-users"]').or(page.locator('button:has-text("Blocked Users")'));
    this.blockedUsersList = page.locator('[data-testid="blocked-users-list"]').or(page.locator('.blocked-users-list'));
    this.unblockButton = page.locator('[data-testid="unblock-user"]').or(page.locator('button:has-text("Unblock")'));

    // Subscription
    this.subscriptionSection = page.locator('[data-testid="subscription-settings"]').or(page.locator('.subscription-settings, section:has-text("Subscription")'));
    this.currentPlan = page.locator('[data-testid="current-plan"]').or(this.subscriptionSection.locator('.current-plan, .plan-name'));
    this.subscriptionStatus = page.locator('[data-testid="subscription-status"]').or(this.subscriptionSection.locator('.status, .subscription-status'));
    this.renewalDate = page.locator('[data-testid="renewal-date"]').or(this.subscriptionSection.locator('.renewal-date, .next-billing'));
    this.managePlanButton = page.locator('[data-testid="manage-plan"]').or(page.locator('button:has-text("Manage Plan")'));
    this.cancelSubscriptionButton = page.locator('[data-testid="cancel-subscription"]').or(page.locator('button:has-text("Cancel Subscription")'));
    this.restorePurchasesButton = page.locator('[data-testid="restore-purchases"]').or(page.locator('button:has-text("Restore")'));
    this.upgradeButton = page.locator('[data-testid="upgrade-subscription"]').or(page.locator('button:has-text("Upgrade"), a[href*="premium"]'));

    // Data & Safety
    this.dataSection = page.locator('[data-testid="data-settings"]').or(page.locator('.data-settings, section:has-text("Data")'));
    this.downloadDataButton = page.locator('[data-testid="download-data"]').or(page.locator('button:has-text("Download Data")'));
    this.deleteAccountButton = page.locator('[data-testid="delete-account-button"]').or(page.locator('button:has-text("Delete Account")'));
    this.deleteConfirmInput = page.locator('[data-testid="delete-confirm-input"]').or(page.locator('input[name="deleteConfirm"]'));
    this.confirmDeleteButton = page.locator('[data-testid="confirm-delete"]').or(page.locator('button:has-text("Permanently Delete")'));
    this.pauseAccountToggle = page.locator('[data-testid="toggle-pause-account"]').or(page.locator('[data-setting="pauseAccount"] input'));

    // Help
    this.helpSection = page.locator('[data-testid="help-settings"]').or(page.locator('.help-settings, section:has-text("Help")'));
    this.helpCenterButton = page.locator('[data-testid="help-center"]').or(page.locator('button:has-text("Help Center"), a:has-text("Help Center")'));
    this.contactSupportButton = page.locator('[data-testid="contact-support"]').or(page.locator('button:has-text("Contact Support")'));
    this.faqButton = page.locator('[data-testid="faq"]').or(page.locator('button:has-text("FAQ"), a:has-text("FAQ")'));
    this.termsOfServiceLink = page.locator('[data-testid="terms-of-service"]').or(page.locator('a:has-text("Terms")'));
    this.privacyPolicyLink = page.locator('[data-testid="privacy-policy"]').or(page.locator('a:has-text("Privacy Policy")'));
    this.communityGuidelinesLink = page.locator('[data-testid="community-guidelines"]').or(page.locator('a:has-text("Community Guidelines")'));

    // App info
    this.appVersion = page.locator('[data-testid="app-version"]').or(page.locator('.app-version, .version'));
    this.logoutButton = page.locator('[data-testid="logout-button"]').or(page.locator('button:has-text("Logout"), button:has-text("Sign Out")'));
    this.saveButton = page.locator('[data-testid="save-settings"]').or(page.locator('button:has-text("Save")'));
  }

  /**
   * Navigate to settings page
   */
  async goto(): Promise<void> {
    await this.page.goto('/settings');
    await this.waitForPageLoad();
    await expect(this.page).toHaveURL(/.*settings/);
  }

  /**
   * Check if settings page is loaded
   */
  async isLoaded(): Promise<boolean> {
    try {
      await expect(this.settingsContainer).toBeVisible({ timeout: DEFAULT_TIMEOUTS.medium });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Navigate to a specific settings section
   */
  async goToSection(section: 'account' | 'notifications' | 'discovery' | 'privacy' | 'subscription' | 'data' | 'help'): Promise<void> {
    const sectionMap = {
      account: this.accountSection,
      notifications: this.notificationSection,
      discovery: this.discoverySection,
      privacy: this.privacySection,
      subscription: this.subscriptionSection,
      data: this.dataSection,
      help: this.helpSection,
    };

    const target = sectionMap[section];
    await this.scrollIntoView(target);
  }

  /**
   * Change email address
   */
  async changeEmail(newEmail: string, currentPassword: string): Promise<void> {
    await this.safeClick(this.changeEmailButton);
    await this.safeFill(this.emailInput, newEmail);
    if (await this.currentPasswordInput.isVisible()) {
      await this.safeFill(this.currentPasswordInput, currentPassword);
    }
    await this.safeClick(this.saveButton);
    await this.waitForLoadingComplete();
  }

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.safeClick(this.changePasswordButton);
    await this.safeFill(this.currentPasswordInput, currentPassword);
    await this.safeFill(this.newPasswordInput, newPassword);
    await this.safeFill(this.confirmPasswordInput, newPassword);
    await this.safeClick(this.saveButton);
    await this.waitForLoadingComplete();
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(prefs: NotificationPreferences): Promise<void> {
    await this.goToSection('notifications');

    if (prefs.newMatches !== undefined) {
      await this.setToggle(this.newMatchesToggle, prefs.newMatches);
    }
    if (prefs.newMessages !== undefined) {
      await this.setToggle(this.newMessagesToggle, prefs.newMessages);
    }
    if (prefs.likes !== undefined) {
      await this.setToggle(this.likesToggle, prefs.likes);
    }
    if (prefs.superLikes !== undefined) {
      await this.setToggle(this.superLikesToggle, prefs.superLikes);
    }
    if (prefs.promotions !== undefined) {
      await this.setToggle(this.promotionsToggle, prefs.promotions);
    }
    if (prefs.email !== undefined) {
      await this.setToggle(this.emailNotificationsToggle, prefs.email);
    }
    if (prefs.push !== undefined) {
      await this.setToggle(this.pushNotificationsToggle, prefs.push);
    }
  }

  /**
   * Update discovery preferences
   */
  async updateDiscoveryPreferences(prefs: DiscoveryPreferences): Promise<void> {
    await this.goToSection('discovery');

    if (prefs.showMe !== undefined) {
      await this.showMeSelect.selectOption(prefs.showMe);
    }
    if (prefs.ageMin !== undefined) {
      await this.safeFill(this.ageMinInput, prefs.ageMin.toString());
    }
    if (prefs.ageMax !== undefined) {
      await this.safeFill(this.ageMaxInput, prefs.ageMax.toString());
    }
    if (prefs.distance !== undefined) {
      await this.safeFill(this.distanceInput, prefs.distance.toString());
    }
    if (prefs.distanceUnit !== undefined) {
      await this.distanceUnitSelect.selectOption(prefs.distanceUnit);
    }
    if (prefs.globalMode !== undefined) {
      await this.setToggle(this.globalModeToggle, prefs.globalMode);
    }
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(settings: PrivacySettings): Promise<void> {
    await this.goToSection('privacy');

    if (settings.showOnline !== undefined) {
      await this.setToggle(this.showOnlineToggle, settings.showOnline);
    }
    if (settings.showDistance !== undefined) {
      await this.setToggle(this.showDistanceToggle, settings.showDistance);
    }
    if (settings.readReceipts !== undefined) {
      await this.setToggle(this.readReceiptsToggle, settings.readReceipts);
    }
    if (settings.showAge !== undefined) {
      await this.setToggle(this.showAgeToggle, settings.showAge);
    }
    if (settings.hideProfile !== undefined) {
      await this.setToggle(this.hideProfileToggle, settings.hideProfile);
    }
  }

  /**
   * Helper to set toggle state
   */
  private async setToggle(toggle: Locator, enabled: boolean): Promise<void> {
    const checkbox = toggle.first();
    if (await checkbox.isVisible()) {
      const isChecked = await checkbox.isChecked();
      if (isChecked !== enabled) {
        if (enabled) {
          await checkbox.check();
        } else {
          await checkbox.uncheck();
        }
      }
    }
  }

  /**
   * Get current subscription info
   */
  async getSubscriptionInfo(): Promise<{ plan: string | null; status: string | null; renewalDate: string | null }> {
    await this.goToSection('subscription');

    return {
      plan: await this.currentPlan.textContent().catch(() => null),
      status: await this.subscriptionStatus.textContent().catch(() => null),
      renewalDate: await this.renewalDate.textContent().catch(() => null),
    };
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(): Promise<void> {
    await this.goToSection('subscription');
    await this.safeClick(this.cancelSubscriptionButton);

    // Confirm cancellation
    const confirmBtn = this.page.locator('button:has-text("Yes, Cancel"), button:has-text("Confirm")');
    if (await confirmBtn.isVisible({ timeout: DEFAULT_TIMEOUTS.short })) {
      await this.safeClick(confirmBtn);
    }

    await this.waitForLoadingComplete();
  }

  /**
   * View blocked users
   */
  async viewBlockedUsers(): Promise<void> {
    await this.goToSection('privacy');
    await this.safeClick(this.blockedUsersButton);
    await expect(this.blockedUsersList).toBeVisible({ timeout: DEFAULT_TIMEOUTS.short });
  }

  /**
   * Unblock a user by name
   */
  async unblockUser(userName: string): Promise<void> {
    await this.viewBlockedUsers();

    const userItem = this.blockedUsersList.locator(`:has-text("${userName}")`);
    const unblockBtn = userItem.locator('[data-testid="unblock-user"], button:has-text("Unblock")');

    await this.safeClick(unblockBtn);
    await this.waitForLoadingComplete();
  }

  /**
   * Download user data
   */
  async downloadData(): Promise<void> {
    await this.goToSection('data');
    await this.safeClick(this.downloadDataButton);
    // Handle download - may trigger file download or show confirmation
    await this.waitForToast({ timeout: DEFAULT_TIMEOUTS.medium }).catch(() => {});
  }

  /**
   * Delete account
   */
  async deleteAccount(confirmationText: string): Promise<void> {
    await this.goToSection('data');
    await this.safeClick(this.deleteAccountButton);

    // Fill confirmation
    await this.safeFill(this.deleteConfirmInput, confirmationText);
    await this.safeClick(this.confirmDeleteButton);

    // Wait for logout
    await this.page.waitForURL(/.*(?:login|home|\/$)/, { timeout: DEFAULT_TIMEOUTS.long });
  }

  /**
   * Pause/unpause account
   */
  async togglePauseAccount(pause: boolean): Promise<void> {
    await this.goToSection('data');
    await this.setToggle(this.pauseAccountToggle, pause);
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    await this.scrollIntoView(this.logoutButton);
    await this.safeClick(this.logoutButton);
    await this.page.waitForURL(/.*(?:login|home|\/$)/, { timeout: DEFAULT_TIMEOUTS.navigation });
  }

  /**
   * Open help center
   */
  async openHelpCenter(): Promise<void> {
    await this.goToSection('help');
    await this.safeClick(this.helpCenterButton);
  }

  /**
   * Contact support
   */
  async contactSupport(): Promise<void> {
    await this.goToSection('help');
    await this.safeClick(this.contactSupportButton);
  }

  /**
   * Get app version
   */
  async getAppVersion(): Promise<string | null> {
    return await this.appVersion.textContent().catch(() => null);
  }

  /**
   * Assert settings page is functional
   */
  async assertSettingsAccessible(): Promise<void> {
    await expect(this.settingsContainer).toBeVisible();
    await expect(this.logoutButton).toBeVisible();
  }
}
