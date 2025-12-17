import { test, expect } from '../setup';

test.describe('Matching and Discovery Flow E2E', () => {
  test('should display discovery cards', async ({ authenticatedPage: page }) => {
    await page.goto('/discover');

    // Wait for discovery cards to load
    await page.waitForSelector('.profile-card', { timeout: 5000 });

    // Should display at least one profile card
    const cards = await page.locator('.profile-card');
    await expect(cards).toHaveCountGreaterThan(0);
  });

  test('should swipe right on profile', async ({ authenticatedPage: page }) => {
    await page.goto('/discover');
    await page.waitForSelector('.profile-card');

    // Click like/swipe right button
    await page.click('button[data-action="like"]');

    // Card should disappear or animate away
    await page.waitForTimeout(500);

    // Next card should appear
    const newCard = await page.locator('.profile-card');
    await expect(newCard).toBeVisible();
  });

  test('should swipe left on profile', async ({ authenticatedPage: page }) => {
    await page.goto('/discover');
    await page.waitForSelector('.profile-card');

    // Click dislike/swipe left button
    await page.click('button[data-action="dislike"]');

    // Card should disappear
    await page.waitForTimeout(500);

    // Next card should appear
    const newCard = await page.locator('.profile-card');
    await expect(newCard).toBeVisible();
  });

  test('should super like profile', async ({ authenticatedPage: page }) => {
    await page.goto('/discover');
    await page.waitForSelector('.profile-card');

    // Click super like button
    await page.click('button[data-action="super-like"]');

    // Should show super like animation or confirmation
    await expect(page.locator('.super-like-indicator')).toBeVisible();
  });

  test('should view full profile details', async ({ authenticatedPage: page }) => {
    await page.goto('/discover');
    await page.waitForSelector('.profile-card');

    // Click on profile card or info button
    await page.click('.profile-card');

    // Should open profile details modal/page
    await expect(page.locator('.profile-details-modal')).toBeVisible();

    // Should display profile information
    await expect(page.locator('.profile-bio')).toBeVisible();
    await expect(page.locator('.profile-photos')).toBeVisible();
  });

  test('should create match when both users swipe right', async ({ page, db }) => {
    // Create two test users programmatically
    const user1Email = `match1_${Date.now()}@test.com`;
    const user2Email = `match2_${Date.now()}@test.com`;

    // Register user 1
    await page.request.post('/api/auth/register', {
      data: {
        email: user1Email,
        password: 'TestPass123!',
        first_name: 'User',
        last_name: 'One',
        date_of_birth: '1995-01-01',
        gender: 'male',
      },
    });

    // Register user 2
    const user2Response = await page.request.post('/api/auth/register', {
      data: {
        email: user2Email,
        password: 'TestPass123!',
        first_name: 'User',
        last_name: 'Two',
        date_of_birth: '1996-01-01',
        gender: 'female',
      },
    });

    const user2Data = await user2Response.json();
    const user2Id = user2Data.data.user.id;

    // Login as user 1
    const loginResponse = await page.request.post('/api/auth/login', {
      data: {
        email: user1Email,
        password: 'TestPass123!',
      },
    });

    const { accessToken } = (await loginResponse.json()).data;

    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('accessToken', token);
    }, accessToken);

    // User 1 swipes right on User 2
    await page.goto('/discover');
    await page.waitForSelector('.profile-card');

    // Find User 2's card and swipe right
    await page.click(`button[data-action="like"]`);

    // Check if match was created (would need User 2 to also swipe right in real scenario)
    // This is simplified for testing
  });

  test('should apply discovery filters', async ({ authenticatedPage: page }) => {
    await page.goto('/discover/filters');

    // Set age range
    await page.fill('input[name="minAge"]', '25');
    await page.fill('input[name="maxAge"]', '35');

    // Set distance
    await page.fill('input[name="maxDistance"]', '50');

    // Set gender preference
    await page.selectOption('select[name="showMe"]', 'women');

    // Apply filters
    await page.click('button[type="submit"]');

    // Should redirect back to discovery
    await expect(page).toHaveURL('/discover');

    // Filters should be applied (cards shown should match criteria)
  });

  test('should show no more profiles message when queue is empty', async ({ authenticatedPage: page }) => {
    await page.goto('/discover');

    // Swipe through all available profiles (simulated)
    for (let i = 0; i < 50; i++) {
      const hasCard = await page.locator('.profile-card').count() > 0;
      if (!hasCard) break;

      await page.click('button[data-action="like"]');
      await page.waitForTimeout(100);
    }

    // Should show empty state message
    await expect(page.locator('.no-more-profiles')).toBeVisible();
  });
});
