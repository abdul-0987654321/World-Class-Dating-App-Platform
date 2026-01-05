/**
 * Jest Test Setup
 * Global configuration and mocks for notification-service tests
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Mock environment variables
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.EMAIL_FROM = 'test@flamoral.com';
process.env.EMAIL_FROM_NAME = 'Flamoral Test';
process.env.FRONTEND_URL = 'https://test.flamoral.com';

// Firebase test config
process.env.FIREBASE_PROJECT_ID = 'test-project';
process.env.FIREBASE_CLIENT_EMAIL = 'test@test.iam.gserviceaccount.com';
process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----';

// APNs test config
process.env.APNS_KEY_ID = 'test-key-id';
process.env.APNS_TEAM_ID = 'test-team-id';
process.env.APNS_KEY_PATH = '/path/to/key.p8';
process.env.APNS_BUNDLE_ID = 'com.flamoral.app';
process.env.APNS_PRODUCTION = 'false';

// SNS Push test config
process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_ANDROID = 'arn:aws:sns:us-east-1:123456789:app/GCM/flamoral-android';
process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_IOS = 'arn:aws:sns:us-east-1:123456789:app/APNS/flamoral-ios';
process.env.AWS_SNS_PLATFORM_APPLICATION_ARN_WEB = 'arn:aws:sns:us-east-1:123456789:app/WNS/flamoral-web';

// Global test utilities
global.console = {
  ...console,
  // Uncomment to silence console during tests
  // log: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Increase timeout for async tests
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Clean up after all tests
afterAll(() => {
  jest.resetAllMocks();
});
