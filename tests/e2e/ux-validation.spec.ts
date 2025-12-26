/**
 * UX Validation E2E Tests for User Research
 *
 * Purpose: Validate real user journeys from a UX perspective,
 * identifying confusion points, dead ends, and trust issues.
 *
 * These tests capture metrics like:
 * - Time to complete each journey
 * - Number of clicks/taps required
 * - Console errors during journey
 * - Failed network requests
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// ============================================================================
// Test Utilities and Helpers
// ============================================================================

interface JourneyMetrics {
  startTime: number;
  endTime: number;
  clickCount: number;
  consoleErrors: string[];
  networkErrors: Array<{ url: string; status: number }>;
  duration: number;
}

/**
 * Creates a journey tracker to capture UX metrics
 */
async function createJourneyTracker(page: Page): Promise<{
  start: () => void;
  trackClick: () => void;
  stop: () => JourneyMetrics;
  getMetrics: () => JourneyMetrics;
}> {
  const metrics: JourneyMetrics = {
    startTime: 0,
    endTime: 0,
    clickCount: 0,
    consoleErrors: [],
    networkErrors: [],
    duration: 0,
  };

  // Track console errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      metrics.consoleErrors.push(msg.text());
    }
  });

  // Track failed network requests
  page.on('response', (response) => {
    if (response.status() >= 400) {
      metrics.networkErrors.push({
        url: response.url(),
        status: response.status(),
      });
    }
  });

  // Track clicks
  page.on('click', () => {
    metrics.clickCount++;
  });

  return {
    start: () => {
      metrics.startTime = Date.now();
      metrics.clickCount = 0;
      metrics.consoleErrors = [];
      metrics.networkErrors = [];
    },
    trackClick: () => {
      metrics.clickCount++;
    },
    stop: () => {
      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - metrics.startTime;
      return metrics;
    },
    getMetrics: () => metrics,
  };
}

/**
 * Generate unique test user data
 */
function generateTestUser() {
  const timestamp = Date.now();
  return {
    email: `ux-test-${timestamp}@example.com`,
    password: 'SecurePassword123!@#',
    firstName: 'UXTest',
    lastName: 'User',
    dateOfBirth: '1995-06-15',
    gender: 'male',
  };
}

/**
 * Helper to check if element is interactive (visible and enabled)
 */
async function isInteractive(page: Page, selector: string, timeout = 3000): Promise<boolean> {
  try {
    const element = page.locator(selector);
    await element.waitFor({ state: 'visible', timeout });
    const isEnabled = await element.isEnabled();
    return isEnabled;
  } catch {
    return false;
  }
}

/**
 * Helper to check for dead end (no interactive elements or clear next action)
 */
async function checkForDeadEnd(page: Page): Promise<{
  isDeadEnd: boolean;
  reason: string;
}> {
  // Check for interactive buttons
  const buttons = page.locator('button:visible:enabled, a:visible[href]:not([href="#"])');
  const buttonCount = await buttons.count();

  // Check for navigation
  const nav = page.locator('nav:visible');
  const hasNav = await nav.count() > 0;

  // Check for error states without recovery
  const errorWithNoAction = page.locator('.error:not(:has(button)), [role="alert"]:not(:has(button))');
  const hasUnrecoverableError = await errorWithNoAction.count() > 0;

  if (buttonCount === 0 && !hasNav) {
    return { isDeadEnd: true, reason: 'No interactive elements or navigation found' };
  }

  if (hasUnrecoverableError) {
    return { isDeadEnd: true, reason: 'Error state without recovery action' };
  }

  return { isDeadEnd: false, reason: '' };
}

/**
 * Helper to verify mobile touch target sizes (minimum 44x44 pixels per WCAG)
 */
async function checkTouchTargets(page: Page): Promise<{
  violations: Array<{ element: string; width: number; height: number }>;
}> {
  const violations: Array<{ element: string; width: number; height: number }> = [];

  const interactiveElements = page.locator('button, a, input, select, [role="button"]');
  const count = await interactiveElements.count();

  for (let i = 0; i < Math.min(count, 20); i++) {
    const element = interactiveElements.nth(i);
    const box = await element.boundingBox();

    if (box && (box.width < 44 || box.height < 44)) {
      const tagName = await element.evaluate((el) => el.tagName);
      violations.push({
        element: tagName,
        width: box.width,
        height: box.height,
      });
    }
  }

  return { violations };
}

// ============================================================================
// Journey 1: New User Onboarding
// Landing page -> Sign up -> Email verification -> Profile creation -> First swipe
// ============================================================================

