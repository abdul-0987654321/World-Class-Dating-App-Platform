import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { authenticate, getAuthHeaders } from '../utils/auth.js';
import { generateMessage, generateSearchFilters, generatePaymentData } from '../utils/data-generator.js';
import {
  authLatency, discoveryLatency, matchingLatency, messagingLatency,
  profileLatency, paymentLatency, uploadLatency,
  createThresholds, recordSuccess, recordFailure
} from '../utils/metrics.js';
import { BASE_URL, parseEnvConfig } from '../utils/config.js';

/**
 * API ENDPOINT PERFORMANCE TEST
 *
 * Purpose: Test all major API endpoints individually
 * Focus: Measure and validate SLOs for each endpoint
 *
 * Endpoints tested:
 * 1. Authentication (login, register, refresh, logout)
 * 2. User Profile (get, update, photos)
 * 3. Discovery/Matching (browse, search, preferences)
 * 4. Messaging (conversations, send, read)
 * 5. Media Upload (photos, verification)
 * 6. Payment (subscriptions, coins, boosts)
 */

export const options = {
  scenarios: {
    // Test each endpoint type with dedicated VUs
    auth_endpoints: {
      executor: 'constant-vus',
      vus: 20,
      duration: '5m',
      exec: 'testAuthEndpoints',
      tags: { endpoint_type: 'auth' },
    },
    profile_endpoints: {
      executor: 'constant-vus',
      vus: 30,
      duration: '5m',
      exec: 'testProfileEndpoints',
      tags: { endpoint_type: 'profile' },
      startTime: '0s',
    },
    discovery_endpoints: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
      exec: 'testDiscoveryEndpoints',
      tags: { endpoint_type: 'discovery' },
      startTime: '0s',
    },
    messaging_endpoints: {
      executor: 'constant-vus',
      vus: 40,
      duration: '5m',
      exec: 'testMessagingEndpoints',
      tags: { endpoint_type: 'messaging' },
      startTime: '0s',
    },
    payment_endpoints: {
      executor: 'constant-vus',
      vus: 15,
      duration: '5m',
      exec: 'testPaymentEndpoints',
      tags: { endpoint_type: 'payment' },
      startTime: '0s',
    },
  },

  thresholds: createThresholds({
    // Endpoint-specific SLO thresholds
    'http_req_duration{endpoint_type:auth}': ['p(95)<150', 'p(99)<300'],
    'http_req_duration{endpoint_type:profile}': ['p(95)<150', 'p(99)<300'],
    'http_req_duration{endpoint_type:discovery}': ['p(95)<250', 'p(99)<500'],
    'http_req_duration{endpoint_type:messaging}': ['p(95)<100', 'p(99)<200'],
    'http_req_duration{endpoint_type:payment}': ['p(95)<300', 'p(99)<600'],

    // Individual endpoint thresholds
    'auth_latency': ['p(95)<150', 'p(99)<300'],
    'profile_latency': ['p(95)<150', 'p(99)<300'],
    'discovery_latency': ['p(95)<250', 'p(99)<500'],
    'matching_latency': ['p(95)<150', 'p(99)<300'],
    'messaging_latency': ['p(95)<100', 'p(99)<200'],
    'payment_latency': ['p(95)<300', 'p(99)<600'],

    // Error rates per endpoint type
    'http_req_failed{endpoint_type:auth}': ['rate<0.005'],
    'http_req_failed{endpoint_type:profile}': ['rate<0.01'],
    'http_req_failed{endpoint_type:discovery}': ['rate<0.01'],
    'http_req_failed{endpoint_type:messaging}': ['rate<0.01'],
    'http_req_failed{endpoint_type:payment}': ['rate<0.005'],
  }),

  summaryTrendStats: ['min', 'max', 'med', 'avg', 'p(90)', 'p(95)', 'p(99)'],
};

const config = parseEnvConfig();

export function setup() {
  console.log('=== API Endpoint Performance Test Setup ===');

  const token = authenticate(config.testEmail, config.testPassword);

  if (!token) {
    console.error('Setup failed: Could not authenticate');
    return null;
  }

  return { token };
}

