import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency', true);
const matchRequests = new Counter('match_requests');
const messageRequests = new Counter('message_requests');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Ramp up to 10 users
    { duration: '3m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 50 },   // Ramp down to 50
    { duration: '1m', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% under 500ms, 99% under 1s
    http_req_failed: ['rate<0.01'],                  // Error rate < 1%
    errors: ['rate<0.05'],                           // Custom error rate < 5%
    api_latency: ['p(95)<400'],                      // API latency p95 < 400ms
  },
  summaryTrendStats: ['min', 'max', 'med', 'avg', 'p(90)', 'p(95)', 'p(99)'],
};

const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:3000/api';

// Test data
const testUsers = [
  { email: 'loadtest1@example.com', password: 'LoadTest123!' },
  { email: 'loadtest2@example.com', password: 'LoadTest123!' },
  { email: 'loadtest3@example.com', password: 'LoadTest123!' },
];

// Helper function to get auth token
function getAuthToken() {
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify(user), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (loginRes.status === 200) {
    return JSON.parse(loginRes.body).token;
  }
  return null;
}

// Setup - runs once before all iterations
export function setup() {
  console.log('Setting up load test...');
  const token = getAuthToken();
  return { token };
}

// Main test function
export default function (data) {
  const token = data.token || getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  group('Discovery API', () => {
    // Get potential matches
    const discoverRes = http.get(`${BASE_URL}/discover`, { headers });
    const discoverLatency = discoverRes.timings.duration;
    apiLatency.add(discoverLatency);

    check(discoverRes, {
      'discover status is 200': (r) => r.status === 200,
      'discover response has profiles': (r) => {
        const body = JSON.parse(r.body);
        return body.profiles && body.profiles.length > 0;
      },
      'discover latency < 500ms': (r) => r.timings.duration < 500,
    }) || errorRate.add(1);

    sleep(1);

    // Like a profile
    const profileId = 'test-profile-id';
    const likeRes = http.post(
      `${BASE_URL}/matches/like`,
      JSON.stringify({ profileId }),
      { headers }
    );
    matchRequests.add(1);

    check(likeRes, {
      'like status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'like latency < 300ms': (r) => r.timings.duration < 300,
    }) || errorRate.add(1);

    sleep(0.5);
  });

  group('Messages API', () => {
    // Get conversations
    const conversationsRes = http.get(`${BASE_URL}/messages/conversations`, { headers });
    apiLatency.add(conversationsRes.timings.duration);

    check(conversationsRes, {
      'conversations status is 200': (r) => r.status === 200,
      'conversations latency < 400ms': (r) => r.timings.duration < 400,
    }) || errorRate.add(1);

    sleep(0.5);

    // Send a message
    const messageRes = http.post(
      `${BASE_URL}/messages`,
      JSON.stringify({
        conversationId: 'test-conversation-id',
        content: 'Load test message ' + Date.now(),
      }),
      { headers }
    );
    messageRequests.add(1);

    check(messageRes, {
      'send message status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'send message latency < 200ms': (r) => r.timings.duration < 200,
    }) || errorRate.add(1);

    sleep(0.5);
  });

  group('Profile API', () => {
    // Get own profile
    const profileRes = http.get(`${BASE_URL}/users/me`, { headers });
    apiLatency.add(profileRes.timings.duration);

    check(profileRes, {
      'profile status is 200': (r) => r.status === 200,
      'profile has user data': (r) => {
        const body = JSON.parse(r.body);
        return body.id && body.email;
      },
      'profile latency < 300ms': (r) => r.timings.duration < 300,
    }) || errorRate.add(1);

    sleep(0.5);
  });

  group('Search/Filter API', () => {
    // Search with filters
    const searchRes = http.post(
      `${BASE_URL}/discover/search`,
      JSON.stringify({
        ageRange: { min: 25, max: 35 },
        distance: 50,
        gender: ['female'],
      }),
      { headers }
    );
    apiLatency.add(searchRes.timings.duration);

    check(searchRes, {
      'search status is 200': (r) => r.status === 200,
      'search latency < 600ms': (r) => r.timings.duration < 600,
    }) || errorRate.add(1);

    sleep(1);
  });

  // Random think time between actions
  sleep(Math.random() * 2 + 1);
}

// Teardown - runs once after all iterations
export function teardown(data) {
  console.log('Load test completed.');
}

// Custom summary
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'results.json': JSON.stringify(data),
    'results.html': htmlReport(data),
  };
}

function textSummary(data, options) {
  return `
================================================================================
                              LOAD TEST SUMMARY
================================================================================

Total Requests: ${data.metrics.http_reqs.values.count}
Failed Requests: ${data.metrics.http_req_failed.values.passes}
Error Rate: ${(data.metrics.errors?.values?.rate * 100 || 0).toFixed(2)}%

Response Times:
  - Min: ${data.metrics.http_req_duration.values.min.toFixed(2)}ms
  - Avg: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
  - Med: ${data.metrics.http_req_duration.values.med.toFixed(2)}ms
  - P90: ${data.metrics.http_req_duration.values['p(90)'].toFixed(2)}ms
  - P95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
  - P99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms
  - Max: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms

Throughput: ${data.metrics.http_reqs.values.rate.toFixed(2)} req/s

Match Requests: ${data.metrics.match_requests?.values?.count || 0}
Message Requests: ${data.metrics.message_requests?.values?.count || 0}

================================================================================
`;
}

function htmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Load Test Results</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .metric { margin: 10px 0; padding: 10px; background: #f5f5f5; }
    .pass { color: green; }
    .fail { color: red; }
  </style>
</head>
<body>
  <h1>Load Test Results</h1>
  <div class="metric">
    <h3>Response Time (p95)</h3>
    <p class="${data.metrics.http_req_duration.values['p(95)'] < 500 ? 'pass' : 'fail'}">
      ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
    </p>
  </div>
  <div class="metric">
    <h3>Error Rate</h3>
    <p class="${(data.metrics.errors?.values?.rate || 0) < 0.05 ? 'pass' : 'fail'}">
      ${((data.metrics.errors?.values?.rate || 0) * 100).toFixed(2)}%
    </p>
  </div>
</body>
</html>
`;
}
