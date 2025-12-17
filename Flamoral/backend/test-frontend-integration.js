/**
 * Frontend-Backend Integration Test
 * Tests all API endpoints that the frontend uses
 */

const http = require('http');

const BACKEND_URL = 'http://localhost:3000';
const FRONTEND_PROXY = 'http://localhost:5173';
let authToken = null;
let userId = null;

const results = {
  passed: [],
  failed: [],
};

async function makeRequest(baseUrl, method, path, body = null, headers = {}) {
  return new Promise((resolve) => {
    const url = new URL(path, baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ status: 0, error: error.message });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function test(name, passed, details = '') {
  if (passed) {
    results.passed.push(name);
    console.log(`✓ PASS: ${name}`);
  } else {
    results.failed.push({ name, details });
    console.log(`✗ FAIL: ${name} - ${details}`);
  }
}

async function runTests() {
  console.log('\n=== Frontend-Backend Integration Tests ===\n');

  // ==================== PROXY TESTS ====================
  console.log('\n--- 1. Vite Proxy Tests ---\n');

  // Test proxy is working
  const proxyHealth = await makeRequest(FRONTEND_PROXY, 'GET', '/api/subscriptions/plans');
  test('Vite Proxy → Backend', proxyHealth.status === 200 && proxyHealth.data?.success,
    `Status: ${proxyHealth.status}`);

  // ==================== AUTH TESTS ====================
  console.log('\n--- 2. Authentication Flow ---\n');

  // Login via proxy (how frontend does it)
  const loginViaProxy = await makeRequest(FRONTEND_PROXY, 'POST', '/api/auth/login', {
    email: 'test1@flamoral.com',
    password: 'TestUser1!',
  });

  if (loginViaProxy.status === 200 && loginViaProxy.data?.success) {
    authToken = loginViaProxy.data.data?.accessToken || loginViaProxy.data.accessToken;
    userId = loginViaProxy.data.data?.user?.id || loginViaProxy.data.user?.id;
    test('Login via Proxy', true);
    console.log(`   Token: ${authToken ? authToken.substring(0, 20) + '...' : 'NOT FOUND'}`);
    console.log(`   User ID: ${userId || 'NOT FOUND'}`);
  } else {
    test('Login via Proxy', false, `Status: ${loginViaProxy.status}, Error: ${JSON.stringify(loginViaProxy.data?.error || loginViaProxy.error).slice(0, 100)}`);
  }

  // ==================== DISCOVERY TESTS ====================
  console.log('\n--- 3. Discovery Endpoints ---\n');

  const authHeaders = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};

  // Get recommendations
  const recommendations = await makeRequest(FRONTEND_PROXY, 'GET', '/api/discovery/recommendations', null, authHeaders);
  test('Discovery Recommendations', recommendations.status === 200,
    `Status: ${recommendations.status}, Profiles: ${recommendations.data?.data?.profiles?.length || 0}`);

  // Get stats
  const stats = await makeRequest(FRONTEND_PROXY, 'GET', '/api/discovery/stats', null, authHeaders);
  test('Discovery Stats', stats.status === 200,
    `Status: ${stats.status}`);

  // ==================== MATCHING TESTS ====================
  console.log('\n--- 4. Matching Endpoints ---\n');

  // Get matches
  const matches = await makeRequest(FRONTEND_PROXY, 'GET', '/api/matches', null, authHeaders);
  test('Get Matches', matches.status === 200,
    `Status: ${matches.status}, Matches: ${matches.data?.data?.matches?.length || 0}`);

  // Get likes
  const likes = await makeRequest(FRONTEND_PROXY, 'GET', '/api/matches/likes', null, authHeaders);
  test('Get Likes', likes.status === 200,
    `Status: ${likes.status}`);

  // ==================== MESSAGING TESTS ====================
  console.log('\n--- 5. Messaging Endpoints ---\n');

  // Get conversations
  const conversations = await makeRequest(FRONTEND_PROXY, 'GET', '/api/messages/conversations', null, authHeaders);
  test('Get Conversations', conversations.status === 200,
    `Status: ${conversations.status}`);

  // Get unread count
  const unread = await makeRequest(FRONTEND_PROXY, 'GET', '/api/messages/unread-count', null, authHeaders);
  test('Get Unread Count', unread.status === 200,
    `Status: ${unread.status}, Count: ${unread.data?.data?.unreadCount || 0}`);

  // ==================== PROFILE TESTS ====================
  console.log('\n--- 6. Profile Endpoints ---\n');

  // Get own profile
  const profile = await makeRequest(FRONTEND_PROXY, 'GET', '/api/profiles/me', null, authHeaders);
  test('Get Own Profile', profile.status === 200 || profile.status === 404,
    `Status: ${profile.status}`);

  // ==================== SUBSCRIPTION TESTS ====================
  console.log('\n--- 7. Subscription Endpoints ---\n');

  // Get plans (public)
  const plans = await makeRequest(FRONTEND_PROXY, 'GET', '/api/subscriptions/plans');
  test('Get Plans (Public)', plans.status === 200 && plans.data?.data?.plans?.length > 0,
    `Status: ${plans.status}, Plans: ${plans.data?.data?.plans?.length || 0}`);

  // Get subscription status
  const subStatus = await makeRequest(FRONTEND_PROXY, 'GET', '/api/subscriptions/status', null, authHeaders);
  test('Get Subscription Status', subStatus.status === 200,
    `Status: ${subStatus.status}, Tier: ${subStatus.data?.data?.tier || 'unknown'}`);

  // Get subscription history
  const subHistory = await makeRequest(FRONTEND_PROXY, 'GET', '/api/subscriptions/history', null, authHeaders);
  test('Get Subscription History', subHistory.status === 200,
    `Status: ${subHistory.status}`);

  // ==================== GAMIFICATION TESTS ====================
  console.log('\n--- 8. Gamification Endpoints ---\n');

  const streak = await makeRequest(FRONTEND_PROXY, 'GET', '/api/gamification/streak', null, authHeaders);
  test('Get Streak', streak.status === 200 || streak.status === 404,
    `Status: ${streak.status}`);

  const achievements = await makeRequest(FRONTEND_PROXY, 'GET', '/api/gamification/achievements', null, authHeaders);
  test('Get Achievements', achievements.status === 200,
    `Status: ${achievements.status}`);

  // ==================== SAFETY TESTS ====================
  console.log('\n--- 9. Safety Endpoints ---\n');

  const privacySettings = await makeRequest(FRONTEND_PROXY, 'GET', '/api/safety/privacy/settings', null, authHeaders);
  test('Get Privacy Settings', privacySettings.status === 200 || privacySettings.status === 404,
    `Status: ${privacySettings.status}`);

  // ==================== COMMUNITY TESTS ====================
  console.log('\n--- 10. Community Endpoints ---\n');

  const communities = await makeRequest(FRONTEND_PROXY, 'GET', '/api/communities', null, authHeaders);
  test('Get Communities', communities.status === 200,
    `Status: ${communities.status}`);

  // ==================== REFERRAL TESTS ====================
  console.log('\n--- 11. Referral Endpoints ---\n');

  const referralCode = await makeRequest(FRONTEND_PROXY, 'GET', '/api/referrals/code', null, authHeaders);
  test('Get Referral Code', referralCode.status === 200 || referralCode.status === 404,
    `Status: ${referralCode.status}`);

  // ==================== SPEED DATING TESTS ====================
  console.log('\n--- 12. Speed Dating Endpoints ---\n');

  const speedDatingEvents = await makeRequest(FRONTEND_PROXY, 'GET', '/api/speed-dating/events', null, authHeaders);
  test('Get Speed Dating Events', speedDatingEvents.status === 200,
    `Status: ${speedDatingEvents.status}`);

  // ==================== SUMMARY ====================
  console.log('\n' + '='.repeat(60));
  console.log('\n=== TEST SUMMARY ===\n');
  console.log(`Passed: ${results.passed.length}`);
  console.log(`Failed: ${results.failed.length}`);
  console.log(`Success Rate: ${((results.passed.length / (results.passed.length + results.failed.length)) * 100).toFixed(1)}%`);

  if (results.failed.length > 0) {
    console.log('\nFailed Tests:');
    results.failed.forEach((f) => console.log(`  - ${f.name}: ${f.details}`));
  }

  console.log('\n=== Frontend Integration Status ===');
  console.log(`Auth Token Available: ${authToken ? 'Yes' : 'No'}`);
  console.log(`User ID: ${userId || 'Not found'}`);
  console.log(`Proxy Working: ${proxyHealth.status === 200 ? 'Yes' : 'No'}`);

  console.log('\n=== Frontend Pages Status ===');
  console.log('Login Page: ' + (loginViaProxy.status === 200 ? '✓ Ready' : '✗ Auth broken'));
  console.log('Discovery Page: ' + (recommendations.status === 200 && stats.status === 200 ? '✓ Ready' : '✗ Needs fix'));
  console.log('Matches Page: ' + (matches.status === 200 && likes.status === 200 ? '✓ Ready' : '✗ Needs fix'));
  console.log('Messages Page: ' + (conversations.status === 200 && unread.status === 200 ? '✓ Ready' : '✗ Needs fix'));
  console.log('Profile Page: ' + (profile.status === 200 || profile.status === 404 ? '✓ Ready' : '✗ Needs fix'));
  console.log('Safety Center: ' + (privacySettings.status === 200 || privacySettings.status === 404 ? '✓ Ready' : '✗ Needs fix'));

  console.log('\n');
}

runTests().catch(console.error);
