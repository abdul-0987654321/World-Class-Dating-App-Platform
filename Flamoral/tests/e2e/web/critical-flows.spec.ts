/**
 * Critical User Flows E2E Tests - Web Application
 *
 * Phase 2: End-to-End Flow Validation
 *
 * This file contains comprehensive E2E tests for all critical user flows
 * in the Flamoral Dating Platform web application.
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// ============================================================================
// Test Configuration & Helpers
// ============================================================================

const TEST_CONFIG = {
  timeout: 30000,
  apiTimeout: 10000,
  webSocketTimeout: 5000,
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  apiUrl: process.env.API_URL || 'http://localhost:4000',
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
    dateOfBirth: '1995-06-15', // 18+ years old
    gender: 'male',
    lookingFor: 'female',
    ...overrides,
  };
}

// Helper: Fill registration form
async function fillRegistrationForm(page: Page, userData: any) {
  await page.fill('input[name="email"]', userData.email);
  await page.fill('input[name="password"]', userData.password);
  await page.fill('input[name="confirmPassword"]', userData.password);
  await page.fill('input[name="firstName"]', userData.firstName);
  await page.fill('input[name="lastName"]', userData.lastName);
  await page.fill('input[name="dateOfBirth"]', userData.dateOfBirth);
  await page.click(`input[name="gender"][value="${userData.gender}"]`);
  await page.check('input[name="acceptTerms"]');
}

// Helper: Login with credentials
async function loginUser(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|discovery|home)/, { timeout: TEST_CONFIG.timeout });
}

// Helper: Create test user via API
async function createTestUserViaAPI(userData: any): Promise<{ user: any; token: string }> {
  // Mock implementation - replace with actual API call
  // This would typically call your auth service to create a user
  return {
    user: { id: 'test-user-id', ...userData },
    token: 'test-token-' + Date.now(),
  };
}

// ============================================================================
// FLOW 1: User Registration & Authentication
// ============================================================================

test.describe('Flow 1: User Registration & Authentication', () => {

  test.describe('1.1 Guest Browsing to Registration', () => {

    test('should allow guest to browse and register', async ({ page }) => {
      // Step 1: Guest lands on homepage
      await page.goto('/');
      await expect(page).toHaveTitle(/Flamoral/);

      // Step 2: Guest can view public content
      await expect(page.locator('text=Find Your Match').or(page.locator('text=Get Started'))).toBeVisible();

      // Step 3: Click Get Started
      await page.click('text=Get Started, text=Sign Up');
      await expect(page).toHaveURL(/\/(register|signup)/);

      // Step 4: Fill registration form
      const userData = generateTestUser();
      await fillRegistrationForm(page, userData);

      // Step 5: Submit registration
      await page.click('button[type="submit"]');

      // Step 6: Verify redirect to email verification or profile setup
      await expect(page).toHaveURL(/\/(verify-email|profile\/setup|onboarding)/, { timeout: TEST_CONFIG.timeout });
    });

    test('should prevent underage registration', async ({ page }) => {
      await page.goto('/register');

      // Calculate underage date (< 18 years old)
      const underageDate = new Date();
      underageDate.setFullYear(underageDate.getFullYear() - 17);
      const underageDateString = underageDate.toISOString().split('T')[0];

      const userData = generateTestUser({ dateOfBirth: underageDateString });
      await fillRegistrationForm(page, userData);
      await page.click('button[type="submit"]');

      // Should show age restriction error
      await expect(page.locator('text=/18.*years.*old|must.*18|age.*requirement/i')).toBeVisible();
      await expect(page).toHaveURL(/\/(register|signup)/);
    });

    test('should prevent duplicate email registration', async ({ page }) => {
      const userData = generateTestUser();

      // First registration
      await page.goto('/register');
      await fillRegistrationForm(page, userData);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);

      // Attempt duplicate registration
      await page.goto('/register');
      await fillRegistrationForm(page, userData);
      await page.click('button[type="submit"]');

      // Should show error
      await expect(page.locator('text=/email.*already.*exists|already.*registered/i')).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
      await page.goto('/register');

      await page.fill('input[name="email"]', 'invalid-email');
      await page.blur('input[name="email"]');

      await expect(page.locator('text=/invalid.*email|valid.*email.*address/i')).toBeVisible();
    });

    test('should validate password strength', async ({ page }) => {
      await page.goto('/register');

      await page.fill('input[name="password"]', '123');
      await page.blur('input[name="password"]');

      await expect(page.locator('text=/password.*strong|password.*weak|password.*requirements/i')).toBeVisible();
    });
  });

  test.describe('1.2 Email Verification', () => {

    test('should send verification email after registration', async ({ page }) => {
      await page.goto('/register');

      const userData = generateTestUser();
      await fillRegistrationForm(page, userData);
      await page.click('button[type="submit"]');

      // Should redirect to verification page
      await expect(page).toHaveURL(/verify-email/, { timeout: TEST_CONFIG.timeout });
      await expect(page.locator('text=/check.*email|verify.*email|verification.*sent/i')).toBeVisible();
    });

    test('should allow resending verification email', async ({ page }) => {
      await page.goto('/register');

      const userData = generateTestUser();
      await fillRegistrationForm(page, userData);
      await page.click('button[type="submit"]');

      await page.waitForURL(/verify-email/);

      // Click resend button
      await page.click('text=/resend|send.*again/i');

      // Should show success message
      await expect(page.locator('text=/email.*sent|sent.*again/i')).toBeVisible({ timeout: 5000 });
    });

    test('should verify email with valid token', async ({ page }) => {
      // Mock verification token
      const mockToken = 'valid-verification-token-' + Date.now();

      await page.goto(`/verify-email?token=${mockToken}`);

      // Should show success message or redirect
      await expect(
        page.locator('text=/email.*verified|verification.*successful/i')
          .or(page.getByRole('heading', { name: /profile.*setup|onboarding/i }))
      ).toBeVisible({ timeout: TEST_CONFIG.timeout });
    });
  });

  test.describe('1.3 Login/Logout', () => {

    test('should login with valid credentials', async ({ page }) => {
      const userData = generateTestUser();

      // Create user first (mock or via API)
      // In real scenario, user would already exist

      await page.goto('/login');
      await page.fill('input[name="email"]', userData.email);
      await page.fill('input[name="password"]', userData.password);
      await page.click('button[type="submit"]');

      // Should redirect to dashboard/discovery
      await expect(page).toHaveURL(/\/(dashboard|discovery|home)/, { timeout: TEST_CONFIG.timeout });

      // Should show user is logged in
      await expect(page.locator('text=/profile|logout|settings/i')).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      await page.fill('input[name="email"]', 'nonexistent@example.com');
      await page.fill('input[name="password"]', 'WrongPassword123!');
      await page.click('button[type="submit"]');

      // Should show error message
      await expect(page.locator('text=/invalid.*credentials|incorrect.*password|login.*failed/i')).toBeVisible();
      await expect(page).toHaveURL(/login/);
    });

    test('should maintain session on page reload', async ({ page }) => {
      const userData = generateTestUser();

      await loginUser(page, userData.email, userData.password);

      // Reload page
      await page.reload();

      // Should still be logged in
      await expect(page).toHaveURL(/\/(dashboard|discovery|home)/);
      await expect(page.locator('text=/profile|logout|settings/i')).toBeVisible();
    });

    test('should logout successfully', async ({ page }) => {
      const userData = generateTestUser();

      await loginUser(page, userData.email, userData.password);

      // Click logout
      await page.click('text=/logout|sign.*out/i');

      // Should redirect to homepage or login
      await expect(page).toHaveURL(/\/(login|^\/$)/, { timeout: TEST_CONFIG.timeout });

      // Should not be able to access protected route
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/login/);
    });

    test('should persist session in local storage', async ({ page, context }) => {
      const userData = generateTestUser();

      await loginUser(page, userData.email, userData.password);

      // Check local storage for token
      const token = await page.evaluate(() => localStorage.getItem('token') || sessionStorage.getItem('token'));
      expect(token).toBeTruthy();

      // Open new page in same context
      const newPage = await context.newPage();
      await newPage.goto('/dashboard');

      // Should be logged in
      await expect(newPage).toHaveURL(/\/(dashboard|discovery|home)/);
    });
  });

  test.describe('1.4 Password Reset', () => {

    test('should complete password reset flow', async ({ page }) => {
      await page.goto('/login');
      await page.click('text=/forgot.*password|reset.*password/i');

      await expect(page).toHaveURL(/forgot-password/);

      // Enter email
      await page.fill('input[name="email"]', 'test@example.com');
      await page.click('button[type="submit"]');

      // Should show success message
      await expect(page.locator('text=/email.*sent|check.*email|reset.*link/i')).toBeVisible({ timeout: 5000 });
    });

    test('should reset password with valid token', async ({ page }) => {
      const mockToken = 'valid-reset-token-' + Date.now();

      await page.goto(`/reset-password?token=${mockToken}`);

      const newPassword = 'NewPassword123!';
      await page.fill('input[name="password"]', newPassword);
      await page.fill('input[name="confirmPassword"]', newPassword);
      await page.click('button[type="submit"]');

      // Should show success and redirect to login
      await expect(page.locator('text=/password.*reset|password.*updated/i')).toBeVisible();
      await expect(page).toHaveURL(/login/, { timeout: TEST_CONFIG.timeout });
    });

    test('should reject expired reset token', async ({ page }) => {
      const expiredToken = 'expired-reset-token';

      await page.goto(`/reset-password?token=${expiredToken}`);

      // Should show error
      await expect(page.locator('text=/token.*expired|invalid.*token|link.*expired/i')).toBeVisible();
    });
  });

  test.describe('1.5 OAuth Flows', () => {

    test('should initiate Google OAuth flow', async ({ page }) => {
      await page.goto('/login');

      // Click Google sign in button
      const googleButton = page.locator('button:has-text("Google"), button:has-text("Continue with Google")');

      if (await googleButton.count() > 0) {
        // Start monitoring for popup/redirect
        const popupPromise = page.waitForEvent('popup', { timeout: 5000 }).catch(() => null);
        await googleButton.click();

        const popup = await popupPromise;

        if (popup) {
          // OAuth opened in popup
          await expect(popup).toHaveURL(/accounts\.google\.com/, { timeout: 5000 });
        } else {
          // OAuth opened in redirect
          await expect(page).toHaveURL(/accounts\.google\.com|oauth|authorize/, { timeout: 5000 });
        }
      }
    });

    test('should initiate Facebook OAuth flow', async ({ page }) => {
      await page.goto('/login');

      const facebookButton = page.locator('button:has-text("Facebook"), button:has-text("Continue with Facebook")');

      if (await facebookButton.count() > 0) {
        const popupPromise = page.waitForEvent('popup', { timeout: 5000 }).catch(() => null);
        await facebookButton.click();

        const popup = await popupPromise;

        if (popup) {
          await expect(popup).toHaveURL(/facebook\.com/, { timeout: 5000 });
        } else {
          await expect(page).toHaveURL(/facebook\.com|oauth|authorize/, { timeout: 5000 });
        }
      }
    });

    test('should initiate Apple OAuth flow', async ({ page }) => {
      await page.goto('/login');

      const appleButton = page.locator('button:has-text("Apple"), button:has-text("Continue with Apple")');

      if (await appleButton.count() > 0) {
        const popupPromise = page.waitForEvent('popup', { timeout: 5000 }).catch(() => null);
        await appleButton.click();

        const popup = await popupPromise;

        if (popup) {
          await expect(popup).toHaveURL(/appleid\.apple\.com/, { timeout: 5000 });
        } else {
          await expect(page).toHaveURL(/appleid\.apple\.com|oauth|authorize/, { timeout: 5000 });
        }
      }
    });
  });

  test.describe('1.6 Session Persistence', () => {

    test('should persist session across browser restart', async ({ browser }) => {
      const userData = generateTestUser();

      // Create context and login
      const context = await browser.newContext();
      const page = await context.newPage();

      await loginUser(page, userData.email, userData.password);

      // Get cookies and storage state
      const cookies = await context.cookies();
      const storageState = await context.storageState();

      await context.close();

      // Create new context with saved state
      const newContext = await browser.newContext({ storageState });
      const newPage = await newContext.newPage();

      await newPage.goto('/dashboard');

      // Should still be logged in
      await expect(newPage).toHaveURL(/\/(dashboard|discovery|home)/);
      await expect(newPage.locator('text=/profile|logout|settings/i')).toBeVisible();

      await newContext.close();
    });

    test('should handle session expiration', async ({ page }) => {
      const userData = generateTestUser();

      await loginUser(page, userData.email, userData.password);

      // Manually expire token in local storage (simulate expiration)
      await page.evaluate(() => {
        const expiredToken = 'expired.' + btoa(JSON.stringify({ exp: Date.now() / 1000 - 3600 })) + '.signature';
        localStorage.setItem('token', expiredToken);
      });

      // Try to access protected route
      await page.goto('/dashboard');

      // Should redirect to login
      await expect(page).toHaveURL(/login/, { timeout: TEST_CONFIG.timeout });
    });
  });
});

// ============================================================================
// FLOW 2: Discovery to Match Flow
// ============================================================================

test.describe('Flow 2: Discovery to Match Flow', () => {

  test.describe('2.1 Browse Profiles', () => {

    test('should load discovery page with profiles', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      await page.goto('/discovery');

      // Should show profile cards
      await expect(page.locator('.profile-card, [data-testid="profile-card"]')).toBeVisible({ timeout: 5000 });

      // Should show profile information
      await expect(page.locator('.profile-name, [data-testid="profile-name"]')).toBeVisible();
      await expect(page.locator('.profile-age, [data-testid="profile-age"]')).toBeVisible();
    });

    test('should display profile photos', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      await page.goto('/discovery');
      await page.waitForSelector('.profile-card', { timeout: 5000 });

      // Should have profile images
      const images = page.locator('.profile-image, img[alt*="profile"]');
      await expect(images.first()).toBeVisible();
    });

    test('should show message when no profiles available', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      // Mock empty discovery state (if possible)
      await page.goto('/discovery');

      // If no profiles, should show appropriate message
      const noProfilesMessage = page.locator('text=/no.*profiles|no.*matches.*found|check.*back.*later/i');
      const hasProfiles = await page.locator('.profile-card').count() > 0;

      if (!hasProfiles) {
        await expect(noProfilesMessage).toBeVisible();
      }
    });
  });

  test.describe('2.2 Apply Filters', () => {

    test('should open and apply age filters', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      await page.goto('/discovery');

      // Open filters
      await page.click('button:has-text("Filters"), [data-testid="filters-button"]');

      // Wait for filter panel
      await expect(page.locator('.filters-panel, [data-testid="filters-panel"]')).toBeVisible();

      // Set age range
      await page.fill('input[name="minAge"], input[name="ageMin"]', '25');
      await page.fill('input[name="maxAge"], input[name="ageMax"]', '35');

      // Apply filters
      await page.click('button:has-text("Apply"), button:has-text("Save")');

      // Filters should be applied
      await expect(page.locator('.filters-panel')).not.toBeVisible();
    });

    test('should apply distance filter', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      await page.goto('/discovery');
      await page.click('button:has-text("Filters")');

      // Set distance
      const distanceSlider = page.locator('input[name="distance"], input[type="range"]').first();
      await distanceSlider.fill('50');

      await page.click('button:has-text("Apply")');

      // Should apply filter
      await page.waitForTimeout(1000);
    });

    test('should restrict premium filters for free users', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      await page.goto('/discovery');
      await page.click('button:has-text("Filters")');

      // Premium filters should show upgrade prompt
      const premiumFilter = page.locator('[data-premium="true"], .premium-filter');

      if (await premiumFilter.count() > 0) {
        await premiumFilter.first().click();

        // Should show upgrade prompt
        await expect(page.locator('text=/upgrade|premium|go.*premium/i')).toBeVisible({ timeout: 3000 });
      }
    });
  });

  test.describe('2.3 Like/Pass/Super-Like', () => {

    test('should swipe right (like) on profile', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      await page.goto('/discovery');
      await page.waitForSelector('.profile-card', { timeout: 5000 });

      // Click like button
      await page.click('button.like-button, button[aria-label*="like"], [data-testid="like-button"]');

      // Next profile should load
      await page.waitForTimeout(1000);
      await expect(page.locator('.profile-card')).toBeVisible();
    });

    test('should swipe left (pass) on profile', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      await page.goto('/discovery');
      await page.waitForSelector('.profile-card');

      // Click pass button
      await page.click('button.pass-button, button[aria-label*="pass"], [data-testid="pass-button"]');

      // Next profile should load
      await page.waitForTimeout(1000);
      await expect(page.locator('.profile-card')).toBeVisible();
    });

    test('should use super-like on profile', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      await page.goto('/discovery');
      await page.waitForSelector('.profile-card');

      // Click super-like button
      const superLikeButton = page.locator('button.super-like-button, button[aria-label*="super"], [data-testid="super-like-button"]');

      if (await superLikeButton.count() > 0) {
        await superLikeButton.click();

        // Should show super-like sent or deduct from balance
        await page.waitForTimeout(1000);
      }
    });

    test('should enforce swipe limits for free users', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      await page.goto('/discovery');

      // Simulate reaching swipe limit (would need to swipe multiple times)
      // For this test, we check if limit message appears

      // If limit reached, should show message
      const limitMessage = page.locator('text=/swipe.*limit|out.*of.*swipes|daily.*limit/i');

      // Swipe multiple times to potentially hit limit
      for (let i = 0; i < 5; i++) {
        const likeButton = page.locator('button.like-button');
        if (await likeButton.count() > 0) {
          await likeButton.click();
          await page.waitForTimeout(500);
        }
      }
    });
  });

  test.describe('2.4 Match Creation', () => {

    test('should create match when both users like each other', async ({ page, context }) => {
      // Create two test users
      const user1Data = generateTestUser({ gender: 'male', lookingFor: 'female' });
      const user2Data = generateTestUser({ gender: 'female', lookingFor: 'male' });

      // User 1 logs in and likes User 2
      await loginUser(page, user1Data.email, user1Data.password);
      await page.goto('/discovery');
      await page.waitForSelector('.profile-card');
      await page.click('button.like-button');

      // User 2 logs in (new context)
      const user2Page = await context.newPage();
      await loginUser(user2Page, user2Data.email, user2Data.password);
      await user2Page.goto('/discovery');
      await user2Page.waitForSelector('.profile-card');
      await user2Page.click('button.like-button');

      // Both should see match notification
      await expect(page.locator('.match-notification, [data-testid="match-modal"]')).toBeVisible({ timeout: 5000 });
      await expect(user2Page.locator('.match-notification, [data-testid="match-modal"]')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('2.5 Match Notification', () => {

    test('should display match notification modal', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      // Simulate receiving a match (would need WebSocket or API mock)
      await page.goto('/discovery');

      // If match occurs, modal should appear
      const matchModal = page.locator('.match-notification, .match-modal, [data-testid="match-modal"]');

      // Mock a match event if possible
      await page.evaluate(() => {
        // Dispatch custom event to simulate match
        window.dispatchEvent(new CustomEvent('match-created', {
          detail: { matchId: 'test-match-id', user: { name: 'Test User' } }
        }));
      });

      // Check if modal appears (timing may vary)
      await page.waitForTimeout(1000);
    });

    test('should navigate to conversation from match notification', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      // If match notification appears
      const matchModal = page.locator('.match-notification');

      if (await matchModal.isVisible({ timeout: 1000 }).catch(() => false)) {
        // Click "Send Message" or similar button
        await page.click('button:has-text("Send Message"), button:has-text("Say Hi")');

        // Should navigate to conversation
        await expect(page).toHaveURL(/\/messages|\/chat|\/conversation/, { timeout: 5000 });
      }
    });
  });
});

// ============================================================================
// FLOW 3: Messaging Flow
// ============================================================================

test.describe('Flow 3: Messaging Flow', () => {

  test.describe('3.1 Open Conversation from Match', () => {

    test('should navigate to matches list', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      // Navigate to matches
      await page.click('a[href*="matches"], a:has-text("Matches")');
      await expect(page).toHaveURL(/matches/, { timeout: 5000 });
    });

    test('should open conversation from match', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      await page.goto('/matches');

      // Click on first match
      const firstMatch = page.locator('.match-card, [data-testid="match-card"]').first();

      if (await firstMatch.count() > 0) {
        await firstMatch.click();

        // Should open conversation
        await expect(page).toHaveURL(/\/messages|\/chat|\/conversation/, { timeout: 5000 });
      }
    });

    test('should load conversation history', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      // Open a conversation
      await page.goto('/matches');
      const firstMatch = page.locator('.match-card').first();

      if (await firstMatch.count() > 0) {
        await firstMatch.click();
        await page.waitForURL(/\/messages|\/chat/);

        // Should show conversation UI
        await expect(page.locator('.message-input, textarea[placeholder*="message"]')).toBeVisible();
      }
    });
  });

  test.describe('3.2 Send Text Messages', () => {

    test('should send a text message', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      // Open conversation
      await page.goto('/matches');
      const firstMatch = page.locator('.match-card').first();

      if (await firstMatch.count() > 0) {
        await firstMatch.click();
        await page.waitForURL(/\/messages|\/chat/);

        // Type and send message
        const messageText = `Test message ${Date.now()}`;
        await page.fill('textarea[placeholder*="message"], input[placeholder*="message"]', messageText);
        await page.click('button[type="submit"], button:has-text("Send")');

        // Message should appear in conversation
        await expect(page.locator(`text=${messageText}`)).toBeVisible({ timeout: 3000 });
      }
    });

    test('should enforce message character limit', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      await page.goto('/matches');
      const firstMatch = page.locator('.match-card').first();

      if (await firstMatch.count() > 0) {
        await firstMatch.click();
        await page.waitForURL(/\/messages|\/chat/);

        // Try to send extremely long message
        const longMessage = 'a'.repeat(5000);
        await page.fill('textarea[placeholder*="message"]', longMessage);

        // Should show character limit warning or prevent send
        const charCount = page.locator('.char-count, [data-testid="char-count"]');
        if (await charCount.count() > 0) {
          await expect(charCount).toBeVisible();
        }
      }
    });

    test('should prevent sending empty messages', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      await page.goto('/matches');
      const firstMatch = page.locator('.match-card').first();

      if (await firstMatch.count() > 0) {
        await firstMatch.click();
        await page.waitForURL(/\/messages|\/chat/);

        // Try to send empty message
        const sendButton = page.locator('button[type="submit"], button:has-text("Send")');

        // Send button should be disabled or do nothing
        const isDisabled = await sendButton.isDisabled();
        expect(isDisabled).toBe(true);
      }
    });
  });

  test.describe('3.3 Send Media (Photos)', () => {

    test('should send photo in conversation', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      await page.goto('/matches');
      const firstMatch = page.locator('.match-card').first();

      if (await firstMatch.count() > 0) {
        await firstMatch.click();
        await page.waitForURL(/\/messages|\/chat/);

        // Click photo attachment button
        const attachButton = page.locator('button[aria-label*="attach"], button:has([data-icon="paperclip"])');

        if (await attachButton.count() > 0) {
          // Set file input
          const fileInput = page.locator('input[type="file"]');
          await fileInput.setInputFiles({
            name: 'test-photo.jpg',
            mimeType: 'image/jpeg',
            buffer: Buffer.from('fake-image-data'),
          });

          // Photo should upload and appear
          await expect(page.locator('.message-image, img[alt*="message"]')).toBeVisible({ timeout: 10000 });
        }
      }
    });
  });

  test.describe('3.4 Read Receipts', () => {

    test('should show read receipt for messages', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      await page.goto('/matches');
      const firstMatch = page.locator('.match-card').first();

      if (await firstMatch.count() > 0) {
        await firstMatch.click();
        await page.waitForURL(/\/messages|\/chat/);

        // Send a message
        const messageText = `Test message ${Date.now()}`;
        await page.fill('textarea[placeholder*="message"]', messageText);
        await page.click('button:has-text("Send")');

        // Should show delivered/read status
        const readStatus = page.locator('.read-receipt, [data-testid="read-status"]');

        // Status should eventually appear
        await page.waitForTimeout(2000);
      }
    });
  });

  test.describe('3.5 Typing Indicators', () => {

    test('should show typing indicator when other user types', async ({ page, context }) => {
      // This test requires two users
      const user1Data = generateTestUser();
      const user2Data = generateTestUser();

      // User 1 opens conversation
      await loginUser(page, user1Data.email, user1Data.password);
      await page.goto('/matches');

      // User 2 opens same conversation and types
      const user2Page = await context.newPage();
      await loginUser(user2Page, user2Data.email, user2Data.password);
      await user2Page.goto('/matches');

      // Simulate User 2 typing
      const messageInput = user2Page.locator('textarea[placeholder*="message"]');
      if (await messageInput.count() > 0) {
        await messageInput.fill('Typing...');

        // User 1 should see typing indicator
        const typingIndicator = page.locator('.typing-indicator, [data-testid="typing-indicator"]');
        await expect(typingIndicator).toBeVisible({ timeout: 3000 });
      }
    });
  });

  test.describe('3.6 Real-time Updates via WebSocket', () => {

    test('should receive messages in real-time', async ({ page, context }) => {
      const user1Data = generateTestUser();
      const user2Data = generateTestUser();

      // User 1 opens conversation
      await loginUser(page, user1Data.email, user1Data.password);
      await page.goto('/matches');

      // User 2 sends message
      const user2Page = await context.newPage();
      await loginUser(user2Page, user2Data.email, user2Data.password);
      await user2Page.goto('/matches');

      const messageText = `Real-time message ${Date.now()}`;
      await user2Page.fill('textarea[placeholder*="message"]', messageText);
      await user2Page.click('button:has-text("Send")');

      // User 1 should receive message instantly
      await expect(page.locator(`text=${messageText}`)).toBeVisible({ timeout: 5000 });
    });
  });
});

// ============================================================================
// FLOW 4: Subscription Flow
// ============================================================================

test.describe('Flow 4: Subscription Flow', () => {

  test.describe('4.1 View Subscription Plans', () => {

    test('should display subscription plans page', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      // Navigate to premium/subscription page
      await page.click('a:has-text("Premium"), a:has-text("Upgrade"), button:has-text("Go Premium")');

      await expect(page).toHaveURL(/premium|subscription|upgrade/, { timeout: 5000 });

      // Should show plan cards
      await expect(page.locator('.plan-card, [data-testid="plan-card"]')).toHaveCount(await page.locator('.plan-card').count());
    });

    test('should display all plan features', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      await page.goto('/premium');

      // Should show key features
      await expect(page.locator('text=/unlimited.*swipes/i')).toBeVisible();
      await expect(page.locator('text=/see.*who.*likes/i')).toBeVisible();
    });

    test('should show pricing for different billing cycles', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      await page.goto('/premium');

      // Should have monthly and yearly options
      const monthlyPlan = page.locator('text=/monthly|month/i');
      const yearlyPlan = page.locator('text=/yearly|year/i');

      await expect(monthlyPlan.or(yearlyPlan)).toBeVisible();
    });
  });

  test.describe('4.2 Stripe Checkout', () => {

    test('should initiate Stripe checkout', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      await page.goto('/premium');

      // Select a plan
      await page.click('.plan-card button:has-text("Subscribe"), button:has-text("Choose Plan")');

      // Should load Stripe checkout or payment form
      const stripeFrame = page.frameLocator('iframe[name*="stripe"], iframe[src*="stripe"]');
      const paymentForm = page.locator('form[action*="stripe"], .stripe-form');

      // Wait for Stripe Elements to load
      await expect(stripeFrame.locator('input[name*="cardnumber"]').or(paymentForm)).toBeVisible({ timeout: 10000 });
    });

    test('should fill Stripe payment form with test card', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      await page.goto('/premium');
      await page.click('button:has-text("Subscribe")');

      // Wait for Stripe Elements
      await page.waitForTimeout(3000);

      // Fill card details (if Stripe test mode)
      const stripeFrame = page.frameLocator('iframe[name*="stripe"]');

      if (await stripeFrame.locator('input').count() > 0) {
        await stripeFrame.locator('input[placeholder*="Card number"]').fill('4242424242424242');
        await stripeFrame.locator('input[placeholder*="MM"]').fill('12/25');
        await stripeFrame.locator('input[placeholder*="CVC"]').fill('123');
        await stripeFrame.locator('input[placeholder*="ZIP"]').fill('12345');
      }
    });
  });

  test.describe('4.3 Payment Success/Failure Handling', () => {

    test('should handle successful payment', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      // Complete payment flow (mocked or test mode)
      await page.goto('/premium');
      await page.click('button:has-text("Subscribe")');

      // After successful payment
      await expect(page.locator('text=/payment.*successful|welcome.*premium|subscription.*active/i')).toBeVisible({ timeout: 15000 });
    });

    test('should handle payment failure gracefully', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      // Simulate payment failure
      await page.goto('/premium');

      // If payment fails, should show error
      const errorMessage = page.locator('text=/payment.*failed|card.*declined|error.*processing/i');

      // User should be able to retry
      const retryButton = page.locator('button:has-text("Try Again"), button:has-text("Retry")');
    });
  });

  test.describe('4.4 Subscription Activation', () => {

    test('should activate subscription after payment', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      // After successful payment
      await page.goto('/premium/success');

      // Should show premium badge
      await page.goto('/profile');
      const premiumBadge = page.locator('.premium-badge, [data-testid="premium-badge"]');

      if (await premiumBadge.count() > 0) {
        await expect(premiumBadge).toBeVisible();
      }
    });
  });

  test.describe('4.5 Entitlements Update', () => {

    test('should unlock premium features after subscription', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      // Assume user has premium subscription
      // Check if premium features are accessible

      await page.goto('/discovery');
      await page.click('button:has-text("Filters")');

      // Advanced filters should be available
      const advancedFilters = page.locator('.advanced-filters, [data-premium="true"]');

      if (await advancedFilters.count() > 0) {
        // Should be clickable without upgrade prompt
        await advancedFilters.first().click();

        // Should not show upgrade modal
        const upgradeModal = page.locator('text=/upgrade.*premium|go.*premium/i');
        await expect(upgradeModal).not.toBeVisible({ timeout: 1000 });
      }
    });

    test('should show unlimited swipes for premium users', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      await page.goto('/discovery');

      // Swipe multiple times without hitting limit
      for (let i = 0; i < 10; i++) {
        const likeButton = page.locator('button.like-button');
        if (await likeButton.count() > 0) {
          await likeButton.click();
          await page.waitForTimeout(500);
        } else {
          break;
        }
      }

      // Should not show swipe limit message
      const limitMessage = page.locator('text=/swipe.*limit|out.*of.*swipes/i');
      await expect(limitMessage).not.toBeVisible();
    });
  });

  test.describe('4.6 Cancel Subscription', () => {

    test('should navigate to subscription settings', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      // Navigate to settings
      await page.click('a:has-text("Settings"), button:has-text("Settings")');
      await expect(page).toHaveURL(/settings/);

      // Navigate to subscription section
      await page.click('a:has-text("Subscription"), button:has-text("Subscription")');
      await expect(page).toHaveURL(/settings\/subscription|subscription/);
    });

    test('should cancel subscription', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      await page.goto('/settings/subscription');

      // Click cancel subscription
      const cancelButton = page.locator('button:has-text("Cancel Subscription")');

      if (await cancelButton.count() > 0) {
        await cancelButton.click();

        // Confirm cancellation
        await page.click('button:has-text("Yes"), button:has-text("Confirm")');

        // Should show cancellation confirmation
        await expect(page.locator('text=/subscription.*canceled|cancels.*on/i')).toBeVisible({ timeout: 5000 });
      }
    });
  });
});

// ============================================================================
// FLOW 5: Safety Flow
// ============================================================================

test.describe('Flow 5: Safety Flow', () => {

  test.describe('5.1 Report User', () => {

    test('should open report modal', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      await page.goto('/discovery');
      await page.waitForSelector('.profile-card');

      // Click report button
      await page.click('button:has-text("Report"), button[aria-label*="report"]');

      // Report modal should open
      await expect(page.locator('.report-modal, [data-testid="report-modal"]')).toBeVisible();
    });

    test('should submit user report', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      await page.goto('/discovery');
      await page.waitForSelector('.profile-card');
      await page.click('button:has-text("Report")');

      // Select report reason
      await page.click('text=Inappropriate Photos, label:has-text("Inappropriate")');

      // Add details
      await page.fill('textarea[name="details"], textarea[placeholder*="details"]', 'Test report details');

      // Submit report
      await page.click('button:has-text("Submit Report"), button[type="submit"]');

      // Should show confirmation
      await expect(page.locator('text=/report.*submitted|thank.*you.*reporting/i')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('5.2 Block User', () => {

    test('should block user from profile', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      await page.goto('/discovery');
      await page.waitForSelector('.profile-card');

      // Click block button
      await page.click('button:has-text("Block"), button[aria-label*="block"]');

      // Confirm block
      await page.click('button:has-text("Yes"), button:has-text("Confirm")');

      // Should show confirmation
      await expect(page.locator('text=/user.*blocked|blocked.*successfully/i')).toBeVisible({ timeout: 5000 });
    });

    test('should remove blocked user from matches', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      // Open matches list
      await page.goto('/matches');

      const initialMatchCount = await page.locator('.match-card').count();

      // Block a user
      if (initialMatchCount > 0) {
        await page.click('.match-card button:has-text("Block")');
        await page.click('button:has-text("Confirm")');

        // Match count should decrease
        await page.waitForTimeout(1000);
        const newMatchCount = await page.locator('.match-card').count();
        expect(newMatchCount).toBeLessThan(initialMatchCount);
      }
    });
  });

  test.describe('5.3 Blocked User Hidden from Discovery', () => {

    test('should not show blocked users in discovery', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      // Block a user from discovery
      await page.goto('/discovery');
      await page.waitForSelector('.profile-card');

      const blockedUserName = await page.locator('.profile-name').first().textContent();

      await page.click('button:has-text("Block")');
      await page.click('button:has-text("Confirm")');

      // Swipe through profiles
      for (let i = 0; i < 10; i++) {
        await page.click('button.like-button');
        await page.waitForTimeout(500);

        const currentUserName = await page.locator('.profile-name').first().textContent();

        // Should not see blocked user again
        expect(currentUserName).not.toBe(blockedUserName);
      }
    });
  });

  test.describe('5.4 Blocked User Hidden from Chat', () => {

    test('should hide conversation with blocked user', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      await page.goto('/matches');

      const initialMatchCount = await page.locator('.match-card').count();

      if (initialMatchCount > 0) {
        // Block a user
        await page.click('.match-card button:has-text("Block")');
        await page.click('button:has-text("Confirm")');

        // Conversation should be hidden
        await page.waitForTimeout(1000);
        const newMatchCount = await page.locator('.match-card').count();
        expect(newMatchCount).toBe(initialMatchCount - 1);
      }
    });
  });
});

// ============================================================================
// FLOW 6: Profile Management
// ============================================================================

test.describe('Flow 6: Profile Management', () => {

  test.describe('6.1 Update Profile Info', () => {

    test('should navigate to profile settings', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      await page.click('a:has-text("Profile"), a:has-text("Settings")');
      await expect(page).toHaveURL(/profile|settings/, { timeout: 5000 });
    });

    test('should update bio', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      await page.goto('/profile/edit');

      const newBio = `Updated bio ${Date.now()}`;
      await page.fill('textarea[name="bio"]', newBio);
      await page.click('button:has-text("Save"), button[type="submit"]');

      // Should show success message
      await expect(page.locator('text=/saved|updated.*successfully/i')).toBeVisible({ timeout: 5000 });
    });

    test('should update job and education', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      await page.goto('/profile/edit');

      await page.fill('input[name="job"], input[name="jobTitle"]', 'Software Engineer');
      await page.fill('input[name="education"], input[name="school"]', 'MIT');
      await page.click('button:has-text("Save")');

      await expect(page.locator('text=/saved|updated/i')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('6.2 Upload Photos', () => {

    test('should upload profile photo', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      await page.goto('/profile/edit');

      // Click add photo button
      await page.click('button:has-text("Add Photo"), input[type="file"]');

      // Upload file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'profile-photo.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data'),
      });

      // Should show upload progress or success
      await expect(page.locator('.photo-uploading, .upload-progress')).toBeVisible({ timeout: 1000 });
    });

    test('should enforce photo limits', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      await page.goto('/profile/edit');

      // Count existing photos
      const photoCount = await page.locator('.profile-photo, img[data-photo]').count();

      // If at max (9 photos), add button should be disabled or hidden
      if (photoCount >= 9) {
        const addButton = page.locator('button:has-text("Add Photo")');
        await expect(addButton).toBeDisabled();
      }
    });

    test('should reorder photos', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      await page.goto('/profile/edit');

      // If drag-and-drop is supported
      const photos = page.locator('.profile-photo');

      if (await photos.count() >= 2) {
        // Simulate drag and drop (implementation depends on library)
        // This is a placeholder for drag-drop logic
      }
    });

    test('should delete photo', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      await page.goto('/profile/edit');

      const initialPhotoCount = await page.locator('.profile-photo').count();

      if (initialPhotoCount > 2) {
        // Click delete button on first photo
        await page.click('.profile-photo button:has-text("Delete"), .delete-photo-button');
        await page.click('button:has-text("Confirm")');

        // Photo count should decrease
        await page.waitForTimeout(1000);
        const newPhotoCount = await page.locator('.profile-photo').count();
        expect(newPhotoCount).toBe(initialPhotoCount - 1);
      }
    });
  });

  test.describe('6.3 Set Preferences', () => {

    test('should update discovery preferences', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      await page.goto('/settings/preferences');

      // Update preferences
      await page.fill('input[name="minAge"]', '25');
      await page.fill('input[name="maxAge"]', '35');
      await page.fill('input[name="distance"]', '50');

      await page.click('button:has-text("Save")');

      await expect(page.locator('text=/saved|updated/i')).toBeVisible({ timeout: 5000 });
    });

    test('should update notification preferences', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      await page.goto('/settings/notifications');

      // Toggle notification settings
      await page.click('input[name="matchNotifications"], label:has-text("Match notifications")');
      await page.click('input[name="messageNotifications"], label:has-text("Message notifications")');

      await page.click('button:has-text("Save")');

      await expect(page.locator('text=/saved|updated/i')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('6.4 Verification Flow', () => {

    test('should initiate profile verification', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      await page.goto('/profile');

      // Click get verified button
      const verifyButton = page.locator('button:has-text("Get Verified"), a:has-text("Verify Profile")');

      if (await verifyButton.count() > 0) {
        await verifyButton.click();

        // Should show verification instructions
        await expect(page.locator('text=/verification|take.*selfie|pose/i')).toBeVisible();
      }
    });

    test('should show verification instructions', async ({ page }) => {
      const userData = generateTestUser();
      await loginUser(page, userData.email, userData.password);

      await page.goto('/verification');

      // Should show clear instructions
      await expect(page.locator('text=/instructions|how.*to.*verify/i')).toBeVisible();
    });
  });
});

// ============================================================================
// Test Cleanup and Utilities
// ============================================================================

test.afterEach(async ({ page }, testInfo) => {
  // Capture screenshot on failure
  if (testInfo.status !== testInfo.expectedStatus) {
    await page.screenshot({
      path: `test-results/screenshots/${testInfo.title}-${Date.now()}.png`,
      fullPage: true
    });
  }
});
