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
import logger from '../../utils/logger';

export class SOSService {
  private repository: SOSRepository;

  constructor(repository?: SOSRepository) {
    this.repository = repository || sosRepository;
  }

  // ==================== SOS ALERTS ====================

  /**
   * Trigger an SOS alert - immediate action
   */
  async triggerSOS(
    userId: string,
    location?: { latitude: number; longitude: number; accuracy?: number },
    reason?: string
  ): Promise<{ alert: SOSAlert; notifiedContacts: EmergencyContact[] }> {
    logger.info(`SOS triggered by user ${userId}`, { location, reason });

    // Check for existing active alert
    const existingAlert = await this.repository.getActiveAlertByUser(userId);
    if (existingAlert) {
      logger.warn(`User ${userId} already has an active SOS alert`);
      const contacts = await this.repository.getUserEmergencyContacts(userId);
      return { alert: existingAlert, notifiedContacts: contacts };
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

    // Notify emergency contacts
    const notifiedContactIds: string[] = [];
    for (const contact of contacts) {
      try {
        await this.notifyEmergencyContact(contact, alert);
        notifiedContactIds.push(contact.id);
        logger.info(`Notified emergency contact ${contact.id} for SOS ${alert.id}`);
      } catch (error) {
        logger.error(`Failed to notify contact ${contact.id}:`, error);
      }
    }

    // Update alert with notified contacts
    await this.repository.updateNotifiedContacts(alert.id, notifiedContactIds);

    // Log for platform monitoring
    logger.warn(`SOS ALERT ACTIVE: User ${userId}, Alert ${alert.id}`, {
      alertId: alert.id,
      userId,
      location,
      contactsNotified: notifiedContactIds.length,
    });

    return {
      alert,
      notifiedContacts: contacts.filter(c => notifiedContactIds.includes(c.id)),
    };
  }

  /**
   * Cancel an SOS alert (user initiated)
   */
  async cancelSOS(userId: string, alertId: string): Promise<SOSAlert | null> {
    const alert = await this.repository.getAlertById(alertId);

    if (!alert) {
      throw new Error('SOS alert not found');
    }

    if (alert.user_id !== userId) {
      throw new Error('Not authorized to cancel this alert');
    }

    if (alert.status !== 'active') {
      throw new Error('Alert is not active');
    }

    const updatedAlert = await this.repository.updateAlertStatus(
      alertId,
      'cancelled',
      'Cancelled by user'
    );

    logger.info(`SOS alert ${alertId} cancelled by user ${userId}`);

    // Notify emergency contacts that alert was cancelled
    const contacts = await this.repository.getSOSNotifiableContacts(userId);
    for (const contact of contacts) {
      try {
        await this.notifyAlertCancelled(contact, alert);
      } catch (error) {
        logger.error(`Failed to notify contact of cancellation:`, error);
      }
    }

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

  // ==================== PRIVATE METHODS ====================

  private isValidPhoneNumber(phone: string): boolean {
    // Basic phone validation - allows international formats
    const phoneRegex = /^\+?[\d\s\-()]{10,20}$/;
    return phoneRegex.test(phone);
  }

  private async notifyEmergencyContact(
    contact: EmergencyContact,
    alert: SOSAlert
  ): Promise<void> {
    // In production, this would send SMS/email via notification service
    // For now, log the notification
    logger.info(`NOTIFICATION: Emergency contact ${contact.name} (${contact.phone})`, {
      alertId: alert.id,
      alertType: alert.alert_type,
      contactId: contact.id,
    });

    // TODO: Integrate with notification service
    // await notificationService.sendSMS(contact.phone, `SOS Alert from Flamoral user...`);
    // await notificationService.sendEmail(contact.email, `Emergency Alert`, `...`);
  }

  private async notifyAlertCancelled(
    contact: EmergencyContact,
    alert: SOSAlert
  ): Promise<void> {
    logger.info(`NOTIFICATION: Alert cancelled notification to ${contact.name}`, {
      alertId: alert.id,
      contactId: contact.id,
    });

    // TODO: Integrate with notification service
  }
}

export const sosService = new SOSService();
