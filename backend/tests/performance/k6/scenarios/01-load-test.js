import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { authenticate, getAuthHeaders } from '../utils/auth.js';
import { generateMessage, generateSearchFilters, generateUserBehavior } from '../utils/data-generator.js';
import {
  errorRate, apiLatency, discoveryLatency, matchingLatency, messagingLatency,
  profileLatency, discoveryRequests, matchRequests, messageRequests,
  createThresholds, recordSuccess, recordFailure
} from '../utils/metrics.js';
import { BASE_URL, getEndpoint, parseEnvConfig } from '../utils/config.js';

/**
 * LOAD TEST - Normal Traffic Scenario
 *
 * Purpose: Simulate typical production load with 1000 concurrent users
 * Duration: 30 minutes
 * Ramp-up: Gradual increase to avoid startup spikes
 *
 * Simulates realistic user behavior:
 * - Browse profiles (discovery)
 * - Like/pass on profiles
 * - Send messages
 * - View matches
 * - Update profile
 */

export const options = {
  scenarios: {
    normal_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },   // Ramp up to 100 users
        { duration: '3m', target: 500 },   // Ramp up to 500 users
        { duration: '5m', target: 1000 },  // Ramp up to 1000 users
        { duration: '15m', target: 1000 }, // Maintain 1000 users
        { duration: '3m', target: 500 },   // Ramp down to 500
        { duration: '2m', target: 0 },     // Ramp down to 0
      ],
      gracefulRampDown: '30s',
    },
  },

  thresholds: createThresholds({
    // Load test specific thresholds
    'http_req_duration': ['p(95)<200', 'p(99)<500', 'avg<150'],
    'http_req_failed': ['rate<0.01'], // Less than 1% error rate
    'errors': ['rate<0.01'],

    // Endpoint specific
    'discovery_latency': ['p(95)<250', 'p(99)<500'],
    'matching_latency': ['p(95)<150', 'p(99)<300'],
    'messaging_latency': ['p(95)<100', 'p(99)<200'],
    'profile_latency': ['p(95)<150', 'p(99)<300'],
  }),

  summaryTrendStats: ['min', 'max', 'med', 'avg', 'p(90)', 'p(95)', 'p(99)'],

  // Output configuration
  ext: {
    loadimpact: {
      projectID: __ENV.K6_PROJECT_ID,
      name: 'Flamoral Load Test - Normal Traffic',
    },
  },
};

const config = parseEnvConfig();

// Setup function - runs once before test
export function setup() {
  console.log('=== Load Test Setup ===');
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`Test duration: 30 minutes`);
  console.log(`Peak VUs: 1000`);

  // Authenticate test user
  const token = authenticate(config.testEmail, config.testPassword);

  if (!token) {
    console.error('Setup failed: Could not authenticate test user');
    return null;
  }

  console.log('Setup completed successfully');
  return { token };
}

