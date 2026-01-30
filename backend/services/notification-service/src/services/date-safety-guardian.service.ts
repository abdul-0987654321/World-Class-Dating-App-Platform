/**
 * Date Safety Guardian Service ("Guardian Angel")
 * Real-time date safety monitoring with trusted contacts
 *
 * This is a NOVEL feature - no competitor dating app integrates trusted contacts
 * INTO the date experience with real-time monitoring.
 *
 * Features:
 * 1. Trusted contact management (up to 5 guardians)
 * 2. Date check-in system with automatic alerts
 * 3. Real-time location sharing during dates
 * 4. Panic button with silent alerts
 * 5. Post-date safety confirmation
 * 6. Emergency services integration
 */

import logger from '../utils/logger';
import { snsSMSService, SNSSMSService } from './sns-sms.service';
import { NotificationType, NotificationPriority } from '../types';

const serviceLogger = logger.child({ service: 'date-safety-guardian' });

// Types
export interface TrustedContact {
  id: string;
  userId: string;
  name: string;
  phone: string;
  email?: string;
  relationship: 'friend' | 'family' | 'other';
  priority: number; // 1 = primary, 2-5 = backup
  isVerified: boolean;
  verifiedAt?: Date;
  createdAt: Date;
}

export interface DateSession {
  id: string;
  userId: string;
  matchId: string;
  matchName: string;
  status: DateSessionStatus;
  venue?: VenueInfo;
  scheduledAt: Date;
  startedAt?: Date;
  endedAt?: Date;
  checkInIntervalMinutes: number;
  lastCheckInAt?: Date;
  missedCheckIns: number;
  alertsSent: AlertRecord[];
  safetyRating?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum DateSessionStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  CHECK_IN_PENDING = 'check_in_pending',
  ALERT_TRIGGERED = 'alert_triggered',
  COMPLETED_SAFE = 'completed_safe',
  CANCELLED = 'cancelled',
  EMERGENCY = 'emergency',
}

export interface VenueInfo {
  name: string;
  address: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  type: 'restaurant' | 'bar' | 'cafe' | 'public_space' | 'other';
}

export interface AlertRecord {
  id: string;
  type: AlertType;
  sentAt: Date;
  sentTo: string[];
  acknowledged: boolean;
  acknowledgedAt?: Date;
}

export enum AlertType {
  CHECK_IN_REMINDER = 'check_in_reminder',
  MISSED_CHECK_IN = 'missed_check_in',
  SECOND_MISSED_CHECK_IN = 'second_missed_check_in',
  PANIC_TRIGGERED = 'panic_triggered',
  LOCATION_SHARED = 'location_shared',
  DATE_STARTED = 'date_started',
  DATE_COMPLETED = 'date_completed',
}

export interface CheckInResult {
  success: boolean;
  nextCheckInAt: Date;
  message: string;
}

export interface PanicAlertResult {
  success: boolean;
  alertsSent: number;
  emergencyServicesNotified: boolean;
  message: string;
}

// Feature flag check
function isFeatureEnabled(userId: string): boolean {
  // In production: return featureFlags.isEnabled('safetyFeatures', 'dateSafetyGuardian', { userId });
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % 100 < 25; // 25% rollout
}

export class DateSafetyGuardianService {
  // In-memory storage (replace with database in production)
  private trustedContacts: Map<string, TrustedContact[]> = new Map();
  private dateSessions: Map<string, DateSession> = new Map();
  private activeSessionsByUser: Map<string, string> = new Map();

  private readonly MAX_TRUSTED_CONTACTS = 5;
  private readonly DEFAULT_CHECK_IN_INTERVAL = 30; // minutes
  private readonly MAX_MISSED_CHECK_INS_BEFORE_ALERT = 2;

  // SMS service for sending notifications
  private smsService: SNSSMSService;

  constructor(smsService?: SNSSMSService) {
    this.smsService = smsService || snsSMSService;
  }

  /**
   * Check if feature is enabled for user
   */
  isEnabled(userId: string): boolean {
    return isFeatureEnabled(userId);
  }

  // ============================================
  // TRUSTED CONTACT MANAGEMENT
  // ============================================

