export interface UserModel {
  id: string;
  email: string;
  email_verified: boolean;
  phone?: string;
  phone_verified: boolean;
  password_hash: string;
  first_name: string;
  last_name?: string;
  date_of_birth: Date;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  role: 'user' | 'admin' | 'moderator';
  subscription_tier: 'free' | 'premium' | 'premium_plus';
  subscription_expires_at?: Date;
  coin_balance: number;
  is_active: boolean;
  is_banned: boolean;
  is_verified: boolean; // Photo verification
  last_login_at?: Date;
  last_active_at?: Date;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface UserCreateInput {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  phone?: string;
}

export interface UserUpdateInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface UserSettings {
  user_id: string;
  // Notifications
  notifications_push: boolean;
  notifications_email: boolean;
  notifications_sms: boolean;
  notify_new_matches: boolean;
  notify_messages: boolean;
  notify_likes: boolean;
  notify_super_likes: boolean;
  // Privacy
  privacy_show_online: boolean;
  privacy_show_distance: boolean;
  privacy_show_age: boolean;
  privacy_incognito_mode: boolean;
  // Discovery
  discovery_age_min: number;
  discovery_age_max: number;
  discovery_distance_max: number;
  discovery_show_me: string[]; // Array of genders
  created_at: Date;
  updated_at: Date;
}

export interface UserLocation {
  user_id: string;
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  country?: string;
  updated_at: Date;
}
