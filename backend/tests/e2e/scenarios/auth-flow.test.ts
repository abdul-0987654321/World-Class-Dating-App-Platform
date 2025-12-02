import { test, expect } from '../setup';

test.describe('Authentication Flow E2E', () => {
  test('should complete full registration flow', async ({ page }) => {
    await page.goto('/signup');

    // Fill registration form
    await page.fill('input[name="email"]', `test_${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.fill('input[name="confirmPassword"]', 'SecurePass123!');
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');
    await page.fill('input[name="dateOfBirth"]', '1995-01-15');
    await page.selectOption('select[name="gender"]', 'male');

    // Accept terms
    await page.check('input[name="acceptTerms"]');

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to verification page or profile setup
    await expect(page).toHaveURL(/\/(verify-email|profile-setup)/);
  });

  test('should show validation errors for invalid registration', async ({ page }) => {
    await page.goto('/signup');

    // Fill form with invalid data
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', 'weak');

    // Submit form
    await page.click('button[type="submit"]');

    // Should show validation errors
    await expect(page.locator('.error-message')).toHaveCount(2);
  });

  test('should login successfully', async ({ page }) => {
    // First register a user
    const testUser = {
      email: `login_test_${Date.now()}@example.com`,
      password: 'SecurePass123!',
    };

    await page.request.post('/api/auth/register', {
      data: {
        ...testUser,
        first_name: 'Test',
        last_name: 'User',
        date_of_birth: '1995-01-01',
        gender: 'male',
      },
    });

    // Now login
    await page.goto('/login');
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Should redirect to main app
    await expect(page).toHaveURL(/\/(discover|home)/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'nonexistent@example.com');
    await page.fill('input[name="password"]', 'WrongPassword123!');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('.error-message')).toContainText(/invalid credentials/i);
  });

  test('should complete password reset flow', async ({ page }) => {
    // Navigate to forgot password page
    await page.goto('/forgot-password');

    await page.fill('input[name="email"]', 'test@example.com');
    await page.click('button[type="submit"]');

    // Should show success message
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test('should logout successfully', async ({ authenticatedPage: page }) => {
    // User is already authenticated via fixture
    await page.goto('/settings');

    // Click logout button
    await page.click('button:has-text("Logout")');

    // Should redirect to login page
    await expect(page).toHaveURL('/login');

    // Should not be able to access protected routes
    await page.goto('/discover');
    await expect(page).toHaveURL('/login');
  });
});
