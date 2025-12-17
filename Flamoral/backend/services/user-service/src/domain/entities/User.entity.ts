export interface UserEntity {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  date_of_birth: Date;
  gender: 'male' | 'female' | 'non-binary' | 'other' | 'prefer_not_to_say';
  phone_number?: string;
  role: 'user' | 'admin' | 'moderator';
  is_verified: boolean;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  is_active: boolean;
  subscription_tier?: string;
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserDto {
  email: string;
  password?: string;
  password_hash?: string;
  first_name: string;
  last_name: string;
  date_of_birth: Date;
  gender: 'male' | 'female' | 'non-binary' | 'other' | 'prefer_not_to_say';
  phone_number?: string;
  is_email_verified?: boolean;
}

export interface UpdateUserDto {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
}

export interface UserResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  date_of_birth: Date;
  gender: string;
  phone_number?: string;
  is_verified: boolean;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  created_at: Date;
}
