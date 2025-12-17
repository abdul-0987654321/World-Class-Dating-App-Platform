export interface TravelDestinationEntity {
  id: string;
  user_id: string;
  city: string;
  state?: string;
  country: string;
  country_code: string;
  airport_code?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  start_date: Date;
  end_date: Date;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  is_active: boolean;
  show_on_profile: boolean;
  match_before_arrival: boolean;
  is_premium_travel: boolean;
  travel_notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface TravelHistoryEntity {
  id: string;
  user_id: string;
  destination_id: string;
  city: string;
  country: string;
  visited_at: Date;
  matches_made: number;
  connections_made: number;
  created_at: Date;
  updated_at: Date;
}

export interface PopularDestinationEntity {
  id: string;
  city: string;
  state?: string;
  country: string;
  country_code: string;
  airport_code?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  traveler_count: number;
  active_travelers: number;
  popularity_score: number;
  display_name: string;
  image_url?: string;
  description?: string;
  tags: string[];
  created_at: Date;
  updated_at: Date;
}

export interface TravelBuddyPreferencesEntity {
  id: string;
  user_id: string;
  looking_for_travel_buddy: boolean;
  travel_style: string[];
  preferred_activities: string[];
  budget_range_min?: number;
  budget_range_max?: number;
  budget_currency: string;
  created_at: Date;
  updated_at: Date;
}

export interface LocationChangeEntity {
  id: string;
  user_id: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  change_type: 'travel_mode' | 'passport' | 'physical_location';
  is_premium: boolean;
  changed_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface TravelModeSettingsEntity {
  id: string;
  user_id: string;
  travel_mode_enabled: boolean;
  unlimited_passport_enabled: boolean;
  auto_location_switch: boolean;
  notify_local_matches: boolean;
  show_travel_badge: boolean;
  max_simultaneous_destinations: number;
  passport_changes_remaining: number;
  passport_reset_date?: Date;
  notify_before_arrival: boolean;
  notify_days_before: number;
  created_at: Date;
  updated_at: Date;
}

// DTOs
export interface CreateTravelDestinationDto {
  city: string;
  state?: string;
  country: string;
  country_code: string;
  airport_code?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  start_date: Date;
  end_date: Date;
  show_on_profile?: boolean;
  match_before_arrival?: boolean;
  travel_notes?: string;
}

export interface UpdateTravelDestinationDto {
  start_date?: Date;
  end_date?: Date;
  show_on_profile?: boolean;
  match_before_arrival?: boolean;
  travel_notes?: string;
  status?: 'scheduled' | 'active' | 'completed' | 'cancelled';
}

export interface CreateLocationChangeDto {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  change_type: 'travel_mode' | 'passport' | 'physical_location';
}

export interface UpdateTravelBuddyPreferencesDto {
  looking_for_travel_buddy?: boolean;
  travel_style?: string[];
  preferred_activities?: string[];
  budget_range_min?: number;
  budget_range_max?: number;
  budget_currency?: string;
}

export interface UpdateTravelModeSettingsDto {
  travel_mode_enabled?: boolean;
  auto_location_switch?: boolean;
  notify_local_matches?: boolean;
  show_travel_badge?: boolean;
  notify_before_arrival?: boolean;
  notify_days_before?: number;
}

export interface TravelDestinationResponse {
  id: string;
  city: string;
  state?: string;
  country: string;
  country_code: string;
  airport_code?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  start_date: Date;
  end_date: Date;
  status: string;
  is_active: boolean;
  show_on_profile: boolean;
  match_before_arrival: boolean;
  is_premium_travel: boolean;
  travel_notes?: string;
  days_until_arrival?: number;
  days_remaining?: number;
  created_at: Date;
}

export interface TravelModeStatusResponse {
  is_traveling: boolean;
  current_destination?: TravelDestinationResponse;
  upcoming_destinations: TravelDestinationResponse[];
  travel_history_count: number;
  settings: TravelModeSettingsEntity;
}

export interface PopularDestinationResponse {
  id: string;
  city: string;
  state?: string;
  country: string;
  display_name: string;
  image_url?: string;
  description?: string;
  tags: string[];
  traveler_count: number;
  active_travelers: number;
  popularity_score: number;
}
