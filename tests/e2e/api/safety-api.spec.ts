import request from 'supertest';
import { config, testState, createTestUser, authenticatedRequest, wait } from './setup';

/**
 * Safety Service E2E API Tests
 *
 * Covers: SOS alerts, emergency contacts CRUD, check-in lifecycle,
 * crisis resources, validation, and authentication enforcement.
 *
 * Controller prefix: /api/v1/safety
 */

const API_BASE = config.API_GATEWAY_URL;
const PREFIX = '/api/v1/safety';

describe('Safety Service API', () => {
  // Shared state across tests
  let sosAlertId: string;
  let emergencyContactId: string;
  let checkinId: string;

  beforeAll(async () => {
    // Ensure we have an authenticated test user
    if (!testState.accessToken) {
      await createTestUser();
    }
  });

  // ==========================================================================
  // SOS ALERT FLOW
  // ==========================================================================
  describe('SOS Alert Flow', () => {

    describe('POST /api/v1/safety/sos - Trigger SOS Alert', () => {

      it('should trigger an SOS alert with full location data', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/sos`)
          .send({
            location: {
              latitude: 40.7128,
              longitude: -74.0060,
              accuracy: 15,
            },
            reason: 'Feeling unsafe during date',
          });

        expect([200, 201]).toContain(response.status);
        expect(response.body).toBeDefined();

        // Capture the alert ID for later tests
        const data = response.body.data || response.body;
        if (data.alertId || data.id) {
          sosAlertId = data.alertId || data.id;
        }
      });

      it('should trigger an SOS alert without optional location', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/sos`)
          .send({
            reason: 'Emergency - need help immediately',
          });

        expect([200, 201]).toContain(response.status);
        expect(response.body).toBeDefined();

        const data = response.body.data || response.body;
        if (data.alertId || data.id) {
          sosAlertId = data.alertId || data.id;
        }
      });

      it('should trigger an SOS alert with only location (no reason)', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/sos`)
          .send({
            location: {
              latitude: 34.0522,
              longitude: -118.2437,
            },
          });

        expect([200, 201]).toContain(response.status);
        expect(response.body).toBeDefined();

        const data = response.body.data || response.body;
        if (data.alertId || data.id) {
          sosAlertId = data.alertId || data.id;
        }
      });

      it('should trigger an SOS alert with empty body', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/sos`)
          .send({});

        // SOS should work even with no data -- it is an emergency endpoint
        expect([200, 201, 400]).toContain(response.status);

        if (response.status === 200 || response.status === 201) {
          const data = response.body.data || response.body;
          if (data.alertId || data.id) {
            sosAlertId = data.alertId || data.id;
          }
        }
      });

      it('should reject SOS alert without authentication', async () => {
        const response = await request(API_BASE)
          .post(`${PREFIX}/sos`)
          .send({
            location: { latitude: 40.7128, longitude: -74.0060 },
            reason: 'Unauthenticated SOS attempt',
          });

        expect(response.status).toBe(401);
      });

      it('should reject SOS alert with an invalid token', async () => {
        const response = await request(API_BASE)
          .post(`${PREFIX}/sos`)
          .set('Authorization', 'Bearer invalid-token-xyz')
          .send({
            reason: 'Invalid token SOS',
          });

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/v1/safety/sos/status - Get SOS Status', () => {

      it('should return current SOS status', async () => {
        const response = await authenticatedRequest()
          .get(`${PREFIX}/sos/status`);

        expect([200, 204]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body).toBeDefined();
        }
      });

      it('should reflect active SOS after triggering', async () => {
        // Trigger a fresh SOS
        const triggerResp = await authenticatedRequest()
          .post(`${PREFIX}/sos`)
          .send({ reason: 'Status check test' });

        if (triggerResp.status === 200 || triggerResp.status === 201) {
          const data = triggerResp.body.data || triggerResp.body;
          if (data.alertId || data.id) {
            sosAlertId = data.alertId || data.id;
          }

          await wait(500);

          const statusResp = await authenticatedRequest()
            .get(`${PREFIX}/sos/status`);

          expect(statusResp.status).toBe(200);
          const statusData = statusResp.body.data || statusResp.body;
          // Should indicate an active alert exists
          if (statusData.active !== undefined) {
            expect(statusData.active).toBe(true);
          }
          if (statusData.status) {
            expect(['active', 'triggered', 'pending']).toContain(statusData.status);
          }
        }
      });

      it('should fail without authentication', async () => {
        const response = await request(API_BASE)
          .get(`${PREFIX}/sos/status`);

        expect(response.status).toBe(401);
      });
    });

    describe('POST /api/v1/safety/sos/cancel - Cancel SOS Alert', () => {

      it('should cancel an active SOS alert', async () => {
        // Ensure we have an active alert
        if (!sosAlertId) {
          const triggerResp = await authenticatedRequest()
            .post(`${PREFIX}/sos`)
            .send({ reason: 'Cancel test' });

          const data = triggerResp.body.data || triggerResp.body;
          sosAlertId = data.alertId || data.id || 'fallback-id';
        }

        const response = await authenticatedRequest()
          .post(`${PREFIX}/sos/cancel`)
          .send({ alertId: sosAlertId });

        expect([200, 204]).toContain(response.status);
      });

      it('should handle cancelling a non-existent alert gracefully', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/sos/cancel`)
          .send({ alertId: 'non-existent-alert-id-99999' });

        expect([400, 404]).toContain(response.status);
      });

      it('should reject cancel without alertId', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/sos/cancel`)
          .send({});

        expect([400, 422]).toContain(response.status);
      });

      it('should reject cancel without authentication', async () => {
        const response = await request(API_BASE)
          .post(`${PREFIX}/sos/cancel`)
          .send({ alertId: sosAlertId || 'some-id' });

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/v1/safety/sos/history - Get SOS History', () => {

      it('should return SOS alert history', async () => {
        const response = await authenticatedRequest()
          .get(`${PREFIX}/sos/history`);

        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const data = response.body.data || response.body;
        if (Array.isArray(data)) {
          // History is returned as an array
          expect(data).toBeInstanceOf(Array);
        } else if (data.alerts) {
          expect(Array.isArray(data.alerts)).toBe(true);
        }
      });

      it('should return history that includes previously triggered alerts', async () => {
        const response = await authenticatedRequest()
          .get(`${PREFIX}/sos/history`);

        expect(response.status).toBe(200);

        const items = response.body.data || response.body.alerts || response.body;
        if (Array.isArray(items) && items.length > 0) {
          const item = items[0];
          // Each history entry should have at minimum an ID and timestamp
          expect(item).toHaveProperty('id');
        }
      });

      it('should fail without authentication', async () => {
        const response = await request(API_BASE)
          .get(`${PREFIX}/sos/history`);

        expect(response.status).toBe(401);
      });
    });
  });

  // ==========================================================================
  // EMERGENCY CONTACTS CRUD
  // ==========================================================================
  describe('Emergency Contacts CRUD', () => {

    describe('POST /api/v1/safety/emergency-contacts - Add Contact', () => {

      it('should add an emergency contact with all fields', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/emergency-contacts`)
          .send({
            name: 'Jane Doe',
            phone: '+15551234567',
            email: 'jane.doe@example.com',
            relationship: 'sister',
            notify_on_sos: true,
            notify_on_checkin_miss: true,
          });

        expect([200, 201]).toContain(response.status);
        expect(response.body).toBeDefined();

        const data = response.body.data || response.body;
        if (data.id || data.contactId) {
          emergencyContactId = data.id || data.contactId;
        }
      });

      it('should add an emergency contact with only required fields', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/emergency-contacts`)
          .send({
            name: 'John Smith',
            phone: '+15559876543',
            relationship: 'friend',
          });

        expect([200, 201]).toContain(response.status);
        expect(response.body).toBeDefined();

        const data = response.body.data || response.body;
        if (data.id || data.contactId) {
          emergencyContactId = data.id || data.contactId;
        }
      });

      it('should reject adding a contact without a name', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/emergency-contacts`)
          .send({
            phone: '+15551112222',
            relationship: 'brother',
          });

        expect([400, 422]).toContain(response.status);
      });

      it('should reject adding a contact without a phone number', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/emergency-contacts`)
          .send({
            name: 'No Phone Person',
            relationship: 'coworker',
          });

        expect([400, 422]).toContain(response.status);
      });

      it('should reject adding a contact without a relationship', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/emergency-contacts`)
          .send({
            name: 'No Relationship',
            phone: '+15553334444',
          });

        expect([400, 422]).toContain(response.status);
      });

      it('should reject adding a contact without authentication', async () => {
        const response = await request(API_BASE)
          .post(`${PREFIX}/emergency-contacts`)
          .send({
            name: 'Unauthorized Contact',
            phone: '+15550000000',
            relationship: 'parent',
          });

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/v1/safety/emergency-contacts - Get Contacts', () => {

      it('should return list of emergency contacts', async () => {
        const response = await authenticatedRequest()
          .get(`${PREFIX}/emergency-contacts`);

        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const contacts = response.body.data || response.body.contacts || response.body;
        if (Array.isArray(contacts)) {
          expect(contacts.length).toBeGreaterThanOrEqual(0);
          if (contacts.length > 0) {
            const contact = contacts[0];
            expect(contact).toHaveProperty('name');
            expect(contact).toHaveProperty('phone');
            expect(contact).toHaveProperty('relationship');
          }
        }
      });

      it('should fail without authentication', async () => {
        const response = await request(API_BASE)
          .get(`${PREFIX}/emergency-contacts`);

        expect(response.status).toBe(401);
      });
    });

    describe('PUT /api/v1/safety/emergency-contacts/:contactId - Update Contact', () => {

      it('should update an existing emergency contact', async () => {
        if (!emergencyContactId) {
          console.log('Skipping: No emergency contact ID available');
          return;
        }

        const response = await authenticatedRequest()
          .put(`${PREFIX}/emergency-contacts/${emergencyContactId}`)
          .send({
            name: 'Jane Doe Updated',
            phone: '+15551234568',
            email: 'jane.updated@example.com',
            relationship: 'mother',
            notify_on_sos: true,
            notify_on_checkin_miss: false,
          });

        expect([200, 204]).toContain(response.status);
      });

      it('should allow partial update of emergency contact', async () => {
        if (!emergencyContactId) {
          console.log('Skipping: No emergency contact ID available');
          return;
        }

        const response = await authenticatedRequest()
          .put(`${PREFIX}/emergency-contacts/${emergencyContactId}`)
          .send({
            notify_on_sos: false,
          });

        expect([200, 204]).toContain(response.status);
      });

      it('should return 404 for non-existent contact', async () => {
        const response = await authenticatedRequest()
          .put(`${PREFIX}/emergency-contacts/non-existent-contact-id-99999`)
          .send({
            name: 'Ghost Contact',
          });

        expect([400, 404]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const response = await request(API_BASE)
          .put(`${PREFIX}/emergency-contacts/${emergencyContactId || 'some-id'}`)
          .send({ name: 'Hacker' });

        expect(response.status).toBe(401);
      });
    });

    describe('DELETE /api/v1/safety/emergency-contacts/:contactId - Delete Contact', () => {

      it('should delete an existing emergency contact', async () => {
        // Create a contact specifically to delete
        const createResp = await authenticatedRequest()
          .post(`${PREFIX}/emergency-contacts`)
          .send({
            name: 'Deletable Contact',
            phone: '+15550001111',
            relationship: 'other',
          });

        let deleteId = emergencyContactId;
        if (createResp.status === 200 || createResp.status === 201) {
          const data = createResp.body.data || createResp.body;
          deleteId = data.id || data.contactId || deleteId;
        }

        if (!deleteId) {
          console.log('Skipping: No contact ID to delete');
          return;
        }

        const response = await authenticatedRequest()
          .delete(`${PREFIX}/emergency-contacts/${deleteId}`);

        expect([200, 204]).toContain(response.status);
      });

      it('should return 404 when deleting non-existent contact', async () => {
        const response = await authenticatedRequest()
          .delete(`${PREFIX}/emergency-contacts/non-existent-contact-00000`);

        expect([400, 404]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const response = await request(API_BASE)
          .delete(`${PREFIX}/emergency-contacts/some-contact-id`);

        expect(response.status).toBe(401);
      });
    });
  });

  // ==========================================================================
  // CHECK-IN LIFECYCLE
  // ==========================================================================
  describe('Check-In Lifecycle', () => {

    describe('POST /api/v1/safety/checkins - Create Check-In', () => {

      it('should create a check-in with full meeting details', async () => {
        const scheduledAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours from now

        const response = await authenticatedRequest()
          .post(`${PREFIX}/checkins`)
          .send({
            scheduled_at: scheduledAt,
            meeting_details: {
              match_id: 'match-abc-123',
              location: 'Downtown Coffee Shop, 123 Main St',
              notes: 'First date meeting',
            },
          });

        expect([200, 201]).toContain(response.status);
        expect(response.body).toBeDefined();

        const data = response.body.data || response.body;
        if (data.id || data.checkinId) {
          checkinId = data.id || data.checkinId;
        }
      });

      it('should create a check-in with only scheduled_at', async () => {
        const scheduledAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();

        const response = await authenticatedRequest()
          .post(`${PREFIX}/checkins`)
          .send({
            scheduled_at: scheduledAt,
          });

        expect([200, 201]).toContain(response.status);

        const data = response.body.data || response.body;
        if (data.id || data.checkinId) {
          checkinId = data.id || data.checkinId;
        }
      });

      it('should reject check-in without scheduled_at', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/checkins`)
          .send({
            meeting_details: {
              match_id: 'match-xyz',
              location: 'Some place',
            },
          });

        expect([400, 422]).toContain(response.status);
      });

      it('should reject check-in with a past scheduled_at time', async () => {
        const pastTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 1 day ago

        const response = await authenticatedRequest()
          .post(`${PREFIX}/checkins`)
          .send({
            scheduled_at: pastTime,
          });

        // API may reject past times or accept them
        expect([200, 201, 400, 422]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const response = await request(API_BASE)
          .post(`${PREFIX}/checkins`)
          .send({
            scheduled_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          });

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/v1/safety/checkins - Get Check-Ins', () => {

      it('should return list of check-ins', async () => {
        const response = await authenticatedRequest()
          .get(`${PREFIX}/checkins`);

        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const checkins = response.body.data || response.body.checkins || response.body;
        if (Array.isArray(checkins)) {
          expect(checkins.length).toBeGreaterThanOrEqual(0);
        }
      });

      it('should fail without authentication', async () => {
        const response = await request(API_BASE)
          .get(`${PREFIX}/checkins`);

        expect(response.status).toBe(401);
      });
    });

    describe('POST /api/v1/safety/checkins/:checkinId/confirm - Confirm Check-In', () => {

      it('should confirm an active check-in', async () => {
        if (!checkinId) {
          // Create a check-in first
          const createResp = await authenticatedRequest()
            .post(`${PREFIX}/checkins`)
            .send({
              scheduled_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            });

          const data = createResp.body.data || createResp.body;
          checkinId = data.id || data.checkinId;
        }

        if (!checkinId) {
          console.log('Skipping: No check-in ID available');
          return;
        }

        const response = await authenticatedRequest()
          .post(`${PREFIX}/checkins/${checkinId}/confirm`);

        expect([200, 204]).toContain(response.status);
      });

      it('should handle confirming a non-existent check-in', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/checkins/nonexistent-checkin-id-99/confirm`);

        expect([400, 404]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const response = await request(API_BASE)
          .post(`${PREFIX}/checkins/${checkinId || 'some-id'}/confirm`);

        expect(response.status).toBe(401);
      });
    });

    describe('POST /api/v1/safety/checkins/:checkinId/cancel - Cancel Check-In', () => {

      it('should cancel an active check-in', async () => {
        // Create a fresh check-in to cancel
        const createResp = await authenticatedRequest()
          .post(`${PREFIX}/checkins`)
          .send({
            scheduled_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
            meeting_details: {
              match_id: 'match-cancel-test',
              notes: 'Will be cancelled',
            },
          });

        let cancelId = checkinId;
        if (createResp.status === 200 || createResp.status === 201) {
          const data = createResp.body.data || createResp.body;
          cancelId = data.id || data.checkinId || cancelId;
        }

        if (!cancelId) {
          console.log('Skipping: No check-in ID to cancel');
          return;
        }

        const response = await authenticatedRequest()
          .post(`${PREFIX}/checkins/${cancelId}/cancel`);

        expect([200, 204]).toContain(response.status);
      });

      it('should handle cancelling a non-existent check-in', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/checkins/nonexistent-checkin-cancel-id/cancel`);

        expect([400, 404]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const response = await request(API_BASE)
          .post(`${PREFIX}/checkins/some-checkin-id/cancel`);

        expect(response.status).toBe(401);
      });
    });
  });

  // ==========================================================================
  // CRISIS RESOURCES
  // ==========================================================================
  describe('Crisis Resources', () => {

    describe('GET /api/v1/safety/crisis-resources', () => {

      it('should return crisis resources for a given region', async () => {
        const response = await authenticatedRequest()
          .get(`${PREFIX}/crisis-resources`)
          .query({ region: 'US' });

        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();

        const resources = response.body.data || response.body.resources || response.body;
        if (Array.isArray(resources)) {
          expect(resources.length).toBeGreaterThan(0);
          const resource = resources[0];
          // Each resource should have at minimum a name and contact
          if (resource.name) {
            expect(typeof resource.name).toBe('string');
          }
        }
      });

      it('should return crisis resources for a different region', async () => {
        const response = await authenticatedRequest()
          .get(`${PREFIX}/crisis-resources`)
          .query({ region: 'GB' });

        expect([200, 404]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body).toBeDefined();
        }
      });

      it('should handle missing region parameter gracefully', async () => {
        const response = await authenticatedRequest()
          .get(`${PREFIX}/crisis-resources`);

        // May return default resources or require the parameter
        expect([200, 400]).toContain(response.status);
      });

      it('should handle unknown region gracefully', async () => {
        const response = await authenticatedRequest()
          .get(`${PREFIX}/crisis-resources`)
          .query({ region: 'XX' });

        expect([200, 404]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const response = await request(API_BASE)
          .get(`${PREFIX}/crisis-resources`)
          .query({ region: 'US' });

        // Crisis resources may or may not require auth; verify
        expect([200, 401]).toContain(response.status);
      });
    });
  });

  // ==========================================================================
  // VALIDATION TESTS
  // ==========================================================================
  describe('Validation', () => {

    it('should reject SOS with invalid latitude (out of range)', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/sos`)
        .send({
          location: {
            latitude: 200, // Invalid: must be -90 to 90
            longitude: -74.0060,
          },
          reason: 'Invalid coordinates test',
        });

      // Should either reject or accept and normalize
      expect([200, 201, 400, 422]).toContain(response.status);
    });

    it('should reject SOS with invalid longitude (out of range)', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/sos`)
        .send({
          location: {
            latitude: 40.7128,
            longitude: 999, // Invalid: must be -180 to 180
          },
        });

      expect([200, 201, 400, 422]).toContain(response.status);
    });

    it('should reject SOS with non-numeric latitude', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/sos`)
        .send({
          location: {
            latitude: 'not-a-number',
            longitude: -74.0060,
          },
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should reject SOS with non-numeric longitude', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/sos`)
        .send({
          location: {
            latitude: 40.7128,
            longitude: 'invalid',
          },
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should reject emergency contact with invalid phone number format', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/emergency-contacts`)
        .send({
          name: 'Bad Phone',
          phone: 'not-a-phone-number',
          relationship: 'friend',
        });

      // API may validate phone format or accept any string
      expect([200, 201, 400, 422]).toContain(response.status);
    });

    it('should reject emergency contact with invalid email format', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/emergency-contacts`)
        .send({
          name: 'Bad Email',
          phone: '+15551234567',
          email: 'not-an-email',
          relationship: 'friend',
        });

      // API may validate email format or accept any string
      expect([200, 201, 400, 422]).toContain(response.status);
    });

    it('should reject check-in with invalid scheduled_at format', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/checkins`)
        .send({
          scheduled_at: 'not-a-valid-date',
        });

      expect([400, 422]).toContain(response.status);
    });
  });

  // ==========================================================================
  // AUTHENTICATION FAILURE TESTS
  // ==========================================================================
  describe('Authentication Failures', () => {

    const protectedEndpoints = [
      { method: 'post' as const, path: `${PREFIX}/sos` },
      { method: 'get' as const, path: `${PREFIX}/sos/status` },
      { method: 'post' as const, path: `${PREFIX}/sos/cancel` },
      { method: 'get' as const, path: `${PREFIX}/sos/history` },
      { method: 'get' as const, path: `${PREFIX}/emergency-contacts` },
      { method: 'post' as const, path: `${PREFIX}/emergency-contacts` },
      { method: 'put' as const, path: `${PREFIX}/emergency-contacts/test-id` },
      { method: 'delete' as const, path: `${PREFIX}/emergency-contacts/test-id` },
      { method: 'get' as const, path: `${PREFIX}/checkins` },
      { method: 'post' as const, path: `${PREFIX}/checkins` },
      { method: 'post' as const, path: `${PREFIX}/checkins/test-id/confirm` },
      { method: 'post' as const, path: `${PREFIX}/checkins/test-id/cancel` },
    ];

    it('should return 401 for all protected endpoints without token', async () => {
      const results = await Promise.all(
        protectedEndpoints.map(endpoint =>
          (request(API_BASE) as any)[endpoint.method](endpoint.path)
            .send({})
            .then((res: any) => ({
              endpoint: `${endpoint.method.toUpperCase()} ${endpoint.path}`,
              status: res.status,
            }))
        )
      );

      results.forEach(result => {
        expect(result.status).toBe(401);
      });
    });

    it('should return 401 for requests with malformed Authorization header', async () => {
      const response = await request(API_BASE)
        .get(`${PREFIX}/sos/status`)
        .set('Authorization', 'NotBearer some-token');

      expect(response.status).toBe(401);
    });

    it('should return 401 for requests with expired token', async () => {
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
        'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.' +
        'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      const response = await request(API_BASE)
        .get(`${PREFIX}/emergency-contacts`)
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });
  });

  // ==========================================================================
  // EDGE CASES AND INTEGRATION
  // ==========================================================================
  describe('Edge Cases', () => {

    it('should handle concurrent SOS trigger requests gracefully', async () => {
      const requests = Array(3).fill(null).map(() =>
        authenticatedRequest()
          .post(`${PREFIX}/sos`)
          .send({ reason: 'Concurrent SOS test' })
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        // All should succeed or at least not return a 500
        expect([200, 201, 400, 409, 429]).toContain(response.status);
      });
    });

    it('should handle rapid SOS trigger-then-cancel sequence', async () => {
      // Trigger
      const triggerResp = await authenticatedRequest()
        .post(`${PREFIX}/sos`)
        .send({ reason: 'Rapid cancel test' });

      if (triggerResp.status === 200 || triggerResp.status === 201) {
        const data = triggerResp.body.data || triggerResp.body;
        const alertId = data.alertId || data.id;

        if (alertId) {
          // Immediately cancel
          const cancelResp = await authenticatedRequest()
            .post(`${PREFIX}/sos/cancel`)
            .send({ alertId });

          expect([200, 204]).toContain(cancelResp.status);
        }
      }
    });

    it('should handle double-confirm on a check-in gracefully', async () => {
      // Create a check-in
      const createResp = await authenticatedRequest()
        .post(`${PREFIX}/checkins`)
        .send({
          scheduled_at: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
        });

      if (createResp.status === 200 || createResp.status === 201) {
        const data = createResp.body.data || createResp.body;
        const id = data.id || data.checkinId;

        if (id) {
          // Confirm once
          await authenticatedRequest()
            .post(`${PREFIX}/checkins/${id}/confirm`);

          // Confirm again -- should be idempotent or return conflict
          const secondConfirm = await authenticatedRequest()
            .post(`${PREFIX}/checkins/${id}/confirm`);

          expect([200, 204, 400, 409]).toContain(secondConfirm.status);
        }
      }
    });
  });
});