test.describe('UX Validation - New User Onboarding Journey', () => {
  let journeyTracker: Awaited<ReturnType<typeof createJourneyTracker>>;

  test.beforeEach(async ({ page }) => {
    journeyTracker = await createJourneyTracker(page);
  });

  test('onboarding has clear progress indicators', async ({ page }) => {
    journeyTracker.start();

    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    // Check for progress indicator on registration page
    const progressIndicators = page.locator(
      '[role="progressbar"], .progress, .stepper, .step-indicator, .steps, .progress-bar'
    );

    // May not have progress on initial registration, check on profile setup
    await page.goto('/profile/setup');
    await page.waitForLoadState('networkidle');

    const hasProgressIndicator = await progressIndicators.count() > 0;

    // Check for step numbers or labels
    const stepLabels = page.locator('.step, [data-step], .step-label, .step-number');
    const hasStepLabels = await stepLabels.count() > 0;

    // At least one form of progress indication should exist
    const hasProgressFeedback = hasProgressIndicator || hasStepLabels;

    const metrics = journeyTracker.stop();

    // Log metrics for analysis
    console.log('Progress indicator check metrics:', {
      hasProgressIndicator,
      hasStepLabels,
      consoleErrors: metrics.consoleErrors.length,
    });

    expect(hasProgressFeedback).toBeTruthy();
    expect(metrics.consoleErrors).toHaveLength(0);
  });

  test('CTAs are clear and actionable on landing page', async ({ page }) => {
    journeyTracker.start();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for primary CTA buttons
    const primaryCTAs = page.locator(
      'button:has-text("Get Started"), button:has-text("Sign Up"), button:has-text("Join"), a:has-text("Get Started"), a:has-text("Sign Up")'
    );

    const ctaCount = await primaryCTAs.count();
    expect(ctaCount).toBeGreaterThan(0);

    // Verify CTA is visually prominent (has explicit styling)
    const firstCTA = primaryCTAs.first();
    const isVisible = await firstCTA.isVisible();
    expect(isVisible).toBeTruthy();

    // Check CTA has sufficient contrast/visibility
    const ctaBox = await firstCTA.boundingBox();
    expect(ctaBox).toBeTruthy();
    expect(ctaBox!.height).toBeGreaterThanOrEqual(40);

    const metrics = journeyTracker.stop();
    expect(metrics.consoleErrors).toHaveLength(0);
  });

  test('registration form has immediate validation feedback', async ({ page }) => {
    journeyTracker.start();

    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    // Test email validation
    const emailInput = page.locator('input[name="email"], input[type="email"]');
    if (await emailInput.isVisible({ timeout: 3000 })) {
      await emailInput.fill('invalid-email');
      await emailInput.blur();

      // Should show validation error immediately (within 2 seconds)
      const emailError = page.locator('text=/invalid.*email|email.*invalid|valid.*email/i');
      await expect(emailError).toBeVisible({ timeout: 2000 });
    }

    // Test password validation
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    if (await passwordInput.isVisible({ timeout: 3000 })) {
      await passwordInput.fill('weak');
      await passwordInput.blur();

      // Should show password strength or requirements
      const passwordFeedback = page.locator(
        'text=/password.*weak|password.*strong|at least|minimum|character/i'
      );
      const hasFeedback = await passwordFeedback.isVisible({ timeout: 2000 });

      // Password strength indicator
      const strengthIndicator = page.locator('.password-strength, [data-testid="strength"]');
      const hasStrengthIndicator = await strengthIndicator.isVisible({ timeout: 1000 });

      expect(hasFeedback || hasStrengthIndicator).toBeTruthy();
    }

    const metrics = journeyTracker.stop();
    console.log('Form validation metrics:', {
      duration: metrics.duration,
      consoleErrors: metrics.consoleErrors.length,
    });
  });

  test('error messages are user-friendly and actionable', async ({ page }) => {
    journeyTracker.start();

    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    // Submit empty form to trigger errors
    const submitButton = page.locator('button[type="submit"]');
    if (await submitButton.isEnabled({ timeout: 3000 })) {
      await submitButton.click();

      // Wait for error messages
      await page.waitForTimeout(1000);

      // Check that error messages are clear (not technical jargon)
      const errorMessages = page.locator('[role="alert"], .error, .error-message, .field-error');
      const errorCount = await errorMessages.count();

      if (errorCount > 0) {
        for (let i = 0; i < errorCount; i++) {
          const errorText = await errorMessages.nth(i).textContent();

          // Error should not contain technical terms
          expect(errorText).not.toMatch(/exception|null|undefined|NaN|error code/i);

          // Error should be actionable (suggest what to do)
          expect(errorText?.length).toBeGreaterThan(5);
        }
      }
    }

    const metrics = journeyTracker.stop();
    expect(metrics.networkErrors.filter((e) => e.status >= 500)).toHaveLength(0);
  });

  test('no dead ends during registration flow', async ({ page }) => {
    journeyTracker.start();

    const testUser = generateTestUser();

    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    // Check initial page for dead end
    let deadEndCheck = await checkForDeadEnd(page);
    expect(deadEndCheck.isDeadEnd).toBeFalsy();

    // Fill registration form
    const emailInput = page.locator('input[name="email"]');
    if (await emailInput.isVisible({ timeout: 3000 })) {
      await emailInput.fill(testUser.email);
    }

    const passwordInput = page.locator('input[name="password"]');
    if (await passwordInput.isVisible({ timeout: 3000 })) {
      await passwordInput.fill(testUser.password);
    }

    const confirmPasswordInput = page.locator('input[name="confirmPassword"]');
    if (await confirmPasswordInput.isVisible({ timeout: 3000 })) {
      await confirmPasswordInput.fill(testUser.password);
    }

    // Check for next step or submit button
    const nextActions = page.locator(
      'button[type="submit"], button:has-text("Next"), button:has-text("Continue"), button:has-text("Sign Up")'
    );
    const hasNextAction = await nextActions.count() > 0;

    expect(hasNextAction).toBeTruthy();

    const metrics = journeyTracker.stop();
    console.log('Dead end check metrics:', {
      duration: metrics.duration,
      networkErrors: metrics.networkErrors.length,
    });
  });

  test('email verification page provides clear instructions', async ({ page }) => {
    await page.goto('/verify-email');
    await page.waitForLoadState('networkidle');

    // Check for clear messaging
    const instructions = page.locator(
      'text=/check.*email|verification.*sent|verify.*email|confirm.*email/i'
    );
    const hasInstructions = await instructions.isVisible({ timeout: 5000 });

    // Check for resend option
    const resendButton = page.locator(
      'button:has-text("Resend"), button:has-text("Send again"), a:has-text("Resend")'
    );
    const hasResend = await resendButton.isVisible({ timeout: 3000 });

    // Check for help or support link
    const helpLink = page.locator('a:has-text("Help"), a:has-text("Support"), a:has-text("Contact")');
    const hasHelp = await helpLink.isVisible({ timeout: 2000 });

    // At minimum, should have instructions and resend option
    expect(hasInstructions || (await page.url()).includes('verify')).toBeTruthy();

    if (hasInstructions) {
      expect(hasResend).toBeTruthy();
    }
  });

  test('profile creation has clear guidance', async ({ page }) => {
    // Login first to access profile setup
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);

    await page.goto('/profile/setup');
    await page.waitForLoadState('networkidle');

    // Check for guidance text or tooltips
    const guidance = page.locator(
      '.help-text, .guidance, .tooltip, [data-tooltip], .hint, .description, label + p, label + span'
    );
    const guidanceCount = await guidance.count();

    // Check for placeholder text in inputs
    const inputs = page.locator('input[placeholder], textarea[placeholder]');
    const hasPlaceholders = await inputs.count() > 0;

    // Check for example or sample content
    const examples = page.locator('text=/example|e\\.g\\.|for example/i');
    const hasExamples = await examples.count() > 0;

    // Should have some form of guidance
    expect(guidanceCount > 0 || hasPlaceholders || hasExamples).toBeTruthy();
  });
});