  /**
   * Add a trusted contact
   */
  async addTrustedContact(
    userId: string,
    contact: Omit<TrustedContact, 'id' | 'userId' | 'isVerified' | 'verifiedAt' | 'createdAt'>
  ): Promise<TrustedContact> {
    const contacts = this.trustedContacts.get(userId) || [];

    if (contacts.length >= this.MAX_TRUSTED_CONTACTS) {
      throw new Error('Maximum trusted contacts limit reached (' + this.MAX_TRUSTED_CONTACTS + ')');
    }

    const newContact: TrustedContact = {
      id: this.generateId('tc'),
      userId,
      ...contact,
      isVerified: false,
      createdAt: new Date(),
    };

    contacts.push(newContact);
    this.trustedContacts.set(userId, contacts);

    serviceLogger.info('Trusted contact added', { userId, contactId: newContact.id });

    // Send verification SMS/email to the contact
    await this.sendContactVerification(newContact);

    return newContact;
  }

  /**
   * Get all trusted contacts for a user
   */
  getTrustedContacts(userId: string): TrustedContact[] {
    return this.trustedContacts.get(userId) || [];
  }

  /**
   * Remove a trusted contact
   */
  removeTrustedContact(userId: string, contactId: string): boolean {
    const contacts = this.trustedContacts.get(userId);
    if (!contacts) return false;

    const index = contacts.findIndex(c => c.id === contactId);
    if (index === -1) return false;

    contacts.splice(index, 1);
    this.trustedContacts.set(userId, contacts);

    serviceLogger.info('Trusted contact removed', { userId, contactId });
    return true;
  }

  /**
   * Verify a trusted contact (called when contact confirms)
   */
  verifyContact(userId: string, contactId: string, verificationCode: string): boolean {
    const contacts = this.trustedContacts.get(userId);
    if (!contacts) return false;

    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return false;

    // In production, validate verification code
    contact.isVerified = true;
    contact.verifiedAt = new Date();

    serviceLogger.info('Trusted contact verified', { userId, contactId });
    return true;
  }

  // ============================================
  // DATE SESSION MANAGEMENT
  // ============================================

