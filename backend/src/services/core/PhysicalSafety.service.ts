/**
 * Physical Safety Service
 * Handles features for user physical safety including:
 * - Emergency contacts management
 * - Safety check-ins for dates
 * - Live location sharing
 * - Emergency alerts
 * - Date safety features
 */

import { SafetyRepository } from '../../repositories/Safety.repository';
import { UserRepository } from '../../repositories';
import { logger } from '../../utils/logger';
import {
  EmergencyContact,
  EmergencyRelationship,
  SafetyCheckIn,
  SafetyCheckInStatus,
  LocationShare,
  LocationShareType,
  SafetyCheckInRequest,
} from '../../models/Safety.model';

interface EmergencyAlertPayload {
  userId: string;
  alertType: 'sos' | 'missed_checkin' | 'panic' | 'location_share';
  message: string;
  location?: {
    lat: number;
    lng: number;
    accuracy?: number;
    address?: string;
  };
  contactInfo?: {
    matchName?: string;
    matchPhone?: string;
    meetingLocation?: string;
    scheduledTime?: Date;
  };
}

interface DateSafetyTip {
  category: 'before' | 'during' | 'after';
  tip: string;
  priority: 'high' | 'medium' | 'low';
}

export class PhysicalSafetyService {
  private safetyRepo: SafetyRepository;
  private userRepo: UserRepository;

  // Safety tips for dates
  private readonly DATE_SAFETY_TIPS: DateSafetyTip[] = [
    // Before the date
    {
      category: 'before',
      tip: 'Meet in a public place for your first few dates',
      priority: 'high',
    },
    {
      category: 'before',
      tip: 'Tell a friend or family member where you\'re going and who you\'re meeting',
      priority: 'high',
    },
    {
      category: 'before',
      tip: 'Research your date online before meeting',
      priority: 'medium',
    },
    {
      category: 'before',
      tip: 'Use your own transportation to and from the date',
      priority: 'high',
    },
    {
      category: 'before',
      tip: 'Set up a safety check-in with a friend during the date',
      priority: 'high',
    },
    {
      category: 'before',
      tip: 'Keep your phone charged and with you at all times',
      priority: 'high',
    },
    // During the date
    {
      category: 'during',
      tip: 'Never leave your drink unattended',
      priority: 'high',
    },
    {
      category: 'during',
      tip: 'Trust your instincts - if something feels off, leave',
      priority: 'high',
    },
    {
      category: 'during',
      tip: 'Stay in public areas during the first few dates',
      priority: 'high',
    },
    {
      category: 'during',
      tip: 'Limit alcohol consumption to stay alert',
      priority: 'medium',
    },
    {
      category: 'during',
      tip: 'Don\'t share personal details like your address or workplace too soon',
      priority: 'high',
    },
    // After the date
    {
      category: 'after',
      tip: 'Text your friend when you arrive home safely',
      priority: 'high',
    },
    {
      category: 'after',
      tip: 'Report any concerning behavior to our safety team',
      priority: 'medium',
    },
    {
      category: 'after',
      tip: 'Take your time getting to know someone before sharing more personal info',
      priority: 'medium',
    },
  ];

  constructor(safetyRepo: SafetyRepository, userRepo: UserRepository) {
    this.safetyRepo = safetyRepo;
    this.userRepo = userRepo;
  }

  // ============================================
  // Emergency Contacts
  // ============================================

  /**
   * Add an emergency contact
   */
  async addEmergencyContact(
    userId: string,
    data: {
      name: string;
      phone: string;
      email?: string;
      relationship: EmergencyRelationship;
      isPrimary?: boolean;
      canReceiveAlerts?: boolean;
      canSeeLocation?: boolean;
    }
  ): Promise<EmergencyContact> {
    // Validate phone number format
    if (!this.isValidPhoneNumber(data.phone)) {
      throw new Error('Invalid phone number format');
    }

    // Check if user already has max contacts
    const existingContacts = await this.safetyRepo.getUserEmergencyContacts(userId);
    if (existingContacts.length >= 5) {
      throw new Error('Maximum of 5 emergency contacts allowed');
    }

    // If this is marked as primary, unset other primary contacts
    if (data.isPrimary) {
      for (const contact of existingContacts.filter(c => c.is_primary)) {
        // Update existing primary to non-primary
        // Would need an update method in repository
      }
    }

    const contact = await this.safetyRepo.createEmergencyContact(userId, data);

    logger.info(`Emergency contact added for user ${userId}: ${contact.id}`);

    return contact;
  }

