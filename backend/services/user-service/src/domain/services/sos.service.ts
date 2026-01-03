import { sosRepository, SOSRepository } from '../repositories/sos.repository';
import {
  SOSAlert,
  EmergencyContact,
  SafetyCheckin,
  CreateSOSAlertInput,
  CreateEmergencyContactInput,
  CreateSafetyCheckinInput,
  CrisisResource,
  DEFAULT_CRISIS_RESOURCES,
  SOS_ALERT_TYPE,
} from '../entities/SOS.entity';
import {
  sosNotificationService,
  SOSNotificationService,
  ContactNotificationResult,
  SOSNotificationLog,
} from './sos-notification.service';
import { db } from '../../infrastructure/database';
import logger from '../../utils/logger';

export interface SOSNotificationSummary {
  totalContacts: number;
  successfullyNotified: number;
  failedNotifications: number;
  notificationResults: ContactNotificationResult[];
}

export interface TriggerSOSResult {
  alert: SOSAlert;
  notifiedContacts: EmergencyContact[];
  notificationSummary: SOSNotificationSummary;
}

export class SOSService {
  private repository: SOSRepository;
  private notificationService: SOSNotificationService;

  // Escalation thresholds (in minutes)
  private static readonly AUTO_ESCALATE_AFTER_MINUTES = 15;
  private static readonly SUPPORT_ESCALATE_AFTER_MINUTES = 30;

  constructor(repository?: SOSRepository, notifService?: SOSNotificationService) {
    this.repository = repository || sosRepository;
    this.notificationService = notifService || sosNotificationService;
  }

  // ==================== SOS ALERTS ====================

