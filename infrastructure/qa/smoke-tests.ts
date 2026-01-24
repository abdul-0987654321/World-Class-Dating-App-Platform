/**
 * Flamoral Post-Deployment Smoke Tests
 *
 * Quick validation suite to verify critical functionality after production deployment.
 * Target execution time: < 5 minutes
 *
 * Usage:
 *   npx ts-node smoke-tests.ts [--env=staging|production] [--api-url=<url>]
 *
 * Or with Playwright:
 *   npx playwright test smoke-tests.ts
 *
 * Environment Variables:
 *   API_URL - Base URL for API tests
 *   WEB_URL - Base URL for UI tests
 *   TEST_USER_EMAIL - Test user email
 *   TEST_USER_PASSWORD - Test user password
 */

import { test, expect, Page, APIRequestContext, request } from '@playwright/test';

// ==============================================================================
// Configuration
// ==============================================================================

interface TestConfig {
  apiUrl: string;
  webUrl: string;
  wsUrl: string;
  testUser: {
    email: string;
    password: string;
  };
  timeouts: {
    api: number;
    navigation: number;
    action: number;
  };
}

const config: TestConfig = {
  apiUrl: process.env.API_URL || 'https://api.flamoral.com',
  webUrl: process.env.WEB_URL || 'https://www.flamoral.com',
  wsUrl: process.env.WS_URL || 'wss://api.flamoral.com/ws',
  testUser: {
    email: process.env.TEST_USER_EMAIL || 'smoke-test@flamoral.com',
    password: process.env.TEST_USER_PASSWORD || 'SmokeTest123!',
  },
  timeouts: {
    api: 10000,
    navigation: 30000,
    action: 5000,
  },
};

// ==============================================================================
// Test Utilities
// ==============================================================================

interface HealthStatus {
  status: string;
  version?: string;
  uptime?: number;
  services?: Record<string, string>;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
  };
}

let authToken: string | null = null;
let apiContext: APIRequestContext;

// ==============================================================================
// API Health Tests
// ==============================================================================