  /**
   * Get user's emergency contacts
   */
  async getEmergencyContacts(userId: string): Promise<EmergencyContact[]> {
    return this.safetyRepo.getUserEmergencyContacts(userId);
  }

  /**
   * Remove an emergency contact
   */
  async removeEmergencyContact(
    userId: string,
    contactId: string
  ): Promise<void> {
    const contacts = await this.safetyRepo.getUserEmergencyContacts(userId);
    const contact = contacts.find(c => c.id === contactId);

    if (!contact) {
      throw new Error('Emergency contact not found');
    }

    await this.safetyRepo.deleteEmergencyContact(contactId);
    logger.info(`Emergency contact removed for user ${userId}: ${contactId}`);
  }

  // ============================================
  // Safety Check-ins
  // ============================================

  /**
   * Create a safety check-in for a date
   */
  async createSafetyCheckIn(request: SafetyCheckInRequest): Promise<SafetyCheckIn> {
    const { userId, matchId, locationName, coordinates, scheduledTime, expectedEndTime, notes } = request;

    // Validate scheduled time is in the future
    if (new Date(scheduledTime) <= new Date()) {
      throw new Error('Scheduled time must be in the future');
    }

    // Get match info if provided
    let matchInfo;
    if (matchId) {
      matchInfo = await this.userRepo.findById(matchId);
    }

    const checkIn = await this.safetyRepo.createSafetyCheckIn(userId, {
      matchId,
      locationName,
      coordinates,
      scheduledTime,
      expectedEndTime,
      notes,
    });

    // Schedule check-in reminder
    await this.scheduleCheckInReminder(checkIn);

    logger.info(`Safety check-in created: ${checkIn.id} for user ${userId}`);

    return checkIn;
  }

  /**
   * Perform a check-in (user confirms they're safe)
   */
  async performCheckIn(checkInId: string, userId: string): Promise<SafetyCheckIn> {
    const checkIns = await this.safetyRepo.getActiveCheckIns(userId);
    const checkIn = checkIns.find(c => c.id === checkInId);

    if (!checkIn) {
      throw new Error('Check-in not found or not active');
    }

    const updatedCheckIn = await this.safetyRepo.updateSafetyCheckInStatus(
      checkInId,
      'active',
      new Date()
    );

    logger.info(`Check-in performed: ${checkInId}`);

    return updatedCheckIn;
  }

  /**
   * Complete a safety check-in (date ended safely)
   */
  async completeSafetyCheckIn(checkInId: string, userId: string): Promise<SafetyCheckIn> {
    const checkIns = await this.safetyRepo.getActiveCheckIns(userId);
    const checkIn = checkIns.find(c => c.id === checkInId);

    if (!checkIn) {
      throw new Error('Check-in not found or not active');
    }

    const updatedCheckIn = await this.safetyRepo.updateSafetyCheckInStatus(
      checkInId,
      'completed',
      new Date()
    );

    logger.info(`Safety check-in completed: ${checkInId}`);

    // Optionally notify emergency contacts that user is safe
    await this.notifyContactsUserSafe(userId, checkIn);

    return updatedCheckIn;
  }

  /**
   * Handle missed check-in
   */
  async handleMissedCheckIn(checkInId: string): Promise<void> {
    const checkIn = await this.safetyRepo.getActiveCheckIns('').then(
      checkIns => checkIns.find(c => c.id === checkInId)
    );

    if (!checkIn) {
      return;
    }

    // Update status to missed
    await this.safetyRepo.updateSafetyCheckInStatus(checkInId, 'missed');

    // Send emergency alert to contacts
    await this.sendEmergencyAlert({
      userId: checkIn.user_id,
      alertType: 'missed_checkin',
      message: 'Safety check-in was missed. Please check on your contact.',
      location: checkIn.coordinates || undefined,
      contactInfo: {
        meetingLocation: checkIn.location_name || undefined,
        scheduledTime: checkIn.scheduled_time,
      },
    });

    logger.warn(`Missed check-in alert sent for check-in ${checkInId}`);
  }

