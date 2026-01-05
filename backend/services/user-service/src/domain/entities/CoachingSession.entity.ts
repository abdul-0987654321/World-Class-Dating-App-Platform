/**
 * Coaching Session Entity
 * Represents dating coach sessions for Elite tier members
 */

export type CoachingSessionStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';
export type CoachingSessionType =
  | 'initial_consultation'
  | 'follow_up'
  | 'profile_review'
  | 'date_prep'
  | 'post_date_debrief';

export interface CoachingSession {
  id: string;
  user_id: string;
  coach_id: string;
  scheduled_at: Date;
  duration: number; // in minutes
  status: CoachingSessionStatus;
  type: CoachingSessionType;
  topic?: string;
  notes?: string;
  coach_notes?: string;
  meeting_link?: string;
  rating?: number; // 1-5
  feedback?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CoachingSessionCreateInput {
  user_id: string;
  coach_id: string;
  scheduled_at: Date;
  duration?: number;
  type?: CoachingSessionType;
  topic?: string;
}

export interface CoachingSessionUpdateInput {
  scheduled_at?: Date;
  duration?: number;
  status?: CoachingSessionStatus;
  type?: CoachingSessionType;
  topic?: string;
  notes?: string;
  coach_notes?: string;
  meeting_link?: string;
  rating?: number;
  feedback?: string;
}

export interface Coach {
  id: string;
  user_id: string;
  name: string;
  title: string;
  bio: string;
  specialties: string[];
  avatar_url?: string;
  availability_hours?: string;
  rating: number;
  total_sessions: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CoachCreateInput {
  user_id: string;
  name: string;
  title: string;
  bio: string;
  specialties?: string[];
  avatar_url?: string;
  availability_hours?: string;
}

export interface CoachAssignment {
  id: string;
  user_id: string;
  coach_id: string;
  assigned_at: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CoachWithDetails extends Coach {
  next_available_slot?: Date;
  sessions_completed?: number;
}

export interface CoachingSessionWithCoach extends CoachingSession {
  coach_name: string;
  coach_title: string;
  coach_avatar_url?: string;
}