// ============================================================================
// Journey 2: Return User Journey
// Login -> Dashboard -> Check matches -> Send message
// ============================================================================

test.describe('UX Validation - Return User Journey', () => {
  let journeyTracker: Awaited<ReturnType<typeof createJourneyTracker>>;

  test.beforeEach(async ({ page }) => {
    journeyTracker = await createJourneyTracker(page);
  });

  test('login page loads quickly and is accessible', async ({ page }) => {
    journeyTracker.start();

    const startTime = Date.now();
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;

    // Login page should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000);

    // Check for accessible form
    const emailInput = page.locator('input[name="email"], input[type="email"]');
    const passwordInput = page.locator('input[name="password"], input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await expect(passwordInput).toBeVisible({ timeout: 5000 });
    await expect(submitButton).toBeVisible({ timeout: 5000 });

    const metrics = journeyTracker.stop();
    expect(metrics.consoleErrors).toHaveLength(0);
  });

  test('session restoration works seamlessly', async ({ page, context }) => {
    journeyTracker.start();

    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*dashboard|discover|home/, { timeout: 15000 });

    // Verify session cookie was set
    const cookies = await context.cookies();
    const hasAuthCookie = cookies.some(
      (c) => c.name.includes('token') || c.name.includes('auth') || c.name.includes('session')
    );

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should still be logged in
    const logoutButton = page.locator('text=/logout|sign.*out/i');
    const profileIcon = page.locator('[aria-label*="profile"], .profile-icon, .avatar');

    const isStillLoggedIn = (await logoutButton.isVisible({ timeout: 5000 })) ||
                           (await profileIcon.isVisible({ timeout: 3000 }));

    expect(isStillLoggedIn).toBeTruthy();

    const metrics = journeyTracker.stop();
    console.log('Session restoration metrics:', {
      hasAuthCookie,
      duration: metrics.duration,
    });
  });

  test('quick access to key features from dashboard', async ({ page }) => {
    journeyTracker.start();

    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*dashboard|discover|home/, { timeout: 15000 });

    // Check for quick access to key features
    const features = {
      discover: page.locator('a[href*="discover"], button:has-text("Discover"), nav :has-text("Discover")'),
      matches: page.locator('a[href*="matches"], button:has-text("Matches"), nav :has-text("Matches")'),
      messages: page.locator('a[href*="message"], button:has-text("Messages"), nav :has-text("Messages")'),
      profile: page.locator('a[href*="profile"], button:has-text("Profile"), nav :has-text("Profile")'),
    };

    let accessibleFeatures = 0;
    for (const [name, locator] of Object.entries(features)) {
      if (await locator.first().isVisible({ timeout: 2000 })) {
        accessibleFeatures++;
      }
    }

    // At least 3 key features should be easily accessible
    expect(accessibleFeatures).toBeGreaterThanOrEqual(3);

    const metrics = journeyTracker.stop();
    console.log('Quick access metrics:', {
      accessibleFeatures,
      duration: metrics.duration,
    });
  });

  test('notification indicators are visible', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*dashboard|discover|home/, { timeout: 15000 });

    // Check for notification elements
    const notificationElements = page.locator(
      '.notification-badge, .badge, [data-notification], .unread-count, .notification-dot'
    );

    // Check for notification bell/icon
    const notificationIcon = page.locator(
      '[aria-label*="notification"], .notification-icon, button:has(.bell), svg[class*="bell"]'
    );

    const hasNotificationUI =
      (await notificationElements.count() > 0) ||
      (await notificationIcon.isVisible({ timeout: 3000 }));

    // Notification UI should be present (even if no notifications)
    expect(hasNotificationUI).toBeTruthy();
  });

  test('matches section is easily accessible', async ({ page }) => {
    journeyTracker.start();

    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*dashboard|discover|home/, { timeout: 15000 });

    journeyTracker.trackClick();

    // Navigate to matches
    const matchesLink = page.locator('a[href*="match"], button:has-text("Matches"), nav :has-text("Matches")').first();

    if (await matchesLink.isVisible({ timeout: 3000 })) {
      await matchesLink.click();
      journeyTracker.trackClick();

      // Should navigate to matches page
      await page.waitForTimeout(2000);

      // Should show matches or empty state
      const hasMatchContent =
        (await page.locator('.match-card, .match-item, [data-testid="match"]').count() > 0) ||
        (await page.locator('text=/no.*match|find.*match|start.*swiping/i').isVisible({ timeout: 3000 }));

      expect(hasMatchContent).toBeTruthy();
    }

    const metrics = journeyTracker.stop();
    expect(metrics.clickCount).toBeLessThanOrEqual(3); // Should reach matches in 3 clicks or less
  });
});