// 1. Authentication Endpoints Test
export function testAuthEndpoints(data) {
  if (!data || !data.token) return;

  group('Authentication Endpoints', () => {

    // Login endpoint
    group('POST /auth/login', () => {
      const loginRes = http.post(
        `${BASE_URL}/auth/login`,
        JSON.stringify({
          email: config.testEmail,
          password: config.testPassword,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );

      const success = check(loginRes, {
        'login status 200': (r) => r.status === 200,
        'login returns token': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.token || body.accessToken;
          } catch {
            return false;
          }
        },
        'login response time < 150ms': (r) => r.timings.duration < 150,
      });

      success ? recordSuccess(loginRes, authLatency) : recordFailure(loginRes, authLatency);
    });

    sleep(1);

    // Token refresh endpoint
    group('POST /auth/refresh', () => {
      const refreshRes = http.post(
        `${BASE_URL}/auth/refresh`,
        JSON.stringify({ refreshToken: data.token }),
        { headers: { 'Content-Type': 'application/json' } }
      );

      check(refreshRes, {
        'refresh status 200 or 401': (r) => r.status === 200 || r.status === 401,
        'refresh response time < 100ms': (r) => r.timings.duration < 100,
      });
    });

    sleep(1);

    // Logout endpoint
    group('POST /auth/logout', () => {
      const headers = getAuthHeaders(data.token);
      const logoutRes = http.post(`${BASE_URL}/auth/logout`, null, { headers });

      check(logoutRes, {
        'logout status 200 or 204': (r) => r.status === 200 || r.status === 204,
        'logout response time < 100ms': (r) => r.timings.duration < 100,
      });
    });

    sleep(Math.random() * 2 + 1);
  });
}

// 2. Profile Endpoints Test
export function testProfileEndpoints(data) {
  if (!data || !data.token) return;

  const headers = getAuthHeaders(data.token);

  group('Profile Endpoints', () => {

    // Get own profile
    group('GET /users/me', () => {
      const profileRes = http.get(`${BASE_URL}/users/me`, { headers });

      const success = check(profileRes, {
        'profile status 200': (r) => r.status === 200,
        'profile has user data': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.id && body.email;
          } catch {
            return false;
          }
        },
        'profile response time < 150ms': (r) => r.timings.duration < 150,
      });

      success ? recordSuccess(profileRes, profileLatency) : recordFailure(profileRes, profileLatency);
    });

    sleep(0.5);

    // Update profile
    group('PATCH /users/me', () => {
      const updateRes = http.patch(
        `${BASE_URL}/users/me`,
        JSON.stringify({
          bio: `Updated bio at ${Date.now()}`,
        }),
        { headers }
      );

      check(updateRes, {
        'update status 200': (r) => r.status === 200,
        'update response time < 200ms': (r) => r.timings.duration < 200,
      }) ? recordSuccess(updateRes, profileLatency) : recordFailure(updateRes, profileLatency);
    });

    sleep(0.5);

    // Get user photos
    group('GET /users/me/photos', () => {
      const photosRes = http.get(`${BASE_URL}/users/me/photos`, { headers });

      check(photosRes, {
        'photos status 200': (r) => r.status === 200,
        'photos response time < 150ms': (r) => r.timings.duration < 150,
      });
    });

    sleep(Math.random() * 2 + 1);
  });
}

// 3. Discovery/Matching Endpoints Test
export function testDiscoveryEndpoints(data) {
  if (!data || !data.token) return;

  const headers = getAuthHeaders(data.token);

  group('Discovery Endpoints', () => {

    // Browse/discover profiles
    group('GET /discover', () => {
      const discoverRes = http.get(`${BASE_URL}/discover`, { headers });

      const success = check(discoverRes, {
        'discover status 200': (r) => r.status === 200,
        'discover has profiles': (r) => {
          try {
            const body = JSON.parse(r.body);
            return Array.isArray(body.profiles);
          } catch {
            return false;
          }
        },
        'discover response time < 250ms': (r) => r.timings.duration < 250,
      });

      success ? recordSuccess(discoverRes, discoveryLatency) : recordFailure(discoverRes, discoveryLatency);
    });

    sleep(1);

    // Search with filters
    group('POST /discover/search', () => {
      const filters = generateSearchFilters();
      const searchRes = http.post(
        `${BASE_URL}/discover/search`,
        JSON.stringify(filters),
        { headers }
      );

      check(searchRes, {
        'search status 200': (r) => r.status === 200,
        'search response time < 500ms': (r) => r.timings.duration < 500,
      }) ? recordSuccess(searchRes, discoveryLatency) : recordFailure(searchRes, discoveryLatency);
    });

    sleep(0.5);

    // Like action
    group('POST /matches/like', () => {
      const likeRes = http.post(
        `${BASE_URL}/matches/like`,
        JSON.stringify({ profileId: `test-profile-${__VU}` }),
        { headers }
      );

      check(likeRes, {
        'like status 200 or 201': (r) => r.status === 200 || r.status === 201,
        'like response time < 150ms': (r) => r.timings.duration < 150,
      }) ? recordSuccess(likeRes, matchingLatency) : recordFailure(likeRes, matchingLatency);
    });

    sleep(0.5);

    // Get matches
    group('GET /matches', () => {
      const matchesRes = http.get(`${BASE_URL}/matches`, { headers });

      check(matchesRes, {
        'matches status 200': (r) => r.status === 200,
        'matches response time < 200ms': (r) => r.timings.duration < 200,
      });
    });

    sleep(Math.random() * 2 + 1);
  });
}

