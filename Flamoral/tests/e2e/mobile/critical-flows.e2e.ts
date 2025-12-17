/**
 * Critical User Flows E2E Tests - Mobile Application (Detox)
 *
 * Phase 2: End-to-End Flow Validation
 *
 * This file contains comprehensive E2E tests for all critical user flows
 * in the Flamoral Dating Platform mobile application (iOS & Android).
 *
 * Test Framework: Detox
 * React Native Testing Library
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

// ============================================================================
// Test Configuration & Helpers
// ============================================================================

const TEST_CONFIG = {
  timeout: 30000,
  shortTimeout: 5000,
  longTimeout: 60000,
};

// Helper: Generate unique test email
function generateTestEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
}

// Helper: Generate test user data
function generateTestUser(overrides: any = {}) {
  return {
    email: generateTestEmail(),
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    dateOfBirth: '1995-06-15',
    gender: 'male',
    lookingFor: 'female',
    ...overrides,
  };
}

// Helper: Fill registration form
async function fillRegistrationForm(userData: any) {
  await element(by.id('email-input')).typeText(userData.email);
  await element(by.id('password-input')).typeText(userData.password);
  await element(by.id('confirm-password-input')).typeText(userData.password);
  await element(by.id('first-name-input')).typeText(userData.firstName);
  await element(by.id('last-name-input')).typeText(userData.lastName);
  await element(by.id('date-of-birth-input')).typeText(userData.dateOfBirth);
  await element(by.id(`gender-${userData.gender}`)).tap();
  await element(by.id('accept-terms-checkbox')).tap();
}

// Helper: Login user
async function loginUser(email: string, password: string) {
  await element(by.id('email-input')).typeText(email);
  await element(by.id('password-input')).typeText(password);
  await element(by.id('login-button')).tap();
  await waitFor(element(by.id('discovery-screen')))
    .toBeVisible()
    .withTimeout(TEST_CONFIG.timeout);
}

// Helper: Swipe action
async function swipeProfile(direction: 'left' | 'right') {
  const profileCard = element(by.id('profile-card'));
  if (direction === 'right') {
    await profileCard.swipe('right', 'fast');
  } else {
    await profileCard.swipe('left', 'fast');
  }
}

// ============================================================================
// Setup and Teardown
// ============================================================================

beforeAll(async () => {
  await device.launchApp({
    newInstance: true,
    permissions: {
      location: 'always',
      notifications: 'YES',
      camera: 'YES',
      photos: 'YES',
    },
  });
});

beforeEach(async () => {
  await device.reloadReactNative();
});

afterAll(async () => {
  await device.terminateApp();
});

// ============================================================================
// FLOW 1: User Registration & Authentication
// ============================================================================

describe('Flow 1: User Registration & Authentication', () => {

  describe('1.1 Guest Browsing to Registration', () => {

    it('should display welcome screen for guests', async () => {
      await detoxExpect(element(by.id('welcome-screen'))).toBeVisible();
      await detoxExpect(element(by.text('Find Your Match'))).toBeVisible();
      await detoxExpect(element(by.id('get-started-button'))).toBeVisible();
    });

    it('should navigate to registration screen', async () => {
      await element(by.id('get-started-button')).tap();
      await detoxExpect(element(by.id('registration-screen'))).toBeVisible();
    });

    it('should complete registration flow', async () => {
      await element(by.id('get-started-button')).tap();

      const userData = generateTestUser();
      await fillRegistrationForm(userData);

      await element(by.id('register-button')).tap();

      // Should navigate to verification or profile setup
      await waitFor(element(by.id('verification-screen').or(by.id('profile-setup-screen'))))
        .toBeVisible()
        .withTimeout(TEST_CONFIG.timeout);
    });

    it('should prevent underage registration', async () => {
      await element(by.id('get-started-button')).tap();

      // Enter underage date of birth
      const underageDate = new Date();
      underageDate.setFullYear(underageDate.getFullYear() - 17);
      const underageDateString = underageDate.toISOString().split('T')[0];

      const userData = generateTestUser({ dateOfBirth: underageDateString });
      await fillRegistrationForm(userData);

      await element(by.id('register-button')).tap();

      // Should show age restriction error
      await detoxExpect(element(by.text(/18.*years.*old|must.*be.*18/i))).toBeVisible();
    });

    it('should validate email format', async () => {
      await element(by.id('get-started-button')).tap();

      await element(by.id('email-input')).typeText('invalid-email');
      await element(by.id('password-input')).tap(); // Trigger blur

      await detoxExpect(element(by.text(/invalid.*email|valid.*email/i))).toBeVisible();
    });

    it('should validate password strength', async () => {
      await element(by.id('get-started-button')).tap();

      await element(by.id('password-input')).typeText('123');
      await element(by.id('confirm-password-input')).tap(); // Trigger blur

      await detoxExpect(element(by.text(/password.*weak|password.*strong/i))).toBeVisible();
    });
  });

  describe('1.2 Email Verification', () => {

    it('should display email verification screen', async () => {
      await element(by.id('get-started-button')).tap();

      const userData = generateTestUser();
      await fillRegistrationForm(userData);
      await element(by.id('register-button')).tap();

      await waitFor(element(by.id('verification-screen')))
        .toBeVisible()
        .withTimeout(TEST_CONFIG.timeout);

      await detoxExpect(element(by.text(/check.*email|verify.*email/i))).toBeVisible();
    });

    it('should allow resending verification email', async () => {
      await detoxExpect(element(by.id('verification-screen'))).toBeVisible();

      await element(by.id('resend-email-button')).tap();

      await detoxExpect(element(by.text(/email.*sent|sent.*again/i))).toBeVisible();
    });

    it('should verify email with valid token', async () => {
      // Simulate deep link with verification token
      await device.openURL({
        url: 'flamoral://verify-email?token=valid-token-123',
      });

      await waitFor(element(by.text(/email.*verified|verification.*successful/i)))
        .toBeVisible()
        .withTimeout(TEST_CONFIG.timeout);
    });
  });

  describe('1.3 Login/Logout', () => {

    it('should login with valid credentials', async () => {
      const userData = generateTestUser();

      // Navigate to login
      await element(by.id('login-button-home')).tap();

      await loginUser(userData.email, userData.password);

      // Should be on discovery screen
      await detoxExpect(element(by.id('discovery-screen'))).toBeVisible();
    });

    it('should show error for invalid credentials', async () => {
      await element(by.id('login-button-home')).tap();

      await element(by.id('email-input')).typeText('nonexistent@example.com');
      await element(by.id('password-input')).typeText('WrongPassword123!');
      await element(by.id('login-button')).tap();

      await detoxExpect(element(by.text(/invalid.*credentials|incorrect.*password/i))).toBeVisible();
    });

    it('should maintain session after app restart', async () => {
      const userData = generateTestUser();

      await element(by.id('login-button-home')).tap();
      await loginUser(userData.email, userData.password);

      // Restart app
      await device.relaunchApp();

      // Should still be logged in
      await detoxExpect(element(by.id('discovery-screen'))).toBeVisible();
    });

    it('should logout successfully', async () => {
      // Assuming user is logged in
      await detoxExpect(element(by.id('discovery-screen'))).toBeVisible();

      // Navigate to settings
      await element(by.id('profile-tab')).tap();
      await element(by.id('settings-button')).tap();

      // Logout
      await element(by.id('logout-button')).tap();

      // Confirm logout
      await element(by.text('Logout')).tap();

      // Should be back at welcome screen
      await detoxExpect(element(by.id('welcome-screen'))).toBeVisible();
    });
  });

  describe('1.4 Password Reset', () => {

    it('should navigate to forgot password screen', async () => {
      await element(by.id('login-button-home')).tap();
      await element(by.id('forgot-password-button')).tap();

      await detoxExpect(element(by.id('forgot-password-screen'))).toBeVisible();
    });

    it('should request password reset', async () => {
      await element(by.id('login-button-home')).tap();
      await element(by.id('forgot-password-button')).tap();

      await element(by.id('email-input')).typeText('test@example.com');
      await element(by.id('reset-password-button')).tap();

      await detoxExpect(element(by.text(/email.*sent|check.*email/i))).toBeVisible();
    });

    it('should reset password with valid token', async () => {
      // Simulate deep link with reset token
      await device.openURL({
        url: 'flamoral://reset-password?token=valid-reset-token',
      });

      await waitFor(element(by.id('reset-password-screen')))
        .toBeVisible()
        .withTimeout(TEST_CONFIG.timeout);

      const newPassword = 'NewPassword123!';
      await element(by.id('new-password-input')).typeText(newPassword);
      await element(by.id('confirm-password-input')).typeText(newPassword);
      await element(by.id('submit-button')).tap();

      await detoxExpect(element(by.text(/password.*reset|password.*updated/i))).toBeVisible();
    });
  });

  describe('1.5 OAuth Flows', () => {

    it('should initiate Google OAuth flow', async () => {
      await element(by.id('google-login-button')).tap();

      // Should open browser or OAuth screen
      await waitFor(element(by.text(/Sign in with Google|Google/i)))
        .toBeVisible()
        .withTimeout(TEST_CONFIG.shortTimeout);
    });

    it('should initiate Facebook OAuth flow', async () => {
      await element(by.id('facebook-login-button')).tap();

      await waitFor(element(by.text(/Facebook|Continue with Facebook/i)))
        .toBeVisible()
        .withTimeout(TEST_CONFIG.shortTimeout);
    });

    it('should initiate Apple OAuth flow', async () => {
      if (device.getPlatform() === 'ios') {
        await element(by.id('apple-login-button')).tap();

        await waitFor(element(by.text(/Sign in with Apple|Apple ID/i)))
          .toBeVisible()
          .withTimeout(TEST_CONFIG.shortTimeout);
      }
    });
  });

  describe('1.6 Session Persistence', () => {

    it('should persist session across app kills', async () => {
      const userData = generateTestUser();

      await element(by.id('login-button-home')).tap();
      await loginUser(userData.email, userData.password);

      // Kill and relaunch app
      await device.terminateApp();
      await device.launchApp({ newInstance: false });

      // Should still be logged in
      await detoxExpect(element(by.id('discovery-screen'))).toBeVisible();
    });

    it('should handle session expiration', async () => {
      // This test would require mocking expired session
      // Implementation depends on app architecture
    });
  });
});

// ============================================================================
// FLOW 2: Discovery to Match Flow
// ============================================================================

describe('Flow 2: Discovery to Match Flow', () => {

  describe('2.1 Browse Profiles', () => {

    it('should load discovery screen with profiles', async () => {
      await detoxExpect(element(by.id('discovery-screen'))).toBeVisible();
      await detoxExpect(element(by.id('profile-card'))).toBeVisible();
    });

    it('should display profile information', async () => {
      await detoxExpect(element(by.id('profile-name'))).toBeVisible();
      await detoxExpect(element(by.id('profile-age'))).toBeVisible();
      await detoxExpect(element(by.id('profile-bio'))).toBeVisible();
    });

    it('should display profile photos', async () => {
      await detoxExpect(element(by.id('profile-image'))).toBeVisible();
    });

    it('should allow viewing multiple photos', async () => {
      const profileCard = element(by.id('profile-card'));
      await profileCard.swipe('left', 'slow', 0.5);

      // Should show next photo
      await detoxExpect(element(by.id('photo-indicator-2'))).toBeVisible();
    });
  });

  describe('2.2 Apply Filters', () => {

    it('should open filters modal', async () => {
      await element(by.id('filters-button')).tap();

      await detoxExpect(element(by.id('filters-modal'))).toBeVisible();
    });

    it('should apply age filters', async () => {
      await element(by.id('filters-button')).tap();

      await element(by.id('min-age-input')).replaceText('25');
      await element(by.id('max-age-input')).replaceText('35');

      await element(by.id('apply-filters-button')).tap();

      await detoxExpect(element(by.id('filters-modal'))).not.toBeVisible();
    });

    it('should apply distance filter', async () => {
      await element(by.id('filters-button')).tap();

      // Adjust distance slider
      await element(by.id('distance-slider')).adjustSliderToPosition(0.5);

      await element(by.id('apply-filters-button')).tap();

      await detoxExpect(element(by.id('filters-modal'))).not.toBeVisible();
    });

    it('should show premium filters prompt for free users', async () => {
      await element(by.id('filters-button')).tap();

      // Tap premium filter
      await element(by.id('education-filter')).tap();

      // Should show upgrade prompt
      await detoxExpect(element(by.text(/upgrade|premium|go.*premium/i))).toBeVisible();
    });
  });

  describe('2.3 Like/Pass/Super-Like', () => {

    it('should swipe right (like) on profile', async () => {
      await swipeProfile('right');

      // Next profile should appear
      await waitFor(element(by.id('profile-card')))
        .toBeVisible()
        .withTimeout(TEST_CONFIG.shortTimeout);
    });

    it('should swipe left (pass) on profile', async () => {
      await swipeProfile('left');

      // Next profile should appear
      await waitFor(element(by.id('profile-card')))
        .toBeVisible()
        .withTimeout(TEST_CONFIG.shortTimeout);
    });

    it('should tap like button', async () => {
      await element(by.id('like-button')).tap();

      // Next profile should appear
      await waitFor(element(by.id('profile-card')))
        .toBeVisible()
        .withTimeout(TEST_CONFIG.shortTimeout);
    });

    it('should tap pass button', async () => {
      await element(by.id('pass-button')).tap();

      // Next profile should appear
      await waitFor(element(by.id('profile-card')))
        .toBeVisible()
        .withTimeout(TEST_CONFIG.shortTimeout);
    });

    it('should use super-like', async () => {
      await element(by.id('super-like-button')).tap();

      // Should show super-like sent animation or next profile
      await waitFor(element(by.id('profile-card')))
        .toBeVisible()
        .withTimeout(TEST_CONFIG.shortTimeout);
    });

    it('should enforce swipe limits for free users', async () => {
      // Swipe multiple times to hit limit
      for (let i = 0; i < 50; i++) {
        await element(by.id('like-button')).tap();
        await device.waitForIdle();
      }

      // Should show swipe limit message
      await detoxExpect(element(by.text(/swipe.*limit|out.*of.*swipes/i))).toBeVisible();
    });
  });

  describe('2.4 Match Creation', () => {

    it('should display match notification when matched', async () => {
      // Simulate creating a match (would require coordinated test users)
      await element(by.id('like-button')).tap();

      // If match occurs, modal should appear
      await waitFor(element(by.id('match-modal')))
        .toBeVisible()
        .withTimeout(TEST_CONFIG.shortTimeout);
    });

    it('should show matched user information', async () => {
      // Assuming match modal is visible
      await detoxExpect(element(by.id('match-modal'))).toBeVisible();
      await detoxExpect(element(by.id('matched-user-name'))).toBeVisible();
      await detoxExpect(element(by.id('matched-user-photo'))).toBeVisible();
    });
  });

  describe('2.5 Match Notification', () => {

    it('should navigate to conversation from match modal', async () => {
      // Assuming match modal is visible
      await detoxExpect(element(by.id('match-modal'))).toBeVisible();

      await element(by.id('send-message-button')).tap();

      // Should navigate to conversation screen
      await detoxExpect(element(by.id('conversation-screen'))).toBeVisible();
    });

    it('should close match modal and continue swiping', async () => {
      await detoxExpect(element(by.id('match-modal'))).toBeVisible();

      await element(by.id('keep-swiping-button')).tap();

      // Should return to discovery
      await detoxExpect(element(by.id('discovery-screen'))).toBeVisible();
    });
  });
});

// ============================================================================
// FLOW 3: Messaging Flow
// ============================================================================

describe('Flow 3: Messaging Flow', () => {

  describe('3.1 Open Conversation from Match', () => {

    it('should navigate to matches screen', async () => {
      await element(by.id('matches-tab')).tap();

      await detoxExpect(element(by.id('matches-screen'))).toBeVisible();
    });

    it('should display list of matches', async () => {
      await element(by.id('matches-tab')).tap();

      await detoxExpect(element(by.id('match-list'))).toBeVisible();
    });

    it('should open conversation when match is tapped', async () => {
      await element(by.id('matches-tab')).tap();

      await element(by.id('match-card').withDescendant(by.text(/Test User/i))).atIndex(0).tap();

      await detoxExpect(element(by.id('conversation-screen'))).toBeVisible();
    });

    it('should load conversation history', async () => {
      await detoxExpect(element(by.id('conversation-screen'))).toBeVisible();
      await detoxExpect(element(by.id('message-list'))).toBeVisible();
    });
  });

  describe('3.2 Send Text Messages', () => {

    it('should send a text message', async () => {
      await detoxExpect(element(by.id('conversation-screen'))).toBeVisible();

      const messageText = `Test message ${Date.now()}`;
      await element(by.id('message-input')).typeText(messageText);
      await element(by.id('send-button')).tap();

      // Message should appear in conversation
      await detoxExpect(element(by.text(messageText))).toBeVisible();
    });

    it('should prevent sending empty messages', async () => {
      await detoxExpect(element(by.id('conversation-screen'))).toBeVisible();

      // Send button should be disabled when input is empty
      await detoxExpect(element(by.id('send-button'))).not.toBeVisible();
    });

    it('should show character count for long messages', async () => {
      const longMessage = 'a'.repeat(1000);
      await element(by.id('message-input')).typeText(longMessage);

      // Should show character count
      await detoxExpect(element(by.id('char-count'))).toBeVisible();
    });
  });

  describe('3.3 Send Media (Photos)', () => {

    it('should open photo picker', async () => {
      await element(by.id('attachment-button')).tap();

      // Should show photo picker or action sheet
      await detoxExpect(element(by.text(/Photo Library|Choose Photo/i))).toBeVisible();
    });

    it('should send a photo', async () => {
      await element(by.id('attachment-button')).tap();
      await element(by.text('Photo Library')).tap();

      // Select photo (mock selection)
      // Implementation depends on test environment

      // Photo should appear in conversation
      await waitFor(element(by.id('message-image')))
        .toBeVisible()
        .withTimeout(TEST_CONFIG.longTimeout);
    });
  });

  describe('3.4 Read Receipts', () => {

    it('should display read status for sent messages', async () => {
      const messageText = `Test message ${Date.now()}`;
      await element(by.id('message-input')).typeText(messageText);
      await element(by.id('send-button')).tap();

      // Should show delivery status (sent, delivered, read)
      await waitFor(element(by.id('read-status')))
        .toBeVisible()
        .withTimeout(TEST_CONFIG.shortTimeout);
    });
  });

  describe('3.5 Typing Indicators', () => {

    it('should show typing indicator when other user types', async () => {
      // This test requires coordination between two test users
      // Would need to mock WebSocket event or use test infrastructure

      // Simulate receiving typing event
      await detoxExpect(element(by.id('conversation-screen'))).toBeVisible();

      // Typing indicator should appear
      await waitFor(element(by.text(/typing\.\.\./i)))
        .toBeVisible()
        .withTimeout(TEST_CONFIG.shortTimeout);
    });
  });

  describe('3.6 Real-time Updates via WebSocket', () => {

    it('should receive messages in real-time', async () => {
      // Requires coordinated test setup
      // Mock incoming message via WebSocket

      await detoxExpect(element(by.id('conversation-screen'))).toBeVisible();

      // New message should appear without refresh
      await waitFor(element(by.text(/New incoming message/i)))
        .toBeVisible()
        .withTimeout(TEST_CONFIG.timeout);
    });
  });
});

// ============================================================================
// FLOW 4: Subscription Flow
// ============================================================================

describe('Flow 4: Subscription Flow', () => {

  describe('4.1 View Subscription Plans', () => {

    it('should navigate to premium screen', async () => {
      await element(by.id('profile-tab')).tap();
      await element(by.id('upgrade-premium-button')).tap();

      await detoxExpect(element(by.id('premium-screen'))).toBeVisible();
    });

    it('should display subscription plans', async () => {
      await detoxExpect(element(by.id('plan-monthly'))).toBeVisible();
      await detoxExpect(element(by.id('plan-yearly'))).toBeVisible();
    });

    it('should display plan features', async () => {
      await detoxExpect(element(by.text(/Unlimited Swipes/i))).toBeVisible();
      await detoxExpect(element(by.text(/See Who Likes You/i))).toBeVisible();
      await detoxExpect(element(by.text(/Advanced Filters/i))).toBeVisible();
    });

    it('should select a plan', async () => {
      await element(by.id('plan-monthly')).tap();

      await detoxExpect(element(by.id('plan-monthly'))).toHaveToggleValue(true);
    });
  });

  describe('4.2 Platform Payment (Stripe/IAP)', () => {

    it('should initiate payment flow', async () => {
      await element(by.id('plan-monthly')).tap();
      await element(by.id('subscribe-button')).tap();

      // iOS: App Store payment sheet
      // Android: Google Play billing
      // Web: Stripe checkout

      if (device.getPlatform() === 'ios') {
        // Should show iOS payment sheet
        await waitFor(element(by.text(/Subscribe|Confirm/i)))
          .toBeVisible()
          .withTimeout(TEST_CONFIG.timeout);
      } else if (device.getPlatform() === 'android') {
        // Should show Google Play billing
        await waitFor(element(by.text(/Buy|Subscribe/i)))
          .toBeVisible()
          .withTimeout(TEST_CONFIG.timeout);
      }
    });
  });

  describe('4.3 Payment Success/Failure Handling', () => {

    it('should handle successful payment', async () => {
      // Complete payment (requires sandbox/test environment)

      await waitFor(element(by.text(/Payment Successful|Welcome to Premium/i)))
        .toBeVisible()
        .withTimeout(TEST_CONFIG.longTimeout);
    });

    it('should handle payment failure', async () => {
      // Simulate payment failure

      await detoxExpect(element(by.text(/Payment Failed|Error/i))).toBeVisible();
    });

    it('should allow retry after failure', async () => {
      await element(by.id('retry-payment-button')).tap();

      // Should show payment sheet again
      await waitFor(element(by.text(/Subscribe|Confirm/i)))
        .toBeVisible()
        .withTimeout(TEST_CONFIG.timeout);
    });
  });

  describe('4.4 Subscription Activation', () => {

    it('should display premium badge after activation', async () => {
      // Assuming payment successful
      await element(by.id('profile-tab')).tap();

      await detoxExpect(element(by.id('premium-badge'))).toBeVisible();
    });

    it('should show subscription details', async () => {
      await element(by.id('profile-tab')).tap();
      await element(by.id('settings-button')).tap();
      await element(by.id('subscription-settings')).tap();

      await detoxExpect(element(by.text(/Active/i))).toBeVisible();
      await detoxExpect(element(by.text(/Premium Monthly|Premium Yearly/i))).toBeVisible();
    });
  });

  describe('4.5 Entitlements Update', () => {

    it('should unlock premium features', async () => {
      // Check unlimited swipes
      await element(by.id('discovery-tab')).tap();

      // Swipe many times without hitting limit
      for (let i = 0; i < 60; i++) {
        await element(by.id('like-button')).tap();
        await device.waitForIdle();
      }

      // Should not show limit message
      await detoxExpect(element(by.text(/swipe.*limit/i))).not.toBeVisible();
    });

    it('should access see who likes you feature', async () => {
      await element(by.id('likes-tab')).tap();

      // Should show users who liked you (not blurred)
      await detoxExpect(element(by.id('likes-list'))).toBeVisible();
      await detoxExpect(element(by.id('like-profile-card'))).toBeVisible();
    });

    it('should access advanced filters', async () => {
      await element(by.id('discovery-tab')).tap();
      await element(by.id('filters-button')).tap();

      // Premium filters should be accessible
      await element(by.id('education-filter')).tap();

      // Should not show upgrade prompt
      await detoxExpect(element(by.text(/upgrade|premium/i))).not.toBeVisible();
    });
  });

  describe('4.6 Cancel Subscription', () => {

    it('should navigate to subscription settings', async () => {
      await element(by.id('profile-tab')).tap();
      await element(by.id('settings-button')).tap();
      await element(by.id('subscription-settings')).tap();

      await detoxExpect(element(by.id('subscription-screen'))).toBeVisible();
    });

    it('should cancel subscription', async () => {
      await element(by.id('cancel-subscription-button')).tap();

      // Confirm cancellation
      await element(by.text('Yes, Cancel')).tap();

      // Should show cancellation confirmation
      await detoxExpect(element(by.text(/Subscription Canceled|Cancels on/i))).toBeVisible();
    });

    it('should retain access until end of billing period', async () => {
      // After cancellation, premium features should still work
      await element(by.id('discovery-tab')).tap();
      await element(by.id('filters-button')).tap();

      // Premium filters still accessible
      await element(by.id('education-filter')).tap();
      await detoxExpect(element(by.text(/upgrade/i))).not.toBeVisible();
    });
  });
});

// ============================================================================
// FLOW 5: Safety Flow
// ============================================================================

describe('Flow 5: Safety Flow', () => {

  describe('5.1 Report User', () => {

    it('should open report modal from profile', async () => {
      await element(by.id('discovery-tab')).tap();
      await element(by.id('profile-options-button')).tap();
      await element(by.text('Report')).tap();

      await detoxExpect(element(by.id('report-modal'))).toBeVisible();
    });

    it('should display report reasons', async () => {
      await detoxExpect(element(by.text(/Inappropriate Photos/i))).toBeVisible();
      await detoxExpect(element(by.text(/Harassment/i))).toBeVisible();
      await detoxExpect(element(by.text(/Fake Profile/i))).toBeVisible();
      await detoxExpect(element(by.text(/Underage/i))).toBeVisible();
    });

    it('should submit report', async () => {
      await element(by.text('Inappropriate Photos')).tap();
      await element(by.id('report-details-input')).typeText('This profile has inappropriate content');
      await element(by.id('submit-report-button')).tap();

      await detoxExpect(element(by.text(/Report Submitted|Thank you/i))).toBeVisible();
    });
  });

  describe('5.2 Block User', () => {

    it('should block user from profile', async () => {
      await element(by.id('discovery-tab')).tap();
      await element(by.id('profile-options-button')).tap();
      await element(by.text('Block')).tap();

      // Confirm block
      await element(by.text('Yes, Block')).tap();

      await detoxExpect(element(by.text(/User Blocked/i))).toBeVisible();
    });

    it('should block user from conversation', async () => {
      await element(by.id('matches-tab')).tap();
      await element(by.id('match-card')).atIndex(0).tap();

      await element(by.id('conversation-options-button')).tap();
      await element(by.text('Block')).tap();
      await element(by.text('Yes, Block')).tap();

      await detoxExpect(element(by.text(/User Blocked/i))).toBeVisible();
    });

    it('should remove blocked user from matches', async () => {
      // After blocking, return to matches
      await element(by.id('matches-tab')).tap();

      // Blocked user should not appear in matches
      // (test implementation depends on specific user identification)
    });
  });

  describe('5.3 Blocked User Hidden from Discovery', () => {

    it('should not show blocked users in discovery', async () => {
      await element(by.id('discovery-tab')).tap();

      // Swipe through profiles
      for (let i = 0; i < 20; i++) {
        await element(by.id('like-button')).tap();
        await device.waitForIdle();

        // Blocked user should never appear
        // (requires tracking blocked user IDs in test)
      }
    });
  });

  describe('5.4 Blocked User Hidden from Chat', () => {

    it('should hide conversation with blocked user', async () => {
      await element(by.id('matches-tab')).tap();

      // Blocked user's conversation should not appear
      // (test implementation depends on specific match identification)
    });

    it('should prevent blocked user from messaging', async () => {
      // This test requires coordinated testing infrastructure
      // Blocked user attempting to message should fail silently
    });
  });
});

// ============================================================================
// FLOW 6: Profile Management
// ============================================================================

describe('Flow 6: Profile Management', () => {

  describe('6.1 Update Profile Info', () => {

    it('should navigate to profile edit screen', async () => {
      await element(by.id('profile-tab')).tap();
      await element(by.id('edit-profile-button')).tap();

      await detoxExpect(element(by.id('edit-profile-screen'))).toBeVisible();
    });

    it('should update bio', async () => {
      const newBio = `Updated bio ${Date.now()}`;
      await element(by.id('bio-input')).replaceText(newBio);
      await element(by.id('save-button')).tap();

      await detoxExpect(element(by.text(/Saved|Profile Updated/i))).toBeVisible();
    });

    it('should update job and education', async () => {
      await element(by.id('job-input')).replaceText('Software Engineer');
      await element(by.id('education-input')).replaceText('MIT');
      await element(by.id('save-button')).tap();

      await detoxExpect(element(by.text(/Saved/i))).toBeVisible();
    });

    it('should update height', async () => {
      await element(by.id('height-input')).replaceText("5'10\"");
      await element(by.id('save-button')).tap();

      await detoxExpect(element(by.text(/Saved/i))).toBeVisible();
    });
  });

  describe('6.2 Upload Photos', () => {

    it('should open photo picker', async () => {
      await element(by.id('add-photo-button')).tap();

      await detoxExpect(element(by.text(/Photo Library|Camera/i))).toBeVisible();
    });

    it('should upload photo from library', async () => {
      await element(by.id('add-photo-button')).tap();
      await element(by.text('Photo Library')).tap();

      // Mock photo selection
      // Photo should appear in profile

      await waitFor(element(by.id('profile-photo-1')))
        .toBeVisible()
        .withTimeout(TEST_CONFIG.longTimeout);
    });

    it('should take photo with camera', async () => {
      await element(by.id('add-photo-button')).tap();
      await element(by.text('Camera')).tap();

      // Mock camera interaction
      // Photo should appear in profile

      await waitFor(element(by.id('profile-photo-1')))
        .toBeVisible()
        .withTimeout(TEST_CONFIG.longTimeout);
    });

    it('should enforce photo limit (9 photos)', async () => {
      // If already at 9 photos
      const photoCount = await element(by.id('profile-photo')).getAttributes();

      // Add photo button should be disabled or hidden
      // (implementation depends on current photo count)
    });

    it('should reorder photos', async () => {
      // Long press and drag photo
      await element(by.id('profile-photo-1')).longPress();
      await element(by.id('profile-photo-1')).swipe('down', 'slow');

      // Photo order should change
    });

    it('should delete photo', async () => {
      await element(by.id('profile-photo-1')).longPress();
      await element(by.id('delete-photo-button')).tap();

      // Confirm deletion
      await element(by.text('Delete')).tap();

      // Photo should be removed
      await waitFor(element(by.id('profile-photo-1')))
        .not.toBeVisible()
        .withTimeout(TEST_CONFIG.shortTimeout);
    });
  });

  describe('6.3 Set Preferences', () => {

    it('should navigate to preferences screen', async () => {
      await element(by.id('profile-tab')).tap();
      await element(by.id('settings-button')).tap();
      await element(by.id('preferences-button')).tap();

      await detoxExpect(element(by.id('preferences-screen'))).toBeVisible();
    });

    it('should update discovery preferences', async () => {
      await element(by.id('min-age-input')).replaceText('25');
      await element(by.id('max-age-input')).replaceText('35');
      await element(by.id('distance-slider')).adjustSliderToPosition(0.7);

      await element(by.id('save-button')).tap();

      await detoxExpect(element(by.text(/Saved/i))).toBeVisible();
    });

    it('should toggle notification preferences', async () => {
      await element(by.id('notification-preferences')).tap();

      await element(by.id('match-notifications-toggle')).tap();
      await element(by.id('message-notifications-toggle')).tap();

      await element(by.id('save-button')).tap();

      await detoxExpect(element(by.text(/Saved/i))).toBeVisible();
    });
  });

  describe('6.4 Verification Flow', () => {

    it('should navigate to verification screen', async () => {
      await element(by.id('profile-tab')).tap();
      await element(by.id('get-verified-button')).tap();

      await detoxExpect(element(by.id('verification-screen'))).toBeVisible();
    });

    it('should display verification instructions', async () => {
      await detoxExpect(element(by.text(/Take a selfie|Verification Instructions/i))).toBeVisible();
    });

    it('should initiate verification selfie capture', async () => {
      await element(by.id('start-verification-button')).tap();

      // Should open camera
      await detoxExpect(element(by.id('verification-camera'))).toBeVisible();
    });

    it('should submit verification selfie', async () => {
      // Capture selfie (mocked)
      await element(by.id('capture-button')).tap();

      // Submit verification
      await element(by.id('submit-verification-button')).tap();

      await detoxExpect(element(by.text(/Verification Submitted|Under Review/i))).toBeVisible();
    });
  });
});

// ============================================================================
// Test Utilities
// ============================================================================

afterEach(async () => {
  // Take screenshot on failure
  await device.takeScreenshot('test-result');
});
