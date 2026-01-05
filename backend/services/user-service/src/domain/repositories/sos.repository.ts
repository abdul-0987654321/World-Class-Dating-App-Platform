import { v4 as uuidv4 } from 'uuid';

import { db } from '../../infrastructure/database';
import logger from '../../utils/logger';
import {
  SOSAlert,
  EmergencyContact,
  SafetyCheckin,
  CreateSOSAlertInput,
  CreateEmergencyContactInput,
  CreateSafetyCheckinInput,
  SOSAlertStatus,
  CheckinStatus,
} from '../entities/SOS.entity';

export class SOSRepository {
  // ==================== SOS ALERTS ====================

  async createAlert(input: CreateSOSAlertInput): Promise<SOSAlert> {
    const id = uuidv4();
    const now = new Date();

    // Database row with JSON-serialized fields
    const alertRow = {
      id,
      user_id: input.user_id,
      status: 'active' as const,
      alert_type: input.alert_type,
      location: input.location ? JSON.stringify(input.location) : null,
      reason: input.reason,
      emergency_contacts_notified: JSON.stringify([]),
      created_at: now,
      updated_at: now,
    };

    try {
      await db('sos_alerts').insert(alertRow);
      return this.getAlertById(id);
    } catch (error) {
      logger.error('Failed to create SOS alert:', error);
      throw error;
    }
  }

  async getAlertById(alertId: string): Promise<SOSAlert | null> {
    const alert = await db('sos_alerts').where({ id: alertId }).first();
    if (!alert) return null;

    return {
      ...alert,
      location: alert.location ? JSON.parse(alert.location) : null,
      emergency_contacts_notified: JSON.parse(alert.emergency_contacts_notified || '[]'),
    };
  }

  async getActiveAlertByUser(userId: string): Promise<SOSAlert | null> {
    const alert = await db('sos_alerts')
      .where({ user_id: userId, status: 'active' })
      .orderBy('created_at', 'desc')
      .first();

    if (!alert) return null;

    return {
      ...alert,
      location: alert.location ? JSON.parse(alert.location) : null,
      emergency_contacts_notified: JSON.parse(alert.emergency_contacts_notified || '[]'),
    };
  }

  async getUserAlertHistory(userId: string, limit = 20): Promise<SOSAlert[]> {
    const alerts = await db('sos_alerts')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit);

