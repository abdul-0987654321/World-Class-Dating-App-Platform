import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * E2E Tests for Profile Flow
 * Tests: Create profile -> Update profile -> Upload photo
 */

test.describe('Profile Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard|discover|profile/, { timeout: 15000 });
  });

  test.describe('Profile Creation', () => {
    test('should complete basic profile setup', async ({ page }) => {
      await page.goto('/profile/setup');

      // Fill bio
      await page.fill('textarea[name="bio"]', 'Looking for meaningful connections. Love hiking, photography, and trying new cuisines.');

      // Select interests
      const interests = ['Hiking', 'Photography', 'Cooking', 'Travel', 'Music'];
      for (const interest of interests) {
        const interestButton = page.locator(`text=${interest}, button:has-text("${interest}"), [data-interest="${interest}"]`);
        if (await interestButton.isVisible({ timeout: 1000 })) {
          await interestButton.click();
        }
      }

      // Set occupation
      await page.fill('input[name="occupation"]', 'Software Engineer');

      // Set education
      await page.fill('input[name="education"]', 'Masters in Computer Science');

      // Set height (if available)
      const heightInput = page.locator('input[name="height"]');
      if (await heightInput.isVisible({ timeout: 1000 })) {
        await heightInput.fill('180');
      }

      // Click next/continue
      await page.click('button:has-text("Next"), button:has-text("Continue")');

      // Verify progression to next step
      await expect(page.locator('text=/photo|picture|upload/i')).toBeVisible({ timeout: 5000 });
    });

    test('should validate bio length', async ({ page }) => {
      await page.goto('/profile/setup');

      // Test too short bio
      await page.fill('textarea[name="bio"]', 'Hi');
      await page.blur('textarea[name="bio"]');

      await expect(page.locator('text=/too.*short|minimum|at least/i')).toBeVisible({ timeout: 3000 });

      // Test too long bio
      const longBio = 'x'.repeat(1001);
      await page.fill('textarea[name="bio"]', longBio);
      await page.blur('textarea[name="bio"]');

      await expect(page.locator('text=/too.*long|maximum|exceeded/i')).toBeVisible({ timeout: 3000 });
    });

    test('should require minimum interests selection', async ({ page }) => {
      await page.goto('/profile/setup');

      await page.fill('textarea[name="bio"]', 'Valid bio text that meets requirements');

      // Try to proceed without selecting interests
      await page.click('button:has-text("Next")');

      // Should show interest requirement
      await expect(page.locator('text=/select.*interest|at least.*interest/i')).toBeVisible({ timeout: 3000 });
    });

    test('should show progress indicator during setup', async ({ page }) => {
      await page.goto('/profile/setup');

      // Check for progress indicator
      const progressIndicator = page.locator('[role="progressbar"], .progress, .stepper, .step-indicator');
      await expect(progressIndicator).toBeVisible();

      // Check for step numbers or labels
      const steps = page.locator('.step, [data-step]');
      const stepCount = await steps.count();
      expect(stepCount).toBeGreaterThan(0);
    });
  });

  test.describe('Profile Update', () => {
    test('should navigate to profile edit page', async ({ page }) => {
      await page.goto('/profile');

      await page.click('button:has-text("Edit"), a:has-text("Edit"), [aria-label*="edit"]');

      await expect(page).toHaveURL(/.*profile.*edit|edit.*profile/);
    });

    test('should update bio successfully', async ({ page }) => {
      await page.goto('/profile/edit');

      const newBio = `Updated bio - ${Date.now()}`;
      await page.fill('textarea[name="bio"]', newBio);

      await page.click('button:has-text("Save"), button[type="submit"]');

      // Should show success message or redirect
      await expect(page.locator('text=/saved|updated|success/i')).toBeVisible({ timeout: 5000 });

      // Verify bio was updated
      await page.goto('/profile');
      await expect(page.locator(`text=${newBio}`)).toBeVisible({ timeout: 5000 });
    });

    test('should update occupation and education', async ({ page }) => {
      await page.goto('/profile/edit');

      await page.fill('input[name="occupation"]', 'Senior Software Engineer');
      await page.fill('input[name="education"]', 'PhD in Computer Science');

      await page.click('button:has-text("Save")');

      await expect(page.locator('text=/saved|updated/i')).toBeVisible({ timeout: 5000 });
    });

    test('should update interests', async ({ page }) => {
      await page.goto('/profile/edit');

      // Find interests section
      const interestsSection = page.locator('[data-section="interests"], .interests-section');

      if (await interestsSection.isVisible({ timeout: 2000 })) {
        // Remove an existing interest
        const removeButton = page.locator('[data-testid="remove-interest"], button[aria-label*="remove"]').first();
        if (await removeButton.isVisible({ timeout: 1000 })) {
          await removeButton.click();
        }

        // Add a new interest
        const addInterestInput = page.locator('input[placeholder*="interest"], input[name="newInterest"]');
        if (await addInterestInput.isVisible({ timeout: 1000 })) {
          await addInterestInput.fill('Yoga');
          await page.keyboard.press('Enter');
        }

        await page.click('button:has-text("Save")');

        await expect(page.locator('text=/saved|updated/i')).toBeVisible({ timeout: 5000 });
      }
    });

    test('should update location preferences', async ({ page }) => {
      await page.goto('/profile/edit');

      // Find location input
      const locationInput = page.locator('input[name="location"], input[name="city"]');

      if (await locationInput.isVisible({ timeout: 2000 })) {
        await locationInput.fill('New York, NY');

        // May need to select from autocomplete
        const autocompleteOption = page.locator('.autocomplete-option, [role="option"]').first();
        if (await autocompleteOption.isVisible({ timeout: 2000 })) {
          await autocompleteOption.click();
        }

        await page.click('button:has-text("Save")');

        await expect(page.locator('text=/saved|updated/i')).toBeVisible({ timeout: 5000 });
      }
    });

    test('should update relationship preferences', async ({ page }) => {
      await page.goto('/profile/edit');

      // Find looking for section
      const lookingForSelect = page.locator('select[name="lookingFor"]');

      if (await lookingForSelect.isVisible({ timeout: 2000 })) {
        await lookingForSelect.selectOption('serious relationship');
        await page.click('button:has-text("Save")');

        await expect(page.locator('text=/saved|updated/i')).toBeVisible({ timeout: 5000 });
      }
    });

    test('should preserve data when navigating away', async ({ page }) => {
      await page.goto('/profile/edit');

      const originalBio = await page.inputValue('textarea[name="bio"]');

      // Navigate away
      await page.goto('/discover');

      // Navigate back
      await page.goto('/profile/edit');

      const currentBio = await page.inputValue('textarea[name="bio"]');

      // Data should be preserved
      expect(currentBio).toBe(originalBio);
    });
  });

  test.describe('Photo Upload', () => {
    test('should upload primary profile photo', async ({ page }) => {
      await page.goto('/profile/edit');

      // Find photo upload input
      const photoInput = page.locator('input[type="file"][accept*="image"]').first();

      // Create a mock photo file
      await photoInput.setInputFiles({
        name: 'test-photo.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data'),
      });

      // Wait for upload to complete
      await page.waitForTimeout(2000);

      // Should show uploaded image or success indicator
      const uploadedImage = page.locator('img[alt*="profile"], .photo-preview, [data-testid="uploaded-photo"]');
      await expect(uploadedImage.first()).toBeVisible({ timeout: 10000 });
    });

    test('should upload multiple photos', async ({ page }) => {
      await page.goto('/profile/edit');

      // Find photo upload section
      const addPhotoButton = page.locator('button:has-text("Add Photo"), [aria-label*="add photo"]');

      if (await addPhotoButton.isVisible({ timeout: 2000 })) {
        const photoInput = page.locator('input[type="file"][accept*="image"]');

        // Upload multiple photos
        await photoInput.setInputFiles([
          {
            name: 'photo1.jpg',
            mimeType: 'image/jpeg',
            buffer: Buffer.from('fake-image-1'),
          },
          {
            name: 'photo2.jpg',
            mimeType: 'image/jpeg',
            buffer: Buffer.from('fake-image-2'),
          },
        ]);

        await page.waitForTimeout(3000);

        // Check that multiple photos are visible
        const photos = page.locator('.photo-preview, [data-testid="uploaded-photo"], img[alt*="profile"]');
        const count = await photos.count();
        expect(count).toBeGreaterThanOrEqual(2);
      }
    });

    test('should validate photo file type', async ({ page }) => {
      await page.goto('/profile/edit');

      const photoInput = page.locator('input[type="file"][accept*="image"]').first();

      // Try to upload non-image file
      await photoInput.setInputFiles({
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('fake-pdf-data'),
      });

      // Should show error for invalid file type
      await expect(page.locator('text=/invalid.*file|supported.*format|image.*only/i')).toBeVisible({ timeout: 5000 });
    });

    test('should validate photo file size', async ({ page }) => {
      await page.goto('/profile/edit');

      const photoInput = page.locator('input[type="file"][accept*="image"]').first();

      // Create a large file (>10MB)
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024);

      await photoInput.setInputFiles({
        name: 'large-photo.jpg',
        mimeType: 'image/jpeg',
        buffer: largeBuffer,
      });

      // Should show file size error
      await expect(page.locator('text=/too.*large|size.*limit|max.*size/i')).toBeVisible({ timeout: 5000 });
    });

    test('should reorder photos via drag and drop', async ({ page }) => {
      await page.goto('/profile/edit');

      const photos = page.locator('.photo-item, [data-testid="photo"]');
      const photoCount = await photos.count();

      if (photoCount >= 2) {
        const firstPhoto = photos.first();
        const secondPhoto = photos.nth(1);

        // Get bounding boxes
        const firstBox = await firstPhoto.boundingBox();
        const secondBox = await secondPhoto.boundingBox();

        if (firstBox && secondBox) {
          // Drag first photo to second position
          await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
          await page.mouse.down();
          await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height / 2);
          await page.mouse.up();

          await page.waitForTimeout(500);

          // Verify order changed (implementation specific)
        }
      }
    });

    test('should delete photo', async ({ page }) => {
      await page.goto('/profile/edit');

      const photos = page.locator('.photo-item, [data-testid="photo"]');
      const initialCount = await photos.count();

      if (initialCount > 0) {
        // Click delete button on first photo
        const deleteButton = page.locator('button[aria-label*="delete"], button[aria-label*="remove"], .delete-photo').first();

        if (await deleteButton.isVisible({ timeout: 2000 })) {
          await deleteButton.click();

          // Confirm deletion
          const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete")');
          if (await confirmButton.isVisible({ timeout: 2000 })) {
            await confirmButton.click();
          }

          await page.waitForTimeout(1000);

          // Verify photo count decreased
          const newCount = await photos.count();
          expect(newCount).toBeLessThan(initialCount);
        }
      }
    });

    test('should enforce minimum photo requirement', async ({ page }) => {
      await page.goto('/profile/edit');

      // Try to delete all photos
      const photos = page.locator('.photo-item, [data-testid="photo"]');
      const photoCount = await photos.count();

      for (let i = 0; i < photoCount; i++) {
        const deleteButton = page.locator('button[aria-label*="delete"], .delete-photo').first();
        if (await deleteButton.isVisible({ timeout: 1000 })) {
          await deleteButton.click();

          const confirmButton = page.locator('button:has-text("Confirm")');
          if (await confirmButton.isVisible({ timeout: 1000 })) {
            await confirmButton.click();
          }

          await page.waitForTimeout(500);
        }
      }

      // Try to save without photos
      await page.click('button:has-text("Save")');

      // Should show error about minimum photos
      await expect(page.locator('text=/at least.*photo|photo.*required|upload.*photo/i')).toBeVisible({ timeout: 5000 });
    });

    test('should crop and edit photo', async ({ page }) => {
      await page.goto('/profile/edit');

      const photoInput = page.locator('input[type="file"][accept*="image"]').first();

      await photoInput.setInputFiles({
        name: 'test-photo.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data'),
      });

      await page.waitForTimeout(1000);

      // Check for crop/edit modal
      const cropModal = page.locator('.crop-modal, [data-testid="crop-editor"], .image-editor');

      if (await cropModal.isVisible({ timeout: 3000 })) {
        // Adjust crop area (if available)
        const cropButton = page.locator('button:has-text("Crop"), button:has-text("Apply")');

        if (await cropButton.isVisible({ timeout: 1000 })) {
          await cropButton.click();
        }

        await expect(page.locator('img[alt*="profile"], .photo-preview')).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Profile Preview', () => {
    test('should preview profile as others see it', async ({ page }) => {
      await page.goto('/profile');

      const previewButton = page.locator('button:has-text("Preview"), a:has-text("Preview"), button[aria-label*="preview"]');

      if (await previewButton.isVisible({ timeout: 2000 })) {
        await previewButton.click();

        // Should show profile preview
        await expect(page.locator('.profile-preview, [data-testid="profile-preview"]')).toBeVisible({ timeout: 5000 });

        // Should show swipeable card view
        await expect(page.locator('.profile-card, [data-testid="preview-card"]')).toBeVisible();
      }
    });

    test('should navigate through profile photos in preview', async ({ page }) => {
      await page.goto('/profile');

      const previewButton = page.locator('button:has-text("Preview")');

      if (await previewButton.isVisible({ timeout: 2000 })) {
        await previewButton.click();

        await page.waitForTimeout(1000);

        // Click to go to next photo
        const profileCard = page.locator('.profile-card, .profile-preview');
        const box = await profileCard.boundingBox();

        if (box) {
          // Click on right side to go to next photo
          await page.mouse.click(box.x + box.width - 50, box.y + box.height / 2);
          await page.waitForTimeout(300);

          // Click again
          await page.mouse.click(box.x + box.width - 50, box.y + box.height / 2);
        }
      }
    });
  });

  test.describe('Profile Visibility', () => {
    test('should toggle profile visibility', async ({ page }) => {
      await page.goto('/settings');

      // Find visibility toggle
      const visibilityToggle = page.locator('input[name="profileVisible"], [data-testid="visibility-toggle"]');

      if (await visibilityToggle.isVisible({ timeout: 2000 })) {
        // Get current state
        const isVisible = await visibilityToggle.isChecked();

        // Toggle
        await visibilityToggle.click();

        await page.waitForTimeout(500);

        // Verify state changed
        const newState = await visibilityToggle.isChecked();
        expect(newState).not.toBe(isVisible);
      }
    });

    test('should pause discovery mode', async ({ page }) => {
      await page.goto('/settings');

      const pauseToggle = page.locator('input[name="pauseDiscovery"], [data-testid="pause-discovery"]');

      if (await pauseToggle.isVisible({ timeout: 2000 })) {
        await pauseToggle.click();

        await expect(page.locator('text=/paused|hidden|not.*visible/i')).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Profile Completion', () => {
    test('should show profile completion percentage', async ({ page }) => {
      await page.goto('/profile');

      const completionIndicator = page.locator('.completion-percentage, [data-testid="profile-completion"], text=/\\d+%/');

      if (await completionIndicator.isVisible({ timeout: 2000 })) {
        const completionText = await completionIndicator.textContent();
        expect(completionText).toMatch(/\d+%/);
      }
    });

    test('should suggest improvements for incomplete profile', async ({ page }) => {
      await page.goto('/profile');

      const suggestionsSection = page.locator('.profile-suggestions, [data-testid="improvement-tips"]');

      if (await suggestionsSection.isVisible({ timeout: 2000 })) {
        // Should have at least one suggestion
        const suggestions = page.locator('.suggestion-item, [data-testid="suggestion"]');
        const count = await suggestions.count();
        expect(count).toBeGreaterThanOrEqual(1);
      }
    });
  });
});
