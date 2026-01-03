/**
 * VIP Event Entity
 * Represents exclusive events for Elite tier members
 */

export type VipEventType = 'virtual' | 'in-person';
export type VipEventTier = 'elite';

export interface VipEvent {
  id: string;
  name: string;
  description: string;
  type: VipEventType;
  location?: string;
  virtual_link?: string;
  date: Date;
  end_date?: Date;
  max_attendees: number;
  current_attendees: number;
  tier: VipEventTier;
  image_url?: string;
  host_name?: string;
  host_title?: string;
  tags?: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface VipEventCreateInput {
  name: string;
  description: string;
  type: VipEventType;
  location?: string;
  virtual_link?: string;
  date: Date;
  end_date?: Date;
  max_attendees: number;
  tier?: VipEventTier;
  image_url?: string;
  host_name?: string;
  host_title?: string;
  tags?: string[];
}

export interface VipEventUpdateInput {
  name?: string;
  description?: string;
  type?: VipEventType;
  location?: string;
  virtual_link?: string;
  date?: Date;
  end_date?: Date;
  max_attendees?: number;
  image_url?: string;
  host_name?: string;
  host_title?: string;
  tags?: string[];
  is_active?: boolean;
}

export interface VipEventListFilters {
  type?: VipEventType;
  upcoming_only?: boolean;
  has_availability?: boolean;
  tags?: string[];
}

export interface VipEventResponse {
  id: string;
  name: string;
  description: string;
  type: VipEventType;
  location?: string;
  virtual_link?: string;
  date: Date;
  end_date?: Date;
  max_attendees: number;
  current_attendees: number;
  spots_available: number;
  tier: VipEventTier;
  image_url?: string;
  host_name?: string;
  host_title?: string;
  tags?: string[];
  is_registered?: boolean;
}
