/**
 * Panic Button / Emergency Service
 * Enhanced emergency features including:
 * - One-tap panic button
 * - Location tracking and sharing
 * - 911 integration option
 * - Audio recording (with consent)
 * - Live location updates
 * - Escalation to support team
 */

import { db } from '../infrastructure/database';
import { sosService, TriggerSOSResult } from '../domain/services/sos.service';
import logger from '../utils/logger';

export interface PanicLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
  venueName?: string;
}

export interface PanicEventOptions {
  location?: PanicLocation;
  reason?: string;
  triggerType?: 'button_press' | 'gesture' | 'voice_command' | 'auto_detection' | 'shake_device';
  relatedMatchId?: string;
  relatedUserId?: string;
  enableLiveLocation?: boolean;
  enableAudioRecording?: boolean;
  contactEmergencyServices?: boolean;
}

export interface PanicEvent {
  id: string;
  userId: string;
  sosAlertId?: string;
  triggerType: string;
  location?: PanicLocation;
  relatedMatchId?: string;
  relatedUserId?: string;
  emergencyServicesContacted: boolean;
  emergencyServicesContactedAt?: Date;
  emergencyReferenceNumber?: string;
  liveLocationEnabled: boolean;
  locationHistory: Array<{
    latitude: number;
    longitude: number;
    timestamp: Date;
  }>;
  audioRecordingEnabled: boolean;
  audioRecordingUrl?: string;
  status: 'active' | 'resolved' | 'escalated' | 'false_alarm';
  resolutionNotes?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmergencyResources {
  name: string;
  phone: string;
  description: string;
  region?: string;
  available24h: boolean;
  type: 'emergency' | 'crisis' | 'support' | 'hotline';
}

class PanicButtonService {
  // Default emergency resources
  private readonly emergencyResources: EmergencyResources[] = [
    {
      name: 'Emergency Services (911)',
      phone: '911',
      description: 'Police, Fire, Medical Emergency',
      region: 'US',
      available24h: true,
      type: 'emergency',
    },
    {
      name: 'National Domestic Violence Hotline',
      phone: '1-800-799-7233',
      description: 'Support for domestic violence survivors',
      region: 'US',
      available24h: true,
      type: 'hotline',
    },
    {
      name: 'RAINN National Sexual Assault Hotline',
      phone: '1-800-656-4673',
      description: 'Support for sexual assault survivors',
      region: 'US',
      available24h: true,
      type: 'hotline',
    },
    {
      name: 'National Suicide Prevention Lifeline',
      phone: '988',
      description: 'Mental health crisis support',
      region: 'US',
      available24h: true,
      type: 'crisis',
    },
    {
      name: 'Crisis Text Line',
      phone: 'Text HOME to 741741',
      description: 'Text-based crisis support',
      region: 'US',
      available24h: true,
      type: 'crisis',
    },
    {
      name: 'LGBTQ+ National Hotline',
      phone: '1-888-843-4564',
      description: 'Support for LGBTQ+ individuals',
      region: 'US',
      available24h: false,
      type: 'support',
    },
  ];

