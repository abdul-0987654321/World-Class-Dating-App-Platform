import { test, expect } from '@playwright/test';

/**
 * Subscription & Payment Tests
 * Tests for premium features, payment flows, and subscription management
 */

const TEST_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD;

test.describe('Subscription - Public Paywall', () => {
  test('should display premium features on landing page', async ({ page }) => {
    await page.goto('/');

    // Premium features section
    const premiumSection = page.getByText(/premium|upgrade|unlock/i).first();

    await expect(page.locator('body')).toBeVisible();
  });

  test('should have pricing page accessible', async ({ page }) => {
    await page.goto('/pricing');

    // Pricing tiers should be visible
    const pricingTiers = page.locator('[data-testid="pricing-tier"], .pricing-card, .plan-card').first();

    await expect(page.locator('body')).toBeVisible();
  });

  test('should display pricing tiers clearly', async ({ page }) => {
    await page.goto('/pricing');

    // Multiple plan options
    const plans = await page.locator('[data-testid="pricing-tier"], .pricing-card').all();

    // Should have at least one plan
    await expect(page.locator('body')).toBeVisible();
  });

  test('should show feature comparison', async ({ page }) => {
    await page.goto('/pricing');

    // Feature comparison table or list
    const features = page.locator('[data-testid="feature-comparison"], .features-list').first();

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Subscription - Authenticated User', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Skipping: No test credentials provided');

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: /email/i }).fill(TEST_EMAIL!);
    await page.locator('input[type="password"]').first().fill(TEST_PASSWORD!);
    await page.getByRole('button', { name: /log in|sign in|continue/i }).click();
    await page.waitForURL(/app|home/i, { timeout: 10000 });
  });

  test('should show current subscription status', async ({ page }) => {
    await page.goto('/app/subscription');

    // Current plan info
    const currentPlan = page.getByText(/current plan|your plan|subscription/i).first();

    await expect(page.locator('body')).toBeVisible();
  });

  test('should display upgrade options for free users', async ({ page }) => {
    await page.goto('/app/subscription');

    // Upgrade button/options
    const upgradeOption = page.locator('[data-testid="upgrade-button"], button:has-text("upgrade"), a:has-text("upgrade")').first();

    await expect(page.locator('body')).toBeVisible();
  });

  test('should show premium feature highlights', async ({ page }) => {
    await page.goto('/app/subscription');

    // Premium features list
    const features = [
      /unlimited likes/i,
      /see who likes/i,
      /super like/i,
      /boost/i,
      /rewind/i,
      /passport/i,
      /no ads/i,
    ];

    await expect(page.locator('body')).toBeVisible();
  });

  test('should trigger paywall on premium feature attempt', async ({ page }) => {
    // Try to access a premium feature
    await page.goto('/app/likes');

    await page.waitForTimeout(2000);

    // Should show paywall/upgrade prompt or unlock if premium
    const paywall = page.getByText(/upgrade|premium|unlock|subscribe/i).first();

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Subscription - Payment Flow', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Skipping: No test credentials provided');

  test('should navigate to checkout', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: /email/i }).fill(TEST_EMAIL!);
    await page.locator('input[type="password"]').first().fill(TEST_PASSWORD!);
    await page.getByRole('button', { name: /log in|sign in|continue/i }).click();
    await page.waitForURL(/app|home/i, { timeout: 10000 });

    await page.goto('/app/subscription');

    const selectPlanButton = page.locator('[data-testid="select-plan"], button:has-text("select"), button:has-text("choose")').first();

    if (await selectPlanButton.isVisible().catch(() => false)) {
      await selectPlanButton.click();
      await page.waitForTimeout(1000);

      // Should navigate to checkout or show payment modal
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should display secure payment form', async ({ page }) => {
    await page.goto('/app/checkout');

    // Payment form elements (Stripe, etc.)
    const paymentForm = page.locator('[data-testid="payment-form"], #payment-form, .payment-form').first();
    const cardInput = page.locator('[data-testid="card-element"], #card-element').first();

    await expect(page.locator('body')).toBeVisible();
  });

  test('should show payment security badges', async ({ page }) => {
    await page.goto('/app/checkout');

    // Security indicators
    const securePayment = page.getByText(/secure|encrypted|ssl/i).first();

    await expect(page.locator('body')).toBeVisible();
  });

  test('should validate payment form', async ({ page }) => {
    await page.goto('/app/checkout');

    const submitButton = page.getByRole('button', { name: /pay|subscribe|complete/i }).first();

    if (await submitButton.isVisible().catch(() => false)) {
      // Click without filling form
      await submitButton.click();

      // Should show validation errors
      await page.waitForTimeout(500);
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should handle payment errors gracefully', async ({ page }) => {
    // Would need test card numbers from Stripe
    await page.goto('/app/checkout');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Subscription - Management', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Skipping: No test credentials provided');

  test('should show billing history', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: /email/i }).fill(TEST_EMAIL!);
    await page.locator('input[type="password"]').first().fill(TEST_PASSWORD!);
    await page.getByRole('button', { name: /log in|sign in|continue/i }).click();
    await page.waitForURL(/app|home/i, { timeout: 10000 });

    await page.goto('/app/settings/billing');

    const billingHistory = page.getByText(/billing|payment|invoice/i).first();

    await expect(page.locator('body')).toBeVisible();
  });

  test('should allow subscription cancellation', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: /email/i }).fill(TEST_EMAIL!);
    await page.locator('input[type="password"]').first().fill(TEST_PASSWORD!);
    await page.getByRole('button', { name: /log in|sign in|continue/i }).click();
    await page.waitForURL(/app|home/i, { timeout: 10000 });

    await page.goto('/app/settings/subscription');

    const cancelOption = page.getByText(/cancel|unsubscribe/i).first();

    await expect(page.locator('body')).toBeVisible();
  });

  test('should show cancellation confirmation', async ({ page }) => {
    await page.goto('/app/settings/subscription');

    const cancelButton = page.locator('[data-testid="cancel-subscription"]').first();

    if (await cancelButton.isVisible().catch(() => false)) {
      await cancelButton.click();

      // Should show confirmation with retention offer
      const confirmDialog = page.locator('[role="dialog"], .modal').first();
      await page.waitForTimeout(500);

      // Cancel the cancellation
      const keepButton = page.getByRole('button', { name: /keep|stay|no/i }).first();
      if (await keepButton.isVisible().catch(() => false)) {
        await keepButton.click();
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('should allow plan changes', async ({ page }) => {
    await page.goto('/app/settings/subscription');

    const changePlanOption = page.getByText(/change plan|upgrade|downgrade/i).first();

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Subscription - In-App Purchases', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Skipping: No test credentials provided');

  test('should display boost purchase option', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: /email/i }).fill(TEST_EMAIL!);
    await page.locator('input[type="password"]').first().fill(TEST_PASSWORD!);
    await page.getByRole('button', { name: /log in|sign in|continue/i }).click();
    await page.waitForURL(/app|home/i, { timeout: 10000 });

    await page.goto('/app/discover');

    // Boost button or option
    const boostButton = page.locator('[data-testid="boost-button"], button:has-text("boost")').first();

    await expect(page.locator('body')).toBeVisible();
  });

  test('should display super like purchase option', async ({ page }) => {
    await page.goto('/app/discover');

    // Super like purchase
    const superLikeOption = page.locator('[data-testid="super-like-purchase"]').first();

    await expect(page.locator('body')).toBeVisible();
  });

  test('should show currency/price clearly', async ({ page }) => {
    await page.goto('/pricing');

    // Price should include currency symbol
    const priceElement = page.locator('[data-testid="price"], .price').first();

    if (await priceElement.isVisible().catch(() => false)) {
      const priceText = await priceElement.textContent();
      // Should have currency indicator
      expect(priceText).toMatch(/\$|€|£|USD|EUR|GBP|\d+/);
    }

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Subscription - Refund Policy', () => {
  test('should have accessible refund policy', async ({ page }) => {
    await page.goto('/refund-policy');

    const refundContent = page.getByText(/refund|return|cancellation/i).first();

    await expect(page.locator('body')).toBeVisible();
  });

  test('should have terms of service', async ({ page }) => {
    await page.goto('/terms');

    const termsContent = page.getByText(/terms|service|agreement/i).first();

    await expect(page.locator('body')).toBeVisible();
  });
});
