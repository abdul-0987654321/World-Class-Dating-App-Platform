/**
 * Production Readiness Audit - Browser Verification
 * Flamoral Dating Platform
 */
import { test, expect } from '@playwright/test';

test.describe('Production Audit - Flamoral', () => {

  test('Step 3.1: Landing page loads without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    const response = await page.goto('https://flamoral.com');

    // Verify page loads
    expect(response?.status()).toBe(200);

    // Check title
    await expect(page).toHaveTitle(/Flamoral/);

    // Document console errors
    console.log('Console errors:', consoleErrors.length === 0 ? 'None' : consoleErrors);

    // Take screenshot
    await page.screenshot({ path: 'tests/audit/screenshots/landing-page.png', fullPage: true });
  });

  test('Step 3.2: Check for placeholder content', async ({ page }) => {
    await page.goto('https://flamoral.com');

    // Check for "Coming Soon" text (placeholder indicator)
    const comingSoon = await page.locator('text=Coming Soon').count();
    console.log('FINDING: "Coming Soon" placeholder found:', comingSoon > 0);

    // Check for "Platform Live" status
    const platformLive = await page.locator('text=Platform Live').count();
    console.log('FINDING: "Platform Live" status found:', platformLive > 0);

    // Check for real navigation/auth buttons
    const loginButton = await page.locator('text=Login').count();
    const signupButton = await page.locator('text=Sign Up').count();
    console.log('FINDING: Login button:', loginButton > 0);
    console.log('FINDING: Sign Up button:', signupButton > 0);

    await page.screenshot({ path: 'tests/audit/screenshots/placeholder-check.png', fullPage: true });
  });

  test('Step 3.3: API health endpoints', async ({ page }) => {
    // Test API health
    const healthResponse = await page.request.get('https://api.flamoral.com/health');
    expect(healthResponse.status()).toBe(200);
    const healthData = await healthResponse.json();
    console.log('API Health:', healthData);

    // Test API status
    const statusResponse = await page.request.get('https://api.flamoral.com/api/v1/status');
    expect(statusResponse.status()).toBe(200);
    const statusData = await statusResponse.json();
    console.log('API Status:', statusData);
  });

  test('Step 3.4: Check for real authentication endpoints', async ({ page }) => {
    // Try to access auth endpoints
    const loginResponse = await page.request.post('https://api.flamoral.com/api/v1/auth/login', {
      data: { email: 'test@test.com', password: 'test123' }
    });
    console.log('Login endpoint status:', loginResponse.status());
    console.log('Login response:', await loginResponse.text());

    // A real auth endpoint would return 401 or specific error, not generic welcome
  });

  test('Step 4: Verify all images and assets', async ({ page }) => {
    await page.goto('https://flamoral.com');

    // Get all images
    const images = await page.locator('img').all();
    console.log('Total <img> tags:', images.length);

    // Check for CSS background images
    const elementsWithBg = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const bgImages: string[] = [];
      elements.forEach(el => {
        const bg = window.getComputedStyle(el).backgroundImage;
        if (bg && bg !== 'none') {
          bgImages.push(bg);
        }
      });
      return bgImages;
    });
    console.log('CSS background images:', elementsWithBg.length);

    // Check for emoji usage (not real images)
    const pageContent = await page.content();
    const emojiCount = (pageContent.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
    console.log('Emoji characters used:', emojiCount);
  });

  test('Step 5: Check network requests for real API calls', async ({ page }) => {
    const apiCalls: string[] = [];

    page.on('request', request => {
      if (request.url().includes('api.flamoral.com') ||
          request.url().includes('/api/')) {
        apiCalls.push(`${request.method()} ${request.url()}`);
      }
    });

    await page.goto('https://flamoral.com');
    await page.waitForTimeout(3000); // Wait for any async calls

    console.log('API calls made by frontend:', apiCalls.length === 0 ? 'NONE' : apiCalls);
  });

  test('Step 6: SSL and security headers', async ({ page }) => {
    const response = await page.goto('https://flamoral.com');
    const headers = response?.headers();

    console.log('Security Headers:');
    console.log('  Strict-Transport-Security:', headers?.['strict-transport-security'] || 'MISSING');
    console.log('  X-Content-Type-Options:', headers?.['x-content-type-options'] || 'MISSING');
    console.log('  X-Frame-Options:', headers?.['x-frame-options'] || 'MISSING');
    console.log('  Content-Security-Policy:', headers?.['content-security-policy'] || 'MISSING');
  });
});