// ============================================================================
// Journey 3: Subscription Upgrade Journey
// Free user -> Hits limit -> Upgrade prompt -> Payment -> Feature unlock
// ============================================================================

test.describe('UX Validation - Subscription Upgrade Journey', () => {
  let journeyTracker: Awaited<ReturnType<typeof createJourneyTracker>>;

  test.beforeEach(async ({ page }) => {
    journeyTracker = await createJourneyTracker(page);
  });

  test('premium page has clear value proposition', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*dashboard|discover/, { timeout: 15000 });

    await page.goto('/premium');
    await page.waitForLoadState('networkidle');

    // Check for value proposition elements
    const headline = page.locator('h1, h2').first();
    await expect(headline).toBeVisible({ timeout: 5000 });

    // Check for feature list
    const features = page.locator('.feature, .benefit, li:has-text("Unlimited"), li:has-text("See who")');
    const featureCount = await features.count();
    expect(featureCount).toBeGreaterThan(0);

    // Check for clear pricing
    const pricing = page.locator('text=/\\$\\d+|price|per.*month/i');
    await expect(pricing.first()).toBeVisible({ timeout: 5000 });

    // Check for primary CTA
    const ctaButton = page.locator(
      'button:has-text("Subscribe"), button:has-text("Upgrade"), button:has-text("Get Premium")'
    );
    await expect(ctaButton.first()).toBeVisible({ timeout: 5000 });
  });

  test('upgrade prompts appear at appropriate moments', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*dashboard|discover/, { timeout: 15000 });

    // Navigate to discovery
    await page.goto('/discover');
    await page.waitForLoadState('networkidle');

    // Try premium features to trigger upgrade prompts
    const premiumFeatures = [
      page.locator('button[aria-label*="super"], .super-like-button'),
      page.locator('button[aria-label*="boost"], .boost-button'),
      page.locator('button[aria-label*="undo"], .undo-button'),
    ];

    for (const feature of premiumFeatures) {
      if (await feature.isVisible({ timeout: 2000 })) {
        await feature.click();

        // Check for upgrade prompt
        const upgradePrompt = page.locator(
          '.premium-prompt, [data-testid="upgrade-modal"], .paywall, text=/upgrade|premium|subscribe/i'
        );

        if (await upgradePrompt.isVisible({ timeout: 3000 })) {
          // Prompt should have clear CTA
          const promptCTA = page.locator(
            '.premium-prompt button, [data-testid="upgrade-modal"] button'
          );
          await expect(promptCTA.first()).toBeVisible({ timeout: 2000 });

          // Close modal and continue
          await page.keyboard.press('Escape');
          break;
        }
      }
    }
  });

  test('payment page has trust signals', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*dashboard|discover/, { timeout: 15000 });

    await page.goto('/premium');
    await page.waitForLoadState('networkidle');

    // Select a plan
    const selectButton = page.locator('.plan-card button, button:has-text("Choose")').first();
    if (await selectButton.isVisible({ timeout: 5000 })) {
      await selectButton.click();

      await page.waitForTimeout(2000);

      // Check for trust signals on payment page
      const trustSignals = {
        // Security badges
        secure: page.locator('text=/secure|ssl|encrypted/i, img[alt*="secure"], .secure-badge'),
        // Money back guarantee
        guarantee: page.locator('text=/guarantee|refund|money.*back/i'),
        // Payment provider logos
        paymentLogos: page.locator('img[alt*="stripe"], img[alt*="visa"], img[alt*="mastercard"]'),
        // Lock icons
        lockIcon: page.locator('svg[class*="lock"], .lock-icon, [aria-label*="secure"]'),
      };

      let trustSignalCount = 0;
      for (const [name, locator] of Object.entries(trustSignals)) {
        if (await locator.first().isVisible({ timeout: 2000 })) {
          trustSignalCount++;
        }
      }

      // Should have at least one trust signal
      expect(trustSignalCount).toBeGreaterThanOrEqual(1);
    }
  });

  test('plan comparison is clear and not confusing', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*dashboard|discover/, { timeout: 15000 });

    await page.goto('/premium');
    await page.waitForLoadState('networkidle');

    // Check for plan cards
    const planCards = page.locator('.plan-card, .pricing-card, [data-testid="plan"]');
    const planCount = await planCards.count();

    if (planCount > 1) {
      // Check that plans are visually distinct
      const firstPlan = planCards.first();
      const secondPlan = planCards.nth(1);

      const firstBox = await firstPlan.boundingBox();
      const secondBox = await secondPlan.boundingBox();

      // Plans should be properly spaced
      if (firstBox && secondBox) {
        expect(Math.abs(firstBox.x - secondBox.x) > 20 || Math.abs(firstBox.y - secondBox.y) > 20).toBeTruthy();
      }

      // Each plan should have clear name and price
      for (let i = 0; i < planCount; i++) {
        const plan = planCards.nth(i);
        const planText = await plan.textContent();

        // Should have price
        expect(planText).toMatch(/\$\d+/);
      }
    }

    // Check for recommended/highlighted plan
    const recommended = page.locator('.recommended, .popular, [data-recommended], .best-value');
    const hasRecommendation = await recommended.isVisible({ timeout: 3000 });

    // Having a recommended plan helps reduce decision paralysis
    // (not required, but good practice)
    console.log('Has recommended plan:', hasRecommendation);
  });

  test('upgrade confirmation is clear and celebratory', async ({ page }) => {
    // This test would run after a successful payment
    // For now, we test the success page directly

    await page.goto('/premium/success');
    await page.waitForLoadState('networkidle');

    // Check for success indicators
    const successIndicators = page.locator(
      'text=/success|congratulations|welcome|thank.*you|subscribed/i, .success-icon, svg[class*="check"]'
    );

    if (await successIndicators.first().isVisible({ timeout: 5000 })) {
      // Should show what they got
      const featureConfirmation = page.locator('text=/feature|benefit|now.*have|unlock/i');
      const hasFeatureConfirmation = await featureConfirmation.isVisible({ timeout: 3000 });

      // Should have clear next action
      const nextAction = page.locator(
        'button:has-text("Start"), button:has-text("Continue"), button:has-text("Explore"), a:has-text("Go")'
      );
      const hasNextAction = await nextAction.first().isVisible({ timeout: 3000 });

      expect(hasFeatureConfirmation || hasNextAction).toBeTruthy();
    }
  });
});

