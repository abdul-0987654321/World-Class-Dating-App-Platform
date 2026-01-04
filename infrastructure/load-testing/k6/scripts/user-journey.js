/**
 * Flamoral Dating Platform - User Journey Load Test
 *
 * This K6 script simulates the complete user journey including:
 * - User registration
 * - Profile creation and setup
 * - Profile browsing and discovery
 * - Matching operations
 * - User authentication flows
 *
 * Usage:
 *   k6 run --env BASE_URL=https://api.flamoral.com user-journey.js
 *   k6 run --env BASE_URL=https://api.flamoral.com --vus 100 --duration 30m user-journey.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// Custom metrics
const registrationSuccess = new Counter('registration_success');
const registrationFailure = new Counter('registration_failure');
const loginSuccess = new Counter('login_success');
const loginFailure = new Counter('login_failure');
const matchRequestSuccess = new Counter('match_request_success');
const profileViewDuration = new Trend('profile_view_duration');
const discoveryDuration = new Trend('discovery_duration');
const errorRate = new Rate('errors');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://api.flamoral.com';

// Test options with ramping VUs
export const options = {
  stages: [
    { duration: '2m', target: 50 },    // Ramp up to 50 users
    { duration: '5m', target: 50 },    // Stay at 50 users
    { duration: '3m', target: 100 },   // Ramp up to 100 users
    { duration: '10m', target: 100 },  // Stay at 100 users
    { duration: '5m', target: 200 },   // Ramp up to 200 users
    { duration: '10m', target: 200 },  // Stay at 200 users
    { duration: '3m', target: 50 },    // Ramp down to 50 users
    { duration: '2m', target: 0 },     // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000', 'p(99)<5000'],  // 95% of requests < 3s, 99% < 5s
    http_req_failed: ['rate<0.05'],                   // Error rate < 5%
    errors: ['rate<0.1'],                             // Overall error rate < 10%
    'registration_success': ['count>100'],            // At least 100 successful registrations
    'profile_view_duration': ['p(95)<2000'],          // Profile views < 2s at p95
    'discovery_duration': ['p(95)<2500'],             // Discovery < 2.5s at p95
  },
  // AWS-specific tags for CloudWatch integration
  tags: {
    environment: __ENV.ENVIRONMENT || 'load-test',
    service: 'user-service',
    test_name: 'user-journey',
  },
};

// Shared test data
const locations = [
  { city: 'New York', state: 'NY', country: 'US', lat: 40.7128, lng: -74.0060 },
  { city: 'Los Angeles', state: 'CA', country: 'US', lat: 34.0522, lng: -118.2437 },
  { city: 'Chicago', state: 'IL', country: 'US', lat: 41.8781, lng: -87.6298 },
  { city: 'Houston', state: 'TX', country: 'US', lat: 29.7604, lng: -95.3698 },
  { city: 'Miami', state: 'FL', country: 'US', lat: 25.7617, lng: -80.1918 },
  { city: 'Seattle', state: 'WA', country: 'US', lat: 47.6062, lng: -122.3321 },
];

const interests = [
  'travel', 'music', 'hiking', 'cooking', 'photography',
  'reading', 'fitness', 'movies', 'art', 'dancing',
  'yoga', 'gaming', 'wine', 'coffee', 'sports',
];

// Helper functions
function generateUser() {
  const gender = Math.random() > 0.5 ? 'male' : 'female';
  const location = locations[randomIntBetween(0, locations.length - 1)];
  const userInterests = [];
  const numInterests = randomIntBetween(3, 6);

  for (let i = 0; i < numInterests; i++) {
    const interest = interests[randomIntBetween(0, interests.length - 1)];
    if (!userInterests.includes(interest)) {
      userInterests.push(interest);
    }
  }

  return {
    email: `loadtest_${randomString(12)}@test.flamoral.com`,
    password: 'LoadTest123!@#',
    firstName: `Test${randomString(6)}`,
    lastName: `User${randomString(6)}`,
    dateOfBirth: `${randomIntBetween(1975, 2000)}-${String(randomIntBetween(1, 12)).padStart(2, '0')}-${String(randomIntBetween(1, 28)).padStart(2, '0')}`,
    gender: gender,
    genderPreference: gender === 'male' ? 'female' : 'male',
    location: location,
    interests: userInterests,
    bio: `This is a load test user profile. ${randomString(50)}`,
    lookingFor: ['relationship', 'dating', 'friendship'][randomIntBetween(0, 2)],
    ageRangeMin: randomIntBetween(18, 30),
    ageRangeMax: randomIntBetween(35, 55),
    maxDistance: randomIntBetween(10, 100),
  };
}

function getAuthHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-Request-ID': `k6-${randomString(16)}`,
  };
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Request-ID': `k6-${randomString(16)}`,
  };
}

// Setup function - runs once before tests
export function setup() {
  console.log(`Starting user journey load test against ${BASE_URL}`);

  // Verify API is accessible
  const healthRes = http.get(`${BASE_URL}/health`, { headers: getHeaders() });

  if (healthRes.status !== 200) {
    console.error('API health check failed. Aborting test.');
    return { healthy: false };
  }

  console.log('API health check passed');
  return { healthy: true, startTime: new Date().toISOString() };
}

// Main test function
export default function(data) {
  if (!data.healthy) {
    console.error('Skipping iteration due to unhealthy API');
    sleep(5);
    return;
  }

  const user = generateUser();
  let authToken = null;
  let userId = null;

  // User Registration Flow
  group('User Registration', function() {
    const registrationPayload = JSON.stringify({
      email: user.email,
      password: user.password,
      firstName: user.firstName,
      lastName: user.lastName,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      acceptedTerms: true,
      acceptedPrivacy: true,
    });

    const registerRes = http.post(
      `${BASE_URL}/api/v1/auth/register`,
      registrationPayload,
      { headers: getHeaders(), tags: { name: 'Registration' } }
    );

    const registerSuccess = check(registerRes, {
      'registration status is 201': (r) => r.status === 201,
      'registration returns user id': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data && body.data.userId;
        } catch {
          return false;
        }
      },
      'registration returns token': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data && body.data.accessToken;
        } catch {
          return false;
        }
      },
    });

    if (registerSuccess) {
      registrationSuccess.add(1);
      const body = JSON.parse(registerRes.body);
      authToken = body.data.accessToken;
      userId = body.data.userId;
    } else {
      registrationFailure.add(1);
      errorRate.add(1);
      console.log(`Registration failed: ${registerRes.status} - ${registerRes.body}`);
    }
  });

  // If registration failed, try login with existing test user
  if (!authToken) {
    group('User Login Fallback', function() {
      const loginPayload = JSON.stringify({
        email: 'loadtest@test.flamoral.com',
        password: 'LoadTest123!@#',
      });

      const loginRes = http.post(
        `${BASE_URL}/api/v1/auth/login`,
        loginPayload,
        { headers: getHeaders(), tags: { name: 'Login' } }
      );

      const loginSuccessful = check(loginRes, {
        'login status is 200': (r) => r.status === 200,
        'login returns token': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.data && body.data.accessToken;
          } catch {
            return false;
          }
        },
      });

      if (loginSuccessful) {
        loginSuccess.add(1);
        const body = JSON.parse(loginRes.body);
        authToken = body.data.accessToken;
        userId = body.data.userId;
      } else {
        loginFailure.add(1);
        errorRate.add(1);
      }
    });
  }

  // Skip remaining tests if no auth token
  if (!authToken) {
    sleep(randomIntBetween(2, 5));
    return;
  }

  sleep(randomIntBetween(1, 3));

  // Profile Setup
  group('Profile Setup', function() {
    const profilePayload = JSON.stringify({
      bio: user.bio,
      interests: user.interests,
      lookingFor: user.lookingFor,
      location: user.location,
      preferences: {
        ageRangeMin: user.ageRangeMin,
        ageRangeMax: user.ageRangeMax,
        maxDistance: user.maxDistance,
        genderPreference: user.genderPreference,
      },
    });

    const profileRes = http.put(
      `${BASE_URL}/api/v1/users/profile`,
      profilePayload,
      { headers: getAuthHeaders(authToken), tags: { name: 'ProfileUpdate' } }
    );

    check(profileRes, {
      'profile update status is 200': (r) => r.status === 200,
    });
  });

  sleep(randomIntBetween(1, 2));

  // Discovery - Browse Profiles
  group('Discovery - Browse Profiles', function() {
    const startTime = Date.now();

    const discoveryRes = http.get(
      `${BASE_URL}/api/v1/discovery/profiles?page=1&limit=20&lat=${user.location.lat}&lng=${user.location.lng}`,
      { headers: getAuthHeaders(authToken), tags: { name: 'Discovery' } }
    );

    const duration = Date.now() - startTime;
    discoveryDuration.add(duration);

    const discoverySuccess = check(discoveryRes, {
      'discovery status is 200': (r) => r.status === 200,
      'discovery returns profiles': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data && Array.isArray(body.data.profiles);
        } catch {
          return false;
        }
      },
    });

    if (!discoverySuccess) {
      errorRate.add(1);
    }

    // View individual profiles
    if (discoverySuccess) {
      try {
        const body = JSON.parse(discoveryRes.body);
        const profiles = body.data.profiles.slice(0, 3); // View first 3 profiles

        for (const profile of profiles) {
          const viewStartTime = Date.now();

          const profileRes = http.get(
            `${BASE_URL}/api/v1/users/${profile.id}`,
            { headers: getAuthHeaders(authToken), tags: { name: 'ProfileView' } }
          );

          const viewDuration = Date.now() - viewStartTime;
          profileViewDuration.add(viewDuration);

          check(profileRes, {
            'profile view status is 200': (r) => r.status === 200,
          });

          sleep(randomIntBetween(2, 5)); // Simulate reading profile
        }
      } catch (e) {
        console.log(`Error parsing discovery response: ${e}`);
      }
    }
  });

  sleep(randomIntBetween(1, 3));

  // Matching - Like/Pass on profiles
  group('Matching Operations', function() {
    // Get potential matches
    const matchesRes = http.get(
      `${BASE_URL}/api/v1/matching/suggestions?limit=10`,
      { headers: getAuthHeaders(authToken), tags: { name: 'MatchSuggestions' } }
    );

    check(matchesRes, {
      'match suggestions status is 200': (r) => r.status === 200,
    });

    try {
      const body = JSON.parse(matchesRes.body);
      const suggestions = body.data?.suggestions || [];

      for (const suggestion of suggestions.slice(0, 5)) {
        // Randomly like or pass
        const action = Math.random() > 0.3 ? 'like' : 'pass';

        const actionPayload = JSON.stringify({
          targetUserId: suggestion.userId,
          action: action,
        });

        const actionRes = http.post(
          `${BASE_URL}/api/v1/matching/swipe`,
          actionPayload,
          { headers: getAuthHeaders(authToken), tags: { name: `Swipe${action.charAt(0).toUpperCase() + action.slice(1)}` } }
        );

        const actionSuccess = check(actionRes, {
          'swipe action status is 200 or 201': (r) => r.status === 200 || r.status === 201,
        });

        if (actionSuccess && action === 'like') {
          matchRequestSuccess.add(1);
        }

        sleep(randomIntBetween(1, 3)); // Simulate decision time
      }
    } catch (e) {
      console.log(`Error in matching operations: ${e}`);
      errorRate.add(1);
    }
  });

  sleep(randomIntBetween(1, 2));

  // Check matches
  group('View Matches', function() {
    const matchesRes = http.get(
      `${BASE_URL}/api/v1/matching/matches`,
      { headers: getAuthHeaders(authToken), tags: { name: 'ViewMatches' } }
    );

    check(matchesRes, {
      'view matches status is 200': (r) => r.status === 200,
    });
  });

  sleep(randomIntBetween(2, 5));

  // Token Refresh
  group('Token Refresh', function() {
    const refreshRes = http.post(
      `${BASE_URL}/api/v1/auth/refresh`,
      null,
      { headers: getAuthHeaders(authToken), tags: { name: 'TokenRefresh' } }
    );

    check(refreshRes, {
      'token refresh status is 200': (r) => r.status === 200,
    });
  });

  // Final sleep between iterations
  sleep(randomIntBetween(3, 8));
}

// Teardown function - runs once after all tests
export function teardown(data) {
  console.log(`User journey load test completed`);
  console.log(`Started at: ${data.startTime}`);
  console.log(`Ended at: ${new Date().toISOString()}`);
}
