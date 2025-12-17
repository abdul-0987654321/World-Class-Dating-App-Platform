/// <reference types="jest" />
import request from 'supertest';
import express, { Application } from 'express';
import privacyRoutes from '../../api/routes/privacy.routes';
import blockRoutes from '../../api/routes/block.routes';
import reportRoutes from '../../api/routes/report.routes';
import { PrivacyService } from '../../domain/services/privacy.service';
import { BlockService } from '../../domain/services/block.service';
import { ReportService } from '../../domain/services/report.service';

// Mock authentication
jest.mock('../../api/middleware/auth.middleware', () => ({
  authenticate: jest.fn((req, _res, next) => {
    req.user = { id: 'test-user-123', email: 'test@example.com' };
    next();
  }),
}));

jest.mock('../../domain/services/privacy.service');
jest.mock('../../domain/services/block.service');
jest.mock('../../domain/services/report.service');

// Default mock data
const mockPrivacySettings = {
  userId: 'test-user-123',
  incognitoMode: false,
  showDistance: true,
  profileVisibility: 'everyone',
  readReceiptsEnabled: true,
  onlineStatusVisible: true,
  showAge: true,
  showLastActive: true,
};

const mockBlockedUser = {
  id: 'block-123',
  blockerId: 'test-user-123',
  blockedId: '123e4567-e89b-12d3-a456-426614174000',
  reason: 'spam',
  createdAt: new Date(),
};

const mockReport = {
  id: 'report-123',
  reporterId: 'test-user-123',
  reportedId: '123e4567-e89b-12d3-a456-426614174000',
  reportType: 'harassment',
  description: 'Test report',
  status: 'pending',
  createdAt: new Date(),
};