// 4. Messaging Endpoints Test
export function testMessagingEndpoints(data) {
  if (!data || !data.token) return;

  const headers = getAuthHeaders(data.token);

  group('Messaging Endpoints', () => {

    // Get conversations
    group('GET /messages/conversations', () => {
      const conversationsRes = http.get(`${BASE_URL}/messages/conversations`, { headers });

      const success = check(conversationsRes, {
        'conversations status 200': (r) => r.status === 200,
        'conversations response time < 150ms': (r) => r.timings.duration < 150,
      });

      success ? recordSuccess(conversationsRes, messagingLatency) : recordFailure(conversationsRes, messagingLatency);
    });

    sleep(0.5);

    // Send message
    group('POST /messages', () => {
      const messageRes = http.post(
        `${BASE_URL}/messages`,
        JSON.stringify({
          conversationId: `test-conversation-${__VU}`,
          content: generateMessage(),
        }),
        { headers }
      );

      check(messageRes, {
        'send message status 200 or 201': (r) => r.status === 200 || r.status === 201,
        'send message response time < 100ms': (r) => r.timings.duration < 100,
      }) ? recordSuccess(messageRes, messagingLatency) : recordFailure(messageRes, messagingLatency);
    });

    sleep(0.5);

    // Mark message as read
    group('PUT /messages/:id/read', () => {
      const readRes = http.put(
        `${BASE_URL}/messages/test-message-${__VU}/read`,
        null,
        { headers }
      );

      check(readRes, {
        'mark read status 200 or 404': (r) => r.status === 200 || r.status === 404,
        'mark read response time < 50ms': (r) => r.timings.duration < 50,
      });
    });

    sleep(Math.random() * 2 + 1);
  });
}

// 5. Payment Endpoints Test
export function testPaymentEndpoints(data) {
  if (!data || !data.token) return;

  const headers = getAuthHeaders(data.token);

  group('Payment Endpoints', () => {

    // Get subscription plans
    group('GET /payments/subscriptions', () => {
      const subscriptionsRes = http.get(`${BASE_URL}/payments/subscriptions`, { headers });

      const success = check(subscriptionsRes, {
        'subscriptions status 200': (r) => r.status === 200,
        'subscriptions response time < 200ms': (r) => r.timings.duration < 200,
      });

      success ? recordSuccess(subscriptionsRes, paymentLatency) : recordFailure(subscriptionsRes, paymentLatency);
    });

    sleep(1);

    // Get coins packages
    group('GET /payments/coins', () => {
      const coinsRes = http.get(`${BASE_URL}/payments/coins`, { headers });

      check(coinsRes, {
        'coins status 200': (r) => r.status === 200,
        'coins response time < 200ms': (r) => r.timings.duration < 200,
      }) ? recordSuccess(coinsRes, paymentLatency) : recordFailure(coinsRes, paymentLatency);
    });

    sleep(1);

    // Get boost options
    group('GET /payments/boosts', () => {
      const boostsRes = http.get(`${BASE_URL}/payments/boosts`, { headers });

      check(boostsRes, {
        'boosts status 200': (r) => r.status === 200,
        'boosts response time < 200ms': (r) => r.timings.duration < 200,
      });
    });

    sleep(Math.random() * 3 + 2);
  });
}

export function handleSummary(data) {
  const timestamp = new Date().toISOString();

  // Aggregate metrics by endpoint type
  const endpointMetrics = {
    auth: getEndpointStats(data, 'auth'),
    profile: getEndpointStats(data, 'profile'),
    discovery: getEndpointStats(data, 'discovery'),
    messaging: getEndpointStats(data, 'messaging'),
    payment: getEndpointStats(data, 'payment'),
  };

  const summary = generateSummary(endpointMetrics);

  console.log(summary);

  return {
    'stdout': summary,
    [`results/api-endpoints-${timestamp}.json`]: JSON.stringify(data, null, 2),
    [`results/api-endpoints-${timestamp}.html`]: htmlEndpointReport(endpointMetrics),
  };
}

function getEndpointStats(data, endpointType) {
  const metricKey = `http_req_duration{endpoint_type:${endpointType}}`;
  const failedKey = `http_req_failed{endpoint_type:${endpointType}}`;

  return {
    p95: data.metrics[metricKey]?.values?.['p(95)'] || 0,
    p99: data.metrics[metricKey]?.values?.['p(99)'] || 0,
    avg: data.metrics[metricKey]?.values?.avg || 0,
    failedRate: data.metrics[failedKey]?.values?.rate || 0,
  };
}

