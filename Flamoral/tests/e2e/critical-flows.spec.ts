/**
 * E2E Tests for Critical User Flows
 * Tests complete user journeys across multiple services
 */

import { test, expect } from '@playwright/test';

/**
 * Flow 1: User Registration → Onboarding → First Swipe
 * Critical Path: New user signs up and starts dating
 */
test.describe('Registration to First Swipe Flow', () => {
  test('complete user journey from registration to first swipe', async ({ page }) => {
    // Generate unique test user email
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    // Step 1: Navigate to app
    await page.goto('/');
    await expect(page).toHaveTitle(/Flamoral/);

    // Step 2: Click "Get Started" or "Sign Up"
    await page.click('text=Get Started');

    // Step 3: Fill registration form
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="first_name"]', 'Test');
    await page.fill('input[name="last_name"]', 'User');
    await page.fill('input[name="date_of_birth"]', '1995-06-15');
    await page.selectOption('select[name="gender"]', 'male');

    // Step 4: Submit registration
    await page.click('button[type="submit"]');

    // Step 5: Verify redirect to email verification page
    await expect(page).toHaveURL(/verify-email/);
    await expect(page.locator('text=Check your email')).toBeVisible();

    // Step 6: Simulate email verification (in test environment)
    // In real flow, user would click link in email
    const verificationToken = await getVerificationTokenFromDatabase(testEmail);
    await page.goto(`/verify-email?token=${verificationToken}`);
    await expect(page.locator('text=Email verified')).toBeVisible();

    // Step 7: Redirect to profile setup
    await expect(page).toHaveURL(/onboarding/);

    // Step 8: Upload profile photos
    await page.setInputFiles('input[type="file"]', [
      'test-data/profile-photo-1.jpg',
      'test-data/profile-photo-2.jpg',
    ]);
    await expect(page.locator('.photo-preview')).toHaveCount(2);

    // Step 9: Fill bio and interests
    await page.fill('textarea[name="bio"]', 'Love hiking and coffee!');
    await page.click('button:has-text("Travel")'); // Select interest
    await page.click('button:has-text("Fitness")'); // Select interest
    await page.click('button:has-text("Coffee")'); // Select interest

    // Step 10: Set preferences
    await page.click('text=Next');
    await page.selectOption('select[name="looking_for"]', 'female');
    await page.fill('input[name="age_min"]', '25');
    await page.fill('input[name="age_max"]', '35');
    await page.fill('input[name="distance"]', '50');

    // Step 11: Complete onboarding
    await page.click('button:has-text("Start Dating")');

    // Step 12: Verify redirect to discovery page
    await expect(page).toHaveURL(/discovery/);
    await expect(page.locator('.profile-card')).toBeVisible();

    // Step 13: Perform first swipe
    const firstProfile = page.locator('.profile-card').first();
    await expect(firstProfile).toBeVisible();

    // Read the profile
    await expect(firstProfile.locator('.profile-name')).toBeVisible();
    await expect(firstProfile.locator('.profile-age')).toBeVisible();

    // Swipe right (like)
    await page.click('button.like-button');

    // Step 14: Verify swipe was processed
    await expect(page.locator('.next-profile-card')).toBeVisible();

    // Step 15: Verify analytics tracking
    const swipeEvent = await getAnalyticsEvent('first_swipe', testEmail);
    expect(swipeEvent).toBeTruthy();
  });

  test('should handle verification email resend', async ({ page }) => {
    const testEmail = `test-resend-${Date.now()}@example.com`;

    // Register user
    await page.goto('/signup');
    await fillRegistrationForm(page, testEmail);
    await page.click('button[type="submit"]');

    // On verification page, click resend
    await expect(page).toHaveURL(/verify-email/);
    await page.click('text=Resend email');

    // Verify success message
    await expect(page.locator('text=Email sent')).toBeVisible();
  });

  test('should prevent underage registration', async ({ page }) => {
    await page.goto('/signup');

    const underageDate = new Date();
    underageDate.setFullYear(underageDate.getFullYear() - 17);

    await page.fill('input[name="email"]', 'underage@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.fill('input[name="first_name"]', 'Teen');
    await page.fill('input[name="last_name"]', 'User');
    await page.fill('input[name="date_of_birth"]', underageDate.toISOString().split('T')[0]);
    await page.selectOption('select[name="gender"]', 'male');

    await page.click('button[type="submit"]');

    // Verify error message
    await expect(page.locator('text=18 years old')).toBeVisible();
    await expect(page).toHaveURL(/signup/);
  });
});