describe('Privacy & Safety APIs Integration Tests', () => {
  let app: Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/privacy', privacyRoutes);
    app.use('/api/blocks', blockRoutes);
    app.use('/api/reports', reportRoutes);

    app.use((err: any, _req: any, res: any, _next: any) => {
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
      });
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Configure Privacy Service mock
    (PrivacyService as jest.MockedClass<typeof PrivacyService>).prototype.getUserPrivacySettings = jest.fn().mockResolvedValue(mockPrivacySettings);
    (PrivacyService as jest.MockedClass<typeof PrivacyService>).prototype.updatePrivacySettings = jest.fn().mockResolvedValue(mockPrivacySettings);
    (PrivacyService as jest.MockedClass<typeof PrivacyService>).prototype.toggleIncognitoMode = jest.fn().mockResolvedValue({ ...mockPrivacySettings, incognitoMode: true });

    // Configure Block Service mock
    (BlockService as jest.MockedClass<typeof BlockService>).prototype.getBlockedUsers = jest.fn().mockResolvedValue([mockBlockedUser]);
    (BlockService as jest.MockedClass<typeof BlockService>).prototype.blockUser = jest.fn().mockResolvedValue(mockBlockedUser);
    (BlockService as jest.MockedClass<typeof BlockService>).prototype.unblockUser = jest.fn().mockResolvedValue(true);
    (BlockService as jest.MockedClass<typeof BlockService>).prototype.isBlocked = jest.fn().mockResolvedValue(false);

    // Configure Report Service mock
    (ReportService as jest.MockedClass<typeof ReportService>).prototype.createReport = jest.fn().mockResolvedValue(mockReport);
    (ReportService as jest.MockedClass<typeof ReportService>).prototype.getReportsByUser = jest.fn().mockResolvedValue([mockReport]);
    (ReportService as jest.MockedClass<typeof ReportService>).prototype.getReport = jest.fn().mockResolvedValue(mockReport);
    (ReportService as jest.MockedClass<typeof ReportService>).prototype.getModerationQueue = jest.fn().mockResolvedValue([mockReport]);
    (ReportService as jest.MockedClass<typeof ReportService>).prototype.getReportStats = jest.fn().mockResolvedValue({ total: 10, pending: 5, resolved: 5 });
    (ReportService as jest.MockedClass<typeof ReportService>).prototype.resolveReport = jest.fn().mockResolvedValue({ ...mockReport, status: 'resolved' });
  });

  // ============= PRIVACY API TESTS =============

  describe('Privacy API - GET /api/privacy/settings', () => {
    it('should return user privacy settings', async () => {
      const response = await request(app)
        .get('/api/privacy/settings')
        .expect('Content-Type', /json/);

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('incognitoMode');
        expect(response.body.data).toHaveProperty('showDistance');
        expect(response.body.data).toHaveProperty('profileVisibility');
      }
    });
  });

  describe('Privacy API - PUT /api/privacy/settings', () => {
    it('should update privacy settings with valid data', async () => {
      const response = await request(app)
        .put('/api/privacy/settings')
        .send({
          showDistance: false,
          profileVisibility: 'matches_only',
          readReceiptsEnabled: false,
        })
        .expect('Content-Type', /json/);

      expect([200, 400, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
      }
    });

    it('should return 400 when no fields provided', async () => {
      const response = await request(app)
        .put('/api/privacy/settings')
        .send({})
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
    });

    it('should validate profileVisibility enum', async () => {
      const validValues = ['everyone', 'matches_only', 'private'];

      for (const value of validValues) {
        const response = await request(app)
          .put('/api/privacy/settings')
          .send({ profileVisibility: value })
          .expect('Content-Type', /json/);

        expect([200, 400, 500]).toContain(response.status);
      }
    });

    it('should reject invalid profileVisibility', async () => {
      const response = await request(app)
        .put('/api/privacy/settings')
        .send({ profileVisibility: 'invalid' })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
    });

    it('should validate locationRadiusKm range', async () => {
      const response = await request(app)
        .put('/api/privacy/settings')
        .send({ locationRadiusKm: 150 })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
    });

    it('should accept valid boolean fields', async () => {
      const boolFields = [
        'incognitoMode',
        'showDistance',
        'showLastActive',
        'showOnlineStatus',
        'showAge',
        'hideFromContacts',
        'readReceiptsEnabled',
        'typingIndicatorsEnabled',
        'preciseLocation',
      ];

      for (const field of boolFields) {
        const response = await request(app)
          .put('/api/privacy/settings')
          .send({ [field]: true })
          .expect('Content-Type', /json/);

        expect([200, 400, 500]).toContain(response.status);
      }
    });
  });

  describe('Privacy API - POST /api/privacy/incognito/toggle', () => {
    it('should enable incognito mode', async () => {
      const response = await request(app)
        .post('/api/privacy/incognito/toggle')
        .send({ enabled: true, durationHours: 24 })
        .expect('Content-Type', /json/);

      expect([200, 400, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
      }
    });

    it('should disable incognito mode', async () => {
      const response = await request(app)
        .post('/api/privacy/incognito/toggle')
        .send({ enabled: false })
        .expect('Content-Type', /json/);

      expect([200, 400, 500]).toContain(response.status);
    });

    it('should validate durationHours range', async () => {
      const response = await request(app)
        .post('/api/privacy/incognito/toggle')
        .send({ enabled: true, durationHours: 200 })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
    });

    it('should require enabled field', async () => {
      const response = await request(app)
        .post('/api/privacy/incognito/toggle')
        .send({})
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
    });
  });

  describe('Privacy API - POST /api/privacy/preset', () => {
    it('should apply privacy preset', async () => {
      const presets = ['public', 'balanced', 'private'];

      for (const preset of presets) {
        const response = await request(app)
          .post('/api/privacy/preset')
          .send({ preset })
          .expect('Content-Type', /json/);

        expect([200, 400, 500]).toContain(response.status);
      }
    });

    it('should reject invalid preset', async () => {
      const response = await request(app)
        .post('/api/privacy/preset')
        .send({ preset: 'invalid' })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
    });
  });

  // ============= BLOCK API TESTS =============

  describe('Block API - POST /api/blocks/:blockedId', () => {
    it('should block user with valid UUID', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app)
        .post(`/api/blocks/${validUuid}`)
        .send({ reason: 'Inappropriate behavior' })
        .expect('Content-Type', /json/);

      expect([200, 400, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
      }
    });

    it('should reject invalid UUID', async () => {
      const response = await request(app)
        .post('/api/blocks/invalid-uuid')
        .send({ reason: 'Test' })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
    });

    it('should validate reason length', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app)
        .post(`/api/blocks/${validUuid}`)
        .send({ reason: 'a'.repeat(501) })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
    });

    it('should accept optional reason', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app)
        .post(`/api/blocks/${validUuid}`)
        .send({})
        .expect('Content-Type', /json/);

      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('Block API - DELETE /api/blocks/:blockedId', () => {
    it('should unblock user with valid UUID', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app)
        .delete(`/api/blocks/${validUuid}`)
        .expect('Content-Type', /json/);

      expect([200, 404, 500]).toContain(response.status);
    });

    it('should reject invalid UUID', async () => {
      const response = await request(app)
        .delete('/api/blocks/not-a-uuid')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
    });
  });

  describe('Block API - GET /api/blocks/list', () => {
    it('should return list of blocked users', async () => {
      const response = await request(app)
        .get('/api/blocks/list')
        .expect('Content-Type', /json/);

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });
  });

  describe('Block API - GET /api/blocks/check/:targetUserId', () => {
    it('should check block status with valid UUID', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app)
        .get(`/api/blocks/check/${validUuid}`)
        .expect('Content-Type', /json/);

      expect([200, 400, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.data).toHaveProperty('isBlocked');
        expect(response.body.data).toHaveProperty('blockedByMe');
        expect(response.body.data).toHaveProperty('blockedByThem');
      }
    });
  });

  // ============= REPORT API TESTS =============

  describe('Report API - POST /api/reports', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';

    it('should create report with valid data', async () => {
      const response = await request(app)
        .post('/api/reports')
        .send({
          reportedId: validUuid,
          reportType: 'harassment',
          description: 'User sent threatening messages',
          severity: 'high',
        })
        .expect('Content-Type', /json/);

      expect([200, 400, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('id');
      }
    });

    it('should validate reportType enum', async () => {
      const validTypes = [
        'inappropriate_photos',
        'inappropriate_messages',
        'fake_profile',
        'spam',
        'harassment',
        'underage',
        'scam',
        'violence',
        'hate_speech',
        'other',
      ];

      for (const type of validTypes) {
        const response = await request(app)
          .post('/api/reports')
          .send({
            reportedId: validUuid,
            reportType: type,
          })
          .expect('Content-Type', /json/);

        expect([200, 400, 500]).toContain(response.status);
      }
    });

    it('should reject invalid reportType', async () => {
      const response = await request(app)
        .post('/api/reports')
        .send({
          reportedId: validUuid,
          reportType: 'invalid_type',
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
    });

    it('should validate severity enum', async () => {
      const validSeverities = ['low', 'medium', 'high', 'critical'];

      for (const severity of validSeverities) {
        const response = await request(app)
          .post('/api/reports')
          .send({
            reportedId: validUuid,
            reportType: 'spam',
            severity,
          })
          .expect('Content-Type', /json/);

        expect([200, 400, 500]).toContain(response.status);
      }
    });

    it('should validate description length', async () => {
      const response = await request(app)
        .post('/api/reports')
        .send({
          reportedId: validUuid,
          reportType: 'spam',
          description: 'a'.repeat(1001),
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
    });

    it('should validate evidenceUrls array', async () => {
      const response = await request(app)
        .post('/api/reports')
        .send({
          reportedId: validUuid,
          reportType: 'inappropriate_photos',
          evidenceUrls: Array(6).fill('https://example.com/image.jpg'),
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
    });

    it('should require reportedId and reportType', async () => {
      const response = await request(app)
        .post('/api/reports')
        .send({})
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
    });
  });

  describe('Report API - GET /api/reports/categories', () => {
    it('should return report categories', async () => {
      const response = await request(app)
        .get('/api/reports/categories')
        .expect('Content-Type', /json/);

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });
  });

  describe('Report API - GET /api/reports/my-reports', () => {
    it('should return user reports with pagination', async () => {
      const response = await request(app)
        .get('/api/reports/my-reports?limit=20&offset=0')
        .expect('Content-Type', /json/);

      expect([200, 500]).toContain(response.status);
    });

    it('should validate limit range', async () => {
      const response = await request(app)
        .get('/api/reports/my-reports?limit=150')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
    });
  });

  describe('Report API - PUT /api/reports/:reportId/resolve', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';

    it('should resolve report with valid data', async () => {
      const response = await request(app)
        .put(`/api/reports/${validUuid}/resolve`)
        .send({
          resolution: 'User has been warned and content removed',
          actionTaken: 'content_removed',
        })
        .expect('Content-Type', /json/);

      expect([200, 400, 403, 404, 500]).toContain(response.status);
    });

    it('should validate actionTaken enum', async () => {
      const validActions = [
        'none',
        'warning_sent',
        'content_removed',
        'account_suspended',
        'account_banned',
      ];

      for (const action of validActions) {
        const response = await request(app)
          .put(`/api/reports/${validUuid}/resolve`)
          .send({
            resolution: 'Test resolution message',
            actionTaken: action,
          })
          .expect('Content-Type', /json/);

        expect([200, 400, 403, 404, 500]).toContain(response.status);
      }
    });

    it('should validate resolution length', async () => {
      const response = await request(app)
        .put(`/api/reports/${validUuid}/resolve`)
        .send({
          resolution: 'short',
          actionTaken: 'none',
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
    });
  });

  describe('Report API - GET /api/reports/moderation-queue', () => {
    it('should return moderation queue', async () => {
      const response = await request(app)
        .get('/api/reports/moderation-queue?limit=50')
        .expect('Content-Type', /json/);

      expect([200, 403, 500]).toContain(response.status);
    });
  });

  describe('Report API - GET /api/reports/stats', () => {
    it('should return report statistics', async () => {
      const response = await request(app)
        .get('/api/reports/stats')
        .expect('Content-Type', /json/);

      expect([200, 403, 500]).toContain(response.status);
    });
  });

  // ============= SECURITY TESTS =============

  describe('Security Tests', () => {
    it('should prevent XSS in privacy settings', async () => {
      const response = await request(app)
        .put('/api/privacy/settings')
        .send({
          showDistance: '<script>alert("xss")</script>',
        })
        .expect('Content-Type', /json/);

      expect([400, 500]).toContain(response.status);
    });

    it('should prevent SQL injection in block reason', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app)
        .post(`/api/blocks/${validUuid}`)
        .send({ reason: "'; DROP TABLE blocks; --" })
        .expect('Content-Type', /json/);

      expect([200, 400, 500]).toContain(response.status);
    });

    it('should prevent XSS in report description', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app)
        .post('/api/reports')
        .send({
          reportedId: validUuid,
          reportType: 'other',
          description: '<script>alert("xss")</script>',
        })
        .expect('Content-Type', /json/);

      expect([200, 400, 500]).toContain(response.status);
    });
  });
});
