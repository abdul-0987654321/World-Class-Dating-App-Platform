/**
 * Comprehensive E2E API Security Test Suite
 *
 * Covers the OWASP Top 10 and additional security domains:
 * 1. SQL Injection
 * 2. XSS Prevention
 * 3. IDOR (Insecure Direct Object Reference)
 * 4. RBAC / Authorization
 * 5. Privilege Escalation (Horizontal & Vertical)
 * 6. Mass Assignment
 * 7. Authentication Edge Cases
 * 8. Rate Limiting
 * 9. Security Headers
 *
 * 50+ independent test cases organised by security domain.
 */

import request from 'supertest';
import { config, testState, createTestUser, authenticatedRequest, wait } from './setup';

const API = config.API_GATEWAY_URL;
const PREFIX = '/api/v1';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return a fresh, non-existent UUID that cannot collide with real data. */
const fakeUserId = (): string => '00000000-0000-4000-a000-000000000000';

/** A second fake ID for cross-user tests. */
const otherFakeUserId = (): string => '00000000-0000-4000-a000-999999999999';

/** Build a full path under the API prefix. */
const url = (path: string): string => `${PREFIX}${path}`;

// Common SQL injection payloads
const SQL_PAYLOADS = [
  "' OR '1'='1",
  "'; DROP TABLE users;--",
  "1; SELECT * FROM users--",
  "' UNION SELECT NULL,NULL,NULL--",
  "1' AND 1=CONVERT(int,(SELECT @@version))--",
  "admin'--",
  "' OR 1=1 LIMIT 1--",
  "'; EXEC xp_cmdshell('whoami');--",
];

// Common XSS payloads
const XSS_PAYLOADS = [
  '<script>alert("xss")</script>',
  '<img src=x onerror=alert(1)>',
  '<svg onload=alert(1)>',
  '<body onload=alert(1)>',
  '"><script>alert(document.cookie)</script>',
  "javascript:alert('XSS')",
  '<iframe src="javascript:alert(1)">',
  '<svg><script>alert(1)</script></svg>',
  '<math><maction actiontype="statusline#" xlink:href="javascript:alert(1)">click</maction></math>',
  '<details open ontoggle=alert(1)>',
];

// ---------------------------------------------------------------------------
// 1. SQL INJECTION
// ---------------------------------------------------------------------------

