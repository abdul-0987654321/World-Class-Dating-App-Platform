import { device, element, by, expect as detoxExpect, waitFor } from 'detox';
import { login, waitForElement, scrollToElement } from './init';

describe('Profile Management', () => {
  const testUser = {
    email: 'profile@flamoral.com',
    password: 'TestPass123!',
  };

  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await login(testUser.email, testUser.password);
  });

  beforeEach(async () => {
    // Navigate to profile
    await element(by.id('profile-tab')).tap();
    await waitForElement('profile-screen');
  });

  describe('Profile View', () => {
    it('should display user profile information', async () => {
      await detoxExpect(element(by.id('profile-photo'))).toBeVisible();
      await detoxExpect(element(by.id('profile-name'))).toBeVisible();
      await detoxExpect(element(by.id('profile-age'))).toBeVisible();
      await detoxExpect(element(by.id('profile-bio'))).toBeVisible();
    });

    it('should display profile completion percentage', async () => {
      await detoxExpect(element(by.id('profile-completion-bar'))).toBeVisible();
      await detoxExpect(element(by.id('completion-percentage'))).toBeVisible();
    });

    it('should navigate through profile sections', async () => {
      await element(by.id('profile-scroll')).scroll(200, 'down');
      await detoxExpect(element(by.id('photos-section'))).toBeVisible();

      await element(by.id('profile-scroll')).scroll(200, 'down');
      await detoxExpect(element(by.id('interests-section'))).toBeVisible();

      await element(by.id('profile-scroll')).scroll(200, 'down');
      await detoxExpect(element(by.id('prompts-section'))).toBeVisible();
    });
  });

  describe('Photo Management', () => {
    beforeEach(async () => {
      await scrollToElement('profile-scroll', 'photos-section');
    });

    it('should open photo upload modal', async () => {
      await element(by.id('add-photo-button')).tap();
      await waitForElement('photo-upload-modal');
      await detoxExpect(element(by.id('camera-option'))).toBeVisible();
      await detoxExpect(element(by.id('gallery-option'))).toBeVisible();
    });

    it('should take photo with camera', async () => {
      await element(by.id('add-photo-button')).tap();
      await element(by.id('camera-option')).tap();

      if (device.getPlatform() === 'ios') {
        await detoxExpect(element(by.id('camera-view'))).toBeVisible();
        await element(by.id('capture-button')).tap();
        await element(by.id('use-photo-button')).tap();
      }

      await device.takeScreenshot('photo-captured');
    });

    it('should select photo from gallery', async () => {
      await element(by.id('add-photo-button')).tap();
      await element(by.id('gallery-option')).tap();

      // Select first photo from gallery
      await waitForElement('gallery-grid');
      await element(by.id('gallery-photo-0')).tap();

      await waitForElement('photo-preview');
      await element(by.id('save-photo-button')).tap();

      await waitFor(element(by.text('Photo uploaded successfully')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should reorder photos', async () => {
      const firstPhoto = element(by.id('photo-0'));
      const thirdPhoto = element(by.id('photo-2'));

      await firstPhoto.longPress(2000);
      await firstPhoto.swipe('right', 'slow');

      await element(by.id('save-order-button')).tap();

      await waitFor(element(by.text('Photo order saved')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should delete photo', async () => {
      await element(by.id('photo-0')).longPress();
      await waitForElement('photo-options-modal');

      await element(by.id('delete-photo-option')).tap();
      await waitForElement('confirm-delete-modal');

      await element(by.id('confirm-delete-button')).tap();

      await waitFor(element(by.text('Photo deleted')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should set primary photo', async () => {
      await element(by.id('photo-2')).longPress();
      await element(by.id('set-primary-option')).tap();

      await waitFor(element(by.id('photo-2').withAncestor(by.id('primary-photo-indicator'))))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should enforce minimum photo requirement', async () => {
      // Try to delete when only 2 photos remain
      const photoCount = await element(by.id('photo-grid')).getAttributes();

      if (photoCount.elements && photoCount.elements.length <= 2) {
        await element(by.id('photo-0')).longPress();
        await element(by.id('delete-photo-option')).tap();

        await detoxExpect(element(by.text('Minimum 2 photos required'))).toBeVisible();
      }
    });
  });

  describe('Bio and About', () => {
    it('should edit bio', async () => {
      await scrollToElement('profile-scroll', 'bio-section');
      await element(by.id('edit-bio-button')).tap();

      await waitForElement('bio-input');
      await element(by.id('bio-input')).clearText();
      await element(by.id('bio-input')).typeText(
        'Adventure enthusiast who loves hiking, photography, and trying new cuisines.'
      );

      await element(by.id('save-bio-button')).tap();

      await waitFor(element(by.text('Bio updated')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should enforce bio character limit', async () => {
      await element(by.id('edit-bio-button')).tap();

      const longBio = 'a'.repeat(600);
      await element(by.id('bio-input')).typeText(longBio);

      await detoxExpect(element(by.id('character-count'))).toHaveText('500/500');
      await detoxExpect(element(by.id('bio-error'))).toBeVisible();
    });

    it('should update job and education', async () => {
      await element(by.id('edit-info-button')).tap();
      await waitForElement('info-edit-modal');

      await element(by.id('job-title-input')).typeText('Software Engineer');
      await element(by.id('company-input')).typeText('Tech Corp');
      await element(by.id('school-input')).typeText('State University');

      await element(by.id('save-info-button')).tap();

      await waitFor(element(by.text('Info updated')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should update location', async () => {
      await element(by.id('edit-location-button')).tap();
      await waitForElement('location-search-input');

      await element(by.id('location-search-input')).typeText('New York');

      await waitFor(element(by.id('location-suggestion-0')))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id('location-suggestion-0')).tap();

      await detoxExpect(element(by.id('selected-location'))).toHaveText('New York, NY');
      await element(by.id('save-location-button')).tap();
    });
  });

  describe('Interests Management', () => {
    beforeEach(async () => {
      await scrollToElement('profile-scroll', 'interests-section');
    });

    it('should add interests', async () => {
      await element(by.id('edit-interests-button')).tap();
      await waitForElement('interests-modal');

      const interests = ['Hiking', 'Photography', 'Cooking'];

      for (const interest of interests) {
        await element(by.id('interest-search')).typeText(interest);
        await waitFor(element(by.id(`interest-option-${interest.toLowerCase()}`)))
          .toBeVisible()
          .withTimeout(2000);
        await element(by.id(`interest-option-${interest.toLowerCase()}`))).tap();
        await element(by.id('interest-search')).clearText();
      }

      await element(by.id('save-interests-button')).tap();

      await waitFor(element(by.text('Interests updated')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should remove interests', async () => {
      await element(by.id('edit-interests-button')).tap();
      await waitForElement('interests-modal');

      await element(by.id('interest-tag-0')).tap(); // Deselect first interest

      await element(by.id('save-interests-button')).tap();

      await waitFor(element(by.text('Interests updated')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should limit number of interests', async () => {
      await element(by.id('edit-interests-button')).tap();

      // Try to add more than maximum allowed
      for (let i = 0; i < 15; i++) {
        await element(by.id('interest-search')).typeText(`Interest${i}\n`);
      }

      const selectedCount = await element(by.id('selected-interests-count')).getAttributes();
      expect(selectedCount.text).toBeLessThanOrEqual('10');
    });
  });

  describe('Profile Prompts', () => {
    beforeEach(async () => {
      await scrollToElement('profile-scroll', 'prompts-section');
    });

    it('should add new prompt', async () => {
      await element(by.id('add-prompt-button')).tap();
      await waitForElement('prompt-selector-modal');

      await element(by.id('prompt-option-0')).tap();

      await waitForElement('prompt-answer-input');
      await element(by.id('prompt-answer-input')).typeText(
        'My perfect Sunday involves hiking in the mountains followed by brunch with friends.'
      );

      await element(by.id('save-prompt-button')).tap();

      await waitFor(element(by.text('Prompt added')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should edit existing prompt', async () => {
      await element(by.id('prompt-0')).tap();
      await waitForElement('edit-prompt-modal');

      await element(by.id('prompt-answer-input')).clearText();
      await element(by.id('prompt-answer-input')).typeText('Updated answer to this prompt');

      await element(by.id('save-prompt-button')).tap();

      await waitFor(element(by.text('Prompt updated')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should delete prompt', async () => {
      await element(by.id('prompt-0')).longPress();
      await element(by.id('delete-prompt-option')).tap();

      await waitForElement('confirm-delete-modal');
      await element(by.id('confirm-delete-button')).tap();

      await waitFor(element(by.text('Prompt deleted')))
        .toBeVisible()
        .withTimeout(3000);
    });
  });

  describe('Preferences', () => {
    beforeEach(async () => {
      await element(by.id('settings-button')).tap();
      await waitForElement('settings-screen');
      await element(by.id('preferences-option')).tap();
      await waitForElement('preferences-screen');
    });

    it('should update age preferences', async () => {
      await element(by.id('age-min-slider')).swipe('right', 'slow', 0.3);
      await element(by.id('age-max-slider')).swipe('left', 'slow', 0.3);

      await element(by.id('save-preferences-button')).tap();

      await waitFor(element(by.text('Preferences saved')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should update distance preference', async () => {
      await element(by.id('distance-slider')).swipe('right', 'slow', 0.5);

      await detoxExpect(element(by.id('distance-value'))).toBeVisible();

      await element(by.id('save-preferences-button')).tap();
    });

    it('should update gender preferences', async () => {
      await element(by.id('gender-women')).tap();
      await element(by.id('save-preferences-button')).tap();

      await waitFor(element(by.text('Preferences saved')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should toggle deal breakers', async () => {
      await scrollToElement('preferences-scroll', 'deal-breakers-section');

      await element(by.id('dealbreaker-smoking')).tap();
      await element(by.id('dealbreaker-kids')).tap();

      await element(by.id('save-preferences-button')).tap();
    });
  });

  describe('Profile Verification', () => {
    it('should start verification process', async () => {
      await element(by.id('verify-profile-badge')).tap();
      await waitForElement('verification-modal');

      await detoxExpect(element(by.text('Verify Your Profile'))).toBeVisible();
      await detoxExpect(element(by.id('verification-instructions'))).toBeVisible();
    });

    it('should capture verification selfie', async () => {
      await element(by.id('verify-profile-badge')).tap();
      await element(by.id('start-verification-button')).tap();

      await waitForElement('verification-camera');
      await detoxExpect(element(by.id('pose-guide'))).toBeVisible();

      await element(by.id('capture-verification-button')).tap();

      await waitForElement('verification-preview');
      await element(by.id('submit-verification-button')).tap();

      await waitFor(element(by.text('Verification submitted')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('Privacy Settings', () => {
    beforeEach(async () => {
      await element(by.id('settings-button')).tap();
      await element(by.id('privacy-settings-option')).tap();
      await waitForElement('privacy-settings-screen');
    });

    it('should toggle profile visibility', async () => {
      await element(by.id('profile-visibility-toggle')).tap();

      await waitForElement('confirm-hide-modal');
      await element(by.id('confirm-hide-button')).tap();

      await waitFor(element(by.text('Profile hidden')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should update discovery settings', async () => {
      await element(by.id('show-age-toggle')).tap();
      await element(by.id('show-distance-toggle')).tap();
      await element(by.id('show-active-status-toggle')).tap();

      await element(by.id('save-privacy-button')).tap();

      await waitFor(element(by.text('Privacy settings updated')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should enable incognito mode (premium)', async () => {
      await element(by.id('incognito-mode-toggle')).tap();

      // Should show upgrade prompt for free users
      await waitFor(element(by.id('premium-required-modal')))
        .toBeVisible()
        .withTimeout(3000);
    });
  });

  describe('Account Settings', () => {
    beforeEach(async () => {
      await element(by.id('settings-button')).tap();
      await element(by.id('account-settings-option')).tap();
    });

    it('should change password', async () => {
      await element(by.id('change-password-option')).tap();
      await waitForElement('change-password-modal');

      await element(by.id('current-password-input')).typeText('TestPass123!');
      await element(by.id('new-password-input')).typeText('NewPass123!@#');
      await element(by.id('confirm-password-input')).typeText('NewPass123!@#');

      await element(by.id('save-password-button')).tap();

      await waitFor(element(by.text('Password updated')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should update email', async () => {
      await element(by.id('change-email-option')).tap();
      await waitForElement('change-email-modal');

      await element(by.id('new-email-input')).typeText('newemail@flamoral.com');
      await element(by.id('password-confirm-input')).typeText('TestPass123!');

      await element(by.id('save-email-button')).tap();

      await waitFor(element(by.text('Verification email sent')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should deactivate account', async () => {
      await scrollToElement('account-settings-scroll', 'deactivate-account-button');
      await element(by.id('deactivate-account-button')).tap();

      await waitForElement('deactivate-modal');
      await element(by.id('deactivate-reason-select')).tap();
      await element(by.text('Taking a break')).tap();

      await element(by.id('confirm-deactivate-button')).tap();

      await waitFor(element(by.text('Account deactivated')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('Profile Preview', () => {
    it('should preview profile as others see it', async () => {
      await element(by.id('preview-profile-button')).tap();
      await waitForElement('profile-preview-modal');

      await detoxExpect(element(by.id('preview-card'))).toBeVisible();

      // Swipe through photos
      await element(by.id('preview-card')).swipe('left');
      await device.takeScreenshot('profile-preview');

      await element(by.id('close-preview-button')).tap();
    });
  });

  describe('Error Handling', () => {
    it('should handle photo upload failure', async () => {
      // Disable network
      await device.setStatusBar({ wifiConnected: false });

      await element(by.id('add-photo-button')).tap();
      await element(by.id('gallery-option')).tap();
      await element(by.id('gallery-photo-0')).tap();
      await element(by.id('save-photo-button')).tap();

      await waitFor(element(by.text('Upload failed')))
        .toBeVisible()
        .withTimeout(5000);

      await detoxExpect(element(by.id('retry-upload-button'))).toBeVisible();

      // Re-enable network
      await device.setStatusBar({ wifiConnected: true });
    });

    it('should handle save failures gracefully', async () => {
      await element(by.id('edit-bio-button')).tap();
      await element(by.id('bio-input')).typeText('New bio');

      // Disable network
      await device.setStatusBar({ wifiConnected: false });

      await element(by.id('save-bio-button')).tap();

      await waitFor(element(by.text('Failed to save')))
        .toBeVisible()
        .withTimeout(5000);

      // Re-enable network
      await device.setStatusBar({ wifiConnected: true });
    });
  });
});