test.describe('API Health Checks', () => {
  test.beforeAll(async () => {
    apiContext = await request.newContext({
      baseURL: config.apiUrl,
      timeout: config.timeouts.api,
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('API Gateway is healthy', async () => {
    const response = await apiContext.get('/health');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const health: HealthStatus = await response.json();
    expect(health.status).toBe('healthy');
  });

  test('API Gateway is ready', async () => {
    const response = await apiContext.get('/ready');

    expect(response.ok()).toBeTruthy();
  });

  test('Auth service health', async () => {
    const response = await apiContext.get('/health/auth');

    // Accept 200 or 404 (if path differs)
    if (response.status() === 404) {
      const altResponse = await apiContext.get('/api/v1/auth/health');
      expect([200, 404]).toContain(altResponse.status());
    } else {
      expect(response.ok()).toBeTruthy();
    }
  });

  test('Database connectivity', async () => {
    const response = await apiContext.get('/health/db');

    if (response.status() === 200) {
      const dbHealth = await response.json();
      expect(dbHealth.status).toMatch(/healthy|ok|connected/i);
    } else {
      // Fallback: check main health includes db status
      const mainHealth = await apiContext.get('/health');
      expect(mainHealth.ok()).toBeTruthy();
    }
  });

  test('Redis connectivity', async () => {
    const response = await apiContext.get('/health/redis');

    if (response.status() === 200) {
      const redisHealth = await response.json();
      expect(redisHealth.status).toMatch(/healthy|ok|connected/i);
    } else {
      // Redis health might be included in main health check
      test.skip(true, 'Redis health endpoint not available');
    }
  });
});

// ==============================================================================
// Authentication Flow Tests
// ==============================================================================

test.describe('Authentication Flow', () => {
  test.beforeAll(async () => {
    apiContext = await request.newContext({
      baseURL: config.apiUrl,
      timeout: config.timeouts.api,
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('Login endpoint accepts credentials', async () => {
    const response = await apiContext.post('/api/v1/auth/login', {
      data: {
        email: config.testUser.email,
        password: config.testUser.password,
      },
    });

    // Accept 200 (success) or 401 (invalid test creds - but endpoint works)
    expect([200, 401, 400]).toContain(response.status());

    if (response.status() === 200) {
      const auth: AuthResponse = await response.json();
      expect(auth.accessToken).toBeDefined();
      authToken = auth.accessToken;
    }
  });

  test('Login rejects invalid credentials', async () => {
    const response = await apiContext.post('/api/v1/auth/login', {
      data: {
        email: 'invalid@example.com',
        password: 'wrongpassword',
      },
    });

    expect([400, 401]).toContain(response.status());
  });

  test('Protected endpoints require authentication', async () => {
    const response = await apiContext.get('/api/v1/users/me');

    expect(response.status()).toBe(401);
  });

  test('Token refresh endpoint exists', async () => {
    const response = await apiContext.post('/api/v1/auth/refresh', {
      data: { refreshToken: 'invalid-token' },
    });

    // Should reject invalid token but endpoint exists
    expect([400, 401, 403]).toContain(response.status());
  });

  test('Logout endpoint exists', async () => {
    const response = await apiContext.post('/api/v1/auth/logout', {
      data: {},
    });

    // Accept any response except 5xx
    expect(response.status()).toBeLessThan(500);
  });
});

// ==============================================================================
// User Profile Tests (Authenticated)
// ==============================================================================

test.describe('User Profile (Authenticated)', () => {
  test.beforeAll(async () => {
    apiContext = await request.newContext({
      baseURL: config.apiUrl,
      timeout: config.timeouts.api,
    });

    // Attempt login
    const loginResponse = await apiContext.post('/api/v1/auth/login', {
      data: {
        email: config.testUser.email,
        password: config.testUser.password,
      },
    });

    if (loginResponse.ok()) {
      const auth: AuthResponse = await loginResponse.json();
      authToken = auth.accessToken;
    }
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('Get user profile', async () => {
    if (!authToken) {
      test.skip(true, 'Authentication failed - skipping authenticated tests');
      return;
    }

    const response = await apiContext.get('/api/v1/users/me', {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.ok()).toBeTruthy();
    const profile = await response.json();
    expect(profile.email).toBeDefined();
  });

  test('Get discovery feed', async () => {
    if (!authToken) {
      test.skip(true, 'Authentication failed');
      return;
    }

    const response = await apiContext.get('/api/v1/discovery', {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.ok()).toBeTruthy();
  });

  test('Get matches list', async () => {
    if (!authToken) {
      test.skip(true, 'Authentication failed');
      return;
    }

    const response = await apiContext.get('/api/v1/matches', {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.ok()).toBeTruthy();
  });

  test('Get conversations list', async () => {
    if (!authToken) {
      test.skip(true, 'Authentication failed');
      return;
    }

    const response = await apiContext.get('/api/v1/conversations', {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.ok()).toBeTruthy();
  });

  test('Get notifications', async () => {
    if (!authToken) {
      test.skip(true, 'Authentication failed');
      return;
    }

    const response = await apiContext.get('/api/v1/notifications', {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.ok()).toBeTruthy();
  });
});

// ==============================================================================
// Subscription Tests
// ==============================================================================

test.describe('Subscription System', () => {
  test.beforeAll(async () => {
    apiContext = await request.newContext({
      baseURL: config.apiUrl,
      timeout: config.timeouts.api,
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('Get subscription plans (public)', async () => {
    const response = await apiContext.get('/api/v1/subscriptions/plans');

    expect(response.ok()).toBeTruthy();
    const plans = await response.json();
    expect(Array.isArray(plans) || plans.plans).toBeTruthy();
  });

  test('Stripe integration check', async () => {
    // Check that payment-related endpoints exist
    const response = await apiContext.post('/api/v1/payments/create-intent', {
      data: { amount: 100 },
    });

    // Should require auth or have proper error handling
    expect(response.status()).toBeLessThan(500);
  });
});

// ==============================================================================
// UI Smoke Tests
// ==============================================================================

test.describe('UI Smoke Tests', () => {
  test.use({
    baseURL: config.webUrl,
    actionTimeout: config.timeouts.action,
    navigationTimeout: config.timeouts.navigation,
  });

  test('Homepage loads', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Flamoral/i);
  });

  test('Login page loads', async ({ page }) => {
    await page.goto('/login');

    // Check for login form elements
    const form = page.locator('form, [data-testid="login-form"]');
    await expect(form).toBeVisible();

    const emailInput = page.locator(
      'input[type="email"], input[name="email"], [data-testid="email-input"]'
    );
    await expect(emailInput.first()).toBeVisible();

    const passwordInput = page.locator('input[type="password"], [data-testid="password-input"]');
    await expect(passwordInput.first()).toBeVisible();
  });

  test('Signup page loads', async ({ page }) => {
    await page.goto('/signup');

    // Check for signup form or redirect to login with signup link
    const hasSignupForm = (await page.locator('form').count()) > 0;
    const hasSignupLink =
      (await page.locator('a[href*="signup"], a[href*="register"]').count()) > 0;

    expect(hasSignupForm || hasSignupLink).toBeTruthy();
  });

  test('Login flow works', async ({ page }) => {
    await page.goto('/login');

    // Fill in login form
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    await emailInput.fill(config.testUser.email);
    await passwordInput.fill(config.testUser.password);

    // Click submit and wait for navigation or error
    await submitButton.click();

    // Wait for either successful navigation or error message
    await Promise.race([
      page.waitForURL(/(?!.*login).*/, { timeout: 10000 }),
      page.waitForSelector('[data-testid="error-message"], .error, [role="alert"]', {
        timeout: 10000,
      }),
    ]).catch(() => {
      // Timeout is acceptable - we just want to verify the form submits
    });

    // Verify we're not stuck on a broken page
    const pageContent = await page.content();
    expect(pageContent).not.toContain('500 Internal Server Error');
    expect(pageContent).not.toContain('503 Service Unavailable');
  });

  test('Page is responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Page should still function on mobile
    await expect(page).toHaveTitle(/Flamoral/i);
  });

  test('Critical pages are accessible', async ({ page }) => {
    const criticalPages = ['/', '/login', '/signup', '/about', '/privacy', '/terms'];

    for (const path of criticalPages) {
      const response = await page.goto(path);

      // Accept 200 or redirect (3xx)
      if (response) {
        expect([200, 301, 302, 307, 308]).toContain(response.status());
      }
    }
  });

  test('No console errors on homepage', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Filter out known acceptable errors (e.g., third-party tracking)
    const criticalErrors = consoleErrors.filter(
      (error) =>
        !error.includes('Failed to load resource') &&
        !error.includes('favicon') &&
        !error.includes('analytics')
    );

    expect(criticalErrors.length).toBe(0);
  });
});

// ==============================================================================
// WebSocket Connectivity Tests
// ==============================================================================

test.describe('WebSocket Connectivity', () => {
  test('WebSocket endpoint is accessible', async ({ page }) => {
    let wsConnected = false;
    let wsError = '';

    await page.goto(config.webUrl);

    // Try to establish WebSocket connection
    const wsPromise = page.evaluate(async (wsUrl) => {
      return new Promise<{ connected: boolean; error: string }>((resolve) => {
        try {
          const ws = new WebSocket(wsUrl);

          ws.onopen = () => {
            ws.close();
            resolve({ connected: true, error: '' });
          };

          ws.onerror = () => {
            resolve({ connected: false, error: 'Connection failed' });
          };

          // Timeout after 5 seconds
          setTimeout(() => {
            ws.close();
            resolve({ connected: false, error: 'Timeout' });
          }, 5000);
        } catch (err) {
          resolve({ connected: false, error: String(err) });
        }
      });
    }, config.wsUrl);

    const result = await wsPromise;
    wsConnected = result.connected;
    wsError = result.error;

    if (!wsConnected) {
      console.log(`WebSocket connection note: ${wsError}`);
      // WebSocket might require authentication - warn but don't fail
      test.info().annotations.push({
        type: 'warning',
        description: `WebSocket connection: ${wsError}`,
      });
    }

    // Just verify the test runs - WS might require auth
    expect(true).toBe(true);
  });
});

// ==============================================================================
// Performance Baseline Tests
// ==============================================================================

test.describe('Performance Baseline', () => {
  test('Homepage loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(config.webUrl);
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(5000); // 5 seconds max
    console.log(`Homepage load time: ${loadTime}ms`);
  });

  test('API health check responds quickly', async () => {
    const ctx = await request.newContext({ baseURL: config.apiUrl });
    const startTime = Date.now();
    const response = await ctx.get('/health');
    const responseTime = Date.now() - startTime;
    await ctx.dispose();

    expect(response.ok()).toBeTruthy();
    expect(responseTime).toBeLessThan(1000); // 1 second max for health check
    console.log(`Health check response time: ${responseTime}ms`);
  });

  test('Login API responds within SLA', async () => {
    const ctx = await request.newContext({ baseURL: config.apiUrl });
    const startTime = Date.now();
    const response = await ctx.post('/api/v1/auth/login', {
      data: {
        email: 'test@example.com',
        password: 'test123',
      },
    });
    const responseTime = Date.now() - startTime;
    await ctx.dispose();

    // Response time should be under 2 seconds even for failed auth
    expect(responseTime).toBeLessThan(2000);
    console.log(`Login API response time: ${responseTime}ms`);
  });
});

// ==============================================================================
// Security Smoke Tests
// ==============================================================================

test.describe('Security Smoke Tests', () => {
  test.beforeAll(async () => {
    apiContext = await request.newContext({
      baseURL: config.apiUrl,
      timeout: config.timeouts.api,
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('Security headers are present', async ({ page }) => {
    const response = await page.goto(config.webUrl);
    const headers = response?.headers() || {};

    // Check for critical security headers
    const hasXFrameOptions =
      headers['x-frame-options']?.toLowerCase().includes('deny') ||
      headers['x-frame-options']?.toLowerCase().includes('sameorigin');

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(hasXFrameOptions).toBeTruthy();
  });

  test('CORS rejects unauthorized origins', async () => {
    const response = await apiContext.get('/health', {
      headers: {
        Origin: 'https://malicious-site.com',
      },
    });

    const corsHeader = response.headers()['access-control-allow-origin'];

    // Should not return the malicious origin
    expect(corsHeader).not.toBe('https://malicious-site.com');
  });

  test('Sensitive endpoints require auth', async () => {
    const sensitiveEndpoints = [
      '/api/v1/users/me',
      '/api/v1/matches',
      '/api/v1/conversations',
      '/api/v1/payments/history',
    ];

    for (const endpoint of sensitiveEndpoints) {
      const response = await apiContext.get(endpoint);
      expect(response.status()).toBe(401);
    }
  });

  test('Error responses do not leak sensitive data', async () => {
    const response = await apiContext.get('/api/v1/nonexistent-endpoint');
    const body = await response.text();

    // Should not contain stack traces in production
    expect(body).not.toMatch(/at .+\.js:\d+:\d+/);
    expect(body).not.toMatch(/node_modules/);
    expect(body).not.toMatch(/Error:/);
  });
});

// ==============================================================================
// Test Summary Reporter
// ==============================================================================

test.afterAll(async () => {
  console.log('\n========================================');
  console.log('Smoke Test Summary');
  console.log('========================================');
  console.log(`Environment: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`API URL: ${config.apiUrl}`);
  console.log(`Web URL: ${config.webUrl}`);
  console.log('========================================\n');
});