  /**
   * Get active check-ins for a user
   */
  async getActiveCheckIns(userId: string): Promise<SafetyCheckIn[]> {
    return this.safetyRepo.getActiveCheckIns(userId);
  }

  // ============================================
  // Location Sharing
  // ============================================

  /**
   * Start sharing location with someone
   */
  async startLocationShare(
    userId: string,
    data: {
      shareWithUserId?: string;
      emergencyContactId?: string;
      shareType: LocationShareType;
      durationMinutes?: number;
      currentLocation?: { lat: number; lng: number; accuracy?: number };
    }
  ): Promise<LocationShare> {
    if (!data.shareWithUserId && !data.emergencyContactId) {
      throw new Error('Must specify either a user or emergency contact to share with');
    }

    // Calculate expiration
    let expiresAt: Date | undefined;
    if (data.durationMinutes) {
      expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + data.durationMinutes);
    } else if (data.shareType === 'date_share') {
      // Default 4 hours for date share
      expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 4);
    }

    const share = await this.safetyRepo.createLocationShare(userId, {
      sharedWithUserId: data.shareWithUserId,
      emergencyContactId: data.emergencyContactId,
      currentLocation: data.currentLocation,
      shareType: data.shareType,
      expiresAt,
    });

    logger.info(`Location sharing started: ${share.id} for user ${userId}`);

    return share;
  }

  /**
   * Update shared location
   */
  async updateSharedLocation(
    shareId: string,
    userId: string,
    location: { lat: number; lng: number; accuracy?: number }
  ): Promise<LocationShare> {
    return this.safetyRepo.updateLocationShare(shareId, location);
  }

  /**
   * Stop location sharing
   */
  async stopLocationShare(shareId: string, userId: string): Promise<void> {
    await this.safetyRepo.deactivateLocationShare(shareId);
    logger.info(`Location sharing stopped: ${shareId}`);
  }

  // ============================================
  // Emergency Alerts
  // ============================================

  /**
   * Trigger SOS alert
   */
  async triggerSOSAlert(
    userId: string,
    location?: { lat: number; lng: number; accuracy?: number }
  ): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get emergency contacts
    const contacts = await this.safetyRepo.getUserEmergencyContacts(userId);

    if (contacts.length === 0) {
      logger.warn(`SOS alert triggered but no emergency contacts for user ${userId}`);
    }

    // Send alert to all contacts
    await this.sendEmergencyAlert({
      userId,
      alertType: 'sos',
      message: `SOS Alert: ${user.first_name} has triggered an emergency alert and may need help.`,
      location,
    });

    logger.warn(`SOS alert triggered for user ${userId}`);
  }

  /**
   * Send emergency alert to contacts
   */
  private async sendEmergencyAlert(payload: EmergencyAlertPayload): Promise<void> {
    const contacts = await this.safetyRepo.getUserEmergencyContacts(payload.userId);
    const user = await this.userRepo.findById(payload.userId);

    const alertContacts = contacts.filter(c => c.can_receive_alerts);

    for (const contact of alertContacts) {
      try {
        // In production, this would send SMS/email/push notifications
        await this.sendAlertToContact(contact, payload, user);
      } catch (error) {
        logger.error(`Failed to send alert to contact ${contact.id}:`, error);
      }
    }
  }

  /**
   * Send alert to a specific contact
   */
  private async sendAlertToContact(
    contact: EmergencyContact,
    payload: EmergencyAlertPayload,
    user: any
  ): Promise<void> {
    // Format the alert message
    let message = payload.message;

    if (payload.location) {
      const mapLink = `https://maps.google.com/?q=${payload.location.lat},${payload.location.lng}`;
      message += `\n\nLocation: ${mapLink}`;
    }

    if (payload.contactInfo?.meetingLocation) {
      message += `\nMeeting location: ${payload.contactInfo.meetingLocation}`;
    }

    // In production, would integrate with SMS service (Twilio)
    logger.info(`Alert sent to ${contact.name} (${contact.phone}): ${payload.alertType}`);

    // Would also send push notification if they have the app
    // Would also send email if available
  }

  /**
   * Notify contacts that user is safe
   */
  private async notifyContactsUserSafe(
    userId: string,
    checkIn: SafetyCheckIn
  ): Promise<void> {
    const contacts = await this.safetyRepo.getUserEmergencyContacts(userId);
    const user = await this.userRepo.findById(userId);

    for (const contact of contacts.filter(c => c.can_receive_alerts)) {
      // In production, send notification
      logger.info(`Safety notification sent to ${contact.name}: ${user?.first_name} is safe`);
    }
  }

  // ============================================
  // Safety Tips & Resources
  // ============================================

  /**
   * Get date safety tips
   */
  getDateSafetyTips(category?: 'before' | 'during' | 'after'): DateSafetyTip[] {
    if (category) {
      return this.DATE_SAFETY_TIPS.filter(tip => tip.category === category);
    }
    return this.DATE_SAFETY_TIPS;
  }

  /**
   * Get personalized safety suggestions based on user behavior
   */
  async getPersonalizedSafetySuggestions(userId: string): Promise<string[]> {
    const suggestions: string[] = [];

    // Check if user has emergency contacts
    const contacts = await this.safetyRepo.getUserEmergencyContacts(userId);
    if (contacts.length === 0) {
      suggestions.push('Add an emergency contact for your safety');
    } else if (contacts.length < 2) {
      suggestions.push('Consider adding another emergency contact');
    }

    // Check if user has any primary contact
    if (!contacts.some(c => c.is_primary)) {
      suggestions.push('Set a primary emergency contact');
    }

    // Check verification status
    const user = await this.userRepo.findById(userId);
    if (user && !user.phone_verified) {
      suggestions.push('Verify your phone number for safety features');
    }

    // Suggest safety check-ins
    suggestions.push('Use safety check-ins when meeting someone new');

    return suggestions;
  }

  /**
   * Get local emergency resources based on location
   */
  getLocalEmergencyResources(country: string = 'US'): {
    service: string;
    number: string;
    description: string;
  }[] {
    const resources: Record<string, { service: string; number: string; description: string }[]> = {
      US: [
        { service: 'Emergency', number: '911', description: 'Police, Fire, Ambulance' },
        { service: 'National Domestic Violence Hotline', number: '1-800-799-7233', description: '24/7 support' },
        { service: 'RAINN Sexual Assault Hotline', number: '1-800-656-4673', description: '24/7 support' },
        { service: 'National Suicide Prevention', number: '988', description: '24/7 crisis support' },
      ],
      UK: [
        { service: 'Emergency', number: '999', description: 'Police, Fire, Ambulance' },
        { service: 'National Domestic Abuse Helpline', number: '0808 2000 247', description: '24/7 support' },
        { service: 'Samaritans', number: '116 123', description: '24/7 emotional support' },
      ],
      CA: [
        { service: 'Emergency', number: '911', description: 'Police, Fire, Ambulance' },
        { service: 'Crisis Services Canada', number: '1-833-456-4566', description: '24/7 support' },
      ],
      AU: [
        { service: 'Emergency', number: '000', description: 'Police, Fire, Ambulance' },
        { service: '1800RESPECT', number: '1800 737 732', description: 'Sexual assault support' },
        { service: 'Lifeline', number: '13 11 14', description: '24/7 crisis support' },
      ],
    };

    return resources[country] || resources['US'];
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private isValidPhoneNumber(phone: string): boolean {
    // Basic phone number validation
    const phoneRegex = /^\+?[\d\s-()]{10,}$/;
    return phoneRegex.test(phone);
  }

  private async scheduleCheckInReminder(checkIn: SafetyCheckIn): Promise<void> {
    // In production, would use a job scheduler (Bull, Agenda, etc.)
    // to schedule reminder notifications

    const reminderTime = new Date(checkIn.scheduled_time);
    reminderTime.setMinutes(reminderTime.getMinutes() - 15); // 15 min before

    logger.info(`Reminder scheduled for check-in ${checkIn.id} at ${reminderTime}`);
  }
}
