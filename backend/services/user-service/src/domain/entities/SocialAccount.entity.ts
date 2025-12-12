export interface SocialAccountEntity {
  id: string;
  user_id: string;
  provider: 'google' | 'apple' | 'facebook';
  provider_user_id: string;
  provider_email?: string;
  provider_name?: string;
  provider_picture?: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: Date;
  profile_data?: any; // JSON field for additional provider data
  is_primary: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSocialAccountDto {
  user_id: string;
  provider: 'google' | 'apple' | 'facebook';
  provider_user_id: string;
  provider_email?: string;
  provider_name?: string;
  provider_picture?: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: Date;
  profile_data?: any;
  is_primary?: boolean;
}

export interface UpdateSocialAccountDto {
  provider_email?: string;
  provider_name?: string;
  provider_picture?: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: Date;
  profile_data?: any;
}

export interface SocialAccountResponse {
  id: string;
  user_id: string;
  provider: string;
  provider_email?: string;
  provider_name?: string;
  is_primary: boolean;
  created_at: Date;
}
