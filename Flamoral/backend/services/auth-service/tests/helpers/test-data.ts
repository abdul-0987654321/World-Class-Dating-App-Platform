import { v4 as uuidv4 } from 'uuid';

export const createMockUser = (overrides?: any) => ({
  id: uuidv4(),
  email: 'test@example.com',
  password_hash: '$2b$10$abcdefghijklmnopqrstuvwxyz',
  first_name: 'John',
  last_name: 'Doe',
  date_of_birth: new Date('1995-01-01'),
  gender: 'male',
  phone_number: '+1234567890',
  is_verified: false,
  is_email_verified: false,
  is_phone_verified: false,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

export const createMockCreateUserDto = (overrides?: any) => ({
  email: 'test@example.com',
  password: 'Test123!@#',
  first_name: 'John',
  last_name: 'Doe',
  date_of_birth: new Date('1995-01-01'),
  gender: 'male',
  phone_number: '+1234567890',
  ...overrides,
});

export const createMockVerificationToken = (userId: string, type: 'email_verification' | 'password_reset' = 'email_verification') => ({
  id: uuidv4(),
  user_id: userId,
  token: 'mock-token-' + uuidv4(),
  token_type: type,
  expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
  is_used: false,
  created_at: new Date(),
  updated_at: new Date(),
});

export const mockJwtPayload = (userId?: string) => ({
  userId: userId || uuidv4(),
  email: 'test@example.com',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
});

export const createMockOAuthProfile = (provider: 'google' | 'facebook' | 'apple', overrides?: any) => ({
  id: `${provider}_user_123`,
  email: 'oauth@example.com',
  first_name: 'OAuth',
  last_name: 'User',
  profile_picture: 'https://example.com/picture.jpg',
  provider,
  ...overrides,
});
