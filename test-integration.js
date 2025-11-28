/**
 * Integration Test Script
 * Tests frontend-backend connectivity
 */

const BASE_URL = 'http://localhost:3000';

async function test() {
  console.log('=== Flamoral Integration Test ===\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing Health Check...');
    const health = await fetch(`${BASE_URL}/api/health`).then(r => r.json());
    console.log('   Status:', health.status);
    console.log('   Environment:', health.environment);
    console.log('   ✓ Health check passed\n');

    // Test 2: Login
    console.log('2. Testing Login...');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test1@flamoral.com', password: 'TestUser1!' })
    }).then(r => r.json());

    if (!loginRes.success) throw new Error('Login failed');
    const token = loginRes.data.accessToken;
    console.log('   User:', loginRes.data.user.name);
    console.log('   Subscription:', loginRes.data.user.subscription.tier);
    console.log('   Token received:', token.substring(0, 20) + '...');
    console.log('   ✓ Login passed\n');

    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // Test 3: Get Current User
    console.log('3. Testing Get Current User (/api/auth/me)...');
    const me = await fetch(`${BASE_URL}/api/auth/me`, { headers: authHeaders }).then(r => r.json());
    console.log('   User ID:', me.data.id);
    console.log('   Email:', me.data.email);
    console.log('   Wallet Coins:', me.data.wallet?.coins);
    console.log('   ✓ Get user passed\n');

    // Test 4: Get Discovery Recommendations
    console.log('4. Testing Discovery Recommendations...');
    const discovery = await fetch(`${BASE_URL}/api/discovery/recommendations`, { headers: authHeaders }).then(r => r.json());
    console.log('   Profiles returned:', discovery.data.profiles.length);
    console.log('   First profile:', discovery.data.profiles[0]?.name);
    console.log('   ✓ Discovery passed\n');

    // Test 5: Get Matches
    console.log('5. Testing Get Matches...');
    const matches = await fetch(`${BASE_URL}/api/matches`, { headers: authHeaders }).then(r => r.json());
    console.log('   Total matches:', matches.data.matches.length);
    console.log('   New matches:', matches.data.newMatches.length);
    console.log('   ✓ Matches passed\n');

    // Test 6: Get Subscription Plans
    console.log('6. Testing Subscription Plans...');
    const plans = await fetch(`${BASE_URL}/api/subscriptions/plans`).then(r => r.json());
    console.log('   Plans available:', plans.data.plans.length);
    plans.data.plans.forEach(p => console.log(`   - ${p.name}: $${(p.monthlyPrice/100).toFixed(2)}/mo`));
    console.log('   ✓ Subscription plans passed\n');

    // Test 7: Get Payment Products
    console.log('7. Testing Payment Products...');
    const products = await fetch(`${BASE_URL}/api/payments/products`).then(r => r.json());
    console.log('   Products available:', products.products.length);
    products.products.forEach(p => console.log(`   - ${p.name}: $${(p.price/100).toFixed(2)}`));
    console.log('   ✓ Payment products passed\n');

    // Test 8: Get Wallet
    console.log('8. Testing User Wallet...');
    const wallet = await fetch(`${BASE_URL}/api/payments/wallet`, { headers: authHeaders }).then(r => r.json());
    console.log('   Coins:', wallet.wallet.coins);
    console.log('   Gems:', wallet.wallet.gems);
    console.log('   Bonus Coins:', wallet.wallet.bonusCoins);
    console.log('   ✓ Wallet passed\n');

    // Test 9: Test Admin Endpoints
    console.log('9. Testing Admin Login...');
    const adminLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@flamoral.com', password: 'AdminUser1!' })
    }).then(r => r.json());

    const adminToken = adminLogin.data.accessToken;
    const adminHeaders = { 'Authorization': `Bearer ${adminToken}` };

    const revenue = await fetch(`${BASE_URL}/api/admin/revenue/summary`, { headers: adminHeaders }).then(r => r.json());
    console.log('   Total Revenue: $' + (revenue.data.totalRevenue / 100).toFixed(2));
    console.log('   Net Revenue: $' + (revenue.data.netRevenue / 100).toFixed(2));
    console.log('   ✓ Admin endpoints passed\n');

    // Final Summary
    console.log('========================================');
    console.log('✅ ALL INTEGRATION TESTS PASSED!');
    console.log('========================================\n');
    console.log('Frontend URL: http://localhost:5176');
    console.log('Backend URL: http://localhost:3000');
    console.log('\nTest Accounts:');
    console.log('  Email: test1@flamoral.com  Password: TestUser1!');
    console.log('  Email: test2@flamoral.com  Password: TestUser2!');
    console.log('  Email: admin@flamoral.com  Password: AdminUser1!');
    console.log('\nThe frontend and backend are successfully connected!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

test();