/**
 * Flow 2: Match → Message → Video Call
 * Critical Path: Users match and communicate
 */
test.describe('Match to Video Call Flow', () => {
  let user1Token: string;
  let user2Token: string;

  test.beforeEach(async () => {
    // Create two test users
    user1Token = await createTestUser({ gender: 'male', lookingFor: 'female' });
    user2Token = await createTestUser({ gender: 'female', lookingFor: 'male' });
  });

  test('complete flow from match to video call', async ({ page, context }) => {
    // Open two browser contexts for both users
    const user1Page = page;
    const user2Page = await context.newPage();

    // User 1 logs in
    await user1Page.goto('/login');
    await loginWithToken(user1Page, user1Token);

    // User 2 logs in
    await user2Page.goto('/login');
    await loginWithToken(user2Page, user2Token);

    // Both users navigate to discovery
    await user1Page.goto('/discovery');
    await user2Page.goto('/discovery');

    // User 1 swipes right on User 2
    await user1Page.click('button.like-button');

    // User 2 swipes right on User 1 - creates match
    await user2Page.click('button.like-button');

    // Both users should see match notification
    await expect(user1Page.locator('.match-notification')).toBeVisible({ timeout: 5000 });
    await expect(user2Page.locator('.match-notification')).toBeVisible({ timeout: 5000 });

    // User 2 (woman) can send first message
    await user2Page.click('text=Send Message');
    await user2Page.fill('textarea[name="message"]', 'Hi! How are you?');
    await user2Page.click('button:has-text("Send")');

    // User 1 receives message in real-time
    await expect(user1Page.locator('text=Hi! How are you?')).toBeVisible({ timeout: 3000 });

    // User 1 can now reply
    await user1Page.fill('textarea[name="message"]', "Hi! I'm great, thanks!");
    await user1Page.click('button:has-text("Send")');

    // User 2 receives reply
    await expect(user2Page.locator("text=I'm great, thanks!")).toBeVisible({ timeout: 3000 });

    // Exchange a few more messages
    await user2Page.fill('textarea[name="message"]', 'Would you like to video chat?');
    await user2Page.click('button:has-text("Send")');

    await user1Page.fill('textarea[name="message"]', 'Sure! Let me start a call');
    await user1Page.click('button:has-text("Send")');

    // User 1 initiates video call
    await user1Page.click('button.video-call-button');

    // User 2 sees incoming call
    await expect(user2Page.locator('.incoming-call-modal')).toBeVisible({ timeout: 5000 });
    await expect(user2Page.locator('text=Incoming video call')).toBeVisible();

    // User 2 accepts call
    await user2Page.click('button:has-text("Accept")');

    // Both users should be in video call
    await expect(user1Page.locator('.video-call-active')).toBeVisible({ timeout: 10000 });
    await expect(user2Page.locator('.video-call-active')).toBeVisible({ timeout: 10000 });

    // Verify video elements
    await expect(user1Page.locator('video.local-video')).toBeVisible();
    await expect(user1Page.locator('video.remote-video')).toBeVisible();

    // End call
    await user1Page.click('button.end-call-button');

    // Verify call ended for both users
    await expect(user1Page.locator('.video-call-active')).not.toBeVisible();
    await expect(user2Page.locator('.video-call-active')).not.toBeVisible();
  });

  test('should enforce women-first messaging rule', async ({ page }) => {
    const maleToken = await createTestUser({ gender: 'male' });
    const femaleToken = await createTestUser({ gender: 'female' });

    // Create a match between them
    await createMatch(maleToken, femaleToken);

    // Male user tries to message first
    await page.goto('/login');
    await loginWithToken(page, maleToken);
    await page.goto('/matches');
    await page.click('.match-card');

    // Message input should be disabled
    const messageInput = page.locator('textarea[name="message"]');
    await expect(messageInput).toBeDisabled();
    await expect(page.locator('text=waiting for her to send the first message')).toBeVisible();
  });
});

/**
 * Flow 3: Purchase Subscription → Feature Unlock
 * Critical Path: User upgrades to premium
 */
