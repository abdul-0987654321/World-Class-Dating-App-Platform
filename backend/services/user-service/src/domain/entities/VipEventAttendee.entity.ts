/**
 * VIP Event Attendee Entity
 * Tracks user registrations for VIP events
 */

export type VipEventAttendeeStatus = 'registered' | 'attended' | 'cancelled' | 'no_show';

export interface VipEventAttendee {
  id: string;
  event_id: string;
  user_id: string;
  status: VipEventAttendeeStatus;
  registered_at: Date;
  attended_at?: Date;
  cancelled_at?: Date;
  cancellation_reason?: string;
  created_at: Date;
  updated_at: Date;
}

export interface VipEventAttendeeCreateInput {
  event_id: string;
  user_id: string;
  status?: VipEventAttendeeStatus;
}

export interface VipEventAttendeeUpdateInput {
  status?: VipEventAttendeeStatus;
  attended_at?: Date;
  cancelled_at?: Date;
  cancellation_reason?: string;
}

export interface VipEventAttendeeWithEvent extends VipEventAttendee {
  event_name: string;
  event_date: Date;
  event_type: string;
  event_location?: string;
  event_image_url?: string;
}