// ============================================================================
// Journey 4: Profile Completion Journey
// Incomplete profile -> Add photos -> Add bio -> Verification
// ============================================================================

test.describe('UX Validation - Profile Completion Journey', () => {
  let journeyTracker: Awaited<ReturnType<typeof createJourneyTracker>>;

  test.beforeEach(async ({ page }) => {
    journeyTracker = await createJourneyTracker(page);

    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard|discover|profile/, { timeout: 15000 });
  });

  test('profile completion progress is clearly visible', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    // Check for completion indicator
    const completionIndicators = page.locator(
      '.completion-percentage, [data-testid="profile-completion"], .progress-bar, text=/\\d+%.*complete/i'
    );

    const hasCompletionIndicator = await completionIndicators.first().isVisible({ timeout: 5000 });

    if (hasCompletionIndicator) {
      const completionText = await completionIndicators.first().textContent();
      console.log('Profile completion:', completionText);
    }

    // Check for improvement suggestions
    const suggestions = page.locator(
      '.suggestion, .improvement-tip, .profile-tip, text=/add.*photo|complete.*profile|improve/i'
    );
    const hasSuggestions = await suggestions.first().isVisible({ timeout: 3000 });

    // Should have either completion indicator or suggestions
    expect(hasCompletionIndicator || hasSuggestions).toBeTruthy();
  });

  test('photo upload has clear guidance', async ({ page }) => {
    await page.goto('/profile/edit');
    await page.waitForLoadState('networkidle');

    // Check for photo upload section
    const photoSection = page.locator(
      '.photo-upload, .photos-section, [data-testid="photos"], input[type="file"][accept*="image"]'
    );

    if (await photoSection.first().isVisible({ timeout: 5000 })) {
      // Check for guidance on photo requirements
      const photoGuidance = page.locator(
        'text=/upload|add.*photo|drag.*drop|minimum|face|clear/i'
      );
      const hasGuidance = await photoGuidance.first().isVisible({ timeout: 3000 });

      // Check for photo slots/placeholders
      const photoSlots = page.locator('.photo-slot, .photo-placeholder, [data-testid="photo-slot"]');
      const slotCount = await photoSlots.count();

      console.log('Photo upload guidance:', { hasGuidance, slotCount });

      expect(hasGuidance || slotCount > 0).toBeTruthy();
    }
  });

  test('bio input has character count and guidance', async ({ page }) => {
    await page.goto('/profile/edit');
    await page.waitForLoadState('networkidle');

    const bioInput = page.locator('textarea[name="bio"], textarea[placeholder*="bio"]');

    if (await bioInput.isVisible({ timeout: 5000 })) {
      // Check for character count
      const charCount = page.locator(
        '.char-count, .character-count, text=/\\d+.*character|\\d+.*\\//i'
      );
      const hasCharCount = await charCount.isVisible({ timeout: 3000 });

      // Check for placeholder or guidance
      const placeholder = await bioInput.getAttribute('placeholder');
      const hasPlaceholder = placeholder && placeholder.length > 10;

      // Check for tips near bio
      const bioTips = page.locator(
        'text=/tip|example|write.*about|tell.*about/i'
      );
      const hasTips = await bioTips.isVisible({ timeout: 3000 });

      console.log('Bio guidance:', { hasCharCount, hasPlaceholder, hasTips });

      expect(hasCharCount || hasPlaceholder || hasTips).toBeTruthy();
    }
  });

  test('changes are saved automatically or with clear save state', async ({ page }) => {
    await page.goto('/profile/edit');
    await page.waitForLoadState('networkidle');

    const bioInput = page.locator('textarea[name="bio"]');

    if (await bioInput.isVisible({ timeout: 5000 })) {
      // Make a change
      await bioInput.fill('Test bio update ' + Date.now());

      // Check for save indicators
      const saveIndicators = page.locator(
        'text=/saving|saved|auto.*save/i, .save-indicator, [data-testid="save-status"]'
      );

      const saveButton = page.locator('button:has-text("Save"), button[type="submit"]');

      const hasAutoSave = await saveIndicators.isVisible({ timeout: 3000 });
      const hasManualSave = await saveButton.isVisible({ timeout: 1000 });

      // Should have either auto-save indication or manual save button
      expect(hasAutoSave || hasManualSave).toBeTruthy();

      // If there's unsaved changes, should show warning
      const hasManualSaveEnabled = hasManualSave && await saveButton.isEnabled();

      if (hasManualSaveEnabled) {
        // Check for unsaved changes indicator
        const unsavedIndicator = page.locator(
          'text=/unsaved|changes|modified/i, .unsaved-indicator'
        );
        const showsUnsaved = await unsavedIndicator.isVisible({ timeout: 2000 });

        console.log('Save state indicators:', { hasAutoSave, hasManualSave, showsUnsaved });
      }
    }
  });

  test('verification process is clearly explained', async ({ page }) => {
    // Navigate to verification section
    await page.goto('/profile/verify');
    await page.waitForLoadState('networkidle');

    // May redirect to settings or profile
    if ((await page.url()).includes('verify')) {
      // Check for verification explanation
      const explanation = page.locator(
        'text=/verify|verified|badge|trust|authentic/i'
      );
      await expect(explanation.first()).toBeVisible({ timeout: 5000 });

      // Check for step-by-step instructions
      const steps = page.locator('.step, .instruction, ol li, [data-step]');
      const stepCount = await steps.count();

      // Should have clear steps or single clear instruction
      const hasInstructions = stepCount > 0;

      // Check for action button
      const verifyButton = page.locator(
        'button:has-text("Verify"), button:has-text("Start"), button:has-text("Begin")'
      );
      const hasActionButton = await verifyButton.isVisible({ timeout: 3000 });

      expect(hasInstructions || hasActionButton).toBeTruthy();
    }
  });
});