test.describe('Premium Purchase Flow', () => {
  let userToken: string;

  test.beforeEach(async () => {
    userToken = await createTestUser();
  });

  test('complete premium subscription purchase', async ({ page }) => {
    // Login
    await page.goto('/login');
    await loginWithToken(page, userToken);

    // Navigate to premium page
    await page.click('text=Go Premium');
    await expect(page).toHaveURL(/premium/);

    // Verify premium features are displayed
    await expect(page.locator('text=Unlimited Swipes')).toBeVisible();
    await expect(page.locator('text=See Who Likes You')).toBeVisible();
    await expect(page.locator('text=Advanced Filters')).toBeVisible();

    // Select monthly plan
    await page.click('.plan-card.monthly');
    await expect(page.locator('.plan-card.monthly.selected')).toBeVisible();

    // Click purchase
    await page.click('button:has-text("Continue")');

    // Fill payment information (using Stripe test card)
    const stripeIframe = page.frameLocator('iframe[name*="stripe"]');
    await stripeIframe.locator('[placeholder="Card number"]').fill('4242424242424242');
    await stripeIframe.locator('[placeholder="MM / YY"]').fill('12/25');
    await stripeIframe.locator('[placeholder="CVC"]').fill('123');
    await stripeIframe.locator('[placeholder="ZIP"]').fill('12345');

    // Submit payment
    await page.click('button:has-text("Subscribe")');

    // Wait for payment processing
    await expect(page.locator('.processing-payment')).toBeVisible();

    // Verify success
    await expect(page.locator('text=Welcome to Premium!')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/premium/success/);

    // Verify premium badge
    await page.goto('/profile');
    await expect(page.locator('.premium-badge')).toBeVisible();

    // Verify premium features are unlocked
    await page.goto('/discovery');
    await page.click('button.filters-button');
    await expect(page.locator('.advanced-filters')).toBeVisible();

    // Verify "See Who Likes You" feature
    await page.goto('/likes');
    await expect(page.locator('.liked-by-profile')).toBeVisible();
  });

  test('should handle payment failure gracefully', async ({ page }) => {
    await page.goto('/login');
    await loginWithToken(page, userToken);

    await page.goto('/premium');
    await page.click('.plan-card.monthly');
    await page.click('button:has-text("Continue")');

    // Use declined test card
    const stripeIframe = page.frameLocator('iframe[name*="stripe"]');
    await stripeIframe.locator('[placeholder="Card number"]').fill('4000000000000002');
    await stripeIframe.locator('[placeholder="MM / YY"]').fill('12/25');
    await stripeIframe.locator('[placeholder="CVC"]').fill('123');

    await page.click('button:has-text("Subscribe")');

    // Verify error message
    await expect(page.locator('text=Your card was declined')).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/premium/);
  });

  test('should allow subscription cancellation', async ({ page }) => {
    // First purchase premium
    await purchasePremium(userToken);

    // Login and navigate to settings
    await page.goto('/login');
    await loginWithToken(page, userToken);
    await page.goto('/settings/subscription');

    // Verify active subscription
    await expect(page.locator('text=Premium Monthly')).toBeVisible();
    await expect(page.locator('text=Active')).toBeVisible();

    // Cancel subscription
    await page.click('button:has-text("Cancel Subscription")');

    // Confirm cancellation
    await expect(page.locator('.cancel-confirmation-modal')).toBeVisible();
    await page.click('button:has-text("Yes, Cancel")');

    // Verify cancellation scheduled
    await expect(page.locator('text=Cancels on')).toBeVisible();
    await expect(page.locator('text=Your premium features will remain active until')).toBeVisible();
  });
});

/**
 * Flow 4: Report User → Moderation → Resolution
 * Critical Path: Safety and moderation workflow
 */
