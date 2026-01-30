import { v4 as uuidv4 } from 'uuid';
import { UserEntity, CreateUserDto } from '../../domain/entities/User.entity';
import { ProfileEntity } from '../../domain/entities/Profile.entity';

export const createMockUser = (overrides?: Partial<UserEntity>): UserEntity => ({
  id: uuidv4(),
  clerk_user_id: `clerk_${uuidv4().replace(/-/g, '').substring(0, 24)}`,
  email: 'test@example.com',
  password_hash: '$2b$10$abcdefghijklmnopqrstuvwxyz',
  first_name: 'John',
  last_name: 'Doe',
  date_of_birth: new Date('1995-01-01'),
  gender: 'male',
  phone_number: '+1234567890',
  role: 'user',
  is_verified: false,
  is_email_verified: false,
  is_phone_verified: false,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

export const createMockProfile = (userId: string, overrides?: Partial<ProfileEntity>): ProfileEntity => ({
  id: uuidv4(),
  user_id: userId,
  bio: 'Test bio',
  occupation: 'Software Engineer',
  education: 'B.S. Computer Science',
  height: 175,
  city: 'San Francisco',
  state: 'California',
  country: 'USA',
  latitude: 37.7749,
  longitude: -122.4194,
  interests: ['coding', 'hiking'],
  languages: ['English'],
  is_photo_verified: false,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

export const createMockCreateUserDto = (overrides?: Partial<CreateUserDto>): CreateUserDto => ({
  email: 'test@example.com',
  password: 'Test123!@#',
  first_name: 'John',
  last_name: 'Doe',
  date_of_birth: new Date('1995-01-01'),
  gender: 'male',
  phone_number: '+1234567890',
  clerk_user_id: `clerk_${Date.now().toString(36)}`,
  ...overrides,
});

export const createMockVerificationToken = (userId: string, type: 'email_verification' | 'password_reset' = 'email_verification') => ({
  id: uuidv4(),
  user_id: userId,
  token: 'mock-token-' + uuidv4(),
  token_type: type,
  expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
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

// ==================== Phase 1 Entity Factories ====================

// Subscription Factories
export const createMockSubscription = (userId: string, overrides?: any) => ({
  id: uuidv4(),
  user_id: userId,
  tier: 'free',
  status: 'active',
  start_date: new Date(),
  end_date: null,
  cancel_at_period_end: false,
  stripe_subscription_id: null,
  stripe_customer_id: null,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

export const createMockSubscriptionFeature = (overrides?: any) => ({
  id: uuidv4(),
  tier: 'free',
  key: 'daily_swipes_limit',
  value: '10',
  value_type: 'integer',
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

// Coin Factories
export const createMockCoinBalance = (userId: string, overrides?: any) => ({
  id: uuidv4(),
  user_id: userId,
  balance: 0,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

export const createMockCoinTransaction = (userId: string, overrides?: any) => ({
  id: uuidv4(),
  user_id: userId,
  amount: 100,
  type: 'purchase',
  reason: 'Coin pack purchase',
  reference_id: null,
  reference_type: null,
  created_at: new Date(),
  ...overrides,
});

export const createMockCoinProduct = (overrides?: any) => ({
  id: uuidv4(),
  sku: 'COIN_PACK_SMALL',
  name: 'Small Coin Pack',
  amount: 100,
  bonus_coins: 0,
  price: 4.99,
  currency: 'USD',
  stripe_price_id: 'price_coin_pack_small',
  is_active: true,
  display_order: 1,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

// Boost Factories
export const createMockBoostProduct = (overrides?: any) => ({
  id: uuidv4(),
  sku: 'BOOST_1HR',
  name: '1 Hour Boost',
  duration_minutes: 60,
  price: 7.99,
  coin_cost: 80,
  currency: 'USD',
  stripe_price_id: 'price_boost_1hr',
  is_popular: true,
  is_active: true,
  display_order: 2,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

export const createMockBoostInstance = (userId: string, overrides?: any) => ({
  id: uuidv4(),
  user_id: userId,
  product_sku: 'BOOST_1HR',
  start_time: new Date(),
  end_time: new Date(Date.now() + 60 * 60 * 1000), // 1 hour later
  status: 'active',
  views_received: 0,
  likes_received: 0,
  coin_cost: 80,
  stripe_payment_id: null,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

// Privacy & Safety Factories
export const createMockPrivacySettings = (userId: string, overrides?: any) => ({
  id: uuidv4(),
  user_id: userId,
  profile_visibility: 'everyone',
  show_distance: true,
  show_age: true,
  show_online_status: true,
  incognito_mode: false,
  show_activity_status: true,
  read_receipts: true,
  allow_search_by_phone: false,
  allow_search_by_email: false,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

export const createMockBlock = (userId: string, blockedId: string, overrides?: any) => ({
  id: uuidv4(),
  user_id: userId,
  blocked_user_id: blockedId,
  reason: 'Not interested',
  created_at: new Date(),
  ...overrides,
});

export const createMockReport = (userId: string, reportedId: string, overrides?: any) => ({
  id: uuidv4(),
  reporter_id: userId,
  reported_user_id: reportedId,
  report_type: 'inappropriate_messages',
  severity: 'medium',
  description: 'Test report description',
  status: 'pending',
  reviewed_by: null,
  reviewed_at: null,
  action_taken: null,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

export const createMockReportCategory = (overrides?: any) => ({
  id: uuidv4(),
  type: 'inappropriate_messages',
  label: 'Inappropriate Messages',
  description: 'User sent inappropriate or offensive messages',
  icon: '💬',
  severity_default: 'medium',
  is_active: true,
  display_order: 1,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

// Batch Factory Helpers
export const createMultipleMockUsers = (count: number): UserEntity[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockUser({
      email: `user${i + 1}@example.com`,
      first_name: `User${i + 1}`,
    })
  );
};

export const createMultipleMockCoinTransactions = (
  userId: string,
  count: number
): any[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockCoinTransaction(userId, {
      amount: (i % 2 === 0) ? 100 : -50,
      type: (i % 2 === 0) ? 'purchase' : 'spent',
      reason: (i % 2 === 0) ? 'Coin purchase' : 'Boost purchase',
      created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
    })
  );
};

export const createMockSubscriptionWithFeatures = (userId: string, tier: string = 'mid') => {
  const subscription = createMockSubscription(userId, { tier });
  const features = [
    createMockSubscriptionFeature({ tier, key: 'daily_swipes_limit', value: '100' }),
    createMockSubscriptionFeature({ tier, key: 'super_likes_per_day', value: '5' }),
    createMockSubscriptionFeature({ tier, key: 'incognito_mode', value: 'true' }),
    createMockSubscriptionFeature({ tier, key: 'rewind_limit', value: '10' }),
  ];
  return { subscription, features };
};