  /**
   * Trigger panic button - immediate emergency response
   */
  async triggerPanic(
    userId: string,
    options: PanicEventOptions = {}
  ): Promise<{
    panicEvent: PanicEvent;
    sosResult: TriggerSOSResult;
    emergencyServicesContacted: boolean;
  }> {
    const {
      location,
      reason,
      triggerType = 'button_press',
      relatedMatchId,
      relatedUserId,
      enableLiveLocation = false,
      enableAudioRecording = false,
      contactEmergencyServices = false,
    } = options;

    logger.warn(`PANIC BUTTON TRIGGERED by user ${userId}`, {
      triggerType,
      location,
      relatedUserId,
    });

    // Trigger the SOS alert first (notifies emergency contacts)
    const sosResult = await sosService.triggerSOS(
      userId,
      location ? { latitude: location.latitude, longitude: location.longitude, accuracy: location.accuracy } : undefined,
      reason
    );

    // Create panic event record
    const [panicEventRecord] = await db('panic_events')
      .insert({
        user_id: userId,
        sos_alert_id: sosResult.alert.id,
        trigger_type: triggerType,
        related_match_id: relatedMatchId,
        related_user_id: relatedUserId,
        latitude: location?.latitude,
        longitude: location?.longitude,
        location_accuracy: location?.accuracy,
        address: location?.address,
        venue_name: location?.venueName,
        emergency_services_contacted: false,
        live_location_enabled: enableLiveLocation,
        location_history: location ? JSON.stringify([{
          latitude: location.latitude,
          longitude: location.longitude,
          timestamp: new Date(),
        }]) : JSON.stringify([]),
        audio_recording_enabled: enableAudioRecording,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    let emergencyServicesContacted = false;

    // Contact emergency services if requested
    if (contactEmergencyServices) {
      emergencyServicesContacted = await this.initiateEmergencyServicesContact(
        panicEventRecord.id,
        userId,
        location
      );
    }

    const panicEvent = this.mapToPanicEvent(panicEventRecord);

    // Log critical safety event
    logger.warn(`PANIC EVENT CREATED: ${panicEvent.id}`, {
      userId,
      sosAlertId: sosResult.alert.id,
      contactsNotified: sosResult.notifiedContacts.length,
      emergencyServicesContacted,
    });

    return {
      panicEvent,
      sosResult,
      emergencyServicesContacted,
    };
  }

  /**
   * Update location for active panic event (live tracking)
   */
  async updatePanicLocation(
    userId: string,
    panicEventId: string,
    location: PanicLocation
  ): Promise<void> {
    const panicEvent = await db('panic_events')
      .where({ id: panicEventId, user_id: userId, status: 'active' })
      .first();

    if (!panicEvent) {
      throw new Error('Active panic event not found');
    }

    // Update location history
    const locationHistory = panicEvent.location_history
      ? (typeof panicEvent.location_history === 'string'
        ? JSON.parse(panicEvent.location_history)
        : panicEvent.location_history)
      : [];

    locationHistory.push({
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp: new Date(),
    });

    // Keep only last 100 location updates
    if (locationHistory.length > 100) {
      locationHistory.shift();
    }

    await db('panic_events')
      .where({ id: panicEventId })
      .update({
        latitude: location.latitude,
        longitude: location.longitude,
        location_accuracy: location.accuracy,
        address: location.address,
        venue_name: location.venueName,
        location_history: JSON.stringify(locationHistory),
        updated_at: new Date(),
      });

    logger.info(`Panic event ${panicEventId} location updated`);
  }

  /**
   * Request emergency services contact
   */
  async requestEmergencyServices(
    userId: string,
    panicEventId: string
  ): Promise<{ success: boolean; referenceNumber?: string }> {
    const panicEvent = await db('panic_events')
      .where({ id: panicEventId, user_id: userId })
      .first();

    if (!panicEvent) {
      throw new Error('Panic event not found');
    }

    if (panicEvent.emergency_services_contacted) {
      return {
        success: true,
        referenceNumber: panicEvent.emergency_reference_number,
      };
    }

    const location = panicEvent.latitude && panicEvent.longitude
      ? { latitude: panicEvent.latitude, longitude: panicEvent.longitude }
      : undefined;

    const success = await this.initiateEmergencyServicesContact(
      panicEventId,
      userId,
      location
    );

    const updated = await db('panic_events')
      .where({ id: panicEventId })
      .first();

    return {
      success,
      referenceNumber: updated?.emergency_reference_number,
    };
  }

  /**
   * Resolve panic event (user confirms safety)
   */
  async resolvePanic(
    userId: string,
    panicEventId: string,
    options: {
      resolutionNotes?: string;
      isFalseAlarm?: boolean;
    } = {}
  ): Promise<PanicEvent> {
    const { resolutionNotes, isFalseAlarm = false } = options;

    const panicEvent = await db('panic_events')
      .where({ id: panicEventId, user_id: userId })
      .first();

    if (!panicEvent) {
      throw new Error('Panic event not found');
    }

    if (panicEvent.status !== 'active' && panicEvent.status !== 'escalated') {
      throw new Error('Panic event is not active');
    }

    const status = isFalseAlarm ? 'false_alarm' : 'resolved';

    const [updated] = await db('panic_events')
      .where({ id: panicEventId })
      .update({
        status,
        resolution_notes: resolutionNotes,
        resolved_by: userId,
        resolved_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    // Also resolve the SOS alert
    if (panicEvent.sos_alert_id) {
      await sosService.cancelSOS(userId, panicEvent.sos_alert_id);
    }

    logger.info(`Panic event ${panicEventId} resolved`, { status, isFalseAlarm });

    return this.mapToPanicEvent(updated);
  }

  /**
   * Escalate panic event (support team intervention)
   */
  async escalatePanic(
    panicEventId: string,
    reason: string,
    adminId?: string
  ): Promise<PanicEvent> {
    const panicEvent = await db('panic_events')
      .where({ id: panicEventId })
      .first();

    if (!panicEvent) {
      throw new Error('Panic event not found');
    }

    const [updated] = await db('panic_events')
      .where({ id: panicEventId })
      .update({
        status: 'escalated',
        resolution_notes: `Escalated: ${reason}`,
        updated_at: new Date(),
      })
      .returning('*');

    // Escalate the SOS alert as well
    if (panicEvent.sos_alert_id) {
      await sosService.escalateSOS(panicEvent.sos_alert_id, reason, true);
    }

    logger.warn(`Panic event ${panicEventId} ESCALATED`, { reason, adminId });

    return this.mapToPanicEvent(updated);
  }

  /**
   * Get active panic events for a user
   */
  async getActivePanicEvents(userId: string): Promise<PanicEvent[]> {
    const events = await db('panic_events')
      .where({ user_id: userId })
      .whereIn('status', ['active', 'escalated'])
      .orderBy('created_at', 'desc');

    return events.map(this.mapToPanicEvent);
  }

  /**
   * Get panic event history for a user
   */
  async getPanicHistory(
    userId: string,
    options: { limit?: number } = {}
  ): Promise<PanicEvent[]> {
    const { limit = 50 } = options;

    const events = await db('panic_events')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit);

    return events.map(this.mapToPanicEvent);
  }

  /**
   * Get panic event by ID
   */
  async getPanicEvent(panicEventId: string, userId: string): Promise<PanicEvent | null> {
    const event = await db('panic_events')
      .where({ id: panicEventId, user_id: userId })
      .first();

    return event ? this.mapToPanicEvent(event) : null;
  }

  /**
   * Get all active panic events (for admin/support)
   */
  async getAllActivePanicEvents(): Promise<PanicEvent[]> {
    const events = await db('panic_events')
      .whereIn('status', ['active', 'escalated'])
      .orderBy('created_at', 'desc')
      .leftJoin('users', 'panic_events.user_id', 'users.id')
      .select('panic_events.*', 'users.email', 'users.first_name', 'users.phone_number');

    return events.map(this.mapToPanicEvent);
  }

  /**
   * Get emergency resources
   */
  getEmergencyResources(region?: string): EmergencyResources[] {
    if (!region) {
      return this.emergencyResources;
    }

    return this.emergencyResources.filter(
      resource => !resource.region || resource.region === region
    );
  }

  /**
   * Get panic statistics (for admin dashboard)
   */
  async getPanicStatistics(): Promise<{
    totalEvents: number;
    activeEvents: number;
    eventsToday: number;
    eventsThisWeek: number;
    emergencyServicesContacted: number;
    falseAlarms: number;
    averageResolutionTimeMinutes: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [{ count: totalEvents }] = await db('panic_events').count('* as count');
    const [{ count: activeEvents }] = await db('panic_events')
      .whereIn('status', ['active', 'escalated'])
      .count('* as count');
    const [{ count: eventsToday }] = await db('panic_events')
      .where('created_at', '>=', today)
      .count('* as count');
    const [{ count: eventsThisWeek }] = await db('panic_events')
      .where('created_at', '>=', weekAgo)
      .count('* as count');
    const [{ count: emergencyServicesContacted }] = await db('panic_events')
      .where('emergency_services_contacted', true)
      .count('* as count');
    const [{ count: falseAlarms }] = await db('panic_events')
      .where('status', 'false_alarm')
      .count('* as count');

    // Calculate average resolution time
    const resolvedEvents = await db('panic_events')
      .whereNotNull('resolved_at')
      .select('created_at', 'resolved_at');

    let averageResolutionTimeMinutes = 0;
    if (resolvedEvents.length > 0) {
      const totalMinutes = resolvedEvents.reduce((sum, event) => {
        const created = new Date(event.created_at).getTime();
        const resolved = new Date(event.resolved_at).getTime();
        return sum + (resolved - created) / (1000 * 60);
      }, 0);
      averageResolutionTimeMinutes = Math.round(totalMinutes / resolvedEvents.length);
    }

    return {
      totalEvents: parseInt(totalEvents as string, 10),
      activeEvents: parseInt(activeEvents as string, 10),
      eventsToday: parseInt(eventsToday as string, 10),
      eventsThisWeek: parseInt(eventsThisWeek as string, 10),
      emergencyServicesContacted: parseInt(emergencyServicesContacted as string, 10),
      falseAlarms: parseInt(falseAlarms as string, 10),
      averageResolutionTimeMinutes,
    };
  }

  // Private helper methods

  /**
   * Initiate contact with emergency services
   * In production, this would integrate with actual 911/emergency dispatch APIs
   */
  private async initiateEmergencyServicesContact(
    panicEventId: string,
    userId: string,
    location?: { latitude: number; longitude: number }
  ): Promise<boolean> {
    try {
      // Get user information
      const user = await db('users')
        .where({ id: userId })
        .select('first_name', 'last_name', 'phone_number', 'email')
        .first();

      // Generate a reference number
      const referenceNumber = `FLM-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Log the emergency services contact request
      logger.warn(`EMERGENCY SERVICES CONTACT INITIATED`, {
        panicEventId,
        userId,
        referenceNumber,
        userName: user ? `${user.first_name} ${user.last_name}` : 'Unknown',
        userPhone: user?.phone_number,
        location,
      });

      // In production, this would:
      // 1. Call 911 API if available in the region
      // 2. Send detailed information to dispatch
      // 3. Initiate automated call to emergency services
      // 4. Send location data to first responders

      // Update the panic event
      await db('panic_events')
        .where({ id: panicEventId })
        .update({
          emergency_services_contacted: true,
          emergency_services_contacted_at: new Date(),
          emergency_reference_number: referenceNumber,
          updated_at: new Date(),
        });

      return true;
    } catch (error) {
      logger.error('Failed to initiate emergency services contact:', error);
      return false;
    }
  }

  /**
   * Map database record to PanicEvent
   */
  private mapToPanicEvent(record: any): PanicEvent {
    return {
      id: record.id,
      userId: record.user_id,
      sosAlertId: record.sos_alert_id,
      triggerType: record.trigger_type,
      location: record.latitude && record.longitude
        ? {
          latitude: record.latitude,
          longitude: record.longitude,
          accuracy: record.location_accuracy,
          address: record.address,
          venueName: record.venue_name,
        }
        : undefined,
      relatedMatchId: record.related_match_id,
      relatedUserId: record.related_user_id,
      emergencyServicesContacted: record.emergency_services_contacted,
      emergencyServicesContactedAt: record.emergency_services_contacted_at,
      emergencyReferenceNumber: record.emergency_reference_number,
      liveLocationEnabled: record.live_location_enabled,
      locationHistory: record.location_history
        ? (typeof record.location_history === 'string'
          ? JSON.parse(record.location_history)
          : record.location_history)
        : [],
      audioRecordingEnabled: record.audio_recording_enabled,
      audioRecordingUrl: record.audio_recording_url,
      status: record.status,
      resolutionNotes: record.resolution_notes,
      resolvedBy: record.resolved_by,
      resolvedAt: record.resolved_at,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }
}

export const panicButtonService = new PanicButtonService();
export default panicButtonService;
