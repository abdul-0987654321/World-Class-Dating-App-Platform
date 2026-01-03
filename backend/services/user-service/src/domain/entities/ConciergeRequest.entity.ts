/**
 * Concierge Request Entity
 * Represents concierge service requests for Elite tier members
 */

export type ConciergeRequestType = 'date-planning' | 'reservation' | 'advice' | 'gift-recommendation' | 'travel' | 'other';
export type ConciergeRequestStatus = 'pending' | 'in_progress' | 'awaiting_info' | 'completed' | 'cancelled';
export type ConciergeRequestPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface ConciergeRequest {
  id: string;
  user_id: string;
  type: ConciergeRequestType;
  description: string;
  status: ConciergeRequestStatus;
  priority: ConciergeRequestPriority;
  assigned_to?: string;
  response?: string;
  additional_notes?: string;
  budget_range?: string;
  preferred_date?: Date;
  location_preference?: string;
  attachments?: string[];
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface ConciergeRequestCreateInput {
  user_id: string;
  type: ConciergeRequestType;
  description: string;
  priority?: ConciergeRequestPriority;
  budget_range?: string;
  preferred_date?: Date;
  location_preference?: string;
  attachments?: string[];
}

export interface ConciergeRequestUpdateInput {
  type?: ConciergeRequestType;
  description?: string;
  status?: ConciergeRequestStatus;
  priority?: ConciergeRequestPriority;
  assigned_to?: string;
  response?: string;
  additional_notes?: string;
  budget_range?: string;
  preferred_date?: Date;
  location_preference?: string;
  attachments?: string[];
  completed_at?: Date;
}

export interface ConciergeMessage {
  id: string;
  request_id: string;
  sender_id: string;
  sender_type: 'user' | 'concierge';
  message: string;
  attachments?: string[];
  created_at: Date;
}

export interface ConciergeMessageCreateInput {
  request_id: string;
  sender_id: string;
  sender_type: 'user' | 'concierge';
  message: string;
  attachments?: string[];
}

export interface ConciergeRequestWithMessages extends ConciergeRequest {
  messages: ConciergeMessage[];
  assigned_concierge_name?: string;
}

export interface ConciergeRequestResponse {
  id: string;
  type: ConciergeRequestType;
  description: string;
  status: ConciergeRequestStatus;
  priority: ConciergeRequestPriority;
  response?: string;
  preferred_date?: Date;
  location_preference?: string;
  created_at: Date;
  updated_at: Date;
}
