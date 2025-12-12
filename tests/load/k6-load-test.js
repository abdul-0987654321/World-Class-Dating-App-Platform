import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');
const swipeDuration = new Trend('swipe_duration');
const messageDuration = new Trend('message_duration');
const apiCalls = new Counter('api_calls');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 50 }, // Ramp-up to 50 users
    { duration: '5m', target: 50 }, // Stay at 50 users
    { duration: '2m', target: 100 }, // Ramp-up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Spike to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '3m', target: 0 }, // Ramp-down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'], // Error rate under 1%
    errors: ['rate<0.05'], // Custom error rate under 5%
    login_duration: ['p(95)<1000'],
    swipe_duration: ['p(95)<300'],
    message_duration: ['p(95)<500'],
  },
  ext: {
    loadimpact: {
      projectID: 3595645,
      name: 'Flamoral Dating Platform Load Test',
    },
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000/api/v1';

// Test data
const users = [];
for (let i = 0; i < 100; i++) {
  users.push({
    email: `loadtest-${i}@flamoral.com`,
    password: 'LoadTest123!',
    token: null,
  });
}

// Setup function - runs once at the beginning
export function setup() {
  console.log('Setting up load test...');

  // Create test users and login
  const setupUsers = users.slice(0, 10); // Setup 10 users initially

  for (const user of setupUsers) {
    const registerRes = http.post(`${BASE_URL}/auth/register`, JSON.stringify({
      email: user.email,
      password: user.password,
      name: `Load Test User ${users.indexOf(user)}`,
      dateOfBirth: '1995-01-15',
      gender: 'male',
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

    if (registerRes.status === 201 || registerRes.status === 409) {
      // Login to get token
      const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
        email: user.email,
        password: user.password,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });

      if (loginRes.status === 200) {
        user.token = JSON.parse(loginRes.body).token;
      }
    }
  }

  return { users: setupUsers };
}

// Main test function
export default function (data) {
  const user = data.users[Math.floor(Math.random() * data.users.length)];

  if (!user.token) {
    console.log('Skipping user without token');
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${user.token}`,
  };

  // Test 1: Authentication Flow
  group('Authentication Flow', () => {
    const start = Date.now();

    const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
      email: user.email,
      password: user.password,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

    loginDuration.add(Date.now() - start);
    apiCalls.add(1);

    check(loginRes, {
      'login successful': (r) => r.status === 200,
      'login has token': (r) => JSON.parse(r.body).token !== undefined,
    }) || errorRate.add(1);
  });

  sleep(1);

  // Test 2: Profile Operations
  group('Profile Operations', () => {
    // Get user profile
    const profileRes = http.get(`${BASE_URL}/users/me`, { headers });
    apiCalls.add(1);

    check(profileRes, {
      'profile retrieved': (r) => r.status === 200,
    }) || errorRate.add(1);

    // Update profile
    const updateRes = http.put(`${BASE_URL}/users/me`, JSON.stringify({
      bio: 'Updated bio for load testing',
    }), { headers });
    apiCalls.add(1);

    check(updateRes, {
      'profile updated': (r) => r.status === 200,
    }) || errorRate.add(1);
  });

  sleep(1);

  // Test 3: Discovery & Swiping
  group('Discovery & Swiping', () => {
    // Get discovery profiles
    const start = Date.now();

    const discoverRes = http.get(`${BASE_URL}/matches/discover?limit=10`, { headers });
    apiCalls.add(1);

    check(discoverRes, {
      'discovery loaded': (r) => r.status === 200,
      'has profiles': (r) => JSON.parse(r.body).profiles !== undefined,
    }) || errorRate.add(1);

    // Simulate swiping
    for (let i = 0; i < 5; i++) {
      const swipeStart = Date.now();

      const swipeRes = http.post(`${BASE_URL}/matches/swipe`, JSON.stringify({
        targetUserId: `user-${Math.floor(Math.random() * 1000)}`,
        direction: Math.random() > 0.5 ? 'right' : 'left',
      }), { headers });

      swipeDuration.add(Date.now() - swipeStart);
      apiCalls.add(1);

      check(swipeRes, {
        'swipe processed': (r) => r.status === 200 || r.status === 201,
      }) || errorRate.add(1);

      sleep(0.5);
    }
  });

  sleep(2);

  // Test 4: Messaging
  group('Messaging', () => {
    // Get conversations
    const conversationsRes = http.get(`${BASE_URL}/messages/conversations`, { headers });
    apiCalls.add(1);

    check(conversationsRes, {
      'conversations loaded': (r) => r.status === 200,
    }) || errorRate.add(1);

    // Send message
    const messageStart = Date.now();

    const sendMessageRes = http.post(`${BASE_URL}/messages`, JSON.stringify({
      conversationId: `conv-${Math.floor(Math.random() * 100)}`,
      text: 'Load test message',
    }), { headers });

    messageDuration.add(Date.now() - messageStart);
    apiCalls.add(1);

    check(sendMessageRes, {
      'message sent': (r) => r.status === 200 || r.status === 201,
    }) || errorRate.add(1);

    // Get messages
    const messagesRes = http.get(
      `${BASE_URL}/messages?conversationId=conv-${Math.floor(Math.random() * 100)}`,
      { headers }
    );
    apiCalls.add(1);

    check(messagesRes, {
      'messages retrieved': (r) => r.status === 200,
    }) || errorRate.add(1);
  });

  sleep(2);

  // Test 5: Search & Filters
  group('Search & Filters', () => {
    const searchRes = http.post(`${BASE_URL}/matches/search`, JSON.stringify({
      filters: {
        ageMin: 25,
        ageMax: 35,
        distance: 50,
        interests: ['hiking', 'photography'],
      },
    }), { headers });
    apiCalls.add(1);

    check(searchRes, {
      'search completed': (r) => r.status === 200,
    }) || errorRate.add(1);
  });

  sleep(1);

  // Test 6: Real-time Features (WebSocket simulation)
  group('Real-time Features', () => {
    // Simulate WebSocket connection by polling
    const onlineStatusRes = http.get(`${BASE_URL}/users/online-status`, { headers });
    apiCalls.add(1);

    check(onlineStatusRes, {
      'online status retrieved': (r) => r.status === 200,
    }) || errorRate.add(1);
  });

  sleep(3);
}

// Teardown function - runs once at the end
export function teardown(data) {
  console.log('Tearing down load test...');
  console.log(`Total API calls: ${apiCalls.count}`);
}

// Handle summary for custom reporting
export function handleSummary(data) {
  return {
    'load-test-results.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;

  let summary = `
${indent}Load Test Summary
${indent}================

${indent}Total Requests: ${data.metrics.http_reqs.values.count}
${indent}Failed Requests: ${data.metrics.http_req_failed.values.rate * 100}%
${indent}Request Duration (avg): ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
${indent}Request Duration (p95): ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
${indent}Request Duration (p99): ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms

${indent}Custom Metrics:
${indent}  Login Duration (p95): ${data.metrics.login_duration.values['p(95)'].toFixed(2)}ms
${indent}  Swipe Duration (p95): ${data.metrics.swipe_duration.values['p(95)'].toFixed(2)}ms
${indent}  Message Duration (p95): ${data.metrics.message_duration.values['p(95)'].toFixed(2)}ms
${indent}  Error Rate: ${data.metrics.errors.values.rate * 100}%

${indent}Virtual Users: ${data.metrics.vus.values.value}
${indent}Virtual Users Max: ${data.metrics.vus_max.values.value}
`;

  return summary;
}
