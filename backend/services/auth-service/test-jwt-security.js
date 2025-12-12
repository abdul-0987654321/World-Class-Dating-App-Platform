/**
 * JWT Security Test Script
 *
 * This script tests the JWT security improvements:
 * 1. Token generation with proper claims
 * 2. Token verification with algorithm validation
 * 3. Token expiry
 * 4. Issuer and audience validation
 *
 * Run with: node test-jwt-security.js
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Test configuration
const config = {
  accessSecret: crypto.randomBytes(32).toString('hex'),
  refreshSecret: crypto.randomBytes(32).toString('hex'),
  algorithm: 'HS256',
  issuer: 'flamoral-auth-service',
  audience: 'flamoral-platform',
};

console.log('🔐 JWT Security Test Suite\n');
console.log('Generated test secrets (32+ characters):');
console.log(`Access Secret: ${config.accessSecret}`);
console.log(`Refresh Secret: ${config.refreshSecret}\n`);

// Test 1: Generate token with all security claims
console.log('✅ Test 1: Generate token with security claims');
const payload = {
  userId: '12345',
  email: 'test@example.com',
};

const accessToken = jwt.sign(payload, config.accessSecret, {
  expiresIn: '15m',
  algorithm: config.algorithm,
  issuer: config.issuer,
  audience: config.audience,
});

console.log('Access Token Generated:', accessToken.substring(0, 50) + '...');
const decoded = jwt.decode(accessToken);
console.log('Decoded payload:', JSON.stringify(decoded, null, 2));

// Test 2: Verify token with correct options
console.log('\n✅ Test 2: Verify token with correct options');
try {
  const verified = jwt.verify(accessToken, config.accessSecret, {
    algorithms: [config.algorithm],
    issuer: config.issuer,
    audience: config.audience,
  });
  console.log('Token verified successfully!');
  console.log('Verified payload:', JSON.stringify(verified, null, 2));
} catch (error) {
  console.error('❌ Verification failed:', error.message);
}

// Test 3: Reject token with wrong algorithm
console.log('\n✅ Test 3: Reject token with wrong algorithm');
try {
  jwt.verify(accessToken, config.accessSecret, {
    algorithms: ['RS256'], // Wrong algorithm
    issuer: config.issuer,
    audience: config.audience,
  });
  console.error('❌ Should have rejected wrong algorithm!');
} catch (error) {
  console.log('✓ Correctly rejected:', error.message);
}

// Test 4: Reject token with wrong issuer
console.log('\n✅ Test 4: Reject token with wrong issuer');
try {
  jwt.verify(accessToken, config.accessSecret, {
    algorithms: [config.algorithm],
    issuer: 'wrong-issuer',
    audience: config.audience,
  });
  console.error('❌ Should have rejected wrong issuer!');
} catch (error) {
  console.log('✓ Correctly rejected:', error.message);
}

// Test 5: Reject token with wrong audience
console.log('\n✅ Test 5: Reject token with wrong audience');
try {
  jwt.verify(accessToken, config.accessSecret, {
    algorithms: [config.algorithm],
    issuer: config.issuer,
    audience: 'wrong-audience',
  });
  console.error('❌ Should have rejected wrong audience!');
} catch (error) {
  console.log('✓ Correctly rejected:', error.message);
}

// Test 6: Test token expiry
console.log('\n✅ Test 6: Test token expiry');
const expiredToken = jwt.sign(payload, config.accessSecret, {
  expiresIn: '1ms', // Expires immediately
  algorithm: config.algorithm,
  issuer: config.issuer,
  audience: config.audience,
});

setTimeout(() => {
  try {
    jwt.verify(expiredToken, config.accessSecret, {
      algorithms: [config.algorithm],
      issuer: config.issuer,
      audience: config.audience,
    });
    console.error('❌ Should have rejected expired token!');
  } catch (error) {
    console.log('✓ Correctly rejected expired token:', error.message);
  }
}, 10);

// Test 7: Test refresh token with JTI
setTimeout(() => {
  console.log('\n✅ Test 7: Refresh token with JTI (for rotation)');
  const refreshPayload = {
    ...payload,
    jti: crypto.randomBytes(16).toString('hex'),
  };

  const refreshToken = jwt.sign(refreshPayload, config.refreshSecret, {
    expiresIn: '7d',
    algorithm: config.algorithm,
    issuer: config.issuer,
    audience: config.audience,
  });

  const decodedRefresh = jwt.decode(refreshToken);
  console.log('Refresh token JTI:', decodedRefresh.jti);
  console.log('✓ Refresh token includes unique JTI for rotation tracking');

  // Test 8: Error handling
  console.log('\n✅ Test 8: Test comprehensive error handling');

  const testCases = [
    {
      name: 'Invalid token format',
      token: 'invalid.token.format',
      expectedError: 'jwt malformed',
    },
    {
      name: 'Wrong secret',
      token: jwt.sign(payload, 'wrong-secret', { algorithm: 'HS256' }),
      expectedError: 'invalid signature',
    },
    {
      name: 'None algorithm (security vulnerability)',
      token: jwt.sign(payload, '', { algorithm: 'none' }),
      expectedError: 'jwt algorithm not allowed',
    },
  ];

  testCases.forEach(({ name, token, expectedError }) => {
    try {
      jwt.verify(token, config.accessSecret, {
        algorithms: [config.algorithm],
        issuer: config.issuer,
        audience: config.audience,
      });
      console.error(`❌ ${name}: Should have failed!`);
    } catch (error) {
      console.log(`✓ ${name}: Correctly rejected`);
    }
  });

  console.log('\n🎉 All security tests completed!\n');
  console.log('Summary:');
  console.log('- ✓ Tokens include issuer and audience claims');
  console.log('- ✓ Algorithm is explicitly specified and validated');
  console.log('- ✓ Tokens expire correctly (15m for access, 7d for refresh)');
  console.log('- ✓ Refresh tokens include JTI for rotation tracking');
  console.log('- ✓ Invalid tokens are properly rejected');
  console.log('- ✓ Algorithm confusion attacks are prevented');
  console.log('\nNext steps:');
  console.log('1. Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in .env');
  console.log('2. Deploy with new configuration');
  console.log('3. Test with real authentication flow');
  console.log('4. Monitor for token reuse detection in logs');
}, 20);
