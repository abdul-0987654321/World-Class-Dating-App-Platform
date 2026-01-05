// Interest and Intention Badge Entity Types for Profile Matching

// Interest Badge
export interface InterestBadge {
  id: string;
  name: string;
  slug: string;
  icon: string;
  category:
    | 'lifestyle'
    | 'sports_fitness'
    | 'arts_culture'
    | 'food_drink'
    | 'entertainment'
    | 'outdoor'
    | 'social'
    | 'tech'
    | 'other';
  display_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Intention Badge
export interface IntentionBadge {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  display_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// User Interest Badge (junction)
export interface UserInterestBadge {
  id: string;
  user_id: string;
  badge_id: string;
  selected_at: Date;
}

// User Intention Badge (junction)
export interface UserIntentionBadge {
  id: string;
  user_id: string;
  badge_id: string;
  priority: 1 | 2;
  selected_at: Date;
  updated_at: Date;
}

// DTOs

export interface UpdateUserInterestBadgesDto {
  badge_ids: string[];
}

export interface UpdateUserIntentionBadgesDto {
  badges: Array<{
    badge_id: string;
    priority: 1 | 2;
  }>;
}

// Response types with populated badge data
export interface UserInterestBadgeResponse {
  id: string;
  name: string;
  slug: string;
  icon: string;
  category: string;
  selected_at: Date;
}

export interface UserIntentionBadgeResponse {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  priority: 1 | 2;
  selected_at: Date;
}

export interface UserBadgesProfile {
  interest_badges: UserInterestBadgeResponse[];
  intention_badges: UserIntentionBadgeResponse[];
}

// Badge Statistics
export interface InterestBadgePopularity {
  id: string;
  name: string;
  slug: string;
  category: string;
  user_count: number;
  percentage_of_users: number;
}

export interface IntentionBadgeDistribution {
  id: string;
  name: string;
  slug: string;
  user_count: number;
  primary_count: number;
  secondary_count: number;
  percentage_of_users: number;
}
