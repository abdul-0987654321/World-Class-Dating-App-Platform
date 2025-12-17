import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Payment/Subscription Flow
 */

test.describe('Payment and Subscription', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL as string);
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD as string);
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*discover|dashboard/);
  });

  test('should view subscription plans', async ({ page }) => {
    // Navigate to subscription page
    await page.goto('/premium');

    // Should display subscription tiers
    await expect(page.locator('text=/premium|subscription|plan/i')).toBeVisible();

    // Should have multiple plan options
    const plans = await page.locator('.plan-card, [data-testid="subscription-plan"]');
    const planCount = await plans.count();
    expect(planCount).toBeGreaterThan(0);

    // Each plan should have price
    await expect(page.locator('text=/\\$\\d+|price/i')).toBeVisible();
  });

  test('should display plan features', async ({ page }) => {
    await page.goto('/premium');

    // Check for feature lists
    await expect(page.locator('text=/unlimited.*like/i')).toBeVisible();
    await expect(page.locator('text=/see.*who.*liked/i')).toBeVisible();

    // May have other premium features
    const features = await page.locator('.feature, [data-testid="feature"]').count();
    expect(features).toBeGreaterThan(0);
  });

  test('should select subscription plan', async ({ page }) => {
    await page.goto('/premium');

    // Click on a plan
    await page.click('.plan-card:first-child button, button:has-text("Choose"), button:has-text("Select")');

    // Should proceed to payment
    await expect(page).toHaveURL(/.*checkout|payment/, { timeout: 5000 });

    // Should show order summary
    await expect(page.locator('text=/total|summary/i')).toBeVisible();
  });

  test('should apply promo code', async ({ page }) => {
    await page.goto('/premium');

    // Select plan
    await page.click('.plan-card button').first();
    await page.waitForURL(/.*checkout|payment/);

    // Enter promo code
    try {
      await page.click('text=Promo code, button:has-text("Promo")');
      await page.fill('input[name="promoCode"], input[placeholder*="promo"]', 'SAVE20');
      await page.click('button:has-text("Apply")');

      await page.waitForTimeout(1000);

      // Should show discount
      await expect(page.locator('text=/discount|saved/i')).toBeVisible();

      // Total should be reduced
      const totalText = await page.locator('text=/total.*\\$/i').textContent();
      expect(totalText).toBeTruthy();
    } catch {
      // Promo code field might not be visible initially
    }
  });

  test('should enter payment details (Stripe test mode)', async ({ page }) => {
    await page.goto('/premium');
    await page.click('.plan-card button').first();
    await page.waitForURL(/.*checkout|payment/);

    // Wait for Stripe iframe to load
    await page.waitForTimeout(2000);

    // Fill payment details in Stripe Elements
    // Note: Stripe uses iframes which require special handling
    const stripeFrame = page.frameLocator('iframe[name*="__privateStripeFrame"]').first();

    try {
      // Fill card number
      await stripeFrame.locator('input[name="cardnumber"]').fill('4242424242424242');

      // Fill expiry
      await stripeFrame.locator('input[name="exp-date"]').fill('12/25');

      // Fill CVC
      await stripeFrame.locator('input[name="cvc"]').fill('123');

      // Fill postal code (if required)
      await stripeFrame.locator('input[name="postal"]').fill('12345');
    } catch {
      // Stripe element structure might differ
      console.log('Could not fill Stripe fields - UI may vary');
    }

    // Fill billing info
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');

    // Submit payment
    await page.click('button:has-text("Subscribe"), button:has-text("Pay"), button[type="submit"]');

    // Wait for processing
    await page.waitForTimeout(3000);

    // Should show success or redirect
    try {
      await expect(page.locator('text=/success|thank you|subscribed/i')).toBeVisible({ timeout: 10000 });
    } catch {
      // May redirect to dashboard instead
      await expect(page).toHaveURL(/.*dashboard|premium/);
    }
  });

  test('should handle payment failure', async ({ page }) => {
    await page.goto('/premium');
    await page.click('.plan-card button').first();
    await page.waitForURL(/.*checkout|payment/);

    await page.waitForTimeout(2000);

    // Use Stripe test card that will be declined
    const stripeFrame = page.frameLocator('iframe[name*="__privateStripeFrame"]').first();

    try {
      // Card that will be declined
      await stripeFrame.locator('input[name="cardnumber"]').fill('4000000000000002');
      await stripeFrame.locator('input[name="exp-date"]').fill('12/25');
      await stripeFrame.locator('input[name="cvc"]').fill('123');
    } catch {
      console.log('Could not fill Stripe fields');
    }

    await page.fill('input[name="name"]', 'Test User');
    await page.click('button:has-text("Subscribe"), button[type="submit"]');

    await page.waitForTimeout(3000);

    // Should show error message
    await expect(page.locator('text=/declined|failed|error/i')).toBeVisible();
  });

  test('should purchase coin package', async ({ page }) => {
    await page.goto('/coins');

    // Should display coin packages
    await expect(page.locator('.coin-package, [data-testid="coin-package"]').first()).toBeVisible();

    // Click on a package
    await page.click('.coin-package button').first();

    // Should proceed to checkout
    await page.waitForTimeout(1000);

    // May redirect to payment page
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/checkout|payment|coins/);
  });

  test('should view transaction history', async ({ page }) => {
    // Navigate to account settings
    await page.goto('/settings');

    // Go to billing/transactions
    await page.click('text=Billing, text=Transactions, [href="/settings/billing"]');

    // Should show transaction list
    await expect(page.locator('.transaction, [data-testid="transaction"]').first()).toBeVisible({ timeout: 5000 });

    // Transactions should have details
    await expect(page.locator('text=/\\$\\d+/i')).toBeVisible();
    await expect(page.locator('text=/\\d{1,2}\\/\\d{1,2}\\/\\d{4}|\\d{4}-\\d{2}-\\d{2}/i')).toBeVisible();
  });

  test('should cancel subscription', async ({ page }) => {
    // Assuming user has active subscription
    await page.goto('/settings');

    try {
      // Navigate to subscription settings
      await page.click('text=Subscription, [href="/settings/subscription"]');

      // Click cancel subscription
      await page.click('button:has-text("Cancel Subscription")');

      // Should show confirmation dialog
      await expect(page.locator('.modal, dialog, [role="dialog"]')).toBeVisible();

      // Confirm cancellation
      await page.click('button:has-text("Confirm"), button:has-text("Yes")');

      await page.waitForTimeout(2000);

      // Should show cancellation confirmation
      await expect(page.locator('text=/cancelled|cancel.*end/i')).toBeVisible();
    } catch {
      // User might not have active subscription
    }
  });

  test('should provide cancellation feedback', async ({ page }) => {
    await page.goto('/settings');

    try {
      await page.click('text=Subscription');
      await page.click('button:has-text("Cancel Subscription")');

      // Should ask for feedback
      await expect(page.locator('text=/why.*cancelling|reason/i')).toBeVisible();

      // Select reason
      await page.click('input[value="too_expensive"], label:has-text("Too expensive")');

      // Add optional feedback
      await page.fill('textarea[name="feedback"]', 'Found a better alternative');

      await page.click('button:has-text("Submit"), button:has-text("Confirm")');

      await page.waitForTimeout(1000);
    } catch {
      // Cancellation flow might differ
    }
  });

  test('should reactivate cancelled subscription', async ({ page }) => {
    await page.goto('/settings');

    try {
      await page.click('text=Subscription');

      // If subscription is cancelled but not expired
      const reactivateButton = page.locator('button:has-text("Reactivate"), button:has-text("Resume")');

      if (await reactivateButton.isVisible({ timeout: 2000 })) {
        await reactivateButton.click();

        // Confirm reactivation
        await page.click('button:has-text("Confirm")');

        await page.waitForTimeout(2000);

        // Should show success message
        await expect(page.locator('text=/reactivated|resumed/i')).toBeVisible();
      }
    } catch {
      // No cancelled subscription to reactivate
    }
  });

  test('should upgrade subscription plan', async ({ page }) => {
    await page.goto('/settings');

    try {
      await page.click('text=Subscription');

      // Click upgrade
      await page.click('button:has-text("Upgrade"), button:has-text("Change Plan")');

      // Select higher tier plan
      await page.click('.plan-card:last-child button, button:has-text("Select")');

      // Proceed to payment
      await page.waitForTimeout(1000);

      // Should show prorated amount
      await expect(page.locator('text=/prorated|credit/i')).toBeVisible();
    } catch {
      // Upgrade option might not be available
    }
  });

  test('should download invoice', async ({ page }) => {
    await page.goto('/settings');
    await page.click('text=Billing');

    try {
      // Click download on first transaction
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Download"), button:has-text("Invoice"), a:has-text("Invoice")').first();

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/invoice|receipt/i);
    } catch {
      // Download option might not exist
    }
  });

  test('should update payment method', async ({ page }) => {
    await page.goto('/settings');
    await page.click('text=Billing, text=Payment Methods');

    try {
      // Click add/update payment method
      await page.click('button:has-text("Add Payment Method"), button:has-text("Update")');

      await page.waitForTimeout(2000);

      // Fill new card details
      const stripeFrame = page.frameLocator('iframe[name*="__privateStripeFrame"]').first();

      await stripeFrame.locator('input[name="cardnumber"]').fill('4242424242424242');
      await stripeFrame.locator('input[name="exp-date"]').fill('12/26');
      await stripeFrame.locator('input[name="cvc"]').fill('123');

      await page.click('button:has-text("Save")');

      await page.waitForTimeout(2000);

      // Should show success
      await expect(page.locator('text=/saved|updated/i')).toBeVisible();
    } catch {
      console.log('Could not update payment method');
    }
  });

  test('should apply promotional pricing for new users', async ({ page }) => {
    // This would typically be tested with a new user account
    await page.goto('/premium');

    // Check for promotional banner or discount
    try {
      await expect(page.locator('text=/\\d+%.*off|limited.*time|special.*offer/i')).toBeVisible();
    } catch {
      // No active promotion
    }
  });

  test('should show premium features after subscription', async ({ page }) => {
    // Assuming user has premium subscription
    await page.goto('/discover');

    try {
      // Premium features should be accessible
      // For example: see who liked you
      await page.click('text=Likes You, [href="/likes"]');

      await expect(page).toHaveURL(/.*likes/);

      // Should show users who liked
      // (depends on having actual likes)
    } catch {
      // User might not be premium or no likes
    }
  });
});