    return alerts.map((alert: any) => ({
      ...alert,
      location: alert.location ? JSON.parse(alert.location) : null,
      emergency_contacts_notified: JSON.parse(alert.emergency_contacts_notified || '[]'),
    }));
  }

  async updateAlertStatus(
    alertId: string,
    status: SOSAlertStatus,
    resolutionNotes?: string
  ): Promise<SOSAlert | null> {
    const updateData: any = {
      status,
      updated_at: new Date(),
    };

    if (status === 'resolved' || status === 'cancelled') {
      updateData.resolved_at = new Date();
    }

    if (resolutionNotes) {
      updateData.resolution_notes = resolutionNotes;
    }

    await db('sos_alerts').where({ id: alertId }).update(updateData);
    return this.getAlertById(alertId);
  }

  async updateNotifiedContacts(alertId: string, contactIds: string[]): Promise<void> {
    await db('sos_alerts')
      .where({ id: alertId })
      .update({
        emergency_contacts_notified: JSON.stringify(contactIds),
        updated_at: new Date(),
      });
  }

  // ==================== EMERGENCY CONTACTS ====================

  async createEmergencyContact(input: CreateEmergencyContactInput): Promise<EmergencyContact> {
    const id = uuidv4();
    const now = new Date();

    const contact: Partial<EmergencyContact> = {
      id,
      user_id: input.user_id,
      name: input.name,
      phone: input.phone,
      email: input.email,
      relationship: input.relationship,
      notify_on_sos: input.notify_on_sos ?? true,
      notify_on_checkin_miss: input.notify_on_checkin_miss ?? true,
      is_verified: false,
      created_at: now,
      updated_at: now,
    };

    await db('emergency_contacts').insert(contact);
    return this.getEmergencyContactById(id);
  }

  async getEmergencyContactById(contactId: string): Promise<EmergencyContact | null> {
    return db('emergency_contacts').where({ id: contactId }).first();
  }

  async getUserEmergencyContacts(userId: string): Promise<EmergencyContact[]> {
    return db('emergency_contacts').where({ user_id: userId }).orderBy('created_at', 'asc');
  }

  async getSOSNotifiableContacts(userId: string): Promise<EmergencyContact[]> {
    return db('emergency_contacts')
      .where({ user_id: userId, notify_on_sos: true })
      .orderBy('created_at', 'asc');
  }

  async updateEmergencyContact(
    contactId: string,
    updates: Partial<EmergencyContact>
  ): Promise<EmergencyContact | null> {
    await db('emergency_contacts')
      .where({ id: contactId })
      .update({
        ...updates,
        updated_at: new Date(),
      });
    return this.getEmergencyContactById(contactId);
  }

  async deleteEmergencyContact(contactId: string, userId: string): Promise<boolean> {
    const deleted = await db('emergency_contacts')
      .where({ id: contactId, user_id: userId })
      .delete();
    return deleted > 0;
  }

  // ==================== SAFETY CHECKINS ====================

  async createCheckin(input: CreateSafetyCheckinInput): Promise<SafetyCheckin> {
    const id = uuidv4();
    const now = new Date();

    // Database row with JSON-serialized fields
    const checkinRow = {
      id,
      user_id: input.user_id,
      scheduled_at: input.scheduled_at,
      status: 'scheduled' as const,
      meeting_details: input.meeting_details ? JSON.stringify(input.meeting_details) : null,
      reminder_sent: false,
      escalated: false,
      created_at: now,
      updated_at: now,
    };

    await db('safety_checkins').insert(checkinRow);
    return this.getCheckinById(id);
  }

  async getCheckinById(checkinId: string): Promise<SafetyCheckin | null> {
    const checkin = await db('safety_checkins').where({ id: checkinId }).first();
    if (!checkin) return null;

    return {
      ...checkin,
      meeting_details: checkin.meeting_details ? JSON.parse(checkin.meeting_details) : null,
    };
  }

  async getActiveCheckins(userId: string): Promise<SafetyCheckin[]> {
    const checkins = await db('safety_checkins')
      .where({ user_id: userId })
      .whereIn('status', ['scheduled', 'active'])
      .orderBy('scheduled_at', 'asc');

    return checkins.map((c: any) => ({
      ...c,
      meeting_details: c.meeting_details ? JSON.parse(c.meeting_details) : null,
    }));
  }

  async updateCheckinStatus(
    checkinId: string,
    status: CheckinStatus
  ): Promise<SafetyCheckin | null> {
    const updateData: any = {
      status,
      updated_at: new Date(),
    };

    if (status === 'checked_in') {
      updateData.checked_in_at = new Date();
    }

    await db('safety_checkins').where({ id: checkinId }).update(updateData);
    return this.getCheckinById(checkinId);
  }

  async getMissedCheckins(): Promise<SafetyCheckin[]> {
    const now = new Date();
    // Checkins that are past scheduled time and still in 'active' status
    const checkins = await db('safety_checkins')
      .where('status', 'active')
      .where('scheduled_at', '<', now)
      .where('escalated', false);

    return checkins.map((c: any) => ({
      ...c,
      meeting_details: c.meeting_details ? JSON.parse(c.meeting_details) : null,
    }));
  }

  async markCheckinEscalated(checkinId: string): Promise<void> {
    await db('safety_checkins').where({ id: checkinId }).update({
      escalated: true,
      status: 'missed',
      updated_at: new Date(),
    });
  }
}

export const sosRepository = new SOSRepository();