  /**
   * Trigger an SOS alert - immediate action
   * Sends SMS, Email, and Push notifications to all emergency contacts
   */
  async triggerSOS(
    userId: string,
    location?: { latitude: number; longitude: number; accuracy?: number },
    reason?: string
  ): Promise<TriggerSOSResult> {
    logger.info(`SOS triggered by user ${userId}`, { location, reason });

    // Check for existing active alert
    const existingAlert = await this.repository.getActiveAlertByUser(userId);
    if (existingAlert) {
      logger.warn(`User ${userId} already has an active SOS alert`);
      const contacts = await this.repository.getUserEmergencyContacts(userId);
      const notificationStatus = await this.notificationService.getNotificationStatus(existingAlert.id);
      return {
        alert: existingAlert,
        notifiedContacts: contacts,
        notificationSummary: {
          totalContacts: contacts.length,
          successfullyNotified: notificationStatus.filter(n => n.status === 'sent' || n.status === 'delivered').length,
          failedNotifications: notificationStatus.filter(n => n.status === 'failed').length,
          notificationResults: [],
        },
      };
    }

    // Get user information for notifications
    const user = await this.getUserInfo(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Create the SOS alert
    const alert = await this.repository.createAlert({
      user_id: userId,
      alert_type: SOS_ALERT_TYPE.EMERGENCY,
      location,
      reason,
    });

    // Get emergency contacts to notify
    const contacts = await this.repository.getSOSNotifiableContacts(userId);

    if (contacts.length === 0) {
      logger.warn(`SOS Alert ${alert.id}: No emergency contacts configured for user ${userId}`);
    }

    // Send notifications via all channels (SMS, Email, Push)
    const notificationResults = await this.notificationService.sendSOSAlert(user, alert, contacts);

    // Calculate notification summary
    const successfullyNotified = notificationResults.filter(r => r.anySucceeded).length;
    const failedNotifications = notificationResults.filter(r => !r.anySucceeded).length;

    // Update alert with notified contacts
    const notifiedContactIds = notificationResults
      .filter(r => r.anySucceeded)
      .map(r => r.contactId);
    await this.repository.updateNotifiedContacts(alert.id, notifiedContactIds);

    // Log for platform monitoring - CRITICAL SAFETY EVENT
    logger.warn(`SOS ALERT ACTIVE: User ${userId}, Alert ${alert.id}`, {
      alertId: alert.id,
      userId,
      userName: `${user.first_name} ${user.last_name || ''}`,
      location,
      contactsTotal: contacts.length,
      contactsNotified: successfullyNotified,
      contactsFailed: failedNotifications,
      timestamp: new Date().toISOString(),
    });

    // Schedule auto-escalation check
    this.scheduleAutoEscalation(alert.id, userId);

    const notificationSummary: SOSNotificationSummary = {
      totalContacts: contacts.length,
      successfullyNotified,
      failedNotifications,
      notificationResults,
    };

    return {
      alert,
      notifiedContacts: contacts.filter(c => notifiedContactIds.includes(c.id)),
      notificationSummary,
    };
  }

  /**
   * Cancel an SOS alert (user initiated)
   * Sends cancellation notifications to all emergency contacts
   */
  async cancelSOS(userId: string, alertId: string): Promise<SOSAlert | null> {
    const alert = await this.repository.getAlertById(alertId);

    if (!alert) {
      throw new Error('SOS alert not found');
    }

    if (alert.user_id !== userId) {
      throw new Error('Not authorized to cancel this alert');
    }

    if (alert.status !== 'active' && alert.status !== 'escalated') {
      throw new Error('Alert is not active');
    }

    // Get user information for notifications
    const user = await this.getUserInfo(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const updatedAlert = await this.repository.updateAlertStatus(
      alertId,
      'cancelled',
      'Cancelled by user'
    );

    logger.info(`SOS alert ${alertId} cancelled by user ${userId}`);

    // Notify emergency contacts that alert was cancelled
    const contacts = await this.repository.getSOSNotifiableContacts(userId);

    // Send cancellation notifications
    const notificationResults = await this.notificationService.sendSOSCancelled(user, alert, contacts);

    const successCount = notificationResults.filter(r => r.anySucceeded).length;
    logger.info(`SOS cancellation notifications sent`, {
      alertId,
      contactsNotified: successCount,
      totalContacts: contacts.length,
    });

    return updatedAlert;
  }

  /**
   * Resolve an SOS alert (can be admin or automated)
   */
  async resolveSOS(alertId: string, resolutionNotes?: string): Promise<SOSAlert | null> {
    const alert = await this.repository.getAlertById(alertId);

    if (!alert) {
      throw new Error('SOS alert not found');
    }

    if (alert.status !== 'active' && alert.status !== 'escalated') {
      throw new Error('Alert cannot be resolved');
    }

    const updatedAlert = await this.repository.updateAlertStatus(
      alertId,
      'resolved',
      resolutionNotes
    );

    logger.info(`SOS alert ${alertId} resolved`, { resolutionNotes });

    return updatedAlert;
  }

  /**
   * Get active SOS status for user
   */
  async getActiveSOSStatus(userId: string): Promise<SOSAlert | null> {
    return this.repository.getActiveAlertByUser(userId);
  }

  /**
   * Get SOS history for user
   */
  async getSOSHistory(userId: string): Promise<SOSAlert[]> {
    return this.repository.getUserAlertHistory(userId);
  }

  // ==================== EMERGENCY CONTACTS ====================

  /**
   * Add an emergency contact
   */
  async addEmergencyContact(input: CreateEmergencyContactInput): Promise<EmergencyContact> {
    // Validate phone number format
    if (!this.isValidPhoneNumber(input.phone)) {
      throw new Error('Invalid phone number format');
    }

    // Check max contacts (limit to 5)
    const existingContacts = await this.repository.getUserEmergencyContacts(input.user_id);
    if (existingContacts.length >= 5) {
      throw new Error('Maximum of 5 emergency contacts allowed');
    }

    // Check for duplicate phone
    const duplicate = existingContacts.find(c => c.phone === input.phone);
    if (duplicate) {
      throw new Error('This phone number is already added as an emergency contact');
    }

    const contact = await this.repository.createEmergencyContact(input);
    logger.info(`Emergency contact added for user ${input.user_id}`, { contactId: contact.id });

    return contact;
  }

  /**
   * Get user's emergency contacts
   */
  async getEmergencyContacts(userId: string): Promise<EmergencyContact[]> {
    return this.repository.getUserEmergencyContacts(userId);
  }

  /**
   * Update an emergency contact
   */
  async updateEmergencyContact(
    contactId: string,
    userId: string,
    updates: Partial<EmergencyContact>
  ): Promise<EmergencyContact | null> {
    const contact = await this.repository.getEmergencyContactById(contactId);

    if (!contact) {
      throw new Error('Emergency contact not found');
    }

    if (contact.user_id !== userId) {
      throw new Error('Not authorized to update this contact');
    }

    // Don't allow updating certain fields
    delete updates.id;
    delete updates.user_id;
    delete updates.created_at;

    return this.repository.updateEmergencyContact(contactId, updates);
  }

  /**
   * Remove an emergency contact
   */
  async removeEmergencyContact(contactId: string, userId: string): Promise<boolean> {
    const deleted = await this.repository.deleteEmergencyContact(contactId, userId);

    if (deleted) {
      logger.info(`Emergency contact ${contactId} removed by user ${userId}`);
    }

    return deleted;
  }

  // ==================== SAFETY CHECKINS ====================

  /**
   * Create a safety check-in
   */
  async createCheckin(input: CreateSafetyCheckinInput): Promise<SafetyCheckin> {
    // Validate scheduled time is in the future
    if (new Date(input.scheduled_at) <= new Date()) {
      throw new Error('Check-in time must be in the future');
    }

    // Limit to 3 active check-ins
    const activeCheckins = await this.repository.getActiveCheckins(input.user_id);
    if (activeCheckins.length >= 3) {
      throw new Error('Maximum of 3 active check-ins allowed');
    }

    const checkin = await this.repository.createCheckin(input);
    logger.info(`Safety check-in created for user ${input.user_id}`, {
      checkinId: checkin.id,
      scheduledAt: input.scheduled_at,
    });

    return checkin;
  }

  /**
   * Perform check-in (user confirms they're safe)
   */
  async performCheckin(checkinId: string, userId: string): Promise<SafetyCheckin | null> {
    const checkin = await this.repository.getCheckinById(checkinId);

    if (!checkin) {
      throw new Error('Check-in not found');
    }

    if (checkin.user_id !== userId) {
      throw new Error('Not authorized');
    }

    if (checkin.status === 'checked_in' || checkin.status === 'cancelled') {
      throw new Error('Check-in already completed or cancelled');
    }

    const updated = await this.repository.updateCheckinStatus(checkinId, 'checked_in');
    logger.info(`User ${userId} checked in for ${checkinId}`);

    return updated;
  }

  /**
   * Cancel a check-in
   */
  async cancelCheckin(checkinId: string, userId: string): Promise<SafetyCheckin | null> {
    const checkin = await this.repository.getCheckinById(checkinId);

    if (!checkin) {
      throw new Error('Check-in not found');
    }

    if (checkin.user_id !== userId) {
      throw new Error('Not authorized');
    }

    const updated = await this.repository.updateCheckinStatus(checkinId, 'cancelled');
    logger.info(`Check-in ${checkinId} cancelled by user ${userId}`);

    return updated;
  }

  /**
   * Get user's active check-ins
   */
  async getActiveCheckins(userId: string): Promise<SafetyCheckin[]> {
    return this.repository.getActiveCheckins(userId);
  }

  // ==================== CRISIS RESOURCES ====================

  /**
   * Get crisis resources (optionally filtered by region)
   */
  getCrisisResources(region?: string): CrisisResource[] {
    if (!region) {
      return DEFAULT_CRISIS_RESOURCES;
    }

    return DEFAULT_CRISIS_RESOURCES.filter(
      resource => !resource.region || resource.region === region
    );
  }

  // ==================== ESCALATION ====================

  /**
   * Escalate an SOS alert (auto or manual)
   */
  async escalateSOS(
    alertId: string,
    reason: string,
    notifySupport: boolean = true
  ): Promise<SOSAlert | null> {
    const alert = await this.repository.getAlertById(alertId);

    if (!alert) {
      throw new Error('SOS alert not found');
    }

    if (alert.status !== 'active') {
      logger.info(`Alert ${alertId} is not active, skipping escalation`);
      return alert;
    }

    // Update alert status to escalated
    const updatedAlert = await this.repository.updateAlertStatus(alertId, 'escalated');

    // Update escalation tracking
    await db('sos_alerts')
      .where({ id: alertId })
      .update({
        escalated_at: new Date(),
        escalation_level: db.raw('COALESCE(escalation_level, 0) + 1'),
        updated_at: new Date(),
      });

    // Log escalation
    const [escalationLog] = await db('sos_escalation_logs')
      .insert({
        alert_id: alertId,
        escalation_reason: reason,
        support_notified: notifySupport,
        resolution_status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    // Update alert with escalation log reference
    await db('sos_alerts')
      .where({ id: alertId })
      .update({ last_escalation_id: escalationLog.id });

    logger.warn(`SOS ALERT ESCALATED: ${alertId}`, {
      alertId,
      userId: alert.user_id,
      reason,
      escalationLogId: escalationLog.id,
    });

    // Notify support team if requested
    if (notifySupport) {
      const user = await this.getUserInfo(alert.user_id);
      if (user) {
        await this.notificationService.notifySupportTeam(user, alert, reason);
      }
    }

    // Re-notify emergency contacts about escalation
    const user = await this.getUserInfo(alert.user_id);
    const contacts = await this.repository.getSOSNotifiableContacts(alert.user_id);

    if (user && contacts.length > 0) {
      // Send escalation notifications
      for (const contact of contacts) {
        try {
          await this.sendEscalationNotification(contact, user, alert);
        } catch (error) {
          logger.error(`Failed to send escalation notification to ${contact.id}:`, error);
        }
      }
    }

    return updatedAlert;
  }

  /**
   * Process missed check-ins and send alerts
   */
  async processMissedCheckins(): Promise<number> {
    const missedCheckins = await this.repository.getMissedCheckins();
    let processedCount = 0;

    for (const checkin of missedCheckins) {
      try {
        const user = await this.getUserInfo(checkin.user_id);
        if (!user) continue;

        const contacts = await this.repository.getSOSNotifiableContacts(checkin.user_id);
        const notifiableContacts = contacts.filter(c => c.notify_on_checkin_miss);

        if (notifiableContacts.length > 0) {
          await this.notificationService.sendCheckinMissedAlert(user, checkin, notifiableContacts);
        }

        // Mark checkin as escalated
        await this.repository.markCheckinEscalated(checkin.id);

        logger.warn(`Missed checkin processed: ${checkin.id}`, {
          userId: checkin.user_id,
          scheduledAt: checkin.scheduled_at,
          contactsNotified: notifiableContacts.length,
        });

        processedCount++;
      } catch (error) {
        logger.error(`Error processing missed checkin ${checkin.id}:`, error);
      }
    }

    return processedCount;
  }

  /**
   * Retry failed notifications for an alert
   */
  async retryFailedNotifications(alertId: string): Promise<number> {
    return this.notificationService.retryFailedNotifications(alertId);
  }

  /**
   * Get notification status for an alert
   */
  async getNotificationStatus(alertId: string): Promise<SOSNotificationLog[]> {
    return this.notificationService.getNotificationStatus(alertId);
  }

  // ==================== PRIVATE METHODS ====================

  private isValidPhoneNumber(phone: string): boolean {
    // Basic phone validation - allows international formats
    const phoneRegex = /^\+?[\d\s\-()]{10,20}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Get user information from database
   */
  private async getUserInfo(userId: string): Promise<{
    id: string;
    first_name: string;
    last_name?: string;
    phone_number?: string;
    email?: string;
  } | null> {
    try {
      const user = await db('users')
        .select('id', 'first_name', 'last_name', 'phone_number', 'email')
        .where({ id: userId })
        .first();
      return user || null;
    } catch (error) {
      logger.error(`Failed to get user info for ${userId}:`, error);
      return null;
    }
  }

  /**
   * Schedule auto-escalation check for an alert
   */
  private scheduleAutoEscalation(alertId: string, userId: string): void {
    // Schedule first escalation check
    setTimeout(async () => {
      try {
        const alert = await this.repository.getAlertById(alertId);
        if (alert && alert.status === 'active') {
          // First escalation - re-notify contacts
          logger.info(`Auto-escalation check for alert ${alertId} - still active after ${SOSService.AUTO_ESCALATE_AFTER_MINUTES} minutes`);
          await this.escalateSOS(alertId, `Alert still active after ${SOSService.AUTO_ESCALATE_AFTER_MINUTES} minutes`, false);
        }
      } catch (error) {
        logger.error(`Auto-escalation check failed for ${alertId}:`, error);
      }
    }, SOSService.AUTO_ESCALATE_AFTER_MINUTES * 60 * 1000);

    // Schedule support team notification
    setTimeout(async () => {
      try {
        const alert = await this.repository.getAlertById(alertId);
        if (alert && (alert.status === 'active' || alert.status === 'escalated')) {
          // Escalate to support team
          logger.warn(`Alert ${alertId} still active after ${SOSService.SUPPORT_ESCALATE_AFTER_MINUTES} minutes - escalating to support`);
          await this.escalateSOS(alertId, `Alert still active after ${SOSService.SUPPORT_ESCALATE_AFTER_MINUTES} minutes - REQUIRES IMMEDIATE ATTENTION`, true);
        }
      } catch (error) {
        logger.error(`Support team escalation failed for ${alertId}:`, error);
      }
    }, SOSService.SUPPORT_ESCALATE_AFTER_MINUTES * 60 * 1000);
  }

  /**
   * Send escalation notification to a contact
   */
  private async sendEscalationNotification(
    contact: EmergencyContact,
    user: { id: string; first_name: string; last_name?: string },
    alert: SOSAlert
  ): Promise<void> {
    const userName = `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`;
    const timestamp = new Date().toLocaleString();

    // Send SMS if phone available
    if (contact.phone) {
      const message = `URGENT UPDATE from Flamoral

${userName}'s SOS alert is still active and has been escalated.

Time: ${timestamp}
${alert.location ? `Location: https://maps.google.com/?q=${alert.location.latitude},${alert.location.longitude}` : ''}

Please check on them immediately or contact emergency services if needed.`;

      try {
        const twilioService = (await import('../../infrastructure/sms/twilio.service')).default;
        await twilioService.sendSMS(twilioService.formatPhoneNumber(contact.phone), message);
      } catch (error) {
        logger.error(`Failed to send escalation SMS to ${contact.phone}:`, error);
      }
    }
  }
}

export const sosService = new SOSService();