test.describe('User Report and Moderation Flow', () => {
  let reporterToken: string;
  let reportedUserToken: string;

  test.beforeEach(async () => {
    reporterToken = await createTestUser();
    reportedUserToken = await createTestUser();
  });

  test('complete user report and moderation flow', async ({ page, context }) => {
    // Login as reporter
    await page.goto('/login');
    await loginWithToken(page, reporterToken);

    // Navigate to reported user's profile
    await page.goto(`/profile/${await getUserIdFromToken(reportedUserToken)}`);

    // Open report modal
    await page.click('button.more-options');
    await page.click('text=Report');

    // Fill report form
    await expect(page.locator('.report-modal')).toBeVisible();
    await page.click('text=Inappropriate Photos');
    await page.fill('textarea[name="details"]', 'Profile photo contains inappropriate content');
    await page.click('button:has-text("Submit Report")');

    // Verify success message
    await expect(page.locator('text=Report submitted')).toBeVisible();
    await expect(page.locator('.report-modal')).not.toBeVisible();

    // Login as moderator
    const moderatorPage = await context.newPage();
    const moderatorToken = await createModerator();
    await moderatorPage.goto('/moderator/login');
    await loginWithToken(moderatorPage, moderatorToken);

    // Navigate to moderation queue
    await moderatorPage.goto('/moderator/reports');

    // Verify report appears in queue
    await expect(moderatorPage.locator('.report-card')).toBeVisible();
    await expect(moderatorPage.locator('text=Inappropriate Photos')).toBeVisible();

    // Review report
    await moderatorPage.click('.report-card');

    // Verify report details
    await expect(moderatorPage.locator('text=Inappropriate Photos')).toBeVisible();
    await expect(moderatorPage.locator('text=inappropriate content')).toBeVisible();

    // View reported user's profile
    await expect(moderatorPage.locator('.reported-profile')).toBeVisible();

    // Take action: Remove photo and warn user
    await moderatorPage.click('button:has-text("Remove Photo")');
    await moderatorPage.click('button:has-text("Warn User")');
    await moderatorPage.fill('textarea[name="warning_message"]', 'Inappropriate content removed');
    await moderatorPage.click('button:has-text("Send Warning")');

    // Resolve report
    await moderatorPage.click('button:has-text("Resolve")');

    // Verify report is resolved
    await expect(moderatorPage.locator('.report-card.resolved')).toBeVisible();

    // Verify reported user receives warning
    const reportedUserPage = await context.newPage();
    await reportedUserPage.goto('/login');
    await loginWithToken(reportedUserPage, reportedUserToken);

    await expect(reportedUserPage.locator('.warning-modal')).toBeVisible({ timeout: 5000 });
    await expect(reportedUserPage.locator('text=Inappropriate content removed')).toBeVisible();
  });

  test('should suspend user for severe violations', async ({ page, context }) => {
    // Create multiple reports against user
    await createReport(reportedUserToken, 'Harassment');
    await createReport(reportedUserToken, 'Hate Speech');
    await createReport(reportedUserToken, 'Spam');

    // Login as moderator
    const moderatorToken = await createModerator();
    await page.goto('/moderator/login');
    await loginWithToken(page, moderatorToken);

    await page.goto('/moderator/reports');

    // Review reports and suspend account
    await page.click('.report-card:has-text("Harassment")');
    await page.click('button:has-text("Suspend Account")');
    await page.selectOption('select[name="suspension_duration"]', '30');
    await page.click('button:has-text("Confirm Suspension")');

    // Verify suspension
    await expect(page.locator('text=Account suspended')).toBeVisible();

    // Verify user cannot login
    const reportedUserPage = await context.newPage();
    await reportedUserPage.goto('/login');
    await loginWithToken(reportedUserPage, reportedUserToken);

    await expect(reportedUserPage.locator('text=Account suspended')).toBeVisible();
    await expect(reportedUserPage).toHaveURL(/suspended/);
  });
});

// Helper functions
async function createTestUser(options?: any): Promise<string> {
  // Mock function - implement API call
  return 'test-token';
}

async function getVerificationTokenFromDatabase(email: string): Promise<string> {
  // Mock function - implement database query
  return 'verification-token';
}

async function getAnalyticsEvent(eventName: string, userId: string): Promise<any> {
  // Mock function - implement analytics check
  return {};
}

async function fillRegistrationForm(page: any, email: string) {
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', 'TestPassword123!');
  await page.fill('input[name="first_name"]', 'Test');
  await page.fill('input[name="last_name"]', 'User');
  await page.fill('input[name="date_of_birth"]', '1995-06-15');
  await page.selectOption('select[name="gender"]', 'male');
}

async function loginWithToken(page: any, token: string) {
  // Mock function - implement token-based login
}

async function createMatch(user1Token: string, user2Token: string) {
  // Mock function - create match between users
}

async function purchasePremium(userToken: string) {
  // Mock function - purchase premium subscription
}

async function getUserIdFromToken(token: string): Promise<string> {
  // Mock function - extract user ID from token
  return 'user-id';
}

async function createModerator(): Promise<string> {
  // Mock function - create moderator account
  return 'moderator-token';
}

async function createReport(userToken: string, reason: string) {
  // Mock function - create user report
}
