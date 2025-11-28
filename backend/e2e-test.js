// End-to-End API Test Script
// Tests all critical endpoints from backend to frontend

const BASE_URL = 'http://localhost:3000';

async function testEndpoint(name, method, path, options = {}) {
  const url = `${BASE_URL}${path}`;
  try {
    const fetchOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { 'Authorization': `Bearer ${options.token}` } : {}),
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    };

    const res = await fetch(url, fetchOptions);
    const data = await res.json();

    const status = res.status >= 200 && res.status < 300 ? 'PASS' : 'FAIL';
    console.log(`[${status}] ${name}`);
    console.log(`  URL: ${method} ${path}`);
    console.log(`  Status: ${res.status}`);
    if (status === 'FAIL' || options.verbose) {
      console.log(`  Response: ${JSON.stringify(data).substring(0, 200)}...`);
    }
    console.log('');

    return { success: status === 'PASS', data, status: res.status };
  } catch (err) {
    console.log(`[FAIL] ${name}`);
    console.log(`  URL: ${method} ${path}`);
    console.log(`  Error: ${err.message}`);
    console.log('');
    return { success: false, error: err.message };
  }
}

async function runTests() {
  console.log('========================================');
  console.log('End-to-End API Test Suite');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;
  let token = null;

  // 1. Auth Tests
  console.log('--- AUTHENTICATION TESTS ---\n');

  const loginResult = await testEndpoint(
    'Login with test user',
    'POST',
    '/api/auth/login',
    { body: { email: 'test1@flamoral.com', password: 'TestUser1!' } }
  );
  if (loginResult.success && loginResult.data.data?.accessToken) {
    token = loginResult.data.data.accessToken;
    console.log(`  Token obtained: ${token.substring(0, 20)}...`);
    console.log('');
    passed++;
  } else {
    failed++;
  }

  const meResult = await testEndpoint(
    'Get current user (/api/auth/me)',
    'GET',
    '/api/auth/me',
    { token }
  );
  meResult.success ? passed++ : failed++;

  // 2. User Profile Tests
  console.log('--- USER PROFILE TESTS ---\n');

  const profileResult = await testEndpoint(
    'Get profile (/api/profiles/me)',
    'GET',
    '/api/profiles/me',
    { token }
  );
  profileResult.success ? passed++ : failed++;

  const settingsResult = await testEndpoint(
    'Get user settings',
    'GET',
    '/api/users/settings',
    { token }
  );
  settingsResult.success ? passed++ : failed++;

  // 3. Subscription Tests
  console.log('--- SUBSCRIPTION TESTS ---\n');

  const plansResult = await testEndpoint(
    'Get subscription plans',
    'GET',
    '/api/subscriptions/plans',
    { token }
  );
  plansResult.success ? passed++ : failed++;

  if (plansResult.success) {
    const plans = plansResult.data.data?.plans || [];
    console.log(`  Plans found: ${plans.length}`);
    plans.forEach(p => {
      console.log(`    - ${p.name}: $${(p.monthlyPrice / 100).toFixed(2)}/month`);
    });
    console.log('');
  }

  const statusResult = await testEndpoint(
    'Get subscription status',
    'GET',
    '/api/subscriptions/status',
    { token }
  );
  statusResult.success ? passed++ : failed++;

  // 4. Safety Tests
  console.log('--- SAFETY & PRIVACY TESTS ---\n');

  const verificationResult = await testEndpoint(
    'Get verification status',
    'GET',
    '/api/safety/verification-status',
    { token }
  );
  verificationResult.success ? passed++ : failed++;

  const securityResult = await testEndpoint(
    'Get security settings',
    'GET',
    '/api/safety/security-settings',
    { token }
  );
  securityResult.success ? passed++ : failed++;

  const privacyResult = await testEndpoint(
    'Get privacy settings',
    'GET',
    '/api/safety/privacy-settings',
    { token }
  );
  privacyResult.success ? passed++ : failed++;

  const tipsResult = await testEndpoint(
    'Get safety tips (public)',
    'GET',
    '/api/safety/tips',
    {}
  );
  tipsResult.success ? passed++ : failed++;

  const crisisResult = await testEndpoint(
    'Get crisis resources (public)',
    'GET',
    '/api/safety/crisis-resources',
    {}
  );
  crisisResult.success ? passed++ : failed++;

  const emergencyContactsResult = await testEndpoint(
    'Get emergency contacts',
    'GET',
    '/api/safety/emergency-contacts',
    { token }
  );
  emergencyContactsResult.success ? passed++ : failed++;

  // 5. Discovery & Matching Tests
  console.log('--- DISCOVERY & MATCHING TESTS ---\n');

  const recommendationsResult = await testEndpoint(
    'Get recommendations',
    'GET',
    '/api/discovery/recommendations',
    { token }
  );
  recommendationsResult.success ? passed++ : failed++;

  if (recommendationsResult.success) {
    const profiles = recommendationsResult.data.data?.profiles || [];
    console.log(`  Profiles found: ${profiles.length}`);
    profiles.slice(0, 3).forEach(p => {
      console.log(`    - ${p.name}, ${p.age} - ${p.occupation}`);
    });
    console.log('');
  }

  const matchesResult = await testEndpoint(
    'Get matches',
    'GET',
    '/api/matches',
    { token }
  );
  matchesResult.success ? passed++ : failed++;

  if (matchesResult.success) {
    const matches = matchesResult.data.data?.matches || [];
    console.log(`  Matches found: ${matches.length}`);
    matches.forEach(m => {
      console.log(`    - ${m.name} (${m.unreadCount} unread)`);
    });
    console.log('');
  }

  // 6. Payment Tests
  console.log('--- PAYMENT TESTS ---\n');

  const providersResult = await testEndpoint(
    'Get payment providers',
    'GET',
    '/api/payments/providers',
    { token }
  );
  providersResult.success ? passed++ : failed++;

  const productsResult = await testEndpoint(
    'Get payment products (coins)',
    'GET',
    '/api/payments/products',
    { token }
  );
  productsResult.success ? passed++ : failed++;

  const walletResult = await testEndpoint(
    'Get wallet balance',
    'GET',
    '/api/payments/wallet',
    { token }
  );
  walletResult.success ? passed++ : failed++;

  if (walletResult.success) {
    const wallet = walletResult.data.wallet;
    console.log(`  Wallet Balance:`);
    console.log(`    - Coins: ${wallet.coins}`);
    console.log(`    - Gems: ${wallet.gems}`);
    console.log(`    - Bonus Coins: ${wallet.bonusCoins}`);
    console.log('');
  }

  // 7. Health Check
  console.log('--- SYSTEM TESTS ---\n');

  const healthResult = await testEndpoint(
    'Health check',
    'GET',
    '/api/health',
    {}
  );
  healthResult.success ? passed++ : failed++;

  // Summary
  console.log('========================================');
  console.log('TEST SUMMARY');
  console.log('========================================');
  console.log(`Total Tests: ${passed + failed}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('========================================');

  return { passed, failed };
}

runTests().catch(console.error);