// Main test function
export default function(data) {
  if (!data || !data.token) {
    console.error('No auth token available');
    return;
  }

  const headers = getAuthHeaders(data.token);
  const behavior = generateUserBehavior();

  // Simulate realistic user session with weighted actions
  group('User Session', () => {

    // 1. Discovery/Browse Profiles (most common action - 50% probability)
    if (behavior.action === 'browse_profiles' || Math.random() < 0.5) {
      group('Discovery', () => {
        const discoverRes = http.get(`${BASE_URL}/discover`, { headers });
        discoveryRequests.add(1);

        const success = check(discoverRes, {
          'discovery status is 200': (r) => r.status === 200,
          'discovery has profiles': (r) => {
            try {
              const body = JSON.parse(r.body);
              return body.profiles && body.profiles.length > 0;
            } catch {
              return false;
            }
          },
          'discovery response time OK': (r) => r.timings.duration < 500,
        });

        if (success) {
          recordSuccess(discoverRes, discoveryLatency);

          // User views profiles and makes decisions
          const profiles = JSON.parse(discoverRes.body).profiles || [];
          const profilesToSwipe = Math.min(profiles.length, 5);

          for (let i = 0; i < profilesToSwipe; i++) {
            const profile = profiles[i];
            const action = Math.random() < 0.3 ? 'like' : 'pass'; // 30% like rate

            sleep(Math.random() * 2 + 1); // 1-3s thinking time

            const swipeRes = http.post(
              `${BASE_URL}/matches/${action}`,
              JSON.stringify({ profileId: profile.id }),
              { headers }
            );

            matchRequests.add(1);

            check(swipeRes, {
              [`${action} status OK`]: (r) => r.status === 200 || r.status === 201,
              [`${action} response time OK`]: (r) => r.timings.duration < 300,
            }) ? recordSuccess(swipeRes, matchingLatency) : recordFailure(swipeRes, matchingLatency);

            sleep(0.5);
          }
        } else {
          recordFailure(discoverRes, discoveryLatency);
        }
      });
    }

    // 2. Messaging (20% probability)
    if (behavior.action === 'send_message' || Math.random() < 0.2) {
      group('Messaging', () => {
        // Get conversations
        const conversationsRes = http.get(`${BASE_URL}/messages/conversations`, { headers });

        const convSuccess = check(conversationsRes, {
          'conversations status is 200': (r) => r.status === 200,
          'conversations response time OK': (r) => r.timings.duration < 400,
        });

        if (convSuccess) {
          recordSuccess(conversationsRes, messagingLatency);

          const conversations = JSON.parse(conversationsRes.body).conversations || [];

          if (conversations.length > 0) {
            // Send message to random conversation
            const conversation = conversations[Math.floor(Math.random() * conversations.length)];

            sleep(Math.random() * 3 + 2); // 2-5s composing time

            const messageRes = http.post(
              `${BASE_URL}/messages`,
              JSON.stringify({
                conversationId: conversation.id,
                content: generateMessage(),
              }),
              { headers }
            );

            messageRequests.add(1);

            check(messageRes, {
              'send message status OK': (r) => r.status === 200 || r.status === 201,
              'send message response time OK': (r) => r.timings.duration < 200,
            }) ? recordSuccess(messageRes, messagingLatency) : recordFailure(messageRes, messagingLatency);
          }
        } else {
          recordFailure(conversationsRes, messagingLatency);
        }
      });
    }

    // 3. View Matches (15% probability)
    if (behavior.action === 'view_matches' || Math.random() < 0.15) {
      group('View Matches', () => {
        const matchesRes = http.get(`${BASE_URL}/matches`, { headers });

        check(matchesRes, {
          'matches status is 200': (r) => r.status === 200,
          'matches response time OK': (r) => r.timings.duration < 300,
        }) ? recordSuccess(matchesRes, apiLatency) : recordFailure(matchesRes, apiLatency);

        sleep(Math.random() * 2 + 1);
      });
    }

    // 4. Profile Management (5% probability)
    if (behavior.action === 'edit_profile' || Math.random() < 0.05) {
      group('Profile', () => {
        // View own profile
        const profileRes = http.get(`${BASE_URL}/users/me`, { headers });

        check(profileRes, {
          'profile status is 200': (r) => r.status === 200,
          'profile response time OK': (r) => r.timings.duration < 300,
        }) ? recordSuccess(profileRes, profileLatency) : recordFailure(profileRes, profileLatency);

        sleep(1);
      });
    }

    // 5. Search with Filters (10% probability)
    if (Math.random() < 0.1) {
      group('Advanced Search', () => {
        const filters = generateSearchFilters();
        const searchRes = http.post(
          `${BASE_URL}/discover/search`,
          JSON.stringify(filters),
          { headers }
        );

        check(searchRes, {
          'search status is 200': (r) => r.status === 200,
          'search response time OK': (r) => r.timings.duration < 600,
        }) ? recordSuccess(searchRes, discoveryLatency) : recordFailure(searchRes, discoveryLatency);

        sleep(Math.random() * 2 + 1);
      });
    }
  });

  // Realistic think time between user sessions
  sleep(behavior.thinkTime);
}

// Teardown function - runs once after test
export function teardown(data) {
  console.log('=== Load Test Completed ===');
}

// Custom summary handler
export function handleSummary(data) {
  const timestamp = new Date().toISOString();

  return {
    'stdout': textSummary(data),
    [`results/load-test-${timestamp}.json`]: JSON.stringify(data, null, 2),
    [`results/load-test-summary-${timestamp}.html`]: htmlReport(data),
  };
}

