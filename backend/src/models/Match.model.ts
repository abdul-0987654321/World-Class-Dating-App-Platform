export interface SwipeModel {
  id: string;
  user_id: string; // Person who swiped
  target_user_id: string; // Person being swiped on
  action: 'like' | 'pass' | 'super_like';
  swiped_at: Date;
  created_at: Date;
}

export interface MatchModel {
  id: string;
  user_id_1: string;
  user_id_2: string;
  matched_at: Date;
  is_active: boolean; // False if either user unmatched
  last_message_at?: Date;
  unread_count_user_1: number;
  unread_count_user_2: number;
  created_at: Date;
  updated_at: Date;
}

export interface DailyLimitModel {
  id: string;
  user_id: string;
  date: Date; // Date for this limit (YYYY-MM-DD)
  likes_count: number;
  super_likes_count: number;
  rewinds_count: number;
  boosts_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface BoostModel {
  id: string;
  user_id: string;
  started_at: Date;
  expires_at: Date; // Usually 30 minutes from started_at
  is_active: boolean;
  views_gained: number;
  created_at: Date;
}

export interface BlockModel {
  id: string;
  user_id: string; // Person who blocked
  blocked_user_id: string; // Person being blocked
  reason?: string;
  blocked_at: Date;
  created_at: Date;
}

export interface ReportModel {
  id: string;
  reporter_user_id: string;
  reported_user_id: string;
  reason: string;
  details?: string;
  status: 'pending' | 'reviewed' | 'action_taken' | 'dismissed';
  reviewed_by?: string; // Admin user ID
  reviewed_at?: Date;
  action_taken?: string;
  created_at: Date;
  updated_at: Date;
}
