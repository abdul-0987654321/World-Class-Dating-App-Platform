import { test, expect } from '@playwright/test';

test('Production Site Audit', async ({ page }) => {
  const errors: string[] = [];
  const networkFailures: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  page.on('response', response => {
    if (response.status() >= 400) {
      networkFailures.push(`${response.status()} ${response.url()}`);
    }
  });

  // Navigate to production
  await page.goto('https://flamoral.com', { waitUntil: 'networkidle' });

  // Take screenshot
  await page.screenshot({ path: 'tests/audit/screenshots/flamoral-production.png', fullPage: true });

  // Output results
  console.log('=== CONSOLE ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'None');

  console.log('\n=== NETWORK FAILURES ===');
  console.log(networkFailures.length ? networkFailures.join('\n') : 'None');

  console.log('\n=== PAGE TITLE ===');
  console.log(await page.title());

  console.log('\n=== VISIBLE TEXT (first 500 chars) ===');
  const text = await page.locator('body').textContent();
  console.log(text?.substring(0, 500));
});