function textSummary(data) {
  const httpReqs = data.metrics.http_reqs?.values?.count || 0;
  const httpFailed = data.metrics.http_req_failed?.values?.rate || 0;
  const errorRateVal = data.metrics.errors?.values?.rate || 0;
  const avgDuration = data.metrics.http_req_duration?.values?.avg || 0;
  const p95Duration = data.metrics.http_req_duration?.values?.['p(95)'] || 0;
  const p99Duration = data.metrics.http_req_duration?.values?.['p(99)'] || 0;

  return `
╔═══════════════════════════════════════════════════════════════════════════╗
║                    FLAMORAL LOAD TEST RESULTS                             ║
║                        Normal Traffic Scenario                            ║
╚═══════════════════════════════════════════════════════════════════════════╝

📊 OVERALL METRICS
─────────────────────────────────────────────────────────────────────────────
Total Requests:           ${httpReqs.toLocaleString()}
Failed Requests:          ${(httpFailed * 100).toFixed(2)}%
Custom Error Rate:        ${(errorRateVal * 100).toFixed(2)}%
Throughput:              ${(data.metrics.http_reqs?.values?.rate || 0).toFixed(2)} req/s

⏱️  RESPONSE TIMES
─────────────────────────────────────────────────────────────────────────────
Average:                 ${avgDuration.toFixed(2)}ms
Median:                  ${(data.metrics.http_req_duration?.values?.med || 0).toFixed(2)}ms
P90:                     ${(data.metrics.http_req_duration?.values?.['p(90)'] || 0).toFixed(2)}ms
P95:                     ${p95Duration.toFixed(2)}ms  ${p95Duration < 200 ? '✅' : '❌'}
P99:                     ${p99Duration.toFixed(2)}ms  ${p99Duration < 500 ? '✅' : '❌'}

🎯 ENDPOINT PERFORMANCE
─────────────────────────────────────────────────────────────────────────────
Discovery:               ${data.metrics.discovery_requests?.values?.count || 0} requests
  P95: ${(data.metrics.discovery_latency?.values?.['p(95)'] || 0).toFixed(2)}ms

Matching:                ${data.metrics.match_requests?.values?.count || 0} requests
  P95: ${(data.metrics.matching_latency?.values?.['p(95)'] || 0).toFixed(2)}ms

Messaging:               ${data.metrics.message_requests?.values?.count || 0} requests
  P95: ${(data.metrics.messaging_latency?.values?.['p(95)'] || 0).toFixed(2)}ms

✅ SLO COMPLIANCE
─────────────────────────────────────────────────────────────────────────────
Availability:            ${((1 - httpFailed) * 100).toFixed(3)}%  ${(1 - httpFailed) * 100 >= 99.9 ? '✅' : '❌'}
Error Rate < 1%:         ${errorRateVal < 0.01 ? '✅' : '❌'}
P95 < 200ms:             ${p95Duration < 200 ? '✅' : '❌'}
P99 < 500ms:             ${p99Duration < 500 ? '✅' : '❌'}

═══════════════════════════════════════════════════════════════════════════
`;
}

function htmlReport(data) {
  const passed = (
    (data.metrics.http_req_failed?.values?.rate || 0) < 0.01 &&
    (data.metrics.http_req_duration?.values?.['p(95)'] || 0) < 200 &&
    (data.metrics.http_req_duration?.values?.['p(99)'] || 0) < 500
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Load Test Results - Flamoral Dating Platform</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      color: #333;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    .header {
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      margin-bottom: 20px;
      text-align: center;
    }
    .status-badge {
      display: inline-block;
      padding: 10px 20px;
      border-radius: 20px;
      font-weight: bold;
      margin-top: 10px;
    }
    .pass { background: #10b981; color: white; }
    .fail { background: #ef4444; color: white; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
    .metric-card {
      background: white;
      padding: 25px;
      border-radius: 10px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }
    .metric-value { font-size: 2.5em; font-weight: bold; color: #667eea; margin: 10px 0; }
    .metric-label { color: #666; font-size: 0.9em; text-transform: uppercase; letter-spacing: 1px; }
    .chart { margin-top: 20px; height: 200px; background: #f3f4f6; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔥 Flamoral Load Test Results</h1>
      <p>Normal Traffic Scenario - 1000 Concurrent Users</p>
      <div class="status-badge ${passed ? 'pass' : 'fail'}">
        ${passed ? '✅ PASSED' : '❌ FAILED'}
      </div>
    </div>

    <div class="metrics">
      <div class="metric-card">
        <div class="metric-label">Total Requests</div>
        <div class="metric-value">${(data.metrics.http_reqs?.values?.count || 0).toLocaleString()}</div>
      </div>

      <div class="metric-card">
        <div class="metric-label">Error Rate</div>
        <div class="metric-value">${((data.metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}%</div>
      </div>

      <div class="metric-card">
        <div class="metric-label">P95 Response Time</div>
        <div class="metric-value">${(data.metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(0)}ms</div>
      </div>

      <div class="metric-card">
        <div class="metric-label">Throughput</div>
        <div class="metric-value">${(data.metrics.http_reqs?.values?.rate || 0).toFixed(0)} <span style="font-size:0.5em">req/s</span></div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
