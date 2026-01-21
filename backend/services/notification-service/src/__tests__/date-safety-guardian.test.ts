/**
 * Date Safety Guardian Service Tests
 */

import {
  DateSafetyGuardianService,
  DateSessionStatus,
  AlertType,
} from '../services/date-safety-guardian.service';
import { SNSSMSService } from '../services/sns-sms.service';

// Mock the SNS SMS Service
const mockSendSMS = jest.fn();

const mockSMSService = {
  sendSMS: mockSendSMS,
  sendVerificationCode: jest.fn(),
  sendSecurityAlert: jest.fn(),
  isOptedOut: jest.fn(),
} as unknown as SNSSMSService;

describe('DateSafetyGuardianService', () => {
  let service: DateSafetyGuardianService;

  beforeEach(() => {
    // Reset mocks and restore implementations before each test
    jest.clearAllMocks();
    mockSendSMS.mockResolvedValue({ success: true, messageId: 'mock-msg-id' });
    mockSMSService.sendVerificationCode = jest.fn().mockResolvedValue({ success: true });
    mockSMSService.sendSecurityAlert = jest.fn().mockResolvedValue({ success: true });
    mockSMSService.isOptedOut = jest.fn().mockResolvedValue(false);
    // Create service with mock SMS service
    service = new DateSafetyGuardianService(mockSMSService);
  });

  describe('Trusted Contacts', () => {
    const userId = 'user-123';

    it('should add a trusted contact', async () => {
      const contact = await service.addTrustedContact(userId, {
        name: 'Mom',
        phone: '+1234567890',
        email: 'mom@example.com',
        relationship: 'family',
        priority: 1,
      });

      expect(contact.id).toBeDefined();
      expect(contact.userId).toBe(userId);
      expect(contact.name).toBe('Mom');
      expect(contact.isVerified).toBe(false);
    });

    it('should get all trusted contacts for a user', async () => {
      await service.addTrustedContact(userId, {
        name: 'Mom',
        phone: '+1234567890',
        relationship: 'family',
        priority: 1,
      });
      await service.addTrustedContact(userId, {
        name: 'Best Friend',
        phone: '+0987654321',
        relationship: 'friend',
        priority: 2,
      });

      const contacts = service.getTrustedContacts(userId);

      expect(contacts.length).toBe(2);
      expect(contacts[0].name).toBe('Mom');
      expect(contacts[1].name).toBe('Best Friend');
    });

    it('should not allow more than 5 trusted contacts', async () => {
      for (let i = 1; i <= 5; i++) {
        await service.addTrustedContact(userId, {
          name: 'Contact ' + i,
          phone: '+123456789' + i,
          relationship: 'friend',
          priority: i,
        });
      }

      await expect(
        service.addTrustedContact(userId, {
          name: 'Contact 6',
          phone: '+1234567896',
          relationship: 'friend',
          priority: 6,
        })
      ).rejects.toThrow('Maximum trusted contacts limit reached');
    });

    it('should remove a trusted contact', async () => {
      const contact = await service.addTrustedContact(userId, {
        name: 'Friend',
        phone: '+1234567890',
        relationship: 'friend',
        priority: 1,
      });

      expect(service.getTrustedContacts(userId).length).toBe(1);

      const removed = service.removeTrustedContact(userId, contact.id);

      expect(removed).toBe(true);
      expect(service.getTrustedContacts(userId).length).toBe(0);
    });

    it('should verify a trusted contact', async () => {
      const contact = await service.addTrustedContact(userId, {
        name: 'Friend',
        phone: '+1234567890',
        relationship: 'friend',
        priority: 1,
      });

      expect(contact.isVerified).toBe(false);

      const verified = service.verifyContact(userId, contact.id, 'ABC123');

      expect(verified).toBe(true);

      const contacts = service.getTrustedContacts(userId);
      expect(contacts[0].isVerified).toBe(true);
      expect(contacts[0].verifiedAt).toBeDefined();
    });
  });

  describe('Date Sessions', () => {
    const userId = 'user-123';
    const matchId = 'match-456';
    const matchName = 'John';

    it('should create a date session', () => {
      const session = service.createDateSession(
        userId,
        matchId,
        matchName,
        new Date(Date.now() + 3600000), // 1 hour from now
        {
          name: 'Coffee Shop',
          address: '123 Main St',
          type: 'cafe',
        }
      );

      expect(session.id).toBeDefined();
      expect(session.userId).toBe(userId);
      expect(session.matchId).toBe(matchId);
      expect(session.status).toBe(DateSessionStatus.SCHEDULED);
      expect(session.venue?.name).toBe('Coffee Shop');
    });

    it('should not allow multiple active sessions', () => {
      service.createDateSession(userId, matchId, matchName, new Date());
      const session = service.getActiveSession(userId);
      if (session) {
        service.startDateSession(session.id);
      }

      expect(() => {
        service.createDateSession(userId, 'match-789', 'Jane', new Date());
      }).toThrow('An active date session already exists');
    });

    it('should start a date session', async () => {
      const session = service.createDateSession(userId, matchId, matchName, new Date());

      const started = await service.startDateSession(session.id);

      expect(started.status).toBe(DateSessionStatus.IN_PROGRESS);
      expect(started.startedAt).toBeDefined();
      expect(started.lastCheckInAt).toBeDefined();
    });

    it('should handle check-ins', async () => {
      const session = service.createDateSession(userId, matchId, matchName, new Date());
      await service.startDateSession(session.id);

      const result = await service.checkIn(session.id, 5, 'Going great!');

      expect(result.success).toBe(true);
      expect(result.nextCheckInAt).toBeDefined();
      expect(result.message).toContain('Check-in successful');
    });

    it('should end a date session safely', async () => {
      const session = service.createDateSession(userId, matchId, matchName, new Date());
      await service.startDateSession(session.id);

      const ended = await service.endDateSession(session.id, 5);

      expect(ended.status).toBe(DateSessionStatus.COMPLETED_SAFE);
      expect(ended.endedAt).toBeDefined();
      expect(ended.safetyRating).toBe(5);
    });

    it('should get active session for user', () => {
      const session = service.createDateSession(userId, matchId, matchName, new Date());

      const active = service.getActiveSession(userId);

      expect(active).not.toBeNull();
      expect(active?.id).toBe(session.id);
    });

    it('should get session history', () => {
      service.createDateSession(userId, 'match-1', 'Alice', new Date());
      const session1 = service.getActiveSession(userId);
      if (session1) {
        service.endDateSession(session1.id);
      }

      service.createDateSession(userId, 'match-2', 'Bob', new Date());

      const history = service.getSessionHistory(userId);

      expect(history.length).toBe(2);
    });
  });

  describe('Panic Alert', () => {
    const userId = 'user-123';
    const matchId = 'match-456';

    it('should trigger panic alert', async () => {
      // Add verified contact first
      const contact = await service.addTrustedContact(userId, {
        name: 'Emergency Contact',
        phone: '+1234567890',
        relationship: 'family',
        priority: 1,
      });
      service.verifyContact(userId, contact.id, 'CODE');

      const session = service.createDateSession(userId, matchId, 'John', new Date());
      await service.startDateSession(session.id);

      const result = await service.triggerPanicAlert(session.id, {
        latitude: 37.7749,
        longitude: -122.4194,
      });

      expect(result.success).toBe(true);
      expect(result.alertsSent).toBe(1);
    });

    it('should update session status to EMERGENCY', async () => {
      const session = service.createDateSession(userId, matchId, 'John', new Date());
      await service.startDateSession(session.id);

      await service.triggerPanicAlert(session.id);

      const active = service.getActiveSession(userId);
      expect(active?.status).toBe(DateSessionStatus.EMERGENCY);
    });

    it('should record alert in session history', async () => {
      const contact = await service.addTrustedContact(userId, {
        name: 'Friend',
        phone: '+1234567890',
        relationship: 'friend',
        priority: 1,
      });
      service.verifyContact(userId, contact.id, 'CODE');

      const session = service.createDateSession(userId, matchId, 'John', new Date());
      await service.startDateSession(session.id);

      await service.triggerPanicAlert(session.id);

      const active = service.getActiveSession(userId);
      expect(active?.alertsSent.length).toBe(1);
      expect(active?.alertsSent[0].type).toBe(AlertType.PANIC_TRIGGERED);
    });
  });

  describe('Missed Check-ins', () => {
    const userId = 'user-123';
    const matchId = 'match-456';

    it('should track missed check-ins', async () => {
      const session = service.createDateSession(userId, matchId, 'John', new Date());
      await service.startDateSession(session.id);

      await service.handleMissedCheckIn(session.id);

      const active = service.getActiveSession(userId);
      expect(active?.missedCheckIns).toBe(1);
      expect(active?.status).toBe(DateSessionStatus.CHECK_IN_PENDING);
    });

    it('should trigger alert after multiple missed check-ins', async () => {
      const contact = await service.addTrustedContact(userId, {
        name: 'Friend',
        phone: '+1234567890',
        relationship: 'friend',
        priority: 1,
      });
      service.verifyContact(userId, contact.id, 'CODE');

      const session = service.createDateSession(userId, matchId, 'John', new Date());
      await service.startDateSession(session.id);

      await service.handleMissedCheckIn(session.id);
      await service.handleMissedCheckIn(session.id);

      const active = service.getActiveSession(userId);
      expect(active?.missedCheckIns).toBe(2);
      expect(active?.status).toBe(DateSessionStatus.ALERT_TRIGGERED);
    });

    it('should reset missed check-ins on successful check-in', async () => {
      const session = service.createDateSession(userId, matchId, 'John', new Date());
      await service.startDateSession(session.id);

      await service.handleMissedCheckIn(session.id);
      expect(service.getActiveSession(userId)?.missedCheckIns).toBe(1);

      await service.checkIn(session.id);
      expect(service.getActiveSession(userId)?.missedCheckIns).toBe(0);
    });
  });

  describe('Feature Flag', () => {
    it('should check if feature is enabled', () => {
      // Due to 25% rollout, check function exists and returns boolean
      const enabled = service.isEnabled('user-123');
      expect(typeof enabled).toBe('boolean');
    });

    it('should return consistent result for same user', () => {
      const userId = 'consistent-user-test';
      const result1 = service.isEnabled(userId);
      const result2 = service.isEnabled(userId);
      expect(result1).toBe(result2);
    });
  });

  describe('Session Status Transitions', () => {
    const userId = 'user-123';
    const matchId = 'match-456';

    it('should transition from SCHEDULED to IN_PROGRESS', async () => {
      const session = service.createDateSession(userId, matchId, 'John', new Date());
      expect(session.status).toBe(DateSessionStatus.SCHEDULED);

      await service.startDateSession(session.id);
      expect(service.getActiveSession(userId)?.status).toBe(DateSessionStatus.IN_PROGRESS);
    });

    it('should transition from IN_PROGRESS to COMPLETED_SAFE', async () => {
      const session = service.createDateSession(userId, matchId, 'John', new Date());
      await service.startDateSession(session.id);

      await service.endDateSession(session.id);
      expect(service.getActiveSession(userId)).toBeNull(); // No longer active

      const history = service.getSessionHistory(userId);
      expect(history[0].status).toBe(DateSessionStatus.COMPLETED_SAFE);
    });

    it('should transition from IN_PROGRESS to EMERGENCY', async () => {
      const session = service.createDateSession(userId, matchId, 'John', new Date());
      await service.startDateSession(session.id);

      await service.triggerPanicAlert(session.id);
      expect(service.getActiveSession(userId)?.status).toBe(DateSessionStatus.EMERGENCY);
    });
  });

  describe('SMS Notifications', () => {
    const userId = 'user-123';
    const matchId = 'match-456';

    it('should send verification SMS when adding trusted contact', async () => {
      await service.addTrustedContact(userId, {
        name: 'Mom',
        phone: '+1234567890',
        relationship: 'family',
        priority: 1,
      });

      expect(mockSendSMS).toHaveBeenCalledTimes(1);
      expect(mockSendSMS).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+1234567890',
          messageType: 'Transactional',
        })
      );
      // Check message contains verification info
      const callArgs = mockSendSMS.mock.calls[0][0];
      expect(callArgs.message).toContain('safety guardian');
      expect(callArgs.message).toContain('verification code');
    });

    it('should send panic alert SMS to all verified contacts', async () => {
      // Add and verify two contacts
      const contact1 = await service.addTrustedContact(userId, {
        name: 'Mom',
        phone: '+1234567890',
        relationship: 'family',
        priority: 1,
      });
      service.verifyContact(userId, contact1.id, 'CODE');

      const contact2 = await service.addTrustedContact(userId, {
        name: 'Friend',
        phone: '+0987654321',
        relationship: 'friend',
        priority: 2,
      });
      service.verifyContact(userId, contact2.id, 'CODE');

      // Reset mock to only count alerts after this point
      mockSendSMS.mockClear();

      const session = service.createDateSession(userId, matchId, 'John', new Date());
      await service.startDateSession(session.id);

      // date_started sends 2 SMS (one per verified contact)
      // Reset again to count only panic SMS
      const callsAfterStart = mockSendSMS.mock.calls.length;
      mockSendSMS.mockClear();

      await service.triggerPanicAlert(session.id, { latitude: 37.7749, longitude: -122.4194 });

      // Should send panic alert to both verified contacts
      expect(mockSendSMS).toHaveBeenCalledTimes(2);

      // Check panic alert message contains emergency info
      const calls = mockSendSMS.mock.calls;
      expect(calls[0][0].message).toContain('EMERGENCY');
      expect(calls[0][0].message).toContain('safety alert');
    });

    it('should send SMS when date ends safely', async () => {
      const contact = await service.addTrustedContact(userId, {
        name: 'Mom',
        phone: '+1234567890',
        relationship: 'family',
        priority: 1,
      });
      service.verifyContact(userId, contact.id, 'CODE');

      // Reset mock
      mockSendSMS.mockClear();

      const session = service.createDateSession(userId, matchId, 'John', new Date());
      await service.startDateSession(session.id);
      await service.endDateSession(session.id, 5);

      // Should send completion notification
      expect(mockSendSMS).toHaveBeenCalled();
      const lastCall = mockSendSMS.mock.calls[mockSendSMS.mock.calls.length - 1][0];
      expect(lastCall.message).toContain('ended their date safely');
    });

    it('should send missed check-in alert to trusted contacts', async () => {
      const contact = await service.addTrustedContact(userId, {
        name: 'Mom',
        phone: '+1234567890',
        relationship: 'family',
        priority: 1,
      });
      service.verifyContact(userId, contact.id, 'CODE');

      const session = service.createDateSession(userId, matchId, 'John', new Date());
      await service.startDateSession(session.id);

      // Reset mock
      mockSendSMS.mockClear();

      // Trigger two missed check-ins (threshold is 2)
      await service.handleMissedCheckIn(session.id);
      await service.handleMissedCheckIn(session.id);

      // Should send alert after second missed check-in
      expect(mockSendSMS).toHaveBeenCalled();
      const lastCall = mockSendSMS.mock.calls[mockSendSMS.mock.calls.length - 1][0];
      expect(lastCall.message).toContain('ALERT');
      expect(lastCall.message).toContain('missed their safety check-in');
    });

    it('should not send SMS to unverified contacts', async () => {
      // Add contact but don't verify
      await service.addTrustedContact(userId, {
        name: 'Mom',
        phone: '+1234567890',
        relationship: 'family',
        priority: 1,
      });

      // Reset mock after verification SMS
      mockSendSMS.mockClear();

      const session = service.createDateSession(userId, matchId, 'John', new Date());
      await service.startDateSession(session.id);
      await service.triggerPanicAlert(session.id);

      // Should not send panic alert to unverified contact
      expect(mockSendSMS).not.toHaveBeenCalled();
    });

    it('should handle SMS failure gracefully', async () => {
      // Make SMS service fail for verification
      mockSendSMS.mockResolvedValueOnce({ success: false, error: 'Network error' });

      const contact = await service.addTrustedContact(userId, {
        name: 'Mom',
        phone: '+1234567890',
        relationship: 'family',
        priority: 1,
      });
      service.verifyContact(userId, contact.id, 'CODE');

      // Reset mock and make all subsequent calls fail
      mockSendSMS.mockClear();
      mockSendSMS.mockResolvedValue({ success: false, error: 'Network error' });

      const session = service.createDateSession(userId, matchId, 'John', new Date());
      await service.startDateSession(session.id); // This also sends SMS (date_started)

      // Should not throw even if SMS fails
      const result = await service.triggerPanicAlert(session.id);
      expect(result.success).toBe(true);
      expect(result.alertsSent).toBe(0); // 0 successful sends
    });
  });
});