// ============================================================================
// Journey 5: Match & Messaging Journey
// Swipe -> Match -> Conversation start -> Message exchange
// ============================================================================

test.describe('UX Validation - Match & Messaging Journey', () => {
  let journeyTracker: Awaited<ReturnType<typeof createJourneyTracker>>;

  test.beforeEach(async ({ page }) => {
    journeyTracker = await createJourneyTracker(page);

    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard|discover/, { timeout: 15000 });
  });

  test('swipe interactions are smooth and responsive', async ({ page }) => {
    journeyTracker.start();

    await page.goto('/discover');
    await page.waitForLoadState('networkidle');

    // Wait for profile card
    const profileCard = page.locator('.profile-card, [data-testid="profile-card"]');

    if (await profileCard.first().isVisible({ timeout: 10000 })) {
      // Check for swipe buttons
      const likeButton = page.locator('button[aria-label*="like"], .like-button');
      const passButton = page.locator('button[aria-label*="pass"], .pass-button, button[aria-label*="nope"]');

      const hasLikeButton = await likeButton.isVisible({ timeout: 3000 });
      const hasPassButton = await passButton.isVisible({ timeout: 3000 });

      expect(hasLikeButton && hasPassButton).toBeTruthy();

      // Test button responsiveness
      if (hasLikeButton) {
        const startTime = Date.now();
        await likeButton.click();
        const responseTime = Date.now() - startTime;

        // Button should respond quickly (under 500ms for visual feedback)
        expect(responseTime).toBeLessThan(500);
      }
    }

    const metrics = journeyTracker.stop();
    console.log('Swipe interaction metrics:', {
      duration: metrics.duration,
      consoleErrors: metrics.consoleErrors.length,
    });
  });

  test('match notification is celebratory and has clear next action', async ({ page }) => {
    await page.goto('/discover');
    await page.waitForLoadState('networkidle');

    // Simulate checking for match notification
    // In real scenario, this would appear after mutual like
    const matchNotification = page.locator(
      '.match-notification, .match-modal, [data-testid="match"], text=/it.*match|matched/i'
    );

    // If match notification exists, verify it's well designed
    if (await matchNotification.isVisible({ timeout: 5000 })) {
      // Should have celebratory element
      const celebration = page.locator(
        '.confetti, .celebration, .animation, img[alt*="match"], svg[class*="heart"]'
      );
      const hasCelebration = await celebration.isVisible({ timeout: 2000 });

      // Should have clear next actions
      const messageButton = page.locator('button:has-text("Message"), button:has-text("Say Hi")');
      const continueButton = page.locator('button:has-text("Keep Swiping"), button:has-text("Continue")');

      const hasMessageAction = await messageButton.isVisible({ timeout: 2000 });
      const hasContinueAction = await continueButton.isVisible({ timeout: 2000 });

      expect(hasMessageAction || hasContinueAction).toBeTruthy();
    }
  });

  test('conversation start is frictionless', async ({ page }) => {
    journeyTracker.start();

    await page.goto('/matches');
    await page.waitForLoadState('networkidle');

    // Check for matches
    const matchCard = page.locator('.match-card, [data-testid="match"], .match-item').first();

    if (await matchCard.isVisible({ timeout: 5000 })) {
      journeyTracker.trackClick();
      await matchCard.click();

      // Should navigate to or open conversation
      await page.waitForTimeout(2000);

      // Check for message input
      const messageInput = page.locator(
        'textarea[name="message"], input[name="message"], [contenteditable="true"], .message-input'
      );

      const hasMessageInput = await messageInput.isVisible({ timeout: 5000 });

      // Check for conversation context (match info)
      const matchInfo = page.locator('.match-header, .conversation-header, .profile-preview');
      const hasMatchContext = await matchInfo.isVisible({ timeout: 3000 });

      expect(hasMessageInput).toBeTruthy();

      const metrics = journeyTracker.stop();
      // Should reach conversation in 2 clicks or less
      expect(metrics.clickCount).toBeLessThanOrEqual(2);
    }
  });

  test('message input is intuitive with clear send action', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');

    // Click on a conversation
    const conversation = page.locator('.conversation-item, [data-testid="conversation"]').first();

    if (await conversation.isVisible({ timeout: 5000 })) {
      await conversation.click();

      await page.waitForTimeout(2000);

      // Check for message input
      const messageInput = page.locator(
        'textarea[name="message"], input[name="message"], [contenteditable="true"]'
      );

      if (await messageInput.isVisible({ timeout: 5000 })) {
        // Check for send button
        const sendButton = page.locator(
          'button[type="submit"], button:has-text("Send"), button[aria-label*="send"]'
        );
        const hasSendButton = await sendButton.isVisible({ timeout: 3000 });

        // Check for emoji picker
        const emojiButton = page.locator('button[aria-label*="emoji"], .emoji-button');
        const hasEmojiPicker = await emojiButton.isVisible({ timeout: 2000 });

        // Check for attachment option
        const attachButton = page.locator('button[aria-label*="attach"], input[type="file"]');
        const hasAttachment = await attachButton.isVisible({ timeout: 2000 });

        expect(hasSendButton).toBeTruthy();

        console.log('Message input features:', { hasSendButton, hasEmojiPicker, hasAttachment });
      }
    }
  });

  test('no jarring redirects during messaging flow', async ({ page }) => {
    journeyTracker.start();

    await page.goto('/messages');
    const initialUrl = page.url();

    await page.waitForLoadState('networkidle');

    // Interact with messages
    const conversation = page.locator('.conversation-item').first();

    if (await conversation.isVisible({ timeout: 5000 })) {
      await conversation.click();
      await page.waitForTimeout(1000);

      // URL should update smoothly (not jump to unexpected location)
      const currentUrl = page.url();

      // Should still be in messages context
      expect(currentUrl).toMatch(/message|chat|conversation/i);

      // Check for smooth transition
      const hasLoadingState = await page.locator('.loading, .skeleton, [data-loading]').isVisible({ timeout: 500 });

      // Either loads immediately or shows loading state
      console.log('Transition smoothness:', { hasLoadingState });
    }

    const metrics = journeyTracker.stop();
    // No network errors during flow
    expect(metrics.networkErrors.filter((e) => e.status >= 500)).toHaveLength(0);
  });
});

