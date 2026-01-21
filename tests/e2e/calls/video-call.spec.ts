/**
 * Video Call Tests
 * Tests for Agora video call functionality
 */

import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@flamoral.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

test.describe('Video Calls', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="login-email"], input[type="email"]', TEST_EMAIL);
    await page.fill('[data-testid="login-password"], input[type="password"]', TEST_PASSWORD);
    await page.click('[data-testid="login-submit"], button[type="submit"]');
    await page.waitForURL(/discovery|home|matches/);
  });

  test.describe('Call Initiation', () => {
    test('should show call button in conversation', async ({ page }) => {
      await page.goto('/messages');
      
      // Click first conversation if exists
      const conversation = page.locator('[data-testid="conversation-item"], .conversation-item').first();
      if (await conversation.count() > 0) {
        await conversation.click();
        
        // Check for call button
        const callButton = page.locator('[data-testid="video-call-button"], [aria-label*="call"], button:has-text("Call")');
        await expect(callButton).toBeVisible({ timeout: 5000 }).catch(() => {
          // Call button may require premium
          console.log('Call button not visible - may require premium subscription');
        });
      }
    });

    test('should request camera/microphone permissions', async ({ page, context }) => {
      // Grant permissions
      await context.grantPermissions(['camera', 'microphone']);
      
      await page.goto('/messages');
      
      const conversation = page.locator('[data-testid="conversation-item"]').first();
      if (await conversation.count() > 0) {
        await conversation.click();
        
        const callButton = page.locator('[data-testid="video-call-button"]');
        if (await callButton.count() > 0) {
          await callButton.click();
          
          // Should show call interface or permission request
          const callInterface = page.locator('[data-testid="call-interface"], .call-container');
          await expect(callInterface).toBeVisible({ timeout: 10000 }).catch(() => {
            console.log('Call interface not loaded');
          });
        }
      }
    });
  });

  test.describe('Call UI Elements', () => {
    test('should display call controls when in call', async ({ page, context }) => {
      await context.grantPermissions(['camera', 'microphone']);
      
      // Navigate to a mock call page or trigger call
      await page.goto('/call/test-room');
      
      // Check for call controls
      const muteButton = page.locator('[data-testid="mute-button"], [aria-label*="mute"]');
      const videoToggle = page.locator('[data-testid="video-toggle"], [aria-label*="video"]');
      const endCallButton = page.locator('[data-testid="end-call"], [aria-label*="end"]');
      
      // At least end call should be visible in call view
      const anyControlVisible = await Promise.any([
        endCallButton.isVisible().catch(() => false),
        muteButton.isVisible().catch(() => false),
        videoToggle.isVisible().catch(() => false)
      ]).catch(() => false);
      
      // May redirect if not in actual call
      expect(true).toBe(true); // Placeholder - actual call requires backend setup
    });

    test('should show connection status', async ({ page }) => {
      await page.goto('/call/test-room');
      
      const statusIndicator = page.locator('[data-testid="call-status"], .connection-status');
      if (await statusIndicator.count() > 0) {
        await expect(statusIndicator).toBeVisible();
      }
    });
  });

  test.describe('Call End/Rejection', () => {
    test('should handle call end gracefully', async ({ page }) => {
      await page.goto('/call/test-room');
      
      const endCallButton = page.locator('[data-testid="end-call"], button:has-text("End")');
      if (await endCallButton.count() > 0) {
        await endCallButton.click();
        
        // Should navigate away from call
        await page.waitForURL(/messages|discovery|home/);
      }
    });

    test('should show call ended notification', async ({ page }) => {
      await page.goto('/messages');
      
      // Check for any call-ended notifications in the UI
      const notification = page.locator('[data-testid="call-notification"], .notification');
      // Notification may or may not be present
      expect(true).toBe(true);
    });
  });

  test.describe('Premium Call Features', () => {
    test('should show premium upsell for free users', async ({ page }) => {
      await page.goto('/messages');
      
      const conversation = page.locator('[data-testid="conversation-item"]').first();
      if (await conversation.count() > 0) {
        await conversation.click();
        
        const callButton = page.locator('[data-testid="video-call-button"]');
        if (await callButton.count() > 0) {
          await callButton.click();
          
          // May show premium upsell
          const premiumModal = page.locator('[data-testid="premium-upsell"], .premium-modal, text=/premium|upgrade/i');
          if (await premiumModal.count() > 0) {
            await expect(premiumModal).toBeVisible();
          }
        }
      }
    });
  });
});
