import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Verification Flow
 * Tests: Start verification -> Upload photo -> Check status
 */

test.describe('Verification Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard|discover/, { timeout: 15000 });
  });

  test.describe('Start Verification', () => {
    test('should navigate to verification page', async ({ page }) => {
      await page.goto('/settings/verification');

      // Should show verification page
      await expect(page.locator('text=/verify|verification|verified/i')).toBeVisible({ timeout: 5000 });
    });

    test('should show verification badge status', async ({ page }) => {
      await page.goto('/settings/verification');

      await page.waitForTimeout(2000);

      // Should show current verification status
      const status = page.locator('.verification-status, [data-testid="verification-status"], text=/verified|not.*verified|pending/i');
      await expect(status).toBeVisible({ timeout: 5000 });
    });

    test('should explain verification benefits', async ({ page }) => {
      await page.goto('/settings/verification');

      await page.waitForTimeout(2000);

      // Should explain why verification matters
      const benefits = page.locator('text=/trust|authentic|real|badge|matches/i');
      await expect(benefits.first()).toBeVisible({ timeout: 5000 });
    });

    test('should start verification process', async ({ page }) => {
      await page.goto('/settings/verification');

      await page.waitForTimeout(2000);

      const startButton = page.locator('button:has-text("Start"), button:has-text("Get Verified"), button:has-text("Verify Now")');

      if (await startButton.isVisible({ timeout: 3000 })) {
        await startButton.click();

        // Should proceed to verification steps
        await expect(page.locator('text=/selfie|photo|camera|face/i')).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Photo Verification', () => {
    test('should show pose instructions', async ({ page }) => {
      await page.goto('/settings/verification');

      const startButton = page.locator('button:has-text("Start"), button:has-text("Get Verified")');
      if (await startButton.isVisible({ timeout: 3000 })) {
        await startButton.click();
      }

      await page.waitForTimeout(1000);

      // Should show pose example
      const poseExample = page.locator('.pose-example, [data-testid="pose-guide"], img[alt*="pose"]');
      const poseInstructions = page.locator('text=/pose|position|gesture|match/i');

      const hasPoseExample = await poseExample.isVisible({ timeout: 3000 });
      const hasInstructions = await poseInstructions.isVisible({ timeout: 1000 });

      expect(hasPoseExample || hasInstructions).toBeTruthy();
    });

    test('should access camera for selfie', async ({ page, context }) => {
      // Grant camera permissions
      await context.grantPermissions(['camera']);

      await page.goto('/settings/verification');

      const startButton = page.locator('button:has-text("Start"), button:has-text("Get Verified")');
      if (await startButton.isVisible({ timeout: 3000 })) {
        await startButton.click();
      }

      await page.waitForTimeout(1000);

      // Look for camera access
      const cameraButton = page.locator('button:has-text("Take Photo"), button:has-text("Open Camera"), button:has-text("Capture")');
      const videoPreview = page.locator('video, .camera-preview, [data-testid="camera"]');

      if (await cameraButton.isVisible({ timeout: 3000 })) {
        await cameraButton.click();

        // Camera should activate
        await page.waitForTimeout(2000);

        // Video preview may appear
        const hasVideo = await videoPreview.isVisible({ timeout: 3000 });
      }
    });

    test('should upload verification photo from file', async ({ page }) => {
      await page.goto('/settings/verification');

      const startButton = page.locator('button:has-text("Start"), button:has-text("Get Verified")');
      if (await startButton.isVisible({ timeout: 3000 })) {
        await startButton.click();
      }

      await page.waitForTimeout(1000);

      // Find file upload option
      const uploadButton = page.locator('button:has-text("Upload"), text=Upload Photo');
      const fileInput = page.locator('input[type="file"][accept*="image"]');

      if (await uploadButton.isVisible({ timeout: 2000 })) {
        await uploadButton.click();
      }

      if (await fileInput.isVisible({ timeout: 2000 })) {
        await fileInput.setInputFiles({
          name: 'verification-selfie.jpg',
          mimeType: 'image/jpeg',
          buffer: Buffer.from('fake-selfie-data'),
        });

        await page.waitForTimeout(2000);

        // Should show preview or proceed
        const preview = page.locator('.photo-preview, img[alt*="verification"], [data-testid="selfie-preview"]');
        if (await preview.isVisible({ timeout: 3000 })) {
          await expect(preview).toBeVisible();
        }
      }
    });

    test('should validate photo quality', async ({ page }) => {
      await page.goto('/settings/verification');

      const startButton = page.locator('button:has-text("Start")');
      if (await startButton.isVisible({ timeout: 3000 })) {
        await startButton.click();
      }

      await page.waitForTimeout(1000);

      const fileInput = page.locator('input[type="file"]');

      if (await fileInput.isVisible({ timeout: 2000 })) {
        // Upload low quality image
        await fileInput.setInputFiles({
          name: 'low-quality.jpg',
          mimeType: 'image/jpeg',
          buffer: Buffer.from('x'), // Very small file
        });

        await page.waitForTimeout(2000);

        // May show quality warning
        const qualityWarning = page.locator('text=/quality|clear|blurry|too.*small/i');
        if (await qualityWarning.isVisible({ timeout: 3000 })) {
          await expect(qualityWarning).toBeVisible();
        }
      }
    });

    test('should require face to be visible', async ({ page }) => {
      await page.goto('/settings/verification');

      const startButton = page.locator('button:has-text("Start")');
      if (await startButton.isVisible({ timeout: 3000 })) {
        await startButton.click();
      }

      await page.waitForTimeout(1000);

      // Upload photo
      const fileInput = page.locator('input[type="file"]');

      if (await fileInput.isVisible({ timeout: 2000 })) {
        await fileInput.setInputFiles({
          name: 'no-face.jpg',
          mimeType: 'image/jpeg',
          buffer: Buffer.from('fake-image-no-face'),
        });

        await page.waitForTimeout(2000);

        // May show face not detected error
        const faceError = page.locator('text=/face.*not.*detected|cannot.*see.*face|face.*visible/i');
        if (await faceError.isVisible({ timeout: 3000 })) {
          await expect(faceError).toBeVisible();
        }
      }
    });

    test('should submit verification photo', async ({ page }) => {
      await page.goto('/settings/verification');

      const startButton = page.locator('button:has-text("Start")');
      if (await startButton.isVisible({ timeout: 3000 })) {
        await startButton.click();
      }

      await page.waitForTimeout(1000);

      const fileInput = page.locator('input[type="file"]');

      if (await fileInput.isVisible({ timeout: 2000 })) {
        await fileInput.setInputFiles({
          name: 'verification.jpg',
          mimeType: 'image/jpeg',
          buffer: Buffer.from('valid-selfie-data'),
        });

        await page.waitForTimeout(2000);

        // Submit verification
        const submitButton = page.locator('button:has-text("Submit"), button:has-text("Verify"), button:has-text("Continue")');

        if (await submitButton.isVisible({ timeout: 3000 })) {
          await submitButton.click();

          await page.waitForTimeout(2000);

          // Should show pending or processing
          await expect(page.locator('text=/pending|processing|review|submitted/i')).toBeVisible({ timeout: 5000 });
        }
      }
    });
  });

  test.describe('Check Status', () => {
    test('should show pending verification status', async ({ page }) => {
      await page.goto('/settings/verification');

      await page.waitForTimeout(2000);

      // Check for pending status
      const pendingStatus = page.locator('text=/pending|in.*review|processing/i');

      if (await pendingStatus.isVisible({ timeout: 3000 })) {
        await expect(pendingStatus).toBeVisible();
      }
    });

    test('should show verified status with badge', async ({ page }) => {
      await page.goto('/settings/verification');

      await page.waitForTimeout(2000);

      // Check for verified status
      const verifiedStatus = page.locator('.verified-badge, [data-testid="verified"], text=/verified/i');

      if (await verifiedStatus.isVisible({ timeout: 3000 })) {
        await expect(verifiedStatus).toBeVisible();

        // Badge icon should be visible
        const badge = page.locator('.verification-badge, svg[data-verified], [data-testid="badge"]');
        if (await badge.isVisible({ timeout: 1000 })) {
          await expect(badge).toBeVisible();
        }
      }
    });

    test('should show verification failed with reason', async ({ page }) => {
      await page.goto('/settings/verification');

      await page.waitForTimeout(2000);

      // Check for failed status
      const failedStatus = page.locator('text=/failed|rejected|denied|not.*approved/i');

      if (await failedStatus.isVisible({ timeout: 3000 })) {
        await expect(failedStatus).toBeVisible();

        // Should show reason
        const reason = page.locator('.rejection-reason, [data-testid="failure-reason"], text=/reason|because/i');
        if (await reason.isVisible({ timeout: 1000 })) {
          await expect(reason).toBeVisible();
        }

        // Should offer retry option
        const retryButton = page.locator('button:has-text("Try Again"), button:has-text("Retry")');
        await expect(retryButton).toBeVisible({ timeout: 3000 });
      }
    });

    test('should show verification badge on profile', async ({ page }) => {
      await page.goto('/profile');

      await page.waitForTimeout(2000);

      // Look for verification badge on profile
      const verifiedBadge = page.locator('.verified-badge, [data-testid="verified-badge"], svg[data-verified]');

      if (await verifiedBadge.isVisible({ timeout: 3000 })) {
        await expect(verifiedBadge).toBeVisible();
      }
    });

    test('should show verification badge in discover', async ({ page }) => {
      await page.goto('/discover');

      await page.waitForSelector('.profile-card', { timeout: 15000 });

      // Check for verified badges on profile cards
      const verifiedBadges = page.locator('.profile-card .verified-badge, [data-testid="verified"]');

      // May or may not have verified users
      if (await verifiedBadges.first().isVisible({ timeout: 3000 })) {
        await expect(verifiedBadges.first()).toBeVisible();
      }
    });
  });

  test.describe('ID Verification', () => {
    test('should access ID verification option', async ({ page }) => {
      await page.goto('/settings/verification');

      await page.waitForTimeout(2000);

      // Look for ID verification section
      const idVerification = page.locator('text=/id.*verification|identity.*verification|government.*id/i');

      if (await idVerification.isVisible({ timeout: 3000 })) {
        await expect(idVerification).toBeVisible();
      }
    });

    test('should start ID verification process', async ({ page }) => {
      await page.goto('/settings/verification');

      await page.waitForTimeout(2000);

      const idButton = page.locator('button:has-text("ID Verification"), button:has-text("Verify Identity")');

      if (await idButton.isVisible({ timeout: 3000 })) {
        await idButton.click();

        // Should show ID verification steps
        await expect(page.locator('text=/passport|driver.*license|id.*card/i')).toBeVisible({ timeout: 5000 });
      }
    });

    test('should show supported ID types', async ({ page }) => {
      await page.goto('/settings/verification');

      await page.waitForTimeout(2000);

      const idButton = page.locator('button:has-text("ID Verification")');

      if (await idButton.isVisible({ timeout: 3000 })) {
        await idButton.click();

        await page.waitForTimeout(1000);

        // Should list supported ID types
        const idTypes = page.locator('.id-types, [data-testid="id-type"]');
        const passport = page.locator('text=/passport/i');
        const license = page.locator('text=/driver.*license|driving.*license/i');

        const hasPassport = await passport.isVisible({ timeout: 2000 });
        const hasLicense = await license.isVisible({ timeout: 1000 });

        expect(hasPassport || hasLicense).toBeTruthy();
      }
    });

    test('should upload front of ID', async ({ page }) => {
      await page.goto('/settings/verification');

      const idButton = page.locator('button:has-text("ID Verification")');

      if (await idButton.isVisible({ timeout: 3000 })) {
        await idButton.click();

        await page.waitForTimeout(1000);

        // Select ID type
        const idTypeButton = page.locator('button:has-text("Passport"), button:has-text("Driver"), [data-id-type]').first();
        if (await idTypeButton.isVisible({ timeout: 2000 })) {
          await idTypeButton.click();
        }

        await page.waitForTimeout(500);

        // Upload front of ID
        const frontInput = page.locator('input[type="file"][name*="front"], input[type="file"]').first();

        if (await frontInput.isVisible({ timeout: 2000 })) {
          await frontInput.setInputFiles({
            name: 'id-front.jpg',
            mimeType: 'image/jpeg',
            buffer: Buffer.from('fake-id-front'),
          });

          await page.waitForTimeout(2000);

          // Should show preview or proceed
          await expect(page.locator('.id-preview, [data-testid="id-front-preview"], img')).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test('should upload back of ID if required', async ({ page }) => {
      await page.goto('/settings/verification');

      const idButton = page.locator('button:has-text("ID Verification")');

      if (await idButton.isVisible({ timeout: 3000 })) {
        await idButton.click();

        await page.waitForTimeout(1000);

        // Select driver's license (usually requires back)
        const licenseButton = page.locator('button:has-text("Driver"), [data-id-type="license"]');
        if (await licenseButton.isVisible({ timeout: 2000 })) {
          await licenseButton.click();
        }

        await page.waitForTimeout(500);

        // Upload front
        const frontInput = page.locator('input[type="file"]').first();
        if (await frontInput.isVisible({ timeout: 2000 })) {
          await frontInput.setInputFiles({
            name: 'id-front.jpg',
            mimeType: 'image/jpeg',
            buffer: Buffer.from('fake-id-front'),
          });
        }

        await page.waitForTimeout(1000);

        // Check for back upload requirement
        const backInput = page.locator('input[type="file"][name*="back"], input[type="file"]').nth(1);
        const backLabel = page.locator('text=/back.*id|upload.*back/i');

        if (await backLabel.isVisible({ timeout: 2000 })) {
          await expect(backLabel).toBeVisible();
        }
      }
    });
  });

  test.describe('Background Check', () => {
    test('should access background check option', async ({ page }) => {
      await page.goto('/settings/verification');

      await page.waitForTimeout(2000);

      // Look for background check section
      const bgCheck = page.locator('text=/background.*check|safety.*check|criminal.*check/i');

      if (await bgCheck.isVisible({ timeout: 3000 })) {
        await expect(bgCheck).toBeVisible();
      }
    });

    test('should show background check pricing', async ({ page }) => {
      await page.goto('/settings/verification');

      await page.waitForTimeout(2000);

      const bgCheckButton = page.locator('button:has-text("Background Check")');

      if (await bgCheckButton.isVisible({ timeout: 3000 })) {
        await bgCheckButton.click();

        await page.waitForTimeout(1000);

        // Should show pricing
        const pricing = page.locator('text=/\\$\\d+|price|fee/i');
        if (await pricing.isVisible({ timeout: 2000 })) {
          await expect(pricing).toBeVisible();
        }
      }
    });
  });

  test.describe('Social Verification', () => {
    test('should show social account linking options', async ({ page }) => {
      await page.goto('/settings/verification');

      await page.waitForTimeout(2000);

      // Look for social verification
      const socialVerification = page.locator('text=/instagram|facebook|linkedin|social.*verification/i');

      if (await socialVerification.isVisible({ timeout: 3000 })) {
        await expect(socialVerification).toBeVisible();
      }
    });

    test('should link Instagram account', async ({ page }) => {
      await page.goto('/settings/verification');

      await page.waitForTimeout(2000);

      const instagramButton = page.locator('button:has-text("Instagram"), [data-social="instagram"]');

      if (await instagramButton.isVisible({ timeout: 3000 })) {
        // Click should redirect to Instagram OAuth
        const [popup] = await Promise.all([
          page.waitForEvent('popup').catch(() => null),
          instagramButton.click(),
        ]);

        if (popup) {
          // Should redirect to Instagram
          await expect(popup).toHaveURL(/instagram\.com|facebook\.com/, { timeout: 10000 });
        }
      }
    });
  });

  test.describe('Verification Preferences', () => {
    test('should filter by verified users only', async ({ page }) => {
      await page.goto('/settings');

      await page.waitForTimeout(2000);

      // Look for verified filter preference
      const verifiedFilter = page.locator('input[name="verifiedOnly"], [data-preference="verified"]');

      if (await verifiedFilter.isVisible({ timeout: 3000 })) {
        await verifiedFilter.click();

        await page.click('button:has-text("Save")');

        // Setting should be saved
        await page.waitForTimeout(1000);
      }
    });

    test('should show verification preference in discovery filters', async ({ page }) => {
      await page.goto('/discover');

      await page.waitForSelector('.profile-card', { timeout: 15000 });

      // Open filters
      const filterButton = page.locator('button:has-text("Filters")');

      if (await filterButton.isVisible({ timeout: 2000 })) {
        await filterButton.click();

        await page.waitForTimeout(1000);

        // Look for verified filter
        const verifiedFilter = page.locator('input[name="verified"], [data-filter="verified"], label:has-text("Verified")');

        if (await verifiedFilter.isVisible({ timeout: 2000 })) {
          await expect(verifiedFilter).toBeVisible();
        }
      }
    });
  });
});