// ============================================================================
// Core UX Patterns Tests
// ============================================================================

test.describe('UX Validation - Core Patterns', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard|discover/, { timeout: 15000 });
  });

  test('loading states provide feedback', async ({ page }) => {
    await page.goto('/discover');

    // Check for loading indicators during page load
    const loadingIndicators = page.locator(
      '.loading, .spinner, .skeleton, [data-loading], [aria-busy="true"], .loader'
    );

    // May or may not show loading depending on speed
    await page.waitForTimeout(500);

    // After loading, content should appear
    const content = page.locator('.profile-card, .main-content, [data-testid="content"]');
    await expect(content.first()).toBeVisible({ timeout: 15000 });
  });

  test('empty states guide users to next action', async ({ page }) => {
    // Check matches page for potential empty state
    await page.goto('/matches');
    await page.waitForLoadState('networkidle');

    const emptyState = page.locator('.empty-state, [data-testid="empty"], text=/no.*match|start.*swiping/i');

    if (await emptyState.isVisible({ timeout: 5000 })) {
      // Empty state should have call to action
      const ctaButton = page.locator('button, a').filter({ hasText: /swipe|discover|find|start/i });

      const hasCTA = await ctaButton.first().isVisible({ timeout: 3000 });
      expect(hasCTA).toBeTruthy();

      // Should have encouraging message
      const message = await emptyState.textContent();
      expect(message?.length).toBeGreaterThan(10);
    }
  });

  test('critical actions have confirmation dialogs', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Try to find destructive actions
    const deleteAccountButton = page.locator('button:has-text("Delete Account"), button:has-text("Deactivate")');

    if (await deleteAccountButton.isVisible({ timeout: 5000 })) {
      await deleteAccountButton.click();

      // Should show confirmation dialog
      const confirmDialog = page.locator(
        '[role="dialog"], .modal, .confirm-dialog, [data-testid="confirmation"]'
      );
      const hasConfirmation = await confirmDialog.isVisible({ timeout: 3000 });

      expect(hasConfirmation).toBeTruthy();

      // Dialog should have cancel option
      const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("No")');
      await expect(cancelButton).toBeVisible({ timeout: 2000 });

      // Close dialog
      await page.keyboard.press('Escape');
    }
  });

  test('navigation breadcrumbs or back buttons prevent disorientation', async ({ page }) => {
    // Navigate deep into settings
    await page.goto('/settings/privacy');
    await page.waitForLoadState('networkidle');

    // Check for navigation aids
    const backButton = page.locator('button[aria-label*="back"], a:has-text("Back"), .back-button');
    const breadcrumbs = page.locator('.breadcrumb, [aria-label*="breadcrumb"], nav ol');

    const hasBackButton = await backButton.isVisible({ timeout: 3000 });
    const hasBreadcrumbs = await breadcrumbs.isVisible({ timeout: 2000 });

    // Should have at least one navigation aid
    expect(hasBackButton || hasBreadcrumbs).toBeTruthy();
  });

  test('form validation is immediate and helpful', async ({ page }) => {
    await page.goto('/profile/edit');
    await page.waitForLoadState('networkidle');

    const bioInput = page.locator('textarea[name="bio"]');

    if (await bioInput.isVisible({ timeout: 5000 })) {
      // Clear and type invalid content
      await bioInput.clear();
      await bioInput.fill('x'); // Too short
      await bioInput.blur();

      // Should show validation within 2 seconds
      const validation = page.locator('.error, .validation-error, [role="alert"], text=/too.*short|minimum/i');
      const hasValidation = await validation.isVisible({ timeout: 2000 });

      if (hasValidation) {
        const validationText = await validation.first().textContent();

        // Validation should be helpful (explain what's wrong)
        expect(validationText?.length).toBeGreaterThan(5);
        expect(validationText).not.toMatch(/error|invalid/i); // Should be more descriptive
      }
    }
  });

  test('mobile touch targets are appropriately sized', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/discover');
    await page.waitForLoadState('networkidle');

    const { violations } = await checkTouchTargets(page);

    // Log any violations for review
    if (violations.length > 0) {
      console.log('Touch target violations:', violations);
    }

    // Allow some violations but not too many
    // (Some small icons with large touch areas may still pass)
    expect(violations.length).toBeLessThan(10);
  });

  test('keyboard navigation works for accessibility', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Tab through form
    await page.keyboard.press('Tab');

    // Should focus on first input
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON', 'A']).toContain(focusedElement);

    // Continue tabbing
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Check for visible focus indicator
    const hasFocusRing = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return false;
      const styles = getComputedStyle(el);
      return styles.outline !== 'none' || styles.boxShadow !== 'none';
    });

    // Should have visible focus indicator
    expect(hasFocusRing).toBeTruthy();
  });

  test('error recovery options are available after failures', async ({ page }) => {
    // Trigger a potential error state
    await page.goto('/nonexistent-page-12345');
    await page.waitForLoadState('networkidle');

    // Check for 404 or error page
    const errorPage = page.locator('text=/404|not.*found|error|oops/i');

    if (await errorPage.isVisible({ timeout: 5000 })) {
      // Should have recovery options
      const homeLink = page.locator('a:has-text("Home"), a:has-text("Go back"), button:has-text("Return")');
      const hasRecovery = await homeLink.first().isVisible({ timeout: 3000 });

      expect(hasRecovery).toBeTruthy();
    }
  });

  test('modals can be dismissed easily', async ({ page }) => {
    await page.goto('/discover');
    await page.waitForLoadState('networkidle');

    // Try to trigger a modal (e.g., profile details)
    const profileCard = page.locator('.profile-card').first();

    if (await profileCard.isVisible({ timeout: 5000 })) {
      // Click to expand profile details if available
      await profileCard.click();

      await page.waitForTimeout(1000);

      // Check if modal opened
      const modal = page.locator('[role="dialog"], .modal, [data-testid="modal"]');

      if (await modal.isVisible({ timeout: 3000 })) {
        // Should be dismissable by pressing Escape
        await page.keyboard.press('Escape');

        await page.waitForTimeout(500);

        // Modal should be closed
        const modalStillVisible = await modal.isVisible();

        // Or check for close button
        const closeButton = page.locator(
          'button[aria-label*="close"], button:has-text("Close"), .close-button'
        );

        expect(modalStillVisible === false || await closeButton.isVisible()).toBeTruthy();
      }
    }
  });

  test('consistent visual hierarchy across pages', async ({ page }) => {
    const pagesToCheck = ['/discover', '/matches', '/profile', '/settings'];

    for (const pagePath of pagesToCheck) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');

      // Check for consistent header
      const header = page.locator('header, nav, .header, .navbar');
      const hasHeader = await header.first().isVisible({ timeout: 3000 });

      // Check for main content area
      const main = page.locator('main, .main-content, [role="main"], .content');
      const hasMain = await main.first().isVisible({ timeout: 3000 });

      expect(hasHeader || hasMain).toBeTruthy();
    }
  });
});

