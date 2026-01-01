/**
 * SOS Alert Entity
 * Emergency alert system for user safety
 */

export interface SOSAlert {
  id: string;
  user_id: string;
  status: SOSAlertStatus;
  alert_type: SOSAlertType;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
  };
  reason?: string;
  emergency_contacts_notified: string[];
  created_at: Date;
  updated_at: Date;
  resolved_at?: Date;
  resolution_notes?: string;
}

export interface EmergencyContact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email?: string;
  relationship: EmergencyContactRelationship;
  notify_on_sos: boolean;
  notify_on_checkin_miss: boolean;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SafetyCheckin {
  id: string;
  user_id: string;
  scheduled_at: Date;
  checked_in_at?: Date;
  status: CheckinStatus;
  meeting_details?: {
    location?: string;
    with_user_id?: string;
    notes?: string;
  };
  reminder_sent: boolean;
  escalated: boolean;
  created_at: Date;
  updated_at: Date;
}

// Enums
export type SOSAlertStatus = 'active' | 'resolved' | 'cancelled' | 'escalated';
export type SOSAlertType = 'emergency' | 'uncomfortable' | 'checkin_missed' | 'manual';
export type EmergencyContactRelationship = 'family' | 'friend' | 'partner' | 'other';
export type CheckinStatus = 'scheduled' | 'active' | 'checked_in' | 'missed' | 'cancelled';

export const SOS_ALERT_STATUS = {
  ACTIVE: 'active' as SOSAlertStatus,
  RESOLVED: 'resolved' as SOSAlertStatus,
  CANCELLED: 'cancelled' as SOSAlertStatus,
  ESCALATED: 'escalated' as SOSAlertStatus,
};

export const SOS_ALERT_TYPE = {
  EMERGENCY: 'emergency' as SOSAlertType,
  UNCOMFORTABLE: 'uncomfortable' as SOSAlertType,
  CHECKIN_MISSED: 'checkin_missed' as SOSAlertType,
  MANUAL: 'manual' as SOSAlertType,
};

// DTOs
export interface CreateSOSAlertInput {
  user_id: string;
  alert_type: SOSAlertType;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  reason?: string;
}

export interface ResolveSOSAlertInput {
  alert_id: string;
  resolution_notes?: string;
}

export interface CreateEmergencyContactInput {
  user_id: string;
  name: string;
  phone: string;
  email?: string;
  relationship: EmergencyContactRelationship;
  notify_on_sos?: boolean;
  notify_on_checkin_miss?: boolean;
}

export interface CreateSafetyCheckinInput {
  user_id: string;
  scheduled_at: Date;
  meeting_details?: {
    location?: string;
    with_user_id?: string;
    notes?: string;
  };
}

// Crisis Resources
export interface CrisisResource {
  name: string;
  contact: string;
  description?: string;
  hours: string;
  type: 'hotline' | 'text' | 'chat' | 'website';
  region?: string;
}

export const DEFAULT_CRISIS_RESOURCES: CrisisResource[] = [
  {
    name: 'National Domestic Violence Hotline',
    contact: '1-800-799-7233',
    description: 'Support for domestic violence victims',
    hours: '24/7',
    type: 'hotline',
    region: 'US',
  },
  {
    name: 'RAINN Sexual Assault Hotline',
    contact: '1-800-656-4673',
    description: 'Sexual assault support and resources',
    hours: '24/7',
    type: 'hotline',
    region: 'US',
  },
  {
    name: 'Crisis Text Line',
    contact: 'Text HOME to 741741',
    description: 'Free, 24/7 crisis counseling via text',
    hours: '24/7',
    type: 'text',
    region: 'US',
  },
  {
    name: 'National Suicide Prevention Lifeline',
    contact: '988',
    description: 'Suicide prevention and mental health crisis support',
    hours: '24/7',
    type: 'hotline',
    region: 'US',
  },
];
