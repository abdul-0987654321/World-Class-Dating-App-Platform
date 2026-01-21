/**
 * API Test Helpers Index
 *
 * Re-exports all helper utilities for easy importing.
 */

// Auth helper exports
export {
  // Types
  UserRole,
  TestUser,

  // Core functions
  getTestAccessToken,
  getTestUser,
  createTestUser,
  cleanupTestUser,
  cleanupAllTestUsers,
  refreshTestUserToken,
  clearTokenCache,

  // Utilities
  maskToken,
  generateMockToken,
  authenticatedRequest,
  serviceUrls,

  // Default export
  default as authHelper,
} from './auth-helper';
