import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { options, randomUser, think } from '../k6-config.js';

/**
 * Load Test: Authentication Service
 * Tests registration, login, token refresh, logout
 */

export { options };

// Custom metrics
const loginSuccessRate = new Rate('login_success_rate');
const registrationSuccessRate = new Rate('registration_success_rate');
const loginDuration = new Trend('login_duration');
const registrationDuration = new Trend('registration_duration');
const failedLogins = new Counter('failed_logins');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export function setup() {
  // Setup phase - create test data if needed
  console.log('Starting auth load test...');
  return {};
}

export default function () {
  let authToken;
  let refreshToken;
  let userId;

  group('User Registration', () => {
    const user = randomUser();
    const startTime = Date.now();

    const res = http.post(
      `${BASE_URL}/api/auth/register`,
      JSON.stringify(user),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'registration' },
      }
    );

    registrationDuration.add(Date.now() - startTime);

    const success = check(res, {
      'registration status is 201': (r) => r.status === 201,
      'registration has accessToken': (r) => {
        const body = JSON.parse(r.body);
        return body.accessToken !== undefined;
      },
      'registration has user data': (r) => {
        const body = JSON.parse(r.body);
        return body.user && body.user.email === user.email;
      },
    });

    registrationSuccessRate.add(success);

    if (success) {
      const body = JSON.parse(res.body);
      authToken = body.accessToken;
      refreshToken = body.refreshToken;
      userId = body.user.id;
    }

    think(1, 3);
  });

  group('User Login', () => {
    // Create a user first
    const user = randomUser();

    http.post(
      `${BASE_URL}/api/auth/register`,
      JSON.stringify(user),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    think(0.5, 1);

    // Now login
    const startTime = Date.now();

    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({
        email: user.email,
        password: user.password,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'login' },
      }
    );

    loginDuration.add(Date.now() - startTime);

    const success = check(res, {
      'login status is 200': (r) => r.status === 200,
      'login has accessToken': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.accessToken !== undefined;
        } catch {
          return false;
        }
      },
      'login response time < 500ms': (r) => r.timings.duration < 500,
    });

    loginSuccessRate.add(success);

    if (!success) {
      failedLogins.add(1);
    }

    if (success) {
      const body = JSON.parse(res.body);
      authToken = body.accessToken;
      refreshToken = body.refreshToken;
    }

    think(1, 2);
  });

  group('Token Refresh', () => {
    if (refreshToken) {
      const res = http.post(
        `${BASE_URL}/api/auth/refresh-token`,
        JSON.stringify({ refreshToken }),
        {
          headers: { 'Content-Type': 'application/json' },
          tags: { name: 'token_refresh' },
        }
      );

      check(res, {
        'refresh status is 200': (r) => r.status === 200,
        'refresh has new accessToken': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.accessToken !== undefined && body.accessToken !== authToken;
          } catch {
            return false;
          }
        },
      });

      if (res.status === 200) {
        const body = JSON.parse(res.body);
        authToken = body.accessToken;
      }

      think(0.5, 1);
    }
  });

  group('Get User Profile', () => {
    if (authToken) {
      const res = http.get(`${BASE_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        tags: { name: 'get_profile' },
      });

      check(res, {
        'get profile status is 200': (r) => r.status === 200,
        'get profile has user data': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.id !== undefined;
          } catch {
            return false;
          }
        },
      });

      think(1, 3);
    }
  });

  group('Concurrent Login Attempts', () => {
    // Simulate multiple login attempts (e.g., different devices)
    const user = randomUser();

    // Register user
    http.post(
      `${BASE_URL}/api/auth/register`,
      JSON.stringify(user),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    // Multiple concurrent logins
    const requests = http.batch([
      {
        method: 'POST',
        url: `${BASE_URL}/api/auth/login`,
        body: JSON.stringify({ email: user.email, password: user.password }),
        params: {
          headers: { 'Content-Type': 'application/json' },
          tags: { name: 'concurrent_login_1' },
        },
      },
      {
        method: 'POST',
        url: `${BASE_URL}/api/auth/login`,
        body: JSON.stringify({ email: user.email, password: user.password }),
        params: {
          headers: { 'Content-Type': 'application/json' },
          tags: { name: 'concurrent_login_2' },
        },
      },
    ]);

    check(requests, {
      'all concurrent logins successful': (responses) => {
        return responses.every((r) => r.status === 200);
      },
    });

    think(1, 2);
  });

  group('User Logout', () => {
    if (authToken && refreshToken) {
      const res = http.post(
        `${BASE_URL}/api/auth/logout`,
        JSON.stringify({ refreshToken }),
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          tags: { name: 'logout' },
        }
      );

      check(res, {
        'logout status is 200': (r) => r.status === 200,
      });

      think(0.5, 1);
    }
  });

  group('Invalid Login Attempts', () => {
    // Test rate limiting and error handling
    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'WrongPassword123!',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'invalid_login' },
      }
    );

    check(res, {
      'invalid login returns 401': (r) => r.status === 401,
      'invalid login has error message': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.error !== undefined;
        } catch {
          return false;
        }
      },
    });

    think(0.5, 1);
  });

  think(1, 3);
}

export function teardown(data) {
  console.log('Auth load test completed');
}
