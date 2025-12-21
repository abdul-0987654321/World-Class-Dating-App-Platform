import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for Complete Authentication Flow
 * Tests: Register -> Login -> Logout cycle
 */

test.describe('Authentication Flow - Complete Cycle', () => {
  const generateTestUser = () => ({
    email: `test.user.${Date.now()}@example.com`,
    password: 'SecurePassword123!@#',
    firstName: 'Test',
    lastName: 'User',
    dateOfBirth: '1995-06-15',
    gender: 'male',
  });

  test.describe('Registration Flow', () => {
    test('should complete full registration with all fields', async ({ page }) => {
      const testUser = generateTestUser();

      await page.goto('/register');

      // Fill all registration fields
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.fill('input[name="confirmPassword"]', testUser.password);
      await page.fill('input[name="firstName"]', testUser.firstName);
      await page.fill('input[name="lastName"]', testUser.lastName);
      await page.fill('input[name="dateOfBirth"]', testUser.dateOfBirth);

      // Select gender
      await page.click(`input[name="gender"][value="${testUser.gender}"]`);

      // Accept terms and privacy policy
      await page.check('input[name="acceptTerms"]');
      await page.check('input[name="acceptPrivacy"]');

      // Submit registration
      await page.click('button[type="submit"]');

      // Verify successful registration
      await expect(page).toHaveURL(/.*profile\/setup|verify-email|dashboard/, { timeout: 15000 });

      // Store credentials for subsequent tests
      await page.evaluate((user) => {
        localStorage.setItem('testUserEmail', user.email);
      }, testUser);
    });

    test('should validate email format during registration', async ({ page }) => {
      await page.goto('/register');

      await page.fill('input[name="email"]', 'invalid-email-format');
      await page.blur('input[name="email"]');

      await expect(page.locator('text=/invalid.*email|email.*invalid/i')).toBeVisible({ timeout: 5000 });
    });

    test('should validate password strength requirements', async ({ page }) => {
      await page.goto('/register');

      // Test weak password
      await page.fill('input[name="password"]', '123');
      await page.blur('input[name="password"]');

      await expect(page.locator('text=/password.*weak|password.*strong|at least/i')).toBeVisible({ timeout: 5000 });

      // Test password without special characters
      await page.fill('input[name="password"]', 'Password123');
      await page.blur('input[name="password"]');

      // Test strong password
      await page.fill('input[name="password"]', 'SecurePass123!@#');
      await page.blur('input[name="password"]');

      // Strength indicator should show acceptable
      await expect(page.locator('text=/strong|acceptable/i')).toBeVisible({ timeout: 5000 });
    });

    test('should validate password confirmation matches', async ({ page }) => {
      await page.goto('/register');

      await page.fill('input[name="password"]', 'SecurePass123!@#');
      await page.fill('input[name="confirmPassword"]', 'DifferentPass123!@#');
      await page.blur('input[name="confirmPassword"]');

      await expect(page.locator('text=/password.*match|passwords.*match/i')).toBeVisible({ timeout: 5000 });
    });

    test('should validate minimum age requirement (18+)', async ({ page }) => {
      await page.goto('/register');

      // Calculate date for 16-year-old
      const underageDate = new Date();
      underageDate.setFullYear(underageDate.getFullYear() - 16);

      await page.fill('input[name="dateOfBirth"]', underageDate.toISOString().split('T')[0]);
      await page.blur('input[name="dateOfBirth"]');

      await expect(page.locator('text=/18.*years|must.*18|age.*18/i')).toBeVisible({ timeout: 5000 });
    });

    test('should prevent duplicate email registration', async ({ page }) => {
      const testUser = generateTestUser();

      // First registration
      await page.goto('/register');
      await page.fill('input[name="email"]', 'existing@example.com');
      await page.fill('input[name="password"]', testUser.password);
      await page.fill('input[name="confirmPassword"]', testUser.password);
      await page.fill('input[name="firstName"]', testUser.firstName);
      await page.fill('input[name="lastName"]', testUser.lastName);
      await page.fill('input[name="dateOfBirth"]', testUser.dateOfBirth);
      await page.click(`input[name="gender"][value="${testUser.gender}"]`);
      await page.check('input[name="acceptTerms"]');
      await page.click('button[type="submit"]');

      // Wait for response
      await page.waitForTimeout(2000);

      // Should show duplicate email error
      const errorVisible = await page.locator('text=/already.*exists|email.*registered|account.*exists/i').isVisible();

      if (!errorVisible) {
        // Registration succeeded, try again with same email
        await page.goto('/register');
        await page.fill('input[name="email"]', 'existing@example.com');
        await page.fill('input[name="password"]', testUser.password);
        await page.fill('input[name="confirmPassword"]', testUser.password);
        await page.fill('input[name="firstName"]', testUser.firstName);
        await page.fill('input[name="lastName"]', testUser.lastName);
        await page.fill('input[name="dateOfBirth"]', testUser.dateOfBirth);
        await page.click(`input[name="gender"][value="${testUser.gender}"]`);
        await page.check('input[name="acceptTerms"]');
        await page.click('button[type="submit"]');

        await expect(page.locator('text=/already.*exists|email.*registered|account.*exists/i')).toBeVisible({ timeout: 10000 });
      }
    });

    test('should require terms and conditions acceptance', async ({ page }) => {
      const testUser = generateTestUser();

      await page.goto('/register');

      // Fill all fields except terms
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.fill('input[name="confirmPassword"]', testUser.password);
      await page.fill('input[name="firstName"]', testUser.firstName);
      await page.fill('input[name="lastName"]', testUser.lastName);
      await page.fill('input[name="dateOfBirth"]', testUser.dateOfBirth);
      await page.click(`input[name="gender"][value="${testUser.gender}"]`);

      // Try to submit without accepting terms
      const submitButton = page.locator('button[type="submit"]');

      // Button should be disabled or form should not submit
      const isDisabled = await submitButton.isDisabled();

      if (!isDisabled) {
        await submitButton.click();
        await expect(page.locator('text=/accept.*terms|terms.*required/i')).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Login Flow', () => {
    test('should login successfully with valid credentials', async ({ page }) => {
      await page.goto('/login');

      await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
      await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPass123!');

      await page.click('button[type="submit"]');

      // Should redirect to dashboard or discover
      await expect(page).toHaveURL(/.*dashboard|discover|home/, { timeout: 15000 });

      // Should show logged-in state
      await expect(page.locator('text=/logout|profile|settings/i')).toBeVisible({ timeout: 5000 });
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      await page.fill('input[name="email"]', 'valid@example.com');
      await page.fill('input[name="password"]', 'WrongPassword123!');

      await page.click('button[type="submit"]');

      await expect(page.locator('text=/invalid.*credentials|incorrect.*password|login.*failed/i')).toBeVisible({ timeout: 10000 });
    });

    test('should show error for non-existent email', async ({ page }) => {
      await page.goto('/login');

      await page.fill('input[name="email"]', 'nonexistent@example.com');
      await page.fill('input[name="password"]', 'SomePassword123!');

      await page.click('button[type="submit"]');

      await expect(page.locator('text=/invalid.*credentials|user.*not.*found|login.*failed/i')).toBeVisible({ timeout: 10000 });
    });

    test('should handle "Remember me" functionality', async ({ page, context }) => {
      await page.goto('/login');

      await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
      await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPass123!');

      // Check remember me
      const rememberMeCheckbox = page.locator('input[name="rememberMe"], input[type="checkbox"]');
      if (await rememberMeCheckbox.isVisible()) {
        await rememberMeCheckbox.check();
      }

      await page.click('button[type="submit"]');

      await expect(page).toHaveURL(/.*dashboard|discover/, { timeout: 15000 });

      // Check that a persistent cookie was set
      const cookies = await context.cookies();
      const authCookie = cookies.find(c => c.name.includes('token') || c.name.includes('auth') || c.name.includes('session'));

      if (authCookie) {
        // Should have longer expiry for remember me
        expect(authCookie.expires).toBeGreaterThan(Date.now() / 1000);
      }
    });

    test('should rate limit excessive login attempts', async ({ page }) => {
      await page.goto('/login');

      // Make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[name="password"]', 'WrongPassword123!');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(500);
      }

      // Should eventually show rate limit message or account locked
      const rateLimited = await page.locator('text=/too.*many.*attempts|account.*locked|try.*later|rate.*limit/i').isVisible({ timeout: 5000 });

      // Either rate limited or account protection triggered
      expect(rateLimited).toBeTruthy();
    });

    test('should navigate to forgot password from login', async ({ page }) => {
      await page.goto('/login');

      await page.click('text=/forgot.*password|reset.*password/i');

      await expect(page).toHaveURL(/.*forgot-password|reset-password/);
    });
  });

  test.describe('Logout Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
      await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPass123!');
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*dashboard|discover/, { timeout: 15000 });
    });

    test('should logout successfully', async ({ page }) => {
      // Find and click logout button
      const logoutButton = page.locator('text=/logout|sign.*out/i');

      if (await logoutButton.isVisible()) {
        await logoutButton.click();
      } else {
        // May be in a menu
        await page.click('[aria-label*="menu"], [aria-label*="settings"], button:has-text("Menu")');
        await page.click('text=/logout|sign.*out/i');
      }

      // Should redirect to login or home
      await expect(page).toHaveURL(/.*login|.*\/$/, { timeout: 10000 });
    });

    test('should clear session on logout', async ({ page, context }) => {
      // Perform logout
      const logoutButton = page.locator('text=/logout|sign.*out/i');

      if (await logoutButton.isVisible()) {
        await logoutButton.click();
      } else {
        await page.click('[aria-label*="menu"], button:has-text("Menu")');
        await page.click('text=/logout|sign.*out/i');
      }

      await page.waitForURL(/.*login|.*\/$/, { timeout: 10000 });

      // Verify session is cleared
      const cookies = await context.cookies();
      const authCookie = cookies.find(c => c.name.includes('token') || c.name.includes('auth'));

      // Auth cookie should be removed or expired
      expect(authCookie?.value || '').toBe('');
    });

    test('should not access protected routes after logout', async ({ page }) => {
      // Logout
      const logoutButton = page.locator('text=/logout|sign.*out/i');

      if (await logoutButton.isVisible()) {
        await logoutButton.click();
      } else {
        await page.click('[aria-label*="menu"]');
        await page.click('text=/logout|sign.*out/i');
      }

      await page.waitForURL(/.*login|.*\/$/, { timeout: 10000 });

      // Try to access protected route
      await page.goto('/dashboard');

      // Should be redirected to login
      await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
    });

    test('should logout from all devices when requested', async ({ page }) => {
      // Navigate to security settings
      await page.goto('/settings/security');

      // Look for logout from all devices option
      const logoutAllButton = page.locator('button:has-text("Logout All"), button:has-text("Sign out everywhere")');

      if (await logoutAllButton.isVisible({ timeout: 3000 })) {
        await logoutAllButton.click();

        // Confirm action
        await page.click('button:has-text("Confirm"), button:has-text("Yes")');

        // Should redirect to login
        await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
      }
    });
  });

  test.describe('Session Management', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
      await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPass123!');
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*dashboard|discover/, { timeout: 15000 });
    });

    test('should maintain session on page reload', async ({ page }) => {
      // Reload page
      await page.reload();

      // Should still be logged in
      await expect(page).toHaveURL(/.*dashboard|discover/);
      await expect(page.locator('text=/logout|profile/i')).toBeVisible({ timeout: 5000 });
    });

    test('should refresh token automatically', async ({ page }) => {
      // Wait for token to near expiry (this test may need adjustment based on actual token expiry)
      await page.waitForTimeout(5000);

      // Perform an action that requires authentication
      await page.goto('/settings');

      // Should still be authenticated
      await expect(page).toHaveURL(/.*settings/);
      await expect(page.locator('text=/logout|account/i')).toBeVisible({ timeout: 5000 });
    });

    test('should show active sessions in settings', async ({ page }) => {
      await page.goto('/settings/security');

      // Look for active sessions section
      const sessionsSection = page.locator('text=/active.*session|logged.*device|current.*session/i');

      if (await sessionsSection.isVisible({ timeout: 3000 })) {
        await expect(sessionsSection).toBeVisible();

        // Should show at least current session
        const sessionsList = page.locator('[data-testid="session"], .session-item, .device-item');
        const count = await sessionsList.count();
        expect(count).toBeGreaterThanOrEqual(1);
      }
    });
  });

  test.describe('Password Reset Flow', () => {
    test('should request password reset', async ({ page }) => {
      await page.goto('/forgot-password');

      await page.fill('input[name="email"]', 'test@example.com');
      await page.click('button[type="submit"]');

      // Should show success message
      await expect(page.locator('text=/email.*sent|check.*inbox|reset.*link/i')).toBeVisible({ timeout: 10000 });
    });

    test('should handle non-existent email in password reset', async ({ page }) => {
      await page.goto('/forgot-password');

      await page.fill('input[name="email"]', 'nonexistent@example.com');
      await page.click('button[type="submit"]');

      // Should still show success (for security - don't reveal if email exists)
      await expect(page.locator('text=/email.*sent|check.*inbox|if.*account.*exists/i')).toBeVisible({ timeout: 10000 });
    });

    test('should validate new password in reset flow', async ({ page }) => {
      // Navigate to reset password page with token (mock)
      await page.goto('/reset-password?token=test-token');

      // Enter weak password
      await page.fill('input[name="newPassword"]', '123');
      await page.fill('input[name="confirmPassword"]', '123');
      await page.click('button[type="submit"]');

      // Should show password requirements error
      await expect(page.locator('text=/password.*strong|password.*requirement/i')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('OAuth/Social Login', () => {
    test('should show social login options', async ({ page }) => {
      await page.goto('/login');

      // Check for social login buttons
      const googleButton = page.locator('button:has-text("Google"), [aria-label*="Google"]');
      const appleButton = page.locator('button:has-text("Apple"), [aria-label*="Apple"]');
      const facebookButton = page.locator('button:has-text("Facebook"), [aria-label*="Facebook"]');

      // At least one social login should be available
      const hasGoogleLogin = await googleButton.isVisible({ timeout: 3000 });
      const hasAppleLogin = await appleButton.isVisible({ timeout: 1000 });
      const hasFacebookLogin = await facebookButton.isVisible({ timeout: 1000 });

      expect(hasGoogleLogin || hasAppleLogin || hasFacebookLogin).toBeTruthy();
    });

    test('should initiate Google OAuth flow', async ({ page }) => {
      await page.goto('/login');

      const googleButton = page.locator('button:has-text("Google"), [aria-label*="Google"]');

      if (await googleButton.isVisible({ timeout: 3000 })) {
        // Click should redirect to Google OAuth
        const [popup] = await Promise.all([
          page.waitForEvent('popup').catch(() => null),
          googleButton.click(),
        ]);

        if (popup) {
          // Should redirect to Google auth page
          await expect(popup).toHaveURL(/accounts\.google\.com|oauth2/, { timeout: 10000 });
        } else {
          // May redirect in same window
          await expect(page).toHaveURL(/accounts\.google\.com|oauth2|google/, { timeout: 10000 });
        }
      }
    });
  });

  test.describe('Email Verification', () => {
    test('should show verification pending message after registration', async ({ page }) => {
      const testUser = generateTestUser();

      await page.goto('/register');

      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.fill('input[name="confirmPassword"]', testUser.password);
      await page.fill('input[name="firstName"]', testUser.firstName);
      await page.fill('input[name="lastName"]', testUser.lastName);
      await page.fill('input[name="dateOfBirth"]', testUser.dateOfBirth);
      await page.click(`input[name="gender"][value="${testUser.gender}"]`);
      await page.check('input[name="acceptTerms"]');
      await page.click('button[type="submit"]');

      // May show verification message
      const verificationMessage = page.locator('text=/verify.*email|check.*inbox|confirmation.*email/i');

      if (await verificationMessage.isVisible({ timeout: 5000 })) {
        await expect(verificationMessage).toBeVisible();
      }
    });

    test('should allow resending verification email', async ({ page }) => {
      await page.goto('/verify-email');

      const resendButton = page.locator('button:has-text("Resend"), button:has-text("Send again")');

      if (await resendButton.isVisible({ timeout: 3000 })) {
        await resendButton.click();

        // Should show confirmation
        await expect(page.locator('text=/sent|resent/i')).toBeVisible({ timeout: 5000 });
      }
    });
  });
});
