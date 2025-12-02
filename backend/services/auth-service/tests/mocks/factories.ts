/**
 * Test data factories for creating mock objects
 * Helps maintain consistency across tests and reduces boilerplate
 */

export interface UserFactory {
  id?: string;
  email?: string;
  password_hash?: string;
  first_name?: string;
  last_name?: string;
  date_of_birth?: Date;
  gender?: string;
  phone_number?: string;
  is_email_verified?: boolean;
  is_phone_verified?: boolean;
  is_active?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface TokenFactory {
  id?: string;
  user_id?: string;
  token?: string;
  type?: 'email_verification' | 'password_reset' | 'phone_verification';
  expires_at?: Date;
  is_used?: boolean;
  created_at?: Date;
}

let userIdCounter = 1;
let tokenIdCounter = 1;

/**
 * Create a mock user with default values
 */
export const createMockUser = (overrides?: Partial<UserFactory>) => {
  const id = overrides?.id || `user-${userIdCounter++}`;

  return {
    id,
    email: overrides?.email || `user${id}@example.com`,
    password_hash: overrides?.password_hash || '$2b$12$hashedpassword',
    first_name: overrides?.first_name || 'John',
    last_name: overrides?.last_name || 'Doe',
    date_of_birth: overrides?.date_of_birth || new Date('1995-01-15'),
    gender: overrides?.gender || 'male',
    phone_number: overrides?.phone_number || '+1234567890',
    is_email_verified: overrides?.is_email_verified ?? false,
    is_phone_verified: overrides?.is_phone_verified ?? false,
    is_active: overrides?.is_active ?? true,
    created_at: overrides?.created_at || new Date(),
    updated_at: overrides?.updated_at || new Date(),
  };
};

/**
 * Create a mock verification token
 */
export const createMockToken = (overrides?: Partial<TokenFactory>) => {
  const id = overrides?.id || `token-${tokenIdCounter++}`;

  return {
    id,
    user_id: overrides?.user_id || 'user-123',
    token: overrides?.token || `token-${id}`,
    type: overrides?.type || 'email_verification' as const,
    expires_at: overrides?.expires_at || new Date(Date.now() + 3600000), // 1 hour from now
    is_used: overrides?.is_used ?? false,
    created_at: overrides?.created_at || new Date(),
  };
};

/**
 * Create mock JWT tokens
 */
export const createMockTokens = () => ({
  accessToken: 'mock.access.token',
  refreshToken: 'mock.refresh.token',
});

/**
 * Create a batch of mock users
 */
export const createMockUsers = (count: number, baseOverrides?: Partial<UserFactory>) => {
  return Array.from({ length: count }, (_, i) =>
    createMockUser({
      ...baseOverrides,
      email: `user${i}@example.com`,
      id: `user-${i}`,
    })
  );
};

/**
 * Reset counters (useful for test isolation)
 */
export const resetFactoryCounters = () => {
  userIdCounter = 1;
  tokenIdCounter = 1;
};
