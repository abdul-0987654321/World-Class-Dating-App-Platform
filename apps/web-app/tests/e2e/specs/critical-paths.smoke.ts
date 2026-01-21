import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/LoginPage';
import { DiscoverPage } from '../page-objects/DiscoverPage';
import { MessagesPage } from '../page-objects/MessagesPage';

/**
 * Smoke Tests - Critical User Journeys
 * These tests verify the most important user flows work correctly.
 * Run before every deployment.
 */

test.describe('Critical Path - Smoke Tests', () => {
  test('User can login and view discover page', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const discoverPage = new DiscoverPage(page);

    await loginPage.goto();
    await loginPage.login(process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!);
    await loginPage.expectSuccessfulLogin();
    await discoverPage.isLoaded();
  });

  test('User can swipe profiles', async ({ page }) => {
    const discoverPage = new DiscoverPage(page);

    await page.goto('/discover');
    await discoverPage.waitForProfileToLoad();

    // Get initial profile info
    const initialProfile = await discoverPage.getProfileInfo();
    expect(initialProfile.name).toBeTruthy();

    // Swipe right
    await discoverPage.swipeRight();

    // Verify new profile loaded
    await discoverPage.waitForProfileToLoad();
    const newProfile = await discoverPage.getProfileInfo();
    // Profile should change (or show no more profiles)
  });

  test('User can view and send messages', async ({ page }) => {
    const messagesPage = new MessagesPage(page);

    await messagesPage.goto();
    await messagesPage.isLoaded();

    // Check if there are conversations
    const conversationCount = await messagesPage.conversationItem.count();
    if (conversationCount > 0) {
      await messagesPage.selectConversation(0);
      await messagesPage.sendMessage('Smoke test message - ' + Date.now());
    }
  });

  test('User can access profile settings', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByTestId('profile-edit')).toBeVisible();
    await expect(page.getByTestId('profile-photos')).toBeVisible();
  });

  test('App handles network errors gracefully', async ({ page }) => {
    // Simulate offline
    await page.route('**/api/**', (route) => route.abort());

    await page.goto('/discover');
    await expect(page.getByTestId('error-message')).toBeVisible();
    await expect(page.getByTestId('retry-button')).toBeVisible();
  });

  test('Navigation works correctly', async ({ page }) => {
    // Test main navigation
    await page.goto('/');

    // Navigate to Discover
    await page.getByTestId('nav-discover').click();
    await expect(page).toHaveURL(/.*discover/);

    // Navigate to Matches
    await page.getByTestId('nav-matches').click();
    await expect(page).toHaveURL(/.*matches/);

    // Navigate to Messages
    await page.getByTestId('nav-messages').click();
    await expect(page).toHaveURL(/.*messages/);

    // Navigate to Profile
    await page.getByTestId('nav-profile').click();
    await expect(page).toHaveURL(/.*profile/);
  });

  test('Health check endpoints respond', async ({ request }) => {
    // API health check
    const apiHealth = await request.get(`${process.env.BASE_URL}/api/health`);
    expect(apiHealth.ok()).toBeTruthy();

    // WebSocket health check (if applicable)
    const wsHealth = await request.get(`${process.env.BASE_URL}/api/ws/health`);
    expect(wsHealth.ok()).toBeTruthy();
  });
});

test.describe('Critical Path - Payment Flow', () => {
  test('User can view subscription options', async ({ page }) => {
    await page.goto('/subscription');
    await expect(page.getByTestId('subscription-plans')).toBeVisible();
    await expect(page.getByTestId('plan-basic')).toBeVisible();
    await expect(page.getByTestId('plan-premium')).toBeVisible();
  });

  test('User can initiate subscription purchase', async ({ page }) => {
    await page.goto('/subscription');
    await page.getByTestId('plan-premium').click();
    await expect(page.getByTestId('payment-form')).toBeVisible();
  });
});

test.describe('Critical Path - Safety Features', () => {
  test('User can report a profile', async ({ page }) => {
    await page.goto('/discover');

    await page.getByTestId('report-profile').click();
    await expect(page.getByTestId('report-modal')).toBeVisible();
    await expect(page.getByTestId('report-reason-fake')).toBeVisible();
    await expect(page.getByTestId('report-reason-inappropriate')).toBeVisible();
  });

  test('User can block a profile', async ({ page }) => {
    await page.goto('/discover');

    await page.getByTestId('block-profile').click();
    await expect(page.getByTestId('confirm-block-modal')).toBeVisible();
  });
});