// ============================================================================
// Performance and Metrics Collection
// ============================================================================

test.describe('UX Validation - Performance Metrics', () => {
  test('capture Time to Interactive for key pages', async ({ page }) => {
    const pages = [
      { name: 'Landing', path: '/' },
      { name: 'Login', path: '/login' },
      { name: 'Register', path: '/register' },
      { name: 'Discover', path: '/discover' },
    ];

    const metrics: Record<string, number> = {};

    for (const { name, path } of pages) {
      const startTime = Date.now();

      await page.goto(path);

      // Wait for interactive state
      await page.waitForLoadState('domcontentloaded');

      // Find first interactive element
      const interactive = page.locator('button, a, input').first();
      await interactive.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});

      const tti = Date.now() - startTime;
      metrics[name] = tti;
    }

    console.log('Time to Interactive metrics (ms):', metrics);

    // All key pages should be interactive within 5 seconds
    for (const [pageName, tti] of Object.entries(metrics)) {
      expect(tti).toBeLessThan(5000);
    }
  });

  test('track click count for complete user journey', async ({ page }) => {
    let clickCount = 0;

    // Track all clicks
    page.on('click', () => clickCount++);

    // Complete a simple journey: Login -> View Profile
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPass123!');

    clickCount = 0; // Reset before counting journey clicks

    await page.click('button[type="submit"]');
    clickCount++;

    await page.waitForURL(/.*dashboard|discover/, { timeout: 15000 });

    // Navigate to profile
    const profileLink = page.locator('a[href*="profile"], button:has-text("Profile")').first();
    if (await profileLink.isVisible({ timeout: 5000 })) {
      await profileLink.click();
      clickCount++;
    }

    console.log('Clicks to complete Login -> Profile journey:', clickCount);

    // Should complete in reasonable number of clicks
    expect(clickCount).toBeLessThanOrEqual(5);
  });

  test('no console errors during typical user session', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Simulate typical user session
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*dashboard|discover/, { timeout: 15000 });

    // Visit several pages
    await page.goto('/discover');
    await page.waitForTimeout(2000);

    await page.goto('/matches');
    await page.waitForTimeout(2000);

    await page.goto('/profile');
    await page.waitForTimeout(2000);

    // Filter out known acceptable errors
    const criticalErrors = consoleErrors.filter(
      (error) => !error.includes('favicon') && !error.includes('analytics')
    );

    console.log('Console errors during session:', criticalErrors);

    // Should have no critical console errors
    expect(criticalErrors).toHaveLength(0);
  });

  test('track network request failures during journey', async ({ page }) => {
    const failedRequests: Array<{ url: string; status: number }> = [];

    page.on('response', (response) => {
      if (response.status() >= 400) {
        failedRequests.push({
          url: response.url(),
          status: response.status(),
        });
      }
    });

    // Complete a journey
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPass123!');
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*dashboard|discover/, { timeout: 15000 });

    await page.goto('/discover');
    await page.waitForTimeout(3000);

    // Filter out expected failures (like 404 for optional assets)
    const criticalFailures = failedRequests.filter(
      (req) => req.status >= 500 || (req.status >= 400 && !req.url.includes('analytics'))
    );

    console.log('Network failures during journey:', criticalFailures);

    // Should have no server errors
    const serverErrors = criticalFailures.filter((req) => req.status >= 500);
    expect(serverErrors).toHaveLength(0);
  });
});
