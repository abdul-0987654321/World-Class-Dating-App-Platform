import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:3000/api';

/**
 * Authenticate a user and return the access token
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {string|null} Access token or null if authentication fails
 */
export function authenticate(email, password) {
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      email,
      password,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const success = check(loginRes, {
    'authentication successful': (r) => r.status === 200,
  });

  if (success) {
    const body = JSON.parse(loginRes.body);
    return body.token || body.accessToken || body.access_token;
  }

  console.error(`Authentication failed for ${email}: ${loginRes.status}`);
  return null;
}

/**
 * Register a new test user
 * @param {Object} userData - User registration data
 * @returns {Object|null} Registration response data or null if registration fails
 */
export function registerUser(userData) {
  const registerRes = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify(userData),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const success = check(registerRes, {
    'registration successful': (r) => r.status === 200 || r.status === 201,
  });

  if (success) {
    return JSON.parse(registerRes.body);
  }

  console.error(`Registration failed: ${registerRes.status}`);
  return null;
}

/**
 * Create multiple test users for load testing
 * @param {number} count - Number of users to create
 * @param {string} prefix - Email prefix
 * @returns {Array} Array of user credentials
 */
export function createTestUsers(count, prefix = 'loadtest') {
  const users = [];
  const timestamp = Date.now();

  for (let i = 0; i < count; i++) {
    const userData = {
      email: `${prefix}${i}_${timestamp}@example.com`,
      password: 'TestPassword123!',
      name: `Test User ${i}`,
      dateOfBirth: '1990-01-01',
      gender: i % 2 === 0 ? 'male' : 'female',
    };

    const result = registerUser(userData);
    if (result) {
      users.push({
        email: userData.email,
        password: userData.password,
        token: result.token || result.accessToken,
      });
    }
  }

  return users;
}

/**
 * Get authorization headers with token
 * @param {string} token - Access token
 * @returns {Object} Headers object
 */
export function getAuthHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

/**
 * Refresh an access token
 * @param {string} refreshToken - Refresh token
 * @returns {string|null} New access token or null
 */
export function refreshAccessToken(refreshToken) {
  const refreshRes = http.post(
    `${BASE_URL}/auth/refresh`,
    JSON.stringify({ refreshToken }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const success = check(refreshRes, {
    'token refresh successful': (r) => r.status === 200,
  });

  if (success) {
    const body = JSON.parse(refreshRes.body);
    return body.token || body.accessToken;
  }

  return null;
}