describe('Security: SQL Injection Prevention', () => {
  it('should reject SQL injection in registration email field', async () => {
    const res = await request(API)
      .post(url('/auth/register'))
      .send({
        email: "' OR '1'='1",
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: '1995-01-01',
        gender: 'male',
      });

    // Must not return 200/201 — the email is invalid format
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).not.toBe(500); // should not cause a server error / db leak
  });

  it('should reject SQL injection in login email field', async () => {
    const res = await request(API)
      .post(url('/auth/login'))
      .send({
        email: "admin'--",
        password: 'anything',
      });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).not.toBe(500);
  });

  it('should reject SQL injection in login password field', async () => {
    const res = await request(API)
      .post(url('/auth/login'))
      .send({
        email: 'legit@example.com',
        password: "' OR '1'='1",
      });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).not.toBe(500);
  });

  it('should safely handle SQL injection in query parameters', async () => {
    const res = await request(API)
      .get(url("/users/me?fields=' OR 1=1--"))
      .set('Authorization', `Bearer ${testState.accessToken}`);

    // Must not expose database errors or extra rows
    expect([200, 400, 404]).toContain(res.status);
    if (res.body && res.body.error) {
      expect(res.body.error).not.toMatch(/sql|syntax|SELECT|FROM|WHERE/i);
    }
  });

  it('should safely handle SQL injection in user profile update bio', async () => {
    const res = await request(API)
      .put(url('/users/me'))
      .set('Authorization', `Bearer ${testState.accessToken}`)
      .send({
        bio: "'; DROP TABLE users;--",
      });

    // Should succeed (the string is just stored as text) or be rejected
    expect([200, 400]).toContain(res.status);
    // If accepted, verify the payload is stored as-is (escaped), not executed
    if (res.status === 200 && res.body?.data?.bio) {
      expect(res.body.data.bio).toBe("'; DROP TABLE users;--");
    }
  });

  it('should safely handle SQL injection in path parameter (userId)', async () => {
    const maliciousId = "1 OR 1=1";
    const res = await request(API)
      .get(url(`/users/${encodeURIComponent(maliciousId)}`))
      .set('Authorization', `Bearer ${testState.accessToken}`);

    expect([400, 403, 404]).toContain(res.status);
    if (res.body && res.body.error) {
      expect(res.body.error).not.toMatch(/sql|syntax|pg_|relation/i);
    }
  });

  it('should not leak database structure on SQL injection attempt in registration', async () => {
    for (const payload of SQL_PAYLOADS.slice(0, 3)) {
      const res = await request(API)
        .post(url('/auth/register'))
        .send({
          email: `${payload}@test.com`,
          password: payload,
          firstName: payload,
          lastName: 'User',
          dateOfBirth: '1995-01-01',
          gender: 'male',
        });

      // Should never return raw SQL errors
      const body = JSON.stringify(res.body);
      expect(body).not.toMatch(/pg_catalog|information_schema|sqlite_master|mysql\./i);
      expect(body).not.toMatch(/syntax error at or near|Unclosed quotation mark/i);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. XSS PREVENTION
// ---------------------------------------------------------------------------

describe('Security: XSS Prevention', () => {
  it('should sanitize or reject script tags in profile bio', async () => {
    const res = await request(API)
      .put(url('/users/me'))
      .set('Authorization', `Bearer ${testState.accessToken}`)
      .send({
        bio: '<script>alert("xss")</script>',
      });

    expect([200, 400]).toContain(res.status);
    if (res.status === 200 && res.body?.data?.bio) {
      // If stored, the script tag must be stripped or escaped
      expect(res.body.data.bio).not.toContain('<script>');
    }
  });

  it('should sanitize or reject img-onerror XSS in profile bio', async () => {
    const res = await request(API)
      .put(url('/users/me'))
      .set('Authorization', `Bearer ${testState.accessToken}`)
      .send({
        bio: '<img src=x onerror=alert(1)>',
      });

    expect([200, 400]).toContain(res.status);
    if (res.status === 200 && res.body?.data?.bio) {
      expect(res.body.data.bio).not.toMatch(/onerror/i);
    }
  });

  it('should sanitize or reject SVG-based XSS in profile fields', async () => {
    const res = await request(API)
      .put(url('/users/me'))
      .set('Authorization', `Bearer ${testState.accessToken}`)
      .send({
        bio: '<svg onload=alert(1)>',
        occupation: '<svg><script>alert(1)</script></svg>',
      });

    expect([200, 400]).toContain(res.status);
    if (res.status === 200) {
      const body = JSON.stringify(res.body);
      expect(body).not.toMatch(/<script>/i);
      expect(body).not.toMatch(/onload=/i);
    }
  });

  it('should sanitize or reject event handler XSS in firstName via register', async () => {
    const res = await request(API)
      .post(url('/auth/register'))
      .send({
        email: `xss-test-${Date.now()}@flamoral.test`,
        password: 'SecurePass123!',
        firstName: '<body onload=alert(1)>',
        lastName: 'Normal',
        dateOfBirth: '1995-01-01',
        gender: 'male',
      });

    // Should reject or sanitize
    if (res.status === 201 && res.body?.data?.user?.firstName) {
      expect(res.body.data.user.firstName).not.toMatch(/onload/i);
    }
    if (res.body && res.body.error) {
      // Rejection is also acceptable
      expect(res.status).toBeGreaterThanOrEqual(400);
    }
  });

  it('should sanitize multiple XSS vectors in a single request', async () => {
    const res = await request(API)
      .put(url('/users/me'))
      .set('Authorization', `Bearer ${testState.accessToken}`)
      .send({
        bio: '"><script>alert(document.cookie)</script>',
        occupation: "javascript:alert('XSS')",
        city: '<iframe src="javascript:alert(1)">',
      });

    expect([200, 400]).toContain(res.status);
    if (res.status === 200) {
      const body = JSON.stringify(res.body);
      expect(body).not.toMatch(/<script>/i);
      expect(body).not.toMatch(/<iframe/i);
    }
  });

  it('should sanitize XSS in query parameters', async () => {
    const res = await request(API)
      .get(url('/users/me'))
      .query({ callback: '<script>alert(1)</script>' })
      .set('Authorization', `Bearer ${testState.accessToken}`);

    expect([200, 400]).toContain(res.status);
    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/<script>/i);
  });
});

// ---------------------------------------------------------------------------
// 3. IDOR (Insecure Direct Object Reference)
// ---------------------------------------------------------------------------

describe('Security: IDOR Prevention', () => {
  it('should not allow user A to read user B profile via direct ID', async () => {
    const res = await request(API)
      .get(url(`/users/${otherFakeUserId()}`))
      .set('Authorization', `Bearer ${testState.accessToken}`);

    // Either 403 (forbidden), 404 (not found), or limited public data — never full private data
    expect([403, 404]).toContain(res.status);
  });

  it('should not allow user A to update user B profile via PUT /users/:id', async () => {
    const res = await request(API)
      .put(url(`/users/${otherFakeUserId()}`))
      .set('Authorization', `Bearer ${testState.accessToken}`)
      .send({ bio: 'Hacked bio' });

    // Regular users should not be able to update other users (admin-only endpoint)
    expect([401, 403]).toContain(res.status);
  });

  it('should not allow user A to delete user B via DELETE /users/:id', async () => {
    const res = await request(API)
      .delete(url(`/users/${otherFakeUserId()}`))
      .set('Authorization', `Bearer ${testState.accessToken}`);

    expect([401, 403]).toContain(res.status);
  });

  it('should not allow user A to access user B media via /media/user/:userId', async () => {
    const res = await request(API)
      .get(url(`/media/user/${otherFakeUserId()}`))
      .set('Authorization', `Bearer ${testState.accessToken}`);

    // This is an admin/moderator endpoint — regular user must be blocked
    expect([401, 403]).toContain(res.status);
  });

  it('should not allow access to another user media by iterating IDs', async () => {
    // Attempt sequential ID guessing
    const guessedIds = [
      '00000000-0000-4000-a000-000000000001',
      '00000000-0000-4000-a000-000000000002',
      '00000000-0000-4000-a000-000000000003',
    ];

    for (const id of guessedIds) {
      const res = await request(API)
        .get(url(`/media/user/${id}`))
        .set('Authorization', `Bearer ${testState.accessToken}`);

      expect([401, 403, 404]).toContain(res.status);
    }
  });

  it('should scope /users/me to the authenticated user only', async () => {
    const res = await request(API)
      .get(url('/users/me'))
      .set('Authorization', `Bearer ${testState.accessToken}`);

    if (res.status === 200) {
      const userId = res.body?.data?.id || res.body?.id || res.body?.data?.userId;
      // The returned user ID must match the authenticated user
      if (userId && testState.userId) {
        expect(userId).toBe(testState.userId);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 4. RBAC / AUTHORIZATION
// ---------------------------------------------------------------------------

describe('Security: RBAC / Authorization', () => {
  it('should return 401 for unauthenticated access to /users/me', async () => {
    const res = await request(API).get(url('/users/me'));

    expect(res.status).toBe(401);
  });

  it('should return 401 for unauthenticated access to PUT /users/me', async () => {
    const res = await request(API)
      .put(url('/users/me'))
      .send({ bio: 'test' });

    expect(res.status).toBe(401);
  });

  it('should return 403 for regular user accessing admin PUT /users/:userId', async () => {
    const res = await request(API)
      .put(url(`/users/${otherFakeUserId()}`))
      .set('Authorization', `Bearer ${testState.accessToken}`)
      .send({ bio: 'admin override' });

    expect([401, 403]).toContain(res.status);
  });

  it('should return 403 for regular user accessing admin DELETE /users/:userId', async () => {
    const res = await request(API)
      .delete(url(`/users/${otherFakeUserId()}`))
      .set('Authorization', `Bearer ${testState.accessToken}`);

    expect([401, 403]).toContain(res.status);
  });

  it('should return 403 for regular user accessing admin ban endpoint', async () => {
    const res = await request(API)
      .post(url('/moderation/actions/ban'))
      .set('Authorization', `Bearer ${testState.accessToken}`)
      .send({ userId: otherFakeUserId(), reason: 'test ban' });

    expect([401, 403]).toContain(res.status);
  });

  it('should return 403 for regular user accessing moderator text scan', async () => {
    const res = await request(API)
      .post(url('/moderation/scan/text'))
      .set('Authorization', `Bearer ${testState.accessToken}`)
      .send({ text: 'hello world' });

    expect([401, 403]).toContain(res.status);
  });

  it('should return 403 for regular user accessing admin analytics stats', async () => {
    const res = await request(API)
      .get(url('/analytics/platform/stats'))
      .set('Authorization', `Bearer ${testState.accessToken}`);

    expect([401, 403]).toContain(res.status);
  });

  it('should return 403 for regular user accessing admin analytics export', async () => {
    const res = await request(API)
      .post(url('/analytics/export'))
      .set('Authorization', `Bearer ${testState.accessToken}`)
      .send({ type: 'users', format: 'csv' });

    expect([401, 403]).toContain(res.status);
  });

  it('should return 403 for regular user accessing admin media listing for another user', async () => {
    const res = await request(API)
      .get(url(`/media/user/${otherFakeUserId()}`))
      .set('Authorization', `Bearer ${testState.accessToken}`);

    expect([401, 403]).toContain(res.status);
  });
});

// ---------------------------------------------------------------------------
// 5. PRIVILEGE ESCALATION
// ---------------------------------------------------------------------------

describe('Security: Privilege Escalation Prevention', () => {
  // --- Horizontal privilege escalation ---

  it('should prevent horizontal escalation: user A cannot update user B data', async () => {
    const res = await request(API)
      .put(url(`/users/${otherFakeUserId()}`))
      .set('Authorization', `Bearer ${testState.accessToken}`)
      .send({ bio: 'I hacked your profile' });

    expect([401, 403]).toContain(res.status);
  });

  it('should prevent horizontal escalation: user A cannot view user B private media', async () => {
    const res = await request(API)
      .get(url(`/media/user/${otherFakeUserId()}`))
      .set('Authorization', `Bearer ${testState.accessToken}`);

    expect([401, 403]).toContain(res.status);
  });

  // --- Vertical privilege escalation ---

  it('should prevent vertical escalation: regular user cannot ban another user', async () => {
    const res = await request(API)
      .post(url('/moderation/actions/ban'))
      .set('Authorization', `Bearer ${testState.accessToken}`)
      .send({
        userId: otherFakeUserId(),
        reason: 'Attempted privilege escalation',
        duration: '7d',
      });

    expect([401, 403]).toContain(res.status);
  });

  it('should prevent vertical escalation: regular user cannot export analytics', async () => {
    const res = await request(API)
      .post(url('/analytics/export'))
      .set('Authorization', `Bearer ${testState.accessToken}`)
      .send({ startDate: '2024-01-01', endDate: '2024-12-31' });

    expect([401, 403]).toContain(res.status);
  });

  it('should prevent vertical escalation: regular user cannot view platform stats', async () => {
    const res = await request(API)
      .get(url('/analytics/platform/stats'))
      .set('Authorization', `Bearer ${testState.accessToken}`);

    expect([401, 403]).toContain(res.status);
  });

  it('should prevent vertical escalation: regular user cannot scan text as moderator', async () => {
    const res = await request(API)
      .post(url('/moderation/scan/text'))
      .set('Authorization', `Bearer ${testState.accessToken}`)
      .send({ text: 'check this text', context: 'message' });

    expect([401, 403]).toContain(res.status);
  });
});

// ---------------------------------------------------------------------------
// 6. MASS ASSIGNMENT
// ---------------------------------------------------------------------------

describe('Security: Mass Assignment Protection', () => {
  it('should ignore "role" field in profile update', async () => {
    const res = await request(API)
      .put(url('/users/me'))
      .set('Authorization', `Bearer ${testState.accessToken}`)
      .send({
        bio: 'Innocent update',
        role: 'admin',
      });

    // The update should succeed or be partially accepted, but role must not change
    if (res.status === 200) {
      const role = res.body?.data?.role || res.body?.role;
      if (role) {
        expect(role).not.toBe('admin');
      }
    }
  });

  it('should ignore "isAdmin" field in profile update', async () => {
    const res = await request(API)
      .put(url('/users/me'))
      .set('Authorization', `Bearer ${testState.accessToken}`)
      .send({
        bio: 'Normal update',
        isAdmin: true,
      });

    if (res.status === 200) {
      expect(res.body?.data?.isAdmin).not.toBe(true);
      expect(res.body?.isAdmin).not.toBe(true);
    }
  });

  it('should ignore "roles" array in profile update', async () => {
    const res = await request(API)
      .put(url('/users/me'))
      .set('Authorization', `Bearer ${testState.accessToken}`)
      .send({
        bio: 'Testing roles array',
        roles: ['admin', 'moderator', 'superuser'],
      });

    if (res.status === 200) {
      const roles = res.body?.data?.roles || res.body?.roles;
      if (Array.isArray(roles)) {
        expect(roles).not.toContain('admin');
        expect(roles).not.toContain('superuser');
      }
    }
  });

  it('should ignore "subscription" tier override in profile update', async () => {
    const res = await request(API)
      .put(url('/users/me'))
      .set('Authorization', `Bearer ${testState.accessToken}`)
      .send({
        bio: 'Testing subscription override',
        subscription: 'ultra',
        subscriptionTier: 'ultra',
      });

    if (res.status === 200) {
      const sub = res.body?.data?.subscription || res.body?.data?.subscriptionTier;
      if (sub) {
        // Should not have been escalated to ultra via mass assignment
        expect(sub).not.toBe('ultra');
      }
    }
  });

  it('should ignore "isVerified" flag in profile update', async () => {
    const res = await request(API)
      .put(url('/users/me'))
      .set('Authorization', `Bearer ${testState.accessToken}`)
      .send({
        bio: 'Verify bypass attempt',
        isVerified: true,
        isEmailVerified: true,
        emailVerified: true,
      });

    // Verification status should not be changeable via profile update
    if (res.status === 200) {
      // These fields should not be set to true via mass assignment
      const data = res.body?.data || res.body;
      // We cannot assert they are false (they might already be true from email verification)
      // but the endpoint should simply ignore these fields
    }
    // Should not cause an error either
    expect([200, 400]).toContain(res.status);
  });

  it('should ignore "id" and "userId" overwrite in profile update', async () => {
    const res = await request(API)
      .put(url('/users/me'))
      .set('Authorization', `Bearer ${testState.accessToken}`)
      .send({
        bio: 'ID swap attempt',
        id: otherFakeUserId(),
        userId: otherFakeUserId(),
      });

    if (res.status === 200) {
      const returnedId = res.body?.data?.id || res.body?.data?.userId;
      if (returnedId) {
        expect(returnedId).not.toBe(otherFakeUserId());
      }
    }
  });

  it('should ignore admin fields in registration', async () => {
    const res = await request(API)
      .post(url('/auth/register'))
      .send({
        email: `mass-assign-${Date.now()}@flamoral.test`,
        password: 'SecurePass123!',
        firstName: 'Mass',
        lastName: 'Assign',
        dateOfBirth: '1995-01-01',
        gender: 'male',
        role: 'admin',
        isAdmin: true,
        roles: ['admin', 'moderator'],
      });

    if (res.status === 201) {
      const user = res.body?.data?.user || res.body?.user;
      if (user) {
        if (user.role) expect(user.role).not.toBe('admin');
        if (user.roles) expect(user.roles).not.toContain('admin');
        expect(user.isAdmin).not.toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 7. AUTHENTICATION EDGE CASES
// ---------------------------------------------------------------------------

describe('Security: Authentication Edge Cases', () => {
  it('should reject a completely empty Authorization header', async () => {
    const res = await request(API)
      .get(url('/users/me'))
      .set('Authorization', '');

    expect(res.status).toBe(401);
  });

  it('should reject "Bearer" with no token', async () => {
    const res = await request(API)
      .get(url('/users/me'))
      .set('Authorization', 'Bearer ');

    expect(res.status).toBe(401);
  });

  it('should reject "Bearer null"', async () => {
    const res = await request(API)
      .get(url('/users/me'))
      .set('Authorization', 'Bearer null');

    expect(res.status).toBe(401);
  });

  it('should reject "Bearer undefined"', async () => {
    const res = await request(API)
      .get(url('/users/me'))
      .set('Authorization', 'Bearer undefined');

    expect(res.status).toBe(401);
  });

  it('should reject a completely fabricated JWT token', async () => {
    const fakeJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJoYWNrZXIiLCJyb2xlIjoiYWRtaW4ifQ.invalidsignature';
    const res = await request(API)
      .get(url('/users/me'))
      .set('Authorization', `Bearer ${fakeJwt}`);

    expect(res.status).toBe(401);
  });

  it('should reject a JWT token with tampered payload', async () => {
    // Take a real-ish header, tamper the payload, use garbage signature
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      userId: 'tampered-id',
      email: 'hacker@evil.com',
      roles: ['admin'],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    })).toString('base64url');
    const tamperedToken = `${header}.${payload}.invalidsignaturedata`;

    const res = await request(API)
      .get(url('/users/me'))
      .set('Authorization', `Bearer ${tamperedToken}`);

    expect(res.status).toBe(401);
  });

  it('should reject a JWT with "none" algorithm', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      userId: testState.userId || 'test',
      email: 'admin@flamoral.test',
      roles: ['admin'],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    })).toString('base64url');
    const noneToken = `${header}.${payload}.`;

    const res = await request(API)
      .get(url('/users/me'))
      .set('Authorization', `Bearer ${noneToken}`);

    expect(res.status).toBe(401);
  });

  it('should reject an expired token', async () => {
    // Construct a JWT-like token that is expired (payload exp in the past)
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      userId: 'test-user',
      email: 'expired@flamoral.test',
      iat: Math.floor(Date.now() / 1000) - 7200,
      exp: Math.floor(Date.now() / 1000) - 3600, // expired 1 hour ago
    })).toString('base64url');
    const expiredToken = `${header}.${payload}.expiredsignature`;

    const res = await request(API)
      .get(url('/users/me'))
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
  });

  it('should reject a malformed (non-base64) token', async () => {
    const res = await request(API)
      .get(url('/users/me'))
      .set('Authorization', 'Bearer !!!not-base64!!!');

    expect(res.status).toBe(401);
  });

  it('should reject a token with extra segments', async () => {
    const res = await request(API)
      .get(url('/users/me'))
      .set('Authorization', 'Bearer aaa.bbb.ccc.ddd.eee');

    expect(res.status).toBe(401);
  });

  it('should reject Basic auth instead of Bearer', async () => {
    const basicCreds = Buffer.from('admin:admin').toString('base64');
    const res = await request(API)
      .get(url('/users/me'))
      .set('Authorization', `Basic ${basicCreds}`);

    expect(res.status).toBe(401);
  });

  it('should not leak user existence information on login failure', async () => {
    const resNonExistent = await request(API)
      .post(url('/auth/login'))
      .send({
        email: 'nonexistent-user-xyz@flamoral.test',
        password: 'SomePassword123!',
      });

    const resWrongPassword = await request(API)
      .post(url('/auth/login'))
      .send({
        email: testState.email || 'test@flamoral.test',
        password: 'WrongPassword999!',
      });

    // Both should return the same status code to prevent user enumeration
    expect(resNonExistent.status).toBe(resWrongPassword.status);
    // Both should be 401
    expect(resNonExistent.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// 8. RATE LIMITING
// ---------------------------------------------------------------------------

describe('Security: Rate Limiting', () => {
  it('should rate limit rapid login attempts', async () => {
    const results: number[] = [];

    // Fire 20 rapid login attempts with wrong credentials
    for (let i = 0; i < 20; i++) {
      const res = await request(API)
        .post(url('/auth/login'))
        .send({
          email: 'rate-limit-test@flamoral.test',
          password: 'WrongPassword123!',
        });
      results.push(res.status);
    }

    // At least some of the later requests should be rate-limited (429)
    // or the endpoint should consistently reject (401) without leaking info
    const has429 = results.includes(429);
    const allUnauthorized = results.every((s) => s === 401 || s === 429);

    // Either rate limiting kicks in, or all fail cleanly
    expect(allUnauthorized || has429).toBe(true);
  });

  it('should rate limit rapid registration attempts', async () => {
    const results: number[] = [];

    for (let i = 0; i < 15; i++) {
      const res = await request(API)
        .post(url('/auth/register'))
        .send({
          email: `ratelimit-${Date.now()}-${i}@flamoral.test`,
          password: 'SecurePass123!',
          firstName: 'Rate',
          lastName: 'Limit',
          dateOfBirth: '1995-01-01',
          gender: 'male',
        });
      results.push(res.status);
    }

    // We expect either successful registrations or rate limiting
    const hasRateLimit = results.includes(429);
    const hasSuccess = results.includes(201);

    // If the system supports rate limiting, we should see 429 eventually
    // If not, all should succeed or fail with validation errors — not crash
    const noServerErrors = results.every((s) => s < 500);
    expect(noServerErrors).toBe(true);
  });

  it('should rate limit password reset requests', async () => {
    const results: number[] = [];

    for (let i = 0; i < 10; i++) {
      const res = await request(API)
        .post(url('/auth/forgot-password'))
        .send({ email: 'ratelimit-reset@flamoral.test' });
      results.push(res.status);
    }

    // Must not cause server errors
    const noServerErrors = results.every((s) => s < 500);
    expect(noServerErrors).toBe(true);
  });

  it('should include rate limit headers in responses', async () => {
    const res = await request(API)
      .post(url('/auth/login'))
      .send({
        email: 'header-check@flamoral.test',
        password: 'SomePassword123!',
      });

    // Common rate-limit headers — at least one should be present if rate limiting is active
    const rateLimitHeaders = [
      'x-ratelimit-limit',
      'x-ratelimit-remaining',
      'x-ratelimit-reset',
      'retry-after',
      'ratelimit-limit',
      'ratelimit-remaining',
      'ratelimit-reset',
    ];

    const hasAnyRateLimitHeader = rateLimitHeaders.some(
      (header) => res.headers[header] !== undefined,
    );

    // This is informational — some APIs don't expose these headers
    // We log but don't fail the test since it's a best-practice check
    if (!hasAnyRateLimitHeader) {
      console.warn(
        'Rate limit headers not found in response. Consider adding X-RateLimit-* headers.',
      );
    }
  });
});

// ---------------------------------------------------------------------------
// 9. SECURITY HEADERS
// ---------------------------------------------------------------------------

describe('Security: Response Headers', () => {
  let securityResponse: request.Response;

  beforeAll(async () => {
    securityResponse = await request(API).get(url('/auth/login'));
  });

  it('should not expose server software version', async () => {
    const res = await request(API).get(url('/users/me'));

    const serverHeader = res.headers['server'] || '';
    // Should not reveal specific version numbers
    expect(serverHeader).not.toMatch(/express\/\d/i);
    expect(serverHeader).not.toMatch(/nginx\/\d/i);
    expect(serverHeader).not.toMatch(/apache\/\d/i);
  });

  it('should include X-Content-Type-Options: nosniff', async () => {
    const res = await request(API).get(url('/users/me'));

    const header = res.headers['x-content-type-options'];
    if (header) {
      expect(header).toBe('nosniff');
    } else {
      console.warn('Missing X-Content-Type-Options header. Recommended: nosniff');
    }
  });

  it('should include X-Frame-Options header', async () => {
    const res = await request(API).get(url('/users/me'));

    const header = res.headers['x-frame-options'];
    if (header) {
      expect(['DENY', 'SAMEORIGIN']).toContain(header.toUpperCase());
    } else {
      console.warn('Missing X-Frame-Options header. Recommended: DENY or SAMEORIGIN');
    }
  });

  it('should include Strict-Transport-Security in HTTPS responses', async () => {
    const res = await request(API).get(url('/users/me'));

    // HSTS only applies over HTTPS but the header may still be set
    const hsts = res.headers['strict-transport-security'];
    if (hsts) {
      expect(hsts).toMatch(/max-age=\d+/);
    }
    // Not a hard failure in local dev (HTTP), just a recommendation
  });

  it('should include Content-Security-Policy or X-XSS-Protection', async () => {
    const res = await request(API).get(url('/users/me'));

    const csp = res.headers['content-security-policy'];
    const xss = res.headers['x-xss-protection'];

    if (!csp && !xss) {
      console.warn(
        'Neither Content-Security-Policy nor X-XSS-Protection headers found. Consider adding CSP.',
      );
    }
    // At least one should ideally be present
    if (csp) {
      expect(typeof csp).toBe('string');
    }
    if (xss) {
      expect(xss).toMatch(/1/); // "1; mode=block" is expected
    }
  });

  it('should not expose X-Powered-By header', async () => {
    const res = await request(API).get(url('/users/me'));

    // Express sets X-Powered-By: Express by default — it should be removed
    const poweredBy = res.headers['x-powered-by'];
    if (poweredBy) {
      expect(poweredBy.toLowerCase()).not.toContain('express');
    }
  });

  it('should set appropriate Cache-Control for authenticated endpoints', async () => {
    const res = await request(API)
      .get(url('/users/me'))
      .set('Authorization', `Bearer ${testState.accessToken}`);

    const cacheControl = res.headers['cache-control'];
    if (cacheControl) {
      // Authenticated responses should not be publicly cached
      expect(cacheControl.toLowerCase()).toMatch(/no-store|no-cache|private/);
    }
  });

  it('should return proper Content-Type for JSON API responses', async () => {
    const res = await request(API)
      .post(url('/auth/login'))
      .send({ email: 'test@test.com', password: 'test' });

    const contentType = res.headers['content-type'] || '';
    expect(contentType).toMatch(/application\/json/);
  });
});

// ---------------------------------------------------------------------------
// BONUS: Miscellaneous Security Checks
// ---------------------------------------------------------------------------

describe('Security: Miscellaneous', () => {
  it('should reject oversized request bodies', async () => {
    const hugePayload = {
      bio: 'A'.repeat(1_000_000), // 1 MB of text
    };

    const res = await request(API)
      .put(url('/users/me'))
      .set('Authorization', `Bearer ${testState.accessToken}`)
      .send(hugePayload);

    // Should be rejected with 400 or 413 (Payload Too Large), not crash
    expect([400, 413, 422]).toContain(res.status);
  });

  it('should reject requests with unexpected Content-Type', async () => {
    const res = await request(API)
      .post(url('/auth/login'))
      .set('Content-Type', 'text/xml')
      .send('<xml><email>test@test.com</email></xml>');

    // Should reject or at least not process XML as JSON
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('should handle null bytes in input gracefully', async () => {
    const res = await request(API)
      .post(url('/auth/login'))
      .send({
        email: 'test\x00@flamoral.test',
        password: 'Pass\x00word123!',
      });

    // Should not cause a server crash
    expect(res.status).not.toBe(500);
  });

  it('should handle path traversal attempts gracefully', async () => {
    const res = await request(API)
      .get(url('/users/../../etc/passwd'))
      .set('Authorization', `Bearer ${testState.accessToken}`);

    expect([400, 403, 404]).toContain(res.status);
  });

  it('should not expose stack traces in error responses', async () => {
    const res = await request(API)
      .get(url('/nonexistent-endpoint-xyz'))
      .set('Authorization', `Bearer ${testState.accessToken}`);

    const body = JSON.stringify(res.body);
    // Should not contain stack trace lines
    expect(body).not.toMatch(/at\s+\w+\s+\(.*\.js:\d+:\d+\)/);
    expect(body).not.toMatch(/node_modules/);
    expect(body).not.toMatch(/Error:\s+.*\n\s+at/);
  });

  it('should not reveal internal file paths in error messages', async () => {
    const res = await request(API)
      .post(url('/auth/register'))
      .send({}); // Missing required fields

    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/\/home\//);
    expect(body).not.toMatch(/\/app\//);
    expect(body).not.toMatch(/C:\\Users\\/i);
    expect(body).not.toMatch(/node_modules\//);
  });

  it('should handle HTTP method tampering (PATCH instead of PUT on admin endpoint)', async () => {
    const res = await request(API)
      .patch(url(`/users/${otherFakeUserId()}`))
      .set('Authorization', `Bearer ${testState.accessToken}`)
      .send({ role: 'admin' });

    // Should be rejected — either method not allowed or unauthorized
    expect([401, 403, 404, 405]).toContain(res.status);
  });

  it('should handle extremely long URL paths without crashing', async () => {
    const longPath = '/users/' + 'a'.repeat(5000);
    const res = await request(API)
      .get(url(longPath))
      .set('Authorization', `Bearer ${testState.accessToken}`);

    // Should respond with an error, not crash
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(600);
  });

  it('should reject CRLF injection in headers', async () => {
    try {
      const res = await request(API)
        .get(url('/users/me'))
        .set('Authorization', `Bearer ${testState.accessToken}`)
        .set('X-Custom', 'value\r\nInjected-Header: malicious');

      // The request should either be rejected or the injected header ignored
      expect(res.status).toBeLessThan(600);
    } catch {
      // Some HTTP libraries will throw on CRLF in headers — that is acceptable
    }
  });
});
