// k6 Load Testing Script for Dating App
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTimeTrend = new Trend('response_time');
const requestsPerSecond = new Counter('requests_per_second');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100 users
    { duration: '2m', target: 200 },   // Ramp up to 200 users
    { duration: '5m', target: 200 },   // Stay at 200 users
    { duration: '2m', target: 500 },   // Spike to 500 users
    { duration: '5m', target: 500 },   // Stay at 500 users
    { duration: '5m', target: 0 },     // Ramp down to 0
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],  // 95% under 500ms, 99% under 1s
    'http_req_failed': ['rate<0.01'],                   // Error rate under 1%
    'errors': ['rate<0.05'],                            // Custom error rate under 5%
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'https://api.flamoral.com';

// Test data
const testUsers = [
  { email: 'test1@example.com', password: 'TestPass123!' },
  { email: 'test2@example.com', password: 'TestPass123!' },
  { email: 'test3@example.com', password: 'TestPass123!' },
];

function getRandomUser() {
  return testUsers[Math.floor(Math.random() * testUsers.length)];
}

// Authenticate and get token
function authenticate() {
  const user = getRandomUser();
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: user.email,
    password: user.password,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(loginRes, {
    'login successful': (r) => r.status === 200,
    'token received': (r) => r.json('token') !== undefined,
  });

  return loginRes.json('token');
}

export default function() {
  let token = authenticate();

  if (!token) {
    errorRate.add(1);
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // Test 1: Get User Profile
  group('User Profile Operations', function() {
    const profileRes = http.get(`${BASE_URL}/users/me`, { headers });

    const profileCheck = check(profileRes, {
      'profile retrieved': (r) => r.status === 200,
      'profile has data': (r) => r.json('id') !== undefined,
      'response time < 500ms': (r) => r.timings.duration < 500,
    });

    errorRate.add(!profileCheck);
    responseTimeTrend.add(profileRes.timings.duration);
    requestsPerSecond.add(1);

    sleep(1);
  });

  // Test 2: Search/Browse Profiles
  group('Browse Profiles', function() {
    const searchRes = http.get(`${BASE_URL}/users/search?limit=20`, { headers });

    const searchCheck = check(searchRes, {
      'search successful': (r) => r.status === 200,
      'profiles returned': (r) => r.json('results').length > 0,
      'response time < 1000ms': (r) => r.timings.duration < 1000,
    });

    errorRate.add(!searchCheck);
    responseTimeTrend.add(searchRes.timings.duration);
    requestsPerSecond.add(1);

    sleep(2);
  });

  // Test 3: Get Matches
  group('Matching Operations', function() {
    const matchesRes = http.get(`${BASE_URL}/matching/recommendations`, { headers });

    const matchesCheck = check(matchesRes, {
      'matches retrieved': (r) => r.status === 200,
      'recommendations present': (r) => r.json('matches') !== undefined,
      'response time < 2000ms': (r) => r.timings.duration < 2000,
    });

    errorRate.add(!matchesCheck);
    responseTimeTrend.add(matchesRes.timings.duration);
    requestsPerSecond.add(1);

    sleep(1);
  });

  // Test 4: Like/Swipe Action
  group('Swipe Actions', function() {
    const targetUserId = Math.floor(Math.random() * 10000) + 1;
    const swipeRes = http.post(
      `${BASE_URL}/matching/swipe`,
      JSON.stringify({
        targetUserId: targetUserId,
        action: 'like',
      }),
      { headers }
    );

    const swipeCheck = check(swipeRes, {
      'swipe processed': (r) => r.status === 200 || r.status === 201,
      'response time < 500ms': (r) => r.timings.duration < 500,
    });

    errorRate.add(!swipeCheck);
    responseTimeTrend.add(swipeRes.timings.duration);
    requestsPerSecond.add(1);

    sleep(0.5);
  });

  // Test 5: Get Messages
  group('Messaging Operations', function() {
    const messagesRes = http.get(`${BASE_URL}/messages?limit=50`, { headers });

    const messagesCheck = check(messagesRes, {
      'messages retrieved': (r) => r.status === 200,
      'response time < 1000ms': (r) => r.timings.duration < 1000,
    });

    errorRate.add(!messagesCheck);
    responseTimeTrend.add(messagesRes.timings.duration);
    requestsPerSecond.add(1);

    sleep(2);
  });

  // Test 6: Upload Media (Simulation)
  group('Media Operations', function() {
    const mediaRes = http.get(`${BASE_URL}/media/my-photos`, { headers });

    const mediaCheck = check(mediaRes, {
      'media list retrieved': (r) => r.status === 200,
      'response time < 800ms': (r) => r.timings.duration < 800,
    });

    errorRate.add(!mediaCheck);
    responseTimeTrend.add(mediaRes.timings.duration);
    requestsPerSecond.add(1);

    sleep(1);
  });

  // Test 7: Get Notifications
  group('Notification Operations', function() {
    const notifRes = http.get(`${BASE_URL}/notifications?unread=true`, { headers });

    const notifCheck = check(notifRes, {
      'notifications retrieved': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
    });

    errorRate.add(!notifCheck);
    responseTimeTrend.add(notifRes.timings.duration);
    requestsPerSecond.add(1);

    sleep(3);
  });
}

export function handleSummary(data) {
  return {
    'performance-summary.json': JSON.stringify(data, null, 2),
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const { indent = '', enableColors = false } = options;

  let summary = `\n${indent}Performance Test Summary\n`;
  summary += `${indent}${'='.repeat(50)}\n\n`;

  summary += `${indent}Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `${indent}Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)} req/s\n`;
  summary += `${indent}Failed Requests: ${data.metrics.http_req_failed.values.rate * 100}%\n\n`;

  summary += `${indent}Response Times:\n`;
  summary += `${indent}  Average: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `${indent}  Median: ${data.metrics.http_req_duration.values.med.toFixed(2)}ms\n`;
  summary += `${indent}  p95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `${indent}  p99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n`;
  summary += `${indent}  Max: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms\n\n`;

  summary += `${indent}Virtual Users: ${data.metrics.vus.values.value}\n`;
  summary += `${indent}Test Duration: ${(data.state.testRunDurationMs / 1000 / 60).toFixed(2)} minutes\n`;

  return summary;
}
