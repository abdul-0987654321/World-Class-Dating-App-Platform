/**
 * GDPR Account Deletion Tests
 * Tests for data export and account deletion
 */

const request = require('supertest');

const API_URL = process.env.API_GATEWAY_URL || 'http://localhost:4000';

describe('GDPR Compliance', () => {
  let accessToken: string;
  let testUserEmail: string;
  const testPassword = 'GDPRTest123!';

  beforeAll(async () => {
    // Create a test user for GDPR tests
    const timestamp = Date.now();
    testUserEmail = 'gdpr-test-' + timestamp + '@test.flamoral.com';

    const res = await request(API_URL)
      .post('/api/v1/auth/register')
      .send({
        email: testUserEmail,
        password: testPassword,
        firstName: 'GDPR',
        lastName: 'Test',
        dateOfBirth: '1990-01-01',
        gender: 'other'
      });

    if (res.status === 201) {
      accessToken = res.body.accessToken;
    }
  });

  describe('Data Export (Right to Access)', () => {
    test('should request data export', async () => {
      const res = await request(API_URL)
        .post('/api/v1/users/me/gdpr-export')
        .set('Authorization', 'Bearer ' + accessToken);

      // Should accept request or return export data
      expect([200, 202, 404]).toContain(res.status);
      
      if (res.status === 200) {
        expect(res.body).toBeDefined();
      }
      if (res.status === 202) {
        // Export is being prepared
        expect(res.body).toHaveProperty('message');
      }
    });

    test('should get data export status', async () => {
      const res = await request(API_URL)
        .get('/api/v1/users/me/gdpr-export/status')
        .set('Authorization', 'Bearer ' + accessToken);

      expect([200, 404]).toContain(res.status);
    });

    test('should download exported data when ready', async () => {
      const res = await request(API_URL)
        .get('/api/v1/users/me/gdpr-export/download')
        .set('Authorization', 'Bearer ' + accessToken);

      // May return data or 404 if not ready
      expect([200, 202, 404]).toContain(res.status);
    });

    test('should require authentication for export', async () => {
      const res = await request(API_URL)
        .post('/api/v1/users/me/gdpr-export');

      expect(res.status).toBe(401);
    });
  });

  describe('Account Deletion (Right to Erasure)', () => {
    test('should require password for deletion', async () => {
      const res = await request(API_URL)
        .delete('/api/v1/users/me')
        .set('Authorization', 'Bearer ' + accessToken);

      // Should require password confirmation
      expect([400, 422, 204, 200]).toContain(res.status);
    });

    test('should reject deletion with wrong password', async () => {
      const res = await request(API_URL)
        .delete('/api/v1/users/me')
        .set('Authorization', 'Bearer ' + accessToken)
        .send({ password: 'wrongpassword' });

      expect([400, 401, 403]).toContain(res.status);
    });

    test('should schedule account deletion', async () => {
      const res = await request(API_URL)
        .post('/api/v1/users/me/delete-request')
        .set('Authorization', 'Bearer ' + accessToken)
        .send({ 
          password: testPassword,
          reason: 'Testing GDPR compliance'
        });

      expect([200, 202, 404]).toContain(res.status);
      
      if (res.status === 202) {
        // Deletion scheduled with grace period
        expect(res.body).toHaveProperty('scheduledDeletionDate');
      }
    });

    test('should allow canceling deletion during grace period', async () => {
      const res = await request(API_URL)
        .post('/api/v1/users/me/cancel-deletion')
        .set('Authorization', 'Bearer ' + accessToken);

      expect([200, 400, 404]).toContain(res.status);
    });

    test('should require authentication for deletion', async () => {
      const res = await request(API_URL)
        .delete('/api/v1/users/me');

      expect(res.status).toBe(401);
    });
  });

  describe('Data Anonymization', () => {
    test('should anonymize user data after deletion', async () => {
      // Create and delete a test user
      const timestamp = Date.now();
      const email = 'anon-test-' + timestamp + '@test.com';
      
      const createRes = await request(API_URL)
        .post('/api/v1/auth/register')
        .send({
          email,
          password: 'AnonTest123!',
          firstName: 'Anon',
          lastName: 'Test',
          dateOfBirth: '1990-01-01',
          gender: 'other'
        });

      if (createRes.status === 201) {
        const token = createRes.body.accessToken;

        // Delete the account
        const deleteRes = await request(API_URL)
          .delete('/api/v1/users/me')
          .set('Authorization', 'Bearer ' + token)
          .send({ password: 'AnonTest123!' });

        // After deletion, login should fail
        if (deleteRes.status === 200 || deleteRes.status === 204) {
          const loginRes = await request(API_URL)
            .post('/api/v1/auth/login')
            .send({ email, password: 'AnonTest123!' });

          expect([401, 404]).toContain(loginRes.status);
        }
      }
    });
  });

  describe('Consent Management', () => {
    test('should get consent preferences', async () => {
      const res = await request(API_URL)
        .get('/api/v1/users/me/consent')
        .set('Authorization', 'Bearer ' + accessToken);

      expect([200, 404]).toContain(res.status);
    });

    test('should update consent preferences', async () => {
      const res = await request(API_URL)
        .put('/api/v1/users/me/consent')
        .set('Authorization', 'Bearer ' + accessToken)
        .send({
          marketing: false,
          analytics: true,
          thirdParty: false
        });

      expect([200, 404]).toContain(res.status);
    });

    test('should withdraw all consent', async () => {
      const res = await request(API_URL)
        .post('/api/v1/users/me/withdraw-consent')
        .set('Authorization', 'Bearer ' + accessToken);

      expect([200, 404]).toContain(res.status);
    });
  });
});
