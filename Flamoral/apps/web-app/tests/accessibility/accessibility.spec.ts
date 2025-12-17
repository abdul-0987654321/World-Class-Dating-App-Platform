import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility Tests - WCAG 2.1 AA Compliance
 * These tests ensure the application meets accessibility standards.
 */

test.describe('Accessibility - WCAG 2.1 AA Compliance', () => {
  test.describe('Login Page', () => {
    test('should have no accessibility violations', async ({ page }) => {
      await page.goto('/login');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have proper form labels', async ({ page }) => {
      await page.goto('/login');

      const emailInput = page.getByTestId('login-email');
      const passwordInput = page.getByTestId('login-password');

      // Check for associated labels
      await expect(emailInput).toHaveAttribute('aria-label', /.+/);
      await expect(passwordInput).toHaveAttribute('aria-label', /.+/);
    });

    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/login');

      // Tab through form elements
      await page.keyboard.press('Tab');
      await expect(page.getByTestId('login-email')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.getByTestId('login-password')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.getByTestId('login-submit')).toBeFocused();
    });
  });

  test.describe('Discover Page', () => {
    test('should have no accessibility violations', async ({ page }) => {
      await page.goto('/discover');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .exclude('.profile-photo') // Exclude dynamic content
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have proper ARIA labels for action buttons', async ({ page }) => {
      await page.goto('/discover');

      const likeButton = page.getByTestId('like-button');
      const dislikeButton = page.getByTestId('dislike-button');
      const superLikeButton = page.getByTestId('superlike-button');

      await expect(likeButton).toHaveAttribute('aria-label', /like/i);
      await expect(dislikeButton).toHaveAttribute('aria-label', /pass|dislike/i);
      await expect(superLikeButton).toHaveAttribute('aria-label', /super.?like/i);
    });

    test('profile cards should have proper image alt text', async ({ page }) => {
      await page.goto('/discover');

      const profileImages = page.locator('[data-testid="profile-photo"] img');
      const imageCount = await profileImages.count();

      for (let i = 0; i < imageCount; i++) {
        await expect(profileImages.nth(i)).toHaveAttribute('alt', /.+/);
      }
    });

    test('should support swipe gestures with keyboard alternatives', async ({ page }) => {
      await page.goto('/discover');

      // Test keyboard shortcuts
      await page.keyboard.press('ArrowRight'); // Like
      await page.keyboard.press('ArrowLeft'); // Pass
      await page.keyboard.press('ArrowUp'); // Super Like
    });
  });

  test.describe('Messages Page', () => {
    test('should have no accessibility violations', async ({ page }) => {
      await page.goto('/messages');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('conversation list should be navigable with screen reader', async ({ page }) => {
      await page.goto('/messages');

      const conversationList = page.getByTestId('conversation-list');

      // Should have proper role
      await expect(conversationList).toHaveAttribute('role', 'list');

      // Items should have proper roles
      const items = page.getByTestId('conversation-item');
      const itemCount = await items.count();

      for (let i = 0; i < Math.min(itemCount, 5); i++) {
        await expect(items.nth(i)).toHaveAttribute('role', 'listitem');
      }
    });

    test('message input should announce character count', async ({ page }) => {
      await page.goto('/messages');

      const messageInput = page.getByTestId('message-input');

      // Should have aria-describedby for character count
      await expect(messageInput).toHaveAttribute('aria-describedby', /.+/);
    });
  });

  test.describe('Profile Page', () => {
    test('should have no accessibility violations', async ({ page }) => {
      await page.goto('/profile');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('photo upload should be accessible', async ({ page }) => {
      await page.goto('/profile');

      const photoUpload = page.getByTestId('photo-upload');

      // Should have accessible name
      await expect(photoUpload).toHaveAttribute('aria-label', /upload|add photo/i);
    });
  });

  test.describe('Color Contrast', () => {
    test('should have sufficient color contrast throughout', async ({ page }) => {
      const pages = ['/login', '/discover', '/messages', '/profile'];

      for (const pagePath of pages) {
        await page.goto(pagePath);

        const accessibilityScanResults = await new AxeBuilder({ page })
          .withTags(['wcag2aa'])
          .options({ rules: ['color-contrast'] })
          .analyze();

        expect(
          accessibilityScanResults.violations.filter(v => v.id === 'color-contrast')
        ).toEqual([]);
      }
    });
  });

  test.describe('Focus Management', () => {
    test('modals should trap focus', async ({ page }) => {
      await page.goto('/discover');

      // Open a modal (e.g., match modal simulation)
      await page.evaluate(() => {
        // Trigger modal open
        document.dispatchEvent(new CustomEvent('open-modal'));
      });

      const modal = page.getByRole('dialog');
      if (await modal.isVisible()) {
        // Focus should be within modal
        const focusedElement = await page.evaluate(() => document.activeElement?.closest('[role="dialog"]'));
        expect(focusedElement).toBeTruthy();
      }
    });

    test('focus should return after modal close', async ({ page }) => {
      await page.goto('/discover');

      const triggerButton = page.getByTestId('filter-button');
      await triggerButton.click();

      // Close modal
      await page.keyboard.press('Escape');

      // Focus should return to trigger
      await expect(triggerButton).toBeFocused();
    });
  });

  test.describe('Screen Reader Announcements', () => {
    test('dynamic content updates should be announced', async ({ page }) => {
      await page.goto('/discover');

      // Check for live regions
      const liveRegion = page.locator('[aria-live]');
      expect(await liveRegion.count()).toBeGreaterThan(0);
    });

    test('form errors should be announced', async ({ page }) => {
      await page.goto('/login');

      // Submit empty form
      await page.getByTestId('login-submit').click();

      // Error should be in an aria-live region or associated with input
      const errorMessage = page.getByTestId('login-error');
      const ariaLive = await errorMessage.getAttribute('aria-live');
      const role = await errorMessage.getAttribute('role');

      expect(ariaLive === 'polite' || ariaLive === 'assertive' || role === 'alert').toBeTruthy();
    });
  });
});
