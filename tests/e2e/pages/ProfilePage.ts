/**
 * ProfilePage - Page object for profile viewing and editing
 *
 * Uses data-testid selectors for stability:
 * - profile-container: Main profile container
 * - profile-photo: Profile photo image
 * - profile-name: User's display name
 * - profile-age: User's age
 * - profile-bio: User's bio/about text
 * - profile-location: User's location
 * - profile-interests: Interests/tags container
 * - edit-profile-button: Button to edit profile
 * - profile-photos-gallery: Photo gallery container
 * - add-photo-button: Add new photo button
 * - photo-item: Individual photo in gallery
 * - delete-photo-button: Delete photo button
 * - make-primary-photo: Set as main photo button
 * - profile-verification-badge: Verified user badge
 * - premium-badge: Premium subscription badge
 * - profile-stats: Profile statistics (likes, matches)
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage, DEFAULT_TIMEOUTS } from './BasePage';

export interface ProfileData {
  name?: string;
  bio?: string;
  location?: string;
  occupation?: string;
  education?: string;
  height?: string;
  interests?: string[];
}

export class ProfilePage extends BasePage {
  // Profile display elements
  readonly profileContainer: Locator;
  readonly profilePhoto: Locator;
  readonly profileName: Locator;
  readonly profileAge: Locator;
  readonly profileBio: Locator;
  readonly profileLocation: Locator;
  readonly profileOccupation: Locator;
  readonly profileEducation: Locator;
  readonly profileHeight: Locator;
  readonly profileInterests: Locator;
  readonly interestTag: Locator;
  readonly verificationBadge: Locator;
  readonly premiumBadge: Locator;

  // Photo gallery elements
  readonly photosGallery: Locator;
  readonly photoItem: Locator;
  readonly primaryPhoto: Locator;
  readonly addPhotoButton: Locator;
  readonly photoUploadInput: Locator;
  readonly deletePhotoButton: Locator;
  readonly makePrimaryPhotoButton: Locator;
  readonly reorderPhotosButton: Locator;

  // Edit mode elements
  readonly editProfileButton: Locator;
  readonly editForm: Locator;
  readonly nameInput: Locator;
  readonly bioInput: Locator;
  readonly locationInput: Locator;
  readonly occupationInput: Locator;
  readonly educationInput: Locator;
  readonly heightSelect: Locator;
  readonly genderSelect: Locator;
  readonly lookingForSelect: Locator;
  readonly interestSelector: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly discardChangesButton: Locator;

  // Profile stats
  readonly profileStats: Locator;
  readonly likesCount: Locator;
  readonly matchesCount: Locator;
  readonly profileViews: Locator;

  // Verification elements
  readonly verifyButton: Locator;
  readonly verificationStatus: Locator;
  readonly verificationPhotoCapture: Locator;

  // Settings/Actions
  readonly settingsButton: Locator;
  readonly previewProfileButton: Locator;
  readonly shareProfileButton: Locator;
  readonly logoutButton: Locator;

  // Premium/Subscription
  readonly upgradeButton: Locator;
  readonly subscriptionStatus: Locator;

  constructor(page: Page) {
    super(page);

    // Profile display
    this.profileContainer = page.locator('[data-testid="profile-container"]').or(page.locator('.profile-container, .profile-page'));
    this.profilePhoto = page.locator('[data-testid="profile-photo"]').or(page.locator('.profile-photo img, .main-photo'));
    this.profileName = page.locator('[data-testid="profile-name"]').or(page.locator('.profile-name, h1.name'));
    this.profileAge = page.locator('[data-testid="profile-age"]').or(page.locator('.profile-age, .age'));
    this.profileBio = page.locator('[data-testid="profile-bio"]').or(page.locator('.profile-bio, .bio, .about-me'));
    this.profileLocation = page.locator('[data-testid="profile-location"]').or(page.locator('.profile-location, .location'));
    this.profileOccupation = page.locator('[data-testid="profile-occupation"]').or(page.locator('.profile-occupation, .occupation, .job'));
    this.profileEducation = page.locator('[data-testid="profile-education"]').or(page.locator('.profile-education, .education, .school'));
    this.profileHeight = page.locator('[data-testid="profile-height"]').or(page.locator('.profile-height, .height'));
    this.profileInterests = page.locator('[data-testid="profile-interests"]').or(page.locator('.profile-interests, .interests-container'));
    this.interestTag = page.locator('[data-testid="interest-tag"]').or(this.profileInterests.locator('.interest, .tag, .chip'));
    this.verificationBadge = page.locator('[data-testid="verification-badge"]').or(page.locator('.verified-badge, .verification-badge'));
    this.premiumBadge = page.locator('[data-testid="premium-badge"]').or(page.locator('.premium-badge, .gold-badge'));

    // Photo gallery
    this.photosGallery = page.locator('[data-testid="profile-photos-gallery"]').or(page.locator('.photos-gallery, .photo-grid'));
    this.photoItem = page.locator('[data-testid="photo-item"]').or(this.photosGallery.locator('.photo-item, img'));
    this.primaryPhoto = page.locator('[data-testid="primary-photo"]').or(this.photosGallery.locator('.primary-photo, .main-photo'));
    this.addPhotoButton = page.locator('[data-testid="add-photo-button"]').or(page.locator('button[aria-label*="add photo" i], .add-photo'));
    this.photoUploadInput = page.locator('[data-testid="photo-upload"]').or(page.locator('input[type="file"][accept*="image"]'));
    this.deletePhotoButton = page.locator('[data-testid="delete-photo-button"]').or(page.locator('button[aria-label*="delete" i], .delete-photo'));
    this.makePrimaryPhotoButton = page.locator('[data-testid="make-primary-photo"]').or(page.locator('button:has-text("Make Primary"), button:has-text("Set as Main")'));
    this.reorderPhotosButton = page.locator('[data-testid="reorder-photos"]').or(page.locator('button:has-text("Reorder")'));

    // Edit mode
    this.editProfileButton = page.locator('[data-testid="edit-profile-button"]').or(page.locator('button:has-text("Edit Profile"), a[href*="edit"]'));
    this.editForm = page.locator('[data-testid="edit-profile-form"]').or(page.locator('.edit-profile-form, form.profile-edit'));
    this.nameInput = page.locator('[data-testid="edit-name"]').or(page.locator('input[name="name"], input[name="displayName"]'));
    this.bioInput = page.locator('[data-testid="edit-bio"]').or(page.locator('textarea[name="bio"], textarea[name="about"]'));
    this.locationInput = page.locator('[data-testid="edit-location"]').or(page.locator('input[name="location"], input[name="city"]'));
    this.occupationInput = page.locator('[data-testid="edit-occupation"]').or(page.locator('input[name="occupation"], input[name="job"]'));
    this.educationInput = page.locator('[data-testid="edit-education"]').or(page.locator('input[name="education"], input[name="school"]'));
    this.heightSelect = page.locator('[data-testid="edit-height"]').or(page.locator('select[name="height"], input[name="height"]'));
    this.genderSelect = page.locator('[data-testid="edit-gender"]').or(page.locator('select[name="gender"]'));
    this.lookingForSelect = page.locator('[data-testid="edit-looking-for"]').or(page.locator('select[name="lookingFor"]'));
    this.interestSelector = page.locator('[data-testid="interest-selector"]').or(page.locator('.interest-picker, .interests-selector'));
    this.saveButton = page.locator('[data-testid="save-profile"]').or(page.locator('button:has-text("Save"), button[type="submit"]'));
    this.cancelButton = page.locator('[data-testid="cancel-edit"]').or(page.locator('button:has-text("Cancel")'));
    this.discardChangesButton = page.locator('[data-testid="discard-changes"]').or(page.locator('button:has-text("Discard")'));

    // Stats
    this.profileStats = page.locator('[data-testid="profile-stats"]').or(page.locator('.profile-stats, .stats-container'));
    this.likesCount = page.locator('[data-testid="likes-count"]').or(this.profileStats.locator('.likes-count, [data-stat="likes"]'));
    this.matchesCount = page.locator('[data-testid="matches-count"]').or(this.profileStats.locator('.matches-count, [data-stat="matches"]'));
    this.profileViews = page.locator('[data-testid="profile-views"]').or(this.profileStats.locator('.views-count, [data-stat="views"]'));

    // Verification
    this.verifyButton = page.locator('[data-testid="verify-profile-button"]').or(page.locator('button:has-text("Verify"), button:has-text("Get Verified")'));
    this.verificationStatus = page.locator('[data-testid="verification-status"]').or(page.locator('.verification-status'));
    this.verificationPhotoCapture = page.locator('[data-testid="verification-photo"]').or(page.locator('.verification-capture, video.selfie-camera'));

    // Actions
    this.settingsButton = page.locator('[data-testid="profile-settings"]').or(page.locator('button[aria-label*="settings" i], a[href*="settings"]'));
    this.previewProfileButton = page.locator('[data-testid="preview-profile"]').or(page.locator('button:has-text("Preview")'));
    this.shareProfileButton = page.locator('[data-testid="share-profile"]').or(page.locator('button[aria-label*="share" i]'));
    this.logoutButton = page.locator('[data-testid="logout-button"]').or(page.locator('button:has-text("Logout"), button:has-text("Sign Out")'));

    // Premium
    this.upgradeButton = page.locator('[data-testid="upgrade-button"]').or(page.locator('button:has-text("Upgrade"), a[href*="premium"]'));
    this.subscriptionStatus = page.locator('[data-testid="subscription-status"]').or(page.locator('.subscription-status, .premium-status'));
  }

  /**
   * Navigate to profile page
   */
  async goto(): Promise<void> {
    await this.page.goto('/profile');
    await this.waitForPageLoad();
    await expect(this.page).toHaveURL(/.*profile/);
  }

  /**
   * Check if profile page is loaded
   */
  async isLoaded(): Promise<boolean> {
    try {
      await expect(this.profileContainer).toBeVisible({ timeout: DEFAULT_TIMEOUTS.medium });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get profile information
   */
  async getProfileInfo(): Promise<ProfileData> {
    return {
      name: await this.profileName.textContent().catch(() => null) ?? undefined,
      bio: await this.profileBio.textContent().catch(() => null) ?? undefined,
      location: await this.profileLocation.textContent().catch(() => null) ?? undefined,
      occupation: await this.profileOccupation.textContent().catch(() => null) ?? undefined,
      education: await this.profileEducation.textContent().catch(() => null) ?? undefined,
      height: await this.profileHeight.textContent().catch(() => null) ?? undefined,
      interests: await this.getInterests(),
    };
  }

  /**
   * Get list of interests
   */
  async getInterests(): Promise<string[]> {
    const interests: string[] = [];
    const count = await this.interestTag.count();

    for (let i = 0; i < count; i++) {
      const text = await this.interestTag.nth(i).textContent();
      if (text) interests.push(text.trim());
    }

    return interests;
  }

  /**
   * Get photo count
   */
  async getPhotoCount(): Promise<number> {
    return await this.photoItem.count();
  }

  /**
   * Click edit profile button
   */
  async clickEditProfile(): Promise<void> {
    await this.safeClick(this.editProfileButton);
    await this.waitForEditMode();
  }

  /**
   * Wait for edit mode to be ready
   */
  async waitForEditMode(): Promise<void> {
    await expect(this.editForm.or(this.saveButton)).toBeVisible({ timeout: DEFAULT_TIMEOUTS.short });
  }

  /**
   * Check if in edit mode
   */
  async isInEditMode(): Promise<boolean> {
    return await this.editForm.isVisible().catch(() => false) ||
           await this.saveButton.isVisible().catch(() => false);
  }

  /**
   * Update profile bio
   */
  async updateBio(bio: string): Promise<void> {
    if (!await this.isInEditMode()) {
      await this.clickEditProfile();
    }
    await this.bioInput.clear();
    await this.safeFill(this.bioInput, bio);
  }

  /**
   * Update profile name
   */
  async updateName(name: string): Promise<void> {
    if (!await this.isInEditMode()) {
      await this.clickEditProfile();
    }
    await this.nameInput.clear();
    await this.safeFill(this.nameInput, name);
  }

  /**
   * Update profile occupation
   */
  async updateOccupation(occupation: string): Promise<void> {
    if (!await this.isInEditMode()) {
      await this.clickEditProfile();
    }
    await this.occupationInput.clear();
    await this.safeFill(this.occupationInput, occupation);
  }

  /**
   * Update profile education
   */
  async updateEducation(education: string): Promise<void> {
    if (!await this.isInEditMode()) {
      await this.clickEditProfile();
    }
    await this.educationInput.clear();
    await this.safeFill(this.educationInput, education);
  }

  /**
   * Update profile location
   */
  async updateLocation(location: string): Promise<void> {
    if (!await this.isInEditMode()) {
      await this.clickEditProfile();
    }
    await this.locationInput.clear();
    await this.safeFill(this.locationInput, location);
  }

  /**
   * Save profile changes
   */
  async saveProfile(): Promise<void> {
    await this.safeClick(this.saveButton);
    await this.waitForLoadingComplete();

    // Wait for success indication or return to view mode
    await Promise.race([
      this.waitForToast({ timeout: DEFAULT_TIMEOUTS.short }).catch(() => {}),
      this.editForm.waitFor({ state: 'hidden', timeout: DEFAULT_TIMEOUTS.short }).catch(() => {}),
    ]);
  }

  /**
   * Cancel profile editing
   */
  async cancelEdit(): Promise<void> {
    await this.safeClick(this.cancelButton);
    await expect(this.editForm).not.toBeVisible();
  }

  /**
   * Upload a new photo
   */
  async uploadPhoto(filePath: string): Promise<void> {
    // Handle file input - may be hidden
    await this.photoUploadInput.setInputFiles(filePath);
    await this.waitForLoadingComplete();
  }

  /**
   * Delete a photo by index
   */
  async deletePhoto(index: number): Promise<void> {
    const photo = this.photoItem.nth(index);
    await photo.hover();

    const deleteBtn = photo.locator('[data-testid="delete-photo-button"], button[aria-label*="delete"]');
    if (await deleteBtn.isVisible()) {
      await this.safeClick(deleteBtn);

      // Confirm deletion if prompted
      const confirmBtn = this.page.locator('button:has-text("Delete"), button:has-text("Confirm")');
      if (await confirmBtn.isVisible({ timeout: 1000 })) {
        await this.safeClick(confirmBtn);
      }
    }

    await this.waitForLoadingComplete();
  }

  /**
   * Set a photo as primary
   */
  async setPhotoAsPrimary(index: number): Promise<void> {
    const photo = this.photoItem.nth(index);
    await photo.hover();

    const makePrimaryBtn = photo.locator('[data-testid="make-primary-photo"], button:has-text("Primary")');
    if (await makePrimaryBtn.isVisible()) {
      await this.safeClick(makePrimaryBtn);
      await this.waitForLoadingComplete();
    }
  }

  /**
   * Toggle an interest on/off
   */
  async toggleInterest(interestName: string): Promise<void> {
    const interest = this.interestSelector.locator(`button:has-text("${interestName}"), label:has-text("${interestName}")`);
    await this.safeClick(interest);
  }

  /**
   * Check if profile is verified
   */
  async isVerified(): Promise<boolean> {
    return await this.verificationBadge.isVisible().catch(() => false);
  }

  /**
   * Check if user has premium
   */
  async isPremium(): Promise<boolean> {
    return await this.premiumBadge.isVisible().catch(() => false);
  }

  /**
   * Start verification flow
   */
  async startVerification(): Promise<void> {
    await this.safeClick(this.verifyButton);
    await expect(this.verificationPhotoCapture).toBeVisible({ timeout: DEFAULT_TIMEOUTS.medium });
  }

  /**
   * Navigate to settings
   */
  async goToSettings(): Promise<void> {
    await this.safeClick(this.settingsButton);
    await this.page.waitForURL(/.*settings/, { timeout: DEFAULT_TIMEOUTS.navigation });
  }

  /**
   * Logout from profile page
   */
  async logout(): Promise<void> {
    await this.safeClick(this.logoutButton);
    await this.page.waitForURL(/.*(?:login|home|\/$)/, { timeout: DEFAULT_TIMEOUTS.navigation });
  }

  /**
   * Preview profile as others see it
   */
  async previewProfile(): Promise<void> {
    await this.safeClick(this.previewProfileButton);
    await this.waitForAnimation();
  }

  /**
   * Go to premium/upgrade page
   */
  async goToUpgrade(): Promise<void> {
    await this.safeClick(this.upgradeButton);
    await this.page.waitForURL(/.*premium/, { timeout: DEFAULT_TIMEOUTS.navigation });
  }

  /**
   * Get stats values
   */
  async getStats(): Promise<{ likes: number; matches: number; views: number }> {
    const likesText = await this.likesCount.textContent().catch(() => '0');
    const matchesText = await this.matchesCount.textContent().catch(() => '0');
    const viewsText = await this.profileViews.textContent().catch(() => '0');

    return {
      likes: parseInt(likesText?.replace(/\D/g, '') || '0', 10),
      matches: parseInt(matchesText?.replace(/\D/g, '') || '0', 10),
      views: parseInt(viewsText?.replace(/\D/g, '') || '0', 10),
    };
  }

  /**
   * Assert profile displays correctly
   */
  async assertProfileDisplayed(): Promise<void> {
    await expect(this.profileContainer).toBeVisible();
    await expect(this.profileName).toBeVisible();
    await expect(this.profilePhoto.first()).toBeVisible();
    await expect(this.editProfileButton).toBeVisible();
  }
}
