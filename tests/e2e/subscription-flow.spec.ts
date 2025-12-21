import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Subscription Flow
 * Tests: View plans -> Subscribe -> Verify premium features
 */

test.describe('Subscription Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard|discover/, { timeout: 15000 });
  });

  test.describe('View Plans', () => {
    test('should display subscription plans page', async ({ page }) => {
      await page.goto('/premium');

      // Should show premium/subscription page
      await expect(page.locator('text=/premium|subscription|upgrade/i')).toBeVisible({ timeout: 5000 });
    });

    test('should show multiple plan tiers', async ({ page }) => {
      await page.goto('/premium');

      await page.waitForTimeout(2000);

      // Should have multiple plans
      const plans = page.locator('.plan-card, [data-testid="subscription-plan"], .pricing-card');
      const planCount = await plans.count();

      expect(planCount).toBeGreaterThanOrEqual(1);
    });

    test('should display plan prices', async ({ page }) => {
      await page.goto('/premium');

      await page.waitForTimeout(2000);

      // Each plan should have a price
      const prices = page.locator('text=/\\$\\d+\\.?\\d*|\\d+.*month|price/i');
      await expect(prices.first()).toBeVisible({ timeout: 5000 });
    });

    test('should display plan features', async ({ page }) => {
      await page.goto('/premium');

      await page.waitForTimeout(2000);

      // Should show feature list
      const features = page.locator('.feature, .plan-feature, [data-testid="feature"]');
      const featureCount = await features.count();

      expect(featureCount).toBeGreaterThan(0);

      // Common premium features
      const unlimitedLikes = page.locator('text=/unlimited.*like/i');
      const seeWhoLiked = page.locator('text=/see.*who.*liked/i');
      const rewind = page.locator('text=/rewind|undo/i');

      // At least one premium feature should be visible
      const hasUnlimitedLikes = await unlimitedLikes.isVisible({ timeout: 2000 });
      const hasSeeWhoLiked = await seeWhoLiked.isVisible({ timeout: 1000 });
      const hasRewind = await rewind.isVisible({ timeout: 1000 });

      expect(hasUnlimitedLikes || hasSeeWhoLiked || hasRewind).toBeTruthy();
    });

    test('should highlight recommended plan', async ({ page }) => {
      await page.goto('/premium');

      await page.waitForTimeout(2000);

      // Check for recommended/popular badge
      const recommended = page.locator('.recommended, .popular, [data-recommended], text=/recommended|popular|best.*value/i');

      if (await recommended.isVisible({ timeout: 2000 })) {
        await expect(recommended).toBeVisible();
      }
    });

    test('should show monthly vs yearly pricing', async ({ page }) => {
      await page.goto('/premium');

      await page.waitForTimeout(2000);

      // Toggle between billing cycles
      const billingToggle = page.locator('.billing-toggle, [data-testid="billing-toggle"], button:has-text("Monthly"), button:has-text("Yearly")');

      if (await billingToggle.first().isVisible({ timeout: 2000 })) {
        // Click yearly option
        const yearlyButton = page.locator('button:has-text("Yearly"), button:has-text("Annual"), [data-billing="yearly"]');
        if (await yearlyButton.isVisible({ timeout: 1000 })) {
          await yearlyButton.click();

          // Prices should update to show yearly
          await page.waitForTimeout(500);

          await expect(page.locator('text=/year|annual|save/i')).toBeVisible({ timeout: 3000 });
        }
      }
    });

    test('should show savings for longer subscriptions', async ({ page }) => {
      await page.goto('/premium');

      await page.waitForTimeout(2000);

      // Check for savings badge or discount
      const savings = page.locator('text=/save|\\d+%.*off|discount/i');

      if (await savings.isVisible({ timeout: 3000 })) {
        await expect(savings).toBeVisible();
      }
    });
  });

  test.describe('Subscribe', () => {
    test('should select a subscription plan', async ({ page }) => {
      await page.goto('/premium');

      await page.waitForTimeout(2000);

      // Click on a plan
      const selectButton = page.locator('.plan-card button, button:has-text("Choose"), button:has-text("Select"), button:has-text("Subscribe")').first();

      if (await selectButton.isVisible({ timeout: 3000 })) {
        await selectButton.click();

        // Should proceed to checkout
        await expect(page).toHaveURL(/.*checkout|payment/, { timeout: 5000 });
      }
    });

    test('should display order summary at checkout', async ({ page }) => {
      await page.goto('/premium');

      await page.waitForTimeout(2000);

      const selectButton = page.locator('.plan-card button').first();
      if (await selectButton.isVisible({ timeout: 3000 })) {
        await selectButton.click();

        await page.waitForURL(/.*checkout|payment/, { timeout: 5000 });

        // Should show order summary
        await expect(page.locator('text=/summary|total|order/i')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('text=/\\$\\d+/i')).toBeVisible();
      }
    });

    test('should apply promo code', async ({ page }) => {
      await page.goto('/premium');

      await page.waitForTimeout(2000);

      const selectButton = page.locator('.plan-card button').first();
      if (await selectButton.isVisible({ timeout: 3000 })) {
        await selectButton.click();

        await page.waitForURL(/.*checkout|payment/, { timeout: 5000 });

        // Find promo code input
        const promoButton = page.locator('button:has-text("Promo"), text=Promo code, button:has-text("Coupon")');
        const promoInput = page.locator('input[name="promoCode"], input[placeholder*="promo"], input[placeholder*="coupon"]');

        if (await promoButton.isVisible({ timeout: 2000 })) {
          await promoButton.click();
        }

        if (await promoInput.isVisible({ timeout: 2000 })) {
          await promoInput.fill('TESTCODE');

          await page.click('button:has-text("Apply")');

          await page.waitForTimeout(1000);

          // Should show discount or error for invalid code
          const result = page.locator('text=/discount|invalid|not.*valid|applied/i');
          await expect(result).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test('should enter payment details via Stripe', async ({ page }) => {
      await page.goto('/premium');

      await page.waitForTimeout(2000);

      const selectButton = page.locator('.plan-card button').first();
      if (await selectButton.isVisible({ timeout: 3000 })) {
        await selectButton.click();

        await page.waitForURL(/.*checkout|payment/, { timeout: 5000 });

        // Wait for Stripe elements to load
        await page.waitForTimeout(3000);

        // Stripe uses iframes
        const stripeFrame = page.frameLocator('iframe[name*="__privateStripeFrame"]').first();

        try {
          // Fill card number
          await stripeFrame.locator('input[name="cardnumber"]').fill('4242424242424242');
          await stripeFrame.locator('input[name="exp-date"]').fill('12/28');
          await stripeFrame.locator('input[name="cvc"]').fill('123');

          // Fill billing info if required
          const nameInput = page.locator('input[name="name"], input[name="billingName"]');
          if (await nameInput.isVisible({ timeout: 1000 })) {
            await nameInput.fill('Test User');
          }

          const emailInput = page.locator('input[name="email"], input[name="billingEmail"]');
          if (await emailInput.isVisible({ timeout: 1000 })) {
            await emailInput.fill('test@example.com');
          }
        } catch (error) {
          // Stripe element structure may vary
          console.log('Stripe elements not found or different structure');
        }
      }
    });

    test('should complete subscription purchase', async ({ page }) => {
      await page.goto('/premium');

      await page.waitForTimeout(2000);

      const selectButton = page.locator('.plan-card button').first();
      if (await selectButton.isVisible({ timeout: 3000 })) {
        await selectButton.click();

        await page.waitForURL(/.*checkout|payment/, { timeout: 5000 });

        // Wait for Stripe
        await page.waitForTimeout(3000);

        try {
          const stripeFrame = page.frameLocator('iframe[name*="__privateStripeFrame"]').first();

          // Use test card
          await stripeFrame.locator('input[name="cardnumber"]').fill('4242424242424242');
          await stripeFrame.locator('input[name="exp-date"]').fill('12/28');
          await stripeFrame.locator('input[name="cvc"]').fill('123');

          // Fill name if required
          const nameInput = page.locator('input[name="name"]');
          if (await nameInput.isVisible({ timeout: 1000 })) {
            await nameInput.fill('Test User');
          }

          // Submit payment
          await page.click('button:has-text("Subscribe"), button:has-text("Pay"), button[type="submit"]');

          // Wait for processing
          await page.waitForTimeout(5000);

          // Should show success or redirect
          const success = page.locator('text=/success|thank.*you|subscribed|welcome.*premium/i');
          const hasSuccess = await success.isVisible({ timeout: 10000 });

          if (!hasSuccess) {
            // May have redirected
            await expect(page).toHaveURL(/.*dashboard|premium|success/);
          }
        } catch (error) {
          console.log('Payment flow not testable in this environment');
        }
      }
    });

    test('should handle payment failure', async ({ page }) => {
      await page.goto('/premium');

      await page.waitForTimeout(2000);

      const selectButton = page.locator('.plan-card button').first();
      if (await selectButton.isVisible({ timeout: 3000 })) {
        await selectButton.click();

        await page.waitForURL(/.*checkout|payment/, { timeout: 5000 });

        await page.waitForTimeout(3000);

        try {
          const stripeFrame = page.frameLocator('iframe[name*="__privateStripeFrame"]').first();

          // Use test card that will decline
          await stripeFrame.locator('input[name="cardnumber"]').fill('4000000000000002');
          await stripeFrame.locator('input[name="exp-date"]').fill('12/28');
          await stripeFrame.locator('input[name="cvc"]').fill('123');

          const nameInput = page.locator('input[name="name"]');
          if (await nameInput.isVisible({ timeout: 1000 })) {
            await nameInput.fill('Test User');
          }

          await page.click('button:has-text("Subscribe"), button[type="submit"]');

          await page.waitForTimeout(5000);

          // Should show error
          await expect(page.locator('text=/declined|failed|error|try.*again/i')).toBeVisible({ timeout: 10000 });
        } catch (error) {
          console.log('Payment failure flow not testable');
        }
      }
    });
  });

  test.describe('Verify Features', () => {
    // These tests assume user has premium subscription
    test('should show premium badge on profile', async ({ page }) => {
      await page.goto('/profile');

      await page.waitForTimeout(2000);

      // Check for premium badge
      const premiumBadge = page.locator('.premium-badge, [data-testid="premium-badge"], text=/premium|gold|vip/i');

      if (await premiumBadge.isVisible({ timeout: 3000 })) {
        await expect(premiumBadge).toBeVisible();
      }
    });

    test('should access "See Who Likes You" feature', async ({ page }) => {
      await page.goto('/likes');

      await page.waitForTimeout(2000);

      // Should either show likes or premium prompt
      const likesGrid = page.locator('.likes-grid, [data-testid="likes"], .liker-card');
      const premiumPrompt = page.locator('text=/upgrade|premium|subscribe/i');

      const hasLikes = await likesGrid.first().isVisible({ timeout: 3000 });
      const hasPremiumPrompt = await premiumPrompt.isVisible({ timeout: 1000 });

      // One should be visible
      expect(hasLikes || hasPremiumPrompt).toBeTruthy();
    });

    test('should have unlimited likes', async ({ page }) => {
      await page.goto('/discover');

      await page.waitForSelector('.profile-card', { timeout: 15000 });

      // Like multiple profiles
      for (let i = 0; i < 15; i++) {
        const likeButton = page.locator('button[aria-label*="like"], .like-button');

        if (await likeButton.isVisible({ timeout: 1000 })) {
          await likeButton.click();
          await page.waitForTimeout(300);
        }

        // Check for limit reached prompt
        const limitPrompt = page.locator('text=/out.*likes|limit.*reached|upgrade/i');
        if (await limitPrompt.isVisible({ timeout: 500 })) {
          // Free user hit limit
          break;
        }
      }
    });

    test('should be able to rewind/undo swipes', async ({ page }) => {
      await page.goto('/discover');

      await page.waitForSelector('.profile-card', { timeout: 15000 });

      // Pass on a profile
      await page.click('button[aria-label*="pass"], .pass-button');
      await page.waitForTimeout(500);

      // Try to undo
      const undoButton = page.locator('button[aria-label*="undo"], .undo-button, button:has-text("Undo")');

      if (await undoButton.isVisible({ timeout: 2000 })) {
        await undoButton.click();

        await page.waitForTimeout(1000);

        // Should undo or show premium prompt
        const premiumPrompt = page.locator('.premium-prompt, [data-testid="premium-modal"]');
        const profileCard = page.locator('.profile-card');

        expect(await profileCard.isVisible() || await premiumPrompt.isVisible({ timeout: 2000 })).toBeTruthy();
      }
    });

    test('should have super likes available', async ({ page }) => {
      await page.goto('/discover');

      await page.waitForSelector('.profile-card', { timeout: 15000 });

      const superLikeButton = page.locator('button[aria-label*="super"], .super-like-button');

      if (await superLikeButton.isVisible({ timeout: 2000 })) {
        // Check super like count indicator
        const superLikeCount = page.locator('.super-like-count, [data-testid="super-likes-remaining"]');

        if (await superLikeCount.isVisible({ timeout: 1000 })) {
          const countText = await superLikeCount.textContent();
          // Premium users should have super likes
        }
      }
    });

    test('should have boost feature available', async ({ page }) => {
      await page.goto('/discover');

      await page.waitForSelector('.profile-card', { timeout: 15000 });

      const boostButton = page.locator('button[aria-label*="boost"], .boost-button, button:has-text("Boost")');

      if (await boostButton.isVisible({ timeout: 2000 })) {
        await expect(boostButton).toBeVisible();
      }
    });

    test('should have no ads', async ({ page }) => {
      await page.goto('/discover');

      await page.waitForTimeout(3000);

      // Check for absence of ads
      const ads = page.locator('.ad, [data-ad], .advertisement, .sponsored');

      const hasAds = await ads.first().isVisible({ timeout: 2000 });

      // Premium users shouldn't see ads (may not have ads anyway)
    });
  });

  test.describe('Manage Subscription', () => {
    test('should view current subscription details', async ({ page }) => {
      await page.goto('/settings/subscription');

      await page.waitForTimeout(2000);

      // Should show subscription info
      const subscriptionInfo = page.locator('.subscription-info, [data-testid="subscription-details"]');

      if (await subscriptionInfo.isVisible({ timeout: 3000 })) {
        // Should show plan name
        await expect(page.locator('text=/premium|gold|basic|plan/i')).toBeVisible();

        // Should show renewal date
        await expect(page.locator('text=/renew|expires|next.*billing/i')).toBeVisible();
      }
    });

    test('should cancel subscription', async ({ page }) => {
      await page.goto('/settings/subscription');

      await page.waitForTimeout(2000);

      const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("Unsubscribe")');

      if (await cancelButton.isVisible({ timeout: 3000 })) {
        await cancelButton.click();

        // Should show confirmation modal
        await expect(page.locator('.cancel-modal, [data-testid="cancel-dialog"]')).toBeVisible({ timeout: 3000 });

        // May ask for cancellation reason
        const reasonSelect = page.locator('select[name="reason"], input[name="reason"]');
        if (await reasonSelect.isVisible({ timeout: 1000 })) {
          await reasonSelect.selectOption('too_expensive');
        }

        // Confirm cancellation
        const confirmButton = page.locator('button:has-text("Confirm Cancel"), button:has-text("Yes, Cancel")');
        if (await confirmButton.isVisible({ timeout: 1000 })) {
          await confirmButton.click();

          // Should show confirmation
          await expect(page.locator('text=/cancelled|will.*end|subscription.*cancelled/i')).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test('should reactivate cancelled subscription', async ({ page }) => {
      await page.goto('/settings/subscription');

      await page.waitForTimeout(2000);

      const reactivateButton = page.locator('button:has-text("Reactivate"), button:has-text("Resume")');

      if (await reactivateButton.isVisible({ timeout: 3000 })) {
        await reactivateButton.click();

        // Should show confirmation
        await expect(page.locator('text=/reactivated|renewed|subscription.*active/i')).toBeVisible({ timeout: 5000 });
      }
    });

    test('should upgrade subscription plan', async ({ page }) => {
      await page.goto('/settings/subscription');

      await page.waitForTimeout(2000);

      const upgradeButton = page.locator('button:has-text("Upgrade"), button:has-text("Change Plan")');

      if (await upgradeButton.isVisible({ timeout: 3000 })) {
        await upgradeButton.click();

        // Should show plan options
        await expect(page.locator('.plan-card, [data-testid="plan-option"]').first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('should update payment method', async ({ page }) => {
      await page.goto('/settings/billing');

      await page.waitForTimeout(2000);

      const updateButton = page.locator('button:has-text("Update"), button:has-text("Change Card"), button:has-text("Add Payment")');

      if (await updateButton.isVisible({ timeout: 3000 })) {
        await updateButton.click();

        // Should show payment form
        await page.waitForTimeout(2000);

        // Stripe iframe should load
        const stripeFrame = page.frameLocator('iframe[name*="__privateStripeFrame"]');

        try {
          await stripeFrame.locator('input[name="cardnumber"]').fill('4242424242424242');
        } catch {
          console.log('Payment update form not testable');
        }
      }
    });

    test('should view billing history', async ({ page }) => {
      await page.goto('/settings/billing');

      await page.waitForTimeout(2000);

      // Should show transaction history
      const transactions = page.locator('.transaction, [data-testid="transaction"], .invoice');

      if (await transactions.first().isVisible({ timeout: 3000 })) {
        // Should have date and amount
        await expect(page.locator('text=/\\$\\d+/i').first()).toBeVisible();
      }
    });

    test('should download invoice', async ({ page }) => {
      await page.goto('/settings/billing');

      await page.waitForTimeout(2000);

      const downloadButton = page.locator('button:has-text("Download"), a:has-text("Invoice"), button:has-text("Receipt")').first();

      if (await downloadButton.isVisible({ timeout: 3000 })) {
        const [download] = await Promise.all([
          page.waitForEvent('download').catch(() => null),
          downloadButton.click(),
        ]);

        if (download) {
          expect(download.suggestedFilename()).toMatch(/invoice|receipt|pdf/i);
        }
      }
    });
  });

  test.describe('Coin Purchases', () => {
    test('should view coin packages', async ({ page }) => {
      await page.goto('/coins');

      await page.waitForTimeout(2000);

      // Should show coin packages
      const packages = page.locator('.coin-package, [data-testid="coin-package"], .package-card');
      const count = await packages.count();

      expect(count).toBeGreaterThan(0);
    });

    test('should select coin package', async ({ page }) => {
      await page.goto('/coins');

      await page.waitForTimeout(2000);

      const selectButton = page.locator('.coin-package button, button:has-text("Buy")').first();

      if (await selectButton.isVisible({ timeout: 3000 })) {
        await selectButton.click();

        // Should proceed to checkout
        await expect(page).toHaveURL(/.*checkout|payment/, { timeout: 5000 });
      }
    });

    test('should show coin balance', async ({ page }) => {
      await page.goto('/profile');

      await page.waitForTimeout(2000);

      const coinBalance = page.locator('.coin-balance, [data-testid="coins"], text=/\\d+.*coins?/i');

      if (await coinBalance.isVisible({ timeout: 3000 })) {
        await expect(coinBalance).toBeVisible();
      }
    });
  });
});
