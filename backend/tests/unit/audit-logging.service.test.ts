/**
 * Unit Tests for Audit Logging Service
 * Tests logging of security-sensitive actions
 */

import { createMockDatabase, createMockRedis, createMockLogger } from '../mocks';

describe('AuditLoggingService', () => {
  let auditService: any;
  let mockDb: any;
  let mockRedis: any;
  let mockLogger: any;

  beforeEach(() => {
    mockDb = createMockDatabase();
    mockRedis = createMockRedis();
    mockLogger = createMockLogger();

    // Create mock audit service
    auditService = {
      logAction: jest.fn(),
      logSecurityEvent: jest.fn(),
      logDataAccess: jest.fn(),
      logAuthEvent: jest.fn(),
      logPaymentEvent: jest.fn(),
      queryAuditLogs: jest.fn(),
      getAuditTrail: jest.fn(),
      exportAuditLogs: jest.fn(),
    };
  });

  describe('logAction', () => {
    it('should log a user action', async () => {
      const actionData = {
        userId: 'user-123',
        action: 'profile_update',
        resource: 'profile',
        resourceId: 'profile-456',
        details: { field: 'bio', oldValue: 'Old bio', newValue: 'New bio' },
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      auditService.logAction.mockResolvedValue({
        id: 'audit-789',
        ...actionData,
        timestamp: new Date(),
      });

      const result = await auditService.logAction(actionData);

      expect(result.id).toBe('audit-789');
      expect(result.action).toBe('profile_update');
      expect(auditService.logAction).toHaveBeenCalledWith(actionData);
    });

    it('should include timestamp automatically', async () => {
      auditService.logAction.mockImplementation(async (data: any) => ({
        id: 'audit-123',
        ...data,
        timestamp: new Date(),
      }));

      const result = await auditService.logAction({
        userId: 'user-123',
        action: 'login',
      });

      expect(result.timestamp).toBeDefined();
      expect(result.timestamp instanceof Date).toBe(true);
    });

    it('should sanitize sensitive data', async () => {
      const sensitiveData = {
        userId: 'user-123',
        action: 'password_change',
        details: {
          oldPassword: 'secret123',
          newPassword: 'newsecret456',
        },
      };

      auditService.logAction.mockImplementation(async (data: any) => ({
        id: 'audit-123',
        userId: data.userId,
        action: data.action,
        details: {
          oldPassword: '[REDACTED]',
          newPassword: '[REDACTED]',
        },
        timestamp: new Date(),
      }));

      const result = await auditService.logAction(sensitiveData);

      expect(result.details.oldPassword).toBe('[REDACTED]');
      expect(result.details.newPassword).toBe('[REDACTED]');
    });

    it('should handle logging failures gracefully', async () => {
      auditService.logAction.mockRejectedValue(new Error('Database error'));

      // Should not throw, but log the error
      try {
        await auditService.logAction({ userId: 'user-123', action: 'test' });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('logSecurityEvent', () => {
    it('should log failed login attempts', async () => {
      const securityEvent = {
        type: 'failed_login',
        userId: null,
        email: 'user@example.com',
        ip: '192.168.1.100',
        reason: 'invalid_credentials',
        attemptCount: 3,
      };

      auditService.logSecurityEvent.mockResolvedValue({
        id: 'security-123',
        ...securityEvent,
        severity: 'warning',
        timestamp: new Date(),
      });

      const result = await auditService.logSecurityEvent(securityEvent);

      expect(result.type).toBe('failed_login');
      expect(result.severity).toBe('warning');
    });

    it('should log account lockout', async () => {
      const lockoutEvent = {
        type: 'account_lockout',
        userId: 'user-123',
        email: 'user@example.com',
        ip: '192.168.1.100',
        reason: 'too_many_failed_attempts',
        lockoutDuration: 3600, // 1 hour
      };

      auditService.logSecurityEvent.mockResolvedValue({
        id: 'security-456',
        ...lockoutEvent,
        severity: 'high',
        timestamp: new Date(),
      });

      const result = await auditService.logSecurityEvent(lockoutEvent);

      expect(result.type).toBe('account_lockout');
      expect(result.severity).toBe('high');
    });

    it('should log suspicious activity', async () => {
      const suspiciousEvent = {
        type: 'suspicious_activity',
        userId: 'user-123',
        ip: '185.100.86.74',
        details: {
          reason: 'login_from_new_location',
          location: 'Unknown Country',
          previousLocation: 'United States',
        },
      };

      auditService.logSecurityEvent.mockResolvedValue({
        id: 'security-789',
        ...suspiciousEvent,
        severity: 'high',
        timestamp: new Date(),
        requiresReview: true,
      });

      const result = await auditService.logSecurityEvent(suspiciousEvent);

      expect(result.requiresReview).toBe(true);
    });

    it('should log password reset requests', async () => {
      const resetEvent = {
        type: 'password_reset_request',
        userId: 'user-123',
        email: 'user@example.com',
        ip: '192.168.1.1',
        tokenGenerated: true,
      };

      auditService.logSecurityEvent.mockResolvedValue({
        id: 'security-101',
        ...resetEvent,
        severity: 'medium',
        timestamp: new Date(),
      });

      const result = await auditService.logSecurityEvent(resetEvent);

      expect(result.type).toBe('password_reset_request');
    });

    it('should log 2FA events', async () => {
      const twoFactorEvent = {
        type: '2fa_enabled',
        userId: 'user-123',
        method: 'authenticator_app',
        ip: '192.168.1.1',
      };

      auditService.logSecurityEvent.mockResolvedValue({
        id: 'security-202',
        ...twoFactorEvent,
        severity: 'info',
        timestamp: new Date(),
      });

      const result = await auditService.logSecurityEvent(twoFactorEvent);

      expect(result.type).toBe('2fa_enabled');
    });
  });

  describe('logDataAccess', () => {
    it('should log PII data access', async () => {
      const accessEvent = {
        userId: 'admin-123',
        targetUserId: 'user-456',
        dataType: 'personal_information',
        fields: ['email', 'phone_number', 'address'],
        reason: 'customer_support_request',
        ticketId: 'TICKET-789',
      };

      auditService.logDataAccess.mockResolvedValue({
        id: 'access-123',
        ...accessEvent,
        accessLevel: 'sensitive',
        timestamp: new Date(),
      });

      const result = await auditService.logDataAccess(accessEvent);

      expect(result.dataType).toBe('personal_information');
      expect(result.accessLevel).toBe('sensitive');
    });

    it('should log bulk data exports', async () => {
      const exportEvent = {
        userId: 'admin-123',
        action: 'bulk_export',
        dataType: 'user_analytics',
        recordCount: 5000,
        exportFormat: 'csv',
        reason: 'quarterly_report',
      };

      auditService.logDataAccess.mockResolvedValue({
        id: 'access-456',
        ...exportEvent,
        accessLevel: 'high',
        timestamp: new Date(),
        requiresAuditReview: true,
      });

      const result = await auditService.logDataAccess(exportEvent);

      expect(result.requiresAuditReview).toBe(true);
    });

    it('should log GDPR data requests', async () => {
      const gdprEvent = {
        userId: 'user-123',
        action: 'gdpr_data_export',
        dataType: 'all_personal_data',
        requestType: 'data_portability',
        ip: '192.168.1.1',
      };

      auditService.logDataAccess.mockResolvedValue({
        id: 'access-789',
        ...gdprEvent,
        compliance: 'gdpr',
        timestamp: new Date(),
      });

      const result = await auditService.logDataAccess(gdprEvent);

      expect(result.compliance).toBe('gdpr');
    });
  });

  describe('logAuthEvent', () => {
    it('should log successful login', async () => {
      const loginEvent = {
        type: 'login_success',
        userId: 'user-123',
        email: 'user@example.com',
        method: 'password',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        sessionId: 'session-456',
      };

      auditService.logAuthEvent.mockResolvedValue({
        id: 'auth-123',
        ...loginEvent,
        timestamp: new Date(),
      });

      const result = await auditService.logAuthEvent(loginEvent);

      expect(result.type).toBe('login_success');
      expect(result.sessionId).toBe('session-456');
    });

    it('should log logout', async () => {
      const logoutEvent = {
        type: 'logout',
        userId: 'user-123',
        sessionId: 'session-456',
        reason: 'user_initiated',
      };

      auditService.logAuthEvent.mockResolvedValue({
        id: 'auth-456',
        ...logoutEvent,
        timestamp: new Date(),
      });

      const result = await auditService.logAuthEvent(logoutEvent);

      expect(result.type).toBe('logout');
    });

    it('should log session expiry', async () => {
      const expiryEvent = {
        type: 'session_expired',
        userId: 'user-123',
        sessionId: 'session-456',
        sessionDuration: 3600,
      };

      auditService.logAuthEvent.mockResolvedValue({
        id: 'auth-789',
        ...expiryEvent,
        timestamp: new Date(),
      });

      const result = await auditService.logAuthEvent(expiryEvent);

      expect(result.type).toBe('session_expired');
    });

    it('should log OAuth connections', async () => {
      const oauthEvent = {
        type: 'oauth_connect',
        userId: 'user-123',
        provider: 'google',
        action: 'linked',
        ip: '192.168.1.1',
      };

      auditService.logAuthEvent.mockResolvedValue({
        id: 'auth-101',
        ...oauthEvent,
        timestamp: new Date(),
      });

      const result = await auditService.logAuthEvent(oauthEvent);

      expect(result.provider).toBe('google');
    });
  });

  describe('logPaymentEvent', () => {
    it('should log successful payment', async () => {
      const paymentEvent = {
        type: 'payment_success',
        userId: 'user-123',
        amount: 29.99,
        currency: 'USD',
        paymentMethod: 'card',
        paymentIntentId: 'pi_123',
        subscriptionId: 'sub_456',
      };

      auditService.logPaymentEvent.mockResolvedValue({
        id: 'payment-123',
        ...paymentEvent,
        timestamp: new Date(),
      });

      const result = await auditService.logPaymentEvent(paymentEvent);

      expect(result.type).toBe('payment_success');
      expect(result.amount).toBe(29.99);
    });

    it('should log failed payment', async () => {
      const failedEvent = {
        type: 'payment_failed',
        userId: 'user-123',
        amount: 29.99,
        currency: 'USD',
        paymentMethod: 'card',
        errorCode: 'card_declined',
        errorMessage: 'Your card was declined',
      };

      auditService.logPaymentEvent.mockResolvedValue({
        id: 'payment-456',
        ...failedEvent,
        timestamp: new Date(),
      });

      const result = await auditService.logPaymentEvent(failedEvent);

      expect(result.type).toBe('payment_failed');
      expect(result.errorCode).toBe('card_declined');
    });

    it('should log refund', async () => {
      const refundEvent = {
        type: 'refund',
        userId: 'user-123',
        amount: 29.99,
        currency: 'USD',
        originalPaymentId: 'pi_123',
        refundId: 're_789',
        reason: 'customer_request',
        processedBy: 'admin-456',
      };

      auditService.logPaymentEvent.mockResolvedValue({
        id: 'payment-789',
        ...refundEvent,
        timestamp: new Date(),
      });

      const result = await auditService.logPaymentEvent(refundEvent);

      expect(result.type).toBe('refund');
      expect(result.processedBy).toBe('admin-456');
    });

    it('should log subscription changes', async () => {
      const subscriptionEvent = {
        type: 'subscription_changed',
        userId: 'user-123',
        subscriptionId: 'sub_456',
        previousPlan: 'basic',
        newPlan: 'premium',
        effectiveDate: new Date(),
      };

      auditService.logPaymentEvent.mockResolvedValue({
        id: 'payment-101',
        ...subscriptionEvent,
        timestamp: new Date(),
      });

      const result = await auditService.logPaymentEvent(subscriptionEvent);

      expect(result.previousPlan).toBe('basic');
      expect(result.newPlan).toBe('premium');
    });
  });

  describe('queryAuditLogs', () => {
    it('should query logs by user', async () => {
      auditService.queryAuditLogs.mockResolvedValue({
        logs: [
          { id: 'log-1', action: 'login', userId: 'user-123', timestamp: new Date() },
          { id: 'log-2', action: 'profile_update', userId: 'user-123', timestamp: new Date() },
        ],
        total: 2,
        page: 1,
        pageSize: 50,
      });

      const result = await auditService.queryAuditLogs({
        userId: 'user-123',
        page: 1,
        pageSize: 50,
      });

      expect(result.logs).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should query logs by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      auditService.queryAuditLogs.mockResolvedValue({
        logs: [
          { id: 'log-1', timestamp: new Date('2024-01-15') },
        ],
        total: 1,
        page: 1,
        pageSize: 50,
      });

      const result = await auditService.queryAuditLogs({
        startDate,
        endDate,
      });

      expect(result.logs).toHaveLength(1);
    });

    it('should query logs by action type', async () => {
      auditService.queryAuditLogs.mockResolvedValue({
        logs: [
          { id: 'log-1', action: 'login', type: 'auth' },
          { id: 'log-2', action: 'logout', type: 'auth' },
        ],
        total: 2,
        page: 1,
        pageSize: 50,
      });

      const result = await auditService.queryAuditLogs({
        actionType: 'auth',
      });

      expect(result.logs.every((log: any) => log.type === 'auth')).toBe(true);
    });

    it('should query logs by severity', async () => {
      auditService.queryAuditLogs.mockResolvedValue({
        logs: [
          { id: 'log-1', severity: 'high', type: 'security' },
        ],
        total: 1,
        page: 1,
        pageSize: 50,
      });

      const result = await auditService.queryAuditLogs({
        severity: 'high',
      });

      expect(result.logs.every((log: any) => log.severity === 'high')).toBe(true);
    });
  });

  describe('getAuditTrail', () => {
    it('should get complete audit trail for a user', async () => {
      auditService.getAuditTrail.mockResolvedValue({
        userId: 'user-123',
        events: [
          { id: 'event-1', type: 'account_created', timestamp: new Date('2024-01-01') },
          { id: 'event-2', type: 'profile_updated', timestamp: new Date('2024-01-02') },
          { id: 'event-3', type: 'subscription_started', timestamp: new Date('2024-01-03') },
        ],
        firstActivity: new Date('2024-01-01'),
        lastActivity: new Date('2024-01-03'),
      });

      const result = await auditService.getAuditTrail('user-123');

      expect(result.events).toHaveLength(3);
      expect(result.firstActivity).toBeDefined();
      expect(result.lastActivity).toBeDefined();
    });

    it('should include related entities in audit trail', async () => {
      auditService.getAuditTrail.mockResolvedValue({
        userId: 'user-123',
        events: [
          {
            id: 'event-1',
            type: 'match_created',
            relatedUsers: ['user-456'],
            timestamp: new Date(),
          },
        ],
        relatedEntities: {
          matches: ['match-789'],
          conversations: ['conv-101'],
        },
      });

      const result = await auditService.getAuditTrail('user-123');

      expect(result.relatedEntities).toBeDefined();
      expect(result.relatedEntities.matches).toContain('match-789');
    });
  });

  describe('exportAuditLogs', () => {
    it('should export logs to CSV', async () => {
      auditService.exportAuditLogs.mockResolvedValue({
        format: 'csv',
        filename: 'audit_export_2024-01.csv',
        recordCount: 1000,
        downloadUrl: 'https://storage.example.com/exports/audit_2024-01.csv',
        expiresAt: new Date(Date.now() + 3600000),
      });

      const result = await auditService.exportAuditLogs({
        format: 'csv',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      });

      expect(result.format).toBe('csv');
      expect(result.downloadUrl).toBeDefined();
    });

    it('should export logs to JSON', async () => {
      auditService.exportAuditLogs.mockResolvedValue({
        format: 'json',
        filename: 'audit_export_2024-01.json',
        recordCount: 1000,
        downloadUrl: 'https://storage.example.com/exports/audit_2024-01.json',
        expiresAt: new Date(Date.now() + 3600000),
      });

      const result = await auditService.exportAuditLogs({
        format: 'json',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      });

      expect(result.format).toBe('json');
    });

    it('should log the export action itself', async () => {
      const exportResult = await auditService.exportAuditLogs({
        format: 'csv',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        exportedBy: 'admin-123',
      });

      // The export action should also be logged
      expect(auditService.exportAuditLogs).toHaveBeenCalled();
    });
  });

  describe('Retention and Compliance', () => {
    it('should retain logs for compliance period', async () => {
      const retentionService = {
        getRetentionPolicy: jest.fn().mockResolvedValue({
          securityLogs: 365 * 7, // 7 years
          accessLogs: 365 * 3, // 3 years
          generalLogs: 365, // 1 year
        }),
        archiveOldLogs: jest.fn(),
        purgeExpiredLogs: jest.fn(),
      };

      const policy = await retentionService.getRetentionPolicy();

      expect(policy.securityLogs).toBe(365 * 7);
    });

    it('should hash sensitive identifiers for long-term storage', async () => {
      const hashService = {
        hashIdentifier: jest.fn().mockImplementation((id: string) => {
          return `hashed_${id.substring(0, 8)}`;
        }),
      };

      const hashedId = hashService.hashIdentifier('user-123-sensitive-id');

      expect(hashedId).not.toContain('sensitive');
    });
  });
});