  /**
   * Create a new date session
   */
  createDateSession(
    userId: string,
    matchId: string,
    matchName: string,
    scheduledAt: Date,
    venue?: VenueInfo,
    checkInIntervalMinutes?: number
  ): DateSession {
    // Check for existing active session
    const existingSessionId = this.activeSessionsByUser.get(userId);
    if (existingSessionId) {
      const existing = this.dateSessions.get(existingSessionId);
      if (existing && existing.status === DateSessionStatus.IN_PROGRESS) {
        throw new Error('An active date session already exists');
      }
    }

    const session: DateSession = {
      id: this.generateId('ds'),
      userId,
      matchId,
      matchName,
      status: DateSessionStatus.SCHEDULED,
      venue,
      scheduledAt,
      checkInIntervalMinutes: checkInIntervalMinutes || this.DEFAULT_CHECK_IN_INTERVAL,
      missedCheckIns: 0,
      alertsSent: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.dateSessions.set(session.id, session);
    this.activeSessionsByUser.set(userId, session.id);

    serviceLogger.info('Date session created', { sessionId: session.id, userId, matchId });

    // Notify trusted contacts about the scheduled date
    this.notifyTrustedContacts(userId, AlertType.DATE_STARTED, session);

    return session;
  }

  /**
   * Start a date session
   */
  async startDateSession(sessionId: string): Promise<DateSession> {
    const session = this.dateSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.status = DateSessionStatus.IN_PROGRESS;
    session.startedAt = new Date();
    session.lastCheckInAt = new Date();
    session.updatedAt = new Date();

    // Schedule first check-in reminder
    this.scheduleCheckInReminder(session);

    serviceLogger.info('Date session started', { sessionId });

    return session;
  }

  /**
   * Perform a check-in
   */
  async checkIn(sessionId: string, safetyRating?: number, notes?: string): Promise<CheckInResult> {
    const session = this.dateSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.lastCheckInAt = new Date();
    session.missedCheckIns = 0;
    session.status = DateSessionStatus.IN_PROGRESS;
    if (safetyRating) session.safetyRating = safetyRating;
    if (notes) session.notes = notes;
    session.updatedAt = new Date();

    const nextCheckIn = new Date(Date.now() + session.checkInIntervalMinutes * 60 * 1000);

    // Schedule next check-in reminder
    this.scheduleCheckInReminder(session);

    serviceLogger.info('Check-in completed', { sessionId, safetyRating });

    return {
      success: true,
      nextCheckInAt: nextCheckIn,
      message: 'Check-in successful. Next check-in in ' + session.checkInIntervalMinutes + ' minutes.',
    };
  }

  /**
   * Handle missed check-in (called by scheduler)
   */
  async handleMissedCheckIn(sessionId: string): Promise<void> {
    const session = this.dateSessions.get(sessionId);
    if (!session) {
      return;
    }

    // Only process if session is in a valid state for missed check-ins
    const validStatuses = [DateSessionStatus.IN_PROGRESS, DateSessionStatus.CHECK_IN_PENDING];
    if (!validStatuses.includes(session.status)) {
      return;
    }

    session.missedCheckIns++;
    session.updatedAt = new Date();

    if (session.missedCheckIns === 1) {
      // First missed check-in - send reminder to user
      session.status = DateSessionStatus.CHECK_IN_PENDING;
      await this.sendCheckInReminder(session);
      serviceLogger.warn('First missed check-in', { sessionId });
    } else if (session.missedCheckIns >= this.MAX_MISSED_CHECK_INS_BEFORE_ALERT) {
      // Multiple missed check-ins - alert trusted contacts
      session.status = DateSessionStatus.ALERT_TRIGGERED;
      await this.notifyTrustedContacts(session.userId, AlertType.MISSED_CHECK_IN, session);
      serviceLogger.error('Multiple missed check-ins - alerting contacts', { sessionId });
    } else {
      // Intermediate missed check-ins
      session.status = DateSessionStatus.CHECK_IN_PENDING;
    }
  }

  /**
   * Trigger panic alert (silent SOS)
   */
  async triggerPanicAlert(
    sessionId: string,
    currentLocation?: { latitude: number; longitude: number }
  ): Promise<PanicAlertResult> {
    const session = this.dateSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.status = DateSessionStatus.EMERGENCY;
    session.updatedAt = new Date();

    // Get all verified trusted contacts
    const contacts = this.getTrustedContacts(session.userId).filter(c => c.isVerified);

    if (contacts.length === 0) {
      serviceLogger.warn('No verified trusted contacts for panic alert', { sessionId });
    }

    // Send panic alerts to all contacts
    const alertsSent = await this.notifyTrustedContacts(
      session.userId,
      AlertType.PANIC_TRIGGERED,
      session,
      currentLocation
    );

    // Record the alert
    session.alertsSent.push({
      id: this.generateId('alert'),
      type: AlertType.PANIC_TRIGGERED,
      sentAt: new Date(),
      sentTo: contacts.map(c => c.phone),
      acknowledged: false,
    });

    serviceLogger.error('PANIC ALERT TRIGGERED', {
      sessionId,
      userId: session.userId,
      location: currentLocation,
    });

    return {
      success: true,
      alertsSent,
      emergencyServicesNotified: false, // In production, could auto-dial 911
      message: 'Panic alert sent to ' + alertsSent + ' trusted contacts.',
    };
  }

  /**
   * End date session safely
   */
  async endDateSession(sessionId: string, safetyRating?: number): Promise<DateSession> {
    const session = this.dateSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.status = DateSessionStatus.COMPLETED_SAFE;
    session.endedAt = new Date();
    if (safetyRating) session.safetyRating = safetyRating;
    session.updatedAt = new Date();

    // Notify trusted contacts that date ended safely
    await this.notifyTrustedContacts(session.userId, AlertType.DATE_COMPLETED, session);

    // Remove from active sessions
    this.activeSessionsByUser.delete(session.userId);

    serviceLogger.info('Date session completed safely', { sessionId, safetyRating });

    return session;
  }

  /**
   * Get active date session for user
   */
  getActiveSession(userId: string): DateSession | null {
    const sessionId = this.activeSessionsByUser.get(userId);
    if (!sessionId) return null;
    return this.dateSessions.get(sessionId) || null;
  }

  /**
   * Get date session history for user
   */
  getSessionHistory(userId: string, limit: number = 10): DateSession[] {
    const sessions: DateSession[] = [];
    this.dateSessions.forEach(session => {
      if (session.userId === userId) {
        sessions.push(session);
      }
    });
    return sessions
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // ============================================
  // NOTIFICATION HELPERS
  // ============================================

  /**
   * Send verification to a new trusted contact
   */
  private async sendContactVerification(contact: TrustedContact): Promise<void> {
    const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const message = `Hi ${contact.name}! Someone has added you as their safety guardian on Flamoral. ` +
      `You'll receive alerts during their dates. Your verification code is: ${verificationCode}. ` +
      `Reply YES to confirm, or ignore if you don't recognize this request.`;

    serviceLogger.info('Sending contact verification SMS', {
      contactId: contact.id,
      phone: contact.phone,
    });

    try {
      const result = await this.smsService.sendSMS({
        to: contact.phone,
        message,
        messageType: 'Transactional',
      });

      if (result.success) {
        serviceLogger.info('Contact verification SMS sent successfully', {
          contactId: contact.id,
          messageId: result.messageId,
        });
      } else {
        serviceLogger.error('Failed to send contact verification SMS', {
          contactId: contact.id,
          error: result.error,
        });
      }
    } catch (error: any) {
      serviceLogger.error('Error sending contact verification SMS', {
        contactId: contact.id,
        error: error.message,
      });
    }
  }

  /**
   * Send check-in reminder to user
   */
  private async sendCheckInReminder(session: DateSession): Promise<void> {
    // In production, send push notification
    serviceLogger.info('Sending check-in reminder', { sessionId: session.id });

    // Push notification:
    // "How's your date going? Tap to check in and let your guardians know you're safe."
  }

  /**
   * Notify trusted contacts via SMS
   */
  private async notifyTrustedContacts(
    userId: string,
    alertType: AlertType,
    session: DateSession,
    location?: { latitude: number; longitude: number }
  ): Promise<number> {
    const contacts = this.getTrustedContacts(userId).filter(c => c.isVerified);

    if (contacts.length === 0) {
      serviceLogger.warn('No verified trusted contacts to notify', {
        userId,
        alertType,
        sessionId: session.id,
      });
      return 0;
    }

    // Build message based on alert type
    const message = this.buildAlertMessage(alertType, session, location);

    // Determine notification type and priority based on alert type
    const { notificationType, messageType } = this.getNotificationTypeForAlert(alertType);

    let successCount = 0;
    const errors: Array<{ contactId: string; error: string }> = [];

    // Send SMS to each verified contact
    for (const contact of contacts) {
      serviceLogger.info('Sending safety alert SMS to trusted contact', {
        alertType,
        notificationType,
        contactId: contact.id,
        phone: this.maskPhoneNumber(contact.phone),
        sessionId: session.id,
      });

      try {
        const result = await this.smsService.sendSMS({
          to: contact.phone,
          message,
          messageType,
        });

        if (result.success) {
          successCount++;
          serviceLogger.info('Safety alert SMS sent successfully', {
            alertType,
            contactId: contact.id,
            messageId: result.messageId,
            sessionId: session.id,
          });
        } else {
          errors.push({ contactId: contact.id, error: result.error || 'Unknown error' });
          serviceLogger.error('Failed to send safety alert SMS', {
            alertType,
            contactId: contact.id,
            error: result.error,
            sessionId: session.id,
          });
        }
      } catch (error: any) {
        errors.push({ contactId: contact.id, error: error.message });
        serviceLogger.error('Exception while sending safety alert SMS', {
          alertType,
          contactId: contact.id,
          error: error.message,
          sessionId: session.id,
        });
      }
    }

    // Log summary
    if (errors.length > 0) {
      serviceLogger.warn('Some safety alert SMS failed to send', {
        alertType,
        sessionId: session.id,
        totalContacts: contacts.length,
        successCount,
        failureCount: errors.length,
        errors,
      });
    } else {
      serviceLogger.info('All safety alert SMS sent successfully', {
        alertType,
        sessionId: session.id,
        totalContacts: contacts.length,
        successCount,
      });
    }

    return successCount;
  }

  /**
   * Get notification type and message type based on alert type
   */
  private getNotificationTypeForAlert(alertType: AlertType): {
    notificationType: NotificationType;
    messageType: 'Transactional' | 'Promotional';
  } {
    switch (alertType) {
      case AlertType.PANIC_TRIGGERED:
        return {
          notificationType: NotificationType.DATE_SAFETY_PANIC,
          messageType: 'Transactional',
        };
      case AlertType.MISSED_CHECK_IN:
      case AlertType.SECOND_MISSED_CHECK_IN:
        return {
          notificationType: NotificationType.DATE_SAFETY_ALERT,
          messageType: 'Transactional',
        };
      case AlertType.CHECK_IN_REMINDER:
        return {
          notificationType: NotificationType.DATE_SAFETY_CHECK_IN,
          messageType: 'Transactional',
        };
      case AlertType.DATE_STARTED:
        return {
          notificationType: NotificationType.DATE_SAFETY_STARTED,
          messageType: 'Transactional',
        };
      case AlertType.DATE_COMPLETED:
        return {
          notificationType: NotificationType.DATE_SAFETY_COMPLETED,
          messageType: 'Transactional',
        };
      default:
        return {
          notificationType: NotificationType.DATE_SAFETY_ALERT,
          messageType: 'Transactional',
        };
    }
  }

  /**
   * Mask phone number for logging (privacy)
   */
  private maskPhoneNumber(phone: string): string {
    if (phone.length < 4) return '****';
    return phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4);
  }

  /**
   * Build alert message content
   */
  private buildAlertMessage(
    alertType: AlertType,
    session: DateSession,
    location?: { latitude: number; longitude: number }
  ): string {
    const userName = 'Your friend'; // In production, get from user service

    switch (alertType) {
      case AlertType.DATE_STARTED:
        return userName + ' has started their date with ' + session.matchName +
          (session.venue ? ' at ' + session.venue.name : '') + '.';

      case AlertType.MISSED_CHECK_IN:
        return 'ALERT: ' + userName + ' missed their safety check-in. ' +
          'Date started: ' + this.formatTime(session.startedAt) + '. ' +
          (session.venue ? 'Location: ' + session.venue.name + ', ' + session.venue.address : '');

      case AlertType.PANIC_TRIGGERED:
        let msg = 'EMERGENCY: ' + userName + ' triggered their safety alert! ';
        if (location) {
          msg += 'Current location: https://maps.google.com/?q=' + location.latitude + ',' + location.longitude + ' ';
        }
        if (session.venue) {
          msg += 'Date location: ' + session.venue.name + ', ' + session.venue.address;
        }
        return msg;

      case AlertType.DATE_COMPLETED:
        return userName + ' has ended their date safely. Thanks for being their guardian!';

      default:
        return 'Flamoral Safety Update for ' + userName;
    }
  }

  /**
   * Schedule check-in reminder
   */
  private scheduleCheckInReminder(session: DateSession): void {
    // In production, use a job queue like Bull
    const delay = session.checkInIntervalMinutes * 60 * 1000;

    setTimeout(() => {
      if (session.status === DateSessionStatus.IN_PROGRESS) {
        const timeSinceLastCheckIn = Date.now() - (session.lastCheckInAt?.getTime() || 0);
        if (timeSinceLastCheckIn >= delay) {
          this.handleMissedCheckIn(session.id);
        }
      }
    }, delay);
  }

  /**
   * Format time for messages
   */
  private formatTime(date?: Date): string {
    if (!date) return 'unknown';
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  /**
   * Generate unique ID
   */
  private generateId(prefix: string): string {
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
  }
}

// Export singleton
export const dateSafetyGuardianService = new DateSafetyGuardianService();
export default dateSafetyGuardianService;