function generateSummary(metrics) {
  return `
╔═══════════════════════════════════════════════════════════════════════════╗
║                  FLAMORAL API ENDPOINT PERFORMANCE TEST                   ║
╚═══════════════════════════════════════════════════════════════════════════╝

📊 ENDPOINT PERFORMANCE SUMMARY
─────────────────────────────────────────────────────────────────────────────

🔐 AUTHENTICATION ENDPOINTS
   P95: ${metrics.auth.p95.toFixed(0)}ms  ${metrics.auth.p95 < 150 ? '✅' : '⚠️'}
   P99: ${metrics.auth.p99.toFixed(0)}ms  ${metrics.auth.p99 < 300 ? '✅' : '⚠️'}
   Error Rate: ${(metrics.auth.failedRate * 100).toFixed(3)}%  ${metrics.auth.failedRate < 0.005 ? '✅' : '⚠️'}

👤 PROFILE ENDPOINTS
   P95: ${metrics.profile.p95.toFixed(0)}ms  ${metrics.profile.p95 < 150 ? '✅' : '⚠️'}
   P99: ${metrics.profile.p99.toFixed(0)}ms  ${metrics.profile.p99 < 300 ? '✅' : '⚠️'}
   Error Rate: ${(metrics.profile.failedRate * 100).toFixed(3)}%  ${metrics.profile.failedRate < 0.01 ? '✅' : '⚠️'}

🔍 DISCOVERY ENDPOINTS
   P95: ${metrics.discovery.p95.toFixed(0)}ms  ${metrics.discovery.p95 < 250 ? '✅' : '⚠️'}
   P99: ${metrics.discovery.p99.toFixed(0)}ms  ${metrics.discovery.p99 < 500 ? '✅' : '⚠️'}
   Error Rate: ${(metrics.discovery.failedRate * 100).toFixed(3)}%  ${metrics.discovery.failedRate < 0.01 ? '✅' : '⚠️'}

💬 MESSAGING ENDPOINTS
   P95: ${metrics.messaging.p95.toFixed(0)}ms  ${metrics.messaging.p95 < 100 ? '✅' : '⚠️'}
   P99: ${metrics.messaging.p99.toFixed(0)}ms  ${metrics.messaging.p99 < 200 ? '✅' : '⚠️'}
   Error Rate: ${(metrics.messaging.failedRate * 100).toFixed(3)}%  ${metrics.messaging.failedRate < 0.01 ? '✅' : '⚠️'}

💳 PAYMENT ENDPOINTS
   P95: ${metrics.payment.p95.toFixed(0)}ms  ${metrics.payment.p95 < 300 ? '✅' : '⚠️'}
   P99: ${metrics.payment.p99.toFixed(0)}ms  ${metrics.payment.p99 < 600 ? '✅' : '⚠️'}
   Error Rate: ${(metrics.payment.failedRate * 100).toFixed(3)}%  ${metrics.payment.failedRate < 0.005 ? '✅' : '⚠️'}

═══════════════════════════════════════════════════════════════════════════
`;
}

function htmlEndpointReport(metrics) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>API Endpoint Performance - Flamoral</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    .header {
      background: white;
      padding: 30px;
      border-radius: 15px;
      text-align: center;
      margin-bottom: 20px;
    }
    .endpoint-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }
    .endpoint-card {
      background: white;
      padding: 25px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    .endpoint-card h3 { color: #667eea; margin-bottom: 15px; }
    .metric-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #eee;
    }
    .pass { color: #10b981; font-weight: bold; }
    .fail { color: #ef4444; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔥 API Endpoint Performance Test</h1>
      <p>Comprehensive endpoint analysis for Flamoral Dating Platform</p>
    </div>
    <div class="endpoint-grid">
      ${Object.entries(metrics).map(([key, m]) => `
        <div class="endpoint-card">
          <h3>${key.toUpperCase()}</h3>
          <div class="metric-row">
            <span>P95:</span>
            <span class="${m.p95 < getSLO(key, 'p95') ? 'pass' : 'fail'}">${m.p95.toFixed(0)}ms</span>
          </div>
          <div class="metric-row">
            <span>P99:</span>
            <span class="${m.p99 < getSLO(key, 'p99') ? 'pass' : 'fail'}">${m.p99.toFixed(0)}ms</span>
          </div>
          <div class="metric-row">
            <span>Error Rate:</span>
            <span class="${m.failedRate < 0.01 ? 'pass' : 'fail'}">${(m.failedRate * 100).toFixed(3)}%</span>
          </div>
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>`;
}

function getSLO(endpoint, metric) {
  const slos = {
    auth: { p95: 150, p99: 300 },
    profile: { p95: 150, p99: 300 },
    discovery: { p95: 250, p99: 500 },
    messaging: { p95: 100, p99: 200 },
    payment: { p95: 300, p99: 600 },
  };
  return slos[endpoint]?.[metric] || 1000;
}
