import { test as base } from '@playwright/test';
import { Pool } from 'pg';

// Extend base test with custom fixtures
export const test = base.extend({
  // Database fixture
  db: async ({}, use) => {
    const pool = new Pool({
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      database: process.env.TEST_DB_NAME || 'flamoral_test',
      user: process.env.TEST_DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || 'postgres',
    });

    await use(pool);
    await pool.end();
  },

  // Authenticated user fixture
  authenticatedPage: async ({ page, db }, use) => {
    // Create test user
    const testUser = {
      email: `e2e_${Date.now()}@test.com`,
      password: 'TestPass123!',
      first_name: 'E2E',
      last_name: 'Test',
      date_of_birth: '1995-01-01',
      gender: 'male',
    };

    // Register user via API
    const response = await page.request.post('/api/auth/register', {
      data: testUser,
    });

    const { accessToken } = (await response.json()).data;

    // Set auth token in browser
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('accessToken', token);
    }, accessToken);

    await use(page);

    // Cleanup
    await db.query('DELETE FROM users WHERE email = $1', [testUser.email]);
  },
});

export { expect } from '@playwright/test';
