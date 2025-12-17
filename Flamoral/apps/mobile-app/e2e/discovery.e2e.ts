import { by, device, element, expect } from 'detox';

describe('Discovery Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    // Login with test user
    await element(by.id('login-button')).tap();
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('TestPassword123!');
    await element(by.id('submit-login')).tap();
    // Wait for discovery screen
    await waitFor(element(by.id('discovery-screen'))).toBeVisible().withTimeout(5000);
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Discovery Screen', () => {
    it('should show discovery screen with profile cards', async () => {
      await expect(element(by.id('discovery-screen'))).toBeVisible();
      await expect(element(by.id('profile-card'))).toBeVisible();
    });

    it('should show profile card with user info', async () => {
      await expect(element(by.id('profile-name'))).toBeVisible();
      await expect(element(by.id('profile-age'))).toBeVisible();
      await expect(element(by.id('profile-photo'))).toBeVisible();
    });

    it('should show action buttons', async () => {
      await expect(element(by.id('pass-button'))).toBeVisible();
      await expect(element(by.id('like-button'))).toBeVisible();
      await expect(element(by.id('superlike-button'))).toBeVisible();
    });
  });

  describe('Swiping Actions', () => {
    it('should swipe left to pass', async () => {
      const profileCard = element(by.id('profile-card'));
      await profileCard.swipe('left', 'fast', 0.8);
      // New profile should appear
      await expect(element(by.id('profile-card'))).toBeVisible();
    });

    it('should swipe right to like', async () => {
      const profileCard = element(by.id('profile-card'));
      await profileCard.swipe('right', 'fast', 0.8);
      await expect(element(by.id('profile-card'))).toBeVisible();
    });

    it('should swipe up for superlike', async () => {
      const profileCard = element(by.id('profile-card'));
      await profileCard.swipe('up', 'fast', 0.8);
      // May show superlike confirmation or limit message
      await expect(element(by.id('profile-card'))).toBeVisible();
    });
  });

  describe('Button Actions', () => {
    it('should pass when tapping pass button', async () => {
      await element(by.id('pass-button')).tap();
      await expect(element(by.id('profile-card'))).toBeVisible();
    });

    it('should like when tapping like button', async () => {
      await element(by.id('like-button')).tap();
      await expect(element(by.id('profile-card'))).toBeVisible();
    });

    it('should superlike when tapping superlike button', async () => {
      await element(by.id('superlike-button')).tap();
      // May show superlike animation or limit reached
    });
  });

  describe('Profile Details', () => {
    it('should expand profile card on tap', async () => {
      await element(by.id('profile-card')).tap();
      await expect(element(by.id('profile-details'))).toBeVisible();
    });

    it('should show full bio in expanded view', async () => {
      await element(by.id('profile-card')).tap();
      await expect(element(by.id('profile-bio'))).toBeVisible();
    });

    it('should show all photos in expanded view', async () => {
      await element(by.id('profile-card')).tap();
      await expect(element(by.id('photo-gallery'))).toBeVisible();
    });

    it('should swipe through photos in gallery', async () => {
      await element(by.id('profile-card')).tap();
      await element(by.id('photo-gallery')).swipe('left');
      await expect(element(by.id('photo-indicator-1'))).toHaveLabel('active');
    });

    it('should close expanded view on swipe down', async () => {
      await element(by.id('profile-card')).tap();
      await element(by.id('profile-details')).swipe('down', 'fast', 0.6);
      await expect(element(by.id('profile-details'))).not.toBeVisible();
    });
  });

  describe('Match Popup', () => {
    it('should show match popup on mutual like', async () => {
      // This requires a pre-configured test scenario
      await expect(element(by.id('match-popup'))).toBeVisible();
      await expect(element(by.id('match-animation'))).toBeVisible();
    });

    it('should navigate to chat from match popup', async () => {
      await element(by.id('send-message-button')).tap();
      await expect(element(by.id('chat-screen'))).toBeVisible();
    });

    it('should dismiss match popup and continue swiping', async () => {
      await element(by.id('keep-swiping-button')).tap();
      await expect(element(by.id('discovery-screen'))).toBeVisible();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no more profiles', async () => {
      // Navigate through all profiles
      await expect(element(by.id('no-more-profiles'))).toBeVisible();
      await expect(element(by.id('expand-preferences-hint'))).toBeVisible();
    });
  });

  describe('Filter/Preferences', () => {
    it('should open preferences modal', async () => {
      await element(by.id('preferences-button')).tap();
      await expect(element(by.id('preferences-modal'))).toBeVisible();
    });

    it('should show age range slider', async () => {
      await element(by.id('preferences-button')).tap();
      await expect(element(by.id('age-range-slider'))).toBeVisible();
    });

    it('should show distance slider', async () => {
      await element(by.id('preferences-button')).tap();
      await expect(element(by.id('distance-slider'))).toBeVisible();
    });

    it('should apply preferences and refresh discovery', async () => {
      await element(by.id('preferences-button')).tap();
      await element(by.id('apply-preferences-button')).tap();
      await expect(element(by.id('discovery-screen'))).toBeVisible();
      // Should see loading indicator briefly
    });
  });
});
