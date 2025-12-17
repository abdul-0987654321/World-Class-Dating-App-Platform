import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * E2E Tests for Profile Setup Flow
 */

test.describe('Profile Setup Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as a new user
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL as string);
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD as string);
    await page.click('button[type="submit"]');

    // Navigate to profile setup
    await page.waitForURL(/.*profile\/setup/);
  });

  test('should complete basic profile information', async ({ page }) => {
    // Step 1: Basic Info
    await page.fill('textarea[name="bio"]', 'Looking for meaningful connections. Love hiking and photography.');

    // Select interests
    await page.click('text=Hiking');
    await page.click('text=Photography');
    await page.click('text=Cooking');
    await page.click('text=Travel');

    // Click next
    await page.click('button:has-text("Next")');

    // Verify moved to next step
    await expect(page.locator('text=/photo|picture/i')).toBeVisible();
  });

  test('should upload profile photos', async ({ page }) => {
    // Navigate to photo upload step
    await page.click('button:has-text("Next")');

    // Upload photo
    const photoPath = path.join(__dirname, '../fixtures/test-photo.jpg');
    await page.setInputFiles('input[type="file"]', photoPath);

    // Wait for upload
    await page.waitForSelector('img[alt*="profile"]', { timeout: 10000 });

    // Verify photo uploaded
    const uploadedPhoto = await page.locator('img[alt*="profile"]');
    await expect(uploadedPhoto).toBeVisible();

    // Upload more photos
    await page.setInputFiles('input[type="file"]', [
      path.join(__dirname, '../fixtures/test-photo-2.jpg'),
      path.join(__dirname, '../fixtures/test-photo-3.jpg')
    ]);

    await page.waitForTimeout(2000);

    // Should show multiple photos
    const photos = await page.locator('img[alt*="profile"]').count();
    expect(photos).toBeGreaterThanOrEqual(3);

    await page.click('button:has-text("Next")');
  });

  test('should set preferences', async ({ page }) => {
    // Skip to preferences step
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Next")');

    // Set age range
    await page.fill('input[name="ageMin"]', '25');
    await page.fill('input[name="ageMax"]', '35');

    // Set distance
    await page.fill('input[name="distance"]', '50');

    // Select gender preference
    await page.click('input[name="genderPreference"][value="female"]');

    // Set looking for
    await page.selectOption('select[name="lookingFor"]', 'serious relationship');

    await page.click('button:has-text("Next")');

    // Should show completion
    await expect(page.locator('text=/complete|finish/i')).toBeVisible();
  });

  test('should enforce photo requirement', async ({ page }) => {
    // Try to skip photo step without uploading
    await page.click('button:has-text("Next")'); // Skip basic info
    await page.click('button:has-text("Next")'); // Try to skip photos

    // Should show error or prevent progression
    await expect(page.locator('text=/photo.*required/i')).toBeVisible();
  });

  test('should validate bio length', async ({ page }) => {
    // Very short bio
    await page.fill('textarea[name="bio"]', 'Hi');

    await expect(page.locator('text=/bio.*short/i')).toBeVisible();

    // Very long bio
    const longBio = 'x'.repeat(1001);
    await page.fill('textarea[name="bio"]', longBio);

    await expect(page.locator('text=/bio.*long/i')).toBeVisible();
  });

  test('should show progress indicator', async ({ page }) => {
    // Check for progress indicator
    const progressBar = await page.locator('[role="progressbar"], .progress, .stepper');
    await expect(progressBar).toBeVisible();

    // Move to next step
    await page.click('button:has-text("Next")');

    // Progress should update (implementation dependent)
    // This is a visual check that the indicator exists
  });

  test('should allow going back to previous steps', async ({ page }) => {
    await page.fill('textarea[name="bio"]', 'Test bio');
    await page.click('button:has-text("Next")');

    // Go back
    await page.click('button:has-text("Back")');

    // Should preserve filled data
    const bioValue = await page.inputValue('textarea[name="bio"]');
    expect(bioValue).toBe('Test bio');
  });

  test('should redirect to discovery after completion', async ({ page }) => {
    // Complete all steps quickly
    await page.fill('textarea[name="bio"]', 'Looking for connections');
    await page.click('text=Hiking');
    await page.click('button:has-text("Next")');

    // Upload photo
    const photoPath = path.join(__dirname, '../fixtures/test-photo.jpg');
    await page.setInputFiles('input[type="file"]', photoPath);
    await page.waitForTimeout(2000);
    await page.click('button:has-text("Next")');

    // Set preferences
    await page.fill('input[name="ageMin"]', '25');
    await page.fill('input[name="ageMax"]', '35');
    await page.click('button:has-text("Finish")');

    // Should redirect to discovery/dashboard
    await expect(page).toHaveURL(/.*discover|dashboard/, { timeout: 10000 });
  });
});
